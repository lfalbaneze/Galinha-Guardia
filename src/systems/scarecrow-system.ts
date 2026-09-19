/* One interactive flock at the cornfield; its birds never join the rescue roster. */
const ScarecrowSystem = (() => {
  const places=new WeakMap<Farm.Layout,Farm.Point|null>();
  const perches=[{x:-4,z:108},{x:-37,z:68},{x:37,z:68}];
  const overlap=(a:Farm.Rect,b:Farm.Rect,gap=0)=>a.x<b.x+b.w+gap&&a.x+a.w+gap>b.x&&
    a.y<b.y+b.h+gap&&a.y+a.h+gap>b.y;
  function location(layout:Farm.Layout|undefined):Farm.Point|null {
    if(!layout)return null;
    if(places.has(layout))return places.get(layout)!;
    const area=layout.areas.find(a=>a.id==='granja');
    if(!area){places.set(layout,null);return null;}
    const corn=layout.plots?.find(p=>p.kind==='corn')||area;
    const preferred={x:corn.x+corn.w*.7,y:corn.y+corn.h+142};
    const occupied:Farm.Rect[]=[...FarmArt.getProps(layout).filter(p=>p.type!=='corn').map(p=>FarmDetails.shape(p)),
      layout.structures.pond,...(layout.paths||[]),...(layout.lanes||[]),
      ...(layout.plots||[]).map(p=>({...p,y:p.y-(p.kind==='corn'?64:0),h:p.h+(p.kind==='corn'?64:0)})),
      ...[layout.start,...layout.animalSpawns,...layout.chickSpawns].map(p=>({x:p.x-50,y:p.y-50,w:100,h:100}))];
    let best:Farm.Point|null=null,score=Infinity;
    for(const margin of [90,300]){
      for(let y=Math.max(158,area.y-margin);y<Math.min(WORLD.height-50,area.y+area.h+margin);y+=24)
        for(let x=Math.max(70,area.x-margin);x<Math.min(WORLD.width-70,area.x+area.w+margin);x+=24){
          const box={x:x-61,y:y-142,w:122,h:150};
          if(occupied.some(r=>overlap(box,r,10)))continue;
          const value=Math.hypot(x-preferred.x,y-preferred.y);
          if(value<score){score=value;best={x,y};}
        }
      if(best)break;
    }
    places.set(layout,best);return best;
  }
  function obstacles(layout:Farm.Layout|undefined):Farm.Obstacle[]{
    const p=location(layout);
    return p?[{x:p.x-5,y:p.y-4,w:10,h:10,type:'scarecrow-post',opaque:false}]:[];
  }
  function initialize(game:Farm.GameState):void {
    const p=location(WORLD.layout);
    if(!p){game.scarecrow=undefined;return;}
    game.scarecrow={...p,mode:'perched',clock:0,quiet:0,flights:0,birds:perches.map((perch,index)=>{
      const point={x:p.x+perch.x,y:p.y,z:perch.z};
      return {...point,from:{...point},target:{...point},delay:0,duration:2,progress:0,
        flying:false,left:index===2,opacity:1,startOpacity:1};
    })};
  }
  function near(game:Farm.GameState,range:number):boolean {
    const s=game.scarecrow!,c=game.entities.chicken;
    return !c.hidden&&distance(c,s)<range&&DetectionSystem.hasLineOfSight(getHitbox(c),s);
  }
  function flee(game:Farm.GameState):void {
    const s=game.scarecrow!,c=game.entities.chicken;
    const angle=Math.atan2(s.y-c.y,s.x-c.x);
    s.mode='fleeing';s.flights++;s.quiet=0;
    for(const [i,b] of s.birds.entries()){
      const direction=angle+(i-1)*.48;
      b.from={x:b.x,y:b.y,z:b.z};
      b.target={x:clamp(b.x+Math.cos(direction)*(330+i*25),55,WORLD.width-55),
        y:clamp(b.y+Math.sin(direction)*(330+i*25),55,WORLD.height-55),z:165+i*14};
      b.delay=i*.13;b.duration=2+i*.15;b.progress=0;b.startOpacity=b.opacity;
      b.left=b.target.x<b.x;
    }
  }
  function returnHome(s:Farm.Scarecrow):void {
    s.mode='returning';
    for(const [i,b] of s.birds.entries()){
      b.from={x:b.x,y:b.y,z:b.z};b.target={x:s.x+perches[i].x,y:s.y,z:perches[i].z};
      b.delay=i*.18;b.duration=2.5;b.progress=0;b.left=b.target.x<b.x;b.flying=true;
    }
  }
  function update(game:Farm.GameState,dt:number):void {
    const s=game.scarecrow;
    if(!s||game.phase!=='playing'||game.lake?.active||!Number.isFinite(dt)||dt<=0)return;
    const step=Math.min(dt,.1);s.clock+=step;
    if((s.mode==='perched'||s.mode==='returning')&&near(game,game.entities.chicken.sprinting?195:145))flee(game);
    if(s.mode==='perched')return;
    if(s.mode==='away'){
      s.quiet=near(game,235)?0:s.quiet+step;
      if(s.quiet>=7)returnHome(s);
      return;
    }
    const returning=s.mode==='returning';
    for(const b of s.birds){
      b.progress+=step;
      const t=clamp((b.progress-b.delay)/b.duration,0,1),ease=t*t*(3-2*t);
      b.flying=returning?t<1:b.progress>b.delay;
      b.x=lerp(b.from.x,b.target.x,ease);b.y=lerp(b.from.y,b.target.y,ease);
      b.z=lerp(b.from.z,b.target.z,ease)+Math.sin(Math.PI*t)*35;
      b.opacity=returning?Math.min(1,t/.2):Math.min(1,b.startOpacity+t*2,(1-t)/.22);
    }
    if(s.birds.every(b=>b.progress>=b.duration+b.delay)){
      s.mode=returning?'perched':'away';s.quiet=0;
      if(returning)for(const b of s.birds){b.flying=false;b.opacity=1;}
    }
  }
  function drawPost(game:Farm.GameState):void {
    const s=game.scarecrow;if(!s)return;
    ScarecrowArt.drawPost(ctx,s,camera);
    if(s.mode!=='away')for(const [i,b] of s.birds.entries())if(!b.flying)ScarecrowArt.drawCrow(ctx,b,i,s.clock,camera);
  }
  function drawFlying(game:Farm.GameState):void {
    const s=game.scarecrow;if(!s||s.mode==='away')return;
    for(const [i,b] of s.birds.entries())if(b.flying)ScarecrowArt.drawCrow(ctx,b,i,s.clock,camera);
  }
  function drawShadows(game:Farm.GameState):void {
    const s=game.scarecrow;if(!s||s.mode==='away')return;
    ctx.save();ctx.fillStyle='#293624';
    for(const b of s.birds)if(b.flying&&b.opacity>0){
      ctx.globalAlpha=.14*b.opacity;ctx.beginPath();
      ctx.ellipse(b.x-camera.x+(camera.shakeX||0),b.y-camera.y+(camera.shakeY||0),10,3,0,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  return {location,obstacles,initialize,update,drawPost,drawFlying,drawShadows};
})();
