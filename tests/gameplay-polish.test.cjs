const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

function arena() {
  const game = createGame(() => 0.5);
  game.run(`OBSTACLES = []; const chicken = state.entities.chicken;
    Object.assign(chicken, { x: 200, y: 1000 });`);
  return game;
}

test('sprinting opens a gap, exhausts its reserve, and needs a released Shift before rearming', () => {
  const { run } = arena();
  run(`input.add('d'); input.add('shift');
    for(let i=0;i<10;i++) Player.update(state,0.05);`);
  assert.ok(run('chicken.x - 200 > chicken.speed * 0.5 * 1.2'));
  assert.ok(run('chicken.stamina > 0 && chicken.stamina < 1'));
  run(`for(let i=0;i<70;i++) Player.update(state,0.05);`);
  assert.equal(run('chicken.exhausted'), true);
  assert.equal(run('chicken.sprinting'), false);
  run(`for(let i=0;i<30;i++) Player.update(state,0.05);`);
  assert.ok(run('chicken.stamina > 0.25'));
  assert.equal(run('chicken.sprinting'), false);
  run(`input.delete('shift'); Player.update(state,0.05); input.add('shift'); Player.update(state,0.05);`);
  assert.equal(run('chicken.sprinting'), true);
});

test('pushing into a wall neither walks in place nor drains stamina or emits sprint noise', () => {
  const { run } = arena();
  run(`OBSTACLES = [{x:216,y:850,w:4,h:300}]; input.add('d'); input.add('shift');
    for(let i=0;i<20;i++) Player.update(state,0.05);`);
  assert.equal(run('chicken.x'), 200);
  assert.equal(run('chicken.stamina'), 1);
  assert.equal(run('chicken.moving || chicken.sprinting'), false);
  assert.equal(run('chicken.state'), 'idle');
  assert.equal(run('DetectionSystem.perceive({x:180,y:1000,heading:Math.PI},chicken).heardPoint'), null);
});

test('fast movement and capture knockback cannot tunnel through a thin wall', () => {
  const { run } = arena();
  run(`OBSTACLES = [{x:230,y:850,w:3,h:300}]; input.add('d'); input.add('shift');
    Player.update(state,0.5);`);
  assert.equal(run('chicken.x'), 214);
  run(`OBSTACLES=[]; chicken.x=500; chicken.y=500;
    Object.assign(state.entities.wolf,{x:500,y:480,pauseTimer:0,huntUnlockTimer:0});
    Player.checkCatch(state);`);
  assert.equal(run('chicken.x'), 500, 'vertical contact should not add an unrelated sideways knockback');
  assert.ok(Math.abs(run('chicken.y') - 565) < 0.0001);
  assert.equal(run('state.lives'), 2);
});

test('four movement directions follow input and hiding restores energy without leaving cover', () => {
  const { run } = arena();
  for (const [key, direction] of [['w','up'],['s','down'],['a','left'],['d','right']]) {
    run(`input.clear(); input.add('${key}'); Player.update(state,0.05);`);
    assert.equal(run('chicken.direction'), direction);
  }
  run(`input.clear(); const cover = HidingSpots.getSpots().find(s=>s.type==='bush');
    chicken.x=cover.x+cover.w/2; chicken.y=cover.y+cover.h/2;
    chicken.stamina=0.1; chicken.staminaDelay=0; HidingSpots.toggle(state);
    for(let i=0;i<20;i++) Player.update(state,0.05);`);
  assert.equal(run('chicken.hidden'), true);
  assert.ok(run('chicken.stamina > 0.7'));
  assert.equal(run('chicken.moving || chicken.sprinting'), false);
});

test('rescue feedback names the friend once and saved friends stop walking in place', () => {
  const { run } = arena();
  run(`const friend=state.entities.animals[0]; chicken.x=friend.x; chicken.y=friend.y;
    RescueSystem.update(state,0); RescueSystem.update(state,0.05);`);
  assert.equal(run('state.rescuedCount'), 1);
  assert.equal(run('state.rescueNotice.name'), 'Ovelha');
  assert.equal(run('state.rescueNotice.count'), 1);
  assert.equal(run('friend.moving'), false);
  assert.equal(run('friend.direction'), 'down');
});

test('contact across an opaque divider does not rescue a friend', () => {
  const { run } = arena();
  run(`const friend=state.entities.animals[0];
    Object.assign(friend,{x:200,y:1000,targetX:200,targetY:1000});
    Object.assign(chicken,{x:200,y:965});
    OBSTACLES=[{x:100,y:990,w:200,h:1}]; RescueSystem.update(state,0);`);
  assert.equal(run('state.rescuedCount'), 0);
});

test('reload preserves stamina, suspicion and audio investigation without adding a visual target', () => {
  const { run } = arena();
  run(`Object.assign(chicken,{stamina:0.13,staminaDelay:0.4,exhausted:true,direction:'left'});
    Object.assign(state.entities.wolf,{mode:'investigate',awareness:0.35,
      heardPoint:{x:640,y:960},hearingCooldown:0.4,investigateTime:2,lastKnown:null});
    GameManager.save(state); const saved=GameManager.read(); resetGame(saved.worldSeed); GameManager.restore(state,saved);`);
  assert.equal(run('state.entities.chicken.stamina'), 0.13);
  assert.equal(run('state.entities.chicken.exhausted'), true);
  assert.equal(run('state.entities.chicken.direction'), 'left');
  assert.equal(run('state.entities.wolf.mode'), 'investigate');
  assert.equal(run('state.entities.wolf.awareness'), 0.35);
  assert.equal(run('state.entities.wolf.heardPoint.x'), 640);
  assert.equal(run('state.entities.wolf.lastKnown'), null);
  run(`saved.chicken.stamina='broken'; saved.wolf.awareness=999; saved.wolf.heardPoint={x:null,y:0};
    saved.wolf.investigateTime='bad'; GameManager.restore(state,saved);`);
  assert.equal(run('state.entities.chicken.stamina'), 1);
  assert.equal(run('state.entities.wolf.awareness'), 1);
  assert.equal(run('state.entities.wolf.heardPoint'), null);
  assert.equal(run('state.entities.wolf.investigateTime'), 0);
});
