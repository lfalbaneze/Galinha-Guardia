"use strict";
const RescueSystem = {
    names: { sheep: 'Amélia', pig: 'Tonico', goat: 'Josefina', cow: 'Mimosa', duck: 'Quincas',
        rabbit: 'Jay Jay', dog: 'Bento', cat: 'Nino', donkey: 'Astolfo', lamb: 'Floquinho', chick: 'Pingo', horse: 'Ventania', turkey: 'Osvaldo' },
    chickNames: ['Pingo', 'Fubá', 'Quindim', 'Cacau', 'Farofa', 'Dengo', 'Biscoito', 'Mel', 'Tutu', 'Jujuba'],
    owlNames: ['Aurora', 'Olívia'],
    crowNames: ['Tico', 'Teco', 'Cacá'],
    nameOf(animal, game) {
        // Pipoca is a playable appearance; Jay Jay is the separate rescued rabbit.
        if (animal.type === 'chicken' || animal.species === 'chicken')
            return CharacterArt.appearances[animal.skin || 'classic']?.name || 'Erina';
        if (animal.name?.trim())
            return animal.name.trim();
        const species = animal.species || animal.type || '';
        const index = Number(/(?:^|[_-])(\d+)$/.exec(animal.id || '')?.[1] || 0);
        if (species === 'chick')
            return RescueSystem.chickNames[index] || `Pintinho ${index + 1}`;
        if (species === 'owl') {
            const found = game?.entities.owls?.findIndex(o => o.id === animal.id) ?? -1, n = found >= 0 ? found : index;
            return RescueSystem.owlNames[n] || `Coruja ${n + 1}`;
        }
        if (species === 'crow')
            return RescueSystem.crowNames[index] || `Corvo ${index + 1}`;
        if (species === 'wolf')
            return 'Baltazar';
        if (species === 'goose')
            return 'Panto';
        if (species === 'thor')
            return 'Thor';
        if (species === 'fox')
            return 'Lorenzo';
        return RescueSystem.names[species] || 'Amigo da fazenda';
    },
    personalities: {
        sheep: { pace: 1, nerve: 1, endurance: 1 }, pig: { pace: .9, nerve: .88, endurance: .9 },
        goat: { pace: 1.04, nerve: 1.05, endurance: 1.1 }, cow: { pace: .86, nerve: .85, endurance: 1.18 },
        duck: { pace: .96, nerve: 1.04, endurance: .9 }, rabbit: { pace: 1.08, nerve: 1.12, endurance: .76 },
        dog: { pace: 1.02, nerve: .9, endurance: 1.1 }, cat: { pace: 1.06, nerve: 1.08, endurance: .84 },
        donkey: { pace: .9, nerve: .82, endurance: 1.18 }, lamb: { pace: .96, nerve: 1.08, endurance: .82 },
        chick: { pace: 1.02, nerve: 1.05, endurance: .8 },
        horse: { pace: 1.1, nerve: .95, endurance: 1.15 }, turkey: { pace: .93, nerve: 1.12, endurance: .82 }
    },
    personality(animal) { return RescueSystem.personalities[animal.species] || RescueSystem.personalities.sheep; },
    all(game) { return [...game.entities.animals, ...(game.entities.chicks || [])]; },
    safePosition(index) {
        return FarmRefuge.home(index);
    },
    chickPosition(index) { return FarmRefuge.home(index, true); },
    knowsSecret(game) {
        return game.rescuedChicks > 0 || game.entities.chicks.some(c => c.discovered);
    },
    isSecret(animal) { return animal.type === "chick" && !animal.rescued && !animal.discovered; },
    secretHint(game) {
        if (game.phase !== "playing" || game.lake?.active)
            return null;
        const chicken = game.entities.chicken;
        const currentCover = HidingSpots.candidate(chicken)?.id;
        return game.entities.chicks.filter(c => RescueSystem.isSecret(c) &&
            (c.coverId ? HidingSpots.hasBonusClue(chicken, c) :
                distance(chicken, c) < 190 && DetectionSystem.hasLineOfSight(getHitbox(chicken), getHitbox(c))))
            .sort((a, b) => Number(b.coverId === currentCover) - Number(a.coverId === currentCover) ||
            distance(chicken, a) - distance(chicken, b))[0] || null;
    },
    callTarget(game) {
        if (game.phase !== 'playing' || game.lake?.active || WolfAI.isExposed(game))
            return null;
        const chicken = game.entities.chicken;
        return game.entities.chicks.filter(chick => !chick.rescued && !game.rescuedChickIds.has(chick.id) &&
            // E still exits a different hiding place. Old, already revealed chicks can also be called.
            (!chicken.hidden || chicken.hidingSpotId === chick.coverId) &&
            (chick.coverId && !chick.discovered ? HidingSpots.bonusInReach(chicken, chick) :
                distance(chicken, chick) <= 80 && DetectionSystem.hasLineOfSight(getHitbox(chicken), getHitbox(chick))))
            .sort((a, b) => distance(chicken, a) - distance(chicken, b))[0] || null;
    },
    callChick(game) {
        const chick = RescueSystem.callTarget(game);
        if (!chick)
            return false;
        const chicken = game.entities.chicken;
        chick.discovered = true;
        chick.lastSeen = { x: chick.x, y: chick.y };
        if (!GameManager.rescue(game, chick))
            return false;
        game.secretNotice = { time: 4, bonus: true, name: RescueSystem.nameOf(chick, game), x: chick.x, y: chick.y,
            targetX: chicken.x + (chick.x < chicken.x ? -28 : 28), targetY: chicken.y };
        game.rescueNotice = null;
        chicken.hideHintTimer = 0;
        spawnBurst(chick.x, chick.y, '#ffe496', 18);
        AudioSystem.playAnimal('chick');
        const safe = RescueSystem.chickPosition(game.entities.chicks.indexOf(chick));
        Object.assign(chick, { x: safe.x, y: safe.y, targetX: safe.x, targetY: safe.y,
            moving: false, direction: 'down', temper: 'safe', speechTime: 0 });
        setStatus(`${RescueSystem.nameOf(chick, game)}: Piu! Fim da expedição de dois passos. ${game.rescuedChicks} de ${game.entities.chicks.length} pintinhos no ninho. +100 pontos!`, 'win');
        GameManager.save(game);
        GameUI.update(game);
        return true;
    },
    taunts: {
        horse: ["Quatro patas e nenhum GPS!", "Minha crina não tem freio!", "Era passeio. Virou campeonato!"],
        turkey: ["Glu-glu! Isso é um protesto!", "Não corro. Desfilo com urgência!", "Essas penas não são aerodinâmicas!"],
        sheep: ["Calma, engasguei com o capim!", "Essa lã não é roupa de corrida!", "Só mais uma moita. A última!", "Mééé… amarrotei meu penteado!"],
        pig: ["Saí do banho de lama AGORA!", "Sem correr! Acabei de almoçar!", "Esse barro é de estimação!", "Meu spa não aceita pressa!"],
        goat: ["Eu ia comer essa placa!", "A cerca começou a discussão!", "Se tem portão, cadê a graça?", "Só uma mordidinha no chapéu!"],
        cow: ["Muuu… tô na segunda mastigada.", "Meu leite vai virar manteiga!", "Calma! São QUATRO patas!", "Correr? Com esse tanto de capim?"],
        duck: ["Quá! Esse chão não nada!", "Correr com nadadeira é fácil?", "Eu devia ter vindo de lago.", "Não encosta no meu topete!"],
        rabbit: ["Era um pulo. Viraram doze!", "Orelhas, parem de balançar!", "Volto já. Ou já voltei?", "Cadê o freio dessa pata?!"],
        dog: ["Só vou cheirar mais esse poste!", "Atalho! Ih… era o mesmo poste.", "Você viu meu graveto?", "Eu latia, mas tava mastigando."],
        cat: ["Eu fugi porque EU quis.", "Me salve, mas sem amassar.", "Isso conta como meu passeio.", "Acordei pra isso, sério?"],
        donkey: ["Eu avisei. Não sei o quê, mas…", "Esse atalho tá muito comprido.", "Eu só corro sob protesto!", "Minha teimosia ficou pra trás!"],
        lamb: ["Minha lã ainda é tamanho P!", "Perninha, faz hora extra!", "Esse capim era maior que eu!", "Cadê o adulto dessa fazenda?!"],
        chick: ["Piu! Me perdi em três passos!", "Essa folha parecia uma árvore!", "Eu tava contando formiga!", "Piu! Minha aventura cansou."]
    },
    // These lines only follow an actual sighting, never the player's use of C.
    stealthLines: ['Eita! Quem tá aí?!', 'Ai! Que susto!', 'Eu te vi! Pernas, corram!', 'Você apareceu de fininho!'],
    stealthTiredLine: 'Ufa… ainda tô tremendo do susto!',
    tiredLines: {
        horse: "Estacionei. Cadê o capim?", turkey: "Glu… acabou meu discurso.",
        sheep: "Ufa. A lã pesa, sabia?", pig: "Pausa pra virar presunto? NÃO!",
        goat: "Tá. Você venceu no cansaço.", cow: "Chega. O leite já chacoalhou.",
        duck: "Quá… minhas nadadeiras…", rabbit: "Acabou a mola da patinha.",
        dog: "Língua pra fora. Ideias também.", cat: "Cansei de fingir que fujo.",
        donkey: "Vou, mas vou reclamando.", lamb: "Pode me levar no bolso?", chick: "Piu… cadê meu colinho?"
    },
    alarmLines: {
        horse: "Lobo! Hoje eu sou puro cavalo-vapor!", turkey: "Lobo! Cancela a ceia!",
        sheep: "Lobo! Minha lã não é guardanapo!", pig: "Lobo! O buffet tá FECHADO!",
        goat: "Lobo! Come a placa, ué!", cow: "Lobo! Muuu-da de cardápio!",
        duck: "Lobo! Hoje o pato não paga!", rabbit: "Lobo! Orelhas, modo foguete!",
        dog: "Lobo! Thor, atende esse au!", cat: "Lobo! Cadê meus seguranças?",
        donkey: "Lobo! Retiro meu protesto!", lamb: "Lobo! Sou só uma amostrinha!", chick: "Lobo! Sou pequeno até pro susto!"
    },
    dangerLines: {
        fox: 'Raposa! Meu almoço não sou eu!', goose: 'Panto! Bico longe das minhas penas!',
        folklore: 'Tem assombração na trilha! Corram!', hazard: 'Cuidado com o chão! Por aqui!'
    },
    thanks: {
        horse: "Tem vaga pra quatro patas?", turkey: "Glu-glu! Eu exijo um poleiro VIP!",
        sheep: "Salvou até meu penteado!", pig: "Aqui aceita lama no tapete?", goat: "Essa cerca é comestível?",
        cow: "Agora posso mastigar em paz.", duck: "Quá! Cheguei sem virar almoço.", rabbit: "Parei. Minhas orelhas, não.",
        dog: "Trouxe um graveto pra você!", cat: "Eu tinha tudo sob controle.", donkey: "Eu sabia que era por aqui.",
        lamb: "Tem capim picadinho?", chick: "Piu! Guarda um cantinho pra mim."
    },
    visible(game, animal) {
        return !RescueSystem.isSecret(animal) && distance(game.entities.chicken, animal) < 300 &&
            DetectionSystem.hasLineOfSight(getHitbox(game.entities.chicken), getHitbox(animal));
    },
    inRescueReach(chicken, animal) {
        const a = getHitbox(chicken), b = getHitbox(animal);
        // A small margin avoids pixel-perfect contact without reaching through fences.
        return distance(a, b) <= a.r + b.r + 8 && DetectionSystem.hasLineOfSight(a, b);
    },
    talk(game, animal, tired = false) {
        if (game.animalSpeechCooldown > 0 || animal.speechTime > 0)
            return;
        const startled = game.entities.chicken.sneaking && animal.fleeFrom?.kind === 'player';
        // A quiet, unnoticed player must not make an animal speak or offer to follow.
        if (game.entities.chicken.sneaking && !startled && animal.fleeFrom?.kind !== 'wolf')
            return;
        const lines = startled ? RescueSystem.stealthLines : RescueSystem.taunts[animal.species] || RescueSystem.taunts.chick;
        animal.speech = animal.fleeFrom?.kind === 'wolf' ?
            (animal.dangerSource && animal.dangerSource !== 'wolf' ? RescueSystem.dangerLines[animal.dangerSource] : RescueSystem.alarmLines[animal.species]) :
            tired ? (startled ? RescueSystem.stealthTiredLine : RescueSystem.tiredLines[animal.species]) :
                lines[Math.floor(Math.random() * lines.length)];
        animal.speechTime = 2.4;
        game.animalSpeechCooldown = 2.8;
        if (!tired && RescueSystem.visible(game, animal) && !circleVsCircle(game.entities.chicken, animal))
            AudioSystem.playAnimal(animal.species, { volume: .55, ambient: true });
    },
    observeThreat(game, animal, visible) {
        const chicken = game.entities.chicken, wolf = game.entities.wolf;
        const profile = RescueSystem.personality(animal);
        const facing = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[animal.direction] || [0, 1];
        const toward = (chicken.x - animal.x) * facing[0] + (chicken.y - animal.y) * facing[1];
        const gap = distance(chicken, animal);
        // Quiet steps avoid notice outside the viewing cone, never weaken sight.
        // A fleeing or resting animal keeps watching a player it already noticed.
        const inView = gap < .001 || toward / gap >= Math.cos(50 * Math.PI / 180);
        const recognized = animal.fleeFrom?.kind === 'player' && (animal.fleeTime > 0 || animal.restTime > 0);
        const alertRange = (chicken.sprinting ? 240 : toward > 0 || recognized ? 170 : 105) * profile.nerve;
        const patient = (animal.calmWindow || 0) > 0 && !chicken.sprinting && Math.hypot(chicken.vx, chicken.vy) < 70;
        const friendly = !chicken.sneaking && (SkinSystem.power(chicken).friendSpecies === animal.species || patient);
        const threats = [];
        if (!friendly && !chicken.hidden && visible && gap < alertRange && (!chicken.sneaking || inView || recognized) &&
            DetectionSystem.hasLineOfSight(getHitbox(animal), getHitbox(chicken)))
            threats.push({ x: chicken.x, y: chicken.y, kind: 'player', urgency: 1 - gap / alertRange });
        const wolfRange = 190 * profile.nerve;
        if (!SunflowerSystem.concealed(game) && wolf.mode !== 'frightened' && wolf.huntUnlockTimer <= 0 && wolf.pauseTimer <= 0 && distance(wolf, animal) < wolfRange &&
            DetectionSystem.hasLineOfSight(getHitbox(animal), getHitbox(wolf)))
            threats.push({ x: wolf.x, y: wolf.y, kind: 'wolf', source: 'wolf', urgency: 1.3 - distance(wolf, animal) / wolfRange });
        const notice = (body, source, range, urgency) => {
            const gap = distance(body, animal);
            if (gap < range * profile.nerve && DetectionSystem.hasLineOfSight(getHitbox(animal), getHitbox(body)))
                threats.push({ x: body.x, y: body.y, kind: 'wolf', source, urgency: urgency - gap / (range * profile.nerve) });
        };
        for (const fox of game.entities.foxes || []) {
            if (['stalk', 'warning', 'dash'].includes(fox.mode) && (fox.scaredTime || 0) <= 0)
                notice(fox, 'fox', fox.mode === 'dash' ? 250 : 195, fox.mode === 'dash' ? 1.8 : 1.35);
        }
        const goose = game.entities.goose;
        if (goose && ['warning', 'feint', 'charge'].includes(goose.mode))
            notice(goose, 'goose', 180, 1.4);
        for (const enemy of game.entities.folklore || []) {
            if (enemy.active && !enemy.defeated && ['hunt', 'warning', 'attack'].includes(enemy.mode))
                notice(enemy, 'folklore', 220, enemy.mode === 'attack' ? 1.8 : 1.4);
        }
        for (const hazard of game.folkloreThreats || []) {
            if (hazard.life > 0 && hazard.arm <= .9 && distance(hazard, animal) < hazard.r + 115 &&
                DetectionSystem.hasLineOfSight(getHitbox(animal), hazard))
                threats.push({ x: hazard.x, y: hazard.y, kind: 'wolf', source: 'hazard',
                    urgency: 2 - distance(hazard, animal) / (hazard.r + 115) });
        }
        animal.seenDangers = threats.sort((a, b) => b.urgency - a.urgency).slice(0, 4);
        return animal.seenDangers[0] || null;
    },
    herdThreat(animal, sightings) {
        let best = null;
        const range = ['sheep', 'lamb', 'cow', 'donkey'].includes(animal.species) ? 155 : 105;
        for (const [neighbour, threat] of sightings) {
            if (neighbour === animal || !threat || threat.kind !== 'wolf' || distance(neighbour, animal) > range ||
                !DetectionSystem.hasLineOfSight(getHitbox(animal), getHitbox(neighbour)))
                continue;
            const alarm = { ...threat, urgency: Math.min(.6, threat.urgency), shared: true };
            if (!best || alarm.urgency > best.urgency)
                best = alarm;
        }
        return best;
    },
    withinHome(point, home, area, from = home) {
        // A legacy position outside its area may move back in, never farther out.
        return point.x >= Math.min(area.x + 32, from.x) && point.x <= Math.max(area.x + area.w - 32, from.x) &&
            point.y >= Math.min(area.y + 32, from.y) && point.y <= Math.max(area.y + area.h - 32, from.y) &&
            distance(point, home) <= Math.max(360, distance(from, home));
    },
    walk(animal, target, speed, dt, home, area) {
        if (dt <= 0)
            return;
        animal.friendRouteTimer = Math.max(0, (animal.friendRouteTimer || 0) - dt);
        const clear = typeof WildlifeRules === 'undefined' ? DetectionSystem.hasLineOfSight(getHitbox(animal), target) : WildlifeRules.clear(animal, target, animal.hitbox);
        if (clear)
            animal.friendRoute = [];
        else if (animal.friendRouteTimer <= 0 && typeof WolfAI.findPath === 'function') {
            const route = WolfAI.findPath(animal, target);
            animal.friendRoute = route.every(p => RescueSystem.withinHome(p, home, area, animal)) ? route : [];
            animal.friendRouteGoal = { ...target };
            animal.friendRouteTimer = .8;
        }
        if (animal.friendRouteGoal && distance(animal.friendRouteGoal, target) > 50) {
            animal.friendRoute = [];
            animal.friendRouteTimer = 0;
        }
        while (animal.friendRoute?.length && distance(animal, animal.friendRoute[0]) < 8)
            animal.friendRoute.shift();
        const goal = animal.friendRoute?.[0] || target, dx = goal.x - animal.x, dy = goal.y - animal.y, len = Math.hypot(dx, dy);
        if (len < .01)
            return;
        const before = { x: animal.x, y: animal.y }, step = Math.min(len, speed * dt);
        Player.move(animal, dx / len * step, dy / len * step);
        if (!RescueSystem.withinHome(animal, home, area, before)) {
            animal.x = before.x;
            animal.y = before.y;
            animal.friendRoute = [];
        }
    },
    flee(game, animal, home, area, dt, effort = 1) {
        // Only the last actually perceived threat can influence a fleeing animal.
        const threat = animal.fleeFrom;
        if (!threat)
            return;
        const dx = animal.x - threat.x, dy = animal.y - threat.y;
        const angle = Math.atan2(dy || .001, dx || .001);
        const endurance = (game.difficultyKey === 'easy' ? 2.8 : ['hard', 'hardcore'].includes(game.difficultyKey) ? 6 : 4.4) * RescueSystem.personality(animal).endurance;
        const speed = game.entities.chicken.speed * (game.difficultyKey === "easy" ? .97 : ['hard', 'hardcore'].includes(game.difficultyKey) ? 1.15 : 1.08) *
            RescueSystem.personality(animal).pace * effort * (1 - .16 * clamp((animal.fatigue || 0) / endurance, 0, 1));
        const neighbours = RescueSystem.all(game).filter(a => a !== animal && !a.rescued && !RescueSystem.isSecret(a) && distance(a, animal) < 140 &&
            DetectionSystem.hasLineOfSight(getHitbox(animal), getHitbox(a)));
        let best = null, score = -Infinity;
        // Look ahead around fences and tree trunks, then take a collision-safe small step.
        for (const turn of [0, .45, -.45, .9, -.9, 1.4, -1.4, 2.1, -2.1, 2.65, -2.65, Math.PI]) {
            const ax = Math.cos(angle + turn), ay = Math.sin(angle + turn);
            const probe = { ...animal, x: animal.x, y: animal.y };
            Player.move(probe, ax * 65, ay * 65);
            if (!RescueSystem.withinHome(probe, home, area, animal))
                continue;
            const travel = distance(probe, animal);
            if (travel < 15)
                continue;
            const heading = Math.atan2(probe.y - animal.y, probe.x - animal.x);
            const continuity = Number.isFinite(animal.fleeHeading) ? Math.cos(heading - animal.fleeHeading) * 18 : 0;
            const crowd = neighbours.reduce((sum, a) => sum + Math.max(0, 56 - distance(a, probe)), 0);
            const danger = (animal.seenDangers || []).reduce((sum, a) => sum + Math.max(0, 145 - distance(a, probe)) * (a.source === 'hazard' ? 3 : 1.8), 0);
            const shelter = threat.kind === 'wolf' && !DetectionSystem.hasLineOfSight(threat, getHitbox(probe)) ? 32 : 0;
            const herd = ['sheep', 'lamb', 'cow', 'donkey'].includes(animal.species) ? neighbours.reduce((best, a) => Math.max(best, distance(a, threat) > distance(animal, threat) ? Math.max(0, 18 - Math.abs(distance(a, probe) - 75) * .15) : 0), 0) : 0;
            // Nimble animals jink; herd animals seek a safe neighbour; all still use
            // the same finite stamina and contact window for a fair rescue.
            const jink = ['rabbit', 'cat'].includes(animal.species) ? Math.cos(heading - angle - Math.sin((animal.fatigue || 0) * 5) * .65) * 12 : 0;
            const value = distance(probe, threat) + travel * .8 + continuity - crowd * 1.4 -
                Math.max(0, distance(probe, home) - 230) * 1.4 - Math.abs(turn) * 8 + shelter + herd + jink - danger;
            if (value > score) {
                score = value;
                best = { x: (probe.x - animal.x) / travel, y: (probe.y - animal.y) / travel, heading };
            }
        }
        const before = { x: animal.x, y: animal.y };
        if (best) {
            Player.move(animal, best.x * speed * dt, best.y * speed * dt);
            animal.fleeHeading = best.heading;
        }
        if (!RescueSystem.withinHome(animal, home, area, before)) {
            animal.x = before.x;
            animal.y = before.y;
        }
        animal.stuckTime = distance(before, animal) < speed * dt * .1 ? (animal.stuckTime || 0) + dt : 0;
        if (animal.stuckTime > .25 && distance(animal, home) > 65 && distance(home, threat) > Math.max(110, distance(animal, threat) * .8))
            RescueSystem.walk(animal, home, speed * .65, dt, home, area);
        if (animal.stuckTime > .8) {
            animal.restTime = 3.1;
            animal.stuckTime = 0;
            animal.fleeHeading = null;
        }
        animal.targetX = animal.x;
        animal.targetY = animal.y;
    },
    wander(animal, home, area) {
        for (let attempt = 0; attempt < 6; attempt++) {
            const chick = animal.type === 'chick';
            const target = { x: clamp(home.x + (chick ? rand(-18, 18) : rand(-48, 48)), area.x + 55, area.x + area.w - 55),
                y: clamp(home.y + (chick ? rand(-14, 14) : rand(-40, 40)), area.y + 55, area.y + area.h - 55) };
            const probe = { ...animal };
            Player.move(probe, target.x - animal.x, target.y - animal.y);
            if (distance(probe, target) > 2)
                continue;
            animal.targetX = target.x;
            animal.targetY = target.y;
            break;
        }
        animal.wanderTime = 1.8 + Math.random() * 2.4;
    },
    refugeWander(animal, home, index) {
        const yard = FarmRefuge.bounds;
        const active = ['rabbit', 'dog', 'cat', 'duck'].includes(animal.species);
        const heavy = ['cow', 'donkey', 'horse'].includes(animal.species);
        const rx = active ? 54 : heavy ? 34 : 44, ry = active ? 36 : heavy ? 24 : 30;
        const minX = yard.x + 28, maxX = yard.x + yard.w - 28;
        const minY = Math.max(yard.y + 146, 320), maxY = yard.y + yard.h - 28;
        // Each rescued friend roams near its own home. This keeps the yard lively
        // without turning the refuge into another chase or letting residents cross a rail.
        for (let attempt = 0; attempt < 8; attempt++) {
            const target = { x: clamp(home.x + rand(-rx, rx), minX, maxX), y: clamp(home.y + rand(-ry, ry), minY, maxY) };
            if (distance(target, animal) < 8) {
                const angle = (index + 1) * 2.39996 + attempt * .83, step = active ? 24 : heavy ? 15 : 20;
                target.x = clamp(home.x + Math.cos(angle) * step, minX, maxX);
                target.y = clamp(home.y + Math.sin(angle) * step * .7, minY, maxY);
            }
            const probe = { ...animal };
            Player.move(probe, target.x - animal.x, target.y - animal.y);
            resolveEnvironment(probe);
            if (distance(probe, target) > 2)
                continue;
            animal.targetX = target.x;
            animal.targetY = target.y;
            return;
        }
        animal.targetX = home.x;
        animal.targetY = home.y;
        animal.restTime = .8 + (index % 4) * .18;
    },
    update(game, dt) {
        if (!Number.isFinite(dt) || dt < 0)
            return;
        if (game.phase !== "playing" || game.lake?.active)
            return;
        const chicken = game.entities.chicken;
        game.animalSpeechCooldown = Math.max(0, (game.animalSpeechCooldown || 0) - dt);
        game.secretSoundCooldown = Math.max(0, (game.secretSoundCooldown || 0) - dt);
        if (game.rescueNotice)
            game.rescueNotice.time = Math.max(0, game.rescueNotice.time - dt);
        if (game.skinNotice)
            game.skinNotice.time = Math.max(0, game.skinNotice.time - dt);
        if (game.secretNotice)
            game.secretNotice.time = Math.max(0, game.secretNotice.time - dt);
        const animals = RescueSystem.all(game), sightings = new Map();
        // Take observations before movement: flock response cannot depend on array order or relay hearsay.
        for (const animal of animals)
            if (!animal.rescued && !RescueSystem.isSecret(animal))
                sightings.set(animal, RescueSystem.observeThreat(game, animal, RescueSystem.visible(game, animal)));
        const observations = new Map();
        for (const [animal, direct] of sightings) {
            const heard = RescueSystem.herdThreat(animal, sightings);
            if (heard)
                animal.seenDangers.push(heard);
            observations.set(animal, direct && (!heard || direct.urgency >= heard.urgency) ? direct : heard);
        }
        for (const animal of animals) {
            const chick = animal.type === "chick";
            const index = chick ? game.entities.chicks.indexOf(animal) : game.entities.animals.indexOf(animal);
            const safePosition = chick ? RescueSystem.chickPosition : RescueSystem.safePosition;
            const oldX = animal.x, oldY = animal.y;
            animal.speechTime = Math.max(0, (animal.speechTime || 0) - dt);
            if (chicken.sneaking && !animal.rescued && animal.fleeFrom?.kind !== 'wolf' && animal.speechTime > 0 &&
                !RescueSystem.stealthLines.includes(animal.speech || '') && animal.speech !== RescueSystem.stealthTiredLine)
                animal.speechTime = 0;
            animal.moving = false;
            if (RescueSystem.isSecret(animal)) {
                animal.speechTime = 0;
                animal.temper = "secret";
                // Only the contextual E action calls a hidden chick; walking and C never collect it by accident.
                continue;
            }
            if (!animal.rescued) {
                const touchedBeforeMove = RescueSystem.inRescueReach(chicken, animal);
                const home = chick ? WORLD.layout.chickSpawns[index] ||
                    { x: animal.homeX ?? animal.x, y: animal.homeY ?? animal.y, areaId: animal.areaId } : WORLD.layout.animalSpawns[index];
                const area = WORLD.areas.find(a => a.id === home.areaId);
                animal.areaId = area.id;
                const visible = RescueSystem.visible(game, animal);
                if (visible) {
                    animal.discovered = true;
                    animal.lastSeen = { x: animal.x, y: animal.y };
                }
                let threat = observations.get(animal) || null;
                animal.sharedAlarm = !!threat?.shared;
                animal.calmWindow = Math.max(0, (animal.calmWindow || 0) - dt);
                if (chicken.sneaking || chicken.sprinting || Math.hypot(chicken.vx, chicken.vy) >= 70)
                    animal.calmWindow = 0;
                const patient = animal.restTime > 0 && animal.fleeFrom?.kind === 'player' && (!threat || threat.kind === 'player') && visible &&
                    !chicken.hidden && !chicken.sneaking && !chicken.sprinting && Math.hypot(chicken.vx, chicken.vy) < 25;
                animal.patientTime = patient ? (animal.patientTime || 0) + dt : 0;
                if (animal.patientTime >= 1.1) {
                    animal.calmWindow = 3.1;
                    animal.patientTime = 0;
                    if (threat?.kind === 'player')
                        threat = null;
                }
                const friendly = !chicken.sneaking && SkinSystem.power(chicken).friendSpecies === animal.species;
                const calm = !chick && !threat && visible && !chicken.hidden && !chicken.sneaking &&
                    (friendly || (animal.calmWindow || 0) > 0) && distance(chicken, animal) <= 140;
                const wolf = game.entities.wolf;
                const relieved = animal.fleeFrom?.kind === 'wolf' && (!animal.dangerSource || animal.dangerSource === 'wolf') && wolf.mode === 'frightened' && distance(animal, wolf) < 190 &&
                    DetectionSystem.hasLineOfSight(getHitbox(animal), getHitbox(wolf));
                if (calm || (relieved && !threat)) {
                    animal.fleeFrom = null;
                    animal.fleeTime = 0;
                    animal.fleeHeading = null;
                }
                if (threat) {
                    if (!animal.fleeFrom || distance(animal.fleeFrom, threat) > 80) {
                        animal.friendRoute = [];
                        animal.friendRouteTimer = 0;
                    }
                    animal.fleeFrom = { x: threat.x, y: threat.y, kind: threat.kind };
                    animal.dangerSource = threat.source;
                }
                animal.restTime = Math.max(0, (animal.restTime || 0) - dt);
                animal.fleeTime = threat ? .9 : Math.max(0, (animal.fleeTime || 0) - dt);
                if (!animal.fleeFrom)
                    animal.fleeTime = 0;
                const fleeing = animal.fleeTime > 0 && animal.restTime <= 0;
                const urgent = animal.restTime > 0 && threat?.kind === 'wolf' && !threat.shared && distance(animal, threat) < 95;
                animal.temper = calm ? "calm" : animal.restTime > 0 ? "tired" : fleeing ? "fleeing" : "idle";
                const dx = animal.targetX - animal.x, dy = animal.targetY - animal.y;
                const len = Math.hypot(dx, dy);
                if (fleeing || urgent) {
                    RescueSystem.flee(game, animal, home, area, dt, urgent ? .3 : 1);
                    animal.fatigue = (animal.fatigue || 0) + (urgent ? 0 : dt);
                    if (dt > 0)
                        RescueSystem.talk(game, animal);
                    const endurance = (game.difficultyKey === "easy" ? 2.8 : ['hard', 'hardcore'].includes(game.difficultyKey) ? 6 : 4.4) * RescueSystem.personality(animal).endurance;
                    if (animal.fatigue >= endurance) {
                        animal.restTime = 3.1;
                        animal.fatigue = 0;
                        animal.temper = "tired";
                        animal.speechTime = 0;
                        if (dt > 0)
                            RescueSystem.talk(game, animal, true);
                    }
                }
                else if (calm) {
                    // A matching appearance or a visibly patient rescuer invites this approach, never stealth.
                    // Use the same collision model, so a friend never walks through a fence.
                    RescueSystem.walk(animal, chicken, 44 * RescueSystem.personality(animal).pace, dt, home, area);
                    animal.targetX = animal.x;
                    animal.targetY = animal.y;
                    animal.speechTime = 0;
                }
                else if (animal.restTime <= 0 && animal.fleeTime <= 0 && (distance(animal, home) > 90 || !RescueSystem.withinHome(animal, home, area))) {
                    RescueSystem.walk(animal, home, 48 * RescueSystem.personality(animal).pace, dt, home, area);
                    animal.targetX = home.x;
                    animal.targetY = home.y;
                }
                else if (animal.restTime <= 0 && len > 5) {
                    const cruise = (chick ? 27 : 35) * RescueSystem.personality(animal).pace;
                    const speed = Math.min(cruise, Math.hypot(animal.vx, animal.vy) + 90 * dt, Math.sqrt(2 * 90 * Math.max(0, len - 4)));
                    const step = Math.min(len, speed * dt);
                    Player.move(animal, dx / len * step, dy / len * step);
                }
                if (!fleeing)
                    animal.fatigue = Math.max(0, (animal.fatigue || 0) - dt * .25);
                animal.wanderTime = Math.max(0, (animal.wanderTime ?? (1 + index * .17)) - dt);
                if (!fleeing && !calm && animal.restTime <= 0 && distance(animal, home) <= 90 && animal.wanderTime <= 0 && dt > 0) {
                    RescueSystem.wander(animal, home, area);
                }
                resolveEnvironment(animal);
                animal.moving = dt > 0 && Math.hypot(animal.x - oldX, animal.y - oldY) > 0.02;
                if (animal.moving)
                    Player.face(animal, animal.x - oldX, animal.y - oldY);
                else if (!chicken.hidden && visible && (!chicken.sneaking || threat?.kind === 'player') && distance(chicken, animal) < 150)
                    Player.face(animal, chicken.x - animal.x, chicken.y - animal.y);
                if (len > 5 && !animal.moving && dt > 0) {
                    animal.targetX = animal.x;
                    animal.targetY = animal.y;
                }
                if ((touchedBeforeMove || RescueSystem.inRescueReach(chicken, animal)) && GameManager.rescue(game, animal)) {
                    spawnBurst(animal.x, animal.y, "#fff5a6", 22);
                    AudioSystem.playAnimal(animal.species);
                    const count = chick ? game.rescuedChicks : game.rescuedCount;
                    const total = chick ? game.entities.chicks.length : WORLD.targetRescues;
                    setStatus(`${RescueSystem.nameOf(animal, game)}: “${RescueSystem.thanks[animal.species]}” ${count} de ${total} ${chick ? "pintinhos" : "amigos"} a salvo.`, "win");
                    game.rescueNotice = { name: RescueSystem.nameOf(animal, game), count, total, chick, time: 2.6 };
                    const safe = safePosition(index);
                    animal.x = safe.x;
                    animal.y = safe.y;
                    animal.targetX = safe.x;
                    animal.targetY = safe.y;
                    animal.moving = false;
                    animal.direction = "down";
                    animal.temper = "safe";
                    animal.speechTime = 0;
                    animal.restTime = .8 + (index % 4) * .18;
                    animal.wanderTime = 0;
                    GameManager.save(game);
                    refreshHud();
                }
            }
            else if (chick) {
                const safe = safePosition(index);
                animal.x = safe.x;
                animal.y = safe.y;
                animal.targetX = safe.x;
                animal.targetY = safe.y;
                animal.direction = ['down', 'right', 'down', 'left'][Math.floor(animal.anim / 12 + index) % 4];
            }
            else {
                const safe = safePosition(index), yard = FarmRefuge.bounds, margin = 20;
                const inside = animal.x >= yard.x + margin && animal.x <= yard.x + yard.w - margin &&
                    animal.y >= Math.max(yard.y + 138, 312) && animal.y <= yard.y + yard.h - margin;
                if (!inside || ![animal.targetX, animal.targetY].every(Number.isFinite)) {
                    animal.x = safe.x;
                    animal.y = safe.y;
                    animal.targetX = safe.x;
                    animal.targetY = safe.y;
                    animal.restTime = .8 + (index % 4) * .18;
                }
                animal.temper = 'safe';
                animal.restTime = Math.max(0, (animal.restTime || 0) - dt);
                let dx = animal.targetX - animal.x, dy = animal.targetY - animal.y, len = Math.hypot(dx, dy);
                if (len <= 4 && animal.restTime <= 0 && dt > 0) {
                    RescueSystem.refugeWander(animal, safe, index);
                    dx = animal.targetX - animal.x;
                    dy = animal.targetY - animal.y;
                    len = Math.hypot(dx, dy);
                }
                if (len > 4 && animal.restTime <= 0 && dt > 0) {
                    const active = ['rabbit', 'dog', 'cat', 'duck'].includes(animal.species);
                    const heavy = ['cow', 'donkey', 'horse'].includes(animal.species);
                    const cruise = (active ? 29 : heavy ? 18 : 22) * RescueSystem.personality(animal).pace;
                    const step = Math.min(len, cruise * dt);
                    Player.move(animal, dx / len * step, dy / len * step);
                    resolveEnvironment(animal);
                    animal.moving = Math.hypot(animal.x - oldX, animal.y - oldY) > .02;
                    if (animal.moving)
                        Player.face(animal, animal.x - oldX, animal.y - oldY);
                    if (distance(animal, { x: animal.targetX, y: animal.targetY }) <= 4) {
                        animal.targetX = animal.x;
                        animal.targetY = animal.y;
                        animal.restTime = active ? rand(.7, 1.8) : heavy ? rand(2.3, 4.2) : rand(1.4, 3.1);
                    }
                    else if (!animal.moving) {
                        animal.targetX = animal.x;
                        animal.targetY = animal.y;
                        animal.restTime = .8;
                    }
                }
            }
            if (animal.moving) {
                const travel = Math.hypot(animal.x - oldX, animal.y - oldY);
                animal.anim = CharacterArt.advance(animal.anim, animal.species, travel, { speed: dt > 0 ? travel / dt : 0 });
            }
            animal.vx = animal.moving && dt > 0 ? (animal.x - oldX) / dt : 0;
            animal.vy = animal.moving && dt > 0 ? (animal.y - oldY) / dt : 0;
        }
        // Let the visible fleeing animal speak first. A hidden chick must not sound like its voice.
        const chasing = game.entities.animals.some(a => !a.rescued && (a.fleeTime || 0) > 0 && RescueSystem.visible(game, a));
        const secret = !chasing && RescueSystem.secretHint(game);
        if (dt > 0 && game.secretSoundCooldown <= 0 && secret) {
            AudioSystem.playAnimal("chick", { volume: .4 + .4 * Math.max(0, 1 - distance(chicken, secret) / 280), ambient: true });
            game.secretSoundCooldown = 3.5;
        }
        GameManager.win(game);
    },
};
