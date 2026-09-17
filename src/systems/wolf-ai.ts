/* One persistent wolf crosses the farm using remembered observations and safe paths. */
const WolfAI = (() => {
  const levels: Farm.WolfTier[] = [
    { speedScale: 1.12, range: 340, fov: 92, closeRange: 48, noiseRange: 120, awarenessTime: 0.62, searchDuration: 4, searchRadius: 90, searchPoints: 0 },
    { speedScale: 1.24, range: 430, fov: 112, closeRange: 54, noiseRange: 140, awarenessTime: 0.50, searchDuration: 7.5, searchRadius: 130, searchPoints: 2 },
    { speedScale: 1.36, range: 520, fov: 132, closeRange: 60, noiseRange: 160, awarenessTime: 0.39, searchDuration: 11.5, searchRadius: 185, searchPoints: 4 },
    { speedScale: 1.48, range: 610, fov: 150, closeRange: 66, noiseRange: 180, awarenessTime: 0.30, searchDuration: 16, searchRadius: 245, searchPoints: 6 },
  ];
  let navigationCache: Farm.Navigation | null = null;

  function getConfig(game: Farm.GameState): Farm.WolfConfig {
    const level = Number.isFinite(game.wolfLevel) ? clamp(Math.floor(game.wolfLevel), 0, 3) : 0;
    // Labels still have four tiers; the actual challenge advances at EVERY rescue.
    const count = Number.isFinite(game.rescuedCount) ? clamp(Math.floor(game.rescuedCount), 0, 10) : 0;
    const rescuedFriends = Math.max(count, level * 3);
    const progress = rescuedFriends / 10;
    const config = Object.fromEntries((Object.keys(levels[0]) as (keyof Farm.WolfTier)[]).map(key =>
      [key, levels[0][key] + (levels[3][key] - levels[0][key]) * progress])) as unknown as Farm.WolfTier;
    config.searchPoints = Math.floor(config.searchPoints);
    const rescuedChicks = Number.isFinite(game.rescuedChicks) ? clamp(Math.floor(game.rescuedChicks), 0, 6) : 0;
    const chickMultiplier = 1 + 0.5 * rescuedChicks / 6;
    const difficulty = game.difficultyKey || "normal";
    const capSetting = game.settings.wolfSprintCap;
    const sprintCap = Number.isFinite(capSetting) ? clamp(capSetting!, 0.75, 0.96) : difficulty === "easy" ? 0.90 : 0.96;
    const sprintMultiplier = typeof Player !== "undefined" && Number.isFinite(Player.sprintMultiplier) ? Player.sprintMultiplier : 1.32;
    const nominalSpeed = game.settings.wolfMaxSpeed * config.speedScale * chickMultiplier;
    // Chicks sharpen pursuit, but full sprint always opens a gap even at the final tier.
    const totalProgress = (rescuedFriends + rescuedChicks * .5) / 13;
    const ceilingProgress = .88 + .12 * totalProgress;
    const speed = Math.min(nominalSpeed, game.settings.chickenSpeed * sprintMultiplier * sprintCap * ceilingProgress);
    return { ...config, level, rescuedFriends, rescuedChicks, chickMultiplier, nominalSpeed, sprintCap, speed,
      pressure: config.speedScale / levels[0].speedScale * chickMultiplier,
      fov: Math.min(165, config.fov + rescuedChicks * 2.5) * Math.PI / 180,
      range: Math.min(840 * ceilingProgress, config.range * chickMultiplier),
      awarenessTime: Math.max(0.18, config.awarenessTime / chickMultiplier),
      searchDuration: Math.min(24, config.searchDuration * chickMultiplier),
      searchRadius: Math.min(310, config.searchRadius * (1 + rescuedChicks / 24)),
      hideWitnessRange: difficulty === "easy" ? 180 : difficulty === "hard" ? 260 : 220,
      hideMemoryDuration: 8 + rescuedFriends * .6,
      patrolSpeed: speed * (level === 3 ? 0.80 : 0.70), awarenessDecay: 0.9,
      contactRange: 28, soundInterval: 0.65, investigateDuration: 2.6 + level * 0.3 };
  }

  function initialize(game: Farm.GameState): void {
    Object.assign(game.entities.wolf, {
      mode: "patrol", heading: Math.PI, lastKnown: null, searchTime: 0,
      searchPoints: [], searchIndex: 0, searchOrigin: null, searchApproached: false, scanTime: 0,
      route: [], routeTarget: null, routeTimer: 0, routeMode: null,
      moveSpeed: 0, patrolIndex: 0, detected: false,
      awareness: 0, heardPoint: null, hearingCooldown: 0, investigateTime: 0,
      alertReturnMode: "patrol", patrolPause: 0, patrolScanHeading: Math.PI,
      exposedCover: null, seenVelocity: { x: 0, y: 0 }, lastSight: null, sightAge: Infinity,
      investigateReturnMode: 'patrol',
    });
  }

  // Record the visible entrance once. Hidden movement never updates this observation.
  function witnessHide(game: Farm.GameState, spot: Farm.Cover | null): boolean {
    const wolf = game.entities.wolf, chicken = game.entities.chicken, config = getConfig(game);
    if (game.phase !== "playing" || chicken.hidden || !spot || wolf.huntUnlockTimer > 0 || wolf.pauseTimer > 0 ||
      distance(wolf, chicken) > config.hideWitnessRange ||
      !DetectionSystem.canSee(wolf, chicken, { ...config, range: config.hideWitnessRange })) return false;
    wolf.exposedCover = { spotId: spot.id, x: chicken.x, y: chicken.y,
      remaining: config.hideMemoryDuration, inspectTime: 0.8 };
    wolf.lastKnown = { x: chicken.x, y: chicken.y };
    wolf.mode = "inspect"; wolf.awareness = 1; wolf.detected = true;
    wolf.route = []; wolf.routeTarget = null; wolf.routeTimer = 0; wolf.patrolPause = 0;
    wolf.speech = "EU VI VOCÊ ENTRAR AÍ!"; wolf.speechTime = 2.4;
    wolf.speechCooldown = 4; wolf.speechMode = "inspect";
    return true;
  }

  function isExposed(game: Farm.GameState): boolean {
    const memory = game.entities.wolf.exposedCover, chicken = game.entities.chicken;
    return !!(memory && memory.remaining > 0 && chicken.hidden && chicken.hidingSpotId === memory.spotId);
  }

  function canCatchHidden(game: Farm.GameState): boolean {
    const wolf = game.entities.wolf, chicken = game.entities.chicken;
    return isExposed(game) && circleVsCircle(chicken, wolf) &&
      DetectionSystem.hasLineOfSight(getHitbox(wolf), getHitbox(chicken));
  }

  function restoreCoverMemory(game: Farm.GameState, saved: Farm.CoverMemory | null | undefined): void {
    const wolf = game.entities.wolf;
    wolf.exposedCover = null;
    const spot = saved && HidingSpots.getSpots().find(item => item.id === saved.spotId);
    if (wolf.mode === "inspect" && spot && Number.isFinite(saved.x) && Number.isFinite(saved.y) &&
      saved.x >= spot.x + 8 && saved.x <= spot.x + spot.w - 8 &&
      saved.y >= spot.y + 8 && saved.y <= spot.y + spot.h - 8 &&
      Number.isFinite(saved.remaining) && saved.remaining > 0) {
      wolf.exposedCover = { spotId: spot.id, x: saved.x, y: saved.y,
        remaining: Math.min(saved.remaining, getConfig(game).hideMemoryDuration),
        inspectTime: Number.isFinite(saved.inspectTime) ? clamp(saved.inspectTime, 0, 0.8) : 0.8 };
      wolf.mode = "inspect";
      wolf.lastKnown = { x: saved.x, y: saved.y };
      wolf.awareness = 1;
    } else if (wolf.mode === "inspect") {
      beginSearch(wolf, getConfig(game));
    }
  }

  function navigation(wolf: Farm.Body): Farm.Navigation {
    const radius = wolf.hitbox ? wolf.hitbox.r : wolf.radius;
    if (navigationCache && navigationCache.source === OBSTACLES &&
      navigationCache.count === OBSTACLES.length && navigationCache.radius === radius &&
      navigationCache.width === WORLD.width && navigationCache.height === WORLD.height) return navigationCache;
    const padding = radius + 2;
    const rects = OBSTACLES.filter(rect => rect.blocking !== false).map(rect => ({
      x: rect.x - padding, y: rect.y - padding,
      w: rect.w + padding * 2, h: rect.h + padding * 2,
    }));
    const nav: Farm.Navigation = { source: OBSTACLES, count: OBSTACLES.length, radius, padding, rects,
      width: WORLD.width, height: WORLD.height, nodes: null, edges: null };
    navigationCache = nav;
    return nav;
  }

  function navigationNodes(nav: Farm.Navigation): Farm.Point[] {
    if (nav.nodes) return nav.nodes;
    nav.nodes = [];
    for (const rect of nav.rects) {
      for (const x of [rect.x - 0.5, rect.x + rect.w + 0.5]) {
        for (const y of [rect.y - 0.5, rect.y + rect.h + 0.5]) {
          const point = { x, y };
          if (freePoint(point, nav)) nav.nodes.push(point);
        }
      }
    }
    return nav.nodes;
  }

  function navigationEdges(nav: Farm.Navigation): Farm.NavigationEdge[][] {
    if (nav.edges) return nav.edges;
    // Direct routes need only obstacle checks; build the detour graph on demand.
    const nodes = navigationNodes(nav);
    nav.edges = nodes.map(() => []);
    for (let i = 0; i < nav.nodes!.length; i += 1) {
      for (let j = i + 1; j < nav.nodes!.length; j += 1) {
        if (!clearSegment(nav.nodes![i], nav.nodes![j], nav)) continue;
        const length = distance(nav.nodes![i], nav.nodes![j]);
        nav.edges[i].push({ index: j, length });
        nav.edges[j].push({ index: i, length });
      }
    }
    return nav.edges;
  }

  function freePoint(point: Farm.Point, nav: Farm.Navigation): boolean {
    return point.x >= nav.radius && point.y >= nav.radius &&
      point.x <= WORLD.width - nav.radius && point.y <= WORLD.height - nav.radius &&
      !nav.rects.some(rect => point.x >= rect.x && point.x <= rect.x + rect.w &&
        point.y >= rect.y && point.y <= rect.y + rect.h);
  }

  function clearSegment(from: Farm.Point, to: Farm.Point, nav: Farm.Navigation): boolean {
    return !nav.rects.some(rect => DetectionSystem.segmentIntersectsRect(from, to, rect));
  }

  function openPoint(point: Farm.Point, nav: Farm.Navigation): Farm.Point {
    const bounded = { x: clamp(point.x, nav.radius, WORLD.width - nav.radius),
      y: clamp(point.y, nav.radius, WORLD.height - nav.radius) };
    if (freePoint(bounded, nav)) return bounded;
    // Project obstructed destinations (hay/trees) to an accessible edge, never into a prop.
    const candidates = [...navigationNodes(nav)];
    for (const rect of nav.rects) {
      candidates.push({ x: rect.x - 0.5, y: bounded.y },
        { x: rect.x + rect.w + 0.5, y: bounded.y },
        { x: bounded.x, y: rect.y - 0.5 },
        { x: bounded.x, y: rect.y + rect.h + 0.5 });
    }
    return candidates.filter(candidate => freePoint(candidate, nav))
      .sort((a, b) => distance(a, bounded) - distance(b, bounded))[0] || bounded;
  }

  function center(entity: Farm.Body): Farm.Point {
    return { x: entity.x + (entity.hitbox?.ox || 0), y: entity.y + (entity.hitbox?.oy || 0) };
  }

  function findPath(wolf: Farm.Body, target: Farm.Point): Farm.Point[] {
    const nav = navigation(wolf);
    const offset = { x: wolf.hitbox?.ox || 0, y: wolf.hitbox?.oy || 0 };
    const start = openPoint(center(wolf), nav);
    const end = openPoint({ x: target.x + offset.x, y: target.y + offset.y }, nav);
    let path: Farm.Point[];
    if (clearSegment(start, end, nav)) {
      path = [end];
    } else {
      const graph = navigationEdges(nav);
      const nodes = [...nav.nodes!, start, end];
      const startIndex = nodes.length - 2;
      const endIndex = nodes.length - 1;
      const edges = graph.map(row => [...row]);
      edges.push([], []);
      for (const index of [startIndex, endIndex]) {
        for (let j = 0; j < startIndex; j += 1) {
          if (!clearSegment(nodes[index], nodes[j], nav)) continue;
          const length = distance(nodes[index], nodes[j]);
          edges[index].push({ index: j, length });
          edges[j].push({ index, length });
        }
      }
      const costs = nodes.map(() => Infinity);
      const previous = nodes.map(() => -1);
      const visited = new Set<number>();
      costs[startIndex] = 0;
      for (let step = 0; step < nodes.length; step += 1) {
        let current = -1;
        for (let i = 0; i < nodes.length; i += 1) {
          if (!visited.has(i) && (current < 0 || costs[i] < costs[current])) current = i;
        }
        if (current < 0 || costs[current] === Infinity || current === endIndex) break;
        visited.add(current);
        for (const edge of edges[current]) {
          const next = costs[current] + edge.length;
          if (next >= costs[edge.index]) continue;
          costs[edge.index] = next;
          previous[edge.index] = current;
        }
      }
      if (!Number.isFinite(costs[endIndex])) return [];
      path = [];
      for (let i = endIndex; i !== startIndex; i = previous[i]) path.unshift(nodes[i]);
    }
    if (distance(center(wolf), start) > 0.01) path.unshift(start);
    return path.map(point => ({ x: point.x - offset.x, y: point.y - offset.y }));
  }

  function patrolPoints(config: Farm.WolfConfig): Farm.Point[] {
    const points = [];
    // These are public farm landmarks, independent of chicken or animal coordinates.
    for (const area of WORLD.areas) {
      points.push(area.hub ? { ...area.hub } : { x: area.x + area.w * 0.5, y: area.y + area.h * 0.55 });
      if (config.level === 3) points.push({ x: area.x + area.w * 0.78, y: area.y + area.h * 0.78 });
    }
    if (config.level === 3) points.push({ x: WORLD.safeZone.x + WORLD.safeZone.r + 55, y: WORLD.safeZone.y + 70 });
    // Each farm has a stable patrol circuit, with order chosen from its public seed.
    // Neither player movement nor undiscovered animals affect this route.
    const seed = WORLD.layout?.seed || 0;
    const offset = seed % points.length;
    const ordered = [...points.slice(offset), ...points.slice(0, offset)];
    return seed % 2 ? ordered.reverse() : ordered;
  }

  function makeSearch(wolf: Farm.Wolf, config: Farm.WolfConfig): Farm.Point[] {
    const origin = wolf.lastKnown;
    if (!origin) return [];
    const points = [{ x: origin.x, y: origin.y }];
    if (config.level === 3 && typeof HidingSpots !== "undefined") {
      const spots = HidingSpots.getSpots().map(spot => ({ x: spot.x + spot.w / 2, y: spot.y + spot.h / 2 }))
        .filter(point => distance(point, origin) <= config.searchRadius)
        .sort((a, b) => distance(a, origin) - distance(b, origin));
      points.push(...spots.slice(0, 3));
    }
    for (let i = 0; i < config.searchPoints; i += 1) {
      const velocity = wolf.seenVelocity || { x: 0, y: 0 };
      const heading = Math.hypot(velocity.x, velocity.y) > 20 ? Math.atan2(velocity.y, velocity.x) : wolf.heading;
      const angle = heading + Math.PI * 2 * i / config.searchPoints;
      const radius = config.searchRadius * (i % 2 ? 0.65 : 1);
      points.push({ x: origin.x + Math.cos(angle) * radius, y: origin.y + Math.sin(angle) * radius });
    }
    return points;
  }

  function beginSearch(wolf: Farm.Wolf, config: Farm.WolfConfig): void {
    wolf.mode = "search";
    wolf.searchTime = config.searchDuration;
    wolf.searchOrigin = wolf.lastKnown ? { ...wolf.lastKnown } : null;
    wolf.searchPoints = makeSearch(wolf, config);
    wolf.searchIndex = 0;
    wolf.searchApproached = false;
    wolf.scanTime = 0;
    wolf.route = [];
    wolf.routeTarget = null;
  }

  function stop(wolf: Farm.Wolf, dt: number): void {
    wolf.vx = 0;
    wolf.vy = 0;
    wolf.moveSpeed = 0;
    wolf.anim += dt * 3;
  }

  function turnToward(wolf: Farm.Wolf, heading: number, dt: number, rate = 4.6): void {
    const difference = Math.atan2(Math.sin(heading - wolf.heading), Math.cos(heading - wolf.heading));
    wolf.heading += clamp(difference, -rate * dt, rate * dt);
    wolf.heading = Math.atan2(Math.sin(wolf.heading), Math.cos(wolf.heading));
  }

  function resumePatrol(wolf: Farm.Wolf): void {
    wolf.mode = "patrol";
    wolf.exposedCover = null;
    wolf.searchPoints = [];
    wolf.scanTime = 0;
    wolf.heardPoint = null;
    wolf.investigateTime = 0;
    wolf.investigateReturnMode = 'patrol';
    wolf.routeTimer = 0;
  }

  function observe(wolf: Farm.Wolf, point: Farm.Point, game: Farm.GameState): void {
    const maxSpeed = game.settings.chickenSpeed * Player.sprintMultiplier;
    let velocity = { x: 0, y: 0 };
    if (wolf.lastSight && wolf.sightAge > 0 && wolf.sightAge <= .25) {
      const vx = (point.x - wolf.lastSight.x) / wolf.sightAge;
      const vy = (point.y - wolf.lastSight.y) / wolf.sightAge;
      // Ignore teleports/invalid old positions instead of inventing an enormous lead.
      if (Math.hypot(vx, vy) <= maxSpeed * 1.1) velocity = { x: vx, y: vy };
    }
    wolf.seenVelocity = velocity;
    wolf.lastSight = { ...point };
    wolf.sightAge = 0;
  }

  function pursuitTarget(wolf: Farm.Wolf, game: Farm.GameState, config: Farm.WolfConfig): Farm.Point | null {
    const observed = wolf.lastKnown;
    if (!observed || !wolf.detected) return observed;
    const velocity = wolf.seenVelocity || { x: 0, y: 0 };
    const lead = Math.min(game.difficultyKey === 'easy' ? .18 : game.difficultyKey === 'hard' ? .42 : .32,
      distance(wolf, observed) / Math.max(1, config.speed) * .3);
    const proposed = { x: observed.x + velocity.x * lead, y: observed.y + velocity.y * lead };
    const nav = navigation(wolf), offset = wolf.hitbox || { ox: 0, oy: 0 };
    const from = { x: observed.x + offset.ox, y: observed.y + offset.oy };
    const to = { x: proposed.x + offset.ox, y: proposed.y + offset.oy };
    return freePoint(to, nav) && clearSegment(from, to, nav) ? proposed : observed;
  }

  function finishInvestigation(wolf: Farm.Wolf): void {
    if (wolf.investigateReturnMode === 'search' && wolf.lastKnown && wolf.searchTime > 0) {
      wolf.mode = 'search'; wolf.scanTime = 0; wolf.routeTimer = 0; wolf.routeTarget = null;
      wolf.heardPoint = null; wolf.investigateReturnMode = 'patrol';
    } else resumePatrol(wolf);
  }

  function physicallyFree(point: Farm.Point, nav: Farm.Navigation): boolean {
    return point.x >= nav.radius && point.y >= nav.radius && point.x <= WORLD.width-nav.radius && point.y <= WORLD.height-nav.radius &&
      nav.source.every(rect => rect.blocking === false || Math.hypot(point.x-clamp(point.x,rect.x,rect.x+rect.w),
        point.y-clamp(point.y,rect.y,rect.y+rect.h)) >= nav.radius-.001);
  }

  function moveToward(wolf: Farm.Wolf, target: Farm.Point, speed: number, dt: number): boolean {
    wolf.routeTimer -= dt;
    const movedTarget = !wolf.routeTarget || distance(wolf.routeTarget, target) > 32;
    if (wolf.routeMode !== wolf.mode || movedTarget || wolf.routeTimer <= 0) {
      wolf.route = findPath(wolf, target);
      wolf.routeTarget = { ...target };
      wolf.routeTimer = wolf.mode === "chase" ? 0.24 : 1.2;
      wolf.routeMode = wolf.mode;
    }
    const nav = navigation(wolf);
    const original = { x: wolf.x, y: wolf.y };
    const start = openPoint(center(wolf), nav);
    // The collision resolver permits rounded corners; the route uses conservative rectangles.
    // A small projection gives the next route a clear start when a save/collision sits on an edge.
    if (distance(center(wolf), start) <= 3) {
      wolf.x = start.x - (wolf.hitbox?.ox || 0);
      wolf.y = start.y - (wolf.hitbox?.oy || 0);
    } else {
      // Rounded collision corners can be outside a real prop but inside its inflated navigation box.
      // Walk out in small verified steps; an actually embedded old save must stay put.
      const from = center(wolf), gap = distance(from, start);
      if (gap <= 32 && physicallyFree(from, nav)) {
        const step = Math.min(gap, 90 * dt);
        const next = { x: from.x + (start.x-from.x)/gap*step, y: from.y + (start.y-from.y)/gap*step };
        if ([.25,.5,.75,1].every(t => physicallyFree({x:from.x+(next.x-from.x)*t,y:from.y+(next.y-from.y)*t},nav))) {
          wolf.x = next.x - (wolf.hitbox?.ox || 0); wolf.y = next.y - (wolf.hitbox?.oy || 0);
          wolf.vx = (wolf.x-original.x)/dt; wolf.vy = (wolf.y-original.y)/dt;
          wolf.route = []; wolf.routeTimer = 0; wolf.moveSpeed = 0; wolf.anim += dt*8;
          return false;
        }
      }
      wolf.route = [];
      stop(wolf, dt);
      return false;
    }
    wolf.moveSpeed = Math.min(speed, (wolf.moveSpeed || 0) + wolf.accel * dt);
    let remaining = wolf.moveSpeed * dt;
    let arrived = false;
    while (wolf.route.length && remaining > 0) {
      const next = wolf.route[0];
      const dx = next.x - wolf.x;
      const dy = next.y - wolf.y;
      const length = Math.hypot(dx, dy);
      if (length < 0.01) { wolf.route.shift(); continue; }
      const step = Math.min(remaining, length);
      const candidate = { x: wolf.x + dx / length * step, y: wolf.y + dy / length * step };
      const nextCenter = { x: candidate.x + (wolf.hitbox?.ox || 0), y: candidate.y + (wolf.hitbox?.oy || 0) };
      if (!freePoint(nextCenter, nav) || !clearSegment(center(wolf), nextCenter, nav)) {
        wolf.route = []; wolf.routeTimer = 0; break;
      }
      wolf.x = candidate.x; wolf.y = candidate.y;
      turnToward(wolf, Math.atan2(dy, dx), dt * step / Math.max(1, wolf.moveSpeed * dt));
      remaining -= step;
      if (step >= length) { wolf.route.shift(); if (!wolf.route.length) arrived = true; }
    }
    wolf.vx = (wolf.x - original.x) / dt;
    wolf.vy = (wolf.y - original.y) / dt;
    if (!wolf.route.length) wolf.moveSpeed = 0;
    if (Math.abs(wolf.vx) > 0.1) wolf.facing = Math.sign(wolf.vx);
    wolf.anim += dt * (Math.hypot(wolf.vx, wolf.vy) > 10 ? 8 : 3);
    return arrived || (!wolf.route.length && distance(wolf, target) < 12);
  }

  function update(game: Farm.GameState, dt: number): void {
    if (game.lake?.active || game.phase !== "playing" || !Number.isFinite(dt) || dt <= 0) return;
    const wolf = game.entities.wolf;
    const config = getConfig(game);
    if (!wolf.mode) initialize(game);
    wolf.huntUnlockTimer = Math.max(0, (wolf.huntUnlockTimer || 0) - dt);
    wolf.pauseTimer = Math.max(0, (wolf.pauseTimer || 0) - dt);
    wolf.areaId = getAreaAt(wolf.x, wolf.y).id;
    wolf.hearingCooldown = Math.max(0, (wolf.hearingCooldown || 0) - dt);
    wolf.awareness = clamp(Number.isFinite(wolf.awareness) ? wolf.awareness : 0, 0, 1);
    wolf.sightAge = (wolf.sightAge ?? Infinity) + dt;
    if (wolf.exposedCover) {
      wolf.exposedCover.remaining = Math.max(0, wolf.exposedCover.remaining - dt);
      if (wolf.exposedCover.remaining <= 0) {
        wolf.exposedCover = null;
        if (wolf.mode === "inspect") beginSearch(wolf, config);
      }
    }
    if (wolf.pauseTimer > 0) { wolf.detected = false; stop(wolf, dt); return; }

    const perception = wolf.huntUnlockTimer <= 0 ?
      DetectionSystem.perceive(wolf, game.entities.chicken, config) :
      { visible: false as const, contact: false, heardPoint: null };
    wolf.detected = false;
    if (perception.visible) {
      observe(wolf, perception.seenPoint, game);
      wolf.exposedCover = null;
      // A distant glimpse gives the player time to break sight. Awareness survives brief gaps.
      const closeness = 1 - Math.min(1, perception.distance / config.range);
      wolf.awareness = Math.min(1, wolf.awareness + dt * (0.85 + closeness * 0.3) / config.awarenessTime);
      if (wolf.mode === "chase" || perception.contact || wolf.awareness >= 1) {
        wolf.awareness = 1;
        wolf.detected = true;
        wolf.lastKnown = { ...perception.seenPoint };
        wolf.mode = "chase";
        wolf.searchTime = config.searchDuration;
        wolf.scanTime = 0;
        wolf.patrolPause = 0;
      } else {
        if (wolf.mode !== "alert") wolf.alertReturnMode = wolf.mode;
        wolf.mode = "alert";
        turnToward(wolf, Math.atan2(perception.seenPoint.y - wolf.y, perception.seenPoint.x - wolf.x), dt);
        stop(wolf, dt);
        return;
      }
    } else {
      wolf.awareness = Math.max(0, wolf.awareness - config.awarenessDecay * dt);
    }
    if (!perception.visible && wolf.mode === "inspect") {
      const memory = wolf.exposedCover;
      if (!memory) beginSearch(wolf, config);
      else {
        wolf.awareness = 1;
        const arrived = moveToward(wolf, { x: memory.x, y: memory.y }, config.speed, dt);
        // At the remembered entrance, physical contact can expose the chicken. A wall cannot.
        if ((arrived || (!wolf.route.length && wolf.routeTimer > 0)) && !canCatchHidden(game)) {
          memory.inspectTime = Math.max(0, memory.inspectTime - dt);
          if (memory.inspectTime <= 0) { wolf.exposedCover = null; beginSearch(wolf, config); }
        }
        return;
      }
    }
    if (!perception.visible && wolf.mode === "chase") {
      beginSearch(wolf, config);
    }

    if (wolf.mode === "alert") {
      if (wolf.awareness > 0) { stop(wolf, dt); return; }
      wolf.mode = ["search", "investigate"].includes(wolf.alertReturnMode) ? wolf.alertReturnMode : "patrol";
      wolf.routeTimer = 0;
    }
    if (!perception.visible && perception.heardPoint && wolf.hearingCooldown <= 0) {
      if (wolf.mode !== 'investigate') wolf.investigateReturnMode = wolf.mode === 'search' ? 'search' : 'patrol';
      wolf.heardPoint = { ...perception.heardPoint };
      wolf.hearingCooldown = config.soundInterval;
      wolf.investigateTime = config.investigateDuration;
      wolf.scanTime = 0;
      wolf.mode = "investigate";
      wolf.routeTimer = 0;
    }

    let target: Farm.Point | null | undefined;
    if (wolf.mode === "investigate") {
      wolf.investigateTime = Math.max(0, (wolf.investigateTime || 0) - dt);
      if (!wolf.heardPoint || wolf.investigateTime <= 0) {
        finishInvestigation(wolf);
      } else if (wolf.scanTime > 0) {
        wolf.scanTime = Math.max(0, wolf.scanTime - dt);
        turnToward(wolf, wolf.heading + 0.9, dt, 1.4);
        stop(wolf, dt);
        return;
      } else {
        target = wolf.heardPoint;
      }
    }
    if (wolf.mode === "search") {
      // Travel to the last observation first; only then spend the investigation budget.
      if (wolf.searchApproached) wolf.searchTime = Math.max(0, wolf.searchTime - dt);
      if (!wolf.lastKnown || (wolf.searchApproached && wolf.searchTime <= 0)) {
        resumePatrol(wolf);
      } else {
        // Search waypoints are disposable; rebuild them from saved memory after loading.
        if (!wolf.searchPoints.length || !wolf.searchOrigin || distance(wolf.searchOrigin, wolf.lastKnown) > 0.01) {
          const memoryChanged = wolf.searchOrigin && distance(wolf.searchOrigin, wolf.lastKnown) > 0.01;
          wolf.searchOrigin = { ...wolf.lastKnown };
          wolf.searchPoints = makeSearch(wolf, config);
          // Rebuilding disposable routes must preserve a loaded search's progress and budget.
          if (memoryChanged) {
            wolf.searchIndex = 0;
            wolf.searchApproached = false;
            wolf.scanTime = 0;
          }
        }
        if (wolf.scanTime > 0) {
          wolf.scanTime = Math.max(0, wolf.scanTime - dt);
          turnToward(wolf, wolf.heading + 0.9, dt, 2.2);
          stop(wolf, dt);
          return;
        }
        target = wolf.searchPoints[wolf.searchIndex % wolf.searchPoints.length];
      }
    }
    if (wolf.mode === "chase") target = pursuitTarget(wolf, game, config);
    if (wolf.mode === "patrol") {
      if (wolf.patrolPause > 0) {
        wolf.patrolPause = Math.max(0, wolf.patrolPause - dt);
        turnToward(wolf, wolf.patrolScanHeading + Math.sin(wolf.patrolPause * 3) * 0.9, dt, 2);
        stop(wolf, dt);
        return;
      }
      const patrol = patrolPoints(config);
      target = patrol[wolf.patrolIndex % patrol.length];
    }
    if (target) {
      const speed = wolf.mode === "patrol" ? config.patrolSpeed : wolf.mode === "investigate" ? config.speed * 0.82 : config.speed;
      const arrived = moveToward(wolf, target, speed, dt);
      if (arrived || (!wolf.route.length && wolf.routeTimer > 0)) {
        if (wolf.mode === "patrol") {
          wolf.patrolIndex += 1;
          wolf.patrolPause = config.level === 3 ? 0.6 : 1.1;
          wolf.patrolScanHeading = wolf.heading;
        }
        if (wolf.mode === "investigate") wolf.scanTime = wolf.investigateTime;
        if (wolf.mode === "search") {
          // An unreachable first waypoint also counts as inspected, avoiding an endless search.
          if (wolf.searchIndex === 0) wolf.searchApproached = true;
          wolf.searchIndex += 1;
          wolf.scanTime = config.level >= 2 ? 0.55 : 0.8;
        }
        wolf.routeTimer = 0;
      }
    }
    wolf.areaId = getAreaAt(wolf.x, wolf.y).id;
  }

  // An environmental sound identifies its source, never the hidden player's position.
  function investigateSound(game: Farm.GameState, source: Farm.Point, radius = 360,
    reportedPoint: Farm.Point = source, acousticObstacles: Farm.Obstacle[] = OBSTACLES): boolean {
    const wolf = game.entities.wolf;
    if (game.lake?.active || game.phase !== 'playing' || wolf.huntUnlockTimer > 0 || wolf.pauseTimer > 0 ||
      ['chase', 'inspect', 'alert'].includes(wolf.mode) || !Number.isFinite(source.x) || !Number.isFinite(source.y) ||
      source.x < 0 || source.y < 0 || source.x > WORLD.width || source.y > WORLD.height ||
      !Number.isFinite(radius) || radius <= 0 || !Number.isFinite(reportedPoint.x) || !Number.isFinite(reportedPoint.y) ||
      reportedPoint.x<0 || reportedPoint.y<0 || reportedPoint.x>WORLD.width || reportedPoint.y>WORLD.height) return false;
    // Hearing is measured from the emitter. A sentinel may report one observed
    // location, but that report never becomes live knowledge of the player.
    const walls = acousticObstacles.filter(rect => rect.type !== 'pond' && rect.opaque !== false &&
      DetectionSystem.segmentIntersectsRect(wolf, source, rect)).length;
    if (distance(wolf, source) > Math.min(360, radius) * Math.pow(.6, walls)) return false;
    const config = getConfig(game);
    if (wolf.mode !== 'investigate') wolf.investigateReturnMode = wolf.mode === 'search' ? 'search' : 'patrol';
    wolf.heardPoint = { x: reportedPoint.x, y: reportedPoint.y };
    wolf.hearingCooldown = config.soundInterval; wolf.investigateTime = config.investigateDuration;
    wolf.scanTime = 0; wolf.mode = 'investigate'; wolf.detected = false;
    wolf.route = []; wolf.routeTarget = null; wolf.routeTimer = 0;
    return true;
  }

  return { initialize, update, getConfig, findPath, patrolPoints, witnessHide, isExposed, canCatchHidden, restoreCoverMemory, investigateSound };
})();
