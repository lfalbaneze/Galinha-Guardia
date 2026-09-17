/* A seed only chooses the scenery once. Rendering never consumes random numbers. */
const FarmArt = (() => {
  const INK = "#695640", TAU = Math.PI * 2;
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
  function decoration(c, d) {
    const x = d.x, y = d.y, n = hash(x, y), s = d.scale || .8 + n * .5;
    if(FarmSprites.ready) {
      const px=(dx,dy,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x+dx*s),Math.round(y+dy*s),Math.max(1,Math.round(w*s)),Math.max(1,Math.round(h*s)));};
      if(d.type==='flower'||d.type==='sunflower') {
        const tall=d.type==='sunflower',top=tall?-20:-9,r=tall?3:2;
        px(0,top+3,2,-top,'#3e6c35');px(-4,top/2,4,2,'#65933e');
        const color=tall?'#f2c84b':['#f1e6b0','#e5acc1','#bcb3d6','#eace64'][Math.floor(n*4)];
        for(const [dx,dy] of [[-r,0],[r,0],[0,-r],[0,r]])px(dx-r,top+dy-r,r*2,r*2,color);
        px(-r/2,top-r/2,r+1,r+1,tall?'#795631':'#d79e45');return;
      }
      if(d.type==='crop') {
        px(-9,0,18,4,'#765635');
        if(d.variant===2) {
          px(-7,-9,14,10,'#b95f29');px(-5,-12,10,16,'#d88730');
          px(-2,-12,4,16,'#eaa042');px(0,-16,3,5,'#48652f');
          px(-5,-9,2,10,'#f0ae50');return;
        }
        if(d.variant===1){px(-3,-2,6,6,'#cc7933');px(0,1,2,3,'#eca74a');}
        for(const [dx,dy,color] of [[-8,-5,'#426f33'],[2,-8,'#56863b'],[-4,-11,'#739c48'],[-2,-7,'#89ac58']])
          {px(dx,dy,7,6,color);px(dx+2,dy-2,4,2,color);}
        return;
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
    } else if (d.type === "crop") {
      ellipse(c, x, y + 2, 10 * s, 4 * s, "#98764e");
      if (d.variant === 2) {
        for (const dx of [-4, 0, 4]) ellipse(c,x+dx*s,y-3*s,5*s,7*s,dx===0?"#ec9b39":"#c66b2e",true);
        line(c,[[x,y-10*s],[x+2,y-14*s]],"#487542",3);
        return;
      }
      if (d.variant === 1) {
        ellipse(c,x,y,4*s,4*s,"#e99737",true);
        for(const dx of [-7,0,7]) line(c,[[x,y-2],[x+dx*s,y-(15-Math.abs(dx))*s]],"#4b813b",3);
        return;
      }
      for (const [dx, dy] of [[-5, -2], [5, -2], [0, -6]]) ellipse(c, x + dx * s, y + dy * s, 5.5 * s, 4 * s, dy < -3 ? "#8aaf55" : "#5f8c46");
      line(c, [[x, y], [x, y - 7 * s]], "#b4cc72", 1.5);
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
    patch(c, x, y, p.w / 2, p.h / 2, 51, "#68aca8");
    patch(c, x - 8, y - 6, p.w * .42, p.h * .36, 51, "#83bfba");
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
  function drawGround(c, layout, camera) {
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
    const structures = layout.structures || {};
    if (structures.pond && visible(c, structures.pond, camera)) pond(c, structures.pond);
    for (const plot of layout.plots || []) {
      if (!visible(c,plot,camera)) continue;
      const {x,y,w,h}=plot, pasture=plot.kind==='pasture';
      c.fillStyle=pasture?'#8a8b4a':'#735236'; c.fillRect(x,y,w,h);
      c.fillStyle=pasture?'#9b9958':'#936b42'; c.fillRect(x+3,y+3,w-6,h-6);
      for(let yy=y+5;yy<y+h-4;yy+=4)for(let xx=x+5;xx<x+w-4;xx+=4) {
        const n=hash(xx,yy);
        if(n<.26){c.fillStyle=pasture?'#838648':'#80603b';c.fillRect(xx,yy,3,2);}
        else if(n>.87){c.fillStyle=pasture?'#b0a467':'#a47c4a';c.fillRect(xx,yy,2,2);}
      }
      if(!pasture) for(let yy=y+24;yy<=y+h-16;yy+=40) {
        c.fillStyle='#60482f';c.fillRect(x+10,yy+3,w-20,3);
        c.fillStyle='#b18a54';c.fillRect(x+10,yy+6,w-20,2);
      }
      if(plot.kind==='garden') {
        c.fillStyle='#c09b60';c.fillRect(x,y,w,3);c.fillRect(x,y,3,h);
        c.fillStyle='#654d32';c.fillRect(x,y+h-3,w,3);c.fillRect(x+w-3,y,3,h);
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
      if (d.type === 'fence' || d.type === 'corn' || !visible(c,d,camera,35)) continue;
      // Wheat belongs to the field, not to the livestock yard.
      if (d.type === 'wheat' || d.type === 'sunflower') {
        const field=(layout.areas||[]).find(a=>a.id==='granja');
        if(!field||d.x<field.x||d.x>field.x+field.w||d.y<field.y||d.y>field.y+field.h)continue;
      }
      decoration(c,d.plotId ? {...d,scale:1} : d);
    }
    // Low split-rail boundary, leaving the meadow itself free of a square grid.
    for (let x = 35; x < layout.width - 25; x += 84) {
      for (const y of [28, layout.height - 23]) if (visible(c, { x, y, w: 84, h: 24 }, camera, 30)) fence(c, x, y, 84);
    }
    for (let y = 75; y < layout.height - 60; y += 84) {
      for (const x of [23, layout.width - 23]) if (visible(c, { x, y, w: 16, h: 84 }, camera, 30)) {
        line(c, [[x, y - 15], [x, y + 66]], "#9e8860", 5);
        rounded(c, x - 4, y - 24, 8, 22, 2, "#d6ba86", true);
      }
    }
    c.restore();
  }
  function fence(c, x, y, w) {
    if(FarmSprites.draw(c,'fence',x-4,y-36,w+8,43,{grounded:true}))return;
    line(c, [[x, y - 14], [x + w, y - 14]], "#b59a6d", 6);
    line(c, [[x, y - 5], [x + w, y - 5]], "#ceb385", 5);
    rounded(c, x - 4, y - 24, 8, 27, 2, "#e4ca94", true);
  }
  function getProps(layout) {
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
    return FarmDetails.decorate(layout, result.concat(FarmRefuge.props()));
  }

  function corn(c,p) {
    const x=Math.round(p.x),y=Math.round(p.y),height=48+(p.variant===1?6:0);
    const px=(dx,dy,w,h,color)=>{c.fillStyle=color;c.fillRect(x+dx,y+dy,w,h);};
    px(-9,0,20,3,'#493d284d');px(-1,-height,3,height,'#657735');px(1,-height+6,2,height-6,'#9aab49');
    for(const [level,side] of [[12,-1],[22,1],[31,-1],[39,1]]) {
      for(let k=0;k<5;k++) {
        const dx=side*k*3;
        px(dx,-level-k*2,side===1?5:4,5,k<3?'#487032':'#749540');
        px(dx,-level-k*2,3,2,'#96ae4d');
      }
    }
    // Thick yellow ears and branching tassels distinguish corn from scattered wheat.
    px(3,-27,7,14,'#b98b32');px(4,-29,5,15,'#e1b84f');px(5,-27,2,11,'#f0d27a');
    px(2,-18,4,7,'#73943b');px(8,-25,3,10,'#5a8036');
    for(const [dx,dy] of [[-5,-3],[-3,-7],[0,-10],[4,-6],[6,-2]])px(dx,-height+dy,2,7,'#d5bb67');
  }

  function paddockFence(c,p) {
    if(p.w>p.h) {
      const count=Math.ceil(p.w/70),span=p.w/count;
      for(let i=0;i<count;i++) fence(c,p.x+i*span,p.y+4,span);
      return;
    }
    const x=Math.round(p.x),y=Math.round(p.y);
    c.fillStyle='#57482f';c.fillRect(x+1,y-24,7,p.h+25);
    c.fillStyle='#ae8b53';c.fillRect(x+2,y-24,3,p.h+25);
    c.fillStyle='#705837';c.fillRect(x-2,y-31,12,36);
    c.fillStyle='#c3a16a';c.fillRect(x,y-30,6,33);
    c.fillStyle='#e0c28b';c.fillRect(x,y-30,6,3);
  }

  function building(c, p, barn) {
    const {x,y,w,h} = p, roof = h * .36, wallY = y + h * .14, wallH = h * .86;
    const stable = p.areaId === "estabulo";
    ellipse(c, x + w * .53, y + h + 5, w * .59, h * .12, "#526b452d");
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
    ellipse(c,x+w*.53,y+h+3,w*.53,h*.17,"#6d783632");
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
    ellipse(c,cx+4,y+h*.68,w*.52,h*.34,"#506f4232");
    if(p.type==="tree") {
      const trunk = p.blockingRect || {x:cx-9,y:y+4,w:18,h:22};
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
  function drawProp(c,p,camera) {
    if(!visible(c,p,camera,160)) return;
    world(c,camera);
    if(p.type==='corn') {corn(c,p);c.restore();return;}
    if(p.type==='paddock-fence') {paddockFence(c,p);c.restore();return;}
    if(p.type==='stable'||p.type==='trough') {
      const box=FarmDetails.shape(p);FarmDetails.drawFooting(c,p,box);
      if(!FarmSprites.draw(c,p.type==='stable'?'barn':'trough',box.x,box.y,box.w,box.h,{grounded:true,palette:p.type==='stable'?2:0}))
        rounded(c,p.x,p.y,p.w,p.h,2,'#97734b',true);
      c.restore();return;
    }
    if(p.type.startsWith('refuge-')||p.type==='nursery'||p.type==='nursery-lip') {
      FarmRefuge.drawProp(c,p);c.restore();return;
    }
    if(FarmSprites.ready && ['barn','coop','hay','tree','bush','silo'].includes(p.type)) {
      const {x,y,w,h}=p;
      const shape = FarmDetails.shape(p);
      FarmDetails.drawFooting(c,p,shape);
      FarmSprites.draw(c,p.type,shape.x,shape.y,shape.w,shape.h,{palette:p.palette,grounded:true});
      c.restore();return;
    }
    if(p.type==="barn"||p.type==="coop") building(c,p,p.type==="barn");
    else if(p.type==="hay") hay(c,p);
    else if(p.type==="tree"||p.type==="bush") vegetation(c,p);
    else if(p.type==="silo") {
      const {x,y,w,h}=p;
      ellipse(c,x+w*.55,y+h+4,w*.63,14,"#526b452d");
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
  function drawCoverForeground(c,spot,camera,opacity=1,player=null) {
    world(c,camera); c.globalAlpha=opacity;
    const x=player?.x ?? spot.x+spot.w/2, y=player?.y ?? spot.y+spot.h*.65;
    if(FarmSprites.ready && spot.type==='hay') {
      for(let i=0;i<25;i++) {
        const xx=Math.round(x-28+i*2.3),height=19+Math.floor(hash(i,spot.x)*16);
        c.fillStyle=['#b98935','#dcb252','#f0ce71'][i%3];
        c.fillRect(xx,Math.round(y+14-height),3,height);
        c.fillRect(xx-2,Math.round(y+9-height),3,7);
      }
      c.restore();return;
    }
    if(FarmSprites.ready) {
      c.beginPath();c.rect(x-30,y-18,60,39);c.clip();
      FarmSprites.draw(c,spot.type==='hay'?'hay':'bush',x-34,y-33,68,56,{grounded:true});
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
  return {drawGround,getProps,drawProp,drawCoverForeground,drawSecretCover};
})();
if (typeof module !== "undefined" && module.exports) module.exports = FarmArt;
