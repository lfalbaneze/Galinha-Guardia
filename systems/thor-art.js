"use strict";
/* One generated golden retriever sheet; source pixels remain unchanged. */
const ThorArt = (() => {
    const frames = [
        { x: 96, y: 55, w: 168, h: 308 }, { x: 431, y: 55, w: 167, h: 315 }, { x: 769, y: 59, w: 167, h: 311 },
        { x: 30, y: 470, w: 308, h: 220 }, { x: 374, y: 470, w: 293, h: 220 }, { x: 702, y: 467, w: 298, h: 224 },
        { x: 25, y: 805, w: 299, h: 222 }, { x: 358, y: 805, w: 304, h: 226 }, { x: 692, y: 805, w: 302, h: 226 },
        { x: 110, y: 1133, w: 139, h: 292 }, { x: 444, y: 1124, w: 139, h: 316 }, { x: 782, y: 1129, w: 148, h: 298 }
    ];
    const sheet = createWildlifeSheet('assets/sprites/sources/thor.png', 1024, 1536, frames);
    const rows = { down: 0, left: 1, right: 2, up: 3 };
    function frameFor(dog) {
        return { row: rows[dog.direction] ?? 0, column: dog.moving && !InterfaceMotion.reduced ?
                [0, 1, 0, 2][Math.floor(Math.abs(dog.anim)) % 4] : 0 };
    }
    function draw(c, dog, view) {
        if (!sheet.ready)
            return false;
        const x = Math.round(dog.x - view.x + (view.shakeX || 0)), y = Math.round(dog.y - view.y + (view.shakeY || 0));
        const frame = frameFor(dog);
        c.save();
        // A brief fade also handles visits ending near a world boundary.
        c.globalAlpha = InterfaceMotion.reduced ? 1 : Math.min(1, dog.age * 3, dog.mode === 'leave' ? dog.timer : 1);
        c.fillStyle = 'rgba(45,49,25,.2)';
        c.beginPath();
        c.ellipse(x, y + 14, 20, 4, 0, 0, Math.PI * 2);
        c.fill();
        sheet.drawFrame(c, x, y + 14, frame.row, frame.column, .22);
        c.fillStyle = '#314b30';
        c.beginPath();
        c.roundRect(x - 27, y - 72, 54, 20, 5);
        c.fill();
        c.fillStyle = '#ffe0a0';
        c.font = 'bold 12px Trebuchet MS,sans-serif';
        c.textAlign = 'center';
        c.fillText('Thor', x, y - 58);
        c.restore();
        return true;
    }
    function drawHero(c, x, feet, height, direction, anim) {
        const row = rows[direction], column = InterfaceMotion.reduced ? 0 : [0, 1, 0, 2][Math.floor(Math.abs(anim)) % 4];
        return sheet.drawFrame(c, x, feet, row, column, height / frames[row * 3 + column].h);
    }
    return { draw, drawHero, frameFor, frames, load: sheet.load, install: sheet.install,
        get ready() { return sheet.ready; }, get loading() { return sheet.loading; }, get errors() { return sheet.errors; } };
})();
