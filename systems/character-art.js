/* Pixel sprites shared by the game, wardrobe and finale. Sources: assets/sprites/CREDITS.html. */
const CharacterArt = (() => {
  // Stable IDs preserve previously earned unlocks; each appearance is a complete sprite.
  const appearances = Object.freeze({
    classic: Object.freeze({ name: 'Erina', species: 'chicken' }),
    silkie: Object.freeze({ name: 'Midori', species: 'hen-silkie' }),
    blue: Object.freeze({ name: 'Alzira', species: 'hen-blue' }),
    punk: Object.freeze({ name: 'Zeca', species: 'duck', sprite: 'skin-zeca', description: 'Zeca, o pato de chapéu de palha.' }),
    astronaut: Object.freeze({ name: 'Pipoca', species: 'rabbit', sprite: 'skin-pipoca', description: 'Pipoca, o coelho de lenço verde e orelha dobrada.' }),
    robocop: Object.freeze({ name: 'Stella', species: 'cat', sprite: 'skin-amora', description: 'Stella, a gata de laço lilás e patinhas de meia.' }),
    priest: Object.freeze({ name: 'Paçoca', species: 'dog', sprite: 'skin-pacoca', description: 'Paçoca, o vira-lata caramelo de lenço vermelho.' }),
    goose: Object.freeze({ name: 'Gumercindo', species: 'goose', sprite: 'skin-gumercindo', description: 'Gumercindo, o ganso cinzento de lenço xadrez.' })
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
    // Identity controls voices and swimming; the playable art has its own sheet.
    const spriteName = appearance?.sprite || appearance?.species || name;
    const definition = SpriteData[spriteName];
    if (!definition) return null;
    const requested = options.direction || (options.facing < 0 ? 'left' : 'right');
    const direction = definition.poses[requested] ? requested : 'down';
    const pose = definition.poses[direction];
    // The simulation clock already advances faster during movement and sprinting.
    const index = options.moving ? Math.floor(Math.abs(options.anim || 0)) % pose.frames.length : 0;
    const size = appearance && spriteName !== 'chicken' ? Math.min(1,
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
    const lift = Math.max(0, Math.min(64, options.lift || 0));
    const width=Math.round(frame.w*scale),height=Math.round(frame.h*scale);
    const tile=typeof SpriteStyle==='undefined'?null:SpriteStyle.tile(image,[frame.x,frame.y,frame.w,frame.h],width,height);
    const left=Math.round(-(frame.cx ?? pose.cx)*scale),top=14-Math.round((frame.bottom ?? pose.bottom)*scale);
    if(options.shadow!==false&&typeof Sunlight!=='undefined') {
      c.save();if(pose.flip)c.scale(-1,1);
      Sunlight.cast(c,tile||image,left,top-lift,width,height,14,tile?undefined:[frame.x,frame.y,frame.w,frame.h]);c.restore();
    }
    if (options.shadow !== false) {
      c.fillStyle = 'rgba(45,49,25,.23)'; c.beginPath();
      const span=pose.width*scale;
      c.ellipse(0, 14, Math.min(42, span * .4) * (1 - lift * .004), Math.max(3,Math.min(6,span*.065)), 0, 0, Math.PI * 2); c.fill();
    }
    if (lift) c.translate(0, -lift);
    c.save();
    // Menu tricks rotate the animal around its body, leaving its shadow grounded.
    if (options.rotation || options.squash) {
      const pivot = 14 - (frame.h * scale) * .48;
      const squash = Math.max(.75, Math.min(1.25, options.squash || 1));
      c.translate(0, pivot); c.rotate(options.rotation || 0); c.scale(1 / squash, squash); c.translate(0, -pivot);
    }
    if (name === 'chicken' && blend) { c.translate(0, 14); c.scale(1, 1 - blend * .23); c.translate(0, -14); }
    c.save(); if (pose.flip) c.scale(-1, 1);
    if(tile)c.drawImage(tile,left,top);
    else c.drawImage(image,frame.x,frame.y,frame.w,frame.h,left,top,width,height);
    c.restore(); expression(c, spriteName, direction, pose, scale, options); c.restore(); c.restore();
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
