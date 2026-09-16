const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = vm.createContext({ Math: Object.assign(Object.create(Math), {
  random() { throw new Error('A seeded layout must never use Math.random'); },
}) });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../systems/world-generator.js'), 'utf8'), context);
const generate = seed => JSON.parse(vm.runInContext(`JSON.stringify(WorldGenerator.generate(${JSON.stringify(seed)}))`, context));

function intersects(a, b, gap = 0) {
  return a.x < b.x + b.w + gap && a.x + a.w > b.x - gap &&
    a.y < b.y + b.h + gap && a.y + a.h > b.y - gap;
}

function getSolids(world) {
  const s = world.structures;
  return [...s.coops, ...s.silos, ...s.hayBales, s.barn, s.pond,
    ...world.vegetation.filter(v => v.blockingRect).map(v => v.blockingRect)];
}

function pointFree(point, obstacles, radius = 24) {
  return obstacles.every(o => {
    const dx = point.x - Math.max(o.x, Math.min(point.x, o.x + o.w));
    const dy = point.y - Math.max(o.y, Math.min(point.y, o.y + o.h));
    return dx * dx + dy * dy > radius * radius;
  });
}

// A conservative 20 px grid checks travel for a body larger than the wolf's 21 px radius.
function reachableGrid(world, obstacles) {
  const cell = 20;
  const cols = world.width / cell, rows = world.height / cell;
  const blocked = new Uint8Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const point = { x: x * cell + cell / 2, y: y * cell + cell / 2 };
      blocked[y * cols + x] = point.x < 24 || point.y < 24 || point.x > world.width - 24 ||
        point.y > world.height - 24 || !pointFree(point, obstacles) ? 1 : 0;
    }
  }
  const visited = new Uint8Array(cols * rows);
  const index = point => Math.floor(point.y / cell) * cols + Math.floor(point.x / cell);
  const queue = [index(world.start)];
  assert.equal(blocked[queue[0]], 0, `seed ${world.seed}: start grid cell blocked`);
  visited[queue[0]] = 1;
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const n = queue[cursor];
    const x = n % cols, y = Math.floor(n / cols);
    for (const next of [x > 0 ? n - 1 : -1, x < cols - 1 ? n + 1 : -1,
      y > 0 ? n - cols : -1, y < rows - 1 ? n + cols : -1]) {
      if (next >= 0 && !blocked[next] && !visited[next]) {
        visited[next] = 1;
        queue.push(next);
      }
    }
  }
  return point => {
    if (visited[index(point)] === 1) return true;
    // A precise target may be next to a blocked coarse cell; require a clear short
    // segment to a reachable neighbour instead of treating grid rounding as a wall.
    const cx = Math.floor(point.x / cell), cy = Math.floor(point.y / cell);
    for (let y = cy - 1; y <= cy + 1; y++) {
      for (let x = cx - 1; x <= cx + 1; x++) {
        if (x < 0 || y < 0 || x >= cols || y >= rows || !visited[y * cols + x]) continue;
        const end = { x: x * cell + cell / 2, y: y * cell + cell / 2 };
        if ([0, 0.25, 0.5, 0.75, 1].every(t => pointFree({
          x: point.x + (end.x - point.x) * t, y: point.y + (end.y - point.y) * t,
        }, obstacles, 21))) return true;
      }
    }
    return false;
  };
}

test('seeded farms are reproducible, support string seeds, and do not share mutable state', () => {
  assert.deepEqual(generate(12345), generate(12345));
  assert.deepEqual(generate('jardim-de-casa'), generate('jardim-de-casa'));
  assert.notDeepEqual(generate('jardim-de-casa'), generate('outro-jardim'));
  assert.deepEqual(generate(-1), generate(4294967295));
  vm.runInContext('WorldGenerator.generate(12).structures.coops.push({x:-100});', context);
  assert.equal(generate(12).structures.coops.some(c => c.x < 0), false);
});

test('different seeds rearrange the districts and vary buildings, roads, and details', () => {
  const worlds = Array.from({ length: 30 }, (_, i) => generate(i));
  const slots = new Set(worlds.map(w => w.areas.filter(a => a.id !== 'poleiro')
    .sort((a, b) => a.y - b.y).map(a => a.id).join(',')));
  assert.ok(slots.size >= 12, `${slots.size} different district arrangements`);
  for (const property of ['paths', 'structures', 'vegetation', 'decorations']) {
    assert.ok(new Set(worlds.map(w => JSON.stringify(w[property]))).size >= 25, property);
  }
});

test('30 seeds keep legal separated districts, useful structures, and a clear refuge', () => {
  for (let seed = 0; seed < 30; seed++) {
    const world = generate(seed);
    const solids = getSolids(world);
    const refuge = { x: 100, y: 340, w: 290, h: 120 };
    assert.deepEqual(world.start, { x: 380, y: 390 });
    assert.deepEqual(world.areas.map(a => a.id), ['poleiro', 'granja', 'estabulo', 'horta', 'quintal']);
    assert.equal(world.animalSpawns.length, 10);
    assert.equal(world.chickSpawns.length, 6);
    assert.equal(new Set(world.chickSpawns.map(c => c.areaId)).size, 5);
    assert.ok(world.structures.coops.length >= 3, `seed ${seed}: coops`);
    assert.ok(world.structures.silos.length >= 1, `seed ${seed}: silos`);
    assert.ok(world.structures.hayBales.length >= 7, `seed ${seed}: hay`);
    assert.ok(world.decorations.filter(d => d.type === 'crop').length >= 20, `seed ${seed}: crops`);
    for (const [i, area] of world.areas.entries()) {
      assert.ok(area.x >= 0 && area.y >= 0 && area.x + area.w <= world.width && area.y + area.h <= world.height);
      assert.equal(world.animalSpawns.filter(a => a.areaId === area.id).length, 2);
      assert.ok(world.vegetation.some(v => v.areaId === area.id && v.type === 'tree'), `seed ${seed}: trees in ${area.id}`);
      assert.equal(world.areas.slice(i + 1).some(a => intersects(a, area)), false);
    }
    for (const [i, solid] of solids.entries()) {
      assert.ok(solid.x >= 0 && solid.y >= 0 && solid.x + solid.w <= world.width && solid.y + solid.h <= world.height);
      assert.equal(intersects(solid, refuge, 24), false, `seed ${seed}: blocked refuge`);
      assert.equal(world.paths.some(p => intersects(solid, p, 24)), false, `seed ${seed}: blocked road`);
      assert.equal(solids.slice(i + 1).some(s => intersects(s, solid, 42)), false, `seed ${seed}: impassable gap between solids`);
    }
  }
});

test('30 seeded worlds connect the refuge, ten friends, six chicks, all regions, and all cover', () => {
  for (let seed = 0; seed < 30; seed++) {
    const world = generate(seed);
    const solids = getSolids(world);
    const reachable = reachableGrid(world, solids);
    const targets = [world.start, world.wolfStart, ...world.areas.map(a => a.hub), ...world.animalSpawns, ...world.chickSpawns];
    for (const target of targets) {
      assert.ok(pointFree(target, solids), `seed ${seed}: solid overlaps target ${JSON.stringify(target)}`);
      assert.ok(reachable(target), `seed ${seed}: unreachable target ${JSON.stringify(target)}`);
    }
    for (const spawn of world.animalSpawns) {
      const area = world.areas.find(a => a.id === spawn.areaId);
      assert.ok(spawn.x > area.x && spawn.x < area.x + area.w && spawn.y > area.y && spawn.y < area.y + area.h);
      assert.ok(world.vegetation.some(v => spawn.x >= v.x + 8 && spawn.x <= v.x + v.w - 8 &&
        spawn.y >= v.y + 8 && spawn.y <= v.y + v.h - 8), `seed ${seed}: rescue without nearby hiding place`);
    }
    for (const cover of world.vegetation) {
      // The tree trunk occupies the top edge; its lower cover remains enterable.
      const entry = { x: cover.x + cover.w / 2, y: cover.y + cover.h - 15 };
      assert.ok(pointFree(entry, solids, 21), `seed ${seed}: obstructed cover ${cover.id}`);
      assert.ok(reachable(entry), `seed ${seed}: inaccessible cover ${cover.id}`);
    }
    for (const hay of world.structures.hayBales) {
      const entry = { x: hay.x + hay.w / 2, y: hay.y + hay.h + 24 };
      assert.ok(pointFree(entry, solids, 21), `seed ${seed}: obstructed hay cover`);
      assert.ok(reachable(entry), `seed ${seed}: inaccessible hay cover`);
    }
  }
});
