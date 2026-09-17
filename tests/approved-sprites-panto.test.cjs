const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { createGame } = require('./helpers.cjs');
const root = path.join(__dirname, '..');

for (const [name, cell, feet] of [['fox', 64, 60], ['owl', 48, 44]]) {
  test(`${name}: approved frames have clean margins, complete silhouettes and one fixed baseline`, async () => {
    const image = await loadImage(path.join(root, `assets/sprites/sources/${name}.png`));
    assert.equal(image.width, cell * 3); assert.equal(image.height, cell * 4);
    const canvas = createCanvas(image.width, image.height), c = canvas.getContext('2d');
    c.drawImage(image, 0, 0);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) {
      const rgba = c.getImageData(col * cell, row * cell, cell, cell).data;
      let minX = cell, minY = cell, maxX = -1, maxY = -1, pixels = 0;
      for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
        const alpha = rgba[(y * cell + x) * 4 + 3];
        assert.ok(alpha === 0 || alpha === 255, 'no translucent edge halo');
        if (!alpha) continue;
        pixels++; minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
      assert.ok(pixels > 350, `${name} ${row}/${col} is not empty`);
      assert.ok(minX >= 2 && maxX < cell - 2 && minY >= 3, 'no clipping into a neighbor frame');
      assert.equal(maxY + 1, feet, 'all poses keep the same ground/perch baseline');
    }
  });
}

test('the approved front/side/back rows match movement and the fox rests in the first pose', () => {
  const h = createGame(() => .5);
  for (const [direction, row] of [['up', 0], ['right', 1], ['down', 2], ['left', 3]]) {
    h.run(`state.entities.foxes[0].direction='${direction}';state.entities.owls[0].direction='${direction}'`);
    assert.equal(h.run('FoxArt.frameFor(state.entities.foxes[0]).row'), row);
    assert.equal(h.run('OwlArt.frameFor(state.entities.owls[0]).row'), row);
    h.run('state.entities.foxes[0].moving=false');
    assert.equal(h.run('FoxArt.frameFor(state.entities.foxes[0]).column'), 0);
    for (let frame = 0; frame < 4; frame++) {
      h.run(`state.entities.foxes[0].moving=true;state.entities.foxes[0].anim=${frame}`);
      assert.equal(h.run('FoxArt.frameFor(state.entities.foxes[0]).column'), [1, 0, 2, 0][frame]);
    }
  }
  for (const [mode, col] of [['watch',0], ['cooldown',1], ['alert',2]]) {
    h.run(`state.entities.owls[0].mode='${mode}'`);
    assert.equal(h.run('OwlArt.frameFor(state.entities.owls[0]).column'), col);
  }
});

test('drawing the approved poses leaves physics, progress and collision radii untouched', async () => {
  const h = createGame(() => .5), canvas = createCanvas(240, 200);
  h.context.art = canvas.getContext('2d');
  h.context.foxImage = await loadImage(path.join(root, 'assets/sprites/sources/fox.png'));
  h.context.owlImage = await loadImage(path.join(root, 'assets/sprites/sources/owl.png'));
  h.run(`FoxArt.install(()=>foxImage);OwlArt.install(()=>owlImage);
    var fox=state.entities.foxes[0],owl=state.entities.owls[0];
    fox.x=70;fox.y=140;fox.mode='dash';owl.perch={x:170,y:180};`);
  const before = h.run('JSON.stringify(state)');
  h.run(`FoxArt.draw(art,fox,{x:0,y:0,shakeX:0,shakeY:0});OwlArt.draw(art,owl,{x:0,y:0,shakeX:0,shakeY:0})`);
  assert.equal(h.run('JSON.stringify(state)'), before);
  assert.equal(h.run('getHitbox(fox).r'), 14);
  assert.ok(canvas.getContext('2d').getImageData(0,0,240,200).data.some((v,i)=>i%4===3&&v));
});

test('Panto appears in the encounter, wardrobe and in-world nameplate', () => {
  const h = createGame(() => .5);
  h.run(`OBSTACLES=[];var g=state.entities.goose,c=state.entities.chicken;
    g.x=100;g.y=160;g.home={x:100,y:160};g.mode='patrol';g.notice=0;
    c.x=150;c.y=160;camera.x=0;camera.y=0;
    var words=[];ctx.fillText=text=>words.push(text);
    GooseSystem.drawIndicator(state);LakeChallenge.updateUI(state);GameUI.update(state);`);
  assert.equal(h.run('GooseSystem.name'), 'Panto');
  assert.equal(h.run('words.includes("Panto")'), true);
  assert.equal(h.elements.get('lakeTitle').textContent, 'Panto, o dono do lago');
  assert.equal(h.elements.get('lakeChallengeBtn').textContent, 'Desafiar Panto · F');
  assert.equal(h.run('SkinSystem.catalog.find(s=>s.id==="goose").name'), 'Panto');
  assert.match(h.run('SkinSystem.catalog.find(s=>s.id==="goose").requirement'), /Panto/);
});

test('previous goose unlocks still equip Panto and keep the saved bridge and rescue progress', () => {
  const storage = new Map([['galinha-guardia-wardrobe-v1', JSON.stringify({
    version: 2, best: 2, selected: 'goose', unlocked: ['classic','goose']
  })]]);
  const h = createGame(() => .5, {storage});
  assert.equal(h.run('state.entities.chicken.skin'), 'goose');
  h.run(`GameManager.rescue(state,state.entities.animals[0]);
    state.lake.completed=true;state.lake.misses=3;state.lake.active=false;
    GameManager.save(state);var saved=GameManager.read();resetGame(91);GameManager.restore(state,saved);GameUI.update(state);`);
  assert.equal(h.run('state.entities.goose.id'), 'pond-goose');
  assert.equal(h.run('state.rescuedCount'), 1);
  assert.equal(h.run('state.lake.completed && SkinSystem.unlocked("goose")'), true);
  assert.equal(h.run('CharacterArt.appearances.goose.name'), 'Panto');
  assert.equal(h.run('state.entities.chicken.skin'), 'goose');
});

test('Panto is not named through an opaque wall or over an active unlock notice', () => {
  const h = createGame(() => .5);
  h.run(`var g=state.entities.goose,c=state.entities.chicken,words=[];ctx.fillText=text=>words.push(text);
    g.x=1000;g.y=800;c.x=1100;c.y=800;camera.x=700;camera.y=500;
    OBSTACLES=[{x:1040,y:700,w:10,h:200}];GooseSystem.drawIndicator(state);`);
  assert.equal(h.run('words.length'),0);
  h.run(`OBSTACLES=[];g.mode='defeated';state.skinNotice={time:3,text:'Panto'};GooseSystem.drawIndicator(state);`);
  assert.equal(h.run('words.length'),0);
});

test('browser PNG requests carry the revision while custom/offline loaders keep plain paths', async () => {
  const urls = [];
  const context = vm.createContext({setTimeout,clearTimeout,Image:class {
    constructor(){this.width=192;this.height=256;}
    set src(url){urls.push(url);this.onload();}
  }});
  vm.runInContext(fs.readFileSync(path.join(root,'systems/wildlife-art.js'),'utf8'),context);
  const sheet=vm.runInContext("createWildlifeSheet('assets/sprites/sources/fox.png',64,64,Array(12).fill(60))",context);
  assert.equal(await sheet.load(),true);
  assert.equal(urls[0],'assets/sprites/sources/fox.png?v=approved-20260917');
});
