const test=require('node:test');
const assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');

test('difficulty changes opposition and rewards while movement remains familiar',()=>{
  const h=createGame();
  const speeds=[];
  for(const mode of ['easy','normal','hard','hardcore']){
    h.run(`difficultySelect.value='${mode}';resetGame(52);state.phase='playing';`);
    speeds.push(h.run('state.entities.chicken.speed'));
    h.run('GameManager.save(state);var saved=GameManager.read();resetGame(52);GameManager.restore(state,saved);');
    assert.equal(h.run('state.entities.chicken.speed'),300,'resume retains the movement profile');
  }
  assert.deepEqual(speeds,[300,300,300,300]);
});

test('rescuing and exploring outweigh even an unspent arcade clock',()=>{
  const h=createGame();
  for(const [mode,points] of [['easy',100],['normal',100],['hard',150],['hardcore',200]]){
    h.run(`difficultySelect.value='${mode}';resetGame(52);state.phase='playing';
      for(const a of [...state.entities.chicks,...state.entities.animals]){
        a.discovered=true;GameManager.rescue(state,a);GameManager.rescue(state,a);
      }`);
    const count=h.run('state.rescuedCount+state.rescuedChicks');
    assert.equal(h.run('state.score'),count*points);
    h.run('GameManager.win(state);');
    assert.ok(h.run('state.timeBonus')<count*points,'time supplements the core objective');
    const score=h.run('state.score');
    h.run('var saved=GameManager.read();resetGame(52);GameManager.restore(state,saved);GameManager.win(state);');
    assert.equal(h.run('state.score'),score,'completed results remain immutable across reloads');
  }
});

test('opening guidance yields to progress, danger, cinematics and pause',()=>{
  const h=createGame();
  h.run("state.phase='playing';state.elapsed=0;state.entities.wolf.mode='patrol';GameUI.update(state);");
  assert.equal(h.elements.get('fieldBriefing').hidden,false);
  for(const scenario of ["state.phase='menu'","state.elapsed=14","state.entities.wolf.mode='chase'","state.thorRescue={time:1,before:1,healed:false}","state.rescuedCount=1"]){
    h.run(`state.phase='playing';state.elapsed=0;state.rescuedCount=0;state.entities.wolf.mode='patrol';state.thorRescue=null;${scenario};GameplayHud.update(state);`);
    assert.equal(h.elements.get('fieldBriefing').hidden,true,scenario);
  }
});
