
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = true;

const rescuedCountEl = document.getElementById("rescuedCount");
const livesCountEl = document.getElementById("livesCount");
const scoreCountEl = document.getElementById("scoreCount");
const areaTextEl = document.getElementById("areaText");
const statusTextEl = document.getElementById("statusText");
const difficultySelect = document.getElementById("difficultySelect");
const restartBtn = document.getElementById("restartBtn");

const input = new Set();
const MAX_LIVES = 3;
const SCORE_PER_RESCUE = 100;
const SCORE_PENALTY_LOSS = 40;
const SCORE_BONUS_PER_LIFE = 250;

const DIFFICULTIES = {
  easy: {
    label: "Fácil",
    chickenSpeed: 335,
    wolfMaxSpeed: 160,
    wolfAccel: 230,
    wolfPauseAfterCatch: 1.1,
    huntDelay: 10,
    spawnPlan: ["poleiro", "poleiro", "quintal", "quintal", "granja", "horta", "estabulo", "quintal", "poleiro", "granja"],
    minSpawnWolfDistance: 470,
  },
  normal: {
    label: "Médio",
    chickenSpeed: 300,
    wolfMaxSpeed: 205,
    wolfAccel: 330,
    wolfPauseAfterCatch: 0.7,
    huntDelay: 6,
    spawnPlan: ["poleiro", "granja", "estabulo", "horta", "quintal", "poleiro", "granja", "estabulo", "horta", "quintal"],
    minSpawnWolfDistance: 330,
  },
  hard: {
    label: "Difícil",
    chickenSpeed: 276,
    wolfMaxSpeed: 240,
    wolfAccel: 420,
    wolfPauseAfterCatch: 0.35,
    huntDelay: 2.4,
    spawnPlan: ["granja", "granja", "estabulo", "estabulo", "horta", "horta", "quintal", "quintal", "poleiro", "granja"],
    minSpawnWolfDistance: 220,
  },
};

const WORLD = {
  width: 2800,
  height: 1800,
  targetRescues: 10,
  targetChicks: 6,
  safeZone: { x: 210, y: 188, r: 130 },
  areas: [
    { id: "poleiro", name: "Poleiro", x: 80, y: 70, w: 760, h: 440, base: "#4f9a57", line: "#5a3f27", mark: "#44ce80" },
    { id: "granja", name: "Granja", x: 1940, y: 90, w: 760, h: 500, base: "#5da560", line: "#7a5a32", mark: "#56dc7f" },
    { id: "estabulo", name: "Estábulo", x: 1940, y: 1110, w: 760, h: 560, base: "#599859", line: "#694e30", mark: "#52c675" },
    { id: "horta", name: "Horta", x: 120, y: 1130, w: 780, h: 560, base: "#4f964f", line: "#6d4d2a", mark: "#53d07a" },
    { id: "quintal", name: "Quintal Central", x: 840, y: 520, w: 1100, h: 720, base: "#5ba35c", line: "#725332", mark: "#53cb79" },
  ],
  paths: [
    { x: 390, y: 470, w: 2210, h: 100 },
    { x: 390, y: 1320, w: 2220, h: 100 },
    { x: 980, y: 540, w: 110, h: 876 },
    { x: 1706, y: 540, w: 110, h: 876 },
  ],
};

const SPECIES = ["sheep", "pig", "goat", "cow", "duck", "rabbit", "dog", "cat", "donkey", "lamb"];

const STRUCTURES = {
  coops: [
    { x: 220, y: 178, w: 130, h: 90 },
    { x: 390, y: 230, w: 120, h: 84 },
    { x: 590, y: 160, w: 120, h: 84 },
  ],
  silos: [
    { x: 2060, y: 190, w: 90, h: 170 },
    { x: 2210, y: 210, w: 90, h: 170 },
  ],
  hayBales: [
    { x: 2030, y: 1240, w: 74, h: 46 },
    { x: 2140, y: 1300, w: 74, h: 46 },
    { x: 2250, y: 1240, w: 74, h: 46 },
    { x: 2350, y: 1330, w: 74, h: 46 },
    { x: 2450, y: 1245, w: 74, h: 46 },
    { x: 2550, y: 1330, w: 74, h: 46 },
  ],
  pond: { x: 1420, y: 780, w: 240, h: 160 },
  barn: { x: WORLD.safeZone.x - 95, y: WORLD.safeZone.y - 150, w: 190, h: 112 },
};

let OBSTACLES = [];
let state;
let camera;
let lastTime = 0;
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getAreaAt(x, y) {
  for (const area of WORLD.areas) {
    if (x >= area.x && x <= area.x + area.w && y >= area.y && y <= area.y + area.h) {
      return area;
    }
  }
  return WORLD.areas[4];
}

function getDifficultyKey() {
  const key = difficultySelect.value;
  return DIFFICULTIES[key] ? key : "normal";
}

function worldX(x) {
  return x - camera.x + camera.shakeX;
}

function worldY(y) {
  return y - camera.y + camera.shakeY;
}

function worldPointToScreen(x, y) {
  return { x: worldX(x), y: worldY(y) };
}

function worldToScreen(entity) {
  return worldPointToScreen(entity.x, entity.y);
}

function buildObstacles() {
  HidingSpots.initialize();
  const list = [...HidingSpots.obstacles()];

  for (const coop of STRUCTURES.coops) {
    list.push({ x: coop.x, y: coop.y, w: coop.w, h: coop.h, type: "coop" });
  }
  for (const silo of STRUCTURES.silos) {
    list.push({ x: silo.x, y: silo.y, w: silo.w, h: silo.h, type: "silo" });
  }
  for (const bale of STRUCTURES.hayBales) {
    list.push({ x: bale.x, y: bale.y, w: bale.w, h: bale.h, type: "hay" });
  }

  list.push({ x: STRUCTURES.pond.x + 20, y: STRUCTURES.pond.y + 20, w: STRUCTURES.pond.w - 40, h: STRUCTURES.pond.h - 40, type: "pond" });
  list.push({ x: STRUCTURES.barn.x, y: STRUCTURES.barn.y, w: STRUCTURES.barn.w, h: STRUCTURES.barn.h, type: "barn" });

  OBSTACLES = list;
}

function makeEntity(id, type, x, y, radius) {
  return {
    id,
    type,
    x,
    y,
    vx: 0,
    vy: 0,
    radius,
    facing: 1,
    direction: "down",
    moving: false,
    anim: 0,
    areaId: getAreaAt(x, y).id,
    state: "idle",
    hitbox: { ox: 0, oy: 0, r: radius * 0.7 },
  };
}

function getHitbox(entity) {
  return {
    x: entity.x + entity.hitbox.ox,
    y: entity.y + entity.hitbox.oy,
    r: entity.hitbox.r,
  };
}

function setEntityPosFromHitbox(entity, cx, cy) {
  entity.x = cx - entity.hitbox.ox;
  entity.y = cy - entity.hitbox.oy;
}

function circleVsCircle(a, b) {
  const ha = getHitbox(a);
  const hb = getHitbox(b);
  return Math.hypot(ha.x - hb.x, ha.y - hb.y) <= ha.r + hb.r;
}

function resolveCircleVsRect(entity, rect) {
  const hb = getHitbox(entity);
  const closestX = clamp(hb.x, rect.x, rect.x + rect.w);
  const closestY = clamp(hb.y, rect.y, rect.y + rect.h);

  let dx = hb.x - closestX;
  let dy = hb.y - closestY;
  const distSq = dx * dx + dy * dy;

  if (distSq >= hb.r * hb.r) return false;

  if (distSq === 0) {
    const left = Math.abs(hb.x - rect.x);
    const right = Math.abs(rect.x + rect.w - hb.x);
    const top = Math.abs(hb.y - rect.y);
    const bottom = Math.abs(rect.y + rect.h - hb.y);
    const min = Math.min(left, right, top, bottom);

    if (min === left) hb.x = rect.x - hb.r - 0.1;
    else if (min === right) hb.x = rect.x + rect.w + hb.r + 0.1;
    else if (min === top) hb.y = rect.y - hb.r - 0.1;
    else hb.y = rect.y + rect.h + hb.r + 0.1;
  } else {
    const dist = Math.sqrt(distSq);
    const overlap = hb.r - dist;
    dx /= dist;
    dy /= dist;
    hb.x += dx * overlap;
    hb.y += dy * overlap;
  }

  setEntityPosFromHitbox(entity, hb.x, hb.y);
  return true;
}

function clampToWorld(entity) {
  const hb = getHitbox(entity);
  hb.x = clamp(hb.x, hb.r, WORLD.width - hb.r);
  hb.y = clamp(hb.y, hb.r, WORLD.height - hb.r);
  setEntityPosFromHitbox(entity, hb.x, hb.y);
}

function resolveEnvironment(entity) {
  clampToWorld(entity);
  for (const obstacle of OBSTACLES) {
    resolveCircleVsRect(entity, obstacle);
  }
  clampToWorld(entity);
}

function spawnAnimals(settings, wolfStart) {
  return WORLD.layout.animalSpawns.map((point, i) => {
    const animal = makeEntity(`animal_${i}`, "animal", point.x, point.y, 22);
    Object.assign(animal, { species: SPECIES[i], rescued: false, lost: false,
      targetX: point.x, targetY: point.y, homeX: point.x, homeY: point.y,
      hitbox: { ox: 0, oy: 6, r: 13 } });
    return animal;
  });
}

function createState() {
  const difficultyKey = getDifficultyKey();
  const settings = DIFFICULTIES[difficultyKey];

  const chicken = makeEntity("chicken", "chicken", WORLD.layout.start.x, WORLD.layout.start.y, 26);
  chicken.speed = settings.chickenSpeed;
  chicken.hitbox = { ox: 0, oy: 8, r: 16 };

  const wolf = makeEntity("wolf", "wolf", WORLD.layout.wolfStart.x, WORLD.layout.wolfStart.y, 36);
  wolf.maxSpeed = settings.wolfMaxSpeed;
  wolf.accel = settings.wolfAccel;
  wolf.pauseTimer = 0;
  wolf.patrolIndex = 0;
  wolf.injured = false;
  wolf.huntUnlockTimer = settings.huntDelay;
  wolf.fearTimer = 0;
  wolf.hitbox = { ox: -2, oy: 7, r: 21 };

  return {
    difficultyKey,
    worldSeed: WORLD.layout.seed,
    worldVersion: WORLD.layout.version,
    settings,
    phase: "playing",
    rescuedCount: 0,
    lostCount: 0,
    lives: MAX_LIVES,
    score: 0,
    winBonusApplied: false,
    gameEndReason: "",
    debugHitboxes: false,
    entities: {
      chicken,
      wolf,
      animals: spawnAnimals(settings, wolf),
      chicks: WORLD.layout.chickSpawns.map((point, i) => {
        const chick = makeEntity(`chick_${i}`, "chick", point.x, point.y, 14);
        return Object.assign(chick, { species: "chick", rescued: false, targetX: point.x, targetY: point.y,
          homeX: point.x, homeY: point.y, hitbox: { ox: 0, oy: 5, r: 10 } });
      }),
      effects: [],
    },
    cutscene: {
      time: 0,
      done: false,
      attackers: [],
      impacts: [],
    },
    chickenAnim: {
      current: "idle",
      frameIndex: 0,
      frameTime: 0,
      fps: 5,
    },
  };
}

function resetGame(seed, worldVersion = 2) {
  AudioSystem.reset();
  let chosenSeed = Number.isInteger(seed) ? seed >>> 0 : Math.floor(Math.random() * 4294967296) >>> 0;
  if (!Number.isInteger(seed) && chosenSeed === state?.worldSeed) chosenSeed = (chosenSeed + 0x9e3779b9) >>> 0;
  MapManager.generate(chosenSeed, worldVersion);
  buildObstacles();
  state = createState();
  GameManager.initialize(state);
  WolfAI.initialize(state);
  MapManager.initialize(state);
  state.hasSave = true;
  camera = {
    x: 0,
    y: 0,
    w: canvas.width,
    h: canvas.height,
    shake: 0,
    shakeX: 0,
    shakeY: 0,
  };

  rescuedCountEl.textContent = "0";
  livesCountEl.textContent = String(MAX_LIVES);
  scoreCountEl.textContent = "0";
  areaTextEl.textContent = "Poleiro";
  setStatus(`Dificuldade ${state.settings.label}. Cada amigo salvo deixa o lobo mais perigoso. A fazenda guarda segredos...`);
  input.clear();
  GameManager.save(state);
  GameUI.update(state);
}

function setStatus(text, cssClass) {
  statusTextEl.textContent = text;
  statusTextEl.className = cssClass || "";
}

function refreshHud() {
  rescuedCountEl.textContent = String(state.rescuedCount);
  document.getElementById("chicksCount").textContent = String(state.rescuedChicks);
  livesCountEl.textContent = String(Math.max(0, state.lives));
  scoreCountEl.textContent = String(Math.max(0, Math.floor(state.score)));
}

function finishLose(reason) {
  state.phase = "lose";
  state.gameEndReason = reason;
  setStatus(reason, "lose");
}

function updateCamera(dt) {
  if (EndGameSequence.active(state)) {
    camera.x = 0; camera.y = 0; camera.shakeX = 0; camera.shakeY = 0;
    return;
  }
  const targetX = state.entities.chicken.x - camera.w / 2;
  const targetY = state.entities.chicken.y - camera.h / 2;

  camera.x = lerp(camera.x, targetX, clamp(dt * 6, 0, 1));
  camera.y = lerp(camera.y, targetY, clamp(dt * 6, 0, 1));

  camera.x = clamp(camera.x, 0, WORLD.width - camera.w);
  camera.y = clamp(camera.y, 0, WORLD.height - camera.h);

  if (camera.shake > 0) {
    camera.shake -= dt;
    const strength = camera.shake * 15;
    camera.shakeX = rand(-strength, strength);
    camera.shakeY = rand(-strength, strength);
  } else {
    camera.shakeX = 0;
    camera.shakeY = 0;
  }
}

function updateChicken(dt) {
  Player.update(state, dt);
}

function updateWolf(dt) {
  WolfAI.update(state, dt);
  WolfDialogue.update(state, dt);
}

function spawnBurst(x, y, color, amount) {
  for (let i = 0; i < amount; i += 1) {
    state.entities.effects.push({
      x,
      y,
      vx: rand(-170, 170),
      vy: rand(-170, -80),
      life: rand(0.22, 0.6),
      maxLife: 0.6,
      color,
      size: rand(2.4, 5.2),
    });
  }
}

function updateEffects(dt) {
  for (const fx of state.entities.effects) {
    fx.life -= dt;
    fx.x += fx.vx * dt;
    fx.y += fx.vy * dt;
    fx.vy += 180 * dt;
  }
  state.entities.effects = state.entities.effects.filter((fx) => fx.life > 0);
}

function updateAnimals(dt) {
  RescueSystem.update(state, dt);
}

function startWinCutscene() {
  EndGameSequence.start(state);
}

function updateCutscene(dt) {
  EndGameSequence.update(state, dt);
}

function updateGame(dt) {
  if (state.phase === "menu") return;
  if (state.phase === "playing") {
    updateChicken(dt);
    updateAnimals(dt);
    if (state.phase === "playing") {
      updateWolf(dt);
      Player.checkCatch(state);
      MapManager.update(state, dt);
      if (state.phase === "playing") GameManager.update(state, dt);
    }
  } else if (state.phase === "win_cutscene") {
    updateCutscene(dt);
  }
  if (state.entities.wolf.flash > 0) state.entities.wolf.flash = Math.max(0, state.entities.wolf.flash - dt);
  updateEffects(dt);
  updateCamera(dt);
  AudioSystem.update(state, dt);
  GameUI.update(state);
}

function drawWorld() {
  FarmArt.drawGround(ctx, WORLD.layout, camera);
  MapManager.draw(state);
}

function drawChicken(entity) {
  const p = worldToScreen(entity);
  CharacterArt.draw(ctx, "chicken", p.x, p.y + (entity.hideBlend || 0) * 4, {
    facing: entity.facing, direction: entity.hidden ? "down" : entity.direction, anim: entity.anim, moving: entity.moving,
    hidden: entity.hidden, hideBlend: entity.hideBlend, sprinting: entity.sprinting,
    mood: entity.mood || "normal", skin: entity.skin || "classic" });
}

function drawWolf(entity) {
  const p = worldToScreen(entity);
  const heading = entity.heading || 0;
  const direction = EndGameSequence.active(state) ? entity.direction :
    Math.abs(Math.cos(heading)) > Math.abs(Math.sin(heading)) ? (Math.cos(heading) < 0 ? "left" : "right") : (Math.sin(heading) < 0 ? "up" : "down");
  CharacterArt.draw(ctx, "wolf", p.x, p.y, { facing: entity.facing, direction, anim: entity.anim,
    moving: Math.hypot(entity.vx, entity.vy) > 10 || state.cutscene.stage === "flee",
    mood: EndGameSequence.active(state) ? entity.mood || "normal" : ["chase", "inspect"].includes(entity.mode) ? "furious" : entity.mode === "alert" ? "alert" :
      entity.mode === "investigate" ? "sniff" : entity.mode === "search" ? "search" : "normal" });
}

function drawAnimalCharacter(species, x, y, facing, anim) {
  CharacterArt.draw(ctx, species, x, y, { facing, anim, moving: true });
}

function drawAnimal(entity) {
  if (RescueSystem.isSecret(entity) && !EndGameSequence.active(state)) return;
  const p = worldToScreen(entity);
  CharacterArt.draw(ctx, entity.species, p.x, p.y, { facing: entity.facing, direction: entity.direction,
    anim: entity.anim, moving: entity.moving, sprinting: entity.temper === "fleeing",
    lookBack: entity.temper === "fleeing", mood: entity.mood || "normal" });
  if (!entity.rescued && !entity.speechTime && !EndGameSequence.active(state) && RescueSystem.visible(state, entity)) {
    ctx.save(); ctx.translate(p.x, p.y - CharacterArt.markerOffset(entity.species));
    ctx.fillStyle = entity.type === "chick" ? "#ffb963" : "#fff1a0"; ctx.strokeStyle = "#a38c51"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 6); ctx.bezierCurveTo(-15, -2, -7, -12, 0, -5);
    ctx.bezierCurveTo(7, -12, 15, -2, 0, 6); ctx.fill(); ctx.stroke(); ctx.restore();
  }
}

function drawEffects() {
  for (const fx of state.entities.effects) {
    const alpha = clamp(fx.life / fx.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fx.color;
    ctx.beginPath();
    ctx.arc(worldX(fx.x), worldY(fx.y), fx.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (state.phase === "win_cutscene") {
    for (const impact of state.cutscene.impacts) {
      const alpha = clamp(impact.life / 0.25, 0, 1);
      ctx.globalAlpha = alpha;
      const x = worldX(impact.x);
      const y = worldY(impact.y);
      ctx.strokeStyle = "#fff16f";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 14, y);
      ctx.lineTo(x + 14, y);
      ctx.moveTo(x, y - 14);
      ctx.lineTo(x, y + 14);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}
function drawDebugHitboxes() {
  if (!state.debugHitboxes) return;

  for (const obstacle of OBSTACLES) {
    const x = worldX(obstacle.x);
    const y = worldY(obstacle.y);
    ctx.fillStyle = "rgba(255,90,90,0.18)";
    ctx.strokeStyle = "rgba(255,90,90,0.75)";
    ctx.fillRect(x, y, obstacle.w, obstacle.h);
    ctx.strokeRect(x, y, obstacle.w, obstacle.h);
  }

  const drawEntity = (entity, color) => {
    const hb = getHitbox(entity);
    const x = worldX(hb.x);
    const y = worldY(hb.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, hb.r, 0, Math.PI * 2);
    ctx.stroke();
  };

  drawEntity(state.entities.chicken, "#4bd0ff");
  drawEntity(state.entities.wolf, "#ff5959");

  for (const animal of RescueSystem.all(state)) {
    if (RescueSystem.isSecret(animal)) continue;
    if (animal.lost && state.phase !== "win_cutscene") continue;
    drawEntity(animal, animal.rescued ? "#4ca6ff" : "#ffe85a");
  }

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(10, 10, 230, 58);
  ctx.fillStyle = "#fff";
  ctx.font = "14px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("DEBUG HITBOX ON (H)", 18, 32);
  ctx.fillText("Azul: galinha | Vermelho: lobo", 18, 52);
}

function drawMiniMap() {
  const w = 175;
  const h = 112;
  const x = canvas.width - w - 14;
  const y = 12;

  ctx.fillStyle = "rgba(246,224,173,.96)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#765235"; ctx.lineWidth = 4; ctx.strokeRect(x, y, w, h);

  const sx = w / WORLD.width;
  const sy = h / WORLD.height;

  ctx.fillStyle = "#c7ac78";
  for (const path of WORLD.paths) ctx.fillRect(x + path.x * sx, y + path.y * sy, path.w * sx, path.h * sy);
  ctx.strokeStyle = "#7c8854";
  ctx.lineWidth = 1;
  for (const area of WORLD.areas) {
    ctx.strokeRect(x + area.x * sx, y + area.y * sy, area.w * sx, area.h * sy);
  }

  ctx.fillStyle = "#ffe893";
  for (const animal of state.entities.animals) {
    if (animal.rescued || !animal.discovered || !animal.lastSeen) continue;
    ctx.fillStyle = RescueSystem.visible(state, animal) ? "#426840" : "#a09873";
    ctx.beginPath(); ctx.arc(x + animal.lastSeen.x * sx, y + animal.lastSeen.y * sy, 2.8, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = "#ffaf55";
  for (const chick of state.entities.chicks) {
    if (!chick.rescued && chick.discovered && chick.lastSeen) {
      ctx.fillStyle = RescueSystem.visible(state, chick) ? "#c5702d" : "#ad9870";
      ctx.fillRect(x + chick.lastSeen.x * sx - 2, y + chick.lastSeen.y * sy - 2, 4, 4);
    }
  }
  ctx.fillStyle = "#65472e"; ctx.fillRect(x-2, y + h, w+4, 25);
  ctx.font = "bold 11px Trebuchet MS, sans-serif"; ctx.textAlign = "center";
  ctx.fillStyle = "#fff0c2"; ctx.fillText("CADERNETA · pistas já vistas", x + w/2, y + h + 16);

  ctx.fillStyle = "#fffdf0";
  ctx.beginPath();
  ctx.arc(x + state.entities.chicken.x * sx, y + state.entities.chicken.y * sy, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#65472e"; ctx.lineWidth = 1.5; ctx.stroke();

  if (!state.cutscene.done && distance(state.entities.chicken, state.entities.wolf) < 450 &&
      DetectionSystem.hasLineOfSight(getHitbox(state.entities.chicken), getHitbox(state.entities.wolf))) {
    ctx.fillStyle = "#d64040";
    ctx.beginPath();
    ctx.arc(x + state.entities.wolf.x * sx, y + state.entities.wolf.y * sy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawOverlay() {
  if (state.phase === "playing" && state.entities.wolf.huntUnlockTimer > 0) {
    ctx.fillStyle = "rgba(0,0,0,0.34)";
    ctx.fillRect(18, canvas.height - 42, 280, 26);
    ctx.fillStyle = "#ffe9a9"; ctx.font = "16px sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`Lobo distraído por ${state.entities.wolf.huntUnlockTimer.toFixed(1)}s`, 24, canvas.height - 23);
  }
  // Region arrivals are shown by the animated DOM interface.
}

function renderGame() {
  const ending = EndGameSequence.active(state);
  if (ending) EndGameSequence.drawBackdrop(state);
  else drawWorld();
  if (!ending) for (const chick of state.entities.chicks) {
    if (RescueSystem.isSecret(chick)) FarmArt.drawSecretCover(ctx,chick,camera,state.elapsed || 0);
  }
  const layers = [...RescueSystem.all(state), state.entities.chicken, state.entities.wolf]
    .map(entity => ({ depth: entity.y + 12, entity }));
  if (!ending) for (const prop of FarmArt.getProps(WORLD.layout)) layers.push({ depth: prop.depth, prop });
  layers.sort((a, b) => a.depth - b.depth);
  for (const layer of layers) {
    if (layer.prop) { FarmArt.drawProp(ctx, layer.prop, camera); continue; }
    const entity = layer.entity;
    if (ending && state.cutscene.cloud && entity.type !== "chicken") continue;
    if (entity.type === "wolf") {
      if (!(ending && state.cutscene.stage === "celebrate")) drawWolf(entity);
    } else if (entity.type === "chicken") {
      if (!ending && entity.hidden) continue;
      ctx.save();
      if (entity.invulnerable > 0 && !entity.hidden) ctx.globalAlpha = 0.6 + Math.sin(entity.invulnerable * 25) * 0.25;
      drawChicken(entity); ctx.restore();
    } else drawAnimal(entity);
  }
  if (ending) EndGameSequence.draw(state);
  else {
    // Keep a peeking silhouette legible above the prop, then cover its lower body.
    if (state.entities.chicken.hidden) drawChicken(state.entities.chicken);
    HidingSpots.drawForeground(state);
    drawEffects(); drawDebugHitboxes(); drawMiniMap(); drawOverlay();
    HidingSpots.drawIndicators(state);
    GameUI.render(state);
  }
}

function tick(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  updateGame(dt);
  renderGame();
  InterfaceMotion.frame(state, dt);
  requestAnimationFrame(tick);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(event.target?.tagName)) return;
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) event.preventDefault();
  if ((key === "escape" || key === "p") && !event.repeat) {
    if (state.phase !== "menu") GameUI.showMenu(state);
    return;
  }
  if (state.phase !== "playing") return;
  if (state.entities.chicken.hidden && event.repeat && ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) return;
  if (key === "e" && !event.repeat) HidingSpots.toggle(state);
  if (key === "h" && !event.repeat) state.debugHitboxes = !state.debugHitboxes;
  input.add(key);
});
window.addEventListener("keyup", event => input.delete(event.key.toLowerCase()));
window.addEventListener("blur", () => {
  input.clear();
  AudioSystem.pause();
  if (state && ["playing", "win_cutscene"].includes(state.phase)) GameUI.showMenu(state);
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    input.clear();
    AudioSystem.pause();
    if (state && ["playing", "win_cutscene"].includes(state.phase)) GameUI.showMenu(state);
  }
});
window.addEventListener("pagehide", () => {
  AudioSystem.pause();
  if (state && ["playing", "win_cutscene"].includes(state.phase)) GameUI.showMenu(state);
  if (state) GameManager.save(state);
});
difficultySelect.addEventListener("change", () => {
  setStatus(`Dificuldade ${DIFFICULTIES[getDifficultyKey()].label} selecionada para a próxima aventura.`);
});
restartBtn.addEventListener("click", () => {
  resetGame(); AudioSystem.sync(state); AudioSystem.unlock(); canvas.focus();
});

buildObstacles();
GameUI.initialize();
const savedGame = GameManager.read();
if (savedGame) difficultySelect.value = savedGame.difficulty;
resetGame(savedGame?.worldSeed, savedGame ? savedGame.worldVersion : 2);
if (savedGame) {
  GameManager.restore(state, savedGame);
  MapManager.initialize(state);
  setStatus("Bem-vinda de volta! Seus amigos continuam a salvo.");
}
state.hasSave = Boolean(savedGame);
GameUI.showMenu(state);
GameUI.update(state);
CharacterArt.load().then(() => GameUI.update(state));
requestAnimationFrame((t) => {
  lastTime = t;
  tick(t);
});
