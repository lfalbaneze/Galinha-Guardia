/* The atlas is decoded once. A white color key lets it work from file:// as well. */
const FarmSprites = (() => {
  const frames = Object.freeze({
    barn: [18, 64, 405, 470], coop: [456, 185, 324, 361], silo: [846, 64, 212, 488],
    tree: [1123, 108, 400, 444], bush: [27, 652, 329, 267], hay: [410, 653, 315, 260],
    fence: [793, 670, 322, 234], trough: [1175, 693, 329, 211], nursery: [156,194,1255,589]
  });
  let atlas = null, pending = null, nursery = null, nurseryPending = null;
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
        makeVariantSurface = makeSurface; variants.clear();
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
  function draw(c, name, x, y, w, h, options = {}) {
    const source=name==='nursery'?nursery:atlas;
    if (!source || !frames[name]) return false;
    c.save(); c.imageSmoothingEnabled=false;
    const tinted = options.palette > 0 && name !== 'nursery' ? variant(name,options.palette,source) : null;
    c.translate(Math.round(x),Math.round(y));
    if (options.flip) { c.translate(Math.round(w),0); c.scale(-1,1); }
    if (tinted) c.drawImage(tinted,0,0,tinted.width,tinted.height,0,0,Math.round(w),Math.round(h));
    else c.drawImage(source,...frames[name],0,0,Math.round(w),Math.round(h));
    c.restore(); return true;
  }
  return { load, loadNursery, draw, frames, surface, get ready() { return !!atlas; } };
})();
