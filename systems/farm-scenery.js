/* Small accents belong to a landmark. Open grass and paths stay visually quiet. */
const FarmScenery = (() => {
  const cache = new WeakMap();
  let image = null, frames = [], pending = null;
  const hash = (x, y, seed = 0) => { let n = Math.imul(x ^ seed, 374761393) + Math.imul(y, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967295; };
  const overlaps = (a,b,gap=0) => a.x < b.x+b.w+gap && a.x+a.w+gap > b.x && a.y < b.y+b.h+gap && a.y+a.h+gap > b.y;
  function load(loader, makeSurface = FarmSprites.surface) {
    if(typeof FarmCohesiveData!=='undefined')return FarmSprites.loadCohesive(loader,makeSurface).then(ready=>{
      if(ready){image=true;return true;}return loadLegacy(loader,makeSurface);
    });
    return loadLegacy(loader,makeSurface);
  }
  function loadLegacy(loader,makeSurface) {
    if (image) return Promise.resolve(true);
    if (pending) return pending;
    if (typeof FarmMeadowData === 'undefined') return Promise.resolve(false);
    loader ||= src => new Promise((resolve,reject) => { const img=new Image(); img.onload=()=>resolve(img); img.onerror=reject; img.src=src; });
    pending = Promise.resolve().then(async () => {
      try {
        const source = await loader(FarmMeadowData), surface = makeSurface(source.width, source.height);
        if (!surface || source.width !== 1536 || source.height !== 1024) return false;
        const c=surface.getContext('2d'); c.drawImage(source,0,0);
        const data=c.getImageData(0,0,1536,1024).data;
        frames=Array.from({length:6},(_,i)=>{
          const ox=i%3*512,oy=Math.floor(i/3)*512;let left=512,top=512,right=0,bottom=0;
          for(let y=0;y<512;y++)for(let x=0;x<512;x++)if(data[((oy+y)*1536+ox+x)*4+3]>32){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1);}
          if(bottom<=top)throw Error('Empty meadow decoration');
          return {x:ox+left,y:oy+top,w:right-left,h:bottom-top};
        });
        image=source; return true;
      } catch { return false; } finally { pending=null; }
    });
    return pending;
  }
  function details(layout) {
    if(cache.has(layout))return cache.get(layout);
    const props=FarmArt.getProps(layout), result=[];
    const blocked=[...props.map(p=>FarmDetails.shape(p)),...(layout.paths||[]),...(layout.lanes||[]),...(layout.clearings||[]),...(layout.plots||[])];
    if(layout.structures?.pond)blocked.push(layout.structures.pond);
    for(const h of layout.habitats||[]) {
      if(h.kind==='water')blocked.push({x:h.x-120,y:h.y-78,w:240,h:156});
      if(h.water)blocked.push({x:h.water.x-28,y:h.water.y-18,w:56,h:36});
    }
    for(const p of [...layout.animalSpawns||[],...layout.chickSpawns||[],layout.start].filter(Boolean))blocked.push({x:p.x-24,y:p.y-30,w:48,h:54});
    const add=(x,y,kind,w,anchor)=>{
      x=Math.round(x);y=Math.round(y);
      const height=w*(kind===1?1:kind===0?.9:kind===5?1:.75),bounds={x:x-w/2,y:y-height,w,h:height};
      if(bounds.x<42||bounds.y<50||bounds.x+w>layout.width-42||y>layout.height-40||blocked.some(p=>overlaps(bounds,p,9)))return false;
      if(result.some(p=>Math.hypot(x-p.x,y-p.y)<Math.max(58,(p.w+w)*.75)))return false;
      result.push({x,y,kind,w,anchor});return true;
    };
    const beside=(p,kind,w,anchor,limit=1)=>{
      let placed=0;
      for(const gap of [26,46,68]) {
        for(const [dx,dy] of [[-gap,p.h-8],[p.w+gap,p.h-8],[-gap,p.h/2],[p.w+gap,p.h/2]])
          if(add(p.x+dx,p.y+dy,kind,w,anchor)&&++placed===limit)return;
      }
    };
    // Decorative tools looked like dropped collectibles. Keep only planted
    // flowers by landmarks; the garden's crops provide its visual detail.
    const coop=props.find(p=>p.type==='coop');
    if(coop)beside(FarmDetails.shape(coop),0,22,'coop-flowers',2);
    // Keep flowers in the two flowering grazing spots, never along every road.
    for(const [i,h] of (layout.habitats||[]).filter(h=>h.kind==='flowers').slice(0,2).entries())
      beside({x:h.x-48,y:h.y-20,w:96,h:38},i%2,24,h.id,2);
    const orchard=props.find(p=>p.type==='tree'&&p.areaId==='quintal'&&p.art!=='willow');
    if(orchard)beside(FarmDetails.shape(orchard),1,22,'orchard-flowers',2);
    result.sort((a,b)=>a.y-b.y);cache.set(layout,result);return result;
  }
  function showDecoration(d,layout) {
    // These already existed under the added meadow sheet. Do not stack two flower systems.
    if(d.type==='flower')return false;
    if(['grass','stone','rock','clover'].includes(d.type))return hash(d.x,d.y,layout.seed||0)>.78;
    return true;
  }
  function draw(c,layout,camera) {
    if(!image)return;
    c.save();c.imageSmoothingEnabled=false;
    for(const p of details(layout)) {
      if(p.x<camera.x-80||p.y<camera.y-60||p.x>camera.x+c.canvas.width+80||p.y>camera.y+c.canvas.height+80)continue;
      if(FarmSprites.cohesiveReady) {
        const name=({0:'daisies',1:'lavender',4:'harvest'})[p.kind];
        if(name)FarmSprites.draw(c,name,p.x-p.w/2,p.y-p.w,p.w,p.w,{grounded:true});
        continue;
      }
      const f=frames[p.kind],h=p.w*f.h/f.w;
      c.drawImage(image,f.x,f.y,f.w,f.h,Math.round(p.x-p.w/2),Math.round(p.y-h),Math.round(p.w),Math.round(h));
    }
    c.restore();
  }
  function drawAir(c,layout,camera,time=0,reduced=false) {
    if(!image)return;
    c.save();c.translate(-camera.x,-camera.y);
    for(const [i,p] of details(layout).entries()) {
      if(p.kind>1||i%4||p.x<camera.x-35||p.y<camera.y-35||p.x>camera.x+c.canvas.width+35||p.y>camera.y+c.canvas.height+35)continue;
      const t=reduced?0:time,x=p.x+Math.sin(t*.65+i)*20,y=p.y-24+Math.cos(t*.8+i)*9;
      const spread=reduced?3:2+Math.abs(Math.sin(t*7+i))*2;
      if(typeof Sunlight!=='undefined')Sunlight.native(c,`butterfly/${i%2}`,
        {x:x-6,y:y-2,w:13,h:7},p.y,out=>{
          out.fillStyle='#fff0cb';out.fillRect(x-5,y-1,5,3);out.fillRect(x+1,y,5,3);out.fillRect(x,y,1,3);
        });
      c.fillStyle=i%2?'#ffdc87':'#fff0cb';c.fillRect(Math.round(x-spread),Math.round(y-1),spread,3);c.fillRect(Math.round(x+1),Math.round(y),spread,3);
      c.fillStyle='#7a6037';c.fillRect(Math.round(x),Math.round(y),1,3);
    }
    c.restore();
  }
  return {load,details,showDecoration,draw,drawAir,get ready(){return !!image;}};
})();
