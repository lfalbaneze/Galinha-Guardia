const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
function fixture(reducedMotion=false) {
  const h=createGame(()=>.5,{reducedMotion});
  h.run(`WORLD.layout={...WORLD.layout,habitats:[],paths:[],lanes:[],clearings:[],vegetation:[],
    plots:[{kind:'garden',id:'review',x:970,y:976,w:240,h:80,areaId:'horta'}],
    decorations:[{type:'crop',x:1032,y:1000,plotId:'review'},{type:'crop',x:1180,y:1000,plotId:'review'}]};
    OBSTACLES=[];var c=state.entities.chicken;Object.assign(c,{x:1000,y:986,invulnerable:0});
    EnvironmentSystem.initialize(state);var calls=[];AudioSystem.play=(...args)=>calls.push(args);`);
  return h;
}
const walk=(h,n,keys=['d'])=>h.run(`input.clear();${keys.map(k=>`input.add('${k}');`).join('')}
  for(var i=0;i<${n};i++)Player.update(state,1/60);`);
const inspect=h=>JSON.parse(h.run('JSON.stringify(EnvironmentSystem.inspect(state))'));

test('garden contact bends only touched crops, rustles softly, then settles without altering the map',()=>{
  const h=fixture();h.run('var before=JSON.stringify(WORLD.layout)');walk(h,16);
  assert.ok(inspect(h).reactions.some(r=>r.key==='crop:1032:1000'));
  assert.ok(inspect(h).reactions.every(r=>r.key!=='crop:1180:1000'));
  assert.equal(inspect(h).particles,0,'walking does not shed leaves');
  assert.ok(h.run("calls.some(([name])=>name==='step-leaves')"));
  assert.equal(h.run('EnvironmentSystem.movementScale(state)'),1,'rows stay walkable');
  walk(h,130,[]);assert.equal(inspect(h).reactions.length,0);
  assert.equal(h.run('JSON.stringify(WORLD.layout)===before'),true);
});

test('sprinting makes a small leaf reaction; sneaking is quieter, including with reduced motion',()=>{
  for(const reduced of [false,true]) {
    const fast=fixture(reduced),quiet=fixture(reduced);walk(fast,12,['d','shift']);walk(quiet,35,['d','c']);
    assert.ok(inspect(fast).particles>0);assert.equal(inspect(quiet).particles,0);
    const volume=h=>h.run("Math.max(0,...calls.filter(([name])=>name==='step-leaves').map(([,o])=>o.volume))");
    assert.ok(volume(fast)>volume(quiet));assert.ok(volume(quiet)>0);
    fast.run(`var ops=[];EnvironmentSystem.transform({translate:(...a)=>ops.push(a),transform:(...a)=>ops.push(a)},WORLD.layout.decorations[0],state)`);
    const ops=JSON.parse(fast.run('JSON.stringify(ops)'));
    assert.deepEqual(ops[0],[1032,1000]);assert.deepEqual(ops[2],[-1032,-1000]);
    assert.ok(Math.abs(ops[1][2])>0&&Math.abs(ops[1][2])<.3,'bend is anchored and bounded');
  }
});

test('garden interactions stop in menus and teleports do not shake rows between destinations',()=>{
  const h=fixture();walk(h,12,['d','shift']);
  h.run('state.phase="menu";var before=JSON.stringify(EnvironmentSystem.inspect(state))');walk(h,90);
  assert.equal(h.run('JSON.stringify(EnvironmentSystem.inspect(state))===before'),true);
  h.run('state.phase="playing";EnvironmentSystem.initialize(state);var from={x:c.x,y:c.y};c.x=1220;c.moving=true;EnvironmentSystem.update(state,.016,from)');
  assert.equal(inspect(h).reactions.length,0);assert.equal(inspect(h).particles,0);
});

test('crop artwork is deterministic and preserves every saved root without duplicate contact entries',()=>{
  const h=createGame(()=>.5);h.run('resetGame(814237);var before=JSON.stringify(WORLD.layout)');
  const crops=h.run('FarmArt.getCrops(WORLD.layout)');
  assert.equal(h.run('FarmArt.getCrops(WORLD.layout)'),crops);
  assert.equal(crops.length,h.run("WORLD.layout.decorations.filter(p=>p.type==='crop').length"));
  assert.equal(new Set(crops.map(p=>p.variant)).size,4);assert.ok(crops.some(p=>p.sprout));
  assert.ok(crops.every(p=>p.depth===p.y+2));
  assert.equal(h.run('JSON.stringify(WORLD.layout)===before'),true);
  assert.equal(h.run("FarmArt.getProps(WORLD.layout).filter(p=>p.type==='crop').length"),0);
});

test('the player passes behind and in front of crops; ending scenes contain no garden layers',()=>{
  const h=fixture();
  h.run(`var drawn=[],originalProp=FarmArt.drawProp;
    FarmArt.drawProp=(ctx,p,...rest)=>{if(p.type==='crop'&&p.x===1032)drawn.push('crop');return originalProp(ctx,p,...rest)};
    drawChicken=()=>drawn.push('player');camera.x=800;camera.y=800;c.x=1032;`);
  h.run('c.y=980;renderGame()');let order=JSON.parse(h.run('JSON.stringify(drawn)'));
  assert.ok(order.indexOf('player')<order.indexOf('crop'));
  h.run('drawn=[];c.y=1010;renderGame()');order=JSON.parse(h.run('JSON.stringify(drawn)'));
  assert.ok(order.indexOf('player')>order.indexOf('crop'));
  h.run('drawn=[];EndGameSequence.start(state);renderGame()');
  assert.equal(h.run("drawn.includes('crop')"),false);
});
