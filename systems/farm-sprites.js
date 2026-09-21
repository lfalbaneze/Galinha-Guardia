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
  let props=null,propsPending=null;
  let cohesive=null,cohesivePending=null;
  // Measured alpha bounds: generated atlases need not land on exact grid cells.
  const cohesiveFrames=Object.freeze(typeof FarmArcadeData!=='undefined'?FarmArcadeData.frames:{
    tree:[27,53,270,300],bush:[322,161,297,186],pear:[651,43,265,309],willow:[956,63,280,284],
    bramble:[23,482,275,154],shelter:[323,440,291,189],barn:[642,375,284,258],coop:[992,423,223,228],
    silo:[96,648,131,295],hay:[345,735,249,201],trough:[635,819,297,112],fence:[962,797,265,131],
    daisies:[45,1007,233,209],lavender:[366,1019,188,192],harvest:[629,1021,311,195],nursery:[952,1026,288,184]
  });
  const propFrames=Object.freeze({barn:[0,0,512,512],coop:[512,0,512,512],silo:[1024,0,512,512],
    hay:[0,512,512,512],trough:[512,512,512,512],fence:[1024,512,512,512]});
  const frame=(name,source)=>source===props?propFrames[name]:frames[name];
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
  function loadCohesive(loader=browserImage,makeSurface=surface) {
    if(cohesive)return Promise.resolve(true);
    if(cohesivePending)return cohesivePending;
    if(typeof FarmCohesiveData==='undefined'&&typeof FarmArcadeData==='undefined')return Promise.resolve(false);
    cohesivePending=Promise.resolve().then(async()=>{
      try {
        const spec=typeof FarmArcadeData==='undefined'?{image:FarmCohesiveData,width:1254,height:1254}:FarmArcadeData;
        const source=await loader(spec.image);
        if(source.width!==spec.width||source.height!==spec.height)return false;
        cohesive=source;makeVariantSurface=makeSurface;SpriteStyle.install(makeSurface);return true;
      } catch{return false;}finally{cohesivePending=null;}
    });return cohesivePending;
  }
  function drawCohesive(c,name,x,y,w,h,options={}) {
    const rect=cohesiveFrames[name];if(!cohesive||!rect)return false;
    // Fit, never stretch: round trees, tall silos and low troughs retain their silhouette.
    const scale=name==='fence'?w/rect[2]:Math.min(w/rect[2],h/rect[3]);
    const width=Math.max(1,Math.round(rect[2]*scale)),height=Math.max(1,Math.round(rect[3]*scale));
    const tile=SpriteStyle.tile(cohesive,rect,width,height);if(!tile)return false;
    paintGrounded(c,name,tile,x+(w-width)/2,y+h-height,width,height,options);return true;
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
  function loadProps(loader=browserImage,makeSurface=surface) {
    if(props)return Promise.resolve(true);
    if(propsPending)return propsPending;
    if(typeof FarmPropData==='undefined')return Promise.resolve(false);
    propsPending=Promise.resolve().then(async()=>{
      try {
        const source=await loader(FarmPropData),sheet=makeSurface(source.width,source.height);
        if(!sheet||source.width!==1536||source.height!==1024)return false;
        sheet.getContext('2d').drawImage(source,0,0);
        props=sheet;makeVariantSurface=makeSurface;variants.clear();groundedTiles.clear();return true;
      }catch{return false;}finally{propsPending=null;}
    });
    return propsPending;
  }
  let makeVariantSurface = surface;
  function variant(name, palette, source) {
    const key = `${name}/${palette}`;
    if (variants.has(key)) return variants.get(key);
    const [x,y,w,h] = frame(name,source), tile = makeVariantSurface(w,h);
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
  const contactTiles = new WeakMap();
  function contactTile(name, source, width, height) {
    const key=`${name}/${width}/${height}`,saved=contactTiles.get(source);
    if(saved?.has(key))return saved.get(key);
    let tile=source;
    if(source.width!==width||source.height!==height) {
      tile=makeVariantSurface(width,height);if(!tile)return null;
      const c=tile.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(source,0,0,width,height);
    }
    const result={tile,bottom:height-1,shadow:null,foundation:null};
    try {
      const pixels=tile.getContext('2d').getImageData(0,0,width,height).data;
      const edge=new Int32Array(width).fill(-1);let bottom=-1;
      for(let x=0;x<width;x++)for(let y=height-1;y>=0;y--)if(pixels[(y*width+x)*4+3]>=112) {
        edge[x]=y;bottom=Math.max(bottom,y);break;
      }
      if(bottom>=0) {
        result.bottom=bottom;
        const tree=['tree','pear','willow'].includes(name);
        const floor=bottom-Math.max(3,Math.round(height*(tree?.12:.30)));
        const feet=[];
        // A raised water trough rests on two feet, not on the suspended bowl.
        // Measure each end separately: the rear foot is higher in the older angled sprite.
        const coopSupports=cohesive&&typeof FarmArcadeData!=='undefined'
          ?[[.04,.18],[.67,.92],[.37,.51]]
          :[[.065,.11],[.14,.4],[.60,.75],[.79,.93]];
        const ends=name==='trough'?[[0,Math.ceil(width*.28)],[Math.floor(width*.7),width]]:
          name==='coop'?coopSupports.map(([a,b])=>[Math.floor(a*width),Math.ceil(b*width)]):null;
        const depths=ends?.map(([a,b])=>Math.max(...edge.slice(a,b)));
        for(let x=0;x<width;x++) {
          const y=edge[x];if(y<floor)continue;
          if(ends&&!ends.some(([a,b],i)=>x>=a&&x<b&&y>=depths[i]-1))continue;
          feet.push([x,y]);
        }
        const shadow=makeVariantSurface(width+2,height+3);
        if(shadow) {
          const c=shadow.getContext('2d');
          // Two world pixels at the actual lower contour. No floating oval,
          // transparent atlas padding or canopy width can move this contact patch.
          c.fillStyle='#26332320';c.beginPath();
          for(const [x,y] of feet)c.rect(x,y+1,3,3);
          c.fill();c.fillStyle='#26332350';c.beginPath();
          for(const [x,y] of feet)c.rect(x+1,y+1,1,2);
          c.fill();result.shadow=shadow;
        }
        if(name==='coop'&&ends) {
          const supports=ends.map(([a,b],i)=>{
            const xs=[];for(let x=a;x<b;x++)if(edge[x]>=depths[i]-1)xs.push(x);
            return {left:Math.min(...xs),right:Math.max(...xs),y:depths[i]};
          });
          const foundation=makeVariantSurface(width+16,height+10);
          if(foundation&&supports.every(p=>Number.isFinite(p.left))) {
            const c=foundation.getContext('2d'),[left,ramp,front,rear=ramp]=supports;
            c.translate(8,0);
            // A small bare-earth apron establishes the ground plane under the
            // raised coop. It follows the feet in perspective, not the ramp's baseline.
            c.beginPath();c.moveTo(left.left-4,left.y-5);c.lineTo(rear.right+4,rear.y-6);
            c.lineTo(rear.right+6,rear.y+4);c.lineTo(front.right+5,front.y+5);
            c.lineTo(ramp.right+4,ramp.y+3);c.lineTo(ramp.left-4,ramp.y+3);
            c.lineTo(left.left-5,left.y+3);c.closePath();c.fillStyle='#ab925dcc';c.fill();
            // Stone feet touch the visible posts; the ramp rests on soil.
            for(const support of supports.filter((_,i)=>i!==1)) {
              const l=support.left-1,r=support.right+1,y=support.y;
              c.fillStyle='#3b3d2840';c.fillRect(l-1,y+3,r-l+3,1);
              c.beginPath();c.moveTo(l,y);c.lineTo(r,y);c.lineTo(r+1,y+2);
              c.lineTo(r,y+3);c.lineTo(l-1,y+3);c.lineTo(l-2,y+1);c.closePath();
              c.fillStyle='#a7996e';c.fill();c.strokeStyle='#615339';c.lineWidth=1;c.stroke();
              c.fillStyle='#c5b68a';c.fillRect(l,y,r-l,1);
            }
            c.fillStyle='#68533180';c.fillRect(ramp.left,ramp.y,ramp.right-ramp.left+1,2);
            result.foundation=foundation;
          }
        }
      }
    } catch(error) {
      // A blocked local pixel read must never prevent the sprite from drawing.
      if(error.name!=='SecurityError')throw error;
    }
    const entries=saved||new Map();if(entries.size>=32)entries.delete(entries.keys().next().value);
    entries.set(key,result);contactTiles.set(source,entries);return result;
  }
  function paintGrounded(c,name,tile,x,y,w,h,options) {
    const width=Math.max(1,Math.round(w)),height=Math.max(1,Math.round(h));
    const placed=contactTile(name,tile,width,height);if(!placed)return;
    c.save();c.imageSmoothingEnabled=false;
    // Align the last opaque pixel, not the transparent edge of the frame.
    c.translate(Math.round(x),Math.round(y+h)-1-placed.bottom);
    if(options.flip){c.translate(width,0);c.scale(-1,1);}
    if(options.foundation&&placed.foundation)c.drawImage(placed.foundation,-8,0);
    if(options.solar!==false&&typeof Sunlight!=='undefined')Sunlight.cast(c,placed.tile,0,0,width,height,placed.bottom+1);
    if(options.shadow&&placed.shadow)c.drawImage(placed.shadow,-1,-1);
    c.drawImage(placed.tile,0,0);c.restore();
  }
  const pixelWidths = { barn:80, coop:56, silo:36, tree:60, bush:44, hay:32, fence:44, trough:32, nursery:112,
    shelter:78,willow:58,bramble:48,pear:42 };
  const propWidths={barn:104,coop:76,silo:52,hay:52,trough:64,fence:68};
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
    const [x,y,w,h]=frame(name,source), full=makeVariantSurface(w,h);
    if (!full) return null;
    const c=full.getContext('2d'), tinted=palette>0&&name!=='nursery'?variant(name,palette,source):null;
    if(tinted)c.drawImage(tinted,0,0);else c.drawImage(source,x,y,w,h,0,0,w,h);
    const data=c.getImageData(0,0,w,h).data;
    let left=w,top=h,right=0,bottom=0;
    for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)if(data[(yy*w+xx)*4+3]>=96){
      left=Math.min(left,xx);top=Math.min(top,yy);right=Math.max(right,xx+1);bottom=Math.max(bottom,yy+1);
    }
    if(right<=left||bottom<=top)return null;
    const tw=(source===props?propWidths[name]:pixelWidths[name])||64,th=Math.max(1,Math.round((bottom-top)*tw/(right-left)));
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
      // Keep the new sheet's red timber, blue water and silver metal distinct.
      // The old vegetation retains its deliberately muted shared palette.
      if(source===props)continue;
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
    if(drawCohesive(c,name,x,y,w,h,options))return true;
    const source=props&&propFrames[name]?props:habitatNames.has(name)?habitats:name==='nursery'?nursery:atlas;
    if (!source || !frames[name]) return false;
    c.save(); c.imageSmoothingEnabled=false;
    const grounded = options.grounded ? groundedTile(name,options.palette || 0,source) : null;
    if(grounded) {
      paintGrounded(c,name,grounded,x,y,w,h,options);c.restore();return true;
    }
    const tinted = grounded || (options.palette > 0 && name !== 'nursery' ? variant(name,options.palette,source) : null);
    c.translate(Math.round(x),Math.round(y));
    if (options.flip) { c.translate(Math.round(w),0); c.scale(-1,1); }
    if (tinted) c.drawImage(tinted,0,0,tinted.width,tinted.height,0,0,Math.round(w),Math.round(h));
    else c.drawImage(source,...frame(name,source),0,0,Math.round(w),Math.round(h));
    c.restore(); return true;
  }
  return { load, loadNursery, loadHabitats, loadProps, loadCohesive, draw, frames, propFrames, cohesiveFrames, surface,
    get cohesiveReady(){return !!cohesive;},get ready() { return !!cohesive||!!atlas; },
    get habitatsReady(){return !!cohesive||!!habitats;},get propsReady(){return !!cohesive||!!props;} };
})();
