/* Territorial state machine: attention, readable feints, fixed dashes and a peaceful defeat. */
const GooseSystem = (() => {
  const RADIUS = 17;
  const OFFSET_Y = 8;
  const TERRITORY = 220;
  const point = (p: Farm.Point): Farm.Point => ({ x: p.x, y: p.y });
  const center = (p: Farm.Point): Farm.Point => ({ x: p.x, y: p.y + OFFSET_Y });

  function getConfig(game: Farm.GameState): Farm.GooseConfig {
    const easy = game.difficultyKey === 'easy', hard = ['hard', 'hardcore'].includes(game.difficultyKey);
    const pressure = Math.min(2, game.lake?.active ? game.lake.misses : 0);
    return { territory: game.lake?.active ? LakeChallenge.radius : TERRITORY, alertRange: easy ? 135 : hard ? 190 : 165,
      warning: (easy ? 1.35 : hard ? .9 : 1.1) - pressure * .05,
      chargeSpeed: game.settings.chickenSpeed * Math.min(1.22, (easy ? .95 : hard ? 1.12 : 1.04) + pressure * .04),
      chargeSeconds: pressure===2?.83:.65, cooldown: game.lake?.active ? (easy?1.7:hard?1.1:1.4) : easy ? 3.5 : hard ? 2.5 : 3 };
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
    const home = chooseHome() || (game.lake?.gooseRescued ? FarmRefuge.gooseHome() : null);
    if (!home) { delete game.entities.goose; return; }
    game.entities.goose = { id: 'pond-goose', type: 'goose', ...home, rescued: !!game.lake?.gooseRescued,
      radius: 25, hitbox: { ox: 0, oy: OFFSET_Y, r: RADIUS },
      vx: 0, vy: 0, facing: 1, direction: 'down', moving: false, anim: 0,
      areaId: getAreaAt(home.x, home.y).id, state: 'idle', mode: game.lake?.completed ? 'defeated' : 'patrol',
      home: point(home), anchor: point(home), target: point(home), timer: .8,
      cooldown: 0, grace: 2, honkCooldown: 0, patrolIndex: 0, notice: 0,
      chargeHit: false, chargeCounted: false, attempts: 0, noticedPoint: null, stuck: 0,
      lastObserved:null,observedVelocity:{x:0,y:0},observationAge:99,dodgeSide:0,earlyDodge:false,tactic:'direct' };
    if(game.entities.goose.rescued)settle(game.entities.goose);
  }

  function settle(goose: Farm.Goose): void {
    Object.assign(goose, FarmRefuge.gooseHome(), {mode:'defeated',moving:false,vx:0,vy:0,direction:'down',state:'idle',
      chargeHit:false,chargeCounted:false,comboRemaining:0,comboFollowup:false,returnPath:[]});
    goose.areaId=getAreaAt(goose.x,goose.y).id;
  }

  function rescue(game: Farm.GameState): boolean {
    const goose=game.entities.goose;
    if(game.phase!=='playing'||game.timeRemaining===0||!goose||!game.lake?.completed||game.lake.misses!==3||game.lake.gooseRescued)return false;
    game.lake.gooseRescued=true;goose.rescued=true;
    game.score+=game.settings.rescueScore || SCORE_PER_RESCUE;
    GameManager.rewardRescueTime(game);
    settle(goose);
    refreshHud();
    return true;
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
      distance(chicken,goose.home)<=config.territory;
  }

  function canApproach(game: Farm.GameState, goose: Farm.Goose, config: Farm.GooseConfig): boolean {
    const chicken=game.entities.chicken;
    return !chicken.hidden && chicken.invulnerable<=0 && goose.grace<=0 &&
      distance(chicken,goose.home)<=config.territory &&
      DetectionSystem.hasLineOfSight(getHitbox(goose),getHitbox(chicken));
  }

  function circle(goose: Farm.Goose, observed: Farm.Point, config: Farm.GooseConfig): boolean {
    const angle=Math.atan2(observed.y-goose.y,observed.x-goose.x);
    // Try the side the visitor used last time. Space and line of sight decide
    // whether the manoeuvre is possible; the warning still locks afterwards.
    const side=goose.dodgeSide||((goose.attempts||0)%4===1?1:-1);
    for(const sign of [side,-side]) {
      const target={x:goose.x+Math.cos(angle+sign*Math.PI/2)*58,
        y:goose.y+Math.sin(angle+sign*Math.PI/2)*58};
      if(distance(target,goose.home)>config.territory-20||!clearLeg(goose,target))continue;
      goose.mode='circle';goose.tactic='flank';goose.target=target;goose.timer=1.2;return true;
    }
    return false;
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
    AudioSystem.playPlayerHurt(game);
    spawnBurst(chicken.x, chicken.y, '#fff0c9', 8);
    if(game.lake?.active)LakeChallenge.recordHit(game);
    else setStatus('PANTO fiscalizou suas penas de perto! Foi só um empurrão. Contorne o lago ou desvie da investida.');
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
      if ((distance(next, goose.home) > config.territory+.01 && distance(next,goose.home)>=distance(goose,goose.home)) || !clearLeg(goose, next)) return false;
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
    for(const radius of [48,80,112])for(let i=0;i<16;i++)
      candidates.push({x:goose.x+Math.cos(i*Math.PI/8)*radius,y:goose.y+Math.sin(i*Math.PI/8)*radius});
    candidates.sort((a,b)=>(distance(a,observed)+distance(a,goose)*.4)-(distance(b,observed)+distance(b,goose)*.4));
    const target=candidates.find(p=>distance(p,goose.home)<=config.territory-12&&clearLeg(goose,p)&&
      DetectionSystem.hasLineOfSight(center(p),center(observed))&&
      distance(p,chargeTarget(goose,p,observed,config))>=60);
    if(!target)return false;
    goose.mode='reposition';goose.target=target;goose.timer=2;
    return true;
  }

  function warn(game: Farm.GameState, goose: Farm.Goose, config: Farm.GooseConfig): void {
    const chicken=game.entities.chicken,round=game.lake?.active?game.lake.misses:-1;
    const followup=goose.comboFollowup===true;
    const velocity=goose.observedVelocity||{x:0,y:0};
    // Lead only the last visible movement before the warning. Once shown, every lane stays fixed.
    const observed=round===2?{x:chicken.x+velocity.x*.22,y:chicken.y+velocity.y*.22}:point(chicken);
    const target=chargeTarget(goose,goose,observed,config);
    if(distance(goose,target)<36&&!circleVsCircle(goose,chicken)) {
      // Never ask the player to dodge a charge that cannot leave its starting corner.
      if(!makeRoom(goose,point(chicken),config))recover(goose,config);
      return;
    }
    goose.attempts = (goose.attempts || 0) + 1;
    const feint = round===2 ? !goose.challengeFeinted : round>=0 ? false : game.difficultyKey !== 'easy' && goose.attempts>1 &&
      (goose.earlyDodge===true || (goose.attempts%3===0 && !!goose.dodgeSide));
    if(round===2&&feint)goose.challengeFeinted=true;
    if(round===1&&!followup)goose.comboRemaining=1;
    goose.comboFollowup=false;
    goose.earlyDodge=false;goose.tactic=feint?'bluff':round===2?'rush':round===1?'double':goose.tactic==='flank'?'flank':'direct';
    goose.mode = feint ? 'feint' : 'warning'; goose.timer = feint ? .6 : followup?Math.max(.72,config.warning*.78):config.warning; goose.anchor = point(goose);
    goose.warningDuration=goose.timer;
    goose.chargeHit = false; goose.chargeCounted = false;
    const dx = chicken.x - goose.x, dy = chicken.y - goose.y;
    // Lock the direction at the warning, not at impact. The player can bait and dodge it.
    goose.target=target;
    Player.face(goose, dx, dy);
    honk(game, goose);
    setStatus(feint ? 'Asa aberta, bico fechado: é blefe! A investida vem depois.' :
      followup?'SEGUNDO BOTE! PANTO virou. Desvie da nova faixa!':round===1?'BOTE DUPLO! Desvie e prepare-se para a segunda faixa.':
      round===2?'AGORA VALE! PANTO mirou sua rota. Saia da faixa comprida!':'HÓÓÓNK! Saia para o lado da faixa e aproveite quando ele ficar tonto!');
  }

  function patrolTarget(goose: Farm.Goose): Farm.Point {
    // Every patrol leg passes through home, so a dash has a known, reversible return path.
    if (goose.patrolIndex % 2 === 0) return point(goose.home);
    const angle = Math.PI / 2 * (Math.floor(goose.patrolIndex / 2) % 4) + (WORLD.layout.seed % 8) * Math.PI / 4;
    const radius=goose.patrolIndex%4===1?70:46;
    const target = { x: goose.home.x + Math.cos(angle) * radius, y: goose.home.y + Math.sin(angle) * radius };
    return clearLeg(goose.home, target) ? target : point(goose.home);
  }

  // Keep a short, traversable route home without making it part of every attack.
  function rememberReturn(goose: Farm.Goose, before: Farm.Point): void {
    if (clearLeg(goose,goose.home)) { goose.returnPath=[]; return; }
    const route=goose.returnPath ||= [];
    const shortcut=route.findIndex(p=>clearLeg(goose,p));
    if(shortcut>=0)route.splice(shortcut+1);
    else route.push(before);
  }
  function goHome(game: Farm.GameState, goose: Farm.Goose, config: Farm.GooseConfig, dt: number): boolean {
    const route=goose.returnPath ||= (clearLeg(goose,goose.home)?[]:[point(goose.anchor)]);
    const destination=route.length?route[route.length-1]:goose.home;
    if(advance(game,goose,destination,game.lake?.completed?55*dt:115*dt,config)&&route.length)route.pop();
    return distance(goose,goose.home)<.1;
  }

  function update(game: Farm.GameState, dt: number): void {
    const goose = game.entities.goose;
    if (game.phase !== 'playing' || !goose || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, .1);
    if(goose.rescued){
      settle(goose);goose.anim+=dt*2;
      goose.direction=(['down','right','down','left'] as const)[Math.floor(goose.anim/12)%4];
      return;
    }
    const config = getConfig(game), before = point(goose);
    const chicken=game.entities.chicken;
    goose.observationAge=(goose.observationAge??99)+dt;
    if(canApproach(game,goose,config)) {
      const old=goose.lastObserved,age=goose.observationAge;
      const velocity=old&&age<=.2?{x:(chicken.x-old.x)/age,y:(chicken.y-old.y)/age}:{x:0,y:0};
      goose.observedVelocity=Math.hypot(velocity.x,velocity.y)<game.settings.chickenSpeed*1.6?velocity:{x:0,y:0};
      goose.lastObserved=point(chicken);goose.observationAge=0;
      if(goose.mode==='warning'&&goose.timer>config.warning*.5) {
        const dx=goose.target.x-goose.anchor.x,dy=goose.target.y-goose.anchor.y,len=Math.hypot(dx,dy)||1;
        if(Math.abs(dx*(chicken.y-goose.anchor.y)-dy*(chicken.x-goose.anchor.x))/len>48)goose.earlyDodge=true;
      }
    }
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
      else if(goose.cooldown<=0 && canApproach(game,goose,config)) {
        goose.mode='approach';goose.timer=2.5;goose.notice=1;
      }
      else if (goose.timer <= 0) {
        if (advance(game, goose, patrolTarget(goose), 38 * dt, config)) {
          goose.patrolIndex = (goose.patrolIndex + 1) % 8; goose.timer = 1.1;
          goose.activity=goose.patrolIndex%3===0?'preen':goose.patrolIndex%3===1?'forage':'watch';
        }
      }
    } else if(goose.mode==='approach') {
      if(!canApproach(game,goose,config)||goose.timer<=0)recover(goose,config);
      else if(canNotice(game,goose,config)) {goose.mode='notice';goose.timer=.45;}
      else {
        const chicken=game.entities.chicken;
        const gap=distance(goose,chicken)||1;
        const velocity=goose.observedVelocity||{x:0,y:0};
        const aim={x:chicken.x+velocity.x*.3,y:chicken.y+velocity.y*.3};
        const leadGap=distance(goose,aim)||gap;
        const target={x:goose.x+(aim.x-goose.x)/leadGap*60*dt,y:goose.y+(aim.y-goose.y)/leadGap*60*dt};
        advance(game,goose,target,80*dt,config);
        if(distance(before,goose)<.01&&!makeRoom(goose,point(chicken),config))recover(goose,config);
      }
    } else if (goose.mode === 'notice') {
      if(goose.comboFollowup&&game.lake?.active){
        if(!canApproach(game,goose,config)){goose.comboFollowup=false;recover(goose,config);}
        else if(goose.timer<=0)warn(game,goose,config);
      }else if (!canNotice(game, goose, config)) recover(goose, config);
      else {
        goose.noticedPoint = point(game.entities.chicken);
        Player.face(goose,goose.noticedPoint.x-goose.x,goose.noticedPoint.y-goose.y);
        const velocity=goose.observedVelocity||{x:0,y:0};
        const flanking=(goose.attempts||0)%2===1||!!goose.dodgeSide||Math.hypot(velocity.x,velocity.y)>70;
        if (goose.timer <= 0 && !(flanking && circle(goose,goose.noticedPoint,config)))warn(game,goose,config);
      }
    } else if(goose.mode==='circle') {
      if(!canApproach(game,goose,config))recover(goose,config);
      else if(advance(game,goose,goose.target,75*dt,config)||goose.timer<=0||distance(before,goose)<.01)warn(game,goose,config);
    } else if (goose.mode === 'reposition') {
      if(game.entities.chicken.hidden || distance(game.entities.chicken,goose.home)>config.territory)recover(goose,config);
      else {
        const arrived=advance(game,goose,goose.target,70*dt,config);
        if(arrived){goose.mode=canNotice(game,goose,config)?'notice':'approach';goose.timer=goose.mode==='notice'?.35:2.5;}
        else if(goose.timer<=0||distance(before,goose)<.01)recover(goose,config);
      }
    } else if (goose.mode === 'feint') {
      if(game.lake?.active&&goose.timer<=0&&canApproach(game,goose,config))warn(game,goose,config);
      else if (!canCommit(game,goose,config) || goose.timer <= 0) {
        recover(goose,config); goose.cooldown = Math.max(1.1, config.cooldown*.5);
      }
    } else if (goose.mode === 'warning') {
      if (!canCommit(game, goose, config)) recover(goose, config);
      else if (goose.timer <= 0) { goose.mode = 'charge'; goose.timer = config.chargeSeconds; }
    } else if (goose.mode === 'charge') {
      if (!peck(game, goose, config)) {
        const arrived = advance(game, goose, goose.target, config.chargeSpeed * dt, config, true);
        if (goose.mode === 'charge' && (arrived || goose.timer <= 0 || distance(before, goose) < .01)) {
          if(canApproach(game,goose,config)&&!goose.chargeHit) {
            const dx=goose.target.x-goose.anchor.x,dy=goose.target.y-goose.anchor.y;
            const cross=dx*(chicken.y-goose.anchor.y)-dy*(chicken.x-goose.anchor.x);
            if(Math.abs(cross)>800)goose.dodgeSide=Math.sign(cross);
          }
          // A completed dash can stop at its time budget or against an obstacle.
          // The challenge validates real travel and contact, not exact endpoint equality.
          if(game.lake?.active&&(goose.comboRemaining||0)>0&&!goose.chargeHit&&distance(goose,goose.anchor)>=36){
            goose.comboRemaining=Math.max(0,(goose.comboRemaining||0)-1);goose.comboFollowup=true;goose.mode='notice';goose.timer=.25;
            game.lake.feedback='combo';game.lake.notice=1.4;
            // The follow-up starts from this endpoint, with its own full readable warning.
          }else{
          const counted = LakeChallenge.recordMiss(game,goose);
          if (!game.lake?.completed) {
            recover(goose,config);
            if (counted || distance(goose,goose.anchor) >= 36) { goose.mode='stunned'; goose.timer=counted?(game.lake?.counterWindow||3):1.05; }
          }
          }
        }
      }
    } else if (goose.mode === 'stunned') {
      if (goose.timer <= 0) recover(goose,config);
    } else if (goose.mode === 'defeated') {
      if(goHome(game,goose,config,dt))goose.direction='down';
    } else if (goose.mode === 'recover') {
      if (goose.timer <= 0) {
        goose.mode = game.lake?.active || canApproach(game,goose,config) ? 'patrol' : 'return';
        goose.timer=Math.max(.2,goose.cooldown);
      }
    } else {
      if(goose.cooldown<=0&&canApproach(game,goose,config)) { goose.mode='approach';goose.timer=2.5; }
      else if (goHome(game,goose,config,dt)) {
        goose.mode = 'patrol'; goose.patrolIndex = 1; goose.timer = .8;
        goose.cooldown = Math.max(goose.cooldown, .8); goose.anchor = point(goose.home);goose.tactic='direct';
      }
    }
    if(distance(before,goose)>.01)rememberReturn(goose,before);
    goose.vx = (goose.x - before.x) / dt; goose.vy = (goose.y - before.y) / dt;
    goose.moving = distance(before, goose) > .01; goose.state = goose.moving ? 'walk' : 'idle';
    goose.anim = CharacterArt.advance(goose.anim,'goose',distance(before,goose),{speed:dt>0?distance(before,goose)/dt:0});
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
    if (!goose || goose.rescued || !isPoint(saved)) return;
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
    if(goose.mode==='stunned'&&(game.lake?.counterWindow||0)>0){
      const at=worldToScreen(goose),ratio=game.lake!.counterWindow!/(game.lake!.counterDuration||3);
      ctx.setLineDash([]);ctx.fillStyle='#7bd78c25';ctx.beginPath();ctx.ellipse(at.x,at.y+OFFSET_Y,40,23,0,0,Math.PI*2);ctx.fill();
      ctx.lineWidth=4;ctx.strokeStyle='#daf6a0';ctx.beginPath();ctx.ellipse(at.x,at.y+OFFSET_Y,40,23,0,-Math.PI/2,-Math.PI/2+Math.PI*2*ratio);ctx.stroke();
    }
    if (goose.mode === 'warning' && visible(game, goose)) {
      const from = worldToScreen(goose), to = worldToScreen(goose.target);
      const contact=(goose.hitbox.r+game.entities.chicken.hitbox.r)*2;
      ctx.setLineDash([]);ctx.lineCap='round';ctx.strokeStyle='#f4bf5730';ctx.lineWidth=contact;
      ctx.beginPath();ctx.moveTo(from.x,from.y+OFFSET_Y);ctx.lineTo(to.x,to.y+OFFSET_Y);ctx.stroke();
      ctx.strokeStyle = goose.tactic==='double'?'#f69362':goose.tactic==='rush'?'#f07862':'#f4bf57'; ctx.lineWidth = 4; ctx.setLineDash([8, 6]);
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
    const speaking = !goose.rescued && (['approach','circle','notice','warning','feint','charge','stunned','defeated'].includes(goose.mode) || goose.notice > 0);
    ctx.save();ctx.font = 'bold 11px Trebuchet MS, sans-serif'; ctx.textAlign = 'center';
    if (!speaking) {
      const x=clamp(p.x,35,canvas.width-35),y=Math.max(24,p.y-69);
      const label=goose.rescued?'PANTO · A salvo':'PANTO';
      ctx.strokeStyle='#243c2ddd';ctx.lineWidth=3;ctx.lineJoin='round';ctx.strokeText(label,x,y);
      ctx.fillStyle='#fff0bd';ctx.fillText(label,x,y);
    } else {
      const line=goose.mode === 'approach' ? 'Lago tem dono!' : goose.mode === 'circle' ? 'Licença… ou não.' :
        goose.mode === 'defeated' ? 'Tá. Mas sem farra!' : goose.mode === 'stunned' ?
        (game.lake?.counterWindow||0)>0?`${GameInput.label('interact')} · Pegar carimbo`:'Culpa do vento!' :
        goose.mode === 'notice' ? 'Cadê seu crachá?' : goose.mode === 'feint' ? 'Era só teatro!' :
        goose.mode === 'warning' ? goose.tactic==='double'?((goose.comboRemaining||0)>0?'PRIMEIRO BOTE!':'SEGUNDO BOTE!'):goose.tactic==='rush'?'AGORA É PRA VALER!':'HÓÓÓNK! Desvie!' : goose.mode === 'charge' ? 'MULTA DE BICO!' : 'Sem furar fila!';
      const width=clamp((ctx.measureText(line).width||140)+22,82,216),x=clamp(p.x,width/2+8,canvas.width-width/2-8),y=Math.max(28,p.y-83);
      ctx.fillStyle='#243f32ed';ctx.beginPath();ctx.roundRect(x-width/2,y-17,width,29,8);ctx.fill();
      ctx.fillStyle='#fff1be';ctx.fillText(line,x,y+2,width-18);
      if(goose.mode==='warning'){
        ctx.fillStyle='#243f32';ctx.fillRect(x-width/2+8,y+16,width-16,5);
        ctx.fillStyle='#f4d28c';ctx.fillRect(x-width/2+9,y+17,(width-18)*clamp(1-goose.timer/(goose.warningDuration||getConfig(game).warning),0,1),3);
      }
    }
    ctx.restore();
  }

  return { initialize, update, getConfig, snapshot, restore, visible, drawTerritory, drawIndicator, rescue };
})();
