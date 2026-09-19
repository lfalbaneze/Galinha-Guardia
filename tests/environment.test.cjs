const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
function fixture(options) {
  const h=createGame(()=>.5,options);
  h.run(`WORLD.layout={...WORLD.layout,habitats:[],paths:[],lanes:[],clearings:[],plots:[],vegetation:[],decorations:[]};
    OBSTACLES=[];var c=state.entities.chicken;c.x=1000;c.y=986;c.invulnerable=0;
    EnvironmentSystem.initialize(state);var calls=[];AudioSystem.play=(...args)=>calls.push(args);`);
  return h;
}
const walk=(h,frames,keys=['d'])=>h.run(`input.clear();${keys.map(k=>`input.add('${k}');`).join('')}
  for(var i=0;i<${frames};i++)Player.update(state,1/60);`);
const inspect=h=>JSON.parse(h.run('JSON.stringify(EnvironmentSystem.inspect(state))'));
test('shallow water slows actual movement, splashes per step and leaves wet prints on exit',()=>{
  const h=fixture();
  h.run("WORLD.layout.habitats=[{id:'pool',x:1000,y:1000,kind:'water',r:90}];var startX=c.x;");
  walk(h,25);
  assert.ok(inspect(h).marks.some(m=>m.kind==='ripple'));
  assert.ok(Math.abs(h.run('c.x-startX')-h.run('c.speed')*.78*25/60)<.01);
  assert.ok(h.run("calls.some(([name])=>name==='step-water')"));
  walk(h,55);
  assert.ok(inspect(h).marks.some(m=>m.kind==='wet'));
});
test('mud coats the feet; water washes mud off before returning to land',()=>{
  const h=fixture();
  h.run("WORLD.layout.habitats=[{id:'mud',x:1000,y:1000,kind:'mud',r:90},{id:'water',x:1220,y:1000,kind:'water',r:90}];");
  walk(h,20);assert.ok(inspect(h).marks.some(m=>m.kind==='mud'));
  walk(h,170);
  const marks=inspect(h).marks;
  assert.ok(marks.some(m=>m.kind==='wet'&&m.x>1328));
  assert.ok(marks.filter(m=>m.x>1328).every(m=>m.kind==='wet'));
});
test('a completed bridge stays dry and at normal speed across the real pond',()=>{
  const h=createGame();
  h.run("state.lake.completed=true;var b=LakeChallenge.bridge(),c=state.entities.chicken;c.x=b.x+b.w/2;c.y=b.y+b.h/2-14;");
  assert.equal(h.run('EnvironmentSystem.surfaceAt(state,{x:c.x,y:c.y+14})'),'bridge');
  assert.equal(h.run('EnvironmentSystem.movementScale(state)'),1);
  h.run('state.lake.completed=false');assert.equal(h.run('EnvironmentSystem.surfaceAt(state,{x:c.x,y:c.y+14})'),'water');
});
test('nearby plants react to real contact, distant plants do not; motion decays without advancing the map',()=>{
  const h=fixture();
  h.run(`WORLD.layout.decorations=[{type:'corn',x:1032,y:1000},{type:'corn',x:1400,y:1000}];
    WORLD.layout.plots=[{kind:'corn',x:970,y:970,w:120,h:70,areaId:'milharal'}];
    WORLD.layout={...WORLD.layout};EnvironmentSystem.initialize(state);var before=JSON.stringify(WORLD.layout);`);
  walk(h,15,['d','shift']);
  assert.ok(inspect(h).reactions.some(r=>r.key==='corn:1032:1000'));
  assert.ok(inspect(h).reactions.every(r=>r.key!=='corn:1400:1000'));
  walk(h,130,[]);assert.equal(inspect(h).reactions.length,0);
  assert.equal(h.run('JSON.stringify(WORLD.layout)===before'),true);
});
test('water footsteps stop at a solid wall and while hidden or paused',()=>{
  const h=fixture();
  h.run("WORLD.layout.habitats=[{id:'pool',x:1000,y:1000,kind:'water',r:90}];");
  walk(h,12);assert.ok(inspect(h).marks.length);
  h.run('state.phase="menu";var snapshot=JSON.stringify(EnvironmentSystem.inspect(state));');
  walk(h,60);assert.equal(h.run('JSON.stringify(EnvironmentSystem.inspect(state))===snapshot'),true);
  h.run('state.phase="playing";c.hidden=true;');walk(h,220,[]);assert.equal(inspect(h).marks.length,0);
  h.run('c.hidden=false;OBSTACLES=[{x:c.x+c.hitbox.r+c.hitbox.ox,y:900,w:80,h:250,type:"barn"}];');
  walk(h,180);assert.equal(inspect(h).marks.length,0);
});
test('teleporting does not draw a trail or disturb plants between endpoints',()=>{
  const h=fixture();walk(h,1);
  h.run('c.x=1700;WORLD.layout.habitats=[{id:"pool",x:1700,y:1000,kind:"water",r:90}];');
  walk(h,1);assert.equal(inspect(h).marks.length,0);
  h.run('var from={x:1000,y:986};c.x=1800;c.moving=true;EnvironmentSystem.update(state,.016,from)');
  assert.equal(inspect(h).marks.length,0);
});
test('sprinting through corn is heard farther than sneaking and reports a past position',()=>{
  const h=fixture();
  h.run(`WORLD.layout.plots=[{kind:'corn',x:970,y:950,w:400,h:100,areaId:'milharal'}];
    var wolf=state.entities.wolf;wolf.x=1190;wolf.y=1000;wolf.mode='patrol';wolf.huntUnlockTimer=0;wolf.pauseTimer=0;`);
  walk(h,10,['d','shift']);assert.equal(h.run('wolf.mode'),'investigate');
  const heard=h.run('wolf.heardPoint.x');walk(h,10,['d','shift']);
  assert.equal(h.run('wolf.heardPoint.x'),heard);assert.notEqual(heard,h.run('c.x'));
  h.run('WolfAI.initialize(state);wolf.huntUnlockTimer=0;wolf.x=c.x+190;wolf.y=1000;EnvironmentSystem.initialize(state);');
  walk(h,30,['d','c']);assert.equal(h.run('wolf.mode'),'patrol');
});
test('environment hearing respects walls, challenge isolation and mute-independent gameplay',()=>{
  const h=fixture();
  h.run(`WORLD.layout.habitats=[{id:'pool',x:1000,y:1000,kind:'water',r:90}];
    var wolf=state.entities.wolf;wolf.x=1190;wolf.y=1000;wolf.mode='patrol';wolf.huntUnlockTimer=0;wolf.pauseTimer=0;
    OBSTACLES=[{x:1100,y:900,w:20,h:200,type:'barn'}];`);
  walk(h,10,['d','shift']);assert.equal(h.run('wolf.mode'),'patrol');
  h.run('OBSTACLES=[];state.lake.active=true;EnvironmentSystem.initialize(state);');
  walk(h,10,['d','shift']);assert.equal(h.run('wolf.mode'),'patrol');
  h.run('state.lake.active=false;c.x=1000;EnvironmentSystem.initialize(state);');
  walk(h,10,['d','shift']);assert.equal(h.run('wolf.mode'),'investigate');
});
test('roots remain anchored while the canopy moves; reduced motion preserves gameplay',()=>{
  for(const reducedMotion of [false,true]) {
    const h=fixture({reducedMotion});
    h.run(`WORLD.layout.vegetation=[{id:'tree-test',type:'tree',x:980,y:970,w:80,h:60,blockingRect:{x:1010,y:980,w:20,h:22}}];
      WORLD.layout={...WORLD.layout};EnvironmentSystem.initialize(state);`);
    walk(h,8,['d','shift']);
    assert.ok(inspect(h).reactions.some(r=>r.key.startsWith('tree:')));
    h.run(`var ops=[];EnvironmentSystem.transform({translate:(...p)=>ops.push(p),transform:(...p)=>ops.push(p)},WORLD.layout.vegetation[0],state);`);
    const ops=JSON.parse(h.run('JSON.stringify(ops)'));
    assert.equal(ops.length,3);assert.deepEqual(ops[0],[1020,1002]);assert.deepEqual(ops[2],[-1020,-1002]);
    assert.ok(Math.abs(ops[1][2])>0&&Math.abs(ops[1][2])<.06);
  }
});
test('long movement stays bounded and restarting clears all contact effects',()=>{
  const h=fixture();
  h.run("WORLD.layout.habitats=[{id:'pool',x:1000,y:1000,kind:'water',r:90}];");
  for(let i=0;i<12;i++)walk(h,24,[i%2?'a':'d','shift']);
  const s=inspect(h);assert.ok(s.marks.length<=64);assert.ok(s.particles<=96);assert.ok(s.reactions.length<=100);
  h.run('EnvironmentSystem.initialize(state)');assert.equal(inspect(h).marks.length,0);assert.equal(inspect(h).particles,0);
});
test('wolf tracking keeps earlier land prints but cannot draw a trail across water',()=>{
  const h=fixture();
  h.run(`camera.x=700;camera.y=700;var tracked=[];ctx.translate=(x,y)=>tracked.push({x,y});
    state.entities.wolf.pauseTimer=100;c.sprinting=true;
    WolfAI.update(state,.016);c.x+=30;WolfAI.update(state,.016);
    WolfAI.drawTracks(state);`);
  assert.equal(h.run('tracked.length'),1);
  h.run(`WORLD.layout.habitats=[{id:'pool',x:1160,y:1000,kind:'water',r:90}];
    for(var i=0;i<7;i++){c.x+=30;WolfAI.update(state,.016);}
    tracked=[];WolfAI.drawTracks(state);`);
  assert.equal(h.run('tracked.length'),1,'the older dry-land print remains, without underwater prints');
  h.run('c.x=1280;WolfAI.update(state,.016);c.x=1310;WolfAI.update(state,.016);tracked=[];WolfAI.drawTracks(state);');
  assert.equal(h.run('tracked.length'),2,'a fresh trail starts only after leaving water');
});
