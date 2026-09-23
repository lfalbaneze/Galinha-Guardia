"use strict";
/* An optional encounter: winning also rescues Panto as a bonus friend. */
const LakeChallenge = (() => {
    const ARENA = 310;
    const COUNTER_RANGE = 82;
    const sheltered = new WeakMap();
    const shorelinePatrol = new WeakMap();
    const rounds = ['Bote direto', 'Bote duplo', 'Blefe e arrancada'];
    const copy = (p) => ({ x: p.x, y: p.y });
    function initialize(game) {
        sheltered.delete(game);
        shorelinePatrol.delete(game);
        game.lake = { version: 1, active: false, completed: false, gooseRescued: false, misses: 0, attempts: 0, notice: 0 };
    }
    function available(game) {
        const goose = game.entities.goose, chicken = game.entities.chicken;
        return game.phase === 'playing' && !!goose && !game.lake?.active && !game.lake?.completed &&
            !chicken.hidden && !SwimmingSystem.profile(game).swimming && distance(chicken, goose.home) < 255 &&
            DetectionSystem.hasLineOfSight(getHitbox(chicken), getHitbox(goose));
    }
    // The refuge belongs to the pond, not Panto, who moves to the coop on rescue.
    function sanctuary() {
        const p = STRUCTURES.pond;
        return { x: p.x - 70, y: p.y - 70, w: p.w + 140, h: p.h + 140 };
    }
    function inSanctuary(game) {
        if (!game.lake?.completed)
            return false;
        const p = getHitbox(game.entities.chicken), r = sanctuary();
        return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
    }
    function safeWolfPosition(game) {
        const wolf = game.entities.wolf, radius = wolf.hitbox.r + 8, refuge = sanctuary();
        const origin = game.lake?.completed ? { x: refuge.x + refuge.w / 2, y: refuge.y + refuge.h / 2 } : game.entities.goose?.home;
        if (!origin)
            return null;
        const clear = (p) => {
            const q = { x: p.x + wolf.hitbox.ox, y: p.y + wolf.hitbox.oy };
            const outside = game.lake?.completed ?
                Math.hypot(q.x - clamp(q.x, refuge.x, refuge.x + refuge.w), q.y - clamp(q.y, refuge.y, refuge.y + refuge.h)) > radius + 24 :
                distance(p, origin) > ARENA + 90;
            return q.x > radius && q.y > radius && q.x < WORLD.width - radius && q.y < WORLD.height - radius &&
                outside && OBSTACLES.every(r => r.blocking === false ||
                Math.hypot(q.x - clamp(q.x, r.x, r.x + r.w), q.y - clamp(q.y, r.y, r.y + r.h)) > radius);
        };
        if (clear(wolf))
            return copy(wolf);
        const candidates = [];
        if (game.lake?.completed) {
            const gap = radius + 32;
            for (let i = 0; i <= 16; i++) {
                const x = refuge.x + refuge.w * i / 16, y = refuge.y + refuge.h * i / 16;
                candidates.push({ x, y: refuge.y - gap }, { x, y: refuge.y + refuge.h + gap }, { x: refuge.x - gap, y }, { x: refuge.x + refuge.w + gap, y });
            }
        }
        for (const radius of [440, 520, 640])
            for (let i = 0; i < 32; i++) {
                const angle = i * Math.PI / 16;
                candidates.push({ x: origin.x + Math.cos(angle) * radius, y: origin.y + Math.sin(angle) * radius });
            }
        return candidates.filter(clear).sort((a, b) => distance(a, wolf) - distance(b, wolf))[0] || null;
    }
    function shorelineSide(wolf) {
        const r = sanctuary(), p = getHitbox(wolf);
        const choices = [
            ['top', Math.abs(p.y - r.y)],
            ['bottom', Math.abs(p.y - (r.y + r.h))],
            ['left', Math.abs(p.x - r.x)],
            ['right', Math.abs(p.x - (r.x + r.w))],
        ];
        return choices.sort((a, b) => a[1] - b[1])[0][0];
    }
    function shorelineTargets(game, side) {
        const r = sanctuary(), wolf = game.entities.wolf;
        const gap = wolf.hitbox.r + 52, inset = 58;
        if (side === 'top')
            return [{ x: r.x + inset, y: r.y - gap }, { x: r.x + r.w - inset, y: r.y - gap }];
        if (side === 'bottom')
            return [{ x: r.x + inset, y: r.y + r.h + gap }, { x: r.x + r.w - inset, y: r.y + r.h + gap }];
        if (side === 'left')
            return [{ x: r.x - gap, y: r.y + inset }, { x: r.x - gap, y: r.y + r.h - inset }];
        return [{ x: r.x + r.w + gap, y: r.y + inset }, { x: r.x + r.w + gap, y: r.y + r.h - inset }];
    }
    function guardWolf(game, dt = 1 / 60) {
        if (game.phase !== 'playing' || !blocksWolf(game)) {
            sheltered.delete(game);
            shorelinePatrol.delete(game);
            return false;
        }
        const wolf = game.entities.wolf, completed = !!game.lake?.completed;
        if (sheltered.get(game) !== completed) {
            const resting = safeWolfPosition(game);
            WolfAI.initialize(game);
            wolf.speechTime = 0;
            if (resting) {
                wolf.x = resting.x;
                wolf.y = resting.y;
            }
            sheltered.set(game, completed);
            shorelinePatrol.delete(game);
            if (completed)
                setStatus('Lagoa segura! O lobo ronda a margem, mas não entra. A proteção acaba ao sair da área marcada.');
        }
        // During Panto's live challenge the wolf remains suspended outside the arena.
        if (!completed) {
            wolf.vx = 0;
            wolf.vy = 0;
            wolf.moving = false;
            wolf.moveSpeed = 0;
            return true;
        }
        // After the challenge, the sanctuary stays safe without turning the wolf into
        // a statue. He paces along the nearest shore and ignores the player inside.
        let patrol = shorelinePatrol.get(game);
        if (!patrol) {
            const side = shorelineSide(wolf), targets = shorelineTargets(game, side);
            patrol = { side, index: distance(wolf, targets[0]) < distance(wolf, targets[1]) ? 1 : 0, stalled: 0 };
            shorelinePatrol.set(game, patrol);
        }
        const targets = shorelineTargets(game, patrol.side), target = targets[patrol.index];
        const before = { x: wolf.x, y: wolf.y };
        const speed = Math.max(76, WolfAI.getConfig(game).patrolSpeed * 0.7);
        const arrived = WolfAI.moveTo(wolf, target, speed, dt);
        const moved = distance(before, wolf);
        patrol.stalled = moved < 0.15 ? patrol.stalled + dt : 0;
        if (arrived || distance(wolf, target) < 18 || patrol.stalled > 1.2) {
            patrol.index = 1 - patrol.index;
            patrol.stalled = 0;
            wolf.route = [];
            wolf.routeTarget = null;
            wolf.routeTimer = 0;
        }
        wolf.mode = 'patrol';
        wolf.detected = false;
        wolf.awareness = 0;
        wolf.lastKnown = null;
        wolf.heardPoint = null;
        return true;
    }
    function start(game) {
        if (!available(game) || ThorSystem.active(game))
            return false;
        const resting = safeWolfPosition(game);
        if (!resting)
            return false;
        if (!game.lake)
            initialize(game);
        Object.assign(game.lake, { active: true, completed: false, misses: 0, attempts: 0, counterWindow: 0, notice: 4, interrupted: false, feedback: undefined });
        const wolf = game.entities.wolf;
        // The encounter suspends the wolf outside the ring rather than granting permanent invulnerability.
        WolfAI.initialize(game);
        wolf.x = resting.x;
        wolf.y = resting.y;
        wolf.vx = 0;
        wolf.vy = 0;
        const goose = game.entities.goose;
        goose.mode = 'recover';
        goose.grace = .8;
        goose.cooldown = .8;
        goose.chargeHit = false;
        goose.chargeCounted = false;
        goose.timer = .6;
        goose.comboRemaining = 0;
        goose.comboFollowup = false;
        goose.challengeFeinted = false;
        goose.earlyDodge = false;
        if (typeof GameInput !== 'undefined')
            GameInput.clear();
        else
            input.clear();
        setStatus('Três carimbos para passar: desvie da sequência, aproxime-se de PANTO tonto e interaja. Três bicadas encerram a tentativa!');
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
        game.lake.counterWindow = 0;
        const goose = game.entities.goose;
        if (goose) {
            goose.mode = 'return';
            goose.timer = .8;
            goose.grace = 2;
        }
        releaseWolf(game);
        setStatus('Desafio interrompido. PANTO vai treinar a cara de bravo. Volte ao lago para tentar de novo!');
        GameManager.save(game);
        updateUI(game);
        return true;
    }
    function update(game, dt) {
        if (game.phase !== 'playing' || !game.lake || !Number.isFinite(dt) || dt <= 0)
            return;
        game.lake.notice = Math.max(0, game.lake.notice - dt);
        if (game.lake.active && SwimmingSystem.profile(game).swimming) {
            cancel(game);
            setStatus('Banho não vale carimbo! PANTO espera na margem para começar outra tentativa.');
            return;
        }
        if (game.lake.active && (game.lake.counterWindow || 0) > 0) {
            game.lake.counterWindow = Math.max(0, game.lake.counterWindow - dt);
            if (game.lake.counterWindow === 0) {
                game.lake.feedback = 'expired';
                game.lake.notice = 2.5;
                if (game.entities.goose)
                    game.entities.goose.challengeFeinted = false;
            }
        }
        if (game.lake.active && (!game.entities.goose || distance(game.entities.chicken, game.entities.goose.home) > ARENA))
            cancel(game);
    }
    function recordMiss(game, goose) {
        const lake = game.lake;
        if (!lake?.active || lake.completed || goose.mode !== 'charge' || goose.chargeCounted || goose.chargeHit ||
            (goose.comboRemaining || 0) > 0 || goose.comboFollowup ||
            game.entities.chicken.hidden || SwimmingSystem.profile(game).swimming ||
            distance(game.entities.chicken, goose.home) > ARENA)
            return false;
        if (distance(goose, goose.anchor) < 36) {
            lake.feedback = 'blocked';
            lake.notice = 2;
            return false;
        }
        goose.chargeCounted = true;
        lake.counterDuration = game.difficultyKey === 'easy' ? 3.6 : ['hard', 'hardcore'].includes(game.difficultyKey) ? 2.5 : 3;
        lake.counterWindow = lake.counterDuration;
        lake.notice = lake.counterDuration;
        lake.feedback = 'dodge';
        AudioSystem.play('panto-dodge', { volume: .7 });
        setStatus('PANTO ficou tonto! Chegue perto e interaja para pegar o carimbo antes que ele se recomponha.');
        updateUI(game);
        return true;
    }
    function canCounter(game) {
        const goose = game.entities.goose, chicken = game.entities.chicken;
        return game.phase === 'playing' && !!game.lake?.active && (game.lake.counterWindow || 0) > 0 &&
            !!goose && goose.mode === 'stunned' && goose.chargeCounted === true && !chicken.hidden && !SwimmingSystem.profile(game).swimming &&
            distance(chicken, goose.home) <= ARENA &&
            distance(goose, chicken) <= COUNTER_RANGE && DetectionSystem.hasLineOfSight(getHitbox(chicken), getHitbox(goose));
    }
    function interact(game) {
        if (game.phase !== 'playing' || !game.lake?.active)
            return false;
        // Own the interaction during an attempt: a missed counter must not hide the player.
        if (!canCounter(game))
            return true;
        const lake = game.lake, goose = game.entities.goose;
        lake.counterWindow = 0;
        lake.misses = Math.min(3, lake.misses + 1);
        lake.feedback = 'counter';
        lake.notice = 2.5;
        goose.challengeFeinted = false;
        goose.comboRemaining = 0;
        goose.comboFollowup = false;
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
            GooseSystem.rescue(game);
            AudioSystem.play('panto-victory', { volume: .85 });
            setStatus('PANTO resgatado! +100 pontos e mais um amigo no poleiro. Atalho e refúgio do lago liberados! Dentro da área marcada, o lobo não pega você.', 'win');
        }
        else {
            goose.mode = 'recover';
            goose.timer = .85;
            goose.cooldown = 1.05;
            AudioSystem.play('pop', { volume: .55 });
            setStatus(`${lake.misses}/3 carimbos! Agora: ${rounds[lake.misses]}. PANTO trocou de estratégia.`, 'win');
        }
        GameManager.save(game);
        updateUI(game);
        return true;
    }
    function recordHit(game) {
        const lake = game.lake;
        if (!lake?.active)
            return;
        lake.attempts += 1;
        lake.counterWindow = 0;
        lake.feedback = 'hit';
        lake.notice = 2.5;
        const goose = game.entities.goose;
        goose.comboRemaining = 0;
        goose.comboFollowup = false;
        goose.challengeFeinted = false;
        if (lake.attempts >= 3) {
            lake.active = false;
            lake.misses = 0;
            lake.feedback = 'failed';
            lake.notice = 6;
            goose.mode = 'recover';
            goose.timer = 1;
            goose.grace = 2;
            releaseWolf(game);
            setStatus('Três bicadas: tentativa encerrada. PANTO reteve seu crachá. Volte e desafie de novo!');
        }
        else
            setStatus(`Pegou! ${3 - lake.attempts} ${lake.attempts === 2 ? 'chance restante' : 'chances restantes'}. O carimbo desta rodada ainda está com PANTO.`);
        GameManager.save(game);
        updateUI(game);
    }
    function blocksWolf(game) {
        return game.lake?.active === true || inSanctuary(game);
    }
    function snapshot(game) {
        return game.lake ? { version: 1, completed: game.lake.completed, misses: game.lake.misses, active: game.lake.active, gooseRescued: !!game.lake.gooseRescued } : undefined;
    }
    function restore(game, saved) {
        initialize(game);
        if (saved && typeof saved === 'object') {
            const record = saved;
            if (record.version === 1 && record.completed === true && record.misses === 3) {
                game.lake.completed = true;
                game.lake.misses = 3;
                SkinSystem.unlockLake(game, false);
                // Completed legacy challenges also bring Panto home, without changing their saved score.
                game.lake.gooseRescued = true;
            }
            else
                game.lake.interrupted = record.version === 1 && record.active === true;
        }
        // An interrupted attempt restarts safely. Never resume an attack while a page is loading.
        buildObstacles(game);
    }
    function bridge() {
        const p = STRUCTURES.pond;
        // Cross west/east; a north exit would end against the farm's boundary fence.
        return { x: p.x - 4, y: Math.round(p.y + p.h / 2 - 38), w: p.w + 8, h: 76 };
    }
    function pondObstacles(game) {
        const p = STRUCTURES.pond;
        const water = { x: p.x + 20, y: p.y + 20, w: p.w - 40, h: p.h - 40, type: 'pond' };
        if (!game?.lake?.completed || game.worldSeed !== WORLD.layout?.seed)
            return [water];
        const b = bridge();
        return [{ ...water, h: b.y - water.y }, { ...water, y: b.y + b.h, h: water.y + water.h - b.y - b.h }].filter(r => r.h > 0);
    }
    function drawSanctuary(game) {
        if (!game.lake?.completed)
            return;
        const r = sanctuary(), p = worldToScreen(r);
        if (p.x > canvas.width || p.y > canvas.height || p.x + r.w < 0 || p.y + r.h < 0)
            return;
        ctx.save();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#d5ebac99';
        ctx.setLineDash([10, 9]);
        ctx.strokeRect(p.x, p.y, r.w, r.h);
        ctx.restore();
    }
    function drawGround(game) {
        if (game.phase !== 'playing' && game.phase !== 'menu')
            return;
        drawSanctuary(game);
        const b = bridge(), p = worldToScreen(b), open = game.lake?.completed;
        if (p.x < -b.w || p.x > canvas.width || p.y < -b.h || p.y > canvas.height)
            return;
        ctx.save();
        ctx.translate(Math.round(p.x), Math.round(p.y));
        ctx.imageSmoothingEnabled = false;
        const rect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
        // Short, worn landings join the deck to walkable grass on each bank.
        // Keep the existing lake access and farm roads in their saved positions.
        for (const end of [0, b.w]) {
            ctx.fillStyle = '#bca06c55';
            ctx.beginPath();
            ctx.ellipse(end + (end ? 12 : -12), b.h / 2, 34, 25, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#c5a977';
            ctx.beginPath();
            ctx.ellipse(end + (end ? 10 : -10), b.h / 2, 25, 19, 0, 0, Math.PI * 2);
            ctx.fill();
            for (let i = 0; i < 18; i++)
                rect(end + (end ? 1 : -1) * (8 + (i * 13) % 23), b.h / 2 - 12 + (i * 17) % 25, 2, 2, i % 3 ? '#dfbd7a55' : '#93784e55');
        }
        // Abutments meet the left and right banks without extending toward the fence.
        for (const end of [0, b.w]) {
            ctx.fillStyle = '#bca06c55';
            ctx.beginPath();
            ctx.ellipse(end, b.h / 2, 20, 47, 0, 0, Math.PI * 2);
            ctx.fill();
            for (let i = 0; i < 5; i++) {
                const x = end - 5, y = -5 + i * 17;
                rect(x + 3, y + 6, 12, 16, '#46514050');
                rect(x, y, 11, 16, i % 2 ? '#a9a78a' : '#b9b499');
                rect(x + 1, y, 9, 2, '#d0c8a8');
                rect(x + 8, y + 3, 3, 12, '#7e806b');
            }
        }
        if (open) {
            rect(4, 10, b.w, b.h - 3, '#254f4235');
            rect(0, 2, b.w, 7, '#62412a');
            rect(0, b.h - 9, b.w, 7, '#62412a');
        }
        const count = Math.ceil(b.w / 14), step = b.w / count;
        for (let i = 0; i < count; i++) {
            if (!open && i > 1 && i < count - 2)
                continue;
            const x = i * step;
            rect(x, 4, step + 1, b.h - 6, '#66442c');
            rect(x, 4, step - 2, b.h - 10, ['#b4854b', '#b98b51', '#aa7943', '#c19256'][i % 4]);
            rect(x + 1, 4, step - 4, 2, '#dbaf70');
            rect(x + step - 4, 7, 1, b.h - 16, '#946135');
            rect(x + 5, 16 + (i * 13) % 23, 1, 18 + (i % 3) * 5, '#86552e55');
            rect(x + 4, 9, 2, 2, '#665844');
            rect(x + 4, b.h - 12, 2, 2, '#665844');
        }
        // Upright posts keep the top-down perspective when the deck runs horizontally.
        const postXs = open ? [3, b.w * .33, b.w * .67, b.w - 7] : [8, b.w - 14];
        for (const y of [3, b.h - 4]) {
            if (open)
                for (let i = 1; i < postXs.length; i++) {
                    const a = postXs[i - 1], z = postXs[i];
                    ctx.lineWidth = 3;
                    ctx.strokeStyle = '#705638';
                    ctx.beginPath();
                    ctx.moveTo(a + 3, y - 14);
                    ctx.quadraticCurveTo((a + z) / 2, y - 6, z + 3, y - 14);
                    ctx.stroke();
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = '#d3b57b';
                    ctx.stroke();
                }
            for (const x of postXs) {
                rect(x + 4, y - 4, 11, 8, '#263e3530');
                rect(x, y - 20, 7, 25, '#61432b');
                rect(x + 1, y - 18, 4, 20, '#ae7c43');
                rect(x + 1, y - 18, 1, 20, '#d0a260');
                rect(x - 1, y - 23, 9, 5, '#795332');
                rect(x, y - 23, 7, 2, '#d4ab6c');
            }
        }
        if (!open)
            for (const x of [11, b.w - 11]) {
                ctx.strokeStyle = '#d8b77b';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(x, -11);
                ctx.quadraticCurveTo(x + 5, b.h / 2 - 14, x, b.h - 18);
                ctx.stroke();
                const y = b.h / 2 - 18;
                rect(x - 13, y, 26, 18, '#805532');
                rect(x - 11, y + 2, 22, 14, '#bb8b4e');
                ctx.strokeStyle = '#efd28e';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x - 4, y + 5);
                ctx.lineTo(x + 4, y + 12);
                ctx.moveTo(x + 4, y + 5);
                ctx.lineTo(x - 4, y + 12);
                ctx.stroke();
            }
        ctx.restore();
    }
    function updateUI(game) {
        const panel = document.getElementById('lakePanel'), button = document.getElementById('lakeChallengeBtn');
        const title = document.getElementById('lakeTitle'), text = document.getElementById('lakeHelp');
        if (!panel || !button || !title || !text)
            return;
        const goose = game.entities.goose;
        const completed = game.lake?.completed, active = game.lake?.active, lake = game.lake;
        panel.hidden = game.phase !== 'playing' || !!completed || !(active || available(game));
        const safe = inSanctuary(game);
        const failed = lake?.feedback === 'failed' && lake.notice > 0;
        const counter = (lake?.counterWindow || 0) > 0;
        const action = typeof GameInput === 'undefined' ? 'E' : GameInput.label('interact');
        const cue = counter ? (canCounter(game) ? `${action} · Pegar carimbo!` : 'PANTO tonto! Chegue perto para pegar o carimbo.') :
            goose?.mode === 'feint' ? 'É blefe! Espere a faixa de verdade.' :
                goose?.mode === 'warning' || goose?.mode === 'charge' ? (goose.tactic === 'double' ? ((goose.comboRemaining || 0) > 0 ? 'Bote duplo! Ainda vem outra faixa.' : 'Segundo bote! Desvie e pegue o carimbo.') : 'Saia da faixa marcada!') :
                    lake?.feedback === 'expired' && lake.notice > 0 ? 'A abertura fechou. Desvie de outra sequência.' :
                        lake?.feedback === 'hit' && lake.notice > 0 ? `Pegou! Restam ${3 - lake.attempts} chances.` :
                            lake?.feedback === 'combo' && lake.notice > 0 ? 'Não pare! PANTO prepara o segundo bote.' : 'Provoque o bote. Depois pegue o carimbo com ' + action + '.';
        const hud = document.getElementById('lakeCounter'), value = document.getElementById('lakeCounterValue');
        const hudTitle = document.getElementById('lakeCounterTitle'), hudCue = document.getElementById('lakeCounterCue');
        if (hud && value && hudTitle && hudCue) {
            hud.hidden = game.phase !== 'playing' || !(active || failed || safe || (completed && game.lake.notice > 0));
            hud.dataset.completed = String(!!completed);
            hud.dataset.feedback = (game.lake?.notice || 0) > 0 ? game.lake?.feedback || '' : '';
            const count = `${game.lake?.misses || 0}/3`;
            if (value.textContent !== count)
                value.textContent = count;
            value.setAttribute('aria-label', `${game.lake?.misses || 0} de 3 carimbos`);
            hudTitle.textContent = safe ? 'LAGOA SEGURA' : completed ? 'PANTO RESGATADO!' : failed ? 'TENTATIVA ENCERRADA' : 'CARIMBOS DO PANTO';
            hudCue.textContent = safe ? 'O lobo espera fora. A proteção acaba ao sair da área marcada.' : completed ? 'Panto a salvo! A lagoa agora é um refúgio do lobo.' : failed ? 'Três bicadas. Tente o desafio novamente.' : cue;
            const round = document.getElementById('lakeRound'), chances = document.getElementById('lakeChances');
            if (round)
                round.textContent = completed ? 'Passagem aprovada' : failed ? 'PANTO reteve seu crachá' : `${Math.min(3, (lake?.misses || 0) + 1)} · ${rounds[Math.min(2, lake?.misses || 0)]}`;
            if (chances)
                chances.textContent = completed ? '✓' : `${Math.max(0, 3 - (lake?.attempts || 0))} chances`;
            const timer = document.getElementById('lakeWindow');
            if (timer) {
                timer.hidden = !counter;
                timer.max = 1;
                timer.value = (lake?.counterWindow || 0) / (lake?.counterDuration || 3);
            }
            for (let i = 1; i <= 3; i++) {
                const stamp = document.getElementById(`lakeStamp${i}`);
                if (stamp) {
                    stamp.dataset.earned = String(i <= (game.lake?.misses || 0));
                    stamp.textContent = i <= (game.lake?.misses || 0) ? '✓' : ['BOTE', 'DUPLO', 'BLEFE'][i - 1];
                }
            }
        }
        title.textContent = completed ? 'PANTO liberou a ponte' : 'PANTO · O fiscal do lago';
        text.textContent = completed ? 'Atalho e refúgio abertos. O lobo não captura dentro da área marcada na lagoa.' : active ?
            `${game.lake.misses}/3 carimbos · ${cue} O lobo espera fora.` :
            `Desvie, aproxime-se de PANTO tonto e use ${action} para pegar o carimbo. São três rodadas; três bicadas encerram a tentativa. Resgate Panto, ganhe +100 pontos, a ponte, um refúgio do lobo e a aparência de ganso.`;
        button.hidden = !!completed;
        button.disabled = !active && !available(game);
        const key = typeof GameInput === 'undefined' ? 'F' : GameInput.label('lake');
        button.textContent = `${active ? 'Sair' : 'Desafiar PANTO'}${key ? ` · ${key}` : ''}`;
    }
    return { initialize, available, start, cancel, update, recordMiss, recordHit, canCounter, interact, blocksWolf, inSanctuary, sanctuary, guardWolf, snapshot, restore, pondObstacles, bridge, drawGround, updateUI, radius: ARENA };
})();
