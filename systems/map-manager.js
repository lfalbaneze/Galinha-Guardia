/* The original farm is a seamless world. Regions change without recreating entities. */
const MapManager = {
  generate(seed, version = 2) {
    const layout = WorldGenerator.generate(seed, version);
    WORLD.layout = layout; WORLD.areas = layout.areas; WORLD.paths = layout.paths;
    Object.assign(STRUCTURES, layout.structures);
    return layout;
  },
  paths: { id: "caminhos", name: "Caminhos da fazenda", x: 0, y: 0, w: 2800, h: 1800 },
  getRegion(x, y) {
    return WORLD.areas.find(a => x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) || MapManager.paths;
  },
  initialize(game) {
    const chicken = game.entities.chicken;
    game.currentMap = MapManager.getRegion(chicken.x, chicken.y).id;
    game.visitedMaps = new Set([game.currentMap]);
    game.mapTransition = { time: 0, name: "" };
    areaTextEl.textContent = MapManager.getRegion(chicken.x, chicken.y).name;
  },
  update(game, dt) {
    game.mapTransition.time = Math.max(0, game.mapTransition.time - dt);
    const chicken = game.entities.chicken;
    const region = MapManager.getRegion(chicken.x, chicken.y);
    chicken.areaId = region.id;
    game.entities.wolf.areaId = MapManager.getRegion(game.entities.wolf.x, game.entities.wolf.y).id;
    if (region.id !== game.currentMap) {
      game.currentMap = region.id;
      game.visitedMaps.add(region.id);
      game.mapTransition = { time: 2.5, name: region.name };
      GameManager.save(game);
    }
    areaTextEl.textContent = region.name;
  },
  draw(game) {
    // Straw nests and a worn yard replace the large translucent objective rectangles.
    ctx.save();
    for(let i=0;i<6;i++) {
      const p=worldPointToScreen(135+i*37,291);
      ctx.fillStyle='#715931';ctx.beginPath();ctx.ellipse(p.x,p.y,18,8,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#c8a55b';ctx.beginPath();ctx.ellipse(p.x,p.y-1,16,6,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#e2c779';
      for(let s=0;s<7;s++)ctx.fillRect(p.x-13+s*4,p.y+(s%3)-4,6,2);
    }
    const nest=worldPointToScreen(117,264),safe=worldPointToScreen(117,460);
    ctx.font='bold 11px Trebuchet MS, sans-serif';ctx.textAlign='left';
    for(const [p,label,width] of [[nest,'Ninho dos pequenos',126],[safe,'Turma a salvo',95]]) {
      ctx.fillStyle='#5e482e';ctx.fillRect(p.x-5,p.y-13,width,20);
      ctx.fillStyle='#f9e4ad';ctx.fillText(label,p.x,p.y+1);
    }
    ctx.restore();
  },
  drawTransition(game) {
    const t = game.mapTransition;
    if (!t || t.time <= 0 || game.phase !== "playing") return;
    ctx.save(); ctx.globalAlpha = Math.min(1, t.time);
    ctx.fillStyle = "rgba(249, 245, 223, .94)"; ctx.fillRect(290, 22, 310, 46);
    ctx.fillStyle = "#3c5a36"; ctx.textAlign = "center"; ctx.font = "bold 19px sans-serif";
    ctx.fillText(t.name, 445, 52); ctx.restore();
  },
};
