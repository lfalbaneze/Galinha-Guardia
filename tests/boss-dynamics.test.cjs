const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
const S=require('../shuffle/survival.js');
function adventure(species){
  const h=createGame();h.run(`OBSTACLES=[];state.rescuedCount=10;state.entities.thor=null;state.lake.active=false;
    var c=state.entities.chicken,e=state.entities.folklore.find(e=>e.species===${JSON.stringify(species)});
    Object.assign(c,{x:1150,y:800,invulnerable:0,hidden:false,vx:0,vy:0});
    Object.assign(e,{x:1000,y:800,home:{x:1000,y:800},active:true,grace:0,mode:'patrol',timer:0});
    state.entities.folklore=[e];`);return h;
}
const step=(h,time)=>h.run(`for(let i=0;i<${Math.ceil(time/.02)};i++)FolkloreSystem.update(state,.02)`);
function survival(species,extra={}){
  const r=S.newRun(614);r.obstacles=[];r.layout.obstacles=r.obstacles;
  Object.assign(r,{powers:{},pickups:[],spawnTimer:999,itemTimer:999,heroCooldown:999});
  Object.assign(r.player,{x:560,y:360,invulnerable:0});
  const t=S.ENEMIES[species],e={species,x:740,y:360,r:t.r,speed:t.speed,baseSpeed:t.speed,
    health:1000,maxHealth:1000,age:0,side:1,mode:'hunt',timer:0,trailTimer:0,dx:-1,dy:0,
    traveled:0,route:[],routeTimer:0,routeTarget:null,isBoss:true,...extra};
  r.enemies=[e];return {r,e};
}
const tick=(r,time,input)=>{for(let i=0;i<Math.ceil(time/.01);i++)S.tick(r,.01,input);};

test('adventure bosses resume nearby after recovery and a counter, without a mandatory walk home',()=>{
  for(const species of ['curupira','mula-sem-cabeca','boitata','cuca']){
    const h=adventure(species);h.run("e.x=1100;e.mode='rest';e.timer=.01;FolkloreSystem.update(state,.02)");
    assert.equal(h.run('e.mode'),'hunt',species);assert.equal(h.run('e.x'),1100);
    h.run("e.mode='rest';c.x=e.x+60;FolkloreSystem.interact(state)");
    assert.equal(h.run('e.courage'),2);assert.equal(h.run('e.mode'),'hunt');
    assert.equal(h.run('state.folkloreThreats.length'),0);
  }
});

test('adventure Curupira marks a fixed root enclosure with a usable escape gap',()=>{
  const h=adventure('curupira');h.run('e.attacks=2;FolkloreSystem.update(state,.02);var planned=JSON.stringify(e.attackPoints)');
  assert.equal(h.run('e.pattern'),'root-ring');assert.equal(h.run('e.attackPoints.length'),8);
  assert.ok(h.run('e.attackPoints.every(p=>distance(p,{x:1265,y:800})>60)'));
  h.run('c.y=980');step(h,.9);
  assert.equal(h.run('JSON.stringify(e.attackPoints)'),h.run('planned'));
  assert.equal(h.run('state.folkloreThreats.length'),8);
  assert.ok(h.run('state.folkloreThreats.at(-1).arm>state.folkloreThreats[0].arm'));
  assert.equal(h.run('state.lives'),3);
});

test('adventure mule alternates a gallop and fire volley; fences block the actual fireballs',()=>{
  const h=adventure('mula-sem-cabeca');h.run('e.attacks=1;FolkloreSystem.update(state,.02)');
  assert.equal(h.run('e.pattern'),'fire-fan');assert.equal(h.run('state.folkloreThreats.length'),0);
  h.run('c.y=960');step(h,1.05);
  assert.equal(h.run('state.folkloreThreats.filter(h=>h.kind==="ember").length'),3);
  h.run('OBSTACLES=[{x:1060,y:600,w:20,h:500}];state.entities.folklore=[]');step(h,1);
  assert.equal(h.run('state.folkloreThreats.length'),0);assert.equal(h.run('state.lives'),3);
});

test('wounded adventure mule warns again before a second committed gallop and then rests',()=>{
  const h=adventure('mula-sem-cabeca');h.run('e.courage=2;FolkloreSystem.update(state,.02);c.y=930');
  h.run("for(let i=0;i<180&&!e.followUp;i++)FolkloreSystem.update(state,.02)");
  assert.equal(h.run('e.mode'),'warning');assert.equal(h.run('e.followUp'),true);
  assert.ok(h.run('e.timer')>=.65);assert.equal(h.run('e.attacks'),1);
  h.run('var target=JSON.stringify(e.target);c.y=700');step(h,.3);
  assert.equal(h.run('JSON.stringify(e.target)'),h.run('target'));
  h.run("for(let i=0;i<180&&e.mode!=='rest';i++)FolkloreSystem.update(state,.02)");
  assert.equal(h.run('e.mode'),'rest');assert.equal(h.run('e.followUp'),false);
  assert.equal(h.run('state.lives'),3);
});

test('survival Curupira alternates waves, an open ring and a committed dash that can be dodged',()=>{
  const {r,e}=survival('curupira');S.tick(r,.01);assert.equal(e.attack,'roots');
  assert.equal(r.hazards.length,3);assert.ok(r.hazards[2].arm>r.hazards[0].arm);
  assert.equal(new Set(r.hazards.map(h=>`${h.x},${h.y}`)).size,3,'a still player gets distinct root centers');
  r.hazards=[];e.mode='hunt';e.timer=0;S.tick(r,.01);
  assert.equal(e.attack,'root-ring');assert.equal(r.hazards.length,8);
  assert.ok(r.hazards.every(h=>Math.hypot(h.x-455,h.y-360)>60));
  r.hazards=[];e.mode='hunt';e.timer=0;S.tick(r,.01);
  assert.equal(e.attack,'root-dash');const aim=[e.aimX,e.aimY],flight=e.chargeTime;
  tick(r,2.05,{y:1});assert.equal(e.mode,'recover');assert.deepEqual([e.aimX,e.aimY],aim);
  assert.equal(e.chargeTime,flight,'moving during the warning cannot extend the committed dash');
  assert.ok(e.x<600);assert.equal(r.hp,5);assert.equal(r.hazards.length,0);
});

test('adventure gallops stay inside the territory so the boss can still reposition afterwards',()=>{
  const h=adventure('mula-sem-cabeca');h.run('e.x=1220;c.x=1410;FolkloreSystem.update(state,.02)');
  assert.equal(h.run('e.mode'),'warning');assert.ok(h.run('distance(e.target,e.home)')<=450);
  h.run('c.y=960');step(h,2);
  assert.equal(h.run('e.mode'),'rest');assert.ok(h.run('distance(e,e.home)')<=450);
});

test('wounded survival mule gives a full second warning, commits again, and never chains a third gallop',()=>{
  const {r,e}=survival('mula-sem-cabeca',{health:400,attackStep:2});S.tick(r,.01);
  tick(r,2.27,{y:1});assert.equal(e.mode,'warning');assert.equal(e.followUp,true);
  assert.ok(e.timer>.85);const aim=[e.aimX,e.aimY];
  r.paused=true;const frozen=JSON.stringify(r);tick(r,.5);assert.equal(JSON.stringify(r),frozen);r.paused=false;
  tick(r,.4,{y:-1});assert.deepEqual([e.aimX,e.aimY],aim);assert.deepEqual([e.dx,e.dy],aim,'preparation faces the new gallop');
  tick(r,1.7,{y:-1});assert.equal(e.mode,'recover');assert.equal(e.followUp,false);
});

test('survival mule stops at scenery instead of chaining through it',()=>{
  const {r,e}=survival('mula-sem-cabeca',{health:400,attackStep:2});S.tick(r,.01);
  r.obstacles.push({x:640,y:80,w:25,h:600});tick(r,1.8);
  assert.equal(e.mode,'recover');assert.equal(e.followUp,false);assert.ok(e.x>665);assert.equal(r.hp,5);
});

test('root and fire enclosures put their opening along a walkable route near a wall',()=>{
  for(const species of ['curupira','boitata']){
    const {r,e}=survival(species,{attackStep:species==='curupira'?1:0});
    r.obstacles.push({x:435,y:170,w:35,h:380});S.tick(r,.01);
    assert.ok(r.hazards.length>=4);assert.ok(r.hazards.every(h=>Math.hypot(h.x-560,h.y-255)>60));
    assert.ok(r.hazards.some(h=>Math.abs(h.y-465)<1),'the blocked outward exit is moved to the free side');
  }
});

test('survival boss recovery rewards attacking with 35 percent more damage',()=>{
  const fight=mode=>{
    const {r,e}=survival('curupira',{x:600,mode,timer:99});r.powers={sickle:1};r.cooldowns.sickle=0;
    const start=e.health;S.tick(r,.01);return start-e.health;
  };
  assert.ok(fight('hunt')>0);assert.ok(Math.abs(fight('recover')/fight('hunt')-1.35)<1e-8);
});

test('a wounded witch opens the center of her larger fan without shortening the warning',()=>{
  const {r,e}=survival('cuca',{health:400});S.tick(r,.01);
  assert.equal(e.timer,1.05);assert.equal(e.angles.length,6);assert.ok(e.angles.every(a=>Math.abs(a)>=.25));
});
