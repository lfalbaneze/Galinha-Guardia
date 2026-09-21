const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {createGame}=require('./helpers.cjs');
function sprites(){
  const context=vm.createContext({setTimeout,clearTimeout});
  for(const file of ['assets/farm/atlas-data.js','systems/farm-sprites.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
  return vm.runInContext('FarmSprites',context);
}
test('real scenery atlas decodes once, keys the fence gaps and keeps white flower petals',async()=>{
  const art=sprites();let calls=0;
  const load=()=>art.load(src=>{calls++;return loadImage(src);},createCanvas);
  const first=load();assert.equal(load(),first);assert.equal(await first,true);await load();assert.equal(calls,1);
  for(const name of ['fence','bush']){
    const [,,w,h]=art.frames[name],canvas=createCanvas(w,h),c=canvas.getContext('2d');
    assert.equal(art.draw(c,name,0,0,w,h),true);
    const data=c.getImageData(0,0,w,h).data;let clear=0,white=0;
    for(let i=0;i<data.length;i+=4){if(data[i+3]===0)clear++;else if(data[i]>231&&data[i+1]>231&&data[i+2]>226)white++;}
    assert.ok(clear>w*h*.12,name+' has real transparent margins');
    if(name==='fence')assert.equal(white,0,'gaps are transparent, not white rectangles');
    else assert.ok(white>30,'white flowers survive background keying');
  }
});
test('unavailable scenery leaves the fallback usable and can be retried',async()=>{
  const art=sprites(),c=createCanvas(30,30).getContext('2d');
  assert.equal(await art.load(()=>{throw Error('missing');},createCanvas),false);
  assert.equal(art.ready,false);assert.equal(art.draw(c,'tree',0,0,30,30),false);
  assert.equal(await art.load(loadImage,createCanvas),true);assert.equal(art.ready,true);
});
test('terrain is deterministic, cached across camera moves, and does not mutate the procedural world',()=>{
  const h=createGame(()=>.5);let builds=0;
  h.run('FarmTerrain').install((w,h)=>{builds++;return createCanvas(w,h);});
  const canvas=createCanvas(900,520),c=canvas.getContext('2d'),terrain=h.run('FarmTerrain');
  const render=()=>terrain.draw(c,h.run('WORLD.layout'),{x:0,y:0});
  const world=h.run('JSON.stringify(WORLD.layout)');render();const first=canvas.toBuffer('image/png');
  terrain.draw(c,h.run('WORLD.layout'),{x:100,y:90});render();
  assert.equal(builds,1);assert.deepEqual(canvas.toBuffer('image/png'),first);assert.equal(h.run('JSON.stringify(WORLD.layout)'),world);
  h.run('resetGame(WORLD.layout.seed)');render();assert.deepEqual(canvas.toBuffer('image/png'),first);
  h.run('resetGame(42)');render();assert.notDeepEqual(canvas.toBuffer('image/png'),first);
});
test('a found chick clears an older rescue notice and suppresses the region banner',()=>{
  const h=createGame(()=>.5);
  h.run(`var chick=state.entities.chicks[0];Object.assign(state.entities.chicken,{x:chick.x,y:chick.y});
    state.entities.wolf.huntUnlockTimer=100;
    state.rescueNotice={name:'Cordeirinho',count:1,total:10,time:2.5};
    state.mapTransition={time:2.5,name:'Horta'};
    RescueSystem.callChick(state);GameUI.update(state);
    var labels=[];ctx.fillText=text=>labels.push(text);GameUI.render(state);`);
  assert.equal(h.run('state.rescueNotice'),null);
  assert.equal(h.elements.get('regionNotice').hidden,true);
  assert.equal(h.run('labels.includes(`${state.secretNotice.name} no ninho!`)'),true);
  assert.equal(h.run('labels.includes("Cordeirinho a salvo!")'),false);
  h.run(`state.skinNotice={text:'Pato',time:4};labels.length=0;GameUI.render(state);`);
  assert.equal(h.run('labels.includes("Nova aparência: Pato")'),true);
  assert.equal(h.run('labels.includes(`${state.secretNotice.name} no ninho!`)'),false);
});
