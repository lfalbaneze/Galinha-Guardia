"use strict";
/* Panto shares the eight-axis cartoon character pipeline. */
const GooseArt = (() => {
    const { src: source, width, height, frames, columns } = PremiumWildlifeData.goose;
    const scale = 1, sheet = createWildlifeSheet(source, width, height, frames, columns);
    const alarm = PremiumWildlifeData['goose-alert'];
    const alarmSheet = createWildlifeSheet(alarm.src, alarm.width, alarm.height, alarm.frames, alarm.columns);
    const threatening = (g) => ['notice', 'warning', 'feint'].includes(g.mode);
    let pending = null;
    function load(loader) {
        if (pending)
            return pending;
        pending = Promise.all([sheet.load(loader), alarmSheet.load(loader)]).then(r => { pending = null; return r.every(Boolean); });
        return pending;
    }
    const rows = { down: 0, right: 1, up: 2, left: 3, downright: 4, upright: 5, downleft: 6, upleft: 7 };
    function frameFor(goose) {
        const column = threatening(goose) ? goose.mode === 'notice' ? 1 : InterfaceMotion.reduced ? 3 : 3 + Math.floor(Math.abs(goose.timer || 0) * 14) % Math.max(1, alarm.columns - 5) :
            goose.moving && !InterfaceMotion.reduced ? Math.floor(Math.abs(goose.anim) * columns / 4) % columns : 0;
        return { row: rows[CharacterArt.heading(goose)], column };
    }
    function draw(c, goose, view) {
        const active = threatening(goose) ? alarmSheet : sheet;
        if (!active.ready)
            return false;
        const x = goose.x - view.x + (view.shakeX || 0), y = goose.y - view.y + (view.shakeY || 0);
        const f = frameFor(goose);
        c.save();
        if (!threatening(goose) && CharacterArt.frameFor?.('goose')?.definition?.provider === 'pixellab' && CharacterArt.ready)
            CharacterArt.draw(c, 'goose', x, y, { direction: CharacterArt.heading(goose), anim: goose.anim,
                moving: goose.moving && !InterfaceMotion.reduced, sprinting: goose.mode === 'charge',
                mood: goose.mode === 'charge' ? 'angry' : goose.mode === 'stunned' ? 'sad' : 'normal' });
        else
            active.drawFrame(c, x, y + 14, f.row, f.column, 1);
        if (goose.mode === 'stunned') {
            c.fillStyle = '#e8c65a';
            for (let i = 0; i < 3; i++) {
                const angle = i * Math.PI * 2 / 3 + (InterfaceMotion.reduced ? 0 : goose.anim);
                const sx = Math.round(x + Math.cos(angle) * 14), sy = Math.round(y - 61 + Math.sin(angle) * 4);
                c.fillRect(sx - 3, sy - 1, 7, 3);
                c.fillRect(sx - 1, sy - 3, 3, 7);
            }
        }
        else if (['notice', 'warning', 'charge', 'feint'].includes(goose.mode)) {
            c.font = 'bold 17px Trebuchet MS,sans-serif';
            c.textAlign = 'center';
            c.fillStyle = '#fff0b3';
            c.fillText(goose.mode === 'notice' ? '?' : '!', x, y - 58);
        }
        c.restore();
        return true;
    }
    return { draw, frameFor, source, width, height, frames, columns, scale, load,
        install: (loader) => { sheet.install(loader); alarmSheet.install(loader); },
        get ready() { return sheet.ready && alarmSheet.ready; }, get loading() { return sheet.loading || alarmSheet.loading; }, get errors() { return [...sheet.errors, ...alarmSheet.errors]; } };
})();
