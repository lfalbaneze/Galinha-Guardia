"use strict";
/* Notice, inhale, call and settle are drawn poses, synchronized with the alarm. */
const OwlArt = (() => {
    const { src: source, width, height, frames, columns } = PremiumWildlifeData.owl;
    const sheet = createWildlifeSheet(source, width, height, frames, columns);
    const flight = PremiumWildlifeData['owl-flight'];
    const flightSheet = createWildlifeSheet(flight.src, flight.width, flight.height, flight.frames, flight.columns);
    let pending = null;
    function load(loader) {
        if (pending)
            return pending;
        pending = Promise.all([sheet.load(loader), flightSheet.load(loader)]).then(r => { pending = null; return r.every(Boolean); });
        return pending;
    }
    const rows = { down: 0, right: 1, up: 2, left: 3, downright: 4, upright: 5, downleft: 6, upleft: 7 };
    function frameFor(owl) {
        const acting = owl.mode === 'alert' || (owl.callTime || 0) > 0;
        const angle = acting ? (owl.callHeading ?? owl.heading) : owl.heading;
        const direction = CharacterArt.directionFor(owl.direction, Math.cos(angle), Math.sin(angle));
        let column = 0;
        if (owl.mode === 'relocate')
            column = Math.floor(owl.anim) % flight.columns;
        const callStart = Math.floor(columns / 2);
        if (owl.mode === 'alert')
            column = 1 + Math.min(callStart - 2, Math.floor(owl.alertProgress * (callStart - 1)));
        if ((owl.callTime || 0) > 0)
            column = callStart + Math.min(columns - callStart - 1, Math.floor((.72 - (owl.callTime || 0)) / .72 * (columns - callStart)));
        return { row: rows[direction] ?? 0, column: Math.min(columns - 1, column) };
    }
    function draw(c, owl, view) {
        const flying = owl.mode === 'relocate', position = flying ? owl : owl.perch;
        const elevation = 42 + (flying ? Math.sin(Math.PI * (owl.flight?.progress || 0)) * 58 : 0);
        const x = position.x - view.x + (view.shakeX || 0), feet = position.y - view.y + (view.shakeY || 0) - elevation;
        const frame = frameFor(owl);
        return (flying ? flightSheet : sheet).drawFrame(c, x, feet, frame.row, frame.column, 1, elevation);
    }
    return { draw, frameFor, frames, load, install: (loader) => { sheet.install(loader); flightSheet.install(loader); },
        get ready() { return sheet.ready && flightSheet.ready; }, get loading() { return sheet.loading || flightSheet.loading; }, get errors() { return [...sheet.errors, ...flightSheet.errors]; } };
})();
