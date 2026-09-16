const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

function rescueChicks(run, count = 6) {
  run(`for(const chick of state.entities.chicks.slice(0,${count})) {
    chick.discovered=true; // This helper starts after discovery; secret tests cover the search.
    state.entities.chicken.x=chick.x;state.entities.chicken.y=chick.y;RescueSystem.update(state,0);
  }`);
}

test('six unique chicks rescue by contact once and scale the wolf to 1.5x', () => {
  const { run } = createGame();
  assert.equal(run('state.entities.chicks.length'), 6);
  assert.equal(run('new Set(state.entities.chicks.map(c=>c.id)).size'), 6);
  rescueChicks(run);
  assert.equal(run('state.rescuedChicks'), 6);
  assert.equal(run('state.rescuedCount'), 0);
  assert.equal(run('state.score'), 600);
  assert.equal(run('state.phase'), 'playing');
  assert.equal(run('WolfAI.getConfig(state).chickMultiplier'), 1.5);
  assert.equal(run('GameManager.rescue(state,state.entities.chicks[0])'), false);
  assert.equal(run('state.entities.chicks.every((c,i)=>c.rescued && Math.abs(c.y-RescueSystem.chickPosition(i).y)<=3)'), true);
  run('for(const animal of state.entities.animals)GameManager.rescue(state,animal);GameManager.win(state);');
  assert.equal(run('state.phase'), 'win_cutscene');
  assert.equal(run('state.score'), 2350);
});

test('ten original friends alone no longer trigger the finale, in either rescue order', () => {
  const { run } = createGame();
  run(`for(const animal of state.entities.animals) GameManager.rescue(state,animal);GameManager.win(state);`);
  assert.equal(run('state.phase'), 'playing');
  assert.equal(run('state.score'), 1000);
  rescueChicks(run);
  assert.equal(run('state.phase'), 'win_cutscene');
  assert.equal(run('state.cutscene.attackers.length'), 16);
  assert.equal(run('state.score'), 2350);
  assert.equal(run('GameManager.win(state)'), false);
});

test('skins require chicks and friends together; equipping changes no gameplay stats', () => {
  const { run, events, elements } = createGame();
  assert.equal(run('SkinSystem.equip(state,"robocop")'), false);
  assert.equal(elements.get('skin-punk').disabled, true);
  for (const [count, friends, id] of [[2,3,'punk'],[4,6,'astronaut'],[6,9,'robocop'],[6,10,'priest']]) {
    run(`for(const chick of state.entities.chicks.slice(0,${count})) GameManager.rescue(state,Object.assign(chick,{discovered:true}));GameUI.update(state);`);
    assert.equal(run(`SkinSystem.unlocked('${id}')`), false, 'chicks alone must not unlock an outfit');
    run(`for(const friend of state.entities.animals.slice(0,${friends})) GameManager.rescue(state,friend);GameUI.update(state);`);
    assert.equal(run(`SkinSystem.unlocked('${id}')`), true);
    assert.equal(elements.get(`skin-${id}`).disabled, false);
    const stats = run('JSON.stringify([state.entities.chicken.speed,state.entities.chicken.hitbox,state.lives,state.score])');
    events.elements[`skin-${id}`].click();
    assert.equal(run('state.entities.chicken.skin'), id);
    assert.equal(run('JSON.stringify([state.entities.chicken.speed,state.entities.chicken.hitbox,state.lives,state.score])'), stats);
  }
  assert.equal(run('SkinSystem.equip(state,"nonexistent")'), false);
  run('GameUI.showMenu(state);');
  elements.get('menuSkinSelect').value = 'punk';
  events.elements.menuSkinSelect.change();
  assert.equal(run('state.entities.chicken.skin'), 'punk');
  assert.equal(run('state.phase'), 'menu', 'choosing an outfit in the pause menu must not resume the hunt');
});

test('skin collection and equipped outfit survive restarting, losing and reloading', () => {
  const first = createGame();
  rescueChicks(first.run, 6);
  first.run('for(const friend of state.entities.animals.slice(0,9)) GameManager.rescue(state,friend);');
  first.run(`SkinSystem.equip(state,'robocop');resetGame(1234);GameManager.clear();`);
  assert.equal(first.run('state.rescuedChicks'), 0);
  assert.equal(first.run('state.entities.chicken.skin'), 'robocop');
  const reloaded = createGame(Math.random, { storage: new Map(first.storage), fullStartup: true });
  assert.equal(reloaded.run('SkinSystem.best'), 6);
  assert.equal(reloaded.run('state.entities.chicken.skin'), 'robocop');
  assert.equal(reloaded.run('SkinSystem.unlocked("priest")'), false);
});

test('v3 saves restore chick identities, positions, difficulty and remaining rescues', () => {
  const first = createGame();
  rescueChicks(first.run, 2);
  first.run('GameManager.save(state);');
  const reload = createGame(Math.random, { storage: new Map(first.storage), fullStartup: true });
  assert.equal(reload.run('state.rescuedChicks'), 2);
  assert.equal(reload.run('state.rescuedChickIds.size'), 2);
  assert.equal(reload.run('state.entities.chicks.filter(c=>!c.rescued).length'), 4);
  assert.equal(reload.run('WolfAI.getConfig(state).chickMultiplier'), 1 + 1 / 6);
  assert.equal(reload.run('GameManager.read().version'), 3);
  assert.equal(reload.elements.get('chicksCount').textContent, '2');
});

test('a completed v2 save keeps its farm and bonus and receives the six new rescues', () => {
  const first = createGame();
  first.run(`for(const animal of state.entities.animals) GameManager.rescue(state,animal);GameManager.save(state);`);
  const data = JSON.parse(first.storage.get('galinha-guardia-save-v1'));
  data.version = 2; data.phase = 'won'; data.score = 1750; data.winBonusApplied = true;
  delete data.chicks; delete data.rescuedChickIds;
  first.storage.set('galinha-guardia-save-v1', JSON.stringify(data));
  const reload = createGame(Math.random, { storage: new Map(first.storage), fullStartup: true });
  assert.equal(reload.run('state.worldSeed'), data.worldSeed);
  assert.equal(reload.run('state.rescuedCount'), 10);
  assert.equal(reload.run('state.rescuedChicks'), 0);
  assert.equal(reload.run('state.score'), 1750);
  reload.run('GameUI.resume();');
  rescueChicks(reload.run);
  assert.equal(reload.run('state.phase'), 'win_cutscene');
  assert.equal(reload.run('state.score'), 2350, 'legacy victory bonus must not be granted twice');
});

test('invalid chick saves and wardrobe data fail safely; blocked storage retains session unlocks', () => {
  const { run, storage } = createGame();
  const data = JSON.parse(storage.get('galinha-guardia-save-v1'));
  data.rescuedChickIds = ['chick_0','chick_0'];
  storage.set('galinha-guardia-save-v1', JSON.stringify(data));
  assert.equal(run('GameManager.read()'), null);
  storage.set('galinha-guardia-wardrobe-v1', JSON.stringify({ best: -10, selected: 'priest' }));
  const reload = createGame(Math.random, { storage });
  assert.equal(reload.run('state.entities.chicken.skin'), 'classic');
  reload.run(`localStorage.setItem=()=>{throw Error('blocked')};
    for(const chick of state.entities.chicks.slice(0,2)) GameManager.rescue(state,Object.assign(chick,{discovered:true}));
    for(const friend of state.entities.animals.slice(0,3)) GameManager.rescue(state,friend);resetGame();`);
  assert.equal(reload.run('SkinSystem.unlocked("punk")'), true);
  assert.equal(reload.run('SkinSystem.storageAvailable'), false);
});

test('wolf dialogue responds to chase and uses a cooldown instead of replacing speech every frame', () => {
  const { run } = createGame();
  run(`state.entities.wolf.huntUnlockTimer=0;state.entities.wolf.mode='chase';WolfDialogue.update(state,0.05);
    const firstLine=state.entities.wolf.speech;for(let i=0;i<20;i++)WolfDialogue.update(state,0.05);`);
  assert.equal(run('state.entities.wolf.speech===firstLine'), true);
  run('for(let i=0;i<110;i++)WolfDialogue.update(state,0.05);');
  assert.equal(run('state.entities.wolf.speech===firstLine'), false);
});
