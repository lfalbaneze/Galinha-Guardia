
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const rescuedCountEl = document.getElementById("rescuedCount");
const livesCountEl = document.getElementById("livesCount");
const scoreCountEl = document.getElementById("scoreCount");
const areaTextEl = document.getElementById("areaText");
const statusTextEl = document.getElementById("statusText");
const difficultySelect = document.getElementById("difficultySelect");
const restartBtn = document.getElementById("restartBtn");

const input = new Set();
const CHICKEN_SPRITE_PATH = "./Cucco_clean.png";
const BUILD_TAG = "build 2026-03-08 00:12";
const CHICKEN_SPRITE_CANDIDATES = [
  CHICKEN_SPRITE_PATH,
  "./Cucco.png",
  "C:\\Users\\user\\Downloads\\galinha-resgate\\Cucco_clean.png",
  "file:///C:/Users/user/Downloads/galinha-resgate/Cucco_clean.png",
  "Cucco.png",
  "/galinha-resgate/Cucco.png",
  "../galinha-resgate/Cucco.png",
  "file:///C:/Users/user/Downloads/galinha-resgate/Cucco.png",
];
const FARM_ATLAS_CANDIDATES = [
  "C:\\Users\\user\\Downloads\\galinha-resgate\\pato cao e gato.png",
  "./pato cao e gato.png",
  "./pato%20cao%20e%20gato.png",
  "pato cao e gato.png",
  "/galinha-resgate/pato%20cao%20e%20gato.png",
  "file:///C:/Users/user/Downloads/galinha-resgate/pato%20cao%20e%20gato.png",
];

const MAX_LIVES = 3;
const SCORE_PER_RESCUE = 100;
const SCORE_PENALTY_LOSS = 40;
const SCORE_BONUS_PER_LIFE = 250;

const chickenAtlas = {
  ready: false,
  image: null,
  animations: {
    idle: [],
    walk: [],
    flap: [],
    hit: [],
  },
  error: null,
};

const farmAnimalAtlas = {
  ready: false,
  image: null,
  error: null,
  cellW: 96,
  cellH: 96,
  cols: 4,
  styleBySpecies: {
    duck: { row: 0, scale: 0.48, tint: null },
    dog: { row: 1, scale: 0.45, tint: null },
    cat: { row: 2, scale: 0.45, tint: null },
    sheep: { row: 2, scale: 0.46, tint: "rgba(255,255,255,0.24)" },
    pig: { row: 2, scale: 0.46, tint: "rgba(248,160,190,0.28)" },
    goat: { row: 1, scale: 0.46, tint: "rgba(231,209,178,0.3)" },
    cow: { row: 1, scale: 0.5, tint: "rgba(242,242,242,0.22)" },
    rabbit: { row: 2, scale: 0.42, tint: "rgba(250,250,250,0.3)" },
    donkey: { row: 1, scale: 0.5, tint: "rgba(176,176,176,0.25)" },
    lamb: { row: 2, scale: 0.43, tint: "rgba(255,255,255,0.28)" },
  },
};

const DIFFICULTIES = {
  easy: {
    label: "Facil",
    chickenSpeed: 335,
    wolfMaxSpeed: 160,
    wolfAccel: 230,
    wolfPauseAfterCatch: 1.1,
    huntDelay: 10,
    spawnPlan: ["poleiro", "poleiro", "quintal", "quintal", "granja", "horta", "estabulo", "quintal", "poleiro", "granja"],
    minSpawnWolfDistance: 470,
  },
  normal: {
    label: "Medio",
    chickenSpeed: 300,
    wolfMaxSpeed: 205,
    wolfAccel: 330,
    wolfPauseAfterCatch: 0.7,
    huntDelay: 6,
    spawnPlan: ["poleiro", "granja", "estabulo", "horta", "quintal", "poleiro", "granja", "estabulo", "horta", "quintal"],
    minSpawnWolfDistance: 330,
  },
  hard: {
    label: "Dificil",
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
  safeZone: { x: 210, y: 188, r: 130 },
  areas: [
    { id: "poleiro", name: "Poleiro", x: 80, y: 70, w: 760, h: 440, base: "#4f9a57", line: "#5a3f27", mark: "#44ce80" },
    { id: "granja", name: "Granja", x: 1940, y: 90, w: 760, h: 500, base: "#5da560", line: "#7a5a32", mark: "#56dc7f" },
    { id: "estabulo", name: "Estabulo", x: 1940, y: 1110, w: 760, h: 560, base: "#599859", line: "#694e30", mark: "#52c675" },
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

const PIXEL_SCALE = 3;
const CHICKEN_ATLAS_SCALE = 2.9;
const CHICKEN_FALLBACK_SCALE = 2.2;

const PALETTES = {
  outline: "#1d1630",
  shadow: "#394a53",
  white: "#eff0eb",
  light: "#cfd7d9",
  gray: "#9caeb1",
  dark: "#5f7478",
  comb: "#c53a33",
  beak: "#e6953a",
  leg: "#e38f34",
  wolfBody: "#727f8f",
  wolfDark: "#465060",
  wolfLight: "#b5bec8",
};

const SPRITES = {
  chicken: [
    "................",
    ".....kkkk.......",
    "....krrrok......",
    "...krrrrook.....",
    "..kwwwwwwwkko...",
    ".kwwwwwwwlllko..",
    ".kwwllwwwwwwkk..",
    ".kwwwwwwwwwkk...",
    ".kwwwwwwwwkk....",
    "..kwwwwwwkk.....",
    "..kwwwwwwkk.....",
    "...kwwwwkk......",
    "....kllk........",
    "....k..k........",
    "................",
    "................",
  ],
  wolf: [
    "..................",
    ".....kkkk.........",
    "....kddddkk.......",
    "...kddddddkk......",
    "..kdddddllldk.....",
    "..kdddddddddk....k",
    ".kdddddddddddk..kk",
    ".kddllldddddddkkk.",
    ".kddddddddddddkk..",
    "..kddddddddddkk...",
    "..kddddddddddk....",
    "...kdddddlddk.....",
    "....kllk..kllk....",
    "....k..k..k..k....",
    "..................",
  ],
  sheep: [
    "............",
    "..kkkkkkk...",
    ".kwwwwwwwk..",
    "kwwwwwwwwwk.",
    "kwwwkwwkwwk.",
    ".kwwwwwwwwk.",
    "..kwwwwwwk..",
    "...kwwwwk...",
    "...klllk....",
    "...k..k.....",
  ],
  pig: [
    "............",
    "..kkkkkk....",
    ".kppppppk...",
    "kppppppppk..",
    "kpppppppppk.",
    ".kpppppppkko",
    "..kppppppkk.",
    "...kppppk...",
    "...klllk....",
    "...k..k.....",
  ],
  goat: [
    "............",
    "..kkkkk.....",
    ".khhwwkk....",
    "kwwwwwwk....",
    "kwwwwwwwk...",
    ".kwwwkwwkk..",
    "..kwwwwwk...",
    "...kwwwk....",
    "...klllk....",
    "...k..k.....",
  ],
  cow: [
    "............",
    "..kkkkkk....",
    ".kwwbwbbk...",
    "kwwwwwwwwk..",
    "kwwbwwbwwk..",
    ".kwwwwwwwk..",
    "..kwwwwwk...",
    "...kwwwk....",
    "...klllk....",
    "...k..k.....",
  ],
  duck: [
    "............",
    "....kkkk....",
    "...kyyykko..",
    "..kyyyyyyk..",
    "..kyyyyyyk..",
    "...kyyyyk...",
    "....kyyk....",
    "....kllk....",
    "............",
    "............",
  ],
  rabbit: [
    "............",
    "...k..k.....",
    "...k..k.....",
    "...krrk.....",
    "..kwwwwk....",
    ".kwwwwwwk...",
    ".kwwwwwwk...",
    "..kwwwwk....",
    "...kllk.....",
    "...k..k.....",
  ],
  dog: [
    "............",
    "..kkkkk.....",
    ".kbbbwkk....",
    "kbbbbbbbk...",
    "kbbbbbwbk...",
    ".kbbbbbbk...",
    "..kbbbbk....",
    "...kbbk.....",
    "...kllk.....",
    "...k..k.....",
  ],
  cat: [
    "............",
    "...k..k.....",
    "..k.kk.k....",
    "..kwwwwk....",
    ".kwwwwwwk...",
    ".kwwwwwwk...",
    "..kwwwwk....",
    "...kwwk..k..",
    "...kllk.k...",
    "...k..k.....",
  ],
  donkey: [
    "............",
    "...k..k.....",
    "...k..k.....",
    "..kggggk....",
    ".kggggggk...",
    ".kgggggggk..",
    "..kggggggk..",
    "...kggggk...",
    "...klllk....",
    "...k..k.....",
  ],
  lamb: [
    "............",
    "..kkkkkk....",
    ".kwwwwwwk...",
    "kwwwwwwwwk..",
    "kwwwkwwwwk..",
    ".kwwwwwwwk..",
    "..kwwwwwk...",
    "...kwwwk....",
    "...klllk....",
    "...k..k.....",
  ],
};

const SPECIES = ["sheep", "pig", "goat", "cow", "duck", "rabbit", "dog", "cat", "donkey", "lamb"];

const SPECIES_COLORS = {
  sheep: { p: "#f4f4f4", b: "#2e2e2e", h: "#d9d9d9", y: "#f4f4f4", r: "#f4f4f4" },
  pig: { p: "#f5a9ba", b: "#9a4c63", h: "#f5a9ba", y: "#f5a9ba", r: "#f5a9ba" },
  goat: { p: "#e5d5bc", b: "#76624a", h: "#c5ae8b", y: "#e5d5bc", r: "#e5d5bc" },
  cow: { p: "#f5f5f5", b: "#262626", h: "#d8d8d8", y: "#f5f5f5", r: "#f5f5f5" },
  duck: { p: "#f2df74", b: "#cc8533", h: "#f2df74", y: "#f2df74", r: "#f2df74" },
  rabbit: { p: "#f7f7f7", b: "#c689a8", h: "#f7f7f7", y: "#f7f7f7", r: "#f7b0c2" },
  dog: { p: "#d2ab7c", b: "#5a3f2a", h: "#c5956a", y: "#d2ab7c", r: "#d2ab7c" },
  cat: { p: "#c2966d", b: "#4f3a2b", h: "#b88962", y: "#c2966d", r: "#c2966d" },
  donkey: { p: "#b7b7b7", b: "#5e5e5e", h: "#8f8f8f", y: "#b7b7b7", r: "#b7b7b7" },
  lamb: { p: "#ffffff", b: "#474747", h: "#ececec", y: "#ffffff", r: "#ffffff" },
};

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

function colorDistanceRGB(r, g, b, target) {
  return Math.abs(r - target[0]) + Math.abs(g - target[1]) + Math.abs(b - target[2]);
}

function createChromaProcessedAtlas(image) {
  const c = document.createElement("canvas");
  c.width = image.width;
  c.height = image.height;
  const cctx = c.getContext("2d");
  cctx.imageSmoothingEnabled = false;
  cctx.drawImage(image, 0, 0);

  const img = cctx.getImageData(0, 0, c.width, c.height);
  const data = img.data;
  const magenta = [185, 128, 255];
  const blue = [85, 170, 255];

  function isPanelColor(r, g, b) {
    const nearMagenta = colorDistanceRGB(r, g, b, magenta) <= 78;
    const nearBlue = colorDistanceRGB(r, g, b, blue) <= 72;
    const magentaRange = r > 130 && b > 160 && g < 205 && r + b - g > 170;
    const blueRange = b > 165 && g > 120 && r < 150;
    return nearMagenta || nearBlue || magentaRange || blueRange;
  }

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 20) continue;

    // Remove panel/background from sheet screenshot.
    if (isPanelColor(r, g, b)) {
      data[i + 3] = 0;
    }
  }

  cctx.putImageData(img, 0, 0);
  return c;
}

function makeChickenFrame(rect, pivotX = 0.5, pivotY = 0.86) {
  return {
    sx: rect.x,
    sy: rect.y,
    sw: rect.w,
    sh: rect.h,
    ox: rect.w * pivotX,
    oy: rect.h * pivotY,
  };
}

function getManualChickenAnimations() {
  return {
    idle: [
      makeChickenFrame({ x: 8, y: 24, w: 20, h: 22 }, 0.5, 0.9),
      makeChickenFrame({ x: 32, y: 24, w: 24, h: 21 }, 0.5, 0.9),
    ],
    walk: [
      makeChickenFrame({ x: 5, y: 70, w: 22, h: 22 }),
      makeChickenFrame({ x: 27, y: 70, w: 22, h: 22 }),
      makeChickenFrame({ x: 50, y: 71, w: 20, h: 21 }),
      makeChickenFrame({ x: 72, y: 70, w: 20, h: 22 }),
    ],
    flap: [
      makeChickenFrame({ x: 5, y: 119, w: 24, h: 18 }),
      makeChickenFrame({ x: 29, y: 119, w: 24, h: 18 }),
      makeChickenFrame({ x: 57, y: 116, w: 20, h: 21 }),
    ],
    hit: [
      makeChickenFrame({ x: 6, y: 206, w: 23, h: 21 }),
      makeChickenFrame({ x: 31, y: 206, w: 23, h: 21 }),
      makeChickenFrame({ x: 55, y: 205, w: 25, h: 21 }),
      makeChickenFrame({ x: 80, y: 205, w: 25, h: 21 }),
    ],
  };
}

function getOpaqueBoundsFromRect(canvas, rect, alphaThreshold = 18, padding = 1) {
  const cctx = canvas.getContext("2d");
  const img = cctx.getImageData(rect.x, rect.y, rect.w, rect.h);
  const data = img.data;

  let minX = rect.w;
  let minY = rect.h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < rect.h; y += 1) {
    for (let x = 0; x < rect.w; x += 1) {
      const a = data[(y * rect.w + x) * 4 + 3];
      if (a <= alphaThreshold) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) {
    return { x: rect.x, y: rect.y, w: rect.w, h: rect.h, hasPixels: false };
  }

  const x1 = rect.x + Math.max(0, minX - padding);
  const y1 = rect.y + Math.max(0, minY - padding);
  const x2 = rect.x + Math.min(rect.w - 1, maxX + padding);
  const y2 = rect.y + Math.min(rect.h - 1, maxY + padding);
  return { x: x1, y: y1, w: x2 - x1 + 1, h: y2 - y1 + 1, hasPixels: true };
}

function extractOpaqueComponents(canvas, rect, minPixels = 80, alphaThreshold = 18, padding = 1) {
  const cctx = canvas.getContext("2d");
  const img = cctx.getImageData(rect.x, rect.y, rect.w, rect.h);
  const data = img.data;
  const visited = new Uint8Array(rect.w * rect.h);
  const components = [];

  const queueX = new Int16Array(rect.w * rect.h);
  const queueY = new Int16Array(rect.w * rect.h);

  function isOpaque(x, y) {
    return data[(y * rect.w + x) * 4 + 3] > alphaThreshold;
  }

  for (let y = 0; y < rect.h; y += 1) {
    for (let x = 0; x < rect.w; x += 1) {
      const startIndex = y * rect.w + x;
      if (visited[startIndex] || !isOpaque(x, y)) continue;

      let head = 0;
      let tail = 0;
      queueX[tail] = x;
      queueY[tail] = y;
      tail += 1;
      visited[startIndex] = 1;

      let pixels = 0;
      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;

      while (head < tail) {
        const cx = queueX[head];
        const cy = queueY[head];
        head += 1;

        pixels += 1;
        if (cx < minX) minX = cx;
        if (cy < minY) minY = cy;
        if (cx > maxX) maxX = cx;
        if (cy > maxY) maxY = cy;

        const neighbors = [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1],
        ];

        for (const [nx, ny] of neighbors) {
          if (nx < 0 || ny < 0 || nx >= rect.w || ny >= rect.h) continue;
          const index = ny * rect.w + nx;
          if (visited[index] || !isOpaque(nx, ny)) continue;
          visited[index] = 1;
          queueX[tail] = nx;
          queueY[tail] = ny;
          tail += 1;
        }
      }

      if (pixels >= minPixels) {
        components.push({
          x: rect.x + Math.max(0, minX - padding),
          y: rect.y + Math.max(0, minY - padding),
          w: Math.min(rect.w - 1, maxX + padding) - Math.max(0, minX - padding) + 1,
          h: Math.min(rect.h - 1, maxY + padding) - Math.max(0, minY - padding) + 1,
          pixels,
        });
      }
    }
  }

  components.sort((a, b) => a.x - b.x);
  return components;
}

function pushTightGridFrames(target, canvas, panel, cols, minPixels = 80) {
  for (let i = 0; i < cols; i += 1) {
    const x1 = panel.x + Math.floor((i * panel.w) / cols);
    const x2 = panel.x + Math.floor(((i + 1) * panel.w) / cols);
    const cell = { x: x1, y: panel.y, w: Math.max(1, x2 - x1), h: panel.h };
    const tight = getOpaqueBoundsFromRect(canvas, cell, 18, 1);
    const approxPixels = tight.w * tight.h;
    if (tight.hasPixels && approxPixels >= minPixels) {
      target.push(makeChickenFrame(tight));
    }
  }
}

function extractFramesFromMagentaPanels(atlasCanvas) {
  const animations = { idle: [], walk: [], flap: [], hit: [] };
  const manual = getManualChickenAnimations();

  // White (top) chicken set in Cucco.png screenshot.
  const idleComps = extractOpaqueComponents(atlasCanvas, { x: 5, y: 23, w: 78, h: 24 }, 120, 18, 1);
  for (const comp of idleComps.slice(0, 2)) {
    animations.idle.push(makeChickenFrame(comp, 0.5, 0.9));
  }

  pushTightGridFrames(animations.walk, atlasCanvas, { x: 5, y: 70, w: 88, h: 22 }, 4, 120);  // Beat Flap
  pushTightGridFrames(animations.flap, atlasCanvas, { x: 5, y: 115, w: 88, h: 22 }, 4, 110); // Beat Peck
  pushTightGridFrames(animations.hit, atlasCanvas, { x: 5, y: 205, w: 100, h: 22 }, 4, 120); // Attack Eyes

  if (animations.idle.length < 2) animations.idle = manual.idle;
  if (animations.walk.length < 3) animations.walk = manual.walk;
  if (animations.flap.length < 2) animations.flap = manual.flap;
  if (animations.hit.length < 3) animations.hit = manual.hit;

  return animations;
}

function loadSpriteAtlas(imagePath) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      chickenAtlas.image = image;
      chickenAtlas.animations = getManualChickenAnimations();
      try {
        const processed = createChromaProcessedAtlas(image);
        chickenAtlas.image = processed;
        chickenAtlas.animations = extractFramesFromMagentaPanels(processed);
      } catch (err) {
        // If chroma processing fails in browser, keep original sheet frames.
        console.warn(`Processamento de chroma falhou em ${imagePath}; mantendo atlas original.`, err);
      }

      chickenAtlas.ready = true;
      chickenAtlas.error = null;
      resolve(chickenAtlas);
    };
    image.onerror = () => {
      const err = new Error(`Falha ao carregar sprite atlas em ${imagePath}`);
      chickenAtlas.ready = false;
      chickenAtlas.error = err.message;
      reject(err);
    };
    image.src = imagePath;
  });
}

function loadChickenAtlasWithFallback(paths) {
  const candidates = [...new Set(paths.filter(Boolean))];
  let idx = 0;
  let lastError = null;

  const tryNext = () => {
    if (idx >= candidates.length) {
      return Promise.reject(lastError || new Error("Nenhum caminho valido para Cucco.png"));
    }

    const path = candidates[idx];
    idx += 1;
    return loadSpriteAtlas(path).catch((err) => {
      lastError = err;
      return tryNext();
    });
  };

  return tryNext();
}

function loadImageWithFallback(paths) {
  const candidates = [...new Set(paths.filter(Boolean))];
  let idx = 0;
  let lastError = null;

  const normalizeSrc = (rawPath) => {
    if (!rawPath) return rawPath;
    if (/^[a-zA-Z]:\\/.test(rawPath)) {
      const asUrlPath = rawPath.replace(/\\/g, "/");
      return `file:///${encodeURI(asUrlPath)}`;
    }
    return rawPath;
  };

  const tryNext = () => {
    if (idx >= candidates.length) {
      return Promise.reject(lastError || new Error("Falha ao carregar imagem"));
    }

    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Falha ao carregar imagem em ${candidates[idx]}`));
      image.src = normalizeSrc(candidates[idx]);
      idx += 1;
    }).catch((err) => {
      lastError = err;
      return tryNext();
    });
  };

  return tryNext();
}

function loadFarmAnimalAtlas(paths) {
  return loadImageWithFallback(paths)
    .then((image) => {
      farmAnimalAtlas.image = image;
      farmAnimalAtlas.ready = true;
      farmAnimalAtlas.error = null;
      return farmAnimalAtlas;
    })
    .catch((err) => {
      farmAnimalAtlas.ready = false;
      farmAnimalAtlas.error = err.message;
      throw err;
    });
}

function buildObstacles() {
  const list = [];

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
  const animals = [];

  for (let i = 0; i < WORLD.targetRescues; i += 1) {
    const areaId = settings.spawnPlan[i % settings.spawnPlan.length];
    const area = WORLD.areas.find((a) => a.id === areaId) || WORLD.areas[4];
    const species = SPECIES[i % SPECIES.length];

    let placed = false;
    for (let tries = 0; tries < 140 && !placed; tries += 1) {
      const x = rand(area.x + 70, area.x + area.w - 70);
      const y = rand(area.y + 70, area.y + area.h - 70);

      if (Math.hypot(x - wolfStart.x, y - wolfStart.y) < settings.minSpawnWolfDistance) continue;

      let overlap = false;
      for (const other of animals) {
        if (Math.hypot(other.x - x, other.y - y) < 110) {
          overlap = true;
          break;
        }
      }
      if (overlap) continue;

      const animal = makeEntity(`animal_${i}`, "animal", x, y, 22);
      animal.species = species;
      animal.rescued = false;
      animal.lost = false;
      animal.targetX = x;
      animal.targetY = y;
      animal.hitbox = { ox: 0, oy: 6, r: 13 };
      animals.push(animal);
      placed = true;
    }
  }

  return animals;
}

function createState() {
  const difficultyKey = getDifficultyKey();
  const settings = DIFFICULTIES[difficultyKey];

  const chicken = makeEntity("chicken", "chicken", 240, 260, 26);
  chicken.speed = settings.chickenSpeed;
  chicken.hitbox = { ox: 0, oy: 8, r: 16 };

  const wolf = makeEntity("wolf", "wolf", 2460, 1460, 36);
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

function resetGame() {
  state = createState();
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
  setStatus(`Dificuldade ${state.settings.label}. 3 vidas. Resgate os 10 animais! (${BUILD_TAG})`);
}

function setStatus(text, cssClass) {
  statusTextEl.textContent = text;
  statusTextEl.className = cssClass || "";
}

function refreshHud() {
  livesCountEl.textContent = String(Math.max(0, state.lives));
  scoreCountEl.textContent = String(Math.max(0, Math.floor(state.score)));
}

function finishLose(reason) {
  state.phase = "lose";
  state.gameEndReason = reason;
  setStatus(reason, "lose");
}

function getMoveVector() {
  let dx = 0;
  let dy = 0;

  if (input.has("arrowup") || input.has("w")) dy -= 1;
  if (input.has("arrowdown") || input.has("s")) dy += 1;
  if (input.has("arrowleft") || input.has("a")) dx -= 1;
  if (input.has("arrowright") || input.has("d")) dx += 1;

  const len = Math.hypot(dx, dy);
  if (len === 0) return { x: 0, y: 0 };
  return { x: dx / len, y: dy / len };
}

function updateCamera(dt) {
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
  const chicken = state.entities.chicken;
  const move = getMoveVector();
  const sprint = input.has("shift");
  const speed = chicken.speed * (sprint ? 1.14 : 1);

  chicken.vx = move.x * speed;
  chicken.vy = move.y * speed;
  chicken.x += chicken.vx * dt;
  chicken.y += chicken.vy * dt;
  resolveEnvironment(chicken);

  chicken.state = move.x === 0 && move.y === 0 ? "idle" : "walk";
  chicken.anim += dt * (sprint ? 14 : move.x === 0 && move.y === 0 ? 4 : 9);
  chicken.areaId = getAreaAt(chicken.x, chicken.y).id;
  if (move.x !== 0) chicken.facing = Math.sign(move.x);

  const wolf = state.entities.wolf;
  if (distance(chicken, wolf) < 145) {
    wolf.fearTimer = 0.42;
  }
}

function updateChickenAnimation(dt) {
  const chicken = state.entities.chicken;
  const anim = state.chickenAnim;
  let mode = "idle";

  if (state.phase === "win_cutscene" && !state.cutscene.done) {
    mode = "hit";
  } else if (chicken.state === "walk" && input.has("shift")) {
    mode = "flap";
  } else if (chicken.state === "walk") {
    mode = "walk";
  }

  const fpsByMode = {
    idle: 5,
    walk: 11,
    flap: 15,
    hit: 14,
  };

  if (anim.current !== mode) {
    anim.current = mode;
    anim.frameIndex = 0;
    anim.frameTime = 0;
  }

  anim.fps = fpsByMode[mode] || 8;
  const frames = chickenAtlas.animations[mode] || [];
  const frameCount = Math.max(frames.length, 1);
  const frameDuration = 1 / anim.fps;

  anim.frameTime += dt;
  while (anim.frameTime >= frameDuration) {
    anim.frameTime -= frameDuration;
    anim.frameIndex = (anim.frameIndex + 1) % frameCount;
  }
}

function wolfTargetScore(wolf, animal) {
  let score = distance(wolf, animal);
  if (animal.areaId === wolf.areaId) score *= 0.82;
  if (animal.areaId === state.entities.chicken.areaId) score *= 1.05;
  return score;
}

function getWolfTarget() {
  const wolf = state.entities.wolf;
  let best = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const animal of state.entities.animals) {
    if (animal.rescued || animal.lost) continue;
    const score = wolfTargetScore(wolf, animal);
    if (score < bestScore) {
      best = animal;
      bestScore = score;
    }
  }

  return best;
}

function updateWolf(dt) {
  const wolf = state.entities.wolf;
  wolf.areaId = getAreaAt(wolf.x, wolf.y).id;

  if (wolf.pauseTimer > 0) {
    wolf.pauseTimer -= dt;
    wolf.vx = 0;
    wolf.vy = 0;
    wolf.anim += dt * 2.4;
    return;
  }

  if (wolf.fearTimer > 0) {
    wolf.fearTimer -= dt;
  }

  const patrol = [
    { x: 2360, y: 1380 },
    { x: 2140, y: 280 },
    { x: 740, y: 320 },
    { x: 650, y: 1440 },
    { x: 1500, y: 860 },
  ];

  let tx;
  let ty;
  let speedScale = 1;

  if (wolf.huntUnlockTimer > 0) {
    wolf.huntUnlockTimer -= dt;
    const p = patrol[wolf.patrolIndex % patrol.length];
    tx = p.x;
    ty = p.y;

    if (Math.hypot(wolf.x - p.x, wolf.y - p.y) < 40) {
      wolf.patrolIndex += 1;
    }

    speedScale = 0.65;
  } else {
    const target = getWolfTarget();
    if (target) {
      tx = target.x;
      ty = target.y;
    } else {
      const p = patrol[wolf.patrolIndex % patrol.length];
      tx = p.x;
      ty = p.y;

      if (Math.hypot(wolf.x - p.x, wolf.y - p.y) < 32) {
        wolf.patrolIndex += 1;
      }
    }
  }

  if (wolf.fearTimer > 0) speedScale *= 0.55;

  const dx = tx - wolf.x;
  const dy = ty - wolf.y;
  const len = Math.hypot(dx, dy) || 1;
  const desiredX = (dx / len) * wolf.maxSpeed * speedScale;
  const desiredY = (dy / len) * wolf.maxSpeed * speedScale;

  const maxDelta = wolf.accel * dt;
  wolf.vx += clamp(desiredX - wolf.vx, -maxDelta, maxDelta);
  wolf.vy += clamp(desiredY - wolf.vy, -maxDelta, maxDelta);

  wolf.x += wolf.vx * dt;
  wolf.y += wolf.vy * dt;

  resolveEnvironment(wolf);

  if (wolf.vx !== 0) wolf.facing = Math.sign(wolf.vx);
  wolf.anim += dt * (Math.hypot(wolf.vx, wolf.vy) > 20 ? 8 : 3);
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
  const chicken = state.entities.chicken;
  const wolf = state.entities.wolf;

  for (const animal of state.entities.animals) {
    if (!animal.rescued && !animal.lost) {
      const area = getAreaAt(animal.x, animal.y);
      animal.areaId = area.id;

      const mx = animal.targetX - animal.x;
      const my = animal.targetY - animal.y;
      const len = Math.hypot(mx, my);

      if (len > 5) {
        animal.x += (mx / len) * 50 * dt;
        animal.y += (my / len) * 50 * dt;
        animal.facing = mx >= 0 ? 1 : -1;
      }

      if (Math.random() < 0.006) {
        animal.targetX = clamp(animal.x + rand(-135, 135), area.x + 55, area.x + area.w - 55);
        animal.targetY = clamp(animal.y + rand(-135, 135), area.y + 55, area.y + area.h - 55);
      }

      resolveEnvironment(animal);

      if (circleVsCircle(chicken, animal)) {
        animal.rescued = true;
        state.rescuedCount += 1;
        state.score += SCORE_PER_RESCUE;
        rescuedCountEl.textContent = String(state.rescuedCount);
        refreshHud();
        setStatus("Resgate confirmado. Continue!", "win");
        spawnBurst(animal.x, animal.y, "#e8f8ff", 18);
      } else if (circleVsCircle(wolf, animal)) {
        animal.lost = true;
        state.lostCount += 1;
        state.lives -= 1;
        state.score = Math.max(0, state.score - SCORE_PENALTY_LOSS);
        refreshHud();
        setStatus(`O lobo pegou um animal. Vidas: ${Math.max(0, state.lives)}/3`, "lose");
        wolf.pauseTimer = state.settings.wolfPauseAfterCatch;
        wolf.flash = 0.2;
        spawnBurst(animal.x, animal.y, "#ff7a7a", 22);
      }
    }

    if (animal.rescued) {
      const sx = WORLD.safeZone.x + Math.sin(animal.anim * 0.75 + animal.id.length) * 45;
      const sy = WORLD.safeZone.y + Math.cos(animal.anim * 0.75 + animal.id.length) * 32;
      animal.x = lerp(animal.x, sx, clamp(dt * 2.2, 0, 1));
      animal.y = lerp(animal.y, sy, clamp(dt * 2.2, 0, 1));
    }

    animal.anim += dt * 6;
  }

  if (state.phase === "playing") {
    const active = state.entities.animals.filter((animal) => !animal.rescued && !animal.lost).length;

    if (state.rescuedCount >= WORLD.targetRescues) {
      if (!state.winBonusApplied) {
        state.score += state.lives * SCORE_BONUS_PER_LIFE;
        state.winBonusApplied = true;
        refreshHud();
      }
      startWinCutscene();
    } else if (state.lives <= 0) {
      finishLose("FIM de jogo: o lobo pegou 3 animais.");
    } else if (active === 0) {
      finishLose("FIM de jogo: nao sobraram animais para salvar.");
    }
  }
}

function startWinCutscene() {
  state.phase = "win_cutscene";
  state.cutscene.time = 0;
  state.cutscene.done = false;

  state.cutscene.attackers = state.entities.animals
    .filter((animal) => animal.rescued)
    .map((animal, index, arr) => ({
      ref: animal,
      angle: (Math.PI * 2 * index) / Math.max(arr.length, 1),
      orbitR: 155,
    }));

  setStatus("Todos salvos. Ataque em conjunto!", "win");
}

function updateCutscene(dt) {
  const wolf = state.entities.wolf;
  const cut = state.cutscene;
  cut.time += dt;
  const t = cut.time;

  if (t < 2.3) {
    for (const atk of cut.attackers) {
      atk.angle += dt * 0.95;
      const tx = wolf.x + Math.cos(atk.angle) * atk.orbitR;
      const ty = wolf.y + Math.sin(atk.angle) * atk.orbitR;
      atk.ref.x = lerp(atk.ref.x, tx, clamp(dt * 4.2, 0, 1));
      atk.ref.y = lerp(atk.ref.y, ty, clamp(dt * 4.2, 0, 1));
    }
    setStatus("Cercando o lobo...", "win");
  } else if (t < 6.2) {
    for (const atk of cut.attackers) {
      atk.angle += dt * 2.5;
      const pulse = 115 + Math.sin(t * 6 + atk.angle) * 48;
      const tx = wolf.x + Math.cos(atk.angle) * pulse;
      const ty = wolf.y + Math.sin(atk.angle) * pulse;
      atk.ref.x = lerp(atk.ref.x, tx, clamp(dt * 7.4, 0, 1));
      atk.ref.y = lerp(atk.ref.y, ty, clamp(dt * 7.4, 0, 1));

      if (Math.random() < 0.22) {
        cut.impacts.push({ x: wolf.x + rand(-30, 30), y: wolf.y + rand(-30, 30), life: 0.25 });
        spawnBurst(wolf.x + rand(-22, 22), wolf.y + rand(-22, 22), "#ffd65a", 7);
        camera.shake = 0.18;
        wolf.flash = 0.16;
      }
    }
    setStatus("Porrada coletiva no lobo!", "win");
  } else if (t < 7.5) {
    wolf.injured = true;
    wolf.vx = 0;
    wolf.vy = 0;
    setStatus("Lobo machucado...", "win");
  } else if (t < 9.2) {
    wolf.injured = true;
    wolf.vx = 425;
    wolf.vy = -180;
    wolf.x += wolf.vx * dt;
    wolf.y += wolf.vy * dt;
    wolf.facing = 1;
    setStatus("Lobo fugindo da fazenda!", "win");
  } else {
    cut.done = true;
    setStatus("Parabens! Voce venceu!", "win");
  }

  cut.impacts = cut.impacts.filter((impact) => {
    impact.life -= dt;
    return impact.life > 0;
  });
}

function updateGame(dt) {
  if (state.phase === "playing") {
    updateChicken(dt);
    updateWolf(dt);
    updateAnimals(dt);
  } else if (state.phase === "win_cutscene") {
    updateCutscene(dt);
  }

  updateChickenAnimation(dt);

  if (state.entities.wolf.flash > 0) {
    state.entities.wolf.flash = Math.max(0, state.entities.wolf.flash - dt);
  }

  updateEffects(dt);
  updateCamera(dt);

  const area = getAreaAt(state.entities.chicken.x, state.entities.chicken.y);
  areaTextEl.textContent = area.name;
}
function drawPixelSprite(sprite, palette, x, y, scale, flipX = false) {
  if (!sprite || !palette) return;

  const h = sprite.length;
  const w = sprite[0].length;

  for (let row = 0; row < h; row += 1) {
    const line = sprite[row];
    for (let col = 0; col < w; col += 1) {
      const code = line[col];
      if (!code || code === ".") continue;

      const color = palette[code] || null;
      if (!color) continue;

      const px = flipX ? x + (w - 1 - col) * scale : x + col * scale;
      const py = y + row * scale;
      ctx.fillStyle = color;
      ctx.fillRect(px, py, scale, scale);
    }
  }
}

function drawAreaPattern(area) {
  const x = worldX(area.x);
  const y = worldY(area.y);
  const themes = {
    poleiro: { g1: "#74b664", g2: "#5ea156", soil: "#7c5736", accent: "#3f7f47" },
    granja: { g1: "#69b368", g2: "#539a56", soil: "#6f4e2d", accent: "#4fcf78" },
    estabulo: { g1: "#94a264", g2: "#7f8f57", soil: "#82603e", accent: "#dcc274" },
    horta: { g1: "#62ad5b", g2: "#4f9550", soil: "#6b4d2f", accent: "#56cf74" },
    quintal: { g1: "#66ad61", g2: "#548f53", soil: "#725436", accent: "#5fc57a" },
  };
  const t = themes[area.id] || themes.quintal;

  const grad = ctx.createLinearGradient(x, y, x + area.w * 0.85, y + area.h);
  grad.addColorStop(0, t.g1);
  grad.addColorStop(1, t.g2);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, area.w, area.h);

  ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
  for (let i = 0; i < 210; i += 1) {
    const px = x + (i * 43) % area.w;
    const py = y + (i * 71) % area.h;
    ctx.fillRect(px, py, 2, 2);
  }

  if (area.id === "granja") {
    for (let row = 28; row < area.h; row += 48) {
      ctx.fillStyle = t.soil;
      ctx.fillRect(x + 8, y + row, area.w - 16, 13);
      ctx.fillStyle = t.accent;
      for (let col = 14; col < area.w - 12; col += 34) {
        ctx.fillRect(x + col, y + row + 2, 5, 9);
        ctx.fillRect(x + col + 11, y + row + 2, 5, 9);
      }
    }
  } else if (area.id === "horta") {
    for (let gy = 18; gy < area.h - 20; gy += 76) {
      for (let gx = 14; gx < area.w - 20; gx += 120) {
        ctx.fillStyle = t.soil;
        ctx.fillRect(x + gx, y + gy, 98, 46);
        ctx.fillStyle = t.accent;
        for (let col = 6; col < 92; col += 16) {
          ctx.fillRect(x + gx + col, y + gy + 5, 4, 15);
          ctx.fillRect(x + gx + col + 2, y + gy + 23, 4, 15);
        }
      }
    }
  } else if (area.id === "estabulo") {
    ctx.fillStyle = "rgba(130, 96, 56, 0.4)";
    for (let row = 22; row < area.h; row += 56) {
      ctx.fillRect(x + 6, y + row, area.w - 12, 18);
    }
    ctx.fillStyle = t.accent;
    for (let i = 0; i < 90; i += 1) {
      const hx = x + 14 + (i * 37) % (area.w - 22);
      const hy = y + 14 + (i * 51) % (area.h - 20);
      ctx.fillRect(hx, hy, 7, 2);
    }
  } else if (area.id === "poleiro") {
    ctx.fillStyle = "rgba(95, 67, 42, 0.22)";
    for (let i = 0; i < 68; i += 1) {
      const px = x + 18 + (i * 59) % (area.w - 26);
      const py = y + 20 + (i * 47) % (area.h - 24);
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let row = 24; row < area.h; row += 66) {
      ctx.fillStyle = t.soil;
      ctx.fillRect(x + 10, y + row, area.w - 20, 8);
      ctx.fillStyle = t.accent;
      for (let col = 18; col < area.w - 16; col += 40) {
        ctx.fillRect(x + col, y + row + 1, 4, 12);
      }
    }
  } else {
    ctx.fillStyle = "rgba(105, 78, 44, 0.33)";
    for (let i = 0; i < 62; i += 1) {
      const sx = x + (i * 61) % area.w;
      const sy = y + (i * 43) % area.h;
      ctx.fillRect(sx, sy, 8, 4);
    }
  }

  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fillRect(x + 10, y + 9, 176, 26);
  ctx.fillStyle = "#f6f3d8";
  ctx.font = "bold 19px sans-serif";
  ctx.fillText(area.name, x + 18, y + 29);

  ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, area.w, area.h);
}

function drawStructures() {
  for (const coop of STRUCTURES.coops) {
    const x = worldX(coop.x);
    const y = worldY(coop.y);

    ctx.fillStyle = "#8f5532";
    ctx.fillRect(x, y, coop.w, coop.h);

    ctx.fillStyle = "#6e3d24";
    for (let i = 8; i < coop.w; i += 16) {
      ctx.fillRect(x + i, y + 8, 5, coop.h - 16);
    }

    ctx.fillStyle = "#d4322d";
    ctx.beginPath();
    ctx.moveTo(x - 14, y);
    ctx.lineTo(x + coop.w / 2, y - 32);
    ctx.lineTo(x + coop.w + 14, y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#4c2a18";
    ctx.fillRect(x + coop.w * 0.42, y + coop.h * 0.45, 26, 38);
    ctx.fillStyle = "#b8d6e8";
    ctx.fillRect(x + coop.w * 0.14, y + 20, 18, 14);
    ctx.fillRect(x + coop.w * 0.7, y + 20, 18, 14);
  }

  for (const silo of STRUCTURES.silos) {
    const x = worldX(silo.x);
    const y = worldY(silo.y);

    ctx.beginPath();
    ctx.ellipse(x + silo.w / 2, y + silo.h / 2, silo.w / 2, silo.h / 2, 0, 0, Math.PI * 2);
    const g = ctx.createLinearGradient(x, y, x + silo.w, y);
    g.addColorStop(0, "#a8b1bd");
    g.addColorStop(0.5, "#d1d7df");
    g.addColorStop(1, "#8f98a6");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "#7d8694";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(x + 12, y + 18, 8, silo.h - 36);
  }

  for (const bale of STRUCTURES.hayBales) {
    const x = worldX(bale.x);
    const y = worldY(bale.y);

    ctx.fillStyle = "#d3a83f";
    ctx.fillRect(x, y, bale.w, bale.h);

    ctx.strokeStyle = "#ab7b2e";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, bale.w, bale.h);
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 10);
    ctx.lineTo(x + bale.w - 8, y + 10);
    ctx.moveTo(x + 8, y + 22);
    ctx.lineTo(x + bale.w - 8, y + 22);
    ctx.moveTo(x + 8, y + 34);
    ctx.lineTo(x + bale.w - 8, y + 34);
    ctx.stroke();
  }

  const pond = STRUCTURES.pond;
  const px = worldX(pond.x);
  const py = worldY(pond.y);
  const g = ctx.createRadialGradient(px + pond.w / 2, py + pond.h / 2, 12, px + pond.w / 2, py + pond.h / 2, pond.w / 2);
  g.addColorStop(0, "#9be6ff");
  g.addColorStop(1, "#3f8fc0");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(px + pond.w / 2, py + pond.h / 2, pond.w / 2, pond.h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2f6d94";
  ctx.lineWidth = 3;
  ctx.stroke();

  const barn = STRUCTURES.barn;
  const bx = worldX(barn.x);
  const by = worldY(barn.y);
  ctx.fillStyle = "#884c2c";
  ctx.fillRect(bx, by, barn.w, barn.h);

  ctx.fillStyle = "#d12b2b";
  ctx.beginPath();
  ctx.moveTo(bx - 14, by);
  ctx.lineTo(bx + barn.w / 2, by - 60);
  ctx.lineTo(bx + barn.w + 14, by);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#4f2b18";
  ctx.fillRect(bx + barn.w * 0.39, by + barn.h * 0.38, 40, 58);
  ctx.strokeStyle = "#b56a3e";
  ctx.lineWidth = 2;
  ctx.strokeRect(bx + barn.w * 0.39, by + barn.h * 0.38, 40, 58);
  ctx.fillStyle = "#c7def0";
  ctx.fillRect(bx + 18, by + 20, 26, 18);
  ctx.fillRect(bx + barn.w - 44, by + 20, 26, 18);
}

function drawFences() {
  const fenceRows = [
    { x: 100, y: 510, w: 730 },
    { x: 90, y: 90, w: 740 },
    { x: 1940, y: 610, w: 760 },
    { x: 150, y: 1690, w: 730 },
    { x: 1940, y: 1710, w: 760 },
  ];

  for (const fence of fenceRows) {
    const x = worldX(fence.x);
    const y = worldY(fence.y);

    ctx.fillStyle = "#7d5334";
    ctx.fillRect(x, y, fence.w, 8);
    ctx.fillRect(x, y + 14, fence.w, 7);

    for (let i = 0; i <= fence.w; i += 22) {
      ctx.fillRect(x + i, y - 10, 7, 32);
    }
  }
}

function drawWorld() {
  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0, "#8dc178");
  bg.addColorStop(1, "#6ca05a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const area of WORLD.areas) {
    drawAreaPattern(area);
  }

  for (const path of WORLD.paths) {
    const x = worldX(path.x);
    const y = worldY(path.y);

    ctx.fillStyle = "#cba26a";
    ctx.fillRect(x, y, path.w, path.h);
    ctx.strokeStyle = "#ab834f";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, path.w, path.h);

    ctx.strokeStyle = "rgba(122,90,46,0.35)";
    ctx.lineWidth = 1.5;
    for (let i = 6; i < path.w; i += 26) {
      ctx.beginPath();
      ctx.moveTo(x + i, y + 5);
      ctx.lineTo(x + i - 6, y + path.h - 5);
      ctx.stroke();
    }
  }

  ctx.fillStyle = "rgba(33, 71, 31, 0.17)";
  for (let i = 0; i < 220; i += 1) {
    const tx = (i * 91) % (WORLD.width + 40);
    const ty = (i * 57) % (WORLD.height + 40);
    const sx = worldX(tx);
    const sy = worldY(ty);
    ctx.fillRect(sx, sy, 3, 7);
  }

  drawFences();
  drawStructures();
}

function getChickenPalette() {
  return {
    k: PALETTES.outline,
    r: PALETTES.comb,
    o: PALETTES.beak,
    w: PALETTES.white,
    l: PALETTES.leg,
  };
}

function getWolfPalette(injured) {
  return {
    k: PALETTES.outline,
    d: PALETTES.wolfBody,
    l: PALETTES.wolfLight,
    b: PALETTES.wolfDark,
    w: injured ? "#f8e8d8" : PALETTES.wolfBody,
    o: injured ? "#d5483f" : PALETTES.wolfDark,
  };
}

function drawFallbackChickenCharacter(x, y, facing, anim) {
  const dir = facing < 0 ? -1 : 1;
  const step = Math.sin(anim * 5) * 1.2;

  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (dir < 0) ctx.scale(-1, 1);

  ctx.fillStyle = "#3f2f22";
  ctx.fillRect(-4, 9 + step, 3, 6);
  ctx.fillRect(3, 9 - step, 3, 6);

  drawOutlinedEllipse(0, 1, 12, 9, "#f6f1e8");
  drawOutlinedEllipse(10, -3, 7, 6, "#f6f1e8");
  ctx.fillStyle = "#d74d45";
  ctx.beginPath();
  ctx.arc(11, -9, 3, 0, Math.PI * 2);
  ctx.arc(8, -8, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#db8f34";
  ctx.beginPath();
  ctx.moveTo(16, -3);
  ctx.lineTo(22, -1);
  ctx.lineTo(16, 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(11, -4, 1.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawChicken(entity) {
  const p = worldToScreen(entity);
  const bob = Math.sin(entity.anim * 1.3) * (entity.state === "walk" ? 2.3 : 0.9);

  ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
  ctx.beginPath();
  ctx.ellipse(Math.round(p.x), Math.round(p.y + 17), 20, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  const mode = state.chickenAnim.current;
  const frames = chickenAtlas.animations[mode] || [];
  const frame = frames[state.chickenAnim.frameIndex % Math.max(frames.length, 1)];

  if (chickenAtlas.ready && chickenAtlas.image && frame) {
    const scale = CHICKEN_ATLAS_SCALE;
    const dw = Math.round(frame.sw * scale);
    const dh = Math.round(frame.sh * scale);
    const ox = frame.ox ?? frame.sw * 0.5;
    const oy = frame.oy ?? frame.sh * 0.86;
    const dx = Math.round(-ox * scale);
    const dy = Math.round(-oy * scale);

    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y + bob));
    if (entity.facing < 0) {
      ctx.scale(-1, 1);
    }
    ctx.drawImage(chickenAtlas.image, frame.sx, frame.sy, frame.sw, frame.sh, dx, dy, dw, dh);
    ctx.restore();
    return;
  }

  // Clean fallback when atlas cannot be loaded/processed.
  drawFallbackChickenCharacter(p.x, p.y + bob + 1, entity.facing, entity.anim * CHICKEN_FALLBACK_SCALE);
}

function drawWolf(entity) {
  const p = worldToScreen(entity);
  const bob = Math.sin(entity.anim * 1.65) * 1.8;
  const legSwing = Math.sin(entity.anim * 6.2) * 2.1;

  if (entity.flash > 0) {
    ctx.globalAlpha = 0.8 + Math.sin(entity.flash * 80) * 0.2;
  }

  ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
  ctx.beginPath();
  ctx.ellipse(Math.round(p.x), Math.round(p.y + 22), 24, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  const dir = entity.facing < 0 ? -1 : 1;
  ctx.save();
  ctx.translate(Math.round(p.x), Math.round(p.y + bob));
  if (dir < 0) ctx.scale(-1, 1);

  const furBase = entity.injured ? "#8d949f" : "#757f8d";
  const furMid = entity.injured ? "#b7bdc6" : "#9ea8b7";
  const furDark = "#4a5362";

  ctx.fillStyle = furDark;
  ctx.beginPath();
  ctx.moveTo(-20, -3);
  ctx.lineTo(-34, -14);
  ctx.lineTo(-26, 1);
  ctx.closePath();
  ctx.fill();

  drawOutlinedEllipse(-6, 2, 21, 13, furBase);
  drawOutlinedEllipse(8, 1, 15, 11, furMid);
  drawOutlinedEllipse(18, -6, 11, 9, furBase);
  drawOutlinedEllipse(28, -2, 6, 4.6, "#d2d4da");

  ctx.fillStyle = furDark;
  ctx.beginPath();
  ctx.moveTo(12, -12);
  ctx.lineTo(15, -22);
  ctx.lineTo(20, -12);
  ctx.closePath();
  ctx.moveTo(20, -11);
  ctx.lineTo(24, -20);
  ctx.lineTo(29, -11);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = PALETTES.outline;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#2d2f34";
  ctx.fillRect(-12, 10 + legSwing, 5, 11);
  ctx.fillRect(-1, 10 - legSwing, 5, 11);
  ctx.fillRect(10, 10 + legSwing * 0.8, 5, 11);
  ctx.fillRect(20, 10 - legSwing * 0.8, 5, 11);

  ctx.fillStyle = entity.injured ? "#da3f3f" : "#b32929";
  ctx.beginPath();
  ctx.arc(22, -7, 2, 0, Math.PI * 2);
  ctx.fill();

  if (entity.injured) {
    ctx.fillStyle = "#f3e3c8";
    ctx.fillRect(1, -1, 10, 4);
    ctx.fillRect(17, 1, 9, 4);
    ctx.strokeStyle = "#b4865d";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(4, -1);
    ctx.lineTo(4, 3);
    ctx.moveTo(8, -1);
    ctx.lineTo(8, 3);
    ctx.moveTo(20, 1);
    ctx.lineTo(20, 5);
    ctx.stroke();

    ctx.fillStyle = "#d03434";
    ctx.beginPath();
    ctx.arc(13, -18, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawOutlinedEllipse(cx, cy, rx, ry, fill, stroke = PALETTES.outline, lineWidth = 2) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function drawAnimalCharacter(species, x, y, facing, anim) {
  const dir = facing < 0 ? -1 : 1;
  const step = Math.sin(anim * 6.2) * 1.5;
  const blink = Math.sin(anim * 1.8) > 0.93;

  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (dir < 0) ctx.scale(-1, 1);

  if (species === "duck") {
    ctx.fillStyle = "#d08a37";
    ctx.fillRect(-4, 8 + step * 0.35, 3, 6);
    ctx.fillRect(2, 8 - step * 0.35, 3, 6);
    drawOutlinedEllipse(0, 1, 10, 7.5, "#f4e173");
    drawOutlinedEllipse(10, -4, 5, 5, "#f4e173");
    ctx.fillStyle = "#df8b34";
    ctx.beginPath();
    ctx.moveTo(15, -4);
    ctx.lineTo(21, -2);
    ctx.lineTo(15, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#edcd53";
    ctx.beginPath();
    ctx.ellipse(1, 0, 6, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (species === "cow") {
    ctx.fillStyle = "#3a3126";
    ctx.fillRect(-9, 9 + step, 4, 7);
    ctx.fillRect(0, 9 - step, 4, 7);
    ctx.fillRect(9, 9 + step * 0.7, 4, 7);
    drawOutlinedEllipse(0, 1, 15, 9.5, "#f6f6f6");
    drawOutlinedEllipse(14, -2, 8, 6.5, "#ececec");
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.ellipse(-4, 0, 4.5, 3.2, 0.2, 0, Math.PI * 2);
    ctx.ellipse(4, 2, 4, 2.5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d9a8ac";
    ctx.fillRect(15, -1, 6, 4);
  } else if (species === "donkey") {
    ctx.fillStyle = "#4f463c";
    ctx.fillRect(-8, 9 + step, 4, 7);
    ctx.fillRect(1, 9 - step, 4, 7);
    ctx.fillRect(10, 9 + step * 0.7, 4, 7);
    drawOutlinedEllipse(0, 1, 14, 9, "#b8b8b8");
    drawOutlinedEllipse(14, -2, 7, 6, "#a7a7a7");
    ctx.fillStyle = "#616161";
    ctx.fillRect(9, -15, 3, 10);
    ctx.fillRect(13, -13, 3, 8);
    ctx.fillRect(0, -8, 2.4, 9);
  } else if (species === "rabbit") {
    ctx.fillStyle = "#8b7b74";
    ctx.fillRect(-5, 8 + step * 0.8, 3, 6);
    ctx.fillRect(2, 8 - step * 0.8, 3, 6);
    drawOutlinedEllipse(-1, 1, 10, 7.5, "#f9f9f9");
    drawOutlinedEllipse(9, -2, 5.5, 5, "#f9f9f9");
    ctx.fillStyle = "#ffd2df";
    ctx.fillRect(8, -14, 2.6, 9);
    ctx.fillRect(12, -13, 2.6, 8);
    ctx.strokeStyle = PALETTES.outline;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(8, -14, 2.6, 9);
    ctx.strokeRect(12, -13, 2.6, 8);
    ctx.fillStyle = "#f6f6f6";
    ctx.beginPath();
    ctx.arc(-8, 1, 2.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (species === "sheep" || species === "lamb") {
    ctx.fillStyle = "#4a3e35";
    ctx.fillRect(-6, 8 + step, 3, 6);
    ctx.fillRect(2, 8 - step, 3, 6);
    drawOutlinedEllipse(-2, 1, 10, 8, "#fbfbfb");
    drawOutlinedEllipse(7, 1, 9, 7.5, "#f7f7f7");
    drawOutlinedEllipse(14, -1, 6.2, 5.2, "#4a4a4a");
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.arc(-8 + i * 3.6, -4 + (i % 2), 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (species === "pig") {
    ctx.fillStyle = "#7b5663";
    ctx.fillRect(-6, 8 + step, 3, 6);
    ctx.fillRect(2, 8 - step, 3, 6);
    drawOutlinedEllipse(0, 1, 13, 8.2, "#f6aabb");
    drawOutlinedEllipse(13, -1, 7, 6, "#f8b6c5");
    drawOutlinedEllipse(17, 1, 4, 3.2, "#f09db2");
    ctx.fillStyle = "#96546b";
    ctx.fillRect(16, 0, 1.2, 1.8);
    ctx.fillRect(18.2, 0, 1.2, 1.8);
    ctx.strokeStyle = "#9b5e74";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-11, 0, 3, 0.7, Math.PI * 1.8);
    ctx.stroke();
  } else if (species === "goat") {
    ctx.fillStyle = "#58473a";
    ctx.fillRect(-6, 8 + step, 3, 6);
    ctx.fillRect(2, 8 - step, 3, 6);
    drawOutlinedEllipse(0, 1, 12, 8, "#e7d7bf");
    drawOutlinedEllipse(12, -2, 6.5, 5.2, "#ceb89a");
    ctx.strokeStyle = "#7b644b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, -6);
    ctx.lineTo(6, -11);
    ctx.moveTo(12, -6);
    ctx.lineTo(14, -11);
    ctx.stroke();
    ctx.fillStyle = "#8e755a";
    ctx.beginPath();
    ctx.moveTo(13, 2);
    ctx.lineTo(16, 6.2);
    ctx.lineTo(11, 5.3);
    ctx.closePath();
    ctx.fill();
  } else if (species === "dog") {
    ctx.fillStyle = "#4e3826";
    ctx.fillRect(-7, 8 + step, 3, 6);
    ctx.fillRect(2, 8 - step, 3, 6);
    drawOutlinedEllipse(0, 1, 12.5, 8, "#d2ab7c");
    drawOutlinedEllipse(12, -2, 6.5, 5.2, "#c5956a");
    ctx.fillStyle = "#61412b";
    ctx.beginPath();
    ctx.ellipse(10, -4, 2.2, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#cf4343";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(4, 1);
    ctx.lineTo(10, 1);
    ctx.stroke();
  } else if (species === "cat") {
    ctx.fillStyle = "#4f3a2b";
    ctx.fillRect(-6, 8 + step, 3, 6);
    ctx.fillRect(2, 8 - step, 3, 6);
    drawOutlinedEllipse(0, 1, 11.5, 7.5, "#c2966d");
    drawOutlinedEllipse(10, -2, 5.4, 5, "#b88962");
    ctx.fillStyle = "#c2966d";
    ctx.beginPath();
    ctx.moveTo(7, -6);
    ctx.lineTo(8.7, -10);
    ctx.lineTo(10.8, -6);
    ctx.closePath();
    ctx.moveTo(11, -6);
    ctx.lineTo(13, -10);
    ctx.lineTo(15.2, -6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PALETTES.outline;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.strokeStyle = "#5b402c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.quadraticCurveTo(-16, -3, -17, -8);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#49392a";
    ctx.fillRect(-6, 8 + step, 3, 6);
    ctx.fillRect(2, 8 - step, 3, 6);
    drawOutlinedEllipse(0, 1, 12, 8, "#e2d3bc");
    drawOutlinedEllipse(12, -1, 6.2, 5.2, "#c8b69b");
  }

  ctx.strokeStyle = "#111";
  ctx.lineWidth = 1.2;
  if (blink) {
    ctx.beginPath();
    ctx.moveTo(12, -3);
    ctx.lineTo(14, -3);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(13, -3, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawFarmAnimalFromAtlas(species, entity, p, bob) {
  // Disabled: custom drawing per species is clearer than forcing 3-row atlas for all animals.
  return false;
}

function drawAnimal(entity) {
  const parsedId = Number(String(entity.id).replace(/\D/g, "")) || 0;
  const fallbackKey = SPECIES[parsedId % SPECIES.length];
  const speciesKey = SPECIES_COLORS[entity.species] ? entity.species : fallbackKey;
  const p = worldToScreen(entity);
  const bob = Math.sin(entity.anim * 1.3) * 1.2;
  const shadow = {
    sheep: [15, 5],
    pig: [16, 5],
    goat: [15, 5],
    cow: [20, 6],
    duck: [13, 4],
    rabbit: [13, 4],
    dog: [16, 5],
    cat: [15, 5],
    donkey: [20, 6],
    lamb: [14, 5],
  }[speciesKey] || [15, 5];

  if (entity.lost) ctx.globalAlpha = 0.22;

  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.beginPath();
  ctx.ellipse(Math.round(p.x), Math.round(p.y + 16), shadow[0], shadow[1], 0, 0, Math.PI * 2);
  ctx.fill();

  drawAnimalCharacter(speciesKey, p.x, p.y + bob, entity.facing, entity.anim);

  if (entity.rescued) {
    ctx.strokeStyle = "#49a6ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y + 3, 23, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
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

  for (const animal of state.entities.animals) {
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

  ctx.fillStyle = "rgba(0,0,0,0.48)";
  ctx.fillRect(x, y, w, h);

  const sx = w / WORLD.width;
  const sy = h / WORLD.height;

  ctx.strokeStyle = "#f7f7f7";
  ctx.lineWidth = 1;
  for (const area of WORLD.areas) {
    ctx.strokeRect(x + area.x * sx, y + area.y * sy, area.w * sx, area.h * sy);
  }

  ctx.fillStyle = "#fff0cf";
  ctx.beginPath();
  ctx.arc(x + state.entities.chicken.x * sx, y + state.entities.chicken.y * sy, 3.5, 0, Math.PI * 2);
  ctx.fill();

  if (!state.cutscene.done) {
    ctx.fillStyle = "#d64040";
    ctx.beginPath();
    ctx.arc(x + state.entities.wolf.x * sx, y + state.entities.wolf.y * sy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEndPanel(title, subtitle, isWin) {
  const panelW = 650;
  const panelH = 310;
  const x = (canvas.width - panelW) / 2;
  const y = (canvas.height - panelH) / 2;

  ctx.fillStyle = isWin ? "rgba(12, 47, 14, 0.58)" : "rgba(0, 0, 0, 0.58)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const grad = ctx.createLinearGradient(x, y, x, y + panelH);
  grad.addColorStop(0, isWin ? "#f2ffe2" : "#fff2e8");
  grad.addColorStop(1, isWin ? "#d7efb6" : "#ffd7c4");
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, panelW, panelH);

  ctx.strokeStyle = isWin ? "#4f8f41" : "#b64a3d";
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, panelW, panelH);

  ctx.textAlign = "center";
  ctx.fillStyle = isWin ? "#1f5b1b" : "#7f241f";
  ctx.font = "bold 46px sans-serif";
  ctx.fillText(title, canvas.width / 2, y + 65);

  ctx.fillStyle = "#2a2a2a";
  ctx.font = "20px sans-serif";
  ctx.fillText(subtitle, canvas.width / 2, y + 98);

  ctx.font = "bold 22px sans-serif";
  ctx.fillText(`Pontuacao Final: ${Math.floor(state.score)}`, canvas.width / 2, y + 148);
  ctx.fillText(`Resgatados: ${state.rescuedCount}/10`, canvas.width / 2, y + 178);
  ctx.fillText(`Animais perdidos: ${state.lostCount}`, canvas.width / 2, y + 208);
  ctx.fillText(`Vidas restantes: ${Math.max(0, state.lives)}/3`, canvas.width / 2, y + 238);

  ctx.font = "19px sans-serif";
  ctx.fillText("Clique em Reiniciar para jogar de novo.", canvas.width / 2, y + 275);
}

function drawOverlay() {
  if (state.phase === "lose") {
    drawEndPanel("FIM DE JOGO", state.gameEndReason || "O lobo venceu desta vez.", false);
  }

  if (state.phase === "win_cutscene" && state.cutscene.done) {
    drawEndPanel("PARABENS!", "Voce salvou a fazenda inteira!", true);
  }

  if (state.phase === "playing" && state.entities.wolf.huntUnlockTimer > 0) {
    ctx.fillStyle = "rgba(0,0,0,0.34)";
    ctx.fillRect(18, canvas.height - 42, 280, 26);
    ctx.fillStyle = "#ffe9a9";
    ctx.font = "16px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Lobo distraido por ${state.entities.wolf.huntUnlockTimer.toFixed(1)}s`, 24, canvas.height - 23);
  }

  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(canvas.width - 178, canvas.height - 24, 170, 16);
  ctx.fillStyle = "#fff6cb";
  ctx.font = "11px monospace";
  ctx.textAlign = "right";
  ctx.fillText(BUILD_TAG, canvas.width - 10, canvas.height - 12);
}

function renderGame() {
  drawWorld();

  const animals = [...state.entities.animals].sort((a, b) => a.y - b.y);
  for (const animal of animals) {
    if (!animal.lost || state.phase === "win_cutscene") {
      drawAnimal(animal);
    }
  }

  drawChicken(state.entities.chicken);
  if (!state.cutscene.done || state.phase !== "win_cutscene") {
    drawWolf(state.entities.wolf);
  }

  drawEffects();
  drawDebugHitboxes();
  drawMiniMap();
  drawOverlay();
}

function tick(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  updateGame(dt);
  renderGame();
  requestAnimationFrame(tick);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (key === "h" && !event.repeat && state) {
    state.debugHitboxes = !state.debugHitboxes;
    setStatus(state.debugHitboxes ? "DEBUG HITBOX ligado (H para ocultar)." : "DEBUG HITBOX desligado.");
  }

  input.add(key);
});

window.addEventListener("keyup", (event) => {
  input.delete(event.key.toLowerCase());
});

difficultySelect.addEventListener("change", () => {
  const key = getDifficultyKey();
  setStatus(`Selecionado ${DIFFICULTIES[key].label}. Vidas continuam em 3. Clique em Reiniciar para aplicar.`);
});

restartBtn.addEventListener("click", () => {
  input.clear();
  resetGame();
});

buildObstacles();
resetGame();
loadChickenAtlasWithFallback(CHICKEN_SPRITE_CANDIDATES).catch((err) => {
  console.error(err);
  if (state) {
    setStatus("Falha ao carregar Cucco.png. Usando fallback temporario.", "lose");
  }
});
loadFarmAnimalAtlas(FARM_ATLAS_CANDIDATES).catch((err) => {
  console.warn("Nao foi possivel carregar atlas de pato/cao/gato.", err);
});
requestAnimationFrame((t) => {
  lastTime = t;
  tick(t);
});
