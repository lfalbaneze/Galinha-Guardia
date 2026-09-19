const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

function setup(mode) {
  const h = createGame();
  h.run(`difficultySelect.value='${mode}';resetGame(52);state.phase='playing';`);
  return h;
}
const rescueAll = h => h.run('for(const a of state.entities.animals)GameManager.rescue(state,a);GameManager.win(state);');

for (const [mode, limit, multiplier, friendTime, chickTime] of [['hard', 60, 1000, 10, 20], ['hardcore', 45, 10000, 15, 30]]) {
  test(`${mode}: deadline, exact 30-second bonus, frozen ending and no duplicate on reload`, () => {
    const h = setup(mode);
    assert.equal(h.run('state.timeRemaining'), limit);
    // The last friend's reward is part of the winning clock, too.
    h.run(`for(const a of state.entities.animals.slice(0,-1))GameManager.rescue(state,a);
      state.timeRemaining=${30 - friendTime};GameManager.rescue(state,state.entities.animals.at(-1));GameManager.win(state);`);
    assert.equal(h.run('state.timeBonus'), 30 * multiplier);
    assert.equal(h.run('state.score'), 1950 + 30 * multiplier);
    h.run('GameManager.win(state);GameManager.update(state,15);updateGame(.05);');
    assert.equal(h.run('state.timeRemaining'), 30);
    const saved = h.run('GameManager.read()');
    assert.equal(saved.timeBonus, 30 * multiplier);
    h.context.saved = saved;
    h.run('resetGame(52);GameManager.restore(state,saved);state.phase="won";GameUI.update(state);');
    assert.equal(h.run('state.score'), 1950 + 30 * multiplier);
    assert.match(h.elements.get('endTimeBonus').textContent, /30s/);
    assert.equal(h.elements.get('endTimeBonus').hidden, false);
  });

  test(`${mode}: each rescue adds its own time once, above the initial allowance and across reloads`, () => {
    const h = setup(mode);
    h.run('var a=state.entities.animals[0],c=state.entities.chicks[0];');
    assert.equal(h.run('GameManager.rescue(state,c)'), false, 'hidden chicks need to be found first');
    h.run('GameManager.rescue(state,a);GameManager.rescue(state,a);c.discovered=true;GameManager.rescue(state,c);GameManager.rescue(state,c);GameUI.update(state);');
    const earned = limit + friendTime + chickTime;
    assert.equal(h.run('state.timeRemaining'), earned);
    assert.equal(h.run('state.score'), 200);
    assert.equal(h.elements.get('timeReward').textContent, `+${chickTime}s`);
    assert.equal(h.elements.get('timeReward').hidden, false);
    for (let i=0;i<2;i++) {
      h.run('GameManager.save(state);var saved=GameManager.read();resetGame(52);GameManager.restore(state,saved);state.phase="playing";GameManager.rescue(state,state.entities.animals[0]);GameManager.rescue(state,state.entities.chicks[0]);');
      assert.equal(h.run('state.timeRemaining'), earned);
      assert.equal(h.run('state.score'), 200);
    }
    h.run('GameManager.rescue(state,state.entities.animals[1]);GameUI.update(state);');
    assert.equal(h.elements.get('timeReward').textContent, `+${friendTime}s`);
    h.run('GameManager.update(state,3);GameUI.update(state);');
    assert.equal(h.elements.get('timeReward').hidden, true);
    assert.equal(h.run('state.timeRemaining'), earned+friendTime-3);
  });

  test(`${mode}: Panto grants a friend's time once when his challenge is won`, () => {
    const h = setup(mode);
    h.run(`var g=state.entities.goose;Object.assign(state.lake,{active:true,completed:false,misses:2,counterWindow:1});
      Object.assign(g,{mode:'stunned',chargeCounted:true});Object.assign(state.entities.chicken,{x:g.x,y:g.y,hidden:false});
      LakeChallenge.interact(state);LakeChallenge.interact(state);GooseSystem.rescue(state);`);
    assert.equal(h.run('state.timeRemaining'), limit+friendTime);
    h.run('GameManager.save(state);var saved=GameManager.read();resetGame(52);GameManager.restore(state,saved);');
    assert.equal(h.run('state.timeRemaining'), limit+friendTime);
    assert.equal(h.run('state.score'), 100);
  });

  test(`${mode}: timeout ends the run with hearts, persists and retries with the full time`, () => {
    const h = setup(mode);
    h.run('state.timeRemaining=.02;updateGame(.05);');
    assert.equal(h.run('state.phase'), 'lose');
    assert.equal(h.run('state.lives'), 3);
    assert.equal(h.run('state.timeBonus'), 0);
    assert.equal(h.run('GameManager.read().defeatReason'), 'timeout');
    assert.equal(h.elements.get('endTitle').textContent, 'O tempo acabou!');
    assert.equal(h.run('GameManager.rescue(state,state.entities.animals[0])'), false);
    h.run('var saved=GameManager.read();resetGame(52);GameManager.restore(state,saved);');
    assert.equal(h.run('state.phase'), 'lose');
    h.events.elements.replayBtn.click();
    assert.equal(h.run('state.phase'), 'playing');
    assert.equal(h.run('state.timeRemaining'), limit);
    assert.equal(h.run('state.score'), 0);
  });
}

test('easy and normal keep unlimited time and the existing score', () => {
  for (const mode of ['easy', 'normal']) {
    const h = setup(mode);
    h.run('GameManager.update(state,10000);GameUI.update(state);');
    assert.equal(h.run('state.timeRemaining'), null);
    assert.equal(h.run('state.timeRewardNotice'), undefined);
    assert.equal(h.run('state.phase'), 'playing');
    assert.equal(h.elements.get('runTimer').hidden, true);
    rescueAll(h);
    assert.equal(h.run('state.score'), 1950);
  }
});

test('pause and reload preserve the countdown; only full seconds earn points', () => {
  const h = setup('hard');
  h.run('GameManager.update(state,1.25);GameUI.showMenu(state);updateGame(30);');
  assert.equal(h.run('state.timeRemaining'), 58.75);
  h.run('var saved=GameManager.read();resetGame(52);GameManager.restore(state,saved);');
  assert.equal(h.run('state.timeRemaining'), 58.75);
  h.run('state.phase="playing";for(const a of state.entities.animals)GameManager.rescue(state,a);state.timeRemaining=30.99;GameManager.win(state);');
  assert.equal(h.run('state.timeBonus'), 30000);
});

test('legacy hard saves get a fresh deadline and completed saves keep their original score', () => {
  const h = setup('hard');
  h.run('GameManager.save(state);var saved=GameManager.read();delete saved.timeRemaining;delete saved.timeBonus;saved.elapsed=900;GameManager.restore(state,saved);');
  assert.equal(h.run('state.timeRemaining'), 60);
  rescueAll(h);
  h.run('saved=GameManager.read();delete saved.timeRemaining;delete saved.timeBonus;saved.score=1950;resetGame(52);GameManager.restore(state,saved);');
  assert.equal(h.run('state.score'), 1950);
  assert.equal(h.run('state.timeBonus'), 0);
});

test('the hardcore menu option is selectable with the keyboard and displays the rules', () => {
  const h = setup('normal');
  h.events.elements['difficulty-hard'].keydown({key:'ArrowRight',preventDefault(){}});
  assert.equal(h.elements.get('difficultySelect').value, 'hardcore');
  assert.equal(h.elements.get('difficulty-hardcore').attributes['aria-checked'], 'true');
  assert.match(h.elements.get('difficultyFlavor').textContent, /45s/);
  assert.match(h.elements.get('difficultyFlavor').textContent, /\+30s/);
  assert.match(h.elements.get('difficultyFlavor').textContent, /\+15s/);
  assert.match(h.elements.get('difficultyFlavor').textContent, /10\.000/);
});

test('fixed-timer saves migrate once without re-awarding already rescued friends', () => {
  const h=setup('hardcore');
  h.run('GameManager.rescue(state,state.entities.animals[0]);GameManager.save(state);var saved=GameManager.read();delete saved.timerMode;saved.timeRemaining=399;saved.elapsed=21;resetGame(52);GameManager.restore(state,saved);');
  assert.equal(h.run('state.timeRemaining'),45);
  assert.equal(h.run('state.score'),100);
  assert.equal(h.run('GameManager.read().timerMode'),'arcade');
  h.run('state.phase="playing";GameManager.update(state,5);GameManager.save(state);saved=GameManager.read();resetGame(52);GameManager.restore(state,saved);');
  assert.equal(h.run('state.timeRemaining'),40);
  assert.equal(h.run('GameManager.rescue(state,state.entities.animals[0])'),false);
});

test('legacy winning scores keep their fixed-timer bonus and timeouts stay defeats', () => {
  const h=setup('hardcore');rescueAll(h);
  h.run('var saved=GameManager.read();delete saved.timerMode;saved.timeRemaining=350;saved.timeBonus=3500000;saved.score=3501950;resetGame(52);GameManager.restore(state,saved);');
  assert.equal(h.run('state.timeBonus'),3500000);
  assert.equal(h.run('state.score'),3501950);
  h.run('saved=GameManager.read();resetGame(52);GameManager.restore(state,saved);');
  assert.equal(h.run('state.timeRemaining'),350);
  assert.equal(h.run('state.score'),3501950);
  h.run('resetGame(52);state.phase="playing";state.timeRemaining=0;GameManager.update(state,.01);saved=GameManager.read();delete saved.timerMode;resetGame(52);GameManager.restore(state,saved);');
  assert.equal(h.run('state.phase'),'lose');
  assert.equal(h.run('state.timeRemaining'),0);
});

test('the arcade clock pauses for Thor but runs during the lake challenge and stays bounded on load', () => {
  const h=setup('hardcore');
  h.run('state.lake.active=true;GameManager.update(state,2);');
  assert.equal(h.run('state.timeRemaining'),43);
  h.run('state.lake.active=false;state.lives=1;state.thorVisit.boneIds=ThorSystem.bones(state).map(b=>b.id);ThorSystem.request(state);updateGame(.05);');
  assert.equal(h.run('state.timeRemaining'),43);
  h.run('GameManager.save(state);var saved=GameManager.read();saved.timeRemaining=1000000;resetGame(52);GameManager.restore(state,saved);');
  assert.equal(h.run('state.timeRemaining'),45);
});
