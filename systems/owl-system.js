"use strict";
/* A perched sentinel observes a fixed sector. Losing cover cancels its unfinished alarm. */
const OwlSystem = (() => {
    const point = WildlifeRules.point;
    const coneCache = new WeakMap();
    function obstacles(owl) {
        const own = HidingSpots.getSpots().find(s => s.id === owl.treeId)?.blockingRect;
        return own ? OBSTACLES.filter(o => !(o.x === own.x && o.y === own.y && o.w === own.w && o.h === own.h)) : OBSTACLES;
    }
    function initialize(game) {
        const trees = (WORLD.layout.vegetation || []).filter(t => t.type === 'tree' && t.blockingRect).map(t => ({
            tree: t, ground: { x: t.x + t.w / 2, y: t.blockingRect.y + t.blockingRect.h }, rank: WildlifeRules.rank(t.id, 0x416657)
        })).filter(t => !WildlifeRules.reserved(game, t.ground, 100) && WildlifeRules.pathDistance(t.ground) < 230)
            .sort((a, b) => a.rank - b.rank);
        const chosen = [];
        for (const t of trees) {
            if (chosen.every(c => distance(t.ground, c.ground) > 500) &&
                (game.entities.foxes || []).every(f => distance(t.ground, f.home) > 240))
                chosen.push(t);
            if (chosen.length === 2)
                break;
        }
        game.entities.owls = chosen.map(({ tree, ground }) => {
            const nearest = WORLD.paths.map(r => ({ x: clamp(ground.x, r.x, r.x + r.w), y: clamp(ground.y, r.y, r.y + r.h) }))
                .sort((a, b) => distance(a, ground) - distance(b, ground))[0] || WORLD.layout.start;
            const heading = Math.atan2(nearest.y - ground.y, nearest.x - ground.x);
            return { id: `owl-${tree.id}`, type: 'owl', ...ground, radius: 10, hitbox: { ox: 0, oy: 0, r: 6 }, vx: 0, vy: 0,
                facing: Math.cos(heading) < 0 ? -1 : 1, direction: direction(heading), moving: false, anim: 0,
                areaId: getAreaAt(ground.x, ground.y).id, state: 'idle', mode: 'watch', perch: point(ground), treeId: tree.id,
                heading, range: 250, fov: Math.PI * .65, alertTime: game.difficultyKey === 'easy' ? 1.7 : game.difficultyKey === 'hard' ? 1.15 : 1.4,
                alertProgress: 0, cooldown: 0, grace: 2, target: null };
        });
    }
    function direction(angle) {
        return Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle)) ? (Math.cos(angle) < 0 ? 'left' : 'right') : (Math.sin(angle) < 0 ? 'up' : 'down');
    }
    function canSee(owl, chicken) {
        if (chicken.hidden || chicken.invulnerable > 0 || distance(owl.perch, chicken) > owl.range)
            return false;
        const angle = Math.atan2(chicken.y - owl.perch.y, chicken.x - owl.perch.x);
        const difference = Math.atan2(Math.sin(angle - owl.heading), Math.cos(angle - owl.heading));
        return Math.abs(difference) <= owl.fov / 2 && DetectionSystem.hasLineOfSight(owl.perch, getHitbox(chicken), obstacles(owl));
    }
    function visible(game, owl) {
        return distance(game.entities.chicken, owl.perch) < 450 && WildlifeRules.onScreen(owl.perch, 100) &&
            DetectionSystem.hasLineOfSight(getHitbox(game.entities.chicken), owl.perch, obstacles(owl));
    }
    function update(game, dt) {
        if (game.phase !== 'playing' || game.lake?.active || !Number.isFinite(dt) || dt <= 0)
            return;
        dt = Math.min(dt, .1);
        for (const owl of game.entities.owls || []) {
            owl.cooldown = Math.max(0, owl.cooldown - dt);
            owl.grace = Math.max(0, owl.grace - dt);
            owl.anim += dt * 2;
            owl.x = owl.perch.x;
            owl.y = owl.perch.y;
            if (owl.cooldown > 0 || owl.grace > 0) {
                owl.alertProgress = 0;
                owl.target = null;
                continue;
            }
            if (owl.mode === 'cooldown')
                owl.mode = 'watch';
            if (canSee(owl, game.entities.chicken) && visible(game, owl)) {
                owl.mode = 'alert';
                owl.target = point(game.entities.chicken);
                owl.direction = direction(Math.atan2(owl.target.y - owl.y, owl.target.x - owl.x));
                // Quiet movement gives time to cross the edge of the cone; it is not invisibility.
                const attention = game.entities.chicken.sneaking ? .45 : 1;
                owl.alertProgress = Math.min(1, owl.alertProgress + dt / owl.alertTime * attention);
                if (owl.alertProgress >= 1) {
                    const heard = WolfAI.investigateSound(game, point(owl.perch), 360, point(owl.target), obstacles(owl));
                    AudioSystem.play('owl-hoot', { volume: .45 });
                    setStatus(heard ? 'O lobo ouviu a coruja! Saia desse caminho e procure cobertura.' : 'A coruja deu alarme. Saia do campo de visão para despistá-la.');
                    owl.mode = 'cooldown';
                    owl.cooldown = 5.5;
                    owl.alertProgress = 0;
                    owl.target = null;
                    GameManager.save(game);
                }
            }
            else {
                owl.mode = 'watch';
                owl.alertProgress = 0;
                owl.target = null;
                owl.direction = direction(owl.heading);
            }
        }
    }
    function cone(owl) {
        const key = [owl.perch.x, owl.perch.y, owl.heading, owl.range, owl.fov].join(',');
        const cached = coneCache.get(owl);
        if (cached?.source === OBSTACLES && cached.key === key)
            return cached.points;
        const walls = obstacles(owl), points = [];
        for (let i = 0; i <= 24; i++) {
            const angle = owl.heading - owl.fov / 2 + owl.fov * i / 24, dx = Math.cos(angle), dy = Math.sin(angle);
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
            if (!visible(game, owl) || owl.mode === 'cooldown')
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
        if (!WildlifeRules.onScreen(owl.perch, 110))
            return;
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
        return (game.entities.owls || []).map(o => ({ id: o.id, cooldown: o.cooldown }));
    }
    function restore(game, saved) {
        initialize(game);
        if (!Array.isArray(saved))
            return;
        for (const owl of game.entities.owls || []) {
            const s = saved.find(v => v && typeof v === 'object' && v.id === owl.id);
            if (s && Number.isFinite(s.cooldown)) {
                owl.cooldown = clamp(s.cooldown, 0, 5.5);
                owl.mode = owl.cooldown > 0 ? 'cooldown' : 'watch';
            }
        }
    }
    return { initialize, update, canSee, visible, drawGround, drawEntity, drawIndicators, snapshot, restore };
})();
