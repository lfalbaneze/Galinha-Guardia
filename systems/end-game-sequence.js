/* A self-contained cartoon epilogue; gameplay collision and hunting are suspended. */
const EndGameSequence = (() => {
  const props = new Image();
  props.src = './assets/cinematics/ending-props-6e240e11d168.png';
  const sceneData = typeof EndingSceneData === 'undefined' ? {} : EndingSceneData;
  const scenes = Object.fromEntries(Object.entries(sceneData).map(([key, scene]) => {
    const image = new Image(); image.src = './' + scene.src; return [key, image];
  }));
  const center = { x: 450, y: 275 };
  const timing = Object.freeze({ circle: 3.7, rush: 6.2, cloud: 7, dizzy: 10.8, flee: 13.6, celebrate: 16, done: 19 });
  const gentleEndings = {
    easy: { celebration: 'MAIS UM NO PIQUENIQUE!', beats: [
      { until: 1.3, stage: 'arrival', title: 'TODO MUNDO EM CASA.', subtitle: 'A turma trouxe o lanche. O lobo trouxe outras intenções.' },
      { until: 3.7, stage: 'message', title: 'TEM LUGAR PRA MAIS UM?', subtitle: 'Pela primeira vez, ninguém precisa sair correndo.', speaker: 'wolf', lines: ['EU OUVI FALAR', 'EM ALMOÇO…'] },
      { until: 6.2, stage: 'offer', title: 'O CONVITE TEM UMA CONDIÇÃO.', subtitle: 'A anfitriã oferece a cenoura. Os amigos acompanham de olho.', speaker: 'chicken', lines: ['PODE SENTAR.', 'BICHO NÃO É LANCHE.'], cue: 'pop' },
      { until: 8.8, stage: 'sniff', title: 'INSPEÇÃO DE LOBO.', subtitle: 'Ele chega perto, cheira e recua. A cenoura não foge.', speaker: 'wolf', lines: ['ISSO NÃO CORRE?', 'NEM FAZ COCORICÓ?'], cue: 'squeak' },
      { until: 12, stage: 'picnic', title: 'O ALMOÇO VIROU PIQUENIQUE!', subtitle: 'Uma mordida depois, o valentão já quer repetir.', speaker: 'wolf', lines: ['TÁ… É BOM.', 'TEM KETCHUP?'], cue: 'pop' },
      { until: 16, stage: 'toast', title: 'ATÉ O LOBO GANHOU LUGAR.', subtitle: 'Os pequenos se aproximam. A turma finalmente baixa a guarda.', speaker: 'chick', lines: ['PODE FICAR.', 'MAS SEM MORDER!'], cue: 'rescue' }
    ] },
    normal: { celebration: 'NINGUÉM VIROU ALMOÇO. VIROU BAILE!', beats: [
      { until: 1.3, stage: 'arrival', title: 'TODO MUNDO EM CASA.', subtitle: 'A fazenda preparou um baile. Só falta convencer o convidado.' },
      { until: 3.7, stage: 'message', title: 'ESSA POSE NÃO ASSUSTA MAIS.', subtitle: 'A turma abre a roda e chama o lobo pro meio.', speaker: 'wolf', lines: ['EU VIM CAÇAR.', 'NÃO VIM DANÇAR!'] },
      { until: 6.2, stage: 'lesson', title: 'PRIMEIRO, A AULA.', subtitle: 'A protagonista marca os passos. O lobo tenta acompanhar.', speaker: 'chicken', lines: ['DOIS PRA LÁ.', 'OLHA AS MINHAS PATAS!'], cue: 'pop' },
      { until: 8.9, stage: 'wrongstep', title: 'A OUTRA ESQUERDA, SEU LOBO!', subtitle: 'Ele vai pro lado errado. A turma abre espaço para a trapalhada.', speaker: 'wolf', lines: ['ESQUERDA MINHA', 'OU ESQUERDA SUA?!'], cue: 'boing' },
      { until: 12.5, stage: 'dance', title: 'AGORA O BAILE PEGOU!', subtitle: 'Os amigos entram por duplas. Os pintinhos seguem o último da fila.', speaker: 'chicken', lines: ['ISSO! AGORA', 'TODO MUNDO JUNTO!'], cue: 'rescue' },
      { until: 16, stage: 'encore', title: 'O VALENTÃO PEDIU BIS.', subtitle: 'O lobo puxa a fila e faz questão de encerrar com pose.', speaker: 'wolf', lines: ['RESPEITA O MEU', 'PASSINHO DE MAU!'], cue: 'squeak' }
    ] },
    hard: { celebration: 'FESTA NOSSA. FAXINA DELE!', beats: [
      { until: 1.3, stage: 'arrival', title: 'TODO MUNDO EM CASA.', subtitle: 'Acabou a correria. Sobrou uma bela bagunça no terreiro.' },
      { until: 3.7, stage: 'message', title: 'A CONTA CHEGOU.', subtitle: 'Os amigos cercam os confetes. A protagonista chama o responsável.', speaker: 'chicken', lines: ['QUEM APRONTOU', 'VAI ARRUMAR.'] },
      { until: 6.2, stage: 'duty', title: 'O LOBO FICOU COM A FAXINA!', subtitle: 'Ele estende a pata esperando comida. Recebe uma vassoura.', speaker: 'wolf', lines: ['EU PEDI JANTAR,', 'NÃO UMA VASSOURA!'], cue: 'bonk' },
      { until: 9.6, stage: 'cleanup', title: 'DO BOTE AO BATENTE.', subtitle: 'Cada passada da vassoura empurra os confetes para o montinho.', speaker: 'chicken', lines: ['ISSO. ATÉ O', 'ÚLTIMO CONFETE.'], cue: 'pop' },
      { until: 12.3, stage: 'inspection', title: 'A FISCALIZAÇÃO É PEQUENA.', subtitle: 'O menor da turma sai da fila para conferir o serviço.', speaker: 'chick', lines: ['FALTOU AQUI,', 'SEU LOBO.'], cue: 'squeak' },
      { until: 14.3, stage: 'gust', title: 'NÃO ASSOPRA O MONTINHO!', subtitle: 'Um espirro espalha tudo. O lobo corre atrás da própria faxina.', speaker: 'wolf', lines: ['NÃO! MEU', 'MONTINHOOO!'], cue: 'boing' },
      { until: 16, stage: 'approved', title: 'SERVIÇO APROVADO. POR POUCO.', subtitle: 'O fiscal libera a festa. A vassoura fica com o lobo.', speaker: 'chick', lines: ['AGORA SIM.', 'PODE IR PRO BAILE.'], cue: 'rescue' }
    ] }
  };
  const gentleEnding = game => game.difficultyKey === 'hardcore' ? null : gentleEndings[game.difficultyKey] || gentleEndings.normal;
  const adults = game => [...game.entities.animals, ...(game.entities.goose?.rescued ? [game.entities.goose] : [])];
  const cast = game => [...adults(game), ...(game.entities.chicks || []).filter(c => c.rescued)];
  const reduced = () => typeof InterfaceMotion !== 'undefined' && InterfaceMotion.reduced;
  const ease = value => { const p = clamp(value, 0, 1); return p * p * (3 - 2 * p); };
  const storyBeat = game => gentleEnding(game)?.beats.find(beat => game.cutscene.time < beat.until);
  const chicks = game => (game.entities.chicks || []).filter(c => c.rescued);
  function dialogue(game) {
    const beat = storyBeat(game), { stage, time } = game.cutscene;
    if (beat?.lines) return { entity: beat.speaker === 'chick' ? chicks(game)[0] || game.entities.chicken : game.entities[beat.speaker], lines: beat.lines };
    if (gentleEnding(game)) return null;
    if (stage === 'message') return time < 2.5 ? { entity: game.entities.wolf, lines: ['QUEM AUTORIZOU', 'MEU ALMOÇO A REUNIR?'] } :
      { entity: game.entities.chicken, lines: ['OLHA BEM.', 'NINGUÉM TÁ SOZINHO.'] };
    if (!['dizzy', 'flee'].includes(stage)) return null;
    return { entity: game.entities.wolf, lines: stage === 'flee' ? ['MAMÃE! TEM COLO', 'PRA UM LOBO?!'] : time < timing.dizzy + 1.4 ?
      ['AI! AMASSARAM', 'MEU JEITO DE MAU!'] : ['MAMÃÃÃE!', 'O almoço me bateu!'] };
  }
  function start(game) {
    game.phase = "win_cutscene";
    game.cutscene = { time: 0, done: false, stage: "arrival", cloud: false, impacts: [], attackers: [], speech: "" };
    const chicken = game.entities.chicken, wolf = game.entities.wolf;
    input.clear();
    Object.assign(chicken, { x: 450, y: 510, vx: 0, vy: 0, hidden: false, hideBlend: 0, invulnerable: 0,
      moving: false, sprinting: false, direction: "up", mood: "normal" });
    Object.assign(wolf, { ...center, vx: 0, vy: 0, injured: false, mode: "stopped", facing: -1,
      direction: "down", mood: gentleEnding(game) ? "normal" : "furious", moving: false });
    game.entities.effects = [];
    const friends = cast(game);
    for (const [i, animal] of friends.entries()) {
      const row = i < 12 ? 0 : 1, column = row ? i - 12 : i;
      animal.x = row ? 285 + column * 66 : 90 + column * 65; animal.y = row ? 426 : 384 + (i % 2) * 26;
      animal.moving = false; animal.direction = "up"; animal.mood = "normal";
      game.cutscene.attackers.push({ ref: animal, angle: Math.PI * 2 * i / friends.length });
    }
    camera.x = 0; camera.y = 0; camera.shake = 0; camera.shakeX = 0; camera.shakeY = 0;
    setStatus(storyBeat(game)?.subtitle || "Família reunida! O lobo pediu almoço e ganhou uma reunião…", "win");
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
    entity.vx = dt > 0 ? (entity.x - before.x) / dt : 0;
    entity.vy = dt > 0 ? (entity.y - before.y) / dt : 0;
    entity.moving = travel > .1;
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
  function danceStep(time) {
    const steps = [[0, 0], [-38, 0], [-38, -20], [0, -20], [38, 0], [0, 0]];
    const beat = Math.max(0, time) / .6, index = Math.floor(beat) % steps.length;
    const from = steps[index], to = steps[(index + 1) % steps.length], p = ease(beat % 1);
    return { x: lerp(from[0], to[0], p), y: lerp(from[1], to[1], p) };
  }
  function audience(game, dt) {
    const { stage, time: t } = game.cutscene;
    const large = { horse: [150, 270], cow: [750, 270], donkey: [280, 245] };
    const small = adults(game).filter(a => !large[a.species]);
    const dancing = ['dance', 'encore'].includes(stage), wrong = stage === 'wrongstep';
    for (const [i, animal] of adults(game).entries()) {
      const angle = (25 + small.indexOf(animal) * 130 / Math.max(1, small.length - 1)) * Math.PI / 180;
      const spot = large[animal.species] || [450 + Math.cos(angle) * 330, 280 + Math.sin(angle) * 162];
      const step = dancing ? danceStep(t - 8.9 - (i % 3) * .15) : { x: 0, y: 0 };
      move(animal, spot[0] + step.x * .35 + (wrong ? (spot[0] < 450 ? -22 : 22) : 0), spot[1] + step.y, dt);
      if (!animal.moving) animal.direction = animal.x < 450 ? 'right' : 'left';
    }
    const littleOnes = chicks(game);
    for (const [i, chick] of littleOnes.entries()) {
      const inspect = i === 0 && ['inspection', 'gust', 'approved'].includes(stage);
      const welcome = stage === 'toast';
      const step = dancing ? danceStep(t - 8.9 - i * .14) : { x: 0, y: 0 };
      let x = 300 + i * 300 / Math.max(1, littleOnes.length - 1) + step.x, y = 150 + step.y;
      if (inspect) { x = 600; y = 365; }
      else if (welcome && i === 0) { x = 635; y = 255; }
      else if (welcome) { x = 470 + i * 33; y = 395 + (i % 2) * 23; }
      move(chick, x, y, dt);
      if (!chick.moving) chick.direction = inspect ? 'left' : 'down';
    }
  }
  function perform(game, dt) {
    const { stage, time: t } = game.cutscene, chicken = game.entities.chicken, wolf = game.entities.wolf;
    const dancing = ['dance', 'encore'].includes(stage), wrong = stage === 'wrongstep';
    audience(game, dt);
    let hx = 335, hy = 355, wx = 555, wy = 300;
    if (game.difficultyKey === 'easy') {
      if (stage === 'offer') hx += ease((t - 3.7) / 1.8) * 65;
      if (stage === 'sniff') wx -= Math.sin(clamp((t - 6.2) / 2.6, 0, 1) * Math.PI) * 68;
      if (['picnic', 'toast'].includes(stage)) { hx = 385; wx = 520; wy = 335; }
    } else if (game.difficultyKey === 'hard') {
      if (stage === 'duty') { hx = 420; wx = 540; }
      if (stage === 'cleanup') { wx = lerp(320, 675, ease((t - 6.2) / 3.4)); wy = 340; }
      if (['inspection', 'approved'].includes(stage)) { wx = 430; wy = 310; }
      if (stage === 'gust') { wx = 620 - Math.sin(clamp((t - 12.3) / 2, 0, 1) * Math.PI) * 120; wy = 340; }
      if (!chicks(game).length && ['inspection', 'approved'].includes(stage)) { hx = 600; hy = 365; }
    } else {
      const step = danceStep(t - (dancing ? 8.9 : 3.7));
      if (['lesson', 'wrongstep', 'dance', 'encore'].includes(stage)) { hx += step.x; hy += step.y; }
      if (stage === 'lesson') { const copy = danceStep(t - 4.3); wx += copy.x; wy += copy.y; }
      if (wrong) { wx = 555 - step.x * 1.6; wy = 300 + Math.sin(clamp((t - 6.2) / 2.7, 0, 1) * Math.PI) * 48; }
      if (dancing) { wx = (stage === 'encore' ? 495 : 555) + step.x; wy = (stage === 'encore' ? 355 : 300) + step.y; }
    }
    move(chicken, hx, hy, dt); move(wolf, wx, wy, dt);
    if (!chicken.moving) chicken.direction = 'right';
    if (!wolf.moving) wolf.direction = stage === 'sniff' ? 'left' : 'down';
    chicken.mood = ['message', 'duty', 'inspection'].includes(stage) ? 'angry' : 'happy';
    wolf.mood = ['sniff', 'wrongstep', 'gust'].includes(stage) ? 'scared' : ['picnic', 'toast', 'dance', 'encore', 'approved'].includes(stage) ? 'happy' : 'normal';
    for (const animal of cast(game)) animal.mood = ['duty', 'inspection'].includes(stage) ? 'normal' : 'happy';
    if (stage === 'inspection' && chicks(game)[0]) chicks(game)[0].mood = 'angry';
  }
  function update(game, dt) {
    const cut = game.cutscene;
    if (cut.done) return;
    cut.time += dt;
    const t = cut.time, chicken = game.entities.chicken, wolf = game.entities.wolf;
    for (const entity of [chicken, wolf, ...cast(game)]) { entity.moving = false; entity.vx = 0; entity.vy = 0; }
    const ending = gentleEnding(game);
    cut.cloud = !ending && t >= timing.cloud && t < timing.dizzy;
    if (ending && t < timing.celebrate) {
      cut.stage = storyBeat(game).stage;
      perform(game, dt);
    } else if (t < 1.3) {
      cut.stage = "arrival";
      audience(game, dt);
      move(chicken, 335, 420, dt);
    } else if (t < timing.circle) {
      cut.stage = "message";
      audience(game, dt);
      move(chicken, 335, 420, dt); chicken.direction = "right";
      wolf.direction = t < 2.5 ? 'down' : 'left';
    } else if (t < timing.rush) {
      cut.stage = "circle";
      for (const a of cut.attackers) {
        const angle = a.angle + (t - timing.circle) * 0.12;
        const radius = a.ref.type === 'chick' ? 285 : 230;
        move(a.ref, center.x + Math.cos(angle) * radius, center.y + Math.sin(angle) * 118, dt, 3.8);
        // A three-quarter turn keeps the angry eyebrows visible before the charge.
        a.ref.direction = a.ref.x < center.x ? "right" : "left";
      }
      move(wolf, 450 + Math.sin((t - timing.circle) * Math.PI / 1.25) * 45, 275, dt);
    } else if (t < timing.cloud) {
      cut.stage = "rush";
      move(wolf, 450, 275, dt, 8);
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
      for (const animal of cast(game)) animal.direction = 'right';
      const flight = t - timing.flee;
      wolf.x = center.x + flight * 370; wolf.y = center.y + (reduced() ? 0 : Math.sin(flight * 18) * 3) - flight * 27;
      wolf.facing = 1; wolf.direction = "right"; wolf.moving = true;
      wolf.anim=CharacterArt.advance(wolf.anim,'wolf',dt*Math.hypot(370,27),{speed:Math.hypot(370,27)});
    } else {
      cut.stage = "celebrate";
      if (ending) { move(wolf, 580, 310, dt); wolf.direction = 'down'; }
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
    const angry = !ending && ["circle", "rush", "cloud"].includes(cut.stage);
    if (!ending || cut.stage === 'celebrate') {
      chicken.mood = angry ? "angry" : ending ? "happy" : "normal";
      for (const animal of cast(game)) animal.mood = chicken.mood;
      wolf.mood = ending ? 'happy' : ["dizzy", "flee", "celebrate"].includes(cut.stage) ? "crying" : "furious";
    }
    cut.speech = dialogue(game)?.lines.join(' ') || '';
    cut.cue = storyBeat(game)?.cue;
  }
  function active(game) {
    return game.phase === "win_cutscene" || game.phase === "won" ||
      (game.phase === "menu" && ["win_cutscene", "won"].includes(game.resumePhase));
  }
  // All presentation is sampled from the cutscene clock. Pausing freezes particles,
  // camera, tumble and captions together, without timers or gameplay randomness.
  function view(game) {
    const t = game.cutscene.time;
    const close = gentleEnding(game) ? 0 : ease((t - timing.circle) / 1.2) * (1 - ease((t - timing.flee) / .7));
    const portrait = canvas.width < 700;
    const zoom = (reduced() ? 1 : 1 + close * .09) * (portrait ? Math.min(.84, (canvas.width - 56) / 780) : 1);
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
    if (['lesson', 'dance', 'encore'].includes(stage)) {
      options.rotation = Math.sin((t - 3.7) * Math.PI / .6) * .045;
    } else if (stage === 'wrongstep' && wolf) {
      const stumble = Math.sin(clamp((t - 6.2) / 2.7, 0, 1) * Math.PI);
      options.rotation = stumble * -.28; options.lift = stumble * 8;
    } else if (stage === 'sniff' && wolf) {
      options.rotation = -.1 * Math.sin(clamp((t - 6.2) / 2.6, 0, 1) * Math.PI);
    } else if (stage === 'picnic' && wolf) {
      options.squash = 1 + Math.sin(t * 5) * .035;
    } else if (['cleanup', 'gust'].includes(stage) && wolf) {
      options.rotation = Math.sin(t * 4) * .07;
    } else if (stage === 'toast' && wolf) {
      options.rotation = Math.sin(clamp((t - 12) / 1.3, 0, 1) * Math.PI) * .12;
    } else if (stage === 'rush' && !wolf) {
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
  function drawBackdrop(game) {
    const scene = scenes[game.difficultyKey];
    if (scene?.complete && scene.naturalWidth && scene.naturalHeight) {
      const camera = view(game), width = canvas.width / camera.zoom, height = canvas.height / camera.zoom;
      const scale = Math.max(width / scene.naturalWidth, height / scene.naturalHeight);
      const x = 450 + (canvas.width / 2 - camera.x) / camera.zoom;
      const y = 275 + (canvas.height / 2 - camera.y) / camera.zoom;
      ctx.save(); ctx.imageSmoothingEnabled = false;
      if (canvas.width < 700) {
        ctx.fillStyle = game.difficultyKey === 'hardcore' ? '#17202c' : '#233c2e';
        ctx.fillRect(450 - camera.x / camera.zoom, 275 - camera.y / camera.zoom, width, height);
        ctx.globalAlpha = .3;
      }
      ctx.drawImage(scene, x - scene.naturalWidth * scale / 2, y - scene.naturalHeight * scale / 2,
        scene.naturalWidth * scale, scene.naturalHeight * scale);
      if (canvas.width < 700) {
        ctx.globalAlpha = 1;
        ctx.drawImage(scene, 0, -40, 900, 600);
      }
      ctx.restore();
    } else {
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
    }
    if (game.difficultyKey !== 'hardcore' || game.cutscene.stage === 'celebrate') {
    ctx.strokeStyle = '#7b6544'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(264, 64); ctx.quadraticCurveTo(456, 143, 683, 63); ctx.stroke();
    for (let i = 0; i < 14; i++) {
      const x = 279 + i * 29, p = (x - 264) / 419, y = 64 + 152 * p * (1 - p);
      ctx.fillStyle = ['#e7c86f', '#ac6546', '#e7e0b6', '#578c83'][i % 4];
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 17, y); ctx.lineTo(x + 9, y + 20); ctx.closePath(); ctx.fill();
    }
    }
    if (game.difficultyKey === 'easy') {
      ctx.fillStyle = '#f4dfb1'; ctx.fillRect(320, 298, 275, 100);
      for (let y = 0; y < 5; y++) for (let x = 0; x < 11; x++) {
        ctx.fillStyle = (x + y) % 2 ? '#c77862' : '#edd5aa';
        ctx.fillRect(320 + x * 25, 298 + y * 20, 25, 20);
      }
    } else if (game.difficultyKey === 'hard') {
      const t = game.cutscene.time, sweep = ease((t - 6.2) / 3.4);
      const gust = Math.sin(clamp((t - 12.3) / 2, 0, 1) * Math.PI);
      for (let i = 0; i < 32; i++) {
        const progress = ease((sweep - i / 48) * 3);
        const x = lerp(270 + i * 12, 700 + (i % 4) * 4, progress) - gust * (60 + i * 3);
        const y = lerp(345 + Math.sin(i * 7) * 16, 358 - Math.floor(i / 4) * 2, progress) - gust * (10 + i % 5 * 8);
        ctx.fillStyle = ['#f3d475', '#bd705b', '#75aaa0'][i % 3];
        ctx.fillRect(Math.round(x), Math.round(y), 7, 4);
      }
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
    for (let i = 0; i < 8; i++) {
      const life = (motion * .85 + i / 8) % 1, side = i % 2 ? -1 : 1;
      puff(side * (111 + life * 85), 62 + life * 23, 12 + life * 18, (1 - life) * .55);
    }
    // A wolf somersault and a different rescuer rise above the dust between beats.
    // Their feet stay behind the opaque cloud; the joke is the flailing silhouettes.
    const hop = reduced() ? .35 : Math.sin(((elapsed * 1.6) % 1) * Math.PI);
    CharacterArt.draw(ctx, 'wolf', 23, -46 - hop * 55, { direction: 'down', mood: 'crying', scale: 1.38,
      variant: game.difficultyKey === 'hardcore' ? 'hardcore' : undefined,
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
    const speech = dialogue(game);
    if (!speech) return;
    const fleeing = game.cutscene.stage === 'flee';
    const { entity, lines } = speech, camera = view(game);
    const screenX=camera.x+(entity.x-450)*camera.zoom;
    const screenY=camera.y+(entity.y-275)*camera.zoom;
    // Speech belongs to its speaker, never to a clamped point at the screen edge.
    // Use the same cinematic transform on desktop, portrait and reduced motion.
    if(screenX<=0||screenX>=canvas.width||screenY<=0||screenY>=canvas.height)return;
    const x=entity.x,y=entity.y-(entity.type === 'wolf' ? 165 : entity.type === 'chick' ? 116 : 137),w=238;
    ctx.save();
    if(fleeing)ctx.globalAlpha*=clamp((canvas.width-screenX)/70,0,1);
    ctx.fillStyle = '#fff8df'; ctx.strokeStyle = '#756448'; ctx.lineWidth = 2.5;
    // One continuous outline, with a short tail directly above the speaker.
    ctx.beginPath(); ctx.moveTo(x - 102, y); ctx.lineTo(x + 102, y);
    ctx.quadraticCurveTo(x + 119, y, x + 119, y + 17); ctx.lineTo(x + 119, y + 50);
    ctx.quadraticCurveTo(x + 119, y + 67, x + 102, y + 67);
    ctx.lineTo(x + 15, y + 67); ctx.lineTo(x + 4, y + 80); ctx.lineTo(x - 12, y + 67);
    ctx.lineTo(x - 102, y + 67); ctx.quadraticCurveTo(x - 119, y + 67, x - 119, y + 50);
    ctx.lineTo(x - 119, y + 17); ctx.quadraticCurveTo(x - 119, y, x - 102, y);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = '#5b503d'; ctx.font = "900 20px 'Trebuchet MS', sans-serif";
    lines.forEach((line, i) => ctx.fillText(line, x, y + 27 + i * 24, w - 22)); ctx.restore();
  }
  function drawGentleEnding(game) {
    const { stage, time } = game.cutscene, wolf = game.entities.wolf, chicken = game.entities.chicken;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // The finale wolf renders at roughly two screen pixels per source pixel.
    if (game.difficultyKey === 'easy' && time >= 3.7) {
      const handoff = ease((time - 8.2) / 1.1);
      const x = lerp(chicken.x + 12, wolf.x + 8, handoff), y = lerp(chicken.y - 53, wolf.y - 52, handoff);
      const bite = time >= 10.3 ? 8 : 0;
      if (props.complete && props.naturalWidth) ctx.drawImage(props, 22, 32 + bite, 20, 30 - bite, Math.round(x), Math.round(y + bite * 2), 40, 60 - bite * 2);
      if (stage === 'picnic' && time < 10.8) {
        ctx.fillStyle = '#f4dfb1';
        for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(wolf.x + 24 + Math.sin(i * 8) * 13), Math.round(wolf.y - 35 + (time * 12 + i * 6) % 25), 3, 3);
      }
    } else if (['lesson', 'wrongstep', 'dance', 'encore'].includes(stage)) {
      ctx.font = "bold 36px 'Trebuchet MS', sans-serif"; ctx.textAlign = 'center';
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = ['#e7c86f', '#ac6546', '#578c83'][i % 3];
        const bob = reduced() ? 0 : Math.sin(time * 3 + i) * 12;
        ctx.fillText(i % 2 ? '♪' : '♫', 145 + i * 122, 245 + bob);
      }
    } else if (game.difficultyKey === 'hard' && time >= 3.7) {
      const handoff = ease((time - 3.7) / 1.7), sweeping = ['cleanup', 'gust'].includes(stage);
      const sweep = reduced() || !sweeping ? 0 : Math.round(Math.sin(time * 8) * 13);
      const x = lerp(chicken.x + 10, wolf.x + 12, handoff) + sweep, y = lerp(chicken.y - 78, wolf.y - 78, handoff);
      if (props.complete && props.naturalWidth) ctx.drawImage(props, 84, 22, 24, 50, Math.round(x), Math.round(y), 48, 100);
      if (sweeping && !reduced()) puff(wolf.x + 36 + sweep, wolf.y + 14, 9, .3);
    }
    ctx.restore();
  }
  function draw(game) {
    const { stage, time: t } = game.cutscene, motion = reduced() ? 0 : t;
    if (gentleEnding(game)) drawGentleEnding(game);
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
    const titles = { arrival: 'TODO MUNDO EM CASA.', message: 'FALTA ACERTAR UMA COISINHA…',
      circle: 'MEXEU COM UM…', rush: '…MEXEU COM O POLEIRO!', cloud: 'O ALMOÇO REVIDOU!',
      dizzy: 'CADÊ A POSE DE LOBO MAU?', flee: 'CORRE QUE A MÃE TÁ CHAMANDO!', celebrate: 'A FAZENDA É NOSSA!' };
    const subtitles = { arrival: `${adults(game).length} amigos salvos. Ninguém virou almoço.`,
      message: 'A protagonista responde. Dessa vez, ninguém vai se esconder.', circle: 'Ele procura uma brecha. A turma fecha os dois lados.',
      rush: '“Pera! Um de cada veeeez!”', cloud: 'Penas pra um lado. Valentia pro outro.',
      dizzy: 'O valentão agora só conta estrelinhas.', flee: 'Foi buscar um colo. E um lencinho.',
      celebrate: `${adults(game).length} amigos + ${game.rescuedChicks} pintinhos. Uma família inteira a salvo. ♥` };
    const ending = gentleEnding(game);
    if (ending) {
      const beat = storyBeat(game);
      if (beat) { titles[stage] = beat.title; subtitles[stage] = beat.subtitle; }
      titles.celebrate = ending.celebration;
    } else titles.celebrate = 'FINAL VERDADEIRO: A FAZENDA É NOSSA!';
    ctx.save(); ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    ctx.globalAlpha = ease(Math.min(t, timing.done - t) / .5);
    const wrap = text => {
      const lines = []; let line = '';
      for (const word of text.split(/\s+/)) {
        const next = line ? line + ' ' + word : word;
        if (line && ctx.measureText(next).width > canvas.width - 72) { lines.push(line); line = word; }
        else line = next;
      }
      if (line) lines.push(line);
      return lines;
    };
    const topShade = ctx.createLinearGradient(0, 0, 0, portrait ? 190 : 126);
    topShade.addColorStop(0, 'rgba(15,25,30,.9)'); topShade.addColorStop(1, 'rgba(15,25,30,0)');
    ctx.fillStyle = topShade; ctx.fillRect(0, 0, canvas.width, portrait ? 190 : 126);
    ctx.font = "bold 13px 'Trebuchet MS', sans-serif"; ctx.fillStyle = '#e9ce8e';
    ctx.fillText('EPÍLOGO · ' + (sceneData[game.difficultyKey]?.title || game.difficultyKey).toUpperCase(), mid, portrait ? 56 : 24);
    ctx.font = `900 ${portrait ? 26 : 28}px 'Trebuchet MS', sans-serif`;
    ctx.strokeStyle = '#1c302b'; ctx.lineWidth = 5;
    wrap(titles[stage] || titles.celebrate).forEach((line, i) => {
      const y = (portrait ? 96 : 59) + i * 33;
      ctx.strokeText(line, mid, y); ctx.fillStyle = '#fff0c4'; ctx.fillText(line, mid, y);
    });
    const gradient = ctx.createLinearGradient(0, canvas.height - 160, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(29,48,33,0)'); gradient.addColorStop(1, 'rgba(29,48,33,.92)');
    ctx.fillStyle = gradient; ctx.fillRect(0, canvas.height - 160, canvas.width, 160);
    ctx.font = `bold ${portrait ? 21 : 18}px 'Trebuchet MS', sans-serif`; ctx.fillStyle = '#fff4d2';
    const lines = wrap(subtitles[stage] || subtitles.celebrate);
    lines.forEach((line, i) => ctx.fillText(line, mid, canvas.height - 35 - (lines.length - 1 - i) * 27));
    // Quiet progress marks communicate that this is a short scene, not another round.
    for (let i = 0; i < 8; i++) { ctx.fillStyle = t >= i * timing.done / 8 ? '#ebcd7e' : '#d4d2a43d'; ctx.fillRect(mid - 30 + i * 8, canvas.height - 9, 5, 2); }
    ctx.restore();
  }
  return { start, update, active, frame, pose, drawBackdrop, draw, drawCaption, timing };
})();
