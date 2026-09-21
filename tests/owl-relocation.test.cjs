const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createGame}=require('./helpers.cjs');
function arena(random=.5){
 const h=createGame(()=>random);
 h.run(`OBSTACLES=[];var o=state.entities.owls[0],c=state.entities.chicken,w=state.entities.wolf;
  state.entities.owls=[o];state.entities.chicks=[];camera.x=700;camera.y=400;
  WORLD.layout.vegetation=[1200,1600,2000,2400].map((x,i)=>({id:'tree-'+i,type:'tree',x:x-50,y:500,w:100,h:130,blockingRect:{x:x-12,y:600,w:24,h:20}}));
  WildlifeRules.reserved=()=>false;WildlifeRules.pathDistance=()=>0;
  Object.assign(o,{x:1200,y:620,perch:{x:1200,y:620},heading:0,direction:'right',treeId:'tree-0',mode:'watch',grace:0,cooldown:0,alertTime:.35,alertProgress:0,flight:null,callTime:0,movePending:false});
  Object.assign(c,{x:1320,y:620,hidden:false,invulnerable:0,sneaking:false});
  Object.assign(w,{x:1400,y:620,mode:'patrol',huntUnlockTimer:0,pauseTimer:0});
  var sounds=[];AudioSystem.play=name=>sounds.push(name);`);
 return h;
}
const step=(h,s)=>h.run(`for(let i=0;i<${Math.ceil(s/.05)};i++)OwlSystem.update(state,.05)`);
function fly(h){step(h,.35);h.run('c.hidden=true');step(h,.8);assert.equal(h.run('o.mode'),'relocate');}
test('siren and wolf reaction coincide; the owl finishes the call before taking off',()=>{
 const h=arena();step(h,.3);assert.equal(h.run('sounds.length'),0);assert.equal(h.run('w.mode'),'patrol');
 step(h,.05);assert.equal(h.run('sounds.join()'),'owl-siren');assert.equal(h.run('w.mode'),'investigate');
 step(h,.65);assert.equal(h.run('o.mode'),'cooldown');assert.equal(h.run('o.x'),1200);
 step(h,.1);assert.equal(h.run('o.mode'),'relocate');assert.notEqual(h.run('o.flight.treeId'),'tree-0');
 assert.equal(h.run('o.treeId'),'tree-0');assert.equal(h.run('OwlSystem.canSee(o,c)'),false);
 step(h,1);assert.equal(h.run('sounds.length'),1);assert.equal(h.run('w.heardPoint.x'),1320);
});
test('random choices differ, skip occupied and hidden-player trees, and prefer trees without bonuses',()=>{
 const a=arena(0),b=arena(.99);fly(a);fly(b);assert.notEqual(a.run('o.flight.treeId'),b.run('o.flight.treeId'));
 const h=arena();h.run(`state.entities.owls.push({...o,id:'other',treeId:'tree-1',grace:100,perch:{x:1600,y:620},x:1600});
  state.entities.chicks=[{coverId:'tree-2'}];`);fly(h);assert.equal(h.run('o.flight.treeId'),'tree-3');
 const blocked=arena();blocked.run(`state.entities.owls.push(...[1,2].map(i=>({...o,id:'other-'+i,treeId:'tree-'+i,grace:100,perch:{x:1200+i*400,y:620},x:1200+i*400})));c.hidingSpotId='tree-3';`);
 step(blocked,1.2);assert.equal(blocked.run('o.flight'),null);assert.equal(blocked.run('o.movePending'),true);
 blocked.run('c.hidingSpotId=null;c.hidden=true');step(blocked,1.1);assert.equal(blocked.run('o.mode'),'relocate');
});
test('flight has bounded smooth motion, drawn wingbeats, then lands exactly on the reserved tree',()=>{
 const h=arena();fly(h);h.run(`var destination={...o.flight.to},targetTree=o.flight.treeId,previous={x:o.x,y:o.y},maxStep=0,columns=new Set();
  for(let i=0;i<200&&o.mode==='relocate';i++){OwlSystem.update(state,.05);maxStep=Math.max(maxStep,distance(o,previous));previous={x:o.x,y:o.y};if(o.mode==='relocate')columns.add(OwlArt.frameFor(o).column);}`);
 assert.ok(h.run('maxStep')<=16.51);assert.equal(h.run('columns.size'),12);
 assert.equal(h.run('distance(o,destination)'),0);assert.equal(h.run('o.treeId===targetTree'),true);
 assert.equal(h.run('o.previousTreeId'),'tree-0');assert.equal(h.run('o.flight'),null);assert.equal(h.run('o.moving'),false);
 assert.equal(h.run('o.vx'),0);assert.ok(h.run('o.grace')>0);assert.equal(h.run('sounds.length'),1);
});
test('flight and pending alarm freeze during pause, endings and the lake challenge',()=>{
 for(const phase of ['menu','won','lose','win_cutscene','lake']){
  const h=arena();fly(h);h.run(phase==='lake'?'state.lake.active=true':`state.phase='${phase}'`);
  const before=h.run('JSON.stringify(o)');step(h,1);assert.equal(h.run('JSON.stringify(o)'),before);
 }
});
test('cancelled sight cannot start a siren or relocation',()=>{
 const h=arena();step(h,.2);h.run('c.hidden=true');step(h,4);
 assert.equal(h.run('sounds.length'),0);assert.equal(h.run('o.movePending'),false);assert.equal(h.run('o.treeId'),'tree-0');
});

test('after landing the owl watches again and completes a second alarm and flight',()=>{
 const h=arena(0);fly(h);h.run(`for(let i=0;i<200&&o.flight;i++)OwlSystem.update(state,.05)`);
 assert.equal(h.run('o.flight'),null);assert.equal(h.run('o.mode'),'watch');assert.equal(h.run('o.cooldown'),0);
 const firstTree=h.run('o.treeId');
 h.run(`camera.x=o.x-300;camera.y=o.y-200;c.hidden=false;c.invulnerable=0;
  c.x=o.x+Math.cos(o.heading)*90;c.y=o.y+Math.sin(o.heading)*90;`);
 step(h,1);assert.equal(h.run('sounds.length'),2);
 step(h,1);assert.equal(h.run('o.mode'),'relocate');assert.notEqual(h.run('o.flight.treeId'),firstTree);
});

test('a safe tree farther from a path is a fallback when roadside perches are occupied',()=>{
 const h=arena();h.run(`WildlifeRules.pathDistance=p=>p.x===1600?300:0;
  state.entities.chicks=[{coverId:'tree-2'},{coverId:'tree-3'}];`);
 fly(h);assert.equal(h.run('o.flight.treeId'),'tree-1');
});

test('with all destinations temporarily occupied the owl resumes watching and retries when a tree frees up',()=>{
 const h=arena();h.run(`state.entities.owls.push(...[1,2,3].map(i=>({...o,id:'other-'+i,treeId:'tree-'+i,grace:100,perch:{x:1200+i*400,y:620},x:1200+i*400})));`);
 step(h,.35);h.run('c.hidden=true');step(h,6);
 assert.equal(h.run('o.mode'),'watch');assert.equal(h.run('o.movePending'),true);
 h.run('state.entities.owls=[o]');step(h,1.1);assert.equal(h.run('o.mode'),'relocate');
});

test('sparse generated farms keep relocating even when the remaining trees hold chicks',()=>{
 const h=createGame(()=>.5);
 for(const seed of [1,3,63]){
  h.run(`resetGame(${seed});state.phase='playing';state.entities.chicken.hidden=true;`);
  for(let cycle=0;cycle<3;cycle++){
   const before=h.run('state.entities.owls.map(o=>o.treeId)');
   h.run(`for(const owl of state.entities.owls){owl.movePending=true;owl.cooldown=5.5;owl.grace=0;}
    for(let i=0;i<400;i++)OwlSystem.update(state,.05);`);
   const after=h.run('state.entities.owls.map(o=>o.treeId)');
   after.forEach((tree,i)=>assert.notEqual(tree,before[i],`seed ${seed}, cycle ${cycle}, owl ${i}`));
   assert.ok(h.run(`state.entities.owls.every(o=>o.mode==='watch'&&!o.movePending&&!o.flight)`));
  }
 }
});

test('older saves with an alarm cooldown still send the owl to a new tree',()=>{
 const h=createGame();h.run(`var saved=OwlSystem.snapshot(state);saved[0].cooldown=4;delete saved[0].movePending;
  OwlSystem.restore(state,saved);state.entities.chicken.hidden=true;`);
 assert.equal(h.run('state.entities.owls[0].movePending'),true);
 step(h,1.1);assert.equal(h.run('state.entities.owls[0].mode'),'relocate');
});
test('seeded farms preserve the selected tree through save and restore, including midflight',()=>{
 const h=createGame(()=>.5);let flights=0;
 for(let seed=0;seed<20;seed++){
  h.run(`resetGame(${seed});state.phase='playing';state.entities.chicken.hidden=true;
   for(const owl of state.entities.owls){owl.movePending=true;owl.cooldown=5;owl.grace=0;}
   OwlSystem.update(state,.05);`);
  for(const owl of h.run('state.entities.owls'))if(owl.flight){
   flights++;assert.notEqual(owl.flight.treeId,owl.treeId);
   assert.ok(h.run(`!WildlifeRules.reserved(state,{x:${owl.flight.to.x},y:${owl.flight.to.y}},100)`));
  }
  h.run(`var savedOwls=OwlSystem.snapshot(state),expectedTrees=JSON.stringify(savedOwls.map(o=>o.treeId));OwlSystem.restore(state,savedOwls);`);
  assert.equal(h.run('JSON.stringify(state.entities.owls.map(o=>o.treeId))'),h.run('expectedTrees'));
  assert.ok(h.run('state.entities.owls.every(o=>!o.flight&&o.grace===2&&o.callTime===undefined)'));
  assert.equal(h.run('new Set(state.entities.owls.map(o=>o.treeId)).size'),h.run('state.entities.owls.length'));
 }
 assert.ok(flights>=10);
});
test('both toy sirens are local short PCM clips with headroom and a modulated pitch',()=>{
 const folder=path.join(__dirname,'../assets/audio/effects/v1');
 for(const file of ['owl-siren.wav','owl-siren-2.wav']){
  const b=fs.readFileSync(path.join(folder,file)),rate=b.readUInt32LE(24);assert.equal(b.toString('ascii',0,4),'RIFF');
  assert.ok(Math.abs((b.length-44)/2/rate-.72)<.001);let peak=0,energy=0;const counts=[];
  for(let i=44;i<b.length;i+=2){const v=b.readInt16LE(i)/32768;peak=Math.max(peak,Math.abs(v));energy+=v*v;}
  for(let start=.06;start<.6;start+=.05){let crosses=0;for(let i=Math.round(start*rate);i<(start+.04)*rate;i++)if(b.readInt16LE(44+i*2)<=0&&b.readInt16LE(46+i*2)>0)crosses++;counts.push(crosses);}
  assert.ok(peak<.66&&peak>.2);assert.ok(Math.sqrt(energy/((b.length-44)/2))>.15);assert.ok(Math.max(...counts)-Math.min(...counts)>8);
 }
});
