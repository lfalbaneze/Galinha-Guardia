const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
const {playChallenge}=require('./panto-driver.cjs');
function arena(difficulty='normal'){
  const h=createGame(()=>.5);
  h.run(`OBSTACLES=[];camera.x=700;camera.y=400;state.difficultyKey='${difficulty}';
    var g=state.entities.goose,o=state.entities.owls[0],c=state.entities.chicken;
    Object.assign(g,{x:1000,y:800,home:{x:1000,y:800},anchor:{x:1000,y:800},target:{x:1000,y:800},
      mode:'patrol',timer:1,cooldown:0,grace:0,honkCooldown:0,attempts:0,lastObserved:null,observationAge:99,
      observedVelocity:{x:0,y:0},maneuver:undefined,dodgeStreak:0,dodgeSide:0,followupUsed:false});
    Object.assign(o,{x:1200,y:620,perch:{x:1200,y:620},treeId:'tree-0',heading:0,range:250,fov:Math.PI*.65,
      mode:'watch',cooldown:0,grace:0,alertProgress:0,alertTime:1.4,movePending:false,flight:null,callTime:0,
      lastSeen:null,lastSeenAge:99,observedMotion:{x:0,y:0},lookTarget:undefined,lookTimer:2.4,lookIndex:0,watchAge:0});
    state.entities.owls=[o];Object.assign(c,{x:1110,y:800,hidden:false,invulnerable:0});
    var sounds=[];AudioSystem.play=name=>sounds.push(name);`);
  return h;
}
const step=(h,system,seconds)=>h.run(`for(let i=0;i<${Math.ceil(seconds/.05)};i++)${system}.update(state,.05);`);

test('Panto cuts back between an intruder and home instead of chasing outward',()=>{
  const h=arena();h.run('g.x=1180;c.x=1020;GooseSystem.update(state,.05)');
  assert.equal(h.run('g.mode'),'reposition');assert.equal(h.run('g.maneuver'),'guard');
  assert.ok(h.run('distance(g.target,g.home)')<40);assert.ok(h.run('g.x')<1180);
  h.run('var maxStep=0,bad=false;for(let i=0;i<40&&g.mode==="reposition";i++){const p={x:g.x,y:g.y};GooseSystem.update(state,.05);maxStep=Math.max(maxStep,distance(p,g));bad ||= !WildlifeRules.clear(g,g,g.hitbox);}');
  assert.equal(h.run('bad'),false);assert.ok(h.run('maxStep')<=5.26);
  assert.equal(h.run('g.mode'),'notice');step(h,'GooseSystem',.4);
  assert.equal(h.run('g.mode'),'warning');assert.ok(h.run('g.timer')>.9);
});

test('Panto chooses an advancing, traversable flank with a usable attack lane',()=>{
  const h=arena();h.run("g.mode='notice';g.timer=0;g.attempts=1;GooseSystem.update(state,.05)");
  assert.equal(h.run('g.mode'),'circle');assert.equal(h.run('g.maneuver'),'flank');
  assert.ok(h.run('g.target.x')>1000,'the choice accounts for the visitor and home, not a fixed perpendicular step');
  assert.equal(h.run('WildlifeRules.clear(g,g.target,g.hitbox)'),true);
  h.run('for(let i=0;i<60&&g.mode!=="warning";i++)GooseSystem.update(state,.05)');
  assert.equal(h.run('g.mode'),'warning');assert.ok(h.run('distance(g,g.target)')>=60);
  const target=h.run('JSON.stringify(g.target)');h.run('c.y+=70');step(h,'GooseSystem',.2);
  assert.equal(h.run('JSON.stringify(g.target)'),target);
});

test('losing sight makes Panto search only the last seen footprint for a bounded time',()=>{
  const h=arena();h.run("g.mode='approach';g.timer=2.5;c.x=1200;GooseSystem.update(state,.05)");
  h.run('c.hidden=true;c.x=1600;c.y=1100;GooseSystem.update(state,.05)');
  assert.equal(h.run('g.maneuver'),'search');assert.equal(h.run('g.target.x'),1200);assert.equal(h.run('g.target.y'),800);
  const target=h.run('JSON.stringify(g.target)');h.run('c.x=400;c.y=300');step(h,'GooseSystem',.4);
  assert.equal(h.run('JSON.stringify(g.target)'),target);step(h,'GooseSystem',2);
  assert.notEqual(h.run('g.maneuver'),'search');assert.notEqual(h.run('g.mode'),'charge');
});

test('only a repeated visible dodge earns one hard-mode follow-up with its own complete warning',()=>{
  for(const difficulty of ['easy','normal','hard','hardcore']){
    const h=arena(difficulty);
    h.run(`Object.assign(g,{x:1100,y:800,anchor:{x:1000,y:800},target:{x:1160,y:800},mode:'charge',timer:.001,
      dodgeSide:1,dodgeStreak:1,chargeHit:false,chargeCounted:false});c.x=1100;c.y=890;GooseSystem.update(state,.05)`);
    if(['easy','normal'].includes(difficulty)){assert.equal(h.run('g.mode'),'stunned');continue;}
    assert.equal(h.run('g.mode'),'notice');assert.equal(h.run('g.comboFollowup'),true);
    assert.equal(h.run('g.timer'),.65);step(h,'GooseSystem',.6);assert.equal(h.run('g.mode'),'notice');
    step(h,'GooseSystem',.1);assert.equal(h.run('g.mode'),'warning');assert.ok(h.run('g.timer')>=h.run('GooseSystem.getConfig(state).warning')-.06);
    const target=h.run('JSON.stringify(g.target)');h.run('c.x=1000;c.y=800');step(h,'GooseSystem',.2);
    assert.equal(h.run('JSON.stringify(g.target)'),target);
    step(h,'GooseSystem',1.8);assert.equal(h.run('g.followupUsed'),true);assert.notEqual(h.run('g.mode'),'notice');
  }
});

test('the lake still requires exactly three close counters with double and rush rounds',()=>{
  const h=arena();h.run('LakeChallenge.start(state)');playChallenge(h);
  assert.equal(h.run('state.lake.completed'),true);assert.equal(h.run('state.lake.misses'),3);
  assert.equal(h.run('counterPresses'),3);assert.equal(h.run('seenTactics.has("double")&&seenTactics.has("rush")'),true);
  assert.equal(h.run('g.rescued'),true);assert.equal(h.run('FarmRefuge.contains(g,g.hitbox.r+2)'),true);
});

test('an idle owl sweeps public approaches without following a hidden player',()=>{
  const a=arena(),b=arena();
  for(const [h,x] of [[a,500],[b,1700]])h.run(`c.hidden=true;c.x=${x};
    WORLD.paths=[{x:1180,y:400,w:40,h:440},{x:1100,y:760,w:340,h:30}];`);
  step(a,'OwlSystem',4.5);step(b,'OwlSystem',4.5);
  assert.ok(a.run('o.heading')>.5);assert.equal(a.run('o.heading'),b.run('o.heading'));
  assert.equal(a.run('o.lastSeen'),null);assert.equal(a.run('sounds.length'),0);
});

test('owl search keeps the interrupted sighting, forgets it, and cannot complete a cancelled alarm',()=>{
  const h=arena();h.run('c.x=1320;c.y=620');step(h,'OwlSystem',.2);
  assert.equal(h.run('o.mode'),'alert');h.run('c.hidden=true;c.x=1700;c.y=1000');step(h,'OwlSystem',.3);
  assert.equal(h.run('o.surveillance'),'search');assert.equal(h.run('o.lastSeen.x'),1320);assert.equal(h.run('o.lastSeen.y'),620);
  assert.equal(h.run('o.alertProgress'),0);assert.equal(h.run('o.target'),null);assert.equal(h.run('sounds.length'),0);
  step(h,'OwlSystem',6.2);assert.equal(h.run('o.lastSeen'),null);assert.equal(h.run('o.surveillance'),'roads');
});

function perches(h){h.run(`state.entities.chicks=[];WildlifeRules.reserved=()=>false;
  WORLD.paths=[{x:800,y:600,w:850,h:40}];WORLD.layout.vegetation=[1200,1450,950].map((x,i)=>({
    id:'tree-'+i,type:'tree',x:x-50,y:500,w:100,h:130,blockingRect:{x:x-12,y:600,w:24,h:20}}));`);}

test('after an alarm the owl chooses a perch overlooking the observed escape route',()=>{
  const h=arena();perches(h);h.run('c.x=1320;c.y=620;o.alertTime=.35;');
  h.run('for(let i=0;i<7;i++){c.x+=8;OwlSystem.update(state,.05);}');
  assert.equal(h.run('o.mode'),'cooldown');assert.ok(h.run('o.observedMotion.x')>100);
  h.run('c.hidden=true;c.x=800;c.y=1000');step(h,'OwlSystem',.8);
  assert.equal(h.run('o.mode'),'relocate');assert.equal(h.run('o.flight.treeId'),'tree-1');
  assert.equal(h.run('o.lastSeen.y'),620);assert.equal(h.run('sounds.length'),1);
});

test('stale sentinels rotate trees without alarms while another flying owl delays patrol rotation',()=>{
  const h=arena();perches(h);h.run('c.hidden=true;o.watchAge=100');step(h,'OwlSystem',.15);
  assert.equal(h.run('o.mode'),'relocate');assert.equal(h.run('sounds.length'),0);
  const paired=arena();perches(paired);paired.run(`c.hidden=true;o.watchAge=100;
    state.entities.owls.push({...o,id:'other',treeId:'tree-2',mode:'relocate',movePending:false,
      flight:{from:{x:950,y:620},to:{x:1450,y:620},treeId:'tree-1',progress:0,duration:100}});`);
  step(paired,'OwlSystem',.5);assert.equal(paired.run('o.mode'),'watch');assert.equal(paired.run('o.movePending'),false);
});

test('failed owl relocation keeps scanning and can still detect again when cooldown expires',()=>{
  const h=arena();perches(h);h.run("WORLD.layout.vegetation=WORLD.layout.vegetation.slice(0,1);o.movePending=true;o.cooldown=.2;c.hidden=true;");
  step(h,'OwlSystem',1);assert.equal(h.run('o.mode'),'watch');assert.equal(h.run('o.movePending'),true);
  h.run('c.hidden=false;c.x=o.x+Math.cos(o.heading)*90;c.y=o.y+Math.sin(o.heading)*90;');step(h,'OwlSystem',1.5);
  assert.equal(h.run('sounds.includes("owl-siren")'),true);
});

test('new sentinel decisions remain frozen during pause and lake isolation',()=>{
  for(const pause of ["state.phase='paused'",'state.lake.active=true']){
    const h=arena();h.run(pause);const before=h.run('JSON.stringify(o)');step(h,'OwlSystem',3);
    assert.equal(h.run('JSON.stringify(o)'),before);
  }
});

test('sentinels cannot acquire or bump a player inside the refuge',()=>{
  const h=arena();h.run(`var refuge=FarmRefuge.bounds;c.x=refuge.x+refuge.w/2;c.y=refuge.y+refuge.h/2;
    Object.assign(g,{x:c.x-80,y:c.y,home:{x:c.x-80,y:c.y}});
    Object.assign(o,{x:c.x-100,y:c.y,perch:{x:c.x-100,y:c.y},heading:0});
    GooseSystem.update(state,.05);OwlSystem.update(state,.05);`);
  assert.notEqual(h.run('g.mode'),'notice');assert.equal(h.run('OwlSystem.canSee(o,c)'),false);
  h.run("g.x=c.x;g.y=c.y;g.mode='charge';g.timer=.1;g.anchor={x:g.x-50,y:g.y};g.target={x:g.x+50,y:g.y};GooseSystem.update(state,.05)");
  assert.equal(h.run('c.invulnerable'),0);assert.equal(h.run('sounds.includes("owl-siren")'),false);
});
