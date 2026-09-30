const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../shuffle/survival.js'),E=require('../shuffle/engine.js'),M=require('../shuffle/maps.js');
const gap=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function arena(){const r=S.newRun(614);r.obstacles=[];r.layout.obstacles=r.obstacles;
  Object.assign(r.player,{x:560,y:360});r.enemies=[];r.pickups=[];r.spawnTimer=999;r.heroCooldown=999;return r;}
function enemy(x=625,y=360,health=1){return{x,y,health,species:'fox',r:18,speed:0,dx:0,dy:1,
  traveled:0,moving:false,route:[],routeTimer:0,routeTarget:null};}
function folklore(id,extra={}){const d=S.ENEMIES[id];return {...enemy(700,360,d.hp),species:id,r:d.r,
  baseSpeed:d.speed,speed:d.speed,maxHealth:d.hp,age:0,side:1,mode:'hunt',timer:0,trailTimer:0,...extra};}

test('all eight appearances have distinct working signature powers',()=>{
  function hero(skin){const r=arena();r.player.skin=skin;r.heroCooldown=0;r.powers={};r.player.invulnerable=20;return r;}
  let r=hero('classic');r.enemies=[enemy(665,360,30),enemy(670,403,30)];
  for(let i=0;i<20;i++)S.tick(r,.05);
  assert.ok(r.enemies.every(e=>e.health===26),'Erina egg explodes onto adjacent targets');
  r=hero('silkie');r.enemies=[enemy()];S.tick(r,.01);assert.equal(r.player.shield,true);assert.equal(r.enemies[0].slow,3);
  r.player.invulnerable=0;const hp=r.hp;E.hurt(r);assert.equal(r.hp,hp);assert.equal(r.player.shield,false);
  r=hero('blue');r.enemies=[100,210,320,410,500].map(x=>enemy(560+x,360,30));S.tick(r,.01);
  assert.deepEqual(r.enemies.map(e=>e.health),[27.5,27.5,27.5,27.5,30],'Alzira chains to four visible enemies');
  r=hero('punk');r.enemies=[enemy(680,360,30),enemy(810,360,30)];
  for(let i=0;i<22;i++)S.tick(r,.05);assert.ok(r.enemies.every(e=>e.health<=28),'Water pierces through the first target');
  r=hero('astronaut');E.dash(r,1,0);for(let i=0;i<6;i++)S.tick(r,.05);
  assert.ok(r.mines.length>=2);assert.ok(r.mines.length<=3);const mine=r.mines[0];r.enemies=[enemy(mine.x,mine.y,30)];
  for(let i=0;i<15;i++)S.tick(r,.05);assert.ok(r.enemies[0].health<30,'Dash plants armed carrot mines');
  r=hero('robocop');r.enemies=[enemy(625,360,30),enemy(760,360,30)];S.tick(r,.01);
  assert.equal(r.enemies[0].health,28.5);assert.equal(r.enemies[1].health,30);
  r=hero('priest');r.enemies=[enemy(660,360,30)];S.tick(r,.01);
  assert.equal(r.enemies[0].health,28);assert.ok(r.enemies[0].x>=749,'Bark pushes away from Paçoca');
  r=hero('goose');r.enemies=[enemy(660,360,30),enemy(400,360,30)];S.tick(r,.01);
  assert.equal(r.enemies[0].stun,2);assert.equal(r.enemies[1].stun,0);assert.equal(r.enemies[1].health,30);
  assert.equal(new Set(Object.values(S.HEROES).map(h=>h.name)).size,8);
  assert.equal(S.newRun(9,[], '__proto__').player.skin,'classic');
});

test('signature powers respect walls, pause and fresh-run resets',()=>{
  for(const skin of Object.keys(S.HEROES)){
    const r=arena();r.player.skin=skin;r.powers={};r.heroCooldown=0;r.player.invulnerable=50;
    r.enemies=[enemy(660,360,50)];r.obstacles.push({x:610,y:300,w:25,h:120});
    for(let i=0;i<30;i++)S.tick(r,.05);
    assert.equal(r.enemies[0].health,50,skin);r.paused=true;const frozen=JSON.stringify(r);
    S.tick(r,.05,{x:1,y:0});assert.equal(JSON.stringify(r),frozen);
    const fresh=S.newRun(9,[],skin);assert.equal(fresh.player.skin,skin);assert.equal(fresh.mines.length,0);assert.equal(fresh.heroCooldown,1);
  }
});

test('survival seeds reproduce connected items, themes and safe moving waves',()=>{
  const themes=new Set();
  for(let seed=1;seed<=100;seed++){
    const r=S.newRun(seed),copy=S.newRun(seed);themes.add(r.stage);
    assert.deepEqual(r.layout,copy.layout);assert.deepEqual(r.pickups,copy.pickups);
    assert.ok(r.pickups.some(p=>gap(p,r.player)<155));
    for(const p of r.pickups){assert.ok(M.clearCircle(r.layout,p,22));assert.ok(r.layout.roads.some(road=>M.clearSegment(r.layout,p,road.a,22)));}
    S.tick(r,.01);S.tick(copy,.01);assert.deepEqual(r.enemies,copy.enemies);
    assert.ok(r.enemies.length>=3);assert.ok(r.enemies.every(e=>gap(e,r.player)>360));
    for(let i=0;i<30;i++)S.tick(r,1/60);
    assert.ok(r.enemies.some(e=>e.traveled>10));
  }
  assert.ok(themes.size>4);
});
test('ground items grant powers, respect caps, heal and level up',()=>{
  const r=arena();
  for(const kind of Object.keys(S.POWERS)){
    for(let i=0;i<5;i++){r.pickups.push({kind,x:r.player.x,y:r.player.y,value:1});S.tick(r,.01);}
    assert.equal(r.powers[kind],3);
  }
  assert.ok(E.stats(r).speed>205);r.hp=1;
  r.pickups.push({kind:'milk',x:r.player.x,y:r.player.y,value:1});S.tick(r,.01);assert.equal(r.hp,3);
  r.pickups.push({kind:'xp',x:r.player.x,y:r.player.y,value:S.xpNeeded(r)});S.tick(r,.01);
  assert.equal(r.level,2);assert.equal(r.xp,0);assert.equal(r.hp,4);
});
test('each automatic weapon defeats enemies and awards collectible XP',()=>{
  for(const kind of ['cornshot','egg','sickle']){
    const r=arena();r.powers={[kind]:1};r.enemies=[enemy()];
    for(let i=0;i<60;i++)S.tick(r,1/60);
    assert.equal(r.kills,1,kind);assert.equal(r.enemies.length,0);
    assert.ok(r.xp+r.pickups.filter(p=>p.kind==='xp').reduce((n,p)=>n+p.value,0)>0);
  }
});
test('solid scenery blocks weapons and collection',()=>{
  const r=arena();r.player.x=520;r.obstacles.push({x:545,y:340,w:30,h:40,kind:'hay'});
  r.powers={cornshot:3,egg:3,sickle:3};r.enemies=[enemy(600,360,20)];
  r.pickups=[{kind:'xp',x:600,y:360,value:1}];
  for(let i=0;i<60;i++)S.tick(r,1/60);
  assert.equal(r.enemies[0].health,20);assert.equal(r.xp,0);assert.equal(r.pickups[0].x,600);
});
test('pause, invalid time, gates, defeat and victory preserve survival semantics',()=>{
  let r=arena();r.paused=true;const frozen=JSON.stringify(r);
  for(const dt of [.05,NaN,Infinity,-1])S.tick(r,dt,{x:1,y:1});assert.equal(JSON.stringify(r),frozen);
  r.paused=false;Object.assign(r.player,r.exit);const stage=r.stage;S.tick(r,.01);
  assert.equal(r.stage,stage);assert.equal(r.phase,'playing');assert.equal(E.exitReady(r),false);
  r.hp=1;r.player.invulnerable=0;r.enemies=[enemy(r.player.x,r.player.y,50)];S.tick(r,.01);
  assert.equal(r.phase,'lost');
  r=arena();r.elapsed=S.DURATION-.01;S.tick(r,.02);assert.equal(r.phase,'won');assert.equal(S.wave(r),10);
});
test('complete five-minute fixture keeps hordes and loose XP bounded',()=>{
  const r=S.newRun(614);r.powers={cornshot:3,egg:3,sickle:3};r.player.invulnerable=301;
  let peak=0;
  for(let i=0;i<=S.DURATION*20;i++){
    S.tick(r,.05);peak=Math.max(peak,r.enemies.length);
    assert.ok(r.enemies.length<=S.MAX_ENEMIES);assert.ok(r.pickups.filter(p=>p.kind==='xp').length<=160);
  }
  assert.equal(r.phase,'won');assert.ok(peak>8);assert.ok(r.kills>10);
});
test('a crowd remains separated instead of hiding inside one sprite',()=>{
  const r=arena();r.powers={};r.player.invulnerable=30;
  r.enemies=Array.from({length:12},(_,i)=>({...enemy(560+Math.cos(i)*150,360+Math.sin(i)*150,20),speed:120}));
  for(let i=0;i<400;i++){
    const before=r.enemies.map(e=>({...e}));S.tick(r,1/60);
    r.enemies.forEach((e,j)=>assert.ok(Math.abs(e.traveled-before[j].traveled-gap(e,before[j]))<1e-8));
  }
  for(let i=0;i<r.enemies.length;i++)for(let j=i+1;j<r.enemies.length;j++)assert.ok(gap(r.enemies[i],r.enemies[j])>15);
  assert.ok(r.enemies.every(e=>M.clearCircle(r.layout,e,e.r)));
});
test('the eight enemy types enter on their waves, with safe spawns and only one Cuca',()=>{
  for(const [id,d] of Object.entries(S.ENEMIES)){
    const r=S.newRun(31,[id]);r.powers={};r.player.invulnerable=400;
    if(d.wave>1){r.elapsed=(d.wave-1)*30-1;S.tick(r,.01);assert.equal(r.enemies.length,0);}
    r.elapsed=(d.wave-1)*30;r.spawnTimer=0;S.tick(r,.01);
    assert.ok(r.enemies.length>0,id);assert.ok(r.enemies.every(e=>e.species===id&&M.clearCircle(r,e,e.r)));
    assert.ok(r.enemies.every(e=>gap(e,r.player)>360));
    if(id==='cuca'){r.spawnTimer=0;S.tick(r,.01);assert.equal(r.enemies.length,1);}
  }
  const r=S.newRun(31,['fox','wolf','goose']);r.elapsed=240;S.tick(r,.01);
  assert.ok(r.enemies.every(e=>['fox','wolf','goose'].includes(e.species)),'No invisible enemies when art is unavailable');
});
test('foxes flank and martens alternate quick bursts with a slower scurry',()=>{
  const r=arena();r.powers={};const fox=folklore('fox');r.enemies=[fox];S.tick(r,.05);
  assert.ok(fox.y<360,'Fox approaches a flank');
  for(let i=0;i<45;i++)S.tick(r,.05);
  assert.ok(gap(fox,r.player)<40,'Flanking must eventually reach the player instead of orbiting forever');
  const marten=folklore('fuinha');r.enemies=[marten];S.tick(r,.05);const burst=marten.speed;
  marten.age=1;S.tick(r,.05);assert.ok(burst>marten.speed*1.5);
});
test('headless mule warns, locks its aim, charges and stops at solid scenery',()=>{
  const r=arena();r.powers={};const mule=folklore('mula-sem-cabeca');r.enemies=[mule];
  S.tick(r,.05);assert.equal(mule.mode,'warning');assert.equal(mule.x,700);
  const aim=[mule.aimX,mule.aimY];r.player.y=490;
  for(let i=0;i<19;i++)S.tick(r,.05);
  assert.deepEqual([mule.aimX,mule.aimY],aim);assert.equal(mule.mode,'charge');
  r.obstacles.push({x:610,y:320,w:30,h:80});
  for(let i=0;i<16;i++)S.tick(r,.05);
  assert.ok(mule.x>=640+mule.r);assert.equal(mule.mode,'recover');
});
test('Curupira roots give warning, hurt only after arming, expire and respect dash immunity',()=>{
  const r=arena();r.powers={};r.player.invulnerable=0;r.enemies=[folklore('curupira')];
  S.tick(r,.05);assert.equal(r.hazards[0].kind,'roots');assert.equal(r.hp,5);r.enemies=[];
  for(let i=0;i<15;i++)S.tick(r,.05);assert.equal(r.hp,5);
  for(let i=0;i<5;i++)S.tick(r,.05);assert.equal(r.hp,4);
  r.player.invulnerable=0;r.player.dashTime=.1;S.tick(r,.01);assert.equal(r.hp,4);
  for(let i=0;i<70;i++)S.tick(r,.05);assert.equal(r.hazards.length,0);
});
test('Boitata leaves bounded, temporary fire and threats freeze with the pause',()=>{
  const r=arena();r.powers={};r.enemies=[folklore('boitata')];r.player.invulnerable=400;
  S.tick(r,.05);assert.equal(r.hazards[0].kind,'fire');assert.ok(r.hazards[0].arm>0);
  r.paused=true;const frozen=JSON.stringify(r);S.tick(r,.05);assert.equal(JSON.stringify(r),frozen);r.paused=false;
  for(let i=0;i<80;i++)S.tick(r,.05);assert.ok(r.hazards.length<=48);
  r.enemies=[];for(let i=0;i<60;i++)S.tick(r,.05);assert.equal(r.hazards.length,0);
});
test('Cuca telegraphs a three-shot spell; fences stop it and defeat awards more XP',()=>{
  const r=arena();r.powers={};r.enemies=[folklore('cuca')];r.player.invulnerable=400;
  S.tick(r,.05);assert.equal(r.enemies[0].mode,'warning');assert.equal(r.hexes.length,0);
  for(let i=0;i<22;i++)S.tick(r,.05);assert.equal(r.hexes.length,3);
  r.enemies=[];r.obstacles.push({x:620,y:290,w:30,h:140});
  for(let i=0;i<20;i++)S.tick(r,.05);assert.equal(r.hexes.length,0);
  r.obstacles.length=0;r.powers={sickle:3};r.cooldowns.sickle=0;
  r.enemies=[folklore('cuca',{x:625,health:1,timer:99})];S.tick(r,.01);
  assert.equal(r.kills,1);assert.equal(r.pickups.find(p=>p.kind==='xp').value,8);
});
