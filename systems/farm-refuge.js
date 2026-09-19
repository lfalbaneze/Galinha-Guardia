/* A fixed home inside the generator's reserved yard; the rest of the farm stays procedural. */
const FarmRefuge = (() => {
  const bounds = Object.freeze({ x: 90, y: 174, w: 260, h: 308 });
  const nursery = Object.freeze({ x: 102, y: 156, w: 242, h: 114 });
  // Horse, cow and donkey stand in the back, where their taller silhouettes
  // fit below the nursery. Small friends occupy the front without hiding them.
  const homes = [[128,402],[196,402],[116,442],[162,442],[234,354],[264,402],[212,442],[260,442],[310,354],[312,442],[141,354],[326,402]];
  const nests = [[143,226],[166,228],[205,233],[228,235],[267,240],[290,242]];
  const rails = [
    ...[0,1,2].map(i => ({ x:90+i*86.67,y:174,w:86.67,h:0 })),
    ...[0,1,2].map(i => ({ x:90+i*86.67,y:482,w:86.67,h:0 })),
    ...[0,1,2,3,4].map(i => ({ x:90,y:174+i*61.6,w:0,h:61.6 })),
    ...[0,1,2].map(i => ({ x:350,y:174+i*54.67,w:0,h:54.67 })),
    { x:350,y:430,w:0,h:52 }
  ];
  function home(index, chick = false) {
    const points = chick ? nests : homes, p = points[index % points.length];
    return { x:p[0], y:p[1] };
  }
  function obstacles() {
    return [
      ...rails.map(p => ({ x:p.x-4,y:p.y-3,w:p.w+8,h:p.h+6,type:'refuge-fence',opaque:false })),
      { x:108,y:166,w:230,h:45,type:'nursery' },
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
  function post(c,x,y) {
    c.fillStyle='#26332330';c.fillRect(x-6,y+3,12,2);
    x=Math.round(x);y=Math.round(y);
    c.fillStyle='#644526';c.fillRect(x-5,y-30,10,34);
    c.fillStyle='#ab773e';c.fillRect(x-3,y-28,6,30);
    c.fillStyle='#e0b264';c.fillRect(x-3,y-28,3,28);c.fillRect(x-4,y-29,8,3);
    c.fillStyle='#80562f';c.fillRect(x+1,y-19,2,9);
  }
  function drawProp(c,p) {
    if(p.type==='nursery') {
      if(!FarmSprites.draw(c,'nursery',p.x,p.y,p.w,p.h,{grounded:true,shadow:true})) FarmSprites.draw(c,'coop',p.x+65,p.y,105,p.h,{grounded:true,shadow:true});
    } else if(p.type==='nursery-lip') {
      if(FarmSprites.cohesiveReady) {
        c.save();c.beginPath();c.rect(p.x,p.y+p.h-7,p.w,7);c.clip();
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
      if(p.w) {
        if(!FarmSprites.draw(c,'fence',p.x-4,p.y-35,p.w+8,39,{grounded:true,shadow:true})) {
          c.fillStyle='#b68b4d';c.fillRect(p.x,p.y-23,p.w,5);c.fillRect(p.x,p.y-10,p.w,5);
          post(c,p.x,p.y);post(c,p.x+p.w,p.y);
        }
      } else {
        if(typeof Sunlight!=='undefined')Sunlight.rail(c,p.x,p.y+4,p.x,p.y+p.h+4,30,4);
        c.fillStyle='#61492f';c.fillRect(p.x-3,p.y-22,6,p.h+16);
        c.fillStyle='#a77d41';c.fillRect(p.x-2,p.y-22,3,p.h+16);
        c.fillStyle='#d0a765';c.fillRect(p.x-3,p.y-22,2,p.h+16);
        post(c,p.x,p.y);post(c,p.x,p.y+p.h);
      }
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
  return { bounds,nursery,home,obstacles,props,drawProp,drawGround,ensureClear };
})();
