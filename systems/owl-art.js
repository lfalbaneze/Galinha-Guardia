"use strict";
/* Four-direction pixel sheet with the same world foot plane as the farm cast. */
const OwlArt = (() => {
    const frames = [
        { x: 92, y: 56, w: 244, h: 300 }, { x: 419, y: 56, w: 247, h: 300 }, { x: 746, y: 56, w: 247, h: 300 },
        { x: 77, y: 382, w: 264, h: 303 }, { x: 402, y: 382, w: 278, h: 303 }, { x: 729, y: 382, w: 280, h: 303 },
        { x: 59, y: 705, w: 280, h: 309 }, { x: 398, y: 705, w: 281, h: 309 }, { x: 729, y: 705, w: 275, h: 309 },
        { x: 91, y: 1033, w: 245, h: 304 }, { x: 419, y: 1033, w: 247, h: 304 }, { x: 749, y: 1033, w: 244, h: 304 }
    ];
    const sheet = createWildlifeSheet('assets/sprites/sources/owl-custom.png', 1086, 1448, frames);
    const rows = { down: 0, left: 1, right: 2, up: 3 };
    function frameFor(owl) {
        return { row: rows[owl.direction] ?? 0, column: owl.mode === 'alert' ? 2 : owl.mode === 'cooldown' ? 1 : 0 };
    }
    function draw(c, owl, view) {
        const x = Math.round(owl.perch.x - view.x + (view.shakeX || 0)), feet = Math.round(owl.perch.y - view.y + (view.shakeY || 0)) - 42;
        const frame = frameFor(owl);
        return sheet.drawFrame(c, x, feet, frame.row, frame.column, .15, 42);
    }
    return { draw, frameFor, frames, load: sheet.load, install: sheet.install, get ready() { return sheet.ready; }, get loading() { return sheet.loading; }, get errors() { return sheet.errors; } };
})();
