const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../shuffle/survival.js'),M=require('../shuffle/maps.js');
const gap=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function arena(species){
  const r=S.newRun(614);r.obstacles=[];r.layout.obstacles=r.obstacles;r.powers={};r.heroCooldown=999;
  r.spawnTimer=999;r.pickups=[];Object.assign(r.player,{x:560,y:360,invulnerable:999});
  const type=S.ENEMIES[species];r.enemies=[{x:760,y:360,species,r:type.r,health:99,maxHealth:99,
    speed:type.speed,baseSpeed:type.speed,age:0,side:1,mode:'hunt',timer:0,trailTimer:0,dx:0,dy:1,
    moving:false,traveled:0,route:[],routeTimer:0,routeTarget:null}];return r;
}
test('ten survival layouts have connected distinct routes, safe scenery and stage-specific larger hordes',()=>{
  const variants=Array.from({length:S.STAGES.length},()=>new Set());
  for(let seed=1;seed<=35;seed++){
    const r=S.newRun(seed),themes=new Set(),routes=new Set();r.powers={};r.heroCooldown=999;
    for(let i=0;i<S.STAGES.length;i++){
      const l=r.layout;themes.add(l.theme);routes.add(JSON.stringify(l.roads));
      variants[i].add(l.variant);
      assert.deepEqual(l,M.survival(seed,i));assert.ok(l.obstacles.length>=3,seed+':'+i+' scenery');
      for(const road of l.roads)assert.ok(M.clearSegment(l,road.a,road.b,26));
      assert.ok(M.route(l,l.spawn,l.exit,22).length);
      for(const item of r.pickups)assert.ok(M.clearCircle(l,item,22));
      r.elapsed=240;r.spawnTimer=0;r.enemies=[];r.player.invulnerable=999;
      S.tick(r,.01);assert.ok(r.enemies.length>=S.STAGES[i].horde);
      assert.ok(r.enemies.every(e=>S.STAGES[i].roster.includes(e.species)));
      assert.ok(r.enemies.every(e=>M.clearCircle(l,e,e.r)&&gap(e,r.player)>360));
      if(i<S.STAGES.length-1){r.phase='stage-clear';assert.ok(S.nextStage(r));}
    }
    assert.equal(themes.size,S.STAGES.length);assert.equal(routes.size,S.STAGES.length);
  }
  variants.forEach(v=>assert.equal(v.size,3,'all three connected variants are used'));
});
test('crow tracks preparation, locks at launch and stops its rasante at solid obstacles',()=>{
  const r=arena('crow'),e=r.enemies[0];S.tick(r,.05);assert.equal(e.mode,'warning');
  const aim=[e.aimX,e.aimY];r.player.y=490;
  while(e.mode==='warning')S.tick(r,.01);assert.equal(e.mode,'charge');assert.notDeepEqual([e.aimX,e.aimY],aim);
  const committed=[e.aimX,e.aimY];r.player.y=230;
  r.obstacles.push({x:645,y:300,w:30,h:150});
  for(let i=0;i<15;i++)S.tick(r,.05);
  assert.ok(e.x>=675+e.r);assert.equal(e.mode,'recover');assert.deepEqual([e.aimX,e.aimY],committed);
});
test('Sophis feints away then commits to a warned ambush; pause freezes every state',()=>{
  const r=arena('amanda'),e=r.enemies[0];e.timer=.5;S.tick(r,.01);assert.equal(e.mode,'feint');
  const before=gap(e,r.player);for(let i=0;i<8;i++)S.tick(r,.05);assert.ok(gap(e,r.player)>before);
  for(let i=0;i<30&&e.mode!=='warning';i++)S.tick(r,.05);assert.equal(e.mode,'warning');
  r.paused=true;const frozen=JSON.stringify(r);S.tick(r,.05);assert.equal(JSON.stringify(r),frozen);
});
test('owl siren can be interrupted, rallies only nearby enemies and relocates without blocking detection',()=>{
  const r=arena('owl'),e=r.enemies[0];
  const near={...e,species:'wolf',x:800,timer:99},far={...e,species:'fox',x:100,y:100,timer:99};
  r.enemies.push(near,far);S.tick(r,.01);assert.equal(e.mode,'warning');assert.equal(near.rally,0);
  for(let i=0;i<24;i++)S.tick(r,.05);
  assert.ok(near.rally>0);assert.ok(near.speed>near.baseSpeed);assert.equal(far.rally,0);assert.equal(far.speed,far.baseSpeed);assert.equal(e.mode,'recover');assert.ok(e.perch);
  for(let i=0;i<75;i++)S.tick(r,.05);assert.equal(e.mode,'hunt');assert.equal(near.rally,0);
  const interrupted=arena('owl');S.tick(interrupted,.01);interrupted.enemies=[];S.tick(interrupted,.05);
  assert.equal(interrupted.sounds.size,1,'killing the alarm source cannot emit a later siren');
  const wooded=arena('owl');wooded.obstacles.push({x:900,y:310,w:40,h:30,kind:'tree'});
  for(let i=0;i<25;i++)S.tick(wooded,.05);
  assert.deepEqual(wooded.enemies[0].perch,{x:920,y:375},'prefer another safe tree over a closer road point');
});
