const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
function setup(mode='hardcore'){
  const h=createGame();h.run(`difficultySelect.value='${mode}';resetGame(52);state.phase='playing';`);return h;
}
function call(h,index){
  return h.run(`Object.assign(state.entities.chicken,{x:state.entities.chicks[${index}].x,y:state.entities.chicks[${index}].y,hidden:false,hidingSpotId:null});
    RescueSystem.callChick(state);`);
}
function panto(h){h.run(`Object.assign(state.lake,{completed:true,misses:3});GooseSystem.rescue(state);`);}

test('ten real chick calls pay 5,10,20,40,50 then stay capped, with 3..7 seconds of capped combo extension',()=>{
  const h=setup(),rewards=[5,10,20,40,50,50,50,50,50,50],waits=[0,6,3,4,4,6,7,7,7,7],windows=[10,7,8,9,10,10,10,10,10,10];
  for(let i=0;i<10;i++){
    h.run(`GameManager.update(state,${waits[i]});`);const before=h.run('state.timeRemaining');
    assert.equal(call(h,i),true,`chick ${i+1} must be callable from its cover`);
    assert.equal(h.run('state.timeRemaining'),before+rewards[i]);
    assert.equal(h.run('state.chickCombo.count'),i+1);
    assert.equal(h.run('state.chickCombo.remaining'),windows[i]);
    assert.equal(h.elements.get('comboMultiplier').textContent,`Combo ×${rewards[i]/5}`);
    assert.equal(h.elements.get('timeReward').textContent,`+${rewards[i]}s`);
  }
  assert.equal(h.run('state.score'),2000);
  assert.equal(h.elements.get('chicksTotal').textContent,'/ 10');
  assert.equal(h.run('new Set(state.entities.chicks.map(c=>c.coverId)).size'),10);
});

test('combo expires at ten seconds, restarts at five, and duplicate pickups do not extend it',()=>{
  const h=setup();call(h,0);h.run('GameManager.update(state,9.99);');
  assert.equal(h.run('state.chickCombo.count'),1);
  h.run('GameManager.update(state,.01);GameUI.update(state);');
  assert.equal(h.run('state.chickCombo.count'),0);
  assert.equal(h.elements.get('chickCombo').hidden,true);
  const before=h.run('state.timeRemaining');call(h,1);
  assert.equal(h.run('state.timeRemaining'),before+5);
  h.run('GameManager.update(state,1);');
  assert.equal(h.run('GameManager.rescue(state,state.entities.chicks[1])'),false);
  assert.equal(h.run('state.chickCombo.remaining'),9);
});

test('an active combo cannot prevent a timeout or restore a lost run, and retry resets both clocks',()=>{
  const h=setup();call(h,0);
  h.run('state.timeRemaining=.01;updateGame(.05);');
  assert.equal(h.run('state.phase'),'lose');
  assert.equal(h.run('state.lives'),3);
  assert.equal(call(h,1),false);
  h.run('var saved=GameManager.read();resetGame(52);GameManager.restore(state,saved);');
  assert.equal(h.run('state.phase'),'lose');
  h.events.elements.replayBtn.click();
  assert.equal(h.run('state.timeRemaining'),45);
  assert.equal(h.run('state.chickCombo.count'),0);
});

test('friends pay fifteen per pair, include Panto, and do not alter the chick combo',()=>{
  const h=setup();call(h,0);h.run('GameManager.update(state,2);');
  const before=h.run('state.timeRemaining');
  h.run('GameManager.rescue(state,state.entities.animals[0]);');
  assert.equal(h.run('state.timeRemaining'),before);
  panto(h);
  assert.equal(h.run('state.timeRemaining'),before+15);
  h.run('GameManager.rescue(state,state.entities.animals[1]);GameManager.rescue(state,state.entities.animals[2]);');
  assert.equal(h.run('state.timeRemaining'),before+30);
  assert.equal(h.run('state.chickCombo.remaining'),8);
  assert.equal(h.run('state.chickCombo.count'),1);
  h.run('GooseSystem.rescue(state);GameManager.rescue(state,state.entities.animals[2]);');
  assert.equal(h.run('state.timeRemaining'),before+30);
});

test('combo and odd friend progress survive pause and full reload without replaying rewards',()=>{
  const h=setup();call(h,0);call(h,1);
  h.run('GameManager.rescue(state,state.entities.animals[0]);GameManager.update(state,4);GameUI.showMenu(state);updateGame(20);');
  assert.equal(h.run('state.chickCombo.remaining'),6);
  const resumed=createGame(()=>.5,{storage:new Map(h.storage),fullStartup:true});
  assert.equal(resumed.run('state.chickCombo.count'),2);
  assert.equal(resumed.run('state.chickCombo.remaining'),6);
  assert.equal(resumed.run('state.entities.chicks.length'),10);
  assert.equal(resumed.run('state.timeRemaining'),56);
  resumed.events.elements.continueBtn.click();
  resumed.run('GameManager.rescue(state,state.entities.animals[1]);');
  assert.equal(resumed.run('state.timeRemaining'),71);
  call(resumed,2);
  assert.equal(resumed.run('state.timeRemaining'),91);
  assert.equal(resumed.run('state.chickCombo.remaining'),10);
});

test('Thor freezes both clocks and the lake continues counting down the combo',()=>{
  const h=setup();call(h,0);
  h.run('state.lake.active=true;GameManager.update(state,2);state.lake.active=false;state.lives=1;state.thorVisit.boneIds=ThorSystem.bones(state).map(b=>b.id);ThorSystem.request(state);updateGame(.05);');
  assert.equal(h.run('state.chickCombo.remaining'),8);
  assert.equal(h.run('state.timeRemaining'),48);
  h.run('resetGame(52);');
  assert.equal(h.run('state.chickCombo.count'),0);
  assert.equal(h.run('state.chickCombo.remaining'),0);
});

test('time bonus uses four points per second, independent of combo, and is credited once',()=>{
  for(const expire of [false,true]){
    const h=setup();for(let i=0;i<8;i++)call(h,i);
    if(expire)h.run('GameManager.update(state,10);');
    h.run('for(const a of state.entities.animals)GameManager.rescue(state,a);state.timeRemaining=30;GameManager.win(state);');
    assert.equal(h.run('state.timeBonus'),120);
    assert.equal(h.run('state.score'),4870);
    h.run('GameManager.win(state);var saved=GameManager.read();resetGame(52);GameManager.restore(state,saved);state.phase="won";GameUI.update(state);');
    assert.equal(h.run('state.score'),4870);
    assert.match(h.elements.get('endTimeBonus').textContent,/30s × 4/);
  }
});

test('hardcore without chicks still earns its survival bonus; other modes keep six chicks',()=>{
  for(const mode of ['easy','normal','hard','hardcore']){
    const h=setup(mode);assert.equal(h.run('state.entities.chicks.length'),mode==='hardcore'?10:6);
    if(mode!=='hardcore'){
      call(h,0);call(h,1);
      assert.equal(h.run('state.chickCombo.count'),0);
      assert.equal(h.run('state.timeRemaining'),mode==='hard'?100:null);
    }else{
      h.run('for(const a of state.entities.animals)GameManager.rescue(state,a);GameManager.win(state);');
      assert.equal(h.run('state.timeBonus'),540);assert.equal(h.run('state.score'),3690);
    }
  }
});

test('old six-chick hardcore saves gain four hidden chicks while preserving time, score and old homes',()=>{
  const h=setup();call(h,0);
  h.run(`GameManager.save(state);var saved=GameManager.read();saved.version=4;saved.score=100;saved.chicks=saved.chicks.slice(0,6);
    delete saved.chickCombo;delete saved.timeBonusRate;delete saved.legacyTimer;saved.timeRemaining=290;
    var originalHomes=JSON.stringify(saved.chicks.map(c=>c.coverId));resetGame(52);GameManager.restore(state,saved);state.phase='playing';`);
  assert.equal(h.run('state.entities.chicks.length'),10);
  assert.equal(h.run('state.rescuedChicks'),1);
  assert.equal(h.run('state.score'),100);
  assert.equal(h.run('state.entities.chicks.slice(6).every(c=>!c.rescued&&!c.discovered)'),true);
  assert.equal(h.run('JSON.stringify(state.entities.chicks.slice(0,6).map(c=>c.coverId))===originalHomes'),true);
  h.run('GameManager.save(state);saved=GameManager.read();resetGame(52);GameManager.restore(state,saved);');
  assert.equal(h.run('state.timeRemaining'),290);
  assert.equal(h.run('state.chickCombo.count'),0);
});

test('ten bonus homes and nests are unique and reachable across seeded maps, preserving the original six',()=>{
  const h=setup();
  for(const seed of [0,52,814237,4294967295]){
    h.run(`resetGame(${seed});var homes=HidingSpots.bonusHomes(WORLD.layout,10),old=HidingSpots.bonusHomes();`);
    assert.equal(h.run('JSON.stringify(homes.slice(0,6))===JSON.stringify(old)'),true);
    assert.equal(h.run('new Set(homes.map(h=>h.coverId)).size'),10);
    assert.equal(h.run('homes.every(p=>distance(WolfAI.findPath(state.entities.chicken,p).at(-1),p)<4)'),true);
    assert.equal(h.run('new Set(state.entities.chicks.map((c,i)=>JSON.stringify(RescueSystem.chickPosition(i)))).size'),10);
    assert.equal(h.run('state.entities.chicks.every((c,i)=>WildlifeRules.clear({...c,...RescueSystem.chickPosition(i)},RescueSystem.chickPosition(i),c.hitbox))'),true);
  }
});
