/* Deterministic dressing: visual bounds and placement never alter the saved world seed. */
const FarmDetails = (() => {
  const cache = new WeakMap();
  const names = { granja: 'MILHARAL', estabulo: 'CURRAL', horta: 'HORTA', quintal: 'POMAR' };
  const overlaps = (a, b, gap = 0) => a.x < b.x + b.w + gap && a.x + a.w + gap > b.x &&
    a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
  function shape(p) {
    const { x, y, w, h } = p;
    if (p.type === 'corn') return {x:x-16,y:y-68,w:34,h:72};
    if (p.type === 'sunflower') return {x:x-19,y:y-92,w:38,h:96};
    if (p.type === 'stable') {
      const height=Math.round((w+16)*.65);
      return {x:x-8,y:y+h-height,w:w+16,h:height};
    }
    if (p.type === 'trough') return {x:x-3,y:y+h-30,w:w+6,h:30};
    if (p.type === 'paddock-fence') return {x:x-4,y:y-32,w:w+8,h:h+36};
    if (p.type === 'tree') {
      const scale=p.artScale||1,width=(p.art==='pear'?148:160)*scale,height=(p.art==='willow'?166:182)*scale;
      return { x:x+w/2-width/2,y:(p.blockingRect?.y??y)+(p.blockingRect?.h??22)-height,w:width,h:height };
    }
    if (p.type === 'bush') {
      const height=Math.min(66,Math.round((w+4)*(p.art==='bramble'?.56:.63)));
      return {x:x-2,y:y+h-height,w:w+4,h:height};
    }
    if (p.type === 'hay') return { x: x - 3, y: y - 16, w: w + 6, h: h + 16 };
    if (p.type === 'barn') return { x: x - 8, y: y + h - 195, w: w + 16, h: 195 };
    if (p.type === 'silo') return { x: x + 1, y: y + h - 174, w: w - 2, h: 174 };
    if (p.type === 'coop') {
      const height = (w + 14) * 1.1;
      return { x: x - 7, y: y + h - height, w: w + 14, h: height };
    }
    if (p.type === 'fence') return { x: x - 4, y: y - 36, w: w + 8, h: 40 };
    return { x, y, w: w || 32, h: h || 32 };
  }
  function landmarks(layout, props, area) {
    const kind = {granja:'corn',estabulo:'pasture',horta:'garden'}[area.id];
    const plots = (layout.plots || []).filter(p => p.areaId === area.id && p.kind === kind);
    if (plots.length) return plots.map(p => ({...p,landmarkType:p.kind}));
    if (area.id === 'quintal') {
      const trees = props.filter(p => p.areaId === area.id && p.type === 'tree' && p.art !== 'willow');
      const apples = trees.filter(p => !p.art || p.art === 'tree');
      return (apples.length ? apples : trees).map(p => ({...shape(p),id:p.id,landmarkType:'orchard-tree'}));
    }
    // Historical layouts have scattered crops instead of explicit plot rectangles.
    const crops = (layout.decorations || []).filter(p =>
      (area.id === 'horta' ? p.type === 'crop' : area.id === 'granja' && ['corn','wheat'].includes(p.type)) &&
      p.x >= area.x && p.x <= area.x + area.w && p.y >= area.y && p.y <= area.y + area.h);
    if (crops.length) {
      const x=Math.min(...crops.map(p=>p.x))-16, y=Math.min(...crops.map(p=>p.y))-24;
      return [{x,y,w:Math.max(...crops.map(p=>p.x))+16-x,h:Math.max(...crops.map(p=>p.y))+8-y,
        id:`legacy-crops-${area.id}`,landmarkType:kind}];
    }
    return props.filter(p => p.areaId === area.id && ['stable','coop','hay'].includes(p.type))
      .map(p => ({...shape(p),id:p.id,landmarkType:p.type}));
  }
  function placeSign(layout, targets, occupied, w, h) {
    const paths = [...layout.paths || [], ...layout.lanes || []];
    const candidates = [];
    for (const target of targets) {
      const positions = (axis,size,length) => {
        const start=target[axis]-size,end=target[axis]+target[length],values=new Set();
        for(let at=start;at<=end;at+=12)values.add(at);
        // Snap to free-space edges as well: a narrow verge may sit between grid samples.
        for(const o of occupied)for(const at of [o[axis]-size-14,o[axis]+o[length]+14])
          if(at>=start&&at<=end)values.add(at);
        return [...values];
      };
      const xs=positions('x',w,'w'),ys=positions('y',h,'h');
      const add = (x,y,gap,side) => {
        if (x<40 || y<50 || x+w>layout.width-40 || y+h>layout.height-40) return;
        const center={x:x+w/2,y:y+h/2}, foot={x:target.x+target.w/2,y:target.y+target.h};
        // Prefer a readable entrance-side label; proximity always refers to its real landmark.
        candidates.push({x,y,target,score:gap*4+Math.hypot(center.x-foot.x,center.y-foot.y)+(side==='top'?100:0)});
      };
      for (const gap of [16,24,40,64,88,112]) {
        for(const x of xs) {
          add(x,target.y+target.h+gap,gap,'bottom');add(x,target.y-h-gap,gap,'top');
        }
        for(const y of ys) {
          add(target.x-w-gap,y,gap,'left');add(target.x+target.w+gap,y,gap,'right');
        }
      }
    }
    candidates.sort((a,b)=>a.score-b.score);
    return candidates.find(p => {
      if(occupied.some(o=>overlaps({...p,w,h},o,14))) return false;
      const center={x:p.x+w/2,y:p.y+h/2}, t=p.target;
      const near={x:Math.max(t.x,Math.min(center.x,t.x+t.w)),y:Math.max(t.y,Math.min(center.y,t.y+t.h))};
      // A label across a road can appear to belong to the next field.
      const steps=Math.ceil(Math.hypot(center.x-near.x,center.y-near.y)/8);
      for(let i=0;i<=steps;i++) {
        const x=near.x+(center.x-near.x)*i/Math.max(1,steps),y=near.y+(center.y-near.y)*i/Math.max(1,steps);
        if(paths.some(r=>x>r.x&&x<r.x+r.w&&y>r.y&&y<r.y+r.h))return false;
      }
      return true;
    });
  }
  function decorate(layout, props) {
    if (cache.has(layout)) return cache.get(layout);
    const counts = {};
    const dressed = props.map(p => {
      const index = counts[p.type] || 0; counts[p.type] = index + 1;
      const variant = ((layout.seed >>> 0) % 3 + index) % 3;
      // Buildings share one light direction. Never mirror a roof or replace a coop with a barn.
      // Everyday cover shares a leaf green; white flowering bushes stay near the refuge.
      const palette=p.type==='bush'?(p.areaId==='poleiro'?0:2):variant;
      return { ...p, variant, flip: false, palette };
    });
    // Mature trees are larger where there is room. Keep their trunks fixed and
    // fit a smaller crown next to a lane or building, including historical saves.
    const treeClearance=[...(layout.paths||[]),...(layout.lanes||[]),...(layout.plots||[]),
      ...dressed.filter(p=>['coop','stable','silo','hay','barn'].includes(p.type)).map(shape)];
    for(const p of dressed)if(p.type==='tree') {
      for(const scale of [1,.95,.9,.85,.8,.75,.7,.65]) {
        p.artScale=scale;if(treeClearance.every(r=>!overlaps(shape(p),r)))break;
      }
    }
    const occupied = dressed.map(shape);
    occupied.push(...(layout.plots||[]));
    if (layout.structures?.pond) occupied.push(layout.structures.pond);
    // Keep every sign off the lanes, entrances and the locations used for resuming a save.
    occupied.push(...(layout.paths || []));
    occupied.push(...(layout.lanes||[]));
    occupied.push(...(layout.clearings||[]));
    for(const habitat of layout.habitats||[]) {
      if(habitat.kind==='water')occupied.push({x:habitat.x-118,y:habitat.y-74,w:236,h:148});
      else if(habitat.water)occupied.push({x:habitat.water.x-25,y:habitat.water.y-14,w:50,h:28});
    }
    for (const home of [...(layout.animalSpawns || []), ...(layout.chickSpawns || []), layout.start].filter(Boolean))
      occupied.push({ x: home.x - 35, y: home.y - 40, w: 70, h: 75 });
    for (const area of layout.areas || []) {
      if (!names[area.id]) continue;
      const name = names[area.id], w = Math.max(92, name.length * 7 + 32), h = 49;
      let place=placeSign(layout,landmarks(layout,dressed,area),occupied,w,h);
      // A narrow orchard must still have room for its label. Trim only those
      // crowns, in small steps, instead of moving a saved tree or blocking a lane.
      for(let attempt=0;!place&&attempt<6;attempt++) {
        let trimmed=false;
        dressed.forEach((p,i)=>{
          if(p.type!=='tree'||p.areaId!==area.id||(p.artScale||1)<=.65)return;
          p.artScale=Math.max(.65,(p.artScale||1)-.05);occupied[i]=shape(p);trimmed=true;
        });
        if(!trimmed)break;
        place=placeSign(layout,landmarks(layout,dressed,area),occupied,w,h);
      }
      // Do not force a sign on top of a fence in a crowded old layout.
      if (!place) continue;
      const sign = { x:place.x,y:place.y,w,h,type:'sign',id:`sign-${area.id}`,areaId:area.id,name,depth:place.y+h,
        landmarkId:place.target.id,landmarkType:place.target.landmarkType };
      dressed.push(sign); occupied.push(sign);
    }
    cache.set(layout, dressed);
    return dressed;
  }
  function drawSign(c, p) {
    if(typeof Sunlight!=='undefined')Sunlight.native(c,`sign/${p.name}/${p.w}/${p.h||49}`,
      {x:p.x-1,y:p.y-1,w:p.w+2,h:(p.h||49)+2},p.y+(p.h||49)-1,out=>drawSign(out,p));
    const x=Math.round(p.x),y=Math.round(p.y),w=p.w,h=p.h||49;
    c.save();c.imageSmoothingEnabled=false;c.lineJoin='round';c.lineWidth=2;
    // One sign family throughout the farm, with actual posts and short contact shadows.
    for(const at of [x+19,x+w-23]) {
      c.fillStyle='#30402640';c.fillRect(at-2,y+h-3,10,3);
      c.beginPath();c.roundRect(at,y+18,6,h-21,2);c.fillStyle='#b77b3e';c.fill();
      c.strokeStyle='#3d2a1b';c.stroke();c.fillStyle='#e7b969';c.fillRect(at+1,y+29,2,h-33);
    }
    c.beginPath();c.moveTo(x+3,y+3);c.lineTo(x+w-5,y+1);c.lineTo(x+w-2,y+5);
    c.lineTo(x+w-3,y+14);c.lineTo(x+w-1,y+18);c.lineTo(x+w-3,y+30);
    c.lineTo(x+4,y+31);c.lineTo(x+1,y+27);c.lineTo(x+2,y+17);c.lineTo(x+1,y+12);c.closePath();
    c.fillStyle='#dfb371';c.fill();c.strokeStyle='#3d2a1b';c.stroke();
    c.strokeStyle='#f6d69a';c.lineWidth=2;c.beginPath();c.moveTo(x+6,y+5);c.lineTo(x+w-8,y+4);c.stroke();
    c.strokeStyle='#ab733c';c.beginPath();c.moveTo(x+5,y+27);c.lineTo(x+w-6,y+27);c.stroke();
    for(const at of [x+7,x+w-8]) {
      c.fillStyle='#4c3828';c.fillRect(at,y+14,2,3);c.fillStyle='#f3d7a1';c.fillRect(at,y+14,1,1);
    }
    c.font='16px "Farm Pixel",monospace';c.textAlign='center';c.textBaseline='middle';
    c.fillStyle='#3d291a';c.fillText(p.name,x+w/2,y+16,w-23);
    c.restore();
  }
  function drawRows(c,p,first=24,spacing=40,end=16) {
    c.save();c.lineWidth=1.5;c.strokeStyle='#644626';
    const height=Math.min(26,spacing-7);
    for(let root=p.y+first;root<p.y+p.h-end+.1;root+=spacing) {
      const top=root-height/2,left=p.x+7,width=p.w-14;
      c.beginPath();c.roundRect(left,top,width,height,6);c.fillStyle='#9b713f';c.fill();c.stroke();
      c.fillStyle='#b48a51';c.fillRect(left+7,top+3,width-14,2);
      for(let x=left+12;x<left+width-8;x+=23) {
        c.fillStyle='#805a34';c.fillRect(Math.round(x),Math.round(root+height/2-5),3,1);
      }
    }
    c.restore();
  }
  return { decorate, shape, overlaps, drawSign, drawRows };
})();
