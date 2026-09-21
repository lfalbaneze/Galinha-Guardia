const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {createGame}=require('./helpers.cjs');
const {playChallenge}=require('./panto-driver.cjs');
function setup(){
  const h=createGame(()=>.5);
  h.run(`OBSTACLES=[];var g=state.entities.goose,c=state.entities.chicken;
    Object.assign(g,{x:1000,y:800,home:{x:1000,y:800},anchor:{x:1000,y:800},target:{x:1180,y:800},
      mode:'charge',timer:.2,grace:0,cooldown:0,chargeHit:false,chargeCounted:false,attempts:0});
    Object.assign(c,{x:1100,y:900,hidden:false,invulnerable:0});state.lake.active=true;
    var sounds=[];AudioSystem.play=name=>sounds.push(name);`);
  return h;
}
const step=(h,n)=>h.run(`for(let i=0;i<${n};i++)GooseSystem.update(state,.05);`);
function claim(h){
  assert.ok(h.run('(state.lake.counterWindow||0)>0'));
  h.run('c.x=g.x;c.y=g.y;LakeChallenge.interact(state)');
}
function until(h,condition){
  h.run(`for(let i=0;i<500&&!(${condition});i++)GooseSystem.update(state,.05);`);
  assert.ok(h.run(condition),h.run('JSON.stringify({mode:g.mode,x:g.x,y:g.y,misses:state.lake.misses})'));
}

test('a genuine dodge opens a counter when the dash timer finishes before the exact endpoint',()=>{
  const h=setup();step(h,10);
  assert.equal(h.run('g.mode'),'stunned');assert.ok(h.run('distance(g,g.anchor)')>36);
  assert.equal(h.run('state.lake.misses'),0);claim(h);
  assert.equal(h.run('state.lake.misses'),1);assert.equal(h.run('sounds.filter(n=>n==="panto-dodge").length'),1);
  step(h,2);assert.equal(h.run('state.lake.misses'),1);
});

test('baiting a moving dash into a wall counts, but a dash blocked at its start does not',()=>{
  for(const wall of [1028,1090]){
    const h=setup();h.run(`g.timer=.65;OBSTACLES=[{x:${wall},y:730,w:12,h:160}]`);step(h,20);
    if(wall===1090)claim(h);
    assert.equal(h.run('state.lake.misses'),wall===1090?1:0);
    assert.ok(h.run('g.x+g.hitbox.r')<wall);
  }
});

test('stepping behind cover after the warning locks does not cancel a committed dash',()=>{
  const h=setup();h.run(`g.mode='warning';g.timer=.1;g.target={x:1180,y:800};
    OBSTACLES=[{x:1040,y:840,w:35,h:25}];`);
  step(h,18);claim(h);assert.equal(h.run('state.lake.misses'),1);
  assert.equal(h.run('g.target.x'),1180);
});

test('the whole visible challenge ring is playable, including beyond the normal territory',()=>{
  const h=setup();h.run(`Object.assign(g,{x:1190,mode:'patrol',timer:1});c.x=1270;c.y=800;GooseSystem.update(state,.05)`);
  assert.equal(h.run('g.mode'),'notice');until(h,"g.mode==='warning'");
  h.run('c.y+=80');until(h,"g.mode==='stunned'");claim(h);assert.equal(h.run('state.lake.misses'),1);
  assert.ok(h.run('distance(g,g.home)')<=310.01);
});

test('Panto recovers at the end of the dash and prepares the next warning from a different position',()=>{
  const h=setup();step(h,10);const stopped=h.run('g.x');
  assert.ok(stopped>1060);step(h,12);assert.equal(h.run('g.x'),stopped);
  h.run('c.x=g.x+75;c.y=g.y+60');until(h,"g.mode==='warning'");
  assert.ok(h.run('distance(g,g.home)')>60,'no mandatory walk back to the spawn');
  assert.ok(h.run('distance(g,g.anchor)')<.01,'new warning starts where Panto is');
  const target=h.run('JSON.stringify(g.target)');h.run('c.x-=75');step(h,2);
  assert.equal(h.run('JSON.stringify(g.target)'),target,'full fixed warning after repositioning');
});

test('third dodge shows 3/3 and completion, plays one fanfare and survives UI refresh without replay',()=>{
  const h=setup();h.run('state.lake.misses=2');step(h,10);claim(h);h.run('GameUI.update(state)');
  assert.equal(h.run('state.lake.completed'),true);assert.equal(h.elements.get('lakeCounter').hidden,false);
  assert.equal(h.elements.get('lakeCounterValue').textContent,'3/3');
  assert.equal(h.elements.get('lakeCounterTitle').textContent,'PANTO RESGATADO!');
  assert.equal(h.elements.get('lakeStamp3').dataset.earned,'true');
  h.run('for(let i=0;i<5;i++){LakeChallenge.recordMiss(state,g);GameUI.update(state);renderGame()}');
  assert.equal(h.run('sounds.filter(n=>n==="panto-victory").length'),1);
  h.run("state.phase='menu';GameUI.update(state)");assert.equal(h.elements.get('lakeCounter').hidden,true);
});

test('an actual collision keeps the counter unchanged and explains the missed attempt',()=>{
  const h=setup();h.run('c.x=g.x;c.y=g.y;GooseSystem.update(state,.05);GameUI.update(state)');
  assert.equal(h.run('state.lake.misses'),0);assert.equal(h.elements.get('lakeCounterValue').textContent,'0/3');
  assert.match(h.elements.get('lakeCounterCue').textContent,/Pegou/);assert.equal(h.run('sounds.includes("panto-dodge")'),false);
});

test('the original Panto cues are valid, non-clipping PCM assets',()=>{
  for(const name of ['panto-dodge','panto-victory']){
    const wav=fs.readFileSync(path.join(__dirname,`../assets/audio/${name}.wav`));
    assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt32LE(24),22050);
    assert.equal(wav.readUInt16LE(34),16);let peak=0;
    for(let i=44;i<wav.length;i+=2)peak=Math.max(peak,Math.abs(wav.readInt16LE(i)));
    assert.ok(peak>1000&&peak<32767);
  }
});

test('the victory cue lowers the background music temporarily and respects mute, volume and pause',()=>{
  const players=[];
  class MockAudio {
    constructor(src){this.src=src;this.paused=true;this.currentTime=0;this.volume=1;players.push(this);}
    play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}
  }
  const h=createGame(()=>.5,{Audio:MockAudio});
  h.run('AudioSystem.sync(state);AudioSystem.unlock();AudioSystem.setMusicVolume(.5);AudioSystem.setEffectsVolume(.4)');
  assert.equal(h.run("AudioSystem.play('panto-victory',{volume:.8})"),true);
  const music=players.find(a=>a.loop),cue=players.find(a=>a.src.endsWith('panto-victory.wav'));
  assert.ok(cue);assert.ok(Math.abs(cue.volume-.4*.8*.68)<.001);assert.equal(music.volume,.5,'music fades instead of jumping');
  h.run('for(let i=0;i<40;i++)AudioSystem.update(state,.05)');
  assert.ok(Math.abs(music.volume-.5*.55)<.001);
  cue.onended();h.run('for(let i=0;i<160;i++)AudioSystem.update(state,.05)');assert.equal(music.volume,.5);
  h.run('AudioSystem.toggleMute()');assert.equal(h.run("AudioSystem.play('panto-victory')"),false);
  h.run('AudioSystem.toggleMute();AudioSystem.setEffectsVolume(0)');assert.equal(h.run("AudioSystem.play('panto-dodge')"),false);
  h.run('AudioSystem.setEffectsVolume(.4);AudioSystem.pause()');assert.equal(h.run("AudioSystem.play('panto-victory')"),false);
});

test('three full rounds with continuous sidesteps and close counters earn the challenge',()=>{
  const h=setup();
  h.run("Object.assign(g,{mode:'patrol',timer:1});c.x=1110;c.y=800;state.lake.active=false;LakeChallenge.start(state)");
  playChallenge(h);
  assert.equal(h.run('state.lake.completed'),true);
  assert.equal(h.run('state.lake.misses'),3);assert.equal(h.run('state.lives'),3);
  assert.equal(h.run('counterPresses'),3);
  assert.equal(h.run('seenTactics.has("double") && seenTactics.has("rush")'),true);
  assert.equal(h.run('sounds.filter(n=>n==="panto-dodge").length'),3);
  assert.equal(h.run('sounds.filter(n=>n==="panto-victory").length'),1);
  assert.ok(h.run('warningOrigin.slice(1).some(p=>distance(p,warningOrigin[0])>40)'));
  assert.equal(h.elements.get('lakeCounterValue').textContent,'3/3');
});

test('three counters can be earned on real farm layouts with their original collisions intact',()=>{
  const h=createGame(()=>.5);
  for(const seed of [0,14,52,814237]){
    h.run(`resetGame(${seed});state.phase='playing';var g=state.entities.goose,c=state.entities.chicken;
      var spot=Array.from({length:16},(_,i)=>({x:g.x+Math.cos(i*Math.PI/8)*105,y:g.y+Math.sin(i*Math.PI/8)*105}))
        .find(p=>WildlifeRules.clear(p,p,c.hitbox)&&DetectionSystem.hasLineOfSight(p,g));
      Object.assign(c,spot,{invulnerable:0});var started=LakeChallenge.start(state),dodgeTo=null,lastMode='';
      `);
    playChallenge(h);
    assert.equal(h.run('started'),true,`start ${seed}`);
    assert.equal(h.run('state.lake.completed'),true,`complete ${seed}`);
    assert.equal(h.run('state.lake.misses'),3);assert.equal(h.run('state.lives'),3);
    // A defeated Panto joins the rescued herd, including when the final dash left his leash.
    h.run('for(let i=0;i<500;i++)GooseSystem.update(state,.05)');
    assert.equal(h.run('g.rescued'),true);
    assert.ok(h.run('distance(g,FarmRefuge.gooseHome())')<1,`refuge after completion ${seed}`);
    assert.equal(h.run('WildlifeRules.clear(g,g,g.hitbox)'),true,`collision ${seed}`);
  }
});
