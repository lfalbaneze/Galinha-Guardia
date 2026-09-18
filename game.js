
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

function buildObstacles(game = state) {
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

  for (const [key,type] of [['stables','stable'],['troughs','trough'],['paddockFences','paddock-fence']])
    for (const p of STRUCTURES[key] || []) list.push({...p,type,opaque:type!=='paddock-fence'});

  list.push(...LakeChallenge.pondObstacles(game));
  list.push({ x: STRUCTURES.barn.x, y: STRUCTURES.barn.y, w: STRUCTURES.barn.w, h: STRUCTURES.barn.h, type: "barn" });

  list.push(...FarmRefuge.obstacles());
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
    if (obstacle.blocking !== false) resolveCircleVsRect(entity, obstacle);
  }
  clampToWorld(entity);
}

function spawnAnimals(settings, wolfStart) {
  return WORLD.layout.animalSpawns.map((point, i) => {
    const animal = makeEntity(`animal_${i}`, "animal", point.x, point.y, 22);
    const species = WORLD.layout.version >= 3 ? ['sheep','pig','duck','lamb','cow','goat','rabbit','cat','donkey','dog'] : SPECIES;
    Object.assign(animal, { species: species[i], rescued: false, lost: false,
      targetX: point.x, targetY: point.y, homeX: point.x, homeY: point.y,
      hitbox: { ox: 0, oy: 6, r: 13 } });
    // Check the actual offset hitbox against runtime geometry (including refuge
    // rails). An unlucky generated home must not start an animal inside a prop.
    const h = getHitbox(animal);
    if (OBSTACLES.some(r => r.blocking !== false &&
      Math.hypot(h.x-clamp(h.x,r.x,r.x+r.w),h.y-clamp(h.y,r.y,r.y+r.h)) < h.r)) {
      const clear = WolfAI.findPath(animal,animal).pop();
      if (clear) Object.assign(animal,clear,{targetX:clear.x,targetY:clear.y,homeX:clear.x,homeY:clear.y});
    }
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
      chicks: HidingSpots.bonusHomes().map((point, i) => {
        const chick = makeEntity(`chick_${i}`, "chick", point.x, point.y, 14);
        return Object.assign(chick, { species: "chick", rescued: false, targetX: point.x, targetY: point.y,
          homeX: point.x, homeY: point.y, coverId: point.coverId, hitbox: { ox: 0, oy: 5, r: 10 } });
      }),
      foxes: [],
      owls: [],
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

function resetGame(seed, worldVersion = 5) {
  AudioSystem.reset();
  let chosenSeed = Number.isInteger(seed) ? seed >>> 0 : Math.floor(Math.random() * 4294967296) >>> 0;
  if (!Number.isInteger(seed) && chosenSeed === state?.worldSeed) chosenSeed = (chosenSeed + 0x9e3779b9) >>> 0;
  MapManager.generate(chosenSeed, worldVersion);
  buildObstacles(null);
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
  setStatus(`A porteira abriu! Junte os dez amigos e fique de olho nos piados pelo caminho.`);
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
  if (!Number.isFinite(dt) || dt <= 0) return;

  if (state.phase === "menu") return;
  if (state.phase === "playing") {
    updateChicken(dt);
    LakeChallenge.update(state, dt);
    if (!state.lake?.active) updateAnimals(dt);
    if (state.phase === "playing") {
      GooseSystem.update(state, dt);
      FoxSystem.update(state, dt);
      OwlSystem.update(state, dt);
      ThorSystem.update(state, dt);
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
  if (entity.skin && entity.skin !== 'classic' && !entity.hidden && state.phase === 'playing') {
    // A player marker keeps animal appearances distinct from the friends being rescued.
    ctx.save(); ctx.strokeStyle = '#fff0a1'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(p.x, p.y+14, 29, 9, 0, 0, Math.PI*2); ctx.stroke(); ctx.restore();
  }
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
    lookBack: entity.temper === "fleeing", mood: entity.mood || "normal",
    scale: entity.type === 'chick' && entity.rescued && !EndGameSequence.active(state) ? .72 : 1 });
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
  for (const fox of state.entities.foxes || []) if (fox.mode !== 'hidden') drawEntity(fox, '#ffab66');
  for (const owl of state.entities.owls || []) {
    const x = worldX(owl.perch.x), y = worldY(owl.perch.y);
    ctx.strokeStyle = owl.mode === 'alert' ? '#ffe780' : '#c7c2b1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.stroke();
  }

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
  const w=146,h=88,x=canvas.width-w-15,y=34;
  ctx.save();
  ctx.fillStyle='#293c28';ctx.beginPath();ctx.roundRect(x-5,y-23,w+10,h+43,5);ctx.fill();
  ctx.strokeStyle='#b19b61';ctx.lineWidth=1;ctx.stroke();
  ctx.font='bold 11px Trebuchet MS, sans-serif';ctx.textAlign='left';ctx.fillStyle='#f5e1ae';
  ctx.fillText('Mapa do sítio',x+3,y-8);
  ctx.fillStyle='#758b4e';ctx.fillRect(x,y,w,h);
  const textured=FarmTerrain.drawMap(ctx,WORLD.layout,x,y,w,h);
  const sx=w/WORLD.width,sy=h/WORLD.height;
  for(const plot of WORLD.layout.plots||[]) {
    ctx.fillStyle=plot.kind==='corn'?'#b9ae4b':plot.kind==='garden'?'#8b623d':'#a7a273';
    ctx.fillRect(x+plot.x*sx,y+plot.y*sy,plot.w*sx,plot.h*sy);
  }
  if(!textured){ctx.fillStyle='#c6a06c';for(const path of WORLD.paths)ctx.fillRect(x+path.x*sx,y+path.y*sy,path.w*sx,path.h*sy);}
  if(state.lake?.completed) {
    const bridge=LakeChallenge.bridge();ctx.fillStyle='#e0bc72';
    ctx.fillRect(x+bridge.x*sx,y+bridge.y*sy,Math.max(3,bridge.w*sx),bridge.h*sy);
  }
  ctx.fillStyle='#995f3e';
  for(const prop of [STRUCTURES.barn,...STRUCTURES.coops,...STRUCTURES.silos,...(STRUCTURES.stables||[])])
    ctx.fillRect(x+prop.x*sx,y+prop.y*sy,Math.max(3,prop.w*sx),Math.max(3,prop.h*sy));
  ctx.strokeStyle='#eee9c278';ctx.lineWidth=1;
  ctx.strokeRect(x+camera.x*sx,y+camera.y*sy,canvas.width*sx,canvas.height*sy);
  for(const animal of state.entities.animals) {
    if(animal.rescued||!animal.discovered||!animal.lastSeen)continue;
    ctx.fillStyle=RescueSystem.visible(state,animal)?'#ffdf88':'#b0aa7a';
    ctx.beginPath();ctx.arc(x+animal.lastSeen.x*sx,y+animal.lastSeen.y*sy,2.2,0,Math.PI*2);ctx.fill();
  }
  for(const chick of state.entities.chicks) {
    if(!chick.rescued&&chick.discovered&&chick.lastSeen){
      ctx.fillStyle='#f7bf58';ctx.fillRect(x+chick.lastSeen.x*sx-2,y+chick.lastSeen.y*sy-2,4,4);
    }
  }
  ctx.fillStyle='#fffce7';ctx.strokeStyle='#293c28';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.arc(x+state.entities.chicken.x*sx,y+state.entities.chicken.y*sy,3.3,0,Math.PI*2);ctx.fill();ctx.stroke();
  if(!state.cutscene.done&&distance(state.entities.chicken,state.entities.wolf)<450&&
    DetectionSystem.hasLineOfSight(getHitbox(state.entities.chicken),getHitbox(state.entities.wolf))){
    ctx.fillStyle='#ef8262';ctx.beginPath();ctx.arc(x+state.entities.wolf.x*sx,y+state.entities.wolf.y*sy,3,0,Math.PI*2);ctx.fill();
  }
  if (state.entities.goose && GooseSystem.visible(state, state.entities.goose)) {
    ctx.fillStyle='#f3c45e'; const g=state.entities.goose;
    ctx.fillRect(x+g.x*sx-2,y+g.y*sy-2,4,4);
  }
  for (const fox of state.entities.foxes || []) if (FoxSystem.visible(state,fox)) {
    ctx.fillStyle='#ef8a52';ctx.fillRect(x+fox.x*sx-2,y+fox.y*sy-2,4,4);
  }
  for (const owl of state.entities.owls || []) if (OwlSystem.visible(state,owl)) {
    ctx.fillStyle=owl.mode==='alert'?'#f6da6e':'#c8c2ae';ctx.fillRect(x+owl.perch.x*sx-1.5,y+owl.perch.y*sy-1.5,3,3);
  }
  ctx.fillStyle='#cbd0b0';ctx.font='10px Trebuchet MS, sans-serif';ctx.fillText('Você · amigos avistados',x+3,y+h+13);
  ctx.restore();
}

function drawOverlay() {
  // Context, danger and arrival messages live in the HUD; keep the playfield clear.
}

function renderGame() {
  const ending = EndGameSequence.active(state);
  if (ending) EndGameSequence.drawBackdrop(state);
  else { drawWorld(); LakeChallenge.drawGround(state); OwlSystem.drawGround(state); GooseSystem.drawTerritory(state); }
  if (!ending) for (const chick of state.entities.chicks) {
    if (RescueSystem.isSecret(chick) && !chick.coverId) FarmArt.drawSecretCover(ctx,chick,camera,state.elapsed || 0);
  }
  const layers = [...RescueSystem.all(state).filter(a => !ending || a.rescued), state.entities.chicken, state.entities.wolf]
    .map(entity => ({ depth: entity.y + 12, entity }));
  if (!ending && state.entities.goose) layers.push({ depth: state.entities.goose.y + 12, entity: state.entities.goose });
  if (!ending) for (const fox of state.entities.foxes || [])
    layers.push({ depth: fox.y + 12, entity: fox });
  if (!ending) for (const owl of state.entities.owls || []) layers.push({depth: owl.perch.y + .1, entity: owl});
  if (!ending && !state.lake?.active && state.entities.thor) layers.push({depth:state.entities.thor.y+12,entity:state.entities.thor});
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
    } else if (entity.type === 'goose') GooseArt.draw(ctx, entity, camera);
    else if (entity.type === 'fox') FoxArt.draw(ctx, entity, camera);
    else if (entity.type === 'owl') OwlSystem.drawEntity(entity);
    else if (entity.type === 'thor') ThorArt.draw(ctx,entity,camera);
    else drawAnimal(entity);
  }
  if (ending) EndGameSequence.draw(state);
  else {
    FoxSystem.drawWarnings(state);
    OwlSystem.drawIndicators(state);
    // Keep a peeking silhouette legible above the prop, then cover its lower body.
    if (state.entities.chicken.hidden) drawChicken(state.entities.chicken);
    HidingSpots.drawForeground(state);
    drawEffects(); drawDebugHitboxes(); drawMiniMap(); drawOverlay();
    GooseSystem.drawIndicator(state);
    HidingSpots.drawIndicators(state);
    GameUI.render(state);
  }
}

function tick(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  updateGame(dt);
  if (state.phase !== "menu") renderGame();
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
  if (key === "f" && !event.repeat) {
    if (state.lake?.active) LakeChallenge.cancel(state); else LakeChallenge.start(state);
    return;
  }
  if (key === "e" && !event.repeat && !RescueSystem.callChick(state)) HidingSpots.toggle(state);
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
resetGame(savedGame?.worldSeed);
if (savedGame) {
  GameManager.restore(state, savedGame);
  MapManager.initialize(state);
  setStatus("Bem-vinda de volta! Seus amigos continuam a salvo.");
}
state.hasSave = Boolean(savedGame);
GameUI.showMenu(state);
GameUI.update(state);
Promise.all([CharacterArt.load(), GooseArt.load(), FoxArt.load(), OwlArt.load(), ThorArt.load()]).then(() => GameUI.update(state));
GameUI.update(state);
FarmSprites.load();
FarmSprites.loadNursery();
FarmSprites.loadHabitats();
requestAnimationFrame((t) => {
  lastTime = t;
  tick(t);
});
