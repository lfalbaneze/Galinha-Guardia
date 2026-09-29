const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const E=require('../shuffle/engine.js'),M=require('../shuffle/maps.js');
const begin=(seed=1)=>{const r=E.newRun(seed);E.choose(r,r.choices[0]);return r;};
function withSkill(id){for(let seed=1;seed<1000;seed++){const r=E.newRun(seed);if(r.choices.includes(id)){E.choose(r,id);return r;}}throw Error(id);}
// Explicit unit fixtures: these helpers set up state; browser tests use real inputs.
function finishBoss(r){for(let i=r.boss.courage;i>0;i--){Object.assign(r.boss,{mode:'stunned',hitThisStun:false});r.player.x=r.boss.x;r.player.y=r.boss.y;assert.ok(E.interact(r));}}
function finishStage(r){
 r.enemies=[];
 if(r.boss)finishBoss(r);else for(const f of r.friends){r.player.x=f.x;r.player.y=f.y;E.tick(r,.01);}
 if(r.phase==='playing'){Object.assign(r.player,r.exit);E.tick(r,.01);}
}
function stage(index,seed=19){const r=begin(seed);for(let i=0;i<index;i++){finishStage(r);assert.equal(r.phase,'draft');E.choose(r,r.choices[0]);}return r;}
function empty(r){r.obstacles=[];r.layout.obstacles=r.obstacles;r.enemies=[];r.player.x=100;r.player.y=360;return r;}

test('ten stages, eight explorations, bosses only on 5 and 10',()=>{
 assert.equal(E.STAGES.length,10);assert.deepEqual(E.STAGES.filter(s=>s.boss).map(s=>s.number),[5,10]);
 assert.equal(E.STAGES[4].bossId,'panto');assert.equal(E.STAGES[9].bossId,'baltazar');
 assert.equal(E.STAGES.filter(s=>!s.boss).length,8);
});
test('three distinct legal offers and repeatable seeded cards',()=>{
 for(let seed=1;seed<=300;seed++){const r=E.newRun(seed);assert.equal(new Set(r.choices).size,3);assert.deepEqual(r.choices,E.newRun(seed).choices);}
});
test('only offered cards can be chosen, once per draft',()=>{const r=E.newRun(14),id=r.choices[0];assert.equal(E.choose(r,'injected'),false);assert.equal(E.choose(r,id),true);assert.equal(E.choose(r,id),false);assert.equal(r.level,1);});
test('one reroll per stage is deterministic and does not change skill ranks',()=>{const a=E.newRun(2),b=E.newRun(2);assert.ok(E.reroll(a));E.reroll(b);assert.deepEqual(a.choices,b.choices);assert.equal(E.reroll(a),false);assert.equal(a.level,0);});
test('every draft still has three upgrade choices through phase ten',()=>{
 for(let seed=1;seed<=80;seed++){
  const r=E.newRun(seed);
  for(let i=0;i<10;i++){
   assert.equal(r.stage,i);assert.equal(new Set(r.choices).size,3);
   if(seed%2)E.reroll(r);
   assert.ok(r.choices.every(id=>r.skills[id]===undefined||r.skills[id]<E.SKILLS.find(s=>s.id===id).max));
   assert.ok(E.choose(r,r.choices[(seed+i)%3]));finishStage(r);
  }
  assert.equal(r.phase,'won');assert.equal(r.level,10);assert.equal(r.bossesDefeated,2);assert.equal(r.totalRescued,33);
 }
});
test('maxed skills never appear again',()=>{const r=withSkill('shield');finishStage(r);assert.ok(!r.choices.includes('shield'));E.reroll(r);assert.ok(!r.choices.includes('shield'));});
test('all 2000 procedural layouts reserve clear objectives, enemies and continuous wide paths',()=>{
 for(let seed=1;seed<=200;seed++)for(let i=0;i<10;i++){
  const l=E.generateStage(seed,i),config=E.STAGES[i];
  assert.equal(l.friends.length,config.friendCount);assert.equal(l.enemies.length,config.enemyCount);
  assert.ok(l.obstacles.length>=4);assert.ok(l.roads.length>0);
  for(const p of [l.spawn,l.exit,...l.friends,...l.enemies,...(l.boss?[l.boss]:[])])assert.ok(M.clearCircle(l,p,26),`${seed}:${i} spawn/goal collision`);
  for(const e of l.enemies)assert.ok(Math.hypot(e.x-l.spawn.x,e.y-l.spawn.y)>=380);
  for(const r of l.roads)assert.ok(M.clearSegment(l,r.a,r.b,26),`${seed}:${i} obstructed reserved road`);
 }
});
test('same run/stage restores identical geometry; seeds and levels vary more than colors',()=>{
 const a=E.generateStage(72,0);assert.deepEqual(a,E.generateStage(72,0));
 const signatures=new Set();for(let seed=1;seed<=30;seed++)signatures.add(JSON.stringify(E.generateStage(seed,0).obstacles));assert.ok(signatures.size>25);
 const spawns=new Set();for(let i=0;i<10;i++)spawns.add(JSON.stringify(E.generateStage(99,i).spawn));assert.ok(spawns.size>=8);
 assert.notDeepEqual(a.friends,E.generateStage(73,0).friends);assert.notDeepEqual(a.roads,E.generateStage(73,0).roads);
});
test('card rerolls never consume the procedural map stream',()=>{const a=E.newRun(2),b=E.newRun(2);E.reroll(a);E.choose(a,a.choices[0]);E.choose(b,b.choices[0]);assert.deepEqual(a.layout,b.layout);});
test('independent sampled flood fill reaches every rescue, entrance, exit and boss',()=>{
 // A separate 16px grid checks connectivity without trusting generator reservations or its pathfinder.
 for(let seed=1;seed<=25;seed++)for(let i=0;i<10;i++){
  const l=E.generateStage(seed,i),cols=66,rows=41,point=n=>({x:40+(n%cols)*16,y:40+Math.floor(n/cols)*16});
  const valid=Array.from({length:cols*rows},(_,n)=>M.clearCircle(l,point(n),14));
  const nearest=p=>{let id=-1,best=Infinity;for(let n=0;n<valid.length;n++)if(valid[n]){const q=point(n),d=Math.hypot(p.x-q.x,p.y-q.y);if(d<best&&M.clearSegment(l,p,q,13)){best=d;id=n;}}return id;};
  const origin=nearest(l.spawn),queue=[origin],seen=new Set(queue);
  for(let n=0;n<queue.length;n++){const id=queue[n];for(const j of [id%cols?id-1:-1,id%cols<cols-1?id+1:-1,id>=cols?id-cols:-1,id+cols<valid.length?id+cols:-1])if(j>=0&&valid[j]&&!seen.has(j)&&M.clearSegment(l,point(id),point(j),13)){seen.add(j);queue.push(j);}}
  for(const goal of [l.exit,...l.friends,...l.enemies,...(l.boss?[l.boss]:[])])assert.ok(seen.has(nearest(goal)),`${seed}:${i} unreachable goal`);
 }
});
test('enemy-sized navigation routes fit actual collision geometry',()=>{
 for(let seed=31;seed<=45;seed++)for(let i=0;i<10;i++){
  const l=E.generateStage(seed,i);
  for(const goal of [l.exit,...l.friends]){
   const route=E.route(l,l.spawn,goal,22);assert.ok(route.length,`${seed}:${i} missing route`);
   let from=l.spawn;for(const to of route){assert.ok(M.clearSegment(l,from,to,22));from=to;}
  }
 }
});
test('invalid stage numbers cannot generate phantom stages',()=>{for(const i of [-1,10,NaN,2.5])assert.throws(()=>E.generateStage(9,i),RangeError);});
test('exit locks until the correct procedural friend count is rescued',()=>{
 const r=stage(2);Object.assign(r.player,r.exit);E.tick(r,.01);assert.equal(r.stage,2);assert.equal(r.phase,'playing');assert.equal(r.friends.length,4);
 finishStage(r);assert.equal(r.stage,3);assert.equal(r.phase,'draft');
});
test('draft pauses simulation and carries skills, cumulative rescues and stage healing',()=>{
 const r=withSkill('recovery'),skills={...r.skills};r.hp=1;finishStage(r);assert.equal(r.hp,3);assert.equal(r.totalRescued,3);assert.deepEqual(r.skills,skills);
 const old=JSON.stringify(r);E.tick(r,1,{x:1});assert.equal(JSON.stringify(r),old);
});
test('boots increase displacement; diagonals remain normalized',()=>{const r=empty(withSkill('boots'));E.tick(r,.05,{x:1});const moved=r.player.x-100;assert.ok(moved>176*.05);r.player.x=100;E.tick(r,.05,{x:1,y:1});assert.ok(Math.abs(Math.hypot(r.player.x-100,r.player.y-360)-moved)<1e-5);});
test('heart increases maximum hearts and heals exactly one',()=>{const r=withSkill('heart');assert.equal(E.stats(r).maxHp,4);assert.equal(r.hp,4);});
test('shield absorbs one collision; invulnerability prevents consecutive-frame hits',()=>{const r=withSkill('shield');r.player.invulnerable=0;Object.assign(r.enemies[0],{x:r.player.x,y:r.player.y});E.tick(r,.01);assert.equal(r.hp,3);assert.equal(r.player.shield,false);E.tick(r,.01);assert.equal(r.hp,3);r.player.invulnerable=0;E.tick(r,.01);assert.equal(r.hp,2);});
test('dash respects cooldown and cannot tunnel through obstacles',()=>{const r=empty(withSkill('dash'));r.obstacles.push({x:180,y:250,w:70,h:200});assert.ok(E.dash(r,1,0));assert.equal(E.dash(r,1,0),false);for(let i=0;i<20;i++)E.tick(r,1/60);assert.ok(r.player.x+r.player.r<180);assert.ok(E.clearCircle(r,r.player,13));});
test('corn attracts enemies, expires, and requires its card',()=>{const r=empty(withSkill('corn'));r.enemies=[{species:'wolf',x:500,y:360,r:18,speed:105,traveled:0,route:[],routeTimer:0}];assert.ok(E.decoy(r));assert.equal(E.decoy(r),false);r.player.y=600;E.tick(r,.05);assert.ok(r.enemies[0].x<500);r.enemies=[];for(let i=0;i<420;i++)E.tick(r,1/60);assert.equal(r.decoy,null);assert.equal(E.decoy(withSkill('boots')),false);});
test('call increases rescue radius but never reaches through a solid prop',()=>{const r=empty(withSkill('call'));r.friends=[{species:'sheep',name:'Amélia',x:158,y:360,r:16,rescued:false}];r.obstacles.push({x:125,y:280,w:10,h:160});E.tick(r,.01);assert.equal(r.rescued,0);r.obstacles.length=0;E.tick(r,.01);assert.equal(r.rescued,1);});
test('slippery feathers increase protection after a real hit',()=>{const r=withSkill('feather');r.player.invulnerable=0;Object.assign(r.enemies[0],{x:r.player.x,y:r.player.y});E.tick(r,.01);assert.ok(r.player.invulnerable>1.9);assert.equal(r.hp,2);});
test('rescue healing occurs on its interval, not every frame',()=>{const r=withSkill('medicine');r.hp=1;r.enemies=[];for(const f of r.friends){Object.assign(r.player,{x:f.x,y:f.y});E.tick(r,.01);}assert.equal(r.hp,2);E.tick(r,.01);assert.equal(r.hp,2);});
test('Panto needs three openings, then unlocks phase six without ending the campaign',()=>{const r=stage(4);assert.equal(r.boss.species,'goose');assert.equal(r.boss.courage,3);Object.assign(r.player,r.exit);E.tick(r,.01);assert.equal(E.exitReady(r),false);finishBoss(r);assert.equal(r.phase,'playing');assert.equal(E.exitReady(r),true);assert.equal(r.bossesDefeated,1);Object.assign(r.player,r.exit);E.tick(r,.01);assert.equal(r.stage,5);assert.equal(r.phase,'draft');assert.equal(r.totalRescued,14);});
test('only defeating the tenth-stage boss wins the campaign',()=>{const r=stage(9);assert.equal(r.boss.name,'Baltazar');assert.equal(r.boss.courage,5);finishBoss(r);assert.equal(r.phase,'won');assert.equal(r.bossesDefeated,2);assert.equal(r.stage,9);assert.equal(E.dash(r),false);});
test('every boss locks direction during warning and exposes an actual counter window',()=>{
 for(const stageIndex of [4,9]){const r=stage(stageIndex);for(let i=0;i<120;i++)E.tick(r,1/60);assert.equal(r.boss.mode,'warning');const aim=[r.boss.aimX,r.boss.aimY];r.player.x=560;r.player.y=360;for(let i=0;i<20;i++)E.tick(r,1/60);assert.deepEqual([r.boss.aimX,r.boss.aimY],aim);for(let i=0;i<240&&r.boss.mode!=='stunned';i++)E.tick(r,1/60);assert.equal(r.boss.mode,'stunned');}
});
test('enraged Baltazar gives a new warning before the second charge',()=>{const r=stage(9);r.boss.courage=3;r.boss.timer=.01;E.tick(r,.02);assert.equal(r.boss.comboRemaining,1);let charges=0,last='';for(let i=0;i<500;i++){E.tick(r,1/60);if(r.boss.mode==='charge'&&last!=='charge')charges++;last=r.boss.mode;if(last==='stunned')break;}assert.equal(charges,2);assert.equal(r.boss.mode,'stunned');assert.match(r.notice,/tonto/);});
test('counter needs range and one opening, and cannot pass through an obstacle',()=>{const r=stage(4);r.boss.mode='stunned';r.boss.timer=2;r.player.x=r.boss.x-90;r.player.y=r.boss.y;assert.equal(E.interact(r),false);r.player.x=r.boss.x-20;r.obstacles.push({x:r.boss.x-12,y:r.boss.y-40,w:4,h:80});assert.equal(E.interact(r),false);r.obstacles.pop();assert.ok(E.interact(r));assert.equal(E.interact(r),false);});
test('pause and invalid deltas freeze bosses, movement and cooldowns',()=>{const r=stage(4);E.pause(r,true);const old=JSON.stringify(r);for(const dt of [0,-1,NaN,Infinity,.05])E.tick(r,dt,{x:1});assert.equal(JSON.stringify(r),old);E.pause(r,false);for(const dt of [0,-1,NaN,Infinity]){const before=JSON.stringify(r);E.tick(r,dt,{x:1});assert.equal(JSON.stringify(r),before);}});
test('losing cannot be reversed by late input',()=>{const r=begin();r.player.invulnerable=0;r.player.shield=false;r.hp=1;Object.assign(r.enemies[0],{x:r.player.x,y:r.player.y});E.tick(r,.01);assert.equal(r.phase,'lost');assert.equal(r.hp,0);assert.equal(E.dash(r),false);});
test('all ten stage checkpoints restore layout, rank and correct non-boss rescue total',()=>{for(let i=0;i<10;i++){const r=stage(i),c=E.restore(E.checkpoint(r));assert.ok(c);assert.deepEqual(c.layout,r.layout);assert.deepEqual(c.skills,r.skills);assert.equal(c.totalRescued,r.totalRescued);assert.equal(c.bossesDefeated,r.bossesDefeated);}});
test('restored draft keeps offer and reroll allowance; next map ignores previous rendering',()=>{const r=E.newRun(128);E.reroll(r);const c=E.restore(E.checkpoint(r));assert.ok(c);assert.deepEqual(c.choices,r.choices);assert.equal(c.rerolls,0);E.choose(r,r.choices[0]);E.choose(c,c.choices[0]);assert.deepEqual(c.layout,r.layout);finishStage(r);finishStage(c);assert.deepEqual(c.choices,r.choices);});
test('malformed and incompatible saves are rejected, including version-one worlds',()=>{const good=E.checkpoint(begin());for(const bad of [null,{}, {...good,version:1},{...good,mapVersion:99},{...good,seed:-1},{...good,rng:Infinity},{...good,stage:10},{...good,hp:2.5},{...good,skills:{hacked:1}},{...good,hp:Infinity},{...good,skills:{heart:99}},{...good,level:99},{...good,phase:'won'},{...good,choices:'wrong'}])assert.equal(E.restore(bad),null);});
test('separate v2 save does not mutate classic or v1; map script loads before engine',()=>{const ui=fs.readFileSync(path.join(__dirname,'../shuffle/ui.js'),'utf8'),html=fs.readFileSync(path.join(__dirname,'../shuffle/index.html'),'utf8');assert.match(ui,/penas-pro-ar\.shuffle\.v2/);assert.doesNotMatch(ui,/GameManager\.|resetGame\(|localStorage\.clear/);assert.ok(html.indexOf('./maps.js')<html.indexOf('./engine.js'));});
