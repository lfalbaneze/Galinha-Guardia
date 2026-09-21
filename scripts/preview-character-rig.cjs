const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {extract}=require('./lib/sprite-cells.cjs');
const root=path.resolve(__dirname,'..'),dir='assets/sprites/cartoon-107';
(async()=>{
 const name='skin-pacoca',frames=await extract(path.join(root,dir,'parts',name+'.png'),{name,rows:5,columns:5});
 const rig={source:`${dir}/runtime/${name}-body.webp`,bodyHeight:38,length:10,span:5,leg:13,stride:10,lift:4,coat:'#c98b48',far:'#a7733e',paw:'#ffebc3',farFoot:'#e6cea7',footWidth:7,footHeight:4,limbWidth:3.2,views:{}};
 const density=2,cell=160,atlas=createCanvas(cell*5,cell*5),a=atlas.getContext('2d');
 const scale=rig.bodyHeight/Math.max(...frames.map(f=>f.h));
 for(const [row,direction] of ['right','downright','down','upright','up'].entries()){
  rig.views[direction]={frames:[],flip:false};
  for(let col=0;col<5;col++){
   const f=frames[row*5+col],pixels=f.cut.getContext('2d').getImageData(0,0,f.w,f.h).data;
   let mass=0,xmass=0;
   for(let y=Math.floor(f.h*.74);y<f.h*.96;y++)for(let x=0;x<f.w;x++)if(pixels[(y*f.w+x)*4+3]>200){mass++;xmass+=x;}
   const cx=mass?xmass/mass:f.w/2,dw=f.w*scale,dh=f.h*scale;
   const bottom=14-rig.leg*.8,left=-cx*scale,top=bottom-dh;
   a.drawImage(f.cut,col*cell+80+left*density,row*cell+110+top*density,dw*density,dh*density);
   rig.views[direction].frames.push({x:col*cell,y:row*cell,w:cell,h:cell,left:-40,top:-55,dw:80,dh:80});
  }
 }
 for(const [d,o]of [['left','right'],['downleft','downright'],['upleft','upright']])rig.views[d]={...rig.views[o],flip:true};
 fs.writeFileSync(path.join(root,rig.source),atlas.toBuffer('image/webp',95));
 fs.writeFileSync(path.join(root,dir,'rigs',name+'.json'),JSON.stringify(rig,null,2));
 const context=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'systems/character-rig.js'),'utf8'),context);const renderer=vm.runInContext('CharacterRig',context);
 const image=await loadImage(path.join(root,rig.source)),out=createCanvas(1200,900),c=out.getContext('2d');
 c.fillStyle='#e2e9c6';c.fillRect(0,0,out.width,out.height);c.fillStyle='#26392a';c.font='bold 20px sans-serif';c.fillText('Paçoca — corpo estável, quatro patas e expressões desenhadas',24,30);
 for(const [r,d]of renderer.directions.entries()){
  c.fillStyle='#26392a';c.font='12px sans-serif';c.fillText(d,12,95+r*80);
  for(let k=0;k<8;k++)renderer.draw(c,image,rig,155+k*140,95+r*80,{direction:d,moving:true,anim:k/2,scale:1.35});
 }
 for(let i=0;i<5;i++){renderer.draw(c,image,rig,120+i*240,810,{direction:'downright',moving:false,mood:renderer.moods[i],scale:2});c.fillText(renderer.moods[i],100+i*240,870);}
 fs.writeFileSync(path.join(root,'preview/cartoon-107/pacoca-rig.png'),out.toBuffer('image/png'));
 console.log('Saved rig proof and five expression views.');
})().catch(e=>{console.error(e);process.exitCode=1;});
