const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../shuffle/survival.js'),E=require('../shuffle/engine.js'),M=require('../shuffle/maps.js');
const species=['chick','duck','pig','turkey','lamb','goat','donkey','sheep','horse','cow'];
function arena(){
  const r=S.newRun(614);r.obstacles=[];r.layout.obstacles=r.obstacles;
  Object.assign(r,{powers:{},pickups:[],spawnTimer:999,itemTimer:999,heroCooldown:999,enemies:[]});
  Object.assign(r.player,{x:560,y:360,invulnerable:0});return r;
}
function enemy(id,extra={}){
  const t=S.ENEMIES[id];return {species:id,x:650,y:360,r:t.r,speed:t.speed,baseSpeed:t.speed,health:100,maxHealth:100,
    age:0,side:1,mode:'hunt',timer:0,trailTimer:0,dx:-1,dy:0,traveled:0,moving:false,route:[],routeTimer:0,routeTarget:null,...extra};
}
function advance(r,time,input={}){for(let i=0;i<Math.ceil(time/.01);i++)S.tick(r,.01,input);}

test('all ten farm enemies are in stage rosters and actually spawn in reachable, separate positions',()=>{
  assert.equal(Object.keys(S.ENEMIES).length,21);
  for(const id of species){
    assert.ok(S.STAGES.some(s=>s.roster.includes(id)),id);
    const r=S.newRun(614,[id]);r.elapsed=250;r.spawnTimer=0;r.heroCooldown=999;r.player.invulnerable=99;
    S.tick(r,.01);assert.ok(r.enemies.some(e=>e.species===id),id+' spawns');
    for(const e of r.enemies){assert.ok(M.clearCircle(r,e,e.r));assert.ok(M.route(r.layout,e,r.player,e.r).length);}
    assert.ok(r.enemies.length<=S.MAX_ENEMIES);
    for(const won of [true,false])assert.ok(S.quip(r,{species:id},won).artId==='enemy-'+id);
  }
});

test('goat, horse, cow and lamb warn, commit, stop at walls and leave a recovery opening',()=>{
  for(const [id,distance]of [['goat',140],['horse',240],['cow',185],['lamb',100]]){
    const r=arena(),e=enemy(id,{x:r.player.x+distance});r.enemies=[e];r.player.invulnerable=99;
    S.tick(r,.01);assert.equal(e.mode,'warning',id);assert.equal(e.contactDamage,false);
    const origin={x:e.x,y:e.y};r.obstacles.push({x:e.x-65,y:230,w:12,h:260,kind:'barn'});
    for(let i=0;i<180&&e.mode!=='recover';i++)S.tick(r,.01);
    assert.ok(e.x>=origin.x-65+12+e.r-.1,id+' respects wall');
    assert.equal(e.mode,'recover',id);assert.equal(e.contactDamage,false);
  }
});

test('pig mud warns, slows walking without damage, preserves dash and expires',()=>{
  const r=arena(),e=enemy('pig',{x:740});r.enemies=[e];
  S.tick(r,.01);assert.equal(r.hazards[0].kind,'mud');assert.ok(r.hazards[0].arm>0);assert.equal(r.player.mudSlow||0,0);
  advance(r,.85);assert.ok(r.player.mudSlow>0);assert.equal(r.hp,5);
  const start=r.player.x;S.tick(r,.05,{x:1});assert.ok(Math.abs(r.player.x-start-E.stats(r).speed*.05*.65)<1e-6);
  r.player.dashTime=.1;r.player.dashX=1;r.player.dashY=0;const dash=r.player.x;S.tick(r,.05);
  assert.ok(Math.abs(r.player.x-dash-525*.05)<1e-6);
  r.enemies=[];advance(r,5);assert.equal(r.hazards.length,0);assert.equal(r.player.mudSlow,0);
});

test('donkey turns its back before the kick; stepping aside and interrupting a stomp prevent damage',()=>{
  const r=arena(),e=enemy('donkey');r.enemies=[e];S.tick(r,.01);
  assert.equal(e.mode,'warning');assert.ok(e.dx>0,'faces away from player');assert.equal(r.hazards[0].kind,'kick');
  r.player.y+=110;advance(r,.85);assert.equal(r.hp,5);
  const q=arena(),sheep=enemy('sheep',{x:630});q.enemies=[sheep];S.tick(q,.01);
  assert.equal(q.hazards[0].kind,'stomp');sheep.stun=2;advance(q,.9);
  assert.equal(q.hp,5);assert.equal(q.hazards.length,0,'stun cancels the prepared attack');
  const hit=arena();hit.enemies=[enemy('sheep',{x:630})];advance(hit,.9);assert.equal(hit.hp,4);
});

test('turkey makes two committed pecks with safe pauses; nearby chicks gain speed',()=>{
  const r=arena(),e=enemy('turkey',{x:630});r.enemies=[e];r.player.invulnerable=99;
  let charges=0,previous=e.mode;
  for(let i=0;i<220;i++){
    S.tick(r,.01);if(e.mode==='charge'&&previous!=='charge')charges++;
    if(['warning','recover'].includes(e.mode))assert.equal(e.contactDamage,false);
    previous=e.mode;
  }
  assert.equal(charges,2);assert.ok(e.traveled>50);
  const solo=arena(),a=enemy('chick');solo.enemies=[a];S.tick(solo,.01);
  const flock=arena(),b=enemy('chick');flock.enemies=[b,enemy('chick',{x:700,y:390})];S.tick(flock,.01);
  assert.ok(b.speed>a.speed);assert.ok(M.clearCircle(flock,b,b.r));
});

test('duck spits three mud clods, cover blocks them, and pause freezes every new attack',()=>{
  const r=arena(),e=enemy('duck',{x:800});r.enemies=[e];S.tick(r,.01);assert.equal(e.mode,'warning');
  advance(r,.66);assert.equal(r.hexes.length,3);assert.ok(r.hexes.every(h=>h.kind==='dirt'&&h.source.species==='duck'));
  r.obstacles.push({x:665,y:240,w:20,h:240,kind:'barn'});advance(r,1.7);assert.equal(r.hp,5);assert.equal(r.hexes.length,0);
  for(const id of species){
    const q=arena();q.enemies=[enemy(id,{x:620})];S.tick(q,.01);q.paused=true;
    const snapshot=JSON.stringify([q.enemies,q.hazards,q.hexes,q.player]);advance(q,2);
    assert.equal(JSON.stringify([q.enemies,q.hazards,q.hexes,q.player]),snapshot,id+' pause');
  }
});
