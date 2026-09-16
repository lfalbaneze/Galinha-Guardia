const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

function menu(options) {
  const game = createGame(() => .5, options);
  game.run(`GameUI.showMenu(state);
    const sceneContext=document.getElementById('menuScene').getContext('2d');
    const sceneDraws=[], scenePositions=[];
    sceneContext.drawImage=(...args)=>sceneDraws.push(args);
    sceneContext.translate=(...args)=>scenePositions.push(args);
    CharacterArt.install(src=>({src}));
    const snapshot=JSON.stringify(state);`);
  game.elements.get('menuScene').getBoundingClientRect = () => ({ left: 0, top: 0, width: 1360, height: 730 });
  game.elements.get('menuCard').getBoundingClientRect = () => ({ left: 940, top: 50, width: 390, height: 620 });
  return game;
}

test('farm menu animates its own herd while saved animals, chicks, map, clock and audio stay paused', () => {
  const { run, elements, storage, events } = menu();
  const beforeStorage = [...storage];
  run('InterfaceMotion.frame(state,.05);');
  assert.equal(elements.get('gameShell').dataset.phase, 'menu');
  assert.equal(run('sceneDraws.length'), 6);
  const first = run('JSON.stringify(scenePositions)');
  run('for(let i=0;i<29;i++)InterfaceMotion.frame(state,.05);scenePositions.length=0;InterfaceMotion.frame(state,.05);');
  assert.notEqual(run('JSON.stringify(scenePositions)'), first);
  events.elements.menuScatter.click();
  assert.ok(elements.get('menuBanter').textContent.length > 0);
  run('for(let i=0;i<70;i++)InterfaceMotion.frame(state,.05);');
  assert.equal(run('JSON.stringify(state)===snapshot'), true);
  assert.deepEqual([...storage], beforeStorage);
  assert.equal(elements.get('chickCounter').hidden, false);
  assert.equal(run('sceneDraws.some(args=>args[0].src.includes("Chick_"))'), false);
  events.elements.continueBtn.click();
  assert.equal(elements.get('gameShell').dataset.phase, 'playing');
  run('const beforePlay=sceneDraws.length;for(let i=0;i<20;i++)InterfaceMotion.frame(state,.05);');
  assert.equal(run('sceneDraws.length===beforePlay'), true);
});

test('reduced motion freezes the farm and parallax but keeps the fun button and appearance changes usable', () => {
  const { run, events, elements } = menu({ reducedMotion: true });
  run('for(let i=0;i<60;i++)InterfaceMotion.frame(state,.05);');
  assert.equal(run('sceneDraws.length'), 6);
  const before = elements.get('menuWorld').style.transform;
  events.elements.menuScreen.pointermove({ clientX: 120, clientY: 30 });
  assert.equal(elements.get('menuWorld').style.transform, before);
  events.elements.menuScatter.click();
  run('InterfaceMotion.frame(state,.05);const count=sceneDraws.length;for(let i=0;i<60;i++)InterfaceMotion.frame(state,.05);');
  assert.equal(run('sceneDraws.length===count'), true);
  run('state.entities.chicken.skin="punk";InterfaceMotion.frame(state,.05);');
  assert.equal(run('sceneDraws.length'), 18);
  events.media.change({ matches: false });
  run('InterfaceMotion.frame(state,.05);');
  events.elements.menuScreen.pointermove({ clientX: 120, clientY: 30 });
  assert.match(elements.get('menuWorld').style.transform, /translate\(/);
  assert.equal(run('document.getElementById("menuBackdrop").style.transform'), undefined, 'background cannot drift independently of the herd');
  events.media.change({ matches: true });
  run('InterfaceMotion.frame(state,.05);');
  assert.equal(elements.get('menuWorld').style.transform, 'scale(1.025)');
});

test('every route stays on the painted dirt through wandering, commotion and responsive cropping', async () => {
  const { createCanvas, loadImage } = require('@napi-rs/canvas');
  const image = await loadImage(require('node:path').join(__dirname, '../assets/menu/farm-title.png'));
  const terrain = createCanvas(image.width, image.height).getContext('2d'); terrain.drawImage(image, 0, 0);
  const pixels = terrain.getImageData(0, 0, image.width, image.height).data;
  const h = menu();
  h.run(`let drawDepth=0, gotOrigin=false; const feet=[];
    sceneContext.save=()=>{drawDepth++;if(drawDepth===1)gotOrigin=false;};sceneContext.restore=()=>drawDepth--;
    sceneContext.translate=(x,y)=>{if(drawDepth===1&&!gotOrigin){feet.push({x,y});gotOrigin=true;}};
    sceneContext.scale=(x,y)=>{if(drawDepth===1)feet.at(-1).scale=x;};`);
  for (const [width, height] of [[1360,730],[1000,900],[360,540],[960,540]]) {
    const canvas = h.elements.get('menuScene');
    // Bounding rect includes the parent zoom; client size must drive projection.
    canvas.clientWidth = width; canvas.clientHeight = height;
    canvas.getBoundingClientRect = () => ({ width: width * 1.025, height: height * 1.025 });
    h.events.window.resize();
    h.run('feet.length=0;for(let i=0;i<2400;i++)MenuScene.frame(state,.05,false);');
    h.events.elements.menuScatter.click();
    h.run('for(let i=0;i<300;i++)MenuScene.frame(state,.05,false);');
    const cover = Math.max(width / image.width, height / image.height);
    const left = (width - image.width * cover) * .42, top = (height - image.height * cover) * .5;
    const calls = h.run('feet');
    assert.ok(calls.length > 6000);
    for (let i = 0; i < calls.length; i++) {
      const point = calls[i], x = Math.round((point.x - left) / cover), y = Math.round((point.y + 14 * point.scale - top) / cover);
      let dirt = 0;
      // Sample the feet and their clearance in the actual artwork, not the route data.
      for (const dx of [-12,0,12]) for (const dy of [-6,0,6]) {
        const offset = ((y + dy) * image.width + x + dx) * 4;
        const [r,g,b] = pixels.slice(offset, offset + 3);
        if (r > g * 1.13 && g > b * 1.18) dirt++;
      }
      assert.ok(dirt >= 7, `feet left the dirt at ${x},${y} in ${width}×${height}`);
      if (i % 6) assert.ok(point.y + 14 * point.scale >= calls[i-1].y + 14 * calls[i-1].scale, 'nearer animals must draw last');
    }
    assert.equal(canvas.width, width);
  }
});

function audibleMenu(options = {}) {
  const players = [], plays = [];
  class MockAudio {
    constructor(src) { this.src = src; this.paused = true; this.currentTime = 0; players.push(this); }
    play() { this.paused = false; plays.push({ src: this.src, loop: this.loop, volume: this.volume }); return Promise.resolve(); }
    pause() { this.paused = true; }
  }
  const h = menu({ ...options, Audio: MockAudio });
  h.run(`const hops=[];sceneContext.translate=(x,y)=>{if(x===0&&y<0)hops.push(-y);};InterfaceMotion.frame(state,0);`);
  return { ...h, players, plays };
}

test('the button jumps one animal, plays its recording and anchors a temporary caption to it', () => {
  const h = audibleMenu();
  assert.equal(h.plays.length, 0, 'no menu autoplay');
  h.events.elements.menuScatter.click();
  assert.match(h.plays[0].src, /voices\/v2\/animal-chicken\.wav$/);
  assert.equal(h.plays[0].loop, false);
  assert.equal(h.elements.get('menuBanter').hidden, false);
  assert.match(h.elements.get('menuBanter').textContent, /Galinha/);
  h.run('for(let i=0;i<6;i++)InterfaceMotion.frame(state,.05);');
  assert.ok(h.run('Math.max(...hops)') > 30, 'visible jump, with shadow still on the route');
  assert.ok(Number.parseFloat(h.elements.get('menuBanter').style.left) > 350);
  h.run('for(let i=0;i<40;i++)InterfaceMotion.frame(state,.05);hops.length=0;InterfaceMotion.frame(state,.05);');
  assert.equal(h.run('hops.length'), 0, 'lands and resumes normal walking');
  assert.equal(h.elements.get('menuBanter').hidden, true);
  assert.equal(h.run('JSON.stringify(state)===snapshot'), true);
  h.events.elements.menuScatter.click();
  assert.match(h.plays.at(-1).src, /animal-duck\.wav$/);
  assert.match(h.elements.get('menuBanter').textContent, /Pato/);
});

test('menu reactions follow the equipped appearance and rapid clicks reuse one audio voice', () => {
  const h = audibleMenu(); h.run('state.entities.chicken.skin="robocop";InterfaceMotion.frame(state,.05);');
  h.events.elements.menuScatter.click();
  assert.match(h.plays.at(-1).src, /animal-cat\.wav$/);
  assert.match(h.elements.get('menuBanter').textContent, /Gatinho/);
  for (let i = 0; i < 18; i++) h.events.elements.menuScatter.click();
  assert.equal(h.players.length, 1);
  assert.ok(h.plays.every(play => !play.loop));
  h.events.elements.continueBtn.click();
  assert.equal(h.players[0].paused, true, 'menu voice stops when gameplay resumes');
});

test('muting keeps the jump, reduced motion keeps the call, and hidden menus ignore clicks', () => {
  const muted = audibleMenu(); muted.run('AudioSystem.toggleMute();'); muted.events.elements.menuScatter.click();
  muted.run('InterfaceMotion.frame(state,.1);');
  assert.equal(muted.plays.length, 0); assert.ok(muted.run('hops.length') > 0);
  const reduced = audibleMenu({ reducedMotion: true }); reduced.events.elements.menuScatter.click();
  reduced.run('for(let i=0;i<40;i++)InterfaceMotion.frame(state,.05);');
  assert.equal(reduced.plays.length, 1); assert.equal(reduced.run('hops.length'), 0);
  assert.equal(reduced.elements.get('menuBanter').hidden, true);
  const hidden = audibleMenu(); hidden.events.elements.menuScatter.click();
  hidden.context.document.hidden = true; hidden.run('InterfaceMotion.frame(state,.05);');
  hidden.events.elements.menuScatter.click();
  assert.equal(hidden.plays.length, 1); assert.ok(hidden.players.every(player => player.paused));
  assert.equal(hidden.elements.get('menuBanter').hidden, true);
});

test('the button skips an animal hidden behind the menu card', () => {
  const h = audibleMenu();
  h.elements.get('menuCard').getBoundingClientRect = () => ({ left: 400, top: 400, width: 130, height: 260 });
  h.events.elements.menuScatter.click();
  assert.match(h.plays[0].src, /animal-duck\.wav$/);
});

test('resizing redraws a static farm at the new resolution and hidden pages do no drawing', () => {
  const { run, context, events, elements } = menu({ reducedMotion: true });
  const canvas = elements.get('menuScene');
  canvas.getBoundingClientRect = () => ({ width: 680, height: 235 });
  context.window.devicePixelRatio = 2;
  run('InterfaceMotion.frame(state,.05);');
  assert.equal(canvas.width, 1360);
  assert.equal(canvas.height, 470);
  canvas.getBoundingClientRect = () => ({ width: 330, height: 145 });
  events.window.resize();
  run('InterfaceMotion.frame(state,.05);');
  assert.equal(canvas.width, 660);
  assert.equal(canvas.height, 290);
  context.document.hidden = true;
  run('const beforeHidden=sceneDraws.length;for(let i=0;i<20;i++)InterfaceMotion.frame(state,.05);');
  assert.equal(run('sceneDraws.length===beforeHidden'), true);
  context.document.hidden = false;
  run('InterfaceMotion.frame(state,.05);');
  assert.equal(run('sceneDraws.length'), 18);
});
