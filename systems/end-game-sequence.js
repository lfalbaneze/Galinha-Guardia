/* A self-contained cartoon epilogue; gameplay collision and hunting are suspended. */
const EndGameSequence = (() => {
  const center = { x: 450, y: 275 };
  const timing = Object.freeze({ circle: 3.7, rush: 6.2, cloud: 7, dizzy: 10.8, flee: 13.6, celebrate: 16, done: 19 });
  const adults = game => [...game.entities.animals, ...(game.entities.goose?.rescued ? [game.entities.goose] : [])];
  const cast = game => [...adults(game), ...(game.entities.chicks || []).filter(c => c.rescued)];
  const reduced = () => typeof InterfaceMotion !== 'undefined' && InterfaceMotion.reduced;
  const ease = value => { const p = clamp(value, 0, 1); return p * p * (3 - 2 * p); };
  function start(game) {
    game.phase = "win_cutscene";
    game.cutscene = { time: 0, done: false, stage: "arrival", cloud: false, impacts: [], attackers: [], speech: "" };
    const chicken = game.entities.chicken, wolf = game.entities.wolf;
    input.clear();
    Object.assign(chicken, { x: 450, y: 510, vx: 0, vy: 0, hidden: false, hideBlend: 0, invulnerable: 0,
      moving: false, sprinting: false, direction: "up", mood: "normal" });
    Object.assign(wolf, { ...center, vx: 0, vy: 0, injured: false, mode: "stopped", facing: -1,
      direction: "down", mood: "furious", moving: false });
    game.entities.effects = [];
    const friends = cast(game);
    for (const [i, animal] of friends.entries()) {
      const row = i < 12 ? 0 : 1, column = row ? i - 12 : i;
      animal.x = row ? 285 + column * 66 : 90 + column * 65; animal.y = row ? 426 : 384 + (i % 2) * 26;
      animal.moving = false; animal.direction = "up"; animal.mood = "normal";
      game.cutscene.attackers.push({ ref: animal, angle: Math.PI * 2 * i / friends.length });
    }
    camera.x = 0; camera.y = 0; camera.shake = 0; camera.shakeX = 0; camera.shakeY = 0;
    setStatus("Família reunida! O lobo pediu almoço e ganhou uma reunião…", "win");
    refreshHud();
    // Remove gameplay chrome in the same transition, before the first ending frame.
    GameUI.update(game);GameUI.focusCanvas();
  }
  function move(entity, x, y, dt, speed = 4) {
    const dx = x - entity.x, dy = y - entity.y;
    const before={x:entity.x,y:entity.y};
    entity.moving = Math.hypot(dx, dy) > 1;
    if (entity.moving) Player.face(entity, dx, dy);
    entity.x = lerp(entity.x, x, Math.min(1, dt * speed));
    entity.y = lerp(entity.y, y, Math.min(1, dt * speed));
    const travel=Math.hypot(entity.x-before.x,entity.y-before.y);
    entity.anim=CharacterArt.advance(entity.anim,entity.species||(entity.skin?'chicken':entity.type),travel,{skin:entity.skin,speed:dt>0?travel/dt:0});
  }
  function openExitLane(game, dt) {
    // The grown-ups open a horseshoe below the wolf; chicks cheer above it.
    // This keeps the wolf's face and tear trail clear all the way to the right edge.
    const friends=adults(game);
    for (const [index, animal] of friends.entries()) {
      const angle = (32 + index * 176 / Math.max(1, friends.length - 1)) * Math.PI / 180;
      move(animal, center.x + Math.cos(angle) * 240, center.y + Math.sin(angle) * 130, dt);
      animal.direction = "down";
    }
    const chicks = (game.entities.chicks || []).filter(c => c.rescued);
    for (const [index, chick] of chicks.entries()) {
      move(chick, 280 + index * 340 / Math.max(1, chicks.length - 1), 142, dt);
      chick.direction = "down";
    }
  }
  function update(game, dt) {
    const cut = game.cutscene;
    cut.time += dt;
    const t = cut.time, chicken = game.entities.chicken, wolf = game.entities.wolf;
    chicken.moving = false;
    wolf.moving = false;
    for (const animal of cast(game)) animal.moving = false;
    cut.cloud = t >= timing.cloud && t < timing.dizzy;
    if (t < 1.3) {
      cut.stage = "arrival";
      move(chicken, 450, 455, dt);
    } else if (t < timing.circle) {
      cut.stage = "message";
      chicken.direction = "down";
    } else if (t < timing.rush) {
      cut.stage = "circle";
      for (const a of cut.attackers) {
        const angle = a.angle + (t - timing.circle) * 0.12;
        const radius = a.ref.type === 'chick' ? 285 : 230;
        move(a.ref, center.x + Math.cos(angle) * radius, center.y + Math.sin(angle) * 118, dt, 3.8);
        // A three-quarter turn keeps the angry eyebrows visible before the charge.
        a.ref.direction = a.ref.x < center.x ? "right" : "left";
      }
    } else if (t < timing.cloud) {
      cut.stage = "rush";
      for (const a of cut.attackers) {
        // The cloud appears before anyone reaches the wolf: no contact is shown.
        move(a.ref, center.x + Math.cos(a.angle) * 92, center.y + Math.sin(a.angle) * 84, dt, 4);
      }
    } else if (t < timing.dizzy) {
      cut.stage = "cloud";
      for (const a of cut.attackers) move(a.ref, center.x + Math.cos(a.angle) * 20, center.y, dt, 7);
      const finale = ease((t - timing.dizzy + .8) / .8);
      move(chicken, 450, 455 - finale * 112, dt, 10);
      chicken.direction = 'up';
    } else if (t < timing.flee) {
      cut.stage = "dizzy";
      wolf.x = center.x + (reduced() ? 0 : Math.sin(t * 22) * 2); wolf.y = center.y; wolf.direction = "down";
      move(chicken, 450, 440, dt, 5); chicken.direction = 'down';
      openExitLane(game, dt);
    } else if (t < timing.celebrate) {
      cut.stage = "flee";
      openExitLane(game, dt);
      const flight = t - timing.flee;
      wolf.x = center.x + flight * 370; wolf.y = center.y + (reduced() ? 0 : Math.sin(flight * 18) * 3) - flight * 27;
      wolf.facing = 1; wolf.direction = "right"; wolf.moving = true;
      wolf.anim=CharacterArt.advance(wolf.anim,'wolf',dt*Math.hypot(370,27),{speed:Math.hypot(370,27)});
    } else {
      cut.stage = "celebrate";
      move(chicken, 450, 305, dt);
      chicken.direction = 'down';
      // Tall livestock stand along the back arc; their bodies must not cover
      // the smaller friends once the shared world sprites grow to adult size.
      const largeAngles={horse:210,cow:270,donkey:330};
      const small=adults(game).filter(a=>largeAngles[a.species]===undefined);
      const chicks=(game.entities.chicks||[]).filter(a=>a.rescued);
      const chickAngles=[180,195,235,250,290,310];
      for (const a of cut.attackers) {
        const degrees=a.ref.type==='chick'?chickAngles[chicks.indexOf(a.ref)]??180:
          largeAngles[a.ref.species]??small.indexOf(a.ref)*160/Math.max(1,small.length-1);
        const angle=degrees*Math.PI/180;
        move(a.ref, 450 + Math.cos(angle) * 235, 305 + Math.sin(angle) * 120, dt);
        a.ref.direction = "down";
      }
      if (t >= timing.done) {
        chicken.direction = "down";
        for (const animal of cast(game)) { animal.direction = "down"; animal.moving = false; }
        cut.done = true; game.phase = "won";
        setStatus(`FIM ♥ ${adults(game).length} amigos a salvo${game.rescuedChicks ? ` e ${game.rescuedChicks} pintinhos de bônus` : ''}!`, "win");
        GameManager.save(game);
      }
    }
    const angry = ["circle", "rush", "cloud"].includes(cut.stage);
    chicken.mood = angry ? "angry" : "normal";
    for (const animal of cast(game)) animal.mood = angry ? "angry" : "normal";
    wolf.mood = ["dizzy", "flee", "celebrate"].includes(cut.stage) ? "crying" : "furious";
    cut.speech = cut.stage === "dizzy" ? (t < timing.dizzy + 1.4 ? "AI! AMASSARAM MEU JEITO DE MAU!" : "MAMÃÃÃE! O almoço me bateu!") :
      cut.stage === "flee" ? "MAMÃE! TEM COLO PRA UM LOBO?!" : "";
  }
  function active(game) {
    return game.phase === "win_cutscene" || game.phase === "won" ||
      (game.phase === "menu" && ["win_cutscene", "won"].includes(game.resumePhase));
  }
  // All presentation is sampled from the cutscene clock. Pausing freezes particles,
  // camera, tumble and captions together, without timers or gameplay randomness.
  function view(game) {
    const t = game.cutscene.time;
    const close = ease((t - timing.circle) / 1.2) * (1 - ease((t - timing.flee) / .7));
    const portrait = canvas.width < 700;
    const zoom = (reduced() ? 1 : 1 + close * .09) * (portrait ? .84 : 1);
    const beat = (t - timing.cloud) * 4;
    const kick = game.cutscene.cloud && !reduced() ? Math.max(0, 1 - (beat % 1) * 5) : 0;
    return { x:canvas.width / 2 + Math.sin(beat * 7) * kick * 3,
      y:(portrait ? canvas.height * .51 : 275) + kick * 2, zoom };
  }
  function frame(game) {
    const camera=view(game);
    ctx.translate(camera.x,camera.y);
    ctx.scale(camera.zoom,camera.zoom);ctx.translate(-450,-275);
  }
  function pose(game, entity) {
    if (!active(game)) return {};
    const { stage, time: t } = game.cutscene, wolf = entity.type === 'wolf';
    const index = game.cutscene.attackers.findIndex(a => a.ref === entity);
    const options = { scale: wolf ? 1.55 : entity.type === 'chick' ? 1.05 : 1.18 };
    if (reduced()) return options;
    if (stage === 'rush' && !wolf) {
      const hop = Math.sin(clamp((t - timing.rush) / (timing.cloud - timing.rush), 0, 1) * Math.PI);
      options.lift = hop * (18 + (index % 3) * 5);
      options.rotation = (entity.x < center.x ? 1 : -1) * hop * .22;
      options.squash = 1 + hop * .12;
    } else if (stage === 'cloud' && entity.type === 'chicken') {
      const leap = clamp((t - timing.dizzy + .8) / .8, 0, 1);
      options.lift = Math.sin(leap * Math.PI) * 56;
      options.rotation = -leap * Math.PI * 2;
    } else if (stage === 'dizzy' && wolf) {
      const land = clamp((t - timing.dizzy) / .65, 0, 1);
      options.rotation = land < 1 ? (1 - land) * Math.PI * 2 : Math.sin(t * 5) * .13;
      options.lift = Math.sin(land * Math.PI) * 44;
      options.squash = land > .75 && land < 1 ? .82 : 1;
    } else if (stage === 'flee' && wolf) {
      options.rotation = .2; options.lift = Math.abs(Math.sin(t * 18)) * 9;
      options.squash = 1 + Math.sin(t * 18) * .09;
    } else if (stage === 'celebrate' && !wolf) {
      const hop = Math.max(0, Math.sin((t - timing.celebrate) * 5 - index * .65));
      options.lift = hop * (entity.type === 'chicken' ? 22 : 13);
      options.rotation = Math.sin(t * 5 + index) * .08;
      options.squash = 1 - (1 - hop) * .04;
    } else if (stage === 'circle' && !wolf) {
      options.rotation = Math.sin(t * 9 + index) * .055;
    }
    return options;
  }
  let ground = null;
  function groundTexture() {
    if (ground) return ground;
    const surface = FarmSprites.surface(300, 400);
    if (!surface) return null;
    const c = surface.getContext('2d'), pixels = c.createImageData(300, 400);
    for (let y = 0; y < 400; y++) for (let x = 0; x < 300; x++) {
      const localY = y - 114;
      const n = ((Math.imul(x + 7, 374761393) ^ Math.imul(y + 31, 668265263)) >>> 0) / 4294967295;
      const edge = ((x - 150) / 108) ** 2 + ((localY - 96) / 53) ** 2;
      const dirt = edge < 1 + Math.sin(localY * .39) * .045 + Math.sin(x * .26) * .028 || (localY > 83 && localY < 103 && x > 190);
      const shade = Math.sin(x * .048 + y * .019) * 4 + (n < .055 ? -8 : n > .96 ? 6 : 0);
      const rgb = dirt ? [194, 165, 113] : [103, 137, 77];
      const i = (y * 300 + x) * 4;
      pixels.data[i] = rgb[0] + shade; pixels.data[i + 1] = rgb[1] + shade;
      pixels.data[i + 2] = rgb[2] + shade; pixels.data[i + 3] = 255;
    }
    c.putImageData(pixels, 0, 0); ground = surface; return surface;
  }
  function drawBackdrop() {
    ctx.fillStyle = '#67894d'; ctx.fillRect(-1200, -1200, 3300, 3000);
    const tile = groundTexture();
    if (tile) { ctx.imageSmoothingEnabled = false; ctx.drawImage(tile, 0, -342, 900, 1200); }
    else { ctx.fillStyle = '#c2a571'; ctx.beginPath(); ctx.ellipse(450, 288, 324, 159, 0, 0, Math.PI * 2); ctx.fill(); }
    const prop = (name, x, y, w, h, flip = false) => FarmSprites.draw(ctx, name, x, y, w, h, { grounded: true, flip });
    // The same timber, trees and pixel scale as the playable farm, with a clear arena.
    prop('tree', -40, -54, 182, 190); prop('tree', 787, -42, 172, 182);
    prop('barn', 100, 0, 163, 149); prop('coop', 682, 40, 127, 112);
    prop('hay', 237, 112, 53, 38);
    for (const x of [0, 73, 759, 832]) prop('fence', x, 158, 78, 50);
    prop('bush', -24, 373, 116, 90); prop('bush', 820, 404, 104, 79);
    if (canvas.width >= 700) {
      const shade = ctx.createLinearGradient(0, 0, 0, 170);
      shade.addColorStop(0, 'rgba(25,49,33,.65)'); shade.addColorStop(1, 'rgba(25,49,33,0)');
      ctx.fillStyle = shade; ctx.fillRect(0, 0, 900, 170);
    }
    ctx.strokeStyle = '#7b6544'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(264, 64); ctx.quadraticCurveTo(456, 143, 683, 63); ctx.stroke();
    for (let i = 0; i < 14; i++) {
      const x = 279 + i * 29, p = (x - 264) / 419, y = 64 + 152 * p * (1 - p);
      ctx.fillStyle = ['#e7c86f', '#ac6546', '#e7e0b6', '#578c83'][i % 4];
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 17, y); ctx.lineTo(x + 9, y + 20); ctx.closePath(); ctx.fill();
    }
  }
  function star(x, y, radius, color = '#ffda68') {
    ctx.fillStyle = color; ctx.strokeStyle = '#a3743e'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? radius * .45 : radius;
      if (!i) ctx.moveTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
      else ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  function puff(x, y, radius, opacity = 1) {
    ctx.save(); ctx.globalAlpha *= opacity; ctx.fillStyle = '#eee0b9'; ctx.strokeStyle = '#b9a374'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y, radius, radius * .65, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  function feather(x, y, angle, gold) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    ctx.fillStyle = gold ? '#ffe497' : '#fff7dc'; ctx.strokeStyle = '#9a845c'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 0, 5, 14, -.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 18); ctx.lineTo(0, -9); ctx.stroke(); ctx.restore();
  }
  function burst(x, y, word, age, big = false) {
    const decay = clamp(age, 0, 1), size = big ? 1.2 : .83;
    ctx.save(); ctx.translate(x, y); ctx.rotate(big ? -.08 : .12);
    const bounce = reduced() ? 1 : .85 + Math.sin(decay * Math.PI) * .22;
    ctx.scale(size * bounce, size * bounce);
    ctx.fillStyle = '#f5cb58'; ctx.strokeStyle = '#614735'; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 24; i++) {
      const angle = i * Math.PI / 12, r = i % 2 ? 64 : 88 + (i % 3) * 7;
      const x = Math.cos(angle) * r, y = Math.sin(angle) * r * .63;
      if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = "900 38px 'Trebuchet MS', sans-serif";
    ctx.strokeStyle = '#fff5cb'; ctx.lineWidth = 6; ctx.strokeText(word, 0, 3);
    ctx.fillStyle = '#86402f'; ctx.fillText(word, 0, 3); ctx.restore();
  }
  function cloud(game) {
    const elapsed = game.cutscene.time - timing.cloud, motion = reduced() ? 0 : elapsed;
    // Four graphical accents per second, sharing the audio system's impact clock.
    const beat = Math.floor(elapsed * 4 + 1e-7), progress = (elapsed * 4) % 1;
    const big = elapsed > timing.dizzy - timing.cloud - .55;
    const x = center.x + Math.sin(motion * 4.5) * 29, y = center.y + Math.cos(motion * 5) * 8;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(67,52,29,.22)'; ctx.beginPath(); ctx.ellipse(0, 85, 157, 27, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 8; i++) {
      const life = (motion * .85 + i / 8) % 1, side = i % 2 ? -1 : 1;
      puff(side * (111 + life * 85), 62 + life * 23, 12 + life * 18, (1 - life) * .55);
    }
    // A wolf somersault and a different rescuer rise above the dust between beats.
    // Their feet stay behind the opaque cloud; the joke is the flailing silhouettes.
    const hop = reduced() ? .35 : Math.sin(((elapsed * 1.6) % 1) * Math.PI);
    CharacterArt.draw(ctx, 'wolf', 23, -46 - hop * 55, { direction: 'down', mood: 'crying', scale: 1.38,
      anim: motion * 16, moving: true, shadow: false, rotation: reduced() ? -.2 : elapsed * 7, squash: 1 - hop * .12 });
    const grownups = game.cutscene.attackers.filter(a => a.ref.type !== 'chick');
    const hero = grownups[Math.floor(elapsed * 1.6) % Math.max(1, grownups.length)]?.ref;
    if (hero?.type === 'goose') GooseArt.draw(ctx, {...hero,x:-119,y:-40-hop*30,direction:'right',anim:motion*14,moving:true},
      {x:0,y:0,shakeX:0,shakeY:0});
    else if (hero) CharacterArt.draw(ctx, hero.species, -119, -40 - hop * 30, { direction: 'right', mood: 'angry',
      anim: motion * 14, moving: true, scale: 1.1, shadow: false, rotation: reduced() ? 0 : .3 - hop * .7 });
    ctx.save();
    if (!reduced()) ctx.scale(1 + Math.sin(elapsed * 25) * .045, 1 - Math.sin(elapsed * 25) * .065);
    ctx.fillStyle = '#bdaa85'; ctx.strokeStyle = '#807255'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, 15, 143, 78, 0, 0, Math.PI * 2); ctx.fill();
    // Back-to-front shaded lobes, a cream core, and broken swirl lines give volume.
    for (let i = 0; i < 13; i++) {
      const a = i * Math.PI * 2 / 13, r = 31 + Math.sin(motion * 12 + i * 3) * 5;
      ctx.fillStyle = Math.sin(a) > .4 ? '#d9c9a4' : '#fff3d5';
      ctx.beginPath(); ctx.arc(Math.cos(a) * 112, 9 + Math.sin(a) * 61, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#f7e9c9'; ctx.beginPath(); ctx.ellipse(0, 7, 111, 65, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c7b68d'; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.ellipse(-58 + i * 53, 8 + (i % 2) * 22, 25, 15, motion * 3 + i, .2, 3.8); ctx.stroke();
    }
    ctx.restore();
    for (let i = 0; i < 7; i++) {
      const a = i * Math.PI * 2 / 7 + motion * .9, r = 162 + Math.sin(motion * 7 + i) * 12;
      const fx = Math.cos(a) * r, fy = Math.sin(a) * 109;
      if (i % 3) feather(fx, fy, a + motion * 2, i === 2); else star(fx, fy, 10);
    }
    const side = beat % 2 ? 1 : -1;
    burst(big ? 0 : side * 100, big ? -14 : -49, big ? 'POOOF!' : ['POF!', 'PAF!', 'PLOC!', 'PUM!'][beat % 4], progress, big);
    ctx.restore();
  }
  function speechBubble(game) {
    if(!['dizzy','flee'].includes(game.cutscene.stage))return;
    const fleeing = game.cutscene.stage === 'flee';
    // Short, two-line speech keeps the wolf's face and the exit lane visible.
    const lines = fleeing ? ['MAMÃÃE!', 'O almoço me bateu!'] : game.cutscene.time < timing.dizzy + 1.4 ?
      ['AI, MINHA POSE', 'DE LOBO MAU!'] : ['EU SÓ QUERIA', 'UM LANCHINHO…'];
    const wolf=game.entities.wolf,camera=view(game);
    const screenX=camera.x+(wolf.x-450)*camera.zoom;
    const screenY=camera.y+(wolf.y-275)*camera.zoom;
    // Speech belongs to its speaker, never to a clamped point at the screen edge.
    // Use the same cinematic transform on desktop, portrait and reduced motion.
    if(screenX<=0||screenX>=canvas.width||screenY<=0||screenY>=canvas.height)return;
    const x=wolf.x,y=wolf.y-165,w=238;
    ctx.save();
    if(fleeing)ctx.globalAlpha*=clamp((canvas.width-screenX)/70,0,1);
    ctx.fillStyle = '#fff8df'; ctx.strokeStyle = '#756448'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(x - w / 2, y, w, 67, 17); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 12, y + 66); ctx.lineTo(x + 4, y + 80); ctx.lineTo(x + 15, y + 66); ctx.fill();
    ctx.textAlign = 'center'; ctx.fillStyle = '#5b503d'; ctx.font = "900 20px 'Trebuchet MS', sans-serif";
    lines.forEach((line, i) => ctx.fillText(line, x, y + 27 + i * 24, w - 22)); ctx.restore();
  }
  function draw(game) {
    const { stage, time: t } = game.cutscene, motion = reduced() ? 0 : t;
    if (stage === 'rush') for (const { ref } of game.cutscene.attackers) {
      puff(ref.x + (ref.x < center.x ? -25 : 25), ref.y + 13, 10, .45);
    }
    if (game.cutscene.cloud) cloud(game);
    if (stage === 'circle' || stage === 'rush') {
      ctx.save(); ctx.textAlign = 'center'; ctx.font = "900 32px 'Trebuchet MS', sans-serif";
      ctx.strokeStyle = '#fff7d7'; ctx.lineWidth = 5; ctx.strokeText(stage === 'rush' ? '!!' : '?!', 482, 195);
      ctx.fillStyle = '#974c35'; ctx.fillText(stage === 'rush' ? '!!' : '?!', 482, 195); ctx.restore();
    }
    if (stage === 'dizzy') {
      const dissipate = (t - timing.dizzy) / .8;
      if (dissipate < 1) for (let i = 0; i < 7; i++) {
        const angle = i * Math.PI * 2 / 7;
        puff(center.x + Math.cos(angle) * (95 + dissipate * 90), center.y + Math.sin(angle) * 68,
          29 + dissipate * 15, (1 - dissipate) * .8);
      }
      ctx.save(); ctx.strokeStyle = '#e4bd5799'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(center.x, 205, 52, 12, -.15, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 5; i++) star(center.x + Math.cos(motion * 3 + i * Math.PI * 2 / 5) * 52,
        205 + Math.sin(motion * 3 + i * Math.PI * 2 / 5) * 12, 8);
      ctx.restore();
    }
    if (stage === 'flee') {
      const wolf = game.entities.wolf;
      for (let i = 0; i < 5; i++) {
        const age = (motion * 2 + i / 5) % 1;
        puff(wolf.x - 38 - age * 112, wolf.y + 19 + age * 8, 5 + age * 14, (1 - age) * .65);
      }
    }
    if (game.cutscene.speech) speechBubble(game);
    if (stage === 'celebrate') {
      const age = t - timing.celebrate;
      for (let i = 0; i < (reduced() ? 14 : 54); i++) {
        const side = i % 2 ? -1 : 1, phase = ((reduced() ? 0 : age * .42) + i / (reduced() ? 14 : 54)) % 1;
        const x = 450 + side * (110 + phase * 270) + Math.sin(i * 5) * 60;
        const y = 96 + phase * 363;
        ctx.save(); ctx.translate(x, y); ctx.rotate(reduced() ? i : t * 3 + i);
        ctx.fillStyle = ['#f3d475', '#bd705b', '#75aaa0', '#fff0c7'][i % 4]; ctx.fillRect(-3, -5, 6, 10); ctx.restore();
      }
    }
  }
  function drawCaption(game) {
    const { stage, time: t } = game.cutscene;
    const portrait = canvas.width < 700, mid = canvas.width / 2;
    const titleY = portrait ? 124 : 49, baseline = canvas.height - (portrait ? 76 : 22);
    const titles = { arrival: 'TODO MUNDO EM CASA.', message: 'FALTA ACERTAR UMA COISINHA…',
      circle: 'MEXEU COM UM…', rush: '…MEXEU COM O POLEIRO!', cloud: 'O ALMOÇO REVIDOU!',
      dizzy: 'CADÊ A POSE DE LOBO MAU?', flee: 'CORRE QUE A MÃE TÁ CHAMANDO!', celebrate: 'A FAZENDA É NOSSA!' };
    const subtitles = { arrival: `${adults(game).length} amigos salvos. Ninguém virou almoço.`,
      message: '“Quem autorizou meu almoço a fazer reunião?”', circle: 'A turma tem uma resposta pro lobo.',
      rush: '“Pera! Um de cada veeeez!”', cloud: 'Penas pra um lado. Valentia pro outro.',
      dizzy: 'O valentão agora só conta estrelinhas.', flee: 'Foi buscar um colo. E um lencinho.',
      celebrate: `${adults(game).length} amigos + ${game.rescuedChicks} pintinhos. Uma família inteira a salvo. ♥` };
    ctx.save(); ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    const topShade = ctx.createLinearGradient(0, 0, 0, portrait ? 220 : 100);
    topShade.addColorStop(0, 'rgba(25,49,33,.7)'); topShade.addColorStop(1, 'rgba(25,49,33,0)');
    ctx.fillStyle = topShade; ctx.fillRect(0, 0, canvas.width, portrait ? 220 : 100);
    ctx.font = `900 ${stage === 'celebrate' ? 37 : 29}px 'Trebuchet MS', sans-serif`;
    ctx.strokeStyle = '#284634'; ctx.lineWidth = 7;
    ctx.strokeText(titles[stage] || titles.celebrate, mid, titleY, canvas.width - 48);
    ctx.fillStyle = '#fff0b9'; ctx.fillText(titles[stage] || titles.celebrate, mid, titleY, canvas.width - 48);
    const gradient = ctx.createLinearGradient(0, canvas.height - 160, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(29,48,33,0)'); gradient.addColorStop(1, 'rgba(29,48,33,.92)');
    ctx.fillStyle = gradient; ctx.fillRect(0, canvas.height - 160, canvas.width, 160);
    ctx.font = `bold ${portrait ? 24 : 18}px 'Trebuchet MS', sans-serif`; ctx.fillStyle = '#fff4d2';
    const subtitle = subtitles[stage] || subtitles.celebrate;
    const lines = portrait ? subtitle.split(/(?<=\.) /) : [subtitle];
    lines.forEach((line, i) => ctx.fillText(line, mid, baseline + i * 29, canvas.width - 46));
    // Quiet progress marks communicate that this is a short scene, not another round.
    for (let i = 0; i < 8; i++) { ctx.fillStyle = t >= i * timing.done / 8 ? '#ebcd7e' : '#d4d2a43d'; ctx.fillRect(mid - 30 + i * 8, canvas.height - 9, 5, 2); }
    ctx.restore();
  }
  return { start, update, active, frame, pose, drawBackdrop, draw, drawCaption, timing };
})();
