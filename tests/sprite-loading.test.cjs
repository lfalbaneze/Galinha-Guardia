const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function renderer() {
  const context = vm.createContext({ setTimeout, clearTimeout });
  for (const file of ['sprite-data.js', 'character-art.js'])
    vm.runInContext(fs.readFileSync(path.join(root, 'systems', file), 'utf8'), context);
  return vm.runInContext('CharacterArt', context);
}
test('all 13 characters have four nonempty poses inside real PNG files', () => {
  const art = renderer();
  assert.equal(art.species.length, 13);
  for (const species of art.species) for (const direction of ['up', 'right', 'down', 'left']) {
    const { pose } = art.frameFor(species, { direction });
    assert.ok(pose.bottom > pose.top && pose.width > 0, `${species}/${direction}`);
    for (const frame of pose.frames) {
      const png = fs.readFileSync(path.join(root, frame.src));
      assert.equal(png.toString('hex', 0, 8), '89504e470d0a1a0a');
      assert.ok(frame.x >= 0 && frame.y >= 0);
      assert.ok(frame.x + frame.w <= png.readUInt32BE(16));
      assert.ok(frame.y + frame.h <= png.readUInt32BE(20));
    }
  }
});
test('idle stays still, walking advances, and source-specific direction orders are respected', () => {
  const art = renderer();
  for (const species of art.species) {
    assert.equal(art.frameFor(species, { anim: 7 }).index, 0);
    assert.equal(art.frameFor(species, { anim: 1.2, moving: true }).index, 1);
  }
  assert.equal(art.frameFor('cow', { direction: 'left' }).frame.y, 128);
  assert.equal(art.frameFor('cow', { direction: 'right' }).frame.y, 384);
  assert.equal(art.frameFor('chicken', { direction: 'right' }).frame.y, 32);
  assert.equal(art.frameFor('chicken', { direction: 'left' }).frame.y, 96);
  assert.equal(art.frameFor('duck', { direction: 'right' }).pose.flip, true);
  assert.equal(art.frameFor('duck', { direction: 'left' }).pose.flip, false);
});
test('image loading is shared, completes before ready, and successful loads are reused', async () => {
  const art = renderer(), callbacks = [];
  let calls = 0;
  const first = art.load(src => { calls++; return new Promise(resolve => callbacks.push(() => resolve({ src }))); });
  assert.equal(art.loading, true); assert.equal(art.ready, false);
  assert.equal(art.load(), first);
  for (const done of callbacks) done();
  assert.equal(await first, true); assert.equal(art.ready, true); assert.equal(art.loading, false);
  await art.load(() => { throw Error('must use cache'); });
  assert.equal(calls, art.sources.length);
});
test('failed images are reported and can be retried without reloading successful images', async () => {
  const art = renderer(), missing = art.sources[0];
  assert.equal(await art.load(async src => { if (src === missing) throw Error('offline'); return { src }; }), false);
  assert.equal(art.ready, false); assert.deepEqual(Array.from(art.errors), [missing]);
  const retried = [];
  assert.equal(await art.load(async src => { retried.push(src); return { src }; }), true);
  assert.deepEqual(retried, [missing]); assert.equal(art.ready, true);
});
test('each rendered character uses its image and preserves the caller canvas state', () => {
  const art = renderer(); art.install(src => ({ src }));
  const draws = [], modes = [], stack = [];
  const c = new Proxy({ imageSmoothingEnabled: true,
    save() { stack.push(this.imageSmoothingEnabled); },
    restore() { this.imageSmoothingEnabled = stack.pop(); },
    drawImage(image, ...args) { draws.push([image.src, ...args]); modes.push(this.imageSmoothingEnabled); }
  }, { get: (o, key) => o[key] ?? (() => {}) });
  for (const species of art.species) for (const direction of ['up', 'right', 'down', 'left']) {
    assert.equal(art.draw(c, species, 50, 60, { direction, moving: true, anim: 1.2 }), true);
    assert.equal(c.imageSmoothingEnabled, true); assert.equal(stack.length, 0);
  }
  assert.equal(draws.length, 52); assert.ok(modes.every(value => value === false));
  assert.equal(renderer().draw(c, 'chicken', 0, 0), false, 'never draw an undecoded image');
});
