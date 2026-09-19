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

test('Panto has twelve distinct transparent poses with grounded feet and a consistent scale', async () => {
  const { loadImage, createCanvas } = require('@napi-rs/canvas');
  const {api}=art(),image=await loadImage(path.join(root,api.source));
  assert.equal(image.width,1024);assert.equal(image.height,1536);api.install(()=>image);
  const canvas=createCanvas(180,180),c=canvas.getContext('2d'),signatures=new Set();
  for(const direction of ['up','right','down','left'])for(const pose of [0,1,2]){
    c.clearRect(0,0,180,180);
    api.draw(c,goose({direction,moving:pose===1,anim:pose,mode:pose===2?'warning':'patrol'}),{x:0,y:0});
    const pixels=c.getImageData(0,0,180,180).data;let top=180,bottom=-1,count=0;
    for(let y=0;y<180;y++)for(let x=0;x<180;x++){
      if(pixels[(y*180+x)*4+3]<200)continue;
      assert.ok(x>50&&x<150,'no adjacent sprite bleeds into the crop');
      top=Math.min(top,y);bottom=Math.max(bottom,y);count++;
    }
    assert.ok(count>900);assert.ok(bottom>=112&&bottom<=114,'feet stay at the world ground plane');
    assert.ok(bottom-top>=60&&bottom-top<=64,'consistent height across all poses');
    assert.equal(pixels[3],0,'source background is transparent');
    signatures.add(require('node:crypto').createHash('sha256').update(pixels).digest('hex'));
  }
  assert.equal(signatures.size,12,'each facing and action has its own visible pose');
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
  assert.ok(draws[0][7]<64&&draws[0][8]<=64);
  assert.equal(draws[0][6]+draws[0][8],94,'sprite is anchored by feet after the camera offset');
  assert.equal(c.imageSmoothingEnabled, true); assert.equal(stack.length, 0);
  assert.equal(JSON.stringify(entity), before);
});

test('goose image requests are shared, cached and can be retried after failure', async () => {
  const { api } = art(); let finish, calls = 0;
  const first = api.load(src => { calls++; assert.match(src, /panto-v2\.png$/); return new Promise(resolve => { finish = resolve; }); });
  assert.equal(api.load(), first); assert.equal(api.loading, true);
  await Promise.resolve(); finish({width:1024,height:1536}); assert.equal(await first, true);
  assert.equal(api.ready, true); assert.equal(api.loading, false);
  await api.load(() => { throw Error('cache should be reused'); }); assert.equal(calls, 1);
  const failed = art().api;
  assert.equal(await failed.load(async () => { throw Error('missing file'); }), false);
  assert.equal(failed.errors.length, 1); assert.equal(failed.loading, false);
  assert.equal(await failed.load(async () => ({width:192,height:256})),false,'old cached sheet cannot be used with new crops');
  assert.equal(await failed.load(async () => ({width:1024,height:1536})), true); assert.equal(failed.errors.length, 0);
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
  assert.equal(await h.run('GooseArt.load(async () => ({width:1024,height:1536}))'), true);
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
