const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');

function arena(random=()=>.5){
  const h=createGame(random);
  h.run(`OBSTACLES=[];var w=state.entities.wolf,c=state.entities.chicken;
    Object.assign(w,{x:900,y:800,heading:0,mode:'chase',huntUnlockTimer:0,pauseTimer:0,interceptCooldown:100});
    Object.assign(c,{x:1100,y:800,hidden:false,sprinting:false,invulnerable:0});`);
  return h;
}
function train(h){
  h.run(`for(let visit=0;visit<4;visit++)for(let frame=0;frame<13;frame++){
    Object.assign(w,{x:900,y:800,heading:0,mode:'chase'});c.x=1100+(visit%2)*65;WolfAI.update(state,.1);
  }`);
}

test('observed repeated routes change patrol utility; unseen movement supplies no habits',()=>{
  const cold=arena(),warm=arena();train(warm);
  assert.ok(warm.run('WolfAI.explain(w).regions.some(r=>r.weight>3)'));
  for(const h of [cold,warm])h.run(`
    WORLD.layout.seed=0;WORLD.layout.habitats=[];
    WORLD.areas=[{id:'test',x:0,y:0,w:2800,h:1800,hub:{x:900,y:800}},
      {id:'other',x:0,y:0,w:2800,h:1800,hub:{x:1700,y:800}},
      {id:'familiar',x:0,y:0,w:2800,h:1800,hub:{x:1100,y:800}}];
    Object.assign(c,{x:2500,y:1500,hidden:true});
    Object.assign(w,{x:900,y:800,mode:'patrol',patrolIndex:0,patrolPause:0,route:[],routeTimer:0});
    WolfAI.update(state,.05);`);
  assert.equal(cold.run('w.patrolIndex'),1);
  assert.equal(warm.run('w.patrolIndex'),2);
  assert.equal(cold.run('WolfAI.explain(w).regions.filter(r=>r.weight>0).length'),0);
  warm.run(`w.patrolPause=0;Object.assign(w,{x:1100,y:800,route:[],routeTimer:0});WolfAI.update(state,.05);`);
  assert.notEqual(warm.run('w.patrolIndex'),2,'recently inspected regions lose priority');
});

test('search learning is identical for different hidden positions and freezes in menus',()=>{
  const a=arena(),b=arena();
  for(const [h,x]of [[a,2000],[b,2600]]){
    train(h);h.run(`c.hidden=true;c.x=${x};c.y=1500;WolfAI.update(state,.05);`);
  }
  const snapshot='JSON.stringify([w.lastKnown,w.searchPoints,WolfAI.explain(w)])';
  assert.equal(a.run(snapshot),b.run(snapshot));
  a.run(`state.phase='menu';var before=JSON.stringify(WolfAI.explain(w));WolfAI.update(state,30);`);
  assert.equal(a.run('JSON.stringify(WolfAI.explain(w))'),a.run('before'));
});

test('habits decay, do not increase speed and belong to the current wolf',()=>{
  const h=arena();const speed=h.run('WolfAI.getConfig(state).speed');train(h);
  h.run('state.wolfHunger=0');assert.equal(h.run('WolfAI.getConfig(state).speed'),speed);
  h.run('c.hidden=true;w.pauseTimer=1000;WolfAI.update(state,721);');
  assert.equal(h.run('WolfAI.explain(w).regions.some(r=>r.weight>0)'),false);
  h.run('resetGame(814237);');
  assert.equal(h.run('WolfAI.explain(state.entities.wolf).regions.length'),0);
  const shy=arena(()=>.1),curious=arena(()=>.9);
  assert.notEqual(shy.run('WolfAI.explain(w).curiosity'),curious.run('WolfAI.explain(w).curiosity'));
});

test('a witnessed hide adds nearby public covers to search without locating a hidden player',()=>{
  const h=arena();
  h.run(`var spot={id:'learned-bush',type:'bush',x:1080,y:760,w:80,h:80};
    HidingSpots.getSpots=()=>[spot];var witnessed=WolfAI.witnessHide(state,spot);
    c.hidden=true;c.x=2500;c.y=1500;w.exposedCover=null;w.mode='chase';WolfAI.update(state,.05);`);
  assert.equal(h.run('witnessed'),true);
  assert.equal(h.run('WolfAI.explain(w).hides'),1);
  assert.ok(h.run('w.searchPoints.some(p=>p.x===1120&&p.y===800)'));
  assert.equal(h.run('w.searchPoints.some(p=>p.x===c.x&&p.y===c.y)'),false);
});

test('rescued residents yield to another resident, Panto and the player without blocking escape',()=>{
  for(const neighbour of ['resident','goose','player']){
    const h=arena();
    h.run(`var a=state.entities.animals[0],b=state.entities.animals[1];
      var safe=RescueSystem.safePosition(0);
      Object.assign(a,safe,{rescued:true,targetX:safe.x+50,targetY:safe.y,restTime:0});
      var other=${neighbour==='resident'?'b':neighbour==='goose'?'state.entities.goose':'c'};
      Object.assign(other,{x:a.x+27,y:a.y,rescued:true,hidden:false,restTime:100,targetX:a.x+27,targetY:a.y});
      var start={x:a.x,y:a.y},gap=distance(getHitbox(a),getHitbox(other));
      RescueSystem.update(state,.1);`);
    assert.ok(h.run('distance(getHitbox(a),getHitbox(other))>=gap-.01'),neighbour);
    h.run(`a.targetX=a.x-25;a.restTime=0;var before=a.x;RescueSystem.update(state,.1);`);
    assert.ok(h.run('a.x<before'),neighbour+' permits moving away');
  }
});

test('a safe resident roams near its own home without overlapping company',()=>{
  const h=arena();
  h.run(`var a=state.entities.animals[0],b=state.entities.animals[1],home=RescueSystem.safePosition(0);
    Object.assign(a,home,{rescued:true});Object.assign(b,{x:a.x+35,y:a.y,rescued:true});
    Math.random=()=>.1;RescueSystem.refugeWander(a,home,0,state);`);
  assert.ok(h.run('distance({x:a.targetX,y:a.targetY},a)>=8'));
  assert.ok(h.run('RescueSystem.refugeSpace(a,{x:a.targetX,y:a.targetY},b)>=1'));
  assert.ok(h.run('distance({x:a.targetX,y:a.targetY},home)<=60'));
});

test('debug renders observations and routes without changing simulation or storage',()=>{
  const h=arena();train(h);
  h.run(`var before=JSON.stringify(state);GameplayHud.setDebug(true);GameplayHud.drawTactics(state);`);
  assert.equal(h.run('JSON.stringify(state)'),h.run('before'));
  assert.equal(h.elements.get('aiDebug').hidden,false);
  assert.match(h.elements.get('aiDebug').textContent,/F3 IA/);
  assert.doesNotMatch(h.elements.get('aiDebug').textContent,/Lobo: sem destino/);
  assert.match(h.elements.get('aiDebug').textContent,/Alvo do lobo/);
  const storage=JSON.stringify([...h.storage]);
  h.run('GameplayHud.setDebug(false)');
  h.run('GameplayHud.drawTactics(state)');
  assert.equal(h.elements.get('aiDebug').hidden,true);
  assert.equal(JSON.stringify([...h.storage]),storage);
});
