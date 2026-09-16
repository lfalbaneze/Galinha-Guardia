/* Licensed pixel sprites shared by the game, wardrobe and finale. */
const CharacterArt = (() => {
  // Stable IDs preserve previously earned unlocks; each appearance is a complete sprite.
  const appearances = Object.freeze({
    classic: Object.freeze({ name: 'Galinha', species: 'chicken' }),
    punk: Object.freeze({ name: 'Pato', species: 'duck' }),
    astronaut: Object.freeze({ name: 'Coelho', species: 'rabbit' }),
    robocop: Object.freeze({ name: 'Gato', species: 'cat' }),
    priest: Object.freeze({ name: 'Cachorro', species: 'dog' })
  });
  const species = Object.freeze(Object.keys(SpriteData));
  const sources = Object.freeze([...new Set(species.flatMap(s => Object.values(SpriteData[s].poses)
    .flatMap(p => p.frames.map(f => f.src))))]);
  const images = new Map();
  let pending = null, loading = false, errors = [];
  function browserImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const timeout = setTimeout(() => reject(new Error(src)), 10000);
      image.onload = () => { clearTimeout(timeout); resolve(image); };
      image.onerror = () => { clearTimeout(timeout); reject(new Error(src)); };
      image.src = src;
    });
  }
  function load(loader = browserImage) {
    if (pending) return pending;
    if (sources.every(src => images.has(src))) return Promise.resolve(true);
    loading = true; errors = [];
    pending = Promise.all(sources.map(async src => {
      if (images.has(src)) return;
      try { images.set(src, await loader(src)); } catch { errors.push(src); }
    })).then(() => { loading = false; pending = null; return errors.length === 0; });
    return pending;
  }
  // Offline previews inject actual decoded PNGs synchronously.
  function install(loader) {
    for (const src of sources) images.set(src, loader(src));
    errors = [];
  }
  function frameFor(name, options = {}) {
    const appearance = name === 'chicken' ? appearances[options.skin] || appearances.classic : null;
    const spriteName = appearance?.species || name;
    const definition = SpriteData[spriteName];
    if (!definition) return null;
    const requested = options.direction || (options.facing < 0 ? 'left' : 'right');
    const direction = definition.poses[requested] ? requested : 'down';
    const pose = definition.poses[direction];
    // The simulation clock already advances faster during movement and sprinting.
    const index = options.moving ? Math.floor(Math.abs(options.anim || 0)) % pose.frames.length : 0;
    const size = appearance && spriteName !== 'chicken' ? Math.min(1.25,
      64 / Math.max(...Object.values(definition.poses).map(p => p.width * definition.scale)),
      58 / Math.max(...Object.values(definition.poses).map(p => (p.bottom - p.top) * definition.scale))) : 1;
    return { definition, pose, frame: pose.frames[index], index, direction, spriteName, scale: definition.scale * size };
  }
  const block = (c, color, x, y, w, h) => { c.fillStyle = color; c.fillRect(x, y, w, h); };

  function expression(c, name, direction, pose, scale, options) {
    const mood = options.mood, top = 14 - (pose.bottom - pose.top) * scale;
    const side = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
    const frontLow = direction === 'down' && ['wolf', 'cow', 'pig'].includes(name);
    const headX = side * pose.width * scale * .28;
    const headY = top + (14 - top) * (frontLow ? .66 : .3);
    if (mood === 'angry' || mood === 'furious') {
      const x = headX - 9, y = top - 7;
      c.strokeStyle = '#ad422d'; c.lineWidth = 2; c.beginPath();
      c.moveTo(x - 4, y); c.lineTo(x, y); c.lineTo(x, y + 4);
      c.moveTo(x + 4, y - 4); c.lineTo(x + 4, y); c.lineTo(x + 8, y); c.stroke();
      if (mood === 'furious') {
        c.strokeStyle = '#fff4dc'; c.lineWidth = 3;
        for (const s of [-1, 1]) { c.beginPath(); c.moveTo(headX + s * 16, headY); c.quadraticCurveTo(headX + s * 24, headY - 5, headX + s * 19, headY - 11); c.stroke(); }
      }
    } else if (mood === 'crying') {
      for (const s of [-1, 1]) {
        const fall = ((options.anim || 0) * 6 + (s + 1) * 2) % 11;
        block(c, '#c5f4ff', headX + s * 6, headY + fall, 3, 4);
        block(c, '#55afda', headX + s * 6, headY + fall + 3, 3, 3);
      }
    } else if (mood === 'hurt' && name === 'wolf') {
      block(c, '#fff3dc', headX - 6, headY - 8, 10, 4); block(c, '#bb8a69', headX - 2, headY - 8, 2, 4);
    }
  }
  function draw(c, name, x, y, options = {}) {
    const current = frameFor(name, options);
    if (!current) return false;
    const { pose, frame, direction, spriteName, scale } = current, image = images.get(frame.src);
    if (!image) return false;
    const blend = Math.max(0, Math.min(1, options.hideBlend ?? (options.hidden ? 1 : 0)));
    c.save(); c.translate(Math.round(x), Math.round(y)); c.scale(options.scale || 1, options.scale || 1);
    c.imageSmoothingEnabled = false;
    c.fillStyle = 'rgba(45,49,25,.23)'; c.beginPath();
    c.ellipse(0, 14, Math.min(28, pose.width * scale * .4), 4, 0, 0, Math.PI * 2); c.fill();
    if (name === 'chicken' && blend) { c.translate(0, 14); c.scale(1, 1 - blend * .23); c.translate(0, -14); }
    c.save(); if (pose.flip) c.scale(-1, 1);
    c.translate(-pose.cx * scale, 14 - pose.bottom * scale); c.scale(scale, scale);
    if (name === 'chick') c.filter = 'sepia(1) saturate(4) brightness(.92)';
    c.drawImage(image, frame.x, frame.y, frame.w, frame.h, 0, 0, frame.w, frame.h);
    c.restore(); expression(c, spriteName, direction, pose, scale, options); c.restore();
    return true;
  }
  function markerOffset(name) {
    const d = SpriteData[name];
    return d ? Math.ceil(Math.max(...Object.values(d.poses).map(p => (p.bottom - p.top) * d.scale)) + 1) : 56;
  }
  return Object.freeze({ draw, species, sources, appearances, frameFor, load, install, markerOffset,
    get loading() { return loading; }, get ready() { return sources.every(src => images.has(src)); },
    get errors() { return errors.slice(); } });
})();
