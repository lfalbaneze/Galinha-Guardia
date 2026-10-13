"use strict";
const OwlSystem = (() => {
    const point = WildlifeRules.point;
    const coneCache = new WeakMap();
    function obstacles(owl) {
        const own = HidingSpots.getSpots().find(s => s.id === owl.treeId)?.blockingRect;
        return own ? OBSTACLES.filter(o => !(o.x === own.x && o.y === own.y && o.w === own.w && o.h === own.h)) : OBSTACLES;
    }
    function perches(game, roadsideOnly = true) {
        return (WORLD.layout.vegetation || []).filter(t => t.type === 'tree' && t.blockingRect).map(t => ({
            tree: t, ground: { x: t.x + t.w / 2, y: t.blockingRect.y + t.blockingRect.h }, rank: WildlifeRules.rank(t.id, 0x416657)
        })).filter(t => !WildlifeRules.reserved(game, t.ground, 100) && (!roadsideOnly || WildlifeRules.pathDistance(t.ground) < 230))
            .sort((a, b) => a.rank - b.rank);
    }
    function watchHeading(ground) {
        const nearest = WORLD.paths.map(r => ({ x: clamp(ground.x, r.x, r.x + r.w), y: clamp(ground.y, r.y, r.y + r.h) }))
            .sort((a, b) => distance(a, ground) - distance(b, ground))[0] || WORLD.layout.start;
        return Math.atan2(nearest.y - ground.y, nearest.x - ground.x);
    }
    function roadViews(owl) {
        const points = WORLD.paths.flatMap(r => [
            { x: clamp(owl.x, r.x, r.x + r.w), y: clamp(owl.y, r.y, r.y + r.h) },
            { x: r.x + r.w / 2, y: r.y + r.h / 2 }
        ]).filter(p => distance(p, owl) > 35 && distance(p, owl) < owl.range * 1.6);
        points.sort((a, b) => distance(a, owl) - distance(b, owl));
        const views = [];
        for (const p of points) {
            const angle = Math.atan2(p.y - owl.y, p.x - owl.x);
            if (views.every(v => Math.abs(Math.atan2(Math.sin(angle - Math.atan2(v.y - owl.y, v.x - owl.x)), Math.cos(angle - Math.atan2(v.y - owl.y, v.x - owl.x)))) > .5))
                views.push(p);
            if (views.length === 4)
                break;
        }
        return views;
    }
    function survey(owl, dt) {
        owl.lookTimer = Math.max(0, (owl.lookTimer ?? 2.4) - dt);
        if (owl.lastSeen && (owl.lastSeenAge ?? 99) < 3) {
            owl.surveillance = 'search';
            const sweep = Math.sin((owl.lastSeenAge || 0) * 2) * .3;
            owl.lookTarget = Math.atan2(owl.lastSeen.y - owl.y, owl.lastSeen.x - owl.x) + sweep;
        }
        else if (owl.lookTimer === 0) {
            owl.surveillance = 'roads';
            owl.lookIndex = (owl.lookIndex || 0) + 1;
            owl.lookTimer = 2.4;
            const views = roadViews(owl), p = views.length ? views[owl.lookIndex % views.length] : undefined;
            owl.lookTarget = p ? Math.atan2(p.y - owl.y, p.x - owl.x) : watchHeading(owl.perch) + (owl.lookIndex % 2 ? -.65 : .65);
        }
        const delta = Math.atan2(Math.sin((owl.lookTarget ?? owl.heading) - owl.heading), Math.cos((owl.lookTarget ?? owl.heading) - owl.heading));
        owl.heading += clamp(delta, -.75 * dt, .75 * dt);
        owl.direction = direction(owl.heading);
        owl.facing = Math.cos(owl.heading) < 0 ? -1 : 1;
    }
    function initialize(game) {
        const trees = perches(game);
        const chosen = [];
        for (const t of trees) {
            if (chosen.every(c => distance(t.ground, c.ground) > 500) &&
                (game.entities.foxes || []).every(f => distance(t.ground, f.home) > 240))
                chosen.push(t);
            if (chosen.length === 2)
                break;
        }
        game.entities.owls = chosen.map(({ tree, ground }) => {
            const heading = watchHeading(ground);
            return { id: `owl-${tree.id}`, type: 'owl', ...ground, radius: 10, hitbox: { ox: 0, oy: 0, r: 6 }, vx: 0, vy: 0,
                facing: Math.cos(heading) < 0 ? -1 : 1, direction: direction(heading), moving: false, anim: 0,
                areaId: getAreaAt(ground.x, ground.y).id, state: 'idle', mode: 'watch', perch: point(ground), treeId: tree.id,
                heading, range: 250, fov: Math.PI * .65, alertTime: game.difficultyKey === 'easy' ? .5 : ['hard', 'hardcore'].includes(game.difficultyKey) ? .25 : .35,
                alertProgress: 0, cooldown: 0, grace: 2, target: null, movePending: false, relocations: 0, relocateRetry: 0, flight: null,
                lastSeen: null, lastSeenAge: 99, observedMotion: { x: 0, y: 0 }, lookTimer: 2.4, lookIndex: 0, watchAge: 0, surveillance: 'roads' };
        });
    }
    function relocate(game, owl) {
        let choices = perches(game, false).filter(p => p.tree.id !== owl.treeId && distance(p.ground, owl) > 100 &&
            !(game.entities.owls || []).some(other => other !== owl && (other.treeId === p.tree.id || other.flight?.treeId === p.tree.id)) &&
            p.tree.id !== game.entities.chicken.hidingSpotId);
        // A chick lives under the canopy and does not occupy the owl's branch.
        // Avoid its tree when possible, but never deadlock a sparsely wooded farm.
        const withoutBonus = choices.filter(p => !game.entities.chicks.some(c => !c.rescued && c.coverId === p.tree.id));
        if (withoutBonus.length)
            choices = withoutBonus;
        // Spawn rules are preferences for later flights, not a permanent lock on the owl.
        const roadside = choices.filter(p => WildlifeRules.pathDistance(p.ground) < 230);
        if (roadside.length)
            choices = roadside;
        // Prefer a local flight, but a sparse farm must still offer a way to change perches.
        const nearby = choices.filter(p => distance(p.ground, owl) <= 1000);
        if (nearby.length)
            choices = nearby;
        const fresh = choices.filter(p => p.tree.id !== owl.previousTreeId);
        if (fresh.length)
            choices = fresh;
        if (!choices.length) {
            owl.relocateRetry = 1;
            return false;
        }
        if (owl.lastSeen && (owl.lastSeenAge ?? 99) < 6) {
            const velocity = owl.observedMotion || { x: 0, y: 0 }, focus = { x: owl.lastSeen.x + velocity.x * .65, y: owl.lastSeen.y + velocity.y * .65 };
            const overlooking = choices.filter(p => distance(p.ground, focus) <= owl.range &&
                DetectionSystem.hasLineOfSight(p.ground, focus, OBSTACLES.filter(o => {
                    const own = p.tree.blockingRect;
                    return o.x !== own.x || o.y !== own.y || o.w !== own.w || o.h !== own.h;
                })));
            if (overlooking.length)
                choices = overlooking;
        }
        // Among useful viewpoints, vary routes instead of repeatedly occupying the same branch.
        choices.sort((a, b) => WildlifeRules.pathDistance(a.ground) - WildlifeRules.pathDistance(b.ground));
        const selected = choices[Math.min(choices.length - 1, Math.floor(Math.random() * Math.min(3, choices.length)))];
        owl.flight = { from: point(owl), to: point(selected.ground), treeId: selected.tree.id, progress: 0, duration: Math.max(1.1, distance(owl, selected.ground) / 220) };
        owl.mode = 'relocate';
        owl.movePending = false;
        owl.moving = true;
        owl.anim = 0;
        owl.heading = Math.atan2(selected.ground.y - owl.y, selected.ground.x - owl.x);
        owl.direction = direction(owl.heading);
        GameManager.save(game);
        return true;
    }
    function fly(game, owl, dt) {
        const flight = owl.flight;
        if (!flight)
            return;
        flight.progress = Math.min(1, flight.progress + dt / flight.duration);
        const t = flight.progress, ease = t * t * (3 - 2 * t), old = point(owl);
        owl.x = flight.from.x + (flight.to.x - flight.from.x) * ease;
        owl.y = flight.from.y + (flight.to.y - flight.from.y) * ease;
        owl.vx = (owl.x - old.x) / dt;
        owl.vy = (owl.y - old.y) / dt;
        owl.anim += dt * 14;
        if (t < 1)
            return;
        owl.previousTreeId = owl.treeId;
        owl.treeId = flight.treeId;
        owl.perch = point(flight.to);
        owl.flight = null;
        owl.x = owl.perch.x;
        owl.y = owl.perch.y;
        owl.vx = 0;
        owl.vy = 0;
        owl.moving = false;
        owl.anim = 0;
        owl.relocations = (owl.relocations || 0) + 1;
        owl.heading = owl.lastSeen && (owl.lastSeenAge ?? 99) < 6 && distance(owl.perch, owl.lastSeen) < owl.range * 1.4 ?
            Math.atan2(owl.lastSeen.y - owl.y, owl.lastSeen.x - owl.x) : watchHeading(owl.perch);
        owl.direction = direction(owl.heading);
        owl.lookTarget = owl.heading;
        owl.lookTimer = 2.4;
        owl.watchAge = 0;
        owl.areaId = getAreaAt(owl.x, owl.y).id;
        owl.cooldown = 0;
        owl.grace = .6;
        owl.mode = 'watch';
        owl.alertProgress = 0;
        owl.target = null;
        owl.callTime = 0;
        owl.movePending = false;
        GameManager.save(game);
    }
    function direction(angle) {
        return Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle)) ? (Math.cos(angle) < 0 ? 'left' : 'right') : (Math.sin(angle) < 0 ? 'up' : 'down');
    }
    function canSee(owl, chicken) {
        if (owl.mode === 'relocate' || chicken.hidden || chicken.invulnerable > 0 || WildlifeRules.overlapsRefuge(chicken, chicken.hitbox.r) ||
            distance(owl.perch, chicken) > owl.range)
            return false;
        const angle = Math.atan2(chicken.y - owl.perch.y, chicken.x - owl.perch.x);
        const difference = Math.atan2(Math.sin(angle - owl.heading), Math.cos(angle - owl.heading));
        return Math.abs(difference) <= owl.fov / 2 && DetectionSystem.hasLineOfSight(owl.perch, getHitbox(chicken), obstacles(owl));
    }
    function visible(game, owl) {
        return distance(game.entities.chicken, owl) < 450 && WildlifeRules.onScreen(owl, 100) &&
            (owl.mode === 'relocate' || DetectionSystem.hasLineOfSight(getHitbox(game.entities.chicken), owl.perch, obstacles(owl)));
    }
    function update(game, dt) {
        if (game.phase !== 'playing' || game.lake?.active || !Number.isFinite(dt) || dt <= 0)
            return;
        dt = Math.min(dt, .1);
        for (const owl of game.entities.owls || []) {
            owl.lastSeenAge = (owl.lastSeenAge ?? 99) + dt;
            owl.watchAge = (owl.watchAge || 0) + dt;
            if (owl.lastSeenAge > 6) {
                owl.lastSeen = null;
                owl.observedMotion = { x: 0, y: 0 };
            }
            owl.cooldown = Math.max(0, owl.cooldown - dt);
            owl.grace = Math.max(0, owl.grace - dt);
            owl.callTime = Math.max(0, (owl.callTime || 0) - dt);
            if (owl.mode === 'relocate') {
                fly(game, owl, dt);
                continue;
            }
            owl.relocateRetry = Math.max(0, (owl.relocateRetry || 0) - dt);
            if (owl.movePending && owl.callTime === 0 && owl.relocateRetry === 0) {
                if (relocate(game, owl))
                    continue;
            }
            owl.anim += dt * 2;
            owl.x = owl.perch.x;
            owl.y = owl.perch.y;
            if (owl.mode !== 'alert' && owl.callTime === 0)
                survey(owl, dt);
            if (owl.cooldown > 0 || owl.grace > 0) {
                owl.alertProgress = 0;
                owl.target = null;
                continue;
            }
            if (owl.mode === 'cooldown')
                owl.mode = 'watch';
            if (canSee(owl, game.entities.chicken) && visible(game, owl)) {
                const chicken = game.entities.chicken, old = owl.lastSeen, age = owl.lastSeenAge;
                const velocity = old && age <= .2 ? { x: (chicken.x - old.x) / age, y: (chicken.y - old.y) / age } : { x: 0, y: 0 };
                owl.observedMotion = Math.hypot(velocity.x, velocity.y) <= game.settings.chickenSpeed * 1.6 ? velocity : { x: 0, y: 0 };
                owl.lastSeen = point(chicken);
                owl.lastSeenAge = 0;
                owl.watchAge = 0;
                owl.surveillance = 'alarm';
                owl.mode = 'alert';
                owl.target = point(game.entities.chicken);
                owl.callHeading = Math.atan2(owl.target.y - owl.y, owl.target.x - owl.x);
                owl.direction = direction(owl.callHeading);
                owl.alertProgress = Math.min(1, owl.alertProgress + dt / owl.alertTime);
                if (owl.alertProgress >= 1) {
                    const heard = WolfAI.investigateSound(game, point(owl.perch), 360, point(owl.target), obstacles(owl));
                    owl.callTime = .72;
                    AudioSystem.play('owl-siren', { volume: .72 });
                    setStatus(heard ? 'UÍ-Ó! A coruja chamou o lobo e vai trocar de árvore! Procure cobertura.' : 'UÍ-Ó! A coruja deu o alarme e vai trocar de árvore!');
                    owl.mode = 'cooldown';
                    owl.cooldown = 5.5;
                    owl.alertProgress = 0;
                    owl.target = null;
                    owl.movePending = true;
                    owl.relocateRetry = 0;
                    GameManager.save(game);
                }
            }
            else {
                owl.mode = 'watch';
                owl.alertProgress = 0;
                owl.target = null;
                owl.direction = direction(owl.heading);
                const interval = (game.difficultyKey === 'easy' ? 32 : ['hard', 'hardcore'].includes(game.difficultyKey) ? 24 : 28) + WildlifeRules.rank(owl.id) % 5;
                if (owl.watchAge >= interval && !owl.movePending && !(game.entities.owls || []).some(other => other !== owl && other.mode === 'relocate')) {
                    owl.movePending = true;
                    owl.relocateRetry = 0;
                }
            }
        }
    }
    function cone(owl) {
        // Nearby gaze angles share the expensive scenery trace during a continuous head turn.
        const heading = Math.round(owl.heading * 40) / 40, key = [owl.perch.x, owl.perch.y, heading, owl.range, owl.fov].join(',');
        const cached = coneCache.get(owl);
        if (cached?.source === OBSTACLES && cached.key === key)
            return cached.points;
        const walls = obstacles(owl), points = [];
        for (let i = 0; i <= 24; i++) {
            const angle = heading - owl.fov / 2 + owl.fov * i / 24, dx = Math.cos(angle), dy = Math.sin(angle);
            let lo = 0, hi = owl.range;
            if (!DetectionSystem.hasLineOfSight(owl.perch, { x: owl.x + dx * hi, y: owl.y + dy * hi }, walls)) {
                for (let j = 0; j < 10; j++) {
                    const middle = (lo + hi) / 2;
                    if (DetectionSystem.hasLineOfSight(owl.perch, { x: owl.x + dx * middle, y: owl.y + dy * middle }, walls))
                        lo = middle;
                    else
                        hi = middle;
                }
            }
            points.push({ x: owl.x + dx * hi, y: owl.y + dy * hi });
        }
        coneCache.set(owl, { source: OBSTACLES, key, points });
        return points;
    }
    function drawGround(game) {
        if (game.phase !== 'playing' || game.lake?.active)
            return;
        for (const owl of game.entities.owls || []) {
            if (!visible(game, owl) || owl.mode === 'cooldown' || owl.mode === 'relocate')
                continue;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(worldX(owl.x), worldY(owl.y));
            for (const p of cone(owl))
                ctx.lineTo(worldX(p.x), worldY(p.y));
            ctx.closePath();
            ctx.fillStyle = owl.mode === 'alert' ? '#efd47635' : '#e6dba514';
            ctx.fill();
            ctx.strokeStyle = owl.mode === 'alert' ? '#efd47675' : '#e6dba530';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        }
    }
    function drawEntity(owl) {
        if (!WildlifeRules.onScreen(owl, 150))
            return;
        if (owl.mode === 'relocate') {
            OwlArt.draw(ctx, owl, camera);
            return;
        }
        const x = Math.round(worldX(owl.perch.x)), y = Math.round(worldY(owl.perch.y)) - 54;
        // A short branch connects the claws to the trunk, rather than a shadow floating in the canopy.
        ctx.save();
        ctx.strokeStyle = '#493e2d';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x - 12, y + 9);
        ctx.lineTo(x + 21, y + 14);
        ctx.stroke();
        ctx.strokeStyle = '#ad875b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 12, y + 8);
        ctx.lineTo(x + 21, y + 12);
        ctx.stroke();
        ctx.restore();
        OwlArt.draw(ctx, owl, camera);
    }
    function drawIndicators(game) {
        if (game.phase !== 'playing' || game.lake?.active)
            return;
        for (const owl of game.entities.owls || []) {
            if (owl.mode !== 'alert' || !visible(game, owl))
                continue;
            const x = worldX(owl.x), y = worldY(owl.y) - 112;
            ctx.save();
            ctx.fillStyle = '#29392ee6';
            ctx.fillRect(x - 27, y, 54, 9);
            ctx.fillStyle = '#f4d16a';
            ctx.fillRect(x - 25, y + 2, 50 * owl.alertProgress, 5);
            ctx.restore();
        }
    }
    function snapshot(game) {
        return (game.entities.owls || []).map(o => ({ id: o.id, cooldown: o.cooldown, treeId: o.flight?.treeId || o.treeId,
            previousTreeId: o.flight ? o.treeId : o.previousTreeId, relocations: (o.relocations || 0) + (o.flight ? 1 : 0), movePending: !!o.movePending }));
    }
    function restore(game, saved) {
        initialize(game);
        if (!Array.isArray(saved))
            return;
        const trees = perches(game, false), claimed = new Set();
        for (const owl of game.entities.owls || []) {
            const s = saved.find(v => v && typeof v === 'object' && v.id === owl.id);
            const perch = trees.find(p => p.tree.id === s?.treeId && !claimed.has(p.tree.id)) ||
                trees.find(p => p.tree.id === owl.treeId && !claimed.has(p.tree.id)) || trees.find(p => !claimed.has(p.tree.id));
            if (perch) {
                owl.treeId = perch.tree.id;
                owl.perch = point(perch.ground);
                owl.x = owl.perch.x;
                owl.y = owl.perch.y;
                owl.heading = watchHeading(owl.perch);
                owl.direction = direction(owl.heading);
                owl.areaId = getAreaAt(owl.x, owl.y).id;
                claimed.add(owl.treeId);
            }
            if (s && Number.isFinite(s.cooldown)) {
                owl.cooldown = clamp(s.cooldown, 0, 5.5);
                owl.mode = owl.cooldown > 0 ? 'cooldown' : 'watch';
            }
            owl.previousTreeId = typeof s?.previousTreeId === 'string' ? s.previousTreeId : undefined;
            owl.relocations = Number.isFinite(s?.relocations) ? clamp(Math.floor(s.relocations), 0, 1000000) : 0;
            owl.movePending = s?.movePending === true || (s?.movePending === undefined && owl.cooldown > 0);
            owl.relocateRetry = owl.movePending ? 1 : 0;
        }
    }
    return { initialize, update, canSee, visible, drawGround, drawEntity, drawIndicators, snapshot, restore };
})();
