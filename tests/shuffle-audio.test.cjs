const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../shuffle/survival.js');
function arena(){
  const r=S.newRun(614);r.obstacles=[];r.layout.obstacles=r.obstacles;
  Object.assign(r.player,{x:560,y:360,invulnerable:99});
  Object.assign(r,{powers:{},pickups:[],spawnTimer:999,heroCooldown:999});
  r.enemies=[{x:625,y:360,health:10000,species:'fox',r:18,speed:0,dx:0,dy:1,
    traveled:0,moving:false,route:[],routeTimer:0,routeTarget:null}];
  return r;
}
test('enemy sounds follow real attacks and kills, copy positions and avoid per-frame chatter',()=>{
  for(const species of ['fuinha','mula-sem-cabeca','curupira','boitata','cuca','amanda','crow','owl']){
    const r=arena(),e=r.enemies[0],type=S.ENEMIES[species];
    Object.assign(e,{species,baseSpeed:type.speed,age:species==='fuinha'?2.695:0,side:1,mode:'hunt',timer:0,trailTimer:0});
    S.tick(r,.01);
    if(['fuinha','mula-sem-cabeca','cuca','amanda','crow','owl'].includes(species)){
      assert.ok([...r.sounds].some(s=>s.species===species&&s.event==='warn'));
      r.sounds.clear();e.timer=0;S.tick(r,.01);
    }
    const sounds=[...r.sounds].filter(s=>s.species===species);
    assert.equal(sounds.filter(s=>s.event==='attack').length,1,species);
    const position={...sounds[0].position};e.x+=1;assert.deepEqual(sounds[0].position,position);
    r.sounds.clear();S.tick(r,.01);assert.equal([...r.sounds].filter(s=>s.species===species).length,0,species);
    e.health=.01;e.stun=1;r.powers={sickle:3};e.x=r.player.x+35;e.y=r.player.y;
    S.tick(r,.01);assert.ok([...r.sounds].some(s=>s.species===species&&s.event==='defeat'),species+' defeat');
    r.sounds.clear();r.paused=true;S.tick(r,.05);assert.equal(r.sounds.size,0);
  }
});

test('each active power, hero and fusion emits sound on activation; passive cards on acquisition',()=>{
  for(const [id,power] of Object.entries(S.POWERS)){
    const r=arena();r.phase='power-draft';r.pendingChoices=1;r.choices=[id];
    assert.ok(S.choose(r,id));assert.ok(r.sounds.has('upgrade'),id+' acquisition');r.sounds.clear();
    S.tick(r,.01);
    if(['boots','volley','heart','dash','feather','magnet','might','haste','reach','harvest','thorns'].includes(id))continue;
    assert.ok(r.sounds.has(id==='cornshot'?'egg':power.visual||id),id+' activation');
    r.sounds.clear();r.paused=true;S.tick(r,.05);assert.equal(r.sounds.size,0,id+' paused');
  }
  for(const id of Object.keys(S.HEROES)){
    const r=arena();r.player.skin=id;r.heroCooldown=0;
    if(id==='astronaut')r.player.dashTime=.18;
    S.tick(r,.01);assert.ok(r.sounds.size,id+' special');assert.ok(!r.sounds.has(undefined));
  }
  for(const [id,recipe] of Object.entries(S.FUSIONS)){
    const r=arena();r.enemies[0].x=655;for(const item of recipe.items)r.powers[item]=3;
    assert.ok(S.fuse(r,id));assert.ok(r.sounds.has('fusion'));r.sounds.clear();
    S.tick(r,.01);assert.ok(r.sounds.has(recipe.visual),id+' attack');
  }
  const r=arena();r.powers={cornshot:3};r.enemies=[];S.tick(r,.01);
  assert.equal(r.sounds.size,0,'no shot sound without a target');
  r.pickups=[{x:r.player.x,y:r.player.y,kind:'xp',value:8}];S.tick(r,.01);
  assert.equal(r.phase,'power-draft');assert.ok(r.sounds.has('level'));
  r.sounds.clear();assert.ok(S.reroll(r));assert.ok(r.sounds.has('shuffle'));
});
