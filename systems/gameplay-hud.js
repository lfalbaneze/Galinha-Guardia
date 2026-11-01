"use strict";
/* Hearts and portraits mirror the simulation; no gameplay values are modified here. */
const GameplayHud = (() => {
    let elements = null;
    let portraitSignature = '';
    function initialize() {
        if (!elements)
            elements = Object.fromEntries([
                'livesCard', 'livesHint', 'lifeHeart1', 'lifeHeart2', 'lifeHeart3',
                'hudPortrait', 'hudChick', 'hudWolf', 'fieldBriefing', 'fieldBriefingText', 'wolfHungerMeter', 'wolfHungerLabel', 'threatIndicator'
            ].map(id => [id, document.getElementById(id)]));
        return elements;
    }
    function setData(element, key, value) {
        if (element && element.dataset[key] !== String(value))
            element.dataset[key] = String(value);
    }
    function portrait(id, name, direction, skin) {
        const element = initialize()[id];
        const context = element?.getContext('2d');
        const current = CharacterArt.frameFor(name, { direction, skin });
        if (!context || !element || !current)
            return;
        const scale = Math.min((element.width - 12) / (current.pose.width * current.scale), (element.height - 12) / ((current.pose.bottom - current.pose.top) * current.scale));
        context.clearRect(0, 0, element.width, element.height);
        CharacterArt.draw(context, name, element.width / 2, element.height - 6 - 14 * scale, { direction, scale, skin, moving: false });
    }
    function update(game) {
        const el = initialize();
        const hunger = WolfAI.appetite(game), meter = el.wolfHungerMeter;
        if (meter) {
            meter.value = hunger.value;
            meter.setAttribute('aria-valuetext', `${hunger.label}: ${Math.round(hunger.value * 100)}% de fome`);
        }
        if (el.wolfHungerLabel && el.wolfHungerLabel.textContent !== hunger.label)
            el.wolfHungerLabel.textContent = hunger.label;
        if (el.threatIndicator)
            el.threatIndicator.dataset.hunger = String(hunger.tier);
        // Only the opening needs a briefing. Threats and rescues take visual priority.
        if (el.fieldBriefing)
            el.fieldBriefing.hidden = game.phase !== 'playing' || game.elapsed >= 14 ||
                game.rescuedCount > 0 || game.entities.wolf.mode !== 'patrol' || !!game.lake?.active || !!game.thorRescue;
        if (el.fieldBriefingText) {
            const text = 'Chegue de mansinho por trás e encoste para resgatar. Se o bicho viu você, despiste-o primeiro.';
            if (el.fieldBriefingText.textContent !== text)
                el.fieldBriefingText.textContent = text;
        }
        const lives = Math.max(0, Math.min(3, Math.floor(game.lives)));
        for (let i = 1; i <= 3; i += 1)
            setData(el[`lifeHeart${i}`], 'full', i <= lives);
        setData(el.livesCard, 'critical', lives === 1 && game.phase === 'playing');
        const label = lives === 0 ? 'A próxima vai dar certo' : lives === 1 ? 'Por uma pena!' : 'Cada pena conta';
        if (el.livesHint && el.livesHint.textContent !== label)
            el.livesHint.textContent = label;
        if (!CharacterArt.ready || game.phase === 'menu')
            return;
        const chicken = game.entities.chicken;
        const skin = chicken.skin || 'classic';
        if (portraitSignature === skin)
            return;
        portrait('hudPortrait', 'chicken', 'right', skin);
        portrait('hudChick', 'chick', 'right');
        portrait('hudWolf', 'wolf', 'left');
        portraitSignature = skin;
    }
    let debug = false;
    window.addEventListener('keydown', event => {
        if (event.code === 'F3' && !event.repeat) {
            event.preventDefault();
            debug = !debug;
        }
    });
    function drawDebug(game) {
        const panel = document.getElementById('aiDebug'), visible = debug && game.phase === 'playing';
        if (panel)
            panel.hidden = !visible;
        if (!visible)
            return;
        const wolf = game.entities.wolf, config = WolfAI.getConfig(game), memory = WolfAI.explain(wolf);
        const path = (points, color) => {
            if (!points.length)
                return;
            ctx.strokeStyle = color;
            ctx.beginPath();
            points.forEach((p, i) => { const s = worldToScreen(p); if (i === 0)
                ctx.moveTo(s.x, s.y);
            else
                ctx.lineTo(s.x, s.y); });
            ctx.stroke();
        };
        ctx.save();
        ctx.lineWidth = 2;
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        const eye = worldToScreen(getHitbox(wolf));
        ctx.fillStyle = '#ffbc5022';
        ctx.strokeStyle = '#ffbc50';
        ctx.beginPath();
        ctx.moveTo(eye.x, eye.y);
        ctx.arc(eye.x, eye.y, config.range, wolf.heading - config.fov / 2, wolf.heading + config.fov / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        path([wolf, ...wolf.route], '#ffd45b');
        path([wolf, ...wolf.searchPoints.slice(wolf.searchIndex)], '#ff98d0');
        if (wolf.lastKnown) {
            const p = worldToScreen(wolf.lastKnown);
            ctx.strokeRect(p.x - 5, p.y - 5, 10, 10);
        }
        for (const choice of memory.choices.slice(0, 5)) {
            const p = worldToScreen(choice);
            ctx.fillStyle = '#fff5c7';
            ctx.fillText(choice.score.toFixed(1), p.x + 6, p.y - 8);
        }
        const goose = game.entities.goose;
        if (goose) {
            path([goose, goose.target], '#71ebff');
            const p = worldToScreen(goose);
            ctx.strokeStyle = '#71ebff';
            ctx.beginPath();
            ctx.arc(p.x, p.y, GooseSystem.getConfig(game).alertRange, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#71ebff';
            ctx.fillText(`Panto: ${goose.mode} / ${goose.maneuver || goose.tactic} | esquivas: ${goose.dodgeStreak || 0}`, p.x + 20, p.y - 30);
        }
        for (const animal of game.entities.animals) {
            const nav = WildlifeRules.diagnostics(animal);
            path([animal, ...(nav?.route.length ? nav.route : [{ x: animal.targetX, y: animal.targetY }])], '#9af2a4');
            const p = worldToScreen(animal);
            ctx.fillStyle = '#9af2a4';
            ctx.fillText(`${animal.temper} / ${animal.activity || 'wander'}`, p.x + 15, p.y - 20);
        }
        for (const fox of game.entities.foxes || []) {
            const nav = WildlifeRules.diagnostics(fox), p = worldToScreen(fox);
            path([fox, ...(nav?.route.length ? nav.route : [fox.target])], '#ffc28c');
            ctx.fillStyle = '#ffc28c';
            ctx.fillText(`${fox.name}: ${fox.mode} / ${nav?.reason || 'vigiar'}`, p.x + 15, p.y - 30, 250);
        }
        const actors = [...game.entities.animals, ...(game.entities.foxes || []), ...(goose ? [goose] : [])];
        const nearest = actors.sort((a, b) => distance(a, game.entities.chicken) - distance(b, game.entities.chicken))[0];
        const navigation = nearest && WildlifeRules.diagnostics(nearest), wolfNavigation = WildlifeRules.diagnostics(wolf);
        const wolfTarget = wolf.interceptTarget || wolf.routeTarget || wolf.lastKnown || wolf.heardPoint;
        if (panel)
            panel.textContent = `F3 IA | Lobo: ${wolf.mode} / ${wolf.interceptPhase || ((wolf.pursuitRest || 0) > 0 ? 'descanso' : 'movimento')}\n` +
                `Rotas observadas: ${memory.regions.filter(r => r.weight > 0).length} | esconderijos vistos: ${memory.hides}\n` +
                `Lobo: ${wolfNavigation?.reason || 'patrulhar e observar'}\n` +
                (wolfTarget ? `Alvo do lobo: ${Math.round(wolfTarget.x)}, ${Math.round(wolfTarget.y)} | rota: ${wolf.route.length}\n` : '') +
                (navigation ? `${nearest.id}: ${navigation.action} / ${navigation.reason}\nAlvo: ${Math.round(navigation.target.x)}, ${Math.round(navigation.target.y)} | rota: ${navigation.route.length} | sem progresso: ${navigation.stalled.toFixed(1)}s\n` : '') +
                (navigation?.changes.length ? `Última mudança: ${navigation.changes[navigation.changes.length - 1]}\n` : '') +
                'Amarelo: rota e visão | rosa: busca | azul: Panto | verde: animais';
        ctx.restore();
    }
    function drawTactics(game) {
        drawDebug(game);
        const wolf = game.entities.wolf, target = wolf.interceptTarget;
        if (game.phase !== 'playing' || game.lake?.active || !wolf.interceptPhase || !target || SunflowerSystem.concealed(game))
            return;
        const from = worldToScreen(getHitbox(wolf));
        ctx.save();
        ctx.fillStyle = '#fff0c5';
        ctx.strokeStyle = '#422c24';
        ctx.lineWidth = 3;
        ctx.font = 'bold 12px Trebuchet MS, sans-serif';
        ctx.textAlign = 'center';
        const text = wolf.interceptPhase === 'warning' ? 'VAI CORTAR CAMINHO!' : 'INVESTIDA';
        ctx.strokeText(text, from.x, from.y - 66);
        ctx.fillText(text, from.x, from.y - 66);
        ctx.restore();
    }
    return { update, drawTactics, setDebug: (enabled) => { debug = enabled; } };
})();
