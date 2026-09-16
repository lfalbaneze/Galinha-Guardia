const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

test('new farm never repeats the current seed even when the random source repeats', () => {
  const { run } = createGame(() => .5);
  let previous = run('JSON.stringify(WORLD.layout)');
  for (let i = 0; i < 3; i++) {
    run('resetGame();');
    const next = run('JSON.stringify(WORLD.layout)');
    assert.notEqual(next, previous);
    assert.equal(run('state.worldVersion'), 2);
    previous = next;
  }
});

test('existing saves without a generation version reopen the original farm and keep discoveries', () => {
  const first = createGame(() => .5);
  first.run(`resetGame(814237, 1); state.entities.chicks[2].discovered=true;
    GameManager.rescue(state,state.entities.animals[3]); GameManager.save(state);`);
  const saved = JSON.parse(first.storage.get('galinha-guardia-save-v1'));
  delete saved.worldVersion;
  first.storage.set('galinha-guardia-save-v1', JSON.stringify(saved));
  const loaded = createGame(() => .5, { storage: new Map(first.storage), fullStartup: true });
  assert.equal(loaded.run('state.worldVersion'), 1);
  assert.equal(loaded.run('JSON.stringify(WORLD.layout)'), first.run('JSON.stringify(WORLD.layout)'));
  assert.equal(loaded.run('state.rescuedIds.has("animal_3")'), true);
  assert.equal(loaded.run('state.entities.chicks[2].discovered'), true);
  loaded.run('GameManager.save(state);');
  assert.equal(JSON.parse(loaded.storage.get('galinha-guardia-save-v1')).worldVersion, 1);
  loaded.run('resetGame(814237); GameManager.save(state);');
  assert.equal(loaded.run('state.worldVersion'), 2);
  assert.notEqual(loaded.run('JSON.stringify(WORLD.layout)'), first.run('JSON.stringify(WORLD.layout)'));
  assert.equal(JSON.parse(loaded.storage.get('galinha-guardia-save-v1')).worldVersion, 2);
});

test('a fresh farm changes its geography, while reload restores the exact saved layout', () => {
  const first = createGame();
  first.run('resetGame(145); const oldLayout=JSON.stringify(WORLD.layout); GameManager.rescue(state,state.entities.animals[3]); GameManager.save(state);');
  const stored = new Map(first.storage);
  first.run('resetGame(978);');
  assert.equal(first.run('JSON.stringify(WORLD.layout) === oldLayout'), false);
  const reload = createGame(Math.random, { storage: stored, fullStartup: true });
  assert.equal(reload.run('state.worldSeed'), 145);
  assert.equal(reload.run('JSON.stringify(WORLD.layout)'), first.run('oldLayout'));
  assert.equal(reload.run('state.rescuedIds.has("animal_3")'), true);
  reload.run('GameUI.resume(); const layoutBefore=JSON.stringify(WORLD.layout); for(let i=0;i<30;i++) {updateGame(0.02);renderGame();}');
  assert.equal(reload.run('JSON.stringify(WORLD.layout)===layoutBefore'), true);
});

test('hiding stays engaged when E interrupts walking, ignores held key repeats, and leaves on a new press', () => {
  const { run, events, elements } = createGame();
  run('const spot=HidingSpots.getSpots().find(s=>s.type==="bush"); const c=state.entities.chicken; c.x=spot.x+spot.w/2; c.y=spot.y+spot.h/2; input.add("d");');
  const press = (key, repeat = false) => events.window.keydown({ key, repeat, target: { tagName: 'CANVAS' }, preventDefault() {} });
  press('e');
  assert.equal(run('state.entities.chicken.hidden'), true);
  assert.equal(elements.get('hiddenText').textContent, 'Escondida');
  press('d', true);
  run('Player.update(state,0.05);');
  assert.equal(run('state.entities.chicken.hidden'), true);
  press('d', false);
  run('Player.update(state,0.05);');
  assert.equal(run('state.entities.chicken.hidden'), false);
});

test('hidden status is rendered in the canvas, and the peeking chicken precedes foreground leaves', () => {
  const { run } = createGame();
  run(`const spot=HidingSpots.getSpots().find(s=>s.type==='bush');
    state.entities.chicken.x=spot.x+52;state.entities.chicken.y=spot.y+35;
    HidingSpots.toggle(state); const visibleLabels=[],layers=[];
    ctx.fillText=(text)=>visibleLabels.push(text);
    drawChicken=()=>layers.push('chicken');
    FarmArt.drawCoverForeground=()=>layers.push('cover');
    renderGame();`);
  assert.equal(run('visibleLabels.some(label=>label.startsWith("Escondida"))'), true);
  assert.deepEqual(JSON.parse(run('JSON.stringify(layers)')), ['chicken','cover']);
});

test('reload preserves a legitimate hiding spot and the wolf still cannot detect the chicken', () => {
  const first = createGame();
  first.run('const spot=HidingSpots.getSpots().find(s=>s.type==="bush"); state.entities.chicken.x=spot.x+52;state.entities.chicken.y=spot.y+35;HidingSpots.toggle(state);');
  const reload = createGame(Math.random, { storage: first.storage, fullStartup: true });
  assert.equal(reload.run('state.entities.chicken.hidden'), true);
  assert.equal(reload.run('state.entities.chicken.hidingSpotId'), first.run('state.entities.chicken.hidingSpotId'));
  assert.equal(reload.run('DetectionSystem.canDetect(state.entities.wolf,state.entities.chicken,WolfAI.getConfig(state))'), false);
});

test('legacy saves retain progress while relocating friends to reachable procedural homes', () => {
  const { run, storage } = createGame();
  run('GameManager.rescue(state,state.entities.animals[0]); state.lives=2;GameManager.save(state);');
  const saved = JSON.parse(storage.get('galinha-guardia-save-v1'));
  saved.version = 1; delete saved.worldSeed;
  saved.animals.forEach(a => { a.x = 1800; a.y = 300; });
  storage.set('galinha-guardia-save-v1', JSON.stringify(saved));
  const reload = createGame(Math.random, { storage, fullStartup: true });
  assert.equal(reload.run('state.rescuedCount'), 1);
  assert.equal(reload.run('state.lives'), 2);
  assert.equal(reload.run('state.score'), 100);
  assert.equal(reload.run('state.entities.animals.slice(1).every((a,i)=>a.x===WORLD.layout.animalSpawns[i+1].x && a.y===WORLD.layout.animalSpawns[i+1].y)'), true);
});

test('unrescued animals remain near their reachable home instead of drifting between regions', () => {
  const { run } = createGame(() => 0);
  run('state.entities.chicken.x=40;state.entities.chicken.y=1780;for(let i=0;i<6000;i++) RescueSystem.update(state,0.05);');
  assert.equal(run('state.entities.animals.every((a,i)=>Math.abs(a.x-WORLD.layout.animalSpawns[i].x)<=50 && Math.abs(a.y-WORLD.layout.animalSpawns[i].y)<=42)'), true);
});
