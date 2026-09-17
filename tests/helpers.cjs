const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function createGame(random = Math.random, options = {}) {
  const elements = new Map();
  const drawing = options.drawingContext || new Proxy({ canvas: { width: 900, height: 520 } }, { get: (o, k) => o[k] ?? (() => ({ addColorStop() {} })), set: (o,k,v) => (o[k]=v,true) });
  const menuDrawing = options.menuDrawingContext || new Proxy({}, { get: (o, k) => o[k] ?? (() => {}), set: (o,k,v) => (o[k]=v,true) });
  const element = id => {
    if (!elements.has(id)) elements.set(id, { id, textContent: '', className: '', value: 'normal', hidden: false, tabIndex: 0,
      style: {}, dataset: {}, parentElement: { dataset: {} }, width: 900, height: 520,
      attributes: {},
      addEventListener(key, fn) { (events.elements[id] ||= {})[key] = fn; },
      setAttribute(key, value) { this.attributes[key] = String(value); },
      getAttribute(key) { return this.attributes[key]; },
      querySelectorAll() { return []; }, contains(child) { return child === this; },
      classList: { toggle() {}, add() {}, remove() {} },
      focus() { context.document.activeElement = this; }, getContext: () => id === 'menuScene' ? menuDrawing : drawing,
      getBoundingClientRect() { return { left: 0, top: 0, width: 160, height: 100 }; },
      ...(options.recordAnimations ? { animate(frames, timing) {
        const record = { id, frames, timing, cancelled: false, cancel() { this.cancelled = true; } };
        animations.push(record); return record;
      } } : {}) });
    return elements.get(id);
  };
  const storage = options.storage || new Map();
  const events = { window: {}, document: {}, elements: {}, media: {} }, animations = [];
  const context = vm.createContext({ console, ...(options.Audio ? { Audio: options.Audio } : {}), Math: Object.assign(Object.create(Math), { random }),
    document: { getElementById: element, querySelectorAll: () => [], addEventListener: (key,fn) => { events.document[key] = fn; } },
    window: { addEventListener: (key,fn) => { events.window[key] = fn; }, matchMedia: () => ({
      matches: !!options.reducedMotion, addEventListener: (key, fn) => { events.media[key] = fn; } }) },
    localStorage: { setItem: (k,v) => storage.set(k,v), getItem: k => storage.get(k) ?? null, removeItem: k => storage.delete(k) },
    requestAnimationFrame() {}, Image: class { set src(value) { this.onload?.(); } }, setTimeout, clearTimeout });
  // Follow the exact browser script order, but avoid the live animation/asset bootstrap.
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const match of html.matchAll(/<script[^>]+src="\.\/([^"?]+)(?:\?[^"]*)?"/g)) {
    let source = fs.readFileSync(path.join(root, match[1]), 'utf8');
    if (match[1] === 'game.js' && !options.fullStartup) source = source.slice(0, source.lastIndexOf('\nbuildObstacles();'));
    vm.runInContext(source, context, { filename: match[1] });
    if (match[1] === 'systems/goose-art.js' && !options.drawingContext && !options.skipGooseInstall)
      vm.runInContext('GooseArt.install(() => ({}));', context);
    if (match[1] === 'systems/fox-art.js' && !options.drawingContext)
      vm.runInContext('FoxArt.install(() => ({}));', context);
    if (match[1] === 'systems/owl-art.js' && !options.drawingContext)
      vm.runInContext('OwlArt.install(() => ({}));', context);
    if (match[1] === 'systems/thor-art.js' && !options.drawingContext && !options.skipThorInstall)
      vm.runInContext('ThorArt.install(() => ({}));', context);
    if (match[1] === 'systems/character-art.js' && !options.drawingContext)
      vm.runInContext('CharacterArt.install(() => ({}));', context);
  }
  const run = code => vm.runInContext(code, context);
  if (!options.fullStartup) run('buildObstacles(); GameUI.initialize(); resetGame(); state.phase = "playing";');
  return { run, context, storage, elements, events, animations };
}
module.exports = { createGame };
