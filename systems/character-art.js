/* All characters share a hand-drawn storybook palette and a ground point at y + 13.
   This renderer has no game-state dependencies, so it also works in menus/cutscenes. */
const CharacterArt = (() => {
  const INK = "#655143", CREAM = "#fff2d6", WHITE = "#fffaf0", SHADE = "#ddc5a0";
  const TAU = Math.PI * 2;
  function paint(c, color, x = -20, y = -38, span = 58) {
    if (typeof color !== "string" || !/^#[\da-f]{6}$/i.test(color) || color === INK) return color;
    const n = parseInt(color.slice(1), 16), rgb = [n >> 16, n >> 8 & 255, n & 255];
    const tint = (target, amount) => `rgb(${rgb.map(v => Math.round(v + (target - v) * amount)).join(",")})`;
    const gradient = c.createLinearGradient(x, y, x + span * .42, y + span);
    gradient.addColorStop(0, tint(255, .25)); gradient.addColorStop(.48, color); gradient.addColorStop(1, tint(88, .18));
    return gradient;
  }
  function oval(c, x, y, rx, ry, color, stroke = true, rotation = 0) {
    c.beginPath(); c.ellipse(x, y, rx, ry, rotation, 0, TAU);
    c.fillStyle = stroke ? paint(c, color, x - rx, y - ry, ry * 2) : color; c.fill();
    if (stroke) { c.strokeStyle = INK; c.lineWidth = 1.8; c.stroke(); }
  }
  function shape(c, color, path, width = 1.8) {
    c.beginPath(); path(c); c.closePath(); c.fillStyle = paint(c, color); c.fill();
    if (width) { c.strokeStyle = INK; c.lineWidth = width; c.stroke(); }
  }
  function line(c, color, width, path) {
    c.beginPath(); path(c); c.strokeStyle = color; c.lineWidth = width; c.stroke();
  }
  function eye(c, x, y, blink, big = false, hurt = false, mood = "normal", inward = 1) {
    if (mood === "angry" || mood === "furious") {
      const tilt = inward * (mood === "furious" ? 1.7 : 1.2);
      shape(c, WHITE, p => { p.moveTo(x - 4, y - 2 - tilt); p.lineTo(x + 4, y - 2 + tilt); p.quadraticCurveTo(x + 5, y + 3, x, y + 3); p.quadraticCurveTo(x - 5, y + 3, x - 4, y - 2 - tilt); }, 1);
      oval(c, x + inward * .8, y + .4, 1.7, 2.1, "#42332e", false);
      line(c, mood === "furious" ? "#6c342b" : INK, mood === "furious" ? 2.8 : 2.2, p => { p.moveTo(x - 5, y - 3 - tilt); p.lineTo(x + 4, y - 3 + tilt); });
      return;
    }
    if (mood === "crying") {
      line(c, INK, 2.2, p => { p.moveTo(x - 3.5, y + 1); p.quadraticCurveTo(x, y - 3, x + 3.5, y + 1); });
      line(c, INK, 1.7, p => { p.moveTo(x - 4, y - 5 - inward); p.quadraticCurveTo(x, y - 7, x + 3, y - 5 + inward); });
      line(c, "#6dbbd9", 3.7, p => { p.moveTo(x, y + 2); p.quadraticCurveTo(x - inward, y + 7, x + inward, y + 12); });
      line(c, "#d1f1f7", 1, p => { p.moveTo(x - 1, y + 3); p.lineTo(x - 1, y + 9); });
      return;
    }
    if (blink || hurt) {
      line(c, INK, 2, p => { p.moveTo(x - 2.5, y); p.quadraticCurveTo(x, y + (hurt ? 2 : -2), x + 2.5, y); });
      return;
    }
    if (big) oval(c, x, y, 4.6, 5.5, WHITE, false);
    oval(c, x + (big ? 1 : 0), y + .3, big ? 2.5 : 2.1, big ? 3.7 : 2.8, "#443d36", false);
    oval(c, x + (big ? 1.8 : .6), y - 1, .8, 1, WHITE, false);
  }
  function cheek(c, x, y, color = "#ed9e86") { oval(c, x, y, 3.5, 1.9, color, false); }
  function leg(c, x, step, color, hoof = false, long = false) {
    const y = 12 - Math.max(0, step) * .65, footX = x + step * 1.1;
    line(c, INK, 6, p => { p.moveTo(x, long ? -1 : 3); p.quadraticCurveTo(x - step * .25, 6, footX, y); });
    line(c, color, 3.7, p => { p.moveTo(x, long ? -1 : 3); p.quadraticCurveTo(x - step * .25, 6, footX, y - .5); });
    oval(c, footX + 1.5, y, 4, 2.4, hoof ? INK : color, false);
  }
  function paws(c, step, color, hoof = false, long = false) {
    leg(c, -15, -step, color, hoof, long); leg(c, 7, step, color, hoof, long);
    leg(c, -9, step, color, hoof, long); leg(c, 14, -step, color, hoof, long);
  }
  function birdFeet(c, step, hidden) {
    if (hidden > .75) return;
    for (const [x, offset] of [[-7, step], [7, -step]]) {
      const fx = x + offset * 1.1, fy = 13 - Math.max(0, offset) * .8;
      line(c, INK, 4.2, p => { p.moveTo(x, 4); p.lineTo(fx, fy); p.lineTo(fx + 5, fy); p.moveTo(fx, fy); p.lineTo(fx + 2, fy + 2); });
      line(c, "#e5a24b", 2.4, p => { p.moveTo(x, 4); p.lineTo(fx, fy); p.lineTo(fx + 5, fy); p.moveTo(fx, fy); p.lineTo(fx + 2, fy + 2); });
    }
  }
  function chickenClothes(c, a, axial, back) {
    if (a.skin === "classic") return;
    const priest = a.skin === "priest", punk = a.skin === "punk", space = a.skin === "astronaut";
    const cloth = priest ? "#343946" : punk ? "#414047" : space ? "#eef0e9" : "#b5c8cc";
    shape(c, cloth, p => {
      if (axial) { p.moveTo(-15,-20);p.quadraticCurveTo(0,-24,15,-20);p.lineTo(priest?22:20,priest?10:3);p.quadraticCurveTo(0,priest?15:14,priest?-22:-20,priest?10:3); }
      else { p.moveTo(-19,-21);p.quadraticCurveTo(-4,-28,7,-23);p.lineTo(17,-10);p.lineTo(priest?22:17,priest?10:2);p.quadraticCurveTo(-5,14,-24,priest?8:0); }
    });
    const cx = axial ? 0 : -1;
    if (punk) {
      line(c,"#a0a7a7",1.5,p=>{p.moveTo(cx-7,-19);p.lineTo(cx-1,5);p.moveTo(cx+7,-19);p.lineTo(cx+3,-5);});
      for (const sx of [-1,1]) for (let i=0;i<3;i++) oval(c,cx+sx*(12-i*2),-16+i*4,1.15,1.15,"#e0d6ac",false);
      if (back) { line(c,"#e18ca8",2.1,p=>{p.moveTo(-5,-8);p.lineTo(5,1);p.moveTo(5,-8);p.lineTo(-5,1);}); }
    } else if (priest) {
      line(c,"#575965",1,p=>{p.moveTo(cx,-14);p.lineTo(cx,8);});
      for (let y=-8;y<8;y+=5) oval(c,cx+1,y,.8,.8,"#b4b0b0",false);
      if (!back) shape(c,WHITE,p=>{p.moveTo(axial?-4:10,-19);p.lineTo(axial?4:17,-19);p.lineTo(axial?4:16,-14);p.lineTo(axial?-4:10,-14);},.6);
    } else if (space) {
      if (back) {
        for(const sx of [-1,1]) { oval(c,sx*7,-4,5.5,12,"#c2d7d8");line(c,"#91afb5",2,p=>{p.moveTo(sx*7-4,-8);p.lineTo(sx*7+4,-8);p.moveTo(sx*7-4,0);p.lineTo(sx*7+4,0);}); }
      } else { shape(c,"#779fa5",p=>{p.rect(cx-6,-14,13,13);},1);oval(c,cx-2,-10,1.4,1.4,"#d97566",false);oval(c,cx+3,-10,1.4,1.4,"#f3d174",false);line(c,"#d6f1ed",1.5,p=>{p.moveTo(cx-3,-5);p.lineTo(cx+3,-5);}); }
      line(c,"#a1b8bc",3,p=>{p.moveTo(-16,4);p.quadraticCurveTo(0,10,16,4);});
    } else {
      line(c,"#5b717d",4,p=>{p.moveTo(-15,0);p.quadraticCurveTo(0,6,15,0);});
      shape(c,"#d8e3df",p=>{p.moveTo(cx-10,-17);p.lineTo(cx+10,-17);p.lineTo(cx+7,-4);p.lineTo(cx-7,-4);},1);
      line(c,"#79949e",1.3,p=>{p.moveTo(cx,-16);p.lineTo(cx,-5);});
      oval(c,cx+5,-12,1.5,1.5,"#dd7564",false);
    }
  }
  function chickenHeadwear(c, a, axial, back) {
    if (a.skin === "classic") return;
    if (a.skin === "priest") {
      if(axial) shape(c,WHITE,p=>p.rect(back?-6:-4,back?-10:-5,back?12:8,back?3:4),.5);
      return;
    }
    const hx = axial ? 0 : 14, hy = axial ? -27 : -30;
    if (a.skin === "punk") {
      shape(c,"#d96a9a",p=>{
        if(axial){p.moveTo(-7,-39);p.lineTo(-6,-50);p.lineTo(-2,-47);p.lineTo(1,-58);p.lineTo(5,-47);p.lineTo(8,-53);p.lineTo(9,-40);}
        else {p.moveTo(1,-39);p.lineTo(-1,-53);p.lineTo(6,-48);p.lineTo(10,-59);p.lineTo(15,-47);p.lineTo(23,-54);p.lineTo(23,-40);}
      });
      line(c,"#f0a3bf",1.3,p=>{p.moveTo(hx-3,-43);p.lineTo(hx-3,-50);});
      if(!back) oval(c,axial?12:8,axial?-19:-24,2.2,3,"#e7c16a",true);
    } else if (a.skin === "astronaut") {
      c.beginPath();c.ellipse(hx,hy-1,axial?23:25,25,0,0,TAU);c.fillStyle="rgba(181,224,237,.10)";c.fill();c.strokeStyle="#789ba6";c.lineWidth=4.5;c.stroke();c.strokeStyle="#f4f6e9";c.lineWidth=2.5;c.stroke();
      line(c,"rgba(255,255,255,.85)",2.5,p=>{p.moveTo(hx-16,hy-7);p.quadraticCurveTo(hx-16,hy-18,hx-7,hy-20);});
      line(c,"#9bb6ba",3.5,p=>{p.moveTo(hx-11,hy+22);p.quadraticCurveTo(hx,hy+25,hx+11,hy+22);});
      if(back) { oval(c,hx,hy,10,11,"#d6e0d8");line(c,"#91a8ad",2,p=>{p.moveTo(hx-5,hy-2);p.lineTo(hx+5,hy-2);p.moveTo(hx-5,hy+3);p.lineTo(hx+5,hy+3);}); }
    } else if (a.skin === "robocop") {
      shape(c,"#b8cbd0",p=>{p.moveTo(hx-16,hy+1);p.lineTo(hx-17,hy-10);p.quadraticCurveTo(hx-11,hy-22,hx+5,hy-19);p.quadraticCurveTo(hx+18,hy-16,hx+17,hy+1);});
      shape(c,"#334451",p=>{p.moveTo(hx-16,hy-7);p.quadraticCurveTo(hx,hy-10,hx+17,hy-7);p.lineTo(hx+16,hy+2);p.quadraticCurveTo(hx,hy+5,hx-15,hy+2);},1);
      line(c,"#e07863",1.8,p=>{p.moveTo(hx-12,hy-6);p.lineTo(hx+13,hy-6);});
      line(c,"#e8efdf",1.5,p=>{p.moveTo(hx-9,hy-15);p.quadraticCurveTo(hx,hy-19,hx+8,hy-15);});
      if(!back) { if(axial) for(const sx of [-1,1]) eye(c,sx*7,-29,a.blink,false,false,a.mood,-sx);else eye(c,18,-31,a.blink,false,false,a.mood); }
      for(const sx of [-1,1]) oval(c,hx+sx*16,hy+1,2.4,4,"#9cb4bd");
    }
  }
  function chicken(c, a) {
    birdFeet(c, a.step, a.hidden);
    c.save(); c.translate(-16, -8); c.rotate(a.wave * .06); c.translate(16, 8);
    shape(c, SHADE, p => {
      p.moveTo(-15, -7); p.bezierCurveTo(-34, -10, -37, -24, -32, -27);
      p.quadraticCurveTo(-29, -28, -21, -20); p.quadraticCurveTo(-30, -35, -23, -33);
      p.quadraticCurveTo(-15, -29, -11, -17);
    });
    c.restore(); shape(c, CREAM, p => {
      p.moveTo(-22, -8); p.bezierCurveTo(-25, -23, -12, -29, 0, -26);
      p.bezierCurveTo(-2, -43, 16, -46, 24, -35); p.bezierCurveTo(30, -25, 23, -16, 20, -8);
      p.bezierCurveTo(16, 10, -16, 13, -22, -8);
    });
    shape(c, "#e8d9b9", p => { p.moveTo(-20, -5); p.quadraticCurveTo(-10, 6, 14, 1); p.quadraticCurveTo(2, 12, -13, 4); }, 0);
    chickenClothes(c,a,false,false);
    if(a.skin !== "punk" && a.skin !== "robocop") shape(c, "#de6253", p => {
      p.moveTo(3, -38); p.bezierCurveTo(-2, -47, 6, -52, 9, -43);
      p.bezierCurveTo(8, -55, 19, -53, 18, -43); p.bezierCurveTo(21, -49, 28, -45, 23, -37);
      p.quadraticCurveTo(13, -41, 3, -38);
    });
    oval(c, 24, -17, 3.7, 6, "#df6555");
    shape(c, "#efac45", p => { p.moveTo(25, -30); p.quadraticCurveTo(37, -27, 36, -24); p.lineTo(25, -21); });
    line(c, "#bc7c34", 1.3, p => { p.moveTo(27, -25); p.lineTo(33, -25); });
    c.save(); c.translate(-8, -16); c.rotate(a.sprinting ? -.45 + a.wave * .55 : a.wave * .035); c.translate(8, 16);
    shape(c, a.skin === "priest" ? "#444750" : a.skin === "robocop" ? "#c7d4d3" : WHITE, p => {
      p.moveTo(-13, -18); p.quadraticCurveTo(2, -23, 8, -10);
      p.quadraticCurveTo(2, 0, -10, -4); p.quadraticCurveTo(-18, -8, -13, -18);
    });
    line(c, "#d7c6a5", 1.5, p => { p.moveTo(-10, -11); p.quadraticCurveTo(-3, -9, 0, -12); });
    c.restore();
    oval(c, 8, -33, 4, 2.3, WHITE, false, -.4);
    eye(c, 18, -31, a.blink, true, false, a.mood); cheek(c, 20, -22);
    if (a.hidden) {
      line(c, SHADE, 1.8, p => { p.moveTo(-6, -1); p.lineTo(-1, 2); p.lineTo(5, -1); });
    }
    chickenHeadwear(c,a,false,false);
  }
  function wolf(c, a) {
    const fur = a.hurt ? "#879b9d" : "#819794", dark = "#637976", light = "#e3e7d7";
    c.save(); c.translate(-18, -8); c.rotate(a.wave * .09); c.translate(18, 8);
    shape(c, dark, p => {
      p.moveTo(-18, -8); p.bezierCurveTo(-30, -12, -38, -30, -43, -19);
      p.lineTo(-41, -8); p.lineTo(-36, -10); p.quadraticCurveTo(-33, 5, -17, 2);
    });
    shape(c, light, p => { p.moveTo(-43, -19); p.lineTo(-41, -8); p.lineTo(-36, -10); p.lineTo(-36, -18); p.lineTo(-40, -16); }, 0);
    c.restore();
    paws(c, a.step, dark, false, true);
    oval(c, -4, -5, 23, 15, fur);
    shape(c, light, p => {
      p.moveTo(2, -20); p.lineTo(16, -23); p.quadraticCurveTo(23, -7, 12, 4);
      p.lineTo(6, 1); p.lineTo(6, -3); p.lineTo(1, -2); p.lineTo(2, -7); p.lineTo(-3, -8);
    });
    c.save(); c.translate(10, -16); c.rotate(a.mood === "sniff" ? .27 + a.wave * .05 : a.mood === "search" ? a.wave * .045 : 0); c.translate(-10, 16);
    shape(c, fur, p => {
      p.moveTo(7, -22); p.lineTo(7, -41); p.quadraticCurveTo(8, -46, 19, -34);
      p.lineTo(25, -40); p.lineTo(31, -28); p.quadraticCurveTo(34, -18, 25, -10);
      p.quadraticCurveTo(15, -7, 8, -17); p.lineTo(3, -17);
    });
    shape(c, "#c8b3ae", p => { p.moveTo(10, -35); p.lineTo(11, -26); p.lineTo(17, -31); }, 0);
    shape(c, light, p => { p.moveTo(23, -22); p.quadraticCurveTo(31, -24, 38, -17); p.quadraticCurveTo(36, -9, 23, -11); p.lineTo(18, -16); });
    oval(c, 37, -18, 4.5, 3.8, INK, false); oval(c, 36, -20, 1.5, .7, "#899595", false);
    eye(c, 23, -27, a.blink, true, a.hurt, a.mood);
    if (a.mood === "alert") line(c, INK, 2, p => { p.moveTo(19, -34); p.lineTo(25, -32); });
    if(!["angry","furious","crying"].includes(a.mood)) line(c, INK, 1.4, p => { p.moveTo(31, -13); p.quadraticCurveTo(26, -11, 24, -14); });
    cheek(c, 16, -19, "#bfaba1");
    line(c, "#a1b5bb", 2, p => { p.moveTo(-16, -13); p.quadraticCurveTo(-7, -18, -1, -14); });
    if (a.hurt) {
      shape(c, WHITE, p => { p.moveTo(11, -36); p.lineTo(21, -32); p.lineTo(18, -26); p.lineTo(8, -30); }, 1);
      line(c, "#d98675", 1.5, p => { p.moveTo(14, -32); p.lineTo(15, -30); p.moveTo(13, -30); p.lineTo(16, -32); });
    }
    c.restore();
  }
  function duck(c, a) {
    birdFeet(c, a.step * .7, false);
    shape(c, "#f3cb62", p => {
      p.moveTo(-14, -5); p.lineTo(-25, -15); p.quadraticCurveTo(-24, 0, -15, 4);
      p.quadraticCurveTo(0, 12, 14, 2); p.quadraticCurveTo(24, -6, 19, -14);
      p.quadraticCurveTo(27, -33, 13, -35); p.quadraticCurveTo(-1, -36, 1, -19);
      p.quadraticCurveTo(-11, -19, -14, -5);
    });
    oval(c, -3, -5, 10, 6, "#ffe5a0", true, -.3 + a.wave * .07);
    shape(c, "#e79145", p => { p.moveTo(20, -25); p.quadraticCurveTo(37, -25, 33, -19); p.quadraticCurveTo(29, -16, 20, -19); });
    oval(c, 7, -30, 3, 1.6, "#fff3c4", false, -.5);
    eye(c, 17, -26, a.blink, false, false, a.mood); cheek(c, 18, -18, "#efa377");
  }
  function chick(c, a, axial, back) {
    for(const sx of [-1,1]) { const step=sx*a.step*.6;line(c,"#b98342",2,p=>{p.moveTo(sx*4,6);p.lineTo(sx*4+step,12-Math.max(0,step));p.lineTo(sx*4+step+3,12-Math.max(0,step));}); }
    shape(c,"#f3cd67",p=>{p.moveTo(-11,-12);p.quadraticCurveTo(-14,-25,0,-25);p.quadraticCurveTo(14,-25,13,-11);p.lineTo(16,-6);p.lineTo(13,-5);p.quadraticCurveTo(17,9,0,9);p.quadraticCurveTo(-17,9,-13,-4);p.lineTo(-16,-6);p.lineTo(-12,-8);});
    shape(c,"#ffe39a",p=>{p.moveTo(-5,-23);p.quadraticCurveTo(-10,-32,-2,-27);p.quadraticCurveTo(-1,-35,3,-29);p.quadraticCurveTo(9,-32,7,-23);},1.1);
    if(axial) {
      for(const sx of [-1,1]) oval(c,sx*11,-1,4,6,"#f8dd8c",true,sx*(.22+a.wave*.1));
      if(back) { shape(c,"#ffe9a6",p=>{p.moveTo(-4,3);p.lineTo(-5,-3);p.lineTo(0,0);p.lineTo(4,-3);p.lineTo(4,4);},1);return; }
      for(const sx of [-1,1]) { eye(c,sx*5,-14,a.blink,false,false,a.mood,-sx);cheek(c,sx*8,-8,"#edba79"); }
      shape(c,"#da9a43",p=>{p.moveTo(-3,-9);p.lineTo(3,-9);p.lineTo(0,-5);},1);
    } else {
      oval(c,-5,0,6,4,"#ffe7a4",true,-.3+a.wave*.1);
      eye(c,7,-15,a.blink,false,false,a.mood);cheek(c,8,-8,"#edba79");
      shape(c,"#da9a43",p=>{p.moveTo(12,-13);p.lineTo(20,-10);p.lineTo(12,-7);},1.1);
    }
  }
  function sheep(c, a, lamb) {
    paws(c, a.step, "#796455", true);
    const wool = lamb ? "#fff8e7" : "#f5e7cc";
    shape(c, wool, p => {
      p.moveTo(-20, -6); p.bezierCurveTo(-29, -12, -21, -23, -15, -20);
      p.bezierCurveTo(-14, -31, -2, -29, 2, -24); p.bezierCurveTo(10, -30, 19, -23, 17, -17);
      p.bezierCurveTo(28, -11, 22, 2, 14, 1); p.bezierCurveTo(9, 10, -2, 8, -7, 4);
      p.bezierCurveTo(-16, 11, -25, 2, -20, -6);
    });
    oval(c, 19, -12, 9, 12, lamb ? "#b79173" : "#74665b");
    oval(c, 8, -20, 6, 3.5, lamb ? "#b79173" : "#74665b", true, -.5 + a.wave * .08);
    oval(c, 21, -24, 6, 4.5, WHITE); oval(c, 14, -25, 5, 4, WHITE);
    eye(c, 22, -14, a.blink, false, false, a.mood); cheek(c, 22, -7, "#c48c79");
    line(c, "#d8c6a7", 1.7, p => { p.moveTo(-13, -12); p.bezierCurveTo(-7, -20, 0, -10, -7, -7); p.moveTo(2, -7); p.quadraticCurveTo(6, -3, 10, -7); });
  }
  function rabbit(c, a) {
    oval(c, -19, -2, 6, 6, WHITE);
    oval(c, -3, -3, 15, 14, "#e8ddcb");
    oval(c, -7 + a.step * .4, 11, 8, 3.5, WHITE);
    oval(c, 10 - a.step * .35, 11, 6, 3, WHITE);
    oval(c, 5, -30, 5, 16, WHITE, true, -.25 + a.wave * .035);
    oval(c, 16, -30, 4.5, 15, WHITE, true, .2 - a.wave * .035);
    oval(c, 5, -32, 2, 10, "#eab6ac", false, -.25 + a.wave * .035);
    oval(c, 16, -32, 1.8, 9, "#eab6ac", false, .2 - a.wave * .035);
    oval(c, 11, -11, 13, 12, WHITE); oval(c, 19, -6, 5, 4, CREAM, false);
    eye(c, 15, -15, a.blink, false, false, a.mood); cheek(c, 16, -7);
    oval(c, 24, -9, 2.5, 2, "#bd7e77", false);
  }
  function pig(c, a) {
    line(c, INK, 4, p => { p.moveTo(-19, -8); p.bezierCurveTo(-33, -19, -31, -1, -24, -9); });
    line(c, "#e89f9c", 2, p => { p.moveTo(-19, -8); p.bezierCurveTo(-33, -19, -31, -1, -24, -9); });
    paws(c, a.step, "#d49290", true); oval(c, -3, -7, 21, 16, "#eaa8a2");
    oval(c, 12, -12, 14, 14, "#f2b8ac");
    shape(c, "#df9292", p => { p.moveTo(4, -22); p.lineTo(1, -32); p.quadraticCurveTo(15, -31, 14, -20); });
    oval(c, 23, -8, 8, 6, "#d8878d");
    oval(c, 21, -8, 1.4, 2, "#965f68", false); oval(c, 26, -8, 1.4, 2, "#965f68", false);
    eye(c, 17, -18, a.blink, false, false, a.mood); cheek(c, 11, -9, "#dc8c91");
    oval(c, -10, -17, 7, 3, "#f6c3b6", false, -.3);
  }
  function hoofed(c, a, species) {
    const cow = species === "cow", goat = species === "goat";
    const coat = cow ? WHITE : goat ? "#dbc39d" : "#9ca8a5";
    const shade = cow ? "#dfd6c6" : goat ? "#b89b77" : "#788985";
    line(c, INK, 2, p => { p.moveTo(-18, -7); p.quadraticCurveTo(-28 - a.wave * 2, -5, -25 - a.wave * 2, 5); });
    oval(c, -25 - a.wave * 2, 5, 3, 4, shade, false);
    paws(c, a.step, shade, true, true); oval(c, -3, -7, cow ? 22 : 18, 13, coat);
    if (cow) {
      oval(c, -11, -10, 8, 7, "#625950", false, -.5); oval(c, 4, -3, 5, 6, "#625950", false, .5);
    }
    if (species === "donkey") {
      oval(c, 9, -31, 4, 14, coat, true, -.17); oval(c, 19, -30, 4, 13, coat, true, .15);
      oval(c, 9, -33, 1.7, 8, "#d1aaa1", false, -.17); oval(c, 19, -31, 1.7, 8, "#d1aaa1", false, .15);
      line(c, INK, 4, p => { p.moveTo(3, -20); p.lineTo(8, -27); p.lineTo(12, -23); });
    } else {
      for (const x of [8, 20]) shape(c, "#d2b682", p => {
        p.moveTo(x - 3, -22); p.quadraticCurveTo(x - (goat ? 8 : 6), -37, x + 1, -33);
        p.lineTo(x + 2, -23);
      });
      oval(c, 3, -19, 7, 3.5, coat, true, .35); oval(c, 26, -19, 6, 3.5, coat, true, -.45);
    }
    oval(c, 15, -13, 11, 13, coat); oval(c, 21, -4, 10, 6.5, cow ? "#dba6a0" : "#e3d6bc");
    if (goat) shape(c, CREAM, p => { p.moveTo(16, 0); p.lineTo(19, 10); p.lineTo(24, 4); p.lineTo(25, -1); });
    eye(c, 19, -17, a.blink, false, false, a.mood); cheek(c, 13, -9);
    oval(c, 24, -5, 1.4, 1.7, INK, false);
    if (cow) oval(c, 17, -5, 1.4, 1.7, INK, false);
  }
  function pet(c, a, cat) {
    const coat = cat ? "#dc9b60" : "#c59b68", cream = "#fae5bd", dark = cat ? "#ae7048" : "#826344";
    c.save(); c.translate(-17, -4); c.rotate(a.wave * .1); c.translate(17, 4);
    line(c, INK, cat ? 7 : 8, p => { p.moveTo(-17, -4); p.bezierCurveTo(-33, -8, -18, -28, -29, -27); });
    line(c, coat, cat ? 4 : 5, p => { p.moveTo(-17, -4); p.bezierCurveTo(-33, -8, -18, -28, -29, -27); });
    c.restore();
    paws(c, a.step, cream); oval(c, -3, -5, 18, 12, coat);
    oval(c, 9, -3, 7, 8, cream, false);
    if (cat) {
      shape(c, coat, p => { p.moveTo(2, -17); p.lineTo(2, -33); p.lineTo(12, -26); p.lineTo(23, -32); p.lineTo(26, -17); });
      shape(c, "#d59988", p => { p.moveTo(5, -27); p.lineTo(5, -19); p.lineTo(11, -23); p.moveTo(19, -24); p.lineTo(22, -27); p.lineTo(23, -19); }, 0);
    }
    oval(c, 14, -15, 13, 12, coat);
    if (!cat) oval(c, 4, -20, 6, 11, dark, true, -.28 + a.wave * .06);
    oval(c, 21, -9, cat ? 6 : 8, 5, cream, false);
    eye(c, 20, -19, a.blink, false, false, a.mood); cheek(c, 13, -11);
    oval(c, cat ? 27 : 28, -11, cat ? 2.2 : 3.5, cat ? 1.8 : 2.8, cat ? "#af7771" : INK, false);
    if (cat) {
      line(c, dark, 2.5, p => { p.moveTo(12, -25); p.lineTo(14, -21); p.moveTo(17, -26); p.lineTo(18, -23); p.moveTo(-9, -15); p.lineTo(-7, -9); });
      line(c, INK, 1, p => { p.moveTo(23, -7); p.lineTo(32, -6); p.moveTo(22, -5); p.lineTo(30, -2); });
    } else {
      line(c, "#7a9e9d", 4, p => { p.moveTo(7, -3); p.quadraticCurveTo(14, 1, 21, -2); });
      oval(c, 16, 1, 2.3, 3, "#e7bc62", true);
    }
  }
  // A separate front/back silhouette keeps direction readable without rotating the artwork.
  function verticalBird(c, a, species, back) {
    const hen = species === "chicken", coat = hen ? CREAM : "#f4cf71", wing = hen ? WHITE : "#ffe7a5";
    birdFeet(c, a.step, a.hidden);
    shape(c, coat, p => { p.moveTo(-16, -15); p.bezierCurveTo(-25, 4, -14, 10, 0, 10); p.bezierCurveTo(16, 10, 25, 2, 16, -16); p.bezierCurveTo(15, -27, -14, -28, -16, -15); });
    if(hen) chickenClothes(c,a,true,back);
    for (const side of [-1, 1]) {
      c.save(); c.translate(side * 15, -16); c.rotate(side * (a.sprinting ? -.4 + a.wave * .45 : .1 + a.wave * .035));
      shape(c, hen && a.skin === "priest" ? "#444750" : hen && a.skin === "robocop" ? "#c7d4d3" : wing, p => { p.moveTo(0, 0); p.bezierCurveTo(side * 10, 0, side * 12, 17, side * 2, 17); p.quadraticCurveTo(-side * 3, 10, 0, 0); }); c.restore();
    }
    if (back && (!hen || a.skin === "classic")) {
      for (const side of [-1, 0, 1]) oval(c, side * 5, 0, 4.7, 10, hen ? SHADE : "#ffe7a5", true, side * -.36);
    }
    oval(c, 0, hen ? -27 : -24, hen ? 14 : 13, hen ? 15 : 13, coat);
    if (hen && a.skin !== "punk" && a.skin !== "robocop") shape(c, "#df7060", p => { p.moveTo(-7, -38); p.bezierCurveTo(-13, -49, -4, -51, -3, -43); p.bezierCurveTo(-2, -55, 8, -52, 6, -43); p.bezierCurveTo(13, -48, 15, -40, 8, -37); p.quadraticCurveTo(0, -41,-7,-38); });
    if (back) { line(c, hen ? "#d4bd94" : "#dcad4c", 1.4, p => { p.moveTo(-5, -17); p.quadraticCurveTo(0, -14, 5, -17); }); if(hen) chickenHeadwear(c,a,true,true); return; }
    if (hen) { oval(c, -2.7, -11, 3, 5, "#df7060"); oval(c, 2.7, -11, 3, 5, "#df7060"); }
    for (const side of [-1, 1]) { eye(c, side * 7, hen ? -29 : -26, a.blink, hen, false, a.mood, -side); cheek(c, side * 10, hen ? -20 : -18, "#ebac8b"); }
    shape(c, "#e9a547", p => { p.moveTo(hen ? -5 : -9, -21); p.quadraticCurveTo(0, -24, hen ? 5 : 9, -21); p.quadraticCurveTo(hen ? 4 : 10, -16, 0, hen ? -15 : -17); p.quadraticCurveTo(hen ? -4 : -10, -16, hen ? -5 : -9, -21); });
    line(c, "#bd813c", 1, p => { p.moveTo(-3, -19); p.quadraticCurveTo(0, -18, 3, -19); });
    if(hen) chickenHeadwear(c,a,true,false);
  }
  function verticalAnimal(c, a, species, back) {
    const wool = species === "sheep" || species === "lamb", cow = species === "cow", goat = species === "goat", donkey = species === "donkey", rabbit = species === "rabbit", pig = species === "pig", wolf = species === "wolf", cat = species === "cat", dog = species === "dog";
    const coat = wool ? CREAM : cow || rabbit ? WHITE : goat ? "#dbc39d" : donkey ? "#9eaca5" : pig ? "#edb0a8" : wolf ? "#819794" : cat ? "#dfa36c" : "#c9a576";
    const dark = wool ? species === "lamb" ? "#b99579" : "#7d6e60" : wolf ? "#637976" : pig ? "#d78e91" : "#9a7858";
    const cream = wolf ? "#e3e7d7" : "#f6e7cb";
    for (const side of [-1, 1]) { leg(c, side * 11, side * a.step, wool ? dark : coat, wool || cow || goat || donkey, true); }
    shape(c, coat, p => { p.moveTo(-15, -22); p.bezierCurveTo(-22, -14, -22, 7, -11, 9); p.quadraticCurveTo(0, 14, 12, 8); p.bezierCurveTo(23, 3, 21, -17, 13, -23); p.quadraticCurveTo(0, -31, -15, -22); });
    if (cow) { oval(c, -12, -8, 6, 8, "#716250", false, .4); oval(c, 10, -18, 7, 6, "#716250", false); }
    if (wool) shape(c, CREAM, p => { p.moveTo(-13,-25);p.bezierCurveTo(-23,-28,-27,-15,-20,-11);p.bezierCurveTo(-29,-6,-25,5,-18,5);p.bezierCurveTo(-19,14,-6,15,-2,9);p.bezierCurveTo(4,17,16,12,15,7);p.bezierCurveTo(28,10,29,-6,21,-9);p.bezierCurveTo(27,-18,17,-29,10,-24);p.quadraticCurveTo(0,-31,-13,-25); });
    if (!back && !pig && !wool) oval(c, 0, 0, 9, 8, cream, false);
    const headY = back ? -25 : -20;
    c.save(); c.translate(a.mood === "search" ? a.wave * 1.3 : 0, (a.mood === "sniff" ? 4 + a.wave : 0));
    for (const side of [-1, 1]) {
      if (rabbit || donkey) {
        const tilt = side * (.18 + a.wave * .028);
        oval(c, side * 8, headY - 17, rabbit ? 4.5 : 4, rabbit ? 14 : 13, coat, true, tilt);
        if (!back) oval(c, side * 8, headY - 18, 1.8, 8.5, "#dcb1a2", false, tilt);
      } else if (wolf || cat || pig) {
        shape(c, coat, p => { p.moveTo(side * 4, headY - 8); p.lineTo(side * (wolf ? 16 : 15), headY - (wolf ? 20 : 17) + a.wave * .7); p.quadraticCurveTo(side * 19, headY - 9, side * 15, headY + 1); });
        if (!back) shape(c, "#cfa496", p => { p.moveTo(side * 8, headY - 9); p.lineTo(side * 14, headY - 14); p.lineTo(side * 14, headY - 5); }, 0);
      } else {
        if (cow || goat) shape(c, "#d7bb86", p => { p.moveTo(side * 6, headY - 8); p.quadraticCurveTo(side * 17, headY - 22, side * 10, headY - 22); p.lineTo(side * 3, headY - 8); });
        oval(c, side * (dog ? 14 : 16), headY - (dog ? 0 : 5), dog ? 5.5 : 7, dog ? 12 : 4, dog || wool ? dark : coat, true, side * (dog ? -.2 : .25) + a.wave * .025);
      }
    }
    // A tapered cheek shape gives the face a muzzle rather than a round sticker.
    shape(c, wool ? dark : coat, p => {
      p.moveTo(-11, headY - 11); p.quadraticCurveTo(0, headY - 18, 12, headY - 10);
      if (wolf) { p.lineTo(16,headY-2);p.lineTo(20,headY+2);p.lineTo(15,headY+3);p.lineTo(18,headY+7);p.lineTo(12,headY+7);p.quadraticCurveTo(0,headY+20,-12,headY+7);p.lineTo(-18,headY+7);p.lineTo(-15,headY+3);p.lineTo(-20,headY+2);p.lineTo(-16,headY-2); }
      else { p.quadraticCurveTo(20, headY, 12, headY + 8); p.quadraticCurveTo(0, headY + 20, -12, headY + 8); p.quadraticCurveTo(-20, headY, -11, headY - 11); }
    });
    if (wool) for (const [x,y] of [[-8,-11],[0,-14],[8,-11]]) oval(c, x, headY + y, 6, 5, WHITE);
    if (back) {
      line(c, wool ? "#be9c7b" : "rgba(101,81,67,.25)", 1.4, p => { p.moveTo(-5, headY + 5); p.quadraticCurveTo(0, headY + 8, 5, headY + 5); });
    } else {
      for (const side of [-1, 1]) { eye(c, side * 7, headY - 2, a.blink, wolf, a.hurt, a.mood, -side); cheek(c, side * 11, headY + 4, pig ? "#db9292" : "#cfa796"); }
      if (pig || cow || donkey || goat) {
        oval(c, 0, headY + 10, pig ? 9 : 10, pig ? 6 : 6.5, pig ? "#dd9294" : cow ? "#dca9a0" : cream);
        oval(c, -3.5, headY + 10, 1.2, 1.6, INK, false); oval(c, 3.5, headY + 10, 1.2, 1.6, INK, false);
        if (goat) shape(c, CREAM, p => { p.moveTo(-4, headY + 15); p.lineTo(0, headY + 22); p.lineTo(5, headY + 15); });
      } else if (wolf) {
        shape(c, cream, p => { p.moveTo(-12,headY+3);p.lineTo(-6,headY+3);p.quadraticCurveTo(0,headY+7,6,headY+3);p.lineTo(12,headY+3);p.quadraticCurveTo(12,headY+13,0,headY+16);p.quadraticCurveTo(-12,headY+13,-12,headY+3); }, 0);
        oval(c,0,headY+8,4.6,3.3,INK,false); oval(c,-1,headY+6.8,1.7,.7,"#a7b0a2",false);
        if(!["angry","furious","crying"].includes(a.mood)) line(c,INK,1.1,p=>{p.moveTo(0,headY+11);p.lineTo(0,headY+13);p.quadraticCurveTo(4,headY+15,7,headY+11);});
      } else {
        oval(c, -3.5, headY + 8, 5.5, 4.5, wolf || dog ? cream : WHITE, false); oval(c, 3.5, headY + 8, 5.5, 4.5, wolf || dog ? cream : WHITE, false);
        shape(c, rabbit || cat ? "#bb867a" : INK, p => { p.moveTo(-3, headY + 5); p.quadraticCurveTo(0, headY + 3, 3, headY + 5); p.lineTo(0, headY + 8); }, 0);
        if(!["angry","furious","crying"].includes(a.mood)) line(c, INK, 1, p => { p.moveTo(0, headY + 8); p.lineTo(0, headY + 10); p.quadraticCurveTo(3, headY + 12, 5, headY + 9); });
      }
      if (wolf && a.mood === "alert") for (const side of [-1,1]) line(c, INK, 1.8, p => { p.moveTo(side * 3, headY - 8); p.lineTo(side * 10, headY - 10); });
      if (cat) { line(c, dark, 2, p => { p.moveTo(-4,headY-12);p.lineTo(-3,headY-7);p.moveTo(4,headY-12);p.lineTo(3,headY-7); }); for (const side of [-1,1]) line(c, INK, .8, p => { p.moveTo(side*10,headY+6);p.lineTo(side*20,headY+4);p.moveTo(side*10,headY+9);p.lineTo(side*19,headY+10); }); }
      if (dog) { line(c,"#789d94",3,p=>{p.moveTo(-8,headY+14);p.quadraticCurveTo(0,headY+18,8,headY+14);});oval(c,0,headY+18,2.1,2.6,"#e4b65e",false); }
    }
    c.restore();
    if (back) {
      if (rabbit || wool) oval(c, 0, 6, rabbit ? 6 : 4, rabbit ? 6 : 5, WHITE);
      else if (pig) { line(c, dark, 2.4, p => { p.moveTo(0,3);p.bezierCurveTo(11,-2,10,12,3,9);p.bezierCurveTo(-2,6,5,3,5,7); }); }
      else if (wolf) { shape(c, dark, p => { p.moveTo(-4,2);p.quadraticCurveTo(-10,15,5+a.wave,16);p.lineTo(17+a.wave,10);p.lineTo(11,5);p.quadraticCurveTo(8,10,4,1); }); shape(c,cream,p=>{p.moveTo(10,7);p.lineTo(17+a.wave,10);p.lineTo(9,15);p.lineTo(6,12);},0); }
      else if (cow) { oval(c, -10, 2, 5, 5, "#716250", false, .3);line(c,INK,2.3,p=>{p.moveTo(0,3);p.quadraticCurveTo(2,12,5,14);});oval(c,5,14,2.5,3.3,dark,false); }
      else { line(c, INK, cat || dog ? 5 : 3, p => { p.moveTo(0,3);p.bezierCurveTo(1,17,14+a.wave*2,15,12+a.wave*2,5); }); line(c, coat, cat || dog ? 3 : 1.6, p => { p.moveTo(0,3);p.bezierCurveTo(1,17,14+a.wave*2,15,12+a.wave*2,5); }); }
    }
  }
  function emotion(c, a, species, axial, back) {
    const angry = a.mood === "angry" || a.mood === "furious", crying = a.mood === "crying";
    if(!angry && !crying) return;
    const bird=species==="chicken"||species==="duck", baby=species==="chick", wolf=species==="wolf";
    const face = {chicken:[18,-31,30,-24],wolf:[23,-27,29,-12],duck:[17,-26,28,-20],sheep:[22,-14,23,-5],lamb:[22,-14,23,-5],pig:[17,-18,24,-1],rabbit:[15,-15,20,-3],goat:[19,-17,21,1],cow:[19,-17,21,1],donkey:[19,-17,21,1],dog:[20,-19,22,-4],cat:[20,-19,22,-4],chick:[7,-15,15,-10]}[species] || [20,-19,22,-4];
    const ex = axial ? 0 : face[0], ey = axial ? (baby?-14:species==="chicken"?-29:species==="duck"?-26:-22) : face[1];
    const lowMuzzle=["pig","cow","goat","donkey"].includes(species);
    const mx = axial ? 0 : face[2], my = axial ? (bird?-16:baby?-5:lowMuzzle?-2:-6) : face[3];
    if(angry) {
      if(!back) {
        if(!bird && !baby) {
          shape(c,wolf?"#653d36":"#806055",p=>{p.moveTo(mx-5,my+1);p.quadraticCurveTo(mx-1,my-4,mx+5,my);p.lineTo(mx+4,my+3);p.quadraticCurveTo(mx,my+1,mx-4,my+3);},1);
          if(wolf) { shape(c,WHITE,p=>{p.moveTo(mx-4,my);p.lineTo(mx+4,my);p.lineTo(mx+3,my+2);p.lineTo(mx-3,my+2);},0);line(c,INK,.8,p=>{p.moveTo(mx,my);p.lineTo(mx,my+2);}); }
        } else { line(c,"#a76036",1.7,p=>{p.moveTo(mx-3,my+1);p.lineTo(mx+3,my-1);}); }
        for(const sx of axial?[-1,1]:[1]) oval(c,axial?sx*12:ex-6,ey+8,3.2,1.7,"#ce806b",false);
      }
      const markX=axial?12:ex-10,markY=ey-13;
      line(c,"#d65a45",1.9,p=>{p.moveTo(markX-4,markY-4);p.lineTo(markX-1,markY-4);p.lineTo(markX-1,markY-1);p.moveTo(markX+2,markY-4);p.lineTo(markX+2,markY-1);p.lineTo(markX+5,markY-1);p.moveTo(markX-4,markY+2);p.lineTo(markX-1,markY+2);p.lineTo(markX-1,markY+5);p.moveTo(markX+2,markY+5);p.lineTo(markX+2,markY+2);p.lineTo(markX+5,markY+2);});
      if(a.mood==="furious" || back) for(const sx of [-1,1]) {
        const tx = axial ? sx*25 : ex+sx*22, ty=ey-2-a.wave*1.5;
        line(c,"rgba(108,79,59,.45)",3.8,p=>{p.moveTo(tx,ty);p.bezierCurveTo(tx+sx*7,ty-2,tx-sx*2,ty-8,tx+sx*5,ty-12);});
        line(c,"#fff7df",2.3,p=>{p.moveTo(tx,ty);p.bezierCurveTo(tx+sx*7,ty-2,tx-sx*2,ty-8,tx+sx*5,ty-12);});
      }
    } else {
      if(!back) { oval(c,mx,my+1,wolf?4.3:3.2,wolf?4.8:3.8,"#74443d");oval(c,mx,my+3,wolf?2.6:2,1.6,"#d68c8a",false); }
      for(const sx of [-1,1]) {
        const tx=axial?sx*17:ex+sx*11, ty=ey+3;
        line(c,"#73bedc",1.6,p=>{p.moveTo(tx,ty);p.quadraticCurveTo(tx+sx*10,ty-3,tx+sx*12,ty+8);});
        const fall=5+(a.anim*6+(sx+1)*4)%11;
        oval(c,tx+sx*12,ty+fall,2,3.6,"#8bd3e8",false,-sx*.2);oval(c,tx+sx*12-.5,ty+fall-1,.65,1.6,"#d8f4f9",false);
      }
    }
  }
  const speciesList = Object.freeze(["chicken", "wolf", "sheep", "pig", "goat", "cow", "duck", "rabbit", "dog", "cat", "donkey", "lamb", "chick"]);
  function draw(c, species, x, y, options = {}) {
    const { facing = 1, anim = 0, moving = false, hidden = false, mood = "normal", scale = 1, sprinting = false } = options;
    const blend = Math.max(0, Math.min(1, options.hideBlend ?? (hidden ? 1 : 0)));
    const wave = Math.sin(anim * (sprinting ? 2.15 : 1.8));
    const step = moving ? wave * (sprinting ? 3.9 : 2.8) * (1 - blend) : 0;
    const skin = ["punk","astronaut","robocop","priest"].includes(options.skin) ? options.skin : "classic";
    const a = { step, hidden: blend, mood, anim, skin, wave: moving ? wave : Math.sin(anim * .9), sprinting, hurt: mood === "hurt", blink: ((anim % 23) + 23) % 23 > 22.35 };
    const bob = (moving ? -Math.abs(wave) * (sprinting ? 2.6 : 1.8) : Math.sin(anim * .65) * .5) * (1 - blend);
    const direction = options.direction || (facing < 0 ? "left" : "right"), axial = direction === "up" || direction === "down";
    c.save(); c.translate(x, y); c.scale(scale, scale);
    c.lineCap = "round"; c.lineJoin = "round";
    oval(c, 0, 13, species === "wolf" ? 28 : species === "chicken" ? 21 : species === "chick" ? 13 : 20, species === "chick" ? 3.5 : 5, "rgba(46, 51, 31, .2)", false);
    c.translate(0, bob); c.scale(direction === "left" ? -1 : 1, 1);
    if (blend && species === "chicken") { c.translate(0, 13); c.scale(1 + blend * .07, 1 - blend * .3); c.translate(0, -13); }
    if (species === "lamb") { c.translate(0, 2); c.scale(.86, .86); }
    if(mood === "furious" || mood === "angry") c.translate(Math.sin(anim*9)*.4,0);
    if (species === "chick") chick(c,a,axial,direction === "up");
    else if (axial) {
      if (species === "chicken" || species === "duck") verticalBird(c, a, species, direction === "up");
      else verticalAnimal(c, a, species, direction === "up");
    }
    else if (species === "chicken") chicken(c, a);
    else if (species === "wolf") wolf(c, a);
    else if (species === "duck") duck(c, a);
    else if (species === "rabbit") rabbit(c, a);
    else if (species === "pig") pig(c, a);
    else if (species === "sheep" || species === "lamb") {
      sheep(c, a, species === "lamb");
    }
    else if (species === "cow" || species === "goat" || species === "donkey") hoofed(c, a, species);
    else pet(c, a, species === "cat");
    emotion(c,a,species,axial,direction === "up");
    c.restore();
  }
  return Object.freeze({ draw, species: speciesList });
})();
