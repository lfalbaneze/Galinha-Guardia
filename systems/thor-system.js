"use strict";
/* One automatic easy rescue; paid full heals, with an increasing hardcore cost. */
const ThorSystem = (() => {
    const HITBOX = { ox: 0, oy: 8, r: 14 };
    const point = WildlifeRules.point;
    const boneCache = new WeakMap();
    const cost = (game) => game.difficultyKey === 'easy' ? 0 : game.difficultyKey === 'normal' ? 2 :
        game.difficultyKey === 'hard' ? 4 : 5 + (game.thorVisit?.visits || 0);
    const boneCount = (game) => game.thorVisit?.boneIds.length || 0;
    const active = (game) => !!game.thorRescue;
    const available = (game) => game.phase === 'playing' && !active(game) &&
        game.lives > 0 && game.lives < MAX_LIVES && (!cost(game) || (!game.lake?.active && !SwimmingSystem.profile(game).swimming));
    const canCall = (game) => available(game) && cost(game) > 0 && boneCount(game) >= cost(game);
    const duration = 5.4, healAt = 3.55;
    // After a delivered rescue, Thor needs a breather before another emergency.
    function nextDelay(random = Math.random) {
        return 45 + clamp(random(), 0, 1) * 40;
    }
    function initialize(game) {
        game.thorVisit = { nextIn: 0, visits: 0, boneIds: [], cycle: 0, easyUsed: false };
        game.entities.thor = null;
        game.thorRescue = undefined;
        game.thorNotice = undefined;
        game.thorBoneNotice = undefined;
        boneCache.delete(game);
    }
    function boneSpots(game) {
        const layout = WORLD.layout, cycle = game.thorVisit?.cycle || 0, cached = boneCache.get(game);
        // Refill in batches so escalating costs cannot exhaust the map's safe pickup locations.
        const batch = Math.floor(boneCount(game) / 6), offset = batch * 6, needed = Math.min(6, cost(game) - offset);
        if (needed <= 0)
            return [];
        if (cached?.layout === layout && cached.cycle === cycle && cached.cost === cost(game) && cached.batch === batch)
            return cached.spots;
        const player = game.entities.chicken, occupied = FarmArt.getProps(layout).map(FarmDetails.shape);
        const pond = layout.structures.pond, candidates = [], seen = new Set();
        for (const road of [...layout.paths, ...layout.lanes || []]) {
            const horizontal = road.w > road.h, length = horizontal ? road.w : road.h;
            for (let at = 32; at < length - 24; at += 72) {
                const p = { x: Math.round(road.x + (horizontal ? at : road.w / 2)), y: Math.round(road.y + (horizontal ? road.h / 2 : at)) - 8 };
                const key = `${p.x}:${p.y}`, feet = { x: p.x, y: p.y + 14 };
                if (seen.has(key) || distance(p, layout.start) < 190 || p.x < 50 || p.y < 50 || p.x > WORLD.width - 50 || p.y > WORLD.height - 50)
                    continue;
                seen.add(key);
                if (!WildlifeRules.clear(p, p, player.hitbox) || EnvironmentSystem.surfaceAt(game, feet) === 'water' ||
                    (p.x > pond.x - 35 && p.x < pond.x + pond.w + 35 && p.y > pond.y - 40 && p.y < pond.y + pond.h + 35) ||
                    occupied.some(r => p.x > r.x - 20 && p.x < r.x + r.w + 20 && p.y > r.y - 24 && p.y < r.y + r.h + 20))
                    continue;
                candidates.push(p);
            }
        }
        const hash = (p) => {
            let n = Math.imul((layout.seed ^ Math.imul(cycle + 1, 0x45d9f3b) ^ Math.imul(batch, 0x27d4eb2d)) >>> 0, 31) ^ Math.imul(p.x, 73856093) ^ Math.imul(p.y, 19349663);
            n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
            return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
        };
        const spots = [], body = { ...layout.start, radius: player.radius, hitbox: player.hitbox };
        for (let i = 0; i < needed; i++) {
            const score = (p) => spots.length ? Math.min(...spots.map(s => distance(p, s))) + hash(p) * 180 :
                800 - Math.abs(distance(p, layout.start) - 650) + hash(p) * 300;
            candidates.sort((a, b) => score(b) - score(a));
            const index = candidates.findIndex(p => {
                if (spots.some(s => distance(p, s) < 240))
                    return false;
                const route = WolfAI.findPath(body, p), end = route[route.length - 1];
                return !!end && distance(end, p) < 4;
            });
            if (index < 0)
                break;
            spots.push({ ...candidates.splice(index, 1)[0], id: `bone-${cycle}-${offset + i}` });
        }
        boneCache.set(game, { layout, cycle, cost: cost(game), batch, spots });
        return spots;
    }
    function bones(game) {
        if (!cost(game))
            return [];
        return boneSpots(game).filter(b => !game.thorVisit?.boneIds.includes(b.id));
    }
    function collectBones(game) {
        if (!cost(game) || boneCount(game) >= cost(game) || game.entities.chicken.hidden)
            return;
        for (const bone of bones(game)) {
            if (distance(game.entities.chicken, bone) > 30 || !DetectionSystem.hasLineOfSight(getHitbox(game.entities.chicken), bone))
                continue;
            game.thorVisit.boneIds.push(bone.id);
            const count = boneCount(game);
            game.thorBoneNotice = { time: 3, count };
            AudioSystem.play('pop', { volume: .45 });
            spawnBurst(bone.x, bone.y, '#ffe7a9', 8);
            setStatus(count === cost(game) ? 'Ossos reunidos! Aperte T ou toque em Chamar Thor quando precisar recuperar a vida.' :
                `${count}/${cost(game)} ossos. Thor não aceita milho. Continue procurando os ossinhos no mapa!`);
            GameManager.save(game);
            if (count >= cost(game))
                break;
        }
    }
    function drawBones(game) {
        for (const bone of bones(game)) {
            if (!WildlifeRules.onScreen(bone, 40))
                continue;
            const p = worldToScreen(bone), bob = InterfaceMotion.reduced ? 0 : Math.sin((game.elapsed || 0) * 3 + bone.x) * 1.5;
            ctx.save();
            ctx.translate(Math.round(p.x), Math.round(p.y));
            ctx.imageSmoothingEnabled = false;
            ctx.fillStyle = '#38533845';
            ctx.beginPath();
            ctx.ellipse(0, 9, 14, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.translate(0, bob);
            ctx.strokeStyle = '#f6d67c90';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(0, 3, 20, 13, 0, 0, Math.PI * 2);
            ctx.stroke();
            const outline = [[-14, -5], [-10, -8], [-6, -6], [-5, -3], [5, -3], [6, -6], [10, -8], [14, -5], [14, -1], [12, 1], [14, 4], [13, 8], [9, 9], [6, 7], [5, 4], [-5, 4], [-6, 7], [-9, 9], [-13, 8], [-14, 4], [-12, 1], [-14, -1]];
            ctx.beginPath();
            ctx.moveTo(outline[0][0], outline[0][1]);
            for (const [x, y] of outline.slice(1))
                ctx.lineTo(x, y);
            ctx.closePath();
            ctx.fillStyle = '#f8ebc5';
            ctx.fill();
            ctx.strokeStyle = '#736044';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#fff9e6';
            ctx.fillRect(-10, -5, 3, 3);
            ctx.fillRect(-4, -2, 10, 2);
            ctx.fillRect(8, -5, 3, 3);
            ctx.restore();
        }
    }
    function make(at, exit) {
        return { id: 'thor', type: 'thor', ...point(at), radius: 24, hitbox: { ...HITBOX }, vx: 0, vy: 0,
            facing: 1, direction: 'down', moving: false, anim: 0, areaId: getAreaAt(at.x, at.y).id, state: 'idle',
            mode: 'enter', timer: 20, exit: point(exit), route: [], routeTimer: 0, age: 0 };
    }
    function edgeRoute(from) {
        const start = Math.random() * Math.PI * 2;
        const radius = Math.max(canvas.width, canvas.height) * .7 + 120;
        let best = [];
        for (let i = 0; i < 12; i++) {
            const angle = start + i * Math.PI / 6;
            const target = { x: clamp(from.x + Math.cos(angle) * radius, 24, WORLD.width - 24),
                y: clamp(from.y + Math.sin(angle) * radius, 24, WORLD.height - 32) };
            const path = WolfAI.findPath(from, target), end = path[path.length - 1];
            if (!end || !WildlifeRules.clear(end, end, HITBOX) || distance(from, end) < 200)
                continue;
            if (!WildlifeRules.onScreen(end, 70))
                return path;
            if (!best.length || distance(from, end) > distance(from, best[best.length - 1]))
                best = path;
        }
        return best;
    }
    function startRescue(game) {
        if (!available(game))
            return false;
        const visit = game.thorVisit;
        if (cost(game)) {
            if (boneCount(game) < cost(game))
                return false;
            visit.boneIds = [];
            visit.cycle++;
        }
        else {
            if (visit.easyUsed || game.lives !== 1)
                return false;
            visit.easyUsed = true;
        }
        visit.visits++;
        game.entities.thor = null;
        game.thorRescue = { time: 0, before: game.lives, healed: false };
        game.thorNotice = undefined;
        game.thorBoneNotice = undefined;
        GameInput.clear();
        // Reserve payment/free use together with the scene so reloads cannot duplicate it.
        GameManager.save(game);
        AudioSystem.play('thor-hero', { volume: .85 });
        setStatus('Thor ouviu o chamado. O herói usa coleira!');
        return true;
    }
    function request(game) { return canCall(game) && startRescue(game); }
    function landing(game) {
        const player = game.entities.chicken;
        for (const radius of [54, 36, 76, 96, 0])
            for (let i = 0; i < 12; i++) {
                const angle = i * Math.PI / 6, at = { x: player.x + Math.cos(angle) * radius, y: player.y + Math.sin(angle) * radius };
                if (at.x < 24 || at.y < 24 || at.x > WORLD.width - 24 || at.y > WORLD.height - 24 || !WildlifeRules.clear(at, at, HITBOX) ||
                    EnvironmentSystem.surfaceAt(game, { x: at.x, y: at.y + 14 }) === 'water' || !DetectionSystem.hasLineOfSight(getHitbox(player), at))
                    continue;
                return at;
            }
        return null;
    }
    function deliver(game) {
        const scene = game.thorRescue;
        if (!scene || scene.healed)
            return;
        scene.healed = true;
        const before = game.lives;
        game.lives = cost(game) ? MAX_LIVES : Math.min(MAX_LIVES, game.lives + 1);
        game.entities.chicken.invulnerable = Math.max(game.entities.chicken.invulnerable, 3);
        const at = landing(game);
        if (at) {
            const dog = make(at, at);
            dog.mode = 'greet';
            dog.timer = 1.2;
            dog.age = 2;
            game.entities.thor = dog;
        }
        WolfAI.frighten(game, game.entities.thor || game.entities.chicken, 7);
        AudioSystem.playAnimal('dog', { volume: .7 });
        game.thorNotice = { time: 4.5, healed: game.lives > before, amount: game.lives - before };
        setStatus(cost(game) ? 'Thor chegou! Vida completa e um lobo procurando a saída. Bom garoto!' :
            'Thor chegou! +1 coração. Sua ajuda de emergência foi usada nesta tentativa.');
        refreshHud();
        GameManager.save(game);
    }
    function finishRescue(game) {
        if (!game.thorRescue)
            return;
        deliver(game);
        game.thorRescue = undefined;
        GameInput.clear();
        GameManager.save(game);
    }
    function skip(game) {
        if (game.phase !== 'playing' || !game.thorRescue || game.thorRescue.time < .6)
            return false;
        finishRescue(game);
        return true;
    }
    function walk(dog, target, speed, dt) {
        dog.routeTimer -= dt;
        if (dog.routeTimer <= 0) {
            dog.route = WolfAI.findPath(dog, target);
            dog.routeTimer = .65;
        }
        if (!dog.route.length)
            return;
        const moved = WildlifeRules.move(dog, dog.route[0], speed * dt);
        if (moved === 'arrived')
            dog.route.shift();
        if (moved === 'blocked') {
            dog.route = [];
            dog.routeTimer = 0;
        }
    }
    function update(game, dt) {
        if (game.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0)
            return;
        if (!game.thorVisit)
            initialize(game);
        if (game.thorRescue) {
            game.thorRescue.time = Math.min(duration, game.thorRescue.time + Math.min(dt, .1));
            if (game.thorRescue.time >= healAt)
                deliver(game);
            if (game.thorRescue.time >= duration)
                finishRescue(game);
            return;
        }
        if (game.thorNotice)
            game.thorNotice.time = Math.max(0, game.thorNotice.time - dt);
        if (game.thorBoneNotice)
            game.thorBoneNotice.time = Math.max(0, game.thorBoneNotice.time - dt);
        if (!cost(game) && !game.thorVisit.easyUsed && game.lives === 1 && startRescue(game))
            return;
        if (game.lake?.active)
            return;
        collectBones(game);
        const visit = game.thorVisit, dog = game.entities.thor;
        if (!dog) {
            visit.nextIn = Math.max(0, visit.nextIn - dt);
            return;
        }
        const before = point(dog), step = Math.min(dt, .1);
        dog.age += step;
        dog.timer = Math.max(0, dog.timer - step);
        if (dog.mode === 'enter') {
            dog.mode = 'leave';
            dog.timer = 14;
            dog.route = [];
            dog.routeTimer = 0;
        }
        else if (dog.mode === 'greet') {
            Player.face(dog, game.entities.chicken.x - dog.x, game.entities.chicken.y - dog.y);
            if (dog.timer <= 0) {
                dog.mode = 'leave';
                dog.timer = 14;
                const path = edgeRoute(dog);
                dog.exit = point(path[path.length - 1] || dog.exit);
                dog.routeTimer = 0;
            }
        }
        else {
            walk(dog, dog.exit, game.settings.chickenSpeed * 1.25, step);
            if (dog.timer <= 0 || (!WildlifeRules.onScreen(dog, 90) && dog.age > 4)) {
                game.entities.thor = null;
                visit.nextIn = nextDelay();
                GameManager.save(game);
                return;
            }
        }
        dog.vx = (dog.x - before.x) / step;
        dog.vy = (dog.y - before.y) / step;
        dog.moving = Math.hypot(dog.vx, dog.vy) > 1;
        dog.anim += step * (dog.moving ? 10 : 2);
        dog.areaId = getAreaAt(dog.x, dog.y).id;
    }
    function snapshot(game) {
        if (!game.thorVisit)
            return undefined;
        const dog = game.entities.thor;
        return { ...game.thorVisit, version: 3, rescue: game.thorRescue ? { ...game.thorRescue } : undefined, boneIds: [...game.thorVisit.boneIds], visitor: dog ? { ...point(dog), mode: dog.mode, timer: dog.timer,
                exit: point(dog.exit), age: dog.age, direction: dog.direction } : null };
    }
    function restore(game, saved) {
        game.entities.thor = null;
        game.thorRescue = undefined;
        game.thorNotice = undefined;
        game.thorBoneNotice = undefined;
        boneCache.delete(game);
        if (!saved || !Number.isFinite(saved.nextIn) || saved.nextIn < 0 || saved.nextIn > 1000) {
            initialize(game);
            return;
        }
        const visits = Number.isSafeInteger(saved.visits) ? Math.max(0, saved.visits) : 0;
        const cycle = Number.isSafeInteger(saved.cycle) && saved.cycle >= 0 && saved.cycle <= 100000 ? saved.cycle : 0;
        const easyUsed = saved.version === 3 ? saved.easyUsed === true : visits > 0;
        game.thorVisit = { nextIn: Math.min(saved.nextIn, visits ? 85 : 1.6), visits, boneIds: [], cycle, easyUsed };
        const required = cost(game), prefix = `bone-${cycle}-`;
        const allowed = (id) => {
            if (typeof id !== 'string' || !id.startsWith(prefix))
                return false;
            const index = Number(id.slice(prefix.length));
            return Number.isSafeInteger(index) && index >= 0 && index < required && id === `${prefix}${index}`;
        };
        if ([2, 3].includes(saved.version || 0) && Array.isArray(saved.boneIds))
            game.thorVisit.boneIds = [...new Set(saved.boneIds.filter(allowed))].slice(0, required);
        const rescue = saved.rescue;
        if (saved.version === 3 && rescue && visits > 0 && (cost(game) ? cycle > 0 : easyUsed) &&
            Number.isFinite(rescue.time) && rescue.time >= 0 && rescue.time <= duration &&
            Number.isInteger(rescue.before) && rescue.before >= 1 && rescue.before < MAX_LIVES && typeof rescue.healed === 'boolean')
            game.thorRescue = { time: rescue.time, before: rescue.before, healed: rescue.healed };
        const v = saved.visitor;
        if (!v)
            return;
        if (v.mode === 'enter')
            return;
        if (!WildlifeRules.validPoint(v) || !WildlifeRules.validPoint(v.exit) || !['enter', 'greet', 'leave'].includes(v.mode) ||
            !Number.isFinite(v.timer) || !Number.isFinite(v.age) || !WildlifeRules.clear(v, v, HITBOX)) {
            game.thorVisit.nextIn = Math.max(20, game.thorVisit.nextIn);
            return;
        }
        const dog = make(v, v.exit);
        dog.mode = v.mode;
        dog.timer = clamp(v.timer, 0, v.mode === 'greet' ? 2.4 : 20);
        dog.age = clamp(v.age, 0, 40);
        dog.direction = ['up', 'down', 'left', 'right'].includes(v.direction) ? v.direction : 'down';
        game.entities.thor = dog;
    }
    return { initialize, update, snapshot, restore, nextDelay, bones, boneCount, cost, drawBones, active, canCall, request, skip, duration, healAt };
})();
