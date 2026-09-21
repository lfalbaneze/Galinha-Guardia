/* Presentation follows the live game state. It never advances or mutates the simulation. */
const InterfaceMotion = (() => {
  const el = {}, animations = new Map();
  const tabs = ['adventure', 'outfit', 'audio', 'controls'];
  const difficultyModes = ['easy', 'normal', 'hard', 'hardcore'];
  const difficultySummaries = { easy: 'Sem cronômetro · Explore com calma', normal: 'Sem cronômetro · Um lobo mais atento', hard: '60s iniciais · Ganhe tempo a cada resgate', hardcore: '45s iniciais · Faça combos e ganhe tempo' };
  const sheetTitles = { adventure: 'Prepare o resgate', outfit: 'Quem vai à aventura?', audio: 'Sons da fazenda', controls: 'Do seu jeito' };
  const difficultyStories = {
    easy: { chapter: '01 / EXPLORADOR', promise: 'O caminho também é a aventura.', thor: '1 automática' },
    normal: { chapter: '02 / AVENTURA', promise: 'Pequenas penas. Grande coragem.', thor: '2 ossos' },
    hard: { chapter: '03 / CONTRA O TEMPO', promise: 'Cada segundo é uma chance.', thor: '4 ossos' },
    hardcore: { chapter: '04 / ÚLTIMA LUZ', promise: 'Coragem até o último segundo.', thor: '5, 6, 7… ossos' },
  };
  const difficultyLines = { easy: 'Sem limite de tempo. Lobo mais lento e uma ajuda automática do Thor. Cada resgate vale 100 pontos; cada vida preservada na vitória vale 250.', normal: 'Sem limite de tempo. O lobo investiga sons e pegadas. Cada resgate vale 100 pontos; cada vida preservada na vitória vale 250. Thor: 2 ossos.', hard: '60s iniciais. Pintinho: +20s; amigo: +10s. Cada resgate vale 150 pontos. Vitória: +2 pontos/s restante e +250 por vida. Thor: 4 ossos. Raposas trocam de moita.', hardcore: '45s iniciais e 10 pintinhos. Combo: +5s até +50s; +15s a cada 2 amigos. Cada resgate vale 200 pontos. Vitória: +4 pontos/s restante e +250 por vida. Thor: 5 ossos, depois 6, 7…' };
  const directions = ['down', 'downleft', 'left', 'upleft', 'up', 'upright', 'right', 'downright'];
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  let initialized = false, previous = null, currentGame = null, activeTab = 'adventure';
  let menuOpener = 'newAdventureBtn';
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
    text('menuSheetTitle', sheetTitles[name]);
    el.menuStartFooter.hidden = name !== 'adventure';
    if (!el.menuSettings.hidden) el.menuScreen.setAttribute('aria-describedby', name === 'adventure' ? 'difficultySummary' : '');
    if (changed && name === 'outfit') previewSignature = '';
    for (const tab of tabs) {
      const selected = tab === name;
      el[`tab-${tab}`].setAttribute('aria-selected', String(selected));
      el[`tab-${tab}`].tabIndex = selected ? 0 : -1;
      el[`panel-${tab}`].hidden = !selected;
    }
    if (changed) animate(`panel-${name}`, [{ opacity: .3, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], 220);
    if (focus) el[`tab-${name}`].focus();
  }
  function showHome(focus = false) {
    el.menuHome.hidden = false; el.menuSettings.hidden = true;
    el.menuScreen.dataset.view = 'home'; el.menuCard.scrollTop = 0;
    el.menuScreen.setAttribute('aria-labelledby', 'farmTitle');
    el.menuScreen.setAttribute('aria-describedby', 'menuDescription');
    selectTab('adventure');
    if (focus) el[menuOpener].focus({ preventScroll: true });
  }
  function openSettings(tab, opener, keyboard = true) {
    if (currentGame?.phase !== 'menu') return;
    menuOpener = opener; el.menuHome.hidden = true; el.menuSettings.hidden = false;
    el.menuScreen.dataset.view = 'settings'; el.menuCard.scrollTop = 0;
    el.menuScreen.setAttribute('aria-labelledby', 'menuSheetTitle');
    selectTab(tab, keyboard);
    if (!keyboard) el.menuSettings.focus({ preventScroll: true });
  }
  function backToMenu() {
    if (currentGame?.phase !== 'menu' || el.menuSettings.hidden) return false;
    showHome(true); return true;
  }
  function difficulty() {
    const chosen = difficultyModes.includes(el.difficultySelect.value) ? el.difficultySelect.value : 'normal';
    for (const mode of difficultyModes) {
      const button = el[`difficulty-${mode}`], selected = mode === chosen;
      if (button.getAttribute('aria-checked') !== String(selected)) button.setAttribute('aria-checked', String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
    const savedMode = { easy: 'Fácil', normal: 'Médio', hard: 'Difícil', hardcore: 'Hardcore' }[currentGame?.difficultyKey] || 'Médio';
    const rules = DIFFICULTIES[chosen], story = difficultyStories[chosen];
    data('panel-adventure', 'difficulty', chosen);
    text('difficultyChapter', story.chapter);
    text('difficultyPromise', story.promise);
    text('difficultyClock', rules.timeLimit ? `${rules.timeLimit}s iniciais` : 'Sem limite');
    text('difficultyReward', `${rules.rescueScore || SCORE_PER_RESCUE} pontos`);
    text('difficultyThor', story.thor);
    text('journeyGoal', WORLD.targetRescues);
    text('journeyChickCount', `${rules.bonusChicks || WORLD.targetChicks} pintinhos`);
    text('journeyChickReward', rules.chickCombo ? '+5s → +50s com combo.' : rules.chickTime ? `Cada um rende +${rules.chickTime}s.` : 'Desbloqueie personagens.');
    text('journeyPlayerName', `${CharacterArt.appearances[currentGame?.entities.chicken.skin]?.name || 'Erina'} na missão`);
    text('difficultyFlavor', difficultyLines[chosen] || difficultyLines.normal);
    text('difficultySummary', difficultySummaries[chosen] || difficultySummaries.normal);
    el.difficultyPreview.hidden = !currentGame?.hasSave;
    text('difficultyPreview', currentGame?.hasSave ? `Seu resgate salvo continua no ${savedMode} até você começar a nova aventura.` : '');
  }
  function chooseDifficulty(mode, focus = false) {
    const changed = el.difficultySelect.value !== mode;
    el.difficultySelect.value = mode;
    difficulty();
    if (focus) el[`difficulty-${mode}`].focus();
    if (changed) animate('difficultyPromise', [{ opacity: .35 }, { opacity: 1 }], 220);
  }
  function initialize() {
    if (initialized) return;
    initialized = true;
    MenuScene.initialize();
    for (const id of ['scoreCount', 'rescuedCount', 'chicksCount', 'livesCount', 'chickCounter', 'hiddenText',
      'contextHint', 'areaText', 'gameStage', 'menuCard', 'endScreen', 'menuPortrait', 'portraitTurn', 'portraitWalk', 'howToPlayBtn', 'howToPlayDialog',
      'missionText', 'missionProgress', 'threatIndicator', 'threatText', 'threatProgress', 'regionNotice', 'regionNoticeName',
      'liveControls', 'keyMove', 'keySneak', 'keySprint', 'keyHide', 'difficultySelect', 'difficultyPreview', 'difficultyFlavor', 'difficultySummary',
      'menuScreen', 'menuHome', 'menuSettings', 'menuSheetTitle', 'menuStartFooter', 'newAdventureBtn', 'menuCharacterBtn', 'menuOptionsBtn', 'menuBackBtn',
      'difficultyChapter', 'difficultyPromise', 'difficultyClock', 'difficultyReward', 'difficultyThor',
      'journeyGoal', 'journeyChickCount', 'journeyChickReward', 'journeyPlayerName',
      ...difficultyModes.map(mode => `difficulty-${mode}`), ...tabs.flatMap(t => [`tab-${t}`, `panel-${t}`])])
      el[id] = document.getElementById(id);
    el.newAdventureBtn.addEventListener('click', event => openSettings('adventure', 'newAdventureBtn', !event || event.detail === 0));
    el.menuCharacterBtn.addEventListener('click', event => openSettings('outfit', 'menuCharacterBtn', !event || event.detail === 0));
    el.menuOptionsBtn.addEventListener('click', event => openSettings('audio', 'menuOptionsBtn', !event || event.detail === 0));
    el.menuBackBtn.addEventListener('click', backToMenu);
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
    for (const [index, mode] of difficultyModes.entries()) {
      el[`difficulty-${mode}`].addEventListener('click', () => chooseDifficulty(mode));
      el[`difficulty-${mode}`].addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % difficultyModes.length;
        else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index + difficultyModes.length - 1) % difficultyModes.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = difficultyModes.length - 1;
        if (next === undefined) return;
        event.preventDefault(); chooseDifficulty(difficultyModes[next], true);
      });
    }
    el.howToPlayBtn.addEventListener('click', () => {
      if (currentGame?.phase === 'menu' && !el.howToPlayDialog.open) el.howToPlayDialog.showModal();
    });
    el.difficultySelect.addEventListener('change', difficulty);
    el.portraitTurn.addEventListener('click', () => { direction = (direction + 1) % directions.length; previewSignature = ''; });
    el.portraitWalk.addEventListener('click', () => {
      walking = !walking;
      el.portraitWalk.setAttribute('aria-pressed', String(walking));
      text('portraitWalk', walking ? 'Parar passinhos' : 'Dar uma voltinha');
      previewSignature = '';
    });
    el.menuPortrait.addEventListener('pointermove', event => {
      const bounds = el.menuPortrait.getBoundingClientRect();
      direction = event.clientX < bounds.left + bounds.width * .4 ? 2 : event.clientX > bounds.left + bounds.width * .6 ? 6 : 0;
      previewSignature = '';
    });
    media.addEventListener?.('change', event => {
      reduced = event.matches; previewSignature = '';
      if (reduced) {
        for (const animation of animations.values()) animation.cancel();
        animations.clear(); score = scoreTarget; scoreTime = 1; text('scoreCount', Math.round(score));
      }
    });
    showHome();
  }

  function update(game) {
    initialize();
    const newGame = currentGame !== game;
    currentGame = game;
    if (game.phase !== 'menu' && el.howToPlayDialog.open) el.howToPlayDialog.close();
    const chicken = game.entities.chicken, wolf = game.entities.wolf;
    const known = RescueSystem.knowsSecret(game), playing = game.phase === 'playing';
    const target = Math.max(0, Math.floor(game.score));
    if (newGame) {
      previous = null; score = scoreFrom = scoreTarget = target; scoreTime = 1;
      previewSignature = ''; showHome();
    } else if (scoreTarget !== target) {
      scoreFrom = score; scoreTarget = target; scoreTime = 0;
    }
    if (reduced || game.phase !== 'playing') { score = scoreTarget; scoreTime = 1; }
    text('scoreCount', Math.round(score));
    el.scoreCount.setAttribute('aria-label', `${target} pontos`);
    el.missionProgress.max = WORLD.targetRescues;
    el.missionProgress.value = game.rescuedCount;
    const remaining = WORLD.targetRescues - game.rescuedCount;
    text('missionText', remaining > 0 ? `${remaining} ${remaining === 1 ? 'amigo esperando' : 'amigos esperando'} por você` :
      known ? `Missão cumprida · ${game.rescuedChicks} pintinhos de bônus` : 'Missão cumprida · todos os amigos estão a salvo!');
    const exposed = WolfAI.isExposed(game);
    let level = 'calm', label = 'O lobo está de ronda', amount = .06;
    if (['chase', 'inspect'].includes(wolf.mode) || exposed) { level = 'danger'; label = exposed ? 'Ele viu você! Saia daí!' : 'O lobo vem vindo!'; amount = 1; }
    else if (wolf.mode === 'alert') { level = 'suspect'; label = 'Ele está desconfiando…'; amount = Math.max(.12, wolf.awareness || 0); }
    else if (['search', 'investigate'].includes(wolf.mode)) { level = 'search'; label = 'Ele procura uma pista'; amount = .45; }
    const hunger=WolfAI.appetite(game);
    if(hunger.tier&&wolf.mode==='patrol')label=hunger.tier===2?'Voraz: rápido e persistente':'Faminto: ele vai insistir mais';
    if(hunger.tier===2&&wolf.mode==='chase')label='Lobo voraz! Quebre a visão!';
    if(hunger.tier&&['search','investigate'].includes(wolf.mode))label='Faminto: a busca dura mais';
    if (chicken.hidden && !exposed) { level = 'safe'; label = 'Quietinha no esconderijo'; amount = 0; }
    if (wolf.mode === 'frightened') { level = 'safe'; label = 'Thor espantou o lobo!'; amount = 0; }
    if (game.lake?.active) { level = 'safe'; label = 'O lobo espera fora do lago'; amount = 0; }
    if (!playing) { level = 'calm'; label = game.phase === 'menu' ? 'A fazenda está em pausa' : 'Fim da aventura'; amount = 0; }
    if(SunflowerSystem.mode(game)==='hidden'){level='search';label='O lobo saiu de vista';amount=.25;}
    if(SunflowerSystem.mode(game)==='warning'){level='danger';label='Bote nos girassóis!';amount=1;}
    data('gameStage', 'threat', level); data('threatIndicator', 'level', level);
    text('threatText', label); el.threatProgress.value = Math.round(amount * 100) / 100;
    el.threatProgress.setAttribute('aria-valuetext', label);
    const transition = game.mapTransition;
    el.regionNotice.hidden = !playing || !transition || transition.time <= 0 ||
      !!game.lake?.active || !!(game.lake?.completed && game.lake.notice>0) ||
      !!game.rescueNotice?.time || !!game.secretNotice?.time || !!game.skinNotice?.time || !!game.thorNotice?.time;
    if (!el.regionNotice.hidden) {
      text('regionNoticeName', transition.name);
      el.regionNotice.style.opacity = reduced ? '1' : String(Math.min(1, transition.time / .5));
    }
    el.liveControls.hidden = !playing;
    const movement = Player.moveVector();
    data('keyMove', 'pressed', playing && !!(movement.x || movement.y));
    data('keySneak', 'pressed', playing && GameInput.held('c'));
    data('keySprint', 'pressed', playing && GameInput.held('shift'));
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
          showHome();
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
    if(game.phase==='menu'&&!el.menuSettings.hidden&&activeTab==='adventure')MenuBriefing.render(game,el.difficultySelect.value);
    if (scoreTime < 1) {
      scoreTime = Math.min(1, scoreTime + dt / .45);
      score = scoreFrom + (scoreTarget - scoreFrom) * (1 - Math.pow(1 - scoreTime, 3));
      text('scoreCount', Math.round(score));
    }
    if (game.phase !== 'menu' || activeTab !== 'outfit' || !CharacterArt.ready) return;
    previewTime += reduced || !walking ? 0 : dt;
    previewFrame += dt;
    const signature = `${game.entities.chicken.skin}:${direction}:${walking}:${reduced}`;
    if (previewSignature === signature && (reduced || !walking || previewFrame < 1 / 24)) return;
    previewFrame = 0; previewSignature = signature;
    const c = el.menuPortrait.getContext('2d');
    if (!c) return;
    c.clearRect(0, 0, 320, 180);
    CharacterArt.draw(c, 'chicken', 160, 136, { direction: directions[direction], moving: walking && !reduced,
      anim: previewTime * 4, scale: 2, skin: game.entities.chicken.skin });
  }
  return { initialize, update, frame, backToMenu, get reduced() { return reduced; } };
})();
