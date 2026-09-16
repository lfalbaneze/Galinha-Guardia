const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

function arena() {
  const h = createGame(() => .5);
  h.run(`resetGame(814237); OBSTACLES=[];
    const chicken=state.entities.chicken, friend=state.entities.animals[0];
    Object.assign(WORLD.layout.animalSpawns[0], {x:500,y:390});
    Object.assign(friend,{x:500,y:390,targetX:500,targetY:390,direction:'left'});
    Object.assign(chicken,{x:400,y:390});`);
  return h;
}

test('friends flee a visible player and speech stays stable across frames', () => {
  const {run}=arena();
  run('RescueSystem.update(state,.05); const line=friend.speech;');
  assert.equal(run('friend.temper'),'fleeing');
  assert.ok(run('friend.x>500'));
  assert.equal(run('friend.discovered'),true);
  run('RescueSystem.update(state,.05);');
  assert.equal(run('friend.speech'),run('line'));
  assert.equal(run('state.rescuedCount'),0);
});

test('walls and hiding prevent alarm and undiscovered map clues', () => {
  const {run}=arena();
  run(`OBSTACLES=[{x:447,y:300,w:10,h:200,type:'wall'}]; RescueSystem.update(state,.05);`);
  assert.equal(run('friend.temper'),'idle');
  assert.equal(run('!!friend.discovered'),false);
  run(`OBSTACLES=[]; chicken.hidden=true; RescueSystem.update(state,.05);`);
  assert.equal(run('friend.temper'),'idle');
});

test('contact counts before flee movement and cannot be stolen by the next frame', () => {
  const {run}=arena();
  run('chicken.x=472; RescueSystem.update(state,1/60);');
  assert.equal(run('friend.rescued'),true);
  assert.equal(run('state.score'),100);
});

test('C approaches quietly, disables sprinting and permits a real moving rescue', () => {
  const {run}=arena();
  run(`input.add('c');input.add('d');input.add('shift');
    for(let i=0;i<60 && !friend.rescued;i++){Player.update(state,1/60);RescueSystem.update(state,1/60);}`);
  assert.equal(run('chicken.sprinting'),false);
  assert.equal(run('chicken.stamina'),1);
  assert.equal(run('friend.rescued'),true);
});

test('continuous pursuit exhausts friends and creates a capture window', () => {
  const {run}=arena();
  run(`for(let i=0;i<100 && !(friend.restTime>0);i++) {
    chicken.x=friend.x-90;chicken.y=friend.y;RescueSystem.update(state,.05);
  } const restX=friend.x, restY=friend.y;`);
  assert.equal(run('friend.temper'),'tired');
  assert.ok(run('friend.restTime>=3'));
  run('RescueSystem.update(state,.1);');
  assert.equal(run('friend.x'),run('restX'));
  assert.equal(run('friend.y'),run('restY'));
  run('chicken.x=friend.x;chicken.y=friend.y;RescueSystem.update(state,.05);');
  assert.equal(run('friend.rescued'),true);
});

test('discovery snapshots and fatigue survive reload without revealing unseen friends', () => {
  const {run,storage}=arena();
  run('RescueSystem.update(state,.05); GameManager.save(state);');
  const loaded=createGame(() => .5,{storage:new Map(storage),fullStartup:true});
  assert.equal(loaded.run('state.entities.animals[0].discovered'),true);
  assert.equal(loaded.run('state.entities.animals[0].fatigue'),run('friend.fatigue'));
  assert.equal(loaded.run('JSON.stringify(state.entities.animals[0].lastSeen)'),run('JSON.stringify(friend.lastSeen)'));
  assert.equal(loaded.run('!!state.entities.animals[9].discovered'),false);
});

test('legacy outfits remain earned but separate adventures cannot combine rescue counts', () => {
  const legacy = createGame(() => .5,{storage:new Map([
    ['galinha-guardia-wardrobe-v1',JSON.stringify({best:4,selected:'robocop'})]
  ])});
  assert.equal(legacy.run('SkinSystem.unlocked("robocop")'),true);
  assert.equal(legacy.run('state.entities.chicken.skin'),'robocop');
  assert.equal(legacy.run('SkinSystem.unlocked("priest")'),false);
  const {run}=createGame(() => .5);
  run(`for(const chick of state.entities.chicks) GameManager.rescue(state,Object.assign(chick,{discovered:true}));
    resetGame(543);for(const friend of state.entities.animals) GameManager.rescue(state,friend);`);
  assert.equal(run('SkinSystem.unlocked("punk")'),false);
});

test('fleeing cannot tunnel through a wall or cross its home district', () => {
  const {run}=arena();
  run(`OBSTACLES=[{x:545,y:150,w:8,h:500}];
    for(let i=0;i<70;i++) {chicken.x=friend.x-80;chicken.y=friend.y;RescueSystem.update(state,.05);}`);
  assert.ok(run('getHitbox(friend).x+getHitbox(friend).r<=545'));
  assert.ok(run('friend.y>=WORLD.areas[0].y && friend.y<=WORLD.areas[0].y+WORLD.areas[0].h'));
});
