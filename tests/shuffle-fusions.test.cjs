const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../shuffle/survival.js');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
function arena(id){
  const r=S.newRun(614);r.obstacles=[];r.layout.obstacles=r.obstacles;
  Object.assign(r.player,{x:560,y:360,invulnerable:99});
  Object.assign(r,{enemies:[],pickups:[],spawnTimer:999,heroCooldown:999,powers:{}});
  if(id)for(const item of S.FUSIONS[id].items)r.powers[item]=3;
  return r;
}
const enemy=(x=655,y=360)=>({x,y,health:10000,species:'fox',r:18,speed:0,dx:0,dy:1,traveled:0,moving:false,route:[],routeTimer:0,routeTarget:null});
const advance=(r,time)=>{for(let i=0;i<time*100;i++)S.tick(r,.01);};

test('eight recipes require both ingredients at rank three, craft once, retain upgrades across phases and reset on retry',()=>{
  assert.equal(Object.keys(S.FUSIONS).length,8);
  for(const [id,recipe] of Object.entries(S.FUSIONS)){
    const r=arena(id),item=recipe.items[1];r.powers[item]=2;
    assert.equal(S.fuse(r,id),false);r.powers[item]=3;
    for(const phase of ['power-draft','stage-clear','won','lost']){r.phase=phase;assert.equal(S.fuse(r,id),false);}
    r.phase='playing';r.paused=true;assert.equal(S.fuse(r,id),true);assert.equal(S.fuse(r,id),false);
    assert.ok(recipe.items.every(item=>S.consumed(r,item)&&r.powers[item]===3));
    const before=JSON.stringify(r);advance(r,1);assert.equal(JSON.stringify(r),before,'book freezes simulation');
    r.phase='stage-clear';r.fusionFields.push({});assert.ok(S.nextStage(r));
    assert.deepEqual(r.fusions,[id]);assert.equal(r.fusionFields.length,0);
    assert.deepEqual(S.newRun(r.seed).fusions,[]);
  }
  assert.equal(S.fuse(arena(),'__proto__'),false);assert.equal(S.fuse(arena(),'toString'),false);
});

test('every fusion replaces its ingredients, deals more damage than their combined attacks, and cannot attack through walls',()=>{
  for(const id of Object.keys(S.FUSIONS)){
    const base=arena(id),fused=arena(id);base.enemies=[enemy()];fused.enemies=[enemy()];
    if(id==='blizzard')for(const r of [base,fused]){r.player.dx=0;r.player.dy=1;}
    assert.ok(S.fuse(fused,id));advance(base,2);advance(fused,2);
    const basicDamage=10000-base.enemies[0].health,fusionDamage=10000-fused.enemies[0].health;
    assert.ok(fusionDamage>basicDamage,`${id}: ${fusionDamage} <= ${basicDamage}`);
    assert.ok(fused.shots.every(s=>!S.FUSIONS[id].items.includes(s.kind)),id);
    const blocked=arena(id);blocked.obstacles.push({x:610,y:28,w:20,h:664});blocked.enemies=[enemy()];
    if(id==='blizzard'){blocked.player.dx=0;blocked.player.dy=1;}
    S.fuse(blocked,id);advance(blocked,2);assert.equal(blocked.enemies[0].health,10000,id+' wall');
  }
});

test('root strikes wait, poison expires, ice slows, water stuns and the guard restores one shield',()=>{
  const meteor=arena('meteor');meteor.enemies=[enemy()];S.fuse(meteor,'meteor');advance(meteor,.5);
  assert.equal(meteor.enemies[0].health,10000);assert.equal(meteor.fusionFields.length,1);
  advance(meteor,.1);assert.ok(meteor.enemies[0].health<10000);assert.equal(meteor.fusionFields.length,0);
  const poison=arena('cauldron');poison.enemies=[enemy()];S.fuse(poison,'cauldron');advance(poison,.1);
  assert.ok(poison.enemies[0].dot);poison.cooldowns.cauldron=99;advance(poison,1);
  assert.ok(poison.effects.filter(e=>e.kind==='hurt').length<=6,'continuous damage does not flood hit particles');
  advance(poison,2.1);assert.equal(poison.fusionFields.length,0);
  for(const [id,property] of [['storm','stun'],['blizzard','slow']]){
    const r=arena(id);r.enemies=[enemy()];r.player.dx=0;r.player.dy=1;S.fuse(r,id);advance(r,.3);assert.ok(r.enemies[0][property]>0,id);
  }
  const fort=arena('fortress');S.fuse(fort,'fortress');assert.equal(S.orbits(fort).length,6);
  fort.player.shield=false;advance(fort,3.9);assert.equal(fort.player.shield,false);advance(fort,.2);assert.equal(fort.player.shield,true);
});

test('eggs carry their fuse with the victim before exploding and burning nearby enemies',()=>{
  const r=arena('solar'),e=enemy();r.enemies=[e];S.fuse(r,'solar');advance(r,.3);
  assert.ok(r.fusionFields.length>0);const health=e.health;e.x+=40;
  advance(r,.1);assert.ok(r.fusionFields.every(f=>f.x===e.x&&f.target===e));
  advance(r,.2);assert.equal(e.health,health,'fuses do not explode on contact');
  advance(r,.5);assert.ok(e.health<health&&e.dot?.time>0);
});

test('returning scythes track a moving player and bring XP from beyond the normal magnet',()=>{
  const r=arena('reaper');r.enemies=[enemy()];S.fuse(r,'reaper');advance(r,1.05);
  r.cooldowns.reaper=99;r.player.y=490;
  const s=r.shots.find(s=>s.returned);assert.ok(s);
  r.pickups=[{kind:'xp',value:3,x:(s.x+r.player.x)/2,y:(s.y+r.player.y)/2}];
  assert.ok(Math.hypot(r.pickups[0].x-r.player.x,r.pickups[0].y-r.player.y)>100);
  advance(r,.05);assert.ok(r.shots.filter(s=>s.returned).every(s=>s.vy>0));
  advance(r,1);assert.equal(r.xp,3);assert.equal(r.pickups.length,0);
});

test('water shocks pulse, feather barriers stay behind and boiling broth pushes enemies away',()=>{
  const water=arena('storm'),e=enemy();water.enemies=[e];S.fuse(water,'storm');advance(water,.1);
  assert.equal(water.fusionFields.length,4);const health=e.health;
  advance(water,.2);assert.equal(e.health,health,'shocks have a readable interval');
  advance(water,.4);assert.ok(e.health<health&&e.stun>0);
  const ice=arena('blizzard');ice.player.dx=1;ice.player.dy=0;ice.enemies=[enemy(535,350),enemy(655,360)];
  S.fuse(ice,'blizzard');advance(ice,.1);
  assert.ok(ice.enemies[0].slow>0);assert.equal(ice.enemies[1].health,10000,'the varal covers a strip, not the entire screen');
  const pos={x:ice.fusionFields[0].x,y:ice.fusionFields[0].y};ice.player.x=800;ice.cooldowns.blizzard=99;advance(ice,.1);
  assert.deepEqual({x:ice.fusionFields[0].x,y:ice.fusionFields[0].y},pos);
  const broth=arena('cauldron');broth.enemies=[enemy()];S.fuse(broth,'cauldron');advance(broth,.1);
  assert.ok(broth.enemies[0].x>655&&broth.enemies[0].dot?.time>0);
});

test('roots gather targets before the eruption and a broken shield retaliates once',()=>{
  const roots=arena('meteor');roots.enemies=[enemy(655),enemy(725)];S.fuse(roots,'meteor');advance(roots,.4);
  assert.ok(roots.enemies[1].x-roots.enemies[0].x<70);assert.ok(roots.enemies.every(e=>e.health===10000));
  advance(roots,.2);assert.ok(roots.enemies.every(e=>e.health<10000));
  const guard=arena('fortress');guard.player.invulnerable=0;guard.enemies=[enemy(560)];S.fuse(guard,'fortress');
  advance(guard,.01);assert.equal(guard.player.shield,false);assert.equal(guard.hp,5);
  assert.equal(guard.shots.filter(s=>s.fusion==='fortress').length,6);
  advance(guard,.01);assert.equal(guard.shots.filter(s=>s.fusion==='fortress').length,6,'no repeated retaliation for the same broken shield');
  guard.player.shield=true;guard.player.invulnerable=0;guard.shots=[];
  Object.assign(guard.enemies[0],{x:560,y:360,stun:0});advance(guard,.01);
  assert.equal(guard.shots.filter(s=>s.fusion==='fortress').length,6,'a shield renewed by another power also retaliates');
});

test('gossip kernels split only once and child popcorn survives the projectile update',()=>{
  const r=arena('popcorn');r.enemies=[enemy(),enemy(710,320),enemy(710,410)];S.fuse(r,'popcorn');
  advance(r,.25);r.cooldowns.popcorn=99;
  assert.equal(r.shots.filter(s=>s.popped&&s.damage===6).length,4);
  for(let i=0;i<60;i++){S.tick(r,.01);assert.ok(r.shots.length<=6,'no recursive splitting');}
});

test('fusion effects render distinct icons, fields, activation and projectiles with reduced motion and restore Canvas state',async()=>{
  const root=path.resolve(__dirname,'..'),fx=vm.runInNewContext(fs.readFileSync(path.join(root,'shuffle/effects.js'),'utf8')+';ShuffleFX');
  fx.setItemSheet(await loadImage(path.join(root,'assets/shuffle/items-pixel.png')));
  fx.setPowerSheet(await loadImage(path.join(root,'assets/shuffle/chaos-powers.png')));
  const icons=new Set();
  for(const [id,recipe] of Object.entries(S.FUSIONS))for(const reduced of [false,true]){
    const canvas=createCanvas(400,400),c=canvas.getContext('2d');
    fx.fusionIcon(c,recipe,200,200,60);icons.add(canvas.toBuffer('image/png').toString('base64'));
    const r=arena(id);S.fuse(r,id);const e={...r.effects.at(-1),x:200,y:200,time:.7};
    c.globalAlpha=.7;c.translate(2,3);const transform=c.getTransform();
    fx.effect(c,e,reduced);fx.effect(c,{...e,kind:'impact',time:.25,duration:.55},reduced);
    fx.projectile(c,{...e,x:200,y:200,vx:420,vy:0},.5,reduced);
    for(const fusion of ['meteor','cauldron','storm','solar','blizzard'])fx.field(c,{...e,fusion,radius:80,time:.3,duration:1},.5,reduced);
    assert.deepEqual(c.getTransform(),transform);assert.ok(Math.abs(c.globalAlpha-.7)<.01);
    assert.ok(c.getImageData(0,0,400,400).data.some((v,i)=>i%4===3&&v>0));
  }
  assert.equal(icons.size,8);
});
