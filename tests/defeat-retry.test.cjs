const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
const SAVE='galinha-guardia-save-v1';

function lose(version=7){
  const h=createGame(()=>.5);
  h.run(`difficultySelect.value='hard';resetGame(52,${version});state.phase='playing';
    GameManager.rescue(state,state.entities.animals[0]);
    GameManager.rescue(state,Object.assign(state.entities.chicks[0],{discovered:true}));
    state.entities.animals[2].discovered=true;state.lake.completed=true;state.lake.misses=3;
    state.elapsed=47;state.lives=1;
    Object.assign(state.entities.wolf,{x:state.entities.chicken.x,y:state.entities.chicken.y,huntUnlockTimer:0,pauseTimer:0});
    Player.checkCatch(state);GameUI.update(state);`);
  assert.equal(h.run('state.phase'),'lose');
  assert.equal(h.run('state.lives'),0);
  return h;
}
function freshAttempt(h){
  for(const [key,value] of Object.entries({phase:'playing',worldSeed:52,difficultyKey:'hard',lives:3,
    score:0,elapsed:0,rescuedCount:0,rescuedChicks:0,wolfLevel:0,winBonusApplied:false}))
    assert.equal(h.run(`state.${key}`),value,key);
  assert.equal(h.run('state.rescuedIds.size+state.rescuedChickIds.size'),0);
  assert.equal(h.run('RescueSystem.all(state).every(a=>!a.rescued&&!a.discovered)'),true);
  assert.equal(h.run('state.lake.completed'),false);
  assert.equal(h.run('state.lake.misses'),0);
  assert.equal(h.run('state.entities.wolf.mode'),'patrol');
  assert.equal(h.run('distance(state.entities.chicken,WORLD.layout.start)'),0);
  assert.ok(h.run('distance(state.entities.wolf,state.entities.chicken)')>500);
  assert.equal(h.run('GameManager.read().phase'),'playing');
  assert.equal(h.run('GameManager.read().rescuedIds.length'),0);
  assert.equal(h.run('GameManager.read().score'),0);
  assert.equal(h.elements.get('rescuedCount').textContent,'0');
}

test('Revanche resets the entire failed attempt on the same farm and difficulty',()=>{
  const h=lose();
  assert.equal(h.elements.get('replayBtn').textContent,'Revanche');
  assert.equal(h.elements.get('endTitle').textContent,'GAME OVER');
  assert.equal(h.elements.get('endEyebrow').textContent,'SEM VIDAS');
  assert.match(h.elements.get('endRetryNote').textContent,/Mesma fazenda.*Placar zerado.*Personagens mantidos/);
  assert.equal(h.elements.get('expeditionBar').hidden,true);
  assert.equal(h.elements.get('gameFeedback').hidden,true);
  assert.equal(h.run('GameManager.read().phase'),'lose');
  assert.equal(h.run('GameManager.read().lives'),0);
  h.events.elements.replayBtn.click();
  freshAttempt(h);
  assert.equal(h.run('GameManager.rescue(state,state.entities.animals[0])'),true);
  assert.equal(h.run('state.score'),150,'friends must be earned again at the hard-mode rate');
});

test('going to the menu after defeat cannot resume the lost rescues with replenished lives',()=>{
  const h=lose();
  h.events.elements.menuBtn.click();
  assert.equal(h.run('state.resumePhase'),'lose');
  assert.equal(h.run('state.lives'),0);
  assert.equal(h.elements.get('continueBtn').textContent,'Tentar novamente');
  h.run('updateGame(10);ThorSystem.update(state,10);GameManager.save(state)');
  assert.equal(h.run('state.lives'),0);
  assert.equal(h.run('GameManager.read().phase'),'lose');
  h.events.elements.continueBtn.click();
  freshAttempt(h);
});

test('repeated reloads preserve the defeat and retry starts from zero',()=>{
  let h=lose();
  for(let i=0;i<2;i++){
    h=createGame(()=>.5,{storage:new Map(h.storage),fullStartup:true});
    assert.equal(h.run('state.phase'),'menu');
    assert.equal(h.run('state.resumePhase'),'lose');
    assert.equal(h.run('state.lives'),0);
    assert.equal(h.run('state.rescuedCount'),1,'the old result is only a defeat summary');
    assert.equal(h.run('GameManager.read().phase'),'lose');
    assert.equal(h.run('GameManager.read().lives'),0);
    assert.equal(h.elements.get('continueBtn').textContent,'Tentar novamente');
  }
  h.events.elements.continueBtn.click();
  freshAttempt(h);
});

test('legacy automatic-recovery saves also require a fresh attempt, including old maps',()=>{
  for(const version of [6,7]){
    const original=lose(version),saved=JSON.parse(original.storage.get(SAVE));
    Object.assign(saved,{phase:'playing',lives:3,needsRecovery:true});
    original.storage.set(SAVE,JSON.stringify(saved));
    const h=createGame(()=>.5,{storage:new Map(original.storage),fullStartup:true});
    assert.equal(h.run('state.resumePhase'),'lose');
    assert.equal(h.run('state.lives'),0);
    assert.equal(h.run('GameManager.read().needsRecovery'),undefined);
    h.events.elements.continueBtn.click();
    freshAttempt(h);
  }
});

test('pausing and reloading an unfinished adventure preserves its remaining lives and progress',()=>{
  const first=createGame(()=>.5);
  first.run(`GameManager.rescue(state,state.entities.animals[0]);state.lives=2;
    state.score=460;state.elapsed=23;GameUI.showMenu(state);`);
  const h=createGame(()=>.5,{storage:new Map(first.storage),fullStartup:true});
  assert.equal(h.elements.get('continueBtn').textContent,'Continuar resgate');
  h.events.elements.continueBtn.click();
  assert.equal(h.run('state.phase'),'playing');
  assert.equal(h.run('state.lives'),2);
  assert.equal(h.run('state.rescuedCount'),1);
  assert.equal(h.run('state.score'),460);
  assert.equal(h.run('state.elapsed'),23);
});
