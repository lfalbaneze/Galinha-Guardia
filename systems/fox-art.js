"use strict";
/* Four-direction pixel sheet with the same world foot plane as the farm cast. */
const FoxArt = (() => {
    // Original user PNG: front, left, right, back; three poses per direction.
    const frames = [
        { x: 120, y: 59, w: 167, h: 305 }, { x: 461, y: 59, w: 164, h: 312 }, { x: 804, y: 62, w: 167, h: 312 },
        { x: 44, y: 442, w: 307, h: 229 }, { x: 390, y: 450, w: 325, h: 222 }, { x: 744, y: 452, w: 314, h: 217 },
        { x: 44, y: 757, w: 298, h: 224 }, { x: 381, y: 762, w: 313, h: 219 }, { x: 736, y: 762, w: 303, h: 218 },
        { x: 124, y: 1037, w: 159, h: 311 }, { x: 463, y: 1037, w: 160, h: 312 }, { x: 799, y: 1037, w: 160, h: 304 }
    ];
    const sheet = createWildlifeSheet('assets/sprites/sources/fox-custom.png', 1086, 1448, frames);
    const rows = { down: 0, left: 1, right: 2, up: 3 };
    function frameFor(fox) {
        return { row: rows[fox.direction] ?? 0, column: fox.moving && !InterfaceMotion.reduced ? [0, 1, 0, 2][Math.floor(Math.abs(fox.anim)) % 4] : 0 };
    }
    function draw(c, fox, view) {
        // Waiting in cover is a behavior, not invisibility.
        if (!sheet.ready)
            return false;
        const x = Math.round(fox.x - view.x + (view.shakeX || 0)), y = Math.round(fox.y - view.y + (view.shakeY || 0)), frame = frameFor(fox);
        c.save();
        c.fillStyle = 'rgba(45,49,25,.2)';
        c.beginPath();
        c.ellipse(x, y + 14, 17, 3, 0, 0, Math.PI * 2);
        c.fill();
        c.restore();
        return sheet.drawFrame(c, x, y + 14, frame.row, frame.column, .19);
    }
    return { draw, frameFor, frames, load: sheet.load, install: sheet.install, get ready() { return sheet.ready; }, get loading() { return sheet.loading; }, get errors() { return sheet.errors; } };
})();
