/* Cover has an entrance animation, a foreground layer and an in-world status. */
const HidingSpots = (() => {
  let spots = [];
  const labels = { hay: "no feno", tree: "na árvore", bush: "na vegetação" };
  function initialize(layout = WORLD.layout) {
    spots = STRUCTURES.hayBales.map((b, i) => ({ id: `hay-${i}`, type: "hay",
      x: b.x - 34, y: b.y - 34, w: b.w + 68, h: b.h + 68, bale: b }));
    for (const [index, spot] of (layout?.vegetation || []).entries()) {
      spots.push({ ...spot, id: spot.id || `green-${index}` });
    }
  }
  function contains(spot, chicken) {
    return chicken.x >= spot.x + 8 && chicken.x <= spot.x + spot.w - 8 &&
      chicken.y >= spot.y + 8 && chicken.y <= spot.y + spot.h - 8;
  }
  function candidate(chicken) {
    return spots.find(s => s.id === chicken.hidingSpotId && contains(s, chicken)) ||
      spots.find(s => contains(s, chicken)) || null;
  }
  function toggle(game) {
    if (game.phase !== "playing") return;
    const chicken = game.entities.chicken;
    if (chicken.hidden) {
      chicken.hidden = false; chicken.hidingSpotId = null;
      setStatus("Você saiu do esconderijo. Cuidado com o lobo!");
      GameUI.update(game);
      return;
    }
    const spot = candidate(chicken);
    if (!spot) {
      chicken.hideHintTimer = 2.5;
      setStatus("Entre na vegetação ou chegue junto ao feno. O aviso E aparece quando você pode se esconder.");
      return;
    }
    WolfAI.witnessHide(game, spot);
    chicken.hidden = true; chicken.hidingSpotId = spot.id; chicken.hidingCandidate = spot.id;
    AudioSystem.play("pop", { volume: 0.35 });
    chicken.vx = 0; chicken.vy = 0; chicken.moving = false; chicken.sprinting = false; chicken.state = "idle";
    // A fresh directional press deliberately leaves cover; a key held before E does not.
    input.clear();
    setStatus(WolfAI.isExposed(game) ? "ELE VIU VOCÊ ENTRAR! Saia e quebre a visão do lobo!" :
      `Escondida ${labels[spot.type] || "aqui"}! Sua entrada passou despercebida.`);
    spawnBurst(chicken.x, chicken.y, spot.type === "hay" ? "#ebc774" : "#94ba71", 9);
    GameUI.update(game); GameManager.save(game);
  }
  function update(game, dt = 0) {
    const chicken = game.entities.chicken, spot = candidate(chicken);
    chicken.hidingCandidate = spot ? spot.id : null;
    if (!spot || spot.id !== chicken.hidingSpotId) { chicken.hidden = false; chicken.hidingSpotId = null; }
    chicken.hideBlend = lerp(chicken.hideBlend || 0, chicken.hidden ? 1 : 0, Math.min(1, dt * 12));
    chicken.hideHintTimer = Math.max(0, (chicken.hideHintTimer || 0) - dt);
  }
  function restore(game, saved) {
    const chicken = game.entities.chicken, spot = spots.find(s => s.id === saved.hidingSpotId);
    chicken.hidden = saved.hidden === true && !!spot && contains(spot, chicken);
    chicken.hidingSpotId = chicken.hidden ? spot.id : null;
    chicken.hideBlend = chicken.hidden ? 1 : 0;
    update(game);
  }
  function drawForeground(game) {
    const chicken = game.entities.chicken;
    if (!chicken.hidden && (chicken.hideBlend || 0) < 0.02) return;
    const spot = spots.find(s => s.id === chicken.hidingSpotId) || candidate(chicken);
    if (spot) FarmArt.drawCoverForeground(ctx, spot, camera, Math.max(0.35, chicken.hideBlend || 0), chicken);
  }
  function pill(x, y, width, title, detail, hidden, exposed = false) {
    x = clamp(x, width / 2 + 12, canvas.width - width / 2 - 12);
    y = clamp(y, 20, canvas.height - 75);
    ctx.save(); ctx.translate(x, y);
    ctx.shadowColor = "rgba(29, 53, 33, .2)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    ctx.fillStyle = exposed ? "#8b302b" : hidden ? "#245a43" : "#fffae9";
    ctx.strokeStyle = exposed ? "#ffd19e" : hidden ? "#bbdfa0" : "#8c9770"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(-width / 2, 0, width, 53, 13); ctx.fill(); ctx.stroke();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = hidden ? "#f4ffda" : "#3c563b";
    ctx.textAlign = "center"; ctx.font = "bold 15px sans-serif"; ctx.fillText(title, 0, 21);
    ctx.font = "12px sans-serif"; ctx.fillStyle = hidden ? "#d6e9c1" : "#6a735e";
    ctx.fillText(detail, 0, 40); ctx.restore();
  }
  function drawIndicators(game) {
    if (game.phase !== "playing") return;
    const chicken = game.entities.chicken, p = worldToScreen(chicken), spot = candidate(chicken);
    const exposed = WolfAI.isExposed(game);
    if (spot) {
      ctx.save(); ctx.strokeStyle = exposed ? "#ff956c" : chicken.hidden ? "#e6f6be" : "#fff6bf";
      ctx.lineWidth = 2.5; ctx.setLineDash(chicken.hidden ? [] : [5, 5]);
      ctx.beginPath(); ctx.ellipse(worldX(spot.x + spot.w / 2), worldY(spot.y + spot.h / 2) + 8,
        spot.w / 2 - 4, spot.h / 2, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    if (chicken.hidden) {
      pill(p.x, p.y - 110, exposed ? 250 : 208, exposed ? "ELE VIU VOCÊ!" : "ESCONDIDA",
        exposed ? "Saia e quebre a visão do lobo" : "E ou movimento para sair", true, exposed);
      ctx.fillStyle = exposed ? "#8b302b" : "#245a43"; ctx.beginPath(); ctx.roundRect(16, canvas.height - 49, exposed ? 350 : 310, 33, 10); ctx.fill();
      ctx.fillStyle = "#effadb"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "left";
      ctx.fillText(exposed ? "Esconderijo descoberto · fuja agora!" : "Protegida pela cobertura · fique quietinha", 29, canvas.height - 27);
    } else if (spot) {
      pill(p.x, p.y - 104, 216, "E  ·  ESCONDER", `Aconchegue-se ${labels[spot.type]}`, false);
    } else if (chicken.hideHintTimer > 0) {
      pill(p.x, p.y - 104, 238, "Procure feno ou folhas", "Chegue perto para aparecer o E", false);
    }
  }
  return { initialize, candidate, toggle, update, restore, drawForeground, drawIndicators,
    getSpots: () => spots, obstacles: () => spots.filter(s => s.blockingRect).map(s => s.blockingRect) };
})();
