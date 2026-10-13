const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const {createCanvas}=require('@napi-rs/canvas');
const {checkGroundShadowLayer}=require('./shadow-layer-checks.cjs');
function sunlight(){
  const context=vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../systems/sunlight.js'),'utf8'),context);
  return vm.runInContext('Sunlight',context);
}
test('ground shadows stay below bodies, preserve the floor and reuse resized surfaces',()=>{
  assert.equal(checkGroundShadowLayer(createCanvas,sunlight()).checks,9);
});
test('elevated actors project their silhouette onto the ground without an oval at the feet',()=>{
  const sun=sunlight();sun.install(createCanvas);
  const canvas=createCanvas(100,100),c=canvas.getContext('2d'),image=createCanvas(20,30);
  image.getContext('2d').fillRect(0,0,20,30);
  c.fillStyle='#fff';c.fillRect(0,0,100,100);
  const ellipse=c.ellipse.bind(c);let ovals=0;c.ellipse=(...args)=>{ovals++;ellipse(...args);};
  sun.begin(0);sun.beginLayer(c);
  sun.cast(c,image,40,10,20,30,70);sun.end();
  const foot=Array.from(c.getImageData(50,70,1,1).data);
  assert.equal(foot[0],255,'an airborne body has no artificial contact spot');
  assert.equal(foot[3],255);
  assert.equal(ovals,0);
  assert.ok(c.getImageData(60,75,40,25).data.some((v,i)=>i%4!==3&&v<250),'the sun still projects the body');
});
test('unsupported offscreen contexts keep the existing inline-shadow fallback',()=>{
  const sun=sunlight();sun.install(()=>null);sun.begin(0);
  assert.equal(sun.beginLayer(createCanvas(100,100).getContext('2d')),false);
  sun.end();assert.equal(sun.inspect().groundLayer,false);
});
