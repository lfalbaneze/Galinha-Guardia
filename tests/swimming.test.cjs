const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
function fixture(options) {
  const h=createGame(()=>.5,options);
  h.run(`var pond=STRUCTURES.pond,c=state.entities.chicken;
    Object.assign(c,{x:pond.x+pond.w/2,y:pond.y+pond.h/2-14,hidden:false,invulnerable:0,skin:'classic'});
    OBSTACLES=OBSTACLES.filter(p=>p.type==='pond');EnvironmentSystem.initialize(state);`);
  return h;
}
const profile=h=>JSON.parse(h.run('JSON.stringify(SwimmingSystem.profile(state))'));
const swim=(h,frames,keys=['d'])=>h.run(`input.clear();${keys.map(k=>`input.add('${k}');`).join('')}
  for(var i=0;i<${frames};i++)Player.update(state,1/60);`);

test('hens and land-animal appearances float, while duck and goose appearances swim naturally',()=>{
  const h=fixture();
  for(const skin of ['classic','silkie','blue','punk','astronaut','robocop','priest','goose','unknown']) {
    h.context.skin=skin;h.run('c.skin=skin');const result=profile(h);
    assert.equal(result.swimming,true,skin);assert.equal(result.depth,1,skin);
    assert.equal(result.native,['punk','goose'].includes(skin),skin);
    h.run('GameUI.update(state)');assert.equal(h.elements.get('hiddenText').textContent,result.native?'Nadando':'De boia');
  }
});

test('natural swimmers paddle faster, including the duck power, with normalized controls and unchanged land speed',()=>{
  const h=fixture(),speeds=[];
  for(const skin of ['classic','punk','goose']) {
    h.run(`Object.assign(c,{x:pond.x+pond.w/2,y:pond.y+pond.h/2-14,skin:'${skin}'});var before={x:c.x,y:c.y};`);
    swim(h,6,['d','s']);speeds.push(h.run('distance(c,before)/(6/60)'));
    assert.ok(Math.abs(h.run('c.vx-c.vy'))<.001,'diagonal is normalized');
  }
  const speed=h.run('c.speed');assert.ok(Math.abs(speeds[0]-speed*.56)<.001);
  assert.ok(Math.abs(speeds[1]-speed*.94*1.25)<.001);assert.ok(Math.abs(speeds[2]-speed*.94)<.001);
  h.run('c.x=100;c.y=600');assert.equal(h.run('EnvironmentSystem.movementScale(state)'),1);
});

test('real pond collision admits the player but still blocks wolves and solid scenery',()=>{
  const h=fixture();
  h.run(`var b=LakeChallenge.bridge();c.x=b.x;c.y=b.y+b.h/2-14;Player.move(c,b.w,0);
    var w=state.entities.wolf;w.x=b.x;w.y=b.y+b.h/2;Player.move(w,b.w,0);`);
  assert.ok(h.run('Math.abs(c.x-b.x-b.w)<.01'));assert.ok(h.run('w.x<b.x+b.w-40'));
  h.run(`c.x=pond.x+pond.w/2;c.y=pond.y+pond.h/2-14;
    var wall={x:c.x+35,y:c.y-80,w:25,h:160,type:'barn'};OBSTACLES.push(wall);Player.move(c,100,0)`);
  assert.ok(h.run('getHitbox(c).x+getHitbox(c).r<=wall.x+.01'));
});

test('the actual shoreline supports entering and leaving, with a splash and wet prints',()=>{
  const h=fixture();h.run(`c.x=pond.x-30;var started=false,stopped=false;input.add('d');
    for(var n=0;n<220;n++) {Player.update(state,1/60);var active=SwimmingSystem.profile(state).swimming;started||=active;if(started&&!active)stopped=true;}`);
  assert.equal(h.run('started&&stopped'),true);
  assert.equal(profile(h).swimming,false);
  assert.ok(h.run("EnvironmentSystem.inspect(state).marks.some(m=>m.kind==='wet')"));
});

test('shallow pools, grass, bank corners and the earned bridge never require a float',()=>{
  const h=fixture();
  h.run('c.x=pond.x;c.y=pond.y-14');assert.equal(profile(h).swimming,false);
  h.run(`c.x=1000;c.y=986;WORLD.layout.habitats=[{id:'shallow',x:1000,y:1000,kind:'water',r:90}];`);
  assert.equal(profile(h).swimming,false);assert.equal(h.run('EnvironmentSystem.movementScale(state)'),.78);
  h.run(`state.lake.completed=true;var b=LakeChallenge.bridge();c.x=b.x+b.w/2;c.y=b.y+b.h/2-14;`);
  assert.equal(profile(h).swimming,false);assert.equal(h.run('EnvironmentSystem.movementScale(state)'),1);
  h.run('c.y=pond.y+pond.h*.2-14');assert.equal(profile(h).swimming,true,'water beside the bridge remains swimmable');
});

test('sprint uses stamina in the water and pause freezes the player and water effects',()=>{
  const h=fixture();swim(h,15,['d','shift']);assert.ok(h.run('c.stamina<1&&c.sprinting'));
  h.run('state.phase="menu";var before=JSON.stringify(c),effects=JSON.stringify(EnvironmentSystem.inspect(state))');
  swim(h,60,['s','shift']);assert.equal(h.run('JSON.stringify(c)===before'),true);
  assert.equal(h.run('JSON.stringify(EnvironmentSystem.inspect(state))===effects'),true);
});

test('saving in the pond resumes in the float and changing appearance there applies immediately',()=>{
  const h=fixture();h.run('GameManager.save(state);var saved=GameManager.read();var x=c.x,y=c.y;resetGame();GameManager.restore(state,saved);c=state.entities.chicken');
  assert.equal(h.run('c.x===x&&c.y===y'),true);assert.equal(profile(h).swimming,true);assert.equal(profile(h).native,false);
  h.run('SkinSystem.unlockLake(state);SkinSystem.equip(state,"goose")');assert.equal(profile(h).native,true);
  h.run('SkinSystem.equip(state,"blue")');assert.equal(profile(h).native,false);
});

test('swimming cannot hide in bank foliage or award Panto challenge stamps',()=>{
  const h=fixture();h.run(`HidingSpots.toggle(state);state.lake.active=true;state.lake.misses=2;state.lake.counterWindow=3;
    var g=state.entities.goose;Object.assign(g,{x:c.x+20,y:c.y,home:{x:c.x,y:c.y},mode:'stunned',chargeCounted:true});`);
  assert.equal(h.run('c.hidden'),false);assert.equal(h.run('LakeChallenge.canCounter(state)'),false);
  h.run('LakeChallenge.update(state,.016)');assert.equal(h.run('state.lake.active'),false);
  assert.equal(h.run('state.lake.misses'),0);assert.equal(h.run('state.lake.completed'),false);
  assert.equal(h.run('SkinSystem.unlocked("goose")'),false);assert.equal(h.run('LakeChallenge.available(state)'),false);
});

test('swimming composition preserves Canvas state and reduced motion stops bobbing',async()=>{
  const {createCanvas}=require('@napi-rs/canvas');
  const canvas=createCanvas(900,520),ctx=canvas.getContext('2d');
  const h=fixture({drawingContext:ctx,reducedMotion:true});await require('../scripts/sprite-loader.cjs').loadGameSprites(h);
  h.run('camera.x=c.x-450;camera.y=c.y-250;c.moving=false;state.elapsed=0');
  ctx.fillStyle='#123456';ctx.imageSmoothingEnabled=true;ctx.globalAlpha=.8;
  h.run('SwimmingSystem.draw(state)');
  // Napi's fillStyle getter caches the last assignment even after native restore(). Check the paint itself.
  ctx.fillRect(0,0,1,1);const pixel=[...ctx.getImageData(0,0,1,1).data];
  assert.ok(pixel.every((v,i)=>Math.abs(v-[18,52,86,204][i])<=1));ctx.clearRect(0,0,1,1);
  const first=canvas.toBuffer('image/png');
  assert.equal(ctx.imageSmoothingEnabled,true);assert.ok(Math.abs(ctx.globalAlpha-.8)<.01);
  assert.equal(ctx.getTransform().e,0);assert.equal(ctx.getTransform().a,1);
  ctx.clearRect(0,0,900,520);h.run('state.elapsed=12;SwimmingSystem.draw(state)');
  assert.deepEqual(canvas.toBuffer('image/png'),first);
  h.run('state.phase="win_cutscene"');assert.equal(profile(h).swimming,false);
});
