/* Thor is an occasional visitor, independent of rescue progress and difficulty. */
const ThorSystem = (() => {
  const HITBOX: Farm.Hitbox = {ox:0,oy:8,r:14};
  const point=WildlifeRules.point;
  // Unseeded exponential intervals, with a small quiet period between visits.
  // No rescue, damage or map milestone changes this draw.
  function nextDelay(random: ()=>number = Math.random): number {
    return 20-Math.log(1-clamp(random(),0,.999999))*65;
  }
  function initialize(game: Farm.GameState): void {
    game.thorVisit={nextIn:nextDelay(),visits:0};
    game.entities.thor=null;game.thorNotice=undefined;
  }
  function make(at: Farm.Point, exit: Farm.Point): Farm.Thor {
    return {id:'thor',type:'thor',...point(at),radius:24,hitbox:{...HITBOX},vx:0,vy:0,
      facing:1,direction:'down',moving:false,anim:0,areaId:getAreaAt(at.x,at.y).id,state:'idle',
      mode:'enter',timer:20,exit:point(exit),route:[],routeTimer:0,age:0};
  }
  function edgeRoute(from: Farm.Body): Farm.Point[] {
    const start=Math.random()*Math.PI*2;
    const radius=Math.max(canvas.width,canvas.height)*.7+120;
    let best: Farm.Point[]=[];
    for(let i=0;i<12;i++) {
      const angle=start+i*Math.PI/6;
      const target={x:clamp(from.x+Math.cos(angle)*radius,24,WORLD.width-24),
        y:clamp(from.y+Math.sin(angle)*radius,24,WORLD.height-32)};
      const path=WolfAI.findPath(from,target),end=path[path.length-1];
      if(!end || !WildlifeRules.clear(end,end,HITBOX) || distance(from,end)<200)continue;
      if(!WildlifeRules.onScreen(end,70))return path;
      if(!best.length||distance(from,end)>distance(from,best[best.length-1]))best=path;
    }
    return best;
  }
  function arrive(game: Farm.GameState): boolean {
    const player=game.entities.chicken,body={...point(player),radius:24,hitbox:{...HITBOX}};
    const path=edgeRoute(body),at=path[path.length-1];
    if(!at)return false;
    game.entities.thor=make(at,at);
    game.thorVisit!.visits++;
    GameManager.save(game);
    return true;
  }
  function greet(game: Farm.GameState, dog: Farm.Thor): void {
    // Change phase before saving the reward: a reload cannot give it twice.
    dog.mode='greet';dog.timer=2.4;dog.route=[];dog.moving=false;
    const before=game.lives;
    game.lives=Math.min(MAX_LIVES,game.lives+1);
    game.entities.chicken.invulnerable=Math.max(game.entities.chicken.invulnerable,2);
    WolfAI.frighten(game,dog,6);
    AudioSystem.playAnimal('dog',{volume:.7});
    game.thorNotice={time:4.5,healed:game.lives>before};
    setStatus(game.lives>before?'Thor chegou! +1 coração. O lobo levou um susto!':
      'Thor chegou! Corações cheios e lobo assustado!');
    refreshHud();GameManager.save(game);
  }
  function walk(dog: Farm.Thor, target: Farm.Point, speed: number, dt: number): void {
    dog.routeTimer-=dt;
    if(dog.routeTimer<=0){dog.route=WolfAI.findPath(dog,target);dog.routeTimer=.65;}
    if(!dog.route.length)return;
    const moved=WildlifeRules.move(dog,dog.route[0],speed*dt);
    if(moved==='arrived')dog.route.shift();
    if(moved==='blocked'){dog.route=[];dog.routeTimer=0;}
  }
  function update(game: Farm.GameState, dt: number): void {
    if(game.phase!=='playing'||game.lake?.active||!Number.isFinite(dt)||dt<=0)return;
    if(!game.thorVisit)initialize(game);
    if(game.thorNotice)game.thorNotice.time=Math.max(0,game.thorNotice.time-dt);
    const visit=game.thorVisit!,dog=game.entities.thor;
    if(!dog){
      visit.nextIn=Math.max(0,visit.nextIn-dt);
      if(visit.nextIn<=0&&!arrive(game))visit.nextIn=2; // Retry inaccessible terrain, without rerolling the event.
      return;
    }
    const before=point(dog),step=Math.min(dt,.1);
    dog.age+=step;dog.timer=Math.max(0,dog.timer-step);
    if(dog.mode==='enter'){
      walk(dog,game.entities.chicken,game.settings.chickenSpeed*1.55,step);
      if((distance(dog,game.entities.chicken)<85 && DetectionSystem.hasLineOfSight(getHitbox(dog),getHitbox(game.entities.chicken)))||dog.timer<=0)greet(game,dog);
    }else if(dog.mode==='greet'){
      Player.face(dog,game.entities.chicken.x-dog.x,game.entities.chicken.y-dog.y);
      if(dog.timer<=0){
        dog.mode='leave';dog.timer=14;
        const path=edgeRoute(dog);dog.exit=point(path[path.length-1]||dog.exit);
        dog.routeTimer=0;
      }
    }else{
      walk(dog,dog.exit,game.settings.chickenSpeed*1.25,step);
      if(dog.timer<=0 || (!WildlifeRules.onScreen(dog,90)&&dog.age>4)){
        game.entities.thor=null;visit.nextIn=nextDelay();GameManager.save(game);return;
      }
    }
    dog.vx=(dog.x-before.x)/step;dog.vy=(dog.y-before.y)/step;
    dog.moving=Math.hypot(dog.vx,dog.vy)>1;dog.anim+=step*(dog.moving?10:2);
    dog.areaId=getAreaAt(dog.x,dog.y).id;
  }
  function snapshot(game: Farm.GameState): Farm.ThorSnapshot | undefined {
    if(!game.thorVisit)return undefined;
    const dog=game.entities.thor;
    return {...game.thorVisit,visitor:dog?{...point(dog),mode:dog.mode,timer:dog.timer,
      exit:point(dog.exit),age:dog.age,direction:dog.direction}:null};
  }
  function restore(game: Farm.GameState, saved: Farm.ThorSnapshot | undefined): void {
    game.entities.thor=null;game.thorNotice=undefined;
    if(!saved || !Number.isFinite(saved.nextIn)||saved.nextIn<0||saved.nextIn>1000){initialize(game);return;}
    game.thorVisit={nextIn:saved.nextIn,visits:Number.isSafeInteger(saved.visits)?Math.max(0,saved.visits):0};
    const v=saved.visitor;
    if(!v)return;
    if(!WildlifeRules.validPoint(v)||!WildlifeRules.validPoint(v.exit)||!['enter','greet','leave'].includes(v.mode)||
      !Number.isFinite(v.timer)||!Number.isFinite(v.age)||!WildlifeRules.clear(v,v,HITBOX)){
      game.thorVisit.nextIn=Math.max(20,game.thorVisit.nextIn);return;
    }
    const dog=make(v,v.exit);dog.mode=v.mode;dog.timer=clamp(v.timer,0,v.mode==='greet'?2.4:20);
    dog.age=clamp(v.age,0,40);dog.direction=['up','down','left','right'].includes(v.direction)?v.direction:'down';
    game.entities.thor=dog;
  }
  return {initialize,update,snapshot,restore,nextDelay};
})();
