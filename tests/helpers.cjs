const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function createGame(random = Math.random, options = {}) {
  const elements = new Map();
  const drawing = options.drawingContext || new Proxy({ canvas: { width: 900, height: 520 } }, { get: (o, k) => o[k] ?? (() => ({ addColorStop() {} })), set: (o,k,v) => (o[k]=v,true) });
  const element = id => {
    if (!elements.has(id)) elements.set(id, { textContent: '', className: '', value: 'normal', hidden: false,
      style: {}, dataset: {}, parentElement: { dataset: {} }, width: 900, height: 520,
      addEventListener(key, fn) { (events.elements[id] ||= {})[key] = fn; }, setAttribute() {},
      classList: { toggle() {}, add() {}, remove() {} }, focus() {}, getContext: () => drawing });
    return elements.get(id);
  };
  const storage = options.storage || new Map();
  const events = { window: {}, document: {}, elements: {} };
  const context = vm.createContext({ console, ...(options.Audio ? { Audio: options.Audio } : {}), Math: Object.assign(Object.create(Math), { random }),
    document: { getElementById: element, querySelectorAll: () => [], addEventListener: (key,fn) => { events.document[key] = fn; } },
    window: { addEventListener: (key,fn) => { events.window[key] = fn; }, matchMedia: () => ({ matches: false }) },
    localStorage: { setItem: (k,v) => storage.set(k,v), getItem: k => storage.get(k) ?? null, removeItem: k => storage.delete(k) },
    requestAnimationFrame() {}, Image: class { set src(value) { this.onload?.(); } }, setTimeout, clearTimeout });
  // Follow the exact browser script order, but avoid the live animation/asset bootstrap.
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const match of html.matchAll(/<script[^>]+src="\.\/([^"?]+)(?:\?[^"]*)?"/g)) {
    let source = fs.readFileSync(path.join(root, match[1]), 'utf8');
    if (match[1] === 'game.js' && !options.fullStartup) source = source.slice(0, source.lastIndexOf('\nbuildObstacles();'));
    vm.runInContext(source, context, { filename: match[1] });
    if (match[1] === 'systems/character-art.js' && !options.drawingContext)
      vm.runInContext('CharacterArt.install(() => ({}));', context);
  }
  const run = code => vm.runInContext(code, context);
  if (!options.fullStartup) run('buildObstacles(); GameUI.initialize(); resetGame(); state.phase = "playing";');
  return { run, context, storage, elements, events };
}
module.exports = { createGame };
