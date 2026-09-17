"use strict";
/* Shared geometry for local encounters. Decorations never become invisible obstacles. */
const WildlifeRules = (() => {
    const point = (p) => ({ x: p.x, y: p.y });
    function validPoint(p) {
        if (!p || typeof p !== 'object')
            return false;
        const v = p;
        return Number.isFinite(v.x) && Number.isFinite(v.y) && v.x >= 0 && v.y >= 0 && v.x <= WORLD.width && v.y <= WORLD.height;
    }
    function rank(id, salt = 0) {
        let value = (WORLD.layout.seed ^ salt) >>> 0;
        for (const letter of id)
            value = Math.imul(value ^ letter.charCodeAt(0), 16777619) >>> 0;
        return (value ^ value >>> 16) >>> 0;
    }
    function pathDistance(p) {
        return WORLD.paths.reduce((d, r) => Math.min(d, Math.hypot(p.x - clamp(p.x, r.x, r.x + r.w), p.y - clamp(p.y, r.y, r.y + r.h))), Infinity);
    }
    function reserved(game, p, margin = 110) {
        return distance(p, WORLD.layout.start) < 360 || distance(p, WORLD.safeZone) < WORLD.safeZone.r + margin ||
            (!!game.entities.goose && distance(p, game.entities.goose.home) < LakeChallenge.radius + margin) ||
            WORLD.layout.animalSpawns.some(a => distance(p, a) < 95);
    }
    function clear(from, to, box, obstacles = OBSTACLES) {
        const a = { x: from.x + box.ox, y: from.y + box.oy }, b = { x: to.x + box.ox, y: to.y + box.oy }, r = box.r + .25;
        if (!validPoint(b) || b.x < r || b.y < r || b.x > WORLD.width - r || b.y > WORLD.height - r)
            return false;
        return obstacles.every(o => o.blocking === false || !DetectionSystem.segmentIntersectsRect(a, b, { x: o.x - r, y: o.y - r, w: o.w + 2 * r, h: o.h + 2 * r }));
    }
    function onScreen(p, margin = 20) {
        // Tests may run a system without a camera. Normal play always supplies it.
        return typeof camera === 'undefined' || (p.x >= camera.x - margin && p.y >= camera.y - margin && p.x <= camera.x + canvas.width + margin && p.y <= camera.y + canvas.height + margin);
    }
    function observe(game, origin, range, obstacles = OBSTACLES) {
        const p = game.entities.chicken;
        return !p.hidden && p.invulnerable <= 0 && distance(origin, p) <= range &&
            DetectionSystem.hasLineOfSight(origin, getHitbox(p), obstacles);
    }
    function move(body, target, amount, onStep) {
        const dx = target.x - body.x, dy = target.y - body.y, length = Math.hypot(dx, dy);
        if (length < .01)
            return 'arrived';
        const travel = Math.min(length, amount), steps = Math.max(1, Math.ceil(travel / 5));
        for (let i = 0; i < steps; i++) {
            const next = { x: body.x + dx / length * travel / steps, y: body.y + dy / length * travel / steps };
            if (!clear(body, next, body.hitbox))
                return 'blocked';
            body.x = next.x;
            body.y = next.y;
            if (onStep?.())
                return 'hit';
        }
        Player.face(body, dx, dy);
        return length <= amount + .01 ? 'arrived' : 'moving';
    }
    return { point, validPoint, rank, pathDistance, reserved, clear, onScreen, observe, move };
})();
