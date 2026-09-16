/* DOM presentation and focus belong here; simulation stays in the game systems. */
const GameUI = (() => {
  const elements = {};
  const wolfLevels = ["Atento", "Farejador", "Feroz", "Implacável"];
  const wolfModes = { patrol: "patrulhando", alert: "desconfiado", investigate: "investigando ruído", search: "procurando", chase: "perseguindo", inspect: "viu o esconderijo!" };
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
    resetGame();
    AudioSystem.sync(state);
    AudioSystem.unlock();
    update(state);
    focusCanvas();
  }

  function resumeGame() {
    if (!state || !state.hasSave) return;
    state.phase = state.resumePhase || "playing";
    input.clear();
    AudioSystem.sync(state);
    AudioSystem.unlock();
    update(state);
    if (state.phase !== "won" && state.phase !== "lose") focusCanvas();
  }

  function initialize() {
    if (initialized) return;
    initialized = true;
    AudioControls.initialize();
    const ids = ["gameCanvas", "menuScreen", "menuTitle", "menuDescription", "menuSaveText", "endScreen", "endTitle", "endMessage", "endSummary", "endEmblem", "endEyebrow", "startBtn", "continueBtn", "pauseBtn", "replayBtn", "menuBtn", "hiddenText", "contextHint", "wolfLevelText", "wolfStateText", "saveText", "staminaMeter", "staminaText", "chicksCount", "wolfMultiplier", "skinUnlockText", ...SkinSystem.catalog.map(s => `skin-${s.id}`)];
    for (const id of ids) elements[id] = document.getElementById(id);
    elements.menuSkinSelect = document.getElementById("menuSkinSelect");
    for (const skin of SkinSystem.catalog) elements[`menu-skin-${skin.id}`] = document.getElementById(`menu-skin-${skin.id}`);
    elements.startBtn.addEventListener("click", newGame);
    elements.replayBtn.addEventListener("click", newGame);
    elements.continueBtn.addEventListener("click", resumeGame);
    elements.pauseBtn.addEventListener("click", () => {
      if (state.phase === "menu") resumeGame();
      else showMenu(state);
    });
    elements.menuBtn.addEventListener("click", () => showMenu(state));
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
      if (event.key !== "Tab") return;
      const overlay = !elements.menuScreen.hidden ? elements.menuScreen : !elements.endScreen.hidden ? elements.endScreen : null;
      if (!overlay) return;
      const buttons = [...overlay.querySelectorAll("button, select, input, summary")].filter(button =>
        !button.hidden && !button.disabled && !(button.tagName !== "SUMMARY" && button.closest?.("details:not([open])")));
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
    input.clear();
    AudioSystem.sync(game);
    GameManager.save(game);
    update(game);
  }

  function update(game) {
    if (!initialized) initialize();
    AudioControls.update(game);
    const chicken = game.entities.chicken;
    const wolf = game.entities.wolf;
    const hidden = !!chicken.hidden;
    const exposed = WolfAI.isExposed(game);
    const sprinting = !!chicken.sprinting;
    const candidate = chicken.hidingCandidate;
    const playing = game.phase === "playing";
    put("chicksCount", game.rescuedChicks);
    put("wolfMultiplier", `${WolfAI.getConfig(game).chickMultiplier.toFixed(2).replace(".", ",")}×`);
    for (const skin of SkinSystem.catalog) {
      const button = elements[`skin-${skin.id}`], available = SkinSystem.unlocked(skin.id);
      const selected = chicken.skin === skin.id;
      button.disabled = !available;
      button.dataset.active = String(selected);
      button.setAttribute("aria-pressed", String(selected));
      put(`skin-${skin.id}`, available ? `${skin.name}${selected ? " · usando" : ""}` : `${skin.name} · ${skin.requirement}`);
      const option = elements[`menu-skin-${skin.id}`];
      option.disabled = !available;
      put(`menu-skin-${skin.id}`, available ? skin.name : `${skin.name} · ${skin.requirement}`);
    }
    elements.menuSkinSelect.value = chicken.skin;
    const availableSkins = SkinSystem.catalog.filter(s => s.chicks > 0 && SkinSystem.unlocked(s.id)).length;
    put("skinUnlockText", `${availableSkins} / 4 trajes no baú${SkinSystem.storageAvailable ? "" : " · nesta sessão"}`);
    put("hiddenText", exposed ? "Ele viu você!" : hidden ? "Escondida" : chicken.sneaking ? "De mansinho" : sprinting ? "Correndo" : "À vista");
    elements.hiddenText.dataset.state = exposed ? "exposed" : hidden ? "hidden" : sprinting ? "sprinting" : "visible";
    put("contextHint", !playing ? (game.phase === "menu" ? "A fazenda espera por você." : "Juntos, os amigos ficam mais fortes.") : exposed ? "Ele viu você entrar! Saia com E ou movimento e quebre a visão." : hidden ? "E para sair. Recupere o fôlego e espere a busca passar." : candidate ? "E para se esconder. Quebre a visão do lobo primeiro!" : chicken.exhausted && input.has("shift") ? "Solte Shift para voltar a correr quando recuperar o fôlego." : sprinting ? "Correr assusta os bichos e pode chamar o lobo." : wolf.mode === "alert" ? "O lobo desconfia! Saia da vista antes que a barra encha." : "Segure C para chegar de mansinho. Se fugirem, espere cansar!");
    elements.staminaMeter.value = chicken.stamina;
    elements.staminaMeter.parentElement.dataset.tired = String(chicken.exhausted);
    put("staminaText", chicken.exhausted ? "Recuperando" : "Fôlego");
    put("wolfLevelText", wolfLevels[game.wolfLevel] || wolfLevels[0]);
    put("wolfStateText", game.phase === "won" || game.phase === "win_cutscene" ? "surpreendido!" : wolfModes[wolf.mode] || "patrulhando");
    elements.wolfStateText.parentElement.dataset.mode = wolf.mode || "patrol";
    const saved = GameManager.storageAvailable;
    put("saveText", saved ? "Anotado na caderneta" : "Progresso mantido nesta partida");
    put("menuSaveText", saved ? "Seu progresso é salvo automaticamente neste navegador." : "Este navegador não permitiu salvar. Seu progresso continua ao trocar de área nesta partida.");

    const menu = game.phase === "menu";
    const ended = game.phase === "won" || game.phase === "lose";
    elements.menuScreen.hidden = !menu;
    elements.endScreen.hidden = !ended;
    elements.pauseBtn.disabled = menu || ended;

    if (menu) {
      const canContinue = !!game.hasSave && ["playing", "win_cutscene", "won"].includes(game.resumePhase);
      elements.continueBtn.hidden = !canContinue;
      elements.startBtn.classList.toggle("button-secondary", canContinue);
      put("startBtn", canContinue ? "Gerar nova fazenda" : "Abrir a porteira");
      put("continueBtn", game.resumePhase === "won" ? "Voltar à comemoração" : "Voltar pro terreiro");
      put("menuTitle", canContinue ? "Um cafezinho na varanda." : "Deu a louca no terreiro!");
      put("menuDescription", canContinue ? `${game.rescuedCount}/10 amigos e ${game.rescuedChicks}/6 pintinhos a salvo. Continue a missão ou gere outra fazenda. Seus trajes ficam no baú.` : "O lobo chegou, mas ninguém acredita! Ache 10 amigos e 6 pintinhos, alcance os teimosos e leve a turma ao Poleiro.");
    }
    if (ended) {
      const won = game.phase === "won";
      put("endEmblem", won ? "🐔 ♥" : "🐔");
      put("endEyebrow", won ? "FIM ♥" : "Ainda há uma nova chance");
      put("endTitle", won ? "Você conseguiu!" : "Vamos tentar de novo?");
      put("endMessage", won ? "Todos os seus amigos estão seguros! O lobo aprendeu: não se mexe com essa turma." : game.gameEndReason || "O lobo pegou você desta vez. Use os esconderijos para despistá-lo na próxima aventura.");
      put("endSummary", `${game.rescuedCount}/10 amigos · ${game.rescuedChicks}/6 pintinhos · ${Math.max(0, Math.floor(game.score))} pontos · ${Math.max(0, game.lives)} vidas`);
    }
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
        const by = at.y - 83;
        panel(bx, by, width, 30, "#fff3ce");
        ctx.fillStyle = "#fff3ce"; ctx.beginPath(); ctx.moveTo(at.x-5,by+29); ctx.lineTo(at.x+5,by+29); ctx.lineTo(at.x,by+36); ctx.fill();
        ctx.fillStyle = "#663d28"; ctx.textAlign = "center";
        ctx.fillText(animal.speech, bx + width / 2, by + 20, width - 14);
      }
      if (animal.temper === "tired") {
        panel(at.x - 35, at.y + 20, 70, 20, "#365343");
        ctx.font = "bold 11px Trebuchet MS, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#fff0b5";
        ctx.fillText("UFA! PEGA!", at.x, at.y + 34);
      }
    }
    // Brief, local feedback ties each state to the character causing it.
    if (wolf.mode !== "patrol" && w.x > 65 && w.x < canvas.width - 65 && w.y > 93 && w.y < canvas.height + 20) {
      const color = ["chase", "inspect"].includes(wolf.mode) ? "#f6b9a4" : wolf.mode === "alert" ? "#ffe398" : "#cce2e6";
      const labels = { chase: "! PERSEGUINDO", alert: "? DESCONFIOU", investigate: "OUVIU ALGO", search: "PROCURANDO", inspect: "! TE VI ENTRAR" };
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
    if (game.rescueNotice?.time > 0) {
      const notice = game.rescueNotice;
      ctx.globalAlpha = Math.min(1, notice.time * 2);
      panel(canvas.width / 2 - 147, 14, 294, 43, "rgba(255, 251, 227, .96)");
      ctx.textAlign = "center"; ctx.fillStyle = "#3d693e"; ctx.font = "bold 14px sans-serif";
      ctx.fillText(`${notice.name} a salvo!`, canvas.width / 2, 33);
      ctx.font = "11px sans-serif"; ctx.fillStyle = "#697548";
      ctx.fillText(`+100 pontos  ·  ${notice.count} de ${notice.total || 10} ${notice.chick ? "pintinhos" : "amigos"}`, canvas.width / 2, 48);
    }
    if (game.skinNotice?.time > 0) {
      ctx.globalAlpha = Math.min(1, game.skinNotice.time);
      panel(canvas.width - 326, canvas.height - 63, 310, 47, "rgba(255, 241, 186, .98)");
      ctx.fillStyle = "#76552f"; ctx.textAlign = "center"; ctx.font = "bold 14px sans-serif";
      ctx.fillText(`ACHADO NO BAÚ: ${game.skinNotice.text.toUpperCase()}`, canvas.width - 171, canvas.height - 43);
      ctx.font = "11px sans-serif";
      ctx.fillText("Vista seu novo traje no baú abaixo", canvas.width - 171, canvas.height - 25);
    }
    ctx.restore();
  }

  return { initialize, update, render, showMenu, resume: resumeGame, focusCanvas };
})();
