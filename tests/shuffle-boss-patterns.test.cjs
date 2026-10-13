const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../shuffle/survival.js');
function arena(species,extra={}){
  const r=S.newRun(614);r.obstacles=[];r.layout.obstacles=r.obstacles;
  Object.assign(r,{powers:{},pickups:[],spawnTimer:999,heroCooldown:999,itemTimer:999});
  Object.assign(r.player,{x:560,y:360,invulnerable:999});
  const t=S.ENEMIES[species];
  const e={x:740,y:360,species,r:t.r,health:10000,maxHealth:10000,speed:t.speed,baseSpeed:t.speed,
    dx:-1,dy:0,traveled:0,moving:false,age:0,side:1,mode:'hunt',timer:0,trailTimer:0,
    route:[],routeTimer:0,routeTarget:null,isBoss:true,...extra};
  r.enemies=[e];return {r,e};
}
function advance(r,time){for(let i=0;i<Math.ceil(time/.01);i++)S.tick(r,.01);}

test('predator bosses alternate their signature attack with a warned, committed pounce',()=>{
  for(const species of ['wolf','fox','amanda']){
    const {r,e}=arena(species,{attackStep:1});S.tick(r,.01);
    assert.equal(e.attack,'pounce');assert.equal(e.mode,'warning');assert.equal(e.timer,.55);
    const aim=[e.aimX,e.aimY],start={x:e.x,y:e.y};r.player.y+=70;
    S.tick(r,.01);assert.notDeepEqual([e.aimX,e.aimY],aim);
    while(e.mode==='warning')S.tick(r,.01);
    const committed=[e.aimX,e.aimY];r.player.y-=140;
    advance(r,e.chargeTime+.02);assert.equal(e.mode,'recover');assert.deepEqual([e.aimX,e.aimY],committed);
    assert.ok(e.x<start.x-100);assert.ok(e.y>start.y);
    assert.equal(r.hazards.length,0,'predator paws do not create burning mule hoofprints');
    const rest={x:e.x,y:e.y};advance(r,1);assert.deepEqual({x:e.x,y:e.y},rest);
  }
});

test('wounded farm bosses add attack lanes and pack reinforcements without shortening warnings',()=>{
  for(const species of ['goose','fox','amanda']){
    const healthy=arena(species),wounded=arena(species,{health:4000});
    S.tick(healthy.r,.01);S.tick(wounded.r,.01);
    assert.equal(wounded.e.mode,'warning');assert.equal(wounded.e.timer,healthy.e.timer);
    assert.equal(healthy.e.angles.length,3);assert.equal(wounded.e.angles.length,5);
    const aim=[wounded.e.aimX,wounded.e.aimY];wounded.r.player.y=500;advance(wounded.r,wounded.e.timer+.02);
    assert.deepEqual([wounded.e.aimX,wounded.e.aimY],aim);
  }
  const healthy=arena('wolf'),wounded=arena('wolf',{health:4000});
  advance(healthy.r,1.13);advance(wounded.r,1.13);
  assert.equal(healthy.r.enemies.length,3);assert.equal(wounded.r.enemies.length,5);
});

test('mule alternates a locked fire fan, warned hoof ring and a gallop with burning footprints',()=>{
  const {r,e}=arena('mula-sem-cabeca');S.tick(r,.01);
  assert.equal(e.attack,'fire-fan');assert.equal(e.mode,'warning');assert.equal(r.hexes.length,0);
  const aim=[e.aimX,e.aimY];r.player.y=430;advance(r,1.11);
  assert.deepEqual([e.aimX,e.aimY],aim);assert.equal(e.mode,'recover');
  assert.equal(r.hexes.length,3);assert.ok(r.hexes.every(h=>h.kind==='fire'));
  r.hexes=[];e.mode='hunt';e.timer=0;S.tick(r,.01);
  assert.equal(e.attack,'hoof-ring');assert.equal(r.hazards.length,8);
  assert.ok(r.hazards.every(h=>h.kind==='hoof'&&h.arm>1&&h.source.species===e.species));
  advance(r,1.11);assert.ok(r.hazards.every(h=>h.arm<=0));
  e.mode='hunt';e.timer=0;S.tick(r,.01);assert.equal(e.attack,'fire-gallop');advance(r,1.11);
  assert.equal(e.mode,'charge');const x=e.x;r.hazards=[];advance(r,.6);
  assert.ok(e.x<x-90);assert.ok(r.hazards.length>=4);assert.ok(r.hazards.every(h=>h.kind==='hoof'&&Number.isFinite(h.angle)));
  advance(r,.6);assert.equal(e.mode,'recover');
});

test('hoofprints follow distance traveled, expire, damage only after heating and respect dash immunity',()=>{
  const {r,e}=arena('mula-sem-cabeca',{timer:99});advance(r,.2);assert.equal(r.hazards.length,0);
  advance(r,.15);assert.equal(r.hazards.length,1);
  const h=r.hazards[0];r.enemies=[];Object.assign(r.player,{x:h.x,y:h.y,invulnerable:0});
  S.tick(r,.01);assert.equal(r.hp,5);r.player.dashTime=.18;h.arm=0;S.tick(r,.01);assert.equal(r.hp,5);
  r.player.dashTime=0;S.tick(r,.01);assert.equal(r.hp,4);
  r.player.invulnerable=999;advance(r,3.4);assert.equal(r.hazards.length,0);
});

test('mule fire is blocked by scenery and dodging moves out of the locked fan',()=>{
  const {r,e}=arena('mula-sem-cabeca');S.tick(r,.01);r.player.y=530;advance(r,2);
  assert.equal(r.hp,5);assert.ok(r.hexes.every(h=>Math.abs(h.vy)<100));
  const blocked=arena('mula-sem-cabeca');S.tick(blocked.r,.01);advance(blocked.r,1.12);
  blocked.r.enemies=[];blocked.r.obstacles.push({x:640,y:100,w:30,h:500});
  blocked.r.player.invulnerable=0;advance(blocked.r,1.7);
  assert.equal(blocked.r.hp,5);assert.equal(blocked.r.hexes.length,0);
});

test('wounded mule increases fire lanes and hoof rings, while pause freezes every warning',()=>{
  const {r,e}=arena('mula-sem-cabeca',{health:4000});S.tick(r,.01);
  r.paused=true;const snapshot=JSON.stringify(r);advance(r,1);assert.equal(JSON.stringify(r),snapshot);
  r.paused=false;advance(r,1.11);assert.equal(r.hexes.length,5);
  e.mode='hunt';e.timer=0;S.tick(r,.01);assert.equal(r.hazards.length,16);
});

test('phase bosses use wind, pack summons, claws and dirt instead of the shared charge',()=>{
  for(const [species,attack,kind,count]of [['goose','gust','gust',3],['wolf','howl',null,0],['fox','claw','claw',3],['fuinha','dirt','dirt',5]]){
    const {r,e}=arena(species);S.tick(r,.01);assert.equal(e.attack,attack);assert.equal(e.mode,'warning');
    advance(r,e.timer+.01);assert.equal(e.mode,'recover');assert.equal(r.hexes.filter(h=>h.kind===kind).length,count,species);
    if(species==='wolf'){
      assert.equal(r.enemies.filter(a=>!a.isBoss&&a.species==='wolf').length,2);
      assert.ok(r.enemies.every(a=>Number.isFinite(a.traveled)&&Number.isFinite(a.x)));
      r.enemies=Array.from({length:S.MAX_ENEMIES},(_,i)=>({...e,x:70+i*20,y:80,isBoss:false,timer:99,mode:'hunt',callPack:false}));
      r.enemies[0]=e;e.mode='warning';e.timer=0;advance(r,.01);assert.equal(r.enemies.length,S.MAX_ENEMIES);
    }
  }
});

test('forest legends have distinct roots, a fire enclosure with an exit and alternating witch attacks',()=>{
  const roots=arena('curupira');S.tick(roots.r,.01);assert.equal(roots.e.attack,'roots');assert.equal(roots.r.hazards.length,3);
  const snake=arena('boitata');S.tick(snake.r,.01);assert.equal(snake.e.attack,'fire-coil');assert.equal(snake.r.hazards.length,8);
  assert.ok(snake.r.hazards.every(h=>h.kind==='fire'&&h.arm>1));
  assert.ok(snake.r.hazards.every(h=>Math.hypot(h.x-455,h.y-360)>30),'an escape corridor remains open away from the serpent');
  advance(snake.r,1.12);snake.e.mode='hunt';snake.e.timer=0;S.tick(snake.r,.01);
  assert.equal(snake.e.attack,'fire-fan');advance(snake.r,1.12);assert.ok(snake.r.hexes.every(h=>h.kind==='fire'));
  const witch=arena('cuca');S.tick(witch.r,.01);assert.equal(witch.e.attack,'spell-fan');advance(witch.r,1.06);
  assert.equal(witch.r.hexes.filter(h=>h.kind==='spell').length,5);
  witch.e.mode='hunt';witch.e.timer=0;S.tick(witch.r,.01);assert.equal(witch.e.attack,'brew');
  assert.equal(witch.r.hazards.filter(h=>h.kind==='poison'&&h.arm>0).length,3);
});

test('a defeated secret mule clears its fire and hoofprints without completing the phase',()=>{
  const {r,e}=arena('mula-sem-cabeca',{isSecretBoss:true,health:1,attackStep:1});S.tick(r,.01);
  assert.ok(r.hazards.length);e.x=r.player.x+40;r.powers={sickle:3};r.cooldowns.sickle=0;
  S.tick(r,.01);assert.equal(r.hazards.length,0);assert.equal(r.hexes.length,0);
  assert.equal(r.bossesDefeated,0);assert.equal(r.stageCleared,false);assert.ok(r.secretsDefeated.includes('mula-sem-cabeca'));
});

test('new enemy effects keep their silhouettes and restore Canvas state with reduced motion',()=>{
  const fs=require('node:fs'),vm=require('node:vm'),{createCanvas}=require('@napi-rs/canvas');
  const fx=vm.runInNewContext(fs.readFileSync('shuffle/effects.js','utf8')+';ShuffleFX');
  const images=new Set();
  for(const reduced of [false,true])for(const kind of ['hoof','fire','poison','roots']){
    const c=createCanvas(96,96).getContext('2d');c.globalAlpha=.6;const before=c.getTransform();
    fx.hazard(c,{x:48,y:48,kind,angle:.5,arm:0,life:2,r:18},1,reduced);
    assert.deepEqual(c.getTransform(),before);assert.ok(Math.abs(c.globalAlpha-.6)<.01);
    assert.ok(c.getImageData(0,0,96,96).data.some((v,i)=>i%4===3&&v));images.add(c.canvas.toBuffer('image/png').toString('base64'));
    fx.enemyShot(c,{x:48,y:48,kind:kind==='hoof'?'claw':kind,vx:100,vy:0},1,reduced);
    assert.deepEqual(c.getTransform(),before);
  }
  assert.ok(images.size>=4);
});
