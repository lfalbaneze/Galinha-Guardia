"use strict";
/* Local sprite sheet. Every frame shares the same scale and foot baseline. */
const GooseArt = (() => {
    const source = 'assets/sprites/sources/goose.png';
    const cell = 64;
    const rows = { up: 0, right: 1, down: 2, left: 3 };
    let image = null;
    let pending = null;
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
        // Defer the loader so even a synchronous error becomes a reported load failure.
        pending = Promise.resolve().then(() => loader(source)).then(loaded => {
            image = loaded;
            pending = null;
            return true;
        }, () => { errors = [source]; pending = null; return false; });
        return pending;
    }
    function install(loader) {
        image = loader(source);
        errors = [];
    }
    function frameFor(goose) {
        const alert = goose.mode === 'warning' || goose.mode === 'charge';
        // The sheet has one idle, one stepping and one wings-open pose per direction.
        const column = alert ? 2 : goose.moving && !InterfaceMotion.reduced
            ? Math.floor(Math.abs(goose.anim)) % 2 : 0;
        return { row: rows[goose.direction] ?? rows.down, column };
    }
    function draw(context, goose, view) {
        if (!image)
            return false;
        const x = Math.round(goose.x - view.x + (view.shakeX || 0));
        const y = Math.round(goose.y - view.y + (view.shakeY || 0));
        const frame = frameFor(goose);
        context.save();
        context.imageSmoothingEnabled = false;
        context.fillStyle = 'rgba(45,49,25,.23)';
        context.beginPath();
        context.ellipse(x, y + 14, 18, 4, 0, 0, Math.PI * 2);
        context.fill();
        // Sprite feet occupy row 60. The cast's ground plane is entity.y + 14.
        context.drawImage(image, frame.column * cell, frame.row * cell, cell, cell, x - 32, y + 14 - 60, cell, cell);
        context.restore();
        return true;
    }
    return { draw, frameFor, load, install,
        get ready() { return image !== null; },
        get loading() { return pending !== null; },
        get errors() { return errors.slice(); } };
})();
