/* A planted clearing and a physical wolf ambush; old farm layouts keep their saved geometry. */
const SunflowerSystem = (() => {
  type Plot = Farm.Rect & {id:string;kind:'sunflower';areaId:string};
  type Plant = Farm.Rect & {id:string;type:string;depth:number;variant:number;name?:string};
  type Mode = 'none'|'approach'|'hidden'|'warning'|'dash'|'recover';
  type Ambush = {layout:Farm.Layout;mode:Mode;cooldown:number;timer:number;elapsed:number;target:Farm.Point;origin:Farm.Point;heading:number};
  const fields=new WeakMap<Farm.Layout,{plot:Plot|null;props:Plant[]}>();
  const ambushes=new WeakMap<Farm.GameState,Ambush>();
  const overlap=(a:Farm.Rect,b:Farm.Rect,gap=0):boolean=>a.x<b.x+b.w+gap&&a.x+a.w+gap>b.x&&a.y<b.y+b.h+gap&&a.y+a.h+gap>b.y;
  const gap=(p:Farm.Point,r:Farm.Rect):number=>Math.hypot(p.x-clamp(p.x,r.x,r.x+r.w),p.y-clamp(p.y,r.y,r.y+r.h));
  function field(layout:Farm.Layout=WORLD.layout):{plot:Plot|null;props:Plant[]} {
    const cached=fields.get(layout);if(cached)return cached;
    const s=layout.structures,occupied:Farm.Rect[]=[s.pond,...(layout.plots||[]),...(layout.clearings||[])];
    for(const [items,type] of [[s.coops,'coop'],[s.silos,'silo'],[s.hayBales,'hay'],[s.stables||[],'stable'],
      [s.troughs||[],'trough'],[s.paddockFences||[],'paddock-fence'],[[s.barn],'barn']] as [Farm.Rect[],string][])
      for(const p of items)occupied.push(FarmDetails.shape({...p,type}));
    for(const p of layout.vegetation)occupied.push(FarmDetails.shape(p));
    for(const h of layout.habitats||[])occupied.push({x:h.x-125,y:h.y-94,w:250,h:188});
    const tracks=[...layout.paths,...(layout.lanes||[])];
    const anchors=[layout.start,...layout.animalSpawns,...layout.chickSpawns];
    const area=layout.areas.find(a=>a.id==='granja')||layout.areas[0];
    const preferred=area?{x:area.x+area.w/2,y:area.y+area.h/2}:layout.start;
    let plot:Plot|null=null;
    for(const [w,h] of [[276,228],[240,200],[204,176]]){
      let best=Infinity;
      for(let y=96;y+h<WORLD.height-60;y+=40)for(let x=60;x+w<WORLD.width-60;x+=40){
        const r={x,y,w,h},center={x:x+w/2,y:y+h*.64};
        if(distance(center,layout.start)<510||occupied.some(p=>overlap(r,p,18))||
          tracks.some(p=>overlap(r,p,20))||anchors.some(p=>gap(p,r)<76))continue;
        const roadGap=Math.min(...tracks.map(p=>gap(center,p)));
        if(roadGap>340)continue;
        const score=roadGap*2+distance(center,preferred)*.45;
        if(score<best){best=score;plot={...r,id:'sunflower-field',kind:'sunflower',areaId:area?.id||'granja'};}
      }
      if(plot)break;
    }
    const props:Plant[]=[],bed=plot as Plot|null;
    if(bed){
      props.push({...bed,type:'sunflower-bed',depth:bed.y,variant:0});
      let row=0;
      for(let y=bed.y+82;y<bed.y+bed.h-32;y+=27,row++)
        for(let x=bed.x+19+(row%2)*8;x<bed.x+bed.w-15;x+=28){
          const variant=(row+Math.floor(x/28))%3;
          props.push({x,y,w:28,h:1,depth:y+15,type:'sunflower',id:`sunflower-${x}-${y}`,variant});
        }
      props.push({x:bed.x+bed.w/2-61,y:bed.y+bed.h-40,w:122,h:40,depth:bed.y+bed.h,
        type:'sunflower-sign',id:'sunflower-sign',variant:0,name:'GIRASSÓIS'});
    }
    const result={plot:bed,props};fields.set(layout,result);return result;
  }
  const plot=(layout:Farm.Layout=WORLD.layout):Plot|null=>field(layout).plot;
  function contains(p:Farm.Point):boolean {
    const r=plot();return !!r&&p.x>r.x+12&&p.x<r.x+r.w-12&&p.y>r.y+58&&p.y<r.y+r.h-20;
  }
  function reset(game:Farm.GameState,cooldown=7):void {
    ambushes.set(game,{layout:WORLD.layout,mode:'none',cooldown,timer:0,elapsed:0,target:{x:0,y:0},origin:{x:0,y:0},heading:0});
  }
  function data(game:Farm.GameState):Ambush {
    if(ambushes.get(game)?.layout!==WORLD.layout)reset(game);
    return ambushes.get(game)!;
  }
  function mode(game:Farm.GameState):Mode {
    const a=ambushes.get(game);
    return game.phase==='playing'&&!game.lake?.active&&a?.layout===WORLD.layout?a.mode:'none';
  }
  const concealed=(game:Farm.GameState):boolean=>['hidden','warning'].includes(mode(game));
  const canCatch=(game:Farm.GameState):boolean=>['none','approach','dash'].includes(mode(game));
  function cancel(game:Farm.GameState):void {
    const a=data(game);if(a.mode==='none')return;
    a.mode='none';a.cooldown=16;game.entities.wolf.route=[];game.entities.wolf.routeTimer=0;
  }
  function stop(wolf:Farm.Wolf,dt:number):void {
    wolf.vx=0;wolf.vy=0;wolf.moveSpeed=0;wolf.moving=false;wolf.state='idle';wolf.anim+=dt*2;
  }
  function updateWolf(game:Farm.GameState,dt:number,config:Farm.WolfConfig):boolean {
    const a=data(game),wolf=game.entities.wolf,chicken=game.entities.chicken;
    if(game.phase!=='playing'||game.lake?.active||!Number.isFinite(dt)||dt<=0)return false;
    a.cooldown=Math.max(0,a.cooldown-dt);
    if(wolf.mode==='frightened'||wolf.mode==='inspect'||wolf.pauseTimer>0||wolf.huntUnlockTimer>0){cancel(game);return false;}
    const bed=plot();if(!bed){cancel(game);return false;}
    const hide={x:bed.x+bed.w*.5,y:bed.y+bed.h*.63};
    if(a.mode==='none'){
      if(a.cooldown>0||wolf.mode!=='patrol'||distance(wolf,hide)>900||DetectionSystem.canSee(wolf,chicken,config))return false;
      if(!WolfAI.findPath(wolf,hide).length){a.cooldown=4;return false;}
      a.mode='approach';a.timer=14;a.target=hide;
      wolf.route=[];wolf.routeTimer=0;
    }
    a.timer=Math.max(0,a.timer-dt);a.elapsed+=dt;
    if(a.mode==='approach'){
      if(DetectionSystem.canSee(wolf,chicken,config)||a.timer===0){cancel(game);return false;}
      if(WolfAI.moveTo(wolf,a.target,config.patrolSpeed,dt)){
        a.mode='hidden';a.timer=12;a.elapsed=0;stop(wolf,dt);
        const roads=[...WORLD.layout.paths,...(WORLD.layout.lanes||[])];
        const edge=roads.map(r=>({x:clamp(wolf.x,r.x,r.x+r.w),y:clamp(wolf.y,r.y,r.y+r.h)}))
          .sort((p,q)=>distance(wolf,p)-distance(wolf,q))[0]||{x:wolf.x,y:wolf.y+100};
        a.heading=Math.atan2(edge.y-wolf.y,edge.x-wolf.x);wolf.heading=a.heading;wolf.speechTime=0;
      }
      return true;
    }
    if(a.mode==='hidden'){
      stop(wolf,dt);wolf.heading=a.heading+Math.sin(a.elapsed*.7)*.8;
      if(chicken.invulnerable<=0&&DetectionSystem.canSee(wolf,chicken,{...config,range:235,fov:Math.PI*1.2})){
        const dx=chicken.x-wolf.x,dy=chicken.y-wolf.y,length=Math.hypot(dx,dy)||1;
        a.origin={x:wolf.x,y:wolf.y};a.target={x:wolf.x+dx/length*Math.min(255,length+42),y:wolf.y+dy/length*Math.min(255,length+42)};
        a.mode='warning';a.timer=game.difficultyKey==='easy'?1.4:game.difficultyKey==='hard'?.95:1.15;
        wolf.lastKnown={x:chicken.x,y:chicken.y};wolf.heading=Math.atan2(dy,dx);Player.face(wolf,dx,dy);
        AudioSystem.play('fox-rustle',{volume:.6});
        if(WildlifeRules.onScreen(wolf,90))setStatus('Tem focinho nos girassóis! Saia para o lado da faixa antes do bote!');
      }else if(a.timer===0)cancel(game);
      return true;
    }
    if(a.mode==='warning'){
      stop(wolf,dt);
      if(a.timer===0){a.mode='dash';a.timer=1;wolf.mode='chase';}
      return true;
    }
    if(a.mode==='dash'){
      const before={x:wolf.x,y:wolf.y};
      const result=Player.checkCatch(game)?'hit':WildlifeRules.move(wolf,a.target,game.settings.chickenSpeed*1.55*dt,()=>Player.checkCatch(game));
      wolf.vx=(wolf.x-before.x)/dt;wolf.vy=(wolf.y-before.y)/dt;wolf.moving=distance(before,wolf)>.01;wolf.anim+=dt*14;
      if(result!=='moving'||a.timer===0){a.mode='recover';a.timer=1.2;stop(wolf,0);}
      return true;
    }
    stop(wolf,dt);
    if(a.timer===0)cancel(game);
    return true;
  }
  function drawGround(c:CanvasRenderingContext2D,layout:Farm.Layout):void {
    const p=plot(layout);if(!p)return;
    FarmDetails.drawRows(c,p,82,27,32);
  }
  function drawPlant(c:CanvasRenderingContext2D,p:Plant,game?:Farm.GameState):void {
    if(typeof Sunlight!=='undefined')Sunlight.native(c,`sunflower/${p.variant}`,
      {x:p.x-20,y:p.y-94,w:40,h:98},p.y+2,out=>drawPlant(out,p));
    c.save();
    if(game)EnvironmentSystem.transform(c,p,game);
    const a=game?ambushes.get(game):null;
    const shaking=a?.mode==='warning'&&distance(p,game!.entities.wolf)<105;
    const reduced=InterfaceMotion.reduced;
    const sway=reduced?0:Math.sin((game?.elapsed||0)*(shaking?23:2)+p.x*.07+p.y*.03)*(shaking?.11:.025);
    c.translate(p.x,p.y);c.transform(1,0,sway,1,0,0);
    const h=61+p.variant*6;
    c.lineJoin='round';c.lineCap='round';
    c.fillStyle='#33442640';c.fillRect(-3,0,7,2);
    c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(3,-h*.5,0,-h);
    c.strokeStyle='#382919';c.lineWidth=4;c.stroke();c.strokeStyle='#8caf40';c.lineWidth=2;c.stroke();
    for(const [y,s]of [[-18,-1],[-33,1],[-46,-1]]) {
      c.beginPath();c.moveTo(0,y+5);c.quadraticCurveTo(s*5,y-11,s*15,y-9);
      c.quadraticCurveTo(s*16,y+1,0,y+5);c.fillStyle=s<0?'#78a237':'#a0bf43';c.fill();
      c.strokeStyle='#382919';c.lineWidth=1.5;c.stroke();
      c.beginPath();c.moveTo(0,y+4);c.lineTo(s*11,y-5);c.strokeStyle='#c7d86b';c.lineWidth=1;c.stroke();
    }
    c.translate(0,-h);
    // Rounded petals replace square tiles; the dark seed head remains readable in a dense row.
    for(let i=0;i<10;i++) {
      const angle=i*Math.PI/5+p.variant*.08;
      c.save();c.rotate(angle);c.beginPath();c.ellipse(0,-11.5,4.5,6,0,0,Math.PI*2);
      c.fillStyle=i<5?'#ffd65b':'#edb538';c.fill();c.strokeStyle='#6b421c';c.lineWidth=1.5;c.stroke();
      c.beginPath();c.moveTo(0,-15);c.lineTo(0,-12);c.strokeStyle='#ffed9c';c.lineWidth=1.5;c.stroke();c.restore();
    }
    c.beginPath();c.arc(0,0,8.5,0,Math.PI*2);c.fillStyle='#92572e';c.fill();c.strokeStyle='#382919';c.lineWidth=2;c.stroke();
    c.beginPath();c.ellipse(-2,-2.5,4.5,3,0,0,Math.PI*2);c.fillStyle='#ba7b3a';c.fill();
    for(const [x,y]of [[-3,-2],[2,-3],[4,1],[-1,2],[-3,5],[2,5]]) {
      c.fillStyle='#51351e';c.fillRect(x,y,1.5,1.5);
    }
    c.restore();
  }
  function drawWarning(game:Farm.GameState):void {
    const a=ambushes.get(game);if(mode(game)!=='warning'||!a)return;
    const from=worldToScreen(a.origin),to=worldToScreen(a.target);
    ctx.save();ctx.strokeStyle='#d17a4c55';ctx.lineWidth=2*(game.entities.wolf.hitbox.r+game.entities.chicken.hitbox.r);
    ctx.beginPath();ctx.moveTo(from.x,from.y+10);ctx.lineTo(to.x,to.y+10);ctx.stroke();
    ctx.strokeStyle='#ffb35e';ctx.lineWidth=3;ctx.setLineDash([8,6]);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#4a3827';ctx.fillRect(from.x-9,from.y-92,18,29);ctx.fillStyle='#ffe593';
    ctx.fillRect(from.x-3,from.y-87,6,13);ctx.fillRect(from.x-3,from.y-70,6,4);
    // Two eyes are visible through the moving flowers; the body stays concealed until the leap.
    ctx.fillStyle='#ffe78b';ctx.fillRect(from.x-9,from.y-35,5,3);ctx.fillRect(from.x+4,from.y-35,5,3);
    ctx.restore();
  }
  return {plot,props:(layout:Farm.Layout)=>field(layout).props,contains,reset,cancel,mode,concealed,canCatch,updateWolf,drawGround,drawPlant,drawWarning};
})();
