/* The atlas is decoded once. A white color key lets it work from file:// as well. */
const FarmSprites = (() => {
  const frames = Object.freeze({
    barn: [18, 64, 405, 470], coop: [456, 185, 324, 361], silo: [846, 64, 212, 488],
    tree: [1123, 108, 400, 444], bush: [27, 652, 329, 267], hay: [410, 653, 315, 260],
    fence: [793, 670, 322, 234], trough: [1175, 693, 329, 211], nursery: [156,194,1255,589],
    shelter:[32,231,626,359],willow:[707,44,527,610],bramble:[52,859,581,318],pear:[787,671,374,539]
  });
  let atlas = null, pending = null, nursery = null, nurseryPending = null;
  let habitats=null,habitatsPending=null;
  const habitatNames=new Set(['shelter','willow','bramble','pear']);
  const surface = (w, h) => {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return null;
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; return canvas;
  };
  function browserImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image(), timer = setTimeout(() => reject(Error('farm atlas')), 10000);
      image.onload = () => { clearTimeout(timer); resolve(image); };
      image.onerror = () => { clearTimeout(timer); reject(Error('farm atlas')); };
      image.src = src;
    });
  }
  function decode(image,makeSurface,closedFrames=[]) {
        const canvas = makeSurface(image.width, image.height);
        if (!canvas) return null;
        const c = canvas.getContext('2d'); c.drawImage(image, 0, 0);
        const pixels = c.getImageData(0, 0, canvas.width, canvas.height), data = pixels.data;
        const width = canvas.width, height = canvas.height, seen = new Uint8Array(width * height);
        const queue = new Int32Array(width * height); let head = 0, tail = 0;
        function visit(index) {
          if (seen[index]) return; seen[index] = 1;
          const i = index * 4;
          if (data[i] < 231 || data[i+1] < 231 || data[i+2] < 226) return;
          data[i+3] = 0; queue[tail++] = index;
        }
        // Only the connected sheet background is keyed: white petals and barn trim survive.
        for (let x=0;x<width;x++) { visit(x); visit((height-1)*width+x); }
        for (let y=0;y<height;y++) { visit(y*width); visit(y*width+width-1); }
        while (head < tail) {
          const i=queue[head++], x=i%width;
          if (x>0) visit(i-1); if (x<width-1) visit(i+1);
          if (i>=width) visit(i-width); if (i<width*(height-1)) visit(i+width);
        }
        // Rails enclose white holes; unlike barn trim and flower petals they carry no white paint.
        for(const name of closedFrames) {
          const [x,y,w,h]=frames[name];
          for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++) {
            const i=(yy*width+xx)*4;
            if(data[i]>231&&data[i+1]>231&&data[i+2]>226)data[i+3]=0;
          }
        }
        c.putImageData(pixels,0,0); return canvas;
  }
  function load(loader = browserImage, makeSurface = surface) {
    if (atlas) return Promise.resolve(true);
    if (pending) return pending;
    if (typeof FarmAtlasData === 'undefined') return Promise.resolve(false);
    pending = Promise.resolve().then(async () => {
      try {
        makeVariantSurface = makeSurface; variants.clear(); groundedTiles.clear();
        atlas=decode(await loader(FarmAtlasData),makeSurface,['fence','tree','hay','coop']);
        return !!atlas;
      } catch { return false; }
      finally { pending=null; }
    });
    return pending;
  }
  function loadNursery(loader = browserImage, makeSurface = surface) {
    if(nursery)return Promise.resolve(true);
    if(nurseryPending)return nurseryPending;
    if(typeof FarmNurseryData==='undefined')return Promise.resolve(false);
    nurseryPending=Promise.resolve().then(async()=>{
      try { nursery=decode(await loader(FarmNurseryData),makeSurface);return !!nursery; }
      catch { return false; }
      finally { nurseryPending=null; }
    });
    return nurseryPending;
  }
  function loadHabitats(loader=browserImage,makeSurface=surface) {
    if(habitats)return Promise.resolve(true);
    if(habitatsPending)return habitatsPending;
    if(typeof FarmHabitatData==='undefined')return Promise.resolve(false);
    habitatsPending=Promise.resolve().then(async()=>{
      try {
        // Native alpha is kept; no white color key is applied to this new sheet.
        const source=await loader(FarmHabitatData);
        habitats=makeSurface(source.width,source.height);
        if(!habitats)return false;
        habitats.getContext('2d').drawImage(source,0,0);return true;
      }catch{return false;}finally{habitatsPending=null;}
    });
    return habitatsPending;
  }
  const variants = new Map();
  let makeVariantSurface = surface;
  function variant(name, palette, source) {
    const key = `${name}/${palette}`;
    if (variants.has(key)) return variants.get(key);
    const [x,y,w,h] = frames[name], tile = makeVariantSurface(w,h);
    if (!tile) return null;
    const c = tile.getContext('2d'); c.drawImage(source,x,y,w,h,0,0,w,h);
    const pixels = c.getImageData(0,0,w,h), data = pixels.data;
    for (let i=0;i<data.length;i+=4) {
      if (!data[i+3]) continue;
      const r=data[i], g=data[i+1], b=data[i+2];
      // Tint materials, not silhouettes. Dark outlines and highlights remain legible.
      if (['tree','bush'].includes(name) && g > r * 1.08 && g > b * 1.08) {
        data[i] = r * (palette === 1 ? 1.08 : .92);
        data[i+1] = g * (palette === 1 ? .93 : 1.04);
        data[i+2] = b * (palette === 1 ? .92 : 1.2);
      } else if (name === 'bush' && r > 190 && g > 185 && b > 165) {
        data[i+1] = g * (palette === 1 ? .86 : .98); data[i+2] = b * (palette === 1 ? .93 : .67);
      } else if (['coop','barn','hay','fence'].includes(name) && r > b * 1.2 && r > 65) {
        data[i] = r * (palette === 1 ? .90 : .84);
        data[i+1] = g * (palette === 1 ? 1.02 : .96);
        data[i+2] = b * (palette === 1 ? 1.18 : 1.3);
      }
    }
    c.putImageData(pixels,0,0); variants.set(key,tile); return tile;
  }
  const groundedTiles = new Map();
  const pixelWidths = { barn:80, coop:56, silo:36, tree:60, bush:44, hay:32, fence:44, trough:32, nursery:112,
    shelter:78,willow:58,bramble:48,pear:42 };
  // Shared muted ramps remove sub-pixel texture noise without touching the source PNGs.
  const colors = [
    [38,43,31],[60,58,39],[83,70,44],[110,84,49],[140,106,58],[169,134,75],[199,163,96],[219,194,133],
    [59,77,35],[77,97,42],[97,120,51],[119,139,62],[145,158,78],[173,180,106],
    [111,54,40],[143,64,44],[174,86,51],[199,115,64],[225,157,81],
    [99,111,102],[133,146,131],[166,179,161],[198,207,186],[237,233,209],
    [69,109,104],[97,143,131],[133,173,157],[215,194,166]
  ];
  function groundedTile(name, palette, source) {
    const key=`${name}/${palette}`;
    if (groundedTiles.has(key)) return groundedTiles.get(key);
    const [x,y,w,h]=frames[name], full=makeVariantSurface(w,h);
    if (!full) return null;
    const c=full.getContext('2d'), tinted=palette>0&&name!=='nursery'?variant(name,palette,source):null;
    if(tinted)c.drawImage(tinted,0,0);else c.drawImage(source,x,y,w,h,0,0,w,h);
    const data=c.getImageData(0,0,w,h).data;
    let left=w,top=h,right=0,bottom=0;
    for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)if(data[(yy*w+xx)*4+3]>=96){
      left=Math.min(left,xx);top=Math.min(top,yy);right=Math.max(right,xx+1);bottom=Math.max(bottom,yy+1);
    }
    if(right<=left||bottom<=top)return null;
    const tw=pixelWidths[name]||64,th=Math.max(1,Math.round((bottom-top)*tw/(right-left)));
    const tile=makeVariantSurface(tw,th);if(!tile)return null;
    const out=tile.getContext('2d');out.imageSmoothingEnabled=true;
    // Reduce in stages: one large bilinear reduction aliases high-frequency straw and leaf detail.
    let sample=makeVariantSurface(right-left,bottom-top);
    if(!sample)return null;
    sample.getContext('2d').drawImage(full,left,top,right-left,bottom-top,0,0,right-left,bottom-top);
    while(sample.width>tw*2&&sample.height>th*2){
      const next=makeVariantSurface(Math.ceil(sample.width/2),Math.ceil(sample.height/2));if(!next)break;
      const ctx=next.getContext('2d');ctx.imageSmoothingEnabled=true;
      ctx.drawImage(sample,0,0,next.width,next.height);sample=next;
    }
    out.drawImage(sample,0,0,tw,th);
    const pixels=out.getImageData(0,0,tw,th),rgba=pixels.data;
    for(let i=0;i<rgba.length;i+=4){
      if(rgba[i+3]<112){rgba[i+3]=0;continue;}rgba[i+3]=255;
      // Two leaf-only shrub variants break the repeated white-flower silhouette.
      // Keep the flowering version for palette 0; no cover or collision changes.
      if(name==='bush'&&palette>0&&rgba[i]>150&&rgba[i+1]>135&&rgba[i]>rgba[i+2]*.9){
        const light=(rgba[i]+rgba[i+1]+rgba[i+2])/3;
        rgba[i]=light*.50;rgba[i+1]=light*.65;rgba[i+2]=light*(palette===1?.27:.34);
      }
      let best=colors[0],cost=Infinity;
      for(const color of colors){
        const d=(rgba[i]-color[0])**2*2+(rgba[i+1]-color[1])**2*3+(rgba[i+2]-color[2])**2;
        if(d<cost){cost=d;best=color;}
      }
      rgba[i]=best[0];rgba[i+1]=best[1];rgba[i+2]=best[2];
    }
    out.putImageData(pixels,0,0);groundedTiles.set(key,tile);return tile;
  }
  function draw(c, name, x, y, w, h, options = {}) {
    const source=habitatNames.has(name)?habitats:name==='nursery'?nursery:atlas;
    if (!source || !frames[name]) return false;
    c.save(); c.imageSmoothingEnabled=false;
    const grounded = options.grounded ? groundedTile(name,options.palette || 0,source) : null;
    const tinted = grounded || (options.palette > 0 && name !== 'nursery' ? variant(name,options.palette,source) : null);
    c.translate(Math.round(x),Math.round(y));
    if (options.flip) { c.translate(Math.round(w),0); c.scale(-1,1); }
    if (tinted) c.drawImage(tinted,0,0,tinted.width,tinted.height,0,0,Math.round(w),Math.round(h));
    else c.drawImage(source,...frames[name],0,0,Math.round(w),Math.round(h));
    c.restore(); return true;
  }
  return { load, loadNursery, loadHabitats, draw, frames, surface, get ready() { return !!atlas; },get habitatsReady(){return !!habitats;} };
})();
