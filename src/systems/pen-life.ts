/* Peaceful pen activity. Its own random streams never change gameplay randomness. */
const PenLife = (() => {
  type Resident = Farm.Animal | Farm.Goose;
  type Topic = 'welcome' | 'wolf';
  interface Wander { seed: number; target: Farm.Point | null; pause: number; }
  interface Comment { speaker: Resident; text: string; remaining: number; }
  interface Visit {
    inside: boolean; outside: number; cooldown: number; pending: number; wait: number;
    count: number; lastSpeaker: string; lastLine: string; topic: Topic; serial: number;
    comment: Comment | null;
  }
  const wanderers = new WeakMap<Farm.Goose, Wander>();
  const visits = new WeakMap<Farm.GameState, Visit>();
  const jokes: Record<string, Record<Topic, readonly string[]>> = {
    sheep: { welcome: ['Voltou! Minha lã já tava em pé!', 'Essa galinha merece férias no feno.'], wolf: ['Baltazar, hoje o cardápio é vento!', 'Muito dente pra pouca galinha!'] },
    pig: { welcome: ['Essa galinha corre mais que fofoca!', 'Salvou a turma e nem sujou as penas!'], wolf: ['Lobo, o buffet tá fechado!', 'Baltazar saiu sem nem um petisco!'] },
    goat: { welcome: ['Trouxe novidades? São comestíveis?', 'Chegou a dona do corre-corre!'], wolf: ['A cerca ganhou do lobo de novo!', 'Ele corre. A gente ri. Bom acordo.'] },
    cow: { welcome: ['Muuu... chegou a campeã do pega-pega!', 'Essa galinha vale um caminhão de capim!'], wolf: ['Vai mastigar a derrota, Baltazar!', 'O lobo correu. Eu só mastiguei.'] },
    duck: { welcome: ['Quá! Essa entrada merecia uma buzina!', 'Chegou de penas e tudo!'], wolf: ['Baltazar ficou falando sozinho!', 'Esse lobo precisa de um mapa!'] },
    rabbit: { welcome: ['Essa galinha devia competir nos pulos!', 'Minhas orelhas ouviram você chegando!'], wolf: ['Corre, lobo! O almoço pediu demissão!', 'Até minhas orelhas chegaram antes!'] },
    dog: { welcome: ['Boa! Agora vamos achar um graveto?', 'Eu latia parabéns, mas tava comendo.'], wolf: ['Thor vai adorar essa história!', 'Baltazar, senta! Fica! Vai embora!'] },
    cat: { welcome: ['Demorou. Meu carinho tava agendado.', 'Boa corrida. Eu teria ido de colo.'], wolf: ['Muito drama pra um lobo só.', 'Baltazar perdeu. Vou tirar uma soneca.'] },
    donkey: { welcome: ['Eu também corria assim. Só não quis.', 'Chegou! Já posso reclamar sentado?'], wolf: ['Eu avisei que ele não alcançava!', 'Esse lobo perdeu até a pose!'] },
    lamb: { welcome: ['Quando eu crescer, quero correr assim!', 'Você trouxe todo mundo no susto!'], wolf: ['Sou pequeno, mas ri bastante!', 'O lobo ficou sem sobremesa!'] },
    horse: { welcome: ['Duas patas e esse motor todo?!', 'Essa galinha tem quatro cavalos de força!'], wolf: ['Baltazar ficou comendo poeira!', 'Pede um táxi, lobo!'] },
    turkey: { welcome: ['Glu-glu! Eu aprovo essa entrada!', 'Essa chegada merece um desfile!'], wolf: ['A ceia foi cancelada, Baltazar!', 'Muito focinho e pouca vitória!'] },
    goose: { welcome: ['Hóónk! Entrada aprovada, sem multa!', 'Chegou! Agora eu fiscalizo o feno.'], wolf: ['Baltazar ficou sem crachá e sem almoço!', 'Lobo, sua visita foi reprovada!'] },
  };
  function random(w: Wander): number {
    w.seed = (Math.imul(w.seed, 1664525) + 1013904223) >>> 0;
    return w.seed / 4294967296;
  }
  function inside(body: Farm.Body, padding = 0): boolean {
    const p = getHitbox(body), b = FarmRefuge.bounds;
    return p.x >= b.x + padding && p.x <= b.x + b.w - padding &&
      p.y >= b.y + padding && p.y <= b.y + b.h - padding;
  }
  function paused(game: Farm.GameState): boolean {
    return game.phase !== 'playing' || !!game.lake?.active ||
      (typeof ThorSystem !== 'undefined' && ThorSystem.active(game));
  }
  function residents(game: Farm.GameState): Resident[] {
    const list: Resident[] = (game.entities.animals || []).filter(a => a.rescued && inside(a));
    if (game.entities.goose?.rescued && inside(game.entities.goose)) list.push(game.entities.goose);
    return list;
  }
  function canSee(game: Farm.GameState, body: Farm.Body): boolean {
    return distance(game.entities.chicken, body) < 280 &&
      DetectionSystem.hasLineOfSight(getHitbox(game.entities.chicken), getHitbox(body));
  }
  function resetGoose(goose: Farm.Goose): void { wanderers.delete(goose); }
  function clearLeg(goose: Farm.Goose, to: Farm.Point): boolean {
    const from = getHitbox(goose), r = goose.hitbox.r + 1;
    const end = { x: to.x + goose.hitbox.ox, y: to.y + goose.hitbox.oy };
    return OBSTACLES.every(o => o.blocking === false || !DetectionSystem.segmentIntersectsRect(from, end,
      { x: o.x - r, y: o.y - r, w: o.w + r * 2, h: o.h + r * 2 }));
  }
  function newTarget(game: Farm.GameState, goose: Farm.Goose, w: Wander): Farm.Point | null {
    const b = FarmRefuge.bounds, home = FarmRefuge.gooseHome(), margin = goose.hitbox.r + 10;
    const left = b.x + margin - goose.hitbox.ox, right = b.x + b.w - margin - goose.hitbox.ox;
    // Walk in the open yard below the shelter, not under its roof or through its posts.
    const top = Math.max(b.y + margin, home.y - 30), bottom = b.y + b.h - margin - goose.hitbox.oy;
    for (let i = 0; i < 24; i++) {
      const angle = random(w) * Math.PI * 2, length = 42 + random(w) * 76;
      const p = { x: clamp(goose.x + Math.cos(angle) * length, left, right),
        y: clamp(goose.y + Math.sin(angle) * length, top, bottom) };
      if (distance(goose, p) < 30 || !clearLeg(goose, p)) continue;
      const foot = { x: p.x + goose.hitbox.ox, y: p.y + goose.hitbox.oy };
      if (residents(game).some(a => a !== goose && distance(foot, getHitbox(a)) < goose.hitbox.r + a.hitbox.r + 2)) continue;
      return p;
    }
    return null;
  }
  function updateGoose(game: Farm.GameState, goose: Farm.Goose, dt: number): void {
    if (paused(game) || !goose.rescued || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, .1);
    let w = wanderers.get(goose);
    if (!w) {
      w = { seed: ((game.worldSeed || 1) ^ 0x50414e54) >>> 0, target: null, pause: .3 };
      wanderers.set(goose, w);
    }
    const before = { x: goose.x, y: goose.y };
    goose.mode = 'defeated'; goose.vx = 0; goose.vy = 0; goose.moving = false; goose.state = 'idle';
    // Settlement only runs on rescue/load; never snap him back home every frame.
    if (!inside(goose, goose.hitbox.r + 2)) { w.target = null; return; }
    if (w.pause > 0) { w.pause = Math.max(0, w.pause - dt); return; }
    if (!w.target) w.target = newTarget(game, goose, w);
    if (!w.target) { w.pause = .4; return; }
    const target = w.target, gap = distance(goose, target), speed = 48;
    const travel = Math.min(gap, speed * dt), steps = Math.max(1, Math.ceil(travel / 4));
    const dx = (target.x - goose.x) / Math.max(.01, gap), dy = (target.y - goose.y) / Math.max(.01, gap);
    let blocked = false;
    for (let i = 0; i < steps; i++) {
      const next = { x: goose.x + dx * travel / steps, y: goose.y + dy * travel / steps };
      const foot = { x: next.x + goose.hitbox.ox, y: next.y + goose.hitbox.oy }, current = getHitbox(goose);
      const crowd = [...residents(game), game.entities.chicken];
      blocked = !clearLeg(goose, next) || crowd.some(a => a !== goose &&
        distance(foot, getHitbox(a)) < goose.hitbox.r + a.hitbox.r - 3 &&
        distance(foot, getHitbox(a)) < distance(current, getHitbox(a)));
      if (blocked) break;
      goose.x = next.x; goose.y = next.y;
    }
    const moved = distance(before, goose);
    goose.vx = (goose.x - before.x) / dt; goose.vy = (goose.y - before.y) / dt;
    goose.moving = moved > .01; goose.state = goose.moving ? 'walk' : 'idle';
    if (goose.moving) Player.face(goose, goose.vx, goose.vy);
    goose.anim = CharacterArt.advance(goose.anim, 'goose', moved, { speed: moved / dt });
    goose.areaId = getAreaAt(goose.x, goose.y).id;
    if (blocked || distance(goose, target) < 2) {
      w.target = null; w.pause = blocked ? .25 : .45 + random(w) * .8;
      goose.activity = random(w) > .5 ? 'preen' : 'forage';
    }
  }
  function update(game: Farm.GameState, dt: number): void {
    if (paused(game) || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, .1);
    let visit = visits.get(game);
    if (!visit) {
      visit = { inside: false, outside: 2, cooldown: 0, pending: 0, wait: 0, count: 0,
        lastSpeaker: '', lastLine: '', topic: 'welcome', serial: 0, comment: null };
      visits.set(game, visit);
    }
    visit.cooldown = Math.max(0, visit.cooldown - dt);
    if (visit.comment) {
      visit.comment.remaining -= dt;
      if (visit.comment.remaining <= 0 || !canSee(game, visit.comment.speaker)) visit.comment = null;
    }
    const chicken = game.entities.chicken, entered = inside(chicken, 4), people = residents(game);
    if (!entered) {
      visit.inside = false; visit.outside += dt; visit.pending = 0; visit.comment = null; visit.count = people.length;
      return;
    }
    if ((!visit.inside && visit.outside >= 1) || people.length > visit.count) {
      visit.pending = 2; visit.wait = .4;
      const wolf = game.entities.wolf;
      visit.topic = distance(chicken, wolf) < 350 && !SunflowerSystem.concealed(game) &&
        DetectionSystem.hasLineOfSight(getHitbox(chicken), getHitbox(wolf)) ? 'wolf' : 'welcome';
    }
    visit.inside = true; visit.outside = 0; visit.count = people.length;
    visit.wait = Math.max(0, visit.wait - dt);
    if (!visit.pending || visit.wait > 0 || visit.cooldown > 0 || visit.comment || chicken.hidden) return;
    // Do not interrupt a rescue, a frightened friend or a nearby wolf's own reply.
    if ((game.animalSpeechCooldown || 0) > 0 || (game.rescueNotice?.time || 0) > 0 ||
      ((game.entities.wolf.speechTime || 0) > 0 && canSee(game, game.entities.wolf))) return;
    const available = people.filter(a => canSee(game, a) &&
      !(a.type === 'animal' && a.speechTime > 0)).sort((a, b) => a.id.localeCompare(b.id));
    if (!available.length) return;
    const choices = available.filter(a => a.id !== visit!.lastSpeaker);
    const candidates = choices.length ? choices : available;
    const speaker = candidates[visit.serial % candidates.length];
    const species = speaker.type === 'goose' ? 'goose' : speaker.species;
    const topic = visit.pending === 2 ? visit.topic : 'welcome';
    const lines = (jokes[species] || jokes.pig)[topic];
    const text = lines.find((line, i) => i === visit!.serial % lines.length && line !== visit!.lastLine) ||
      lines.find(line => line !== visit!.lastLine) || lines[0];
    visit.comment = { speaker, text, remaining: 3.8 };
    visit.pending--; visit.cooldown = 11; visit.serial++; visit.lastSpeaker = speaker.id; visit.lastLine = text;
  }
  function current(game: Farm.GameState): Readonly<Comment> | null { return visits.get(game)?.comment || null; }
  function draw(game: Farm.GameState): void {
    const comment = current(game);
    if (paused(game) || !comment || !inside(game.entities.chicken, 4) || !canSee(game, comment.speaker)) return;
    const p = worldToScreen(comment.speaker);
    if (p.x < 0 || p.x > canvas.width || p.y < 112 || p.y > canvas.height) return;
    ctx.save(); ctx.font = '13px Trebuchet MS, sans-serif';
    const width = Math.min(250, canvas.width - 24, Math.max(180, ctx.measureText(comment.text).width + 24));
    const lines: string[] = [];
    let line = '';
    for (const word of comment.text.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > width - 24) { lines.push(line); line = word; }
      else line = next;
    }
    if (line) lines.push(line);
    const height = 16 + lines.length * 17, x = clamp(p.x - width / 2, 12, canvas.width - width - 12);
    const y = p.y - 76 - height, tip = clamp(p.x, x + 12, x + width - 12);
    if (y < 8) { ctx.restore(); return; }
    ctx.fillStyle = '#fff3ce'; ctx.beginPath(); ctx.roundRect(x, y, width, height, 8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(tip - 5, y + height - 1); ctx.lineTo(tip + 5, y + height - 1);
    ctx.lineTo(tip, y + height + 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#663d28'; ctx.textAlign = 'center';
    lines.forEach((text, i) => ctx.fillText(text, x + width / 2, y + 19 + i * 17, width - 20));
    ctx.restore();
  }
  return { update, updateGoose, resetGoose, current, draw };
})();
