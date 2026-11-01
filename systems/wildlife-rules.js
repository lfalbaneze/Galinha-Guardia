"use strict";
/* Shared geometry for local encounters. Decorations never become invisible obstacles. */
const WildlifeRules = (() => {
    const motions = new WeakMap();
    function motion(body, target = body) {
        let m = motions.get(body);
        if (!m) {
            m = { target: point(target), progressTarget: point(target), route: [], retry: 0, stalled: 0, best: Infinity, recoveries: 0, action: 'idle', reason: 'sem destino', changes: [], source: OBSTACLES };
            motions.set(body, m);
        }
        return m;
    }
    function decide(body, action, reason) {
        const m = motion(body);
        if (m.action === action && m.reason === reason)
            return;
        m.action = action;
        m.reason = reason;
        m.changes.push(`${action}: ${reason}`);
        m.changes = m.changes.slice(-6);
    }
    function progress(body, target, dt) {
        const m = motion(body, target), gap = distance(body, target);
        if (distance(m.progressTarget, target) > 24) {
            m.progressTarget = point(target);
            m.best = Infinity;
            m.stalled = 0;
        }
        if (gap < m.best - .4) {
            m.best = gap;
            m.stalled = 0;
        }
        else
            m.stalled += dt;
        return m.stalled >= 1.2;
    }
    function navigate(body, target, speed, dt, within = () => true, crowd = []) {
        if (!validPoint(target) || !Number.isFinite(dt) || dt <= 0 || !Number.isFinite(speed) || speed < 0)
            return 'blocked';
        const m = motion(body, target);
        if (distance(m.target, target) > 24 || m.source !== OBSTACLES) {
            m.target = point(target);
            m.route = [];
            m.retry = 0;
            m.stalled = 0;
            m.best = Infinity;
            m.recoveries = 0;
            m.source = OBSTACLES;
        }
        m.retry = Math.max(0, m.retry - dt);
        if (distance(body, target) < .01) {
            m.route = [];
            m.retry = 0;
            m.recoveries = 0;
            m.stalled = 0;
            m.best = Infinity;
            decide(body, 'arrived', 'destino alcançado');
            return 'arrived';
        }
        if (!m.route.length) {
            if (m.retry > 0)
                return m.action === 'unreachable' ? 'unreachable' : 'blocked';
            m.route = clear(body, target, body.hitbox) ? [point(target)] :
                typeof WolfAI !== 'undefined' ? WolfAI.findPath(body, target) : [];
            m.target = point(target);
            if (!m.route.every(p => within(p)) || !m.route.length || distance(m.route[m.route.length - 1], target) > .01) {
                m.route = [];
                m.retry = 1;
                decide(body, 'unreachable', 'destino sem passagem segura');
                return 'unreachable';
            }
            m.retry = .8;
            decide(body, 'route', 'rota recalculada');
        }
        let remaining = speed * dt;
        while (remaining > .001 && m.route.length) {
            const goal = m.route[0], gap = distance(body, goal);
            if (gap < .01) {
                m.route.shift();
                m.best = Infinity;
                m.stalled = 0;
                continue;
            }
            const step = Math.min(4, remaining, gap), angle = Math.atan2(goal.y - body.y, goal.x - body.x);
            const current = getHitbox(body);
            const next = [0, .65, -.65, 1.25, -1.25, Math.PI / 2, -Math.PI / 2, 2, -2].map(turn => ({ x: body.x + Math.cos(angle + turn) * step, y: body.y + Math.sin(angle + turn) * step }))
                .find(p => within(p) && walkableStep(body, p) && crowd.every(a => {
                if (a === body)
                    return true;
                const foot = { x: p.x + body.hitbox.ox, y: p.y + body.hitbox.oy }, other = getHitbox(a);
                return distance(foot, other) >= body.hitbox.r + other.r + 2 || distance(foot, other) >= distance(current, other) - .001;
            }));
            if (!next) {
                const stuck = progress(body, goal, dt);
                m.route = [];
                m.retry = .25;
                decide(body, stuck ? 'unreachable' : 'blocked', stuck ? 'passagem bloqueada: escolher outro destino' : 'obstáculo ou vizinho na passagem');
                return stuck ? 'unreachable' : 'blocked';
            }
            Player.face(body, next.x - body.x, next.y - body.y);
            body.x = next.x;
            body.y = next.y;
            remaining -= step;
            if (progress(body, goal, dt * step / Math.max(.001, speed * dt))) {
                m.route = [];
                m.stalled = 0;
                m.best = Infinity;
                m.recoveries++;
                const result = m.recoveries >= 2 ? 'unreachable' : 'blocked';
                m.retry = result === 'unreachable' ? 1 : 0;
                decide(body, result, result === 'unreachable' ? 'desvio repetido sem progresso: escolher outro destino' : 'sem progresso: tentar outra rota');
                return result;
            }
        }
        if (distance(body, target) < .01) {
            m.route = [];
            m.retry = 0;
            m.recoveries = 0;
            m.stalled = 0;
            m.best = Infinity;
            decide(body, 'arrived', 'destino alcançado');
            return 'arrived';
        }
        return m.route.length ? 'moving' : 'blocked';
    }
    function walkableStep(body, next) {
        if (clear(body, next, body.hitbox))
            return true;
        if (clear(body, body, body.hitbox))
            return false;
        // Rounded collision corners can start inside the conservative route padding.
        const free = (p) => OBSTACLES.every(o => o.blocking === false || Math.hypot(p.x + body.hitbox.ox - clamp(p.x + body.hitbox.ox, o.x, o.x + o.w), p.y + body.hitbox.oy - clamp(p.y + body.hitbox.oy, o.y, o.y + o.h)) >= body.hitbox.r - .001);
        if (!free(body) || !free(next))
            return false;
        const probe = { ...body };
        Player.move(probe, next.x - body.x, next.y - body.y);
        return distance(probe, next) < .001;
    }
    const signals = new WeakMap();
    let serial = 0;
    function report(game, source, kind, observed) {
        if (game.phase !== 'playing' || game.lake?.active || !validPoint(source) || !validPoint(observed))
            return;
        const now = game.elapsed || 0, list = (signals.get(game.entities.wolf) || []).filter(s => now >= s.time && now - s.time < 4);
        if (list.some(s => s.source === source.id && now - s.time < 1))
            return;
        list.push({ id: ++serial, source: source.id, kind, origin: point(source), point: point(observed), time: now });
        signals.set(game.entities.wolf, list.slice(-12));
    }
    function hear(game, listener, after = 0) {
        const now = game.elapsed || 0;
        const s = [...(signals.get(game.entities.wolf) || [])].reverse().find(s => s.id > after && s.source !== listener.id && now >= s.time && now - s.time < 4 &&
            distance(listener, s.origin) <= 300 * Math.pow(.6, OBSTACLES.filter(o => o.opaque !== false && o.type !== 'pond' &&
                DetectionSystem.segmentIntersectsRect(getHitbox(listener), s.origin, o)).length));
        return s ? { ...s, origin: point(s.origin), point: point(s.point) } : null;
    }
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
    function overlapsRefuge(p, radius = 0) {
        const r = FarmRefuge.bounds;
        return Math.hypot(p.x - clamp(p.x, r.x, r.x + r.w), p.y - clamp(p.y, r.y, r.y + r.h)) <= radius;
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
    return { point, validPoint, rank, pathDistance, reserved, clear, onScreen, overlapsRefuge, observe, move, navigate, progress, decide, report, hear,
        reset: (body) => { motions.delete(body); signals.delete(body); },
        diagnostics: (body) => {
            const m = motions.get(body);
            return m ? { target: point(m.target), route: m.route.map(point),
                action: m.action, reason: m.reason, stalled: m.stalled, recoveries: m.recoveries, changes: [...m.changes] } : null;
        } };
})();
