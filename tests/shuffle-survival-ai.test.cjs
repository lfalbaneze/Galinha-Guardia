const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../shuffle/survival.js'),M=require('../shuffle/maps.js');
const gap=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function enemy(species,extra={}){
  const t=S.ENEMIES[species];
  return {species,x:670,y:360,r:t.r,speed:t.speed,baseSpeed:t.speed,health:100,maxHealth:100,
    age:0,side:1,mode:'hunt',timer:0,trailTimer:0,dx:-1,dy:0,traveled:0,moving:false,
    route:[],routeTimer:0,routeTarget:null,...extra};
}
function arena(){
  const r=S.newRun(614);r.obstacles=[];r.layout.obstacles=r.obstacles;
  Object.assign(r,{powers:{},pickups:[],spawnTimer:999,itemTimer:999,heroCooldown:999});
  Object.assign(r.player,{x:560,y:360,invulnerable:0});return r;
}
function advance(r,seconds){for(let i=0;i<Math.ceil(seconds/.01);i++)S.tick(r,.01);}

test('ordinary melee species track preparation, commit before launch and leave a recovery opening',()=>{
  for(const [species,distance,warning,recovery] of [['fox',110,.38,.85],['wolf',150,.5,1.35],['fuinha',85,.3,1],['crow',150,.4,1.6],['amanda',150,.45,1.2]]){
    const r=arena(),e=enemy(species,{x:r.player.x+distance});r.enemies=[e];
    S.tick(r,.01);assert.equal(e.mode,'warning',species);assert.equal(e.timer,warning);
    assert.equal(e.contactDamage,false);assert.equal(r.hp,5);
    const aim=[e.aimX,e.aimY],start={x:e.x,y:e.y};
    r.player.y+=50;S.tick(r,.01);
    assert.notDeepEqual([e.aimX,e.aimY],aim,'an early sidestep must change the aim');
    while(e.timer>.11)S.tick(r,.01);
    const committed=[e.aimX,e.aimY];r.player.y-=120;
    while(e.mode==='warning')S.tick(r,.01);
    assert.deepEqual([e.aimX,e.aimY],committed,'late sidesteps cannot steer the attack');
    for(let i=0;i<80&&e.mode==='charge';i++)S.tick(r,.01);
    assert.equal(e.mode,'recover');assert.equal(e.timer,recovery);assert.equal(r.hp,5);
    assert.deepEqual([e.aimX,e.aimY],committed);assert.ok(e.x<start.x-30);assert.ok(e.y>start.y);
    const rest={x:e.x,y:e.y};advance(r,recovery-.05);assert.equal(e.mode,'recover');
    assert.deepEqual({x:e.x,y:e.y},rest,'recovery is an actual opening to counterattack');
  }
});

test('running sideways early can be intercepted, while changing direction at launch dodges',()=>{
  for(const species of ['fox','wolf','fuinha','amanda','crow'])for(const lateTurn of [false,true]){
    const r=arena(),e=enemy(species,{x:r.player.x+55});r.enemies=[e];S.tick(r,.01);
    for(let i=0;i<160&&e.mode!=='recover';i++)S.tick(r,.01,{y:lateTurn&&e.mode==='charge'?-1:1});
    assert.equal(e.mode,'recover',species);
    assert.equal(r.hp,lateTurn?5:4,`${species}: a late direction change must beat a predictable escape`);
  }
});

test('dash speed cannot poison an interception and stopping clears the predicted lead',()=>{
  const r=arena(),e=enemy('fox');r.enemies=[e];S.tick(r,.01);
  require('../shuffle/engine.js').dash(r,0,1);advance(r,.2);
  assert.equal(e.mode,'warning');assert.equal(r.player.vy,0);
  assert.ok([e.aimX,e.aimY,e.chargeTime].every(Number.isFinite));
  assert.ok(Math.abs(e.aimX*(r.player.y-e.y)-e.aimY*(r.player.x-e.x))<1e-8);
});

test('survival contact follows attack state and stun instead of hurting through a warning',()=>{
  for(const mode of ['hunt','warning','recover','feint']){
    const r=arena();r.enemies=[enemy('fox',{x:560,mode,timer:99,aimX:1,aimY:0})];
    S.tick(r,.01);assert.equal(r.hp,5,mode);
  }
  const stunned=arena();stunned.enemies=[enemy('crow',{x:560,mode:'charge',aimX:1,aimY:0,timer:.5,stun:1})];
  S.tick(stunned,.01);assert.equal(stunned.hp,5);assert.equal(stunned.enemies[0].contactDamage,false);
  const charge=arena();charge.enemies=[enemy('fox',{x:575,mode:'charge',timer:.4,aimX:-1,aimY:0})];
  S.tick(charge,.01);assert.equal(charge.hp,4,'an actual lunge still damages the player');
});

test('attack groups grow with waves while warning and recovery windows remain stable',()=>{
  for(const [elapsed,limit] of [[0,2],[150,3]]){
    const r=arena();r.elapsed=elapsed;r.encounter=9;r.victories=99;
    r.enemies=Array.from({length:8},(_,i)=>enemy('wolf',{
      x:560+Math.cos(i*Math.PI/4)*150,y:360+Math.sin(i*Math.PI/4)*150
    }));
    S.tick(r,.01);
    const attacking=r.enemies.filter(e=>e.mode==='warning');assert.equal(attacking.length,limit);
    assert.ok(attacking.every(e=>e.timer===.5));
    const e=attacking[0];r.enemies=[e];e.mode='recover';e.timer=1.35;
    advance(r,1);assert.equal(e.mode,'recover');assert.ok(e.timer>.3);
  }
});

test('wolves intercept actual movement and stop anticipating after the player stops',()=>{
  const r=arena(),e=enemy('wolf',{x:820,timer:99});r.enemies=[e];
  S.tick(r,.05,{y:1});assert.ok(e.y>360+.5,'wolf cuts across the moving escape route');
  assert.ok(r.player.vy>0);
  Object.assign(e,{x:820,y:r.player.y,route:[],routeTarget:null});
  S.tick(r,.05);assert.equal(r.player.vy,0);assert.equal(e.y,r.player.y,'no prediction from stale facing');
});

test('ordinary geese announce one gust, hold range, and allow solid cover',()=>{
  const r=arena(),e=enemy('goose',{x:730});r.enemies=[e];
  S.tick(r,.01);assert.equal(e.mode,'warning');assert.equal(e.attack,'gust');
  assert.deepEqual(e.angles,[0]);assert.equal(r.hexes.length,0);
  r.obstacles.push({x:630,y:250,w:30,h:220});advance(r,2.4);
  assert.equal(r.hp,5);assert.equal(r.hexes.length,0);assert.equal(e.mode,'recover');
  const close=arena(),goose=enemy('goose',{x:680,timer:99});close.enemies=[goose];
  S.tick(close,.05);assert.ok(goose.x>680,'ranged goose retreats instead of becoming a stationary target');
});

test('lunges stop at scenery and damaged or stunned attackers cannot bypass recovery',()=>{
  const r=arena(),e=enemy('wolf',{x:710});r.enemies=[e];S.tick(r,.01);
  r.obstacles.push({x:620,y:300,w:25,h:120});advance(r,1.4);
  assert.ok(e.x>=645+e.r);assert.equal(e.mode,'recover');assert.equal(r.hp,5);
  const before={x:e.x,y:e.y},timer=e.timer;e.stun=.5;advance(r,.3);
  assert.deepEqual({x:e.x,y:e.y},before);assert.equal(e.timer,timer);
});

test('spawned bodies are separated and inaccessible spawn candidates are skipped',()=>{
  const r=arena();r.enemyTypes=['wolf'];r.elapsed=30;r.spawnTimer=0;
  r.obstacles.push({x:790,y:28,w:30,h:664});
  r.locations=[{x:990,y:360},{x:90,y:80},{x:90,y:85},{x:150,y:80},{x:210,y:80}];
  S.tick(r,.01);assert.ok(r.enemies.length>0);
  assert.ok(r.enemies.every(e=>e.x<790&&M.clearCircle(r,e,e.r)&&gap(e,r.player)>360));
  for(let i=0;i<r.enemies.length;i++)for(let j=i+1;j<r.enemies.length;j++){
    assert.ok(gap(r.enemies[i],r.enemies[j])>r.enemies[i].r+r.enemies[j].r+10);
  }
  const boss=arena();boss.enemyTypes=['fox'];boss.locations=[{x:950,y:360},{x:90,y:80}];
  boss.enemies=[enemy('wolf',{x:950,timer:99,baseSpeed:0})];boss.stageElapsed=60;
  S.tick(boss,.01);const spawned=boss.enemies.find(e=>e.isBoss);assert.ok(spawned);
  assert.ok(gap(spawned,boss.enemies[0])>spawned.r+boss.enemies[0].r+10);
});

test('hazards validate the whole damage radius against scenery',()=>{
  const r=arena();r.enemies=[enemy('curupira',{x:700})];
  r.obstacles.push({x:548,y:380,w:24,h:30});S.tick(r,.01);
  assert.equal(r.hazards.length,0,'a 29px root circle cannot overlap the nearby wall');
});

test('crowd separation preserves warning origins and committed charge corridors',()=>{
  for(const mode of ['warning','charge'])for(const reversed of [false,true]){
    const r=arena(),e=enemy('wolf',{x:710,mode,timer:.5,aimX:-1,aimY:0});
    const other=enemy('wolf',{x:710,y:365,timer:99,baseSpeed:0});
    r.enemies=reversed?[other,e]:[e,other];S.tick(r,.01);
    assert.equal(e.x,mode==='charge'?706.4:710);assert.equal(e.y,360);
    assert.ok(gap(e,other)>=e.r+other.r-4-1e-9,'only the uncommitted hunter yields');
  }
  const r=arena(),a=enemy('wolf',{x:710,mode:'warning',timer:.5,aimX:-1,aimY:0});
  const b={...a,y:365};r.enemies=[a,b];S.tick(r,.01);
  assert.deepEqual(r.enemies.map(e=>[e.x,e.y]),[[710,360],[710,365]],'two committed attacks keep their advertised paths');
});

test('the mule stops dealing body damage on the frame its gallop recovers',()=>{
  const r=arena(),e=enemy('mula-sem-cabeca',{x:580,mode:'charge',timer:.001,aimX:-1,aimY:0});
  r.enemies=[e];S.tick(r,.05);assert.equal(e.mode,'recover');assert.equal(e.contactDamage,false);assert.equal(r.hp,5);
});

test('spawn navigation uses the enemy body width and can approach a wall-hugging player',()=>{
  const narrow=arena();narrow.enemyTypes=['wolf'];narrow.elapsed=30;narrow.spawnTimer=0;
  narrow.obstacles.push({x:490,y:28,w:30,h:317},{x:490,y:375,w:30,h:317});
  narrow.locations=[{x:90,y:360}];
  assert.ok(M.route(narrow.layout,narrow.locations[0],narrow.player,narrow.player.r).length,'player can fit through the 30px opening');
  assert.equal(M.route(narrow.layout,narrow.locations[0],narrow.player,S.ENEMIES.wolf.r).length,0);
  S.tick(narrow,.01);assert.equal(narrow.enemies.length,0,'do not spawn wolves behind a passage too narrow for them');

  for(const corner of [false,true]){
    const r=arena();r.enemyTypes=['wolf'];r.elapsed=30;r.spawnTimer=0;
    if(corner){Object.assign(r.player,{x:485,y:285});r.obstacles.push({x:500,y:300,w:100,h:100});r.locations=[{x:950,y:100}];}
    else {Object.assign(r.player,{x:796,y:360});r.obstacles.push({x:810,y:200,w:80,h:300});r.locations=[{x:120,y:360}];}
    assert.ok(M.clearCircle(r,r.player,r.player.r));S.tick(r,.01);
    assert.equal(r.enemies.length,1,'a reachable neighboring approach avoids disabling spawns at walls or corners');
  }
});

test('a smaller player cannot disable melee attacks by hugging a wall',()=>{
  const r=arena();Object.assign(r.player,{x:796,y:360});r.obstacles.push({x:810,y:200,w:80,h:300});
  const e=enemy('wolf',{x:680});r.enemies=[e];S.tick(r,.01);assert.equal(e.mode,'warning');
  advance(r,1.3);assert.ok(r.hp<5,'the charge can reach body contact before the wall');assert.ok(M.clearCircle(r,e,e.r));
});

test('flankers cut across a moving escape route on opposite sides and respect scenery',()=>{
  for(const species of ['fox','amanda','fuinha']){
    const r=arena(),other=arena(),left=enemy(species,{x:800,y:360,timer:99,side:1}),right=enemy(species,{x:800,y:360,timer:99,side:-1});
    r.enemies=[left];other.enemies=[right];S.tick(r,.05,{y:1});S.tick(other,.05,{y:1});
    assert.ok(left.y>360&&right.y>360,'both anticipate the running player');
    assert.ok(left.x<right.x,'opposite flanks form a pincer across the escape direction');
    Object.assign(left,{x:800,y:360,route:[],routeTarget:null});r.enemies=[left];
    r.obstacles.push({x:620,y:380,w:180,h:80});
    for(let i=0;i<100;i++){S.tick(r,.01,{y:1});assert.ok(M.clearCircle(r,left,left.r));}
  }
});

test('ranged enemies give ground, but never retreat through walls or move during a warning',()=>{
  for(const species of ['goose','cuca']){
    const r=arena(),e=enemy(species,{x:680,timer:99});r.enemies=[e];
    S.tick(r,.05);assert.ok(e.x>680);assert.ok(Math.abs(e.y-360)>0);
    Object.assign(e,{x:680,y:360,route:[],routeTarget:null});
    r.obstacles.push({x:702,y:290,w:90,h:180});S.tick(r,.05);assert.equal(e.x,680);assert.equal(e.y,360);
    r.obstacles=[];r.layout.obstacles=r.obstacles;e.mode='warning';e.timer=1;e.aimX=-1;e.aimY=0;e.attack='gust';e.angles=[0];
    S.tick(r,.05);assert.equal(e.x,680);assert.equal(e.y,360);
  }
});
