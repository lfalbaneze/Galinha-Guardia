const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
function arena(species){
  const h=createGame();h.run(`FolkloreSystem.load(true);OBSTACLES=[];
    var c=state.entities.chicken,e=state.entities.folklore.find(e=>e.species===${JSON.stringify(species)});
    Object.assign(c,{x:1150,y:800,hidden:false,invulnerable:0});
    Object.assign(e,{x:1000,y:800,home:{x:1000,y:800},target:{x:1000,y:800},active:true,mode:'patrol',timer:0,grace:0,route:[],routeTimer:0});
    state.entities.folklore=[e];state.rescuedCount=10;state.folkloreThreats=[];
    state.entities.thor=null;state.lake.active=false;state.lives=3;`);return h;
}
const step=(h,seconds)=>h.run(`for(let i=0;i<${Math.ceil(seconds/.05)};i++)FolkloreSystem.update(state,.05)`);
test('safe homes are deterministic; only the common marten activates automatically',()=>{
  const h=createGame();
  for(const seed of [1,7,42,614,1099,2147483648]){
    h.run(`resetGame(${seed});state.phase='playing'`);
    assert.equal(h.run('state.entities.folklore.length'),5);
    assert.equal(h.run('state.entities.folklore.every(e=>!WildlifeRules.reserved(state,e,160)&&WildlifeRules.clear(e,e,e.hitbox))'),true);
    const homes=h.run('JSON.stringify(state.entities.folklore.map(e=>e.home))');
    h.run('FolkloreSystem.initialize(state)');assert.equal(h.run('JSON.stringify(state.entities.folklore.map(e=>e.home))'),homes);
  }
  h.run('state.rescuedCount=11;FolkloreSystem.update(state,.05)');
  assert.equal(h.run('state.entities.folklore.some(e=>e.active)'),false,'Missing art cannot produce invisible threats');
  h.run('FolkloreSystem.load(true);state.rescuedCount=0;FolkloreSystem.update(state,.05)');
  assert.equal(h.run('state.entities.folklore.some(e=>e.active)'),false);
  h.run('state.rescuedCount=1;FolkloreSystem.update(state,.05)');
  assert.equal(h.run('state.entities.folklore.filter(e=>e.active).map(e=>e.species).join()'),'fuinha');
  h.run('state.rescuedCount=9;FolkloreSystem.update(state,.05)');
  assert.equal(h.run('state.entities.folklore.filter(e=>e.active).length'),1);
});

test('secret bosses require discovery and interaction, take three counters, reward once and retain progress in saves',()=>{
  for(const species of ['mula-sem-cabeca','curupira','boitata','cuca']){
    const h=arena(species);
    h.run('e.active=false;c.x=1070;FolkloreSystem.update(state,.01)');
    assert.equal(h.run('e.active'),false);assert.equal(h.run('e.discovered'),true);
    h.run("state.phase='menu'");assert.equal(h.run('FolkloreSystem.interact(state)'),false);h.run("state.phase='playing'");
    assert.equal(h.run('FolkloreSystem.interact(state)'),true);assert.equal(h.run('e.active'),true);
    assert.equal(h.run('FolkloreSystem.interact(state)'),false,'no counter outside recovery');
    const score=h.run('state.score');
    for(let i=0;i<3;i++){
      h.run("e.mode='rest';e.timer=3;c.x=e.x+65;c.y=e.y");
      assert.equal(h.run('FolkloreSystem.interact(state)'),true);
      assert.equal(h.run('e.courage'),2-i);assert.equal(h.run('FolkloreSystem.interact(state)'),false);
    }
    assert.equal(h.run('e.defeated&&!e.active'),true);assert.equal(h.run('state.score'),score+250);
  }
  const h=createGame();h.run(`FolkloreSystem.load(true);state.rescuedCount=9;
    var e=state.entities.folklore.find(e=>e.species==='cuca');
    Object.assign(e,{active:true,discovered:true,courage:2});var saved=FolkloreSystem.snapshot(state);
    FolkloreSystem.restore(state,saved);`);
  assert.equal(h.run("state.entities.folklore.find(e=>e.species==='cuca').courage"),2);
  assert.equal(h.run("state.entities.folklore.find(e=>e.species==='cuca').active"),true);
  h.run("saved.find(e=>e.id==='folklore-cuca').courage=0;FolkloreSystem.restore(state,saved)");
  assert.equal(h.run("state.entities.folklore.find(e=>e.species==='cuca').defeated"),true);
  h.run("delete saved.find(e=>e.id==='folklore-cuca').courage;FolkloreSystem.restore(state,saved)");
  assert.equal(h.run("state.entities.folklore.find(e=>e.species==='cuca').active"),false,'legacy saves do not reveal secrets');
});
test('fuinha and mule commit to a warned line, allow dodging, stop at walls and cost only one heart',()=>{
  for(const species of ['fuinha','mula-sem-cabeca']){
    const h=arena(species);step(h,.05);assert.equal(h.run('e.mode'),'warning');
    const target=h.run('JSON.stringify(e.target)');h.run('c.y=940');step(h,1.9);
    assert.equal(h.run('JSON.stringify(e.target)'),target);assert.equal(h.run('state.lives'),3);
    const wall=arena(species);step(wall,.05);wall.run('OBSTACLES=[{x:1060,y:720,w:15,h:200}]');step(wall,2);
    assert.ok(wall.run('e.x')<1060);assert.equal(wall.run('state.lives'),3);
    const contact=arena(species);step(contact,2);assert.equal(contact.run('state.lives'),2);
    assert.ok(contact.run('c.invulnerable')>0);step(contact,1);assert.equal(contact.run('state.lives'),2);
  }
});
test('roots warn, fire expires and Cuca spells collide with walls; hiding and refuge prevent damage',()=>{
  const roots=arena('curupira');step(roots,.8);assert.equal(roots.run('state.folkloreThreats[0].kind'),'roots');
  assert.equal(roots.run('state.lives'),3);step(roots,1);assert.equal(roots.run('state.lives'),2);
  const hidden=arena('curupira');step(hidden,.8);hidden.run('c.hidden=true');step(hidden,2);assert.equal(hidden.run('state.lives'),3);
  const fire=arena('boitata');step(fire,.1);assert.equal(fire.run('state.folkloreThreats[0].kind'),'fire');
  fire.run('state.entities.folklore=[]');step(fire,3.2);assert.equal(fire.run('state.folkloreThreats.length'),0);
  const witch=arena('cuca');step(witch,1.2);assert.equal(witch.run('state.folkloreThreats.length'),3);
  witch.run('OBSTACLES=[{x:1060,y:600,w:20,h:400}];state.entities.folklore=[]');step(witch,1);
  assert.equal(witch.run('state.folkloreThreats.length'),0);assert.equal(witch.run('state.lives'),3);
  const refuge=arena('boitata');refuge.run(`Object.assign(c,WORLD.safeZone);state.folkloreThreats=[{...WORLD.safeZone,kind:'fire',species:'boitata',arm:0,life:2,vx:0,vy:0,r:30}]`);
  step(refuge,.5);assert.equal(refuge.run('state.lives'),3);
});
test('pause, lake and Thor freeze encounters; save/restore removes armed attacks and grants grace',()=>{
  const h=arena('cuca');step(h,.3);
  for(const pause of ["state.phase='menu'","state.lake.active=true","state.thorRescue={time:1,before:3,healed:false}"]){
    h.run(pause);const frozen=h.run('JSON.stringify([state.entities.folklore,state.folkloreThreats])');
    step(h,1);assert.equal(h.run('JSON.stringify([state.entities.folklore,state.folkloreThreats])'),frozen);
    h.run("state.phase='playing';state.lake.active=false;state.thorRescue=undefined");
  }
  h.run('resetGame(42);state.phase="playing";state.rescuedCount=9;FolkloreSystem.update(state,.05);var snap=FolkloreSystem.snapshot(state);GameManager.save(state)');
  assert.equal(h.run("JSON.parse(localStorage.getItem('galinha-guardia-save-v1')).folklore.length"),5);
  h.run('FolkloreSystem.restore(state,snap)');assert.equal(h.run('state.entities.folklore.every(e=>e.grace>=2&&e.mode==="return")'),true);
  assert.equal(h.run('state.folkloreThreats.length'),0);
  h.run('FolkloreSystem.restore(state,[{id:"folklore-cuca",x:NaN,y:Infinity,active:true}])');
  assert.equal(h.run('state.entities.folklore.every(e=>WildlifeRules.validPoint(e)&&!e.active)'),true);
});
