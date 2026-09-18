/* DOM presentation and focus belong here; simulation stays in the game systems. */
const GameUI = (() => {
  const elements = {};
  const wolfLevels = ["Atento", "Farejador", "Feroz", "Implacável"];
  const wolfModes = { frightened: "assustado pelo Thor", patrol: "patrulhando", alert: "desconfiado", investigate: "investigando ruído", search: "procurando", chase: "perseguindo", inspect: "viu o esconderijo!" };
  let initialized = false;
  let lastPhase = null;

  function put(id, value) {
    const element = elements[id];
    if (element && element.textContent !== String(value)) element.textContent = value;
  }

  function focusCanvas() {
    elements.gameCanvas.focus({ preventScroll: true });
  }

  function newGame() {
    if (![CharacterArt, GooseArt, FoxArt, OwlArt, ThorArt].every(art => art.ready)) return;
    resetGame();
    AudioSystem.sync(state);
    AudioSystem.unlock();
    update(state);
    focusCanvas();
  }

  function resumeGame() {
    if (![CharacterArt, GooseArt, FoxArt, OwlArt, ThorArt].every(art => art.ready)) return;
    if (!state || !state.hasSave) return;
    if (state.needsRecovery) GameManager.recover(state);
    state.phase = state.resumePhase || "playing";
    GameInput.clear();
    AudioSystem.sync(state);
    AudioSystem.unlock();
    update(state);
    if (state.phase !== "won" && state.phase !== "lose") focusCanvas();
  }

  function initialize() {
    if (initialized) return;
    initialized = true;
    AudioControls.initialize();
    InterfaceMotion.initialize();
    GameInput.initialize();
    const ids = ["gameCanvas", "menuScreen", "menuTitle", "menuDescription", "menuSaveText", "endScreen", "endTitle", "endMessage", "endSummary", "endEmblem", "endEyebrow", "startBtn", "continueBtn", "pauseBtn", "replayBtn", "menuBtn", "hiddenText", "contextHint", "wolfLevelText", "wolfStateText", "saveText", "staminaMeter", "staminaText", "chicksCount", "chickCounter", "farmHud", "wardrobeNote", "wolfMultiplier", "skinUnlockText", ...SkinSystem.catalog.map(s => `skin-${s.id}`)];
    for (const id of ids) elements[id] = document.getElementById(id);
    elements.gameShell = document.getElementById("gameShell");
    elements.menuSkinSelect = document.getElementById("menuSkinSelect");
    for (const skin of SkinSystem.catalog) elements[`menu-skin-${skin.id}`] = document.getElementById(`menu-skin-${skin.id}`);
    document.getElementById('retrySprites').addEventListener('click', async () => {
      const loading=Promise.all([CharacterArt.load(),GooseArt.load(),FoxArt.load(),OwlArt.load(),ThorArt.load()]);
      update(state); await loading; update(state);
    });
    elements.startBtn.addEventListener("click", newGame);
    elements.replayBtn.addEventListener("click", () => {
      if (state.phase === 'lose') { GameManager.recover(state); AudioSystem.sync(state); AudioSystem.unlock(); update(state); focusCanvas(); }
      else newGame();
    });
    elements.continueBtn.addEventListener("click", resumeGame);
    elements.pauseBtn.addEventListener("click", () => {
      if (state.phase === "menu") resumeGame();
      else showMenu(state);
    });
    elements.menuBtn.addEventListener("click", () => showMenu(state));
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
    const spritesBlocked = ![CharacterArt, GooseArt, FoxArt, OwlArt, ThorArt].every(art => art.ready);
    for (const id of ['startBtn', 'continueBtn', 'replayBtn']) elements[id].disabled = spritesBlocked;
    document.getElementById('restartBtn').disabled = spritesBlocked;
    const spriteStatus = document.getElementById('spriteStatus');
    spriteStatus.hidden = !spritesBlocked;
    document.getElementById('retrySprites').hidden = !spritesBlocked || [CharacterArt,GooseArt,FoxArt,OwlArt,ThorArt].some(a=>a.loading);
    spriteStatus.textContent = [CharacterArt, GooseArt, FoxArt, OwlArt, ThorArt].some(art => art.errors.length)
      ? 'Alguns bichos não chegaram. Recarregue a página para tentar novamente.'
      : 'Chamando a turma da fazenda…';
    AudioControls.update(game);
    const chicken = game.entities.chicken;
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
    put("wolfMultiplier", `Cerco ${WolfAI.getConfig(game).pressure.toFixed(2).replace(".", ",")}×`);
    for (const skin of SkinSystem.catalog) {
      const button = elements[`skin-${skin.id}`], available = SkinSystem.unlocked(skin.id);
      const selected = chicken.skin === skin.id;
      button.disabled = !available;
      button.dataset.active = String(selected);
      button.setAttribute("aria-pressed", String(selected));
      const requirement = skin.requirement;
      put(`skin-${skin.id}`, available ? `${skin.name}${selected ? " · usando" : ""}` : `${skin.name} · ${requirement}`);
      const option = elements[`menu-skin-${skin.id}`];
      option.disabled = !available;
      put(`menu-skin-${skin.id}`, available ? skin.name : `${skin.name} · ${requirement}`);
    }
    elements.menuSkinSelect.value = chicken.skin;
    const availableSkins = SkinSystem.catalog.filter(s => s.id !== "classic" && SkinSystem.unlocked(s.id)).length;
    put("skinUnlockText", `${availableSkins} / ${SkinSystem.catalog.length - 1} aparências no baú${SkinSystem.storageAvailable ? "" : " · nesta sessão"}`);
    put("wardrobeNote", `6 pintinhos se escondem no feno, nas árvores e nos arbustos. Siga o piado, chegue perto e aperte ${interact} uma vez para chamar. São bônus opcionais: procure antes de salvar o último amigo e ganhe novas aparências.`);
    put("hiddenText", exposed ? "Ele viu você!" : hidden ? "Escondida" : chicken.sneaking ? "De mansinho" : sprinting ? "Correndo" : "À vista");
    elements.hiddenText.dataset.state = exposed ? "exposed" : hidden ? "hidden" : sprinting ? "sprinting" : "visible";
    const hint = !playing ? (game.phase === "menu" ? "A turma espera por você." : "Todo mundo junto. Até o lobo perdeu a coragem!") :
      exposed ? `Ele viu você! Saia com ${exitKey} e procure outro esconderijo.` :
      callableChick ? `Piu-piu! Aperte ${interact} uma vez para chamar o pintinho ao ninho.` :
      wolf.mode === "frightened" ? "Thor espantou o lobo! Aproveite para seguir seu caminho." :
      hidden ? `Quietinha… deixe o lobo passar. ${exitKey} ou movimento para sair.` :
      wolf.mode === "chase" ? "Corra e saia da vista do lobo antes de se esconder!" :
      wolf.mode === "alert" ? "Ele percebeu alguma coisa. Saia da vista!" :
      secret ? `Siga o piado! Chegue perto até aparecer ${interact} para chamar o pintinho.` :
      candidate ? `${hideKey} para se esconder. Espere o lobo olhar para outro lado.` :
      chicken.exhausted ? "Sem fôlego? Pare de correr e respire um pouquinho." :
      sprinting ? "Pé leve! A correria espanta os bichos e chama o lobo." :
      `Para chegar de mansinho, ${GameInput.label('sneak')}. Encoste nos amigos para salvá-los.`;
    put("contextHint",hint);
    elements.staminaMeter.value = chicken.stamina;
    elements.staminaMeter.parentElement.dataset.tired = String(chicken.exhausted);
    put("staminaText", chicken.exhausted ? "Recuperando" : "Fôlego");
    put("wolfLevelText", wolfLevels[game.wolfLevel] || wolfLevels[0]);
    put("wolfStateText", game.lake?.active ? "esperando fora do lago" : game.phase === "won" || game.phase === "win_cutscene" ? "surpreendido!" : wolfModes[wolf.mode] || "patrulhando");
    elements.wolfStateText.parentElement.dataset.mode = wolf.mode || "patrol";
    const saved = GameManager.storageAvailable;
    put("saveText", saved ? "Anotado na caderneta" : "Progresso mantido nesta partida");
    put("menuSaveText", saved ? "Seu progresso é salvo automaticamente neste navegador." : "Este navegador não permitiu salvar. Seu progresso continua ao trocar de área nesta partida.");

    const menu = game.phase === "menu";
    elements.gameShell.dataset.phase = game.phase;
    const ended = game.phase === "won" || game.phase === "lose";
    elements.menuScreen.hidden = !menu;
    elements.endScreen.hidden = !ended;
    elements.pauseBtn.disabled = menu || ended;

    if (menu) {
      const canContinue = !!game.hasSave && (game.needsRecovery || ["playing", "win_cutscene", "won"].includes(game.resumePhase));
      elements.continueBtn.hidden = !canContinue;
      elements.startBtn.classList.toggle("button-secondary", canContinue);
      put("startBtn", canContinue ? "Começar nova fazenda" : "Entrar na fazenda");
      put("continueBtn", game.needsRecovery ? 'Retomar do poleiro' : game.resumePhase === "won" ? "Voltar à comemoração" : "Continuar resgate");
      put("menuTitle", canContinue ? "De volta ao sítio" : "Bora abrir a porteira?");
      put("menuDescription", canContinue ? `${game.rescuedCount}/10 amigos a salvo${secretKnown ? ` · ${game.rescuedChicks}/6 pintinhos no ninho` : ""}. ${game.rescuedCount === 10 ? "A turma toda merece comemorar!" : "Seu resgate espera por você."}` : "O lobo está de ronda! Leve os dez amigos ao poleiro e siga os piados pelo caminho.");
    }
    if (ended) {
      const won = game.phase === "won";
      put('replayBtn', won ? 'Jogar novamente' : 'Retomar do poleiro');
      put("endEmblem", won ? "🐔 ♥" : "🐔");
      put("endEyebrow", won ? "FIM ♥" : "Ainda há uma nova chance");
      put("endTitle", won ? "Você conseguiu!" : "Vamos tentar de novo?");
      put("endMessage", won ? "Todos os seus amigos estão seguros! O lobo aprendeu: não se mexe com essa turma." : game.gameEndReason || "O lobo pegou você desta vez. Use os esconderijos para despistá-lo na próxima aventura.");
      put("endSummary", `${game.rescuedCount}/10 amigos${secretKnown ? ` · ${game.rescuedChicks}/6 pintinhos` : ""} · ${Math.max(0, Math.floor(game.score))} pontos · ${Math.max(0, game.lives)} vidas`);
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
    if (wolf.mode !== "patrol" && w.x > 65 && w.x < canvas.width - 65 && w.y > 93 && w.y < canvas.height + 20) {
      const color = ["chase", "inspect"].includes(wolf.mode) ? "#f6b9a4" : wolf.mode === "alert" ? "#ffe398" : "#cce2e6";
      const labels = { frightened: "THOR ME ASSUSTOU!", chase: "! PERSEGUINDO", alert: "? DESCONFIOU", investigate: "OUVIU ALGO", search: "PROCURANDO", inspect: "! TE VI ENTRAR" };
      panel(w.x - 60, w.y - 94, 120, wolf.mode === "alert" ? 33 : 25, "rgba(42, 57, 46, .92)");
      ctx.fillStyle = color; ctx.textAlign = "center"; ctx.font = "bold 10px sans-serif";
      ctx.fillText(labels[wolf.mode] || "", w.x, w.y - 77);
      if (wolf.mode === "alert") {
        ctx.fillStyle = "#627060"; ctx.fillRect(w.x - 43, w.y - 70, 86, 3);
        ctx.fillStyle = color; ctx.fillRect(w.x - 43, w.y - 70, 86 * clamp(wolf.awareness || 0, 0, 1), 3);
      }
      if (wolf.speechTime > 0 && wolf.speech && w.y > 137) {
        const sx = clamp(w.x, 116, canvas.width - 116);
        panel(sx - 108, w.y - 134, 216, 29, "rgba(255, 246, 224, .98)");
        ctx.fillStyle = ["chase", "inspect"].includes(wolf.mode) ? "#a63e31" : "#56533d";
        ctx.font = "bold 12px sans-serif"; ctx.fillText(wolf.speech, sx, w.y - 115);
      }
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
    if(game.thorNotice?.time>0)return {time:game.thorNotice.time,title:game.thorNotice.healed?"Thor chegou! +1 coração":"Thor chegou!",
      detail:game.thorNotice.healed?"O lobo levou um susto. Aproveite a ajuda!":"Corações cheios · o lobo levou um susto!"};
    if(game.skinNotice?.time>0)return {time:game.skinNotice.time,title:`Nova aparência: ${game.skinNotice.text}`,
      detail:game.secretNotice?.time>0?'Pintinho salvo! Sua recompensa está no baú.':'Já está no baú. Experimente quando quiser!'};
    if(game.secretNotice?.time>0)return {time:game.secretNotice.time,
      title:game.secretNotice.bonus?'Pintinho no ninho!':'Olha quem estava escondido!',
      detail:game.secretNotice.bonus?`+100 pontos · ${game.rescuedChicks} de 6 pintinhos`:'Chegue perto para levar o pequeno ao poleiro.'};
    if(game.rescueNotice?.time>0)return {time:game.rescueNotice.time,title:`${game.rescueNotice.name} a salvo!`,
      detail:`+100 pontos · ${game.rescueNotice.count} de ${game.rescueNotice.total} no poleiro`};
    return null;
  }

  return { initialize, update, render, activeNotice, showMenu, resume: resumeGame, focusCanvas };
})();
