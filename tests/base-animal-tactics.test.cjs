const test=require('node:test');
const assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');

function arena(){
  const h=createGame(()=>.5);
  h.run(`resetGame(814237);OBSTACLES=[];
    const chicken=state.entities.chicken,wolf=state.entities.wolf,friend=state.entities.animals[0];
    const fox=state.entities.foxes[0],goose=state.entities.goose;
    Object.assign(WORLD.areas[0],{x:0,y:0,w:2800,h:1800});
    Object.assign(WORLD.layout.animalSpawns[0],{x:500,y:800});
    Object.assign(friend,{x:500,y:800,targetX:500,targetY:800,direction:'left',wanderTime:99});
    for(const a of state.entities.animals.slice(1))a.rescued=true;
    state.entities.chicks=[];state.entities.foxes=[];state.entities.goose=undefined;
    state.entities.folklore=[];state.folkloreThreats=[];
    Object.assign(chicken,{x:2400,y:1500,vx:0,vy:0});
    Object.assign(wolf,{x:2400,y:1400,huntUnlockTimer:10,pauseTimer:0});
    Object.assign(fox,{x:400,y:800,mode:'warning',scaredTime:0,grace:0});`);
  return h;
}

test('friends react to actual visible fox approaches, not hidden or retreating foxes',()=>{
  for(const mode of ['hidden','rest','flee','stalk','warning','dash']){
    const h=arena();
    h.run(`fox.mode='${mode}';state.entities.foxes=[fox];RescueSystem.update(state,.05)`);
    const dangerous=['stalk','warning','dash'].includes(mode);
    assert.equal(h.run('friend.temper'),dangerous?'fleeing':'idle',mode);
    if(dangerous){assert.equal(h.run('friend.dangerSource'),'fox');assert.match(h.run('friend.speech'),/raposa/i);}
  }
  const h=arena();h.run(`state.entities.foxes=[fox];OBSTACLES=[{x:447,y:700,w:10,h:200}];RescueSystem.update(state,.05)`);
  assert.equal(h.run('friend.fleeFrom||null'),null);
});

test('territorial attacks and visible spell or fire warnings frighten nearby friends',()=>{
  const goose=arena();
  goose.run(`Object.assign(goose,{x:410,y:800,mode:'warning'});state.entities.goose=goose;RescueSystem.update(state,.05)`);
  assert.equal(goose.run('friend.dangerSource'),'goose');
  const danger=arena();
  danger.run(`state.folkloreThreats=[{x:460,y:800,kind:'roots',species:'curupira',arm:.6,life:2,r:30,vx:0,vy:0}];RescueSystem.update(state,.05)`);
  assert.equal(danger.run('friend.dangerSource'),'hazard');
  assert.ok(danger.run('friend.x>500'));
  const quiet=arena();
  quiet.run(`state.folkloreThreats=[{x:460,y:800,kind:'roots',species:'curupira',arm:.6,life:0,r:30,vx:0,vy:0}];RescueSystem.update(state,.05)`);
  assert.equal(quiet.run('friend.fleeFrom||null'),null);
});

test('one-hop flock alarm uses direct sightings and cannot relay into a permanent panic',()=>{
  for(const reversed of [false,true]){
    const h=arena();
    h.run(`const buddy={...friend,id:'animal_1',x:630,targetX:630},third={...friend,id:'animal_2',x:770,targetX:770};
      state.entities.animals=[friend,buddy,third];
      WORLD.layout.animalSpawns=[{x:500,y:800,areaId:friend.areaId},{x:630,y:800,areaId:friend.areaId},{x:770,y:800,areaId:friend.areaId}];
      ${reversed?'state.entities.animals.reverse();WORLD.layout.animalSpawns.reverse();':''}
      state.entities.foxes=[fox];RescueSystem.update(state,.05);`);
    assert.equal(h.run('friend.dangerSource'),'fox');
    assert.equal(h.run('buddy.sharedAlarm'),true);
    assert.equal(h.run('buddy.fleeFrom.x'),400);
    assert.equal(h.run('third.fleeFrom||null'),null);
    h.run(`fox.mode='hidden';for(let i=0;i<30;i++)RescueSystem.update(state,.05)`);
    assert.equal(h.run('buddy.fleeTime'),0);
    assert.equal(h.run('third.fleeTime'),0);
  }
});

test('an escape considers a second visible danger instead of running into it',()=>{
  const h=arena();
  h.run(`state.entities.foxes=[fox];state.folkloreThreats=[{x:600,y:800,kind:'fire',species:'boitata',arm:0,life:3,r:24,vx:0,vy:0}];
    RescueSystem.update(state,.05);`);
  assert.ok(h.run('Math.abs(friend.y-800)>2'));
  assert.ok(h.run('friend.seenDangers.length>=2'));
  assert.ok(h.run('distance(friend,fox)>90'));
  assert.ok(h.run('distance(friend,state.folkloreThreats[0])>90'));
});

test('frightened friends stay within their home leash and recover after pursuit',()=>{
  const h=arena();
  h.run(`Object.assign(chicken,{x:400,y:800});let furthest=0;
    for(let i=0;i<180;i++){chicken.x=friend.x-100;chicken.y=friend.y;chicken.vx=200;RescueSystem.update(state,.05);
      furthest=Math.max(furthest,distance(friend,WORLD.layout.animalSpawns[0]));}`);
  assert.ok(h.run('furthest')<=360.01);
  assert.equal(h.run('friend.rescued'),false);
  h.run(`chicken.x=2400;chicken.vx=0;const away=distance(friend,WORLD.layout.animalSpawns[0]);
    for(let i=0;i<180;i++)RescueSystem.update(state,.05);`);
  assert.ok(h.run('distance(friend,WORLD.layout.animalSpawns[0])<away'));
});

test('a resting noticed friend accepts a patient visible player, but rear stealth creates no invitation',()=>{
  const h=arena();
  h.run(`Object.assign(chicken,{x:400,y:800});Object.assign(friend,{restTime:3.1,fleeTime:.9,fleeFrom:{x:400,y:800,kind:'player'}});
    const before=friend.x;for(let i=0;i<25;i++)RescueSystem.update(state,.05)`);
  assert.equal(h.run('friend.temper'),'calm');
  assert.ok(h.run('friend.x<before'));
  const quiet=arena();
  quiet.run(`Object.assign(chicken,{x:400,y:800,sneaking:true});friend.direction='right';
    for(let i=0;i<30;i++)RescueSystem.update(state,.05)`);
  assert.equal(quiet.run('friend.calmWindow||0'),0);
  assert.equal(quiet.run('friend.fleeFrom||null'),null);
  assert.equal(quiet.run('friend.x'),500);
});

test('tired friends can step out of immediate danger without losing their rescue rest window',()=>{
  const h=arena();
  h.run(`fox.x=450;state.entities.foxes=[fox];friend.restTime=2;RescueSystem.update(state,.05)`);
  assert.ok(h.run('friend.x>500'));
  assert.ok(h.run('friend.restTime>1.9'));
  assert.equal(h.run('friend.temper'),'tired');
});

test('safe home return navigates around a fence without teleporting or crossing it',()=>{
  const h=arena();
  h.run(`Object.assign(friend,{x:700,targetX:700});OBSTACLES=[{x:580,y:730,w:24,h:140,type:'fence'}];
    let largest=0,overlap=false;
    for(let i=0;i<240;i++){const before={x:friend.x,y:friend.y};RescueSystem.update(state,.05);largest=Math.max(largest,distance(friend,before));
      const b=getHitbox(friend),r=OBSTACLES[0];overlap ||= Math.hypot(b.x-clamp(b.x,r.x,r.x+r.w),b.y-clamp(b.y,r.y,r.y+r.h))<b.r-.01;}`);
  assert.equal(h.run('overlap'),false);
  assert.ok(h.run('largest')<5);
  assert.ok(h.run('distance(friend,WORLD.layout.animalSpawns[0])')<100);
});

test('a fleeing friend skirts a blocked escape instead of tunnelling or remaining at the fence',()=>{
  const h=arena();
  h.run(`state.entities.foxes=[fox];OBSTACLES=[{x:545,y:750,w:20,h:100,type:'fence'}];
    let largest=0,overlap=false;
    for(let i=0;i<35;i++){const before={x:friend.x,y:friend.y};RescueSystem.update(state,.05);largest=Math.max(largest,distance(friend,before));
      const b=getHitbox(friend),r=OBSTACLES[0];overlap ||= Math.hypot(b.x-clamp(b.x,r.x,r.x+r.w),b.y-clamp(b.y,r.y,r.y+r.h))<b.r-.01;}`);
  assert.equal(h.run('overlap'),false);
  assert.ok(h.run('largest')<20);
  assert.ok(h.run('friend.x>600||Math.abs(friend.y-800)>90'));
});

test('an older position outside its home area walks back inside without being teleported or frozen',()=>{
  const h=arena();
  h.run(`Object.assign(WORLD.areas[0],{x:450,y:650,w:300,h:300});Object.assign(friend,{x:470,targetX:470});
    RescueSystem.update(state,.05);const first=friend.x;for(let i=0;i<25;i++)RescueSystem.update(state,.05);`);
  assert.ok(h.run('first>470&&first<475'));
  assert.ok(h.run('friend.x>=482'));
});

test('a blocked escape never uses a home fallback occupied by the perceived predator',()=>{
  const h=arena();
  h.run(`Object.assign(friend,{x:700,fleeFrom:{x:500,y:800,kind:'wolf'},stuckTime:.4});
    let homeRoutes=0;Player.move=()=>{};RescueSystem.walk=()=>homeRoutes++;
    RescueSystem.flee(state,friend,WORLD.layout.animalSpawns[0],WORLD.areas[0],.05);`);
  assert.equal(h.run('homeRoutes'),0);
});

test('new animal danger memory remains compatible with ordinary saves and the twelve-friend objective',()=>{
  const h=arena();
  h.run(`state.entities.foxes=[fox];RescueSystem.update(state,.05);GameManager.save(state)`);
  const saved=JSON.parse(h.storage.get('galinha-guardia-save-v1'));
  assert.equal(saved.animals[0].fleeFrom.kind,'wolf');
  assert.equal(saved.animals[0].dangerSource,undefined);
  assert.equal(h.run('WORLD.targetRescues'),12);
});
