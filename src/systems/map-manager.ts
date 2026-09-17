/* The original farm is a seamless world. Regions change without recreating entities. */
const MapManager = {
  generate(seed: number, version = 4): Farm.Layout {
    const layout = WorldGenerator.generate(seed, version);
    WORLD.layout = layout; WORLD.areas = layout.areas; WORLD.paths = layout.paths;
    Object.assign(STRUCTURES, {stables:[],troughs:[],paddockFences:[]}, layout.structures);
    return layout;
  },
  paths: { id: "caminhos", name: "Caminhos da fazenda", x: 0, y: 0, w: 2800, h: 1800 },
  getRegion(x: number, y: number): Farm.Area {
    return WORLD.areas.find(a => x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) || MapManager.paths;
  },
  initialize(game: Farm.GameState): void {
    const chicken = game.entities.chicken;
    game.currentMap = MapManager.getRegion(chicken.x, chicken.y).id;
    game.visitedMaps = new Set([game.currentMap]);
    game.mapTransition = { time: 0, name: "" };
    areaTextEl.textContent = MapManager.getRegion(chicken.x, chicken.y).name;
  },
  update(game: Farm.GameState, dt: number): void {
    if (game.phase !== "playing" || !Number.isFinite(dt) || dt < 0) return;
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
  draw(game: Farm.GameState): void {
    FarmRefuge.drawGround(ctx,camera);
  },
  drawTransition(game: Farm.GameState): void {
    const t = game.mapTransition;
    if (!t || t.time <= 0 || game.phase !== "playing") return;
    ctx.save(); ctx.globalAlpha = Math.min(1, t.time);
    ctx.fillStyle = "rgba(249, 245, 223, .94)"; ctx.fillRect(290, 22, 310, 46);
    ctx.fillStyle = "#3c5a36"; ctx.textAlign = "center"; ctx.font = "bold 19px sans-serif";
    ctx.fillText(t.name, 445, 52); ctx.restore();
  },
};
