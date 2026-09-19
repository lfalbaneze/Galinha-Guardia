const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
const SAVE='galinha-guardia-save-v1';

test('a failed random farm packing retries with a reproducible seed and saves that farm',()=>{
  const h=createGame(()=>.5);
  h.run(`var generateFarm=MapManager.generate,attempted=[];
    MapManager.generate=(seed,version)=>{attempted.push(seed);
      if(attempted.length===1)throw Error('Unable to reserve complete farm districts');
      return generateFarm(seed,version);};resetGame();MapManager.generate=generateFarm;`);
  assert.equal(h.run('attempted.length'),2);
  assert.equal(h.run('attempted[0]!==attempted[1]'),true);
  assert.equal(h.run('GameManager.read().worldSeed===attempted[1]'),true);
});

test('each farm has twelve distinct rescue friends and no decorative animal population',()=>{
  const h=createGame(()=>.5);
  for(const seed of [52,814237,4294967295]) {
    h.run(`resetGame(${seed});state.phase='playing';GameUI.update(state);`);
    assert.equal(h.run('WORLD.targetRescues'),12);
    assert.equal(h.run('state.entities.animals.length'),12);
    assert.equal(h.run('new Set(state.entities.animals.map(a=>a.species)).size'),12);
    assert.equal(h.run('state.entities.residents'),undefined);
    assert.equal(h.run('typeof FarmResidents'),'undefined');
    assert.equal(h.run('state.entities.animals.every(a=>WildlifeRules.clear(a,a,a.hitbox))'),true);
    assert.equal(h.elements.get('rescueGoal').textContent,'/ 12');
    assert.equal(h.run('new Set(state.entities.animals.map((a,i)=>JSON.stringify(RescueSystem.safePosition(i)))).size'),12);
    h.run('updateGame(.05);renderGame()');
  }
});

test('horse and turkey are rescued by contact, award points once and occupy different clear homes',()=>{
  const h=createGame(()=>.5);
  h.run(`state.entities.wolf.huntUnlockTimer=100;state.entities.chicken.sneaking=true;`);
  for(const [index,species] of ['horse','turkey'].entries()) {
    h.context.species=species;
    h.run(`var a=state.entities.animals.find(a=>a.species===species);
      Object.assign(state.entities.chicken,{x:a.x,y:a.y});RescueSystem.update(state,0);`);
    assert.equal(h.run('a.rescued'),true);
    assert.equal(h.run('state.rescuedCount'),index+1);
    assert.equal(h.run('state.score'),(index+1)*100);
    assert.equal(h.run('GameManager.rescue(state,a)'),false);
    assert.equal(h.run('distance(a,RescueSystem.safePosition(state.entities.animals.indexOf(a)))'),0);
    assert.equal(h.run('WildlifeRules.clear(a,a,a.hitbox)'),true);
    assert.equal(h.run('state.rescueNotice.total'),12);
  }
  const loaded=createGame(()=>.5,{storage:new Map(h.storage),fullStartup:true});
  assert.equal(loaded.run('state.rescuedCount'),2);
  assert.equal(loaded.run('state.entities.animals.filter(a=>a.rescued).map(a=>a.species).join(",")'),'horse,turkey');
});

test('the first ten rescues keep the mission playing; horse and turkey complete it',()=>{
  const h=createGame(()=>.5);
  h.run('for(const a of state.entities.animals.slice(0,10))GameManager.rescue(state,a);GameManager.win(state);');
  assert.equal(h.run('state.phase'),'playing');
  h.run('GameManager.rescue(state,state.entities.animals[10]);GameManager.win(state)');
  assert.equal(h.run('state.phase'),'playing');
  h.run('GameManager.rescue(state,state.entities.animals[11]);GameManager.win(state)');
  assert.equal(h.run('state.phase'),'win_cutscene');
});

test('version 6 saves gain only the two new rescues and preserve their existing progress',()=>{
  const h=createGame(()=>.5);
  h.run(`resetGame(52,6);state.phase='playing';GameManager.rescue(state,state.entities.animals[4]);
    state.lives=2;state.score=460;state.lake.completed=true;state.lake.misses=3;GameManager.save(state);`);
  const previous=h.storage.get(SAVE);
  const loaded=createGame(()=>.5,{storage:new Map(h.storage),fullStartup:true});
  assert.equal(loaded.run('state.worldVersion'),7);
  assert.equal(loaded.run('state.rescuedCount'),1);
  assert.equal(loaded.run('state.score'),460);
  assert.equal(loaded.run('state.lives'),2);
  assert.equal(loaded.run('state.lake.completed'),true);
  assert.equal(loaded.run('state.entities.animals.length'),12);
  assert.equal(loaded.run('state.entities.animals.slice(10).every(a=>!a.rescued)'),true);
  assert.equal(loaded.storage.get('galinha-guardia-save-before-map-7'),previous);
  assert.equal(loaded.run('GameManager.read().animals.length'),12);
  loaded.run('GameManager.restore(state,GameManager.read())');
  assert.equal(loaded.run('state.rescuedCount'),1);
});

test('a completed old adventure stays completed without awarding its score twice',()=>{
  const h=createGame(()=>.5);
  h.run(`resetGame(52,6);state.phase='playing';for(const a of state.entities.animals)GameManager.rescue(state,a);
    state.phase='won';state.winBonusApplied=true;state.score=1450;GameManager.save(state);`);
  const loaded=createGame(()=>.5,{storage:new Map(h.storage),fullStartup:true});
  assert.equal(loaded.run('state.rescuedCount'),12);
  assert.equal(loaded.run('state.score'),1450);
  assert.equal(loaded.run('state.entities.animals.every(a=>a.rescued)'),true);
  assert.equal(loaded.run('GameManager.read().rescuedIds.length'),12);
});
