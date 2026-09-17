const test=require('node:test');
const assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
function arena(){
  const h=createGame(()=>.5);
  h.run(`OBSTACLES=[];camera.x=700;camera.y=500;
    var g=state.entities.goose,f=state.entities.foxes[0],o=state.entities.owls[0],c=state.entities.chicken,w=state.entities.wolf;
    Object.assign(g,{x:1000,y:800,home:{x:1000,y:800},anchor:{x:1000,y:800},target:{x:1000,y:800},
      mode:'patrol',timer:1,cooldown:0,grace:0,honkCooldown:0,attempts:0});
    Object.assign(f,{x:1000,y:800,home:{x:1000,y:800},anchor:{x:1000,y:800},target:{x:1000,y:800},
      mode:'hidden',timer:0,cooldown:0,grace:0,route:[]});
    Object.assign(o,{x:1200,y:620,perch:{x:1200,y:620},treeId:'none',heading:0,range:250,fov:Math.PI*.65,
      mode:'watch',cooldown:0,grace:0,alertProgress:0,alertTime:1.4});
    state.entities.foxes=[f];state.entities.owls=[o];
    Object.assign(c,{x:1110,y:800,hidden:false,invulnerable:0});
    Object.assign(w,{x:2600,y:1500,mode:'patrol',huntUnlockTimer:0,pauseTimer:0});
    var sounds=[];AudioSystem.play=(name)=>sounds.push(name);`);
  return h;
}
const step=(h,system,seconds)=>h.run(`for(let i=0;i<${Math.ceil(seconds/.05)};i++)${system}.update(state,.05);`);

test('a sideways dodge outside acquisition range still completes the promised goose charge',()=>{
  const h=arena();h.run('state.lake.active=true');step(h,'GooseSystem',.45);
  assert.equal(h.run('g.mode'),'warning');const aim=h.run('JSON.stringify(g.target)');
  h.run('c.x=1000;c.y=1000');step(h,'GooseSystem',1.15);
  assert.equal(h.run('g.mode'),'charge');assert.equal(h.run('JSON.stringify(g.target)'),aim);
  step(h,'GooseSystem',.8);assert.equal(h.run('state.lake.misses'),1);assert.equal(h.run('c.invulnerable'),0);
});

test('the optional arena honours a committed dodge beyond the ordinary territorial ring',()=>{
  const h=arena();h.run('state.lake.active=true');step(h,'GooseSystem',.45);
  h.run('c.x=1000;c.y=1060');step(h,'GooseSystem',2);
  assert.equal(h.run('state.lake.misses'),1);
  assert.ok(h.run('distance(g,g.home)<=GooseSystem.getConfig(state).territory'));
});

test('a charge interrupted by an obstacle does not award a dodge for an unfinished attack',()=>{
  const h=arena();h.run('state.lake.active=true');step(h,'GooseSystem',.45);
  h.run('c.x=1000;c.y=900');step(h,'GooseSystem',1.15);step(h,'GooseSystem',.2);
  assert.ok(h.run('distance(g,g.anchor)')>36);
  h.run('OBSTACLES=[{x:g.x+22,y:g.y-80,w:8,h:160}]');step(h,'GooseSystem',.7);
  assert.equal(h.run('state.lake.misses'),0);assert.equal(h.run('g.chargeHit'),false);
  h.run('LakeChallenge.updateUI(state)');assert.match(h.elements.get('lakeHelp').textContent,/parou antes do fim/i);
  assert.doesNotMatch(h.elements.get('lakeHelp').textContent,/boa esquiva/i);
});

test('a cramped goose moves to a clear approach before giving a fresh full warning',()=>{
  const h=arena();h.run('OBSTACLES=[{x:1030,y:816,w:50,h:30}];c.x=1110;c.y=800');
  step(h,'GooseSystem',.45);assert.equal(h.run('g.mode'),'reposition');
  const start=h.run('JSON.stringify({x:g.x,y:g.y})');
  h.run('var maxStep=0,bad=false;for(let i=0;i<120 && g.mode!=="warning";i++) { const p={x:g.x,y:g.y};GooseSystem.update(state,.05);maxStep=Math.max(maxStep,distance(g,p));if(!WildlifeRules.clear(g,g,g.hitbox))bad=true; }');
  assert.equal(h.run('bad'),false);assert.ok(h.run('maxStep')<=3.51);
  assert.notEqual(h.run('JSON.stringify({x:g.x,y:g.y})'),start);
  assert.equal(h.run('g.mode'),'warning');assert.ok(h.run('g.timer')>=1.05);
  assert.ok(h.run('distance(g,g.target)')>=36);assert.equal(h.run('c.invulnerable'),0);
});

test('the owl sound reaches a wolf near the owl even when the observed player is far from it',()=>{
  const h=arena();h.run('c.x=1400;c.y=620;w.x=950;w.y=620');step(h,'OwlSystem',1.5);
  assert.equal(h.run('w.mode'),'investigate');assert.equal(h.run('w.heardPoint.x'),1400);
  h.run('c.hidden=true;c.x=1600');step(h,'OwlSystem',.3);
  assert.equal(h.run('w.heardPoint.x'),1400);assert.equal(h.run('w.lastKnown'),null);
});

test('being close to the player does not let a distant wolf hear the owl',()=>{
  const h=arena();h.run('c.x=1420;c.y=620;w.x=1570;w.y=620');step(h,'OwlSystem',1.5);
  assert.equal(h.run('o.mode'),'cooldown');assert.equal(h.run('w.mode'),'patrol');
});

test('walls attenuate the actual route from the owl to the wolf',()=>{
  const h=arena();h.run('c.x=1400;c.y=620;w.x=950;w.y=620;OBSTACLES=[{x:1100,y:500,w:12,h:240}]');
  step(h,'OwlSystem',1.5);assert.equal(h.run('o.mode'),'cooldown');assert.equal(h.run('w.mode'),'patrol');
});

test('the owls own perch does not muffle its call to a nearby wolf',()=>{
  const h=arena();h.run(`var tree=HidingSpots.getSpots().find(s=>s.type==='tree');o.treeId=tree.id;
    tree.blockingRect={x:1190,y:610,w:20,h:20,type:'tree'};OBSTACLES=[tree.blockingRect];
    c.x=1400;c.y=620;w.x=930;w.y=620;`);
  step(h,'OwlSystem',1.5);assert.equal(h.run('w.mode'),'investigate');
});

test('a fox rustles once before its dash and stays silent when it cannot see the player',()=>{
  const h=arena();h.run('c.hidden=true');step(h,'FoxSystem',.3);
  assert.equal(h.run('sounds.length'),0);h.run('c.hidden=false');step(h,'FoxSystem',.5);
  assert.equal(h.run('f.mode'),'warning');assert.equal(h.run('sounds.filter(s=>s==="fox-rustle").length'),1);
  step(h,'FoxSystem',.5);assert.equal(h.run('sounds.filter(s=>s==="fox-rustle").length'),1);
});

test('wildlife warning corridors show the full contact width, even with sound muted',()=>{
  const h=arena();h.run(`var widths=[];ctx.stroke=()=>widths.push(ctx.lineWidth);
    g.mode='warning';g.target={x:1120,y:800};f.mode='warning';f.target={x:1140,y:800};
    GooseSystem.drawTerritory(state);FoxSystem.drawWarnings(state);`);
  assert.ok(h.run('widths.includes(2*(g.hitbox.r+c.hitbox.r))'));
  assert.ok(h.run('widths.includes(2*(f.hitbox.r+c.hitbox.r))'));
});

test('direct updates cannot move or rescue other animals during the lake challenge',()=>{
  const h=arena();h.run('state.lake.active=true;var before=JSON.stringify(state.entities.animals);RescueSystem.update(state,.05)');
  assert.equal(h.run('JSON.stringify(state.entities.animals)'),h.run('before'));
});

test('the lake panel explains whether to approach, dodge or wait',()=>{
  const h=arena();h.run('state.lake.active=true;LakeChallenge.updateUI(state)');
  assert.match(h.elements.get('lakeHelp').textContent,/aproxime/i);
  h.run("g.mode='warning';LakeChallenge.updateUI(state)");assert.match(h.elements.get('lakeHelp').textContent,/saia da faixa/i);
  h.run("g.mode='feint';LakeChallenge.updateUI(state)");assert.match(h.elements.get('lakeHelp').textContent,/blefe/i);
});

test('the fox warning is a short reproducible PCM asset with fades and no clipping',()=>{
  const fs=require('node:fs'),path=require('node:path'),file=path.join(__dirname,'../assets/audio/fox-rustle.wav');
  const before=fs.readFileSync(file);require('../scripts/generate-wildlife-audio.cjs');
  assert.deepEqual(fs.readFileSync(file),before);
  assert.equal(before.toString('ascii',0,4),'RIFF');assert.equal(before.readUInt16LE(22),1);
  assert.equal(before.readUInt32LE(24),22050);assert.equal(before.readUInt16LE(34),16);
  assert.ok((before.length-44)/2/22050<.4);
  let peak=0;for(let i=44;i<before.length;i+=2)peak=Math.max(peak,Math.abs(before.readInt16LE(i)));
  assert.ok(peak>1500&&peak<20000);assert.equal(before.readInt16LE(44),0);assert.ok(Math.abs(before.readInt16LE(before.length-2))<2);
});

test('fox warnings respect effects volume, mute and pause',()=>{
  const played=[];class MockAudio {
    constructor(src){this.src=src;this.paused=true;this.volume=1;this.currentTime=0;}
    play(){this.paused=false;played.push({src:this.src,volume:this.volume});return Promise.resolve();}
    pause(){this.paused=true;}
  }
  const h=createGame(()=>.5,{Audio:MockAudio});h.run('AudioSystem.sync(state);AudioSystem.unlock();AudioSystem.setEffectsVolume(.4)');
  assert.equal(h.run("AudioSystem.play('fox-rustle',{volume:.5})"),true);
  assert.match(played.at(-1).src,/fox-rustle\.wav$/);assert.equal(played.at(-1).volume,.2);
  h.run('AudioSystem.toggleMute()');assert.equal(h.run("AudioSystem.play('fox-rustle')"),false);
  h.run('AudioSystem.toggleMute();AudioSystem.pause()');assert.equal(h.run("AudioSystem.play('fox-rustle')"),false);
});
