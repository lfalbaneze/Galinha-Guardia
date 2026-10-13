const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

const step = (h, system, seconds) => h.run(`for(let i=0;i<${Math.ceil(seconds/.05)};i++)${system}.update(state,.05)`);

test('wolf difficulty changes recognition and forgetting while keeping sprint escapable', () => {
  const acquired = [], decay = [];
  for (const difficulty of ['easy','normal','hard','hardcore']) {
    const h = createGame();
    h.run(`difficultySelect.value='${difficulty}';resetGame(52);OBSTACLES=[];
      var w=state.entities.wolf,c=state.entities.chicken;
      Object.assign(w,{x:1000,y:800,heading:0,huntUnlockTimer:0});
      Object.assign(c,{x:1140,y:800,hidden:false,sprinting:false});
      var frames=0;while(w.mode!=='chase'&&frames<40){WolfAI.update(state,.05);frames++;}`);
    acquired.push(h.run('frames'));
    decay.push(h.run('WolfAI.getConfig(state).awarenessDecay'));
    assert.ok(h.run('WolfAI.getConfig(state).speed<state.settings.chickenSpeed*Player.sprintMultiplier'));
  }
  for (let i=1;i<acquired.length;i++) {
    assert.ok(acquired[i]<acquired[i-1], acquired.join(','));
    assert.ok(decay[i]<decay[i-1]);
  }
});

test('wolf patrol stops avoid the refuge and a broken chase leaves the gate', () => {
  const h = createGame();
  h.run(`OBSTACLES=[];var w=state.entities.wolf,c=state.entities.chicken,b=FarmRefuge.bounds;
    var safeStops=true;for(let level=0;level<4;level++){
      state.wolfLevel=level;
      safeStops &&= WolfAI.patrolPoints(WolfAI.getConfig(state)).every(p=>
        Math.hypot(p.x-clamp(p.x,b.x,b.x+b.w),p.y-clamp(p.y,b.y,b.y+b.h))>=120);
    }
    Object.assign(w,{x:390,y:385,mode:'chase',lastKnown:{x:330,y:385},huntUnlockTimer:0,patrolPause:2});
    Object.assign(c,{x:310,y:385,hidden:false});WolfAI.update(state,.05);`);
  assert.equal(h.run('safeStops'), true);
  assert.equal(h.run('w.mode'), 'patrol');
  assert.equal(h.run('w.lastKnown'), null);
  assert.equal(h.run('w.patrolPause'), 0);
  step(h, 'WolfAI', 3);
  assert.ok(h.run('distance(w,{x:390,y:385})>120'));
  assert.equal(h.run('FarmRefuge.contains(w)'), false);
});

test('fox difficulty trades longer warnings and recovery for faster committed attacks', () => {
  const h = createGame();
  const configs = h.run(`['easy','normal','hard','hardcore'].map(d=>{
    state.difficultyKey=d;state.settings=DIFFICULTIES[d];const c=FoxSystem.getConfig(state);
    return {...c,speed:c.speed/state.settings.chickenSpeed};})`);
  for(let i=1;i<configs.length;i++) {
    assert.ok(configs[i].warning<configs[i-1].warning);
    assert.ok(configs[i].rest<configs[i-1].rest);
    assert.ok(configs[i].cooldown<configs[i-1].cooldown);
    assert.ok(configs[i].speed>configs[i-1].speed);
  }
  assert.ok(configs[3].warning>=.8);
  assert.ok(configs[3].rest>=.8);
});

test('the refuge cancels fox warnings and protects against a dash already in flight', () => {
  const h = createGame();
  h.run(`OBSTACLES=[];camera.x=0;camera.y=200;var f=state.entities.foxes[0],c=state.entities.chicken;
    state.entities.foxes=[f];state.entities.wolf.huntUnlockTimer=100;
    Object.assign(f,{x:390,y:385,home:{x:390,y:385},mode:'hidden',grace:0,cooldown:0,relocateIn:20});
    Object.assign(c,{x:330,y:385,hidden:false,invulnerable:0});FoxSystem.update(state,.05);`);
  assert.equal(h.run('f.mode'), 'hidden');
  h.run(`f.mode='warning';f.timer=.2;FoxSystem.update(state,.05);`);
  assert.equal(h.run('f.mode'), 'hidden');
  h.run(`Object.assign(f,{x:c.x,y:c.y,mode:'dash',hit:false,target:{x:c.x+40,y:c.y}});FoxSystem.update(state,.05);`);
  assert.equal(h.run('state.lives'), 3);
});

test('nearby foxes take turns and leave recovery before the next warning', () => {
  const h = createGame();
  h.run(`OBSTACLES=[];camera.x=700;camera.y=500;
    var [a,b]=state.entities.foxes,c=state.entities.chicken;
    state.entities.wolf.huntUnlockTimer=100;
    for(const [i,f]of state.entities.foxes.entries())Object.assign(f,{x:1000+i*200,y:800,
      home:{x:1000+i*200,y:800},mode:'hidden',grace:0,cooldown:0,relocateIn:20});
    Object.assign(c,{x:1100,y:800,hidden:false,invulnerable:0});FoxSystem.update(state,.05);`);
  assert.equal(h.run('a.mode'), 'warning');
  assert.equal(h.run('b.mode'), 'hidden');
  h.run(`c.y=890;var overlap=false;
    for(let i=0;i<50&&a.mode!=='rest';i++){
      FoxSystem.update(state,.05);
      overlap ||= state.entities.foxes.filter(f=>['warning','dash'].includes(f.mode)).length>1;
    }`);
  assert.equal(h.run('overlap'), false);
  assert.equal(h.run('a.mode'), 'rest');
  step(h, 'FoxSystem', .25);
  assert.equal(h.run('b.mode'), 'hidden');
  step(h, 'FoxSystem', .3);
  assert.equal(h.run('b.mode'), 'warning');
  assert.equal(h.run('state.lives'), 3);
});

test('fox rotates to a fresh den but falls back to the previous den if alternatives are blocked', () => {
  for(const blocked of [false,true]) {
    const h = createGame();
    h.run(`OBSTACLES=[];WildlifeRules.reserved=()=>false;WildlifeRules.pathDistance=()=>0;
      HidingSpots.initialize({...WORLD.layout,vegetation:[
        {id:'old',type:'bush',x:950,y:700,w:100,h:109},
        {id:'current',type:'bush',x:1350,y:700,w:100,h:109},
        {id:'fresh',type:'bush',x:1850,y:700,w:100,h:109}]});
      var f=state.entities.foxes[0];state.entities.foxes=[f];state.entities.chicken.hidden=true;
      Object.assign(f,{x:1400,y:800,home:{x:1400,y:800},bushId:'current',previousBushId:'old',
        mode:'hidden',grace:0,cooldown:0,relocateIn:0});
      ${blocked ? 'OBSTACLES=[{x:1600,y:0,w:30,h:WORLD.height}];' : ''}
      FoxSystem.update(state,.05);`);
    assert.equal(h.run('f.mode'), 'relocate');
    assert.equal(h.run('f.bushId'), blocked ? 'old' : 'fresh');
    assert.equal(h.run('f.previousBushId'), 'current');
  }
});

test('den rotation memory survives saves and discards an invalid previous den', () => {
  const h = createGame();
  h.run(`var f=state.entities.foxes[0],other=state.entities.foxes[1];
    f.previousBushId=other.bushId;var previous=f.previousBushId,saved=FoxSystem.snapshot(state);
    FoxSystem.restore(state,saved);`);
  assert.equal(h.run('state.entities.foxes[0].previousBushId'), h.run('previous'));
  h.run(`saved[0].previousBushId='missing';FoxSystem.restore(state,saved);`);
  assert.equal(h.run('state.entities.foxes[0].previousBushId'), null);
});
