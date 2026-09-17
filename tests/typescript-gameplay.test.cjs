const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the compiled gameplay together, without browser/audio/art dependencies.
function createFarm() {
  const storage = new Map();
  const input = new Set();
  const covers = Array.from({ length: 6 }, (_, i) => ({ id: `green-${i}`, type: 'bush',
    x: 450 + i % 3 * 400, y: 300 + Math.floor(i / 3) * 350, w: 120, h: 120 }));
  const areas = [{ id: 'west', name: 'Oeste', x: 0, y: 0, w: 900, h: 1200 },
    { id: 'east', name: 'Leste', x: 901, y: 0, w: 899, h: 1200 }];
  const structures = { coops: [], silos: [], hayBales: [], pond: { x: 0, y: 0, w: 0, h: 0 },
    barn: { x: 0, y: 0, w: 0, h: 0 } };
  const layout = { seed: 17, areas, paths: [], structures, start: { x: 100, y: 100 }, vegetation: covers,
    animalSpawns: Array.from({ length: 10 }, (_, i) => ({ x: 150 + i * 140, y: 1000, areaId: i < 6 ? 'west' : 'east' })),
    chickSpawns: covers.map(s => ({ x: s.x + 60, y: s.y + 100, areaId: s.x < 900 ? 'west' : 'east' })) };
  const world = { width: 1800, height: 1200, targetRescues: 10, targetChicks: 6,
    safeZone: { x: 100, y: 100, r: 30 }, areas, paths: [], layout };
  const settings = { label: 'Médio', chickenSpeed: 300, wolfMaxSpeed: 205, wolfAccel: 330,
    wolfPauseAfterCatch: .7, huntDelay: 6, spawnPlan: [], minSpawnWolfDistance: 330 };
  const body = (id, type, x, y) => ({ id, type, x, y, radius: 12, hitbox: { ox: 0, oy: 0, r: 10 },
    vx: 0, vy: 0, facing: 1, direction: 'down', moving: false, anim: 0, areaId: 'west', state: 'idle' });
  const animal = (id, type, point) => ({ ...body(id, type, point.x, point.y), species: type === 'chick' ? 'chick' : 'sheep',
    rescued: false, discovered: false, lost: false, lastSeen: null, fatigue: 0, restTime: 0,
    fleeTime: 0, fleeFrom: null, fleeHeading: null, stuckTime: 0, wanderTime: 1, targetX: point.x, targetY: point.y,
    speechTime: 0, temper: 'idle' });
  const state = { phase: 'playing', difficultyKey: 'normal', settings, worldSeed: 17, worldVersion: 2,
    rescuedIds: new Set(), rescuedChickIds: new Set(), rescuedCount: 0, rescuedChicks: 0, wolfLevel: 0,
    lives: 3, score: 0, elapsed: 0, winBonusApplied: false, animalSpeechCooldown: 0, secretSoundCooldown: 0,
    entities: {
      chicken: { ...body('chicken', 'chicken', 100, 100), speed: 300, hidden: false, hidingSpotId: null,
        hideBlend: 0, hideHintTimer: 0, stamina: 1, staminaDelay: 0, exhausted: false, sneaking: false,
        sprinting: false, invulnerable: 0 },
      wolf: { ...body('wolf', 'wolf', 1650, 1100), accel: 330, huntUnlockTimer: 0, pauseTimer: 0 },
      animals: layout.animalSpawns.map((point, i) => animal(`animal_${i}`, 'animal', point)),
      chicks: layout.chickSpawns.map((point, i) => ({ ...animal(`chick_${i}`, 'chick', point), coverId: covers[i].id })),
    } };
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const hitbox = e => ({ x: e.x + e.hitbox.ox, y: e.y + e.hitbox.oy, r: e.hitbox.r });
  const context = vm.createContext({ console, WORLD: world, STRUCTURES: structures, OBSTACLES: [], input,
    DIFFICULTIES: { easy: settings, normal: settings, hard: settings }, MAX_LIVES: 3,
    SCORE_PER_RESCUE: 100, SCORE_PENALTY_LOSS: 40, SCORE_BONUS_PER_LIFE: 250,
    clamp, lerp: (a, b, t) => a + (b - a) * t, rand: (a, b) => (a + b) / 2,
    distance: (a, b) => Math.hypot(a.x - b.x, a.y - b.y), getHitbox: hitbox,
    circleVsCircle: (a, b) => { a = hitbox(a); b = hitbox(b); return Math.hypot(a.x-b.x,a.y-b.y) <= a.r+b.r; },
    resolveEnvironment: e => { e.x = clamp(e.x, e.radius, world.width-e.radius); e.y = clamp(e.y, e.radius, world.height-e.radius); },
    getAreaAt: (x, y) => areas.find(a => x >= a.x && x <= a.x+a.w && y >= a.y && y <= a.y+a.h) || areas[0],
    GameUI: { update() {} }, SkinSystem: { initialize() {}, record() {} },
    AudioSystem: { play() {}, playAnimal() {} },
    FarmRefuge: { home: (index, chick) => ({ x: 100 + index * 25, y: chick ? 180 : 140 }), ensureClear() {}, drawGround() {} },
    FarmArt: { drawCoverForeground() {} }, InterfaceMotion: { reduced: true },
    WorldGenerator: { generate: () => layout }, areaTextEl: { textContent: '' },
    setStatus() {}, spawnBurst() {}, refreshHud() {}, buildObstacles() {},
    startWinCutscene: () => { state.phase = 'win_cutscene'; }, finishLose: () => { state.phase = 'lose'; },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
  });
  const sourceDirectory = process.env.GAMEPLAY_SOURCE_DIRECTORY || path.join(__dirname, '..', 'systems');
  for (const file of ['game-manager', 'rescue-system', 'detection-system', 'hiding-spots', 'wolf-ai', 'map-manager', 'player', 'lake-challenge', 'goose-system', 'wildlife-rules', 'fox-system', 'owl-system', 'thor-system']) {
    vm.runInContext(fs.readFileSync(path.join(sourceDirectory, `${file}.js`), 'utf8'), context, { filename: `${file}.js` });
  }
  const api = vm.runInContext('({ GameManager, RescueSystem, DetectionSystem, HidingSpots, WolfAI, MapManager, Player, FoxSystem, OwlSystem })', context);
  api.GameManager.initialize(state); api.WolfAI.initialize(state); api.HidingSpots.initialize(); api.MapManager.initialize(state);
  return { ...api, state, input, storage, context, world };
}
const plain = value => JSON.parse(JSON.stringify(value));
const saveKey = 'galinha-guardia-save-v1';

test('compiled player keeps diagonal movement normalized', () => {
  const e = createFarm(), p = e.state.entities.chicken;
  e.input.add('d'); e.input.add('s'); e.Player.update(e.state, .1);
  assert.ok(Math.abs(Math.hypot(p.x-100,p.y-100)-30) < 1e-9);
});

test('compiled sprint exhausts after three seconds and requires recovery', () => {
  const e = createFarm(), p = e.state.entities.chicken;
  e.input.add('d'); e.input.add('shift');
  for (let i = 0; i < 180; i++) e.Player.update(e.state, 1/60);
  assert.equal(p.stamina, 0); assert.equal(p.exhausted, true);
  assert.ok(Math.abs(p.x-1288) < 1e-7);
  e.input.clear();
  for (let i = 0; i < 150; i++) e.Player.update(e.state, 1/60);
  assert.ok(p.stamina > .25); assert.equal(p.exhausted, false);
});

test('sneaking does not consume sprint stamina', () => {
  const e = createFarm(), p = e.state.entities.chicken;
  for (const key of ['d','c','shift']) e.input.add(key);
  e.Player.update(e.state, .1);
  assert.equal(p.sprinting, false); assert.equal(p.stamina, 1); assert.equal(p.x, 112);
});

test('a catch penalizes once and invulnerability prevents a second hit', () => {
  const e = createFarm(), { chicken, wolf } = e.state.entities;
  e.state.score = 100; wolf.x = chicken.x; wolf.y = chicken.y;
  assert.equal(e.Player.checkCatch(e.state), true);
  assert.equal(e.state.lives, 2); assert.equal(e.state.score, 60);
  wolf.x = chicken.x; wolf.y = chicken.y; wolf.pauseTimer = 0;
  assert.equal(e.Player.checkCatch(e.state), false); assert.equal(e.state.lives, 2);
});

test('the final lost life clears the saved adventure', () => {
  const e = createFarm(), { chicken, wolf } = e.state.entities;
  e.GameManager.save(e.state); e.state.lives = 1;
  wolf.x = chicken.x; wolf.y = chicken.y;
  e.Player.checkCatch(e.state);
  assert.equal(e.state.phase, 'lose'); assert.equal(e.state.score, 0);
  assert.equal(e.storage.has(saveKey), false);
});

test('walls still block vision and hiding removes the visual target', () => {
  const e = createFarm(), { chicken, wolf } = e.state.entities;
  Object.assign(wolf, { x: 400, y: 400, heading: 0 }); Object.assign(chicken, { x: 500, y: 400 });
  assert.equal(e.DetectionSystem.canSee(wolf, chicken), true);
  e.context.OBSTACLES = [{ x: 450, y: 350, w: 20, h: 100 }];
  assert.equal(e.DetectionSystem.canSee(wolf, chicken), false);
  e.context.OBSTACLES = []; chicken.hidden = true;
  assert.equal(e.DetectionSystem.perceive(wolf, chicken).seenPoint, null);
});

test('hearing gives an approximate point, never hidden player coordinates', () => {
  const e = createFarm(), { chicken, wolf } = e.state.entities;
  Object.assign(wolf, { x: 400, y: 400, heading: Math.PI });
  Object.assign(chicken, { x: 487, y: 423, sprinting: true, vx: 100, vy: 0 });
  const heard = e.DetectionSystem.perceive(wolf, chicken);
  assert.equal(heard.visible, false); assert.deepEqual(plain(heard.heardPoint), { x: 512, y: 448 });
  chicken.hidden = true;
  assert.equal(e.DetectionSystem.perceive(wolf, chicken).heardPoint, null);
});

test('rescues cannot be counted or scored twice', () => {
  const e = createFarm(), friend = e.state.entities.animals[0];
  assert.equal(e.GameManager.rescue(e.state, friend), true);
  assert.equal(e.GameManager.rescue(e.state, friend), false);
  assert.equal(e.state.rescuedCount, 1); assert.equal(e.state.score, 100);
});

test('undiscovered bonus chicks cannot be rescued directly', () => {
  const e = createFarm();
  assert.equal(e.GameManager.rescue(e.state, e.state.entities.chicks[0]), false);
  assert.equal(e.state.rescuedChicks, 0); assert.equal(e.state.score, 0);
});

test('ten friends win without requiring optional chicks, and the bonus is applied once', () => {
  const e = createFarm();
  for (const a of e.state.entities.animals) e.GameManager.rescue(e.state, a);
  assert.equal(e.GameManager.win(e.state), true);
  assert.equal(e.state.phase, 'win_cutscene'); assert.equal(e.state.rescuedChicks, 0);
  assert.equal(e.state.score, 1750);
  assert.equal(e.GameManager.win(e.state), false); assert.equal(e.state.score, 1750);
});

test('entering and leaving cover persist the corresponding state', () => {
  const e = createFarm(), p = e.state.entities.chicken, cover = e.HidingSpots.getSpots()[0];
  p.x = cover.x+60; p.y = cover.y+60;
  e.HidingSpots.toggle(e.state);
  assert.equal(e.GameManager.read().chicken.hidden, true);
  e.HidingSpots.toggle(e.state);
  assert.equal(e.GameManager.read().chicken.hidden, false);
});

test('calling from the edge of cover rescues its chick and sends it to the nest', () => {
  const e = createFarm(), p = e.state.entities.chicken, chick = e.state.entities.chicks[0];
  const cover = e.HidingSpots.getSpots()[0];
  p.x = cover.x+60; p.y = cover.y+cover.h+35;
  assert.equal(e.RescueSystem.callChick(e.state), true);
  assert.equal(e.RescueSystem.callChick(e.state), false);
  assert.equal(chick.rescued, true); assert.equal(e.state.rescuedChicks, 1); assert.equal(e.state.score, 100);
  assert.deepEqual({ x: chick.x, y: chick.y }, { x: 100, y: 180 });
});

test('moving after hiding leaves cover normally', () => {
  const e = createFarm(), p = e.state.entities.chicken, cover = e.HidingSpots.getSpots()[0];
  p.x = cover.x+60; p.y = cover.y+60; e.HidingSpots.toggle(e.state);
  e.input.add('d'); e.Player.update(e.state, 1/60);
  assert.equal(p.hidden, false); assert.equal(p.hidingSpotId, null);
});

test('save/restore preserves score, rescues, position and stamina', () => {
  const e = createFarm(), p = e.state.entities.chicken;
  e.GameManager.rescue(e.state, e.state.entities.animals[1]);
  Object.assign(p, { x: 250, y: 250, stamina: .4 }); e.GameManager.save(e.state);
  const saved = e.GameManager.read();
  p.x = 800; e.state.score = 0;
  e.GameManager.restore(e.state, saved);
  assert.equal(p.x, 250); assert.equal(p.stamina, .4);
  assert.equal(e.state.score, 100); assert.equal(e.state.rescuedIds.has('animal_1'), true);
});

test('malformed JSON and duplicate rescue ids are rejected', () => {
  const e = createFarm(); e.storage.set(saveKey, '{broken');
  assert.equal(e.GameManager.read(), null);
  e.GameManager.save(e.state); const saved = JSON.parse(e.storage.get(saveKey));
  saved.rescuedIds = ['animal_0','animal_0']; e.storage.set(saveKey, JSON.stringify(saved));
  assert.equal(e.GameManager.read(), null);
});

test('old version-two saves receive empty optional bonuses', () => {
  const e = createFarm(); e.GameManager.save(e.state); const saved = JSON.parse(e.storage.get(saveKey));
  saved.version = 2; delete saved.chicks; delete saved.rescuedChickIds;
  e.storage.set(saveKey, JSON.stringify(saved));
  const loaded = e.GameManager.read();
  assert.ok(loaded); assert.deepEqual(plain(loaded.rescuedChickIds), []); assert.deepEqual(plain(loaded.chicks), []);
});

test('crossing a region updates visited maps and saves the position', () => {
  const e = createFarm(); e.state.entities.chicken.x = 1100;
  e.MapManager.update(e.state, .1);
  assert.equal(e.state.currentMap, 'east'); assert.equal(e.state.visitedMaps.has('west'), true);
  assert.equal(e.state.visitedMaps.has('east'), true); assert.equal(e.GameManager.read().chicken.x, 1100);
});

test('each rescue raises pressure while full sprint remains faster than the wolf', () => {
  const e = createFarm(); let previous = 0;
  for (let friends = 0; friends <= 10; friends++) {
    e.state.rescuedCount = friends; e.state.wolfLevel = e.GameManager.level(friends);
    const config = e.WolfAI.getConfig(e.state);
    assert.ok(config.pressure > previous); previous = config.pressure;
    assert.ok(config.speed < e.state.settings.chickenSpeed * e.Player.sprintMultiplier);
  }
});

test('the compiled systems remain usable as classic scripts without a module loader', () => {
  const e = createFarm();
  for (const name of ['Player','WolfAI','GameManager','RescueSystem','DetectionSystem','MapManager','HidingSpots','FoxSystem','OwlSystem']) {
    assert.equal(typeof e[name], 'object');
  }
});
