const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createGame } = require('./helpers.cjs');
const plain = value => JSON.parse(JSON.stringify(value));
function setup() {
  const h = createGame(() => .5);
  h.run(`OBSTACLES=[]; var g=state.entities.goose, c=state.entities.chicken, w=state.entities.wolf;
    Object.assign(g,{x:1000,y:800,home:{x:1000,y:800},anchor:{x:1000,y:800},target:{x:1000,y:800},
      mode:'patrol',grace:0,cooldown:0,honkCooldown:0,timer:1});
    Object.assign(c,{x:1110,y:800,hidden:false,invulnerable:0});
    Object.assign(w,{x:2600,y:1650,huntUnlockTimer:0,pauseTimer:0});
    var calls=[]; AudioSystem.play=(name,options)=>calls.push({name,options});
    AudioSystem.playPlayerHurt=()=>calls.push({name:'player-hurt'});`);
  return h;
}
const step = (h, seconds) => h.run(`for(let i=0;i<${Math.ceil(seconds/.05)};i++) GooseSystem.update(state,.05);`);
function charge(h) {
  h.run('GooseSystem.update(state,.05)');
  assert.equal(h.run('g.mode'),'notice');
  step(h,.4);
  assert.equal(h.run('g.mode'),'warning');
  step(h,1.15);
  assert.equal(h.run('g.mode'),'charge');
}

test('goose homes are deterministic and clear in 150 seeds and both world versions', () => {
  const h = createGame(() => .5);
  for (const version of [1,2]) for (let seed=0;seed<150;seed++) {
    h.run(`resetGame(${seed},${version});`);
    assert.equal(h.run('!!state.entities.goose'),true,`home for seed ${seed}/${version}`);
    assert.equal(h.run(`(()=>{const b=getHitbox(state.entities.goose);return OBSTACLES.every(r=>r.blocking===false||
      Math.hypot(b.x-clamp(b.x,r.x,r.x+r.w),b.y-clamp(b.y,r.y,r.y+r.h))>b.r);})()`),true);
    assert.equal(h.run('distance(state.entities.goose.home,WORLD.layout.start)>430'),true);
    const home=h.run('JSON.stringify(state.entities.goose.home)'), layout=h.run('JSON.stringify(WORLD.layout)');
    h.run('GooseSystem.initialize(state)');
    assert.equal(h.run('JSON.stringify(state.entities.goose.home)'),home);
    assert.equal(h.run('JSON.stringify(WORLD.layout)'),layout);
  }
});

test('a goose is separate from ten friends and six optional chicks', () => {
  const h=setup();
  assert.equal(h.run('state.entities.animals.length'),12);
  assert.equal(h.run('state.entities.chicks.length'),6);
  assert.equal(h.run('RescueSystem.all(state).includes(g)'),false);
  assert.equal(h.run('GameManager.rescue(state,g)'),false);
  assert.equal(h.run('state.rescuedCount'),0);
});

test('PANTO approaches a visible visitor at the edge before warning instead of standing still',()=>{
  const h=setup();h.run('c.x=1200;GooseSystem.update(state,.05)');
  assert.equal(h.run('g.mode'),'approach');
  step(h,.7);assert.ok(h.run('g.x')>1000);
  step(h,.55);assert.equal(h.run('g.mode'),'warning');
  assert.equal(h.run('c.invulnerable'),0);
});

test('after the first attempt PANTO circles, then gives a complete fixed warning',()=>{
  const h=setup();h.run('g.attempts=1;GooseSystem.update(state,.05)');step(h,.4);
  assert.equal(h.run('g.mode'),'circle');
  const before=h.run('g.y');step(h,.4);assert.notEqual(h.run('g.y'),before);
  h.run("for(let i=0;i<30&&g.mode==='circle';i++)GooseSystem.update(state,.05)");
  assert.equal(h.run('g.mode'),'warning');
  assert.equal(h.run('g.timer'),h.run('GooseSystem.getConfig(state).warning'));
  const target=h.run('JSON.stringify(g.target)');h.run('c.y+=80');step(h,.2);
  assert.equal(h.run('JSON.stringify(g.target)'),target);
});

test('the warning gives time to dodge and does not hurt a touching player', () => {
  const h=setup(); h.run('c.x=g.x;c.y=g.y');step(h,.5);
  assert.equal(h.run('g.mode'),'warning');
  assert.equal(h.run('state.lives'),3);assert.equal(h.run('c.invulnerable'),0);
  assert.equal(h.run('c.x'),1000);assert.equal(h.run('calls.filter(c=>c.name==="goose-honk").length'),1);
});

test('the dash direction is fixed at the warning, not updated to follow the player',()=>{
  const h=setup();h.run('GooseSystem.update(state,.05)');step(h,.4);
  const target=h.run('JSON.stringify(g.target)');h.run('c.x=1000;c.y=900');step(h,1.15);
  assert.equal(h.run('g.mode'),'charge');assert.equal(h.run('JSON.stringify(g.target)'),target);
  step(h,.8);assert.equal(h.run('c.invulnerable'),0);assert.equal(h.run('state.lives'),3);
});

test('contact gives a safe bump without changing lives, score or stamina',()=>{
  const h=setup();h.run('state.score=500;c.stamina=.6');charge(h);step(h,.4);
  assert.equal(h.run('g.mode'),'recover');assert.equal(h.run('state.lives'),3);
  assert.equal(h.run('state.score'),500);assert.equal(h.run('c.stamina'),.6);
  assert.ok(h.run('c.x')>1110);assert.equal(h.run('c.invulnerable'),.9);
  assert.equal(h.run('calls.filter(c=>c.name==="player-hurt").length'),1);
});

test('a goose bump cannot immediately become a wolf hit',()=>{
  const h=setup();charge(h);step(h,.4);h.run('w.x=c.x;w.y=c.y');
  assert.equal(h.run('Player.checkCatch(state)'),false);assert.equal(h.run('state.lives'),3);
});

test('hiding prevents warnings and also protects against a dash already in progress',()=>{
  const h=setup();h.run('c.hidden=true');step(h,3);assert.equal(h.run('g.mode'),'patrol');
  h.run("c.hidden=false;g.x=1000;g.y=800;g.grace=0;g.timer=1");charge(h);
  h.run('c.hidden=true');step(h,.8);
  assert.equal(h.run('c.x'),1110);assert.equal(h.run('c.invulnerable'),0);
});

test('leaving the territory cancels the warning',()=>{
  const h=setup();h.run('GooseSystem.update(state,.05); c.x=g.home.x+250');step(h,.1);
  assert.equal(h.run('g.mode'),'recover');step(h,5);assert.equal(h.run('g.mode'),'patrol');
});

test('being next to the goose outside its territory does not provoke it',()=>{
  const h=setup();h.run('g.x=1210;g.timer=10;c.x=1225;c.y=800');step(h,.1);
  assert.equal(h.run('g.mode'),'patrol');
});

test('walls block sight and prevent a warning',()=>{
  const h=setup();h.run('OBSTACLES=[{x:1040,y:700,w:20,h:250}]');step(h,.5);
  assert.equal(h.run('g.mode'),'patrol');assert.equal(h.run('calls.length'),0);
});

test('a wall added during a dash stops the goose without clipping',()=>{
  const h=setup();charge(h);h.run('OBSTACLES=[{x:1045,y:700,w:20,h:250}]');step(h,.8);
  assert.ok(h.run('g.x+g.hitbox.r')<1045);assert.equal(h.run('c.invulnerable'),0);
  assert.equal(h.run('state.lives'),3);
});

test('a peck cannot push the chicken through a fence',()=>{
  const h=setup();charge(h);h.run('OBSTACLES=[{x:1150,y:700,w:10,h:250}]');step(h,.4);
  assert.equal(h.run('c.invulnerable'),.9);assert.ok(h.run('getHitbox(c).x+getHitbox(c).r')<=1150.001);
});

test('dashes remain within the leash and return via their original patrol position',()=>{
  const h=setup();h.run('g.x=1034;g.anchor={x:1000,y:800};c.x=1190');charge(h);
  h.run('c.y=950');let max=0;
  for(let i=0;i<180;i++){step(h,.05);max=Math.max(max,h.run('distance(g,g.home)'));}
  assert.ok(max<=220.001);assert.ok(h.run('distance(g,g.home)')<=35);
  assert.equal(h.run('g.mode'),'patrol');assert.equal(h.run('state.lives'),3);
});

test('recovery and return cannot chain attacks even when the player stays nearby',()=>{
  const h=setup();charge(h);step(h,.4);const before=h.run('calls.length');
  h.run('c.invulnerable=0');step(h,1);
  assert.ok(['recover','return','patrol'].includes(h.run('g.mode')));
  assert.equal(h.run('calls.length'),before);
});

test('all non-playing phases freeze the goose completely',()=>{
  const h=setup();for(const phase of ['menu','won','lose','win_cutscene']){
    h.run(`state.phase='${phase}'`);const before=h.run('JSON.stringify(g)');step(h,2);
    assert.equal(h.run('JSON.stringify(g)'),before);
  }
});

test('invalid and zero delta times do not mutate goose state',()=>{
  const h=setup();const before=h.run('JSON.stringify(g)');
  h.run('for(const dt of [0,-1,NaN,Infinity])GooseSystem.update(state,dt)');
  assert.equal(h.run('JSON.stringify(g)'),before);
});

test('the real game loop updates and renders the goose',()=>{
  const h=setup();h.run('updateGame(.05); renderGame()');assert.equal(h.run('g.mode'),'notice');
  h.run("state.phase='menu'");const before=h.run('JSON.stringify(g)');h.run('updateGame(.05)');
  assert.equal(h.run('JSON.stringify(g)'),before);
});

test('save round trips keep goose position, world seed and player progress',()=>{
  const h=createGame(()=>.5);
  h.run(`GameManager.rescue(state,state.entities.animals[0]);
    var oldHome=JSON.stringify(state.entities.goose.home);var oldSeed=state.worldSeed;
    state.entities.goose.cooldown=3; GameManager.save(state);var saved=GameManager.read();
    resetGame(42);GameManager.restore(state,saved);`);
  assert.equal(h.run('state.worldSeed===oldSeed'),true);assert.equal(h.run('state.rescuedCount'),1);
  assert.equal(h.run('JSON.stringify(state.entities.goose.home)===oldHome'),true);
  assert.equal(h.run('state.entities.goose.cooldown'),3);
  assert.equal(h.run('state.entities.goose.mode'),'return');
});

test('older saves without a goose still preserve friends, lives and scores',()=>{
  const h=createGame(()=>.5);h.run(`GameManager.rescue(state,state.entities.animals[0]);state.lives=2;
    GameManager.save(state);var saved=GameManager.read();delete saved.goose;
    GameManager.restore(state,saved);`);
  assert.equal(h.run('state.rescuedCount'),1);assert.equal(h.run('state.score'),100);
  assert.equal(h.run('state.lives'),2);assert.ok(h.run('!!state.entities.goose'));
});

test('malformed goose data resets only the goose, not the saved adventure',()=>{
  const h=createGame(()=>.5);
  h.run('GameManager.rescue(state,state.entities.animals[0]);GameManager.save(state);var saved=GameManager.read()');
  for(const bad of [null,{x:'wrong',y:0},{x:-20,y:900},{x:1e8,y:1e8},{x:0,y:0,anchor:{x:100,y:100}}]){
    h.context.bad=bad;h.run('saved.goose=bad;GameManager.restore(state,saved)');
    assert.equal(h.run('state.rescuedCount'),1);assert.equal(h.run('state.score'),100);
    assert.equal(h.run('distance(state.entities.goose,state.entities.goose.home)'),0);
  }
});

test('loading an attack always returns peacefully with a new reaction grace period',()=>{
  const h=createGame(()=>.5);
  h.run(`state.entities.goose.mode='charge';GameManager.save(state);var saved=GameManager.read();
    GameManager.restore(state,saved);`);
  assert.equal(h.run('state.entities.goose.mode'),'return');assert.equal(h.run('state.entities.goose.grace'),2);
});

test('a nearby wolf investigates the honk source, not the player coordinates',()=>{
  const h=setup();h.run('w.x=1000;w.y=1060;GooseSystem.update(state,.05)');step(h,.4);
  assert.equal(h.run('w.mode'),'investigate');
  assert.deepEqual(plain(h.run('w.heardPoint')),{x:1000,y:800});
  assert.equal(h.run('w.lastKnown'),null);assert.equal(h.run('w.detected'),false);
});

test('honk hearing is local and blocked by multiple intervening walls',()=>{
  const h=setup();assert.equal(h.run('WolfAI.investigateSound(state,{x:1000,y:800})'),false);
  h.run('w.x=1000;w.y=1040;OBSTACLES=[{x:900,y:865,w:200,h:10},{x:900,y:935,w:200,h:10}]');
  assert.equal(h.run('WolfAI.investigateSound(state,{x:1000,y:800})'),false);
});

test('honk cannot interrupt a chase, a witnessed hiding place, an alert or spawn protection',()=>{
  const h=setup();h.run('w.x=1000;w.y=1000');
  for(const mode of ['chase','inspect','alert']){
    h.run(`w.mode='${mode}'`);assert.equal(h.run('WolfAI.investigateSound(state,g)'),false);
    assert.equal(h.run('w.mode'),mode);
  }
  h.run("w.mode='patrol';w.huntUnlockTimer=2");assert.equal(h.run('WolfAI.investigateSound(state,g)'),false);
  h.run('w.huntUnlockTimer=0;w.pauseTimer=1');assert.equal(h.run('WolfAI.investigateSound(state,g)'),false);
});

test('investigating a honk preserves a pending search memory and budget',()=>{
  const h=setup();h.run("w.x=1000;w.y=1000;w.mode='search';w.lastKnown={x:1300,y:700};w.searchTime=5");
  assert.equal(h.run('WolfAI.investigateSound(state,g)'),true);
  assert.equal(h.run('w.investigateReturnMode'),'search');assert.equal(h.run('w.searchTime'),5);
  assert.deepEqual(plain(h.run('w.lastKnown')),{x:1300,y:700});
});

test('invalid environmental noise locations and phases are ignored',()=>{
  const h=setup();h.run('w.x=1000;w.y=1000');
  for(const expression of ['{x:NaN,y:800}','{x:1000,y:Infinity}','{x:-1,y:800}'])
    assert.equal(h.run(`WolfAI.investigateSound(state,${expression})`),false);
  h.run("state.phase='menu'");assert.equal(h.run('WolfAI.investigateSound(state,g)'),false);
});

test('the previous synthesized goose honk remains reproducible for the before/after comparison',()=>{
  const file=path.join(__dirname,'../assets/audio/goose-honk.wav'),a=fs.readFileSync(file);
  assert.equal(a.toString('ascii',0,4),'RIFF');assert.equal(a.readUInt16LE(22),1);
  assert.equal(a.readUInt32LE(24),22050);assert.equal(a.readUInt16LE(34),16);
  require('../scripts/generate-goose-audio.cjs');assert.deepEqual(fs.readFileSync(file),a);
  assert.ok(a.length>20000);let peak=0;for(let i=44;i<a.length;i+=2)peak=Math.max(peak,Math.abs(a.readInt16LE(i)));
  assert.ok(peak>1000&&peak<32767);
});

test('the goose sprite renders all directions and states from a decoded PNG',async()=>{
  const {createCanvas}=require('@napi-rs/canvas'),canvas=createCanvas(180,180);
  const h=setup();h.context.art=canvas.getContext('2d');
  const images=new Map();for(const name of ['goose','goose-alert']){const src=h.run('PremiumWildlifeData')[name].src;images.set(src,await require('@napi-rs/canvas').loadImage(path.join(__dirname,'..',src)));}h.run('GooseArt').install(src=>images.get(src));
  h.run('CharacterArt').install(src=>images.get(src));
  h.run('g.x=90;g.y=100');
  for(const mode of ['patrol','warning','charge','recover','return'])for(const dir of ['up','down','left','right']){
    h.run(`g.mode='${mode}';g.direction='${dir}';GooseArt.draw(art,g,{x:0,y:0,shakeX:0,shakeY:0})`);
  }
  const rgba=canvas.getContext('2d').getImageData(0,0,180,180).data;
  assert.ok(rgba.some((v,i)=>i%4===3&&v>0));
});

test('honk playback respects the existing mute, effects volume and pause controls',async()=>{
  const played=[];
  class MockAudio {
    constructor(src){this.src=src;this.paused=true;this.currentTime=0;this.volume=1;}
    play(){this.paused=false;played.push({src:this.src,volume:this.volume});return Promise.resolve();}
    pause(){this.paused=true;}
  }
  const h=createGame(()=>.5,{Audio:MockAudio});
  h.run('AudioSystem.sync(state);AudioSystem.unlock();AudioSystem.setEffectsVolume(.4)');
  assert.equal(h.run("AudioSystem.play('goose-honk',{volume:.5})"),true);
  assert.match(played.at(-1).src,/assets\/audio\/voices\/v5\/goose-honk\.wav$/);
  assert.equal(played.at(-1).volume,.2);
  h.run('AudioSystem.toggleMute()');assert.equal(h.run("AudioSystem.play('goose-honk')"),false);
  h.run('AudioSystem.toggleMute();AudioSystem.setEffectsVolume(0)');assert.equal(h.run("AudioSystem.play('goose-honk')"),false);
  h.run('AudioSystem.setEffectsVolume(.5);AudioSystem.pause()');assert.equal(h.run("AudioSystem.play('goose-honk')"),false);
  await Promise.resolve();
});

test('difficulty changes warning time without making a dash faster than full sprint',()=>{
  const h=setup(),warnings=[];
  for(const difficulty of ['easy','normal','hard']){
    h.run(`state.difficultyKey='${difficulty}';state.settings=DIFFICULTIES['${difficulty}'];`);
    warnings.push(h.run('GooseSystem.getConfig(state).warning'));
    assert.equal(h.run('GooseSystem.getConfig(state).chargeSpeed<state.settings.chickenSpeed*Player.sprintMultiplier'),true);
    assert.equal(h.run('GooseSystem.getConfig(state).territory'),220);
  }
  assert.ok(warnings[0]>warnings[1]&&warnings[1]>warnings[2]);
});
