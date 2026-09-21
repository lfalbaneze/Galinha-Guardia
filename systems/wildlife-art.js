"use strict";
function createWildlifeSheet(source, width, height, frames, columns = 3) {
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
            if (size.width !== width || size.height !== height || frames.length === 0 || !Number.isInteger(columns) || columns < 1 || frames.length % columns !== 0 ||
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
        if (column < 0 || column >= columns || !Number.isInteger(column) || row < 0 || !Number.isInteger(row))
            return false;
        const frame = frames[row * columns + column];
        if (!frame)
            return false;
        const smooth = frame.scale !== undefined && !frame.pixelArt;
        scale *= frame.scale ?? 1;
        c.save();
        c.imageSmoothingEnabled = smooth;
        if (smooth)
            c.imageSmoothingQuality = 'high';
        const w = Math.round(frame.w * scale), h = Math.round(frame.h * scale);
        const left = smooth || frame.pixelArt ? x - (frame.cx ?? frame.w / 2) * scale : Math.round(x - (frame.cx ?? frame.w / 2) * scale);
        const tile = smooth || frame.pixelArt || typeof SpriteStyle === 'undefined' ? null : SpriteStyle.tile(image, [frame.x, frame.y, frame.w, frame.h], w, h);
        const top = feet - (frame.bottom ?? frame.h) * scale;
        if (typeof Sunlight !== 'undefined')
            Sunlight.cast(c, tile || image, left, top, w, h, feet + elevation, tile ? undefined : [frame.x, frame.y, frame.w, frame.h]);
        if (tile)
            c.drawImage(tile, left, top);
        else
            c.drawImage(image, frame.x, frame.y, frame.w, frame.h, left, top, w, h);
        c.restore();
        return true;
    }
    return { load, install, drawFrame, get ready() { return image !== null; }, get loading() { return pending !== null; }, get errors() { return errors.slice(); } };
}
