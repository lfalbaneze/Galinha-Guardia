const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

function pressE(game) {
  game.events.window.keydown({ key: 'e', repeat: false, target: { tagName: 'CANVAS' }, preventDefault() {} });
  game.events.window.keyup({ key: 'e' });
}

function coverScenario({ real = false, type = 'bush' } = {}) {
  const game = createGame(() => 0.5);
  game.run(`
    const chicken = state.entities.chicken, wolf = state.entities.wolf;
    ${real ? '' : 'OBSTACLES = [];'}
    const isFree = entity => {
      const h = getHitbox(entity);
      return h.x > h.r && h.y > h.r && h.x < WORLD.width - h.r && h.y < WORLD.height - h.r &&
        OBSTACLES.filter(r => r.blocking !== false).every(r =>
          Math.hypot(h.x - clamp(h.x,r.x,r.x+r.w), h.y - clamp(h.y,r.y,r.y+r.h)) >= h.r + 2);
    };
    let cover = null;
    for (const spot of HidingSpots.getSpots().filter(s => s.type === '${type}')) {
      const points = spot.bale ? [
        { x: spot.bale.x - 23, y: spot.bale.y + spot.bale.h / 2, dx: -140, dy: 0 },
        { x: spot.bale.x + spot.bale.w + 23, y: spot.bale.y + spot.bale.h / 2, dx: 140, dy: 0 },
        { x: spot.bale.x + spot.bale.w / 2, y: spot.bale.y - 30, dx: 0, dy: -140 },
      ] : [{ x: spot.x + spot.w / 2, y: spot.y + spot.h / 2, dx: -140, dy: 0 }];
      for (const point of points) {
        Object.assign(chicken, { x: point.x, y: point.y, hidden: false, hidingSpotId: null, invulnerable: 0 });
        Object.assign(wolf, { x: point.x + point.dx, y: point.y + point.dy,
          heading: Math.atan2(-point.dy,-point.dx), huntUnlockTimer: 0, pauseTimer: 0 });
        if (isFree(chicken) && isFree(wolf) && HidingSpots.candidate(chicken)?.id === spot.id &&
            DetectionSystem.canSee(wolf,chicken,WolfAI.getConfig(state))) { cover = spot; break; }
      }
      if (cover) break;
    }
    if (!cover) throw new Error('No accessible ${type} cover for this real farm');
    const entryPoint = { x: chicken.x, y: chicken.y };
    const wolfStart = { x: wolf.x, y: wolf.y };
  `);
  return game;
}

const plain = (game, expression) => JSON.parse(game.run(`JSON.stringify(${expression})`));

test('pressing E while the wolf watches records that entrance immediately, before hidden vision is lost', () => {
  const game = coverScenario();
  const { run } = game;
  assert.equal(run('wolf.lastKnown'), null);
  pressE(game);
  assert.equal(run('chicken.hidden'), true);
  assert.equal(run('wolf.mode'), 'inspect');
  assert.equal(run('wolf.exposedCover.spotId'), run('cover.id'));
  assert.deepEqual(plain(game, 'wolf.lastKnown'), plain(game, 'entryPoint'));
  assert.equal(run('wolf.exposedCover.x'), run('entryPoint.x'));
  assert.equal(run('wolf.exposedCover.y'), run('entryPoint.y'));
  assert.equal(run('WolfAI.isExposed(state)'), true);
  assert.equal(run('DetectionSystem.canSee(wolf,chicken,WolfAI.getConfig(state))'), false);
  assert.equal(run('WolfAI.canCatchHidden(state)'), false, 'remembering a spot does not mean catching from a distance');
  assert.equal(game.elements.get('hiddenText').textContent, 'Ele viu você!');
  run(`const witnessText = []; ctx.fillText = text => witnessText.push(text);
    camera.x = wolf.x - 450; camera.y = wolf.y - 250; renderGame();`);
  assert.equal(run('witnessText.includes("Ele viu você! Saia daí!")'), true);
  assert.equal(run('witnessText.includes("! TE VI ENTRAR")'), true);
});

test('witness range has an inclusive boundary for each difficulty', () => {
  for (const [difficulty, range] of [['easy',180], ['normal',220], ['hard',260]]) {
    for (const delta of [0, 0.01]) {
      const game = coverScenario();
      game.run(`state.difficultyKey='${difficulty}'; state.settings=DIFFICULTIES['${difficulty}'];
        wolf.x=chicken.x-${range + delta}; wolf.y=chicken.y; wolf.heading=0;`);
      assert.equal(game.run('WolfAI.getConfig(state).hideWitnessRange'), range);
      pressE(game);
      assert.equal(game.run('WolfAI.isExposed(state)'), delta === 0, `${difficulty}, distance ${range + delta}`);
    }
  }
});

test('looking away, an opaque wall, the opening delay and a stunned wolf cannot witness entry', () => {
  const cases = [
    ['outside the field of view', 'wolf.heading=Math.PI;'],
    ['opaque wall', `OBSTACLES=[{x:chicken.x-80,y:chicken.y-80,w:12,h:160,type:'barn'}];`],
    ['opening hunt delay', 'wolf.huntUnlockTimer=0.1;'],
    ['stunned after capture', 'wolf.pauseTimer=0.1;'],
  ];
  for (const [label, setup] of cases) {
    const game = coverScenario();
    game.run(setup);
    pressE(game);
    assert.equal(game.run('chicken.hidden'), true, label);
    assert.equal(game.run('WolfAI.isExposed(state)'), false, label);
    assert.equal(game.run('wolf.exposedCover == null'), true, label);
    assert.equal(game.run('wolf.lastKnown'), null, label);
  }
});

test('a chicken concealed without a witness remains safe even when the wolf later touches that spot', () => {
  const game = coverScenario();
  game.run('wolf.heading=Math.PI;');
  pressE(game);
  game.run(`Object.assign(wolf,{x:chicken.x,y:chicken.y,heading:0});
    for(let i=0;i<20;i++) { WolfAI.update(state,0.05); Player.checkCatch(state); }`);
  assert.equal(game.run('state.lives'), 3);
  assert.equal(game.run('WolfAI.isExposed(state)'), false);
  assert.equal(game.run('wolf.lastKnown'), null);
});

for (const type of ['hay', 'bush']) {
  test(`the wolf reaches a witnessed ${type} entrance on the real procedural farm and expels the chicken once`, () => {
    const game = coverScenario({ real: true, type });
    const { run } = game;
    const initialObstacles = run('OBSTACLES.length');
    assert.ok(initialObstacles > 10);
    pressE(game);
    assert.equal(run('WolfAI.isExposed(state)'), true);
    run(`let captureCount=0;
      for(let i=0;i<220 && !captureCount;i++) {
        Player.update(state,0.025); WolfAI.update(state,0.025);
        if(Player.checkCatch(state)) captureCount++;
      }`);
    assert.equal(run('captureCount'), 1);
    assert.equal(run('state.lives'), 2);
    assert.equal(run('chicken.hidden'), false);
    assert.equal(run('chicken.hidingSpotId'), null);
    assert.equal(run('wolf.exposedCover == null'), true);
    assert.equal(run('chicken.invulnerable'), 3);
    run(`wolf.x=chicken.x; wolf.y=chicken.y;
      for(let i=0;i<20;i++) Player.checkCatch(state);`);
    assert.equal(run('state.lives'), 2);
    assert.equal(run('OBSTACLES.length'), initialObstacles);
  });
}

test('a witnessed hiding place uses a route around water and cannot be caught through an opaque divider', () => {
  const game = coverScenario();
  const { run } = game;
  run(`wolf.x=chicken.x-200; wolf.y=chicken.y; wolf.heading=0;
    OBSTACLES=[{x:chicken.x-125,y:chicken.y-60,w:50,h:120,type:'pond'}];`);
  pressE(game);
  assert.equal(run('WolfAI.isExposed(state)'), true);
  assert.ok(run('WolfAI.findPath(wolf,wolf.exposedCover).length') > 1);
  run(`let crossedSolid=false, jumped=false, captures=0;
    for(let i=0;i<240 && !captures;i++) {
      const before={x:wolf.x,y:wolf.y};
      WolfAI.update(state,0.025);
      if(!isFree(wolf)) crossedSolid=true;
      if(distance(before,wolf)>WolfAI.getConfig(state).speed*0.025+3.01) jumped=true;
      if(Player.checkCatch(state)) captures++;
    }`);
  assert.equal(run('captures'), 1);
  assert.equal(run('crossedSolid'), false);
  assert.equal(run('jumped'), false);

  const blocked = coverScenario();
  pressE(blocked);
  blocked.run(`wolf.x=chicken.x-30; wolf.y=chicken.y;
    OBSTACLES=[{x:chicken.x-15,y:chicken.y-100,w:2,h:200,type:'barn'}];`);
  assert.equal(blocked.run('circleVsCircle(chicken,wolf)'), true);
  assert.equal(blocked.run('WolfAI.canCatchHidden(state)'), false);
  assert.equal(blocked.run('Player.checkCatch(state)'), false);
  assert.equal(blocked.run('state.lives'), 3);
});

test('protection timers apply to a witnessed cover and re-hiding does not reuse the old exposure', () => {
  const game = coverScenario();
  const { run } = game;
  pressE(game);
  run('wolf.x=chicken.x; wolf.y=chicken.y;');
  for (const timer of ['chicken.invulnerable', 'wolf.pauseTimer', 'wolf.huntUnlockTimer']) {
    run(`${timer}=0.1;`);
    assert.equal(run('Player.checkCatch(state)'), false, timer);
    run(`${timer}=0;`);
  }
  assert.equal(run('Player.checkCatch(state)'), true);
  assert.equal(run('state.lives'), 2);
  run(`Object.assign(chicken,entryPoint); Object.assign(wolf,{x:entryPoint.x-140,y:entryPoint.y,heading:0});`);
  pressE(game);
  assert.equal(run('chicken.hidden'), true);
  assert.equal(run('WolfAI.isExposed(state)'), false, 'the stunned wolf cannot witness another entrance');
  run(`chicken.invulnerable=0; wolf.pauseTimer=0; wolf.x=chicken.x; wolf.y=chicken.y;`);
  assert.equal(run('Player.checkCatch(state)'), false);
  assert.equal(run('state.lives'), 2);
});

test('escaping unseen to another cover keeps the old snapshot until its empty spot is inspected', () => {
  const game = coverScenario();
  const { run } = game;
  pressE(game);
  const original = plain(game, 'wolf.lastKnown');
  pressE(game);
  run(`const other=HidingSpots.getSpots().find(s=>s.type==='bush' &&
      distance({x:s.x+s.w/2,y:s.y+s.h/2},entryPoint)>500);
    if(!other) throw new Error('Missing distant alternative cover');
    chicken.x=other.x+other.w/2; chicken.y=other.y+other.h/2;`);
  pressE(game);
  assert.equal(run('chicken.hidden'), true);
  assert.equal(run('WolfAI.isExposed(state)'), false);
  assert.equal(run('wolf.exposedCover.spotId'), run('cover.id'));
  run('WolfAI.update(state,0.05);');
  assert.deepEqual(plain(game, 'wolf.lastKnown'), original);
  assert.deepEqual(plain(game, '({x:wolf.routeTarget.x,y:wolf.routeTarget.y})'), original);
  run(`for(let i=0;i<200 && wolf.exposedCover;i++) {
    WolfAI.update(state,0.025); Player.checkCatch(state);
  }`);
  assert.equal(run('wolf.exposedCover == null'), true);
  assert.notEqual(run('wolf.mode'), 'inspect');
  assert.equal(run('state.lives'), 3);
  assert.deepEqual(plain(game, 'wolf.lastKnown'), original);
});

test('the memory countdown freezes with the menu and eventually expires without revealing the chicken', () => {
  const game = coverScenario();
  const { run } = game;
  pressE(game);
  const remaining = run('wolf.exposedCover.remaining');
  assert.ok(remaining >= 8 && remaining <= 14);
  run('GameUI.showMenu(state); updateGame(3); WolfAI.update(state,3);');
  assert.equal(run('wolf.exposedCover.remaining'), remaining);
  run(`state.phase='playing'; wolf.accel=0; wolf.moveSpeed=0;
    for(let i=0;i<160 && wolf.exposedCover;i++) WolfAI.update(state,0.1);`);
  assert.equal(run('wolf.exposedCover == null'), true);
  assert.equal(run('WolfAI.isExposed(state)'), false);
  assert.equal(run('state.lives'), 3);
});

test('a valid save restores the observed cover, remaining search time and a fair reload grace period', () => {
  const game = coverScenario({ real: true });
  const { run } = game;
  pressE(game);
  run(`WolfAI.update(state,0.15); GameManager.save(state);
    const saved=GameManager.read(); const savedExposure=JSON.stringify(saved.wolf.exposedCover);
    resetGame(saved.worldSeed); GameManager.restore(state,saved); state.phase='playing';`);
  assert.equal(run('state.entities.chicken.hidden'), true);
  assert.equal(run('state.entities.wolf.mode'), 'inspect');
  assert.equal(run('JSON.stringify(state.entities.wolf.exposedCover)'), run('savedExposure'));
  assert.equal(run('WolfAI.isExposed(state)'), true);
  assert.ok(run('state.entities.chicken.invulnerable > 0'));
  run(`state.entities.wolf.x=state.entities.chicken.x;
    state.entities.wolf.y=state.entities.chicken.y;`);
  assert.equal(run('Player.checkCatch(state)'), false);
  run('state.entities.chicken.invulnerable=0; state.entities.wolf.pauseTimer=0; state.entities.wolf.huntUnlockTimer=0;');
  assert.equal(run('Player.checkCatch(state)'), true);
});

test('legacy and malformed exposure saves do not create knowledge of an unseen hiding place', () => {
  const variants = [
    ['legacy save', 'saved.version=2; delete saved.wolf.exposedCover;'],
    ['missing memory', 'delete saved.wolf.exposedCover;'],
    ['unknown spot', `saved.wolf.exposedCover.spotId='not-a-spot';`],
    ['outside its cover', 'saved.wolf.exposedCover.x=0; saved.wolf.exposedCover.y=0;'],
    ['expired memory', 'saved.wolf.exposedCover.remaining=0;'],
    ['invalid countdown', `saved.wolf.exposedCover.remaining='forever';`],
    ['infinite countdown', 'saved.wolf.exposedCover.remaining=Infinity;'],
    ['negative countdown', 'saved.wolf.exposedCover.remaining=-1;'],
    ['invalid coordinates', 'saved.wolf.exposedCover.x=NaN;'],
    ['orphaned memory outside inspection', `saved.wolf.mode='patrol';`],
  ];
  for (const [label, mutation] of variants) {
    const game = coverScenario({ real: true });
    pressE(game);
    game.run(`GameManager.save(state); const saved=GameManager.read(); ${mutation}
      resetGame(saved.worldSeed); GameManager.restore(state,saved); state.phase='playing';`);
    assert.equal(game.run('state.entities.chicken.hidden'), true, label);
    assert.equal(game.run('state.entities.wolf.exposedCover == null'), true, label);
    assert.equal(game.run('WolfAI.isExposed(state)'), false, label);
    assert.notEqual(game.run('state.entities.wolf.mode'), 'inspect', label);
    game.run(`Object.assign(state.entities.wolf,{x:state.entities.chicken.x,y:state.entities.chicken.y,
      pauseTimer:0,huntUnlockTimer:0}); state.entities.chicken.invulnerable=0;`);
    assert.equal(game.run('Player.checkCatch(state)'), false, label);
  }
});

test('finite edited save timers are bounded instead of making a cover permanently exposed', () => {
  const game = coverScenario({ real: true });
  pressE(game);
  game.run(`GameManager.save(state); const saved=GameManager.read();
    saved.wolf.exposedCover.remaining=999999; saved.wolf.exposedCover.inspectTime=999999;
    resetGame(saved.worldSeed); GameManager.restore(state,saved); state.phase='playing';`);
  assert.equal(game.run('WolfAI.isExposed(state)'), true);
  assert.equal(game.run('state.entities.wolf.exposedCover.remaining'), game.run('WolfAI.getConfig(state).hideMemoryDuration'));
  assert.ok(game.run('state.entities.wolf.exposedCover.inspectTime <= 0.8'));
  game.run(`Object.assign(state.entities.wolf,{accel:0,moveSpeed:0});
    for(let i=0;i<160 && state.entities.wolf.exposedCover;i++) WolfAI.update(state,0.1);`);
  assert.equal(game.run('state.entities.wolf.exposedCover == null'), true);
});
