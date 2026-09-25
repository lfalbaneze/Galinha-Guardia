const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// The real gameplay modules run with deterministic collaborators. This fixture
// deliberately excludes map generation, sprites and audio/network loading.
function fixture() {
  const chicken = { type:'chicken',x:400,y:800,vx:0,vy:0,speed:300,skin:'classic',hidden:false,
    sneaking:false,sprinting:false,invulnerable:0,hitbox:{ox:0,oy:8,r:16} };
  const friend = { id:'animal_0',type:'animal',species:'sheep',x:500,y:800,vx:0,vy:0,anim:0,
    targetX:500,targetY:800,direction:'left',hitbox:{ox:0,oy:6,r:13},fatigue:0,
    fleeTime:0,restTime:0,wanderTime:99,speechTime:0,rescued:false };
  const wolf = { type:'wolf',x:2400,y:1400,vx:0,vy:0,mode:'patrol',huntUnlockTimer:10,pauseTimer:0,
    hitbox:{ox:-2,oy:7,r:21} };
  const state = {phase:'playing',difficultyKey:'normal',entities:{chicken,wolf,animals:[friend],chicks:[],
    goose:{home:{x:1550,y:750}}},rescuedCount:0,rescuedChicks:0,rescuedChickIds:new Set(),
    lives:3,score:100,animalSpeechCooldown:0,secretSoundCooldown:10};
  const calls = {save:0,wolfReset:0,status:[],audio:0};
  const context = vm.createContext({state,chicken,friend,wolf,calls,console,
    WORLD:{width:2800,height:1800,targetRescues:12,areas:[{id:'poleiro',x:0,y:0,w:2800,h:1800}],
      layout:{seed:52,animalSpawns:[{x:500,y:800,areaId:'poleiro'}],chickSpawns:[]}},
    STRUCTURES:{pond:{x:1420,y:780,w:240,h:160}},OBSTACLES:[],lineOfSight:true,
    distance:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp:(n,a,b)=>Math.min(b,Math.max(a,n)),
    rand:(a,b)=>(a+b)/2,input:new Set(),SCORE_PENALTY_LOSS:40,
    getHitbox:e=>({x:e.x+e.hitbox.ox,y:e.y+e.hitbox.oy,r:e.hitbox.r}),
    circleVsCircle:(a,b)=>Math.hypot(a.x+a.hitbox.ox-b.x-b.hitbox.ox,a.y+a.hitbox.oy-b.y-b.hitbox.oy)<=a.hitbox.r+b.hitbox.r,
    resolveEnvironment:()=>true,spawnBurst(){},refreshHud(){},finishLose(){},buildObstacles(){},
    setStatus:text=>calls.status.push(text),document:{getElementById:()=>null},
    FarmRefuge:{bounds:{x:90,y:174,w:260,h:308},home:()=>({x:200,y:200}),contains:p=>p.x>=90&&p.x<=350&&p.y>=174&&p.y<=482},
    HidingSpots:{candidate:()=>null},CharacterArt:{advance:(n)=>n},
    SkinSystem:{power:()=>({friendSpecies:null}),unlockLake(){}},
    ThorSystem:{active:()=>false},SwimmingSystem:{profile:()=>({swimming:false})},
    SunflowerSystem:{concealed:()=>false,canCatch:()=>true},
    WolfAI:{initialize:()=>{calls.wolfReset++;Object.assign(wolf,{mode:'patrol',lastKnown:null,exposedCover:null,route:[],routeTarget:null,routeTimer:0,moveSpeed:0,awareness:0,detected:false,heardPoint:null});},
      getConfig:()=>({patrolSpeed:120}),moveTo:(body,target,speed,dt)=>{
        const dx=target.x-body.x,dy=target.y-body.y,len=Math.hypot(dx,dy);
        if(len<1)return true;
        const step=Math.min(len,speed*dt);body.vx=dx/len*speed;body.vy=dy/len*speed;
        body.x+=dx/len*step;body.y+=dy/len*step;body.moving=true;return step>=len;
      },isExposed:()=>false,canCatchHidden:()=>false},
    GooseSystem:{rescue(){}},AudioSystem:{play(){},playPlayerHurt(){},playAnimal(){calls.audio++;}},
    GameUI:{update(){}},GameManager:{save(){calls.save++;},win(){},
      rescue(game,a){if(a.rescued)return false;a.rescued=true;game.rescuedCount++;return true;}},
  });
  context.DetectionSystem={hasLineOfSight:()=>context.lineOfSight};
  for(const name of ['player','lake-challenge','rescue-system'])
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../systems',name+'.js'),'utf8'),context);
  const run=code=>vm.runInContext(code,context);
  run('LakeChallenge.initialize(state)');
  return {run,context,state,chicken,friend,wolf,calls};
}

test('stealth never attracts an unaware animal or turns its head toward the hidden approach',()=>{
  const h=fixture();h.run("chicken.sneaking=true;friend.direction='right';RescueSystem.update(state,.1)");
  assert.equal(h.friend.x,500);assert.equal(h.friend.direction,'right');
  assert.equal(h.friend.temper,'idle');assert.equal(h.friend.fleeFrom,undefined);
  assert.equal(h.friend.speechTime,0);assert.equal(h.state.rescuedCount,0);
});

test('turning toward a nearby stealth player starts a real escape and startled speech',()=>{
  const h=fixture();h.run("chicken.x=430;chicken.sneaking=true;friend.direction='right';RescueSystem.update(state,.1)");
  assert.equal(h.friend.temper,'idle');
  h.run("friend.direction='left';RescueSystem.update(state,.1)");
  assert.equal(h.friend.temper,'fleeing');assert.equal(h.friend.fleeFrom.kind,'player');
  assert.ok(h.friend.x>500);assert.ok(h.run('RescueSystem.stealthLines.includes(friend.speech)'));
  assert.doesNotMatch(h.friend.speech,/acompan|guia|vou com/i);
});

test('stealth detection is shorter, directional, and still blocked by line of sight',()=>{
  const h=fixture();assert.equal(h.run('RescueSystem.observeThreat(state,friend,true).kind'),'player');
  h.chicken.sneaking=true;assert.equal(h.run('RescueSystem.observeThreat(state,friend,true)'),null);
  h.chicken.x=430;assert.equal(h.run('RescueSystem.observeThreat(state,friend,true).kind'),'player');
  h.context.lineOfSight=false;assert.equal(h.run('RescueSystem.observeThreat(state,friend,true)'),null);
  h.context.lineOfSight=true;h.friend.direction='right';
  assert.equal(h.run('RescueSystem.observeThreat(state,friend,true)'),null);
});

test('enabling stealth does not erase the last observed threat or rescue automatically',()=>{
  const h=fixture();h.run('RescueSystem.update(state,.05)');const before=h.friend.x;
  h.run('chicken.sneaking=true;RescueSystem.update(state,.05)');
  assert.equal(h.friend.temper,'fleeing');assert.equal(h.friend.fleeFrom.x,400);
  assert.ok(h.friend.x>before);assert.equal(h.state.rescuedCount,0);
});

test('old following dialogue is cleared and an unnoticed animal stays silent',()=>{
  const h=fixture();h.run("chicken.sneaking=true;friend.speech='Tá, você guia!';friend.speechTime=2;RescueSystem.update(state,.05);RescueSystem.talk(state,friend)");
  assert.equal(h.friend.speechTime,0);
});

test('matching-appearance friendship remains separate from stealth',()=>{
  const h=fixture();h.context.SkinSystem.power=()=>({friendSpecies:'sheep'});
  h.run('RescueSystem.update(state,.1)');assert.equal(h.friend.temper,'calm');assert.ok(h.friend.x<500);
  h.run("chicken.sneaking=true;chicken.x=friend.x-70;friend.direction='left';RescueSystem.update(state,.1)");
  assert.equal(h.friend.temper,'fleeing');assert.equal(h.friend.fleeFrom.kind,'player');
});

test('a visible wolf still takes priority over stealth and produces a wolf alarm',()=>{
  const h=fixture();h.run('chicken.sneaking=true;wolf.x=550;wolf.y=800;wolf.huntUnlockTimer=0;RescueSystem.update(state,.1)');
  assert.equal(h.friend.fleeFrom.kind,'wolf');assert.match(h.friend.speech,/lobo/i);
});

test('contact rescue still works from behind, without attracting the animal first',()=>{
  const h=fixture();h.run("chicken.sneaking=true;chicken.x=473;friend.direction='right';RescueSystem.update(state,.05);RescueSystem.update(state,.05)");
  assert.equal(h.friend.rescued,true);assert.equal(h.state.rescuedCount,1);
});

function completed(h) {h.run('state.lake.completed=true;state.lake.misses=3;chicken.x=1500;chicken.y=820;wolf.huntUnlockTimer=0');}

test('only an active Panto challenge protects against the wolf',()=>{
  const h=fixture();h.run('chicken.x=1500;chicken.y=820');
  assert.equal(h.run('LakeChallenge.blocksWolf(state)'),false);
  h.state.lake.active=true;assert.equal(h.run('LakeChallenge.blocksWolf(state)'),true);
  h.state.lake.active=false;completed(h);
  assert.equal(h.run('LakeChallenge.blocksWolf(state)'),false);
  assert.equal(h.run('LakeChallenge.inSanctuary(state)'),false);
  h.state.lake.active=true;
  assert.equal(h.run('LakeChallenge.blocksWolf(state)'),false,'a stale active flag cannot revive completed-lake protection');
});

test('winning the lake does not leave a safe zone, including with a relocated or missing Panto',()=>{
  const h=fixture();completed(h);h.state.entities.goose.home={x:100,y:100};
  assert.equal(h.run('LakeChallenge.blocksWolf(state)'),false);
  h.state.entities.goose=null;assert.equal(h.run('LakeChallenge.blocksWolf(state)'),false);
});

test('the wolf can catch on the bank and inside all former sanctuary boundaries after victory',()=>{
  for(const [x,y] of [[1500,820],[1351,820],[1729,820],[1500,712],[1500,993]]){
    const h=fixture();completed(h);h.chicken.x=x;h.chicken.y=y;h.wolf.x=x;h.wolf.y=y;
    assert.equal(h.run('LakeChallenge.blocksWolf(state)'),false);
    assert.equal(h.run('Player.checkCatch(state)'),true,`${x},${y}`);
    assert.equal(h.state.lives,2);
  }
});

test('the curral still protects the chicken independently of the removed lake rule',()=>{
  const h=fixture();completed(h);h.chicken.x=230;h.chicken.y=370;h.wolf.x=230;h.wolf.y=370;
  assert.equal(h.run('LakeChallenge.blocksWolf(state)'),false);
  assert.equal(h.run('Player.checkCatch(state)'),false);assert.equal(h.state.lives,3);
});

test('completed lake guard does not teleport, stop, reset or patrol the wolf',()=>{
  const h=fixture();completed(h);h.wolf.x=1500;h.wolf.y=820;h.wolf.vx=35;h.wolf.vy=20;
  h.wolf.mode='chase';const before=JSON.stringify(h.wolf);
  for(let i=0;i<120;i++)assert.equal(h.run('LakeChallenge.guardWolf(state,.05)'),false);
  assert.equal(JSON.stringify(h.wolf),before);assert.equal(h.calls.wolfReset,0);assert.equal(h.chicken.invulnerable,0);
});

test('legacy completed saves keep Panto and bridge progress but never restore lake immunity',()=>{
  const h=fixture();h.run('chicken.x=1500;chicken.y=820;LakeChallenge.restore(state,{version:1,completed:true,misses:3})');
  assert.equal(h.run('state.lake.completed && state.lake.gooseRescued'),true);
  assert.equal(h.run('LakeChallenge.blocksWolf(state)'),false);
  h.run('LakeChallenge.restore(state,{version:1,active:true,completed:false,misses:2})');
  assert.equal(h.run('LakeChallenge.blocksWolf(state)'),false);
  h.run('LakeChallenge.initialize(state)');assert.equal(h.run('LakeChallenge.blocksWolf(state)'),false);
});

test('the real game loop updates the wolf normally at a completed lake',()=>{
  const h=fixture(),code=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8');
  const fn=code.match(/function updateWolf\(dt\) \{[\s\S]*?\n\}/)[0];
  let updates=0,dialogue=0;h.context.WolfAI.update=()=>updates++;h.context.WolfDialogue={update(){dialogue++;}};
  vm.runInContext(fn,h.context);completed(h);h.run('updateWolf(.05)');
  assert.equal(updates,1);assert.equal(dialogue,1);
  h.chicken.x=1000;h.run('updateWolf(.05)');assert.equal(updates,2);
  h.state.lake.completed=false;h.state.lake.active=true;h.run('updateWolf(.05)');assert.equal(updates,2);
});

test('the live Panto challenge still parks the wolf outside the arena, only once',()=>{
  const h=fixture();h.run('state.lake.active=true;chicken.x=1500;chicken.y=820;wolf.vx=80;wolf.vy=40');
  const pos=[h.wolf.x,h.wolf.y];
  assert.equal(h.run('LakeChallenge.guardWolf(state,.2)'),true);
  assert.deepEqual([h.wolf.x,h.wolf.y],pos);assert.equal(h.wolf.vx,0);assert.equal(h.wolf.vy,0);
  for(let i=0;i<10;i++)h.run('LakeChallenge.guardWolf(state,.05)');
  assert.equal(h.calls.wolfReset,1);
  h.state.lake.active=false;assert.equal(h.run('LakeChallenge.guardWolf(state,.05)'),false);
});

test('completed lake HUD expires and no longer advertises permanent protection',()=>{
  const h=fixture(),nodes=new Map();completed(h);h.state.lake.notice=0;
  h.context.document.getElementById=id=>{
    if(!nodes.has(id))nodes.set(id,{hidden:false,textContent:'',dataset:{},setAttribute(){}});
    return nodes.get(id);
  };
  h.run('LakeChallenge.updateUI(state)');
  assert.equal(nodes.get('lakeCounter').hidden,true);
  assert.equal(nodes.get('lakePanel').hidden,true);
  assert.equal(nodes.get('lakeCounterTitle').textContent,'PANTO RESGATADO!');
  const source=fs.readFileSync(path.join(__dirname,'../systems/lake-challenge.js'),'utf8');
  assert.doesNotMatch(source,/LAGOA SEGURA|Lagoa segura!|drawSanctuary|shorelinePatrol/);
  h.state.lake.notice=3;h.run('LakeChallenge.updateUI(state)');assert.equal(nodes.get('lakeCounter').hidden,false);
  h.state.lake.notice=0;h.run('LakeChallenge.updateUI(state)');assert.equal(nodes.get('lakeCounter').hidden,true);
});
