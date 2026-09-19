/* A little comedy troupe for the title screen; never touches the saved simulation. */
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
    return { ...animal, lengths, length, line: 0, travel: animal.phase / (Math.PI * 2) * length * 2 };
  });
  const calls = { sheep: 'Mééé!', pig: 'Oinc!', duck: 'Quá-quá!', rabbit: 'Croc-croc!', chicken: 'Có-có-có!', dog: 'Au-au!', cat: 'Miau!', goose: 'Honk-honk!' };
  const jokes = {
    chicken: ['Se eu cair, chama de ovo mexido!', 'Meu voo está em manutenção.', 'Tô treinando pra fugir do almoço.'],
    duck: ['Quáse que eu consigo!', 'Sou pato. Pago mico nas horas vagas.', 'Minha aterrissagem pede um lago.'],
    rabbit: ['Minhas orelhas não vieram com freio!', 'Pulo alto. Planejamento, nem tanto.', 'Cenoura dá asa? É pra um amigo.'],
    pig: ['Isso não é tombo. É carinho no chão.', 'Vim pelo lanche. Fiquei pelo show.', 'Eu rolo, mas não enrolo!'],
    sheep: ['Se eu rolar, viro novelo!', 'Penteei a lã pra esse momento.', 'Eu conto ovelhas e me perco em mim.'],
    dog: ['Quem jogou? Eu busco até elogio!', 'Isso vale biscoito?', 'Tentei pegar o rabo. Ele fugiu.'],
    cat: ['Eu planejei esse tombo.', 'Caí de pé. A dignidade vem depois.', 'Miau… viu? Não viu? Ótimo.'],
    goose: ['Elegância de ganso. Freio de chinelo.', 'Buzina eu tenho. Carteira, não.', 'Meu pescoço chegou antes de mim.']
  };
  const replies = {
    tumble: ['Dez na coragem. Dois no pouso!', 'O chão também queria um abraço.', 'De novo! Pisquei na melhor parte.'],
    dance: ['É dança ou espanta-mosquito?', 'A porteira range mais afinada!', 'O milho pediu bis.'],
    jump: ['Já pode colher nuvem!', 'O céu não é esconderijo!', 'Meu joelho mandou lembranças.'],
    spin: ['A fazenda ainda tá girando!', 'Agora gira pro outro lado!', 'Vai bater manteiga assim?']
  };
  const order = ['chicken', 'duck', 'sheep', 'pig', 'dog', 'rabbit'];
  const tricks = ['tumble', 'dance', 'jump', 'spin'];
  let canvas, world, button, caption, screen, context;
  let time = 0, elapsed = 0, turn = 0, sequence = 0, routine = null, speaker = null, currentGame = null;
  let signature = '', active = false, reduced = false, idle = 0, nextShow = 5.5, equipped = '', pointer = null;
  let width = 0, height = 0, pixelRatio = 1, resizeDirty = true;

  // Feet stay on paths painted in farm-title.png; cover/crop matches the backdrop.
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
  function appearance(animal) { return animal.species === 'chicken' ? { skin: currentGame.entities.chicken.skin } : {}; }
  function identity(animal) {
    const selected = animal.species === 'chicken' ? CharacterArt.appearances[currentGame.entities.chicken.skin] || CharacterArt.appearances.classic : null;
    const original = selected?.species || animal.species;
    const species = ['hen-silkie', 'hen-blue'].includes(original) ? 'chicken' : original;
    return { species, name: selected?.name || RescueSystem.names[species] || 'Amigo da fazenda' };
  }
  function projected(animal, actualPose = false) {
    const point = position(animal), view = projection(width, height);
    const scale = view.scale * (.8 + (point.y - 640) / 600);
    const moving = !reduced && !participating(animal) && Math.sin(time*.28+animal.phase)>-.6;
    const art = CharacterArt.frameFor(animal.species, { ...appearance(animal), direction: actualPose ?
      (motion(animal).direction || (moving ? point.direction : 'down')) : 'down' });
    return { x: view.x + point.x * view.scale, y: view.y + point.y * view.scale, scale,
      w: art.pose.width * art.scale * scale, h: (art.pose.bottom - art.pose.top) * art.scale * scale };
  }
  function visibleAnimal(animal, partial = false) {
    if (!width || !height) return false;
    const bounds = canvas.getBoundingClientRect(), card = document.getElementById('menuCard').getBoundingClientRect(), p = projected(animal, partial);
    if (partial) {
      // A visible head or body still accepts a tap when the feet are cropped.
      const sx=bounds.width/width,sy=bounds.height/height,lift=(motion(animal).lift||0)*p.scale;
      const left=Math.max(0,bounds.left||0,(bounds.left||0)+(p.x-p.w/2)*sx);
      const right=Math.min(window.innerWidth||Infinity,(bounds.left||0)+bounds.width,(bounds.left||0)+(p.x+p.w/2)*sx);
      const top=Math.max(0,bounds.top||0,(bounds.top||0)+(p.y-p.h-lift)*sy);
      const bottom=Math.min(window.innerHeight||Infinity,(bounds.top||0)+bounds.height,(bounds.top||0)+(p.y-lift)*sy);
      return right>left&&bottom>top&&!(left>=card.left&&right<=card.left+card.width&&top>=card.top&&bottom<=card.top+card.height);
    }
    if (p.x - p.w / 2 < 4 || p.x + p.w / 2 > width - 4 || p.y > height - 4 || p.y - p.h < 4) return false;
    const x = (bounds.left || 0) + p.x * bounds.width / width, y = (bounds.top || 0) + p.y * bounds.height / height;
    const w = p.w * bounds.width / width, h = (p.h + 38 * p.scale) * bounds.height / height;
    if (y < h || y > (window.innerHeight || Infinity) - 4) return false;
    return !(x + w / 2 > card.left && x - w / 2 < card.left + card.width && y > card.top && y - h < card.top + card.height);
  }
  function chooseAnimal() {
    for (let offset = 0; offset < order.length; offset++) {
      const index = (turn + offset) % order.length, animal = herd.find(item => item.species === order[index]);
      if (!visibleAnimal(animal)) continue;
      turn = (index + 1) % order.length;
      return animal;
    }
    return null;
  }
  function clearReaction() {
    routine = null; speaker = null; idle = 0;
    if (caption) caption.hidden = true;
  }
  function say(animal, line) {
    const { name, species } = identity(animal);
    speaker = animal;
    caption.setAttribute('aria-live', routine.manual ? 'polite' : 'off');
    caption.textContent = `${name} · ${calls[species] || 'Opa!'}\n${line}`;
    caption.dataset.trick = routine.kind; caption.dataset.speaker = species;
    caption.hidden = false;
  }
  function startShow(animal, manual) {
    if (!animal) return;
    const p = position(animal);
    const partner = herd.filter(other => other !== animal && visibleAnimal(other))
      .sort((a,b) => Math.hypot(position(a).x-p.x,position(a).y-p.y)-Math.hypot(position(b).x-p.x,position(b).y-p.y))[0] || null;
    const kind = tricks[sequence++ % tricks.length], lines = jokes[identity(animal).species] || jokes.chicken;
    routine = { lead: animal, partner, kind, manual, age: 0, replied: false, duration: partner ? 6.4 : 4.1, reply: replies[kind][Math.floor((sequence-1)/4)%3] };
    idle = 0; nextShow = 7 + sequence % 4;
    say(animal, lines[animal.line++ % lines.length]); signature = ''; placeCaption();
    // Ambient pantomime stays silent; only a deliberate interaction plays a call.
    if (manual) { AudioSystem.playMenuAnimal(currentGame, identity(animal).species); AudioControls.update(currentGame); }
  }
  function canInteract() {
    return active && currentGame?.phase === 'menu' && !document.hidden && CharacterArt.ready && !document.getElementById('howToPlayDialog').open;
  }
  function hitAnimal(event) {
    if (!canInteract() || event.target?.closest?.('button,a,input,select,label,#menuCard,dialog')) return null;
    const bounds = canvas.getBoundingClientRect();
    const x = (event.clientX - (bounds.left || 0)) * width / bounds.width;
    const y = (event.clientY - (bounds.top || 0)) * height / bounds.height;
    return herd.filter(animal=>visibleAnimal(animal,true)).sort((a,b)=>position(b).y-position(a).y).find(animal => {
      const p = projected(animal,true), lift = motion(animal).lift || 0;
      return Math.abs(x-p.x) < Math.max(22,p.w/2+8) && y > p.y-p.h-lift*p.scale-10 && y < p.y+10;
    }) || null;
  }
  function initialize() {
    if (canvas) return;
    canvas = document.getElementById('menuScene'); world = document.getElementById('menuWorld');
    button = document.getElementById('menuScatter'); caption = document.getElementById('menuBanter');
    screen = document.getElementById('menuScreen'); context = canvas.getContext('2d');
    button.addEventListener('click', () => { if (canInteract()) startShow(chooseAnimal(), true); });
    screen.addEventListener('pointerdown', event => {
      pointer = event.button && event.button !== 0 ? null : { x: event.clientX, y: event.clientY, animal: hitAnimal(event) };
    });
    screen.addEventListener('pointerup', event => {
      if (pointer?.animal && Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y)<10 && hitAnimal(event)===pointer.animal)
        startShow(pointer.animal, true);
      pointer = null;
    });
    screen.addEventListener('pointercancel', () => { pointer = null; });
    screen.addEventListener('pointermove', event => {
      if (!active || reduced || event.pointerType === 'touch') return;
      const bounds = screen.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const x = Math.max(-.5, Math.min(.5, (event.clientX - bounds.left) / bounds.width - .5));
      const y = Math.max(-.5, Math.min(.5, (event.clientY - bounds.top) / bounds.height - .5));
      world.style.transform = `translate(${x * -10}px, ${y * -8}px) scale(1.025)`;
    });
    screen.addEventListener('pointerleave', () => { pointer = null; resetParallax(); });
    window.addEventListener('resize', () => { resizeDirty = true; });
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => { resizeDirty = true; }).observe(world);
  }
  function participating(animal) { return routine && (routine.lead === animal || routine.partner === animal); }
  function motion(animal) {
    if (!participating(animal)) return {};
    const partner = routine.lead === animal ? routine.partner : routine.lead;
    const direction = partner ? (position(partner).x > position(animal).x ? 'right' : 'left') : 'down';
    if (reduced) return { direction: 'down' };
    const lead = routine.lead === animal, age = routine.age - (lead ? .12 : 2.95), duration = lead ? 1.55 : 1.1;
    if (age <= 0 || age >= duration) return { direction };
    const p = age/duration, wave = Math.sin(Math.PI*p), kind = lead ? routine.kind : routine.kind === 'jump' ? 'jump' : 'cheer';
    if (kind === 'tumble') return { direction, progress: p, lift: wave*48, rotation: p*Math.PI*2*(direction==='left'?-1:1), squash: 1-.09*Math.sin(p*Math.PI*2) };
    if (kind === 'jump') return { direction, progress: p, lift: Math.abs(Math.sin(p*Math.PI*3))*36, squash: 1-.09*Math.sin(p*Math.PI*6) };
    if (kind === 'spin') return { direction: ['down','left','up','right'][Math.floor(p*12)%4], progress: p, lift: wave*18, moving: true, anim: p*12 };
    return { direction: kind==='dance'?'down':direction, progress: p, lift: Math.abs(Math.sin(p*Math.PI*4))*12, rotation: Math.sin(p*Math.PI*6)*.18, squash: 1-.07*Math.sin(p*Math.PI*4) };
  }
  function placeCaption() {
    if (!speaker || caption.hidden) return;
    const p = projected(speaker), bounds = canvas.getBoundingClientRect(), area = screen.getBoundingClientRect();
    const sx = bounds.width/width, sy = bounds.height/height, rootWidth = area.width || width;
    const half = Math.min(rootWidth/2-8,(caption.offsetWidth || 236)/2), h = caption.offsetHeight || 76;
    const px = (bounds.left || 0)-(area.left || 0)+p.x*sx;
    const py = (bounds.top || 0)-(area.top || 0)+p.y*sy;
    const x = Math.max(half+8,Math.min(rootWidth-half-8,px));
    const minY = Math.max(h+10,h-(area.top || 0)+10);
    const maxY = Math.min(area.height || height,(window.innerHeight || Infinity)-(area.top || 0))-10;
    // Keep text still while the animal flips. Try the other side of the animal
    // when a title, control or card occupies the preferred speaking space.
    const candidates = [
      {x,y:py-(p.h+(reduced?0:48)*p.scale)*sy-12,placement:'above'},
      {x,y:py+h+18,placement:'below'}
    ];
    const blockers = ['menuCard','farmTitle','menuTagline','menuSubtitle','menuMischief'].map(id => {
      const r = document.getElementById(id).getBoundingClientRect();
      return {left:r.left-(area.left || 0),top:r.top-(area.top || 0),width:r.width,height:r.height};
    });
    const overlaps = (point,r) => point.x+half>r.left-8 && point.x-half<r.left+r.width+8 && point.y>r.top-8 && point.y-h<r.top+r.height+8;
    const card = blockers[0];
    if (card.left>half*2+24) candidates.push({x:Math.min(x,card.left-half-12),y:candidates[0].y,placement:'above'});
    for (const r of blockers) {
      candidates.push({x,y:r.top-12,placement:'above'}, {x,y:r.top+r.height+h+12,placement:'below'});
    }
    const chosen = candidates.find(point=>point.y>=minY&&point.y<=maxY&&!blockers.some(r=>overlaps(point,r))) || candidates[0];
    caption.style.left = `${chosen.x}px`; caption.style.top = `${Math.max(minY,Math.min(maxY,chosen.y))}px`;
    caption.dataset.placement = chosen.placement;
  }
  function sparkles(x, y, scale, progress) {
    if (!progress || progress < .35) return;
    const spread = (progress-.35)/.65;
    context.globalAlpha = (1-spread)*.85;
    for (let i=0;i<5;i++) {
      const angle = -Math.PI+(i/4)*Math.PI, radius = (14+spread*28)*scale;
      const px = Math.round(x+Math.cos(angle)*radius), py = Math.round(y-16*scale+Math.sin(angle)*radius), size = Math.max(2,Math.round(3*scale));
      context.fillStyle = i%2 ? '#fff8dc' : '#ffd36b';
      context.fillRect(px-size,py,size*3,size); context.fillRect(px,py-size,size,size*3);
    }
    context.globalAlpha = 1;
  }
  function frame(game, dt, reduceMotion) {
    initialize(); currentGame = game;
    if (reduced !== reduceMotion) { reduced = reduceMotion; signature = ''; clearReaction(); resetParallax(); }
    const visible = game.phase === 'menu' && !document.hidden && !document.getElementById('howToPlayDialog').open;
    if (active !== visible || equipped !== game.entities.chicken.skin) {
      active = visible; equipped = game.entities.chicken.skin; signature = ''; resizeDirty = true;
      clearReaction(); resetParallax(); pointer = null;
      if (!active) AudioSystem.stopMenuAnimal();
    }
    if (!active || !context || !CharacterArt.ready) return;
    if (resizeDirty) {
      const bounds = canvas.getBoundingClientRect();
      width = Math.round(canvas.clientWidth || bounds.width); height = Math.round(canvas.clientHeight || bounds.height);
      if (width <= 0 || height <= 0) return;
      pixelRatio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width*pixelRatio); canvas.height = Math.round(height*pixelRatio);
      resizeDirty = false; signature = '';
    }
    dt = Math.max(0,Math.min(.1,dt));
    if (!reduced) time += dt;
    if (routine) {
      routine.age += dt;
      if (!visibleAnimal(routine.lead,routine.manual)) clearReaction();
      else if (routine.partner && !routine.replied && routine.age>=2.9) {
        routine.replied = true;
        if (visibleAnimal(routine.partner)) say(routine.partner,routine.reply);
      }
      if (routine && routine.age>=routine.duration) clearReaction();
    } else if (!reduced) {
      idle += dt;
      if (idle>=nextShow) { idle = 0; startShow(chooseAnimal(),false); }
    }
    elapsed += dt;
    const next = `${game.entities.chicken.skin}:${reduced}`;
    if (signature === next && (reduced || elapsed<1/24)) { placeCaption(); return; }
    const step = Math.min(.15,elapsed); elapsed = 0; signature = next;
    context.setTransform(pixelRatio,0,0,pixelRatio,0,0); context.clearRect(0,0,width,height); context.imageSmoothingEnabled = false;
    const view = projection(width,height);
    const walkers = herd.map(animal => {
      const moving = !reduced && !participating(animal) && Math.sin(time*.28+animal.phase)>-.6;
      if (moving) animal.travel += step*animal.pace;
      return { animal, moving, ...position(animal) };
    }).sort((a,b)=>a.y-b.y);
    for (const {animal,moving,x,y,direction} of walkers) {
      const scale = view.scale*(.8+(y-640)/600), action = motion(animal);
      const px = view.x+x*view.scale, py = view.y+y*view.scale;
      CharacterArt.draw(context,animal.species,px,py-14*scale,{
        scale, direction: moving?direction:'down', moving, anim: animal.travel/7, ...appearance(animal), ...action
      });
      if (!reduced) sparkles(px,py,scale,action.progress);
    }
    placeCaption();
  }
  return { initialize, frame };
})();
