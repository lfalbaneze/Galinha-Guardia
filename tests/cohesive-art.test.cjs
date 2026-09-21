const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {createGame}=require('./helpers.cjs');

test('the cohesive atlas loads once, keeps alpha and draws all sixteen complete silhouettes',async()=>{
  const game=createGame(()=>.5),art=game.run('FarmSprites');let loads=0;
  const file=path.join(__dirname,'../assets/farm/farm-arcade-93.png'),original=fs.readFileSync(file);
  const loader=src=>{loads++;return loadImage(src);};
  assert.equal(await art.loadCohesive(loader,createCanvas),true);
  assert.equal(await art.loadCohesive(loader,createCanvas),true);assert.equal(loads,1);
  assert.equal(art.cohesiveReady,true);assert.equal(art.habitatsReady,true);
  assert.equal(Object.keys(art.cohesiveFrames).length,16);
  for(const [name,rect] of Object.entries(art.cohesiveFrames)) {
    const c=createCanvas(220,220).getContext('2d');c.imageSmoothingEnabled=true;c.fillStyle='#123456';
    assert.equal(art.draw(c,name,10,10,200,200,{grounded:true}),true,name);
    assert.equal(c.imageSmoothingEnabled,true);assert.equal(c.fillStyle,'#123456');
    const data=c.getImageData(0,0,220,220).data;let count=0,l=220,t=220,r=0,b=0;
    for(let y=0;y<220;y++)for(let x=0;x<220;x++)if(data[(y*220+x)*4+3]) {
      count++;l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);
    }
    assert.ok(count>1200,name);assert.equal(data[3],0,name+' transparent background');
    assert.ok(b>=206&&b<211,name+' grounded feet');
    assert.ok(Math.abs(((r-l+1)/(b-t+1))/(rect[2]/rect[3])-1)<.06,name+' undistorted aspect ratio');
  }
  assert.deepEqual(fs.readFileSync(file),original);
});

test('world-pixel reduction keeps opaque outlines, caches results and never changes its source',()=>{
  const context=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,'../systems/sprite-style.js'),'utf8'),context);
  const style=vm.runInContext('SpriteStyle',context);let surfaces=0;
  style.install((w,h)=>{surfaces++;return createCanvas(w,h);});
  const image=createCanvas(160,160),c=image.getContext('2d');
  c.fillStyle='#372619';c.fillRect(16,16,128,128);c.fillStyle='#f5e5ba';c.fillRect(24,24,112,112);
  const original=image.toBuffer('image/png'),rect=[0,0,160,160];
  const tile=style.tile(image,rect,40,40),before=surfaces;
  assert.equal(style.tile(image,rect,40,40),tile);assert.equal(surfaces,before);
  const data=tile.getContext('2d').getImageData(0,0,40,40).data;
  assert.equal(data[3],0);assert.equal(data[(4*40+4)*4+3],255);
  for(let i=0;i<data.length;i+=4){assert.ok(data[i+3]===0||data[i+3]===255);if(data[i+3])for(let j=0;j<3;j++)assert.ok(data[i+j]===255||data[i+j]%8===0);}
  assert.deepEqual(image.toBuffer('image/png'),original);
});

test('small playable species retain their own scale instead of being enlarged to hen height',()=>{
  const game=createGame(()=>.5),art=game.run('CharacterArt');
  const height=skin=>Math.max(...['up','right','down','left'].map(direction=>{
    const f=art.frameFor('chicken',{skin,direction});return f.frame.h*f.scale;
  }));
  assert.ok(height('robocop')<height('classic')*.85);
  assert.ok(height('astronaut')<height('classic')*.9);
  assert.ok(height('punk')<height('classic')*.9);
  assert.ok(height('goose')>height('classic'));
});

test('enlarging a packed sprite preserves solid pixel clusters without invented blended colors',()=>{
  const context=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,'../systems/sprite-style.js'),'utf8'),context);
  const style=vm.runInContext('SpriteStyle',context);style.install(createCanvas);
  const source=createCanvas(4,2),c=source.getContext('2d');c.fillStyle='#f80000';c.fillRect(0,0,1,1);c.fillStyle='#0000f8';c.fillRect(2,1,1,1);
  const pixels=style.tile(source,[0,0,4,2],32,16).getContext('2d').getImageData(0,0,32,16).data;
  let opaque=0;
  for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]){
    opaque++;assert.equal(pixels[i+3],255);
    assert.ok((pixels[i]===248&&pixels[i+1]===0&&pixels[i+2]===0)||(pixels[i]===0&&pixels[i+1]===0&&pixels[i+2]===248),'no softened edge color');
  }
  assert.equal(opaque,128,'both 1px squares become exact 8×8 blocks');
});

test('browsers blocking local image pixel reads still get a cached drawable sprite',()=>{
  const context=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,'../systems/sprite-style.js'),'utf8'),context);
  const style=vm.runInContext('SpriteStyle',context);
  style.install((width,height)=>({width,height,getContext:()=>({drawImage(){},getImageData(){
    const error=Error('Local file');error.name='SecurityError';throw error;
  }})}));
  const image={},rect=[0,0,64,64],tile=style.tile(image,rect,24,24);
  assert.equal(tile.width,24);assert.equal(style.tile(image,rect,24,24),tile);
});
