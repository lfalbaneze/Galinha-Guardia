"use strict";
/* Shared PNG loading and foot alignment for wildlife; no shape-based fallback enemies. */
function createWildlifeSheet(source, width, height, bottoms) {
    let image = null, pending = null;
    let errors = [];
    function browserImage(src) {
        return new Promise((resolve, reject) => {
            const candidate = new Image();
            const timeout = setTimeout(() => reject(new Error(src)), 10000);
            candidate.onload = () => { clearTimeout(timeout); resolve(candidate); };
            candidate.onerror = () => { clearTimeout(timeout); reject(new Error(src)); };
            candidate.src = `${src}?v=approved-20260917`;
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
            if (size.width !== width * 3 || size.height !== height * 4)
                throw new Error('Invalid sprite dimensions');
            image = loaded;
            pending = null;
            return true;
        }).catch(() => { errors = [source]; pending = null; return false; });
        return pending;
    }
    function install(loader) { image = loader(source); errors = []; }
    function drawFrame(c, x, feet, row, column, scale) {
        if (!image)
            return false;
        c.save();
        c.imageSmoothingEnabled = false;
        c.drawImage(image, column * width, row * height, width, height, Math.round(x - width * scale / 2), Math.round(feet - bottoms[row * 3 + column] * scale), width * scale, height * scale);
        c.restore();
        return true;
    }
    return { load, install, drawFrame, get ready() { return image !== null; }, get loading() { return pending !== null; }, get errors() { return errors.slice(); } };
}
