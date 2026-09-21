/* Progress belongs to the session, never to an individual region. */
const GameManager = (() => {
  const SAVE_KEY = "galinha-guardia-save-v1";
  let saveTimer = 0;
  let storageAvailable = true;
  function initialize(game: Farm.GameState): void {
    game.rescuedIds = new Set<string>();
    game.rescuedChickIds = new Set<string>();
    game.rescuedChicks = 0;
    game.wolfLevel = 0;
    game.wolfHunger = 0;
    game.elapsed = 0;
    game.timeRemaining = game.settings.timeLimit ?? null;
    game.timeBonus = 0;
    game.timeBonusRate = 0;
    game.legacyTimer = false;
    game.chickCombo = {count:0,remaining:0};
    game.timeRewardNotice = undefined;
    game.defeatReason = undefined;
    game.entities.chicken.invulnerable = 0;
    game.entities.chicken.hidden = false;
    game.entities.chicken.hideBlend = 0;
    game.entities.chicken.stamina = 1;
    game.entities.chicken.staminaDelay = 0;
    game.entities.chicken.exhausted = false;
    SkinSystem.initialize(game);
    LakeChallenge.initialize(game);
    GooseSystem.initialize(game);
    FoxSystem.initialize(game);
    OwlSystem.initialize(game);
    ThorSystem.initialize(game);
    ScarecrowSystem.initialize(game);
    saveTimer = 0;
  }
  function level(count: number): number { return count >= 9 ? 3 : count >= 6 ? 2 : count >= 3 ? 1 : 0; }
  function rescue(game: Farm.GameState, animal: Farm.Animal): boolean {
    if (animal.type !== "animal" && animal.type !== "chick") return false;
    const chick = animal.type === "chick";
    const ids = chick ? game.rescuedChickIds : game.rescuedIds;
    if (game.phase !== "playing" || game.timeRemaining === 0 || ids.has(animal.id) || (chick && !animal.discovered)) return false;
    ids.add(animal.id);
    animal.rescued = true;
    animal.discovered = true;
    animal.lost = false;
    game.rescuedCount = game.rescuedIds.size;
    game.rescuedChicks = game.rescuedChickIds.size;
    game.wolfLevel = level(game.rescuedCount);
    game.wolfHunger = Math.min(1, (game.wolfHunger || 0) + (chick ? .01 : .035));
    game.score += game.settings.rescueScore || SCORE_PER_RESCUE;
    rewardRescueTime(game, chick);
    SkinSystem.record(game);
    return true;
  }
  function rewardRescueTime(game: Farm.GameState, chick = false): number {
    if (game.phase !== 'playing' || game.timeRemaining === null || game.timeRemaining <= 0) return 0;
    let seconds = (chick ? game.settings.chickTime : game.settings.friendTime) || 0;
    if (chick && game.settings.chickCombo) {
      const combo = game.chickCombo;
      combo.count = combo.remaining > 0 ? combo.count + 1 : 1;
      combo.remaining = combo.count === 1 ? 10 : Math.min(10, combo.remaining + Math.min(7, combo.count + 1));
      seconds *= comboMultiplier(game);
    } else if (!chick) {
      const friends = game.rescuedCount + Number(!!game.lake?.gooseRescued);
      if (friends % (game.settings.friendTimeEvery || 1) !== 0) seconds = 0;
    }
    if (seconds > 0) {
      game.timeRemaining += seconds;
      game.timeRewardNotice = { time: 2.5, seconds };
    }
    return seconds;
  }
  function comboMultiplier(game: Farm.GameState): number {
    return game.chickCombo.remaining > 0 ? Math.min(10, 2 ** Math.max(0, game.chickCombo.count - 1)) : 1;
  }
  function timeScoreRate(game: Farm.GameState): number {
    return game.settings.timeScorePerChick ? game.settings.timeScorePerChick * game.rescuedChicks : game.settings.timeScore || 0;
  }
  function win(game: Farm.GameState): boolean {
    if (game.phase !== "playing" || game.rescuedIds.size !== WORLD.targetRescues) return false;
    if (game.timeRemaining === 0 && !game.winBonusApplied) return false;
    if (!game.winBonusApplied) {
      game.timeBonusRate = timeScoreRate(game);
      game.timeBonus = remainingSeconds(game) * game.timeBonusRate;
      game.score += game.lives * SCORE_BONUS_PER_LIFE + game.timeBonus;
      game.winBonusApplied = true;
    }
    startWinCutscene();
    save(game);
    return true;
  }
  function save(game: Farm.GameState): void {
    const phase = game.phase === "menu" ? game.resumePhase : game.phase;
    if (!phase) return;
    const point = (e: Farm.Point) => ({ x: e.x, y: e.y });
    const friend = (a: Farm.Animal): Farm.AnimalSnapshot => ({ id: a.id, ...point(a), discovered: !!a.discovered, coverId: a.coverId || null, lastSeen: a.lastSeen || null,
      fatigue: a.fatigue || 0, restTime: a.restTime || 0, fleeTime: a.fleeTime || 0,
      fleeFrom: a.fleeFrom || null, fleeHeading: a.fleeHeading ?? null });
    const wolf = game.entities.wolf, chicken = game.entities.chicken;
    const data: Farm.SaveData = {
      version: 5, worldSeed: game.worldSeed, worldVersion: game.worldVersion, difficulty: game.difficultyKey, phase,
      rescuedIds: [...game.rescuedIds], lives: game.lives, score: game.score, winBonusApplied: game.winBonusApplied,
      rescuedChickIds: [...game.rescuedChickIds],
      timerMode: 'arcade', timeRemaining: game.timeRemaining, timeBonus: game.timeBonus, defeatReason: game.defeatReason,
      chickCombo: {...game.chickCombo}, timeBonusRate: game.timeBonusRate, legacyTimer: game.legacyTimer,
      elapsed: game.elapsed, wolfHunger: game.wolfHunger, chicken: { ...point(chicken), hidden: chicken.hidden,
        hidingSpotId: chicken.hidingSpotId || null, direction: chicken.direction,
        stamina: chicken.stamina, staminaDelay: chicken.staminaDelay, exhausted: chicken.exhausted },
      wolf: { ...point(wolf), mode: wolf.mode, lastKnown: wolf.lastKnown,
        searchTime: wolf.searchTime, patrolIndex: wolf.patrolIndex, heading: wolf.heading,
        huntUnlockTimer: wolf.huntUnlockTimer, awareness: wolf.awareness, heardPoint: wolf.heardPoint,
        hearingCooldown: wolf.hearingCooldown, investigateTime: wolf.investigateTime,
        alertReturnMode: wolf.alertReturnMode, patrolPause: wolf.patrolPause,
        patrolScanHeading: wolf.patrolScanHeading, searchApproached: wolf.searchApproached,
        searchIndex: wolf.searchIndex, scanTime: wolf.scanTime, exposedCover: wolf.exposedCover || null,
        seenVelocity: wolf.seenVelocity, investigateReturnMode: wolf.investigateReturnMode,
        fearTime: wolf.fearTime || 0, fearFrom: wolf.fearFrom || null },
      animals: game.entities.animals.map(friend),
      chicks: game.entities.chicks.map(friend),
      goose: GooseSystem.snapshot(game),
      foxes: FoxSystem.snapshot(game), owls: OwlSystem.snapshot(game),
      thor: ThorSystem.snapshot(game),
      lake: LakeChallenge.snapshot(game),
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); storageAvailable = true; }
    catch (_) { storageAvailable = false; }
  }
  function read(): Farm.SaveData | null {
    try {
      // Parsing is followed by the existing structural/identity checks below; a type alone cannot validate storage.
      const data = JSON.parse(localStorage.getItem(SAVE_KEY)!) as Farm.SaveData | null;
      if (!data || ![1, 2, 3, 4, 5].includes(data.version) || !DIFFICULTIES[data.difficulty]) return null;
      if (data.version >= 2 && (!Number.isInteger(data.worldSeed) || data.worldSeed < 0 || data.worldSeed > 4294967295)) return null;
      if (data.version === 1) data.worldSeed = 20260915;
      if (data.worldVersion === undefined) data.worldVersion = 1;
      if (![1, 2, 3, 4, 5, 6, 7].includes(data.worldVersion)) return null;
      const expectedFriends = data.worldVersion >= 7 ? 12 : 10;
      if (!Array.isArray(data.rescuedIds) || !Array.isArray(data.animals)) return null;
      // Older builds stored a defeat as a healed, resumable adventure.
      // Keep its result, but require a fresh attempt under the current rules.
      if (data.needsRecovery === true) { data.phase = 'lose'; data.lives = 0; }
      delete data.needsRecovery;
      const timedOut = data.defeatReason === 'timeout' && !!DIFFICULTIES[data.difficulty].timeLimit && data.timeRemaining === 0;
      if (!Number.isInteger(data.lives) || data.lives < 0 || data.lives > MAX_LIVES ||
        (data.phase === 'lose' ? !timedOut && data.lives !== 0 : data.lives === 0)) return null;
      if (!Number.isFinite(data.score) || data.score < 0) return null;
      if (!["playing", "lose", "win_cutscene", "won"].includes(data.phase)) return null;
      const validPoint = (p: Farm.Point | null | undefined) => p && Number.isFinite(p.x) && Number.isFinite(p.y) &&
        p.x >= 0 && p.x <= WORLD.width && p.y >= 0 && p.y <= WORLD.height;
      if (!validPoint(data.chicken) || !validPoint(data.wolf)) return null;
      const ids = new Set(Array.from({ length: expectedFriends }, (_, i) => `animal_${i}`));
      if (data.rescuedIds.some(id => !ids.has(id)) || new Set(data.rescuedIds).size !== data.rescuedIds.length) return null;
      if (data.animals.length !== expectedFriends || new Set(data.animals.map(a => a.id)).size !== expectedFriends ||
        data.animals.some(a => !ids.has(a.id) || !validPoint(a))) return null;
      if (["win_cutscene", "won"].includes(data.phase) && data.rescuedIds.length !== expectedFriends) return null;
      if (data.version >= 3) {
        const chickCount = data.version >= 5 ? DIFFICULTIES[data.difficulty].bonusChicks || WORLD.targetChicks : WORLD.targetChicks;
        const chickIds = new Set(Array.from({ length: chickCount }, (_, i) => `chick_${i}`));
        if (!Array.isArray(data.rescuedChickIds) || !Array.isArray(data.chicks) ||
          data.rescuedChickIds.some(id => !chickIds.has(id)) || new Set(data.rescuedChickIds).size !== data.rescuedChickIds.length ||
          data.chicks.length !== chickCount || new Set(data.chicks.map(c => c.id)).size !== chickCount ||
          data.chicks.some(c => !chickIds.has(c.id) || !validPoint(c))) return null;
        if (data.version === 3 && ["win_cutscene", "won"].includes(data.phase) && data.rescuedChickIds.length !== WORLD.targetChicks) return null;
      } else {
        // Old adventures retain their score; their optional bonuses start undiscovered.
        data.rescuedChickIds = [];
        data.chicks = [];
        if (data.phase !== 'lose') data.phase = "playing";
      }
      if(data.worldVersion<7) {
        // Keep the last old-map adventure recoverable before the one-time upgrade.
        try { if(!localStorage.getItem('galinha-guardia-save-before-map-7'))
          localStorage.setItem('galinha-guardia-save-before-map-7',JSON.stringify(data)); } catch (_) { /* Saving may be unavailable. */ }
      }
      return data;
    } catch (_) { return null; }
  }
  function restore(game: Farm.GameState, data: Farm.SaveData): void {
    game.difficultyKey = data.difficulty;
    game.settings = DIFFICULTIES[data.difficulty];
    game.entities.chicken.speed = game.settings.chickenSpeed;
    const seed = data.worldSeed ?? 20260915;
    const previousVersion = data.worldVersion ?? 1;
    const migrating = previousVersion<7;
    const newGeography = previousVersion<5 || data.version===1;
    const worldVersion = 7;
    if (game.worldSeed !== seed || game.worldVersion !== worldVersion) {
      MapManager.generate(seed, worldVersion); buildObstacles(); game.worldSeed = seed;
      game.worldVersion = worldVersion;
    }
    if (game.entities.animals.length !== WORLD.layout.animalSpawns.length)
      game.entities.animals = spawnAnimals(game.settings, game.entities.wolf);
    if (game.entities.chicks.length !== (game.settings.bonusChicks || WORLD.targetChicks))
      game.entities.chicks = spawnChicks(game.settings);
    LakeChallenge.restore(game, data.lake);
    game.rescuedIds = new Set(data.rescuedIds);
    // A finished adventure stays finished; an ongoing one gets two new friends to find.
    if (migrating && data.rescuedIds.length === 10)
      for (const animal of game.entities.animals) game.rescuedIds.add(animal.id);
    game.rescuedCount = game.rescuedIds.size;
    game.rescuedChickIds = new Set(data.rescuedChickIds || []);
    game.rescuedChicks = game.rescuedChickIds.size;
    SkinSystem.record(game, false);
    game.wolfLevel = level(game.rescuedCount);
    game.lives = data.lives;
    game.score = data.score;
    game.elapsed = Number.isFinite(data.elapsed) ? Math.max(0, data.elapsed!) : 0;
    game.wolfHunger = Number.isFinite(data.wolfHunger) ? clamp(data.wolfHunger!, 0, 1) : 0;
    const bounded = (value: number | null | undefined, min: number, max: number, fallback = min): number => Number.isFinite(value) ? clamp(value!, min, max) : fallback;
    // Earned time can exceed the starting clock. Loading never awards rescues again.
    const maxChickTime = Array.from({length:game.rescuedChicks}, (_, i) =>
      (game.settings.chickTime || 0) * (game.settings.chickCombo ? Math.min(10, 2 ** i) : 1)).reduce((sum, n) => sum + n, 0);
    const allowance = (game.settings.timeLimit || 0) +
      Math.floor((game.rescuedCount + Number(!!game.lake?.gooseRescued)) / (game.settings.friendTimeEvery || 1)) *
      (game.settings.friendTime || 0) + maxChickTime;
    const finished = ['won', 'win_cutscene', 'lose'].includes(data.phase);
    // Ongoing fixed-timer saves switch once to a fresh arcade clock; past results stay intact.
    const savedTime = data.timerMode === 'arcade' || finished ? data.timeRemaining : undefined;
    game.legacyTimer = data.legacyTimer === true || (data.version < 5 && data.timerMode === 'arcade');
    // Finished runs may still show the old ten-minute clock after repeated migrations.
    game.timeRemaining = game.settings.timeLimit ? bounded(savedTime, 0,
      finished || game.legacyTimer ? Math.max(600, allowance) : allowance, game.settings.timeLimit) : null;
    game.timeBonus = bounded(data.timeBonus, 0, Number.MAX_SAFE_INTEGER);
    game.timeBonusRate = bounded(data.timeBonusRate, 0, Number.MAX_SAFE_INTEGER,
      data.version < 5 && game.timeBonus ? data.difficulty === 'hardcore' ? 10000 : 1000 : timeScoreRate(game));
    game.chickCombo = {count:0,remaining:0};
    if(game.settings.chickCombo && data.chickCombo && Number.isInteger(data.chickCombo.count) &&
      data.chickCombo.count > 0 && data.chickCombo.count <= game.rescuedChicks &&
      Number.isFinite(data.chickCombo.remaining) && data.chickCombo.remaining > 0 && data.chickCombo.remaining <= 10)
      game.chickCombo = {...data.chickCombo};
    game.timeRewardNotice = undefined;
    game.defeatReason = data.defeatReason === 'timeout' && game.timeRemaining === 0 ? 'timeout' : undefined;
    const restoreFriend = (animal: Farm.Animal, saved: Farm.FriendSnapshot) => {
      animal.sharedAlarm=true;
      animal.discovered = animal.rescued || saved.discovered === true;
      animal.lastSeen = animal.discovered && Number.isFinite(saved.lastSeen?.x) && Number.isFinite(saved.lastSeen?.y)
        ? { x: bounded(saved.lastSeen!.x, 0, WORLD.width), y: bounded(saved.lastSeen!.y, 0, WORLD.height) } : null;
      animal.fatigue = bounded(saved.fatigue, 0, 8);
      animal.restTime = bounded(saved.restTime, 0, 3.1);
      animal.fleeTime = bounded(saved.fleeTime, 0, .9);
      const memory = saved.fleeFrom;
      animal.fleeFrom = memory && ['player','wolf'].includes(memory.kind) && Number.isFinite(memory.x) && Number.isFinite(memory.y) &&
        memory.x >= 0 && memory.x <= WORLD.width && memory.y >= 0 && memory.y <= WORLD.height ?
        { x: memory.x, y: memory.y, kind: memory.kind } : null;
      animal.fleeHeading = Number.isFinite(saved.fleeHeading) ? bounded(saved.fleeHeading,-Math.PI,Math.PI) : null;
      animal.stuckTime = 0; animal.wanderTime = 1;
      animal.speechTime = 0;
    };
    const chicken = game.entities.chicken;
    const playerPosition=newGeography?WORLD.layout.start:data.chicken;
    Object.assign(chicken, { x: playerPosition.x, y: playerPosition.y, invulnerable: 2,
      stamina: bounded(data.chicken.stamina, 0, 1, 1),
      staminaDelay: bounded(data.chicken.staminaDelay, 0, 0.65), exhausted: data.chicken.exhausted === true,
      direction: ["up", "down", "left", "right"].includes(data.chicken.direction!) ? data.chicken.direction! : "down",
      vx: 0, vy: 0, moving: false, sprinting: false, state: "idle" });
    const wolf = game.entities.wolf;
    WolfAI.clearTracks(game);
    wolf.x = data.wolf.x; wolf.y = data.wolf.y;
    wolf.mode = ["patrol", "alert", "investigate", "chase", "search", "inspect"].includes(data.wolf.mode!) ? data.wolf.mode! : "patrol";
    const last = data.wolf.lastKnown;
    wolf.lastKnown = last && Number.isFinite(last.x) && Number.isFinite(last.y)
      ? { x: clamp(last.x, 0, WORLD.width), y: clamp(last.y, 0, WORLD.height) } : null;
    wolf.searchTime = Number.isFinite(data.wolf.searchTime!) ? clamp(data.wolf.searchTime!, 0, 40) : 0;
    wolf.patrolIndex = Number.isInteger(data.wolf.patrolIndex!) ? Math.max(0, data.wolf.patrolIndex!) : 0;
    wolf.heading = Number.isFinite(data.wolf.heading!) ? data.wolf.heading! : 0;
    wolf.huntUnlockTimer = Number.isFinite(data.wolf.huntUnlockTimer!) ? clamp(data.wolf.huntUnlockTimer!, 0, 10) : 0;
    wolf.awareness = bounded(data.wolf.awareness, 0, 1, wolf.mode === "chase" ? 1 : 0);
    const heard = data.wolf.heardPoint;
    wolf.heardPoint = heard && Number.isFinite(heard.x) && Number.isFinite(heard.y)
      ? { x: clamp(heard.x, 0, WORLD.width), y: clamp(heard.y, 0, WORLD.height) } : null;
    wolf.hearingCooldown = bounded(data.wolf.hearingCooldown, 0, 1);
    wolf.investigateTime = bounded(data.wolf.investigateTime, 0, 10);
    wolf.patrolPause = bounded(data.wolf.patrolPause, 0, 3);
    wolf.patrolScanHeading = bounded(data.wolf.patrolScanHeading, -Math.PI * 2, Math.PI * 2, wolf.heading);
    wolf.alertReturnMode = ["patrol", "investigate", "search"].includes(data.wolf.alertReturnMode!) ? data.wolf.alertReturnMode! : "patrol";
    wolf.investigateReturnMode = data.wolf.investigateReturnMode === 'search' && wolf.lastKnown ? 'search' : 'patrol';
    const velocity = data.wolf.seenVelocity, maxObservedSpeed = game.settings.chickenSpeed * Player.sprintMultiplier * 1.1;
    wolf.seenVelocity = velocity && Number.isFinite(velocity.x) && Number.isFinite(velocity.y) && Math.hypot(velocity.x,velocity.y) <= maxObservedSpeed ?
      { x: velocity.x, y: velocity.y } : { x: 0, y: 0 };
    wolf.lastSight = null; wolf.sightAge = Infinity;
    wolf.searchApproached = data.wolf.searchApproached === true;
    wolf.searchIndex = Math.floor(bounded(data.wolf.searchIndex, 0, 1000, wolf.searchApproached ? 1 : 0));
    wolf.scanTime = bounded(data.wolf.scanTime, 0, 5);
    wolf.vx = 0; wolf.vy = 0;
    for (const [index, animal] of game.entities.animals.entries()) {
      animal.rescued = game.rescuedIds.has(animal.id);
      // Older saves used a different geography: keep their progress and give friends legal new homes.
      const saved = animal.rescued ? RescueSystem.safePosition(index) : newGeography ? WORLD.layout.animalSpawns[index]
        : data.animals.find(a => a.id === animal.id) || WORLD.layout.animalSpawns[index];
      animal.x = saved.x; animal.y = saved.y;
      animal.targetX = saved.x; animal.targetY = saved.y;
      animal.homeX = WORLD.layout.animalSpawns[index].x; animal.homeY = WORLD.layout.animalSpawns[index].y;
      restoreFriend(animal, saved);
      if(newGeography&&!animal.rescued){
        const old=data.animals.find(a=>a.id===animal.id);
        animal.discovered=old?.discovered===true;
        animal.lastSeen=animal.discovered?{x:animal.x,y:animal.y}:null;
        animal.homeX=animal.x;animal.homeY=animal.y;
      }
      resolveEnvironment(animal);
      FarmRefuge.ensureClear(animal);
    }
    const bonusHomes = HidingSpots.bonusHomes(WORLD.layout, game.entities.chicks.length);
    for (const [index, chick] of game.entities.chicks.entries()) {
      chick.rescued = game.rescuedChickIds.has(chick.id);
      const home = bonusHomes[index];
      const saved: Farm.FriendSnapshot = data.chicks?.find(c => c.id === chick.id) || home;
      // Already revealed chicks stay where the player left them; unopened bonuses use real cover.
      const coverId = newGeography || !saved.discovered || saved.coverId === home.coverId ? home.coverId : null;
      const point = chick.rescued ? RescueSystem.chickPosition(index) : coverId ? home : saved;
      Object.assign(chick, { x: point.x, y: point.y, targetX: point.x, targetY: point.y, moving: false });
      Object.assign(chick, { coverId, homeX: home.x, homeY: home.y, areaId: home.areaId });
      restoreFriend(chick, saved);
      if(newGeography)chick.lastSeen=chick.discovered?{x:chick.x,y:chick.y}:null;
      resolveEnvironment(chick);
      FarmRefuge.ensureClear(chick);
    }
    resolveEnvironment(game.entities.chicken);
    FarmRefuge.ensureClear(game.entities.chicken);
    GooseSystem.restore(game, data.goose);
    FoxSystem.restore(game, data.foxes);
    HidingSpots.restore(game, newGeography?{...playerPosition,hidden:false}:data.chicken);
    if(newGeography){
      Object.assign(wolf,WORLD.layout.wolfStart||{x:WORLD.width-120,y:WORLD.height-120});
      WolfAI.initialize(game);wolf.huntUnlockTimer=5;wolf.pauseTimer=0;
    }
    resolveEnvironment(wolf);
    FarmRefuge.ensureClear(wolf);
    WolfAI.restoreCoverMemory(game, newGeography?null:data.wolf.exposedCover);
    HidingSpots.update(game);
    OwlSystem.restore(game, data.owls);
    ThorSystem.restore(game, data.thor);
    ScarecrowSystem.initialize(game);
    if(!newGeography && data.wolf.mode==='frightened' && Number.isFinite(data.wolf.fearTime) && data.wolf.fearTime!>0 &&
      WildlifeRules.validPoint(data.wolf.fearFrom))WolfAI.frighten(game,data.wolf.fearFrom,bounded(data.wolf.fearTime,0,6));
    game.winBonusApplied = data.winBonusApplied === true;
    if (data.phase === 'lose') { game.phase = 'lose'; game.resumePhase = 'lose'; }
    if (game.rescuedCount === WORLD.targetRescues) GameManager.win(game);
    refreshHud();
    MapManager.initialize(game);
    if(migrating || data.timerMode !== 'arcade')save(game);
  }
  function clear(): void {
    try { localStorage.removeItem(SAVE_KEY); } catch (_) { storageAvailable = false; }
  }
  function update(game: Farm.GameState, dt: number): void {
    if (game.phase !== "playing" || !Number.isFinite(dt) || dt < 0) return;
    if (game.timeRewardNotice) game.timeRewardNotice.time = Math.max(0, game.timeRewardNotice.time - dt);
    if (game.chickCombo.remaining > 0) {
      game.chickCombo.remaining = Math.max(0, game.chickCombo.remaining - dt);
      if (game.chickCombo.remaining <= 1e-8) game.chickCombo = {count:0,remaining:0};
    }
    game.elapsed += game.timeRemaining === null ? dt : Math.min(dt, game.timeRemaining);
    if (game.timeRemaining !== null) {
      game.timeRemaining = Math.max(0, game.timeRemaining - dt);
      if (game.timeRemaining <= 1e-8) {
        game.timeRemaining = 0;
        finishLose('O tempo acabou! Tente novamente e resgate os amigos antes do relógio zerar.', 'timeout');
        save(game);
        return;
      }
    }
    saveTimer += dt;
    if (saveTimer >= 2) { saveTimer = 0; save(game); }
  }
  function remainingSeconds(game: Farm.GameState): number {
    return game.timeRemaining === null ? 0 : Math.max(0, Math.floor(game.timeRemaining + 1e-8));
  }
  return { initialize, level, rescue, rewardRescueTime, comboMultiplier, timeScoreRate, win, save, read, restore, clear, update, remainingSeconds,
    get storageAvailable() { return storageAvailable; } };
})();
