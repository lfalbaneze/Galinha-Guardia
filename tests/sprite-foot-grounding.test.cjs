const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const ROOT=path.resolve(__dirname,'..');
async function fixture(){
  const context=vm.createContext({SpriteData:{},PremiumWildlifeData:{}});
  for(const file of ['sunlight','pixellab-art-data','character-art'])
    vm.runInContext(fs.readFileSync(path.join(ROOT,'systems',file+'.js'),'utf8'),context);
  const sun=vm.runInContext('Sunlight',context),art=vm.runInContext('CharacterArt',context);
  sun.install(createCanvas);
  assert.equal(await art.load(src=>loadImage(path.join(ROOT,src))),true);
  return {sun,art,data:context.SpriteData};
}
function bottom(c){
  const {width:w,height:h}=c.canvas,data=c.getImageData(0,0,w,h).data;
  for(let y=h-1;y>=0;y--)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>=128)return y+1;
  return 0;
}

test('real terrestrial frames put opaque paws on the ground in every direction and reaction',async()=>{
  const {art,data}=await fixture(),canvas=createCanvas(256,256),c=canvas.getContext('2d');
  let checked=0;
  for(const [name,definition] of Object.entries(data)){
    if(['owl','crow'].includes(name))continue;
    for(const [action,poses] of Object.entries(definition.actions||{walk:definition.poses})){
      if(['fly','alert'].includes(action))continue;
      for(const [direction,pose] of Object.entries(poses))for(let i=0;i<pose.frames.length;i++){
        c.clearRect(0,0,256,256);
        // Explicit action avoids testing a different clip selected by a mood.
        const options={action,direction,moving:true,anim:(i+.1)*4/pose.frames.length,shadow:false};
        assert.equal(art.draw(c,name,128,206,options),true);
        const offset=Math.abs(bottom(c)-220);
        assert.ok(offset<=1,`${name}/${action}/${direction}/${i}: ${offset}px between paws and ground`);
        checked++;
      }
    }
  }
  assert.ok(checked>500,`Only checked ${checked} frames`);
});

test('the original wolf reaction has an atlas gap, but its corrected drawing has none',async()=>{
  const {art}=await fixture(),c=createCanvas(256,256).getContext('2d');
  let oldGap=0;
  for(const direction of art.directions)for(let i=0;i<12;i++){
    const options={direction,mood:'furious',moving:true,anim:(i+.1)/3,shadow:false};
    c.clearRect(0,0,256,256);art.draw(c,'wolf',128,206,{...options,grounded:false});
    oldGap=Math.max(oldGap,220-bottom(c));
    c.clearRect(0,0,256,256);art.draw(c,'wolf',128,206,options);
    assert.ok(Math.abs(bottom(c)-220)<=1);
  }
  assert.ok(oldGap>1,`Expected to reproduce the old atlas gap, got ${oldGap}`);
});

test('opaque footprint is cached, ignores padding and translucent fringes, and keeps explicit elevation',async()=>{
  const {sun,art}=await fixture(),image=createCanvas(40,50),c=image.getContext('2d');
  c.fillRect(13,7,14,24);c.globalAlpha=.2;c.fillRect(0,45,40,5);
  const support=sun.footprint(image,40,50);
  assert.equal(support.bottom,31);assert.equal(support.footLeft,13);assert.equal(support.footRight,27);
  assert.equal(sun.footprint(image,40,50),support);
  const target=createCanvas(256,256).getContext('2d');
  art.draw(target,'wolf',128,206,{shadow:false,lift:16});assert.equal(bottom(target),204);
  sun.install(()=>{throw Error('Pixel reads unavailable');});
  const baked={left:.25,right:.75,top:.1,bottom:.8,footLeft:.3,footRight:.7};
  assert.equal(sun.footprint(image,40,50,undefined,baked).bottom,40);
  assert.equal(sun.footprint(image,40,50),null);
});

test('flying birds keep their authored vertical reference and rendering leaves metadata intact',async()=>{
  const {art,data}=await fixture(),c=createCanvas(256,256).getContext('2d');
  const before=JSON.stringify(data);
  for(const name of ['owl','crow']){
    const options={shadow:false,direction:'right',moving:true,anim:1,lift:12};
    c.clearRect(0,0,256,256);art.draw(c,name,128,206,options);const actual=bottom(c);
    c.clearRect(0,0,256,256);art.draw(c,name,128,206,{...options,grounded:false});
    assert.equal(bottom(c),actual);
  }
  assert.equal(JSON.stringify(data),before);
});
