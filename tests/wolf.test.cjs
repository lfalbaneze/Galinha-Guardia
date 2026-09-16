const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

function openFarm() {
  const game = createGame();
  game.run(`OBSTACLES = []; WolfAI.initialize(state);
    const wolf = state.entities.wolf; const chicken = state.entities.chicken;
    Object.assign(wolf, { x: 100, y: 800, heading: 0, huntUnlockTimer: 0 });
    Object.assign(chicken, { x: 240, y: 800, hidden: false, sprinting: false });`);
  return game;
}

test('vision respects range, facing, line of sight and hidden state, including close contact', () => {
  const { run } = openFarm();
  assert.equal(run('DetectionSystem.canDetect(wolf, chicken, WolfAI.getConfig(state))'), true);
  run('wolf.heading = Math.PI;');
  assert.equal(run('DetectionSystem.canDetect(wolf, chicken)'), false);
  run('wolf.heading = 0; chicken.x = 800;');
  assert.equal(run('DetectionSystem.canDetect(wolf, chicken)'), false);
  run('chicken.x = 240; OBSTACLES = [{x:170,y:740,w:20,h:120,type:"hay"}];');
  assert.equal(run('DetectionSystem.canDetect(wolf, chicken)'), false);
  run('OBSTACLES[0].type = "pond";');
  assert.equal(run('DetectionSystem.canDetect(wolf, chicken)'), true);
  run('chicken.x = 105; chicken.hidden = true;');
  assert.equal(run('DetectionSystem.canDetect(wolf, chicken)'), false);
});

test('close vision requires sight, while sprint sound is separate, coarse and muffled by cover', () => {
  const { run } = openFarm();
  run('wolf.heading = Math.PI; chicken.x = 135;');
  assert.equal(run('DetectionSystem.canDetect(wolf, chicken)'), true);
  run('chicken.x = 175; chicken.sprinting = true; chicken.vx = 320;');
  assert.equal(run('DetectionSystem.canDetect(wolf, chicken)'), false);
  assert.deepEqual(JSON.parse(run('JSON.stringify(DetectionSystem.perceive(wolf, chicken).heardPoint)')), { x: 192, y: 832 });
  run('OBSTACLES = [{x:145,y:740,w:10,h:120,type:"tree"}];');
  assert.equal(run('DetectionSystem.perceive(wolf, chicken).heardPoint'), null);
  run('chicken.x = 168;');
  assert.equal(run('DetectionSystem.canDetect(wolf, chicken)'), false);
  assert.ok(run('DetectionSystem.perceive(wolf, chicken).heardPoint'));
  run('OBSTACLES = []; chicken.hidden = true;');
  assert.equal(run('DetectionSystem.canDetect(wolf, chicken)'), false);
  assert.equal(run('DetectionSystem.perceive(wolf, chicken).heardPoint'), null);
});

test('a glimpse builds readable suspicion before pursuit and breaking sight lets it decay', () => {
  const { run } = openFarm();
  run('WolfAI.update(state, 0.05); const startingX=wolf.x;');
  assert.equal(run('wolf.mode'), 'alert');
  assert.equal(run('wolf.detected'), false);
  assert.equal(run('wolf.lastKnown'), null);
  assert.ok(run('wolf.awareness > 0 && wolf.awareness < 0.2'));
  run('for(let i=0;i<5;i++) WolfAI.update(state,0.05);');
  assert.equal(run('wolf.mode'), 'alert');
  assert.equal(run('wolf.x'), run('startingX'));
  run('chicken.hidden=true; for(let i=0;i<12;i++) WolfAI.update(state,0.05);');
  assert.equal(run('wolf.mode'), 'patrol');
  assert.equal(run('wolf.awareness'), 0);
  assert.equal(run('wolf.lastKnown'), null);
});

test('continued sight acquires the target; close contact responds immediately', () => {
  const { run } = openFarm();
  run('for(let i=0;i<20;i++) WolfAI.update(state,0.05);');
  assert.equal(run('wolf.mode'), 'chase');
  assert.equal(run('wolf.awareness'), 1);
  assert.equal(run('wolf.detected'), true);
  run('WolfAI.initialize(state); wolf.x=100; wolf.heading=Math.PI; chicken.x=120; WolfAI.update(state,0.016);');
  assert.equal(run('wolf.mode'), 'chase');
});

test('hearing investigates snapshots at a limited rate without acquiring visual memory', () => {
  const { run } = openFarm();
  run(`wolf.heading = Math.PI; chicken.x=189; chicken.sprinting=true; chicken.vx=320;
    WolfAI.update(state,0.05); const soundSnapshot=JSON.stringify(wolf.heardPoint);
    chicken.x=175; chicken.y=830; WolfAI.update(state,0.05);`);
  assert.equal(run('wolf.mode'), 'investigate');
  assert.equal(run('wolf.detected'), false);
  assert.equal(run('wolf.lastKnown'), null);
  assert.equal(run('JSON.stringify(wolf.heardPoint)'), run('soundSnapshot'));
  assert.notEqual(run('wolf.heardPoint.x'), run('chicken.x'));
  run('chicken.hidden=true; chicken.x=1600; chicken.y=1400; WolfAI.update(state,0.05);');
  assert.equal(run('JSON.stringify(wolf.heardPoint)'), run('soundSnapshot'));
  run('for(let i=0;i<65;i++) WolfAI.update(state,0.05);');
  assert.equal(run('wolf.mode'), 'patrol');
  assert.equal(run('wolf.heardPoint'), null);
  assert.equal(run('wolf.lastKnown'), null);
});

test('a barrier can muffle footsteps without turning them into x-ray vision', () => {
  const { run } = openFarm();
  run(`wolf.heading=0; chicken.x=165; chicken.sprinting=true; chicken.vx=320;
    OBSTACLES=[{x:137,y:740,w:8,h:120,type:'tree'}]; WolfAI.update(state,0.05);`);
  assert.equal(run('wolf.mode'), 'investigate');
  assert.equal(run('wolf.awareness'), 0);
  assert.equal(run('wolf.lastKnown'), null);
  assert.equal(run('wolf.detected'), false);
});

test('even the final tier cannot hear sprinting beyond the local sound radius', () => {
  const { run } = openFarm();
  run(`state.wolfLevel=3; wolf.heading=Math.PI; chicken.x=281;
    chicken.sprinting=true; chicken.vx=320; WolfAI.update(state,0.05);`);
  assert.equal(run('wolf.mode'), 'patrol');
  assert.equal(run('wolf.heardPoint'), null);
  assert.equal(run('wolf.lastKnown'), null);
});

test('last known position is an observation snapshot; concealed movement never updates it', () => {
  const { run } = openFarm();
  run('for(let i=0;i<20;i++) WolfAI.update(state,0.05); const memory = wolf.lastKnown;');
  assert.equal(run('wolf.mode'), 'chase');
  assert.equal(run('memory === chicken'), false);
  run('chicken.hidden = true; chicken.x = 1300; chicken.y = 1200; WolfAI.update(state, 0.05);');
  assert.equal(run('wolf.mode'), 'search');
  assert.deepEqual(JSON.parse(run('JSON.stringify(wolf.lastKnown)')), { x: 240, y: 800 });
  assert.deepEqual(JSON.parse(run('JSON.stringify(wolf.searchPoints[0])')), { x: 240, y: 800 });
  run('for (let i=0;i<110;i++) WolfAI.update(state, 0.05);');
  assert.equal(run('wolf.mode'), 'patrol');
  assert.equal(run('wolf.searchTime'), 0);
  assert.deepEqual(JSON.parse(run('JSON.stringify(memory)')), { x: 240, y: 800 });
});

test('four progress tiers increase vision, search effort and speed while leaving sprint faster', () => {
  const { run } = openFarm();
  for (const difficulty of ['easy', 'normal', 'hard']) {
    run(`state.difficultyKey = '${difficulty}'; state.settings = DIFFICULTIES['${difficulty}'];`);
    const configs = JSON.parse(run('JSON.stringify([0,1,2,3].map(level => {state.wolfLevel=level; return WolfAI.getConfig(state);} ))'));
    for (let i = 0; i < configs.length; i++) {
      assert.ok(configs[i].speed < run('state.settings.chickenSpeed * Player.sprintMultiplier'));
      if (!i) continue;
      for (const property of ['range', 'fov', 'speed', 'searchDuration', 'searchPoints']) {
        assert.ok(configs[i][property] > configs[i - 1][property], property);
      }
    }
  }
});

test('advanced search examines nearby hiding spots without knowing which one is occupied', () => {
  const { run } = openFarm();
  run(`state.wolfLevel = 3;
    const previousSpots = HidingSpots.getSpots;
    HidingSpots.getSpots = () => [{id:'nearby',type:'hay',x:300,y:790,w:40,h:40},
      {id:'faraway',type:'tree',x:2000,y:1200,w:50,h:50}];
    for(let i=0;i<12;i++) WolfAI.update(state,0.05);
    chicken.hidden = true; chicken.x = 2020; chicken.y = 1220;
    WolfAI.update(state, 0.05);`);
  assert.equal(run('wolf.searchPoints.some(p => p.x === 320 && p.y === 810)'), true);
  assert.equal(run('wolf.searchPoints.some(p => p.x === 2025 && p.y === 1225)'), false);
  assert.equal(run('wolf.detected'), false);
  assert.equal(run('wolf.searchPoints.length >= 7'), true);
  run('HidingSpots.getSpots = previousSpots;');
});

test('a visible target is reacquired during search, and animals never become targets', () => {
  const { run } = openFarm();
  run(`for(let i=0;i<20;i++) WolfAI.update(state,0.05); chicken.hidden = true; WolfAI.update(state, 0.05);
    chicken.hidden = false; chicken.x = wolf.x + 100; chicken.y = wolf.y; wolf.heading = 0;
    WolfAI.update(state, 0.05);`);
  assert.equal(run('wolf.mode'), 'chase');
  assert.equal(run('wolf.lastKnown.x === chicken.x'), true);
  run(`chicken.hidden = true; WolfAI.initialize(state);
    for (const animal of state.entities.animals) { animal.x = wolf.x; animal.y = wolf.y; }
    WolfAI.update(state, 0.05);`);
  assert.equal(run('wolf.mode'), 'patrol');
  assert.equal(run('wolf.lastKnown'), null);
  assert.equal(run('state.entities.animals.every(a => !a.lost && !a.rescued)'), true);
});

test('navigation routes around obstacles without corner cutting or leaving world limits', () => {
  const { run } = openFarm();
  run(`OBSTACLES = [{x:200,y:620,w:180,h:340,type:'barn'}, {x:380,y:850,w:160,h:80,type:'hay'}];
    Object.assign(wolf, {x:100,y:800, mode:'search', lastKnown:{x:650,y:800}, searchTime:30,
      searchPoints:[{x:650,y:800}], searchOrigin:{x:650,y:800}, searchIndex:0});
    chicken.hidden = true;
    const path = WolfAI.findPath(wolf, wolf.lastKnown);`);
  assert.ok(run('path.length') >= 3);
  for (let i = 0; i < 180; i++) {
    run('WolfAI.update(state, 0.05);');
    assert.equal(run(`(() => {const h=getHitbox(wolf); return h.x>=h.r && h.y>=h.r &&
      h.x<=WORLD.width-h.r && h.y<=WORLD.height-h.r && OBSTACLES.every(r =>
        Math.hypot(h.x-clamp(h.x,r.x,r.x+r.w),h.y-clamp(h.y,r.y,r.y+r.h))>=h.r-0.01);})()`), true);
  }
  assert.ok(run('distance(wolf,{x:650,y:800})') < 20);
});

test('search reaches the last observation after a long detour, then spends its full search budget', () => {
  const { run } = openFarm();
  run(`OBSTACLES = [{x:200,y:500,w:160,h:600,type:'barn'}];
    Object.assign(wolf, {mode:'chase',lastKnown:{x:560,y:800}});
    chicken.hidden=true;
    for(let i=0;i<80;i++) WolfAI.update(state,0.05);`);
  assert.equal(run('wolf.mode'), 'search');
  assert.equal(run('wolf.searchApproached'), false);
  assert.equal(run('wolf.searchTime'), run('WolfAI.getConfig(state).searchDuration'));
  run('for(let i=0;i<400 && !wolf.searchApproached;i++) WolfAI.update(state,0.05);');
  assert.equal(run('wolf.searchApproached'), true);
  assert.ok(run('distance(wolf,wolf.lastKnown)') < 1);
  assert.equal(run('wolf.searchTime'), run('WolfAI.getConfig(state).searchDuration'));
  run('for(let t=0;t<WolfAI.getConfig(state).searchDuration+0.1;t+=0.05) WolfAI.update(state,0.05);');
  assert.equal(run('wolf.mode'), 'patrol');
  assert.equal(run('wolf.searchTime'), 0);
});

test('an unreachable last observation cannot keep the wolf searching forever', () => {
  const { run } = openFarm();
  run(`OBSTACLES = [{x:200,y:0,w:160,h:WORLD.height,type:'barn'}];
    Object.assign(wolf, {mode:'chase',lastKnown:{x:560,y:800}});
    chicken.hidden=true; WolfAI.update(state,0.05);`);
  assert.equal(run('wolf.searchApproached'), true);
  run('for(let t=0;t<WolfAI.getConfig(state).searchDuration+0.1;t+=0.05) WolfAI.update(state,0.05);');
  assert.equal(run('wolf.mode'), 'patrol');
});

test('the same wolf persists while patrol crosses farm regions and survives a save/load', () => {
  const { run } = openFarm();
  run(`chicken.hidden=true; const persistentWolf = wolf; const visited = new Set();
    for(let i=0;i<1800;i++){WolfAI.update(state,0.1);visited.add(wolf.areaId);}`);
  assert.equal(run('state.entities.wolf === persistentWolf'), true);
  assert.ok(run('visited.size') >= 4);
  run(`wolf.mode='search'; wolf.lastKnown={x:1200,y:780}; wolf.searchTime=5; wolf.heading=1.2;
    GameManager.save(state); const snapshot=GameManager.read(); resetGame(); GameManager.restore(state,snapshot);`);
  assert.equal(run('state.entities.wolf.mode'), 'search');
  assert.equal(run('state.entities.wolf.searchTime'), 5);
  assert.equal(run('state.entities.wolf.heading'), 1.2);
  assert.deepEqual(JSON.parse(run('JSON.stringify(state.entities.wolf.lastKnown)')), { x: 1200, y: 780 });
  run('state.entities.chicken.hidden=true; state.phase="playing"; WolfAI.update(state,0.05);');
  assert.equal(run('state.entities.wolf.searchPoints.length > 0'), true);
});

test('restoring an approached search preserves its scan, waypoint and remaining budget', () => {
  const { run } = openFarm();
  run(`for(const animal of state.entities.animals.slice(0,6)) GameManager.rescue(state,animal);
    Object.assign(wolf,{mode:'chase',lastKnown:{x:1000,y:800}}); chicken.hidden=true;
    WolfAI.update(state,0.05);
    Object.assign(wolf,wolf.searchPoints[3],{searchApproached:true,searchIndex:3,searchTime:1.2,scanTime:0.4});
    GameManager.save(state); const snapshot=GameManager.read(); resetGame(snapshot.worldSeed);
    GameManager.restore(state,snapshot); OBSTACLES=[]; state.entities.chicken.hidden=true;
    const restoredWolf=state.entities.wolf; const restoredPosition={x:restoredWolf.x,y:restoredWolf.y};
    WolfAI.update(state,0.05);`);
  assert.equal(run('restoredWolf.mode'), 'search');
  assert.equal(run('restoredWolf.searchApproached'), true);
  assert.equal(run('restoredWolf.searchIndex'), 3);
  assert.ok(Math.abs(run('restoredWolf.searchTime') - 1.15) < 0.00001);
  assert.ok(Math.abs(run('restoredWolf.scanTime') - 0.35) < 0.00001);
  assert.equal(run('distance(restoredWolf,restoredPosition)'), 0);
  run('for(let i=0;i<24;i++) WolfAI.update(state,0.05);');
  assert.equal(run('restoredWolf.mode'), 'patrol');
  assert.equal(run('restoredWolf.searchTime'), 0);
});

test('patrol pauses and scans public hubs, with routes independent of the hidden player', () => {
  const { run } = openFarm();
  run(`chicken.hidden=true;
    const circuit=WolfAI.patrolPoints(WolfAI.getConfig(state));
    Object.assign(wolf,circuit[0]);
    WolfAI.update(state,0.05); const hubPosition={x:wolf.x,y:wolf.y}; const arrivalHeading=wolf.heading;
    chicken.x=2700; chicken.y=1700; WolfAI.update(state,0.1);`);
  assert.equal(run('wolf.mode'), 'patrol');
  assert.ok(run('wolf.patrolPause > 0'));
  assert.equal(run('wolf.patrolIndex'), 1);
  assert.equal(run('distance(wolf,hubPosition)'), 0);
  assert.notEqual(run('wolf.heading'), run('arrivalHeading'));
  assert.equal(run('JSON.stringify(circuit)===JSON.stringify(WolfAI.patrolPoints(WolfAI.getConfig(state)))'), true);
  run('for(let i=0;i<30;i++) WolfAI.update(state,0.05);');
  assert.ok(run('distance(wolf,hubPosition)') > 0);
});

test('an obstructed old position cannot cause a teleport through a building', () => {
  const { run } = openFarm();
  run(`chicken.hidden=true; OBSTACLES=[{x:70,y:710,w:160,h:190,type:'barn'}];
    Object.assign(wolf,{mode:'chase',lastKnown:{x:560,y:800}});
    const originalPosition={x:wolf.x,y:wolf.y}; WolfAI.update(state,0.05);`);
  assert.equal(run('distance(wolf,originalPosition)'), 0);
  assert.equal(run('wolf.searchApproached'), true);
  assert.equal(run('wolf.vx'), 0);
  assert.equal(run('wolf.vy'), 0);
});

test('all farm patrol landmarks have usable routes through the real buildings, water and trees', () => {
  const { run } = createGame();
  run(`state.wolfLevel=3; const patrolWolf=state.entities.wolf;
    const landmarks=WolfAI.patrolPoints(WolfAI.getConfig(state));
    const routes=landmarks.map(point => WolfAI.findPath(patrolWolf,point));`);
  assert.equal(run('routes.every(route => route.length > 0)'), true);
  assert.equal(run(`routes.every(route => route.every(point => {
    const h={x:point.x+patrolWolf.hitbox.ox,y:point.y+patrolWolf.hitbox.oy,r:patrolWolf.hitbox.r};
    return h.x>=h.r && h.y>=h.r && h.x<=WORLD.width-h.r && h.y<=WORLD.height-h.r &&
      OBSTACLES.every(r => Math.hypot(h.x-clamp(h.x,r.x,r.x+r.w),h.y-clamp(h.y,r.y,r.y+r.h))>=h.r);
  }))`), true);
});

test('victory stops wolf updates entirely', () => {
  const { run } = openFarm();
  run('state.phase="win_cutscene"; const before=JSON.stringify(wolf); WolfAI.update(state,1);');
  assert.equal(run('JSON.stringify(wolf) === before'), true);
});

test('six chick rescues gradually sharpen pursuit with bounded speed, vision and search', () => {
  const { run } = openFarm();
  for (const difficulty of ['easy', 'normal', 'hard']) {
    run(`state.difficultyKey='${difficulty}'; state.settings=DIFFICULTIES['${difficulty}'];`);
    const sprintSpeed = run('state.settings.chickenSpeed * Player.sprintMultiplier');
    for (let level = 0; level < 4; level++) {
      run(`state.wolfLevel=${level};`);
      const configs = JSON.parse(run(`JSON.stringify(Array.from({length:7},(_,chicks)=>{
        state.rescuedChicks=chicks; return WolfAI.getConfig(state);
      }))`));
      assert.equal(configs[0].chickMultiplier, 1);
      assert.equal(configs[6].chickMultiplier, 1.5);
      assert.ok(Math.abs(configs[6].nominalSpeed - configs[0].nominalSpeed * 1.5) < 0.00001);
      for (let i = 0; i < configs.length; i++) {
        const c = configs[i];
        assert.ok(c.speed <= sprintSpeed * 0.96);
        assert.ok(c.range <= 840 && c.searchDuration <= 24 && c.awarenessTime >= 0.18);
        assert.ok(c.fov < Math.PI && c.noiseRange <= 180);
        if (!i) continue;
        assert.ok(c.nominalSpeed > configs[i - 1].nominalSpeed);
        assert.ok(c.speed >= configs[i - 1].speed);
        assert.ok(c.range >= configs[i - 1].range);
        assert.ok(c.searchDuration > configs[i - 1].searchDuration);
        assert.ok(c.awarenessTime < configs[i - 1].awarenessTime);
      }
    }
  }
});

test('chick progression tolerates invalid saves and the sprint cap is configurable within fair bounds', () => {
  const { run } = openFarm();
  for (const value of ['undefined', 'NaN', 'Infinity', '-3']) {
    run(`state.rescuedChicks=${value};`);
    assert.equal(run('WolfAI.getConfig(state).chickMultiplier'), 1);
  }
  run(`state.rescuedChicks=99; state.wolfLevel=3; state.rescuedCount=10;
    state.settings={...state.settings,wolfSprintCap:0.82};`);
  assert.equal(run('WolfAI.getConfig(state).chickMultiplier'), 1.5);
  assert.equal(run('WolfAI.getConfig(state).speed'), run('state.settings.chickenSpeed*Player.sprintMultiplier*0.82'));
  run('state.settings.wolfSprintCap=20;');
  assert.equal(run('WolfAI.getConfig(state).sprintCap'), 0.96);
  run('state.settings.wolfSprintCap=-4;');
  assert.equal(run('WolfAI.getConfig(state).sprintCap'), 0.75);
});

test('maximum chick progression still allows sprint escape and loses targets behind solid cover', () => {
  const { run } = openFarm();
  run(`state.wolfLevel=3; state.rescuedChicks=6; state.rescuedCount=10;
    Object.assign(wolf,{mode:'chase',lastKnown:{x:300,y:800},awareness:1});
    Object.assign(chicken,{x:300,y:800,sprinting:true,vx:state.settings.chickenSpeed*Player.sprintMultiplier});
    const initialGap=distance(wolf,chicken);
    for(let i=0;i<50;i++) { chicken.x+=chicken.vx*0.05; WolfAI.update(state,0.05); }
    const observation=JSON.stringify(wolf.lastKnown);
    OBSTACLES=[{x:chicken.x+10,y:100,w:110,h:1600,type:'barn'}];
    chicken.x+=180; chicken.sprinting=false; chicken.vx=0; WolfAI.update(state,0.05);`);
  assert.ok(run('distance(wolf,chicken)') > run('initialGap'));
  assert.equal(run('wolf.mode'), 'search');
  assert.equal(run('wolf.detected'), false);
  assert.equal(run('JSON.stringify(wolf.lastKnown)'), run('observation'));
  // Moving farther away behind the wall must not redirect the remembered search.
  run(`chicken.x=2700; chicken.y=1650;
    for(let i=0;i<900 && wolf.mode!=='patrol';i++) WolfAI.update(state,0.05);`);
  assert.equal(run('wolf.mode'), 'patrol');
  assert.equal(run('wolf.detected'), false);
  assert.equal(run('wolf.searchTime'), 0);
  assert.equal(run('JSON.stringify(wolf.lastKnown)'), run('observation'));
});

test('maximum chick progression cannot reveal a hidden chicken or hear distant sprinting', () => {
  const { run } = openFarm();
  run(`state.wolfLevel=3; state.rescuedChicks=6; state.rescuedCount=10;
    Object.assign(chicken,{x:105,hidden:true,sprinting:true,vx:396});
    WolfAI.update(state,0.05);`);
  assert.equal(run('wolf.mode'), 'patrol');
  assert.equal(run('wolf.awareness'), 0);
  assert.equal(run('wolf.lastKnown'), null);
  assert.equal(run('wolf.heardPoint'), null);
  run(`Object.assign(wolf,{x:100,y:800,heading:Math.PI});
    Object.assign(chicken,{x:281,y:800,hidden:false}); WolfAI.update(state,0.05);`);
  assert.equal(run('wolf.mode'), 'patrol');
  assert.equal(run('wolf.heardPoint'), null);
  assert.equal(run('wolf.lastKnown'), null);
});
