/* A self-contained cartoon epilogue; gameplay collision and hunting are suspended. */
const EndGameSequence = (() => {
  const center = { x: 450, y: 275 };
  const timing = Object.freeze({ circle: 3.7, rush: 6.2, cloud: 7, dizzy: 10.8, flee: 13.6, celebrate: 16, done: 19 });
  const cast = game => [...game.entities.animals, ...(game.entities.chicks || []).filter(c => c.rescued)];
  function start(game) {
    game.phase = "win_cutscene";
    game.cutscene = { time: 0, done: false, stage: "arrival", cloud: false, impacts: [], attackers: [], speech: "" };
    const chicken = game.entities.chicken, wolf = game.entities.wolf;
    input.clear();
    Object.assign(chicken, { x: 450, y: 510, vx: 0, vy: 0, hidden: false, hideBlend: 0, invulnerable: 0,
      moving: false, sprinting: false, direction: "up", mood: "normal" });
    Object.assign(wolf, { ...center, vx: 0, vy: 0, injured: false, mode: "stopped", facing: -1,
      direction: "down", mood: "furious", moving: false });
    game.entities.effects = [];
    const friends = cast(game);
    for (const [i, animal] of friends.entries()) {
      animal.x = 75 + i * 750 / Math.max(1, friends.length - 1); animal.y = 440 + (i % 2) * 25;
      animal.moving = false; animal.direction = "up"; animal.mood = "normal";
      game.cutscene.attackers.push({ ref: animal, angle: Math.PI * 2 * i / friends.length });
    }
    camera.x = 0; camera.y = 0; camera.shake = 0; camera.shakeX = 0; camera.shakeY = 0;
    setStatus("Família reunida! Agora a turma tem uma conversa com o lobo…", "win");
    refreshHud();
  }
  function move(entity, x, y, dt, speed = 4) {
    const dx = x - entity.x, dy = y - entity.y;
    entity.moving = Math.hypot(dx, dy) > 1;
    if (entity.moving) Player.face(entity, dx, dy);
    entity.x = lerp(entity.x, x, Math.min(1, dt * speed));
    entity.y = lerp(entity.y, y, Math.min(1, dt * speed));
    entity.anim += dt * 7;
  }
  function openExitLane(game, dt) {
    // The grown-ups open a horseshoe below the wolf; chicks cheer above it.
    // This keeps the wolf's face and tear trail clear all the way to the right edge.
    for (const [index, animal] of game.entities.animals.entries()) {
      const angle = (32 + index * 176 / Math.max(1, game.entities.animals.length - 1)) * Math.PI / 180;
      move(animal, center.x + Math.cos(angle) * 240, center.y + Math.sin(angle) * 130, dt);
      animal.direction = "down";
    }
    const chicks = (game.entities.chicks || []).filter(c => c.rescued);
    for (const [index, chick] of chicks.entries()) {
      move(chick, 280 + index * 340 / Math.max(1, chicks.length - 1), 142, dt);
      chick.direction = "down";
    }
  }
  function update(game, dt) {
    const cut = game.cutscene;
    cut.time += dt;
    const t = cut.time, chicken = game.entities.chicken, wolf = game.entities.wolf;
    chicken.moving = false;
    wolf.moving = false;
    for (const animal of cast(game)) animal.moving = false;
    cut.cloud = t >= timing.cloud && t < timing.dizzy;
    chicken.anim += dt * 7;
    wolf.anim += dt * 5;
    if (t < 1.3) {
      cut.stage = "arrival";
      move(chicken, 450, 455, dt);
    } else if (t < timing.circle) {
      cut.stage = "message";
      chicken.direction = "down";
    } else if (t < timing.rush) {
      cut.stage = "circle";
      for (const a of cut.attackers) {
        const angle = a.angle + (t - timing.circle) * 0.12;
        move(a.ref, center.x + Math.cos(angle) * 230, center.y + Math.sin(angle) * 118, dt, 3.8);
        // A three-quarter turn keeps the angry eyebrows visible before the charge.
        a.ref.direction = a.ref.x < center.x ? "right" : "left";
      }
    } else if (t < timing.cloud) {
      cut.stage = "rush";
      for (const a of cut.attackers) {
        // The cloud appears before anyone reaches the wolf: no contact is shown.
        move(a.ref, center.x + Math.cos(a.angle) * 92, center.y + Math.sin(a.angle) * 84, dt, 4);
      }
    } else if (t < timing.dizzy) {
      cut.stage = "cloud";
      for (const a of cut.attackers) move(a.ref, center.x + Math.cos(a.angle) * 20, center.y, dt, 7);
    } else if (t < timing.flee) {
      cut.stage = "dizzy";
      wolf.x = center.x + Math.sin(t * 22) * 2; wolf.y = center.y; wolf.direction = "down";
      openExitLane(game, dt);
    } else if (t < timing.celebrate) {
      cut.stage = "flee";
      openExitLane(game, dt);
      const flight = t - timing.flee;
      wolf.x = center.x + flight * 370; wolf.y = center.y + Math.sin(flight * 18) * 3 - flight * 27;
      wolf.facing = 1; wolf.direction = "right"; wolf.moving = true;
      wolf.anim += dt * 16;
    } else {
      cut.stage = "celebrate";
      move(chicken, 450, 305, dt);
      for (const a of cut.attackers) {
        move(a.ref, 450 + Math.cos(a.angle) * 235, 305 + Math.sin(a.angle) * 120, dt);
        a.ref.direction = "down";
      }
      if (t >= timing.done) {
        chicken.direction = "down";
        for (const animal of cast(game)) { animal.direction = "down"; animal.moving = false; }
        cut.done = true; game.phase = "won";
        setStatus(`FIM ♥ ${game.entities.animals.length} amigos a salvo${game.rescuedChicks ? ` e ${game.rescuedChicks} pintinhos de bônus` : ''}!`, "win");
        GameManager.save(game);
      }
    }
    const angry = ["circle", "rush", "cloud"].includes(cut.stage);
    chicken.mood = angry ? "angry" : "normal";
    for (const animal of cast(game)) animal.mood = angry ? "angry" : "normal";
    wolf.mood = ["dizzy", "flee", "celebrate"].includes(cut.stage) ? "crying" : "furious";
    cut.speech = cut.stage === "dizzy" ? (t < timing.dizzy + 1.4 ? "BUÁÁÁ! Eu só estava brincando!" : "MAMÃÃÃE! Vem me buscar!") :
      cut.stage === "flee" ? "MAMÃE! EU QUERO COLO!" : "";
  }
  function active(game) {
    return game.phase === "win_cutscene" || game.phase === "won" ||
      (game.phase === "menu" && ["win_cutscene", "won"].includes(game.resumePhase));
  }
  function drawBackdrop(game) {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#d8edc1"); gradient.addColorStop(1, "#a7cc83");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#b9d397";
    ctx.beginPath(); ctx.ellipse(450, 330, 340, 165, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#efe4bc";
    ctx.beginPath(); ctx.ellipse(450, 300, 262, 153, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#bd9368"; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(30, 170); ctx.lineTo(180, 170); ctx.moveTo(720, 170); ctx.lineTo(870, 170); ctx.stroke();
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = "#dfbc8b";
      ctx.fillRect(30 + i * 17, 138, 8, 65); ctx.fillRect(718 + i * 17, 138, 8, 65);
    }
    for (let i = 0; i < 28; i++) {
      const x = 30 + (i * 137) % 840, y = 410 + i * 19 % 97;
      ctx.fillStyle = i % 2 ? "#fff4c1" : "#e8b4bb";
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#477246"; ctx.textAlign = "center"; ctx.font = "bold 16px sans-serif";
    ctx.fillText("♥ REFÚGIO DA FAZENDA ♥", 450, 490);
  }
  function star(x, y, radius, color = "#ffd967") {
    ctx.fillStyle = color; ctx.strokeStyle = "#c99b43"; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? radius * 0.45 : radius;
      if (i === 0) ctx.moveTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
      else ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  function cloud(t) {
    const pulse = Math.sin(t * 17) * 5;
    const beat = Math.floor((t - timing.cloud) * 4);
    ctx.save(); ctx.translate(center.x + Math.sin(t * 23) * 5, center.y + Math.cos(t * 19) * 3);
    // Little dust rings and flying feathers sell the bustle without exposing a hit.
    for (let i = 0; i < 8; i++) {
      const life = ((t * 1.9 + i / 8) % 1), angle = i * Math.PI / 4 + 0.2;
      ctx.globalAlpha = (1 - life) * 0.6;
      ctx.strokeStyle = "#e0d3ab"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(Math.cos(angle) * (130 + life * 62), Math.sin(angle) * (78 + life * 42), 5 + life * 13, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(112, 107, 87, .15)";
    ctx.beginPath(); ctx.ellipse(0, 75, 160, 33, 0, 0, Math.PI * 2); ctx.fill();
    // Opaque core plus lobes keeps every character and all contact concealed.
    ctx.fillStyle = "#fffdf1"; ctx.strokeStyle = "#b6b3a4"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, 0, 122 + pulse, 77, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 11; i++) {
      const angle = i * Math.PI * 2 / 11;
      const x = Math.cos(angle) * (97 + pulse), y = Math.sin(angle) * 59;
      ctx.fillStyle = i % 3 ? "#fffdf1" : "#eeeade";
      ctx.beginPath(); ctx.arc(x, y, 34 + Math.sin(t * 12 + i) * 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = "#fffdf1"; ctx.beginPath(); ctx.ellipse(0, 0, 100, 65, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 8; i++) {
      const angle = t * 1.1 + i * Math.PI / 4;
      const x = Math.cos(angle) * (155 + Math.sin(t * 7 + i) * 10), y = Math.sin(angle) * 110;
      if (i % 2) star(x, y, 11 + Math.sin(t * 10 + i) * 3);
      else {
        ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
        ctx.fillStyle = i === 2 ? "#ffe289" : "#fffaf0"; ctx.strokeStyle = "#bca780"; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.ellipse(0, 0, 6, 15, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 15); ctx.lineTo(0, -8); ctx.stroke();
        ctx.restore();
      }
    }
    ctx.save(); ctx.rotate(Math.sin(t * 12) * 0.12);
    ctx.textAlign = "center"; ctx.font = "900 36px 'Trebuchet MS', sans-serif";
    ctx.strokeStyle = "#fff6c7"; ctx.lineWidth = 7;
    const pop = ["POF!", "PAF!", "PUF!", "PLOC!"][beat % 4];
    ctx.strokeText(pop, pulse, 12); ctx.fillStyle = ["#bf7450", "#a56755", "#ac7849", "#95704f"][beat % 4];
    ctx.fillText(pop, pulse, 12); ctx.restore();
    ctx.restore();
  }
  function speechBubble(game) {
    const wolf = game.entities.wolf;
    const fleeing = game.cutscene.stage === "flee";
    const x = clamp(wolf.x, 210, 690), y = 161, width = 360, height = 49;
    ctx.fillStyle = "rgba(83, 80, 75, .16)";
    ctx.beginPath(); ctx.roundRect(x - width / 2 + 3, y + 3, width, height, 14); ctx.fill();
    ctx.fillStyle = "#fffef4"; ctx.strokeStyle = "#8794a0"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x - width / 2, y, width, height, 14); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 11, y + height - 1); ctx.lineTo(x + 8, y + height + 14);
    ctx.lineTo(x + 14, y + height - 1); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#526b89"; ctx.textAlign = "center"; ctx.font = `bold ${fleeing ? 23 : 20}px 'Trebuchet MS', sans-serif`;
    ctx.fillText(game.cutscene.speech, x, y + 31);
  }
  function draw(game) {
    const cut = game.cutscene, t = cut.time;
    const texts = {
      arrival: ["A turma está a salvo!", game.rescuedChicks ? `Dez amigos, ${game.rescuedChicks} pintinhos e coragem de sobra.` : "Dez amigos e uma galinha cheia de coragem."],
      message: ["O lobo ainda quer bancar o valentão…", "Lobo: “GRRR! Ainda não acabou! Voltem aqui!”"],
      circle: ["Ninguém mexe com a nossa família!", "Lobo: “Esse olhar… Vocês estão MUITO bravos, né?”"],
      rush: ["Agora é com a turma!", "Lobo: “Ei! Dezesseis contra um? MAM—”"],
      cloud: ["Penas, patinhas e uma bela confusão!", ["Lobo: “AI! O meu orgulho!”", "Lobo: “Tá bom! Eu paro de perseguir galinhas!”", "Lobo: “Socorro! Cadê a minha mãe?!”"][Math.floor((t - timing.cloud) / 1.3) % 3]],
      dizzy: ["Cadê aquele lobo tão bravo?", "Agora só quer um lencinho… e a mamãe."],
      flee: ["Lá vai ele, chorando pela mamãe!", "Lobo: “BUÁÁÁ! Mãe, eles não querem brincar comigo!”"],
      celebrate: [`Amizade: ${cut.attackers.length}. Lobo: zero!`, "Uma família inteira para comemorar com você. ♥"],
    };
    const [title, subtitle] = texts[cut.stage] || texts.celebrate;
    ctx.fillStyle = "rgba(255, 251, 230, .96)"; ctx.fillRect(50, 22, 800, 83);
    ctx.textAlign = "center"; ctx.fillStyle = "#365d3b"; ctx.font = "bold 27px sans-serif";
    ctx.fillText(title, 450, 57); ctx.font = "17px sans-serif"; ctx.fillText(subtitle, 450, 86);
    if (cut.cloud) cloud(t);
    if (cut.stage === "circle" || cut.stage === "rush") {
      ctx.fillStyle = "#fff9df"; ctx.beginPath(); ctx.ellipse(484, 221, 22, 18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#9b5750"; ctx.font = "bold 23px sans-serif"; ctx.fillText(cut.stage === "rush" ? "!!" : "?!", 484, 229);
    }
    if (cut.stage === "dizzy") {
      for (let i = 0; i < 4; i++) star(center.x + Math.cos(t * 3 + i * Math.PI / 2) * 42,
        center.y - 36 + Math.sin(t * 3 + i * Math.PI / 2) * 10, 8);
    }
    if (cut.speech) speechBubble(game);
    if (cut.stage === "celebrate") {
      for (let i = 0; i < 26; i++) {
        const x = 100 + i * 131 % 720, y = 130 + ((t - timing.celebrate) * 65 + i * 23) % 330;
        ctx.fillStyle = ["#d8889b", "#f9e193", "#78acb4", "#a6bb6d"][i % 4];
        ctx.fillRect(x, y, 5, 9);
      }
    }
  }
  return { start, update, active, drawBackdrop, draw, timing };
})();
