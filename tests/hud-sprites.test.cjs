const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createGame } = require('./helpers.cjs');
const root = path.resolve(__dirname, '..');
function art(reduced = false) {
  const context = vm.createContext({ InterfaceMotion: { reduced }, setTimeout, clearTimeout });
  vm.runInContext(fs.readFileSync(path.join(root, 'systems/goose-art.js'), 'utf8'), context);
  return { context, api: vm.runInContext('GooseArt', context) };
}
function goose(values = {}) { return { x: 100, y: 100, direction: 'down', moving: false, mode: 'patrol', anim: 0, ...values }; }

test('goose uses the supplied PNG and all twelve crops are opaque, separate and grounded', async () => {
  const { loadImage, createCanvas } = require('@napi-rs/canvas');
  const image = await loadImage(path.join(root, 'assets/sprites/sources/goose.png'));
  assert.equal(image.width, 192); assert.equal(image.height, 256);
  const c = createCanvas(192, 256).getContext('2d'); c.drawImage(image, 0, 0);
  const pixels = c.getImageData(0, 0, 192, 256).data;
  for (let r = 0; r < 4; r++) for (let col = 0; col < 3; col++) {
    let top = 64, bottom = -1, count = 0;
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      if (!pixels[((r * 64 + y) * 192 + col * 64 + x) * 4 + 3]) continue;
      assert.ok(x > 0 && x < 63, 'each sprite has a transparent gutter');
      top = Math.min(top, y); bottom = Math.max(bottom, y); count++;
    }
    assert.ok(count > 300); assert.equal(bottom, 59, 'common foot baseline');
    assert.ok(bottom - top >= 45 && bottom - top <= 56, 'consistent cast scale');
  }
});

test('walking alternates idle and stepping; warning always uses wings-open pose in all directions', () => {
  const { api } = art();
  for (const [row, direction] of ['up', 'right', 'down', 'left'].entries()) {
    for (const anim of [0, 1, 2, 3]) {
      assert.equal(api.frameFor(goose({ direction, moving: true, anim })).row, row);
      assert.equal(api.frameFor(goose({ direction, moving: true, anim })).column, anim % 2);
      assert.equal(api.frameFor(goose({ direction, anim })).column, 0);
      for (const mode of ['warning', 'charge']) assert.equal(api.frameFor(goose({ direction, anim, mode })).column, 2);
    }
  }
});

test('reduced motion freezes walking but keeps the visual attack warning', () => {
  const { api } = art(true);
  assert.equal(api.frameFor(goose({ moving: true, anim: 1 })).column, 0);
  assert.equal(api.frameFor(goose({ moving: true, anim: 1, mode: 'warning' })).column, 2);
});

test('the renderer never draws an undecoded image or mutates gameplay/canvas state', () => {
  const { api } = art(), draws = [], stack = [];
  const c = new Proxy({ imageSmoothingEnabled: true,
    save() { stack.push(this.imageSmoothingEnabled); },
    restore() { this.imageSmoothingEnabled = stack.pop(); },
    drawImage(...args) { draws.push(args); assert.equal(this.imageSmoothingEnabled, false); }
  }, { get: (o, key) => o[key] ?? (() => {}) });
  const entity = goose({ direction: 'left', mode: 'warning' }), before = JSON.stringify(entity);
  assert.equal(api.draw(c, entity, { x: 0, y: 0 }), false);
  const image = {}; api.install(() => image);
  assert.equal(api.draw(c, entity, { x: 10, y: 20, shakeX: 0, shakeY: 0 }), true);
  assert.equal(draws[0][0], image);
  assert.deepEqual(draws[0].slice(1), [128, 192, 64, 64, 58, 34, 64, 64]);
  assert.equal(c.imageSmoothingEnabled, true); assert.equal(stack.length, 0);
  assert.equal(JSON.stringify(entity), before);
});

test('goose image requests are shared, cached and can be retried after failure', async () => {
  const { api } = art(); let finish, calls = 0;
  const first = api.load(src => { calls++; assert.match(src, /goose\.png$/); return new Promise(resolve => { finish = resolve; }); });
  assert.equal(api.load(), first); assert.equal(api.loading, true);
  await Promise.resolve(); finish({}); assert.equal(await first, true);
  assert.equal(api.ready, true); assert.equal(api.loading, false);
  await api.load(() => { throw Error('cache should be reused'); }); assert.equal(calls, 1);
  const failed = art().api;
  assert.equal(await failed.load(async () => { throw Error('missing file'); }), false);
  assert.equal(failed.errors.length, 1); assert.equal(failed.loading, false);
  assert.equal(await failed.load(async () => ({})), true); assert.equal(failed.errors.length, 0);
});

test('life hearts and critical message follow health, restart, loss and pause without changing it', () => {
  const h = createGame(() => .5);
  for (const lives of [3, 2, 1, 0, 3]) {
    h.run(`state.lives=${lives}; var before=JSON.stringify(state); GameplayHud.update(state)`);
    assert.deepEqual([1, 2, 3].map(i => h.elements.get(`lifeHeart${i}`).dataset.full),
      [1, 2, 3].map(i => String(i <= lives)));
    assert.equal(h.elements.get('livesCard').dataset.critical, String(lives === 1));
    assert.equal(h.run('JSON.stringify(state)===before'), true);
  }
  h.run("state.lives=1;state.phase='menu';GameplayHud.update(state)");
  assert.equal(h.elements.get('livesCard').dataset.critical, 'false');
});

test('live portraits do not redraw on unchanged frames and update with the chosen appearance', () => {
  const h = createGame(() => .5);
  h.run(`var draws=[];document.getElementById('hudPortrait').getContext('2d').drawImage=(...args)=>draws.push(args);
    for(let i=0;i<120;i++)GameplayHud.update(state)`);
  assert.equal(h.run('draws.length'), 0);
  h.run("state.entities.chicken.skin='punk';GameplayHud.update(state)");
  assert.equal(h.run('draws.length'), 3);
  h.run('for(let i=0;i<120;i++)GameplayHud.update(state)');
  assert.equal(h.run('draws.length'), 3);
});

test('HUD keeps the counters, threat states, stamina and pause/resume bindings', () => {
  const h = createGame(() => .5);
  h.run("state.rescuedCount=4;state.rescuedChicks=2;state.entities.chicken.stamina=.45;state.entities.wolf.mode='chase';refreshHud();GameUI.update(state)");
  assert.equal(h.elements.get('rescuedCount').textContent, '4');
  assert.equal(h.elements.get('chicksCount').textContent, '2');
  assert.equal(h.elements.get('missionProgress').value, 4);
  assert.equal(h.elements.get('staminaMeter').value, .45);
  assert.equal(h.elements.get('threatIndicator').dataset.level, 'danger');
  h.events.elements.pauseBtn.click(); assert.equal(h.run('state.phase'), 'menu');
  h.events.elements.continueBtn.click(); assert.equal(h.run('state.phase'), 'playing');
});

test('a failed goose sprite blocks starting a game instead of creating an invisible enemy', async () => {
  const h = createGame(() => .5, { skipGooseInstall: true });
  h.run('GameUI.showMenu(state)');
  assert.equal(await h.run("GooseArt.load(async () => { throw Error('missing PNG'); })"), false);
  h.run('GameUI.update(state)');
  assert.equal(h.elements.get('startBtn').disabled, true);
  assert.equal(h.elements.get('spriteStatus').hidden, false);
  h.events.elements.startBtn.click(); assert.equal(h.run('state.phase'), 'menu');
  assert.equal(await h.run('GooseArt.load(async () => ({}))'), true);
  h.run('GameUI.update(state)');
  assert.equal(h.elements.get('startBtn').disabled, false);
  h.events.elements.startBtn.click(); assert.equal(h.run('state.phase'), 'playing');
});

test('all HUD IDs remain unique and public CSS/PNG files are included by the build', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ['areaText','pauseBtn','livesCount','lifeHeart1','lifeHeart2','lifeHeart3',
    'rescuedCount','chicksCount','scoreCount','missionProgress','threatText','wolfStateText','staminaMeter']) assert.ok(ids.includes(id));
  assert.match(html, /gameplay\.css/);
  assert.match(fs.readFileSync(path.join(root, 'scripts/build.cjs'),'utf8'), /'gameplay\.css'/);
  assert.doesNotMatch(fs.readFileSync(path.join(root,'src/systems/goose-art.ts'),'utf8'), /drawFallback/);
});
