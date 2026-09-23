/* A seed only chooses the scenery once. Rendering never consumes random numbers. */
const FarmArt = (() => {
  const INK = "#695640", TAU = Math.PI * 2;
  const boundaryCache = new WeakMap(), propsCache = new WeakMap();
  const hash = (x, y = 0) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
  function ellipse(c, x, y, rx, ry, color, outline = false) {
    c.beginPath(); c.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, TAU);
    c.fillStyle = color; c.fill(); if (outline) { c.strokeStyle = INK; c.lineWidth = 2; c.stroke(); }
  }
  function rounded(c, x, y, w, h, r, color, outline = false) {
    c.beginPath(); c.roundRect(x, y, w, h, r); c.fillStyle = color; c.fill();
    if (outline) { c.strokeStyle = INK; c.lineWidth = 2.5; c.stroke(); }
  }
  function line(c, points, color, width = 2) {
    c.beginPath(); c.moveTo(points[0][0], points[0][1]);
    for (const p of points.slice(1)) c.lineTo(p[0], p[1]);
    c.strokeStyle = color; c.lineWidth = width; c.lineCap = "round"; c.lineJoin = "round"; c.stroke();
  }
  function polygon(c, points, color) {
    c.beginPath(); c.moveTo(points[0][0], points[0][1]);
    for (const p of points.slice(1)) c.lineTo(p[0], p[1]);
    c.closePath(); c.fillStyle = color; c.fill(); c.strokeStyle = INK; c.lineWidth = 2.5; c.stroke();
  }
  function visible(c, p, camera, margin = 160) {
    return p.x + (p.w || 0) > camera.x - margin && p.y + (p.h || 0) > camera.y - margin &&
      p.x < camera.x + c.canvas.width + margin && p.y < camera.y + c.canvas.height + margin;
  }
  function world(c, camera) { c.save(); c.translate(-camera.x + (camera.shakeX || 0), -camera.y + (camera.shakeY || 0)); }
  function patch(c, x, y, rx, ry, seed, color) {
    const pts = Array.from({ length: 16 }, (_, i) => {
      const a = i / 16 * TAU, size = .86 + hash(i, seed) * .16;
      return [x + Math.cos(a) * rx * size, y + Math.sin(a) * ry * size];
    });
    c.beginPath(); c.moveTo((pts[15][0] + pts[0][0]) / 2, (pts[15][1] + pts[0][1]) / 2);
    for (let i = 0; i < pts.length; i++) {
      const next = pts[(i + 1) % pts.length];
      c.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + next[0]) / 2, (pts[i][1] + next[1]) / 2);
    }
    c.closePath(); c.fillStyle = color; c.fill();
  }
  function ground(c,paint) {
    if(typeof Sunlight==='undefined'||!Sunlight.ground(c,paint)){c.save();try{paint(c);}finally{c.restore();}}
  }
  function gardenPlant(c,d) {
    const type=(d.variant||0)%4,n=hash(d.x,d.y);
    c.save();c.translate(Math.round(d.x),Math.round(d.y));
    // Broad shapes, warm outlines and a few highlights match the animal sprites.
    // Growth varies without shifting roots or changing the saved planting grid.
    const growth=.86+n*.14;c.scale(n>.5?-growth:growth,growth);
    c.lineJoin='round';c.lineCap='round';
    const oval=(x,y,rx,ry,color,outline=true)=>{
      c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=color;c.fill();
      if(outline){c.strokeStyle='#382919';c.lineWidth=1.8;c.stroke();}
    };
    const stroke=(pts,color,width=1.5)=>line(c,pts,color,width);
    const leaf=(x,y,dx,dy,color)=>{
      c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+dx-dy*.38,y+dy+dx*.38,x+dx,y+dy);
      c.quadraticCurveTo(x+dx+dy*.38,y+dy-dx*.38,x,y);
      c.fillStyle=color;c.fill();c.strokeStyle='#382919';c.lineWidth=1.6;c.stroke();
      stroke([[x,y],[x+dx*.65,y+dy*.65]],'#a8c459',1);
    };
    if(d.sprout) {
      ground(c,out=>line(out,[[-4,1],[4,1]],'#49332155',2));stroke([[0,0],[0,-9]],'#426529',2);
      leaf(0,-5,-8,-7,'#7fa638');leaf(0,-7,8,-6,'#adc650');c.restore();return;
    }
    if(type===0) {
      ground(c,out=>line(out,[[-8,2],[8,2]],'#49332155',2));
      oval(-7,-4,6,5,'#588430');oval(7,-4,6,5,'#6d9834');oval(0,-8,9,8,'#94b742');
      leaf(-4,-3,-7,-7,'#8eaf41');leaf(4,-3,7,-7,'#a3bd46');
      oval(0,-8,5.5,5,'#b9cf63');
      stroke([[-3,-11],[1,-12],[3,-9],[0,-7],[-2,-8]],'#78963b',1.5);
      stroke([[-5,-12],[-2,-14],[2,-13]],'#e0e8a0',1.5);
    } else if(type===1) {
      ground(c,out=>line(out,[[-7,2],[7,2]],'#49332155',2));
      for(const [x,y] of [[-5,-1],[5,0]]) {
        oval(x,y-2,4,4,'#ed9636');oval(x-1,y-3,1.4,2,'#ffd479',false);
        stroke([[x,y-5],[x+1,y-20]],'#382919',3);
        for(const [dx,dy,color]of [[-8,-12,'#70a137'],[7,-17,'#86b33c'],[-4,-23,'#a4c64d']])leaf(x,y-5,dx,dy,color);
      }
    } else if(type===2) {
      ground(c,out=>line(out,[[-9,2],[9,2]],'#49332155',2));
      leaf(-2,-11,-12,-6,'#78a038');
      oval(0,-8,12,10,'#e28b30');oval(-6,-8,4,8,'#f4a539',false);oval(0,-8,4.5,9,'#ffbe4d',false);
      for(const side of [-1,1]) {
        c.beginPath();c.moveTo(side*3,-16);c.quadraticCurveTo(side*7,-7,side*3,0);
        c.strokeStyle='#ac5727';c.lineWidth=1.4;c.stroke();
      }
      stroke([[0,-17],[1,-22],[4,-23]],'#382919',4);stroke([[0,-18],[1,-21],[3,-22]],'#78943b',2);
      stroke([[-7,-12],[-5,-14],[-3,-14]],'#ffe19a',2);
    } else {
      ground(c,out=>line(out,[[-4,2],[5,2]],'#49332155',2));
      stroke([[3,0],[3,-31]],'#382919',4);stroke([[3,-1],[3,-30]],'#b28348',2);
      stroke([[0,0],[-1,-25]],'#42632c',3);
      for(const [x,y,dx,dy]of [[-1,-8,-10,-7],[-1,-16,10,-7],[-1,-22,-8,-6]])leaf(x,y,dx,dy,'#79a139');
      for(const [x,y]of [[-6,-10],[6,-15],[-2,-23]]) {
        oval(x,y,4.5,4.5,'#ec5633');oval(x-1.3,y-1.4,1.2,1.3,'#ffd28b',false);
        stroke([[x-3,y-4],[x,y-3],[x+2,y-5]],'#52752b',1.6);
      }
    }
    c.restore();
  }
  function gardenBed(c,plot) {
    const {x,y,w,h}=plot;
    // Soil mounds separated by open walking strips, instead of a giant tan board.
    c.save();c.lineJoin='round';
    c.fillStyle='#75874a';c.fillRect(x+3,y+3,w-6,h-6);
    for(let row=0,yy=y+24;yy<=y+h-16;yy+=40,row++) {
      const top=yy-16,left=x+6,width=w-12;
      c.fillStyle='#33432630';c.fillRect(left+3,yy+12,width-6,2);
      c.beginPath();c.roundRect(left,top,width,29,6);c.fillStyle='#9b6f42';c.fill();
      c.strokeStyle='#513920';c.lineWidth=2;c.stroke();
      c.beginPath();c.roundRect(left+3,top+3,width-6,22,4);c.fillStyle='#ab8150';c.fill();
      c.fillStyle='#bf975f';c.fillRect(left+7,top+3,width-14,2);
      for(let xx=left+11;xx<left+width-8;xx+=18) {
        const n=hash(xx,yy);c.fillStyle=n>.5?'#89613c':'#c39a62';
        c.fillRect(xx,yy+6+Math.floor(n*3),3,1);
      }
      // A few short end boards hold the earth; no repeated fence around every row.
      for(const xx of [left,left+width-4]) {
        c.fillStyle='#513920';c.fillRect(xx,top+3,4,24);
        c.fillStyle='#c19350';c.fillRect(xx+1,top+4,2,20);
        c.fillStyle='#ead095';c.fillRect(xx+1,top+4,2,2);
      }
    }
    c.restore();
  }
  const cropCache=new WeakMap();
  function getCrops(layout) {
    if(cropCache.has(layout))return cropCache.get(layout);
    const plots=new Map((layout.plots||[]).filter(p=>p.kind==='garden').map(p=>[p.id,p]));
    const crops=(layout.decorations||[]).filter(d=>d.type==='crop').map(d=>{
      const p=plots.get(d.plotId),row=p?Math.round((d.y-p.y-24)/40):d.variant||0;
      return {...d,variant:(row+(p?Math.floor(hash(p.x,p.y)*4):0))%4,
        sprout:hash(d.x+17,d.y)<.12,depth:d.y+2};
    });cropCache.set(layout,crops);return crops;
  }
  function decoration(c, d) {
    const x = d.x, y = d.y, n = hash(x, y), s = d.scale || .8 + n * .5;
    if(d.type==='crop'){gardenPlant(c,d);return;}
    if(d.type==='reeds') {
      for(let i=-1;i<=1;i++) {
        const height=16+Math.floor(hash(x+i,y)*12);
        c.fillStyle='#527142';c.fillRect(x+i*4,y-height,2,height);
        c.fillStyle='#795531';c.fillRect(x+i*4-1,y-height-5,4,9);
        c.fillStyle='#99a453';c.fillRect(x+i*4+2,y-9,3,2);
      }return;
    }
    if(FarmSprites.ready) {
      const px=(dx,dy,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x+dx*s),Math.round(y+dy*s),Math.max(1,Math.round(w*s)),Math.max(1,Math.round(h*s)));};
      if(d.type==='flower'||d.type==='sunflower') {
        const tall=d.type==='sunflower',top=tall?-20:-9,r=tall?3:2;
        px(0,top+3,2,-top,'#3e6c35');px(-4,top/2,4,2,'#65933e');
        const color=tall?'#f2c84b':['#f1e6b0','#e5acc1','#bcb3d6','#eace64'][Math.floor(n*4)];
        for(const [dx,dy] of [[-r,0],[r,0],[0,-r],[0,r]])px(dx-r,top+dy-r,r*2,r*2,color);
        px(-r/2,top-r/2,r+1,r+1,tall?'#795631':'#d79e45');return;
      }
      if(d.type==='wheat') {
        for(const k of [-1,0,1]) {
          const t=-14-Math.floor(hash(x,k)*8);px(k*4,t,2,-t,'#af8b3b');
          for(let j=0;j<3;j++){px(k*4-3,t+j*4,3,2,'#e1b64c');px(k*4+1,t+j*4+2,3,2,'#edcc70');}
        }return;
      }
      if(d.type==='stone'||d.type==='rock') {
        px(-5,-1,10,5,'#727c5c');px(-4,-3,8,5,'#a5aa84');px(-2,-4,5,2,'#c3c2a0');return;
      }
      px(-3,-4,2,5,'#4d7936');px(0,-7,2,8,'#74994a');px(3,-3,3,2,'#8fab5a');return;
    }
    if (d.type === "stone" || d.type === "rock") {
      ellipse(c, x + 1, y + 3, 7 * s, 3 * s, "#65865335");
      ellipse(c, x, y, 6 * s, 4 * s, "#b8b9a0");
      line(c, [[x - 3 * s, y - s], [x + s, y - 2 * s]], "#e6e0c0", 2);
    } else if (d.type === "flower" || d.type === "sunflower") {
      const tall = d.type === "sunflower", h = tall ? 23 * s : 10 * s;
      line(c, [[x, y], [x + 2, y - h]], "#638a43", 2);
      ellipse(c, x - 3 * s, y - h * .4, 4 * s, 2 * s, "#789d4d");
      const color = tall ? "#f2cd62" : ["#f9edb6", "#e7adc4", "#c7b4df", "#f7d779"][Math.floor(n * 4)];
      for (let i = 0; i < 5; i++) ellipse(c, x + 2 + Math.cos(i * TAU / 5) * (tall ? 5 : 3) * s,
        y - h + Math.sin(i * TAU / 5) * (tall ? 5 : 3) * s, (tall ? 4 : 2.8) * s, (tall ? 4 : 2.8) * s, color);
      ellipse(c, x + 2, y - h, (tall ? 3.5 : 1.8) * s, (tall ? 3.5 : 1.8) * s, tall ? "#82653c" : "#c19446");
    } else if (d.type === "clover") {
      for (const [dx, dy] of [[-3, 0], [3, 0], [0, -4]]) ellipse(c, x + dx * s, y + dy * s, 3.5 * s, 2.5 * s, "#76a853");
    } else if (d.type === "wheat") {
      for (let k = -1; k <= 1; k++) {
        const top = y - (15 + hash(x, k) * 8) * s, xx = x + k * 4 * s;
        line(c, [[x, y], [xx, top]], "#aa9149", 1.5);
        for (let j = 0; j < 3; j++) {
          line(c, [[xx, top + j * 4], [xx - 3, top + j * 4 - 3]], "#e3c966", 2.8);
          line(c, [[xx, top + j * 4], [xx + 3, top + j * 4 - 3]], "#efd988", 2.8);
        }
      }
    } else {
      line(c, [[x - 4 * s, y - 4 * s], [x, y], [x + s, y - 8 * s]], "#76a353", 1.7);
      line(c, [[x + 3 * s, y], [x + 7 * s, y - 5 * s]], "#9dbc69", 1.7);
    }
  }
  function pond(c, p) {
    const x = p.x + p.w / 2, y = p.y + p.h / 2;
    patch(c, x, y + 7, p.w * .55, p.h * .57, 51, "#78945b");
    patch(c, x, y + 3, p.w * .53, p.h * .54, 51, "#d5c797");
    patch(c, x, y, p.w / 2, p.h / 2, 51, "#82c2b5");
    patch(c, x - 2, y, p.w * .42, p.h * .40, 51, "#56aaa8");
    patch(c, x + 4, y + 3, p.w * .32, p.h * .29, 51, "#429599");
    for (let i = 0; i < 7; i++) {
      const xx = x + (hash(i, p.x) - .5) * p.w * 1.2, yy = y + (hash(i, p.y) - .5) * p.h * .95;
      line(c, [[xx - 7, yy], [xx + 11 + i * 2, yy]], "#c9e5ca80", 2);
    }
    for (const [dx, dy] of [[-.27,.17],[.29,-.12],[.23,.27]]) {
      ellipse(c, x + p.w * dx, y + p.h * dy, 11, 6, "#5b9a67");
      line(c, [[x + p.w * dx, y + p.h * dy], [x + p.w * dx + 8, y + p.h * dy + 2]], "#9cbd80", 1.5);
    }
    for (let i = 0; i < 8; i++) {
      const a = i * .32 + .24, xx = x + Math.cos(a) * p.w * .49, yy = y + Math.sin(a) * p.h * .48;
      line(c, [[xx - 4, yy - 9], [xx, yy], [xx + 5, yy - 15]], "#62834e", 2);
    }
  }
  function drawGround(c, layout, camera, game) {
    c.fillStyle = "#83a952"; c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    const textured = FarmTerrain.draw(c,layout,camera);
    world(c, camera);
    if (!textured) {
    const colors = { poleiro: "#9fb866", granja: "#c1b563", estabulo: "#b5a16a", horta: "#6e994e", quintal: "#79a666" };
    for (const a of layout.areas || []) {
      if (!visible(c, a, camera, 80)) continue;
      patch(c, a.x + a.w * .5, a.y + a.h * .5, a.w * .6, a.h * .58, a.x, colors[a.id] || "#a0b86f");
      for (let i = 0; i < 4; i++) patch(c, a.x + a.w * hash(i, a.y), a.y + a.h * hash(i + 2, a.x),
        55 + hash(i, a.x) * 95, 35 + hash(a.x, i) * 45, i + a.x, "#d8ce7d18");
    }
    for (const p of layout.paths || []) {
      if (!visible(c, p, camera)) continue;
      rounded(c, p.x - 6, p.y - 6, p.w + 12, p.h + 12, Math.min(p.w, p.h) / 2 + 6, "#92a666");
    }
    for (const p of layout.paths || []) {
      if (!visible(c, p, camera)) continue;
      rounded(c, p.x, p.y, p.w, p.h, Math.min(p.w, p.h) / 2, "#d8c394");
    }
    // Paint the road interiors together so connected segments do not leave seams.
    for (const p of layout.paths || []) {
      if (!visible(c, p, camera)) continue;
      rounded(c, p.x + 7, p.y + 7, Math.max(1,p.w - 14), Math.max(1,p.h - 14), Math.max(1,Math.min(p.w, p.h) / 2 - 7), "#e2cea0");
      const horizontal = p.w > p.h, length = horizontal ? p.w : p.h;
      // Cart ruts make the lanes feel travelled, with broken wheel tracks.
      for (let t = 28; t < length - 28; t += 53) for (const offset of [-17,17]) {
        const cx = p.x + p.w/2, cy = p.y + p.h/2;
        line(c, horizontal ? [[p.x+t,cy+offset],[Math.min(p.x+t+30,p.x+p.w-20),cy+offset]] :
          [[cx+offset,p.y+t],[cx+offset,Math.min(p.y+t+30,p.y+p.h-20)]], "#b99b6848", 2.5);
      }
      for (let i = 35; i < length - 20; i += 91) {
        const jitter = hash(i, p.x + p.y), xx = p.x + (horizontal ? i : 13 + jitter * (p.w - 26)),
          yy = p.y + (horizontal ? 13 + jitter * (p.h - 26) : i);
        ellipse(c, xx, yy, 2.5, 1.2, "#c4ac7f"); ellipse(c, xx + 9, yy + 4, 1.5, 1, "#f2dfb5");
      }
    }
    }
    if(!textured)for(const p of [...layout.lanes||[],...layout.clearings||[]])if(visible(c,p,camera))
      rounded(c,p.x,p.y,p.w,p.h,Math.min(p.w,p.h)/2,'#bd975f');
    // Walkable grazing, dust baths and shallow drinking pools give the outlying
    // meadows a purpose. Jagged pixel edges match the ground tiles.
    for(const h of layout.habitats||[]) {
      if(!visible(c,{x:h.x-155,y:h.y-90,w:310,h:180},camera))continue;
      const water=h.kind==='water',mud=h.kind==='mud';
      for(let dy=-64;dy<=64;dy+=4)for(let dx=-108;dx<=108;dx+=4) {
        const n=hash(h.x+dx,h.y+dy),edge=(dx/108)**2+(dy/64)**2;
        if(edge>1+n*.16)continue;
        const base=water?[112,162,152]:mud?[142,122,86]:[130,154,85];
        const shade=Math.round((n-.5)*5),alpha=water?.92:Math.min(.8,Math.max(.08,(1.12-edge)*2.5));
        c.fillStyle=`rgba(${base[0]+shade},${base[1]+shade},${base[2]+shade},${alpha})`;
        c.fillRect(h.x+dx,h.y+dy,4,4);
      }
      if(water)for(let i=0;i<7;i++) {
        const x=h.x-70+hash(i,h.x)*140,y=h.y-30+hash(i,h.y)*60;
        c.fillStyle='#cae0c7';c.fillRect(Math.round(x),Math.round(y),8+i%3*4,2);
      }
      else if(!mud)for(let i=0;i<10;i++) {
        const x=Math.round(h.x-88+hash(i,h.x)*176),y=Math.round(h.y-42+hash(i,h.y)*84);
        c.fillStyle='#6f8749';c.fillRect(x,y,2,5);c.fillRect(x-3,y-2,2,4);
        c.fillStyle='#a5b574';c.fillRect(x+2,y-3,2,5);
      }
      if(!water&&h.water) {
        const x=h.water.x,y=h.water.y;
        for(let dy=-12;dy<=12;dy+=3)for(let dx=-23;dx<=23;dx+=3) {
          const edge=(dx/23)**2+(dy/12)**2;
          if(edge>1)continue;
          c.fillStyle=edge>.68?'#aba178':hash(x+dx,y+dy)>.5?'#88aaa0':'#6d9589';
          c.fillRect(x+dx,y+dy,3,3);
        }
        c.fillStyle='#bdd3b7';c.fillRect(x-8,y-3,12,2);c.fillRect(x+4,y+4,7,2);
      }
    }
    const structures = layout.structures || {};
    SunflowerSystem.drawGround(c,layout);
    if (structures.pond && visible(c, structures.pond, camera)) pond(c, structures.pond);
    for (const plot of layout.plots || []) {
      if (!visible(c,plot,camera)) continue;
      if(plot.kind==='garden'){gardenBed(c,plot);continue;}
      if(plot.kind==='corn'){FarmDetails.drawRows(c,plot);continue;}
      const {x,y,w,h}=plot, pasture=plot.kind==='pasture';
      c.fillStyle=pasture?'#879451':'#896b48'; c.fillRect(x,y,w,h);
      c.fillStyle=pasture?'#909b5c':'#94744f'; c.fillRect(x+2,y+2,w-4,h-4);
      for(let yy=y+5;yy<y+h-4;yy+=4)for(let xx=x+5;xx<x+w-4;xx+=4) {
        const n=hash(xx,yy);
        if(n<.06){c.fillStyle=pasture?'#849154':'#8b6d4a';c.fillRect(xx,yy,3,2);}
        else if(n>.97){c.fillStyle=pasture?'#a0aa70':'#a18058';c.fillRect(xx,yy,2,2);}
      }
      if(!pasture) for(let yy=y+24;yy<=y+h-16;yy+=40) {
        c.fillStyle='#7c6141';c.fillRect(x+10,yy+3,w-20,2);
        c.fillStyle='#a4865b';c.fillRect(x+10,yy+5,w-20,1);
      }
    }
    const beds = new Map();
    for (const d of layout.decorations || []) {
      if (d.type !== "crop" || d.plotId || !visible(c,d,camera,90)) continue;
      if (!beds.has(d.y)) beds.set(d.y,[]);
      beds.get(d.y).push(d.x);
    }
    for (const [y,xs] of beds) {
      xs.sort((a,b)=>a-b);
      let start=xs[0],last=start;
      for(let i=1;i<=xs.length;i++) {
        if(i===xs.length || xs[i]-last>36) {
          rounded(c,start-14,y-8,last-start+28,21,10,"#a98b5c");
          line(c,[[start-5,y+8],[last+5,y+8]],"#c1a273",2);
          start=xs[i];
        }
        last=xs[i];
      }
    }
    for (const d of layout.decorations || []) {
      if (d.type === 'fence' || d.type === 'corn' || !FarmScenery.showDecoration(d,layout) || !visible(c,d,camera,35)) continue;
      if(d.type==='crop')continue;
      // Wheat belongs to the field, not to the livestock yard.
      if (d.type === 'wheat' || d.type === 'sunflower') {
        const field=(layout.areas||[]).find(a=>a.id==='granja');
        if(!field||d.x<field.x||d.x>field.x+field.w||d.y<field.y||d.y>field.y+field.h)continue;
      }
      c.save();
      if(game) EnvironmentSystem.transform(c,d,game);
      decoration(c,d.plotId ? {...d,scale:1} : d);
      c.restore();
    }
    // Standalone ground previews still include crops; live play sorts them with actors.
    if(!game)for(const crop of getCrops(layout))if(visible(c,crop,camera,35))gardenPlant(c,crop);
    // Live fences sort with actors so the front rails cover their feet.
    if(!game)for(const p of boundaryProps(layout))if(visible(c,p,camera,40))drawBoundary(c,p);
    c.restore();
  }
  function fence(c, x, y, w) {
    if(FenceArt.drawHorizontal(c,x,y,w,{postStart:true,postEnd:true}))return;
    if(FarmSprites.draw(c,'fence',x-4,y-36,w+8,40,{grounded:true,shadow:true}))return;
    line(c, [[x, y - 14], [x + w, y - 14]], "#b59a6d", 6);
    line(c, [[x, y - 5], [x + w, y - 5]], "#ceb385", 5);
    rounded(c, x - 4, y - 24, 8, 27, 2, "#e4ca94", true);
  }
  // The world border has its own fence kit. Horizontal and vertical sides are
  // deliberately the same construction rotated 90 degrees, so the map reads
  // as one continuous enclosure instead of a wood fence plus bamboo side bars.
  const boundaryFenceStyle=Object.freeze({
    shadow:'#26332330',edge:'#5b3a24',dark:'#74482a',base:'#9c6338',
    light:'#c4894f',top:'#dea967',knot:'#604027',bolt:'#66737a',boltLight:'#c6d0d3'
  });
  function boundaryBolt(c,x,y) {
    x=Math.round(x);y=Math.round(y);
    c.fillStyle=boundaryFenceStyle.bolt;c.fillRect(x,y,3,3);
    c.fillStyle=boundaryFenceStyle.boltLight;c.fillRect(x,y,1,1);
  }
  function boundaryPost(c,x,y) {
    x=Math.round(x);y=Math.round(y);
    c.fillStyle=boundaryFenceStyle.shadow;c.fillRect(x-7,y+3,14,2);
    c.fillStyle=boundaryFenceStyle.edge;c.fillRect(x-6,y-31,12,35);
    c.fillStyle=boundaryFenceStyle.dark;c.fillRect(x-4,y-29,8,32);
    c.fillStyle=boundaryFenceStyle.base;c.fillRect(x-3,y-28,6,30);
    c.fillStyle=boundaryFenceStyle.light;c.fillRect(x-3,y-28,2,28);
    c.fillStyle=boundaryFenceStyle.top;c.fillRect(x-5,y-31,10,4);
    c.fillStyle=boundaryFenceStyle.knot;c.fillRect(x+1,y-19,2,8);
    boundaryBolt(c,x-1,y-22);boundaryBolt(c,x-1,y-11);
  }
  function boundaryRailH(c,x,y,w) {
    x=Math.round(x);y=Math.round(y);w=Math.max(1,Math.round(w));
    c.fillStyle=boundaryFenceStyle.edge;c.fillRect(x,y,w,6);
    c.fillStyle=boundaryFenceStyle.dark;c.fillRect(x+1,y+1,Math.max(1,w-2),4);
    c.fillStyle=boundaryFenceStyle.base;c.fillRect(x+1,y+1,Math.max(1,w-2),3);
    c.fillStyle=boundaryFenceStyle.light;c.fillRect(x+2,y+1,Math.max(1,w-4),1);
  }
  function boundaryRailV(c,x,y,h) {
    x=Math.round(x);y=Math.round(y);h=Math.max(1,Math.round(h));
    c.fillStyle=boundaryFenceStyle.edge;c.fillRect(x,y,6,h);
    c.fillStyle=boundaryFenceStyle.dark;c.fillRect(x+1,y+1,4,Math.max(1,h-2));
    c.fillStyle=boundaryFenceStyle.base;c.fillRect(x+1,y+1,3,Math.max(1,h-2));
    c.fillStyle=boundaryFenceStyle.light;c.fillRect(x+1,y+2,1,Math.max(1,h-4));
  }
  function boundaryFenceHorizontal(c,x,y,w) {
    const left=Math.round(x),right=Math.round(x+w),mid=Math.round((left+right)/2);
    if(typeof Sunlight!=='undefined')Sunlight.rail(c,left,y+4,right,y+4,30,4);
    boundaryRailH(c,left,y-24,right-left);
    boundaryRailH(c,left,y-11,right-left);
    boundaryPost(c,left,y);boundaryPost(c,mid,y);boundaryPost(c,right,y);
  }
  function boundaryFenceVertical(c,x,y,h,postStart=true,postEnd=false) {
    const top=Math.round(y),bottom=Math.round(y+h),length=Math.max(1,bottom-top);
    if(typeof Sunlight!=='undefined')Sunlight.rail(c,x,top+4,x,bottom+4,30,4);
    // A vertical run is two straight rails behind upright posts. Rails stop at
    // the segment joints; posts cover those joints, so there are no tan "rungs".
    boundaryRailV(c,x-9,top,length);
    boundaryRailV(c,x+4,top,length);
    if(postStart)boundaryPost(c,x,top);
    if(postEnd)boundaryPost(c,x,bottom);
  }
  function boundaryLines(layout) {
    return {left:23,right:layout.width-23,top:28,bottom:layout.height-23};
  }
  function playableBounds(layout) {
    const b=boundaryLines(layout);
    return {x:b.left+4,y:b.top+4,w:b.right-b.left-8,h:b.bottom-b.top-7};
  }
  function boundaryObstacles(layout) {
    const b=playableBounds(layout),right=b.x+b.w,bottom=b.y+b.h;
    // Fill the outside strip, rather than leaving a walkable gap beyond the rails.
    return [
      {x:0,y:0,w:b.x,h:layout.height},
      {x:right,y:0,w:layout.width-right,h:layout.height},
      {x:0,y:0,w:layout.width,h:b.y},
      {x:0,y:bottom,w:layout.width,h:layout.height-bottom},
    ].map(p=>({...p,type:'boundary-fence',opaque:false}));
  }
  function boundaryProps(layout) {
    if(boundaryCache.has(layout))return boundaryCache.get(layout);
    const b=boundaryLines(layout),result=[],span=64;
    // Matching cadence on all four sides gives corners and posts the same rhythm.
    for(let x=b.left;x<b.right;x+=span)for(const y of [b.top,b.bottom])
      result.push({x,y,w:Math.min(span,b.right-x),h:0,depth:y+4,type:'boundary-fence',id:`boundary-h-${x}-${y}`});
    for(let y=b.top;y<b.bottom;y+=span)for(const x of [b.left,b.right]) {
      const h=Math.min(span,b.bottom-y);
      result.push({x,y,w:0,h,postStart:true,postEnd:y+h>=b.bottom,
        depth:y+h+4,type:'boundary-fence',id:`boundary-v-${x}-${y}`});
    }
    boundaryCache.set(layout,result);
    return result;
  }
  function drawBoundary(c,p) {
    if(p.w) {
      if(!FenceArt.drawHorizontal(c,p.x,p.y,p.w,{postStart:true,postEnd:true}))
        boundaryFenceHorizontal(c,p.x,p.y,p.w);
    } else if(!FenceArt.drawVertical(c,p.x,p.y,p.h,{postStart:p.postStart!==false,postEnd:!!p.postEnd}))
      boundaryFenceVertical(c,p.x,p.y,p.h,p.postStart,p.postEnd);
  }
  function getProps(layout) {
    if(propsCache.has(layout))return propsCache.get(layout);
    const s = layout.structures || {}, result = [];
    for (const [key, type] of [["coops","coop"],["silos","silo"],["hayBales","hay"]])
      for (const [i, p] of (s[key] || []).entries()) result.push({ ...p, type, id: p.id || `${type}-${i}`, depth: p.y + p.h });
    if (s.barn) result.push({ ...s.barn, type: "barn", id: "barn", depth: s.barn.y + s.barn.h });
    for (const p of layout.vegetation || []) result.push({ ...p, depth: p.blockingRect ? p.blockingRect.y + p.blockingRect.h : p.y + p.h * .68 });
    for(const [key,type] of [['stables','stable'],['troughs','trough'],['paddockFences','paddock-fence']])
      for(const [i,p] of (s[key]||[]).entries()) {
        if(type==='paddock-fence'&&p.h>p.w) {
          for(let y=p.y;y<p.y+p.h;y+=32)result.push({...p,y,h:Math.min(32,p.y+p.h-y),type,id:`${type}-${i}-${y}`,depth:y+32});
        } else result.push({...p,type,id:`${type}-${i}`,depth:p.y+p.h});
      }
    for(const d of layout.decorations||[])if(d.type==='corn')
      result.push({...d,w:28,h:1,depth:d.y+3,id:`corn-${d.x}-${d.y}`});
    // Old generators scatter short decorative rails around district rectangles.
    // They enclose nothing and have no collisions. Keep only the actual refuge and world boundary fences.
    const decorated=FarmDetails.decorate(layout, result.concat(FarmRefuge.props(),SunflowerSystem.props(layout))).concat(boundaryProps(layout));
    propsCache.set(layout,decorated);
    return decorated;
  }
  function signObstacles(layout) {
    if(!layout)return [];
    return getProps(layout).filter(p=>p.type==='sign'||p.type==='sunflower-sign').map(p=>({
      x:p.x,y:p.y,w:p.w,h:p.h||49,type:'sign',id:p.id,opaque:false
    }));
  }

  function corn(c,p) {
    const height=48+(p.variant===1?6:0),bend=(hash(p.x,p.y)-.5)*4;
    c.save();c.translate(Math.round(p.x),Math.round(p.y));c.lineJoin='round';c.lineCap='round';
    ground(c,out=>{out.fillStyle='#33442650';out.fillRect(-3,0,7,2);});
    line(c,[[0,0],[bend,-height]],'#382919',4);line(c,[[0,-1],[bend,-height]],'#8bb442',2);
    for(const [level,side]of [[12,-1],[20,1],[31,-1],[39,1]]) {
      const tip=side*(level<30?15:12),top=-level-11;
      c.beginPath();c.moveTo(0,-level+5);c.quadraticCurveTo(tip*.4,top-4,tip,top);
      c.quadraticCurveTo(tip*.8,-level,0,-level+5);c.fillStyle=side<0?'#72a136':'#93b940';c.fill();
      c.strokeStyle='#382919';c.lineWidth=1.5;c.stroke();
      line(c,[[0,-level+3],[tip*.72,top+2]],'#c0d56c',1);
    }
    const side=p.variant===2?-1:1;
    c.save();c.translate(side*5,-23);c.rotate(side*.25);
    c.beginPath();c.ellipse(0,0,4.5,10,0,0,TAU);c.fillStyle='#f6bd44';c.fill();c.strokeStyle='#473019';c.lineWidth=1.7;c.stroke();
    line(c,[[-1,-7],[-1,5]],'#ffe59a',2);
    for(const y of [-5,-1,3])line(c,[[1,y],[3,y]],'#c88c2f',1);
    c.beginPath();c.moveTo(-5,0);c.quadraticCurveTo(-6,8,0,12);c.quadraticCurveTo(6,8,5,0);
    c.lineTo(0,7);c.closePath();c.fillStyle='#80a63a';c.fill();c.strokeStyle='#3b4724';c.stroke();c.restore();
    for(const [dx,dy]of [[-6,-4],[0,-9],[6,-5]]) {
      line(c,[[bend,-height+3],[bend+dx,-height+dy]],'#80632e',2.5);
      line(c,[[bend+dx,-height+dy],[bend+dx,-height+dy-3]],'#ebcf75',2);
    }
    c.restore();
  }

  function paddockFence(c,p) {
    if(p.w>p.h) {
      const count=Math.ceil(p.w/70),span=p.w/count;
      for(let i=0;i<count;i++) fence(c,p.x+i*span,p.y,span);
      return;
    }
    verticalFence(c,p.x+4,p.y,p.h);
  }

  function verticalFence(c,x,y,height) {
    if(FenceArt.drawVertical(c,x,y,height,{postStart:true,postEnd:true}))return;
    if(typeof Sunlight!=='undefined')Sunlight.rail(c,x,y+4,x,y+height+4,30,4);
    x=Math.round(x);y=Math.round(y);height=Math.ceil(height);
    c.fillStyle='#57482f';c.fillRect(x-3,y-23,7,height+3);
    c.fillStyle='#b58a4c';c.fillRect(x-2,y-22,3,height+2);
    c.fillStyle='#e0b263';c.fillRect(x-3,y-22,2,height+2);
    for(const base of [y,y+height]) {
      c.fillStyle='#26332330';c.fillRect(x-6,base+3,12,2);
      c.fillStyle='#644526';c.fillRect(x-5,base-30,10,34);
      c.fillStyle='#ab773e';c.fillRect(x-3,base-28,6,30);
      c.fillStyle='#e0b264';c.fillRect(x-3,base-28,3,28);c.fillRect(x-4,base-29,8,3);
    }
  }

  function building(c, p, barn) {
    const {x,y,w,h} = p, roof = h * .36, wallY = y + h * .14, wallH = h * .86;
    const stable = p.areaId === "estabulo";
    c.fillStyle='#26332330';c.fillRect(x,y+h-1,w,3);
    rounded(c, x, wallY, w, wallH, 4, barn ? "#b54e38" : stable ? "#947049" : "#deb169", true);
    rounded(c, x + w * .80, wallY + 2, w * .18, wallH - 3, 2, barn ? "#a25143" : "#c19058");
    for (let xx = x + 14; xx < x + w - 5; xx += 18) line(c, [[xx,wallY+5],[xx,y+h-4]], barn ? "#995246" : "#bd8a53", 1.5);
    polygon(c, [[x - 12,wallY+3],[x + w * .5,y-roof],[x+w+12,wallY+3]], barn ? "#775744" : "#9b6147");
    line(c, [[x-7,wallY+1],[x+w*.5,y-roof+6],[x+w+7,wallY+1]], "#c99265", 4);
    for (let j = 1; j < 4; j++) {
      const yy = y - roof + j * (wallY - y + roof) / 4, half = j * w / 8;
      line(c, [[x+w*.5-half,yy],[x+w*.5+half,yy]], "#a77150", 1.5);
    }
    const dw = w * (barn ? .43 : .34), dh = h * .66, dx = x + w * .5 - dw / 2, dy = y + h - dh;
    rounded(c, dx, dy, dw, dh, 2, barn ? "#804c3d" : "#654d38", true);
    c.strokeStyle = "#efdbb1"; c.lineWidth = 4; c.strokeRect(dx+2,dy+2,dw-4,dh-3);
    line(c, [[dx+4,dy+5],[dx+dw-4,dy+dh-5]], "#efdbb1", 3);
    if (barn) { line(c, [[dx+dw-4,dy+5],[dx+4,dy+dh-5]], "#efdbb1", 3); line(c, [[dx+dw/2,dy],[dx+dw/2,dy+dh]], "#efdbb1", 3); }
    else {
      rounded(c, x + w * .09, wallY + 16, w * .2, h * .24, 2, "#7a8e87", true);
      line(c, [[x+w*.19,wallY+17],[x+w*.19,wallY+16+h*.24]], "#f6e4b7", 2);
      polygon(c, [[dx, y+h],[dx+dw,y+h],[dx+dw+12,y+h+15],[dx-12,y+h+15]], "#c7a77b");
    }
    line(c, [[x+3,y+h-1],[x+w-3,y+h-1]], "#ecd3a1", 4);
    if (barn) { rounded(c,x+w*.5-15,y-10,30,22,3,"#e9ce99",true); ellipse(c,x+w*.5,y+1,6,7,"#796340"); }
    if (barn || p.areaId === "poleiro") {
      line(c,[[x+5,wallY+4],[x+w*.5,wallY+12],[x+w-5,wallY+4]],"#705135",1.5);
      for(let i=0;i<7;i++) {
        const xx=x+10+i*(w-20)/7, yy=wallY+5+Math.sin(i/7*Math.PI)*6;
        polygon(c,[[xx,yy],[xx+12,yy+1],[xx+6,yy+15]],["#c3533e","#e9c752","#568577"][i%3]);
      }
    }
    if (stable) {
      c.beginPath(); c.arc(x+w*.5,y+2,11,0,Math.PI); c.strokeStyle="#f1d99c"; c.lineWidth=4; c.stroke();
    }
    // Farm clutter stays against existing walls, inside their collision footprint.
    for(let i=0;i<2;i++) {
      const xx=x+w-22-i*17, yy=y+h-17;
      rounded(c,xx,yy,14,17,3,barn?"#a9bab4":"#b98348",true);
      ellipse(c,xx+7,yy,7,3,barn?"#d7dfd0":"#e5be72",true);
    }
  }
  function hay(c, p) {
    const {x,y,w,h} = p;
    c.fillStyle='#26332330';c.fillRect(x+5,y+h-1,w-10,3);
    rounded(c,x,y,w,h,Math.min(13,h*.3),"#d5ab51",true);
    rounded(c,x+3,y+3,w-6,h*.42,Math.min(10,h*.2),"#efd27a");
    for(let i=0;i<15;i++) {
      const xx=x+5+hash(i,p.x)*(w-10), yy=y+5+hash(i,p.y)*(h-10);
      line(c,[[xx,yy],[Math.min(x+w-5,xx+6),yy-2]],i%2?"#f1d98d":"#bf9443",1.4);
    }
    for(const f of [.25,.75]) line(c,[[x+w*f,y+3],[x+w*f-2,y+h-3]],"#987341",3);
    line(c,[[x+6,y+4],[x+w-7,y+4]],"#fae8a9",2);
  }
  function vegetation(c, p) {
    const {x,y,w,h}=p, cx=x+w*.5;
    if(p.type==="tree") {
      const trunk = p.blockingRect || {x:cx-9,y:y+4,w:18,h:22};
      c.fillStyle='#26332330';c.fillRect(trunk.x-1,trunk.y+trunk.h-1,trunk.w+2,3);
      rounded(c,trunk.x,trunk.y-32,trunk.w,trunk.h+32,5,"#927047",true);
      line(c,[[cx,trunk.y+8],[cx+3,trunk.y-28]],"#b69760",3);
      line(c,[[cx,trunk.y-8],[cx-19,trunk.y-30]],"#927047",8);
      const cy=y-26;
      for(const [dx,dy,r,color] of [[-27,0,32,"#64884a"],[26,0,36,"#63884a"],[0,-24,39,"#7b9c51"],[-17,-17,29,"#8cac5b"],[22,-24,28,"#90ad5e"]])
        ellipse(c,cx+dx,cy+dy,r,r*.84,color,true);
      for(let i=0;i<10;i++) {
        const xx=cx+(hash(i,x)-.5)*75, yy=cy-29+hash(i,y)*45;
        ellipse(c,xx,yy,4,2.5,"#b3c77770");
        if(i%3===0) { ellipse(c,xx+3,yy+10,4.5,4.5,p.areaId==="quintal"?"#60445c":p.areaId==="horta"?"#dab449":"#c66739"); ellipse(c,xx+2,yy+8,1.5,1.4,p.areaId==="quintal"?"#c698b0":"#f0b177"); }
      }
      for(let i=0;i<7;i++) decoration(c,{type:"grass",x:x+10+i*13,y:y+h*.64+hash(i,x)*12,scale:1.25});
    } else {
      for(const [dx,dy,r,color] of [[.22,.54,.25,"#527f47"],[.75,.5,.27,"#5b894a"],[.48,.36,.33,"#739a51"],[.28,.35,.22,"#8aac5b"],[.67,.32,.24,"#86a759"]])
        ellipse(c,x+w*dx,y+h*dy,w*r,h*r,color,true);
      for(let i=0;i<15;i++) {
        const xx=x+15+hash(i,x)*(w-30), yy=y+h*.25+hash(i,y)*h*.32;
        ellipse(c,xx,yy,4,2,"#b6ca7580");
        if(i%5===0) ellipse(c,xx+3,yy+4,3,3,"#d1a0b4");
      }
    }
  }
  function drawProp(c,p,camera,game) {
    if(!visible(c,p,camera,160)) return;
    world(c,camera);
    if(p.type==='crop') {
      if(game)EnvironmentSystem.transform(c,p,game);
      gardenPlant(c,p);c.restore();return;
    }
    if(p.type==='sunflower-bed'){c.restore();return;}
    if(p.type==='sunflower'){SunflowerSystem.drawPlant(c,p,game);c.restore();return;}
    if(p.type==='sunflower-sign'){FarmDetails.drawSign(c,p);c.restore();return;}
    if(p.type==='corn') {if(game)EnvironmentSystem.transform(c,p,game);corn(c,p);c.restore();return;}
    if(p.type==='paddock-fence') {paddockFence(c,p);c.restore();return;}
    if(p.type==='boundary-fence') {drawBoundary(c,p);c.restore();return;}
    if(p.type==='stable'||p.type==='trough') {
      const box=FarmDetails.shape(p);
      if(!FarmSprites.draw(c,p.type==='stable'?(FarmSprites.habitatsReady?'shelter':'barn'):'trough',box.x,box.y,box.w,box.h,{grounded:true,shadow:true,palette:0}))
        rounded(c,p.x,p.y,p.w,p.h,2,'#97734b',true);
      c.restore();return;
    }
    if(p.type.startsWith('refuge-')||p.type==='nursery'||p.type==='nursery-lip') {
      FarmRefuge.drawProp(c,p);c.restore();return;
    }
    if(FarmSprites.ready && ['barn','coop','hay','tree','bush','silo'].includes(p.type)) {
      const {x,y,w,h}=p;
      const shape = FarmDetails.shape(p);
      if(game) EnvironmentSystem.transform(c,p,game);
      FarmSprites.draw(c,FarmSprites.habitatsReady&&p.art?p.art:p.type,shape.x,shape.y,shape.w,shape.h,
        {palette:p.art==='bush'?(p.palette??(p.areaId==='poleiro'?0:2)):p.art?0:p.palette,
          grounded:true,shadow:true,foundation:p.type==='coop'});
      c.restore();return;
    }
    if(game) EnvironmentSystem.transform(c,p,game);
    if(p.type==="barn"||p.type==="coop") building(c,p,p.type==="barn");
    else if(p.type==="hay") hay(c,p);
    else if(p.type==="tree"||p.type==="bush") vegetation(c,p);
    else if(p.type==="silo") {
      const {x,y,w,h}=p;
      c.fillStyle='#26332330';c.fillRect(x+5,y+h-1,w-10,3);
      rounded(c,x,y+w*.12,w,h-w*.12,12,"#a7b9b5",true);
      rounded(c,x+w*.7,y+w*.18,w*.26,h-w*.22,9,"#829c9a");
      for(let yy=y+w*.4;yy<y+h-7;yy+=16) {
        line(c,[[x+3,yy],[x+w-3,yy]],"#728f8d",1.5); line(c,[[x+4,yy+2],[x+w-5,yy+2]],"#c4d0be",1);
      }
      ellipse(c,x+w*.5,y+w*.16,w*.5,w*.2,"#d3d9c5",true);
      polygon(c,[[x-4,y+w*.13],[x+w*.5,y-20],[x+w+4,y+w*.13]],"#7c9897");
      rounded(c,x+w*.35,y+h-37,w*.3,37,4,"#738984",true);
      line(c,[[x+w*.35+4,y+h-32],[x+w*.35+4,y+h-7]],"#b7c4b5",2);
    } else if(p.type==="fence") {
      fence(c,p.x,p.y,p.w);
      if (!FarmSprites.ready) rounded(c,p.x+p.w-4,p.y-24,8,27,2,"#e4ca94",true);
    } else if(p.type==="sign") {
      FarmDetails.drawSign(c,p);
    }
    c.restore();
  }
  function drawCoverForeground(c,spot,camera,opacity=1,player=null,game) {
    if(spot.type==='hay' && spot.bale) {
      // Occlude with the very same bale, at its world position. Never grow a
      // second patch of straw around the player's feet or cast a second shadow.
      const bale={...spot.bale,type:'hay'},shape=FarmDetails.shape(bale);
      world(c,camera);
      if(game)EnvironmentSystem.transform(c,bale,game);
      if(!FarmSprites.draw(c,'hay',shape.x,shape.y,shape.w,shape.h,{grounded:true,solar:false}))hay(c,bale);
      c.restore();return;
    }
    world(c,camera); c.globalAlpha=opacity;
    if(game)EnvironmentSystem.transform(c,spot,game);
    const x=player?.x ?? spot.x+spot.w/2, y=player?.y ?? spot.y+spot.h*.65;
    if(FarmSprites.ready) {
      c.beginPath();c.rect(x-30,y-18,60,39);c.clip();
      FarmSprites.draw(c,FarmSprites.habitatsReady&&spot.art==='bramble'?'bramble':'bush',x-34,y-33,68,56,
        {grounded:true,solar:false,palette:spot.art==='bramble'||spot.areaId==='poleiro'?0:2});
      c.restore();return;
    }
    if(spot.type==="hay") {
      for(let i=0;i<13;i++) {
        const dx=(i-6)*4, height=12+hash(i,spot.x)*13;
        line(c,[[x+dx,y+12],[x+dx-5,y+12-height]],i%2?"#ebcd73":"#c19a46",3);
      }
    } else {
      for(let i=0;i<7;i++) {
        const dx=(i-3)*8, dy=6+Math.abs(i-3)*1.5;
        ellipse(c,x+dx,y+dy,9,8,i%2?"#799d51":"#5a8849");
        line(c,[[x+dx-3,y+dy],[x+dx+2,y+dy-3]],"#b0c574",1.5);
      }
    }
    c.restore();
  }
  function drawSecretCover(c,chick,camera,time) {
    if (!visible(c,chick,camera,25)) return;
    world(c,camera);
    const sway = Math.sin(time*2.3+chick.x)*1.2;
    ellipse(c,chick.x,chick.y+9,17,5,"#5b78342b");
    for (const side of [-1,0,1]) {
      const x=chick.x+side*9;
      line(c,[[x-6,chick.y+6],[x,chick.y-5+sway],[x+6,chick.y+7]],"#76974c",3);
      line(c,[[x,chick.y+6],[x+3,chick.y-7+sway]],"#a8b86a",2);
    }
    c.restore();
  }
  return {drawGround,getProps,getCrops,drawProp,drawCoverForeground,drawSecretCover,playableBounds,boundaryObstacles,signObstacles};
})();
if (typeof module !== "undefined" && module.exports) module.exports = FarmArt;
