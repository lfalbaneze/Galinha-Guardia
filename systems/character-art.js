/* Licensed pixel sprites shared by the game, wardrobe and finale. */
const CharacterArt = (() => {
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
    const definition = SpriteData[name];
    if (!definition) return null;
    const requested = options.direction || (options.facing < 0 ? 'left' : 'right');
    const direction = definition.poses[requested] ? requested : 'down';
    const pose = definition.poses[direction];
    // The simulation clock already advances faster during movement and sprinting.
    const index = options.moving ? Math.floor(Math.abs(options.anim || 0)) % pose.frames.length : 0;
    return { definition, pose, frame: pose.frames[index], index, direction };
  }
  const block = (c, color, x, y, w, h) => { c.fillStyle = color; c.fillRect(x, y, w, h); };

  // Costumes use the chicken's source grid, keeping its silhouette and face.
  function clothes(c, skin, direction, index) {
    if (!['punk', 'astronaut', 'robocop', 'priest'].includes(skin)) return;
    const side = direction === 'left' || direction === 'right', back = direction === 'up';
    c.save();
    if (direction === 'left') { c.translate(32, 0); c.scale(-1, 1); }
    c.translate(0, index === 2 ? -1 : 0);
    const x = side ? 10 : 9, y = side ? 17 : 16, w = side ? 13 : 14;
    block(c, '#343646', x, y, w, 7);
    if (skin === 'punk') {
      block(c, '#56556a', x + 2, y + 1, w - 4, 4);
      block(c, '#e6bd64', x + 2, y + 1, 1, 1); block(c, '#e6bd64', x + w - 3, y + 1, 1, 1);
      block(c, '#bbb8b2', side ? 20 : 15, y + 1, 1, 5);
      const hx = side ? 24 : 15, hy = side ? 8 : back ? 4 : 8;
      block(c, '#74335e', hx - 3, hy - 3, 7, 4);
      for (let i = 0; i < 3; i++) block(c, '#e765a4', hx - 3 + i * 2, hy - 5 - (i % 2), 2, 5);
    } else if (skin === 'priest') {
      block(c, '#202631', x + 1, y + 2, w - 2, 6);
      block(c, '#d9e0d8', side ? 22 : 14, y, side ? 2 : 4, 2);
      if (!back) for (let i = 0; i < 3; i++) block(c, '#a8a9a0', side ? 21 : 16, y + 3 + i * 2, 1, 1);
    } else if (skin === 'astronaut') {
      block(c, '#edf0d8', x + 1, y, w - 2, 7);
      block(c, '#6c929f', x + 3, y + 2, 6, 4); block(c, '#ee8c55', x + 4, y + 3, 2, 1);
      if (back || side) { block(c, '#426778', side ? 8 : 11, y - 1, 4, 7); block(c, '#a4c0c8', side ? 9 : 12, y, 2, 5); }
      const hx = side ? 25 : 16, hy = side ? 12 : back ? 9 : 11;
      c.strokeStyle = '#436878'; c.lineWidth = 2; c.beginPath(); c.arc(hx, hy, 8, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = '#effbf3'; c.lineWidth = 1; c.stroke(); block(c, '#f7ffff', hx - 5, hy - 4, 1, 3);
    } else {
      block(c, '#a8bfce', x + 1, y, w - 2, 6); block(c, '#e3edf0', x + 2, y + 1, w - 4, 1);
      block(c, '#557589', x + 3, y + 4, w - 6, 2);
      const hx = side ? 21 : 10, hy = side ? 7 : back ? 3 : 7;
      block(c, '#5a7188', hx, hy, side ? 9 : 12, 5); block(c, '#b9ced7', hx + 1, hy, side ? 7 : 10, 2);
      if (!back) { block(c, '#223446', hx + 1, hy + 3, side ? 8 : 10, 2); block(c, '#f47566', hx + 2, hy + 3, side ? 6 : 8, 1); }
    }
    c.restore();
  }
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
    const { definition, pose, frame, index, direction } = current, image = images.get(frame.src);
    if (!image) return false;
    const scale = definition.scale, blend = Math.max(0, Math.min(1, options.hideBlend ?? (options.hidden ? 1 : 0)));
    c.save(); c.translate(Math.round(x), Math.round(y)); c.scale(options.scale || 1, options.scale || 1);
    c.imageSmoothingEnabled = false;
    c.fillStyle = 'rgba(45,49,25,.23)'; c.beginPath();
    c.ellipse(0, 14, Math.min(28, pose.width * scale * .4), 4, 0, 0, Math.PI * 2); c.fill();
    if (name === 'chicken' && blend) { c.translate(0, 14); c.scale(1, 1 - blend * .23); c.translate(0, -14); }
    c.save(); if (pose.flip) c.scale(-1, 1);
    c.translate(-pose.cx * scale, 14 - pose.bottom * scale); c.scale(scale, scale);
    if (name === 'chick') c.filter = 'sepia(1) saturate(4) brightness(.92)';
    c.drawImage(image, frame.x, frame.y, frame.w, frame.h, 0, 0, frame.w, frame.h);
    if (name === 'chicken') clothes(c, options.skin, direction, index);
    c.restore(); expression(c, name, direction, pose, scale, options); c.restore();
    return true;
  }
  function markerOffset(name) {
    const d = SpriteData[name];
    return d ? Math.ceil(Math.max(...Object.values(d.poses).map(p => (p.bottom - p.top) * d.scale)) + 1) : 56;
  }
  return Object.freeze({ draw, species, sources, frameFor, load, install, markerOffset,
    get loading() { return loading; }, get ready() { return sources.every(src => images.has(src)); },
    get errors() { return errors.slice(); } });
})();
