const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');

function arena(){
  const h=createGame();
  h.run(`OBSTACLES=[];var c=state.entities.chicken,w=state.entities.wolf,g=state.entities.goose,
    f=state.entities.foxes[0],a=state.entities.animals[0];
    Object.assign(c,{x:2500,y:1500,hidden:true,invulnerable:0});
    Object.assign(w,{x:2400,y:1600,huntUnlockTimer:10});state.elapsed=10;
    state.entities.owls=[];state.entities.foxes=[];`);
  return h;
}

test('shared travel routes four ground species around fences and replans a newly blocked leg',()=>{
  const h=arena();
  h.run(`var results=[];
    for(const type of ['animal','goose','fox','thor'])for(const offset of [0,50]){
      var body={...a,id:type,type,x:1000,y:800,hitbox:{ox:0,oy:6,r:13}},target={x:1240,y:800};
      OBSTACLES=[{x:1100,y:700+offset,w:24,h:180,type:'fence'}];
      var maxStep=0,clear=true,outcome='moving',replanned=false;
      for(let frame=0;frame<500&&outcome!=='arrived';frame++){
        if(frame===10){OBSTACLES.push({x:1060,y:790,w:16,h:150,type:'fence'});replanned=true;}
        const before={x:body.x,y:body.y};
        outcome=WildlifeRules.navigate(body,target,90,.05,p=>p.x>=900&&p.x<=1350&&p.y>=600&&p.y<=1100);
        maxStep=Math.max(maxStep,distance(body,before));clear&&=OBSTACLES.every(o=>
          Math.hypot(body.x-clamp(body.x,o.x,o.x+o.w),body.y+6-clamp(body.y+6,o.y,o.y+o.h))>=13-.001);
      }
      results.push({type,offset,outcome,maxStep,clear,replanned,gap:distance(body,target)});
    }`);
  for(const r of JSON.parse(h.run('JSON.stringify(results)'))){
    assert.equal(r.outcome,'arrived',JSON.stringify(r));assert.ok(r.clear,JSON.stringify(r));assert.ok(r.maxStep<=4.501);
    assert.ok(r.gap<.01,'arrival must reach the actual endpoint so return states can finish');
  }
});

test('local steering passes a stationary neighbour instead of oscillating or overlapping',()=>{
  const h=arena();
  h.run(`var body={...a,x:1000,y:800},neighbour={...a,x:1060,y:800},target={x:1220,y:800},gap=Infinity,result;
    for(let i=0;i<400;i++){
      result=WildlifeRules.navigate(body,target,80,.05,()=>true,[neighbour]);
      gap=Math.min(gap,distance(getHitbox(body),getHitbox(neighbour)));
      if(result==='arrived')break;
    }`);
  assert.equal(h.run('result'),'arrived');
  assert.ok(h.run('gap>=body.hitbox.r+neighbour.hitbox.r+2-.001'));
});

test('an impossible destination is reported finitely, and changing destination recovers without teleporting',()=>{
  const h=arena();
  h.run(`var body={...a,x:1000,y:800},start={x:1000,y:800};
    OBSTACLES=[{x:960,y:750,w:10,h:110},{x:1040,y:750,w:10,h:110},
      {x:960,y:750,w:90,h:10},{x:960,y:850,w:90,h:10}];
    var result=WildlifeRules.navigate(body,{x:1300,y:800},80,.05);
    var stayed=distance(body,start)===0;
    for(let i=0;i<30;i++)result=WildlifeRules.navigate(body,{x:1000,y:825},30,.05);`);
  assert.equal(h.run('stayed'),true);assert.equal(h.run('result'),'arrived');
  assert.ok(h.run('WildlifeRules.diagnostics(body).changes.some(s=>s.startsWith("unreachable"))'));
  h.run(`OBSTACLES=[{x:1080,y:750,w:20,h:150}];body.x=1000;body.y=800;
    result=WildlifeRules.navigate(body,{x:1081,y:800},80,.05);`);
  assert.equal(h.run('result'),'unreachable','a projected route endpoint is not arrival at a blocked target');
});

test('signals freeze the actual clue, expire, respect hearing walls and never survive a new attempt',()=>{
  const h=arena();
  h.run(`Object.assign(g,{x:1000,y:800});Object.assign(f,{x:1100,y:800});
    WildlifeRules.report(state,g,'alarm',{x:1200,y:800});var clue=WildlifeRules.hear(state,f);
    c.x=2600;c.y=1600;clue.point.x=42;var original=WildlifeRules.hear(state,f).point.x;
    OBSTACLES=[{x:1030,y:700,w:5,h:200},{x:1050,y:700,w:5,h:200},{x:1070,y:700,w:5,h:200}];
    var muffled=WildlifeRules.hear(state,f);OBSTACLES=[];state.elapsed+=4.1;
    var expired=WildlifeRules.hear(state,f);state.elapsed=10;
    resetGame(814237);var reset=WildlifeRules.hear(state,state.entities.goose);`);
  assert.equal(h.run('original'),1200);assert.equal(h.run('muffled'),null);assert.equal(h.run('expired'),null);assert.equal(h.run('reset'),null);
});

test('a fox can investigate an alarm but cannot warn or attack a hidden player at its destination',()=>{
  const a=arena(),b=arena();
  for(const [h,x]of [[a,2000],[b,2600]])h.run(`
    Object.assign(f,{x:1100,y:800,home:{x:1100,y:800},mode:'hidden',cooldown:0,grace:0,relocateIn:99});
    state.entities.foxes=[f];Object.assign(g,{x:1000,y:800});c.x=${x};
    WildlifeRules.report(state,g,'alarm',{x:1180,y:800});FoxSystem.update(state,.05);
    var started=f.mode==='stalk';
    for(let i=0;i<60;i++){state.elapsed+=.05;FoxSystem.update(state,.05);}
    var info=JSON.stringify({mode:f.mode,x:f.x,y:f.y,sighting:f.sighting,target:f.target});`);
  assert.equal(a.run('started'),true);assert.equal(a.run('info'),b.run('info'));
  assert.ok(!['warning','dash'].includes(a.run('f.mode')));assert.equal(a.run('state.lives'),3);
});

test('Panto guards a visible predator, but cannot react through a wall',()=>{
  for(const wall of [false,true]){
    const h=arena();
    h.run(`Object.assign(g,{x:1000,y:800,home:{x:1000,y:800},mode:'patrol',timer:1,cooldown:0,grace:0});
      Object.assign(w,{x:1120,y:800,huntUnlockTimer:0,mode:'patrol'});
      ${wall?'OBSTACLES=[{x:1060,y:700,w:10,h:200}];':''}GooseSystem.update(state,.05);`);
    assert.equal(h.run('g.maneuver==="predator"'),!wall);assert.equal(h.run('state.lives'),3);
  }
});

test('fence exits become search candidates and hard mode adds tactics without changing learned speed',()=>{
  const h=arena();
  h.run(`WORLD.paths=[];state.difficultyKey='hard';
    Object.assign(w,{x:900,y:800,heading:0,mode:'chase',lastKnown:{x:1100,y:800},huntUnlockTimer:0});
    OBSTACLES=[{x:1130,y:740,w:12,h:120,type:'fence'}];WolfAI.update(state,.05);`);
  assert.equal(h.run('w.mode'),'search');
  assert.ok(h.run('w.searchPoints.some(p=>p.y<740||p.y>860)'));
  assert.ok(h.run('WolfAI.getConfig(state).searchPoints>=2'));
});

test('species choose pasture, heard noises, shelter and flock neighbours from available evidence',()=>{
  const h=arena();
  h.run(`Object.assign(a,{x:1000,y:800,rescued:false});var home={x:1000,y:800},area={x:700,y:500,w:700,h:600};
    var b=state.entities.animals[1];Object.assign(b,{x:1040,y:800,rescued:false,species:'lamb'});a.species='sheep';
    RescueSystem.wander(a,home,area,state);var flock=a.activity==='herd'&&a.targetX>1040;
    a.species='dog';Object.assign(g,{x:1040,y:800});WildlifeRules.report(state,g,'rustle',g);
    RescueSystem.wander(a,home,area,state);var sniff=a.activity==='sniff'&&a.targetX===1040;
    a.species='rabbit';HidingSpots.getSpots=()=>[{x:1020,y:760,w:40,h:20}];
    RescueSystem.wander(a,home,area,state);var shelter=a.activity==='shelter'&&a.targetX===1040;
    a.species='cow';EnvironmentSystem.surfaceAt=()=> 'grass';RescueSystem.wander(a,home,area,state);`);
  assert.equal(h.run('flock&&sniff&&shelter'),true);assert.equal(h.run('a.activity'),'graze');
  assert.ok(h.run('distance({x:a.targetX,y:a.targetY},home)<=85.001'));
});

test('wolf communication uses the reported footprint once, without following hidden movement',()=>{
  const h=arena();
  h.run(`Object.assign(w,{x:1000,y:800,mode:'patrol',huntUnlockTimer:0,pauseTimer:0,hearingCooldown:0});
    Object.assign(f,{x:1120,y:800});WildlifeRules.report(state,f,'rustle',{x:1220,y:800});
    WolfAI.update(state,.05);var heard=JSON.stringify(w.heardPoint),budget=w.investigateTime;
    c.x=2200;c.y=1500;WolfAI.update(state,.05);`);
  assert.equal(h.run('w.mode'),'investigate');assert.equal(h.run('JSON.stringify(w.heardPoint)'),h.run('heard'));
  assert.ok(h.run('w.investigateTime<budget'));assert.equal(h.run('w.lastKnown'),null);
});

test('simulated seeded farms keep actors moving with bounded steps and finite states',()=>{
  let rng=34567;
  const h=createGame(()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;});
  h.run(`var simulations=[];
    for(const seed of [52,814237,391602]){
      resetGame(seed);state.phase='playing';state.entities.chicken.hidden=true;
      const moved={},actors=[state.entities.wolf,...state.entities.animals,...(state.entities.foxes||[]),...(state.entities.goose?[state.entities.goose]:[])];
      let finite=true,maxStep=0;
      for(let frame=0;frame<700;frame++){
        const previous=actors.map(a=>({x:a.x,y:a.y}));state.elapsed+=.05;
        WolfAI.update(state,.05);GooseSystem.update(state,.05);FoxSystem.update(state,.05);OwlSystem.update(state,.05);RescueSystem.update(state,.05);
        actors.forEach((a,i)=>{const step=distance(a,previous[i]);maxStep=Math.max(maxStep,step);
          finite&&=Number.isFinite(a.x)&&Number.isFinite(a.y);moved[a.type]=(moved[a.type]||0)+step;});
      }
      simulations.push({seed,finite,maxStep,moved});
    }`);
  for(const result of JSON.parse(h.run('JSON.stringify(simulations)'))){
    assert.ok(result.finite,JSON.stringify(result));assert.ok(result.maxStep<30,JSON.stringify(result));
    assert.ok(result.moved.wolf>100&&result.moved.animal>100,JSON.stringify(result));
    if('goose'in result.moved)assert.ok(result.moved.goose>20,JSON.stringify(result));
    if('fox'in result.moved)assert.ok(result.moved.fox>20,JSON.stringify(result));
  }
});
