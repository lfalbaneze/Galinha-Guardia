const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

test('cover requires E inside a marked spot; walking leaves cover', () => {
  const { run } = createGame();
  run('state.entities.chicken.x=40; state.entities.chicken.y=1780; HidingSpots.toggle(state);');
  assert.equal(run('state.entities.chicken.hidden'), false);
  run('const cover=HidingSpots.getSpots().find(s=>s.type==="bush"); state.entities.chicken.x=cover.x+cover.w/2; state.entities.chicken.y=cover.y+cover.h/2; HidingSpots.toggle(state);');
  assert.equal(run('state.entities.chicken.hidden'), true);
  run('input.add("d"); Player.update(state,0.02);');
  assert.equal(run('state.entities.chicken.hidden'), false);
});

test('map transitions preserve the same wolf, memory, lives and rescued identities', () => {
  const { run } = createGame();
  run(`const sameWolf=state.entities.wolf; sameWolf.mode='search'; sameWolf.lastKnown={x:500,y:400};
    GameManager.rescue(state,state.entities.animals[0]); state.lives=2;
    for (const area of WORLD.areas) { state.entities.chicken.x=area.x+50; state.entities.chicken.y=area.y+50; MapManager.update(state,0.1); }`);
  assert.equal(run('state.entities.wolf === sameWolf'), true);
  assert.equal(run('sameWolf.mode'), 'search');
  assert.equal(run('sameWolf.lastKnown.x'), 500);
  assert.equal(run('state.rescuedCount'), 1);
  assert.equal(run('state.lives'), 2);
  assert.equal(run('state.visitedMaps.size'), 5);
});

test('wolf contact costs one life, respects protection and never removes rescued friends', () => {
  const { run } = createGame();
  run(`GameManager.rescue(state,state.entities.animals[0]); const w=state.entities.wolf,c=state.entities.chicken;
    w.huntUnlockTimer=0; w.x=c.x; w.y=c.y; Player.checkCatch(state); Player.checkCatch(state);`);
  assert.equal(run('state.lives'), 2);
  assert.equal(run('state.rescuedCount'), 1);
  run('c.invulnerable=0; w.pauseTimer=0; c.hidden=true; w.x=c.x; w.y=c.y; Player.checkCatch(state);');
  assert.equal(run('state.lives'), 2);
});

test('player movement remains normalized and solids prevent passage', () => {
  const { run } = createGame();
  run('input.add("w"); input.add("d");');
  assert.ok(Math.abs(run('Math.hypot(Player.moveVector().x,Player.moveVector().y)') - 1) < 0.001);
  // Approach the free west wall; the barn's south side now opens onto the nursery.
  run('input.clear(); const solid=STRUCTURES.barn; state.entities.chicken.x=solid.x-30; state.entities.chicken.y=solid.y+solid.h/2; input.add("d"); for(let i=0;i<30;i++) Player.update(state,0.02);');
  assert.ok(run('getHitbox(state.entities.chicken).x <= solid.x-16+0.01'));
});
