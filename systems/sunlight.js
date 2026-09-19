/* One visual clock and light direction for the entire farm. No gameplay RNG. */
const Sunlight = (() => {
  let maker=(w,h)=>{
    if(typeof document==='undefined'||!document.createElement)return null;
    const c=document.createElement('canvas');c.width=w;c.height=h;return c;
  },masks=new WeakMap(),nativeTiles=new Map(),enabled=false,capturing=false,casts=0;
  let light=sample(0);
  function sample(seconds,reduced=false) {
    // A gentle return journey avoids a jump in every shadow when the sun loops.
    const phase=reduced?.5:.5-.5*Math.cos((Math.max(0,seconds)+18)*Math.PI*2/240);
    const height=Math.sin(phase*Math.PI);
    return {phase,height,dx:(.5-phase)*1.12,dy:.13+(1-height)*.19,
      opacity:.15+(1-height)*.035,reduced};
  }
  function install(factory){maker=factory;masks=new WeakMap();nativeTiles.clear();}
  function begin(seconds,on=true,reduced=false){light=sample(seconds,reduced);enabled=on;casts=0;}
  function end(){enabled=false;}
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
  function cast(c,image,x,y,w,h,ground,rect) {
    if(!enabled||capturing||!image||w<1||h<1)return false;
    const tile=mask(image,Math.max(1,Math.round(w)),Math.max(1,Math.round(h)),rect);if(!tile)return false;
    const matrix=c.getTransform(),dx=light.dx*(matrix.a<0?-1:1);
    c.save();c.globalAlpha*=light.opacity;c.imageSmoothingEnabled=false;
    c.translate(x,ground);c.transform(1,0,-dx,-light.dy,0,0);
    c.drawImage(tile,0,y-ground,w,h);c.restore();casts++;return true;
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
    c.save();c.globalAlpha*=light.opacity;c.strokeStyle='#25352b';c.lineWidth=width;c.lineCap='round';
    const dx=light.dx*height,dy=light.dy*height;
    c.beginPath();c.moveTo(x1,y1);c.lineTo(x1+dx,y1+dy);c.lineTo(x2+dx,y2+dy);c.lineTo(x2,y2);c.stroke();c.restore();
  }
  // The sun is an off-screen light source. A screen-space icon laid over this
  // top-down field looked like a loose object sitting on grass and fences.
  return {install,begin,end,sample,cast,native,rail,
    get active(){return enabled&&!capturing;},inspect:()=>({...light,casts,active:enabled,nativeTiles:nativeTiles.size})};
})();
