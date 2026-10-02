"use strict";
const FolkloreSystem = (() => {
    const cast = {
        fuinha: { name: 'Fuinha', after: 1, speed: 110, size: 62, color: '#e6bf8b', hint: 'Arrancada à vista! Saia da frente.' },
        'mula-sem-cabeca': { name: 'Mula sem Cabeça', after: 3, speed: 85, size: 88, color: '#ffb347', hint: 'Tropel de fogo! Desvie para o lado da faixa.' },
        curupira: { name: 'Curupira', after: 5, speed: 95, size: 68, color: '#b6dd75', hint: 'As raízes vão brotar! Saia do círculo.' },
        boitata: { name: 'Boitatá', after: 7, speed: 100, size: 88, color: '#ffd16b', hint: 'Não pise no rastro de fogo!' },
        cuca: { name: 'Cuca', after: 9, speed: 70, size: 82, color: '#d7a6ed', hint: 'Feitiço a caminho! Use as cercas e desvie.' }
    };
    const ids = Object.keys(cast);
    const secret = (e) => e.species !== 'fuinha';
    const box = { ox: 0, oy: 4, r: 16 }, point = WildlifeRules.point;
    const stills = new Map();
    function artReady(id) { return !!CharacterArt.frameFor(id) || stills.has(id); }
    async function load(allowStills = false) {
        if (!allowStills)
            return;
        await Promise.all(ids.map(id => new Promise(resolve => {
            const image = new Image();
            image.onload = () => { stills.set(id, image); resolve(); };
            image.onerror = () => resolve();
            image.src = ShuffleResultArt['enemy-' + id].win;
        })));
    }
    const threshold = (game, id) => Math.max(0, cast[id].after + (game.difficultyKey === 'easy' ? 1 : game.difficultyKey === 'hardcore' ? -1 : 0));
    function initialize(game) {
        game.entities.folklore = [];
        game.folkloreThreats = [];
        const points = [];
        for (const r of WORLD.paths) {
            const length = Math.max(r.w, r.h), steps = Math.max(1, Math.ceil(length / 100));
            for (let i = 0; i <= steps; i++) {
                const p = { x: r.x + (r.w >= r.h ? r.w * i / steps : r.w / 2), y: r.y + (r.h > r.w ? r.h * i / steps : r.h / 2) };
                if (!WildlifeRules.reserved(game, p, 160) && WildlifeRules.clear(p, p, box))
                    points.push(p);
            }
        }
        for (const [i, species] of ids.entries()) {
            const sorted = [...points].sort((a, b) => WildlifeRules.rank(`${species}:${a.x}:${a.y}`) - WildlifeRules.rank(`${species}:${b.x}:${b.y}`));
            const home = [550, 300, 140].map(gap => sorted.find(p => game.entities.folklore.every(e => distance(p, e.home) > gap))).find(Boolean);
            if (!home)
                continue;
            game.entities.folklore.push({ id: 'folklore-' + species, type: 'folklore', species, ...home, home: point(home), target: point(home),
                radius: 22, hitbox: { ...box }, vx: 0, vy: 0, facing: 1, direction: 'down', moving: false, anim: 0, areaId: getAreaAt(home.x, home.y).id, state: 'idle',
                active: false, mode: 'patrol', timer: 1 + i * .3, grace: 2, trailTimer: 0, route: [], routeTimer: 0,
                discovered: false, defeated: false, courage: 3, maxCourage: 3 });
        }
    }
    function protectedPlayer(game) {
        const p = game.entities.chicken;
        return p.hidden || p.invulnerable > 0 || FarmRefuge.contains(p, 30) || distance(p, WORLD.safeZone) < WORLD.safeZone.r + 35;
    }
    function candidate(game) {
        if (game.phase !== 'playing' || game.lake?.active || ThorSystem.active(game) || game.entities.chicken.hidden)
            return;
        const player = game.entities.chicken, active = game.entities.folklore?.find(e => secret(e) && e.active);
        return game.entities.folklore?.filter(e => secret(e) && !e.defeated && artReady(e.species) &&
            game.rescuedCount >= threshold(game, e.species) && (!active || active === e) &&
            (e.active ? e.mode === 'rest' : true) && distance(player, e.active ? e : e.home) < (e.active ? 105 : 85) &&
            DetectionSystem.hasLineOfSight(getHitbox(player), e.active ? getHitbox(e) : e.home))
            .sort((a, b) => distance(player, a) - distance(player, b))[0];
    }
    function hint(game) {
        if (game.phase !== 'playing' || game.lake?.active || ThorSystem.active(game))
            return null;
        const e = candidate(game), key = GameInput.label('interact');
        if (e)
            return e.active ? `${key} · Contra-atacar ${cast[e.species].name}!` : `${key} · Despertar selo esquecido (chefe opcional).`;
        const boss = game.entities.folklore?.find(e => secret(e) && e.active && distance(e, game.entities.chicken) < 500);
        return boss ? `${cast[boss.species].name} · ${boss.courage}/${boss.maxCourage}. ${boss.mode === 'rest' ? `Abertura! Chegue perto e use ${key}.` : 'Desvie e espere a abertura para contra-atacar.'}` : null;
    }
    function interact(game) {
        const e = candidate(game);
        if (!e)
            return false;
        const player = game.entities.chicken;
        if (!e.active) {
            Object.assign(e, point(e.home));
            e.active = true;
            e.discovered = true;
            e.mode = 'patrol';
            e.grace = 2;
            e.timer = 2;
            e.route = [];
            player.invulnerable = Math.max(player.invulnerable, 2);
            setStatus(`CHEFE SECRETO: ${cast[e.species].name}! Desvie dos ataques; chegue perto e use ${GameInput.label('interact')} quando aparecer ABERTURA. Você pode sair da região para recuar.`);
            spawnBurst(e.x, e.y, cast[e.species].color, 20);
        }
        else {
            e.courage--;
            spawnBurst(e.x, e.y, cast[e.species].color, 14);
            AudioSystem.play('bonk', { volume: .6 });
            e.mode = 'return';
            e.timer = 1.5;
            e.grace = 1;
            e.route = [];
            game.folkloreThreats = (game.folkloreThreats || []).filter(h => h.species !== e.species);
            if (e.courage <= 0) {
                e.defeated = true;
                e.active = false;
                game.score += 250;
                game.lives = Math.min(MAX_LIVES, game.lives + 1);
                Object.assign(e, point(e.home));
                AudioSystem.play('rescue', { volume: .7 });
                setStatus(`LENDA VENCIDA! ${cast[e.species].name}: +250 pontos e até 1 coração. O selo se apagou.`, 'win');
            }
            else
                setStatus(`${cast[e.species].name}: ${e.courage} contra-ataques restantes. Prepare-se para a próxima investida!`);
        }
        refreshHud();
        GameManager.save(game);
        return true;
    }
    function hit(game, from, species, radius = 28) {
        const p = game.entities.chicken;
        if (game.phase !== 'playing' || game.lake?.active || protectedPlayer(game) || distance(from, p) > radius + p.hitbox.r ||
            !DetectionSystem.hasLineOfSight(from, getHitbox(p)))
            return false;
        p.invulnerable = 1.6;
        game.lives = Math.max(0, game.lives - 1);
        const d = distance(from, p) || 1;
        Player.move(p, (p.x - from.x) / d * 35, (p.y - from.y) / d * 35);
        AudioSystem.playPlayerHurt(game);
        spawnBurst(p.x, p.y, cast[species].color, 8);
        if (!game.lives)
            finishLose(`${cast[species].name} levou essa! ${cast[species].hint}`);
        else
            setStatus(`${cast[species].name} tirou um coração. ${cast[species].hint}`);
        refreshHud();
        GameManager.save(game);
        return true;
    }
    function threat(game, e, p, kind, vx = 0, vy = 0) {
        if ((game.folkloreThreats?.length || 0) >= 32 || FarmRefuge.contains(p, 35) || !WildlifeRules.clear(p, p, { ox: 0, oy: 0, r: 10 }))
            return;
        game.folkloreThreats.push({ ...p, kind, species: e.species, arm: kind === 'roots' ? .95 : kind === 'fire' ? .6 : 0,
            life: kind === 'spell' ? 2.5 : 3, vx, vy, r: kind === 'roots' ? 30 : kind === 'fire' ? 19 : 7 });
    }
    function move(e, target, speed, dt, onStep) {
        if (WildlifeRules.clear(e, target, e.hitbox))
            e.route = [];
        else {
            if (e.routeTimer <= 0) {
                e.route = WolfAI.findPath(e, target);
                e.routeTimer = .8;
            }
            if (!e.route.length)
                return;
            target = e.route[0];
        }
        const result = WildlifeRules.move(e, target, speed * dt, onStep);
        if (result === 'arrived')
            e.route.shift();
        if (result === 'blocked') {
            e.route = [];
            e.routeTimer = .3;
        }
    }
    function update(game, dt) {
        if (game.phase !== 'playing' || game.lake?.active || ThorSystem.active(game) || !Number.isFinite(dt) || dt <= 0)
            return;
        dt = Math.min(.1, dt);
        const player = game.entities.chicken;
        const scale = 1 + Math.min(.3, game.rescuedCount * .018 + (game.difficultyKey === 'hardcore' ? .1 : 0));
        for (const e of game.entities.folklore || []) {
            if (!artReady(e.species))
                continue;
            if (!e.active) {
                if (secret(e)) {
                    if (!e.defeated && game.rescuedCount >= threshold(game, e.species) && distance(e.home, player) < 190 &&
                        DetectionSystem.hasLineOfSight(getHitbox(player), e.home) && !e.discovered) {
                        e.discovered = true;
                        setStatus(`Uma marca antiga apareceu no chão. Aproxime-se e use ${GameInput.label('interact')} para despertar uma lenda opcional.`);
                    }
                    continue;
                }
                if (game.rescuedCount < threshold(game, e.species) || distance(e, player) < 260)
                    continue;
                e.active = true;
                e.grace = 2;
                setStatus(`${cast[e.species].name} apareceu na fazenda! ${cast[e.species].hint}`);
            }
            if (secret(e) && distance(player, e.home) > 650) {
                e.active = false;
                e.moving = false;
                Object.assign(e, point(e.home));
                game.folkloreThreats = (game.folkloreThreats || []).filter(h => h.species !== e.species);
                setStatus('Você recuou. O selo guarda seu progresso para outra tentativa.');
                GameManager.save(game);
                continue;
            }
            const before = point(e);
            e.timer -= dt;
            e.grace = Math.max(0, e.grace - dt);
            e.routeTimer -= dt;
            e.trailTimer -= dt;
            const seen = !protectedPlayer(game) && distance(player, e.home) < 420 && WildlifeRules.observe(game, getHitbox(e), 340);
            if (e.grace > 0) {
                e.moving = false;
                continue;
            }
            if (e.mode === 'warning') {
                if (protectedPlayer(game)) {
                    e.mode = 'rest';
                    e.timer = 1;
                }
                else if (e.timer <= 0) {
                    if (e.species === 'curupira') {
                        threat(game, e, e.target, 'roots');
                        e.mode = 'rest';
                        e.timer = 3;
                    }
                    else if (e.species === 'cuca') {
                        const a = Math.atan2(e.target.y - e.y, e.target.x - e.x);
                        for (const offset of [-.24, 0, .24])
                            threat(game, e, e, 'spell', Math.cos(a + offset) * 180 * scale, Math.sin(a + offset) * 180 * scale);
                        e.mode = 'rest';
                        e.timer = 2.5;
                    }
                    else {
                        e.mode = 'attack';
                        e.timer = .8;
                    }
                }
            }
            else if (e.mode === 'attack') {
                const from = point(e);
                WildlifeRules.move(e, e.target, (e.species === 'fuinha' ? 250 : 340) * scale * dt, () => hit(game, e, e.species, 18));
                if (e.timer <= 0 || distance(e, e.target) < 8 || distance(e, from) < .1 || player.invulnerable > 0) {
                    e.mode = 'rest';
                    e.timer = secret(e) ? 3 : 1.4;
                }
            }
            else if (e.mode === 'rest') {
                if (e.timer <= 0) {
                    e.mode = 'return';
                    e.timer = .6;
                }
            }
            else if (!seen || e.mode === 'return') {
                move(e, e.home, cast[e.species].speed, dt);
                if (distance(e, e.home) < 5) {
                    e.mode = 'patrol';
                    if (e.timer < 0)
                        e.timer = .4;
                }
            }
            else if (e.species === 'boitata') {
                if (e.mode !== 'hunt') {
                    e.mode = 'hunt';
                    e.timer = 6;
                }
                if (e.timer <= 0) {
                    e.mode = 'rest';
                    e.timer = 3;
                }
                else {
                    move(e, player, cast[e.species].speed * scale, dt, () => hit(game, e, e.species, 18));
                    if (distance(e, before) > .1 && e.trailTimer <= 0) {
                        threat(game, e, e, 'fire');
                        e.trailTimer = .65;
                    }
                }
            }
            else if (e.timer <= 0 && distance(e, player) < (e.species === 'fuinha' ? 165 : 290)) {
                e.mode = 'warning';
                e.target = point(player);
                e.route = [];
                e.timer = e.species === 'cuca' ? 1.1 : e.species === 'curupira' ? .65 : 1;
                Player.face(e, player.x - e.x, player.y - e.y);
                setStatus(`${cast[e.species].name}: ${cast[e.species].hint}`);
            }
            else {
                e.mode = 'hunt';
                move(e, player, cast[e.species].speed * scale, dt);
            }
            const traveled = distance(before, e);
            e.vx = (e.x - before.x) / dt;
            e.vy = (e.y - before.y) / dt;
            e.moving = traveled > .01;
            e.anim = CharacterArt.advance(e.anim, e.species, traveled, { speed: traveled / dt });
            e.state = e.moving ? 'walk' : 'idle';
            if (game.phase !== 'playing')
                break;
        }
        game.folkloreThreats = (game.folkloreThreats || []).filter(h => {
            if (game.phase !== 'playing')
                return false;
            h.arm -= dt;
            h.life -= dt;
            if (h.life <= 0)
                return false;
            if (h.kind === 'spell') {
                const next = { x: h.x + h.vx * dt, y: h.y + h.vy * dt };
                if (!WildlifeRules.clear(h, next, { ox: 0, oy: 0, r: h.r }) || FarmRefuge.contains(next, 35))
                    return false;
                Object.assign(h, next);
            }
            if (h.arm <= 0 && hit(game, h, h.species, h.r) && h.kind === 'spell')
                return false;
            return true;
        });
    }
    function drawEntity(e) {
        if (!e.active)
            return;
        if (CharacterArt.frameFor(e.species)) {
            CharacterArt.draw(ctx, e.species, worldX(e.x), worldY(e.y), { direction: CharacterArt.heading(e), anim: e.anim, moving: e.moving, shadow: false, scale: secret(e) ? 1.5 : 1 });
            return;
        }
        const image = stills.get(e.species);
        if (!image)
            return;
        const size = cast[e.species].size * (secret(e) ? 1.5 : 1);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(image, worldX(e.x) - size / 2, worldY(e.y) - size * .86, size, size);
        ctx.restore();
    }
    function drawGround(game) {
        if (game.lake?.active)
            return;
        ctx.save();
        ctx.lineWidth = 2;
        for (const e of game.entities.folklore || [])
            if (secret(e) && e.discovered && !e.active && !e.defeated && WildlifeRules.onScreen(e.home, 50)) {
                const x = worldX(e.home.x), y = worldY(e.home.y);
                ctx.strokeStyle = cast[e.species].color;
                ctx.fillStyle = '#243a2bd9';
                ctx.beginPath();
                ctx.arc(x, y, 26, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = cast[e.species].color;
                ctx.font = 'bold 25px Trebuchet MS';
                ctx.textAlign = 'center';
                ctx.fillText('?', x, y + 8);
            }
        for (const h of game.folkloreThreats || []) {
            if (!WildlifeRules.onScreen(h, 50))
                continue;
            ctx.fillStyle = h.kind === 'roots' ? '#7fbb5760' : h.kind === 'fire' ? '#ff933777' : '#c18cff';
            ctx.strokeStyle = cast[h.species].color;
            ctx.setLineDash(h.arm > 0 ? [4, 4] : []);
            ctx.beginPath();
            ctx.arc(worldX(h.x), worldY(h.y), h.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
        ctx.setLineDash([]);
        for (const e of game.entities.folklore || []) {
            if (!e.active || e.mode !== 'warning' || !WildlifeRules.onScreen(e, 60))
                continue;
            ctx.strokeStyle = cast[e.species].color;
            ctx.fillStyle = cast[e.species].color + '44';
            if (e.species === 'curupira') {
                ctx.beginPath();
                ctx.arc(worldX(e.target.x), worldY(e.target.y), 30, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
            else {
                ctx.lineWidth = e.species === 'cuca' ? 5 : 32;
                ctx.globalAlpha = .4;
                ctx.beginPath();
                ctx.moveTo(worldX(e.x), worldY(e.y));
                ctx.lineTo(worldX(e.target.x), worldY(e.target.y));
                ctx.stroke();
                ctx.globalAlpha = 1;
                ctx.lineWidth = 2;
            }
        }
        ctx.restore();
    }
    function drawLabels(game) {
        if (game.lake?.active)
            return;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = 'bold 12px Trebuchet MS, sans-serif';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#233828';
        const nearby = candidate(game);
        if (nearby && !nearby.active) {
            const text = GameInput.label('interact') + ' · DESPERTAR', x = worldX(nearby.home.x), y = worldY(nearby.home.y) - 36;
            ctx.strokeText(text, x, y);
            ctx.fillStyle = '#fff0c5';
            ctx.fillText(text, x, y);
        }
        for (const e of game.entities.folklore || [])
            if (e.active && WildlifeRules.onScreen(e, 60)) {
                const text = cast[e.species].name + (secret(e) ? ` · ${e.courage}/${e.maxCourage}` : '') + (e.mode === 'warning' ? ' !' : ''), x = worldX(e.x), y = worldY(e.y) - cast[e.species].size * (secret(e) ? 1.2 : .65);
                ctx.strokeText(text, x, y);
                ctx.fillStyle = cast[e.species].color;
                ctx.fillText(text, x, y);
                if (secret(e)) {
                    ctx.fillStyle = '#243528';
                    ctx.fillRect(x - 45, y + 7, 90, 7);
                    ctx.fillStyle = cast[e.species].color;
                    ctx.fillRect(x - 44, y + 8, 88 * e.courage / e.maxCourage, 5);
                    if (e.mode === 'rest') {
                        ctx.strokeText('ABERTURA · ' + GameInput.label('interact'), x, y - 18);
                        ctx.fillText('ABERTURA · ' + GameInput.label('interact'), x, y - 18);
                    }
                }
            }
        ctx.restore();
    }
    function snapshot(game) {
        return (game.entities.folklore || []).map(e => ({ id: e.id, ...point(e), active: e.active, discovered: e.discovered, defeated: e.defeated, courage: e.courage }));
    }
    function restore(game, saved) {
        initialize(game);
        if (!Array.isArray(saved))
            return;
        for (const e of game.entities.folklore || []) {
            const record = saved.find(s => s && s.id === e.id);
            const active = record?.active === true, courage = record?.courage, discovered = record?.discovered;
            if (!WildlifeRules.validPoint(record) || distance(record, e.home) > 440 || !WildlifeRules.clear(record, record, e.hitbox))
                continue;
            const progress = Number.isInteger(courage) && courage >= 0 && courage <= e.maxCourage;
            if (secret(e) && progress) {
                e.courage = courage;
                e.defeated = courage === 0;
                e.discovered = discovered === true || active || e.defeated;
            }
            Object.assign(e, point(record));
            e.active = active && !e.defeated && (!secret(e) || progress) && game.rescuedCount >= threshold(game, e.species) &&
                (!secret(e) || !game.entities.folklore?.some(other => other.active && secret(other)));
            e.mode = 'return';
            e.grace = 2.5;
        }
    }
    return { cast, initialize, load, update, candidate, interact, hint, drawEntity, drawGround, drawLabels, snapshot, restore, get ready() { return ids.every(artReady); } };
})();
