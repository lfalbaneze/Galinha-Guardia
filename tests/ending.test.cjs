const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

function rescueAll(run) {
  run(`for (const animal of [...state.entities.chicks, ...state.entities.animals].filter(a => !a.rescued)) {
    animal.discovered=true;
    state.entities.chicken.x = animal.x; state.entities.chicken.y = animal.y; updateGame(0.016);
  }`);
}

test('all ten friends and six chicks start a protected finale and award the bonus once', () => {
  const { run } = createGame();
  rescueAll(run);
  assert.equal(run('state.phase'), 'win_cutscene');
  assert.equal(run('state.score'), 2350);
  assert.equal(run('state.rescuedIds.size'), 10);
  assert.equal(run('state.rescuedChickIds.size'), 6);
  assert.equal(run('state.cutscene.attackers.length'), 16);
  assert.equal(run('new Set(state.cutscene.attackers.map(a => a.ref.id)).size'), 16);
  assert.equal(run('state.entities.wolf.mode'), 'stopped');
  assert.equal(run('GameManager.win(state)'), false);
  run('state.entities.wolf.x=state.entities.chicken.x; state.entities.wolf.y=state.entities.chicken.y; Player.checkCatch(state);');
  assert.equal(run('state.lives'), 3);
});

test('the complete epilogue renders every stage, conceals all contact, then celebrates and persists victory', () => {
  const { run, elements } = createGame();
  rescueAll(run);
  const stages = new Set();
  for (let i = 0; i < 400; i++) {
    run('updateGame(0.05); renderGame();');
    stages.add(run('state.cutscene.stage'));
    if (run('state.cutscene.cloud')) {
      run(`const originalWolfDraw=drawWolf, originalAnimalDraw=drawAnimal;
        let visibleCast=0; drawWolf=()=>visibleCast++; drawAnimal=()=>visibleCast++; renderGame();
        drawWolf=originalWolfDraw; drawAnimal=originalAnimalDraw; globalThis.castCount=visibleCast;` .replaceAll('const ', 'var ').replaceAll('let visibleCast', 'var visibleCast'));
      assert.equal(run('castCount'), 0);
    }
  }
  assert.deepEqual([...stages], ['arrival','message','circle','rush','cloud','dizzy','flee','celebrate']);
  assert.equal(run('state.phase'), 'won');
  assert.equal(run('state.cutscene.done'), true);
  assert.equal(run('GameManager.read().phase'), 'won');
  assert.equal(elements.get('endScreen').hidden, false);
  assert.equal(elements.get('endEyebrow').textContent, 'FIM ♥');
  assert.equal(run('state.score'), 2350);
});

test('the entire family shows anger before the rush, then the wolf cries for mother before fleeing', () => {
  const { run } = createGame();
  rescueAll(run);
  run('state.cutscene.time=EndGameSequence.timing.circle+0.5; updateGame(0.01); renderGame();');
  assert.equal(run('state.cutscene.stage'), 'circle');
  assert.equal(run('state.cutscene.attackers.every(a=>a.ref.mood === "angry")'), true);
  assert.equal(run('state.entities.chicken.mood'), 'angry');
  assert.equal(run('state.entities.wolf.mood'), 'furious');
  run('state.cutscene.time=EndGameSequence.timing.rush+0.1; updateGame(0.01); renderGame();');
  assert.equal(run('state.cutscene.cloud'), false);
  assert.equal(run('state.cutscene.attackers.every(a=>a.ref.mood === "angry")'), true);
  run('state.cutscene.time=EndGameSequence.timing.dizzy+1.5; updateGame(0.01); renderGame();');
  assert.equal(run('state.entities.wolf.mood'), 'crying');
  assert.equal(run('state.entities.wolf.direction'), 'down');
  assert.match(run('state.cutscene.speech'), /MAMÃÃÃE/);
  assert.ok(run('EndGameSequence.timing.flee-EndGameSequence.timing.dizzy') >= 2);
  run('state.cutscene.time=EndGameSequence.timing.flee+0.2; updateGame(0.01); renderGame();');
  assert.equal(run('state.entities.wolf.mood'), 'crying');
  assert.equal(run('state.entities.wolf.moving'), true);
  assert.match(run('state.cutscene.speech'), /MAMÃE.*COLO/);
  assert.ok(run('state.entities.wolf.x') > 450);
  run(`var originalFleeDraw=drawWolf, visibleFleeWolf=0;
    drawWolf=()=>visibleFleeWolf++; renderGame(); drawWolf=originalFleeDraw;`);
  assert.equal(run('visibleFleeWolf'), 1, 'crying wolf remains visible throughout the on-screen escape');
  run('state.cutscene.time=EndGameSequence.timing.celebrate+0.1; updateGame(0.01); renderGame();');
  assert.equal(run('state.cutscene.speech'), '');
  assert.equal(run('state.cutscene.attackers.every(a=>a.ref.mood === "normal")'), true);
});

test('menu pauses both gameplay and the epilogue and resume preserves its clock', () => {
  const { run } = createGame();
  run('input.add("d"); const initialX=state.entities.chicken.x; GameUI.showMenu(state); updateGame(8);');
  assert.equal(run('state.entities.chicken.x === initialX'), true);
  assert.equal(run('input.size'), 0);
  run('GameUI.resume();');
  rescueAll(run);
  run('updateGame(0.5); const cutTime=state.cutscene.time; GameUI.showMenu(state); updateGame(8);');
  assert.equal(run('state.cutscene.time === cutTime'), true);
  run('GameUI.resume(); updateGame(0.5);');
  assert.equal(run('state.cutscene.time'), 1);
});

test('the family clears an exit lane so the fleeing wolf face is visible', () => {
  const { run } = createGame();
  rescueAll(run);
  run('for(let i=0;i<285;i++) updateGame(0.05);');
  assert.equal(run('state.cutscene.stage'), 'flee');
  assert.equal(run('state.cutscene.attackers.length'), 16);
  assert.equal(run(`state.cutscene.attackers.some(({ref}) =>
    Math.abs(ref.x-state.entities.wolf.x)<64 && Math.abs(ref.y-state.entities.wolf.y)<65)`), false);
  assert.equal(run('state.entities.chicks.every(c=>c.y<145 && c.x>270 && c.x<630)'), true);
  assert.equal(run('state.cutscene.attackers.every(({ref})=>ref.x>80 && ref.x<820 && ref.y>130 && ref.y<450)'), true);
});

test('a new adventure resets score, friends, lives, AI, hiding and ending state', () => {
  const { run } = createGame();
  rescueAll(run);
  run('for (let i=0;i<400;i++) updateGame(0.05); resetGame();');
  assert.equal(run('state.phase'), 'playing');
  assert.equal(run('state.rescuedIds.size'), 0);
  assert.equal(run('state.rescuedChickIds.size'), 0);
  assert.equal(run('state.entities.animals.filter(a=>a.rescued).length'), 0);
  assert.equal(run('state.entities.chicks.filter(a=>a.rescued).length'), 0);
  assert.equal(run('state.score'), 0);
  assert.equal(run('state.entities.wolf.mode'), 'patrol');
  assert.equal(run('state.entities.wolf.lastKnown'), null);
  assert.equal(run('state.entities.chicken.hidden'), false);
  assert.equal(run('state.cutscene.done'), false);
  assert.equal(run('GameManager.read().rescuedIds.length'), 0);
});

test('real bootstrap restores correct HUD and menu, and victory reload cannot duplicate points', () => {
  const first = createGame();
  first.run('GameManager.rescue(state,state.entities.animals[0]); state.lives=2; GameManager.save(state);');
  const reloaded = createGame(Math.random, { storage: first.storage, fullStartup: true });
  assert.equal(reloaded.run('state.phase'), 'menu');
  assert.equal(reloaded.elements.get('rescuedCount').textContent, '1');
  assert.equal(reloaded.elements.get('livesCount').textContent, '2');
  assert.equal(reloaded.elements.get('scoreCount').textContent, '100');
  reloaded.run('GameUI.resume();');
  rescueAll(reloaded.run);
  reloaded.run('for(let i=0;i<400;i++) updateGame(0.05);');
  const victoryReload = createGame(Math.random, { storage: reloaded.storage, fullStartup: true });
  assert.equal(victoryReload.run('state.score'), 2100);
  assert.equal(victoryReload.run('state.resumePhase'), 'win_cutscene');
  assert.equal(victoryReload.run('state.cutscene.attackers.length'), 16);
});

test('losing all lives stops play and removes a resumable defeat', () => {
  const { run, elements } = createGame();
  run(`state.lives=1; state.entities.wolf.x=state.entities.chicken.x;
    state.entities.wolf.y=state.entities.chicken.y; state.entities.wolf.huntUnlockTimer=0;
    Player.checkCatch(state); GameUI.update(state);`);
  assert.equal(run('state.phase'), 'lose');
  assert.equal(run('GameManager.read()'), null);
  assert.equal(elements.get('endScreen').hidden, false);
  run('GameUI.showMenu(state);');
  assert.equal(elements.get('continueBtn').hidden, true);
});
