const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const root = path.resolve(__dirname, '..');

async function fixture() {
  const context = vm.createContext({ SpriteData: {}, PremiumWildlifeData: {} });
  for (const file of ['sunlight', 'pixellab-art-data', 'character-art'])
    vm.runInContext(fs.readFileSync(path.join(root, 'systems', file + '.js'), 'utf8'), context);
  const sun = vm.runInContext('Sunlight', context), art = vm.runInContext('CharacterArt', context);
  sun.install(createCanvas);
  assert.equal(await art.load(src => loadImage(path.join(root, src))), true);
  return { sun, art, data: context.SpriteData };
}

test('committed art has real foot bounds even before the first build', async () => {
  const { data } = await fixture();
  let checked = 0;
  for (const [name, definition] of Object.entries(data)) {
    if (['owl', 'crow'].includes(name)) continue;
    for (const [action, poses] of Object.entries(definition.actions)) {
      if (['fly', 'alert'].includes(action)) continue;
      for (const pose of Object.values(poses)) for (const frame of pose.frames) {
        assert.ok(frame.grounding, `${name}/${action} needs committed offline footing`);
        assert.ok(frame.grounding.bottom > 0 && frame.grounding.bottom <= 1);
        checked++;
      }
    }
  }
  assert.ok(checked >= 4500, `Only ${checked} grounded frames`);
});

test('donkey, wolf and the entire terrestrial cast keep feet grounded when browser pixel reads fail', async () => {
  const { sun, art, data } = await fixture();
  let reads = 0, checked = 0;
  sun.install((w, h) => {
    const tile = createCanvas(w, h);
    tile.getContext('2d').getImageData = () => { reads++; throw Error('Tainted file canvas'); };
    return tile;
  });
  const c = createCanvas(240, 240).getContext('2d');
  for (const [name, definition] of Object.entries(data)) {
    if (['owl', 'crow'].includes(name)) continue;
    for (const [action, poses] of Object.entries(definition.actions)) {
      if (['fly', 'alert'].includes(action)) continue;
      for (const [direction, pose] of Object.entries(poses)) for (let i = 0; i < pose.frames.length; i++) {
        c.clearRect(0, 0, 240, 240);
        art.draw(c, name, 120, 186, { action, direction, moving: true, anim: (i + .1) * 4 / pose.frames.length, shadow: false });
        const pixels = c.getImageData(0, 198, 240, 5).data;
        assert.ok(pixels.slice(240 * 4, 240 * 8).some((v, j) => j % 4 === 3 && v >= 128), `${name}/${action}/${direction}/${i}: feet above ground`);
        assert.equal(pixels.slice(240 * 12).some((v, j) => j % 4 === 3 && v >= 128), false, `${name}: feet below ground`);
        checked++;
      }
    }
  }
  assert.equal(reads, 0, 'No pixel read is necessary for committed frames');
  assert.ok(checked >= 4500);
});

test('actors cast one solar silhouette without a generic circular or oval shadow', async () => {
  const { sun, art, data } = await fixture();
  const c = createCanvas(240, 240).getContext('2d');
  const ellipse = c.ellipse.bind(c), drawImage = c.drawImage.bind(c);
  let footprints = 0, images = 0;
  c.ellipse = (...args) => { footprints++; return ellipse(...args); };
  c.drawImage = (...args) => { images++; return drawImage(...args); };
  for (const name of Object.keys(data)) {
    for (const direction of art.directions) for (const moving of [false, true]) {
      for (const lightTime of [0, 42, 102]) {
        c.clearRect(0, 0, 240, 240); footprints = images = 0;
        sun.begin(lightTime);
        art.draw(c, name, 120, 186, { direction, moving, anim: 1, mood: 'scared' });
        assert.equal(footprints, 0, `${name}/${direction}: forbidden oval shadow`);
        assert.equal(images, 2, `${name}/${direction}: one projected silhouette and one body`);
        assert.equal(sun.inspect().casts, 1);
        sun.end();
      }
    }
  }
});

test('solar projections stay below bodies and follow explicit jump elevation', async () => {
  const { sun, art } = await fixture();
  for (const lifted of [0, 16]) {
    const c = createCanvas(240, 240).getContext('2d');
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, 240, 240);
    sun.begin(12); assert.equal(sun.beginLayer(c), true);
    art.draw(c, 'donkey', 120, 186, { direction: 'downright', lift: lifted });
    sun.end();
    assert.ok(c.getImageData(0, 198, 240, 42).data.some((v, i) => i % 4 !== 3 && v < 250), 'Projection remains on the floor');
  }
});
