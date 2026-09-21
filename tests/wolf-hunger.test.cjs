const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
function arena() {
  const game=createGame();
  game.run(`OBSTACLES=[];const wolf=state.entities.wolf,chicken=state.entities.chicken;
    Object.assign(wolf,{x:100,y:800,heading:0,huntUnlockTimer:0,pauseTimer:0});
    Object.assign(chicken,{x:1500,y:1400,hidden:true,sprinting:false});`);
  return game;
}
test('appetite makes every difficulty faster and more persistent with a firm sprint escape ceiling',()=>{
  const {run}=arena();
  for(const difficulty of ['easy','normal','hard','hardcore']) {
    run(`state.difficultyKey='${difficulty}';state.settings=DIFFICULTIES['${difficulty}'];`);
    const stages=JSON.parse(run(`JSON.stringify([0,.4,.8,1].map(value=>{state.wolfHunger=value;return WolfAI.getConfig(state)}))`));
    for(let i=1;i<stages.length;i++) {
      for(const key of ['speed','searchDuration','searchRadius','hideMemoryDuration','investigateDuration'])
        assert.ok(stages[i][key]>stages[i-1][key],difficulty+'/'+key);
      assert.ok(stages[i].awarenessDecay<stages[i-1].awarenessDecay);
    }
    run('state.rescuedCount=12;state.wolfLevel=3;state.rescuedChicks=10;');
    assert.ok(run('WolfAI.getConfig(state).speed<=state.settings.chickenSpeed*Player.sprintMultiplier*.96'));
    assert.ok(run('WolfAI.getConfig(state).searchDuration<=38.4+1e-10'));
    run('state.rescuedCount=0;state.wolfLevel=0;state.rescuedChicks=0;');
  }
});
test('hunger accumulates only during active hunting, stops at full, and is independent of frame rate',()=>{
  const {run}=arena();
  for(const [difficulty,seconds] of [['easy',420],['normal',240],['hard',180],['hardcore',140]]) {
    run(`state.difficultyKey='${difficulty}';state.settings=DIFFICULTIES['${difficulty}'];state.wolfHunger=0;
      for(let i=0;i<120;i++)WolfAI.update(state,1/60);`);
    assert.ok(Math.abs(run('state.wolfHunger')-2/seconds)<1e-10);
    run('state.wolfHunger=0;for(let i=0;i<60;i++)WolfAI.update(state,1/30);');
    assert.ok(Math.abs(run('state.wolfHunger')-2/seconds)<1e-10);
  }
  for(const setup of ["state.phase='menu'","state.phase='win'","state.phase='lose'",
    'state.lake.active=true','wolf.huntUnlockTimer=10','wolf.pauseTimer=10',"wolf.mode='frightened';wolf.fearTime=10"]) {
    run(`state.phase='playing';state.lake.active=false;wolf.mode='patrol';wolf.huntUnlockTimer=0;wolf.pauseTimer=0;
      state.wolfHunger=.4;${setup};WolfAI.update(state,.05);`);
    assert.equal(run('state.wolfHunger'),.4,setup);
  }
  run(`state.phase='playing';state.lake.active=false;wolf.mode='patrol';wolf.huntUnlockTimer=0;wolf.pauseTimer=0;
    state.wolfHunger=.99999;WolfAI.update(state,.05);`);
  assert.equal(run('state.wolfHunger'),1);
  run('state.wolfHunger=.5;[0,-1,NaN,Infinity].forEach(dt=>WolfAI.update(state,dt));');
  assert.equal(run('state.wolfHunger'),.5);
});
test('rescues increase hunger once, route resets preserve it and a new attempt clears it',()=>{
  const {run}=arena();
  assert.equal(run('GameManager.rescue(state,state.entities.animals[0])'),true);
  assert.equal(run('state.wolfHunger'),.035);
  assert.equal(run('GameManager.rescue(state,state.entities.animals[0])'),false);
  assert.equal(run('state.wolfHunger'),.035);
  run('GameManager.rescue(state,Object.assign(state.entities.chicks[0],{discovered:true}));');
  assert.ok(Math.abs(run('state.wolfHunger')-.045)<1e-12);
  run('WolfAI.initialize(state);');
  assert.ok(Math.abs(run('state.wolfHunger')-.045)<1e-12);
  run('resetGame(814237);');
  assert.equal(run('state.wolfHunger'),0);
});
test('a ravenous wolf searches longer but cannot track an unseen concealed player or search forever',()=>{
  const {run}=arena();
  run(`state.wolfHunger=1;state.wolfLevel=3;state.rescuedCount=10;state.rescuedChicks=6;
    Object.assign(wolf,{mode:'chase',lastKnown:{x:100,y:800}});WolfAI.update(state,.05);
    const remembered=JSON.stringify(wolf.lastKnown);chicken.x=2200;chicken.y=1200;`);
  assert.equal(run('wolf.mode'),'search');
  assert.equal(run('wolf.detected'),false);
  run('for(let i=0;i<800;i++)WolfAI.update(state,.05);');
  assert.equal(run('wolf.mode'),'patrol');
  assert.equal(run('wolf.searchTime'),0);
  assert.equal(run('JSON.stringify(wolf.lastKnown)'),run('remembered'));
  assert.equal(run('wolf.detected'),false);
});
test('save and resume preserve appetite, legacy saves start calm and invalid values are bounded',()=>{
  const {run}=arena();
  run('state.wolfHunger=.82;GameManager.save(state);const saved=GameManager.read();resetGame(814237);GameManager.restore(state,saved);');
  assert.equal(run('state.wolfHunger'),.82);
  for(const [raw,value] of [['undefined',0],['NaN',0],['Infinity',0],['-1',0],['100',1]]) {
    run(`GameManager.restore(state,{...saved,wolfHunger:${raw}});`);
    assert.equal(run('state.wolfHunger'),value);
  }
});
test('the meter and tier match actual appetite',()=>{
  const {run,elements}=arena();
  for(const [value,tier,label] of [[0,0,'À espreita'],[.35,1,'Faminto'],[.75,2,'Voraz']]) {
    run(`state.wolfHunger=${value};GameplayHud.update(state);`);
    assert.equal(elements.get('wolfHungerLabel').textContent,label);
    assert.equal(elements.get('wolfHungerMeter').value,value);
    assert.equal(elements.get('threatIndicator').dataset.hunger,String(tier));
  }
});
