"use strict";
/* An optional, self-contained encounter. No friend or chick is locked behind it. */
const LakeChallenge = (() => {
    const ARENA = 310;
    const copy = (p) => ({ x: p.x, y: p.y });
    function initialize(game) {
        game.lake = { version: 1, active: false, completed: false, misses: 0, attempts: 0, notice: 0 };
    }
    function available(game) {
        const goose = game.entities.goose, chicken = game.entities.chicken;
        return game.phase === 'playing' && !!goose && !game.lake?.active && !game.lake?.completed &&
            !chicken.hidden && distance(chicken, goose.home) < 255 &&
            DetectionSystem.hasLineOfSight(getHitbox(chicken), getHitbox(goose));
    }
    function safeWolfPosition(game) {
        const goose = game.entities.goose, wolf = game.entities.wolf, radius = wolf.hitbox.r + 8;
        const clear = (p) => {
            const q = { x: p.x + wolf.hitbox.ox, y: p.y + wolf.hitbox.oy };
            return q.x > radius && q.y > radius && q.x < WORLD.width - radius && q.y < WORLD.height - radius &&
                distance(p, goose.home) > ARENA + 90 && OBSTACLES.every(r => r.blocking === false ||
                Math.hypot(q.x - clamp(q.x, r.x, r.x + r.w), q.y - clamp(q.y, r.y, r.y + r.h)) > radius);
        };
        if (clear(wolf))
            return copy(wolf);
        const candidates = [];
        for (const radius of [440, 520, 640])
            for (let i = 0; i < 32; i++) {
                const angle = i * Math.PI / 16;
                candidates.push({ x: goose.home.x + Math.cos(angle) * radius, y: goose.home.y + Math.sin(angle) * radius });
            }
        return candidates.filter(clear).sort((a, b) => distance(a, wolf) - distance(b, wolf))[0] || null;
    }
    function start(game) {
        if (!available(game))
            return false;
        const resting = safeWolfPosition(game);
        if (!resting)
            return false;
        if (!game.lake)
            initialize(game);
        Object.assign(game.lake, { active: true, completed: false, misses: 0, attempts: 0, notice: 4, interrupted: false });
        const wolf = game.entities.wolf;
        // The encounter suspends the wolf outside the ring rather than granting permanent invulnerability.
        WolfAI.initialize(game);
        wolf.x = resting.x;
        wolf.y = resting.y;
        wolf.vx = 0;
        wolf.vy = 0;
        const goose = game.entities.goose;
        goose.mode = 'return';
        goose.grace = 1.5;
        goose.cooldown = 1;
        goose.chargeHit = false;
        goose.timer = .8;
        input.clear();
        setStatus('O dono do lago! Provoque 3 investidas e desvie. O lobo espera fora. F para sair.');
        GameManager.save(game);
        updateUI(game);
        return true;
    }
    function releaseWolf(game) {
        game.entities.wolf.huntUnlockTimer = Math.max(2, game.entities.wolf.huntUnlockTimer || 0);
        game.entities.chicken.invulnerable = Math.max(1.2, game.entities.chicken.invulnerable);
    }
    function cancel(game) {
        if (!game.lake?.active)
            return false;
        game.lake.active = false;
        game.lake.misses = 0;
        game.lake.notice = 0;
        const goose = game.entities.goose;
        if (goose) {
            goose.mode = 'return';
            goose.timer = .8;
            goose.grace = 2;
        }
        releaseWolf(game);
        setStatus('Desafio interrompido. Volte ao lago quando quiser tentar de novo.');
        GameManager.save(game);
        updateUI(game);
        return true;
    }
    function update(game, dt) {
        if (game.phase !== 'playing' || !game.lake || !Number.isFinite(dt) || dt <= 0)
            return;
        game.lake.notice = Math.max(0, game.lake.notice - dt);
        if (game.lake.active && (!game.entities.goose || distance(game.entities.chicken, game.entities.goose.home) > ARENA))
            cancel(game);
    }
    function recordMiss(game, goose) {
        const lake = game.lake;
        if (!lake?.active || lake.completed || goose.mode !== 'charge' || goose.chargeCounted || goose.chargeHit ||
            distance(goose, goose.anchor) < 36 || game.entities.chicken.hidden ||
            distance(game.entities.chicken, goose.home) > ARENA)
            return false;
        goose.chargeCounted = true;
        lake.misses = Math.min(3, lake.misses + 1);
        lake.notice = 2.5;
        AudioSystem.play('bonk', { volume: .35 });
        spawnBurst(goose.x, goose.y, '#f5df95', 12);
        if (lake.misses === 3) {
            lake.completed = true;
            lake.active = false;
            lake.notice = 7;
            goose.mode = 'defeated';
            goose.moving = false;
            goose.vx = 0;
            goose.vy = 0;
            SkinSystem.unlockLake(game);
            buildObstacles(game);
            releaseWolf(game);
            AudioSystem.play('rescue', { volume: .5 });
            setStatus('Respeito conquistado! Atalho do lago aberto e aparência de ganso no baú.', 'win');
        }
        else
            setStatus(`Ele errou! ${lake.misses}/3 investidas desviadas. Espere o próximo aviso.`, 'win');
        GameManager.save(game);
        updateUI(game);
        return true;
    }
    function blocksWolf(game) { return game.lake?.active === true; }
    function snapshot(game) {
        return game.lake ? { version: 1, completed: game.lake.completed, misses: game.lake.misses, active: game.lake.active } : undefined;
    }
    function restore(game, saved) {
        initialize(game);
        if (saved && typeof saved === 'object') {
            const record = saved;
            if (record.version === 1 && record.completed === true && record.misses === 3) {
                game.lake.completed = true;
                game.lake.misses = 3;
                SkinSystem.unlockLake(game, false);
            }
            else
                game.lake.interrupted = record.version === 1 && record.active === true;
        }
        // An interrupted attempt restarts safely. Never resume an attack while a page is loading.
        buildObstacles(game);
    }
    function bridge() {
        const p = STRUCTURES.pond;
        return { x: Math.round(p.x + p.w / 2 - 36), y: p.y - 34, w: 72, h: p.h + 68 };
    }
    function pondObstacles(game) {
        const p = STRUCTURES.pond;
        const water = { x: p.x + 20, y: p.y + 20, w: p.w - 40, h: p.h - 40, type: 'pond' };
        if (!game?.lake?.completed || game.worldSeed !== WORLD.layout?.seed)
            return [water];
        const b = bridge();
        return [{ ...water, w: b.x - water.x }, { ...water, x: b.x + b.w, w: water.x + water.w - b.x - b.w }].filter(r => r.w > 0);
    }
    function drawGround(game) {
        if (game.phase !== 'playing' && game.phase !== 'menu')
            return;
        const b = bridge(), p = worldToScreen(b), open = game.lake?.completed;
        if (p.x < -b.w || p.x > canvas.width || p.y < -b.h || p.y > canvas.height)
            return;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if (open) {
            ctx.fillStyle = '#254c3433';
            ctx.fillRect(Math.round(p.x + 5), Math.round(p.y + 6), b.w, b.h);
        }
        const plank = (y) => {
            ctx.fillStyle = '#573e29';
            ctx.fillRect(p.x, y, b.w, 11);
            ctx.fillStyle = (Math.round(y - p.y) / 12) % 2 ? '#ba9055' : '#c7a264';
            ctx.fillRect(p.x + 2, y, b.w - 4, 8);
            ctx.fillStyle = '#e2c18a';
            ctx.fillRect(p.x + 2, y, b.w - 4, 1);
            ctx.fillStyle = '#635437';
            ctx.fillRect(p.x + 7, y + 4, 2, 2);
            ctx.fillRect(p.x + b.w - 9, y + 4, 2, 2);
        };
        for (let y = 0; y < b.h; y += 12)
            if (open || y < 30 || y > b.h - 36)
                plank(Math.round(p.y + y));
        if (open) {
            ctx.fillStyle = '#765339';
            ctx.fillRect(p.x + 1, p.y, 3, b.h);
            ctx.fillRect(p.x + b.w - 4, p.y, 3, b.h);
        }
        else {
            for (const y of [p.y + 22, p.y + b.h - 25]) {
                ctx.fillStyle = '#695035';
                ctx.fillRect(p.x - 2, y - 18, 6, 24);
                ctx.fillRect(p.x + b.w - 4, y - 18, 6, 24);
                ctx.strokeStyle = '#d3b077';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(p.x + 2, y - 12);
                ctx.quadraticCurveTo(p.x + b.w / 2, y - 3, p.x + b.w - 2, y - 12);
                ctx.stroke();
            }
        }
        ctx.restore();
    }
    function updateUI(game) {
        const panel = document.getElementById('lakePanel'), button = document.getElementById('lakeChallengeBtn');
        const title = document.getElementById('lakeTitle'), text = document.getElementById('lakeHelp');
        if (!panel || !button || !title || !text)
            return;
        const goose = game.entities.goose, near = goose && distance(game.entities.chicken, goose.home) < 420;
        panel.hidden = game.phase !== 'playing' || !near;
        const completed = game.lake?.completed, active = game.lake?.active;
        title.textContent = completed ? 'Respeito conquistado' : 'O dono do lago';
        text.textContent = completed ? 'Atalho aberto. Aparência de ganso disponível no baú.' : active ?
            `${game.lake.misses}/3 investidas desviadas · O lobo espera fora. Desvie da linha; blefes não contam.` :
            'Desafio opcional: provoque três investidas e desvie. Ganhe um atalho e a aparência de ganso.';
        button.hidden = !!completed;
        button.disabled = !active && !available(game);
        button.textContent = active ? 'Sair do desafio · F' : 'Desafiar o ganso · F';
    }
    return { initialize, available, start, cancel, update, recordMiss, blocksWolf, snapshot, restore, pondObstacles, bridge, drawGround, updateUI, radius: ARENA };
})();
