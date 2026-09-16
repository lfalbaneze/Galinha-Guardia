/* Speech reacts to observed AI state, without granting any new perception. */
const WolfDialogue = (() => {
  const lines = {
    chase: ["GRRR! VOLTA AQUI!", "NINGUÉM ME DESAFIA!", "EU VOU TE PEGAR!", "ESSA GALINHA ME PAGA!"],
    alert: ["Ei... quem está aí?", "Eu vi essas penas!"],
    investigate: ["Ouvi uns passinhos...", "Que barulho foi esse?"],
    search: ["Cadê aquela galinha?!", "GRRR... perdi a pista!", "Sai daí, sua danada!"],
    inspect: ["EU VI VOCÊ ENTRAR AÍ!", "EU SEI ONDE VOCÊ ESTÁ!", "TE ACHEI, GALINHA!"],
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
