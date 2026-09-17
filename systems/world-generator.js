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

  function generate(value, version = 4, layoutAttempt = 0, onPacked = null) {
    if(version>=4) {
      let packedAttempt=layoutAttempt;
      const composed=compose(generate(value,3,layoutAttempt,attempt=>{packedAttempt=attempt;}));
      if(composed)return composed;
      if(packedAttempt<128)return generate(value,4,packedAttempt+1);
      throw new Error('Unable to compose accessible farm habitats');
    }
    version = version === 1 ? 1 : version === 2 ? 2 : 3;
    const seed = normalizeSeed(value);
    const random = randomSource(seed ^ Math.imul(layoutAttempt, 0x9e3779b9));
    const integer = (min, max) => Math.floor(min + random() * (max - min + 1));
    const pick = values => values[integer(0, values.length - 1)];
    const shuffled = [1, 2, 3, 4];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = integer(0, i);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    let areas, wolfStart;
    const start = { x: 380, y: 390 }, paths = [], connections = [];
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
    if (version === 1) {
      // Slots leave generous meadow between districts; their identities and footprints change.
      const slots = [
        { x: 1920, y: 100, w: 750, h: 460 },
        { x: 1030, y: 660, w: 740, h: 480 },
        { x: 110, y: 1190, w: 740, h: 480 },
        { x: 1930, y: 1200, w: 740, h: 470 },
      ];
      areas = [{ ...THEMES[0], x: 80, y: 70, w: 760, h: 480, hub: { x: 620, y: 390 } }];
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

      wolfStart = { x: lowerJunction.x, y: lowerJunction.y };
    } else {
      // Sample entire districts, not identities in a fixed five-slot skeleton.
      // Retry the bounded packing as a whole, preserving reproducibility.
      for (let layoutTry = 0; layoutTry < 32; layoutTry++) {
        areas = [{ ...THEMES[0], x: 80, y: 70, w: integer(740, 840), h: integer(480, 550),
          hub: { x: integer(550, 660), y: integer(350, 430) } }];
        for (const themeIndex of shuffled) {
          for (let attempt = 0; attempt < 400; attempt++) {
            const w = integer(700, 850), h = integer(460, 560);
            const rect = { x: integer(65, WIDTH - w - 65), y: integer(65, HEIGHT - h - 65), w, h };
            if (areas.some(a => overlaps(rect, a, 105))) continue;
            areas.push({ ...THEMES[themeIndex], ...rect,
              hub: { x: Math.round(rect.x + w * (.42 + random() * .16)),
                y: Math.round(rect.y + h * (version >= 3 ? .78 + random() * .05 : .47 + random() * .12)) } });
            break;
          }
        }
        if (areas.length === 5) break;
      }
      // Guaranteed, deterministic fallback for an unusually crowded packing.
      if (areas.length !== 5) {
        const fallback = [[1940,90],[1030,650],[100,1200],[1940,1200]];
        areas = [{ ...THEMES[0], x:80,y:70,w:760,h:480,hub:{x:620,y:390} },
          ...fallback.map(([x,y],i) => ({ ...THEMES[shuffled[i]],x,y,w:720,h:460,hub:{x:x+360,y:y+(version>=3?370:250)} }))];
      }
      areas.sort((a,b) => THEMES.findIndex(t=>t.id===a.id)-THEMES.findIndex(t=>t.id===b.id));
      connect(start, areas[0].hub, random() < .5);
      const connected = new Set([0]);
      const edgeKey = (a,b) => [Math.min(a,b),Math.max(a,b)].join('-');
      const used = new Set();
      function link(a,b) {
        used.add(edgeKey(a,b));
        connections.push([areas[a].id,areas[b].id]);
        const from=areas[a].hub,to=areas[b].hub;
        function crossingCost(horizontal) {
          const turn=horizontal?{x:to.x,y:from.y}:{x:from.x,y:to.y};
          const segments=[[from,turn],[turn,to]].map(([p,q])=>({
            x:Math.min(p.x,q.x)-47,y:Math.min(p.y,q.y)-47,w:Math.abs(p.x-q.x)+94,h:Math.abs(p.y-q.y)+94}));
          return areas.reduce((sum,area,i)=>i===a||i===b?sum:sum+segments.filter(s=>overlaps(s,area,25)).length,0);
        }
        const h=crossingCost(true),v=crossingCost(false);
        connect(from,to,h===v?random()<.5:h<v);
      }
      // A randomized spanning tree guarantees access; extra links add escape loops.
      while (connected.size < areas.length) {
        let best;
        for (const a of connected) for (let b=0;b<areas.length;b++) {
          if (connected.has(b)) continue;
          const cost = Math.hypot(areas[a].hub.x-areas[b].hub.x,areas[a].hub.y-areas[b].hub.y) * (.65+random()*.7);
          if (!best || cost < best.cost) best = {a,b,cost};
        }
        link(best.a,best.b); connected.add(best.b);
      }
      const extras=[];
      for(let a=0;a<areas.length;a++)for(let b=a+1;b<areas.length;b++)if(!used.has(edgeKey(a,b)))
        extras.push({a,b,cost:Math.hypot(areas[a].hub.x-areas[b].hub.x,areas[a].hub.y-areas[b].hub.y)*(.65+random()*.7)});
      extras.sort((a,b)=>a.cost-b.cost);
      for(const edge of extras.slice(0,integer(1,2)))link(edge.a,edge.b);
      const farthest=areas.slice(1).sort((a,b)=>Math.hypot(b.hub.x-start.x,b.hub.y-start.y)-Math.hypot(a.hub.x-start.x,a.hub.y-start.y))[0];
      wolfStart={...farthest.hub};
    }

    const animalSpawns = [];
    for (const area of areas) {
      for (const side of [-1, 1]) {
        animalSpawns.push({ x: area.hub.x + side * integer(112, 140),
          y: area.hub.y + integer(-14, 14), areaId: area.id });
      }
    }
    const reserves = [
      { x: 80, y: 160, w: 320, h: 330 },
      ...(version>=3?[{x:80,y:320,w:334,h:164}]:[]),
      ...(version >= 3 ? [] : animalSpawns).map(p => version === 1 ? ({ x: p.x - 64, y: p.y - 64, w: 128, h: 128 }) :
        ({ x: p.x - 40, y: p.y - 40, w: 80, h: 80 })),
      ...[start, wolfStart].map(p => ({ x: p.x - 60, y: p.y - 60, w: 120, h: 120 })),
    ];
    const structures = { coops: [], silos: [], hayBales: [],
      pond: { x: integer(1080, 1530), y: integer(50, 65), w: integer(225, 290), h: integer(140, 155) },
      barn: { x: 115, y: 38, w: 190, h: 112 } };
    const solids = [structures.barn, structures.pond];
    const plots = [];
    const buildingBounds = [];

    function legal(rect, gap = 72) {
      return rect.x >= MARGIN && rect.y >= MARGIN && rect.x + rect.w <= WIDTH - MARGIN &&
        rect.y + rect.h <= HEIGHT - MARGIN &&
        !paths.some(path => overlaps(rect, path, 26)) &&
        !reserves.some(reserve => overlaps(rect, reserve, 12)) &&
        !plots.some(plot => overlaps(rect, plot, 72)) &&
        !solids.some(solid => overlaps(rect, solid, gap));
    }

    // Rejection sampling is bounded. A stable scan provides a fallback on crowded plots.
    function place(area, w, h, gap = 72, headroom = 0, workingPlot = false) {
      const bounds = { x: area.x + 40, y: area.y + 54,
        right: area.x + area.w - w - 38, bottom: area.y + area.h - h - 32 };
      const fits = rect => legal(rect,gap) && (!workingPlot || !buildingBounds.some(p=>overlaps(rect,p,12))) &&
        (!headroom || !plots.some(p=>overlaps({x:rect.x-16,y:rect.y-headroom,w:w+32,h:h+headroom},p,12)));
      for (let attempt = 0; attempt < 90; attempt++) {
        const rect = { x: integer(bounds.x, bounds.right), y: integer(bounds.y, bounds.bottom), w, h };
        if (fits(rect)) return rect;
      }
      for (let y = bounds.y; y <= bounds.bottom; y += 18) {
        for (let x = bounds.x; x <= bounds.right; x += 18) {
          const rect = { x, y, w, h };
          if (fits(rect)) return rect;
        }
      }
      return null;
    }
    function addStructure(area, kind, w, h) {
      const top = kind==='coops'?Math.ceil((w+14)*1.1-h):kind==='silos'?174-h:kind==='stables'?172-h:16;
      const rect = place(area, w, h, 72, version>=3?top:0);
      if (!rect) return;
      rect.areaId = area.id;
      rect.variant = integer(0, 2);
      structures[kind].push(rect);
      solids.push(rect);
      if(version>=3)buildingBounds.push({x:rect.x-16,y:rect.y-top,w:w+32,h:h+top});
    }
    // Whole working plots come first. A road or a tree can never punch holes in a bed.
    if (version >= 3) {
      structures.paddockFences = [];
      structures.troughs = [];
      structures.stables = [];
      for (const area of areas) {
        area.name = { poleiro: 'Galinheiro', granja: 'Milharal', estabulo: 'Curral', horta: 'Horta', quintal: 'Pomar' }[area.id];
        if (area.id === 'poleiro') addStructure(area, 'coops', 122, 78);
        const kind = { granja: 'corn', horta: 'garden', estabulo: 'pasture' }[area.id];
        if (!kind) continue;
        const count = kind === 'pasture' ? 1 : 2;
        for (let i = 0; i < count; i++) {
          const sizes = kind === 'pasture' ? [[340,208],[300,184],[260,168]] : [[304,164],[240,164],[208,128]];
          let rect;
          for (const [w,h] of sizes) { rect = place(area,w,h,72,0,true); if (rect) break; }
          if (!rect) continue;
          const plot = { ...rect, kind, areaId: area.id, id: `${kind}-${i}` };
          plots.push(plot);
          if (kind === 'pasture') {
            // Opposite 96 px gates leave an actual route through the livestock yard.
            const {x,y,w,h}=plot, gate=96, wing=(w-gate)/2;
            for (const yy of [y,y+h-8]) for (const xx of [x,x+w-wing])
              structures.paddockFences.push({x:xx,y:yy,w:wing,h:8,areaId:area.id});
            for (const xx of [x,x+w-8]) structures.paddockFences.push({x:xx,y,w:8,h,areaId:area.id});
            structures.troughs.push({x:x+30,y:y+40,w:68,h:24,areaId:area.id});
          }
          if(i===0&&area.id==='granja') {addStructure(area,'coops',122,78);addStructure(area,'silos',76,108);}
        }
        if (area.id === 'estabulo') addStructure(area,'stables',148,88);
      }
    }
    const vegetation = [];
    // Reserve one mature tree per district before placing buildings in the remaining lots.
    for (const area of areas) {
      const rect = place(area, 104, 70, 52, version>=3?126:0);
      if (!rect) continue;
      vegetation.push({ id: `green-${vegetation.length}`, type: "tree", ...rect,
        areaId: area.id, variant: integer(0, 2),
        blockingRect: { x: rect.x + 42, y: rect.y + 4, w: 20, h: 18, type: "tree" } });
      solids.push(rect);
    }
    for (const area of areas) {
      if (version >= 3) {
        for (let i=0;i<(area.id==='estabulo'?3:area.id==='horta'?0:1);i++)
          addStructure(area,'hayBales',68,42);
        continue;
      }
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

    // Even a district crossed by several roads must leave a useful farm to play in.
    if (version === 2) for (const area of areas) {
      if (structures.coops.length < 3) addStructure(area, "coops", 110, 72);
      if (structures.silos.length < 1) addStructure(area, "silos", 80, 108);
      if (structures.hayBales.length < 7) addStructure(area, "hayBales", 62, 38);
    }

    function addBush(x, y, areaId, suffix = "") {
      const rect = { x: Math.round(x - 52), y: Math.round(y - 35), w: 104, h: 70 };
      if (plots.some(p => overlaps(rect,p,20))) return;
      if (solids.some(s => overlaps(rect, s, 10))) return;
      if (vegetation.some(v => overlaps(rect, v, 14))) return;
      vegetation.push({ id: `green-${vegetation.length}${suffix}`, type: "bush", ...rect,
        areaId, variant: integer(0, 2), blockingRect: null });
    }
    // Every rescue has usable cover, placed after solids so it cannot conceal an obstacle.
    for (const spawn of animalSpawns) addBush(spawn.x, spawn.y - 18, spawn.areaId, "-rescue");
    for (const area of areas) {
      for (let i = 0; i < (version >= 3 ? area.id === 'quintal' ? 7 : 2 : 5); i++) {
        const rect = place(area, 104, 70, 52, version>=3?126:0);
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

    if(version>=3) {
      const pasture=plots.find(p=>p.kind==='pasture');
      if(pasture) for(const side of [-1,1])
        addBush(pasture.x+pasture.w/2,pasture.y+(side<0?-65:pasture.h+70),'estabulo','-paddock');
    }
    const decorations = [];
    function decorLegal(x, y, size = 8) {
      const point = { x: x - size, y: y - size, w: size * 2, h: size * 2 };
      return !plots.some(p => overlaps(point,p,8)) && !solids.some(s => overlaps(point, s, 8)) && !paths.some(p => overlaps(point, p, 5));
    }
    for (let i = 0; i < 430; i++) {
      const x = integer(35, WIDTH - 35), y = integer(40, HEIGHT - 35);
      if (!decorLegal(x, y)) continue;
      decorations.push({ type: pick(["grass", "grass", "flower", "flower", "stone"]), x, y,
        variant: integer(0, 3), size: integer(3, 9) });
    }
    const garden = areas.find(a => a.id === "horta");
    for (let y = garden.y + 72; version < 3 && y < garden.y + garden.h - 35; y += 32) {
      for (let x = garden.x + 56; x < garden.x + garden.w - 35; x += 32) {
        if (decorLegal(x, y, 14) && !vegetation.some(v => overlaps({ x: x - 12, y: y - 12, w: 24, h: 24 }, v))) {
          decorations.push({ type: "crop", x, y, variant: Math.floor((y - garden.y) / 32) % 3, size: 12 });
        }
      }
    }
    for (const area of areas.filter(a => version < 3 && (a.id === "granja" || a.id === "estabulo"))) {
      for (let i = 0; i < 55; i++) {
        const x = integer(area.x + 38, area.x + area.w - 38);
        const y = integer(area.y + 40, area.y + area.h - 38);
        if (decorLegal(x, y, 12) && !vegetation.some(v => overlaps({ x: x - 10, y: y - 10, w: 20, h: 20 }, v))) {
          decorations.push({ type: i % 5 === 0 ? "sunflower" : "wheat", x, y, variant: integer(0, 2), size: 12 });
        }
      }
    }
    for (const area of version < 3 ? areas : []) {
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

    if (version >= 3) for (const plot of plots) {
      if (plot.kind === 'pasture') continue;
      const stepX=32, stepY=40;
      for (let row=0,y=plot.y+24;y<=plot.y+plot.h-16;y+=stepY,row++)
        for (let x=plot.x+24;x<=plot.x+plot.w-20;x+=stepX)
          decorations.push({type:plot.kind==='corn'?'corn':'crop',x,y,variant:row%3,size:12,plotId:plot.id});
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
      ...structures.hayBales, ...(structures.stables||[]), ...(structures.troughs||[]), ...(structures.paddockFences||[]),
      ...vegetation.map(v => v.blockingRect).filter(Boolean)];
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
        !(p.x < 405 && p.y < 485) && !plots.some(plot=>overlaps({x:p.x-22,y:p.y-30,w:44,h:60},plot)) &&
        vegetation.some(v => Math.hypot(p.x-v.x-v.w/2,p.y-v.y-v.h+15) <= 180) &&
        p.y < area.y + area.h - 30 && Math.hypot(p.x - start.x, p.y - start.y) > 230 &&
        !chosen.some(q => Math.hypot(p.x - q.x, p.y - q.y) < 95) &&
        blockers.every(o => Math.hypot(p.x - Math.max(o.x, Math.min(p.x, o.x+o.w)),
          p.y - Math.max(o.y, Math.min(p.y, o.y+o.h))) > 30));
      if (candidates.length) Object.assign(spawn, candidates[Math.floor(exploreRandom() * candidates.length)]);
      chosen.push({ ...spawn });
    }
    if (version >= 3) {
      const pasture=plots.find(p=>p.kind==='pasture');
      if (pasture) animalSpawns.filter(p=>p.areaId==='estabulo').forEach((p,i)=>{
        p.x=pasture.x+pasture.w*.5+(i?48:-36); p.y=pasture.y+pasture.h*.62;
      });
    }
    const freeHome=p=>blockers.every(o=>Math.hypot(p.x-Math.max(o.x,Math.min(p.x,o.x+o.w)),
      p.y-Math.max(o.y,Math.min(p.y,o.y+o.h)))>30);
    if(version>=3 && (!plots.some(p=>p.kind==='pasture') || !plots.some(p=>p.kind==='corn') ||
      decorations.filter(d=>d.type==='crop').length<30 || structures.coops.length!==2 || !structures.silos.length || !structures.stables.length || !structures.hayBales.length ||
      vegetation.filter(v=>v.areaId==='quintal'&&v.type==='tree').length<2 ||
      ![...animalSpawns,...chickSpawns].every(freeHome) ||
      animalSpawns.some(p=>!vegetation.some(v=>Math.hypot(p.x-v.x-v.w/2,p.y-v.y-v.h+15)<=180)))) {
      // Reject the complete packing, never ship a labelled district without its purpose.
      if(layoutAttempt<(onPacked?128:64))return generate(value,version,layoutAttempt+1,onPacked);
      throw new Error('Unable to reserve complete farm districts');
    }
    if(onPacked)onPacked(layoutAttempt);
    return { seed, version, connections, ...(version>=3?{plots}:{}), width: WIDTH, height: HEIGHT, areas, paths, structures, vegetation,
      decorations, animalSpawns, chickSpawns, start, wolfStart };
  }
  // The saved version-3 geometry stays intact. New farms add composed planting,
  // usable approaches and distinct habitats instead of scattering more props.
  function compose(layout) {
    layout.version=4;
    const {structures:s,paths,plots,vegetation,width,height}=layout;
    const bounds=p=>p.type==='tree'?{x:p.x-16,y:p.y-138,w:136,h:208}:
      p.type==='bush'?{x:p.x-4,y:p.y-14,w:p.w+8,h:p.h+14}:p;
    const buildings=[{...s.barn,top:195-s.barn.h},
      ...s.coops.map(p=>({...p,top:(p.w+14)*1.1-p.h})),
      ...s.silos.map(p=>({...p,top:174-p.h})),
      ...s.stables.map(p=>({...p,top:100-p.h})),
      ...s.hayBales.map(p=>({...p,top:16}))];
    const occupied=[...buildings.map(p=>({x:p.x-12,y:p.y-p.top,w:p.w+24,h:p.h+p.top})),
      ...[...s.coops,...s.stables,...s.silos].map(p=>({x:p.x+p.w/2-35,y:p.y+p.h,w:70,h:70})),
      ...plots.map(p=>({x:p.x+p.w/2-35,y:p.y+p.h,w:70,h:72})),
      ...plots.filter(p=>p.kind==='pasture').map(p=>({x:p.x+p.w/2-35,y:p.y-72,w:70,h:72})),
      s.pond,{x:80,y:160,w:280,h:332},...s.paddockFences.map(p=>({...p,y:p.y-32,h:p.h+36}))];
    const physical=[s.barn,s.pond,...s.coops,...s.silos,...s.stables,...s.hayBales,...s.troughs,...s.paddockFences];
    const root=p=>({x:p.x+42,y:p.y+4,w:20,h:18,type:'tree'});
    const away=(p,o,r)=>Math.hypot(p.x-Math.max(o.x,Math.min(p.x,o.x+o.w)),p.y-Math.max(o.y,Math.min(p.y,o.y+o.h)))>r;
    const within=p=>p.x>=40&&p.y>=45&&p.x+p.w<=width-40&&p.y+p.h<=height-40;
    const clearPlant=(p,self)=>within(bounds(p)) && !occupied.some(o=>overlaps(bounds(p),o,10)) &&
      !plots.some(o=>overlaps(bounds(p),o,16)) && !vegetation.some(v=>v!==self&&overlaps(bounds(p),bounds(v),8)) &&
      physical.every(o=>away({x:p.x+p.w/2,y:p.y+p.h-15},o,24)) &&
      (p.type!=='tree'||(!physical.some(o=>overlaps(root(p),o,42))&&
        !paths.some(o=>overlaps(root(p),o,24))&&
        ![...layout.animalSpawns,...layout.chickSpawns,layout.wolfStart].some(a=>!away(a,root(p),34))));
    // Plant on verges and in clear groups, never across a road or a front wall.
    // Preserve each cover ID; saved version-3 farms still use the old geometry.
    for(const plant of [...vegetation]) {
      if(clearPlant(plant,plant)&&!paths.some(p=>overlaps(bounds(plant),p,4)))continue;
      const area=layout.areas.find(a=>a.id===plant.areaId);
      const candidates=[];
      for(let dy=-384;dy<=384;dy+=24)for(let dx=-384;dx<=384;dx+=24) {
        if(!dx&&!dy)continue;
        const p={...plant,x:plant.x+dx,y:plant.y+dy};
        if(area&&(p.x<area.x+20||p.x+p.w>area.x+area.w-20||p.y<area.y+20||p.y+p.h>area.y+area.h-20))continue;
        candidates.push(p);
      }
      candidates.sort((a,b)=>(a.x-plant.x)**2+(a.y-plant.y)**2-((b.x-plant.x)**2+(b.y-plant.y)**2));
      const place=candidates.find(p=>clearPlant(p,plant)&&!paths.some(r=>overlaps(bounds(p),r,4)));
      if(!place) {
        // Redundant cover is better omitted than squeezed between a roof and road.
        vegetation.splice(vegetation.indexOf(plant),1);continue;
      }
      plant.x=place.x;plant.y=place.y;
      if(plant.type==='tree')plant.blockingRect=root(plant);
    }
    if(vegetation.filter(v=>v.areaId==='quintal'&&v.type==='tree').length<2)return null;
    // Compact brambles flank the south gate: cattle can reach cover without
    // filling the entrance or planting vegetation inside the livestock yard.
    const pasture=plots.find(p=>p.kind==='pasture');
    for(const [i,animal] of layout.animalSpawns.filter(a=>a.areaId==='estabulo').entries()) {
      if(vegetation.some(v=>Math.hypot(animal.x-v.x-v.w/2,animal.y-v.y-v.h+15)<=180))continue;
      const candidates=[];
      for(const offset of [0,16,32,48])for(const side of [i?-1:1,i?1:-1])
        candidates.push({id:`gate-bramble-${i}`,type:'bush',x:pasture.x+pasture.w/2+side*(112+offset)-36,
          y:pasture.y+pasture.h+32,w:72,h:48,areaId:'estabulo',variant:0,blockingRect:null});
      const place=candidates.find(p=>clearPlant(p,null)&&!paths.some(r=>overlaps(bounds(p),r,4))&&
        Math.hypot(animal.x-p.x-p.w/2,animal.y-p.y-p.h+15)<=180);
      if(place)vegetation.push(place);
    }
    // A single shore tree becomes a landmark, with a real, visible trunk collider.
    const pond=s.pond;
    const shoreCandidates=[-1,1].flatMap(side=>[40,95,155].map(offset=>({
      id:'shore-willow',type:'tree',x:side<0?pond.x-155:pond.x+pond.w+55,
      y:pond.y+pond.h+offset,w:104,h:70,areaId:null,variant:0,art:'willow'
    })));
    const willow=shoreCandidates.find(p=>clearPlant(p,null)&&!paths.some(r=>overlaps(bounds(p),r,12))&&
      ![...layout.animalSpawns,...layout.chickSpawns].some(a=>Math.hypot(a.x-p.x-52,a.y-p.y-30)<100));
    if(willow){willow.blockingRect={x:willow.x+42,y:willow.y+4,w:20,h:18,type:'tree'};vegetation.push(willow);}
    let orchardIndex=0,shrubIndex=0;
    for(const p of vegetation) {
      if(p.type==='tree'&&p.areaId==='quintal')p.art=orchardIndex++%2?'pear':'tree';
      if(p.type==='bush') {
        const index=shrubIndex++;
        p.art=index%3===0?'bush':'bramble';
        p.material=p.art==='bush'&&['horta','poleiro'].includes(p.areaId)?0:index%2+1;
      }
    }
    const blockers=[s.barn,s.pond,...s.coops,...s.silos,...s.stables,...s.hayBales,...s.troughs,
      ...s.paddockFences,...vegetation.map(v=>v.blockingRect).filter(Boolean)];
    const pointFree=(p,margin=22)=>p.x>margin&&p.y>margin&&p.x<width-margin&&p.y<height-margin&&
      blockers.every(o=>Math.hypot(p.x-Math.max(o.x,Math.min(p.x,o.x+o.w)),p.y-Math.max(o.y,Math.min(p.y,o.y+o.h)))>margin);
    const gardenWalls=plots.filter(p=>p.kind!=='pasture');
    const inflate=(p,r)=>({x:p.x-r,y:p.y-r,w:p.w+r*2,h:p.h+r*2});
    const laneWalls=[...blockers.map(p=>inflate(p,22)),...gardenWalls.map(p=>inflate(p,20)),
      ...vegetation.map(p=>inflate(bounds(p),24))];
    const laneFree=p=>p.x>22&&p.y>22&&p.x<width-22&&p.y<height-22&&
      laneWalls.every(o=>p.x<o.x||p.x>o.x+o.w||p.y<o.y||p.y>o.y+o.h);
    const clearLeg=(a,b)=>{
      const steps=Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/6);
      for(let i=0;i<=steps;i++)if(!laneFree({x:a.x+(b.x-a.x)*i/Math.max(1,steps),y:a.y+(b.y-a.y)*i/Math.max(1,steps)}))return false;
      return true;
    };
    // One distance field connects every front door to the existing road network.
    const cell=20,cols=width/cell,rows=height/cell,parent=new Int32Array(cols*rows);parent.fill(-2);
    const point=i=>({x:(i%cols)*cell+10,y:Math.floor(i/cols)*cell+10});
    const queue=[];
    for(let i=0;i<parent.length;i++) {
      const p=point(i);
      if(!laneFree(p)){parent[i]=-3;continue;}
      if(paths.some(r=>p.x>=r.x+16&&p.x<=r.x+r.w-16&&p.y>=r.y+16&&p.y<=r.y+r.h-16)) {parent[i]=-1;queue.push(i);}
    }
    for(let n=0;n<queue.length;n++) {
      const i=queue[n],x=i%cols,y=Math.floor(i/cols);
      for(const next of [x>0?i-1:-1,x<cols-1?i+1:-1,y>0?i-cols:-1,y<rows-1?i+cols:-1]) {
        // Inflated rectangular blockers are wider than a grid step. Adjacent
        // free cells therefore have a free axis-aligned connecting segment.
        if(next<0||parent[next]!==-2)continue;
        parent[next]=i;queue.push(next);
      }
    }
    layout.lanes=[];layout.entrances=[];
    function approach(id,p) {
      if(!laneFree(p))return false;
      const nearby=[];
      for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++) {
        const xx=Math.floor(p.x/cell)+dx,yy=Math.floor(p.y/cell)+dy;
        if(xx>=0&&xx<cols&&yy>=0&&yy<rows)nearby.push(yy*cols+xx);
      }
      nearby.sort((a,b)=>Math.hypot(point(a).x-p.x,point(a).y-p.y)-Math.hypot(point(b).x-p.x,point(b).y-p.y));
      let index=nearby.find(i=>parent[i]>=-1&&clearLeg(p,point(i)));
      if(index===undefined)return false;
      const route=[p,point(index)];
      while(parent[index]>=0){index=parent[index];route.push(point(index));}
      // Merge collinear runs so footprints and cache keys stay small.
      const corners=[route[0]];
      for(let i=1;i<route.length-1;i++)if((route[i].x-route[i-1].x)*(route[i+1].y-route[i].y)!==
        (route[i].y-route[i-1].y)*(route[i+1].x-route[i].x))corners.push(route[i]);
      corners.push(route[route.length-1]);
      for(let i=1;i<corners.length;i++) {
        const a=corners[i-1],b=corners[i];
        if(a.x===b.x&&a.y===b.y)continue;
        layout.lanes.push({x:Math.min(a.x,b.x)-18,y:Math.min(a.y,b.y)-18,w:Math.abs(a.x-b.x)+36,h:Math.abs(a.y-b.y)+36,entranceId:id});
      }
      layout.entrances.push({...p,id});
      return true;
    }
    for(const [key,name] of [['coops','coop'],['stables','stable'],['silos','silo']])
      for(const [i,p] of s[key].entries())
        if(!approach(`${name}-${i}`,{x:Math.round(p.x+p.w/2),y:p.y+p.h+32}))return null;
    for(const p of plots) {
      if(!approach(p.id,{x:p.x+p.w/2,y:p.y+p.h+32}))return null;
      if(p.kind==='pasture'&&!approach(p.id+'-north',{x:p.x+p.w/2,y:p.y-32}))return null;
    }
    if(!approach('lake',{x:pond.x+pond.w/2,y:pond.y+pond.h+45}))return null;
    // Small worn thresholds join the route to the actual ramp, gate or bed edge.
    layout.clearings=[...[...s.coops,...s.stables,...s.silos].map(p=>({x:p.x+p.w/2-26,y:p.y+p.h-8,w:52,h:56})),
      ...plots.map(p=>({x:p.x+p.w/2-22,y:p.y+p.h-4,w:44,h:52})),
      ...plots.filter(p=>p.kind==='pasture').map(p=>({x:p.x+p.w/2-22,y:p.y-48,w:44,h:52}))];
    // Relocate only a displaced rescue's quiet waiting point, never inside a crop.
    for(const animal of layout.animalSpawns) {
      if(vegetation.some(v=>Math.hypot(animal.x-v.x-v.w/2,animal.y-v.y-v.h+15)<=180))continue;
      if(animal.areaId==='estabulo')return null;
      const area=layout.areas.find(a=>a.id===animal.areaId);
      const homes=vegetation.flatMap(v=>[0,-48,48,-96,96].map(dx=>({x:v.x+v.w/2+dx,y:v.y+v.h-12}))).filter(p=>pointFree(p,30)&&
        p.x>area.x&&p.x<area.x+area.w&&p.y>area.y&&p.y<area.y+area.h&&
        !plots.some(o=>overlaps({x:p.x-22,y:p.y-22,w:44,h:44},o))&&
        !layout.animalSpawns.some(a=>a!==animal&&Math.hypot(a.x-p.x,a.y-p.y)<95)&&
        !layout.chickSpawns.some(a=>Math.hypot(a.x-p.x,a.y-p.y)<55));
      homes.sort((a,b)=>Math.hypot(a.x-animal.x,a.y-animal.y)-Math.hypot(b.x-animal.x,b.y-animal.y));
      if(homes[0])Object.assign(animal,homes[0]);else return null;
    }
    // Every small accent belongs to a planting group, shore or working plot.
    const random=randomSource(layout.seed^0x501aa19),tracks=[...paths,...layout.lanes];
    layout.decorations=layout.decorations.filter(d=>d.plotId);
    const groups=[...vegetation.filter(v=>v.type==='tree'||v.art==='bush').map(v=>({x:v.x+v.w/2,y:v.y+v.h-8,id:v.id,kind:'flower'})),
      ...plots.filter(p=>p.kind!=='pasture').map(p=>({x:p.x-24,y:p.y+p.h-10,id:p.id,kind:'flower'})),
      {x:pond.x-20,y:pond.y+pond.h*.7,id:'lake',kind:'reeds'},
      {x:pond.x+pond.w+18,y:pond.y+pond.h*.6,id:'lake',kind:'reeds'}];
    for(const g of groups)for(let i=0;i<(g.kind==='reeds'?7:5);i++) {
      const x=Math.round(g.x+(random()-.5)*65),y=Math.round(g.y+(random()-.5)*34);
      const rect={x:x-6,y:y-12,w:12,h:18};
      if(!within(rect)||tracks.some(p=>overlaps(rect,p,8))||plots.some(p=>overlaps(rect,p,8))||!pointFree({x,y},10))continue;
      layout.decorations.push({type:g.kind,x,y,variant:Math.floor(random()*3),size:6,groupId:g.id});
    }
    return layout;
  }
  return { generate, normalizeSeed };
})();
