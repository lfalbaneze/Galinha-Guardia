"use strict";
/* Detection is the only place the wolf may observe the chicken's position. */
const DetectionSystem = (() => {
    const defaults = { range: 340, fov: Math.PI * 92 / 180, closeRange: 48,
        contactRange: 28, noiseRange: 120 };
    function segmentIntersectsRect(from, to, rect) {
        let enter = 0;
        let leave = 1;
        for (const axis of ["x", "y"]) {
            const delta = to[axis] - from[axis];
            const min = rect[axis];
            const max = min + (axis === "x" ? rect.w : rect.h);
            if (Math.abs(delta) < 0.000001) {
                if (from[axis] < min || from[axis] > max)
                    return false;
            }
            else {
                const a = (min - from[axis]) / delta;
                const b = (max - from[axis]) / delta;
                enter = Math.max(enter, Math.min(a, b));
                leave = Math.min(leave, Math.max(a, b));
                if (enter > leave)
                    return false;
            }
        }
        return true;
    }
    function hasLineOfSight(from, to, obstacles = OBSTACLES) {
        return !obstacles.some(rect => rect.type !== "pond" && rect.opaque !== false &&
            segmentIntersectsRect(from, to, rect));
    }
    function canSee(wolf, chicken, options = {}) {
        if (chicken.hidden)
            return false;
        const config = { ...defaults, ...options };
        const dx = chicken.x - wolf.x;
        const dy = chicken.y - wolf.y;
        const distance = Math.hypot(dx, dy);
        if (distance > config.range && distance > config.closeRange)
            return false;
        if (!hasLineOfSight(wolf, chicken))
            return false;
        if (distance <= config.closeRange)
            return true;
        const heading = Number.isFinite(wolf.heading) ? wolf.heading : wolf.facing < 0 ? Math.PI : 0;
        const bearing = Math.atan2(dy, dx) - heading;
        const angle = Math.abs(Math.atan2(Math.sin(bearing), Math.cos(bearing)));
        return distance <= config.range && angle <= config.fov / 2;
    }
    function hear(wolf, chicken, config) {
        if (chicken.hidden || !chicken.sprinting || Math.hypot(chicken.vx || 0, chicken.vy || 0) <= 10)
            return null;
        const distance = Math.hypot(chicken.x - wolf.x, chicken.y - wolf.y);
        // Sight progression never expands hearing into a farm-wide player tracker.
        const soundRadius = (Number.isFinite(config.noiseRange) ? Math.max(0, Math.min(180, config.noiseRange)) : defaults.noiseRange) *
            SkinSystem.power(chicken).noiseScale;
        if (distance > soundRadius)
            return null;
        const walls = OBSTACLES.filter(rect => rect.type !== "pond" && rect.opaque !== false &&
            segmentIntersectsRect(wolf, chicken, rect)).length;
        // Sound is local and muffled by cover; it never supplies a precise visual target.
        const range = soundRadius * Math.pow(0.6, walls);
        if (distance > range)
            return null;
        const cell = 64;
        return { x: Math.max(0, Math.min(WORLD.width, Math.round(chicken.x / cell) * cell)),
            y: Math.max(0, Math.min(WORLD.height, Math.round(chicken.y / cell) * cell)) };
    }
    function perceive(wolf, chicken, options = {}) {
        const config = { ...defaults, ...options };
        const visible = canSee(wolf, chicken, config);
        const distance = Math.hypot(chicken.x - wolf.x, chicken.y - wolf.y);
        return { visible, distance, contact: visible && distance <= config.contactRange,
            seenPoint: visible ? { x: chicken.x, y: chicken.y } : null,
            heardPoint: hear(wolf, chicken, config) };
    }
    return { canDetect: canSee, canSee, perceive, hasLineOfSight, segmentIntersectsRect };
})();
