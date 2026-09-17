"use strict";
/* The fox commits to the direction shown by its warning, never to a hidden player. */
const FoxSystem = (() => {
    const HITBOX = { ox: 0, oy: 8, r: 14 };
    const LEASH = 170;
    const point = WildlifeRules.point;
    function getConfig(game) {
        return { warning: game.difficultyKey === 'easy' ? 1.25 : game.difficultyKey === 'hard' ? .9 : 1.1,
            speed: game.settings.chickenSpeed * 1.15, rest: 1.05, cooldown: 3.2 };
    }
    function initialize(game) {
        const bonus = new Set(game.entities.chicks.map(c => c.coverId));
        const candidates = HidingSpots.getSpots().filter(s => s.type === 'bush' && !bonus.has(s.id)).map(s => ({
            spot: s, home: { x: s.x + s.w / 2, y: s.y + s.h - 9 }, rank: WildlifeRules.rank(s.id, 0x715be19)
        })).filter(c => !WildlifeRules.reserved(game, c.home) && WildlifeRules.pathDistance(c.home) <= 190 &&
            WildlifeRules.clear(c.home, c.home, HITBOX)).sort((a, b) => a.rank - b.rank);
        const chosen = [];
        for (const c of candidates) {
            if (chosen.every(p => distance(p.home, c.home) > 390))
                chosen.push(c);
            if (chosen.length === 2)
                break;
        }
        game.entities.foxes = chosen.map(({ spot, home }, i) => ({ id: `fox-${spot.id}`, type: 'fox', ...home,
            radius: 23, hitbox: { ...HITBOX }, vx: 0, vy: 0, facing: 1, direction: 'right', moving: false, anim: 0,
            areaId: getAreaAt(home.x, home.y).id, state: 'idle', mode: 'hidden', home: point(home), anchor: point(home),
            target: point(home), bushId: spot.id, timer: 0, cooldown: 1 + i * .5, grace: 2, notice: 0, attempts: 0, hit: false, route: [] }));
    }
    function visible(game, fox) {
        return distance(game.entities.chicken, fox) < 400 && WildlifeRules.onScreen(fox, 80) &&
            DetectionSystem.hasLineOfSight(getHitbox(game.entities.chicken), getHitbox(fox));
    }
    function plan(fox, target) {
        const dx = target.x - fox.x, dy = target.y - fox.y, length = Math.hypot(dx, dy);
        let end = point(fox);
        if (length < 1)
            return end;
        for (let s = 5; s <= LEASH; s += 5) {
            const next = { x: fox.x + dx / length * s, y: fox.y + dy / length * s };
            if (!WildlifeRules.clear(end, next, fox.hitbox) || distance(fox.home, next) > LEASH)
                break;
            end = next;
        }
        return end;
    }
    function rest(fox, config) {
        fox.mode = 'rest';
        fox.timer = config.rest;
        fox.cooldown = config.cooldown;
        fox.vx = 0;
        fox.vy = 0;
        fox.moving = false;
    }
    function bump(game, fox) {
        const c = game.entities.chicken;
        if (game.phase !== 'playing' || game.lake?.active || fox.mode !== 'dash' || fox.hit || c.hidden || c.invulnerable > 0 ||
            !circleVsCircle(fox, c) || !DetectionSystem.hasLineOfSight(getHitbox(fox), getHitbox(c)))
            return false;
        const dx = c.x - fox.x, dy = c.y - fox.y, len = Math.hypot(dx, dy), a = Math.atan2(fox.target.y - fox.anchor.y, fox.target.x - fox.anchor.x);
        Player.move(c, (len > .01 ? dx / len : Math.cos(a)) * 54, (len > .01 ? dy / len : Math.sin(a)) * 54);
        c.vx = 0;
        c.vy = 0;
        c.moving = false;
        c.sprinting = false;
        c.invulnerable = 1.2;
        fox.hit = true;
        rest(fox, getConfig(game));
        AudioSystem.play('bonk', { volume: .35 });
        spawnBurst(c.x, c.y, '#dfac75', 8);
        setStatus('Por pouco! A raposa empurra, mas precisa descansar depois do bote.');
        GameManager.save(game);
        return true;
    }
    function update(game, dt) {
        if (game.phase !== 'playing' || game.lake?.active || !Number.isFinite(dt) || dt <= 0)
            return;
        dt = Math.min(dt, .1);
        const config = getConfig(game);
        for (const fox of game.entities.foxes || []) {
            const before = point(fox);
            fox.cooldown = Math.max(0, fox.cooldown - dt);
            fox.grace = Math.max(0, fox.grace - dt);
            fox.timer = Math.max(0, fox.timer - dt);
            if (fox.mode === 'hidden') {
                if (fox.cooldown <= 0 && fox.grace <= 0 && visible(game, fox) && WildlifeRules.observe(game, getHitbox(fox), 135)) {
                    const target = plan(fox, game.entities.chicken);
                    if (distance(fox, target) < 40) {
                        fox.cooldown = 1;
                        continue;
                    }
                    fox.mode = 'warning';
                    fox.anchor = point(fox);
                    fox.target = target;
                    fox.timer = config.warning;
                    fox.hit = false;
                    Player.face(fox, target.x - fox.x, target.y - fox.y);
                    setStatus('Olhos no mato! Saia da direção marcada antes do bote.');
                }
            }
            else if (fox.mode === 'warning') {
                if (!WildlifeRules.observe(game, getHitbox(fox), LEASH + 45)) {
                    fox.mode = 'hidden';
                    fox.cooldown = 1.5;
                }
                else if (fox.timer <= 0) {
                    fox.mode = 'dash';
                    fox.timer = LEASH / config.speed + .1;
                    fox.attempts++;
                }
            }
            else if (fox.mode === 'dash') {
                if (!bump(game, fox)) {
                    const moved = WildlifeRules.move(fox, fox.target, config.speed * dt, () => bump(game, fox));
                    if (fox.mode === 'dash' && (moved !== 'moving' || fox.timer <= 0))
                        rest(fox, config);
                }
            }
            else if (fox.mode === 'rest') {
                if (fox.timer <= 0) {
                    fox.mode = 'return';
                    fox.route = [];
                }
            }
            else {
                let target = fox.home;
                if (!WildlifeRules.clear(fox, target, fox.hitbox)) {
                    if (!fox.route.length && fox.timer <= 0) {
                        fox.route = WolfAI.findPath(fox, fox.home);
                        fox.timer = 1;
                    }
                    if (!fox.route.length)
                        continue;
                    target = fox.route[0];
                }
                const moved = WildlifeRules.move(fox, target, 100 * dt);
                if (moved === 'blocked') {
                    fox.route = [];
                    fox.timer = 1;
                }
                if (moved === 'arrived') {
                    if (distance(fox, fox.home) < 1) {
                        fox.mode = 'hidden';
                        fox.hit = false;
                        fox.cooldown = Math.max(1, fox.cooldown);
                    }
                    else
                        fox.route.shift();
                }
            }
            fox.vx = (fox.x - before.x) / dt;
            fox.vy = (fox.y - before.y) / dt;
            fox.moving = distance(before, fox) > .01;
            fox.state = fox.moving ? 'walk' : 'idle';
            fox.anim += dt * (fox.mode === 'dash' ? 12 : fox.moving ? 7 : 2);
            fox.areaId = getAreaAt(fox.x, fox.y).id;
        }
    }
    function drawWarnings(game) {
        if (game.phase !== 'playing' || game.lake?.active)
            return;
        for (const fox of game.entities.foxes || []) {
            if (fox.mode !== 'warning' || !visible(game, fox))
                continue;
            const x = worldX(fox.x), y = worldY(fox.y), to = worldToScreen(fox.target);
            ctx.save();
            ctx.strokeStyle = '#efb47d';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 6]);
            ctx.beginPath();
            ctx.moveTo(x, y + 8);
            ctx.lineTo(to.x, to.y + 8);
            ctx.stroke();
            ctx.setLineDash([]);
            const shake = InterfaceMotion.reduced ? 0 : Math.sin(fox.anim * 15) * 2;
            ctx.fillStyle = '#493322';
            ctx.fillRect(Math.round(x - 5 + shake), y - 34, 10, 19);
            ctx.fillStyle = '#f7d99a';
            ctx.fillRect(Math.round(x - 2 + shake), y - 32, 4, 10);
            ctx.fillRect(Math.round(x - 2 + shake), y - 19, 4, 3);
            ctx.restore();
        }
    }
    function snapshot(game) {
        return (game.entities.foxes || []).map(f => ({ id: f.id, ...point(f), cooldown: f.cooldown }));
    }
    function restore(game, saved) {
        initialize(game);
        if (!Array.isArray(saved))
            return;
        for (const fox of game.entities.foxes || []) {
            const s = saved.find((v) => v && typeof v === 'object' && v.id === fox.id);
            if (!WildlifeRules.validPoint(s) || distance(s, fox.home) > LEASH || !WildlifeRules.clear(fox.home, s, fox.hitbox))
                continue;
            fox.x = s.x;
            fox.y = s.y;
            fox.mode = distance(fox, fox.home) > 1 ? 'rest' : 'hidden';
            fox.timer = 1.1;
            const cooldown = s.cooldown;
            fox.cooldown = typeof cooldown === 'number' && Number.isFinite(cooldown) ? clamp(cooldown, 1, 5) : 2;
            fox.grace = 2;
        }
    }
    return { initialize, getConfig, update, visible, drawWarnings, snapshot, restore };
})();
