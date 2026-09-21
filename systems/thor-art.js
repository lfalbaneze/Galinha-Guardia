"use strict";
/* Complete coherent walk cycles at the farm's world pixel scale. */
const ThorArt = (() => {
    const { frames, columns, src: source, width, height } = PremiumWildlifeData.thor;
    const bodyHeight = Math.max(...frames.map(f => f.h * (f.scale ?? 1)));
    const sheet = createWildlifeSheet(source, width, height, frames, columns);
    const rows = { down: 0, right: 1, up: 2, left: 3, downright: 4, upright: 5, downleft: 6, upleft: 7 };
    function frameFor(dog) {
        return { row: rows[CharacterArt.heading(dog)] ?? 0, column: dog.moving && !InterfaceMotion.reduced ?
                Math.floor(Math.abs(dog.anim) * columns / 4) % columns : 0 };
    }
    function draw(c, dog, view) {
        if (!sheet.ready)
            return false;
        const x = dog.x - view.x + (view.shakeX || 0), y = dog.y - view.y + (view.shakeY || 0);
        const frame = frameFor(dog);
        c.save();
        // A brief fade also handles visits ending near a world boundary.
        c.globalAlpha = InterfaceMotion.reduced ? 1 : Math.min(1, dog.age * 3, dog.mode === 'leave' ? dog.timer : 1);
        if (CharacterArt.frameFor?.('thor')?.definition?.provider === 'pixellab' && CharacterArt.ready)
            CharacterArt.draw(c, 'thor', x, y, { direction: CharacterArt.heading(dog), anim: dog.anim,
                moving: dog.moving && !InterfaceMotion.reduced, mood: dog.mode === 'greet' ? 'happy' : 'normal' });
        else
            sheet.drawFrame(c, x, y + 14, frame.row, frame.column, 1);
        const labelY = y + 14 - bodyHeight - 26;
        c.fillStyle = '#314b30';
        c.beginPath();
        c.roundRect(x - 27, labelY, 54, 20, 5);
        c.fill();
        c.fillStyle = '#ffe0a0';
        c.font = 'bold 12px Trebuchet MS,sans-serif';
        c.textAlign = 'center';
        c.fillText('Thor', x, labelY + 14);
        c.restore();
        return true;
    }
    function drawHero(c, x, feet, height, direction, anim) {
        const row = rows[direction], column = InterfaceMotion.reduced ? 0 : Math.floor(Math.abs(anim) * columns / 4) % columns;
        // One scale for the full directional cycle: stepping does not resize the body.
        const poseHeight = Math.max(...frames.slice(row * columns, (row + 1) * columns).map(f => f.h * (f.scale ?? 1)));
        return sheet.drawFrame(c, x, feet, row, column, height / poseHeight);
    }
    return { draw, drawHero, frameFor, frames, columns, source, width, height, load: sheet.load, install: sheet.install,
        get ready() { return sheet.ready; }, get loading() { return sheet.loading; }, get errors() { return sheet.errors; } };
})();
