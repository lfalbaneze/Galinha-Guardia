const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
const plain=v=>JSON.parse(JSON.stringify(v));

test('authored reactions follow the flock state and keep flight elevation',()=>{
  const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),draws=[];
  const data=Object.fromEntries(['scarecrow','crow','scarecrow-happy','scarecrow-scared','scarecrow-sad','crow-scared'].map(id=>[id,{src:id,width:100,height:100,frames:[],columns:9}]));
  const context=vm.createContext({PremiumWildlifeData:data,InterfaceMotion:{reduced:false},CharacterArt:{directionFor:()=> 'upright'},
    createWildlifeSheet:src=>({drawFrame:(...args)=>draws.push({src,args}),ready:true,loading:false,errors:[]})});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../systems/scarecrow-art.js'),'utf8'),context);
  const art=vm.runInContext('ScarecrowArt',context),c=new Proxy({globalAlpha:1},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)}),view={x:0,y:0};
  for(const [mode,source]of [['perched','scarecrow'],['fleeing','scarecrow-scared'],['away','scarecrow-sad'],['returning','scarecrow-happy']]){
    art.drawPost(c,{x:20,y:100,clock:.5,mode},view);assert.equal(draws.at(-1).src,source);
  }
  const bird={x:30,y:200,z:120,left:false,opacity:1,flying:true,target:{x:40,y:190},from:{x:20,y:210}};
  art.drawCrow(c,bird,0,.5,view,true);assert.equal(draws.at(-1).src,'crow-scared');
  assert.equal(draws.at(-1).args[2],80);assert.equal(draws.at(-1).args[6],120);
  art.drawCrow(c,bird,0,.5,view,false);assert.equal(draws.at(-1).src,'crow');
  art.drawCrow(c,{...bird,flying:false},0,.5,view,true);assert.equal(draws.at(-1).src,'crow');assert.equal(draws.at(-1).args[4],0);
});
function setup(){
  const h=createGame(()=>.5);
  h.run(`resetGame(52);state.phase='playing';var s=state.scarecrow,c=state.entities.chicken;
    OBSTACLES=[];Object.assign(c,{x:s.x+400,y:s.y,hidden:false,sprinting:false});`);
  return h;
}
function step(h,seconds){h.run(`for(let i=0;i<${Math.ceil(seconds/.05)};i++)ScarecrowSystem.update(state,.05);`);}

test('one scarecrow and three crows occupy a clear verge without changing rescue identities',()=>{
  const h=createGame(()=>.5);
  for(const version of [1,2,7])for(const seed of [0,14,52,814237]){
    h.run(`resetGame(${seed},${version});var s=state.scarecrow;`);
    assert.ok(h.run('s'),`${version}/${seed}: scarecrow`);
    assert.equal(h.run('s.birds.length'),3);
    assert.equal(h.run("OBSTACLES.filter(p=>p.type==='scarecrow-post').length"),1);
    assert.equal(h.run(`(()=>{const box={x:s.x-61,y:s.y-142,w:122,h:150};return [...WORLD.paths,...(WORLD.layout.lanes||[]),
      ...(WORLD.layout.plots||[])].every(r=>!FarmDetails.overlaps(box,r));})()`),true);
    assert.equal(h.run('state.entities.animals.every(a=>WildlifeRules.clear(a,a,a.hitbox))'),true);
    assert.equal(h.run('state.entities.animals.length'),version===7?12:10);
    const position=plain(h.run('ScarecrowSystem.location(WORLD.layout)'));
    h.run(`resetGame(${seed},${version})`);
    assert.deepEqual(plain(h.run('ScarecrowSystem.location(WORLD.layout)')),position);
  }
});

test('approaching launches a staggered flock away from the chicken, with no points or rescues',()=>{
  const h=setup();step(h,1);assert.equal(h.run('s.mode'),'perched');
  h.run('c.x=s.x-100;ScarecrowSystem.update(state,.05)');
  assert.equal(h.run('s.mode'),'fleeing');
  assert.equal(h.run('s.birds.filter(b=>b.flying).length'),1);
  assert.equal(h.run('s.birds.every(b=>b.target.x>b.from.x)'),true);
  step(h,.6);
  assert.equal(h.run('s.birds.filter(b=>b.flying).length'),3);
  assert.equal(h.run('s.birds.every(b=>b.z>b.from.z&&b.x>b.from.x)'),true);
  step(h,3);
  assert.equal(h.run('s.mode'),'away');
  assert.equal(h.run('s.birds.every(b=>b.opacity===0)'),true);
  assert.equal(h.run('state.score+state.rescuedCount+state.rescuedChicks'),0);
  step(h,10);assert.equal(h.run('s.mode'),'away','wait until the chicken leaves');
});

test('the same three crows return and land; a second approach scares them again',()=>{
  const h=setup();h.run('c.x=s.x-100;var birds=[...s.birds]');step(h,3);
  h.run('c.x=s.x+450');step(h,6);assert.equal(h.run('s.mode'),'away');
  step(h,1.2);assert.equal(h.run('s.mode'),'returning');
  step(h,3.5);assert.equal(h.run('s.mode'),'perched');
  assert.equal(h.run('s.birds.every((b,i)=>b===birds[i]&&!b.flying&&b.opacity===1)'),true);
  h.run('c.x=s.x-100');step(h,.05);
  assert.equal(h.run('s.flights'),2);
});

test('walls and hiding prevent a scare, while pause, defeat and the lake freeze the flock',()=>{
  const h=setup();h.run('c.x=s.x-100;c.hidden=true');step(h,1);
  assert.equal(h.run('s.mode'),'perched');
  h.run('c.hidden=false;OBSTACLES=[{x:s.x-60,y:s.y-50,w:15,h:100}]');step(h,1);
  assert.equal(h.run('s.mode'),'perched');
  h.run('OBSTACLES=[]');step(h,.4);
  for(const phase of ['menu','lose','won','win_cutscene','lake']){
    h.run(`state.phase='${phase==='lake'?'playing':phase}';state.lake.active=${phase==='lake'};`);
    const before=h.run('JSON.stringify(s)');step(h,2);
    assert.equal(h.run('JSON.stringify(s)'),before,phase);
  }
});

test('returning crows react again instead of landing on an approaching chicken',()=>{
  const h=setup();h.run('c.x=s.x-100');step(h,3);h.run('c.x=s.x+450');step(h,7.8);
  assert.equal(h.run('s.mode'),'returning');
  h.run('c.x=s.x-100');step(h,.05);
  assert.equal(h.run('s.mode'),'fleeing');assert.equal(h.run('s.flights'),2);
});

test('reload places the same scarecrow and only one flock; retry resets its cycle',()=>{
  const h=setup();h.run('GameManager.save(state)');
  const loaded=createGame(()=>.5,{storage:new Map(h.storage),fullStartup:true});
  assert.deepEqual(plain(loaded.run('ScarecrowSystem.location(WORLD.layout)')),plain(h.run('ScarecrowSystem.location(WORLD.layout)')));
  assert.equal(loaded.run('state.scarecrow.birds.length'),3);
  loaded.run('GameManager.restore(state,GameManager.read());resetGame(52)');
  assert.equal(loaded.run('state.scarecrow.birds.length'),3);
  assert.equal(loaded.run('state.scarecrow.mode'),'perched');
});

test('real frames load with alpha, failed loading can retry, and the actual renderer draws post and birds',async()=>{
  const {createCanvas,loadImage}=require('@napi-rs/canvas'),path=require('node:path');
  const h=createGame(()=>.5,{skipScarecrowInstall:true}),art=h.run('ScarecrowArt');
  assert.equal(await art.load(async()=>({width:1,height:1})),false);
  h.run('GameUI.update(state)');assert.equal(h.elements.get('startBtn').disabled,true);
  assert.equal(await art.load(src=>loadImage(path.join(__dirname,'..',src))),true);
  h.run('GameUI.update(state)');assert.equal(h.elements.get('startBtn').disabled,false);
  const im=await loadImage(path.join(__dirname,'..',h.run('PremiumWildlifeData.scarecrow.src')));
  const c=createCanvas(im.width,im.height).getContext('2d');c.drawImage(im,0,0);
  for(const f of art.frames){
    const data=c.getImageData(f.x,f.y,f.w,f.h).data;let painted=0,empty=0;
    for(let i=3;i<data.length;i+=4){if(data[i]>100)painted++;if(data[i]===0)empty++;}
    assert.ok(painted>500&&empty>100);
  }
  h.run(`var draws={post:0,birds:0};ScarecrowArt.drawPost=()=>draws.post++;ScarecrowArt.drawCrow=()=>draws.birds++;renderGame()`);
  assert.deepEqual(plain(h.run('draws')),{post:1,birds:3});
  h.run('state.phase="win_cutscene";EndGameSequence.start(state);draws={post:0,birds:0};renderGame()');
  assert.deepEqual(plain(h.run('draws')),{post:0,birds:0});
});
