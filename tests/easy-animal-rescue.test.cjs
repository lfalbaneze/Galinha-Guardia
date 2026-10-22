const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const assert=require('node:assert/strict'),{test}=require('node:test');
const source=fs.readFileSync(path.join(__dirname,'../systems/rescue-system.js'),'utf8');
function fixture(key='easy',species='horse'){
 const context=vm.createContext({
  clamp:(v,a,b)=>Math.min(b,Math.max(a,v)), distance:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),
  getHitbox:a=>({...a,r:10}), DetectionSystem:{hasLineOfSight:()=>true},
  SkinSystem:{power:()=>({})},SunflowerSystem:{concealed:()=>false},
  Player:{move:(a,x,y)=>{a.x+=x;a.y+=y;},face:()=>{}},
  WORLD:{areas:[{id:'field'}],layout:{animalSpawns:[{x:500,y:500,areaId:'field'}]}},
  resolveEnvironment:()=>{},CharacterArt:{advance:()=>0},GameManager:{rescue:()=>false,win:()=>{}}
 });
 vm.runInContext(source,context);
 const run=s=>vm.runInContext(s,context);
 run("var animal={x:500,y:500,species:"+JSON.stringify(species)+",direction:'left',fleeFrom:{x:400,y:500,kind:'player'},fatigue:0,restTime:0,fleeTime:0,targetX:500,targetY:500,wanderTime:100,vx:0,vy:0}; var game={phase:'playing',difficultyKey:"+JSON.stringify(key)+",entities:{chicken:{x:400,y:500,speed:300,vx:0,vy:0},wolf:{x:2000,y:2000,mode:'patrol',huntUnlockTimer:0,pauseTimer:0},animals:[animal],chicks:[]}}; RescueSystem.withinHome=()=>true; RescueSystem.talk=()=>{}; RescueSystem.secretHint=()=>null;");
 return run;
}
test('every species can be caught at walking speed on easy',()=>{
 const run=fixture();
 for(const species of run('Object.keys(RescueSystem.personalities)')){
  run("Object.assign(animal,{x:500,y:500,fatigue:0,species:"+JSON.stringify(species)+"});RescueSystem.flee(game,animal,{x:500,y:500},{},.1);");
  assert.ok(run('Math.hypot(animal.x-500,animal.y-500)/.1')<240,species);
 }
});
test('easy animals allow a closer approach but still notice the player',()=>{
 const easy=fixture('easy','sheep'),normal=fixture('normal','sheep');
 for(const run of [easy,normal])run("game.entities.chicken.x=350;");
 assert.equal(easy('RescueSystem.observeThreat(game,animal,true)'),null);
 assert.equal(normal('RescueSystem.observeThreat(game,animal,true).kind'),'player');
 easy('game.entities.chicken.x=400;');
 assert.equal(easy('RescueSystem.observeThreat(game,animal,true).kind'),'player');
});
test('easy animals tire earlier and allow a longer rescue window',()=>{
 for(const [key,expected] of [['easy',4.5],['normal',0],['hard',0],['hardcore',0]]){
  const run=fixture(key,'sheep');
  run("animal.fatigue=1.59;RescueSystem.update(game,.02);");
  assert.equal(run('animal.restTime'),expected,key);
 }
});
test('normal and hard flee speeds retain their existing multipliers',()=>{
 for(const [key,multiplier] of [['normal',1.08],['hard',1.15],['hardcore',1.15]]){
  const run=fixture(key,'sheep');
  run('RescueSystem.flee(game,animal,{x:500,y:500},{},.1);');
  assert.ok(Math.abs(run('Math.hypot(animal.x-500,animal.y-500)/.1')-300*multiplier)<1e-8,key);
 }
});
