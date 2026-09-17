"use strict";
/* Hearts and portraits mirror the simulation; no gameplay values are modified here. */
const GameplayHud = (() => {
    let elements = null;
    let portraitSignature = '';
    function initialize() {
        if (!elements)
            elements = Object.fromEntries([
                'livesCard', 'livesHint', 'lifeHeart1', 'lifeHeart2', 'lifeHeart3',
                'hudPortrait', 'hudChick', 'hudWolf'
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
    return { update };
})();
