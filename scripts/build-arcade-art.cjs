// Validate generated atlases and export frame metadata; keep source PNG alpha intact.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),context=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root,'systems/sprite-style.js'),'utf8'),context);
const style=vm.runInContext('SpriteStyle',context);style.install(createCanvas);
const sizes={chicken:[54,64],wolf:[82,96],sheep:[58,64],pig:[54,64],cow:[100,108],
  goat:[62,64],duck:[38,52],rabbit:[40,48],dog:[48,64],cat:[38,52],donkey:[88,94],lamb:[42,54],chick:[24,28],horse:[112,122],turkey:[54,64],
  'hen-silkie':[54,64],'hen-blue':[54,64],'skin-zeca':[46,58],'skin-pipoca':[46,54],'skin-amora':[44,58],'skin-pacoca':[50,64],'skin-gumercindo':[58,64]};
// Lateral replacements keep the original front/back pixels and their scale.
const repairedSides={wolf:[67,90],sheep:[50,58],pig:[44,62],donkey:[82,90],dog:[39,55],
  cat:[34,42],lamb:[36,42],goat:[52,66],horse:[94,122],cow:[82,118],rabbit:[38,43],
  'skin-pipoca':[43,44],'skin-amora':[39,44],'skin-pacoca':[40,48]};
const gaitGroups={dog:{file:'dog-missing',rows:['dog']},
  ...Object.fromEntries(['sheep','pig','goat','cow'].map(name=>[name,{file:'livestock',rows:['sheep','pig','goat','cow']}])),
  ...Object.fromEntries(['cat','donkey','lamb','horse'].map(name=>[name,{file:'companions',rows:['cat','donkey','lamb','horse']}])),
  ...Object.fromEntries(['wolf','skin-pacoca','skin-amora','fox','thor'].map(name=>[name,{file:'heroes',rows:['wolf','skin-pacoca','skin-amora','fox','thor']}]))};
async function missingGait(name,limits) {
  const group=gaitGroups[name];
  const src=`assets/sprites/gait-100/${group.file}.png`;
  const sheet=await readAtlas(src,group.rows,limits,2),frames=sheet.poses[name].frames;
  sheet.scale=Math.min(limits[0]/Math.max(...frames.map(f=>f.h)),limits[1]/Math.max(...frames.map(f=>f.w)));
  let forward=null;
  if(name!=='dog') {
    forward=await readAtlas(`assets/sprites/gait-100/${group.file}-forward.png`,group.rows,limits,2);
    // Both halves are edited from the same canvas. Preserve the shared body scale.
    forward.scale=sheet.scale*sheet.image.width/forward.image.width;
  }
  return {sheet,frames,forward,cycle:forward?[...forward.poses[name].frames,...frames]:null};
}
async function readAtlas(src,directions,limits,columnsPerRow=4) {
  const image=await loadImage(path.join(root,src));
  const c=createCanvas(image.width,image.height).getContext('2d');c.drawImage(image,0,0);
  const data=c.getImageData(0,0,image.width,image.height).data,poses={},report=[];
  function bands(horizontal,start,end) {
    const length=horizontal?image.width:image.height,counts=new Uint32Array(length),spans=[];
    for(let a=0;a<length;a++)for(let b=start;b<end;b++) {
      const x=horizontal?a:b,y=horizontal?b:a;if(data[(y*image.width+x)*4+3]>=160)counts[a]++;
    }
    for(let i=0;i<length;i++)if(counts[i]>=3) {
      const prev=spans.at(-1);if(prev&&i-prev[1]<=0)prev[1]=i+1;else spans.push([i,i+1]);
    }
    return spans.filter(([a,b])=>b-a>24);
  }
  let rows=bands(false,0,image.width);
  if(rows.length!==directions.length && columnsPerRow===2) {
    // A raised tail in the second column can overlap the neighbouring row's
    // vertical projection. The first column still defines the atlas row gutters.
    const leftRows=bands(false,0,Math.floor(image.width/2));
    if(leftRows.length===directions.length)rows=leftRows.map((r,i)=>[
      i?Math.floor((leftRows[i-1][1]+r[0])/2):0,
      i+1<leftRows.length?Math.floor((r[1]+leftRows[i+1][0])/2):image.height]);
  }
  if(rows.length!==directions.length)throw Error(`Expected ${directions.length} separate directional rows: ${src} (${rows.length})`);
  for(const [row,direction] of directions.entries()) {
    const frames=[],[y0,y1]=rows[row],columns=bands(true,y0,y1);
    if(columns.length!==columnsPerRow)throw Error(`Expected ${columnsPerRow} separate walk frames: ${src}/${direction} (${columns.length})`);
    for(let col=0;col<columnsPerRow;col++) {
      const [x0,x1]=columns[col];
      let left=x1,top=y1,right=x0,bottom=y0,count=0;
      for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(data[(y*image.width+x)*4+3]>=160) {
        left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);count++;
      }
      if(count<200)throw Error(`Empty atlas cell: ${src}/${direction}/${col}`);
      if(left<2||right>image.width-2||top<2||bottom>image.height-2)report.push(`${src}/${direction}/${col}: check image edge`);
      frames.push({src,x:left,y:top,w:right-left,h:bottom-top,cx:(right-left)/2,bottom:bottom-top,top:0,width:right-left});
    }
    poses[direction]={frames,idleIndex:1,cx:frames[1].cx,bottom:Math.max(...frames.map(f=>f.h)),top:0,width:Math.max(...frames.map(f=>f.w)),flip:false};
  }
  const height=Math.max(...Object.values(poses).map(p=>p.bottom)),width=Math.max(...Object.values(poses).map(p=>p.width));
  return {poses,image,scale:Math.min(limits[0]/height,limits[1]/width),report,src};
}
async function atlas(name,limits) {
  const folder='assets/sprites/'+(['cow','dog','goat','horse'].includes(name)?'arcade-94':'arcade-93');
  const original=await readAtlas(`${folder}/${name}.png`,['down','right','up','left'],limits);
  const sources=new Map([[original.src,original]]),poses=original.poses,report=original.report;
  // Front/back contact alternates feet rather than repeating the same lead leg.
  for(const direction of ['down','up']) {
    const pose=poses[direction];
    pose.frames[2]={...pose.frames[0],flip:true};
    pose.frames[3]={...pose.frames[1],flip:true};
  }
  if(repairedSides[name]) {
    // Only the defective lateral cycles are replaced. Original front/back crops
    // and their world scale stay identical to the previously reviewed drawing.
    const src=`assets/sprites/arcade-96/${name}-sides.png`;
    const sides=await readAtlas(src,['right','left'],repairedSides[name]);
    sources.set(sides.src,sides);Object.assign(poses,sides.poses);report.push(...sides.report);
  }
  if(gaitGroups[name]) {
    const {sheet,frames,forward,cycle}=await missingGait(name,repairedSides[name]);
    sources.set(sheet.src,sheet);report.push(...sheet.report);
    if(forward){sources.set(forward.src,forward);report.push(...forward.report);poses.right.frames=cycle;}
    else poses.right.frames.splice(2,2,...frames);
    // The two lateral directions share one coherent anatomy and step order.
    poses.left={...poses.right,frames:poses.right.frames.map(f=>({...f})),flip:true};
  }
  if(['rabbit','skin-pipoca'].includes(name)) {
    const hops=await readAtlas('assets/sprites/gait-100/rabbits.png',['rabbit','skin-pipoca'],repairedSides[name]);
    const frames=hops.poses[name].frames,limits=repairedSides[name];
    hops.scale=Math.min(limits[0]/Math.max(...frames.map(f=>f.h)),limits[1]/Math.max(...frames.map(f=>f.w)));
    sources.set(hops.src,hops);poses.right=hops.poses[name];poses.right.idleIndex=0;
    poses.left={...poses.right,frames:frames.map(f=>({...f})),flip:true};
  }
  const runtime=(gaitGroups[name]||['rabbit','skin-pipoca'].includes(name)?'assets/sprites/gait-100':repairedSides[name]?'assets/sprites/arcade-96':folder)+'/runtime';
  fs.mkdirSync(path.join(root,runtime),{recursive:true});
  // Export the same world-pixel samples used by CharacterArt, once at build time.
  // Original generated PNGs remain untouched for future editing and attribution.
  const frames=Object.values(poses).flatMap(p=>p.frames);
  const cellW=Math.ceil(Math.max(...frames.map(f=>f.w*sources.get(f.src).scale)))+4;
  const cellH=Math.ceil(Math.max(...frames.map(f=>f.h*sources.get(f.src).scale)))+4;
  const packed=createCanvas(cellW*4,cellH*4),p=packed.getContext('2d'),runtimeSrc=`${runtime}/${name}.png`;
  for(const [row,pose] of Object.values(poses).entries()) {
    for(const [col,frame] of pose.frames.entries()) {
      const {image,scale}=sources.get(frame.src);
      const w=Math.round(frame.w*scale),h=Math.round(frame.h*scale),x=col*cellW+2,y=row*cellH+2;
      p.drawImage(style.tile(image,[frame.x,frame.y,frame.w,frame.h],w,h),x,y);
      Object.assign(frame,{src:runtimeSrc,x,y,w,h,cx:Math.round(frame.cx*scale),bottom:h,width:w});
    }
    Object.assign(pose,{cx:pose.frames[1].cx,bottom:Math.max(...pose.frames.map(f=>f.h)),width:Math.max(...pose.frames.map(f=>f.w))});
  }
  fs.writeFileSync(path.join(root,runtimeSrc),packed.toBuffer('image/png'));
  return {definition:{scale:1,poses},report};
}
async function foxSides() {
  const sides=await readAtlas('assets/sprites/arcade-96/fox-sides.png',['right','left'],[44,66]);
  const missing=await missingGait('fox',[44,66]);
  sides.poses.right.frames=missing.cycle;
  sides.poses.left.frames=sides.poses.right.frames.map(f=>({...f}));
  const sources=new Map([[sides.src,sides],[missing.sheet.src,missing.sheet],[missing.forward.src,missing.forward]]);
  const all=Object.values(sides.poses).flatMap(p=>p.frames);
  const cellW=Math.ceil(Math.max(...all.map(f=>f.w*sources.get(f.src).scale)))+4,cellH=Math.ceil(Math.max(...all.map(f=>f.h*sources.get(f.src).scale)))+4;
  const canvas=createCanvas(cellW*4,cellH*2),c=canvas.getContext('2d'),frames=[],bowAnchors=[];
  for(const [i,f] of all.entries()) {
    const {scale,image}=sources.get(f.src);
    const w=Math.round(f.w*scale),h=Math.round(f.h*scale),x=i%4*cellW+2,y=Math.floor(i/4)*cellH+2;
    c.save();c.translate(x+(i>=4?w:0),y);if(i>=4)c.scale(-1,1);
    c.drawImage(style.tile(image,[f.x,f.y,f.w,f.h],w,h),0,0);c.restore();
    frames.push({x,y,w,h});bowAnchors.push({x:Math.round(w*(i<4?.73:.27)),y:Math.round(h*.19)});
  }
  const src='assets/sprites/gait-100/runtime/fox.png';fs.writeFileSync(path.join(root,src),canvas.toBuffer('image/png'));
  return {data:{src,width:canvas.width,height:canvas.height,frames,bowAnchors},report:sides.report};
}
async function thorAtlas() {
  const atlas=await readAtlas('assets/sprites/arcade-98/thor.png',['down','right','up','left'],[70,76]);
  const limits=[Math.max(...atlas.poses.right.frames.map(f=>f.h*atlas.scale)),Math.max(...atlas.poses.right.frames.map(f=>f.w*atlas.scale))];
  const missing=await missingGait('thor',limits);
  atlas.poses.right.frames=missing.cycle;
  atlas.poses.left.frames=atlas.poses.right.frames.map(f=>({...f}));
  const sources=new Map([[atlas.src,atlas],[missing.sheet.src,missing.sheet],[missing.forward.src,missing.forward]]);
  const sourceFrames=Object.values(atlas.poses).flatMap(p=>p.frames);
  const cellW=Math.ceil(Math.max(...sourceFrames.map(f=>f.w*sources.get(f.src).scale)))+4;
  const cellH=Math.ceil(Math.max(...sourceFrames.map(f=>f.h*sources.get(f.src).scale)))+4;
  const canvas=createCanvas(cellW*4,cellH*4),c=canvas.getContext('2d'),frames=[];
  for(const [i,f]of sourceFrames.entries()){
    const {scale,image}=sources.get(f.src);
    const x=i%4*cellW+2,y=Math.floor(i/4)*cellH+2,w=Math.round(f.w*scale),h=Math.round(f.h*scale);
    c.save();c.translate(x+(i>=12?w:0),y);if(i>=12)c.scale(-1,1);
    c.drawImage(style.tile(image,[f.x,f.y,f.w,f.h],w,h),0,0);c.restore();frames.push({x,y,w,h});
  }
  const src='assets/sprites/gait-100/runtime/thor.png';
  fs.mkdirSync(path.dirname(path.join(root,src)),{recursive:true});
  fs.writeFileSync(path.join(root,src),canvas.toBuffer('image/png'));
  return {data:{src,width:canvas.width,height:canvas.height,columns:4,frames},report:atlas.report};
}
(async()=>{
  const data={},warnings=[];
  for(const [name,limits] of Object.entries(sizes)) {
    const result=await atlas(name,limits);data[name]=result.definition;warnings.push(...result.report);
  }
  const fox=await foxSides();warnings.push(...fox.report);
  const thor=await thorAtlas();warnings.push(...thor.report);
  if(warnings.length)throw Error('Clipped character art: '+warnings.join(', '));
  fs.writeFileSync(path.join(root,'systems/arcade-art-data.js'),'/* Generated by scripts/build-arcade-art.cjs. */\nconst ArcadeArtData = '+JSON.stringify(data,null,2)+';\nObject.assign(SpriteData, ArcadeArtData);\nconst FoxSideArtData = '+JSON.stringify(fox.data,null,2)+';\nconst ThorArtData = '+JSON.stringify(thor.data,null,2)+';\n');
  fs.mkdirSync(path.join(root,'.cache'),{recursive:true});fs.writeFileSync(path.join(root,'.cache/arcade-art-report.json'),JSON.stringify({characters:Object.keys(data),warnings},null,2));
  console.log(JSON.stringify({characters:Object.keys(data).length,warnings}));
})().catch(e=>{console.error(e);process.exitCode=1});
