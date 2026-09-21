/* Four named limbs share a fixed skeleton; the illustrated body never changes
   anatomy between gait frames. Contact/swing phases are separate for each foot. */
const CharacterRig = (() => {
  const directions=['right','downright','down','downleft','left','upleft','up','upright'];
  const moods=['normal','happy','scared','angry','sad'];
  const wrap=v=>((v%1)+1)%1;
  const ease=t=>t*t*(3-2*t);
  const mix=(a,b,t)=>a+(b-a)*t;
  const identities=[['left-hind',-1,-1,0],['left-fore',1,-1,.25],['right-hind',-1,1,.5],['right-fore',1,1,.75]];
  function pose(rig,direction,phase,moving=true){
    const angle=Math.max(0,directions.indexOf(direction))*Math.PI/4;
    const f={x:Math.cos(angle),y:Math.sin(angle)*.52},s={x:-Math.sin(angle),y:Math.cos(angle)*.52};
    const length=rig.length,span=rig.span,leg=rig.leg,reach=rig.stride||leg*.7;
    const anchors=identities.map(([id,end,side,offset])=>({id,end,side,offset,
      x:f.x*length*end+s.x*span*side*(end<0?1.2:.88),
      y:f.y*length*end+s.y*span*side}));
    const depth=Math.max(...anchors.map(a=>a.y));
    return anchors.map(a=>{
      const p=wrap(phase+a.offset),swing=p>.64,u=swing?(p-.64)/.36:p/.64;
      const sweep=moving?(swing?mix(-reach/2,reach/2,ease(u)):mix(reach/2,-reach/2,u)):0;
      const lift=moving&&swing?Math.sin(u*Math.PI)*(rig.lift||leg*.42):0;
      const hip={x:a.x,y:14+a.y-depth-leg};
      const foot={x:a.x+f.x*sweep,y:14+a.y-depth+f.y*sweep-lift};
      // Fore elbows flex back; rear hocks flex forward. The two segments retain length visually.
      const bend=(a.end>0?-1:1)*(leg*.16+(swing?Math.sin(u*Math.PI)*leg*.2:0));
      const joint={x:mix(hip.x,foot.x,.54)+f.x*bend,y:mix(hip.y,foot.y,.54)-Math.abs(bend)*.35};
      return {...a,hip,joint,foot,contact:!moving||!swing};
    }).sort((a,b)=>a.y-b.y);
  }
  function limb(c,rig,p){
    const far=p.y<0,stroke=rig.outline||'#39281e',color=far?(rig.far||rig.coat):rig.coat;
    const width=rig.limbWidth||3.6;
    c.lineCap='round';c.lineJoin='round';
    c.beginPath();c.moveTo(p.hip.x,p.hip.y);c.quadraticCurveTo(p.joint.x,p.joint.y,p.foot.x,p.foot.y-1.3);
    c.strokeStyle=stroke;c.lineWidth=width+1.7;c.stroke();c.strokeStyle=color;c.lineWidth=width;c.stroke();
    const hoof=rig.foot==='hoof',fw=rig.footWidth||width*1.8,fh=rig.footHeight||3.7;
    c.fillStyle=hoof?(far?'#343034':'#494044'):(far?rig.farFoot||rig.paw:rig.paw);c.strokeStyle=stroke;c.lineWidth=1.05;
    c.beginPath();c.ellipse(p.foot.x,p.foot.y-fw*.04,fw/2,fh/2,0,0,Math.PI*2);c.fill();c.stroke();
    if(hoof){c.beginPath();c.moveTo(p.foot.x,p.foot.y+fh*.1);c.lineTo(p.foot.x+.3,p.foot.y+fh*.42);c.stroke();}
    else if(fw>5){c.lineWidth=.6;for(const side of [-1,1]){c.beginPath();c.moveTo(p.foot.x+side*fw*.16,p.foot.y+.1);c.lineTo(p.foot.x+side*fw*.16,p.foot.y+fh*.24);c.stroke();}}
  }
  function draw(c,image,rig,x,y,options={}){
    const direction=options.direction||'down',row=rig.views[direction];if(!row)return false;
    const mood=options.mood==='crying'?'sad':options.mood==='furious'?'angry':options.mood||'normal';
    const frame=row.frames[Math.max(0,moods.indexOf(mood))],scale=options.scale||1;
    const limbs=pose(rig,direction,(options.anim||0)/4,options.moving!==false);
    c.save();c.translate(x,y);c.scale(scale,scale);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
    if(options.shadow!==false){c.fillStyle='#26332430';c.beginPath();c.ellipse(0,12,rig.length+rig.span,4,0,0,Math.PI*2);c.fill();}
    for(const p of limbs)limb(c,rig,p);
    // Every attachment extends inside the opaque belly, so the ink seam is covered.
    c.save();if(row.flip)c.scale(-1,1);
    c.drawImage(image,frame.x,frame.y,frame.w,frame.h,frame.left,frame.top,frame.dw,frame.dh);c.restore();
    c.restore();return true;
  }
  return {draw,pose,moods,directions};
})();
