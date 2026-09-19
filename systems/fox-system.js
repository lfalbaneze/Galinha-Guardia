"use strict";
/* The fox commits to the direction shown by its warning, never to a hidden player. */
const FoxSystem = (() => {
    const HITBOX = { ox: 0, oy: 8, r: 14 };
    const LEASH = 170;
    const point = WildlifeRules.point;
    const lines = {
        Lorenzo: {
            idle: ['Sou moita. Moita com fome.', 'Camuflagem: dez. Discrição: zero.', 'Amanda, meu rabo tá aparecendo?'],
            warning: ['Delivery de susto!', 'Licença, que eu tô sem freio!', 'Agora vai! Eu acho.'],
            miss: ['Era teste de suspensão.', 'O chão desviou de mim!', 'Amanda, essa não conta!'],
            hit: ['Taxa de passagem: um susto!', 'Peguei! Cadê meu troféu?', 'Foi mal! Freio vendido à parte.'],
            move: ['Mudei. O aluguel era alto!', 'Essa moita não tem Wi-Fi.', 'Vou ali trocar de endereço.'],
            scared: ['Calma, chefe! Sou estagiário!', 'Eu só tava regando a moita!', 'Amanda, distrai o grandão!']
        },
        Amanda: {
            idle: ['Lacinho fofo. Planos nem tanto.', 'Lorenzo, esconde esse rabão!', 'Essa moita precisa de um laço.'],
            warning: ['Desfila pro lado, querida!', 'Lacinho preso. Bote liberado!', 'Fofura não dá imunidade!'],
            miss: ['Errei? Foi coreografia!', 'Meu laço pegou vento!', 'Lorenzo, apaga essa filmagem!'],
            hit: ['Bote com laço e recibo!', 'Um susto embalado pra presente!', 'Fofa, sim. Inofensiva, jamais!'],
            move: ['Essa moita não combina comigo.', 'Troca de moita, troca de look!', 'Lorenzo, nada de pegar minha moita!'],
            scared: ['Não grita! Amassa meu laço!', 'Tá bom! Mas sem puxar o laço!', 'Lorenzo, a bronca era pra você!']
        }
    };
    function denLabel(fox) {
        return fox?.name === 'Amanda' ? 'Moita da Amanda' : fox ? 'Moita do Lorenzo' : 'Moita da raposa';
    }
    function say(fox, event) {
        const choices = lines[fox.name || 'Lorenzo'][event], index = fox.speechCounts[event] || 0;
        fox.speech = choices[index % choices.length];
        fox.speechCounts[event] = index + 1;
        fox.speechTime = 3;
        fox.speechCooldown = 8;
    }
    function getConfig(game) {
        const hard = game.difficultyKey === 'hard' || game.difficultyKey === 'hardcore';
        return { warning: game.difficultyKey === 'easy' ? 1.25 : hard ? .9 : 1.1,
            speed: game.settings.chickenSpeed * 1.15, rest: 1.05, cooldown: 3.2,
            relocateEvery: game.difficultyKey === 'hardcore' ? 6 : hard ? 10 : 0,
            travelSpeed: game.difficultyKey === 'hardcore' ? 165 : 140 };
    }
    function dens(game) {
        const bonus = new Set(game.entities.chicks.map(c => c.coverId));
        return HidingSpots.getSpots().filter(s => s.type === 'bush' && !bonus.has(s.id)).map(s => ({
            spot: s, home: { x: s.x + s.w / 2, y: s.y + s.h - 9 }, rank: WildlifeRules.rank(s.id, 0x715be19)
        })).filter(c => !WildlifeRules.reserved(game, c.home) && WildlifeRules.pathDistance(c.home) <= 190 &&
            WildlifeRules.clear(c.home, c.home, HITBOX)).sort((a, b) => a.rank - b.rank);
    }
    function initialize(game) {
        const candidates = dens(game);
        const chosen = [];
        for (const c of candidates) {
            if (chosen.every(p => distance(p.home, c.home) > 390))
                chosen.push(c);
            if (chosen.length === 2)
                break;
        }
        game.entities.foxes = chosen.map(({ spot, home }, i) => ({ id: `fox-${spot.id}`, type: 'fox', ...home,
            name: i === 0 ? 'Lorenzo' : 'Amanda', speech: '', speechTime: 0, speechCooldown: 3 + i * 3, speechCounts: {},
            radius: 23, hitbox: { ...HITBOX }, vx: 0, vy: 0, facing: 1, direction: 'right', moving: false, anim: 0,
            areaId: getAreaAt(home.x, home.y).id, state: 'idle', mode: 'hidden', home: point(home), anchor: point(home),
            target: point(home), bushId: spot.id, timer: 0, cooldown: 1 + i * .5, grace: 2, notice: 0, attempts: 0, hit: false, route: [], scaredTime: 0,
            relocateIn: getConfig(game).relocateEvery + i * 3 }));
    }
    function routeTo(fox, home) {
        const route = WildlifeRules.clear(fox, home, fox.hitbox) ? [home] : WolfAI.findPath(fox, home);
        if (!route.length)
            return [];
        // Navigation may project a destination out of an obstacle. Only accept paths all the way to the den.
        if (distance(route[route.length - 1], home) > .01)
            route.push(home);
        return route.every((p, i) => WildlifeRules.clear(i ? route[i - 1] : fox, p, fox.hitbox)) ? route : [];
    }
    function relocate(game, fox) {
        const config = getConfig(game);
        if (!config.relocateEvery)
            return false;
        fox.relocateIn = config.relocateEvery + WildlifeRules.rank(fox.id, fox.attempts) % 4;
        const chicken = game.entities.chicken;
        const candidates = dens(game).filter(c => c.spot.id !== fox.bushId &&
            !(game.entities.foxes || []).some(f => f !== fox && f.bushId === c.spot.id) &&
            c.spot.id !== chicken.hidingSpotId && !HidingSpots.contains(c.spot, chicken) &&
            distance(c.home, chicken) > 180 && distance(c.home, fox) > 100)
            .sort((a, b) => distance(a.home, fox) - distance(b.home, fox));
        for (const { spot, home } of candidates) {
            const route = routeTo(fox, home);
            if (!route.length)
                continue;
            fox.bushId = spot.id;
            fox.home = point(home);
            fox.route = route;
            fox.mode = 'relocate';
            fox.timer = 0;
            fox.hit = false;
            say(fox, 'move');
            return true;
        }
        return false;
    }
    function visible(game, fox) {
        return distance(game.entities.chicken, fox) < 400 && WildlifeRules.onScreen(fox, 80) &&
            DetectionSystem.hasLineOfSight(getHitbox(game.entities.chicken), getHitbox(fox));
    }
    function plan(fox, target) {
        const dx = target.x - fox.x, dy = target.y - fox.y, length = Math.hypot(dx, dy);
        let end = point(fox);
        if (length < 1)
            return end;
        for (let s = 5; s <= LEASH; s += 5) {
            const next = { x: fox.x + dx / length * s, y: fox.y + dy / length * s };
            if (!WildlifeRules.clear(end, next, fox.hitbox) || distance(fox.home, next) > LEASH)
                break;
            end = next;
        }
        return end;
    }
    function rest(fox, config) {
        fox.mode = 'rest';
        fox.timer = config.rest;
        fox.cooldown = config.cooldown;
        fox.vx = 0;
        fox.vy = 0;
        fox.moving = false;
        say(fox, fox.hit ? 'hit' : 'miss');
    }
    function bump(game, fox) {
        const c = game.entities.chicken;
        if (game.phase !== 'playing' || game.lake?.active || fox.mode !== 'dash' || fox.hit || c.hidden || c.invulnerable > 0 ||
            !circleVsCircle(fox, c) || !DetectionSystem.hasLineOfSight(getHitbox(fox), getHitbox(c)))
            return false;
        const dx = c.x - fox.x, dy = c.y - fox.y, len = Math.hypot(dx, dy), a = Math.atan2(fox.target.y - fox.anchor.y, fox.target.x - fox.anchor.x);
        Player.move(c, (len > .01 ? dx / len : Math.cos(a)) * 54, (len > .01 ? dy / len : Math.sin(a)) * 54);
        c.vx = 0;
        c.vy = 0;
        c.moving = false;
        c.sprinting = false;
        c.invulnerable = 1.2;
        fox.hit = true;
        rest(fox, getConfig(game));
        game.lives = Math.max(0, game.lives - 1);
        AudioSystem.playPlayerHurt(game);
        spawnBurst(c.x, c.y, '#dfac75', 8);
        if (game.lives === 0)
            finishLose(`${fox.name} levou essa! Tentar novamente começa do zero. Na próxima, desvie para o lado da investida.`);
        else
            setStatus(`${fox.name} cobrou um coração! Restam ${game.lives}. Desvie para o lado e aproveite a pausa da raposa.`);
        refreshHud();
        GameManager.save(game);
        return true;
    }
    function fleePoint(fox, wolf) {
        const away = Math.atan2(fox.y - wolf.y, fox.x - wolf.x), gap = distance(fox, wolf);
        let best = point(fox), bestGap = gap;
        for (const length of [120, 80, 40])
            for (const offset of [0, .45, -.45, .9, -.9, 1.35, -1.35, Math.PI]) {
                const p = { x: fox.x + Math.cos(away + offset) * length, y: fox.y + Math.sin(away + offset) * length };
                const nextGap = distance(p, wolf);
                if (nextGap > bestGap && distance(p, fox.home) <= LEASH && WildlifeRules.clear(fox, p, fox.hitbox)) {
                    best = p;
                    bestGap = nextGap;
                }
            }
        return best;
    }
    function scareFromWolf(game, fox) {
        const wolf = game.entities.wolf;
        if (!['rest', 'return'].includes(fox.mode) || (fox.scaredTime || 0) > 0 || fox.grace > 0 ||
            wolf.mode === 'frightened' || SunflowerSystem.concealed(game) || wolf.huntUnlockTimer > 0 || wolf.pauseTimer > 0 || (wolf.foxScoldCooldown || 0) > 0)
            return false;
        const config = WolfAI.getConfig(game);
        if (!DetectionSystem.canSee(wolf, fox, { ...config, range: Math.min(280, config.range) }))
            return false;
        fox.target = fleePoint(fox, wolf);
        fox.mode = 'flee';
        fox.timer = 1.6;
        fox.scaredTime = 6;
        fox.cooldown = Math.max(8, fox.cooldown);
        fox.route = [];
        fox.hit = true;
        say(fox, 'scared');
        wolf.foxScoldCooldown = 5;
        wolf.speech = 'Quem manda nesta fazenda sou eu!';
        wolf.speechTime = 3.2;
        wolf.speechCooldown = 5;
        wolf.speechPriority = 3.2;
        wolf.speechMode = wolf.mode;
        return true;
    }
    function update(game, dt) {
        if (game.phase !== 'playing' || game.lake?.active || !Number.isFinite(dt) || dt <= 0)
            return;
        dt = Math.min(dt, .1);
        const config = getConfig(game);
        const wolf = game.entities.wolf;
        wolf.foxScoldCooldown = Math.max(0, (wolf.foxScoldCooldown || 0) - dt);
        for (const fox of game.entities.foxes || []) {
            const before = point(fox);
            fox.cooldown = Math.max(0, fox.cooldown - dt);
            fox.grace = Math.max(0, fox.grace - dt);
            fox.timer = Math.max(0, fox.timer - dt);
            fox.scaredTime = Math.max(0, (fox.scaredTime || 0) - dt);
            fox.speechTime = Math.max(0, fox.speechTime - dt);
            fox.speechCooldown = Math.max(0, fox.speechCooldown - dt);
            scareFromWolf(game, fox);
            if (fox.mode === 'hidden') {
                if (config.relocateEvery)
                    fox.relocateIn = Math.max(0, fox.relocateIn - dt);
                if (fox.cooldown <= 0 && fox.grace <= 0 && visible(game, fox) && WildlifeRules.observe(game, getHitbox(fox), 135)) {
                    const chicken = game.entities.chicken;
                    // Lead a visible runner a little, then commit to that one announced line.
                    const speed = Math.hypot(chicken.vx, chicken.vy), lead = chicken.sprinting ? Math.min(28, speed * .12) : 0;
                    const observed = { x: chicken.x + (speed ? chicken.vx / speed * lead : 0), y: chicken.y + (speed ? chicken.vy / speed * lead : 0) };
                    const target = plan(fox, DetectionSystem.hasLineOfSight(getHitbox(fox), observed) ? observed : chicken);
                    if (distance(fox, target) < 40) {
                        fox.cooldown = 1;
                        continue;
                    }
                    fox.mode = 'warning';
                    fox.anchor = point(fox);
                    fox.target = target;
                    fox.timer = config.warning;
                    fox.hit = false;
                    Player.face(fox, target.x - fox.x, target.y - fox.y);
                    AudioSystem.play('fox-rustle', { volume: .36 });
                    say(fox, 'warning');
                    setStatus(`Essa moita tem rabo! ${fox.name} vai dar o bote. Saia para o lado da faixa marcada.`);
                }
                else if (config.relocateEvery && fox.relocateIn <= 0 && fox.grace <= 0) {
                    relocate(game, fox);
                }
            }
            else if (fox.mode === 'warning') {
                if (!WildlifeRules.observe(game, getHitbox(fox), LEASH + 45)) {
                    fox.mode = 'hidden';
                    fox.cooldown = 1.5;
                }
                else if (fox.timer <= 0) {
                    fox.mode = 'dash';
                    fox.timer = LEASH / config.speed + .1;
                    fox.attempts++;
                }
            }
            else if (fox.mode === 'dash') {
                if (!bump(game, fox)) {
                    const moved = WildlifeRules.move(fox, fox.target, config.speed * dt, () => bump(game, fox));
                    if (fox.mode === 'dash' && (moved !== 'moving' || fox.timer <= 0))
                        rest(fox, config);
                }
            }
            else if (fox.mode === 'rest') {
                if (fox.timer <= 0) {
                    fox.mode = 'return';
                    fox.route = [];
                }
            }
            else if (fox.mode === 'flee') {
                const moved = WildlifeRules.move(fox, fox.target, config.speed * dt);
                if (moved !== 'moving' || fox.timer <= 0) {
                    fox.mode = 'return';
                    fox.route = [];
                    fox.timer = 0;
                }
            }
            else {
                let target = fox.home;
                if (!WildlifeRules.clear(fox, target, fox.hitbox)) {
                    if (!fox.route.length && fox.timer <= 0) {
                        fox.route = routeTo(fox, fox.home);
                        fox.timer = 1;
                    }
                    if (!fox.route.length)
                        continue;
                    target = fox.route[0];
                }
                const moved = WildlifeRules.move(fox, target, ((fox.scaredTime || 0) > 0 ? config.speed : fox.mode === 'relocate' ? config.travelSpeed : 100) * dt);
                if (moved === 'blocked') {
                    fox.route = [];
                    fox.timer = 1;
                }
                if (moved === 'arrived') {
                    if (distance(fox, fox.home) < 1) {
                        fox.mode = 'hidden';
                        fox.hit = false;
                        fox.cooldown = Math.max(1, fox.cooldown);
                        fox.route = [];
                    }
                    else
                        fox.route.shift();
                }
            }
            fox.vx = (fox.x - before.x) / dt;
            fox.vy = (fox.y - before.y) / dt;
            fox.moving = distance(before, fox) > .01;
            fox.state = fox.moving ? 'walk' : 'idle';
            fox.anim += dt * (fox.mode === 'dash' || fox.mode === 'flee' ? 12 : fox.moving ? 7 : 2);
            fox.areaId = getAreaAt(fox.x, fox.y).id;
            if (fox.mode === 'hidden' && fox.grace <= 0 && fox.speechCooldown <= 0 && visible(game, fox) && distance(fox, game.entities.chicken) < 280)
                say(fox, 'idle');
            if (game.phase !== 'playing')
                break;
        }
    }
    function drawWarnings(game) {
        if (game.phase !== 'playing' || game.lake?.active)
            return;
        for (const fox of game.entities.foxes || []) {
            if (visible(game, fox)) {
                const x = clamp(worldX(fox.x), 32, canvas.width - 32), y = Math.max(20, worldY(fox.y) - 62);
                ctx.save();
                ctx.font = 'bold 11px Trebuchet MS, sans-serif';
                ctx.textAlign = 'center';
                ctx.strokeStyle = '#243c2ddd';
                ctx.lineWidth = 3;
                ctx.lineJoin = 'round';
                ctx.strokeText(fox.name, x, y);
                ctx.fillStyle = fox.name === 'Amanda' ? '#ffc5df' : '#fff0bd';
                ctx.fillText(fox.name, x, y);
                ctx.restore();
            }
            if (fox.speechTime > 0 && fox.speech && visible(game, fox)) {
                ctx.save();
                ctx.font = 'bold 12px Trebuchet MS, sans-serif';
                ctx.textAlign = 'center';
                const width = Math.min(canvas.width - 24, Math.max(110, ctx.measureText(fox.speech).width + 20));
                const x = clamp(worldX(fox.x), width / 2 + 8, canvas.width - width / 2 - 8), fy = worldY(fox.y);
                const y = clamp(fy < 120 ? fy + 45 : fy - 96, 24, canvas.height - 16);
                ctx.fillStyle = fox.name === 'Amanda' ? '#ffe0eefa' : '#fff0cefa';
                ctx.strokeStyle = '#523c35';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.roundRect(x - width / 2, y - 18, width, 29, 7);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#50382f';
                ctx.fillText(fox.speech, x, y + 1, width - 16);
                ctx.restore();
            }
            if (fox.mode !== 'warning' || !visible(game, fox))
                continue;
            const x = worldX(fox.x), y = worldY(fox.y), to = worldToScreen(fox.target);
            ctx.save();
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#efb47d30';
            ctx.lineWidth = 2 * (fox.hitbox.r + game.entities.chicken.hitbox.r);
            ctx.beginPath();
            ctx.moveTo(x, y + 8);
            ctx.lineTo(to.x, to.y + 8);
            ctx.stroke();
            ctx.strokeStyle = '#efb47d';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 6]);
            ctx.beginPath();
            ctx.moveTo(x, y + 8);
            ctx.lineTo(to.x, to.y + 8);
            ctx.stroke();
            ctx.setLineDash([]);
            const shake = InterfaceMotion.reduced ? 0 : Math.sin(fox.anim * 15) * 2;
            ctx.fillStyle = '#493322';
            ctx.fillRect(Math.round(x - 5 + shake), y - 34, 10, 19);
            ctx.fillStyle = '#f7d99a';
            ctx.fillRect(Math.round(x - 2 + shake), y - 32, 4, 10);
            ctx.fillRect(Math.round(x - 2 + shake), y - 19, 4, 3);
            ctx.fillStyle = '#493322';
            ctx.fillRect(x - 24, y - 46, 48, 7);
            ctx.fillStyle = '#f7d99a';
            ctx.fillRect(x - 22, y - 44, 44 * clamp(1 - fox.timer / getConfig(game).warning, 0, 1), 3);
            ctx.restore();
        }
    }
    function snapshot(game) {
        return (game.entities.foxes || []).map(f => ({ id: f.id, ...point(f), cooldown: f.cooldown, bushId: f.bushId, relocateIn: f.relocateIn }));
    }
    function restore(game, saved) {
        initialize(game);
        if (!Array.isArray(saved))
            return;
        const candidates = dens(game), claimed = new Set();
        const placements = new Map();
        // Reserve saved homes together so two foxes can exchange their original dens.
        if (getConfig(game).relocateEvery)
            for (const fox of game.entities.foxes || []) {
                const s = saved.find(v => v && typeof v === 'object' && v.id === fox.id);
                const den = candidates.find(c => c.spot.id === s?.bushId && !claimed.has(c.spot.id));
                if (!den || !WildlifeRules.validPoint(s) || !WildlifeRules.clear(s, s, fox.hitbox) ||
                    !routeTo({ ...fox, ...point(s) }, den.home).length)
                    continue;
                placements.set(fox.id, den);
                claimed.add(den.spot.id);
            }
        for (const fox of game.entities.foxes || []) {
            const den = placements.get(fox.id);
            if (den) {
                fox.bushId = den.spot.id;
                fox.home = point(den.home);
            }
            else if (fox.bushId && claimed.has(fox.bushId)) {
                const fallback = candidates.find(c => !claimed.has(c.spot.id));
                if (fallback) {
                    fox.bushId = fallback.spot.id;
                    fox.home = point(fallback.home);
                }
            }
            if (fox.bushId)
                claimed.add(fox.bushId);
            Object.assign(fox, point(fox.home));
            const s = saved.find((v) => v && typeof v === 'object' && v.id === fox.id);
            if (!WildlifeRules.validPoint(s) || !WildlifeRules.clear(s, s, fox.hitbox))
                continue;
            const record = s;
            if (!den && (distance(s, fox.home) > LEASH || !WildlifeRules.clear(fox.home, s, fox.hitbox)))
                continue;
            fox.x = s.x;
            fox.y = s.y;
            fox.mode = distance(fox, fox.home) > 1 ? 'rest' : 'hidden';
            fox.timer = 1.1;
            fox.relocateIn = typeof record.relocateIn === 'number' && Number.isFinite(record.relocateIn) ?
                clamp(record.relocateIn, 0, 20) : getConfig(game).relocateEvery;
            const cooldown = s.cooldown;
            fox.cooldown = typeof cooldown === 'number' && Number.isFinite(cooldown) ? clamp(cooldown, 1, 8) : 2;
            fox.grace = 2;
        }
    }
    return { initialize, getConfig, update, visible, drawWarnings, snapshot, restore, denLabel };
})();
