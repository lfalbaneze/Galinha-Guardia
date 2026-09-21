// Export complete, coherent directional atlases; never mix generations within an animal.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),folder='assets/sprites/cartoon-106',preview=process.argv.includes('--preview');
const sandbox=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'systems/sprite-style.js'),'utf8'),sandbox);
const style=vm.runInContext('SpriteStyle',sandbox);style.install(createCanvas);
const sizes={chicken:[52,64],sheep:[52,68],pig:[46,68],cow:[85,130],dog:[44,65],cat:[34,54],rabbit:[38,60],duck:[37,50],
 horse:[98,138],donkey:[82,108],goat:[58,74],lamb:[39,52],chick:[23,28],turkey:[52,68],wolf:[72,108],
 'hen-silkie':[52,64],'hen-blue':[52,64],'skin-zeca':[45,58],'skin-pipoca':[42,62],'skin-amora':[39,56],
 'skin-pacoca':[46,66],'skin-gumercindo':[58,65],goose:[64,70],'goose-alert':[64,100],fox:[48,78],amanda:[48,78],thor:[66,88],owl:[46,70],'owl-flight':[72,104],scarecrow:[108,85],crow:[29,52]};
function ranges(counts,min=4){const result=[];let start=-1;for(let i=0;i<=counts.length;i++){
 if(i<counts.length&&counts[i]>=min){if(start<0)start=i;}
 else if(start>=0){if(i-start>=12)result.push([start,i]);start=-1;}}
 return result;
}
async function pack(item){
 const src=`${folder}/raw/${item.name}.png`,image=await loadImage(path.join(root,src));
 const c=createCanvas(image.width,image.height).getContext('2d');c.drawImage(image,0,0);
 const rgba=c.getImageData(0,0,image.width,image.height).data;
 const occupied=(x,y)=>rgba[(y*image.width+x)*4+3]>=80;
 const rowCounts=Array.from({length:image.height},(_,y)=>{let n=0;for(let x=0;x<image.width;x++)if(occupied(x,y))n++;return n;});
 let rows=ranges(rowCounts);
 // Some extremities overlap in the vertical projection. Equal cells still have clear gutters within each column.
 if(rows.length!==item.rows)rows=Array.from({length:item.rows},(_,i)=>[Math.round(i*image.height/item.rows),Math.round((i+1)*image.height/item.rows)]);
 const frames=[];
 for(let row=0;row<rows.length;row++){
  const [y0,y1]=rows[row],counts=Array.from({length:image.width},(_,x)=>{let n=0;for(let y=y0;y<y1;y++)if(occupied(x,y))n++;return n;});
  let cols=ranges(counts);
  if(cols.length!==item.columns){
   // Broad tails and open wings may overlap in x without touching each other.
   // Locate complete silhouettes before resorting to the source's nominal grid.
   const h=y1-y0,w=image.width,visited=new Uint8Array(w*h),queue=new Int32Array(w*h),bodies=[];
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const start=y*w+x;if(visited[start]||!occupied(x,y+y0))continue;
    let begin=0,end=1,l=x,r=x+1;queue[0]=start;visited[start]=1;
    while(begin<end){const p=queue[begin++],px=p%w,py=Math.floor(p/w);l=Math.min(l,px);r=Math.max(r,px+1);
     for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=px+dx,ny=py+dy,n=ny*w+nx;
      if(nx<0||ny<0||nx>=w||ny>=h||visited[n]||!occupied(nx,ny+y0))continue;visited[n]=1;queue[end++]=n;
     }
    }if(end>=200)bodies.push({l,r,pixels:end});
   }
   if(bodies.length>=item.columns)cols=bodies.sort((a,b)=>b.pixels-a.pixels).slice(0,item.columns).sort((a,b)=>a.l-b.l).map(b=>[b.l,b.r]);
   else throw Error(`Cannot isolate ${item.columns} complete silhouettes in ${item.name}, row ${row+1}`);
  }
  for(const [x0,x1] of cols){let l=x1,t=y1,r=x0,b=y0,pixels=0;
   // Extract the character component, excluding a neighbour's nose/tail that
   // sometimes crosses the source grid. Originals remain unmodified.
   const cw=x1-x0,ch=y1-y0,seen=new Uint8Array(cw*ch),queue=new Int32Array(cw*ch);let body=[];
   for(let sy=0;sy<ch;sy++)for(let sx=0;sx<cw;sx++){
    const start=sy*cw+sx;if(seen[start]||!occupied(x0+sx,y0+sy))continue;
    let begin=0,end=1;queue[0]=start;seen[start]=1;
    while(begin<end){const p=queue[begin++],px=p%cw,py=Math.floor(p/cw);
     for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=px+dx,ny=py+dy,n=ny*cw+nx;
      if(nx<0||ny<0||nx>=cw||ny>=ch||seen[n]||!occupied(x0+nx,y0+ny))continue;seen[n]=1;queue[end++]=n;
     }
    }
    if(end>body.length)body=queue.slice(0,end);
   }
   const mask=new Uint8Array(cw*ch);
   for(const p of body){const x=x0+p%cw,y=y0+Math.floor(p/cw);mask[p]=1;l=Math.min(l,x);r=Math.max(r,x+1);t=Math.min(t,y);b=Math.max(b,y+1);pixels++;}
   if(pixels<200)throw Error(`Empty sprite ${item.name}/${frames.length}`);
   if(l<2||t<2||r>image.width-2||b>image.height-2)throw Error(`Clipped silhouette ${item.name}/${frames.length}`);
   // The torso, not the swinging foot or tail tip, defines the horizontal pivot.
   let mass=0,moment=0;
   for(let y=Math.round(t+(b-t)*.18);y<t+(b-t)*.64;y++)for(let x=l;x<r;x++)if(mask[(y-y0)*cw+x-x0]){mass++;moment+=x-l;}
   const cut=createCanvas(r-l,b-t),cutContext=cut.getContext('2d'),cutPixels=cutContext.createImageData(r-l,b-t);
   for(let y=t;y<b;y++)for(let x=l;x<r;x++)if(mask[(y-y0)*cw+x-x0]){
    const dest=((y-t)*(r-l)+x-l)*4,src=(y*image.width+x)*4;
    for(let k=0;k<3;k++)cutPixels.data[dest+k]=rgba[src+k];
    cutPixels.data[dest+3]=Math.min(255,Math.round(rgba[src+3]*255/245));
   }
   cutContext.putImageData(cutPixels,0,0);
   frames.push({x:l,y:t,w:r-l,h:b-t,b,cx:mass?moment/mass:(r-l)/2,cut});
  }
 }
 const count=frames.length/5,[maxH,maxW]=sizes[item.name];
 // Normalize model-sheet framing per viewing angle, never per animation frame.
 // Uniform x/y scaling keeps the anatomy intact; every phase retains one scale.
 const bounds=Array.from({length:5},(_,row)=>({h:Math.max(...frames.slice(row*count,(row+1)*count).map(f=>f.h)),w:Math.max(...frames.slice(row*count,(row+1)*count).map(f=>f.w))}));
 const modelHeight=Math.min(maxH,...bounds.map(b=>maxW*b.h/b.w)),scales=bounds.map(b=>modelHeight/b.h*2);
 const reach=Math.max(...frames.map((f,i)=>Math.max(f.cx,f.w-f.cx)*scales[Math.floor(i/count)]));
 const cellW=Math.ceil(reach*2)+16,cellH=Math.ceil(modelHeight*2)+16,bottom=cellH-8;
 const out=createCanvas(cellW*count,cellH*8),ctx=out.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 const runtime=`${folder}/runtime/${item.name}.webp`,poses={};
 for(const [row,direction]of ['right','downright','down','upright','up'].entries()){
  const scale=scales[row],baseline=frames.slice(row*count,(row+1)*count).map(f=>f.b).sort((a,b)=>a-b)[Math.floor(count/2)];
  const packed=frames.slice(row*count,(row+1)*count).map((f,i)=>{
   const w=f.w*scale,h=f.h*scale,x=i*cellW,y=row*cellH;
   const foot=Math.max(-2,Math.min(2,(f.b-baseline)*scale));
   ctx.drawImage(f.cut,x+cellW/2-f.cx*scale,y+bottom-h+foot,w,h);
   return {src:runtime,x:x+2,y:y+2,w:cellW-4,h:cellH-4,cx:cellW/2-2,bottom:bottom-2,top:6,width:Math.ceil(bounds[row].w*scale),scale:.5};
  });
  poses[direction]={frames:packed,idleIndex:0,cx:packed[0].cx,bottom:bottom-2,top:6,width:Math.ceil(bounds[row].w*scale),flip:false};
 }
 for(const [row,[direction,original]]of [['left','right'],['downleft','downright'],['upleft','upright']].entries()){
  poses[direction]={...poses[original],frames:poses[original].frames.map(f=>{
   const y=cellH*(row+5)+2;ctx.save();ctx.translate(f.x+f.w,y);ctx.scale(-1,1);ctx.drawImage(out,f.x,f.y,f.w,f.h,0,0,f.w,f.h);ctx.restore();return {...f,y,cx:f.w-f.cx};
  }),flip:false};
 }
 fs.writeFileSync(path.join(root,runtime.replace(/\.webp$/,'.png')),out.toBuffer('image/png'));
 // Keep the uncompressed production master beside the compact browser asset.
 // Alpha stays lossless; high quality color coding preserves the smooth ink at 2x.
 fs.writeFileSync(path.join(root,runtime),out.toBuffer('image/webp',95));
 return {scale:.5,cycle:4,edition:106,smooth:true,poses,source:runtime,width:out.width,height:out.height};
}
(async()=>{
 fs.mkdirSync(path.join(root,folder,'runtime'),{recursive:true});
 const meta=path.join(root,folder,'meta');
 const manifest=fs.readdirSync(meta).filter(n=>n.endsWith('.json')).map(n=>JSON.parse(fs.readFileSync(path.join(meta,n),'utf8'))),data={};
 const required=Object.keys(sizes),names=new Set(manifest.map(i=>i.name));
 if(!preview&&(names.size!==required.length||required.some(n=>!names.has(n))))throw Error('Refusing incomplete cast export; missing: '+required.filter(n=>!names.has(n)).join(', '));
 for(const item of manifest)if(item.rows!==5||item.columns!==12||!fs.existsSync(path.join(root,folder,'raw',item.name+'.png')))throw Error('Invalid or missing source: '+item.name);
 const skipped=(process.argv.find(a=>a.startsWith('--skip='))||'').slice(7).split(',');
 if(!preview&&skipped.some(Boolean))throw Error('Cannot skip characters in a production export');
 const errors=[];
 for(const item of manifest)if(!skipped.includes(item.name)){
  try{data[item.name]=await pack(item);}catch(error){if(!preview)throw error;errors.push({name:item.name,error:error.message});}
 }
 const wildlife={};for(const name of ['fox','amanda','thor','goose','goose-alert','owl','owl-flight','scarecrow','crow'])if(data[name]){
  const d=data[name];wildlife[name]={src:d.source,width:d.width,height:d.height,scale:.5,columns:d.poses.right.frames.length,frames:['down','right','up','left','downright','upright','downleft','upleft'].flatMap(dir=>d.poses[dir].frames.map(({x,y,w,h,cx,bottom,scale})=>({x,y,w,h,cx,bottom,scale})))};
 }
 delete data['goose-alert'];
 delete data['owl-flight'];
 fs.writeFileSync(path.join(root,folder,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 fs.writeFileSync(path.join(root,preview?folder+'/preview-data.js':'systems/premium-art-data.js'),'/* Generated by scripts/build-cartoon-cast.cjs. */\nconst PremiumArtData = '+JSON.stringify(data,null,2)+';\nObject.assign(SpriteData, PremiumArtData);\nconst PremiumWildlifeData = '+JSON.stringify(wildlife,null,2)+';\n');
 console.log(`${preview?'Staged':'Exported'} ${Object.keys(data).length} characters with twelve phases and eight directions.`);
 fs.writeFileSync(path.join(root,folder,'audit.json'),JSON.stringify({characters:Object.keys(data).length,errors,missing:required.filter(n=>!names.has(n))},null,2)+'\n');
 if(errors.length){console.error(JSON.stringify(errors));process.exitCode=1;}
})().catch(e=>{console.error(e);process.exitCode=1});
