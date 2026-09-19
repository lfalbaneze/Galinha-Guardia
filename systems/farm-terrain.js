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
    const paths=[...(layout.paths||[]),...(layout.lanes||[]),...(layout.clearings||[]),
      {x:218,y:366,w:182,h:38},{x:209,y:260,w:30,h:126},{x:111,y:258,w:220,h:30}
    ].map(p=>({...p,r:Math.min(p.w,p.h)/2-5}));
    const tones={granja:[125,150,81],estabulo:[121,148,84],horta:[114,148,82],quintal:[109,143,82]};
    for(let yy=0;yy<height;yy++) for(let xx=0;xx<width;xx++) {
      const x=xx*step,y=yy*step,n=hash(xx,yy,seed),broad=noise(x/115,y/115,seed),fine=noise(x/19,y/19,seed+4);
      let edge=Infinity,rut=Infinity;
      for(const p of paths) {
        if(x<p.x-12||x>p.x+p.w+12||y<p.y-12||y>p.y+p.h+12)continue;
        const cx=Math.max(p.x+p.r,Math.min(p.x+p.w-p.r,x));
        const cy=Math.max(p.y+p.r,Math.min(p.y+p.h-p.r,y));
        const distance=Math.hypot(x-cx,y-cy)-p.r;
        edge=Math.min(edge,distance);
        if(distance < -12) {
          const horizontal=p.w>p.h,across=horizontal?y-(p.y+p.h/2):x-(p.x+p.w/2);
          const bend=Math.sin((horizontal?x:y)/91+seed)*2;
          rut=Math.min(rut,Math.abs(Math.abs(across-bend)-Math.min(p.w,p.h)*.22));
        }
      }
      // A narrow walk through a grassy paddock replaces the bare oval courtyard.
      if(x>108&&x<337&&y>214&&y<271)edge=Math.min(edge,-8);
      edge += (fine-.5)*9+(n-.5)*2;
      let rgb;
      if(edge<0) {
        const shade=(broad-.5)*11+(fine-.5)*4+(n<.025?-5:n>.99?5:0);
        const worn=rut<2.5&&fine>.27?6:0;
        rgb=[197+shade-worn,169+shade-worn,119+shade-worn];
        if(edge>-3)rgb=[154+shade,151+shade,91+shade];
      } else {
        const meadow=noise(x/250,y/210,seed+23),shade=(broad-.5)*16+(fine-.5)*4+(n<.025?-4:n>.99?4:0);
        rgb=[110+shade+meadow*7,145+shade,80+shade*.7];
        if(x>96&&x<346&&y>280&&y<477)rgb=[119+shade,158+shade,84+shade*.7];
        for(const area of layout.areas||[]) {
          const tone=tones[area.id];if(!tone)continue;
          const inside=Math.min(x-area.x,area.x+area.w-x,y-area.y,area.y+area.h-y);
          if(inside<=0)continue;
          const mix=Math.min(1,inside/90)*(.65+fine*.35);
          rgb=rgb.map((v,i)=>v*(1-mix)+(tone[i]+shade*(i===2?.7:1))*mix);break;
        }
        if(edge<4)rgb=[128+shade,148+shade,85+shade*.7];
      }
      const i=(yy*width+xx)*4;data[i]=rgb[0];data[i+1]=rgb[1];data[i+2]=rgb[2];data[i+3]=255;
    }
    c.putImageData(image,0,0);
    // Sparse cut-grass strokes add scale to the soft ground variation, cached with the terrain.
    for(let y=20;y<layout.height-20;y+=34)for(let x=20;x<layout.width-20;x+=37) {
      const n=hash(x,y,seed+78);if(n<.76)continue;
      const xx=x+n*15,yy=y+hash(y,x,seed)*18;
      if(paths.some(p=>xx>p.x-8&&xx<p.x+p.w+8&&yy>p.y-8&&yy<p.y+p.h+8))continue;
      const px=Math.round(xx/step),py=Math.round(yy/step);
      c.fillStyle=n>.9?'#bac58b38':'#486b3a30';c.fillRect(px,py,1,2);c.fillRect(px+2,py-1,1,2);
    }
    return canvas;
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
