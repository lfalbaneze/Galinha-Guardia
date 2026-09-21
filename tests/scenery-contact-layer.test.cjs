const test=require('node:test'),assert=require('node:assert/strict');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {createGame}=require('./helpers.cjs');
const sizes={tree:[150,176],bush:[106,65],pear:[130,180],willow:[150,166],bramble:[106,60],
 barn:[170,190],coop:[122,148],silo:[68,175],hay:[75,58],fence:[90,42],trough:[92,42],shelter:[150,102],nursery:[225,140]};
test('all real scenery casts only attached contact pixels even while sunlight and the ground layer are active',async()=>{
 const h=createGame(),sun=h.run('Sunlight'),art=h.run('FarmSprites');await art.loadCohesive(loadImage,createCanvas);
 for(const time of [0,42,102])for(const [name,[w,hh]]of Object.entries(sizes))for(const flip of [false,true]){
  const a=createCanvas(280,250).getContext('2d'),b=createCanvas(280,250).getContext('2d');
  sun.begin(time);art.draw(a,name,50,215-hh,w,hh,{grounded:true,solar:false,flip});sun.end();
  sun.begin(time);sun.beginLayer(b);art.draw(b,name,50,215-hh,w,hh,{grounded:true,shadow:true,flip});sun.end();
  const plain=a.getImageData(0,0,280,250).data,shaded=b.getImageData(0,0,280,250).data;let extra=0;
  for(let y=0;y<250;y++)for(let x=0;x<280;x++){
   const p=(y*280+x)*4;
   if(plain[p+3])assert.deepEqual(shaded.slice(p,p+4),plain.slice(p,p+4),`${name}: art moved or darkened`);
   else if(shaded[p+3]){
    extra++;let attached=false;
    for(let dy=-2;dy<=0;dy++)for(let dx=-1;dx<=1;dx++){
     const xx=x+dx,yy=y+dy;if(xx>=0&&xx<280&&yy>=0&&plain[(yy*280+xx)*4+3])attached=true;
    }
    assert.ok(attached,`${name}/${time}/${flip}: detached shadow at ${x},${y}`);
   }
  }
  assert.ok(extra>0,`${name}: missing contact`);
 }
});
test('signs, corn, crops and sunflowers have no second shadow extending away from their roots',()=>{
 const h=createGame(),sun=h.run('Sunlight'),art=h.run('FarmArt'),view={x:0,y:0,shakeX:0,shakeY:0};sun.install(createCanvas);
 for(const type of ['sign','sunflower-sign','corn','crop','sunflower'])for(const variant of [0,1,2,3]){
  const c=createCanvas(300,280).getContext('2d'),y=150;
  sun.begin(0);sun.beginLayer(c);art.drawProp(c,{type,x:100,y,w:110,h:49,name:'POMAR',variant},view);sun.end();
  const ground=type.includes('sign')?y+49:y+5;
  const pixels=c.getImageData(0,ground+1,300,280-ground-1).data;
  assert.equal(pixels.some((v,i)=>i%4===3&&v>0),false,`${type}/${variant}: silhouette below ground`);
 }
});
test('a scenery contact is composed below a body even when the prop is drawn later',async()=>{
 const h=createGame(),sun=h.run('Sunlight'),art=h.run('FarmSprites');await art.loadCohesive(loadImage,createCanvas);
 const c=createCanvas(280,250).getContext('2d');c.fillStyle='#ffffff';c.fillRect(0,0,280,250);
 sun.begin(0);sun.beginLayer(c);c.fillStyle='#ff0000';c.fillRect(0,215,280,10);
 art.draw(c,'bush',50,150,106,65,{grounded:true,shadow:true});sun.end();
 for(let x=0;x<280;x++)assert.deepEqual([...c.getImageData(x,216,1,1).data],[255,0,0,255]);
});
test('foreground repaints do not cast duplicate contact; geometry and canvas state remain untouched',async()=>{
 const h=createGame(),sun=h.run('Sunlight'),art=h.run('FarmSprites');await art.loadCohesive(loadImage,createCanvas);
 const c=createCanvas(280,250).getContext('2d'),before=h.run('JSON.stringify([WORLD.layout,OBSTACLES,HidingSpots.getSpots()])');
 sun.begin(0);sun.beginLayer(c);c.fillStyle='#123456';c.globalAlpha=.7;const alpha=c.globalAlpha;c.imageSmoothingEnabled=true;
 art.draw(c,'hay',30,100,70,55,{grounded:true,shadow:true});const casts=sun.inspect().casts;
 art.draw(c,'hay',30,100,70,55,{grounded:true,shadow:true,foundation:true,solar:false});
 assert.equal(sun.inspect().casts,casts);assert.equal(c.fillStyle,'#123456');assert.equal(c.globalAlpha,alpha);assert.equal(c.imageSmoothingEnabled,true);
 sun.end();assert.equal(h.run('JSON.stringify([WORLD.layout,OBSTACLES,HidingSpots.getSpots()])'),before);
});
