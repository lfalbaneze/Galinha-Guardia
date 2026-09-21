// Pack drawn imagegen frames. All eight directions are authored; none are mirrored.
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {cast}=require('./lib/pixellab-cast.cjs');
const root=path.resolve(__dirname,'..'),folder='assets/sprites/pixel-109';
const directions=['down','downleft','left','upleft','up','upright','right','downright'];
const wildlifeOrder=['down','right','up','left','downright','upright','downleft','upleft'];
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
function bands(counts,minimum=3){const out=[];let begin=-1;
  for(let i=0;i<=counts.length;i++)if(i<counts.length&&counts[i]>=minimum){if(begin<0)begin=i;}
  else if(begin>=0){if(i-begin>=10)out.push([begin,i]);begin=-1;}return out;
}
async function extract(file,rows,columns){
  const image=await loadImage(file),surface=createCanvas(image.width,image.height),c=surface.getContext('2d');c.drawImage(image,0,0);
  const rgba=c.getImageData(0,0,image.width,image.height).data,occupied=(x,y)=>rgba[(y*image.width+x)*4+3]>=160;
  const ys=bands(Array.from({length:image.height},(_,y)=>{let n=0;for(let x=0;x<image.width;x++)if(occupied(x,y))n++;return n;}),8);
  const rowBands=ys.length===rows?ys:Array.from({length:rows},(_,i)=>[Math.round(i*image.height/rows),Math.round((i+1)*image.height/rows)]);
  const result=[];
  for(let row=0;row<rows;row++){
    const y0=row?Math.floor((rowBands[row-1][1]+rowBands[row][0])/2):0;
    const y1=row===rows-1?image.height:Math.floor((rowBands[row][1]+rowBands[row+1][0])/2);
    const xs=bands(Array.from({length:image.width},(_,x)=>{let n=0;for(let y=y0;y<y1;y++)if(occupied(x,y))n++;return n;}));
    if(xs.length!==columns)throw Error(`${path.basename(file)} row ${row+1}: expected ${columns} complete sprites, found ${xs.length}`);
    const frames=[];
    for(let col=0;col<columns;col++){
      const x0=col?Math.floor((xs[col-1][1]+xs[col][0])/2):0,x1=col===columns-1?image.width:Math.floor((xs[col][1]+xs[col+1][0])/2);
      let left=x1,top=y1,right=-1,bottom=-1,pixels=0;
      for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(occupied(x,y)){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);pixels++;}
      if(pixels<150)throw Error('Empty sprite '+file+'/'+row+'/'+col);
      if(left<=0||top<=0||right>=image.width-1||bottom>=image.height-1)throw Error('Sprite clipped at source edge '+file+'/'+row+'/'+col);
      const w=right-left+1,h=bottom-top+1,cut=createCanvas(w,h),dc=cut.getContext('2d'),data=dc.createImageData(w,h);
      // Keep EVERY opaque component in the cell. A lifted paw must never be
      // discarded just because it is disconnected from the main body contour.
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const src=((y+top)*image.width+x+left)*4,dest=(y*w+x)*4;
        if(rgba[src+3]>=160){for(let k=0;k<3;k++)data.data[dest+k]=rgba[src+k];data.data[dest+3]=255;}
      }
      dc.putImageData(data,0,0);
      let mass=0,moment=0;
      for(let y=Math.floor(h*.2);y<h*.63;y++)for(let x=0;x<w;x++)if(data.data[(y*w+x)*4+3]){mass++;moment+=x;}
      frames.push({cut,w,h,cx:mass?moment/mass:w/2,gridCx:(col+.5)*image.width/columns-left,cy:h,top,bottom:bottom+1,row,col});
    }
    result.push(frames);
  }
  return result;
}
async function pack(item,metas){
  const input=[];
  for(const meta of [...metas].sort((a,b)=>Number(!!a.targetAction)-Number(!!b.targetAction))){
    const file=path.join(root,folder,'raw',meta.file||meta.id+(meta.action==='walk'?'':'-'+meta.action)+'.png');
    const rows=await extract(file,meta.rows,meta.columns);
    if((meta.targetAction||meta.action)==='fly'||item.id==='crow'&&meta.action!=='expressions')
      for(const frames of rows){const baseline=median(frames.map(f=>f.bottom));for(const f of frames){f.cy=baseline-f.top;f.cx=f.gridCx;}}
    input.push({meta,file,rows});
  }
  const walk=input.find(i=>i.meta.action==='walk');if(!walk)throw Error('Missing walk '+item.id);
  const fingerprint=createHash('sha256').update(JSON.stringify(input.map(i=>i.meta)));
  for(const source of input)fingerprint.update(fs.readFileSync(source.file));
  fingerprint.update('packing-v3');const hash=fingerprint.digest('hex').slice(0,12);
  const runtime=`${folder}/runtime/${item.id}-${hash}.png`,actions={},clips=[];
  for(const entry of input){
    const isExpressions=entry.meta.action==='expressions';
    const referenceHeights=entry.rows.map(row=>isExpressions?row[0].h:Math.max(...row.map(f=>f.h)));
    const target=(entry.meta.targetAction||entry.meta.action)==='fly'&&item.id==='owl'?72:item.height;
    const factor=target/median(referenceHeights);
    if(isExpressions){
      for(const [col,action] of ['idle','happy','scared','angry','sad'].entries())
        entry.rows.forEach((frames,row)=>clips.push({action,direction:directions[row],factor,frames:[frames[col]]}));
    }else entry.rows.forEach((frames,row)=>clips.push({action:entry.meta.targetAction||entry.meta.action,direction:(entry.meta.directions||directions)[row],factor,frames}));
  }
  // Targeted redraws replace only the affected direction, retaining all authored frames.
  for(let i=clips.length-1;i>=0;i--)if(clips.slice(i+1).some(c=>c.action===clips[i].action&&c.direction===clips[i].direction))clips.splice(i,1);
  const reach=Math.max(...clips.flatMap(r=>r.frames.map(f=>Math.max(f.cx,f.w-f.cx)*r.factor)));
  const above=Math.max(...clips.flatMap(r=>r.frames.map(f=>f.cy*r.factor)));
  const below=Math.max(0,...clips.flatMap(r=>r.frames.map(f=>(f.h-f.cy)*r.factor)));
  const bottom=Math.ceil(above)+5,cellW=Math.ceil(reach*2)+10,cellH=bottom+Math.ceil(below)+5,cx=Math.floor(cellW/2);
  const columns=Math.max(...clips.map(r=>r.frames.length)),sheet=createCanvas(cellW*columns,cellH*clips.length),c=sheet.getContext('2d');c.imageSmoothingEnabled=false;
  clips.forEach((clip,row)=>{
    const top=bottom-Math.ceil(Math.max(...clip.frames.map(f=>f.cy*clip.factor))),width=Math.ceil(Math.max(...clip.frames.map(f=>f.w*clip.factor)));
    const frames=clip.frames.map((f,col)=>{
      const w=Math.round(f.w*clip.factor),h=Math.round(f.h*clip.factor);
      c.drawImage(f.cut,col*cellW+cx-Math.round(f.cx*clip.factor),row*cellH+bottom-Math.round(f.cy*clip.factor),w,h);
      return {src:runtime,x:col*cellW+2,y:row*cellH+2,w:cellW-4,h:cellH-4,cx:cx-2,bottom:bottom-2,top:top-2,width,scale:1,pixelArt:true};
    });
    (actions[clip.action]||={})[clip.direction]={frames,cx:cx-2,bottom:bottom-2,top:top-2,width,idleIndex:0,flip:false};
  });
  if(!actions.idle)actions.idle=Object.fromEntries(Object.entries(actions.walk).map(([dir,p])=>[dir,{...p,frames:[p.frames[0]]}]));
  fs.mkdirSync(path.join(root,folder,'runtime'),{recursive:true});fs.writeFileSync(path.join(root,runtime),sheet.toBuffer('image/png'));
  return {edition:109,provider:'imagegen',pixelArt:true,smooth:false,scale:1,cycle:4,source:runtime,width:sheet.width,height:sheet.height,
    hop:item.gait==='rabbit'?3:0,poses:actions.walk,actions};
}
function wildlife(d,action='walk',prependIdle=false){const p=d.actions[action],count=p.down.frames.length;
  return {src:d.source,width:d.width,height:d.height,scale:1,columns:count+(prependIdle?1:0),frames:wildlifeOrder.flatMap(dir=>prependIdle?[d.actions.idle[dir].frames[0],...p[dir].frames]:p[dir].frames)};
}
async function build(){
  const dir=path.join(root,folder,'meta'),metas=fs.readdirSync(dir).filter(n=>n.endsWith('.json')).map(n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8'))),data={},wild={};
  for(const item of cast){const inputs=metas.filter(m=>m.id===item.id);if(!inputs.some(m=>m.action==='walk'))continue;data[item.id]=await pack(item,inputs);}
  for(const id of ['fox','amanda','thor','scarecrow','crow'])if(data[id])wild[id]=wildlife(data[id],'walk',id==='crow');
  if(data.owl?.actions.alert&&data.owl.actions.fly){wild.owl=wildlife(data.owl,'alert');wild['owl-flight']=wildlife(data.owl,'fly');}
  if(data.goose?.actions.alert){wild.goose=wildlife(data.goose);wild['goose-alert']=wildlife(data.goose,'alert');}
  fs.writeFileSync(path.join(root,'systems/pixel-art-data.js'),'/* Generated from original imagegen sprites by scripts/build-pixel-cast.cjs. */\nconst PixelArtData = '+JSON.stringify(data)+';\nObject.assign(SpriteData, PixelArtData);\nObject.assign(PremiumWildlifeData, '+JSON.stringify(wild)+');\n');
  const report={characters:Object.keys(data).length,expressions:Object.values(data).filter(d=>d.actions.happy).length,wildlife:Object.keys(wild),missing:cast.filter(i=>!data[i.id]).map(i=>i.id)};
  fs.writeFileSync(path.join(root,folder,'audit.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
  const review=path.join(root,'preview/pixel-109');fs.mkdirSync(review,{recursive:true});
  const candidates=Object.fromEntries(Object.entries(data).map(([id,definition])=>[id,{id,definition,warnings:[],checks:{frames:Object.values(definition.actions).flatMap(p=>Object.values(p)).reduce((sum,p)=>sum+p.frames.length,0)}}]));
  fs.writeFileSync(path.join(review,'data.js'),'const PixelArtCandidates = '+JSON.stringify(candidates)+';\n');
  const html=fs.readFileSync(path.join(root,'scripts/templates/pixellab-review.html'),'utf8').replaceAll('PixelLab','PixelArt')
    .replace("next.src=selector.value+'/atlas.png'","next.src='../../'+current.definition.source");
  fs.writeFileSync(path.join(review,'index.html'),html);
  return data;
}
if(require.main===module)build().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={extract,build};
