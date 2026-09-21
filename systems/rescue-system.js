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
        animal.speech = animal.fleeFrom?.kind === 'wolf' ? RescueSystem.alarmLines[animal.species] :
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
        // Stealth reduces perception; it is neither invisibility nor a friendly call.
        // Within a 100-degree viewing cone an animal can still spot the quiet player.
        const inView = gap < .001 || toward / gap >= Math.cos(50 * Math.PI / 180);
        const alertRange = (chicken.sneaking ? 90 : chicken.sprinting ? 240 : toward > 0 ? 170 : 105) * profile.nerve;
        const friendly = !chicken.sneaking && SkinSystem.power(chicken).friendSpecies === animal.species;
        const threats = [];
        if (!friendly && !chicken.hidden && visible && gap < alertRange && (!chicken.sneaking || inView) &&
            DetectionSystem.hasLineOfSight(getHitbox(animal), getHitbox(chicken)))
            threats.push({ x: chicken.x, y: chicken.y, kind: 'player', urgency: 1 - gap / alertRange });
        const wolfRange = 190 * profile.nerve;
        if (!SunflowerSystem.concealed(game) && wolf.mode !== 'frightened' && wolf.huntUnlockTimer <= 0 && wolf.pauseTimer <= 0 && distance(wolf, animal) < wolfRange &&
            DetectionSystem.hasLineOfSight(getHitbox(animal), getHitbox(wolf)))
            threats.push({ x: wolf.x, y: wolf.y, kind: 'wolf', urgency: 1.15 - distance(wolf, animal) / wolfRange });
        if (threats.length)
            animal.sharedAlarm = false;
        if (!threats.length && wolf.mode !== 'frightened' && wolf.huntUnlockTimer <= 0 && wolf.pauseTimer <= 0) {
            const neighbour = game.entities.animals.find(a => a !== animal && !a.rescued && !a.sharedAlarm && a.fleeFrom?.kind === 'wolf' && a.fleeTime > .5 &&
                distance(a, animal) < 110 && DetectionSystem.hasLineOfSight(getHitbox(animal), getHitbox(a)));
            if (neighbour?.fleeFrom) {
                threats.push({ ...neighbour.fleeFrom, urgency: .35 });
                animal.sharedAlarm = true;
            }
        }
        return threats.sort((a, b) => b.urgency - a.urgency)[0] || null;
    },
    flee(game, animal, home, area, dt) {
        // Only the last actually perceived threat can influence a fleeing animal.
        const threat = animal.fleeFrom;
        if (!threat)
            return;
        const dx = animal.x - threat.x, dy = animal.y - threat.y;
        const angle = Math.atan2(dy || .001, dx || .001);
        const speed = game.entities.chicken.speed * (game.difficultyKey === "easy" ? .97 : ['hard', 'hardcore'].includes(game.difficultyKey) ? 1.15 : 1.08) * RescueSystem.personality(animal).pace;
        const neighbours = RescueSystem.all(game).filter(a => a !== animal && !a.rescued && !RescueSystem.isSecret(a) && distance(a, animal) < 140);
        let best = null, score = -Infinity;
        // Look ahead around fences and tree trunks, then take a collision-safe small step.
        for (const turn of [0, .45, -.45, .9, -.9, 1.4, -1.4, 2.1, -2.1]) {
            const ax = Math.cos(angle + turn), ay = Math.sin(angle + turn);
            const probe = { ...animal, x: animal.x, y: animal.y };
            Player.move(probe, ax * 65, ay * 65);
            if (probe.x < area.x + 32 || probe.x > area.x + area.w - 32 || probe.y < area.y + 32 || probe.y > area.y + area.h - 32)
                continue;
            const travel = distance(probe, animal);
            if (travel < 15)
                continue;
            const heading = Math.atan2(probe.y - animal.y, probe.x - animal.x);
            const continuity = Number.isFinite(animal.fleeHeading) ? Math.cos(heading - animal.fleeHeading) * 18 : 0;
            const crowd = neighbours.reduce((sum, a) => sum + Math.max(0, 56 - distance(a, probe)), 0);
            const shelter = threat.kind === 'wolf' && !DetectionSystem.hasLineOfSight(threat, getHitbox(probe)) ? 32 : 0;
            const herd = ['sheep', 'lamb', 'cow', 'donkey'].includes(animal.species) ? neighbours.reduce((best, a) => Math.max(best, distance(a, threat) > distance(animal, threat) ? Math.max(0, 18 - Math.abs(distance(a, probe) - 75) * .15) : 0), 0) : 0;
            // Nimble animals jink; herd animals seek a safe neighbour; all still use
            // the same finite stamina and contact window for a fair rescue.
            const jink = ['rabbit', 'cat'].includes(animal.species) ? Math.cos(heading - angle - Math.sin(animal.fatigue * 5) * .65) * 12 : 0;
            const value = distance(probe, threat) + travel * .8 + continuity - crowd * 1.4 -
                Math.max(0, distance(probe, home) - 230) * 1.4 - Math.abs(turn) * 8 + shelter + herd + jink;
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
        animal.stuckTime = distance(before, animal) < speed * dt * .1 ? (animal.stuckTime || 0) + dt : 0;
        if (animal.stuckTime > .45) {
            animal.restTime = 1.2;
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
    update(game, dt) {
        if (!Number.isFinite(dt) || dt < 0)
            return;
        if (game.phase !== "playing" || game.lake?.active)
            return;
        const chicken = game.entities.chicken;
        game.animalSpeechCooldown = Math.max(0, (game.animalSpeechCooldown || 0) - dt);
        game.secretSoundCooldown = Math.max(0, (game.secretSoundCooldown || 0) - dt);
        const secret = RescueSystem.secretHint(game);
        if (dt > 0 && game.secretSoundCooldown <= 0 && secret) {
            AudioSystem.playAnimal("chick", { volume: .4 + .4 * Math.max(0, 1 - distance(chicken, secret) / 280) });
            game.secretSoundCooldown = 3.5;
        }
        if (game.rescueNotice)
            game.rescueNotice.time = Math.max(0, game.rescueNotice.time - dt);
        if (game.skinNotice)
            game.skinNotice.time = Math.max(0, game.skinNotice.time - dt);
        if (game.secretNotice)
            game.secretNotice.time = Math.max(0, game.secretNotice.time - dt);
        for (const animal of RescueSystem.all(game)) {
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
                const threat = RescueSystem.observeThreat(game, animal, visible);
                const friendly = !chicken.sneaking && SkinSystem.power(chicken).friendSpecies === animal.species;
                const calm = !chick && !threat && visible && !chicken.hidden && friendly && distance(chicken, animal) <= 140;
                const wolf = game.entities.wolf;
                const relieved = animal.fleeFrom?.kind === 'wolf' && wolf.mode === 'frightened' && distance(animal, wolf) < 190 &&
                    DetectionSystem.hasLineOfSight(getHitbox(animal), getHitbox(wolf));
                if (calm || (relieved && !threat)) {
                    animal.fleeFrom = null;
                    animal.fleeTime = 0;
                    animal.fleeHeading = null;
                }
                if (threat)
                    animal.fleeFrom = { x: threat.x, y: threat.y, kind: threat.kind };
                animal.restTime = Math.max(0, (animal.restTime || 0) - dt);
                animal.fleeTime = threat ? .9 : Math.max(0, (animal.fleeTime || 0) - dt);
                if (!animal.fleeFrom)
                    animal.fleeTime = 0;
                const fleeing = animal.fleeTime > 0 && animal.restTime <= 0;
                animal.temper = calm ? "calm" : animal.restTime > 0 ? "tired" : fleeing ? "fleeing" : "idle";
                const dx = animal.targetX - animal.x, dy = animal.targetY - animal.y;
                const len = Math.hypot(dx, dy);
                if (fleeing) {
                    RescueSystem.flee(game, animal, home, area, dt);
                    animal.fatigue = (animal.fatigue || 0) + dt;
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
                    // Only a matching appearance invites this short approach, never stealth.
                    // Use the same collision model, so a friend never walks through a fence.
                    const dx = chicken.x - animal.x, dy = chicken.y - animal.y, gap = Math.hypot(dx, dy);
                    const step = Math.min(gap, 44 * RescueSystem.personality(animal).pace * dt);
                    if (gap > 1)
                        Player.move(animal, dx / gap * step, dy / gap * step);
                    animal.targetX = animal.x;
                    animal.targetY = animal.y;
                    animal.speechTime = 0;
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
                if (!fleeing && !calm && animal.restTime <= 0 && animal.wanderTime <= 0 && dt > 0) {
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
                    GameManager.save(game);
                    refreshHud();
                }
            }
            else {
                const safe = safePosition(index);
                animal.x = safe.x;
                animal.y = safe.y;
                animal.direction = ['down', 'right', 'down', 'left'][Math.floor(animal.anim / 12 + index) % 4];
            }
            if (animal.moving) {
                const travel = Math.hypot(animal.x - oldX, animal.y - oldY);
                animal.anim = CharacterArt.advance(animal.anim, animal.species, travel, { speed: dt > 0 ? travel / dt : 0 });
            }
            animal.vx = animal.moving && dt > 0 ? (animal.x - oldX) / dt : 0;
            animal.vy = animal.moving && dt > 0 ? (animal.y - oldY) / dt : 0;
        }
        GameManager.win(game);
    },
};
