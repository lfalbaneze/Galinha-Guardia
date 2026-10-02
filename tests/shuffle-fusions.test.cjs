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

test('eight recipes require both maxed ingredients, craft once, retain upgrades across phases and reset on retry',()=>{
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
    assert.ok(S.fuse(fused,id));advance(base,2);advance(fused,2);
    const basicDamage=10000-base.enemies[0].health,fusionDamage=10000-fused.enemies[0].health;
    assert.ok(fusionDamage>basicDamage,`${id}: ${fusionDamage} <= ${basicDamage}`);
    assert.ok(fused.shots.every(s=>!S.FUSIONS[id].items.includes(s.kind)),id);
    const blocked=arena(id);blocked.obstacles.push({x:610,y:28,w:20,h:664});blocked.enemies=[enemy()];
    S.fuse(blocked,id);advance(blocked,2);assert.equal(blocked.enemies[0].health,10000,id+' wall');
  }
});

test('orbital strikes wait, poison expires, ice slows, storm stuns and fortress restores one shield',()=>{
  const meteor=arena('meteor');meteor.enemies=[enemy()];S.fuse(meteor,'meteor');advance(meteor,.5);
  assert.equal(meteor.enemies[0].health,10000);assert.equal(meteor.fusionFields.length,1);
  advance(meteor,.1);assert.ok(meteor.enemies[0].health<10000);assert.equal(meteor.fusionFields.length,0);
  const poison=arena('cauldron');poison.enemies=[enemy()];S.fuse(poison,'cauldron');advance(poison,.1);
  assert.ok(poison.enemies[0].dot);poison.cooldowns.cauldron=99;advance(poison,1);
  assert.ok(poison.effects.filter(e=>e.kind==='hurt').length<=6,'continuous damage does not flood hit particles');
  advance(poison,2.1);assert.equal(poison.fusionFields.length,0);
  for(const [id,property] of [['storm','stun'],['blizzard','slow']]){
    const r=arena(id);r.enemies=[enemy()];S.fuse(r,id);advance(r,.3);assert.ok(r.enemies[0][property]>0,id);
  }
  const fort=arena('fortress');S.fuse(fort,'fortress');assert.equal(S.orbits(fort).length,6);
  fort.player.shield=false;advance(fort,3.9);assert.equal(fort.player.shield,false);advance(fort,.2);assert.equal(fort.player.shield,true);
});

test('fusion effects render distinct icons, fields, activation and projectiles with reduced motion and restore Canvas state',async()=>{
  const root=path.resolve(__dirname,'..'),fx=vm.runInNewContext(fs.readFileSync(path.join(root,'shuffle/effects.js'),'utf8')+';ShuffleFX');
  fx.setItemSheet(await loadImage(path.join(root,'assets/shuffle/items-pixel.png')));
  const icons=new Set();
  for(const [id,recipe] of Object.entries(S.FUSIONS))for(const reduced of [false,true]){
    const canvas=createCanvas(400,400),c=canvas.getContext('2d');
    fx.fusionIcon(c,recipe,200,200,60);icons.add(canvas.toBuffer('image/png').toString('base64'));
    const r=arena(id);S.fuse(r,id);const e={...r.effects.at(-1),x:200,y:200,time:.7};
    c.globalAlpha=.7;c.translate(2,3);const transform=c.getTransform();
    fx.effect(c,e,reduced);fx.effect(c,{...e,kind:'impact',time:.25,duration:.55},reduced);
    fx.projectile(c,{...e,x:200,y:200,vx:420,vy:0},.5,reduced);
    for(const fusion of ['meteor','cauldron'])fx.field(c,{...e,fusion,radius:80,time:.3,duration:1},.5,reduced);
    assert.deepEqual(c.getTransform(),transform);assert.ok(Math.abs(c.globalAlpha-.7)<.01);
    assert.ok(c.getImageData(0,0,400,400).data.some((v,i)=>i%4===3&&v>0));
  }
  assert.equal(icons.size,8);
});
