// Front/back cycles reuse the original contact/passing art and alternate support by reflection.
const assert=require('node:assert/strict'),path=require('node:path'),{createCanvas,loadImage}=require('@napi-rs/canvas');
const names=['wolf','sheep','pig','goat','cow','rabbit','dog','cat','donkey','lamb','horse','skin-pipoca','skin-amora','skin-pacoca'];
function trim(image,rect){
 const c=createCanvas(rect.w,rect.h).getContext('2d');c.drawImage(image,rect.x,rect.y,rect.w,rect.h,0,0,rect.w,rect.h);
 const data=c.getImageData(0,0,rect.w,rect.h).data;let l=rect.w,r=0,t=rect.h,b=0;
 for(let y=0;y<rect.h;y++)for(let x=0;x<rect.w;x++)if(data[(y*rect.w+x)*4+3]){l=Math.min(l,x);r=Math.max(r,x+1);t=Math.min(t,y);b=Math.max(b,y+1);}
 return {w:r-l,h:b-t,pixels:Buffer.from(c.getImageData(l,t,r-l,b-t).data)};
}
(async()=>{
 const art=await require('./sprite-loader.cjs').loadArt();let checked=0;
 for(const name of names){
  const edition=name==='cow'?95:['dog','goat','horse'].includes(name)?94:93;
  const previous=await loadImage(path.resolve(__dirname,`../assets/sprites/arcade-${edition}/runtime/${name}.png`));
  const current=await loadImage(path.resolve(__dirname,'..',art.frameFor(name).frame.src));
  for(const [direction,row]of [['down',0],['up',2]])for(let col=0;col<4;col++){
   const f=art.frameFor(name,{direction,moving:true,anim:col}).frame,w=previous.width/4,h=previous.height/4;
   assert.deepEqual(trim(current,f),trim(previous,{x:(col%2)*w,y:row*h,w,h}),name+'/'+direction+'/'+col);
   assert.equal(!!f.flip,col>=2);checked++;
  }
 }
 console.log(checked+' front/back frames retain source pixels and alternate their supporting foot.');
})().catch(e=>{console.error(e);process.exitCode=1});
