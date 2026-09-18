const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
function sprites(){
  const context=vm.createContext({setTimeout,clearTimeout});
  for(const file of ['assets/farm/atlas-data.js','systems/farm-sprites.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
  return vm.runInContext('FarmSprites',context);
}
test('the new prop sheet loads once and can recover without removing the old artwork',async()=>{
  const art=sprites();await art.load(loadImage,createCanvas);
  assert.equal(await art.loadProps(()=>Promise.reject(Error('offline')),createCanvas),false);
  const c=createCanvas(200,200).getContext('2d');
  assert.equal(art.draw(c,'coop',0,0,200,200,{grounded:true}),true);
  const old=Buffer.from(c.getImageData(0,0,200,200).data);
  let calls=0;const load=()=>art.loadProps(src=>{calls++;return loadImage(src);},createCanvas);
  const first=load();assert.equal(load(),first);assert.equal(await first,true);await load();
  assert.equal(calls,1);assert.equal(art.propsReady,true);
  c.clearRect(0,0,200,200);art.draw(c,'coop',0,0,200,200,{grounded:true});
  assert.notDeepEqual(Buffer.from(c.getImageData(0,0,200,200).data),old,'cached legacy tiles are replaced');
});
test('all six grounded props have crisp transparent edges, and the trough keeps its blue water',async()=>{
  const art=sprites();await art.load(loadImage,createCanvas);await art.loadProps(loadImage,createCanvas);
  for(const name of Object.keys(art.propFrames)){
    const c=createCanvas(200,200).getContext('2d');art.draw(c,name,0,0,200,200,{grounded:true});
    const data=c.getImageData(0,0,200,200).data;let clear=0,opaque=0,blue=0;
    for(let i=0;i<data.length;i+=4){
      assert.ok(data[i+3]===0||data[i+3]===255,name+' has no translucent backdrop');
      if(!data[i+3])clear++;else{opaque++;if(data[i+2]>data[i]*1.4&&data[i+2]>85)blue++;}
    }
    assert.ok(clear>500,name+' has a cutout silhouette');assert.ok(opaque>6500,name+' contains a complete object');
    if(name==='trough')assert.ok(blue>200,'water stays visibly blue instead of sharing the wood palette');
  }
});
