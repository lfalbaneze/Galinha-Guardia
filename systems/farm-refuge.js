/* A fixed home inside the generator's reserved yard; the rest of the farm stays procedural. */
const FarmRefuge = (() => {
  const bounds = Object.freeze({ x: 90, y: 174, w: 260, h: 308 });
  // The taller edition-93 sheet fits the existing walls and nest floor at y=270.
  const nursery = Object.freeze({ x: 102, y: 120, w: 242, h: 150 });
  // Horse, cow and donkey stand in the back, where their taller silhouettes
  // fit below the nursery. Small friends occupy the front without hiding them.
  const homes = [[128,402],[196,402],[116,442],[162,442],[234,354],[264,402],[212,442],[260,442],[310,354],[312,442],[141,354],[326,402]];
  const nests = [[168,237],[190,237],[212,237],[234,237],[256,237],[168,257],[190,257],[212,257],[234,257],[256,257]];
  // The atlas fits inside the nursery's drawing box. Collide with its wooden
  // walls and posts, leaving the open front and the chicks' floor accessible.
  const nurseryWalls = [
    {x:153,y:203,w:130,h:19,type:'nursery'},
    {x:142,y:210,w:14,h:58,type:'nursery'},
    {x:270,y:208,w:39,h:62,type:'nursery'}
  ];
  // Draw each side as a continuous fence run. The east side keeps the gate opening.
  const rails = [
    { x:90,y:174,w:260,h:0 },
    { x:90,y:482,w:260,h:0 },
    { x:90,y:174,w:0,h:308 },
    { x:350,y:174,w:0,h:164 },
    { x:350,y:430,w:0,h:52 }
  ];
  function home(index, chick = false) {
    const points = chick ? nests : homes, p = points[index % points.length];
    return { x:p[0], y:p[1] };
  }
  function gooseHome() { return { x: 190, y: 327 }; }
  function contains(point, padding = 0) {
    if (!point) return false;
    const inset=Math.max(0,Number.isFinite(padding)?padding:0);
    const x=point.x+(point.hitbox?.ox||0),y=point.y+(point.hitbox?.oy||0);
    return x>=bounds.x+inset&&x<=bounds.x+bounds.w-inset&&
      y>=bounds.y+inset&&y<=bounds.y+bounds.h-inset;
  }
  function obstacles() {
    return [
      ...rails.map(p => ({ x:p.x-4,y:p.y-3,w:p.w+8,h:p.h+6,type:'refuge-fence',opaque:false })),
      ...nurseryWalls.map(wall=>({...wall})),
      { x:108,y:284,w:55,h:18,type:'trough',opaque:false }
    ];
  }
  function props() {
    return [
      ...rails.map((p,i) => ({ ...p,type:'refuge-rail',id:`refuge-rail-${i}`,depth:p.y+p.h+5 })),
      { ...nursery,type:'nursery',id:'nursery',depth:216 },
      { ...nursery,type:'nursery-lip',id:'nursery-lip',depth:274 },
      { x:105,y:275,w:61,h:34,type:'refuge-trough',id:'refuge-trough',depth:307 }
    ];
  }
  function ensureClear(entity) {
    const h=getHitbox(entity);
    if(h.x<60||h.x>390||h.y<120||h.y>510)return;
    const clear=(x,y)=>OBSTACLES.every(r=>Math.hypot(x-clamp(x,r.x,r.x+r.w),y-clamp(y,r.y,r.y+r.h))>=h.r+.1);
    if(clear(h.x,h.y))return;
    // A save from the old empty yard may now sit between a wall and the nursery.
    for(let radius=8;radius<=256;radius+=8)for(let i=0;i<32;i++) {
      const angle=i*Math.PI/16,x=h.x+Math.cos(angle)*radius,y=h.y+Math.sin(angle)*radius;
      if(x<h.r||y<h.r||x>WORLD.width-h.r||y>WORLD.height-h.r||!clear(x,y))continue;
      setEntityPosFromHitbox(entity,x,y);return;
    }
  }
  const fenceStyle=Object.freeze({
    shadow:'#26332330',edge:'#5b3a24',dark:'#74482a',base:'#9c6338',
    light:'#c4894f',top:'#dea967',knot:'#604027',bolt:'#66737a',boltLight:'#c6d0d3'
  });
  function fenceBolt(c,x,y) {
    x=Math.round(x);y=Math.round(y);
    c.fillStyle=fenceStyle.bolt;c.fillRect(x,y,3,3);
    c.fillStyle=fenceStyle.boltLight;c.fillRect(x,y,1,1);
  }
  function fencePost(c,x,y) {
    x=Math.round(x);y=Math.round(y);
    c.fillStyle=fenceStyle.shadow;c.fillRect(x-7,y+3,14,2);
    c.fillStyle=fenceStyle.edge;c.fillRect(x-6,y-31,12,35);
    c.fillStyle=fenceStyle.dark;c.fillRect(x-4,y-29,8,32);
    c.fillStyle=fenceStyle.base;c.fillRect(x-3,y-28,6,30);
    c.fillStyle=fenceStyle.light;c.fillRect(x-3,y-28,2,28);
    c.fillStyle=fenceStyle.top;c.fillRect(x-5,y-31,10,4);
    c.fillStyle=fenceStyle.knot;c.fillRect(x+1,y-19,2,8);
    fenceBolt(c,x-1,y-22);fenceBolt(c,x-1,y-11);
  }
  function drawFenceBarHorizontal(c,x,y,w) {
    x=Math.round(x);y=Math.round(y);w=Math.max(1,Math.round(w));
    c.fillStyle=fenceStyle.edge;c.fillRect(x,y,w,6);
    c.fillStyle=fenceStyle.dark;c.fillRect(x+1,y+1,Math.max(1,w-2),4);
    c.fillStyle=fenceStyle.base;c.fillRect(x+1,y+1,Math.max(1,w-2),3);
    c.fillStyle=fenceStyle.light;c.fillRect(x+2,y+1,Math.max(1,w-4),1);
  }
  function drawFenceBarVertical(c,x,y,h) {
    x=Math.round(x);y=Math.round(y);h=Math.max(1,Math.round(h));
    c.fillStyle=fenceStyle.edge;c.fillRect(x,y,6,h);
    c.fillStyle=fenceStyle.dark;c.fillRect(x+1,y+1,4,Math.max(1,h-2));
    c.fillStyle=fenceStyle.base;c.fillRect(x+1,y+1,3,Math.max(1,h-2));
    c.fillStyle=fenceStyle.light;c.fillRect(x+1,y+2,1,Math.max(1,h-4));
  }
  function drawFenceHorizontal(c,x,y,w) {
    const left=Math.round(x),right=Math.round(x+w),length=Math.max(1,right-left);
    const intervals=Math.max(1,Math.round(length/52));
    if(typeof Sunlight!=='undefined')Sunlight.rail(c,left,y+4,right,y+4,30,4);
    drawFenceBarHorizontal(c,left,y-24,length);
    drawFenceBarHorizontal(c,left,y-11,length);
    for(let i=0;i<=intervals;i++)fencePost(c,Math.round(left+length*i/intervals),y);
  }
  function drawFenceVertical(c,x,y,h) {
    const top=Math.round(y),bottom=Math.round(y+h),length=Math.max(1,bottom-top);
    const intervals=Math.max(1,Math.round(length/52));
    if(typeof Sunlight!=='undefined')Sunlight.rail(c,x,top+4,x,bottom+4,30,4);
    // Give the side fence the same visual weight as the horizontal run:
    // two clearly separated rails plus the exact same posts at the same cadence.
    drawFenceBarVertical(c,x-12,top-25,length+25);
    drawFenceBarVertical(c,x+6,top-25,length+25);
    for(let i=0;i<=intervals;i++)fencePost(c,x,Math.round(top+length*i/intervals));
  }
  function drawProp(c,p) {
    if(p.type==='nursery') {
      if(!FarmSprites.draw(c,'nursery',p.x,p.y,p.w,p.h,{grounded:true,shadow:true})) FarmSprites.draw(c,'coop',p.x+65,p.y,105,p.h,{grounded:true,shadow:true});
    } else if(p.type==='nursery-lip') {
      if(FarmSprites.cohesiveReady) {
        // Roof and front posts must cover actors standing inside the shelter.
        // Painting only its bottom strip made actors appear on top of the roof.
        c.save();c.beginPath();
        c.rect(p.x,p.y,p.w,46);
        c.rect(p.x+40,p.y+44,14,p.h-44);c.rect(p.x+168,p.y+44,39,p.h-44);
        c.rect(p.x,p.y+p.h-7,p.w,7);c.clip();
        FarmSprites.draw(c,'nursery',p.x,p.y,p.w,p.h,{grounded:true,solar:false});c.restore();return;
      }
      // Only the low front boards cover the chicks' feet, never their faces.
      c.save();c.beginPath();
      for(const [i,point] of [[0,.65],[.32,.73],[.57,.79],[.84,.89],[1,.94]].entries()) {
        const x=p.x+p.w*point[0],y=p.y+p.h*point[1];
        if(i)c.lineTo(x,y);else c.moveTo(x,y);
      }
      c.lineTo(p.x+p.w,p.y+p.h);c.lineTo(p.x,p.y+p.h);c.closePath();c.clip();
      FarmSprites.draw(c,'nursery',p.x,p.y,p.w,p.h,{grounded:true,solar:false});c.restore();
    } else if(p.type==='refuge-trough') {
      FarmSprites.draw(c,'trough',p.x,p.y,p.w,p.h,{grounded:true,shadow:true});
    } else if(p.type==='refuge-rail') {
      if(p.w) drawFenceHorizontal(c,p.x,p.y,p.w);
      else drawFenceVertical(c,p.x,p.y,p.h);
    }
  }
  function drawGround(c,camera) {
    c.save();c.translate(-camera.x+(camera.shakeX||0),-camera.y+(camera.shakeY||0));
    // Scattered grain and straw are small enough to read as care, rather than labels.
    for(let i=0;i<28;i++) {
      const x=116+(i*43)%213,y=267+(i*17)%20;
      c.fillStyle=i%3?'#c8a753':'#e2c474';c.fillRect(x,y,3+(i%3),1);
    }
    for(let i=0;i<18;i++) {
      const x=112+(i*59)%215,y=316+(i*31)%128;
      c.fillStyle='#91a451';c.fillRect(x,y,2,4);c.fillRect(x+3,y-2,2,6);
    }
    c.restore();
  }
  return { bounds,nursery,home,gooseHome,contains,obstacles,props,drawProp,drawGround,ensureClear };
})();
