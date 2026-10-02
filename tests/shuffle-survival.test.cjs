const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../shuffle/survival.js'),E=require('../shuffle/engine.js'),M=require('../shuffle/maps.js');
const gap=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function arena(){const r=S.newRun(614);r.obstacles=[];r.layout.obstacles=r.obstacles;
  Object.assign(r.player,{x:560,y:360});r.enemies=[];r.pickups=[];r.spawnTimer=999;r.heroCooldown=999;return r;}
function enemy(x=625,y=360,health=1){return{x,y,health,species:'fox',r:18,speed:0,dx:0,dy:1,
  traveled:0,moving:false,route:[],routeTimer:0,routeTarget:null};}
function folklore(id,extra={}){const d=S.ENEMIES[id];return {...enemy(700,360,d.hp),species:id,r:d.r,
  baseSpeed:d.speed,speed:d.speed,maxHealth:d.hp,age:0,side:1,mode:'hunt',timer:0,trailTimer:0,...extra};}

test('every hero and enemy has individual victory and defeat lines, without consuming gameplay randomness',()=>{
  assert.deepEqual(Object.keys(S.QUIPS.heroes).sort(),Object.keys(S.HEROES).sort());
  assert.deepEqual(Object.keys(S.QUIPS.enemies).sort(),Object.keys(S.ENEMIES).sort());
  const texts=[];
  for(const [group,entries] of Object.entries(S.QUIPS))for(const [id,entry] of Object.entries(entries)){
    const r=arena(),actor=group==='heroes'?{species:'chicken',skin:id}:{species:id};
    for(const won of [true,false]){
      const lines=entry[won?'win':'lose'];assert.equal(lines.length,2);texts.push(...lines);
      const frozen=JSON.stringify(r),line=S.quip(r,actor,won);assert.ok(lines.includes(line.text));
      assert.equal(line.artId,(group==='heroes'?'hero-':'enemy-')+id);
      assert.equal(line.outcome,won?'win':'lose');
      assert.deepEqual(S.quip(r,actor,won),line);assert.equal(JSON.stringify(r),frozen);
      r.kills++;assert.notEqual(S.quip(r,actor,won).text,line.text);
    }
  }
  assert.equal(new Set(texts).size,64);
  assert.equal(S.quip(arena(),{species:'__proto__'},true),null);
});

test('enemy death banter is throttled; bosses keep their own identity and the killing enemy celebrates',()=>{
  for(const id of Object.keys(S.ENEMIES)){
    const r=arena();r.powers={sickle:3};r.enemies=[enemy(625,360,1)];r.enemies[0].species=id;S.tick(r,.01);
    assert.equal(r.banter.actor.species,id);assert.ok(S.QUIPS.enemies[id].lose.includes(r.banter.text));
    const first=r.banter;r.enemies=[enemy()];r.cooldowns.sickle=0;S.tick(r,.01);assert.equal(r.banter,first);
    const lost=arena();lost.powers={};lost.hp=1;lost.player.invulnerable=0;
    lost.enemies=[{...enemy(560,360,99),species:id,name:id==='goose'?'Panto':undefined}];S.tick(lost,.01);
    assert.equal(lost.phase,'lost');assert.equal(lost.defeatedBy.species,id);
    assert.ok(S.QUIPS.enemies[id].win.includes(S.quip(lost,lost.defeatedBy,true).text));
    if(id==='goose')assert.equal(S.quip(lost,lost.defeatedBy,true).name,'Panto');
  }
  const r=arena();r.powers={sickle:3};r.enemies=[{...enemy(),isBoss:true,name:'Baltazar',species:'wolf'}];S.tick(r,.01);
  assert.deepEqual(r.defeatedBoss,{species:'wolf',name:'Baltazar'});
  assert.equal(S.quip(r,r.defeatedBoss,false).name,'Baltazar');
});

test('roots, fire and spells remember their caster even after the enemy leaves',()=>{
  for(const id of ['curupira','boitata','cuca']){
    const r=arena();r.powers={};r.player.invulnerable=30;r.enemies=[folklore(id,{name:'Chefe '+id})];
    for(let i=0;i<25;i++)S.tick(r,.05);
    const threat=id==='cuca'?r.hexes[0]:r.hazards[0];assert.ok(threat,id);assert.equal(threat.source.species,id);
    r.enemies=[];r.hp=1;r.player.invulnerable=0;r.player.x=threat.x;r.player.y=threat.y;threat.arm=0;
    S.tick(r,.01);assert.equal(r.phase,'lost',id);
    assert.deepEqual(r.defeatedBy,{species:id,name:'Chefe '+id});
  }
});

test('each animal fires its own basic shot in eight directions, with impacts and solid-wall blocking',()=>{
  assert.equal(new Set(Object.values(S.SHOTS).map(s=>s.visual)).size,8);
  for(const [skin,weapon] of Object.entries(S.SHOTS))for(let direction=0;direction<8;direction++){
    const r=arena(),a=direction*Math.PI/4;r.player.skin=skin;r.player.invulnerable=30;
    const target=enemy(560+Math.cos(a)*110,360+Math.sin(a)*110,100);r.enemies=[target];
    S.tick(r,.01);
    assert.equal(r.shots.length,weapon.spread.length,skin);
    assert.ok(r.shots.every(s=>s.visual===weapon.visual&&s.vx*Math.cos(a)+s.vy*Math.sin(a)>0),skin);
    r.cooldowns.cornshot=99;
    for(let i=0;i<9;i++)S.tick(r,.05);
    assert.ok(target.health<100,skin);
    assert.ok(r.effects.some(e=>e.kind==='impact'&&e.visual===weapon.visual),skin);
    if(weapon.slow)assert.ok(target.slow>0);
    if(weapon.push)assert.ok(gap(target,r.player)>120);
    if(weapon.stun)assert.ok(target.stun>0);
    if(weapon.piercing){assert.equal(target.health,100-2*weapon.damage,'Piercing hits each enemy only once');}
    r.paused=true;const frozen=JSON.stringify(r);S.tick(r,.05);assert.equal(JSON.stringify(r),frozen);
    const blocked=arena();blocked.player.skin=skin;blocked.obstacles.push({x:600,y:270,w:25,h:180});
    blocked.enemies=[enemy(680,360,100)];for(let i=0;i<20;i++)S.tick(blocked,.05);
    assert.equal(blocked.enemies[0].health,100,skin);
  }
});

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
test('XP unlocks one chosen power per level; ground loot cannot bypass leveling',()=>{
  const r=arena(),initial={...r.powers};r.hp=1;
  assert.ok(S.newRun(614).pickups.every(p=>['xp','milk'].includes(p.kind)));
  assert.equal(S.choose(r,'egg'),false,'A power requires a level reward');
  for(const kind of Object.keys(S.POWERS)){
    r.pickups.push({kind,x:r.player.x,y:r.player.y,value:1});S.tick(r,.01);
  }
  assert.deepEqual(r.powers,initial,'Items do not award powers directly');
  r.pickups.push({kind:'milk',x:r.player.x,y:r.player.y,value:1});S.tick(r,.01);assert.equal(r.hp,3);
  r.pickups.push({kind:'xp',x:r.player.x,y:r.player.y,value:7});S.tick(r,.01);
  assert.equal(r.level,1);assert.equal(r.xp,7);assert.equal(r.phase,'playing');assert.deepEqual(r.powers,initial);
  r.pickups.push({kind:'xp',x:r.player.x,y:r.player.y,value:1});S.tick(r,.01);
  assert.equal(r.level,2);assert.equal(r.xp,0);assert.equal(S.xpNeeded(r),11);assert.equal(r.hp,4);
  assert.equal(r.phase,'power-draft');assert.equal(r.choices.length,3);assert.deepEqual(r.powers,initial);
  const chosen=r.choices[0],before=r.powers[chosen]||0;
  assert.equal(S.choose(r,chosen),true);assert.equal(r.powers[chosen],before+1);
  assert.equal(r.pendingChoices,0);assert.equal(r.phase,'playing');assert.equal(S.choose(r,chosen),false);
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
  r=arena();r.elapsed=S.DURATION-.01;S.tick(r,.02);assert.equal(r.phase,'playing','Clock alone never grants victory');assert.equal(S.wave(r),10);
});
test('extended fixture keeps hordes and loose XP bounded while drafts require an explicit choice',()=>{
  const r=S.newRun(614);r.powers={cornshot:3,egg:3,sickle:3};r.player.invulnerable=301;
  let peak=0;
  for(let i=0;i<=S.DURATION*20;i++){
    if(r.phase==='power-draft')S.choose(r,r.choices[0]);
    if(r.phase==='stage-clear')S.nextStage(r);
    r.player.invulnerable=301;
    S.tick(r,.05);peak=Math.max(peak,r.enemies.length);
    assert.ok(r.enemies.length<=S.MAX_ENEMIES);assert.ok(r.pickups.filter(p=>p.kind==='xp').length<=160);
  }
  assert.ok(['playing','power-draft','stage-clear','won'].includes(r.phase));assert.ok(peak>8);assert.ok(r.kills>10);
});

test('thirty cards: seeded shuffle, queued points, caps, reroll and frozen combat',()=>{
  assert.equal(Object.keys(S.POWERS).length,30);
  assert.equal(new Set(Object.values(S.POWERS).map(p=>p.name)).size,30);
  const r=arena(),copy=arena();
  for(const run of [r,copy]){
    run.pickups=[{kind:'xp',x:run.player.x,y:run.player.y,value:40}];S.tick(run,.01);
    assert.equal(run.phase,'power-draft');assert.equal(run.pendingChoices,3);assert.equal(run.score,40);
    assert.equal(run.xp,7);assert.equal(run.level,4);
  }
  assert.deepEqual(r.choices,copy.choices);assert.equal(new Set(r.choices).size,3);
  assert.ok(r.choices.some(id=>!r.powers[id]),'Always offer an unowned power while available');
  const frozen=JSON.stringify(r);S.tick(r,.05,{x:1});assert.equal(JSON.stringify(r),frozen);
  assert.equal(E.dash(r,1,0),false);assert.equal(S.choose(r,'__proto__'),false);
  const before=[...r.choices];assert.equal(S.reroll(r),true);
  assert.ok(r.choices.every(id=>!before.includes(id)));assert.equal(S.reroll(r),false);
  for(let i=0;i<3;i++){const id=r.choices[0],n=r.powers[id]||0;assert.equal(S.choose(r,id),true);assert.equal(r.powers[id],n+1);}
  assert.equal(r.phase,'playing');assert.equal(r.pendingChoices,0);
  assert.equal(S.choose(r,'cornshot'),false);assert.equal(S.newRun(614).score,0);
  const capped=arena();capped.powers=Object.fromEntries(Object.keys(S.POWERS).map(id=>[id,3]));capped.powers.venom=2;
  capped.pickups=[{kind:'xp',x:560,y:360,value:40}];S.tick(capped,.01);
  assert.deepEqual(capped.choices,['venom']);assert.equal(S.reroll(capped),false);
  S.choose(capped,'venom');assert.equal(capped.phase,'playing');assert.equal(capped.pendingChoices,0);
});

test('every new weapon actually hurts, and solid scenery blocks every weapon',()=>{
  const weapons=['rear','cross','spiral','sniper','homing','boomerang','ricochet','fireball','frost','venom','thunder','mines','orbit','quake'];
  for(const id of weapons){
    const r=arena();r.powers={[id]:1};r.player.invulnerable=30;r.player.dx=-1;r.player.dy=0;
    r.enemies=Array.from({length:8},(_,i)=>enemy(560+Math.cos(i*Math.PI/4)*70,360+Math.sin(i*Math.PI/4)*70,1000));
    if(id==='mines')r.enemies[0].x=600;
    for(let i=0;i<100;i++)S.tick(r,.05);
    assert.ok(r.enemies.some(e=>e.health<1000),id);
    const blocked=arena();blocked.powers={[id]:3};blocked.player.invulnerable=30;
    blocked.enemies=[enemy(675,360,1000)];blocked.obstacles.push({x:610,y:28,w:25,h:664});
    for(let i=0;i<90;i++)S.tick(blocked,.05);
    assert.equal(blocked.enemies[0].health,1000,`${id}: blocked by fence`);
  }
});

test('passive cards alter their advertised stats, damage, timing, pickup and defense',()=>{
  const take=(r,id)=>{r.phase='power-draft';r.choices=[id];r.pendingChoices=1;assert.ok(S.choose(r,id));};
  let r=arena();take(r,'heart');assert.equal(E.stats(r).maxHp,6);assert.equal(r.hp,6);
  const speed=E.stats(r).speed;take(r,'boots');assert.ok(E.stats(r).speed>speed);
  const dash=E.stats(r).dashCooldown;take(r,'dash');assert.ok(E.stats(r).dashCooldown<dash);
  const grace=E.stats(r).hurtGrace;take(r,'feather');assert.equal(E.stats(r).hurtGrace,grace+.35);
  take(r,'shield');assert.equal(r.player.shield,true);r.player.invulnerable=0;E.hurt(r);assert.equal(r.hp,6);
  take(r,'regen');r.hp=2;S.tick(r,.01);assert.equal(r.hp,3);
  r=arena();take(r,'magnet');r.pickups=[{kind:'xp',x:700,y:360,value:1}];S.tick(r,.05);assert.ok(r.pickups[0].x<700);
  take(r,'harvest');r.pickups=[{kind:'xp',x:560,y:360,value:1}];S.tick(r,.01);assert.equal(r.score,2);
  r=arena();take(r,'volley');r.enemies=[enemy(670,360,100)];S.tick(r,.01);assert.equal(r.shots.length,3);
  const normal=arena();normal.enemies=[enemy(670,360,100)];S.tick(normal,.01);
  r=arena();for(const id of ['might','haste','reach'])take(r,id);r.enemies=[enemy(670,360,100)];S.tick(r,.01);
  assert.ok(r.shots[0].damage>normal.shots[0].damage);assert.ok(r.shots[0].life>normal.shots[0].life);
  assert.ok(r.cooldowns.cornshot<normal.cooldowns.cornshot);
  r=arena();r.powers={};take(r,'thorns');r.enemies=[enemy(560,360,100)];r.player.invulnerable=0;S.tick(r,.01);
  assert.equal(r.hp,4);assert.equal(r.enemies[0].health,94);
});

test('ricochet switches targets, boomerangs hit on return, homing turns and poison persists',()=>{
  let r=arena();r.powers={ricochet:1};r.enemies=[enemy(650,360,100),enemy(650,445,100)];
  for(let i=0;i<25;i++)S.tick(r,.05);
  assert.deepEqual(r.enemies.map(e=>e.health),[98,98],'Each bounce hits a different target once');
  r=arena();r.powers={boomerang:1};r.enemies=[enemy(670,360,100)];
  for(let i=0;i<29;i++)S.tick(r,.05);
  assert.equal(r.enemies[0].health,96,'One outward hit and one return hit');
  r=arena();r.powers={homing:1};r.enemies=[enemy(740,360,100)];S.tick(r,.01);
  r.enemies[0].y=420;S.tick(r,.05);assert.ok(r.shots[0].vy>0,'Projectile follows the relocated target');
  r=arena();r.powers={venom:1};r.enemies=[enemy(660,360,100)];
  for(let i=0;i<8;i++)S.tick(r,.05);
  const health=r.enemies[0].health;assert.ok(r.enemies[0].dot);r.powers={};r.shots=[];
  for(let i=0;i<20;i++)S.tick(r,.05);
  assert.ok(r.enemies[0].health<health-1,'Poison keeps ticking after the projectile disappears');
});

test('five bosses gate distinct maps, preserve the build and only the last defeat wins',()=>{
  const r=S.newRun(21);const maps=new Set([r.layout.id]);r.powers={sickle:3,heart:2};r.skills.heart=2;r.hp=7;
  for(let stage=0;stage<5;stage++){
    r.player.invulnerable=999;r.pickups=[];r.stageElapsed=59.99;S.tick(r,.02);
    const boss=r.enemies.find(e=>e.isBoss);assert.ok(boss);assert.equal(boss.species,S.STAGES[stage].boss);
    assert.ok(gap(boss,r.player)>300);assert.ok(M.clearCircle(r,boss,boss.r));assert.ok(r.enemies.length<=S.MAX_ENEMIES);
    S.tick(r,.05);assert.equal(r.enemies.filter(e=>e.isBoss).length,1);
    // Exercise real damage/death; no shortcut to the boss-clear state.
    r.obstacles=[];r.layout.obstacles=r.obstacles;r.enemies=[boss];
    Object.assign(boss,{x:r.player.x+35,y:r.player.y,health:1,baseSpeed:0,timer:999});r.cooldowns.sickle=0;
    S.tick(r,.01);assert.equal(r.bossesDefeated,stage+1);
    if(stage===4){assert.equal(r.phase,'won');assert.equal(S.nextStage(r),false);break;}
    while(r.phase==='power-draft')assert.ok(S.choose(r,r.choices[0]));
    assert.equal(r.phase,'stage-clear');const frozen=JSON.stringify(r);S.tick(r,.05);assert.equal(JSON.stringify(r),frozen);
    const powers={...r.powers},score=r.score;assert.ok(S.nextStage(r));assert.equal(S.nextStage(r),false);
    assert.deepEqual(r.powers,powers);assert.equal(r.score,score);assert.equal(r.hp,7);
    assert.equal(r.player.skin,'classic');assert.equal(r.boss,null);assert.equal(r.stageElapsed,0);assert.equal(r.shots.length,0);
    maps.add(r.layout.id);
  }
  assert.equal(maps.size,5);
});

test('elapsed play time increases every wave, independent of XP and kills, and freezes on pause',()=>{
  function sample(seconds,level=1,kills=0){
    const r=S.newRun(614,['fox']);r.elapsed=seconds;r.level=level;r.kills=kills;
    r.powers={};r.pickups=[];r.heroCooldown=999;S.tick(r,.01);
    return {wave:S.wave(r),count:r.enemies.length,hp:r.enemies[0].maxHealth,
      speed:r.enemies[0].baseSpeed,interval:r.spawnTimer};
  }
  let previous;
  for(let seconds=0;seconds<300;seconds+=30){
    const current=sample(seconds);
    assert.deepEqual(sample(seconds,20,500),current,'Difficulty follows time, not player progress');
    assert.deepEqual(sample(seconds+29),current,'Wave stays stable until the next 30-second boundary');
    if(previous){
      for(const key of ['wave','count','hp','speed'])assert.ok(current[key]>previous[key],`${seconds}s: ${key}`);
      assert.ok(current.interval<previous.interval,`${seconds}s: faster reinforcements`);
    }
    previous=current;
  }
  const r=S.newRun(614,['fox']);r.elapsed=29.99;r.paused=true;
  for(let i=0;i<40;i++)S.tick(r,.05);
  assert.equal(r.elapsed,29.99);assert.equal(S.wave(r),1);assert.equal(r.enemies.length,0);
  r.paused=false;S.tick(r,.02);assert.equal(S.wave(r),2);
  const fresh=S.newRun(614,['fox']);assert.equal(fresh.elapsed,0);assert.equal(S.wave(fresh),1);
});
test('beating stages and complete runs escalates real spawns, bosses and reinforcements with safe limits',()=>{
  function sample(encounter,wins=0,boss=false){
    const r=S.newRun(614,['fox'],'classic',wins);r.encounter=encounter;r.elapsed=30;
    r.powers={};r.pickups=[];r.heroCooldown=999;r.player.invulnerable=999;
    if(boss)r.stageElapsed=60;
    S.tick(r,.01);return r;
  }
  const first=sample(0),late=sample(4),rematch=sample(4,1);
  for(const [a,b] of [[first,late],[late,rematch]]){
    assert.ok(b.enemies.length>a.enemies.length);
    assert.ok(b.enemies[0].maxHealth>a.enemies[0].maxHealth);
    assert.ok(b.enemies[0].baseSpeed>a.enemies[0].baseSpeed);
    assert.ok(b.spawnTimer<a.spawnTimer);
  }
  assert.ok(late.enemies[0].maxHealth>=first.enemies[0].maxHealth*3);
  const baseBoss=sample(0,0,true),hardBoss=sample(0,1,true);
  assert.ok(hardBoss.enemies.find(e=>e.isBoss).maxHealth>=baseBoss.enemies.find(e=>e.isBoss).maxHealth*1.6);
  const count=hardBoss.enemies.length;hardBoss.spawnTimer=0;S.tick(hardBoss,.01);
  assert.ok(hardBoss.enemies.length>count,'Reinforcements continue while the boss lives');
  assert.equal(hardBoss.enemies.filter(e=>e.isBoss).length,1);
  for(const invalid of [-1,1.5,NaN,Infinity,'2',null])assert.equal(S.newRun(1,['fox'],'classic',invalid).victories,0);
  const limit=sample(4,999);assert.equal(limit.victories,99);
  for(let i=0;i<60;i++){limit.spawnTimer=0;S.tick(limit,.01);}
  assert.ok(limit.enemies.length<=S.MAX_ENEMIES);
  assert.ok(limit.enemies.every(e=>Number.isFinite(e.health)&&e.baseSpeed<240));
  const spell=sample(4,2);Object.assign(spell.player,{x:560,y:360});spell.enemies=[folklore('cuca',{x:710,y:360,timer:0,isBoss:true})];
  spell.obstacles=[];spell.layout.obstacles=spell.obstacles;spell.spawnTimer=999;
  S.tick(spell,.01);assert.equal(spell.enemies[0].timer,1.05,'Warnings retain their full dodge window');
  for(let i=0;i<22;i++)S.tick(spell,.05);
  assert.ok(spell.hexes.some(h=>Math.hypot(h.vx,h.vy)>155));
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
test('four discoverable optional bosses award bonuses without completing or advancing the main stage',()=>{
  const r=S.newRun(614);r.powers={};r.heroCooldown=999;
  for(let stage=0;stage<4;stage++){
    const altar=r.secretAltar;assert.equal(altar.species,S.SECRET_BOSSES[stage].species);
    assert.ok(M.clearCircle(r,altar,48));assert.ok(M.route(r.layout,r.player,altar,r.player.r).length);
    assert.equal(altar.discovered,false);assert.equal(S.awaken(r),false);
    Object.assign(r.player,{x:altar.x,y:altar.y,invulnerable:999});r.enemies=[];r.pickups=[];r.spawnTimer=999;
    r.paused=true;assert.equal(S.awaken(r),false);r.paused=false;
    r.bossSpawned=true;assert.equal(S.awaken(r),false);r.bossSpawned=false;
    S.tick(r,.01);assert.equal(altar.discovered,true);
    assert.equal(S.awaken(r),true);assert.equal(S.awaken(r),false);
    const boss=r.enemies.find(e=>e.isSecretBoss);assert.ok(boss.isBoss&&boss.health>=150);
    const clock=r.stageElapsed;S.tick(r,.05);assert.equal(r.stageElapsed,clock);
    boss.health=.1;boss.x=r.player.x+40;boss.y=r.player.y;r.obstacles=[];r.layout.obstacles=[];
    r.powers={sickle:3};r.cooldowns.sickle=0;S.tick(r,.01);
    assert.equal(r.bossesDefeated,0);assert.equal(r.stageCleared,false);assert.equal(altar.defeated,true);
    assert.equal(r.secretsDefeated.length,stage+1);assert.ok(r.score>=35);assert.equal(S.awaken(r),false);
    while(r.phase==='power-draft')S.choose(r,r.choices[0]);
    assert.equal(r.phase,'playing');r.phase='stage-clear';assert.ok(S.nextStage(r));r.powers={};
  }
  assert.equal(r.secretAltar,null);assert.equal(S.awaken(r),false);
  assert.deepEqual(S.newRun(r.seed).secretsDefeated,[]);
});

test('only ordinary animals enter waves; folklore is reserved for secret encounters',()=>{
  for(const [id,d] of Object.entries(S.ENEMIES)){
    const r=S.newRun(31,[id]);r.powers={};r.player.invulnerable=400;
    if(S.SECRET_BOSSES.some(b=>b.species===id)){
      r.elapsed=300;r.stageElapsed=60;S.tick(r,.01);assert.equal(r.enemies.length,0,id+' stays secret');continue;
    }
    if(d.wave>1){r.elapsed=(d.wave-1)*30-1;S.tick(r,.01);assert.equal(r.enemies.length,0);}
    r.elapsed=(d.wave-1)*30;r.spawnTimer=0;S.tick(r,.01);
    assert.ok(r.enemies.length>0,id);assert.ok(r.enemies.every(e=>e.species===id&&M.clearCircle(r,e,e.r)));
    assert.ok(r.enemies.every(e=>gap(e,r.player)>360));
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
