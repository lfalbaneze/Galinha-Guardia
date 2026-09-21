const fs=require('node:fs'),path=require('node:path'),{createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'preview/pixellab');
const ids=process.argv.slice(2).length?process.argv.slice(2):fs.readdirSync(folder).filter(id=>fs.existsSync(path.join(folder,id,'candidate.json')));
const dirs=['down','downleft','left','upleft','up','upright','right','downright'];
(async()=>{for(const id of ids){
 const candidate=JSON.parse(fs.readFileSync(path.join(folder,id,'candidate.json'))),d=candidate.definition,atlas=await loadImage(path.join(folder,id,'atlas.png'));
 const actions=Object.keys(d.actions),w=1440,h=actions.length*180+40,canvas=createCanvas(w,h),c=canvas.getContext('2d');
 c.fillStyle='#c8dba3';c.fillRect(0,0,w,h);c.imageSmoothingEnabled=false;c.font='14px sans-serif';
 for(const [row,action]of actions.entries()){
  c.fillStyle='#19382e';c.fillText(id+' / '+action,8,row*180+24);
  for(const [col,direction]of dirs.entries()){
   const p=d.actions[action][direction],f=p.frames[Math.floor(p.frames.length/2)],scale=Math.min(2*d.scale,138/f.w,132/f.h),x=90+col*180,y=row*180+154;
   c.drawImage(atlas,f.x,f.y,f.w,f.h,x-f.cx*scale,y-f.bottom*scale,f.w*scale,f.h*scale);c.fillStyle='#19382e';c.fillText(direction,x-32,y+22);
  }
 }
 fs.writeFileSync(path.join(folder,id,'actions-review.png'),canvas.toBuffer('image/png'));
 for(const action of actions.filter(a=>a!=='idle')){
 const film=createCanvas(1280,dirs.length*155+35),fc=film.getContext('2d');fc.fillStyle='#204534';fc.fillRect(0,0,film.width,film.height);fc.imageSmoothingEnabled=false;fc.font='13px sans-serif';
 for(const [row,direction]of dirs.entries()){const p=d.actions[action][direction];fc.fillStyle='#fff4ce';fc.fillText(id+' / '+action+' / '+direction,8,row*155+17);
 for(let col=0;col<8;col++){const f=p.frames[Math.floor(col*p.frames.length/8)],scale=Math.min(2*d.scale,148/f.w,116/f.h),x=80+col*160,y=row*155+142;
 fc.drawImage(atlas,f.x,f.y,f.w,f.h,x-f.cx*scale,y-f.bottom*scale,f.w*scale,f.h*scale);}}
 fs.writeFileSync(path.join(folder,id,action+'-review.png'),film.toBuffer('image/png'));
 }
 console.log(id+': '+actions.join(', ')+' — '+candidate.checks.frames+' quadros.');
}})().catch(e=>{console.error(e.message);process.exitCode=1});
