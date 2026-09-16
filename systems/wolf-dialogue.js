/* Speech reacts to observed AI state, without granting any new perception. */
const WolfDialogue = (() => {
  const lines = {
    chase: ["Grrr! Volta aqui!", "Pode correr. Eu vou atrás!", "Hoje eu não fico sem almoço!", "Essa turma me paga!"],
    alert: ["Opa… quem passou ali?", "Eu vi alguma coisa…"],
    investigate: ["Esses passos não me enganam…", "Tem alguém por aqui."],
    search: ["Cadê? Tava aqui agora!", "Grrr… perdi o rastro!", "Pode sair. Eu espero."],
    inspect: ["Eu vi você entrar!", "Nem adianta se encolher!", "Te achei!"],
  };
  function update(game, dt) {
    const wolf = game.entities.wolf;
    wolf.speechTime = Math.max(0, (wolf.speechTime || 0) - dt);
    wolf.speechCooldown = Math.max(0, (wolf.speechCooldown || 0) - dt);
    const changed = wolf.speechMode !== wolf.mode;
    wolf.speechMode = wolf.mode;
    if (!lines[wolf.mode] || wolf.huntUnlockTimer > 0) return;
    if ((changed && wolf.mode === "chase") || wolf.speechCooldown <= 0) {
      const choices = lines[wolf.mode];
      wolf.speechIndex = (wolf.speechIndex || 0) + 1;
      wolf.speech = choices[(wolf.speechIndex - 1) % choices.length];
      wolf.speechTime = 2.1;
      wolf.speechCooldown = 5;
    }
  }
  return { update };
})();
