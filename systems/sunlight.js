/* One visual clock and light direction for the entire farm. No gameplay RNG. */
const Sunlight = (() => {
  let maker=(w,h)=>{
    if(typeof document==='undefined'||!document.createElement)return null;
    const c=document.createElement('canvas');c.width=w;c.height=h;return c;
  },masks=new WeakMap(),nativeTiles=new Map(),enabled=false,capturing=false,casts=0;
  let light=sample(0), layer=null, surfaces=null, actorType=null;
  let footprints=new WeakMap(),unreadable=new WeakSet();
  function sample(seconds,reduced=false) {
    // A gentle return journey avoids a jump in every shadow when the sun loops.
    const phase=reduced?.5:.5-.5*Math.cos((Math.max(0,seconds)+18)*Math.PI*2/240);
    const height=Math.sin(phase*Math.PI);
    return {phase,height,dx:(.5-phase)*1.12,dy:.13+(1-height)*.19,
      opacity:.15+(1-height)*.035,reduced};
  }
  function install(factory){end();maker=factory;masks=new WeakMap();footprints=new WeakMap();unreadable=new WeakSet();nativeTiles.clear();surfaces=null;}
  function begin(seconds,on=true,reduced=false){end();light=sample(seconds,reduced);enabled=on;casts=0;}
  // Keep the floor and the projected shadows separate from depth-sorted bodies.
  // Reusable surfaces avoid drawing/animating every character twice per frame.
  function beginLayer(c) {
    if(!enabled||capturing||layer||!c.canvas||!c.getTransform)return false;
    const w=c.canvas.width,h=c.canvas.height;if(w<1||h<1)return false;
    try {
      if(!surfaces||surfaces.w!==w||surfaces.h!==h){
        const floor=maker(w,h),shadows=maker(w,h);
        if(!floor||!shadows||floor===c.canvas||shadows===c.canvas)return false;
        const floorContext=floor.getContext('2d'),shadowContext=shadows.getContext('2d');
        if(!floorContext||!shadowContext)return false;
        surfaces={w,h,floor,shadows,floorContext,shadowContext};
      }
      const {floorContext,shadowContext}=surfaces;
      for(const out of [floorContext,shadowContext]){
        out.setTransform(1,0,0,1,0,0);out.globalAlpha=1;out.globalCompositeOperation='source-over';out.clearRect(0,0,w,h);
      }
      floorContext.drawImage(c.canvas,0,0);
      c.save();c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,w,h);c.restore();
      layer={context:c,...surfaces};return true;
    } catch { return false; } // Non-browser preview contexts retain inline shadows.
  }
  function actor(type) { actorType=type; }
  function end() {
    actorType=null;
    if(layer){
      const current=layer;layer=null;const c=current.context;
      c.save();c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;
      c.globalCompositeOperation='destination-over';
      c.drawImage(current.shadows,0,0);c.drawImage(current.floor,0,0);c.restore();
    }
    enabled=false;
  }
  function groundContext(c) {
    if(!layer||layer.context!==c)return c;
    const out=layer.shadowContext,m=c.getTransform();
    out.setTransform(m.a,m.b,m.c,m.d,m.e,m.f);
    out.globalAlpha=c.globalAlpha;out.globalCompositeOperation='source-over';return out;
  }
  function mask(image,w,h,rect) {
    const key=[w,h,...(rect||[])].join('/'),saved=masks.get(image);
    if(saved?.has(key))return saved.get(key);
    const tile=maker(w,h);if(!tile)return null;
    const c=tile.getContext('2d');c.imageSmoothingEnabled=false;
    if(rect)c.drawImage(image,...rect,0,0,w,h);else c.drawImage(image,0,0,w,h);
    // Compositing works even when file:// prevents reading sprite pixels.
    c.globalCompositeOperation='source-in';c.fillStyle='#25352b';c.fillRect(0,0,w,h);
    const entries=saved||new Map();if(entries.size>=128)entries.delete(entries.keys().next().value);
    entries.set(key,tile);masks.set(image,entries);return tile;
  }
  function footprint(image,w,h,rect,baked) {
    if(!image||!Number.isFinite(w)||!Number.isFinite(h)||w<1||h<1)return null;
    const keys=['left','right','top','bottom','footLeft','footRight'];
    // Builds store normalized ink bounds, so file:// never needs a pixel read.
    if(baked&&keys.every(k=>Number.isFinite(baked[k])&&baked[k]>=0&&baked[k]<=1)&&
      baked.left<baked.right&&baked.top<baked.bottom&&baked.footLeft<baked.footRight)
      return Object.fromEntries(keys.map(k=>[k,baked[k]*(['top','bottom'].includes(k)?h:w)]));
    if(unreadable.has(image))return null;
    try {
      const tile=mask(image,Math.round(w),Math.round(h),rect);if(!tile)return null;
      if(footprints.has(tile))return footprints.get(tile);
      const tw=tile.width,th=tile.height,data=tile.getContext('2d').getImageData(0,0,tw,th).data;
      if(!data||data.length!==tw*th*4){unreadable.add(image);return null;}
      // Ignore translucent fringes: the opaque paw, not the transparent atlas
      // cell or a faint painted shadow, determines where the character stands.
      let left=tw,right=0,top=th,bottom=0;
      for(let y=0;y<th;y++)for(let x=0;x<tw;x++)if(data[(y*tw+x)*4+3]>=128){
        left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);
      }
      if(!bottom){footprints.set(tile,null);return null;}
      let footLeft=tw,footRight=0;
      const band=Math.max(1,Math.min(3,Math.ceil((bottom-top)*.04)));
      for(let y=Math.max(top,bottom-band);y<bottom;y++)for(let x=left;x<right;x++)
        if(data[(y*tw+x)*4+3]>=128){footLeft=Math.min(footLeft,x);footRight=Math.max(footRight,x+1);}
      const result={left,right,top,bottom,footLeft,footRight};
      footprints.set(tile,result);return result;
    } catch {unreadable.add(image);return null;}
  }
  function cast(c,image,x,y,w,h,ground,rect,support) {
    if(!enabled||capturing||!image||w<1||h<1)return false;
    const tile=mask(image,Math.max(1,Math.round(w)),Math.max(1,Math.round(h)),rect);if(!tile)return false;
    if (support || (actorType && !['owl', 'crow'].includes(actorType))) {
      const lift=Math.max(0,ground-y-(support?.bottom??h));
      const center=support?x+(support.footLeft+support.footRight)/2:x+w/2;
      const rx=support?Math.max(3,(support.footRight-support.footLeft)/2+1):Math.max(5,Math.min(24,w*.21));
      const ry=support?Math.max(1.5,Math.min(3,(support.bottom-support.top)*.045)):Math.max(2,Math.min(5,h*.07));
      // One compact footprint, not a second solar silhouette beneath it.
      contact(c,center,ground-.5,rx,ry,.26/(1+lift/16));
      casts++;return true;
    }
    const matrix=c.getTransform(),dx=light.dx*(matrix.a<0?-1:1),out=groundContext(c);
    out.save();out.globalAlpha*=light.opacity;out.imageSmoothingEnabled=false;
    out.translate(x,ground);out.transform(1,0,-dx,-light.dy,0,0);
    out.drawImage(tile,0,y-ground,w,h);out.restore();casts++;return true;
  }
  // Contact stays at the feet even when the body bobs, hops or tilts above it.
  function contact(c,x,ground,rx,ry,opacity=.18) {
    if(!enabled||capturing||![x,ground,rx,ry,opacity].every(Number.isFinite)||rx<=0||ry<=0)return;
    const out=groundContext(c);out.save();out.fillStyle='#25352b';
    out.globalAlpha*=Math.max(0,Math.min(1,opacity));
    out.beginPath();out.ellipse(x,ground,rx,ry,0,0,Math.PI*2);out.fill();
    out.restore();
  }
  function native(c,key,box,ground,paint) {
    if(!enabled||capturing)return;
    let tile=nativeTiles.get(key);
    if(!tile){
      tile=maker(Math.ceil(box.w),Math.ceil(box.h));if(!tile)return;
      const out=tile.getContext('2d');out.translate(-box.x,-box.y);
      capturing=true;try{paint(out);}finally{capturing=false;}
      if(nativeTiles.size>=256)nativeTiles.delete(nativeTiles.keys().next().value);
      nativeTiles.set(key,tile);
    }
    cast(c,tile,box.x,box.y,box.w,box.h,ground);
  }
  function rail(c,x1,y1,x2,y2,height,width=3) {
    if(!enabled||capturing)return;
    const out=groundContext(c);
    out.save();out.globalAlpha*=light.opacity;out.strokeStyle='#25352b';out.lineWidth=width;out.lineCap='round';
    const dx=light.dx*height,dy=light.dy*height;
    out.beginPath();out.moveTo(x1,y1);out.lineTo(x1+dx,y1+dy);out.lineTo(x2+dx,y2+dy);out.lineTo(x2,y2);out.stroke();out.restore();
  }
  // The sun is an off-screen light source, not an icon sitting on the field.
  return {install,begin,beginLayer,actor,end,sample,cast,contact,footprint,native,rail,
    get active(){return enabled&&!capturing;},inspect:()=>({...light,casts,active:enabled,nativeTiles:nativeTiles.size,groundLayer:!!layer})};
})();
