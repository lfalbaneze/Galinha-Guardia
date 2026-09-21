const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the real gameplay modules without requiring a browser or rendered assets.
function load(obstacles = []) {
  const saves = [];
  const context = vm.createContext({
    OBSTACLES: obstacles,
    WORLD: { width: 800, height: 600, areas: [{ id: 'farm', x: 0, y: 0, w: 800, h: 600 }],
      safeZone: { x: 50, y: 50, r: 20 }, layout: { seed: 17, vegetation: [] } },
    STRUCTURES: { hayBales: [] },
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    distance: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
    lerp: (a, b, t) => a + (b - a) * t,
    input: new Set(),
    Player: { sprintMultiplier: 1.32 },
    GameManager: { save: game => saves.push(JSON.parse(JSON.stringify(game.entities.chicken))) },
    GameUI: { update() {} }, AudioSystem: { play() {} },
    SkinSystem: {power:()=>({noiseScale:1})},
    SunflowerSystem: {reset(){},cancel(){},updateWolf(){return false;}},
    SwimmingSystem: {profile(){return {swimming:false};}},
    EnvironmentSystem: {disturbCover(){},surfaceAt(){return 'grass';}},
    setStatus() {}, spawnBurst() {},
    getAreaAt: () => ({ id: 'farm' }),
    getHitbox: entity => ({ x: entity.x + (entity.hitbox?.ox || 0),
      y: entity.y + (entity.hitbox?.oy || 0), r: entity.hitbox?.r || entity.radius }),
    circleVsCircle: (a, b) => Math.hypot(a.x - b.x, a.y - b.y) <= a.radius + b.radius,
  });
  const root = path.resolve(__dirname, '..');
  vm.runInContext('const SpriteData={};'+fs.readFileSync(path.join(root,'systems/character-art.js'),'utf8'),context);
  for (const file of ['detection-system.js', 'wolf-ai.js', 'hiding-spots.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'systems', file), 'utf8'), context, { filename: file });
  }
  const api = vm.runInContext('({ WolfAI, HidingSpots, DetectionSystem })', context);
  const intersects = api.DetectionSystem.segmentIntersectsRect;
  let checks = 0;
  api.DetectionSystem.segmentIntersectsRect = (...args) => { checks++; return intersects(...args); };
  return { ...api, context, saves, intersects, checks: () => checks, resetChecks: () => { checks = 0; } };
}

const point = (x, y, radius = 20) => ({ x, y, radius, hitbox: { r: radius, ox: 0, oy: 0 } });
const plain = value => JSON.parse(JSON.stringify(value));

function assertSafeRoute(env, wolf, route) {
  const radius = wolf.hitbox?.r || wolf.radius, padding = radius + 2;
  const offset = { x: wolf.hitbox?.ox || 0, y: wolf.hitbox?.oy || 0 };
  let previous = { x: wolf.x + offset.x, y: wolf.y + offset.y };
  for (const step of route) {
    const next = { x: step.x + offset.x, y: step.y + offset.y };
    assert.ok(Number.isFinite(next.x) && Number.isFinite(next.y));
    assert.ok(next.x >= radius && next.x <= env.context.WORLD.width - radius);
    assert.ok(next.y >= radius && next.y <= env.context.WORLD.height - radius);
    for (const obstacle of env.context.OBSTACLES) {
      if (obstacle.blocking === false) continue;
      const expanded = { x: obstacle.x - padding, y: obstacle.y - padding,
        w: obstacle.w + padding * 2, h: obstacle.h + padding * 2 };
      assert.equal(env.intersects(previous, next, expanded), false, 'route must not cross an obstacle');
    }
    previous = next;
  }
}

function game(env) {
  const state = { phase: 'playing', difficultyKey: 'normal', wolfLevel: 0, rescuedCount: 0, rescuedChicks: 0,
    settings: { wolfMaxSpeed: 180, chickenSpeed: 200 },
    entities: { chicken: { ...point(140, 140, 12), hidden: false, hidingSpotId: null, hideBlend: 0 },
      wolf: { ...point(650, 450), accel: 220, anim: 0, huntUnlockTimer: 0, pauseTimer: 0 } } };
  env.WolfAI.initialize(state);
  env.HidingSpots.initialize({ vegetation: [{ id: 'green-0', x: 100, y: 100, w: 100, h: 100, type: 'bush' }] });
  return state;
}

const wall = () => ({ x: 350, y: 130, w: 70, h: 320 });

test('clear route checks obstacles without building the detour graph', () => {
  const obstacles = Array.from({ length: 12 }, (_, i) => ({ x: 50 + i * 58, y: 300, w: 20, h: 40 }));
  const env = load(obstacles);
  assert.deepEqual(plain(env.WolfAI.findPath(point(40, 60), { x: 740, y: 60 })), [{ x: 740, y: 60 }]);
  assert.equal(env.checks(), obstacles.length);
});

test('a blocked route still finds a safe detour', () => {
  const env = load([wall()]), wolf = point(100, 300), target = { x: 700, y: 300 };
  const route = env.WolfAI.findPath(wolf, target);
  assert.ok(route.length > 1);
  assert.deepEqual(plain(route.at(-1)), target);
  assertSafeRoute(env, wolf, route);
});

test('repeated detours reuse the graph without changing the route', () => {
  const env = load([wall()]), wolf = point(100, 300), target = { x: 700, y: 300 };
  const first = env.WolfAI.findPath(wolf, target), firstChecks = env.checks();
  env.resetChecks();
  const second = env.WolfAI.findPath(wolf, target);
  assert.deepEqual(plain(second), plain(first));
  assert.ok(env.checks() < firstChecks);
});

test('direct paths remain cheap after a detour graph has been cached', () => {
  const env = load([wall()]);
  env.WolfAI.findPath(point(100, 300), { x: 700, y: 300 });
  env.resetChecks();
  assert.deepEqual(plain(env.WolfAI.findPath(point(100, 60), { x: 700, y: 60 })), [{ x: 700, y: 60 }]);
  assert.equal(env.checks(), 1);
});

test('replacing obstacles invalidates cached navigation', () => {
  const env = load([{ x: 350, y: 450, w: 70, h: 60 }]), wolf = point(100, 300);
  assert.equal(env.WolfAI.findPath(wolf, { x: 700, y: 300 }).length, 1);
  env.context.OBSTACLES = [wall()];
  const route = env.WolfAI.findPath(wolf, { x: 700, y: 300 });
  assert.ok(route.length > 1);
  assertSafeRoute(env, wolf, route);
});

test('adding an obstacle to the same collection invalidates navigation', () => {
  const env = load(), wolf = point(100, 300);
  env.WolfAI.findPath(wolf, { x: 700, y: 300 });
  env.context.OBSTACLES.push(wall());
  const route = env.WolfAI.findPath(wolf, { x: 700, y: 300 });
  assert.ok(route.length > 1);
  assertSafeRoute(env, wolf, route);
});

test('changing hitbox radius recomputes safe clearances', () => {
  const env = load([wall()]);
  env.WolfAI.findPath(point(100, 300, 10), { x: 700, y: 300 });
  const wolf = point(100, 300, 35), route = env.WolfAI.findPath(wolf, { x: 700, y: 300 });
  assert.ok(route.length > 1);
  assertSafeRoute(env, wolf, route);
});

test('world size changes cannot reuse waypoints outside the new boundaries', () => {
  const env = load([{ x: 300, y: 40, w: 60, h: 360 }]), wolf = point(100, 390);
  assert.ok(env.WolfAI.findPath(wolf, { x: 700, y: 390 }).length > 1);
  env.context.WORLD.height = 420;
  assert.deepEqual(plain(env.WolfAI.findPath(wolf, { x: 700, y: 390 })), []);
});

test('a wall spanning the map returns no route', () => {
  const env = load([{ x: 350, y: 0, w: 70, h: 600 }]);
  assert.deepEqual(plain(env.WolfAI.findPath(point(100, 300), { x: 700, y: 300 })), []);
});

test('navigation accounts for hitbox offsets', () => {
  const env = load([wall()]), wolf = point(100, 280);
  wolf.hitbox.oy = 20;
  const route = env.WolfAI.findPath(wolf, { x: 700, y: 280 });
  assert.ok(route.length > 1);
  assert.deepEqual(plain(route.at(-1)), { x: 700, y: 280 });
  assertSafeRoute(env, wolf, route);
});

test('decorative nonblocking props do not create detours', () => {
  const env = load([{ ...wall(), blocking: false }]);
  assert.equal(env.WolfAI.findPath(point(100, 300), { x: 700, y: 300 }).length, 1);
});

test('entering and leaving cover both save the resulting state', () => {
  const env = load(), state = game(env);
  env.HidingSpots.toggle(state);
  assert.equal(env.saves.length, 1);
  assert.equal(env.saves[0].hidden, true);
  assert.equal(env.saves[0].hidingSpotId, 'green-0');
  env.HidingSpots.toggle(state);
  assert.equal(env.saves.length, 2);
  assert.equal(env.saves[1].hidden, false);
  assert.equal(env.saves[1].hidingSpotId, null);
});

test('leaving cover does not erase the wolf observation', () => {
  const env = load(), state = game(env);
  state.entities.chicken.hidden = true;
  state.entities.chicken.hidingSpotId = 'green-0';
  const memory = { spotId: 'green-0', x: 140, y: 140, remaining: 5, inspectTime: .8 };
  state.entities.wolf.exposedCover = memory;
  env.HidingSpots.toggle(state);
  assert.equal(state.entities.wolf.exposedCover, memory);
  assert.equal(env.WolfAI.isExposed(state), false);
  assert.equal(env.saves.length, 1);
});

test('cover cannot be toggled or saved while the game is paused', () => {
  const env = load(), state = game(env);
  state.phase = 'menu';
  env.HidingSpots.toggle(state);
  assert.equal(state.entities.chicken.hidden, false);
  assert.equal(env.saves.length, 0);
});

test('trying to hide outside cover does not create a false saved hiding state', () => {
  const env = load(), state = game(env);
  state.entities.chicken.x = 20;
  env.HidingSpots.toggle(state);
  assert.equal(state.entities.chicken.hidden, false);
  assert.equal(env.saves.length, 0);
  assert.ok(state.entities.chicken.hideHintTimer > 0);
});

test('hidden movement does not update the wolf last observation', () => {
  const env = load(), state = game(env);
  const wolf = state.entities.wolf;
  wolf.mode = 'chase'; wolf.lastKnown = { x: 600, y: 450 };
  state.entities.chicken.hidden = true;
  state.entities.chicken.x = 150; state.entities.chicken.y = 150;
  env.WolfAI.update(state, 1 / 60);
  assert.equal(wolf.mode, 'search');
  assert.deepEqual(plain(wolf.lastKnown), { x: 600, y: 450 });
});

test('full sprint stays faster than the wolf at every rescue count', () => {
  const env = load(), state = game(env);
  for (const difficulty of ['easy', 'normal', 'hard']) {
    state.difficultyKey = difficulty;
    for (let friends = 0; friends <= 10; friends++) for (let chicks = 0; chicks <= 6; chicks++) {
      state.rescuedCount = friends; state.rescuedChicks = chicks;
      state.wolfLevel = friends >= 9 ? 3 : friends >= 6 ? 2 : friends >= 3 ? 1 : 0;
      assert.ok(env.WolfAI.getConfig(state).speed < state.settings.chickenSpeed * env.context.Player.sprintMultiplier);
    }
  }
});
