const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

test('ten unique, reachable friends are always spawned, including adversarial randomness', () => {
  for (const random of [Math.random, () => 0, () => 0.5, () => 0.999]) {
    const { run } = createGame(random);
    for (const mode of ['easy', 'normal', 'hard']) {
      run(`difficultySelect.value = '${mode}'; resetGame(); state.phase = 'playing';`);
      assert.equal(run('state.entities.animals.length'), 10);
      assert.equal(run('new Set(state.entities.animals.map(a => a.id)).size'), 10);
      assert.equal(run(`state.entities.animals.every(a => { const h = getHitbox(a); return OBSTACLES.every(r =>
        Math.hypot(h.x - clamp(h.x,r.x,r.x+r.w), h.y-clamp(h.y,r.y,r.y+r.h)) >= h.r - 0.01); })`), true);
    }
  }
});

test('contact rescues once, awards points and moves friend to safety', () => {
  const { run } = createGame();
  run('const friend = state.entities.animals[0]; state.entities.chicken.x = friend.x; state.entities.chicken.y = friend.y; updateAnimals(0);');
  assert.equal(run('state.rescuedCount'), 1);
  assert.equal(run('state.score'), 100);
  assert.equal(run('GameManager.rescue(state, friend)'), false);
  assert.equal(run('state.rescuedIds.has(friend.id)'), true);
  assert.equal(run('distance(friend, RescueSystem.safePosition(0)) < .01'), true);
});

test('progress round-trips IDs, area positions, lives, score and difficulty', () => {
  const { run } = createGame();
  run(`GameManager.rescue(state, state.entities.animals[2]); GameManager.rescue(state, state.entities.animals[5]);
    state.entities.chicken.x=1200; state.entities.chicken.y=1000; state.lives=2;
    resolveEnvironment(state.entities.chicken); GameManager.save(state); const saved = GameManager.read(); resetGame(); GameManager.restore(state, saved);`);
  assert.equal(run('state.rescuedCount'), 2);
  assert.equal(run('state.entities.animals[2].rescued && state.entities.animals[5].rescued'), true);
  assert.equal(run('state.entities.chicken.x'), run('saved.chicken.x'));
  assert.equal(run('state.lives'), 2);
  assert.equal(run('state.score'), 200);
});

test('corrupt or unavailable storage does not crash the session', () => {
  const { run, storage } = createGame();
  storage.set('galinha-guardia-save-v1', '{bad');
  assert.equal(run('GameManager.read()'), null);
  run('localStorage.setItem = () => { throw new Error("disabled"); }; GameManager.save(state);');
  assert.equal(run('GameManager.storageAvailable'), false);
  assert.equal(run('state.entities.animals.length'), 10);
});

test('difficulty follows all four rescue thresholds', () => {
  const { run } = createGame();
  assert.deepEqual(JSON.parse(run('JSON.stringify([0,2,3,5,6,8,9,10].map(GameManager.level))')), [0,0,1,1,2,2,3,3]);
});
