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
  assert.equal(elements.get('chickCounter').hidden, true);
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
  const before = elements.get('menuBackdrop').style.transform;
  events.elements.menuScreen.pointermove({ clientX: 120, clientY: 30 });
  assert.equal(elements.get('menuBackdrop').style.transform, before);
  events.elements.menuScatter.click();
  run('InterfaceMotion.frame(state,.05);const count=sceneDraws.length;for(let i=0;i<60;i++)InterfaceMotion.frame(state,.05);');
  assert.equal(run('sceneDraws.length===count'), true);
  run('state.entities.chicken.skin="punk";InterfaceMotion.frame(state,.05);');
  assert.equal(run('sceneDraws.length'), 18);
  events.media.change({ matches: false });
  run('InterfaceMotion.frame(state,.05);');
  events.elements.menuScreen.pointermove({ clientX: 120, clientY: 30 });
  assert.match(elements.get('menuBackdrop').style.transform, /translate\(/);
  events.media.change({ matches: true });
  run('InterfaceMotion.frame(state,.05);');
  assert.equal(elements.get('menuBackdrop').style.transform, 'scale(1.025)');
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
