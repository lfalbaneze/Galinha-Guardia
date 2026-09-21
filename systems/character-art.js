/* Cartoon sprites shared by the game, wardrobe and finale. Sources: assets/sprites/CREDITS.html. */
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
  const floatSprite = {src:'assets/sprites/sources/lifebuoy.png',crop:[304,196,928,632]};
  const sources = Object.freeze([...new Set(species.flatMap(s => Object.values(SpriteData[s].actions || {walk:SpriteData[s].poses}).flatMap(poses=>Object.values(poses))
    .flatMap(p => p.frames.map(f => f.src))).concat(floatSprite.src))]);
  const images = new Map();
  // World pixels per complete gait cycle. Large animals take longer strides;
  // the phase follows actual ground travel rather than a fixed animation timer.
  const strides = Object.freeze({chicken:42,'hen-silkie':42,'hen-blue':42,
    duck:30,chick:18,turkey:40,goose:42,sheep:38,lamb:28,pig:34,goat:40,
    cow:60,horse:76,donkey:58,dog:38,cat:30,rabbit:30,wolf:60,fox:46,thor:54});
  const directions = Object.freeze(['right','downright','down','downleft','left','upleft','up','upright']);
  const headings = new WeakMap();
  function directionFor(previous, x, y) {
    if(!Number.isFinite(x)||!Number.isFinite(y)||Math.hypot(x,y)<.01)return previous||'down';
    const angle=Math.atan2(y,x),old=directions.indexOf(previous);
    if(old>=0&&Math.abs(Math.atan2(Math.sin(angle-old*Math.PI/4),Math.cos(angle-old*Math.PI/4)))<Math.PI/8+.06)return previous;
    return directions[(Math.round(angle/(Math.PI/4))+8)%8];
  }
  function heading(entity) {
    const prior=headings.get(entity);
    const base=prior&&prior.cardinal===entity.direction?prior.visual:entity.direction;
    const visual=directionFor(base,entity.vx||0,entity.vy||0);
    headings.set(entity,{cardinal:entity.direction,visual});return visual;
  }
  function advance(anim, name, traveled, options = {}) {
    const identity = name === 'chicken' ? (appearances[options.skin]?.species || name) :
      Object.values(appearances).find(a=>a.sprite===name)?.species || name;
    // Faster travel lengthens the stride before speeding the feet. The old fixed
    // stride drove the hen through seven complete cycles each second at full speed.
    const speed=Number.isFinite(options.speed)?Math.max(0,options.speed):0;
    const extension=1+Math.max(0,speed-85)/150;
    return anim + Math.max(0, Number.isFinite(traveled) ? traveled : 0) * 4 / ((strides[identity] || 40)*extension);
  }
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
    const mood = ({furious:'angry',crying:'sad',hurt:'sad',afraid:'scared'})[options.mood] || options.mood;
    const action = options.action && definition.actions?.[options.action] ? options.action :
      mood && definition.actions?.[mood] && (!options.moving || definition.actions[mood][direction].frames.length>1) ? mood :
      options.moving ? (options.sprinting && definition.actions?.run ? 'run' : 'walk') : 'idle';
    const pose = definition.actions?.[action]?.[direction] || definition.poses[direction];
    const phase = Math.abs(options.anim || 0) / (definition.cycle || pose.frames.length);
    const index = options.moving ? Math.floor(phase * pose.frames.length) % pose.frames.length : (pose.idleIndex || 0);
    const size = appearance && spriteName !== 'chicken' ? Math.min(1,
      64 / Math.max(...Object.values(definition.poses).map(p => p.width * definition.scale)),
      58 / Math.max(...Object.values(definition.poses).map(p => (p.bottom - p.top) * definition.scale))) : 1;
    return { definition, pose, frame: pose.frames[index], index, direction, action, spriteName, scale: definition.scale * size };
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
    const { pose, frame, direction, spriteName, scale, definition } = current, image = images.get(frame.src),smooth=definition.smooth===true,pixelArt=definition.pixelArt===true;
    const flipped = !!pose.flip !== !!frame.flip;
    if (!image) return false;
    const blend = Math.max(0, Math.min(1, options.hideBlend ?? (options.hidden ? 1 : 0)));
    c.save(); c.translate(options.subpixel||smooth||pixelArt ? x : Math.round(x), options.subpixel||smooth||pixelArt ? y : Math.round(y)); c.scale(options.scale || 1, options.scale || 1);
    c.imageSmoothingEnabled = smooth;if(smooth)c.imageSmoothingQuality='high';
    const rabbit = spriteName === 'rabbit' || spriteName === 'skin-pipoca';
    const hop = rabbit && options.moving && (!pixelArt||definition.hop) ? Math.max(0,Math.sin(((options.anim||0)%4-1.5)*Math.PI/2))*(definition.hop||4) : 0;
    const lift = Math.max(0, Math.min(64, (options.lift || 0) + hop));
    const width=Math.round(frame.w*scale),height=Math.round(frame.h*scale);
    const tile=smooth||pixelArt||typeof SpriteStyle==='undefined'?null:SpriteStyle.tile(image,[frame.x,frame.y,frame.w,frame.h],width,height);
    const rect=tile?undefined:[frame.x,frame.y,frame.w,frame.h];
    // A clip-wide bottom includes the empty space below raised paws. Align the
    // actual opaque foot row instead; deliberate jumps still use lift above.
    // Flying birds and open-wing alerts retain their authored perch reference.
    const terrestrial=!['owl','crow'].includes(spriteName)&&!['fly','alert'].includes(current.action);
    const support=terrestrial&&options.grounded!==false&&typeof Sunlight!=='undefined'?
      Sunlight.footprint?.(tile||image,width,height,rect,frame.grounding):null;
    const left=Math.round(-(frame.cx ?? pose.cx)*scale);
    const top=14-Math.round(support?.bottom??((frame.bottom ?? pose.bottom)*scale));
    if(options.shadow!==false&&typeof Sunlight!=='undefined') {
      c.save();if(flipped)c.scale(-1,1);
      Sunlight.cast(c,tile||image,left,top-lift,width,height,14,rect,support);c.restore();
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
    c.save(); if (flipped) c.scale(-1, 1);
    if(tile)c.drawImage(tile,left,top);
    else c.drawImage(image,frame.x,frame.y,frame.w,frame.h,left,top,width,height);
    c.restore(); if(!definition.actions?.[current.action]||!['happy','scared','angry','sad'].includes(current.action))expression(c, spriteName, direction, pose, scale, options); c.restore(); c.restore();
    return true;
  }
  function markerOffset(name) {
    const d = SpriteData[name];
    return d ? Math.ceil(Math.max(...Object.values(d.poses).map(p => (p.bottom - p.top) * d.scale)) + 1) : 56;
  }
  function drawFloat(c, x, y, width, front) {
    const image=images.get(floatSprite.src);if(!image)return false;
    const w=Math.round(width),h=Math.round(w*.52),left=Math.round(x-w/2),top=Math.round(y-h/2);
    const tile=typeof SpriteStyle==='undefined'?null:SpriteStyle.tile(image,floatSprite.crop,w,h);
    c.save();c.imageSmoothingEnabled=false;
    // Paint the rear tube behind the animal, then the near rim across its waist.
    if(front){c.beginPath();c.rect(left,Math.round(y),w,h);c.clip();}
    if(tile)c.drawImage(tile,left,top);
    else c.drawImage(image,...floatSprite.crop,left,top,w,h);
    c.restore();return true;
  }
  return Object.freeze({ draw, drawFloat, species, sources, appearances, frameFor, advance, directionFor, heading, directions, load, install, markerOffset,
    get loading() { return loading; }, get ready() { return sources.every(src => images.has(src)); },
    get errors() { return errors.slice(); } });
})();
