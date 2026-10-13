/* PixelLab item atlas shared by ground loot and HUD; Canvas combat effects. */
const ShuffleFX=(() => {
  'use strict';
  const ink='#243c35',TAU=Math.PI*2;
  const itemCells={cornshot:[0,0],egg:[64,0],sickle:[128,0],boots:[0,64],milk:[64,64],xp:[128,64]};
  const powerCells={feather:[0,0],lightning:[64,0],water:[128,0],carrot:[192,0],claw:[0,64],bark:[64,64],honk:[128,64],shield:[192,64]};
  let itemSheet,powerSheet,catalogSheet,catalogCells={};
  function setCatalogSheet(image,ids){
    if(image.width!==256||image.height!==640||ids.length!==40||new Set(ids).size!==40)throw Error('Atlas do catálogo com dimensões ou itens inválidos.');
    catalogSheet=image;catalogCells=Object.fromEntries(ids.map((id,i)=>[id,[i%4*64,Math.floor(i/4)*64]]));
  }
  function catalogIcon(c,id,x,y,size=36,angle=0){
    if(!catalogSheet||!Object.hasOwn(catalogCells,id)){icon(c,id,x,y,size,angle);return;}
    const [sx,sy]=catalogCells[id];c.save();c.translate(Math.round(x),Math.round(y));c.rotate(angle);c.imageSmoothingEnabled=false;
    c.drawImage(catalogSheet,sx,sy,64,64,-Math.round(size/2),-Math.round(size/2),Math.round(size),Math.round(size));c.restore();
  }
  function setPowerSheet(image){
    if(image.width!==256||image.height!==128)throw Error('Atlas dos poderes com dimensões inválidas.');
    powerSheet=image;
  }
  function setItemSheet(image){
    if(image.width!==192||image.height!==128)throw Error('Atlas dos itens com dimensões inválidas.');
    itemSheet=image;
  }
  function path(c,points,fill,stroke=ink,width=1.8){
    c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
    if(fill){c.closePath();c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
  }
  function oval(c,x,y,rx,ry,color,angle=0,stroke=ink){
    c.beginPath();c.ellipse(x,y,rx,ry,angle,0,TAU);c.fillStyle=color;c.fill();
    if(stroke){c.strokeStyle=stroke;c.lineWidth=1.5;c.stroke();}
  }
  function star(c,x,y,r,color){path(c,[[x,y-r],[x+r*.28,y-r*.28],[x+r,y],[x+r*.28,y+r*.28],[x,y+r],[x-r*.28,y+r*.28],[x-r,y],[x-r*.28,y-r*.28]],color,null);}
  function icon(c,kind,x,y,size=36,angle=0){
    if(powerSheet&&Object.hasOwn(powerCells,kind)){
      const [sx,sy]=powerCells[kind];c.save();c.translate(Math.round(x),Math.round(y));c.rotate(angle);c.imageSmoothingEnabled=false;
      c.drawImage(powerSheet,sx,sy,64,64,-Math.round(size/2),-Math.round(size/2),Math.round(size),Math.round(size));c.restore();return;
    }
    if(Object.hasOwn(itemCells,kind)){
      if(!itemSheet)return;
      const [sx,sy]=itemCells[kind];
      c.save();c.translate(Math.round(x),Math.round(y));c.rotate(angle);c.imageSmoothingEnabled=false;
      c.drawImage(itemSheet,sx,sy,64,64,-Math.round(size/2),-Math.round(size/2),Math.round(size),Math.round(size));c.restore();return;
    }
    c.save();c.translate(x,y);c.rotate(angle);c.scale(size/36,size/36);c.lineCap='round';c.lineJoin='round';
    if(kind==='eggshot'){
      c.beginPath();c.moveTo(0,-15);c.bezierCurveTo(8,-15,13,0,11,7);c.bezierCurveTo(8,19,-11,17,-11,5);c.bezierCurveTo(-12,-1,-7,-15,0,-15);
      c.fillStyle='#fff1ca';c.fill();c.strokeStyle=ink;c.lineWidth=2;c.stroke();
      oval(c,-3,-5,3,6,'#fffdf1',.25,null);
      path(c,[[-10,4],[-4,1],[-1,6],[4,2],[10,5]],null,'#b89463',1.4);
      oval(c,3,9,3,2,'#edbb67',0,null);
    }else if(kind==='feather'){
      c.beginPath();c.moveTo(-7,13);c.bezierCurveTo(-19,-4,9,-23,11,-11);c.bezierCurveTo(17,1,-1,11,-7,13);
      c.fillStyle='#f8f4ff';c.fill();c.strokeStyle='#707da8';c.lineWidth=1.6;c.stroke();
      path(c,[[-10,16],[7,-9]],null,'#899ac6',1.5);
      for(let i=0;i<3;i++)path(c,[[-6+i*4,9-i*6],[-7+i*4,2-i*6]],null,'#c5cce3',1);
    }else if(kind==='lightning'){
      path(c,[[3,-17],[-12,3],[-2,2],[-6,17],[14,-5],[3,-3],[9,-17]],'#7ce5ff','#285b80',2);
      path(c,[[3,-11],[-4,0],[3,-1],[-2,10],[8,-3],[1,-1]],null,'#f6ffff',2);
    }else if(kind==='water'){
      c.beginPath();c.moveTo(1,-17);c.bezierCurveTo(4,-7,15,0,11,10);c.bezierCurveTo(5,21,-12,15,-11,5);c.bezierCurveTo(-9,-4,-2,-8,1,-17);
      c.fillStyle='#69d9e9';c.fill();c.strokeStyle='#27556a';c.lineWidth=2;c.stroke();
      path(c,[[-5,0],[-7,5],[-5,9]],null,'#e5ffff',2.5);oval(c,6,10,2,2,'#b4faff',0,null);
    }else if(kind==='carrot'){
      path(c,[[-7,-8],[9,-4],[-6,17],[-10,15]],'#f9a13f');
      path(c,[[-6,-4],[2,-1],[-7,2],[-2,5]],null,'#ce642b',1.5);
      path(c,[[0,-6],[-8,-15],[-3,-16],[2,-11],[7,-17],[11,-14],[5,-7]],'#8bc86b');
      path(c,[[-5,-6],[-7,9]],null,'#ffe099',1.7);
    }else if(kind==='claw'){
      for(let i=-1;i<=1;i++){
        c.beginPath();c.moveTo(i*9+5,-14);c.quadraticCurveTo(i*9-10,-2,i*9-3,14);c.quadraticCurveTo(i*9-3,-1,i*9+5,-14);
        c.fillStyle=i===0?'#fff3ff':'#d3a1ed';c.fill();c.strokeStyle='#705589';c.lineWidth=1;c.stroke();
      }
    }else if(kind==='bark'||kind==='honk'){
      const color=kind==='bark'?'#ffd08b':'#d4f49b';
      for(let i=0;i<3;i++){
        c.beginPath();c.arc(-13,0,9+i*9,-.85,.85);c.strokeStyle=ink;c.lineWidth=5;c.stroke();c.strokeStyle=color;c.lineWidth=2.8;c.stroke();
      }
      if(kind==='bark'){oval(c,-9,0,4,5,color);for(const [dx,dy] of [[-13,-6],[-8,-8],[-3,-5]])oval(c,dx,dy,2,2,color);}
      else path(c,[[-16,-4],[-7,0],[-16,4]],'#ffcb69');

    }
    c.restore();
  }
  function loot(c,item,time,reduced){
    const {x,y,kind}=item;
    if(kind==='xp'){catalogIcon(c,kind,x,y,18);return;}
    const phase=(reduced?0:time*2)+x*.03,bob=reduced?0:Math.sin(phase);
    c.save();c.translate(Math.round(x),Math.round(y+bob));
    catalogIcon(c,kind,0,0,28);
    if(!reduced)star(c,10,-10,1.5,'#fff4cf');
    c.restore();
  }
  function hazard(c,h,time,reduced){
    c.save();c.translate(h.x,h.y);const waiting=h.arm>0;
    if(h.kind==='hoof'){
      c.globalAlpha=waiting?.65:Math.min(1,h.life);c.save();c.rotate((h.angle||0)-Math.PI/2);
      const pixels=[[-7,-8,5,3],[-10,-5,4,9],[-7,4,5,4],[-3,7,6,3],[2,4,5,4],[6,-5,4,9],[2,-8,5,3]];
      c.fillStyle=waiting?'#ffd38f':'#932d20';for(const [x,y,w,v]of pixels)c.fillRect(x,y,w,v);
      c.fillStyle=waiting?'#fff0c3':'#ffc55b';for(const [x,y,w,v]of pixels)c.fillRect(x+1,y+1,Math.max(2,w-2),Math.max(2,v-2));
      c.restore();
      if(!waiting)for(let i=0;i<3;i++){
        const x=(i-1)*8,lift=reduced?0:Math.floor((time*12+i*3)%5);
        path(c,[[x-4,-7],[x-2,-14-lift],[x+1,-11],[x+3,-18-lift],[x+5,-7]],'#f28135',null);
        c.fillStyle='#ffe390';c.fillRect(x,-12-lift,2,5);
      }
      c.restore();return;
    }
    const fire=h.kind==='fire',poison=h.kind==='poison';
    if(!waiting){
      c.fillStyle=fire?'#d4542555':poison?'#976db566':'#63894866';
      c.strokeStyle=fire?'#ffbd59':poison?'#ddb2ef':'#c5e19a';c.lineWidth=2;
      c.beginPath();c.arc(0,0,h.r,0,TAU);c.fill();c.stroke();
    }
    if(waiting){c.fillStyle='#fff1bd';c.font='bold 16px sans-serif';c.textAlign='center';c.fillText('!',0,5);}
    else if(poison){icon(c,'water',0,-4,25);for(let i=0;i<3;i++)oval(c,(i-1)*10,Math.sin(time*2+i)*4,3,3,'#ccb0ec',0,null);}
    else for(let i=0;i<3;i++){
      const x=(i-1)*10;c.strokeStyle=fire?'#ffe48a':'#d1e5a4';c.lineWidth=3;
      c.beginPath();c.moveTo(x-4,5);c.lineTo(x+2,-2);c.lineTo(x-2,-10);c.stroke();
    }
    c.restore();
  }
  function enemyShot(c,h,time,reduced){
    c.save();c.translate(h.x,h.y-Math.max(10,(h.lift||10)-(h.traveled||0)*.4));c.rotate(Math.atan2(h.vy,h.vx));
    if(h.kind==='fire'){
      const flicker=reduced?0:Math.floor(Math.sin(time*20+h.x)*2);
      path(c,[[12,0],[4,-8],[-5,-6],[-17-flicker,-10],[-12,-2],[-20-flicker,3],[-5,6],[4,8]],'#f68c36','#8b3825',2);
      path(c,[[8,0],[0,-4],[-10-flicker,-2],[-5,3],[0,4]],'#ffe58c',null);
    }else if(h.kind==='gust')icon(c,'honk',0,0,38);
    else if(h.kind==='claw')icon(c,'claw',0,0,35,Math.PI/2);
    else if(h.kind==='dirt'){
      c.fillStyle='#59442e';c.fillRect(-7,-6,14,12);c.fillStyle='#b19363';c.fillRect(-5,-5,10,6);c.fillRect(-3,1,6,4);
      c.fillStyle='#e0c086';c.fillRect(-4,-4,4,3);
    }else{c.fillStyle='#b788dc';c.strokeStyle='#f9e5ff';c.lineWidth=2;c.beginPath();c.arc(0,0,6,0,TAU);c.fill();c.stroke();}
    c.restore();
  }
  function fusionIcon(c,recipe,x,y,size=36){
    if(catalogSheet&&Object.hasOwn(catalogCells,'fusion-'+recipe.fusion)){catalogIcon(c,'fusion-'+recipe.fusion,x,y,size);return;}
    c.save();c.translate(x,y);
    icon(c,recipe.visual,-size*.1,-size*.06,size*.9);
    icon(c,recipe.accent,size*.26,size*.2,size*.48,-.2);c.restore();
  }
  function field(c,f,time,reduced){
    c.save();c.translate(f.x,f.y);const radius=f.radius,t=1-f.time/f.duration,meteor=f.fusion==='meteor';
    if(f.fusion==='blizzard'){
      const a=f.a||{x:f.x-radius,y:f.y},b=f.b||{x:f.x+radius,y:f.y};
      c.globalAlpha=Math.min(1,f.time*2);c.lineWidth=3;c.strokeStyle='#536589';
      c.beginPath();c.moveTo(a.x-f.x,a.y-f.y);c.lineTo(b.x-f.x,b.y-f.y);c.stroke();
      for(let i=0;i<=10;i++){const x=a.x+(b.x-a.x)*i/10-f.x,y=a.y+(b.y-a.y)*i/10-f.y;
        icon(c,'feather',x,y+7,28,reduced?0:Math.sin(time*3+i)*.12);}
      c.restore();return;
    }
    if(f.fusion==='solar'){
      icon(c,'eggshot',0,-16,32,.1);path(c,[[5,-29],[9,-36],[13,-35]],null,'#725036',2);
      star(c,13,-35,reduced?3:3+Math.sin(time*20), '#ffc65d');c.restore();return;
    }
    if(f.fusion==='storm'){
      c.globalAlpha=Math.min(.6,f.time);
      path(c,[[-radius*.9,0],[-radius*.65,-radius*.65],[-radius*.1,-radius*.9],[radius*.55,-radius*.7],
        [radius*.85,-radius*.1],[radius*.7,radius*.6],[0,radius*.85],[-radius*.6,radius*.6]],'#69c5db','#86e5ec',2);
      c.globalAlpha=Math.min(1,f.time*2);icon(c,'water',-12,0,28);icon(c,'lightning',12,-5,30);
      if(!reduced&&f.pulse>.45)path(c,[[-radius*.6,4],[-radius*.25,-5],[0,7],[radius*.4,-4],[radius*.7,2]],null,'#d5f7ff',2);
      c.restore();return;
    }
    c.globalAlpha=meteor?.8:Math.min(.75,f.time);c.strokeStyle=f.color;c.lineWidth=2;
    const glow=c.createRadialGradient(0,0,0,0,0,radius);glow.addColorStop(0,f.color+'38');glow.addColorStop(1,f.color+'00');
    c.fillStyle=glow;c.fillRect(-radius,-radius,radius*2,radius*2);
    c.beginPath();c.arc(0,0,meteor?radius*(1-t*.35):radius,0,TAU);c.stroke();
    if(meteor){
      for(let i=0;i<5;i++){const a=i*TAU/5;path(c,[[Math.cos(a)*radius,Math.sin(a)*radius],[Math.cos(a)*radius*.48,Math.sin(a)*radius*.48]],null,'#b37c48',3);}
      icon(c,'carrot',0,reduced?-8:18-t*32,42,Math.PI);
    }else{
      for(let i=0;i<(reduced?3:7);i++){
        const a=i*2.4+(reduced?0:time*.4),d=radius*(.25+(i%3)*.23),lift=reduced?0:(time*18+i*7)%28;
        oval(c,Math.cos(a)*d,Math.sin(a)*d-lift,4+i%3,5+i%3,f.color+'aa',0,'#4b7448');
      }
      icon(c,'water',0,-8,30);
    }c.restore();
  }
  function projectile(c,s,time,reduced){
    const visual=s.visual||s.kind,angle=Math.atan2(s.vy,s.vx),size=(s.kind==='hero'?25:visual==='bark'||visual==='honk'?26:22)+Math.max(0,(s.level||1)-1);
    c.save();c.translate(s.x,s.y-10);c.rotate(angle);c.lineCap='round';
    if(!reduced){
      c.strokeStyle=s.color||'#fff0bd';
      c.globalAlpha=.3;c.lineWidth=2;c.beginPath();c.moveTo(-9,0);c.lineTo(-19,0);c.stroke();
      c.globalAlpha=1;
    }
    if(s.fusion){
      if(s.fusion==='reaper'){c.rotate(reduced?0:time*12);for(let i=0;i<2;i++){c.beginPath();c.arc(0,0,25-i*5,i*Math.PI,i*Math.PI+2);c.strokeStyle=i?s.color:'#f1fff5';c.lineWidth=3;c.stroke();}}
      else if(s.fusion==='solar'){path(c,[[0,-10],[4,-19],[9,-18]],null,'#725036',2);star(c,9,-18,3,'#ffc65d');}
      else if(s.fusion==='popcorn'&&s.popped){for(const [x,y]of [[-6,-4],[1,-8],[5,0]])oval(c,x,y,5,5,'#fff1cc',0,'#9d763f');}
    }
    if(!(s.fusion==='popcorn'&&s.popped))icon(c,visual==='egg'?'eggshot':visual,0,0,s.fusion?size*1.5:size,visual==='bark'||visual==='honk'?0:Math.PI/2);
    if(s.level>=5)star(c,0,-size*.52,2.5,'#ffe295');
    if(visual==='lightning'&&!reduced)star(c,-17,Math.sin(time*32)*7,4,'#dcfcff');
    c.restore();
  }
  function effect(c,e,reduced){
    const t=Math.max(0,Math.min(1,1-e.time/(e.duration||.55))),fade=1-t,visual=e.visual||e.kind;
    c.save();c.translate(e.x,e.y-10);c.lineCap='round';c.lineJoin='round';c.globalAlpha=fade;
    const color=e.color||'#b8eadd',radius=e.radius||38,reach=radius*(.25+.75*t);
    if(e.kind==='fusion'){
      const a=reduced?0:t*TAU,d=reduced?30:65*Math.max(0,1-t*2);
      e.ingredients.forEach((kind,i)=>icon(c,kind,Math.cos(a+i*Math.PI)*d,Math.sin(a+i*Math.PI)*d,36));
      if(t>.3||reduced)fusionIcon(c,e,0,0,48);
      if(!reduced)for(let i=0;i<6;i++){const a=i*TAU/6;star(c,Math.cos(a)*reach,Math.sin(a)*reach,4*fade,color);}
    }else if(e.toX!==undefined){
      const dx=e.toX-e.x,dy=e.toY-e.y,d=Math.hypot(dx,dy)||1;
      const points=Array.from({length:9},(_,i)=>{const bend=i&&i<8?(i%2?1:-1)*(reduced?4:10):0;return[dx*i/8-dy/d*bend,dy*i/8+dx/d*bend];});
      path(c,points,null,'#428bbc',5);path(c,points,null,'#b0efff',2);path(c,points,null,'#ffffff',1);
      star(c,dx,dy,7*fade,'#e6fbff');
    }else if(e.kind==='collect'){
      icon(c,visual,0,-t*35,32*(1+t*.25));
      for(let i=0;i<6;i++){const a=i*TAU/6;star(c,Math.cos(a)*reach,Math.sin(a)*reach,4*fade,'#fff0a4');}
    }else if(e.kind==='sickle'){
      c.rotate(t*TAU);
      for(let i=0;i<3;i++){c.beginPath();c.arc(0,10,radius-i*5,-2.2+i*.15,.5);c.strokeStyle=i===0?'#f0fff2':color;c.lineWidth=6-i*2;c.stroke();}
      icon(c,'sickle',Math.cos(.5)*radius,10+Math.sin(.5)*radius,32,2);
    }else if(visual==='bark'||visual==='honk'){
      if(e.angle!==undefined)c.rotate(e.angle);
      for(let i=0;i<3;i++){
        c.beginPath();c.arc(0,0,reach*(1-i*.22),e.angle!==undefined?-.98:0,e.angle!==undefined?.98:TAU);
        c.strokeStyle=i===0?'#fff3c9':color;c.lineWidth=(4-i)*fade+1;c.stroke();
      }
      if(e.kind==='impact')icon(c,visual,0,0,24+20*t);
    }else{
      const count=reduced?4:visual==='feather'?12:8;
      if(visual==='egg'||visual==='carrot'){
        for(let i=0;i<5;i++){const a=i*TAU/5;oval(c,Math.cos(a)*reach*.3,Math.sin(a)*reach*.3,reach*.38,reach*.27,visual==='egg'?'#ffc95e':'#ffc582',a,null);}
      }
      for(let i=0;i<count;i++){
        const a=i*TAU/count+(visual==='feather'?t:0),x=Math.cos(a)*reach,y=Math.sin(a)*reach;
        if(['feather','carrot','water','lightning','claw'].includes(visual))icon(c,visual,x,y,(visual==='feather'?20:14)*(.6+fade*.4),a+t*2);
        else if(visual==='egg')path(c,[[x-4,y-4],[x+5,y-2],[x+2,y+5],[x-3,y+3]],'#fff5d7','#bc9a6e',1);
        else star(c,x,y,6*fade,color);
      }
      if(e.kind==='impact')star(c,0,0,12*fade,'#fffbea');
    }
    c.restore();
  }
  return Object.freeze({setItemSheet,setPowerSheet,setCatalogSheet,catalogIcon,icon,fusionIcon,field,loot,hazard,enemyShot,projectile,effect});
})();
