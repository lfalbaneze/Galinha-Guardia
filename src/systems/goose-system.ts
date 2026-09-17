/* Territorial state machine: attention, readable feints, fixed dashes and a peaceful defeat. */
const GooseSystem = (() => {
  const RADIUS = 17;
  const OFFSET_Y = 8;
  const TERRITORY = 220;
  const point = (p: Farm.Point): Farm.Point => ({ x: p.x, y: p.y });
  const center = (p: Farm.Point): Farm.Point => ({ x: p.x, y: p.y + OFFSET_Y });

  function getConfig(game: Farm.GameState): Farm.GooseConfig {
    const easy = game.difficultyKey === 'easy', hard = game.difficultyKey === 'hard';
    const pressure = Math.min(2, game.lake?.active ? game.lake.misses : 0);
    return { territory: TERRITORY, alertRange: easy ? 135 : hard ? 190 : 165,
      warning: (easy ? 1.35 : hard ? .9 : 1.1) - pressure * .05,
      chargeSpeed: game.settings.chickenSpeed * Math.min(1.22, (easy ? .95 : hard ? 1.12 : 1.04) + pressure * .04),
      chargeSeconds: .65, cooldown: easy ? 3.5 : hard ? 2.5 : 3 };
  }

  function clearLeg(from: Farm.Point, to: Farm.Point, margin = RADIUS + 1): boolean {
    const a = center(from), b = center(to);
    if (b.x < margin || b.y < margin || b.x > WORLD.width - margin || b.y > WORLD.height - margin) return false;
    return OBSTACLES.every(rect => rect.blocking === false || !DetectionSystem.segmentIntersectsRect(a, b,
      { x: rect.x - margin, y: rect.y - margin, w: rect.w + margin * 2, h: rect.h + margin * 2 }));
  }

  function chooseHome(): Farm.Point | null {
    const pond = STRUCTURES.pond;
    const candidates: Farm.Point[] = [];
    // Rotate the shoreline choices without consuming the world's random sequence.
    const offset = (WORLD.layout.seed >>> 0) % 4;
    for (const gap of [65, 100, 140, 185]) {
      const sides = [
        { x: pond.x + pond.w / 2, y: pond.y + pond.h + gap },
        { x: pond.x - gap, y: pond.y + pond.h / 2 },
        { x: pond.x + pond.w / 2, y: pond.y - gap },
        { x: pond.x + pond.w + gap, y: pond.y + pond.h / 2 },
      ];
      for (let i = 0; i < 4; i++) candidates.push(sides[(i + offset) % 4]);
    }
    for (const path of WORLD.paths) candidates.push({ x: path.x + path.w / 2, y: path.y + path.h / 2 });
    return candidates.find(p => p.y >= 65 && p.x >= 50 && p.x <= WORLD.width - 50 &&
      distance(p, WORLD.layout.start) > 430 &&
      distance(p, WORLD.safeZone) > WORLD.safeZone.r + TERRITORY &&
      WORLD.layout.animalSpawns.every(a => distance(a, p) > 75) &&
      clearLeg(p, p, 38)) || null;
  }

  function initialize(game: Farm.GameState): void {
    const home = chooseHome();
    if (!home) { delete game.entities.goose; return; }
    game.entities.goose = { id: 'pond-goose', type: 'goose', ...home,
      radius: 25, hitbox: { ox: 0, oy: OFFSET_Y, r: RADIUS },
      vx: 0, vy: 0, facing: 1, direction: 'down', moving: false, anim: 0,
      areaId: getAreaAt(home.x, home.y).id, state: 'idle', mode: game.lake?.completed ? 'defeated' : 'patrol',
      home: point(home), anchor: point(home), target: point(home), timer: .8,
      cooldown: 0, grace: 2, honkCooldown: 0, patrolIndex: 0, notice: 0,
      chargeHit: false, chargeCounted: false, attempts: 0, noticedPoint: null, stuck: 0 };
  }

  function visible(game: Farm.GameState, goose: Farm.Goose): boolean {
    const chicken = game.entities.chicken;
    return distance(chicken, goose) < 440 &&
      DetectionSystem.hasLineOfSight(getHitbox(chicken), getHitbox(goose));
  }

  function canNotice(game: Farm.GameState, goose: Farm.Goose, config: Farm.GooseConfig): boolean {
    const chicken = game.entities.chicken;
    return !chicken.hidden && chicken.invulnerable <= 0 && goose.grace <= 0 &&
      distance(chicken, goose.home) <= config.territory && distance(chicken, goose) <= config.alertRange &&
      DetectionSystem.hasLineOfSight(getHitbox(goose), getHitbox(chicken));
  }

  function canCommit(game: Farm.GameState, goose: Farm.Goose, config: Farm.GooseConfig): boolean {
    const chicken=game.entities.chicken;
    // Acquisition range is not a dodge boundary. Once warned, the marked line
    // remains fixed while the player moves aside anywhere inside the encounter.
    return !chicken.hidden && chicken.invulnerable<=0 &&
      distance(chicken,goose.home)<=(game.lake?.active?LakeChallenge.radius:config.territory) &&
      DetectionSystem.hasLineOfSight(getHitbox(goose),getHitbox(chicken));
  }

  function honk(game: Farm.GameState, goose: Farm.Goose): void {
    if (goose.honkCooldown > 0) return;
    goose.honkCooldown = 4;
    goose.notice = 1.5;
    const gap = distance(goose, game.entities.chicken);
    if (gap < 440) AudioSystem.play('goose-honk', { volume: .65 * (1 - gap / 600) });
    if (!game.lake?.active) WolfAI.investigateSound(game, point(goose), 360);
  }

  function recover(goose: Farm.Goose, config: Farm.GooseConfig): void {
    goose.mode = 'recover'; goose.timer = .65; goose.cooldown = config.cooldown;
    goose.moving = false; goose.vx = 0; goose.vy = 0;
  }

  function peck(game: Farm.GameState, goose: Farm.Goose, config: Farm.GooseConfig): boolean {
    const chicken = game.entities.chicken;
    if (game.phase !== 'playing' || goose.mode !== 'charge' || chicken.hidden || chicken.invulnerable > 0 ||
      !circleVsCircle(goose, chicken) || !DetectionSystem.hasLineOfSight(getHitbox(goose), getHitbox(chicken))) return false;
    goose.chargeHit = true;
    const dx = chicken.x - goose.x, dy = chicken.y - goose.y, length = Math.hypot(dx, dy);
    const fallback = Math.atan2(goose.target.y - goose.anchor.y, goose.target.x - goose.anchor.x);
    Player.move(chicken, (length > .01 ? dx / length : Math.cos(fallback)) * 52,
      (length > .01 ? dy / length : Math.sin(fallback)) * 52);
    chicken.vx = 0; chicken.vy = 0; chicken.sprinting = false;
    // A brief shield prevents a goose bump from becoming an unavoidable wolf hit.
    chicken.invulnerable = Math.max(chicken.invulnerable, .9);
    recover(goose, config); goose.notice = 1.2;
    AudioSystem.play('bonk', { volume: .38 });
    spawnBurst(chicken.x, chicken.y, '#fff0c9', 8);
    setStatus(game.lake?.active ? `Ele acertou! Ainda ${game.lake.misses}/3. Espere o aviso e saia da linha.` :
      'Xô! PANTO deu um empurrão. Contorne o lago ou desvie da investida!');
    GameManager.save(game);
    return true;
  }

  function advance(game: Farm.GameState, goose: Farm.Goose, target: Farm.Point, amount: number,
    config: Farm.GooseConfig, attacking = false): boolean {
    const dx = target.x - goose.x, dy = target.y - goose.y, length = Math.hypot(dx, dy);
    if (length < .01) return true;
    const travel = Math.min(length, amount), steps = Math.max(1, Math.ceil(travel / 6));
    for (let i = 0; i < steps; i++) {
      const next = { x: goose.x + dx / length * travel / steps, y: goose.y + dy / length * travel / steps };
      if (distance(next, goose.home) > config.territory || !clearLeg(goose, next)) return false;
      goose.x = next.x; goose.y = next.y;
      if (attacking && peck(game, goose, config)) return false;
    }
    Player.face(goose, dx, dy);
    return length <= amount + .01;
  }

  function chargeTarget(goose: Farm.Goose, origin: Farm.Point, observed: Farm.Point, config: Farm.GooseConfig): Farm.Point {
    const dx=observed.x-origin.x,dy=observed.y-origin.y,length=Math.hypot(dx,dy)||1;
    let target=point(origin);
    for(let step=6;step<=config.chargeSpeed*config.chargeSeconds;step+=6) {
      const next={x:origin.x+dx/length*step,y:origin.y+dy/length*step};
      if(distance(next,goose.home)>config.territory||!clearLeg(target,next))break;
      target=next;
    }
    return target;
  }

  function makeRoom(goose: Farm.Goose, observed: Farm.Point, config: Farm.GooseConfig): boolean {
    const candidates: Farm.Point[]=[];
    for(const radius of [40,64,88])for(let i=0;i<8;i++)
      candidates.push({x:goose.home.x+Math.cos(i*Math.PI/4)*radius,y:goose.home.y+Math.sin(i*Math.PI/4)*radius});
    candidates.sort((a,b)=>distance(a,goose)-distance(b,goose));
    const target=candidates.find(p=>distance(p,goose)>=24&&clearLeg(goose,p)&&clearLeg(goose.home,p)&&
      distance(p,observed)<=config.alertRange&&DetectionSystem.hasLineOfSight(center(p),center(observed))&&
      distance(p,chargeTarget(goose,p,observed,config))>=60);
    if(!target)return false;
    goose.mode='reposition';goose.anchor=point(goose);goose.target=target;goose.timer=2;
    return true;
  }

  function warn(game: Farm.GameState, goose: Farm.Goose, config: Farm.GooseConfig): void {
    const chicken=game.entities.chicken, target=chargeTarget(goose,goose,chicken,config);
    if(distance(goose,target)<36&&!circleVsCircle(goose,chicken)) {
      // Never ask the player to dodge a charge that cannot leave its starting corner.
      if(!makeRoom(goose,point(chicken),config))recover(goose,config);
      return;
    }
    goose.attempts = (goose.attempts || 0) + 1;
    const feint = game.difficultyKey !== 'easy' && goose.attempts % 3 === 0;
    goose.mode = feint ? 'feint' : 'warning'; goose.timer = feint ? .55 : config.warning; goose.anchor = point(goose);
    goose.chargeHit = false; goose.chargeCounted = false;
    const dx = chicken.x - goose.x, dy = chicken.y - goose.y;
    // Lock the direction at the warning, not at impact. The player can bait and dodge it.
    goose.target=target;
    Player.face(goose, dx, dy);
    honk(game, goose);
    setStatus(feint ? 'Só um blefe! Espere a linha de investida. Blefes não contam.' :
      'HÓÓÓNK! PANTO vai avançar na direção marcada. Saia da frente!');
  }

  function patrolTarget(goose: Farm.Goose): Farm.Point {
    // Every patrol leg passes through home, so a dash has a known, reversible return path.
    if (goose.patrolIndex % 2 === 0) return point(goose.home);
    const angle = Math.PI / 2 * (Math.floor(goose.patrolIndex / 2) % 4) + (WORLD.layout.seed % 8) * Math.PI / 4;
    const target = { x: goose.home.x + Math.cos(angle) * 34, y: goose.home.y + Math.sin(angle) * 34 };
    return clearLeg(goose.home, target) ? target : point(goose.home);
  }

  function update(game: Farm.GameState, dt: number): void {
    const goose = game.entities.goose;
    if (game.phase !== 'playing' || !goose || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, .1);
    const config = getConfig(game), before = point(goose);
    goose.cooldown = Math.max(0, goose.cooldown - dt);
    goose.grace = Math.max(0, goose.grace - dt);
    goose.honkCooldown = Math.max(0, goose.honkCooldown - dt);
    goose.notice = Math.max(0, goose.notice - dt);
    goose.timer = Math.max(0, goose.timer - dt);
    if (goose.mode === 'patrol') {
      if (goose.cooldown <= 0 && canNotice(game, goose, config)) {
        goose.mode = 'notice'; goose.timer = .35; goose.noticedPoint = point(game.entities.chicken);
        Player.face(goose, goose.noticedPoint.x-goose.x, goose.noticedPoint.y-goose.y);
      }
      else if (goose.timer <= 0) {
        if (advance(game, goose, patrolTarget(goose), 38 * dt, config)) {
          goose.patrolIndex = (goose.patrolIndex + 1) % 8; goose.timer = .65;
        }
      }
    } else if (goose.mode === 'notice') {
      if (!canNotice(game, goose, config)) recover(goose, config);
      else {
        goose.noticedPoint = point(game.entities.chicken);
        Player.face(goose,goose.noticedPoint.x-goose.x,goose.noticedPoint.y-goose.y);
        if (goose.timer <= 0) warn(game,goose,config);
      }
    } else if (goose.mode === 'reposition') {
      if(game.entities.chicken.hidden || distance(game.entities.chicken,goose.home)>config.territory)recover(goose,config);
      else {
        const arrived=advance(game,goose,goose.target,70*dt,config);
        if(arrived){goose.mode='patrol';goose.anchor=point(goose.home);goose.timer=.3;goose.cooldown=.3;goose.patrolIndex=0;}
        else if(goose.timer<=0||distance(before,goose)<.01)recover(goose,config);
      }
    } else if (goose.mode === 'feint') {
      if (!canCommit(game,goose,config) || goose.timer <= 0) {
        recover(goose,config); goose.cooldown = Math.max(1.1, config.cooldown*.5);
      }
    } else if (goose.mode === 'warning') {
      if (!canCommit(game, goose, config)) recover(goose, config);
      else if (goose.timer <= 0) { goose.mode = 'charge'; goose.timer = config.chargeSeconds; }
    } else if (goose.mode === 'charge') {
      if (!peck(game, goose, config)) {
        const arrived = advance(game, goose, goose.target, config.chargeSpeed * dt, config, true);
        if (goose.mode === 'charge' && (arrived || goose.timer <= 0 || distance(before, goose) < .01)) {
          const counted = arrived && LakeChallenge.recordMiss(game,goose);
          if (!game.lake?.completed) {
            recover(goose,config);
            if (counted || distance(goose,goose.anchor) >= 36) { goose.mode='stunned'; goose.timer=1.05; }
          }
        }
      }
    } else if (goose.mode === 'stunned') {
      if (goose.timer <= 0) recover(goose,config);
    } else if (goose.mode === 'defeated') {
      const destination = distance(goose,goose.anchor)>.1 ? goose.anchor : goose.home;
      advance(game,goose,destination,55*dt,config);
      if (distance(goose,goose.anchor)<.1) goose.anchor=point(goose.home);
      if (distance(goose,goose.home)<.1) goose.direction='down';
    } else if (goose.mode === 'recover') {
      if (goose.timer <= 0) goose.mode = 'return';
    } else {
      const destination = distance(goose, goose.anchor) > .1 ? goose.anchor : goose.home;
      if (advance(game, goose, destination, 115 * dt, config) && distance(goose, goose.home) < .1) {
        goose.mode = 'patrol'; goose.patrolIndex = 1; goose.timer = .8;
        goose.cooldown = Math.max(goose.cooldown, .8); goose.anchor = point(goose.home);
      } else if (distance(goose, goose.anchor) < .1) goose.anchor = point(goose.home);
    }
    goose.vx = (goose.x - before.x) / dt; goose.vy = (goose.y - before.y) / dt;
    goose.moving = distance(before, goose) > .01; goose.state = goose.moving ? 'walk' : 'idle';
    goose.anim += dt * (goose.mode === 'charge' ? 16 : goose.moving ? 7 : 2);
    goose.areaId = getAreaAt(goose.x, goose.y).id;
  }

  function snapshot(game: Farm.GameState): Farm.GooseSnapshot | undefined {
    const goose = game.entities.goose;
    return goose ? { ...point(goose), anchor: point(goose.mode === 'patrol' ? goose.home : goose.anchor),
      patrolIndex: goose.patrolIndex, cooldown: goose.cooldown } : undefined;
  }

  function isPoint(value: unknown): value is Farm.Point {
    if (!value || typeof value !== 'object') return false;
    const p = value as Record<string, unknown>;
    return typeof p.x === 'number' && Number.isFinite(p.x) && typeof p.y === 'number' && Number.isFinite(p.y);
  }

  function restore(game: Farm.GameState, saved: unknown): void {
    initialize(game);
    const goose = game.entities.goose;
    if (!goose || !isPoint(saved)) return;
    const record = saved as Farm.Point & Record<string, unknown>;
    const anchor = isPoint(record.anchor) ? record.anchor : goose.home;
    if (distance(saved, goose.home) > TERRITORY || distance(anchor, goose.home) > TERRITORY ||
      !clearLeg(saved, saved) || !clearLeg(goose.home, anchor) || !clearLeg(anchor, saved)) return;
    goose.x = saved.x; goose.y = saved.y; goose.anchor = point(anchor);
    goose.patrolIndex = typeof record.patrolIndex === 'number' && Number.isInteger(record.patrolIndex) ?
      clamp(record.patrolIndex, 0, 7) : 0;
    goose.cooldown = typeof record.cooldown === 'number' && Number.isFinite(record.cooldown) ?
      clamp(record.cooldown, 1, 5) : 1;
    // Loading a save never resumes an attack in the middle of its warning or dash.
    goose.mode = game.lake?.completed ? 'defeated' : 'return'; goose.grace = 2;
  }

  function drawTerritory(game: Farm.GameState): void {
    const goose = game.entities.goose;
    if (!goose || game.phase !== 'playing' || game.lake?.completed || distance(game.entities.chicken, goose.home) > 500) return;
    const p = worldToScreen(goose.home);
    ctx.save(); ctx.strokeStyle = '#e8d69965'; ctx.lineWidth = 1.5; ctx.setLineDash([7, 12]);
    ctx.beginPath(); ctx.arc(p.x, p.y + OFFSET_Y, game.lake?.active ? LakeChallenge.radius : TERRITORY, 0, Math.PI * 2); ctx.stroke();
    if (goose.mode === 'warning' && visible(game, goose)) {
      const from = worldToScreen(goose), to = worldToScreen(goose.target);
      const contact=(goose.hitbox.r+game.entities.chicken.hitbox.r)*2;
      ctx.setLineDash([]);ctx.lineCap='round';ctx.strokeStyle='#f4bf5730';ctx.lineWidth=contact;
      ctx.beginPath();ctx.moveTo(from.x,from.y+OFFSET_Y);ctx.lineTo(to.x,to.y+OFFSET_Y);ctx.stroke();
      ctx.strokeStyle = '#f4bf57'; ctx.lineWidth = 4; ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.moveTo(from.x, from.y + OFFSET_Y); ctx.lineTo(to.x, to.y + OFFSET_Y); ctx.stroke();
      ctx.setLineDash([]); ctx.beginPath(); ctx.arc(to.x, to.y + OFFSET_Y, 6, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  function drawIndicator(game: Farm.GameState): void {
    const goose = game.entities.goose;
    if (!goose || game.phase !== 'playing' || !visible(game, goose)) return;
    if (goose.mode === 'defeated' && (game.skinNotice?.time || 0) > 0) return;
    const p = worldToScreen(goose);
    if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) return;
    const speaking = ['notice','warning','feint','charge','stunned','defeated'].includes(goose.mode) || goose.notice > 0;
    ctx.save(); const x = clamp(p.x, 80, canvas.width - 80), y = Math.max(50, p.y - (speaking ? 96 : 69));
    ctx.fillStyle = '#503b27'; ctx.beginPath(); ctx.roundRect(x - (speaking ? 72 : 35), y - 19, speaking ? 144 : 70, speaking ? 44 : 27, 5); ctx.fill();
    ctx.fillStyle = '#f4d28c'; ctx.font = 'bold 12px Trebuchet MS, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('PANTO',x,y);
    if (speaking) {
      ctx.fillStyle = '#fff1be';
      ctx.fillText(goose.mode === 'defeated' ? 'Pode passar…' : goose.mode === 'stunned' ? 'Cadê você?!' :
        goose.mode === 'notice' ? 'Quem vem lá?' : goose.mode === 'feint' ? 'Só um blefe…' :
        goose.mode === 'warning' ? 'HÓÓÓNK! Desvie!' : goose.mode === 'charge' ? 'Sai do meu lago!' : 'Xô! Xô!', x, y + 17);
    }
    ctx.restore();
  }

  return { initialize, update, getConfig, snapshot, restore, visible, drawTerritory, drawIndicator };
})();
