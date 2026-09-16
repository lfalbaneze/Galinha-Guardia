/* A seeded farm layout. Roads and clearings are reserved before any solid is placed. */
const WorldGenerator = (() => {
  const WIDTH = 2800;
  const HEIGHT = 1800;
  const MARGIN = 38;
  const THEMES = [
    { id: "poleiro", name: "Poleiro", base: "#85aa65", line: "#8c754c", mark: "#f5d875" },
    { id: "granja", name: "Granja", base: "#93b774", line: "#887348", mark: "#e8c980" },
    { id: "estabulo", name: "Estábulo", base: "#a8b979", line: "#8b754c", mark: "#d9ac79" },
    { id: "horta", name: "Horta", base: "#789f63", line: "#786347", mark: "#bfd276" },
    { id: "quintal", name: "Quintal", base: "#8cb681", line: "#847651", mark: "#9bd5bd" },
  ];

  function normalizeSeed(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value >>> 0;
    const text = String(value ?? "fazenda-dos-amigos");
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    return hash >>> 0;
  }

  function randomSource(seed) {
    let value = seed;
    return () => {
      value = (value + 0x6D2B79F5) | 0;
      let t = Math.imul(value ^ value >>> 15, 1 | value);
      t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function overlaps(a, b, gap = 0) {
    return a.x < b.x + b.w + gap && a.x + a.w > b.x - gap &&
      a.y < b.y + b.h + gap && a.y + a.h > b.y - gap;
  }

  function generate(value) {
    const seed = normalizeSeed(value);
    const random = randomSource(seed);
    const integer = (min, max) => Math.floor(min + random() * (max - min + 1));
    const pick = values => values[integer(0, values.length - 1)];
    const shuffled = [1, 2, 3, 4];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = integer(0, i);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Slots leave generous meadow between districts; their identities and footprints change.
    const slots = [
      { x: 1920, y: 100, w: 750, h: 460 },
      { x: 1030, y: 660, w: 740, h: 480 },
      { x: 110, y: 1190, w: 740, h: 480 },
      { x: 1930, y: 1200, w: 740, h: 470 },
    ];
    const areas = [{ ...THEMES[0], x: 80, y: 70, w: 760, h: 480, hub: { x: 620, y: 390 } }];
    const slotAreas = slots.map((slot, i) => {
      const x = slot.x + integer(-35, 35);
      const y = slot.y + integer(-30, 30);
      const w = slot.w + integer(-30, 20);
      const h = slot.h + integer(-25, 20);
      const area = { ...THEMES[shuffled[i]], x, y, w, h,
        hub: { x: Math.round(x + w * 0.5), y: Math.round(y + h * 0.54) } };
      areas.push(area);
      return area;
    });
    // Preserve the familiar ID order for systems that use the fifth area as a fallback.
    areas.sort((a, b) => THEMES.findIndex(t => t.id === a.id) - THEMES.findIndex(t => t.id === b.id));

    const start = { x: 380, y: 390 };
    const paths = [];
    function segment(a, b, width = 94) {
      if (a.x === b.x && a.y === b.y) return;
      paths.push({ x: Math.min(a.x, b.x) - width / 2, y: Math.min(a.y, b.y) - width / 2,
        w: Math.abs(a.x - b.x) + width, h: Math.abs(a.y - b.y) + width });
    }
    function connect(a, b, horizontalFirst = true) {
      const turn = horizontalFirst ? { x: b.x, y: a.y } : { x: a.x, y: b.y };
      segment(a, turn);
      segment(turn, b);
    }
    const upperJunction = { x: slotAreas[1].hub.x + integer(-60, 60), y: 390 };
    const lowerJunction = { x: upperJunction.x, y: integer(1390, 1450) };
    connect(start, upperJunction);
    connect(upperJunction, slotAreas[0].hub);
    connect(upperJunction, slotAreas[1].hub, false);
    connect(slotAreas[1].hub, lowerJunction);
    connect(lowerJunction, slotAreas[2].hub);
    connect(lowerJunction, slotAreas[3].hub);
    // A second route makes chasing less linear and creates open loops through the farm.
    const westLane = { x: integer(910, 955), y: 390 };
    connect(westLane, { x: westLane.x, y: slotAreas[2].hub.y });
    connect({ x: westLane.x, y: slotAreas[2].hub.y }, slotAreas[2].hub);
    const eastLane = { x: integer(1820, 1880), y: slotAreas[0].hub.y };
    connect(slotAreas[0].hub, eastLane);
    connect(eastLane, { x: eastLane.x, y: slotAreas[3].hub.y });
    connect({ x: eastLane.x, y: slotAreas[3].hub.y }, slotAreas[3].hub);

    const animalSpawns = [];
    for (const area of areas) {
      for (const side of [-1, 1]) {
        animalSpawns.push({ x: area.hub.x + side * integer(112, 140),
          y: area.hub.y + integer(-14, 14), areaId: area.id });
      }
    }
    const wolfStart = { x: lowerJunction.x, y: lowerJunction.y };
    const reserves = [
      { x: 80, y: 160, w: 320, h: 330 },
      ...animalSpawns.map(p => ({ x: p.x - 64, y: p.y - 64, w: 128, h: 128 })),
      ...[start, wolfStart].map(p => ({ x: p.x - 60, y: p.y - 60, w: 120, h: 120 })),
    ];
    const structures = { coops: [], silos: [], hayBales: [],
      pond: { x: integer(1080, 1530), y: integer(50, 65), w: integer(225, 290), h: integer(140, 155) },
      barn: { x: 115, y: 38, w: 190, h: 112 } };
    const solids = [structures.barn, structures.pond];

    function legal(rect, gap = 72) {
      return rect.x >= MARGIN && rect.y >= MARGIN && rect.x + rect.w <= WIDTH - MARGIN &&
        rect.y + rect.h <= HEIGHT - MARGIN &&
        !paths.some(path => overlaps(rect, path, 26)) &&
        !reserves.some(reserve => overlaps(rect, reserve, 12)) &&
        !solids.some(solid => overlaps(rect, solid, gap));
    }

    // Rejection sampling is bounded. A stable scan provides a fallback on crowded plots.
    function place(area, w, h, gap = 72) {
      const bounds = { x: area.x + 40, y: area.y + 54,
        right: area.x + area.w - w - 38, bottom: area.y + area.h - h - 32 };
      for (let attempt = 0; attempt < 90; attempt++) {
        const rect = { x: integer(bounds.x, bounds.right), y: integer(bounds.y, bounds.bottom), w, h };
        if (legal(rect, gap)) return rect;
      }
      for (let y = bounds.y; y <= bounds.bottom; y += 18) {
        for (let x = bounds.x; x <= bounds.right; x += 18) {
          const rect = { x, y, w, h };
          if (legal(rect, gap)) return rect;
        }
      }
      return null;
    }
    function addStructure(area, kind, w, h) {
      const rect = place(area, w, h);
      if (!rect) return;
      rect.areaId = area.id;
      rect.variant = integer(0, 2);
      structures[kind].push(rect);
      solids.push(rect);
    }
    const vegetation = [];
    // Reserve one mature tree per district before placing buildings in the remaining lots.
    for (const area of areas) {
      const rect = place(area, 104, 70, 52);
      if (!rect) continue;
      vegetation.push({ id: `green-${vegetation.length}`, type: "tree", ...rect,
        areaId: area.id, variant: integer(0, 2),
        blockingRect: { x: rect.x + 42, y: rect.y + 4, w: 20, h: 18, type: "tree" } });
      solids.push(rect);
    }
    for (const area of areas) {
      if (area.id === "granja" || area.id === "estabulo") {
        addStructure(area, "silos", 80, integer(108, 124));
      }
      if (area.id === "poleiro" || area.id === "granja") {
        addStructure(area, "coops", integer(110, 135), integer(72, 88));
        addStructure(area, "coops", integer(100, 125), integer(72, 88));
      }
      if (area.id === "estabulo") addStructure(area, "coops", 148, 92);
      for (let i = 0; i < (area.id === "estabulo" ? 5 : 2); i++) {
        addStructure(area, "hayBales", integer(62, 78), integer(38, 47));
      }
    }

    function addBush(x, y, areaId, suffix = "") {
      const rect = { x: Math.round(x - 52), y: Math.round(y - 35), w: 104, h: 70 };
      if (solids.some(s => overlaps(rect, s, 10))) return;
      if (vegetation.some(v => overlaps(rect, v, 14))) return;
      vegetation.push({ id: `green-${vegetation.length}${suffix}`, type: "bush", ...rect,
        areaId, variant: integer(0, 2), blockingRect: null });
    }
    // Every rescue has usable cover, placed after solids so it cannot conceal an obstacle.
    for (const spawn of animalSpawns) addBush(spawn.x, spawn.y - 18, spawn.areaId, "-rescue");
    for (const area of areas) {
      for (let i = 0; i < 5; i++) {
        const rect = place(area, 104, 70, 52);
        if (!rect || vegetation.some(v => overlaps(rect, v, 12))) continue;
        const tree = i % 3 !== 0;
        const blockingRect = tree ? { x: rect.x + 42, y: rect.y + 4, w: 20, h: 18, type: "tree" } : null;
        vegetation.push({ id: `green-${vegetation.length}`, type: tree ? "tree" : "bush",
          ...rect, areaId: area.id, variant: integer(0, 2), blockingRect });
        // Reserve the entire canopy's ground footprint from subsequent buildings/trees.
        solids.push(rect);
      }
    }
    // Low cover beside each route also gives the player options between districts.
    for (const path of paths) {
      const horizontal = path.w >= path.h;
      const length = horizontal ? path.w : path.h;
      for (let offset = 140; offset < length - 80; offset += integer(250, 330)) {
        const side = random() < 0.5 ? -1 : 1;
        const x = horizontal ? path.x + offset : path.x + path.w / 2 + side * 56;
        const y = horizontal ? path.y + path.h / 2 + side * 44 : path.y + offset;
        if (x < 430 && y < 500) continue;
        addBush(x, y, null, "-trail");
      }
    }

    const decorations = [];
    function decorLegal(x, y, size = 8) {
      const point = { x: x - size, y: y - size, w: size * 2, h: size * 2 };
      return !solids.some(s => overlaps(point, s, 8)) && !paths.some(p => overlaps(point, p, 5));
    }
    for (let i = 0; i < 430; i++) {
      const x = integer(35, WIDTH - 35), y = integer(40, HEIGHT - 35);
      if (!decorLegal(x, y)) continue;
      decorations.push({ type: pick(["grass", "grass", "flower", "flower", "stone"]), x, y,
        variant: integer(0, 3), size: integer(3, 9) });
    }
    const garden = areas.find(a => a.id === "horta");
    for (let y = garden.y + 72; y < garden.y + garden.h - 35; y += 32) {
      for (let x = garden.x + 56; x < garden.x + garden.w - 35; x += 32) {
        if (decorLegal(x, y, 14) && !vegetation.some(v => overlaps({ x: x - 12, y: y - 12, w: 24, h: 24 }, v))) {
          decorations.push({ type: "crop", x, y, variant: Math.floor((y - garden.y) / 32) % 3, size: 12 });
        }
      }
    }
    for (const area of areas.filter(a => a.id === "granja" || a.id === "estabulo")) {
      for (let i = 0; i < 55; i++) {
        const x = integer(area.x + 38, area.x + area.w - 38);
        const y = integer(area.y + 40, area.y + area.h - 38);
        if (decorLegal(x, y, 12) && !vegetation.some(v => overlaps({ x: x - 10, y: y - 10, w: 20, h: 20 }, v))) {
          decorations.push({ type: i % 5 === 0 ? "sunflower" : "wheat", x, y, variant: integer(0, 2), size: 12 });
        }
      }
    }
    for (const area of areas) {
      for (let x = area.x + 30; x < area.x + area.w - 95; x += 98) {
        for (const y of [area.y + 18, area.y + area.h - 18]) {
          const fence = { x, y, w: 70, h: 10 };
          if (!paths.some(p => overlaps(fence, p, 35)) && !solids.some(s => overlaps(fence, s, 20)) &&
            !reserves.some(r => overlaps(fence, r, 5))) {
            decorations.push({ type: "fence", ...fence, variant: 0 });
          }
        }
      }
    }

    // These small clearings lie on the reserved roads. Add them last so older
    // seeds retain every building, bush and friend in exactly the same place.
    const chickSpawns = areas.map(area => ({ x: area.hub.x + integer(-18, 18),
      y: area.hub.y + integer(8, 22), areaId: area.id }));
    const lastArea = areas.find(area => area.id === "quintal");
    chickSpawns.push({ x: lastArea.hub.x - 40, y: lastArea.hub.y - 26, areaId: lastArea.id });
    // An independent stream relocates rescues without changing any old seed's geometry.
    const exploreRandom = randomSource(seed ^ 0x65e32a91);
    const blockers = [structures.barn, structures.pond, ...structures.coops, ...structures.silos,
      ...structures.hayBales, ...vegetation.map(v => v.blockingRect).filter(Boolean)];
    const chosen = [];
    for (const spawn of [...chickSpawns, ...animalSpawns]) {
      const area = areas.find(a => a.id === spawn.areaId);
      const options = vegetation.filter(v => v.areaId === area.id).map(v => ({
        x: v.x + v.w / 2, y: v.y + v.h - 12, areaId: area.id
      }));
      // Quiet corners of the orchard/fields provide fallback homes away from road centres.
      for (let y = area.y + 70; y < area.y + area.h - 55; y += 48)
        for (let x = area.x + 70; x < area.x + area.w - 55; x += 48)
          if (!paths.some(p => overlaps({ x:x-22, y:y-22, w:44, h:44 },p))) options.push({x,y,areaId:area.id});
      const candidates = options.filter(p => Math.hypot(p.x - area.hub.x, p.y - area.hub.y) > 165 &&
        !(p.x < 405 && p.y < 485) &&
        vegetation.some(v => Math.hypot(p.x-v.x-v.w/2,p.y-v.y-v.h+15) <= 180) &&
        p.y < area.y + area.h - 30 && Math.hypot(p.x - start.x, p.y - start.y) > 230 &&
        !chosen.some(q => Math.hypot(p.x - q.x, p.y - q.y) < 95) &&
        blockers.every(o => Math.hypot(p.x - Math.max(o.x, Math.min(p.x, o.x+o.w)),
          p.y - Math.max(o.y, Math.min(p.y, o.y+o.h))) > 30));
      if (candidates.length) Object.assign(spawn, candidates[Math.floor(exploreRandom() * candidates.length)]);
      chosen.push({ ...spawn });
    }
    return { seed, width: WIDTH, height: HEIGHT, areas, paths, structures, vegetation,
      decorations, animalSpawns, chickSpawns, start, wolfStart };
  }
  return { generate, normalizeSeed };
})();
