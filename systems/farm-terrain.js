/* Seeded, cached pixel terrain. It never changes the farm's collision geometry. */
const FarmTerrain = (() => {
  let cachedLayout = null, texture = null, maker = null;
  const hash = (x,y,seed) => { let n=Math.imul(x^seed,374761393)+Math.imul(y,668265263); n=Math.imul(n^(n>>>13),1274126177); return ((n^(n>>>16))>>>0)/4294967295; };
  function noise(x,y,seed) {
    const ix=Math.floor(x), iy=Math.floor(y); let fx=x-ix,fy=y-iy;
    fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);
    const a=hash(ix,iy,seed),b=hash(ix+1,iy,seed),d=hash(ix,iy+1,seed),e=hash(ix+1,iy+1,seed);
    return (a+(b-a)*fx)*(1-fy)+(d+(e-d)*fx)*fy;
  }
  function create(layout, makeSurface) {
    const step=3, width=Math.ceil(layout.width/step),height=Math.ceil(layout.height/step);
    const canvas=makeSurface(width,height); if(!canvas)return null;
    const c=canvas.getContext('2d'),image=c.createImageData(width,height),data=image.data;
    const seed=layout.seed||0;
    const paths=(layout.paths||[]).map(p=>({...p,r:Math.min(p.w,p.h)/2-5}));
    const tones={granja:[117,139,59],estabulo:[115,130,64],horta:[77,120,49],quintal:[79,125,60]};
    for(let yy=0;yy<height;yy++) for(let xx=0;xx<width;xx++) {
      const x=xx*step,y=yy*step,n=hash(xx,yy,seed),broad=noise(x/115,y/115,seed),fine=noise(x/19,y/19,seed+4);
      let edge=Infinity;
      for(const p of paths) {
        if(x<p.x-12||x>p.x+p.w+12||y<p.y-12||y>p.y+p.h+12)continue;
        const cx=Math.max(p.x+p.r,Math.min(p.x+p.w-p.r,x));
        const cy=Math.max(p.y+p.r,Math.min(p.y+p.h-p.r,y));
        edge=Math.min(edge,Math.hypot(x-cx,y-cy)-p.r);
      }
      // A worn courtyard under the barn and the rescued animals.
      const dx=(x-240)/177,dy=(y-358)/143;
      edge=Math.min(edge,(Math.hypot(dx,dy)-1)*90);
      edge += (fine-.5)*13+(n-.5)*3;
      let rgb;
      if(edge<0) {
        const shade=(broad-.5)*18+(fine-.5)*12+(n<.10?-13:n>.92?10:0);
        rgb=[194+shade,153+shade,94+shade];
        if(edge>-5)rgb=[158+shade,137+shade,78+shade];
      } else {
        const shade=(broad-.5)*28+(fine-.5)*13+(n<.1?-8:n>.90?7:0);
        rgb=[91+shade,130+shade,53+shade*.7];
        for(const area of layout.areas||[]) {
          const tone=tones[area.id];if(!tone)continue;
          const inside=Math.min(x-area.x,area.x+area.w-x,y-area.y,area.y+area.h-y);
          if(inside<=0)continue;
          const mix=Math.min(1,inside/90)*(.65+fine*.35);
          rgb=rgb.map((v,i)=>v*(1-mix)+(tone[i]+shade*(i===2?.7:1))*mix);break;
        }
        if(edge<5)rgb=[114+shade,141+shade,62+shade*.7];
      }
      const i=(yy*width+xx)*4;data[i]=rgb[0];data[i+1]=rgb[1];data[i+2]=rgb[2];data[i+3]=255;
    }
    c.putImageData(image,0,0);return canvas;
  }
  function install(makeSurface) { maker=makeSurface;cachedLayout=null;texture=null; }
  function draw(c,layout,camera) {
    const makeSurface=maker||FarmSprites.surface;
    if(cachedLayout!==layout) { texture=create(layout,makeSurface);cachedLayout=layout; }
    if(!texture)return false;
    c.save();c.imageSmoothingEnabled=false;
    c.drawImage(texture,-camera.x+(camera.shakeX||0),-camera.y+(camera.shakeY||0),layout.width,layout.height);
    c.restore();return true;
  }
  function drawMap(c,layout,x,y,w,h) {
    if(!texture||cachedLayout!==layout)return false;
    c.save();c.imageSmoothingEnabled=false;c.drawImage(texture,x,y,w,h);c.restore();return true;
  }
  return { draw, install, drawMap };
})();
