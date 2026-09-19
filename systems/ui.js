/* DOM presentation and focus belong here; simulation stays in the game systems. */
const GameUI = (() => {
  const elements = {};
  const wolfLevels = ["Atento", "Farejador", "Feroz", "Implacável"];
  const wolfModes = { frightened: "assustado pelo Thor", patrol: "patrulhando", alert: "desconfiado", investigate: "seguindo pistas", search: "procurando", chase: "perseguindo", inspect: "viu o esconderijo!" };
  let initialized = false;
  let lastPhase = null;
  let lastThorScene = false;

  function put(id, value) {
    const element = elements[id];
    if (element && element.textContent !== String(value)) element.textContent = value;
  }

  function focusCanvas() {
    elements.gameCanvas.focus({ preventScroll: true });
  }

  function newGame() {
    if (![CharacterArt, GooseArt, FoxArt, OwlArt, ThorArt, ScarecrowArt].every(art => art.ready)) return;
    resetGame();
    AudioSystem.sync(state);
    AudioSystem.unlock();
    update(state);
    focusCanvas();
  }

  function resumeGame() {
    if (![CharacterArt, GooseArt, FoxArt, OwlArt, ThorArt, ScarecrowArt].every(art => art.ready)) return;
    if (!state || !state.hasSave) return;
    if (state.phase === 'lose' || state.resumePhase === 'lose' || state.lives <= 0) { retryGame(); return; }
    state.phase = state.resumePhase || "playing";
    GameInput.clear();
    AudioSystem.sync(state);
    AudioSystem.unlock();
    update(state);
    if (state.phase !== "won" && state.phase !== "lose") focusCanvas();
  }

  function retryGame() {
    if (![CharacterArt, GooseArt, FoxArt, OwlArt, ThorArt, ScarecrowArt].every(art => art.ready)) return;
    const seed = state.worldSeed;
    difficultySelect.value = state.difficultyKey;
    resetGame(seed);
    AudioSystem.sync(state);
    AudioSystem.unlock();
    update(state);
    focusCanvas();
  }

  function initialize() {
    if (initialized) return;
    initialized = true;
    AudioControls.initialize();
    InterfaceMotion.initialize();
    GameInput.initialize();
    const ids = ["rescueGoal", "gameCanvas", "menuScreen", "menuTitle", "menuDescription", "menuSaveText", "endScreen", "endTitle", "endMessage", "endSummary", "endEmblem", "endEyebrow", "startBtn", "continueBtn", "pauseBtn", "replayBtn", "menuBtn", "hiddenText", "contextHint", "wolfLevelText", "wolfStateText", "saveText", "staminaMeter", "staminaText", "chicksCount", "chickCounter", "farmHud", "wardrobeNote", "wolfMultiplier", "skinUnlockText", ...SkinSystem.catalog.map(s => `skin-${s.id}`)];
    for (const id of ids) elements[id] = document.getElementById(id);
    for (const id of ['runTimer','timeRemaining','timeReward','endTimeBonus','pantoRescue']) elements[id] = document.getElementById(id);
    for (const id of ['menuPowerName','menuPowerDescription','skinPowerText','skinPowerBadge']) elements[id] = document.getElementById(id);
    elements.gameShell = document.getElementById("gameShell");
    for(const id of ['expeditionBar','gameFeedback','gameStatus'])elements[id]=document.getElementById(id);
    elements.menuSkinSelect = document.getElementById("menuSkinSelect");
    elements.menuMascot = document.getElementById("menuMascot");
    for (const skin of SkinSystem.catalog) elements[`menu-skin-${skin.id}`] = document.getElementById(`menu-skin-${skin.id}`);
    document.getElementById('retrySprites').addEventListener('click', async () => {
      const loading=Promise.all([CharacterArt.load(),GooseArt.load(),FoxArt.load(),OwlArt.load(),ThorArt.load(),ScarecrowArt.load()]);
      update(state); await loading; update(state);
    });
    elements.startBtn.addEventListener("click", newGame);
    elements.replayBtn.addEventListener("click", () => {
      if (state.phase === 'lose') retryGame();
      else newGame();
    });
    elements.continueBtn.addEventListener("click", resumeGame);
    elements.pauseBtn.addEventListener("click", () => {
      if (state.phase === "menu") resumeGame();
      else showMenu(state);
    });
    elements.menuBtn.addEventListener("click", () => showMenu(state));
    document.getElementById('thorSupply').addEventListener('click',()=>{ThorSystem.request(state);update(state);focusCanvas();});
    document.getElementById('thorSceneSkip').addEventListener('click',()=>{ThorSystem.skip(state);update(state);focusCanvas();});
    document.getElementById('thorScenePause').addEventListener('click',()=>showMenu(state));
    document.getElementById('lakeChallengeBtn').addEventListener('click', () => {
      if (state.lake?.active) LakeChallenge.cancel(state); else LakeChallenge.start(state);
      update(state); focusCanvas();
    });
    elements.menuSkinSelect.addEventListener("change", () => {
      if (SkinSystem.equip(state, elements.menuSkinSelect.value)) {
        AudioSystem.sync(state);
        AudioSystem.unlock();
      }
      update(state);
    });
    for (const skin of SkinSystem.catalog) {
      elements[`skin-${skin.id}`].addEventListener("click", () => {
        if (!SkinSystem.equip(state, skin.id)) return;
        AudioSystem.sync(state);
        AudioSystem.unlock();
        update(state);
        if (state.phase === "playing") focusCanvas();
      });
    }

    // Keep keyboard focus in the active dialog without touching gameplay keys.
    document.addEventListener("keydown", event => {
      // Native modal help owns focus while open, including its scrollable content.
      if (document.getElementById('howToPlayDialog')?.open) return;
      if (event.key !== "Tab") return;
      const overlay = !elements.menuScreen.hidden ? elements.menuScreen : !elements.endScreen.hidden ? elements.endScreen : null;
      if (!overlay) return;
      const buttons = [...overlay.querySelectorAll("button, select, input, summary, a[href]")].filter(button =>
        !button.hidden && !button.disabled && button.tabIndex !== -1 && !button.closest?.('[hidden]') &&
        !(button.tagName !== "SUMMARY" && button.closest?.("details:not([open])")));
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (!first) return;
      if (!overlay.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  function showMenu(game) {
    if (!initialized) initialize();
    if (game.phase !== "menu") game.resumePhase = game.phase;
    game.phase = "menu";
    GameInput.clear();
    AudioSystem.sync(game);
    GameManager.save(game);
    update(game);
  }

  function update(game) {
    if (!initialized) initialize();
    const ending=EndGameSequence.active(game);
    elements.gameShell.dataset.ending=String(ending);
    for(const id of ['expeditionBar','gameFeedback','gameStatus'])elements[id].hidden=ending;
    const thorScene=game.phase==='playing'&&ThorSystem.active(game);
    elements.gameShell.dataset.thorScene=String(thorScene);
    document.getElementById('thorSceneControls').hidden=!thorScene;
    document.getElementById('thorSceneSkip').disabled=!thorScene||(game.thorRescue?.time||0)<.6;
    if(thorScene){const status=document.getElementById('thorSceneStatus'),line=ThorCinematic.text(game);if(status.textContent!==line)status.textContent=line;}
    if(thorScene!==lastThorScene){
      lastThorScene=thorScene;
      if(game.phase==='playing')focusCanvas();
    }
    const spritesBlocked = ![CharacterArt, GooseArt, FoxArt, OwlArt, ThorArt, ScarecrowArt].every(art => art.ready);
    for (const id of ['startBtn', 'continueBtn', 'replayBtn']) elements[id].disabled = spritesBlocked;
    document.getElementById('restartBtn').disabled = spritesBlocked;
    const spriteStatus = document.getElementById('spriteStatus');
    spriteStatus.hidden = !spritesBlocked;
    document.getElementById('retrySprites').hidden = !spritesBlocked || [CharacterArt,GooseArt,FoxArt,OwlArt,ThorArt,ScarecrowArt].some(a=>a.loading);
    spriteStatus.textContent = [CharacterArt, GooseArt, FoxArt, OwlArt, ThorArt, ScarecrowArt].some(art => art.errors.length)
      ? 'Alguns bichos não chegaram. Recarregue a página para tentar novamente.'
      : 'Chamando a turma da fazenda…';
    AudioControls.update(game);
    const chicken = game.entities.chicken;
    const portraitSkin = CharacterArt.appearances[chicken.skin] ? chicken.skin : 'classic';
    if (elements.menuMascot.dataset.skin !== portraitSkin) {
      elements.menuMascot.src = `./assets/menu/portraits/${portraitSkin === 'classic' ? 'carijo' : portraitSkin}.png?v=fofinhos52`;
      elements.menuMascot.alt = CharacterArt.appearances[portraitSkin].description || CharacterArt.appearances[portraitSkin].name;
      elements.menuMascot.dataset.skin = portraitSkin;
    }
    const wolf = game.entities.wolf;
    const hidden = !!chicken.hidden;
    const exposed = WolfAI.isExposed(game);
    const sprinting = !!chicken.sprinting;
    const candidate = chicken.hidingCandidate;
    const playing = game.phase === "playing";
    const secretKnown = RescueSystem.knowsSecret(game);
    const secret = RescueSystem.secretHint(game);
    const callableChick = RescueSystem.callTarget(game);
    const interact = GameInput.label('interact'), hideKey = GameInput.label('hide'), exitKey = GameInput.label('exit');
    elements.chickCounter.hidden = false;
    elements.farmHud.dataset.secretKnown = 'true';
    put("chicksCount", game.rescuedChicks);
    put("rescueGoal", `/ ${WORLD.targetRescues}`);
    elements.pantoRescue.hidden = !game.entities.goose?.rescued;
    put("wolfMultiplier", `Cerco ${WolfAI.getConfig(game).pressure.toFixed(2).replace(".", ",")}×`);
    for (const skin of SkinSystem.catalog) {
      const button = elements[`skin-${skin.id}`], available = SkinSystem.unlocked(skin.id);
      const power = SkinSystem.power({skin:skin.id});
      const selected = chicken.skin === skin.id;
      button.disabled = !available;
      button.dataset.active = String(selected);
      button.setAttribute("aria-pressed", String(selected));
      const requirement = skin.requirement;
      button.title = `${skin.description ? skin.description + ' ' : ''}${power.description}`;
      put(`skin-${skin.id}`, available ? `${skin.name}${power.badge ? ` · ${power.name}` : ''}${selected ? " · usando" : ""}` : `${skin.name} · ${requirement}`);
      const option = elements[`menu-skin-${skin.id}`];
      option.disabled = !available;
      option.title = button.title;
      put(`menu-skin-${skin.id}`, available ? `${skin.name}${power.badge ? ` · ${power.name}` : ''}` : `${skin.name} · ${requirement}`);
    }
    elements.menuSkinSelect.value = chicken.skin;
    const power = SkinSystem.power(chicken);
    put('menuPowerName',power.name);
    put('menuPowerDescription',power.description);
    put('skinPowerText',`${power.name}: ${power.description}`);
    put('skinPowerBadge',power.badge);
    elements.skinPowerBadge.hidden = !power.badge;
    elements.skinPowerBadge.title = power.description;
    const availableSkins = SkinSystem.catalog.filter(s => s.id !== "classic" && SkinSystem.unlocked(s.id)).length;
    put("skinUnlockText", `${availableSkins} / ${SkinSystem.catalog.length - 1} aparências no baú${SkinSystem.storageAvailable ? "" : " · nesta sessão"}`);
    put("wardrobeNote", `6 pintinhos se escondem no feno, nas árvores e nos arbustos. Siga o piado, chegue perto e aperte ${interact} uma vez para chamar. São bônus opcionais: procure antes de salvar o último amigo e ganhe novas aparências.`);
    const swim = SwimmingSystem.profile(game);
    const supply=document.getElementById('thorSupply'),bones=ThorSystem.boneCount(game),required=ThorSystem.cost(game),free=required===0;
    if(supply) {
      supply.hidden=!playing||thorScene;
      const ready=ThorSystem.canCall(game),used=game.thorVisit?.easyUsed;
      const key=GameInput.label('thor');
      const label=free?(used?'🐾 Thor · ajuda usada':'🐾 Thor · 1 ajuda automática'):ready?`🐾 Chamar Thor${key==='Chamar Thor'?'':` · ${key}`}`:`🦴 Thor · ${bones}/${required}`;
      if(supply.textContent!==label)supply.textContent=label;
      supply.disabled=!ready;supply.dataset.ready=String(ready);
      supply.title=free?(used?'A ajuda gratuita desta tentativa já foi usada.':'Uma vez nesta tentativa: com 1 coração, Thor dá mais 1 automaticamente.'):
        `${bones}/${required} ossos. ${game.lives===MAX_LIVES?'Vida cheia. Guarde para quando precisar.':swim.swimming?'Saia da água para chamar.':game.lake?.active?'Termine o desafio do lago para chamar.':'Chame Thor para recuperar toda a vida.'}`;
    }
    put("hiddenText", swim.swimming ? (swim.native ? "Nadando" : "De boia") : exposed ? "Ele viu você!" : hidden ? "Escondida" : chicken.sneaking ? "De mansinho" : sprinting ? "Correndo" : "À vista");
    elements.hiddenText.dataset.state = exposed ? "exposed" : hidden ? "hidden" : sprinting ? "sprinting" : "visible";
    const hint = !playing ? (game.phase === 'lose' || game.resumePhase === 'lose' ? 'Fim da tentativa. A próxima começa do zero.' : game.phase === "menu" ? "A porteira tá aberta. O juízo saiu por ela." : "Poleiro cheio. Lobo sem almoço. Belo dia!") :
      game.lake?.active ? (LakeChallenge.canCounter(game) ? `${interact} para pegar o carimbo!` :
        (game.lake.counterWindow||0)>0 ? 'PANTO ficou tonto! Chegue perto antes que a barra acabe.' : 'Desvie da sequência. Quando PANTO ficar tonto, chegue perto para pegar o carimbo.') :
      swim.swimming ? SwimmingSystem.hint(game) :
      exposed ? `Ele viu você! Saia com ${exitKey} e procure outro esconderijo.` :
      callableChick ? `Piu-piu! Aperte ${interact} uma vez para chamar o pintinho ao ninho.` :
      wolf.mode === "frightened" ? "Thor latiu e o valentão afinou! Aproveite para seguir seu caminho." :
      hidden ? `Finja que é salada. Deixe o lobo passar; ${exitKey} ou movimento para sair.` :
      SunflowerSystem.mode(game)==='warning' ? 'Bote nos girassóis! Saia para o lado da faixa marcada!' :
      wolf.mode === "chase" ? "Corra e saia da vista do lobo antes de se esconder!" :
      wolf.mode === "alert" ? "Ele percebeu alguma coisa. Saia da vista!" :
      secret ? `Siga o piado! Chegue perto até aparecer ${interact} para chamar o pintinho.` :
      HidingSpots.occupied(game,HidingSpots.candidate(chicken)) ? `${FoxSystem.denLabel(HidingSpots.occupant(game,HidingSpots.candidate(chicken)))}: já tem dono! Procure outro esconderijo.` :
      candidate ? `${hideKey} para se esconder. Espere o lobo olhar para outro lado.` :
      chicken.exhausted ? "O tanque de có-có secou. Pare de correr e respire um pouquinho." :
      EnvironmentSystem.hint(game) || (
      sprinting ? "Menos sapateado! Correr assusta o bando e deixa pegadas por alguns segundos." :
      `Para chegar de mansinho, ${GameInput.label('sneak')}. Encoste nos amigos para salvá-los.`);
    put("contextHint",hint);
    // Nearby actions already have one cue in the world. Keep the footer for unmet needs.
    const worldCue = !swim.swimming && (exposed || callableChick || hidden || candidate || secret || HidingSpots.candidate(chicken));
    elements.contextHint.dataset.important = String(!game.lake?.active && !worldCue && !!(swim.swimming || chicken.exhausted));
    elements.staminaMeter.value = chicken.stamina;
    elements.staminaMeter.parentElement.dataset.tired = String(chicken.exhausted);
    elements.staminaMeter.parentElement.dataset.full = String(chicken.stamina >= .995 && !sprinting && !chicken.exhausted);
    put("staminaText", chicken.exhausted ? "Recuperando" : "Fôlego");
    put("wolfLevelText", wolfLevels[game.wolfLevel] || wolfLevels[0]);
    put("wolfStateText", game.lake?.active ? "esperando fora do lago" : game.phase === "won" || game.phase === "win_cutscene" ? "surpreendido!" : SunflowerSystem.mode(game)==='warning' ? "preparando o bote" : SunflowerSystem.concealed(game) ? "à espreita" : wolfModes[wolf.mode] || "patrulhando");
    elements.wolfStateText.parentElement.dataset.mode = wolf.mode || "patrol";
    const saved = GameManager.storageAvailable;
    put("saveText", saved ? "Anotado na caderneta" : "Progresso mantido nesta partida");
    put("menuSaveText", saved ? "Seu progresso é salvo automaticamente neste navegador." : "Este navegador não permitiu salvar. Seu progresso continua ao trocar de área nesta partida.");

    const menu = game.phase === "menu";
    const timed = game.timeRemaining !== null;
    const seconds = GameManager.remainingSeconds(game);
    elements.runTimer.hidden = !timed;
    elements.runTimer.dataset.urgent = String(timed && seconds <= 15);
    put('timeRemaining', `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`);
    elements.timeReward.hidden = !timed || !(game.timeRewardNotice?.time > 0);
    put('timeReward', game.timeRewardNotice?.time > 0 ? `+${game.timeRewardNotice.seconds}s` : '');
    elements.runTimer.title = `Pintinho: +${game.settings.chickTime || 0}s. Amigo: +${game.settings.friendTime || 0}s. Na vitória: cada segundo inteiro restante vale ${(game.settings.timeScore || 0).toLocaleString('pt-BR')} pontos.`;
    elements.gameShell.dataset.phase = game.phase;
    const ended = game.phase === "won" || game.phase === "lose";
    elements.menuScreen.hidden = !menu;
    elements.endScreen.hidden = !ended;
    elements.pauseBtn.disabled = menu || ended;

    if (menu) {
      const lost = game.resumePhase === 'lose';
      const canContinue = !!game.hasSave && ["playing", "lose", "win_cutscene", "won"].includes(game.resumePhase);
      elements.continueBtn.hidden = !canContinue;
      elements.startBtn.classList.toggle("button-secondary", canContinue);
      put("startBtn", canContinue ? "Começar nova fazenda" : "Entrar na fazenda");
      put("continueBtn", lost ? 'Tentar novamente' : game.resumePhase === "won" ? "Voltar à comemoração" : "Continuar resgate");
      put("menuTitle", lost ? "Bora tentar de novo?" : canContinue ? "A aventura continua!" : "Bora se divertir!");
      put("menuDescription", lost ? `${game.defeatReason === 'timeout' ? 'O tempo acabou.' : 'As três vidas acabaram.'} Tente a Fazenda do tio Clau de novo, com resgates, pintinhos, pontos e tempo reiniciados.` : canContinue ? `${game.rescuedCount}/${WORLD.targetRescues} amigos a salvo${secretKnown ? ` · ${game.rescuedChicks}/6 pintinhos no ninho` : ""}. ${game.rescuedCount === WORLD.targetRescues ? "Festa na Fazenda do tio Clau! O lobo ficou sem convite." : "A turma do tio Clau conta com você. O lobo que lute!"}` : "Na Fazenda do tio Clau, até o almoço sai correndo! Resgate os 12 amigos e siga os piados.");
    }
    if (ended) {
      const won = game.phase === "won";
      const timeout = game.defeatReason === 'timeout';
      put('replayBtn', won ? 'Jogar novamente' : 'Tentar novamente');
      put("endEmblem", won ? "🐔 ♥" : "🐔");
      put("endEyebrow", won ? "FIM ♥" : "FIM DE JOGO");
      put("endTitle", won ? "Turma completa. Lobo de barriga vazia." : timeout ? "O tempo acabou!" : "O lobo ganhou essa rodada.");
      put("endMessage", won ? "Todo mundo a salvo! A vaca voltou a mastigar, o gato diz que planejou tudo e o lobo foi reclamar com a mãe." : `${timeout ? 'O relógio zerou antes do último resgate.' : 'As três vidas acabaram.'} Tentar novamente reinicia a mesma fazenda: resgates, pintinhos, pontos e desafios voltam ao começo.${timed ? ' O cronômetro volta ao tempo completo.' : ''}`);
      elements.endTimeBonus.hidden = !won || !game.timeBonus;
      put('endTimeBonus', game.timeBonus ? `Bônus de tempo: ${game.timeBonus / game.settings.timeScore}s × ${game.settings.timeScore.toLocaleString('pt-BR')} = +${game.timeBonus.toLocaleString('pt-BR')} pontos` : '');
      put("endSummary", `${game.rescuedCount}/${WORLD.targetRescues} amigos${game.entities.goose?.rescued ? ' · Panto resgatado' : ''}${secretKnown ? ` · ${game.rescuedChicks}/6 pintinhos` : ""} · ${Math.max(0, Math.floor(game.score))} pontos · ${Math.max(0, game.lives)} vidas`);
    }
    InterfaceMotion.update(game);
    GameplayHud.update(game);
    LakeChallenge.updateUI(game);
    GameInput.update(game);
    if (lastPhase !== game.phase) {
      if (menu) (elements.continueBtn.hidden ? elements.startBtn : elements.continueBtn).focus({ preventScroll: true });
      else if (ended) elements.replayBtn.focus({ preventScroll: true });
      else if (lastPhase === "menu" || lastPhase === "won" || lastPhase === "lose") focusCanvas();
      lastPhase = game.phase;
    }
  }

  function panel(x, y, width, height, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.roundRect(x, y, width, height, 8); ctx.fill();
  }

  function render(game) {
    if (game.phase !== "playing") return;
    ctx.save();
    const chicken = game.entities.chicken, wolf = game.entities.wolf;
    const p = worldToScreen(chicken), w = worldToScreen(wolf);
    const talkers = RescueSystem.all(game).filter(a => !a.rescued && RescueSystem.visible(game, a))
      .sort((a, b) => distance(a, chicken) - distance(b, chicken));
    for (const animal of talkers.slice(0, 2)) {
      const at = worldToScreen(animal);
      if (at.x < 0 || at.x > canvas.width || at.y < 75 || at.y > canvas.height) continue;
      if (animal.speechTime > 0) {
        ctx.font = "bold 13px Trebuchet MS, sans-serif";
        const width = Math.min(260, ctx.measureText(animal.speech).width + 26);
        const bx = clamp(at.x - width / 2, 10, canvas.width - width - 10);
        const by = at.y - CharacterArt.markerOffset(animal.species) - 36;
        panel(bx, by, width, 30, "#fff3ce");
        ctx.fillStyle = "#fff3ce"; ctx.beginPath(); ctx.moveTo(at.x-5,by+29); ctx.lineTo(at.x+5,by+29); ctx.lineTo(at.x,by+36); ctx.fill();
        ctx.fillStyle = "#663d28"; ctx.textAlign = "center";
        ctx.fillText(animal.speech, bx + width / 2, by + 20, width - 14);
      }
      if (animal.temper === "tired") {
        panel(at.x - 35, at.y + 20, 70, 20, "#365343");
        ctx.font = "bold 11px Trebuchet MS, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#fff0b5";
        ctx.fillText("Pode chegar!", at.x, at.y + 34);
      }
    }
    // Brief, local feedback ties each state to the character causing it.
    if (!SunflowerSystem.concealed(game) && wolf.mode !== "patrol" && w.x > 65 && w.x < canvas.width - 65 && w.y > 93 && w.y < canvas.height + 20) {
      const color = ["chase", "inspect"].includes(wolf.mode) ? "#f6b9a4" : wolf.mode === "alert" ? "#ffe398" : "#cce2e6";
      const labels = { frightened: "DEU MEDO DO THOR!", chase: "! PERSEGUINDO", alert: "? DESCONFIOU", investigate: "ACHOU UMA PISTA", search: "PROCURANDO", inspect: "! TE VI ENTRAR" };
      panel(w.x - 60, w.y - 94, 120, wolf.mode === "alert" ? 33 : 25, "rgba(42, 57, 46, .92)");
      ctx.fillStyle = color; ctx.textAlign = "center"; ctx.font = "bold 10px sans-serif";
      ctx.fillText(labels[wolf.mode] || "", w.x, w.y - 77);
      if (wolf.mode === "alert") {
        ctx.fillStyle = "#627060"; ctx.fillRect(w.x - 43, w.y - 70, 86, 3);
        ctx.fillStyle = color; ctx.fillRect(w.x - 43, w.y - 70, 86 * clamp(wolf.awareness || 0, 0, 1), 3);
      }
    }
    if (!SunflowerSystem.concealed(game) && wolf.speechTime > 0 && wolf.speech && w.x > 0 && w.x < canvas.width && w.y > 137 && w.y < canvas.height + 20) {
      ctx.font = "bold 12px sans-serif";ctx.textAlign = "center";
      const width=Math.min(280,Math.max(216,ctx.measureText(wolf.speech).width+24));
      const sx = clamp(w.x, width/2+8, canvas.width-width/2-8);
      panel(sx-width/2, w.y-134, width, 29, "rgba(255, 246, 224, .98)");
      ctx.fillStyle = ["chase", "inspect"].includes(wolf.mode) ? "#a63e31" : "#56533d";
      ctx.fillText(wolf.speech, sx, w.y-115, width-24);
    }
    if (chicken.stamina < 0.99 || chicken.sprinting) {
      const y = Math.min(canvas.height - 20, p.y + 30);
      panel(p.x - 27, y, 54, 10, "rgba(44, 64, 39, .8)");
      ctx.fillStyle = chicken.exhausted ? "#ecc283" : "#d4efa6";
      ctx.beginPath(); ctx.roundRect(p.x - 24, y + 3, Math.max(0.01, 48 * chicken.stamina), 4, 2); ctx.fill();
    }
    const message = activeNotice(game);
    if (message) {
      ctx.save();
      ctx.globalAlpha = Math.min(1,message.time*2);
      const x=canvas.width/2-145;
      panel(x,12,290,46,'rgba(37,57,33,.96)');
      ctx.fillStyle='#e1bc61';ctx.fillRect(x,18,3,34);
      ctx.textAlign='center';ctx.fillStyle='#fff1c6';ctx.font='bold 14px Trebuchet MS, sans-serif';
      ctx.fillText(message.title,canvas.width/2,31,266);
      ctx.font='12px Trebuchet MS, sans-serif';ctx.fillStyle='#d2d8ba';
      ctx.fillText(message.detail,canvas.width/2,48,266);
      ctx.restore();
    }
    if (game.secretNotice?.bonus && game.secretNotice.time > 0) {
      const notice = game.secretNotice;
      const age=4-notice.time;
      const approach=InterfaceMotion.reduced?1:Math.min(1,age/.55);
      const at=worldPointToScreen(lerp(notice.x,notice.targetX ?? notice.x,approach),
        lerp(notice.y,notice.targetY ?? notice.y,approach));
      ctx.save();ctx.globalAlpha=Math.max(0,1-age/1.5);
      CharacterArt.draw(ctx, 'chick', at.x, at.y-8,
        { scale: 1, direction: approach<1?(notice.targetX<notice.x?'left':'right'):'down', moving: approach<1,
          anim:age*10, lift: InterfaceMotion.reduced?0:Math.sin(Math.min(1,age/.65)*Math.PI)*18 });
      ctx.restore();
    }
    ctx.restore();
  }

  function activeNotice(game) {
    if(game.thorNotice?.time>0&&game.thorNotice.arriving)return {time:game.thorNotice.time,title:"O herói usa coleira!",
      detail:"Thor a caminho! Segura esse último coração."};
    if(game.thorNotice?.time>0)return {time:game.thorNotice.time,title:game.thorNotice.healed?(ThorSystem.cost(game)?"Thor chegou! Vida completa":"Thor chegou! +1 coração"):"Thor chegou!",
      detail:game.thorNotice.healed?"Bom garoto! O lobo achou a saída rapidinho.":"Corações cheios · valentão sem coragem!"};
    if(game.thorBoneNotice?.time>0)return {time:game.thorBoneNotice.time,title:`${game.thorBoneNotice.count}/${ThorSystem.cost(game)} ossos para o Thor`,
      detail:game.thorBoneNotice.count>=ThorSystem.cost(game)?`Reforço preparado! ${GameInput.label('thor')} para chamar quando faltar vida.`:'Ossinho guardado. O golden tem bom gosto!'};
    if(game.skinNotice?.time>0)return {time:game.skinNotice.time,title:`Nova aparência: ${game.skinNotice.text}`,
      detail:game.secretNotice?.time>0?'Pintinho salvo, figurino novo! Confira o baú.':'Roupa nova pra aprontar. Confira o baú!'};
    if(game.secretNotice?.time>0)return {time:game.secretNotice.time,
      title:game.secretNotice.bonus?'Pintinho no ninho!':'Esse piado tem perninhas!',
      detail:game.secretNotice.bonus?`+100 pontos · ${game.rescuedChicks} de 6 pintinhos`:'Chegue perto para levar o pequeno ao poleiro.'};
    if(game.rescueNotice?.time>0)return {time:game.rescueNotice.time,title:`${game.rescueNotice.name} a salvo!`,
      detail:`+100 pontos · ${game.rescueNotice.count} de ${game.rescueNotice.total} no poleiro`};
    return null;
  }

  return { initialize, update, render, activeNotice, showMenu, resume: resumeGame, focusCanvas };
})();
