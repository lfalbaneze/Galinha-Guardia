const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../shuffle/engine.js');
function arena(){
  const r=E.newRun(712);E.choose(r,r.choices[0]);
  r.obstacles=[];r.layout.obstacles=r.obstacles;r.layout.roads=[];r.friends=[];r.enemies=[];
  Object.assign(r.player,{x:700,y:360,invulnerable:100});return r;
}
function enemy(r,species,x,y){
  const e={species,x,y,r:18,speed:110,traveled:0,route:[],routeTimer:0,routeTarget:null,
    home:{x,y},mode:'patrol',memory:0,side:1,patrolIndex:0};
  r.enemies.push(e);return e;
}
test('campaign enemies patrol without knowing distant or obstructed player positions',()=>{
  const r=arena(),e=enemy(r,'wolf',150,360);E.tick(r,.05);
  assert.equal(e.mode,'patrol');assert.equal(e.memory,0);
  r.player.x=400;r.obstacles.push({x:270,y:180,w:30,h:360});E.tick(r,.05);
  assert.equal(e.mode,'patrol');assert.equal(e.lastSeen,undefined);
});
test('campaign searches the last sighting, then returns to patrol without tracking through walls',()=>{
  const r=arena(),e=enemy(r,'wolf',500,360);E.tick(r,.05);
  assert.equal(e.mode,'hunt');const sighting={...e.lastSeen};
  r.player.x=1030;r.player.y=620;
  for(let i=0;i<20;i++)E.tick(r,.05);
  assert.equal(e.mode,'search');assert.deepEqual(e.lastSeen,sighting);
  for(let i=0;i<50;i++)E.tick(r,.05);
  assert.equal(e.mode,'patrol');
});
test('campaign wolves intercept observed movement while foxes approach on a flank',()=>{
  const wolfRun=arena(),foxRun=arena();
  const wolf=enemy(wolfRun,'wolf',500,360),fox=enemy(foxRun,'fox',500,360);
  E.tick(wolfRun,.05,{y:1});E.tick(foxRun,.05,{y:1});
  assert.ok(wolf.dy>0);assert.ok(fox.dy>wolf.dy);assert.ok(wolf.dx>0&&fox.dx>0);
  E.tick(wolfRun,.05);assert.equal(wolfRun.player.vy,0,'Standing still must clear prediction velocity');
});
test('overlapping campaign enemies spread out without entering obstacles',()=>{
  const r=arena(),a=enemy(r,'wolf',500,360),b=enemy(r,'wolf',500,360);
  for(let i=0;i<20;i++)E.tick(r,.05);
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>10);
  for(const e of r.enemies)assert.ok(E.clearCircle(r,e,e.r));
});
test('crowd steering advances the gait by net displacement rather than cancelled steps',()=>{
  const r=arena(),a=enemy(r,'wolf',500,360);enemy(r,'wolf',520,360);
  const before={x:a.x,y:a.y};E.tick(r,.05);
  assert.ok(Math.abs(a.traveled-Math.hypot(a.x-before.x,a.y-before.y))<1e-8);
});
test('navigation can reach a smaller player hugging an obstacle',()=>{
  const r=arena(),e=enemy(r,'wolf',350,360);r.obstacles.push({x:500,y:240,w:80,h:240});
  Object.assign(r.player,{x:485,y:360});
  for(let i=0;i<80;i++)E.chase(r,e,r.player,.05);
  assert.ok(Math.hypot(e.x-r.player.x,e.y-r.player.y)<e.r+r.player.r);
  assert.ok(E.clearCircle(r,e,e.r));
});
test('failed routes wait before retrying instead of performing a search every frame',()=>{
  const r=arena(),e=enemy(r,'wolf',350,360);r.obstacles.push({x:500,y:28,w:40,h:664});
  E.chase(r,e,r.player,.05);assert.equal(e.route.length,0);assert.equal(e.routeTimer,.5);
  const old={x:e.x,y:e.y};E.chase(r,e,r.player,.05);
  assert.ok(e.routeTimer<.5&&e.routeTimer>.4);assert.ok(e.x>=old.x);
  for(let i=0;i<100;i++)E.chase(r,e,r.player,.05);
  assert.ok(e.x+e.r<500);assert.ok(E.clearCircle(r,e,e.r));
});
test('a valid pursuer beside a rounded obstacle corner can leave a failed route',()=>{
  const r=arena(),e=enemy(r,'wolf',485,285);r.obstacles.push({x:500,y:300,w:100,h:100});
  assert.ok(E.clearCircle(r,e,e.r));
  for(let i=0;i<50;i++)E.chase(r,e,{x:400,y:200},.05);
  assert.ok(Math.hypot(e.x-400,e.y-200)<5);assert.ok(E.clearCircle(r,e,e.r));
});
test('enemy attack states can explicitly suspend contact damage, including after a movement callback',()=>{
  const r=arena(),e=enemy(r,'wolf',700,360);r.player.invulnerable=0;r.player.shield=false;
  const hp=r.hp;E.tick(r,.05,{},()=>{e.contactDamage=false;});assert.equal(r.hp,hp);
  E.tick(r,.05,{},()=>{e.contactDamage=true;});assert.equal(r.hp,hp-1);
});
