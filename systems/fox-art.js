"use strict";
/* Four-direction pixel sheet with the same world foot plane as the farm cast. */
const FoxArt = (() => {
    const sheet = createWildlifeSheet('assets/sprites/sources/fox.png', 64, 64, [60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60]);
    const rows = { up: 0, right: 1, down: 2, left: 3 };
    function frameFor(fox) {
        return { row: rows[fox.direction] ?? 2, column: fox.moving && !InterfaceMotion.reduced ? [1, 0, 2, 0][Math.floor(Math.abs(fox.anim)) % 4] : 0 };
    }
    function draw(c, fox, view) {
        if (!sheet.ready || fox.mode === 'hidden' || fox.mode === 'warning')
            return false;
        const x = Math.round(fox.x - view.x + (view.shakeX || 0)), y = Math.round(fox.y - view.y + (view.shakeY || 0)), frame = frameFor(fox);
        c.save();
        c.fillStyle = 'rgba(45,49,25,.2)';
        c.beginPath();
        c.ellipse(x, y + 14, 17, 3, 0, 0, Math.PI * 2);
        c.fill();
        c.restore();
        return sheet.drawFrame(c, x, y + 14, frame.row, frame.column, 1);
    }
    return { draw, frameFor, load: sheet.load, install: sheet.install, get ready() { return sheet.ready; }, get loading() { return sheet.loading; }, get errors() { return sheet.errors; } };
})();
