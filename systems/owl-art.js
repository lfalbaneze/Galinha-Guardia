"use strict";
/* Four-direction pixel sheet with the same world foot plane as the farm cast. */
const OwlArt = (() => {
    const sheet = createWildlifeSheet('assets/sprites/sources/owl.png', 48, 48, [44, 44, 44, 44, 44, 44, 44, 44, 44, 44, 44, 44]);
    const rows = { up: 0, right: 1, down: 2, left: 3 };
    function frameFor(owl) {
        return { row: rows[owl.direction] ?? 2, column: owl.mode === 'alert' ? 2 : owl.mode === 'cooldown' ? 1 : 0 };
    }
    function draw(c, owl, view) {
        const x = Math.round(owl.perch.x - view.x + (view.shakeX || 0)), feet = Math.round(owl.perch.y - view.y + (view.shakeY || 0)) - 42;
        const frame = frameFor(owl);
        return sheet.drawFrame(c, x, feet, frame.row, frame.column, 1);
    }
    return { draw, frameFor, load: sheet.load, install: sheet.install, get ready() { return sheet.ready; }, get loading() { return sheet.loading; }, get errors() { return sheet.errors; } };
})();
