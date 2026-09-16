/* This little herd belongs to the title screen, never to the saved simulation. */
const MenuScene = (() => {
  const herd = [
    { species: 'sheep', x: .16, y: .46, pace: .38, phase: .3 },
    { species: 'pig', x: .68, y: .5, pace: .29, phase: 2.1 },
    { species: 'duck', x: .4, y: .64, pace: .5, phase: 4.7 },
    { species: 'rabbit', x: .83, y: .76, pace: .64, phase: 1.2 },
    { species: 'chicken', x: .27, y: .86, pace: .44, phase: 3.3 },
    { species: 'dog', x: .6, y: .91, pace: .32, phase: 5.6 }
  ].map(animal => ({ ...animal, travel: animal.phase }));
  const banter = ['Ô, sossega esse terreiro!', 'O pato jura que não foi ele.', 'Até a ovelha perdeu a pose.', 'Pronto. Agora ninguém fica quieto.'];
  let canvas, backdrop, button, caption, screen, context;
  let time = 0, elapsed = 0, commotion = 0, joke = 0, signature = '', active = false, reduced = false;
  let width = 0, height = 0, pixelRatio = 1, resizeDirty = true;

  function resetParallax() { if (backdrop) backdrop.style.transform = 'scale(1.025)'; }
  function initialize() {
    if (canvas) return;
    canvas = document.getElementById('menuScene');
    backdrop = document.getElementById('menuBackdrop');
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
      backdrop.style.transform = `translate(${x * -10}px, ${y * -8}px) scale(1.025)`;
    });
    screen.addEventListener('pointerleave', resetParallax);
    window.addEventListener('resize', () => { resizeDirty = true; });
  }

  function frame(game, dt, reduceMotion) {
    initialize();
    if (reduced !== reduceMotion) { reduced = reduceMotion; signature = ''; commotion = 0; resetParallax(); }
    const visible = game.phase === 'menu' && !document.hidden;
    if (active !== visible) { active = visible; signature = ''; resizeDirty = true; resetParallax(); }
    if (!active || !context || !CharacterArt.ready) return;
    if (resizeDirty) {
      const bounds = canvas.getBoundingClientRect();
      width = Math.round(bounds.width); height = Math.round(bounds.height);
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
    const scale = Math.min(1.38, Math.max(.75, width / 440));
    for (const animal of herd) {
      const moving = !reduced && (commotion > 0 || Math.sin(time * .28 + animal.phase) > -.6);
      if (moving) animal.travel += elapsedStep * animal.pace;
      const phase = animal.travel;
      const route = Math.sin(phase) * .075;
      const y = height * animal.y + (moving ? Math.sin(phase * 2) * 3 : 0);
      const x = width * (animal.x + route);
      const direction = moving ? (Math.cos(phase) > 0 ? 'right' : 'left') : 'down';
      CharacterArt.draw(context, animal.species, x, y, {
        scale, direction, moving, anim: animal.travel * 9,
        ...(animal.species === 'chicken' ? { skin: game.entities.chicken.skin } : {})
      });
    }
  }
  return { initialize, frame };
})();
