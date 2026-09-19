const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
const plain=value=>JSON.parse(JSON.stringify(value));

test('outlying habitats fill empty margins while preserving the established farm and its entrances',()=>{
  const h=createGame(()=>.5);
  for(const seed of [0,52,814237,391602]) {
    h.run(`resetGame(${seed},5);var old=JSON.parse(JSON.stringify(WORLD.layout));resetGame(${seed});`);
    assert.ok(h.run('WORLD.layout.habitats.length')>=6);
    assert.equal(h.run(`JSON.stringify(old.structures)===JSON.stringify(WORLD.layout.structures)&&
      JSON.stringify(old.paths)===JSON.stringify(WORLD.paths)&&
      JSON.stringify(old.animalSpawns)===JSON.stringify(WORLD.layout.animalSpawns.slice(0,10))`),true);
    assert.equal(h.run(`old.vegetation.every(v=>WORLD.layout.vegetation.some(n=>n.id===v.id&&n.x===v.x&&n.y===v.y))`),true);
    assert.equal(h.run(`WORLD.layout.habitats.every(p=>WildlifeRules.clear(p,p,{ox:0,oy:10,r:45}))`),true);
    assert.equal(h.run(`WORLD.layout.habitats.some(p=>p.x>2300)&&WORLD.layout.habitats.some(p=>p.y>1450)`),true);
  }
});

test('a version-5 adventure keeps its position, discoveries, health and completed lake when receiving habitats',()=>{
  const h=createGame(()=>.5);
  h.run(`resetGame(52,5);state.phase='playing';var c=state.entities.chicken;
    c.x=850;c.y=900;resolveEnvironment(c);GameManager.rescue(state,state.entities.animals[2]);
    state.lives=2;state.lake.completed=true;state.lake.misses=3;GameManager.save(state);
    var saved=GameManager.read(),position={x:c.x,y:c.y};GameManager.restore(state,saved);`);
  assert.equal(h.run('state.worldVersion'),7);
  assert.equal(h.run('distance(position,state.entities.chicken)'),0);
  assert.equal(h.run('state.rescuedCount'),1);assert.equal(h.run('state.lives'),2);
  assert.equal(h.run('state.lake.completed'),true);
  assert.ok(h.storage.has('galinha-guardia-save-before-map-7'));
});

function tracks(){
  const h=createGame(()=>.5);
  h.run(`OBSTACLES=[];var c=state.entities.chicken,w=state.entities.wolf;
    Object.assign(w,{x:2600,y:1600,huntUnlockTimer:0,pauseTimer:0});
    Object.assign(c,{x:1000,y:800,hidden:false,sprinting:true,sneaking:false});WolfAI.update(state,.05);
    c.x=1030;WolfAI.update(state,.05);c.x=1060;WolfAI.update(state,.05);
    c.sprinting=false;c.hidden=true;c.x=2100;c.y=1400;
    Object.assign(w,{x:1050,y:850,mode:'patrol',hearingCooldown:0});`);
  return h;
}
test('the wolf follows nearby physical footprints, not the hidden chicken; tracks expire and respect walls',()=>{
  const h=tracks();h.run('WolfAI.update(state,.05)');
  assert.equal(h.run('w.mode'),'investigate');
  assert.deepEqual(plain(h.run('w.heardPoint')),{x:1060,y:800});
  assert.equal(h.run('w.lastKnown'),null);
  const blocked=tracks();blocked.run('OBSTACLES=[{x:990,y:815,w:150,h:14}];WolfAI.update(state,.05)');
  assert.equal(blocked.run('w.heardPoint'),null);
  const expired=tracks();expired.run(`w.x=2600;w.y=1600;for(let i=0;i<90;i++)WolfAI.update(state,.1);
    Object.assign(w,{x:1050,y:850,mode:'patrol',hearingCooldown:0,heardPoint:null});WolfAI.update(state,.05);`);
  assert.equal(expired.run('w.heardPoint'),null);
});

test('Panto chooses a flank from an observed dodge and never rotates a committed attack',()=>{
  const h=createGame(()=>.5);
  h.run(`OBSTACLES=[];var g=state.entities.goose,c=state.entities.chicken;
    Object.assign(g,{x:1000,y:800,home:{x:1000,y:800},anchor:{x:1000,y:800},mode:'notice',timer:0,
      grace:0,cooldown:0,attempts:2,dodgeSide:-1});Object.assign(c,{x:1100,y:800,hidden:false,invulnerable:0});
    GooseSystem.update(state,.05);`);
  assert.equal(h.run('g.mode'),'circle');assert.ok(h.run('g.target.y')<800);
  h.run(`for(let i=0;i<160&&g.mode!=='warning';i++)GooseSystem.update(state,.05);`);
  assert.equal(h.run('g.mode'),'warning');const target=plain(h.run('g.target'));
  h.run('c.y+=70;GooseSystem.update(state,.05)');assert.deepEqual(plain(h.run('g.target')),target);
  h.run('c.hidden=true;c.x=2200;c.y=1400;var last=JSON.stringify(g.lastObserved);GooseSystem.update(state,.05)');
  assert.equal(h.run('JSON.stringify(g.lastObserved)===last'),true);
});
