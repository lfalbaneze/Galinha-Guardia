/* Deterministic dressing: visual bounds and placement never alter the saved world seed. */
const FarmDetails = (() => {
  const cache = new WeakMap();
  const names = { granja: 'MILHARAL', estabulo: 'CURRAL', horta: 'HORTA', quintal: 'POMAR' };
  const overlaps = (a, b, gap = 0) => a.x < b.x + b.w + gap && a.x + a.w + gap > b.x &&
    a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
  function shape(p) {
    const { x, y, w, h } = p;
    if (p.type === 'tree') return { x: x - 16, y: (p.blockingRect?.y ?? y) + (p.blockingRect?.h ?? 22) - 148, w: 136, h: 148 };
    if (p.type === 'bush') return { x: x - 4, y: y - 14, w: w + 8, h: h + 14 };
    if (p.type === 'hay') return { x: x - 3, y: y - 16, w: w + 6, h: h + 16 };
    if (p.type === 'barn') return { x: x - 8, y: y + h - 195, w: w + 16, h: 195 };
    if (p.type === 'silo') return { x: x + 1, y: y + h - 174, w: w - 2, h: 174 };
    if (p.type === 'coop') {
      const height = (w + 14) * 1.1;
      return { x: x - 7, y: y + h - height, w: w + 14, h: height };
    }
    if (p.type === 'fence') return { x: x - 4, y: y - 36, w: w + 8, h: 43 };
    return { x, y, w: w || 32, h: h || 32 };
  }
  function decorate(layout, props) {
    if (cache.has(layout)) return cache.get(layout);
    const counts = {};
    const dressed = props.map(p => {
      const index = counts[p.type] || 0; counts[p.type] = index + 1;
      const variant = ((layout.seed >>> 0) % 3 + index) % 3;
      // Buildings share one light direction. Never mirror a roof or replace a coop with a barn.
      return { ...p, variant, flip: false, palette: variant };
    });
    const occupied = dressed.map(shape);
    if (layout.structures?.pond) occupied.push(layout.structures.pond);
    // Keep every sign off the lanes, entrances and the locations used for resuming a save.
    occupied.push(...(layout.paths || []));
    for (const home of [...(layout.animalSpawns || []), ...(layout.chickSpawns || []), layout.start].filter(Boolean))
      occupied.push({ x: home.x - 35, y: home.y - 40, w: 70, h: 75 });
    for (const area of layout.areas || []) {
      if (!names[area.id]) continue;
      const name = names[area.id], w = Math.max(92, name.length * 7 + 32), h = 49;
      const preferred = { x: area.sign?.x ?? area.x + 48, y: area.sign?.y ?? area.y + area.h - 70 };
      const candidates = [preferred];
      for (let y = area.y + 45; y <= area.y + area.h - h - 24; y += 24)
        for (let x = area.x + 24; x <= area.x + area.w - w - 24; x += 24) candidates.push({ x, y });
      candidates.sort((a, b) => Math.hypot(a.x - preferred.x, a.y - preferred.y) - Math.hypot(b.x - preferred.x, b.y - preferred.y));
      let place = candidates.find(p => !occupied.some(o => overlaps({ ...p, w, h }, o, 14)));
      // Dense legacy farms may need their sign just outside the district boundary.
      // Search the nearest clear verge rather than overlapping a roof or dropping the label.
      if (!place) {
        const verges = [];
        for(let y=Math.max(50,area.y-160);y<=Math.min(layout.height-h-40,area.y+area.h+160);y+=16)
          for(let x=Math.max(40,area.x-160);x<=Math.min(layout.width-w-40,area.x+area.w+160);x+=16)
            verges.push({x,y});
        verges.sort((a,b)=>Math.hypot(a.x-preferred.x,a.y-preferred.y)-Math.hypot(b.x-preferred.x,b.y-preferred.y));
        place=verges.find(p=>!occupied.some(o=>overlaps({...p,w,h},o,14)));
      }
      // Do not force a sign on top of a fence in a crowded old layout.
      if (!place) continue;
      const sign = { ...place, w, h, type: 'sign', id: `sign-${area.id}`, areaId: area.id, name, depth: place.y + h };
      dressed.push(sign); occupied.push(sign);
    }
    cache.set(layout, dressed);
    return dressed;
  }
  function drawFooting(c, p, box = shape(p)) {
    const base = Math.round(box.y + box.h), center = Math.round(box.x + box.w / 2);
    const tree = p.type === 'tree', hay = p.type === 'hay';
    const width = tree ? 24 : Math.round(box.w * (p.type === 'bush' ? .64 : .76));
    c.save(); c.imageSmoothingEnabled = false;
    c.fillStyle = hay ? '#8d803a38' : '#33472d2a';
    c.beginPath(); c.ellipse(center, base - 2, width / 2 + 5, tree ? 5 : 6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#26332350';
    c.beginPath(); c.ellipse(center, base - 2, width / 2, 2.5, 0, 0, Math.PI * 2); c.fill();
    if (hay) {
      c.fillStyle = '#b99b5466';
      for (let i=0;i<7;i++) {
        const xx=center-width/2+(i*13+p.x)%Math.max(1,width), yy=base-2+(i%3)*2;
        c.fillRect(Math.round(xx),yy,4+(i%2)*2,1);
      }
    } else if (tree) {
      c.fillStyle = '#537638'; c.fillRect(center-12,base-5,2,5); c.fillRect(center+10,base-3,3,3);
    }
    c.restore();
  }
  function drawSign(c, p) {
    const x = Math.round(p.x), y = Math.round(p.y), w = p.w;
    c.save(); c.imageSmoothingEnabled = false;
    // Each post touches its own patch; no detached oval makes the sign look suspended.
    c.fillStyle = '#30402650';
    for (const at of [x + 20, x + w - 19]) { c.beginPath(); c.ellipse(at,y+48,7,2,0,0,Math.PI*2); c.fill(); }
    for (const at of [x + 17, x + w - 22]) {
      c.fillStyle = '#57452e'; c.fillRect(at, y + 15, 7, 34);
      c.fillStyle = '#b28b56'; c.fillRect(at + 1, y + 16, 3, 32);
      c.fillStyle = '#d6b77c'; c.fillRect(at + 1, y + 19, 1, 25);
    }
    c.fillStyle = '#4d402b'; c.fillRect(x, y + 2, w, 29);
    c.fillStyle = '#aa8050'; c.fillRect(x + 2, y, w - 4, 28);
    c.fillStyle = '#725235'; c.fillRect(x + 4, y + 4, w - 8, 22);
    c.fillStyle = '#c8a16a'; c.fillRect(x + 4, y + 2, w - 8, 2);
    c.fillStyle = '#5e432b'; c.fillRect(x + 3, y + 27, w - 6, 3);
    for (const at of [x + 7, x + w - 9]) {
      c.fillStyle = '#e0c08a'; c.fillRect(at, y + 12, 2, 2);
      c.fillStyle = '#473c2c'; c.fillRect(at, y + 14, 2, 1);
    }
    c.font = 'bold 11px Trebuchet MS, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#f4e8c5'; c.fillText(p.name, x + w / 2, y + 15, w - 25);
    // Small tufts ground the posts without covering the lettering.
    c.fillStyle = '#507334'; c.fillRect(x + 12, y + 45, 3, 5); c.fillRect(x + w - 14, y + 44, 2, 6);
    c.restore();
  }
  return { decorate, shape, overlaps, drawSign, drawFooting };
})();
