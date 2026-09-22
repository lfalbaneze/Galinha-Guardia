const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');

test('the fenced refuge recognizes the player as safe only after crossing the gate',()=>{
  const h=createGame(()=>.5);
  assert.equal(h.run('FarmRefuge.contains({x:220,y:360})'),true);
  assert.equal(h.run('FarmRefuge.contains({x:351,y:385})'),false);
  assert.equal(h.run('FarmRefuge.contains({x:349,y:385})'),true);
});

test('the wolf cannot take a life from a player inside the refuge',()=>{
  const h=createGame(()=>.5);
  h.run(`const c=state.entities.chicken,w=state.entities.wolf;
    Object.assign(c,{x:220,y:360,hidden:false,invulnerable:0});
    Object.assign(w,{x:220,y:360,mode:'chase',pauseTimer:0,huntUnlockTimer:0});
    var livesBefore=state.lives;var caught=Player.checkCatch(state);`);
  assert.equal(h.run('caught'),false);
  assert.equal(h.run('state.lives'),h.run('livesBefore'));
});

test('crossing into the refuge breaks pursuit and clears player-specific wolf memory',()=>{
  const h=createGame(()=>.5);
  h.run(`const c=state.entities.chicken,w=state.entities.wolf;
    Object.assign(c,{x:220,y:360,hidden:false,invulnerable:0,sprinting:true});
    Object.assign(w,{x:390,y:385,mode:'chase',pauseTimer:0,huntUnlockTimer:0,awareness:1,detected:true,
      lastKnown:{x:220,y:360},heardPoint:{x:220,y:360},searchPoints:[{x:220,y:360}],searchIndex:0,
      searchOrigin:{x:220,y:360},searchTime:5,investigateTime:2,scanTime:1});
    WolfAI.update(state,.05);`);
  assert.equal(h.run('w.mode'),'patrol');
  assert.equal(h.run('w.detected'),false);
  assert.equal(h.run('w.awareness'),0);
  assert.equal(h.run('w.lastKnown'),null);
  assert.equal(h.run('w.heardPoint'),null);
  assert.equal(h.run('w.searchPoints.length'),0);
});

test('wolf navigation treats the whole refuge as a no-go rectangle',()=>{
  const h=createGame(()=>.5);
  h.run(`const w=state.entities.wolf;Object.assign(w,{x:430,y:385});
    var route=WolfAI.findPath(w,{x:220,y:360});var end=route.at(-1);`);
  assert.ok(h.run('route.length')>0);
  assert.equal(h.run('FarmRefuge.contains(end)'),false);
});

test('sounds originating or reported inside the refuge do not lure the wolf to the gate',()=>{
  const h=createGame(()=>.5);
  h.run(`const w=state.entities.wolf;Object.assign(w,{x:430,y:385,mode:'patrol',pauseTimer:0,huntUnlockTimer:0});
    var heard=WolfAI.investigateSound(state,{x:220,y:360},300,{x:220,y:360});`);
  assert.equal(h.run('heard'),false);
  assert.equal(h.run('w.mode'),'patrol');
});
