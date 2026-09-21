"use strict";
/* Separate authored directional cycles for the planted post and its birds. */
const ScarecrowArt = (() => {
    const post = PremiumWildlifeData.scarecrow, birds = PremiumWildlifeData.crow;
    const sheet = createWildlifeSheet(post.src, post.width, post.height, post.frames, post.columns);
    const crow = createWildlifeSheet(birds.src, birds.width, birds.height, birds.frames, birds.columns);
    const reactions = Object.fromEntries(['scarecrow-happy', 'scarecrow-scared', 'scarecrow-sad', 'crow-scared'].flatMap(id => {
        const data = PremiumWildlifeData[id];
        return data ? [[id, { data, sheet: createWildlifeSheet(data.src, data.width, data.height, data.frames, data.columns) }]] : [];
    }));
    const sheets = [sheet, crow, ...Object.values(reactions).map(r => r.sheet)];
    const rows = { down: 0, right: 1, up: 2, left: 3, downright: 4, upright: 5, downleft: 6, upleft: 7 };
    function drawPost(c, s, view) {
        const x = s.x - view.x + (view.shakeX || 0), y = s.y - view.y + (view.shakeY || 0);
        c.save();
        const mood = s.mode === 'fleeing' ? 'scared' : s.mode === 'away' ? 'sad' : s.mode === 'returning' ? 'happy' : '';
        const reaction = reactions['scarecrow-' + mood], active = reaction?.sheet || sheet, columns = reaction?.data.columns || post.columns;
        active.drawFrame(c, x, y, 0, InterfaceMotion.reduced ? 0 : Math.floor(s.clock * 4) % columns, 1);
        c.restore();
    }
    function drawCrow(c, b, index, clock, view, scared = false) {
        if (b.opacity <= 0)
            return;
        const x = b.x - view.x + (view.shakeX || 0), y = b.y - b.z - view.y + (view.shakeY || 0);
        const direction = CharacterArt.directionFor(b.left ? 'left' : 'right', b.flying ? b.target.x - b.from.x : 0, b.flying ? b.target.y - b.from.y : 0);
        const reaction = scared && b.flying ? reactions['crow-scared'] : undefined, active = reaction?.sheet || crow, columns = reaction?.data.columns || birds.columns;
        const column = b.flying && !InterfaceMotion.reduced ? 1 + Math.floor(clock * 12 + index) % (columns - 1) : 0;
        c.save();
        c.globalAlpha *= b.opacity;
        active.drawFrame(c, x, y, rows[direction], column, 1, b.z);
        c.restore();
    }
    return { drawPost, drawCrow, frames: post.frames,
        load: (loader) => Promise.all(sheets.map(s => s.load(loader))).then(r => r.every(Boolean)),
        install: (loader) => { sheets.forEach(s => s.install(loader)); },
        get ready() { return sheets.every(s => s.ready); }, get loading() { return sheets.some(s => s.loading); }, get errors() { return sheets.flatMap(s => s.errors); } };
})();
