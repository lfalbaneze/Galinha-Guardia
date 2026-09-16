const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

function arena() {
  const h = createGame(() => .5);
  h.run(`resetGame(814237);OBSTACLES=[];
    const chicken=state.entities.chicken,wolf=state.entities.wolf,friend=state.entities.animals[0];
    Object.assign(WORLD.areas[0],{x:0,y:0,w:2800,h:1800});
    Object.assign(WORLD.layout.animalSpawns[0],{x:500,y:800});
    Object.assign(friend,{x:500,y:800,targetX:500,targetY:800,direction:'left'});
    for(const a of state.entities.animals.slice(1))a.rescued=true;
    Object.assign(chicken,{x:400,y:800});
    Object.assign(wolf,{x:2400,y:1400,huntUnlockTimer:10,pauseTimer:0});`);
  return h;
}

test('fleeing follows the last perceived threat, never the hidden player location', () => {
  const left = arena(), right = arena();
  for (const [h,x] of [[left,40],[right,2500]]) h.run(`RescueSystem.update(state,.05);
    chicken.hidden=true;chicken.x=${x};chicken.y=1200;
    for(let i=0;i<8;i++)RescueSystem.update(state,.05);`);
  const snapshot = 'JSON.stringify({x:friend.x,y:friend.y,memory:friend.fleeFrom,heading:friend.fleeHeading})';
  assert.equal(left.run(snapshot), right.run(snapshot));
  assert.equal(left.run('friend.fleeFrom.x'), 400);
});

test('animals neither face nor panic at someone behind an opaque wall', () => {
  const { run } = arena();
  run(`chicken.x=600;friend.restTime=1;OBSTACLES=[{x:545,y:700,w:10,h:200}];RescueSystem.update(state,.05);`);
  assert.equal(run('friend.direction'), 'left');
  assert.equal(run('!!friend.fleeFrom'), false);
});

test('a rabbit runs faster but tires earlier than a cow under the same pursuit', () => {
  const results = {};
  for (const species of ['rabbit','cow']) {
    const { run } = arena();
    run(`friend.species='${species}';let elapsed=0;
      for(let i=0;i<12;i++){chicken.x=friend.x-100;chicken.y=friend.y;RescueSystem.update(state,.05);elapsed+=.05;}
      const earlyX=friend.x;
      for(let i=0;i<160 && friend.restTime<=0;i++){chicken.x=friend.x-100;chicken.y=friend.y;RescueSystem.update(state,.05);elapsed+=.05;}`);
    results[species] = { travel: run('earlyX-500'), time: run('elapsed'), rest: run('friend.restTime') };
  }
  assert.ok(results.rabbit.travel > results.cow.travel * 1.15);
  assert.ok(results.rabbit.time < results.cow.time);
  assert.ok(results.rabbit.rest >= 3 && results.cow.rest >= 3);
});

test('an awake visible wolf frightens nearby animals but a wall blocks that observation', () => {
  for (const wall of [false,true]) {
    const { run } = arena();
    run(`chicken.x=2500;chicken.y=1500;wolf.x=400;wolf.y=800;wolf.huntUnlockTimer=0;
      ${wall ? 'OBSTACLES=[{x:447,y:700,w:10,h:200}];' : ''}RescueSystem.update(state,.05);`);
    assert.equal(run('friend.temper'), wall ? 'idle' : 'fleeing');
    if (!wall) {
      assert.equal(run('friend.fleeFrom.kind'), 'wolf');
      assert.ok(run('friend.x>500'));
      assert.match(run('friend.speech'), /lobo/i);
    }
  }
});

test('fear snapshots survive saving, and malformed or old saves cannot invent a threat', () => {
  const { run, storage } = arena();
  run('RescueSystem.update(state,.05);GameManager.save(state);');
  let loaded = createGame(() => .5,{storage:new Map(storage),fullStartup:true});
  assert.equal(loaded.run('JSON.stringify(state.entities.animals[0].fleeFrom)'), run('JSON.stringify(friend.fleeFrom)'));
  const saved = JSON.parse(storage.get('galinha-guardia-save-v1'));
  saved.animals[0].fleeFrom = { x: 1e8, y: 300, kind: 'player' };
  saved.animals[0].fleeHeading = 'bad';
  storage.set('galinha-guardia-save-v1', JSON.stringify(saved));
  loaded = createGame(() => .5,{storage,fullStartup:true});
  assert.equal(loaded.run('state.entities.animals[0].fleeFrom'), null);
  assert.equal(loaded.run('state.entities.animals[0].fleeHeading'), null);
});

function pursuit() {
  const h = arena();
  h.run(`Object.assign(wolf,{x:100,y:800,heading:0,mode:'chase',awareness:1,huntUnlockTimer:0});
    Object.assign(chicken,{x:400,y:800});WolfAI.update(state,.05);chicken.y=810;`);
  return h;
}

test('the wolf leads observed movement, then searches the real last observation after losing sight', () => {
  const { run } = pursuit();
  run('WolfAI.update(state,.05);const memory=JSON.stringify(wolf.lastKnown);');
  assert.equal(run('wolf.mode'), 'chase');
  assert.ok(run('wolf.routeTarget.y>chicken.y'));
  assert.equal(run('wolf.lastKnown.y'), 810);
  run('chicken.hidden=true;chicken.x=2500;chicken.y=1600;WolfAI.update(state,.05);');
  assert.equal(run('wolf.mode'), 'search');
  assert.equal(run('JSON.stringify(wolf.lastKnown)'), run('memory'));
  assert.equal(run('wolf.searchPoints[0].y'), 810);
});

test('interception cannot project a chase target into a pond or building', () => {
  const { run } = pursuit();
  run(`OBSTACLES=[{x:370,y:840,w:130,h:100,type:'pond'}];wolf.routeTimer=0;WolfAI.update(state,.05);`);
  assert.equal(run('wolf.mode'), 'chase');
  assert.equal(run('wolf.routeTarget.y'), 810);
});

test('a wolf at a rounded corner walks free without tunnelling or teleporting', () => {
  const { run } = arena();
  run(`OBSTACLES=[{x:500,y:700,w:120,h:120,type:'barn'}];chicken.hidden=true;
    Object.assign(wolf,{x:482-wolf.hitbox.ox,y:682-wolf.hitbox.oy,huntUnlockTimer:0,mode:'chase',lastKnown:{x:200,y:900}});
    const start={x:wolf.x,y:wolf.y};WolfAI.update(state,.05);`);
  assert.ok(run('distance(start,wolf)') > 0);
  assert.ok(run('distance(start,wolf)') <= 4.51);
  for(let i=0;i<40;i++) {
    run('WolfAI.update(state,.05);');
    assert.ok(run(`(()=>{const p=getHitbox(wolf),r=OBSTACLES[0];return Math.hypot(p.x-clamp(p.x,r.x,r.x+r.w),p.y-clamp(p.y,r.y,r.y+r.h))>=p.r-.001;})()`));
  }
  assert.ok(run('distance(start,wolf)') > 100);
});

test('a sound detour preserves the visual search and its remaining budget, including reload', () => {
  const { run, storage } = arena();
  run(`Object.assign(wolf,{x:100,y:800,heading:0,mode:'search',huntUnlockTimer:0,lastKnown:{x:1000,y:800},searchTime:3,searchApproached:true});
    Object.assign(chicken,{x:40,y:800,sprinting:true,vx:300});WolfAI.update(state,.05);GameManager.save(state);`);
  assert.equal(run('wolf.mode'), 'investigate');
  assert.equal(run('wolf.investigateReturnMode'), 'search');
  const loaded = createGame(() => .5,{storage:new Map(storage),fullStartup:true});
  loaded.run(`state.phase='playing';OBSTACLES=[];const w=state.entities.wolf;
    w.huntUnlockTimer=0;state.entities.chicken.hidden=true;
    for(let i=0;i<60;i++)WolfAI.update(state,.05);`);
  assert.equal(loaded.run('w.mode'), 'search');
  assert.equal(loaded.run('w.lastKnown.x'), 1000);
  assert.ok(loaded.run('w.searchTime') > 1 && loaded.run('w.searchTime') < 3);
});
