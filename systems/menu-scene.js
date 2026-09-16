/* This little herd belongs to the title screen, never to the saved simulation. */
const MenuScene = (() => {
  const herd = [
    { species: 'sheep', route: [[715,754],[758,724],[770,695],[748,670]], pace: 19, phase: .3 },
    { species: 'pig', route: [[800,767],[850,795],[905,817],[963,827]], pace: 16, phase: 2.1 },
    { species: 'duck', route: [[630,790],[659,781],[681,768]], pace: 25, phase: 4.7 },
    { species: 'rabbit', route: [[760,851],[820,844],[880,852]], pace: 30, phase: 1.2 },
    { species: 'chicken', route: [[480,851],[535,829],[590,821]], pace: 23, phase: 3.3 },
    { species: 'dog', route: [[600,891],[666,886],[723,892]], pace: 20, phase: 5.6 }
  ].map(animal => {
    const lengths = animal.route.slice(1).map((point, i) => Math.hypot(point[0] - animal.route[i][0], point[1] - animal.route[i][1]));
    const length = lengths.reduce((sum, value) => sum + value, 0);
    return { ...animal, lengths, length, travel: animal.phase / (Math.PI * 2) * length * 2 };
  });
  const banter = ['Ô, sossega esse terreiro!', 'O pato jura que não foi ele.', 'Até a ovelha perdeu a pose.', 'Pronto. Agora ninguém fica quieto.'];
  let canvas, world, button, caption, screen, context;
  let time = 0, elapsed = 0, commotion = 0, joke = 0, signature = '', active = false, reduced = false;
  let width = 0, height = 0, pixelRatio = 1, resizeDirty = true;

  // Coordinates describe feet on the dirt in farm-title.png (1536 × 1024).
  // Cover/crop projection is identical to the backdrop's object-fit/object-position.
  function projection(w, h) {
    const scale = Math.max(w / 1536, h / 1024);
    return { scale, x: (w - 1536 * scale) * .42, y: (h - 1024 * scale) * .5 };
  }
  function position(animal) {
    const cycle = animal.travel % (animal.length * 2), forward = cycle < animal.length;
    let remaining = forward ? cycle : animal.length * 2 - cycle, segment = 0;
    while (segment < animal.lengths.length - 1 && remaining > animal.lengths[segment]) remaining -= animal.lengths[segment++];
    const a = animal.route[segment], b = animal.route[segment + 1], amount = remaining / animal.lengths[segment];
    const sign = forward ? 1 : -1, dx = (b[0] - a[0]) * sign, dy = (b[1] - a[1]) * sign;
    return { x: a[0] + (b[0] - a[0]) * amount, y: a[1] + (b[1] - a[1]) * amount,
      direction: Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? 'down' : 'up') : (dx > 0 ? 'right' : 'left') };
  }
  function resetParallax() { if (world) world.style.transform = 'scale(1.025)'; }
  function initialize() {
    if (canvas) return;
    canvas = document.getElementById('menuScene');
    world = document.getElementById('menuWorld');
    button = document.getElementById('menuScatter');
    caption = document.getElementById('menuBanter');
    screen = document.getElementById('menuScreen');
    context = canvas.getContext('2d');
    button.addEventListener('click', () => {
      if (!active) return;
      commotion = reduced ? 0 : 2.8;
      caption.textContent = banter[joke++ % banter.length];
      signature = '';
    });
    screen.addEventListener('pointermove', event => {
      if (!active || reduced || event.pointerType === 'touch') return;
      const bounds = screen.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const x = Math.max(-.5, Math.min(.5, (event.clientX - bounds.left) / bounds.width - .5));
      const y = Math.max(-.5, Math.min(.5, (event.clientY - bounds.top) / bounds.height - .5));
      world.style.transform = `translate(${x * -10}px, ${y * -8}px) scale(1.025)`;
    });
    screen.addEventListener('pointerleave', resetParallax);
    window.addEventListener('resize', () => { resizeDirty = true; });
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => { resizeDirty = true; }).observe(world);
  }

  function frame(game, dt, reduceMotion) {
    initialize();
    if (reduced !== reduceMotion) { reduced = reduceMotion; signature = ''; commotion = 0; resetParallax(); }
    const visible = game.phase === 'menu' && !document.hidden;
    if (active !== visible) { active = visible; signature = ''; resizeDirty = true; resetParallax(); }
    if (!active || !context || !CharacterArt.ready) return;
    if (resizeDirty) {
      const bounds = canvas.getBoundingClientRect();
      // client dimensions exclude the shared parallax transform.
      width = Math.round(canvas.clientWidth || bounds.width); height = Math.round(canvas.clientHeight || bounds.height);
      if (width <= 0 || height <= 0) return;
      pixelRatio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * pixelRatio); canvas.height = Math.round(height * pixelRatio);
      resizeDirty = false; signature = '';
    }
    dt = Math.max(0, Math.min(.1, dt));
    if (!reduced) { time += dt; commotion = Math.max(0, commotion - dt); }
    elapsed += dt;
    const next = `${game.entities.chicken.skin}:${reduced}`;
    if (signature === next && (reduced || elapsed < 1 / 24)) return;
    const elapsedStep = Math.min(.15, elapsed) * (commotion > 0 ? 2.4 : 1);
    elapsed = 0; signature = next;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.imageSmoothingEnabled = false;
    const view = projection(width, height);
    const walkers = herd.map(animal => {
      const moving = !reduced && (commotion > 0 || Math.sin(time * .28 + animal.phase) > -.6);
      if (moving) animal.travel += elapsedStep * animal.pace;
      return { animal, moving, ...position(animal) };
    }).sort((a, b) => a.y - b.y);
    for (const { animal, moving, x, y, direction } of walkers) {
      const scale = view.scale * (.8 + (y - 640) / 600);
      CharacterArt.draw(context, animal.species, view.x + x * view.scale, view.y + y * view.scale - 14 * scale, {
        scale, direction: moving ? direction : 'down', moving, anim: animal.travel / 7,
        ...(animal.species === 'chicken' ? { skin: game.entities.chicken.skin } : {})
      });
    }
  }
  return { initialize, frame };
})();
