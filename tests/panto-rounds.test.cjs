const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
const {playChallenge}=require('./panto-driver.cjs');
function setup(){
  const h=createGame(()=>.5);
  h.run(`OBSTACLES=[];var g=state.entities.goose,c=state.entities.chicken;
    Object.assign(g,{x:1000,y:800,home:{x:1000,y:800},anchor:{x:940,y:800},mode:'charge',target:{x:1120,y:800},
      grace:0,cooldown:0,timer:.4,chargeCounted:false,chargeHit:false});
    Object.assign(c,{x:1080,y:860,hidden:false,invulnerable:0});state.lake.active=true;`);
  return h;
}
function opening(h){h.run("LakeChallenge.recordMiss(state,g);g.mode='stunned';g.timer=state.lake.counterWindow;");}
const key=(repeat=false)=>({key:'e',repeat,target:{tagName:'CANVAS'},preventDefault(){}});

test('a dodge alone does not award a stamp; a counter needs proximity, sight, a live window and one interaction',()=>{
  const h=setup();opening(h);
  assert.equal(h.run('state.lake.misses'),0);
  assert.equal(h.run('LakeChallenge.canCounter(state)'),false);
  h.events.window.keydown(key());assert.equal(h.run('state.lake.misses'),0);
  h.run('c.x=1050;c.y=800;OBSTACLES=[{x:1024,y:775,w:8,h:60}]');
  assert.equal(h.run('LakeChallenge.canCounter(state)'),false);
  h.run('OBSTACLES=[];c.hidden=true');assert.equal(h.run('LakeChallenge.canCounter(state)'),false);
  h.run('c.hidden=false');assert.equal(h.run('LakeChallenge.canCounter(state)'),true);
  h.events.window.keydown(key(true));assert.equal(h.run('state.lake.misses'),0,'held E does not auto-claim a new window');
  h.events.window.keydown(key());assert.equal(h.run('state.lake.misses'),1);
  h.events.window.keydown(key());assert.equal(h.run('state.lake.misses'),1,'one opening gives one stamp');
});

test('expired openings require another dodge, pause freezes the opportunity, and E never hides during a challenge',()=>{
  const h=setup();opening(h);
  h.run(`var hides=0,chicks=0;HidingSpots.toggle=()=>hides++;RescueSystem.callChick=()=>{chicks++;return true};
    state.phase='menu';var time=state.lake.counterWindow;LakeChallenge.update(state,20)`);
  assert.equal(h.run('state.lake.counterWindow'),h.run('time'));
  h.run("state.phase='playing';LakeChallenge.update(state,4);c.x=g.x;c.y=g.y;GameUI.update(state)");
  assert.match(h.elements.get('lakeCounterCue').textContent,/abertura fechou/);
  assert.equal(h.elements.get('lakeWindow').hidden,true);
  h.events.window.keydown(key());assert.equal(h.run('state.lake.misses'),0);
  assert.equal(h.run('hides+chicks'),0);
});

test('the first leg of a double dash gives no opening, and the follow-up gets its own fixed warning',()=>{
  const h=setup();
  h.run(`state.lake.misses=1;g.anchor={x:1000,y:800};g.timer=.5;g.comboRemaining=1;c.y=900;
    for(let i=0;i<20&&g.mode==='charge';i++)GooseSystem.update(state,.05);`);
  assert.equal(h.run('g.mode'),'notice');assert.equal(h.run('state.lake.counterWindow||0'),0);
  assert.equal(h.run('g.comboFollowup'),true);
  h.run('for(let i=0;i<20&&g.mode!=="warning";i++)GooseSystem.update(state,.05)');
  assert.equal(h.run('g.mode'),'warning');assert.ok(h.run('g.timer')>=.72);
  const locked=h.run('JSON.stringify(g.target)');
  h.run('c.x+=60;GooseSystem.update(state,.05)');assert.equal(h.run('JSON.stringify(g.target)'),locked);
});

test('third round feints before a longer committed rush and never awards the bluff',()=>{
  const h=setup();h.run(`state.lake.misses=2;g.mode='notice';g.timer=.01;g.attempts=0;g.dodgeSide=0;
    c.x=1100;c.y=800;GooseSystem.update(state,.05)`);
  assert.equal(h.run('g.mode'),'feint');assert.equal(h.run('state.lake.counterWindow||0'),0);
  h.run('for(let i=0;i<20&&g.mode!=="warning";i++)GooseSystem.update(state,.05)');
  assert.equal(h.run('g.tactic'),'rush');assert.equal(h.run('g.mode'),'warning');
  assert.ok(h.run('GooseSystem.getConfig(state).chargeSeconds')>.65);
});

test('three distinct landed pecks fail the attempt without deleting lives, rescues or points',()=>{
  const h=setup();h.run('state.score=200;state.rescuedCount=2;state.lake.misses=2');
  for(let i=1;i<=3;i++){
    h.run(`c.x=g.x;c.y=g.y;c.invulnerable=0;g.mode='charge';g.chargeHit=false;GooseSystem.update(state,.05)`);
    assert.equal(h.run('state.lake.attempts'),i);
  }
  assert.equal(h.run('state.lake.active'),false);assert.equal(h.run('state.lake.completed'),false);
  assert.equal(h.run('state.lake.misses'),0);assert.equal(h.run('state.lake.feedback'),'failed');
  assert.equal(h.run('state.lives'),3);assert.equal(h.run('state.rescuedCount'),2);assert.equal(h.run('state.score'),200);
  assert.equal(h.run('SkinSystem.unlocked("goose")'),false);
  h.run('GameUI.update(state)');assert.equal(h.elements.get('lakeCounterTitle').textContent,'TENTATIVA ENCERRADA');
  assert.equal(h.run('LakeChallenge.start(state)'),true);assert.equal(h.run('state.lake.attempts'),0);
});

test('touch and controller interaction use the same counter gate and do not depend on the keyboard',()=>{
  for(const device of ['touch','gamepad']){
    const h=setup();opening(h);h.run('c.x=g.x+40;c.y=g.y;GameUI.update(state)');
    if(device==='touch'){
      assert.equal(h.elements.get('touchInteract').textContent,'Carimbar');
      assert.equal(h.elements.get('touchInteract').disabled,false);
      h.events.elements.touchInteract.click();
    }else{
      const pad={index:0,connected:true,mapping:'standard',axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false}))};
      h.context.navigator={getGamepads:()=>[pad]};h.run('GameInput.poll(state,.05)');
      pad.buttons[0].pressed=true;h.run('GameInput.poll(state,.05)');
    }
    assert.equal(h.run('state.lake.misses'),1,device);
  }
});

test('the three rounds remain winnable on easy and hard with normal-speed movement and intact map collisions',()=>{
  for(const difficulty of ['easy','hard']){
    const h=createGame(()=>.5);
    h.run(`difficultySelect.value='${difficulty}';resetGame(52);state.phase='playing';var g=state.entities.goose,c=state.entities.chicken;
      var spot=Array.from({length:16},(_,i)=>({x:g.x+Math.cos(i*Math.PI/8)*105,y:g.y+Math.sin(i*Math.PI/8)*105}))
        .find(p=>WildlifeRules.clear(p,p,c.hitbox)&&DetectionSystem.hasLineOfSight(p,g));
      Object.assign(c,spot,{invulnerable:0});LakeChallenge.start(state)`);
    assert.equal(h.run('state.difficultyKey'),difficulty);
    playChallenge(h);
    assert.equal(h.run('state.lake.completed'),true,difficulty);
    assert.equal(h.run('counterPresses'),3,difficulty);
  }
});

test('bridge deck remains fitted to the pond banks, independent of the seed',()=>{
  const h=createGame(()=>.5);
  for(const seed of [0,14,52,814237]){
    h.run(`resetGame(${seed});var b=LakeChallenge.bridge(),p=STRUCTURES.pond`);
    assert.ok(h.run('b.w>b.h'),'bridge crosses horizontally');
    assert.ok(h.run('Math.abs(b.x-p.x)')<=4);
    assert.ok(h.run('Math.abs(b.x+b.w-p.x-p.w)')<=4);
    assert.ok(h.run('Math.abs(b.y+b.h/2-p.y-p.h/2)')<=.5,'center snaps by at most half a pixel');
    h.run(`state.lake.completed=true;buildObstacles(state);var c=state.entities.chicken;
      c.x=b.x-24;c.y=b.y+b.h/2-14;var dry=true;
      for(let x=b.x-24;x<=b.x+b.w+24;x+=4){Player.move(c,4,0);dry&&=!SwimmingSystem.profile(state).swimming;}`);
    assert.equal(h.run('dry'),true,'the whole west/east walk stays dry');
    assert.ok(h.run('c.x>=b.x+b.w+24'),'both abutments can be crossed');
  }
});
