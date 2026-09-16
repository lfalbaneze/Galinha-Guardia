/* Presentation follows the live game state. It never advances or mutates the simulation. */
const InterfaceMotion = (() => {
  const el = {}, animations = new Map();
  const tabs = ['adventure', 'outfit', 'audio'];
  const directions = ['down', 'left', 'up', 'right'];
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  let initialized = false, previous = null, currentGame = null, activeTab = 'adventure';
  let score = 0, scoreFrom = 0, scoreTarget = 0, scoreTime = 1;
  let previewTime = 0, previewFrame = 0, direction = 0, walking = true;
  let previewSignature = '', reduced = media.matches;
  const text = (id, value) => { if (el[id].textContent !== String(value)) el[id].textContent = String(value); };
  const data = (id, key, value) => { if (el[id].dataset[key] !== String(value)) el[id].dataset[key] = String(value); };

  function animate(id, frames, duration = 350) {
    const target = el[id];
    if (reduced || !target?.animate) return;
    animations.get(id)?.cancel();
    const effect = target.animate(frames, { duration, easing: 'cubic-bezier(.2,.8,.25,1)' });
    animations.set(id, effect);
    effect.onfinish = () => { if (animations.get(id) === effect) animations.delete(id); };
  }
  function pulse(id) {
    animate(id, [{ transform: 'scale(1)' }, { transform: 'scale(1.18)', offset: .35 }, { transform: 'scale(1)' }], 420);
  }
  function selectTab(name, focus = false) {
    if (!tabs.includes(name)) return;
    const changed = activeTab !== name;
    activeTab = name;
    for (const tab of tabs) {
      const selected = tab === name;
      el[`tab-${tab}`].setAttribute('aria-selected', String(selected));
      el[`tab-${tab}`].tabIndex = selected ? 0 : -1;
      el[`panel-${tab}`].hidden = !selected;
    }
    if (changed) animate(`panel-${name}`, [{ opacity: .3, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], 220);
    if (focus) el[`tab-${name}`].focus();
  }
  function difficulty() {
    const chosen = el.difficultySelect.value;
    for (const mode of ['easy', 'normal', 'hard']) el[`difficulty-${mode}`].setAttribute('aria-pressed', String(mode === chosen));
    const descriptions = {
      easy: 'Mais tempo para respirar e alcançar os fujões.',
      normal: 'Um lobo esperto. Uma galinha mais esperta ainda.',
      hard: 'Bichos ligeiros. Lobo implacável. Capriche nos esconderijos.'
    };
    text('difficultyPreview', `${descriptions[chosen] || descriptions.normal}${currentGame?.hasSave ? ' Vale na próxima fazenda.' : ''}`);
  }
  function initialize() {
    if (initialized) return;
    initialized = true;
    MenuScene.initialize();
    for (const id of ['scoreCount', 'rescuedCount', 'chicksCount', 'livesCount', 'chickCounter', 'hiddenText',
      'contextHint', 'areaText', 'gameStage', 'menuCard', 'endScreen', 'menuPortrait', 'portraitTurn', 'portraitWalk',
      'missionText', 'missionProgress', 'threatIndicator', 'threatText', 'threatProgress', 'regionNotice', 'regionNoticeName',
      'liveControls', 'keyMove', 'keySneak', 'keySprint', 'keyHide', 'difficultySelect', 'difficultyPreview',
      'difficulty-easy', 'difficulty-normal', 'difficulty-hard', ...tabs.flatMap(t => [`tab-${t}`, `panel-${t}`])])
      el[id] = document.getElementById(id);
    for (const [index, tab] of tabs.entries()) {
      el[`tab-${tab}`].addEventListener('click', () => selectTab(tab));
      el[`tab-${tab}`].addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        if (next === undefined) return;
        event.preventDefault(); selectTab(tabs[next], true);
      });
    }
    for (const mode of ['easy', 'normal', 'hard']) el[`difficulty-${mode}`].addEventListener('click', () => {
      el.difficultySelect.value = mode; difficulty(); pulse(`difficulty-${mode}`);
    });
    el.difficultySelect.addEventListener('change', difficulty);
    el.portraitTurn.addEventListener('click', () => { direction = (direction + 1) % 4; previewSignature = ''; });
    el.portraitWalk.addEventListener('click', () => {
      walking = !walking;
      el.portraitWalk.setAttribute('aria-pressed', String(walking));
      text('portraitWalk', walking ? 'Parar passinhos' : 'Dar uma voltinha');
      previewSignature = '';
    });
    el.menuPortrait.addEventListener('pointermove', event => {
      const bounds = el.menuPortrait.getBoundingClientRect();
      direction = event.clientX < bounds.left + bounds.width * .4 ? 1 : event.clientX > bounds.left + bounds.width * .6 ? 3 : 0;
      previewSignature = '';
    });
    media.addEventListener?.('change', event => {
      reduced = event.matches; previewSignature = '';
      if (reduced) {
        for (const animation of animations.values()) animation.cancel();
        animations.clear(); score = scoreTarget; scoreTime = 1; text('scoreCount', Math.round(score));
      }
    });
    selectTab('adventure');
  }

  function update(game) {
    initialize();
    const newGame = currentGame !== game;
    currentGame = game;
    const chicken = game.entities.chicken, wolf = game.entities.wolf;
    const known = RescueSystem.knowsSecret(game), playing = game.phase === 'playing';
    const target = Math.max(0, Math.floor(game.score));
    if (newGame) {
      previous = null; score = scoreFrom = scoreTarget = target; scoreTime = 1;
      previewSignature = ''; selectTab('adventure');
    } else if (scoreTarget !== target) {
      scoreFrom = score; scoreTarget = target; scoreTime = 0;
    }
    if (reduced || game.phase !== 'playing') { score = scoreTarget; scoreTime = 1; }
    text('scoreCount', Math.round(score));
    el.scoreCount.setAttribute('aria-label', `${target} pontos`);
    el.missionProgress.value = game.rescuedCount;
    text('missionText', game.rescuedCount < 10 ? `${10 - game.rescuedCount} ${game.rescuedCount === 9 ? 'amigo esperando' : 'amigos esperando'} por você` :
      known ? `Missão cumprida · ${game.rescuedChicks} pintinhos de bônus` : 'Missão cumprida · os dez amigos estão a salvo!');
    const exposed = WolfAI.isExposed(game);
    let level = 'calm', label = 'O lobo está de ronda', amount = .06;
    if (['chase', 'inspect'].includes(wolf.mode) || exposed) { level = 'danger'; label = exposed ? 'Ele viu você! Saia daí!' : 'O lobo vem vindo!'; amount = 1; }
    else if (wolf.mode === 'alert') { level = 'suspect'; label = 'Ele está desconfiando…'; amount = Math.max(.12, wolf.awareness || 0); }
    else if (['search', 'investigate'].includes(wolf.mode)) { level = 'search'; label = 'Ele procura uma pista'; amount = .45; }
    if (chicken.hidden && !exposed) { level = 'safe'; label = 'Quietinha no esconderijo'; amount = 0; }
    if (!playing) { level = 'calm'; label = game.phase === 'menu' ? 'A fazenda está em pausa' : 'Fim da aventura'; amount = 0; }
    data('gameStage', 'threat', level); data('threatIndicator', 'level', level);
    text('threatText', label); el.threatProgress.value = Math.round(amount * 100) / 100;
    el.threatProgress.setAttribute('aria-valuetext', label);
    const transition = game.mapTransition;
    el.regionNotice.hidden = !playing || !transition || transition.time <= 0 ||
      !!game.rescueNotice?.time || !!game.secretNotice?.time || !!game.skinNotice?.time;
    if (!el.regionNotice.hidden) {
      text('regionNoticeName', transition.name);
      el.regionNotice.style.opacity = reduced ? '1' : String(Math.min(1, transition.time / .5));
    }
    el.liveControls.hidden = !playing;
    data('keyMove', 'pressed', playing && ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].some(key => input.has(key)));
    data('keySneak', 'pressed', playing && input.has('c'));
    data('keySprint', 'pressed', playing && input.has('shift'));
    data('keyHide', 'pressed', playing && (input.has('e') || chicken.hidden));
    if (previous) {
      if (game.rescuedCount > previous.friends) pulse('rescuedCount');
      if (game.rescuedChicks > previous.chicks) pulse('chicksCount');
      if (target > previous.score) pulse('scoreCount');
      if (game.lives < previous.lives) {
        pulse('livesCount');
        animate('gameStage', [{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }], 230);
      }
      if (known && !previous.known) pulse('chickCounter');
      if (chicken.hidden !== previous.hidden) pulse('hiddenText');
      if (el.contextHint.textContent !== previous.hint) animate('contextHint', [{ opacity: .3 }, { opacity: 1 }], 250);
      if (game.currentMap !== previous.region && playing) {
        pulse('areaText'); animate('regionNotice', [{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'translateY(0)' }], 450);
      }
      if (game.phase !== previous.phase) {
        if (game.phase === 'menu') {
          selectTab('adventure');
          animate('menuCard', [{ opacity: 0, transform: 'translateY(15px) scale(.97)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], 380);
        } else if (['won', 'lose'].includes(game.phase)) animate('endScreen', [{ opacity: 0 }, { opacity: 1 }], 450);
      }
      if (chicken.skin !== previous.skin) pulse('menuPortrait');
    }
    previous = { friends: game.rescuedCount, chicks: game.rescuedChicks, score: target, lives: game.lives,
      known, hidden: chicken.hidden, hint: el.contextHint.textContent, region: game.currentMap, phase: game.phase, skin: chicken.skin };
    if (game.phase === 'menu') difficulty();
  }

  function frame(game, dt) {
    MenuScene.frame(game, dt, reduced);
    if (!initialized || document.hidden) return;
    if (scoreTime < 1) {
      scoreTime = Math.min(1, scoreTime + dt / .45);
      score = scoreFrom + (scoreTarget - scoreFrom) * (1 - Math.pow(1 - scoreTime, 3));
      text('scoreCount', Math.round(score));
    }
    if (game.phase !== 'menu' || !CharacterArt.ready) return;
    previewTime += reduced || !walking ? 0 : dt;
    previewFrame += dt;
    const signature = `${game.entities.chicken.skin}:${direction}:${walking}:${reduced}`;
    if (previewSignature === signature && (reduced || !walking || previewFrame < 1 / 24)) return;
    previewFrame = 0; previewSignature = signature;
    const c = el.menuPortrait.getContext('2d');
    if (!c) return;
    c.clearRect(0, 0, 160, 100);
    CharacterArt.draw(c, 'chicken', 80, 74, { direction: directions[direction], moving: walking && !reduced,
      anim: previewTime * 4, scale: 1.12, skin: game.entities.chicken.skin });
  }
  return { initialize, update, frame, get reduced() { return reduced; } };
})();
