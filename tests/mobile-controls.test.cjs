const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Isolate the real input module, without loading sprites or changing game rules.
function harness({ touch = true, saved = null } = {}) {
  const elements = new Map(), storage = new Map();
  if (saved) storage.set('galinha-controls-v1', JSON.stringify(saved));
  function target(object = {}) {
    object.listeners = new Map();
    object.addEventListener = (type, listener) => {
      if (!object.listeners.has(type)) object.listeners.set(type, []);
      object.listeners.get(type).push(listener);
    };
    return object;
  }
  function element(id = '') {
    const captures = new Set();
    const node = target({ id, hidden: false, disabled: false, checked: false, dataset: {},
      textContent: '', children: [], attributes: {},
      style: { setProperty(key, value) { this[key] = value; } },
      setAttribute(key, value) { this.attributes[key] = String(value); },
      getAttribute(key) { return this.attributes[key]; },
      append(...children) { for (const child of children) { this.children.push(child); if (child.id) elements.set(child.id, child); } },
      appendChild(child) { this.append(child); return child; },
      prepend(child) { this.children.unshift(child); if (child.id) elements.set(child.id, child); },
      querySelector(selector) { return selector === '.touch-dpad' ? elements.get('dpad') : null; },
      getBoundingClientRect() { return { left: 10, top: 500, width: 120, height: 120 }; },
      setPointerCapture(pointer) { captures.add(pointer); },
      hasPointerCapture(pointer) { return captures.has(pointer); },
      releasePointerCapture(pointer) { captures.delete(pointer); },
      focus() {},
    });
    if (id) elements.set(id, node);
    return node;
  }
  const ids = ['gameShell','touchControls','touchRun','touchSneak','touchInteract','touchPause',
    'controlToggleSneak','controlToggleSprint','controlTouch','controlDevice','touchUp',
    'touchDown','touchLeft','touchRight','liveControls','keyMove','keySneak','keySprint',
    'keyHide','panel-controls','gameCanvas','dpad'];
  ids.forEach(element);
  const meta = { content: 'width=device-width, initial-scale=1.0' };
  const help = { textContent: 'No celular: use as setas.' };
  const document = target({ currentScript: { src: 'https://game.example/path/systems/game-input.js?v=old' },
    baseURI: 'https://game.example/path/', hidden: false, head: element(),
    getElementById: id => elements.get(id) || null,
    createElement: () => element(), createTextNode: text => ({ textContent: text }),
    querySelector: () => meta, querySelectorAll: () => [help],
  });
  const window = target({ innerHeight: 800, matchMedia: () => ({ matches: false }),
    visualViewport: target({ height: 780, scale: 1 }),
  });
  const state = { phase: 'playing', scene: false, entities: { chicken: { hidden: false } }, lake: { active: false } };
  const calls = { interact: 0, thor: 0 };
  let context;
  const run = code => vm.runInContext(code, context);
  context = vm.createContext({ document, window, URL, console, state, input: new Set(),
    navigator: { maxTouchPoints: touch ? 5 : 0, getGamepads: () => [] },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    GameUI: { update: game => { context.state = game; run('GameInput.update(state)'); },
      showMenu(game) { game.phase = 'menu'; run('GameInput.clear();GameInput.update(state)'); },
      resume() { state.phase = 'playing'; run('GameInput.clear();GameInput.update(state)'); },
    },
    ThorSystem: { active: game => game.scene, request: () => calls.thor++, skip() {} },
    LakeChallenge: { interact: () => false, canCounter: () => true, start() {}, cancel() {} },
    RescueSystem: { callTarget: () => true, callChick: () => { calls.interact++; return true; } },
    HidingSpots: { candidate: () => true, toggle() {} },
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  });
  run(fs.readFileSync(path.join(__dirname, '../systems/game-input.js'), 'utf8'));
  run('GameInput.update(state)');
  const emit = (node, type, values = {}) => {
    const event = { pointerId: 1, pointerType: 'touch', button: 0, clientX: 70, clientY: 560,
      detail: 0, prevented: false, preventDefault() { this.prevented = true; }, ...values };
    for (const listener of node.listeners.get(type) || []) listener(event);
    return event;
  };
  const vector = () => JSON.parse(run('JSON.stringify(GameInput.vector({x:0,y:0}))'));
  return { elements, document, window, state, calls, storage, run, emit, vector, meta, help,
    stick: elements.get('touchJoystick') };
}

test('mobile detection, stylesheet URL and viewport work in a nested HTML-game path', () => {
  const h = harness();
  assert.equal(h.run('GameInput.preferences.touch'), true);
  assert.equal(h.elements.get('touchControls').hidden, false);
  assert.equal(h.document.head.children[0].href, 'https://game.example/path/systems/mobile-controls.css?v=touch-1');
  assert.match(h.meta.content, /viewport-fit=cover/);
  assert.match(h.help.textContent, /analógico/);
  assert.equal(h.elements.get('gameShell').style['--mobile-height'], '780px');
  h.run('GameInput.initialize();GameInput.update(state)');
  assert.equal(h.document.head.children.length, 1, 'initialization does not duplicate listeners or stylesheets');
});

test('joystick dead zone, proportional movement and diagonals stay within normal speed', () => {
  const h = harness();
  h.emit(h.stick, 'pointerdown');
  assert.deepEqual(h.vector(), { x: 0, y: 0 });
  h.emit(h.window, 'pointermove', { clientX: 72 });
  assert.deepEqual(h.vector(), { x: 0, y: 0 });
  h.emit(h.window, 'pointermove', { clientX: 90 });
  assert.ok(h.vector().x > 0 && h.vector().x < 1);
  h.emit(h.window, 'pointermove', { clientX: 200, clientY: 400 });
  assert.ok(h.vector().x > 0 && h.vector().y < 0);
  assert.ok(Math.abs(Math.hypot(h.vector().x, h.vector().y) - 1) < 1e-9);
  assert.deepEqual(JSON.parse(h.run('JSON.stringify(GameInput.vector({x:-1,y:0}))')), { x: -1, y: 0 });
});

test('another finger cannot steal the joystick but can run and interact without duplicate clicks', () => {
  const h = harness();
  h.emit(h.stick, 'pointerdown', { clientX: 130 });
  h.emit(h.stick, 'pointerdown', { pointerId: 2, clientX: 10 });
  h.emit(h.window, 'pointermove', { pointerId: 2, clientX: 10 });
  assert.equal(h.vector().x, 1);
  h.emit(h.elements.get('touchRun'), 'pointerdown', { pointerId: 2 });
  h.emit(h.elements.get('touchRun'), 'click', { detail: 1 });
  assert.equal(h.run("GameInput.held('shift')"), true);
  assert.equal(h.vector().x, 1);
  h.emit(h.elements.get('touchInteract'), 'pointerdown', { pointerId: 2 });
  h.emit(h.elements.get('touchInteract'), 'click', { detail: 1 });
  assert.equal(h.calls.interact, 1);
  h.emit(h.window, 'pointerup', { pointerId: 2 });
  assert.equal(h.vector().x, 1);
  h.emit(h.window, 'pointerup');
  assert.deepEqual(h.vector(), { x: 0, y: 0 });
});

test('release, cancellation and lost capture all reset movement and center the knob', () => {
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    const h = harness();
    h.emit(h.stick, 'pointerdown', { clientX: 130 });
    h.emit(type === 'lostpointercapture' ? h.stick : h.window, type);
    assert.deepEqual(h.vector(), { x: 0, y: 0 }, type);
    assert.equal(h.stick.dataset.active, 'false');
    assert.equal(h.stick.children[1].style.transform, 'translate(0px, 0px)');
    h.emit(h.window, 'pointermove', { clientX: 130 });
    assert.deepEqual(h.vector(), { x: 0, y: 0 }, 'requires a fresh press');
  }
});

test('pause, hide-style clear, backgrounding and rotation never leave held input behind', () => {
  for (const type of ['blur', 'pagehide', 'resize', 'orientationchange', 'visibilitychange', 'pause', 'clear']) {
    const h = harness();
    h.emit(h.stick, 'pointerdown', { clientX: 130 });
    h.emit(h.elements.get('touchRun'), 'click');
    if (type === 'visibilitychange') { h.document.hidden = true; h.emit(h.document, type); }
    else if (type === 'pause') h.emit(h.elements.get('touchPause'), 'click');
    else if (type === 'clear') h.run('GameInput.clear()');
    else h.emit(h.window, type);
    assert.deepEqual(h.vector(), { x: 0, y: 0 }, type);
    assert.equal(h.run("GameInput.held('shift')"), false, type);
  }
});

test('setas remain available, multi-touch works and the selected mode persists', () => {
  const h = harness();
  const choice = h.elements.get('controlTouchStick');
  choice.checked = false; h.emit(choice, 'change');
  assert.equal(h.stick.hidden, true);
  assert.equal(h.elements.get('dpad').hidden, false);
  h.emit(h.elements.get('touchRight'), 'pointerdown');
  h.emit(h.elements.get('touchUp'), 'pointerdown', { pointerId: 2 });
  assert.ok(Math.abs(Math.hypot(h.vector().x, h.vector().y) - 1) < 1e-9);
  assert.ok(h.vector().x > 0 && h.vector().y < 0);
  h.emit(h.window, 'pointercancel'); h.emit(h.window, 'pointerup', { pointerId: 2 });
  assert.deepEqual(h.vector(), { x: 0, y: 0 });
  const reload = harness({ saved: JSON.parse(h.storage.get('galinha-controls-v1')) });
  assert.equal(reload.run('GameInput.preferences.joystick'), false);
});

test('desktop and an explicit disabled-touch preference keep the original keyboard controls', () => {
  for (const options of [{ touch: false }, { touch: true, saved: { touch: false } }]) {
    const h = harness(options);
    assert.equal(h.elements.get('touchControls').hidden, true);
    assert.equal(h.elements.get('liveControls').hidden, false);
    h.run("input.add('d')");
    assert.deepEqual(h.vector(), { x: 1, y: 0 });
  }
});

test('disabled actions and cinematic input are blocked, assistive clicks still work', () => {
  const h = harness();
  const button = h.elements.get('touchInteract'); button.disabled = true;
  h.emit(button, 'pointerdown'); assert.equal(h.calls.interact, 0);
  button.disabled = false; h.emit(button, 'click'); assert.equal(h.calls.interact, 1);
  h.state.scene = true; h.run('GameInput.update(state)');
  h.emit(h.stick, 'pointerdown', { clientX: 130 });
  h.emit(h.elements.get('touchRun'), 'pointerdown');
  assert.deepEqual(h.vector(), { x: 0, y: 0 });
  assert.equal(h.run("GameInput.held('shift')"), false);
  assert.equal(h.elements.get('touchControls').hidden, true);
});
