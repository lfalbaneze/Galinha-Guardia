const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');

function arena(){
  const h=createGame();
  h.run(`OBSTACLES=[];var w=state.entities.wolf,c=state.entities.chicken;
    WolfAI.initialize(state);
    Object.assign(w,{x:1000,y:800,heading:0,mode:'chase',awareness:1,huntUnlockTimer:0,interceptCooldown:0,pursuitEffort:1.9});
    Object.assign(c,{x:1230,y:800,hidden:false,sprinting:false,invulnerable:0});
    WolfAI.update(state,.05);c.y+=6;`);
  return h;
}
function warning(){
  const h=arena();h.run('WolfAI.update(state,.05);');
  assert.equal(h.run('w.interceptPhase'),'warning');
  return h;
}

test('a lateral runner provokes a full warning, a committed intercept and a recovery window',()=>{
  const h=warning();
  h.run(`var announced=JSON.stringify(w.interceptTarget),start={x:w.x,y:w.y},aim={...w.interceptTarget};
    c.x=1250;c.y=790;
    for(let i=0;i<3;i++)WolfAI.update(state,.05);`);
  assert.equal(h.run('w.interceptPhase'),'warning');
  assert.equal(h.run('distance(w,start)'),0);
  assert.notEqual(h.run('JSON.stringify(w.interceptTarget)'),h.run('announced'));
  h.run(`while(w.interceptPhase==='warning'&&w.interceptTime>.11)WolfAI.update(state,.01);
    announced=JSON.stringify(w.interceptTarget);aim={...w.interceptTarget};c.x=1200;c.y=690;
    for(let i=0;i<20&&w.interceptPhase==='warning';i++)WolfAI.update(state,.01);
    var straight=true,locked=true,traveled=0;
    for(let i=0;i<30&&w.interceptPhase==='charge';i++){
      const old={x:w.x,y:w.y};WolfAI.update(state,.05);traveled+=distance(old,w);
      straight &&= Math.abs((w.x-start.x)*(aim.y-start.y)-(w.y-start.y)*(aim.x-start.x))<.00001;
      if(w.interceptPhase)locked &&= JSON.stringify(w.interceptTarget)===announced;
    }`);
  assert.equal(h.run('straight&&locked'),true);
  assert.ok(h.run('traveled')>30);
  assert.ok(h.run('traveled<=WolfAI.getConfig(state).speed*WolfAI.getConfig(state).interceptDuration+.01'));
  assert.ok(h.run('w.pursuitRest')>0);
  assert.equal(h.run('w.interceptPhase'),null);
  h.run('var resting={x:w.x,y:w.y};WolfAI.update(state,.2);');
  assert.equal(h.run('distance(w,resting)'),0);
});

test('concealment cancels an intercept without updating the remembered target',()=>{
  const h=warning();
  h.run(`var memory=JSON.stringify(w.lastKnown);Object.assign(c,{x:1800,y:1200,hidden:true});WolfAI.update(state,.05);`);
  assert.equal(h.run('w.interceptPhase'),null);
  assert.equal(h.run('w.mode'),'search');
  assert.equal(h.run('JSON.stringify(w.lastKnown)'),h.run('memory'));
  assert.ok(h.run('w.interceptCooldown')>0);
  assert.equal(h.run('w.searchPoints.some(p=>p.x===c.x&&p.y===c.y)'),false);
});

test('a charge already launched follows its announcement after losing sight, then searches the old observation',()=>{
  const h=warning();
  h.run(`for(let i=0;i<20&&w.interceptPhase==='warning';i++)WolfAI.update(state,.05);
    var aim=JSON.stringify(w.interceptTarget),memory=JSON.stringify(w.lastKnown);
    Object.assign(c,{x:1800,y:1200,hidden:true});
    for(let i=0;i<5;i++)WolfAI.update(state,.05);`);
  assert.equal(h.run('w.interceptPhase'),'charge');
  assert.equal(h.run('JSON.stringify(w.interceptTarget)'),h.run('aim'));
  assert.equal(h.run('JSON.stringify(w.lastKnown)'),h.run('memory'));
  assert.equal(h.run('w.detected'),false);
  h.run('for(let i=0;i<30;i++)WolfAI.update(state,.05);');
  assert.equal(h.run('w.interceptPhase'),null);
  assert.equal(h.run('w.mode'),'search');
  assert.equal(h.run('JSON.stringify(w.lastKnown)'),h.run('memory'));
});

test('an interception never targets through a pond and a new blocker cancels its announced line',()=>{
  const pond=arena();
  pond.run(`OBSTACLES=[{x:1200,y:880,w:90,h:160,type:'pond'}];WolfAI.update(state,.05);`);
  assert.equal(pond.run('w.mode'),'chase');
  assert.equal(pond.run('w.interceptPhase'),null);
  const h=warning();
  h.run(`for(let i=0;i<20&&w.interceptPhase==='warning';i++)WolfAI.update(state,.05);
    var before={x:w.x,y:w.y};OBSTACLES=[{x:w.x+60,y:w.y-50,w:20,h:100,type:'pond'}];WolfAI.update(state,.05);`);
  assert.equal(h.run('w.interceptPhase'),null);
  assert.equal(h.run('distance(w,before)'),0);
  assert.ok(h.run('w.pursuitRest')>0);
});

test('sustained pursuit spends actual running effort and gives a stationary breath before resuming',()=>{
  const h=arena();
  h.run(`w.pursuitEffort=0;c.y=w.y;var warned=false;
    for(let i=0;i<260&&!(w.pursuitRest>0);i++){
      c.x=w.x+200;c.y=w.y;WolfAI.update(state,.05);warned ||= !!w.interceptPhase;
    }
    var restStart={x:w.x,y:w.y},restDuration=w.pursuitRest;`);
  assert.equal(h.run('warned'),false);
  assert.ok(h.run('restDuration')>=1.5);
  assert.equal(h.run('w.pursuitEffort'),0);
  h.run('for(let i=0;i<10;i++)WolfAI.update(state,.05);');
  assert.equal(h.run('distance(w,restStart)'),0);
  h.run('for(let i=0;i<60;i++)WolfAI.update(state,.05);');
  assert.ok(h.run('distance(w,restStart)')>20);
});

test('search checks the observed road exit and adjoining branches without reading hidden movement',()=>{
  const h=arena();
  h.run(`WORLD.paths=[{x:700,y:760,w:700,h:80},{x:1060,y:500,w:80,h:700}];
    state.wolfLevel=2;state.rescuedCount=6;state.wolfHunger=1;
    Object.assign(w,{x:900,y:800,mode:'chase',heading:0,lastKnown:{x:1100,y:800},seenVelocity:{x:100,y:0}});
    Object.assign(c,{x:1800,y:1200,hidden:true});WolfAI.update(state,.05);
    var exits=JSON.stringify(w.searchPoints);`);
  assert.equal(h.run('w.searchPoints[0].x'),1100);
  assert.ok(h.run('w.searchPoints[1].x')>1100);
  assert.equal(h.run('w.searchPoints[1].y'),800);
  assert.ok(h.run('w.searchPoints.slice(1,4).some(p=>p.x===1100&&p.y!==800)'));
  h.run(`Object.assign(c,{x:2400,y:1600});
    Object.assign(w,{x:900,y:800,mode:'chase',heading:0});WolfAI.update(state,.05);`);
  assert.equal(h.run('JSON.stringify(w.searchPoints)'),h.run('exits'));
  h.run(`for(let i=0;i<700&&w.mode!=='patrol';i++)WolfAI.update(state,.05);`);
  assert.equal(h.run('w.mode'),'patrol');
});

test('refuge, Thor and loading cancel armed interceptions; pauses freeze them',()=>{
  for(const action of ['refuge','thor','restore']){
    const h=warning();
    h.run(action==='refuge'?`Object.assign(c,{x:240,y:400});WolfAI.update(state,.05);`:
      action==='thor'?`WolfAI.frighten(state,c,6);`:
      `GameManager.save(state);var saved=GameManager.read();GameManager.restore(state,saved);`);
    assert.equal(h.run('w.interceptPhase'),null,action);
    assert.equal(h.run('w.pursuitRest'),0,action);
    assert.equal(h.run('w.pursuitEffort'),0,action);
    h.run('w.x=c.x;w.y=c.y;');
    assert.equal(h.run('Player.checkCatch(state)'),false,action+' keeps its contact protection');
  }
  const h=warning();
  h.run(`state.phase='menu';var before=JSON.stringify(w);WolfAI.update(state,3);`);
  assert.equal(h.run('JSON.stringify(w)'),h.run('before'));
});

test('contact during wolf preparation or recovery is safe, while chase and charge can hurt',()=>{
  for(const phase of ['warning','recover','chase','charge']){
    const h=arena();
    h.run(`Object.assign(w,{interceptPhase:${phase==='warning'||phase==='charge'?`'${phase}'`:'null'},
      pursuitRest:${phase==='recover'?.5:0},mode:'chase'});Object.assign(c,{x:w.x,y:w.y,invulnerable:0});`);
    const hits=phase==='chase'||phase==='charge';
    assert.equal(h.run('Player.checkCatch(state)'),hits,phase);
    assert.equal(h.run('state.lives'),hits?2:3,phase);
    assert.equal(h.run('Player.checkCatch(state)'),false,'one contact never repeats a hit');
  }
});

test('charge checks contact at launch and on the last moving frame before recovery',()=>{
  for(const touching of [true,false]){
    const h=arena();
    h.run(`var cfg=WolfAI.getConfig(state),before={x:w.x,y:w.y};
      Object.assign(w,{mode:'chase',interceptPhase:'charge',interceptTime:.05,pursuitRest:0,
        interceptTarget:{x:w.x+200,y:w.y},moveSpeed:cfg.speed});
      Object.assign(c,{x:w.x+${touching?'1':'w.hitbox.r+c.hitbox.r+3'},
        y:w.y+w.hitbox.oy-c.hitbox.oy,invulnerable:0});
      var touchingAtStart=circleVsCircle(w,c);WolfAI.update(state,.05);`);
    assert.equal(h.run('touchingAtStart'),touching);
    assert.equal(h.run('state.lives'),2,touching?'launch contact':'final movement contact');
    assert.equal(h.run('w.interceptPhase'),null);
    assert.equal(h.run('w.pursuitRest'),0);
    assert.equal(h.run('Player.checkCatch(state)'),false);
    if(touching)assert.equal(h.run('distance(w,before)'),0,'a hit at launch stops the charge');
    else assert.ok(h.run('distance(w,before)')>0);
  }
});

test('sunflower ambushes cannot replace pursuit recovery and become available after it',()=>{
  const h=arena();
  h.run(`var bed=SunflowerSystem.plot();
    Object.assign(w,{x:bed.x+bed.w*.5,y:bed.y+bed.h*.63,mode:'patrol',pursuitRest:.8});
    c.hidden=true;SunflowerSystem.reset(state,0);var before={x:w.x,y:w.y};WolfAI.update(state,.05);`);
  assert.equal(h.run('SunflowerSystem.mode(state)'),'none');
  assert.equal(h.run('distance(w,before)'),0);
  h.run('w.pursuitRest=0;WolfAI.update(state,.05);');
  assert.equal(h.run('SunflowerSystem.mode(state)'),'hidden');
});
