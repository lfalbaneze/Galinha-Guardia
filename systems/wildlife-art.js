"use strict";
function createWildlifeSheet(source, width, height, frames) {
    let image = null, pending = null;
    let errors = [];
    function browserImage(src) {
        return new Promise((resolve, reject) => {
            const candidate = new Image();
            const timeout = setTimeout(() => reject(new Error(src)), 10000);
            candidate.onload = () => { clearTimeout(timeout); resolve(candidate); };
            candidate.onerror = () => { clearTimeout(timeout); reject(new Error(src)); };
            candidate.src = src;
        });
    }
    function load(loader = browserImage) {
        if (pending)
            return pending;
        if (image)
            return Promise.resolve(true);
        errors = [];
        pending = Promise.resolve().then(() => loader(source)).then(loaded => {
            const size = loaded;
            if (size.width !== width || size.height !== height || frames.length === 0 || frames.length % 3 !== 0 ||
                frames.some(f => f.x < 0 || f.y < 0 || f.w <= 0 || f.h <= 0 || f.x + f.w > width || f.y + f.h > height))
                throw new Error('Invalid sprite dimensions');
            image = loaded;
            pending = null;
            return true;
        }).catch(() => { errors = [source]; pending = null; return false; });
        return pending;
    }
    function install(loader) { image = loader(source); errors = []; }
    function drawFrame(c, x, feet, row, column, scale, elevation = 0) {
        if (!image)
            return false;
        const frame = frames[row * 3 + column];
        if (!frame)
            return false;
        c.save();
        c.imageSmoothingEnabled = false;
        const w = Math.round(frame.w * scale), h = Math.round(frame.h * scale);
        const tile = typeof SpriteStyle === 'undefined' ? null : SpriteStyle.tile(image, [frame.x, frame.y, frame.w, frame.h], w, h);
        if (typeof Sunlight !== 'undefined')
            Sunlight.cast(c, tile || image, Math.round(x - w / 2), Math.round(feet - h), w, h, feet + elevation, tile ? undefined : [frame.x, frame.y, frame.w, frame.h]);
        if (tile)
            c.drawImage(tile, Math.round(x - w / 2), Math.round(feet - h));
        else
            c.drawImage(image, frame.x, frame.y, frame.w, frame.h, Math.round(x - w / 2), Math.round(feet - h), w, h);
        c.restore();
        return true;
    }
    return { load, install, drawFrame, get ready() { return image !== null; }, get loading() { return pending !== null; }, get errors() { return errors.slice(); } };
}
