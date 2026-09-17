"use strict";
/* Progress belongs to the session, never to an individual region. */
const GameManager = (() => {
    const SAVE_KEY = "galinha-guardia-save-v1";
    let saveTimer = 0;
    let storageAvailable = true;
    function initialize(game) {
        game.rescuedIds = new Set();
        game.rescuedChickIds = new Set();
        game.rescuedChicks = 0;
        game.wolfLevel = 0;
        game.elapsed = 0;
        game.entities.chicken.invulnerable = 0;
        game.entities.chicken.hidden = false;
        game.entities.chicken.hideBlend = 0;
        game.entities.chicken.stamina = 1;
        game.entities.chicken.staminaDelay = 0;
        game.entities.chicken.exhausted = false;
        SkinSystem.initialize(game);
        LakeChallenge.initialize(game);
        GooseSystem.initialize(game);
        saveTimer = 0;
    }
    function level(count) { return count >= 9 ? 3 : count >= 6 ? 2 : count >= 3 ? 1 : 0; }
    function rescue(game, animal) {
        if (animal.type !== "animal" && animal.type !== "chick")
            return false;
        const chick = animal.type === "chick";
        const ids = chick ? game.rescuedChickIds : game.rescuedIds;
        if (game.phase !== "playing" || ids.has(animal.id) || (chick && !animal.discovered))
            return false;
        ids.add(animal.id);
        animal.rescued = true;
        animal.discovered = true;
        animal.lost = false;
        game.rescuedCount = game.rescuedIds.size;
        game.rescuedChicks = game.rescuedChickIds.size;
        game.wolfLevel = level(game.rescuedCount);
        game.score += SCORE_PER_RESCUE;
        SkinSystem.record(game);
        return true;
    }
    function win(game) {
        if (game.phase !== "playing" || game.rescuedIds.size !== WORLD.targetRescues)
            return false;
        if (!game.winBonusApplied) {
            game.score += game.lives * SCORE_BONUS_PER_LIFE;
            game.winBonusApplied = true;
        }
        startWinCutscene();
        save(game);
        return true;
    }
    function save(game) {
        const phase = game.phase === "menu" ? game.resumePhase : game.phase;
        if (!phase || phase === "lose")
            return;
        const point = (e) => ({ x: e.x, y: e.y });
        const friend = (a) => ({ id: a.id, ...point(a), discovered: !!a.discovered, coverId: a.coverId || null, lastSeen: a.lastSeen || null,
            fatigue: a.fatigue || 0, restTime: a.restTime || 0, fleeTime: a.fleeTime || 0,
            fleeFrom: a.fleeFrom || null, fleeHeading: a.fleeHeading ?? null });
        const wolf = game.entities.wolf, chicken = game.entities.chicken;
        const data = {
            version: 4, worldSeed: game.worldSeed, worldVersion: game.worldVersion, difficulty: game.difficultyKey, phase,
            rescuedIds: [...game.rescuedIds], lives: game.lives, score: game.score, winBonusApplied: game.winBonusApplied,
            rescuedChickIds: [...game.rescuedChickIds],
            elapsed: game.elapsed, chicken: { ...point(chicken), hidden: chicken.hidden,
                hidingSpotId: chicken.hidingSpotId || null, direction: chicken.direction,
                stamina: chicken.stamina, staminaDelay: chicken.staminaDelay, exhausted: chicken.exhausted },
            wolf: { ...point(wolf), mode: wolf.mode, lastKnown: wolf.lastKnown,
                searchTime: wolf.searchTime, patrolIndex: wolf.patrolIndex, heading: wolf.heading,
                huntUnlockTimer: wolf.huntUnlockTimer, awareness: wolf.awareness, heardPoint: wolf.heardPoint,
                hearingCooldown: wolf.hearingCooldown, investigateTime: wolf.investigateTime,
                alertReturnMode: wolf.alertReturnMode, patrolPause: wolf.patrolPause,
                patrolScanHeading: wolf.patrolScanHeading, searchApproached: wolf.searchApproached,
                searchIndex: wolf.searchIndex, scanTime: wolf.scanTime, exposedCover: wolf.exposedCover || null,
                seenVelocity: wolf.seenVelocity, investigateReturnMode: wolf.investigateReturnMode },
            animals: game.entities.animals.map(friend),
            chicks: game.entities.chicks.map(friend),
            goose: GooseSystem.snapshot(game),
            lake: LakeChallenge.snapshot(game),
        };
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(data));
            storageAvailable = true;
        }
        catch (_) {
            storageAvailable = false;
        }
    }
    function read() {
        try {
            // Parsing is followed by the existing structural/identity checks below; a type alone cannot validate storage.
            const data = JSON.parse(localStorage.getItem(SAVE_KEY));
            if (!data || ![1, 2, 3, 4].includes(data.version) || !DIFFICULTIES[data.difficulty])
                return null;
            if (data.version >= 2 && (!Number.isInteger(data.worldSeed) || data.worldSeed < 0 || data.worldSeed > 4294967295))
                return null;
            if (data.version === 1)
                data.worldSeed = 20260915;
            if (data.worldVersion === undefined)
                data.worldVersion = 1;
            if (![1, 2].includes(data.worldVersion))
                return null;
            if (!Array.isArray(data.rescuedIds) || !Array.isArray(data.animals))
                return null;
            if (!Number.isInteger(data.lives) || data.lives < 1 || data.lives > MAX_LIVES)
                return null;
            if (!Number.isFinite(data.score) || data.score < 0)
                return null;
            if (!["playing", "win_cutscene", "won"].includes(data.phase))
                return null;
            const validPoint = (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y) &&
                p.x >= 0 && p.x <= WORLD.width && p.y >= 0 && p.y <= WORLD.height;
            if (!validPoint(data.chicken) || !validPoint(data.wolf))
                return null;
            const ids = new Set(Array.from({ length: WORLD.targetRescues }, (_, i) => `animal_${i}`));
            if (data.rescuedIds.some(id => !ids.has(id)) || new Set(data.rescuedIds).size !== data.rescuedIds.length)
                return null;
            if (data.animals.length !== WORLD.targetRescues || new Set(data.animals.map(a => a.id)).size !== WORLD.targetRescues ||
                data.animals.some(a => !ids.has(a.id) || !validPoint(a)))
                return null;
            if (data.phase !== "playing" && data.rescuedIds.length !== WORLD.targetRescues)
                return null;
            if (data.version >= 3) {
                const chickIds = new Set(Array.from({ length: WORLD.targetChicks }, (_, i) => `chick_${i}`));
                if (!Array.isArray(data.rescuedChickIds) || !Array.isArray(data.chicks) ||
                    data.rescuedChickIds.some(id => !chickIds.has(id)) || new Set(data.rescuedChickIds).size !== data.rescuedChickIds.length ||
                    data.chicks.length !== WORLD.targetChicks || new Set(data.chicks.map(c => c.id)).size !== WORLD.targetChicks ||
                    data.chicks.some(c => !chickIds.has(c.id) || !validPoint(c)))
                    return null;
                if (data.version === 3 && data.phase !== "playing" && data.rescuedChickIds.length !== WORLD.targetChicks)
                    return null;
            }
            else {
                // Old adventures retain their score; their optional bonuses start undiscovered.
                data.rescuedChickIds = [];
                data.chicks = [];
                data.phase = "playing";
            }
            return data;
        }
        catch (_) {
            return null;
        }
    }
    function restore(game, data) {
        const seed = data.worldSeed ?? 20260915;
        const worldVersion = data.worldVersion ?? 1;
        if (game.worldSeed !== seed || game.worldVersion !== worldVersion) {
            MapManager.generate(seed, worldVersion);
            buildObstacles();
            game.worldSeed = seed;
            game.worldVersion = worldVersion;
        }
        LakeChallenge.restore(game, data.lake);
        game.rescuedIds = new Set(data.rescuedIds);
        game.rescuedCount = game.rescuedIds.size;
        game.rescuedChickIds = new Set(data.rescuedChickIds || []);
        game.rescuedChicks = game.rescuedChickIds.size;
        SkinSystem.record(game, false);
        game.wolfLevel = level(game.rescuedCount);
        game.lives = data.lives;
        game.score = data.score;
        game.elapsed = Number.isFinite(data.elapsed) ? Math.max(0, data.elapsed) : 0;
        const bounded = (value, min, max, fallback = min) => Number.isFinite(value) ? clamp(value, min, max) : fallback;
        const restoreFriend = (animal, saved) => {
            animal.discovered = animal.rescued || saved.discovered === true;
            animal.discoveryTime = 0;
            animal.lastSeen = animal.discovered && Number.isFinite(saved.lastSeen?.x) && Number.isFinite(saved.lastSeen?.y)
                ? { x: bounded(saved.lastSeen.x, 0, WORLD.width), y: bounded(saved.lastSeen.y, 0, WORLD.height) } : null;
            animal.fatigue = bounded(saved.fatigue, 0, 8);
            animal.restTime = bounded(saved.restTime, 0, 3.1);
            animal.fleeTime = bounded(saved.fleeTime, 0, .9);
            const memory = saved.fleeFrom;
            animal.fleeFrom = memory && ['player', 'wolf'].includes(memory.kind) && Number.isFinite(memory.x) && Number.isFinite(memory.y) &&
                memory.x >= 0 && memory.x <= WORLD.width && memory.y >= 0 && memory.y <= WORLD.height ?
                { x: memory.x, y: memory.y, kind: memory.kind } : null;
            animal.fleeHeading = Number.isFinite(saved.fleeHeading) ? bounded(saved.fleeHeading, -Math.PI, Math.PI) : null;
            animal.stuckTime = 0;
            animal.wanderTime = 1;
            animal.speechTime = 0;
        };
        const chicken = game.entities.chicken;
        Object.assign(chicken, { x: data.chicken.x, y: data.chicken.y, invulnerable: 2,
            stamina: bounded(data.chicken.stamina, 0, 1, 1),
            staminaDelay: bounded(data.chicken.staminaDelay, 0, 0.65), exhausted: data.chicken.exhausted === true,
            direction: ["up", "down", "left", "right"].includes(data.chicken.direction) ? data.chicken.direction : "down",
            vx: 0, vy: 0, moving: false, sprinting: false, state: "idle" });
        const wolf = game.entities.wolf;
        wolf.x = data.wolf.x;
        wolf.y = data.wolf.y;
        wolf.mode = ["patrol", "alert", "investigate", "chase", "search", "inspect"].includes(data.wolf.mode) ? data.wolf.mode : "patrol";
        const last = data.wolf.lastKnown;
        wolf.lastKnown = last && Number.isFinite(last.x) && Number.isFinite(last.y)
            ? { x: clamp(last.x, 0, WORLD.width), y: clamp(last.y, 0, WORLD.height) } : null;
        wolf.searchTime = Number.isFinite(data.wolf.searchTime) ? clamp(data.wolf.searchTime, 0, 30) : 0;
        wolf.patrolIndex = Number.isInteger(data.wolf.patrolIndex) ? Math.max(0, data.wolf.patrolIndex) : 0;
        wolf.heading = Number.isFinite(data.wolf.heading) ? data.wolf.heading : 0;
        wolf.huntUnlockTimer = Number.isFinite(data.wolf.huntUnlockTimer) ? clamp(data.wolf.huntUnlockTimer, 0, 10) : 0;
        wolf.awareness = bounded(data.wolf.awareness, 0, 1, wolf.mode === "chase" ? 1 : 0);
        const heard = data.wolf.heardPoint;
        wolf.heardPoint = heard && Number.isFinite(heard.x) && Number.isFinite(heard.y)
            ? { x: clamp(heard.x, 0, WORLD.width), y: clamp(heard.y, 0, WORLD.height) } : null;
        wolf.hearingCooldown = bounded(data.wolf.hearingCooldown, 0, 1);
        wolf.investigateTime = bounded(data.wolf.investigateTime, 0, 10);
        wolf.patrolPause = bounded(data.wolf.patrolPause, 0, 3);
        wolf.patrolScanHeading = bounded(data.wolf.patrolScanHeading, -Math.PI * 2, Math.PI * 2, wolf.heading);
        wolf.alertReturnMode = ["patrol", "investigate", "search"].includes(data.wolf.alertReturnMode) ? data.wolf.alertReturnMode : "patrol";
        wolf.investigateReturnMode = data.wolf.investigateReturnMode === 'search' && wolf.lastKnown ? 'search' : 'patrol';
        const velocity = data.wolf.seenVelocity, maxObservedSpeed = game.settings.chickenSpeed * Player.sprintMultiplier * 1.1;
        wolf.seenVelocity = velocity && Number.isFinite(velocity.x) && Number.isFinite(velocity.y) && Math.hypot(velocity.x, velocity.y) <= maxObservedSpeed ?
            { x: velocity.x, y: velocity.y } : { x: 0, y: 0 };
        wolf.lastSight = null;
        wolf.sightAge = Infinity;
        wolf.searchApproached = data.wolf.searchApproached === true;
        wolf.searchIndex = Math.floor(bounded(data.wolf.searchIndex, 0, 1000, wolf.searchApproached ? 1 : 0));
        wolf.scanTime = bounded(data.wolf.scanTime, 0, 5);
        wolf.vx = 0;
        wolf.vy = 0;
        for (const [index, animal] of game.entities.animals.entries()) {
            animal.rescued = game.rescuedIds.has(animal.id);
            // Older saves used a different geography: keep their progress and give friends legal new homes.
            const saved = animal.rescued ? RescueSystem.safePosition(index) : data.version === 1 ? WORLD.layout.animalSpawns[index]
                : data.animals.find(a => a.id === animal.id);
            animal.x = saved.x;
            animal.y = saved.y;
            animal.targetX = saved.x;
            animal.targetY = saved.y;
            restoreFriend(animal, saved);
            resolveEnvironment(animal);
            FarmRefuge.ensureClear(animal);
        }
        const bonusHomes = HidingSpots.bonusHomes();
        for (const [index, chick] of game.entities.chicks.entries()) {
            chick.rescued = game.rescuedChickIds.has(chick.id);
            const home = bonusHomes[index];
            const saved = data.chicks?.find(c => c.id === chick.id) || home;
            // Already revealed chicks stay where the player left them; unopened bonuses use real cover.
            const coverId = !saved.discovered || saved.coverId === home.coverId ? home.coverId : null;
            const point = chick.rescued ? RescueSystem.chickPosition(index) : coverId ? home : saved;
            Object.assign(chick, { x: point.x, y: point.y, targetX: point.x, targetY: point.y, moving: false });
            Object.assign(chick, { coverId, homeX: home.x, homeY: home.y, areaId: home.areaId });
            restoreFriend(chick, saved);
            resolveEnvironment(chick);
            FarmRefuge.ensureClear(chick);
        }
        resolveEnvironment(game.entities.chicken);
        FarmRefuge.ensureClear(game.entities.chicken);
        HidingSpots.restore(game, data.chicken);
        resolveEnvironment(wolf);
        FarmRefuge.ensureClear(wolf);
        WolfAI.restoreCoverMemory(game, data.wolf.exposedCover);
        GooseSystem.restore(game, data.goose);
        game.winBonusApplied = data.winBonusApplied === true;
        if (game.rescuedCount === WORLD.targetRescues)
            GameManager.win(game);
        refreshHud();
        MapManager.initialize(game);
    }
    function clear() {
        try {
            localStorage.removeItem(SAVE_KEY);
        }
        catch (_) {
            storageAvailable = false;
        }
    }
    function update(game, dt) {
        game.elapsed += dt;
        saveTimer += dt;
        if (saveTimer >= 2) {
            saveTimer = 0;
            save(game);
        }
    }
    return { initialize, level, rescue, win, save, read, restore, clear, update,
        get storageAvailable() { return storageAvailable; } };
})();
