/* PixelLab item atlas shared by ground loot and HUD; Canvas combat effects. */
const ShuffleFX=(() => {
  'use strict';
  const ink='#243c35',TAU=Math.PI*2;
  const itemCells={cornshot:[0,0],egg:[64,0],sickle:[128,0],boots:[0,64],milk:[64,64],xp:[128,64]};
  let itemSheet;
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
    if(kind==='xp'){icon(c,kind,x,y,22);return;}
    const phase=(reduced?0:time*2)+x*.03,bob=reduced?0:Math.sin(phase)*3;
    c.save();c.translate(Math.round(x),Math.round(y+bob));
    const glow=c.createRadialGradient(0,0,4,0,0,27);glow.addColorStop(0,'#fff4b74d');glow.addColorStop(1,'#fff4b700');c.fillStyle=glow;c.fillRect(-27,-27,54,54);
    icon(c,kind,0,0,48);
    for(let i=0;i<2;i++){const a=phase*.5+i*Math.PI;star(c,Math.cos(a)*21,Math.sin(a)*18,2.8,'#fff4cf');}
    c.restore();
  }
  function fusionIcon(c,recipe,x,y,size=36){
    c.save();c.translate(x,y);
    const glow=c.createRadialGradient(0,0,0,0,0,size*.55);glow.addColorStop(0,recipe.color+'80');glow.addColorStop(1,recipe.color+'00');
    c.fillStyle=glow;c.fillRect(-size,-size,size*2,size*2);
    c.strokeStyle=recipe.color;c.lineWidth=1.5;c.beginPath();c.arc(0,0,size*.43,0,TAU);c.stroke();
    icon(c,recipe.visual,0,0,size*.85);star(c,size*.33,-size*.33,size*.13,'#fff6cb');c.restore();
  }
  function field(c,f,time,reduced){
    c.save();c.translate(f.x,f.y);const radius=f.radius,t=1-f.time/f.duration,meteor=f.fusion==='meteor';
    c.globalAlpha=meteor?.8:Math.min(.75,f.time);c.strokeStyle=f.color;c.lineWidth=2;
    const glow=c.createRadialGradient(0,0,0,0,0,radius);glow.addColorStop(0,f.color+'38');glow.addColorStop(1,f.color+'00');
    c.fillStyle=glow;c.fillRect(-radius,-radius,radius*2,radius*2);
    c.beginPath();c.arc(0,0,meteor?radius*(1-t*.35):radius,0,TAU);c.stroke();
    if(meteor){
      c.setLineDash([5,8]);c.beginPath();c.arc(0,0,radius,0,TAU);c.stroke();c.setLineDash([]);
      path(c,[[-12,0],[12,0]],null,f.color,2);path(c,[[0,-12],[0,12]],null,f.color,2);
      const y=reduced?-24:-190*(1-t)-20;
      if(!reduced){path(c,[[0,y-60],[0,y]],null,f.color+'60',14);path(c,[[0,y-38],[0,y]],null,'#fff5cc',3);}
      icon(c,'carrot',0,y,42,-.4);
    }else{
      for(let i=0;i<(reduced?3:7);i++){
        const a=i*2.4+(reduced?0:time*.4),d=radius*(.25+(i%3)*.23),lift=reduced?0:(time*18+i*7)%28;
        oval(c,Math.cos(a)*d,Math.sin(a)*d-lift,4+i%3,5+i%3,f.color+'aa',0,'#4b7448');
      }
      icon(c,'water',0,-8,30);
    }c.restore();
  }
  function projectile(c,s,time,reduced){
    const visual=s.visual||s.kind,angle=Math.atan2(s.vy,s.vx),size=s.kind==='hero'?28:visual==='bark'||visual==='honk'?28:22;
    c.save();c.translate(s.x,s.y-10);c.rotate(angle);c.lineCap='round';
    if(!reduced){
      c.strokeStyle=s.color||'#fff0bd';
      for(let i=0;i<3;i++){c.globalAlpha=.28-i*.07;c.lineWidth=5-i;c.beginPath();c.moveTo(-9-i*9,(i-1)*4);c.lineTo(-21-i*9,(i-1)*4);c.stroke();}
      c.globalAlpha=1;
    }
    if(s.fusion){
      const glow=c.createRadialGradient(0,0,2,0,0,28);glow.addColorStop(0,s.color+'90');glow.addColorStop(1,s.color+'00');c.fillStyle=glow;c.fillRect(-28,-28,56,56);
      if(!reduced){
        path(c,[[-65,-2],[-25,-8],[4,0],[-25,8]],s.color+'45',null);
        for(let i=0;i<2;i++)star(c,-20-i*18,Math.sin(time*8+i*3)*7,4-i,s.color);
      }
      if(s.fusion==='reaper'){c.rotate(reduced?0:time*12);for(let i=0;i<2;i++){c.beginPath();c.arc(0,0,25-i*5,i*Math.PI,i*Math.PI+2);c.strokeStyle=i?s.color:'#f1fff5';c.lineWidth=3;c.stroke();}}
    }
    icon(c,visual==='egg'?'eggshot':visual,0,0,s.fusion?size*1.5:size,visual==='bark'||visual==='honk'?0:Math.PI/2);
    if(visual==='lightning'&&!reduced)star(c,-17,Math.sin(time*32)*7,4,'#dcfcff');
    c.restore();
  }
  function effect(c,e,reduced){
    const t=Math.max(0,Math.min(1,1-e.time/(e.duration||.55))),fade=1-t,visual=e.visual||e.kind;
    c.save();c.translate(e.x,e.y-10);c.lineCap='round';c.lineJoin='round';c.globalAlpha=fade;
    const color=e.color||'#b8eadd',radius=e.radius||38,reach=radius*(.25+.75*t);
    if(e.fusion){
      const glow=c.createRadialGradient(0,0,0,0,0,reach);glow.addColorStop(0,color+'60');glow.addColorStop(1,color+'00');c.fillStyle=glow;c.fillRect(-reach,-reach,reach*2,reach*2);
      for(let i=0;i<(reduced?1:3);i++){c.beginPath();c.arc(0,0,reach*(1-i*.19),0,TAU);c.lineWidth=i?2:4;c.strokeStyle=i?color:'#fff4d0';c.stroke();}
    }
    if(e.kind==='fusion'){
      const a=reduced?0:t*TAU,d=reduced?30:65*Math.max(0,1-t*2);
      e.ingredients.forEach((kind,i)=>icon(c,kind,Math.cos(a+i*Math.PI)*d,Math.sin(a+i*Math.PI)*d,36));
      if(t>.3||reduced)fusionIcon(c,e,0,0,48);
      if(!reduced)for(let i=0;i<10;i++){const a=i*TAU/10;star(c,Math.cos(a)*reach,Math.sin(a)*reach,6*fade,color);}
    }else if(e.toX!==undefined){
      const dx=e.toX-e.x,dy=e.toY-e.y,d=Math.hypot(dx,dy)||1;
      const points=Array.from({length:9},(_,i)=>{const bend=i&&i<8?(i%2?1:-1)*(reduced?4:10):0;return[dx*i/8-dy/d*bend,dy*i/8+dx/d*bend];});
      path(c,points,null,'#428bbc',8);path(c,points,null,'#b0efff',4);path(c,points,null,'#ffffff',1.4);
      star(c,dx,dy,12*fade,'#e6fbff');
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
  return Object.freeze({setItemSheet,icon,fusionIcon,field,loot,projectile,effect});
})();
