const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');
const plain = value => JSON.parse(JSON.stringify(value));
function setup() {
  const h = createGame(() => .5);
  h.run(`OBSTACLES=[]; var g=state.entities.goose,c=state.entities.chicken,w=state.entities.wolf;
    Object.assign(g,{x:1000,y:800,home:{x:1000,y:800},anchor:{x:1000,y:800},target:{x:1000,y:800},
      mode:'patrol',grace:0,cooldown:0,timer:1,attempts:0});
    Object.assign(c,{x:1110,y:800,hidden:false,invulnerable:0});
    Object.assign(w,{x:1500,y:1100,huntUnlockTimer:0,pauseTimer:0});`);
  return h;
}
function until(h, condition, limit = 600) {
  for (let i=0; i<limit; i++) {
    if (h.run(condition)) return;
    h.run('GooseSystem.update(state,.05);LakeChallenge.update(state,.05)');
  }
  assert.fail(`Timed out waiting for ${condition}: ${h.run('g.mode')}`);
}
function dodge(h) {
  h.run('c.x=g.home.x+100;c.y=g.home.y;c.hidden=false;c.invulnerable=0');
  until(h, "g.mode==='warning'");
  h.run('c.x=g.x;c.y=g.y+100');
  until(h, "g.mode==='charge'");
  until(h, "g.mode==='stunned'||g.mode==='defeated'");
}
function complete(h) {
  assert.equal(h.run('LakeChallenge.start(state)'), true);
  dodge(h); dodge(h); dodge(h);
}

test('the lake is opt-in, cannot start from afar or a menu, and never locks mandatory friends',()=>{
  const h=setup();
  assert.equal(h.run('state.lake.active'),false);
  assert.equal(h.run('LakeChallenge.available(state)'),true);
  for (const code of ["state.phase='menu'", "state.phase='playing';c.x=20", "c.x=1110;c.hidden=true"]) {
    h.run(code); assert.equal(h.run('LakeChallenge.start(state)'),false);
  }
  assert.equal(h.run('state.entities.animals.length'),10);assert.equal(h.run('state.entities.chicks.length'),6);
});

test('walls block opting into an unseen goose encounter',()=>{
  const h=setup();h.run('OBSTACLES=[{x:1040,y:700,w:10,h:250}]');
  assert.equal(h.run('LakeChallenge.start(state)'),false);
});

test('three genuine dodges win, while the third warning-cycle feint does not count',()=>{
  const h=setup();assert.equal(h.run('LakeChallenge.start(state)'),true);
  dodge(h);assert.equal(h.run('state.lake.misses'),1);
  dodge(h);assert.equal(h.run('state.lake.misses'),2);
  h.run('c.x=1100;c.y=800');until(h,"g.mode==='feint'");
  assert.equal(h.run('state.lake.misses'),2);assert.equal(h.run('SkinSystem.unlocked("goose")'),false);
  dodge(h);
  assert.equal(h.run('state.lake.completed'),true);assert.equal(h.run('state.lake.active'),false);
  assert.equal(h.run('state.lake.misses'),3);assert.equal(h.run('g.mode'),'defeated');
  assert.equal(h.run('SkinSystem.unlocked("goose")'),true);
  assert.equal(h.run('state.lives'),3);assert.equal(h.run('state.score'),0);
});

test('the idle goose notices before warning, and never follows hidden coordinates',()=>{
  const h=setup();h.run('GooseSystem.update(state,.05)');assert.equal(h.run('g.mode'),'notice');
  const p=plain(h.run('g.noticedPoint'));
  h.run('c.hidden=true;c.x=1020;c.y=850;GooseSystem.update(state,.05)');
  assert.equal(h.run('g.mode'),'recover');assert.deepEqual(plain(h.run('g.noticedPoint')),p);
});

test('ordinary territorial dashes do not award the optional challenge',()=>{
  const h=setup();dodge(h);
  assert.equal(h.run('state.lake.misses'),0);assert.equal(h.run('SkinSystem.unlocked("goose")'),false);
});

test('hits are not dodges and still cost no health, score or stamina',()=>{
  const h=setup();h.run('state.score=200;c.stamina=.7;LakeChallenge.start(state)');
  until(h,"g.mode==='charge'");until(h,"g.mode==='recover'");
  assert.equal(h.run('g.chargeHit'),true);assert.equal(h.run('state.lake.misses'),0);
  assert.equal(h.run('state.lives'),3);assert.equal(h.run('state.score'),200);assert.equal(h.run('c.stamina'),.7);
});

test('hidden, zero-length, uncommitted, already-counted and landed attacks do not score',()=>{
  const h=setup();h.run('LakeChallenge.start(state)');
  for(const change of ["g.mode='warning'", "g.mode='charge';g.x=g.anchor.x", "g.x=g.anchor.x+60;c.hidden=true", "c.hidden=false;g.chargeHit=true", "g.chargeHit=false;g.chargeCounted=true"]) {
    h.run(change);assert.equal(h.run('LakeChallenge.recordMiss(state,g)'),false);
  }
  assert.equal(h.run('state.lake.misses'),0);
});

test('a completed attempt is counted once even if a callback is repeated',()=>{
  const h=setup();h.run('LakeChallenge.start(state)');dodge(h);
  for(let i=0;i<20;i++)assert.equal(h.run('LakeChallenge.recordMiss(state,g)'),false);
  assert.equal(h.run('state.lake.misses'),1);
});

test('completed rewards cannot be farmed or relocked by a repeated interaction',()=>{
  const h=setup();complete(h);
  const score=h.run('state.score'),profile=h.storage.get('galinha-guardia-wardrobe-v1');
  assert.equal(h.run('LakeChallenge.start(state)'),false);assert.equal(h.run('LakeChallenge.cancel(state)'),false);
  assert.equal(h.run('SkinSystem.unlockLake(state)'),false);
  assert.equal(h.storage.get('galinha-guardia-wardrobe-v1'),profile);assert.equal(h.run('state.score'),score);
});

test('the wolf is outside the arena, frozen, and unable to hurt the player during the challenge',()=>{
  const h=setup();h.run("w.x=1005;w.y=810;w.mode='chase';LakeChallenge.start(state)");
  assert.ok(h.run('distance(w,g.home)')>LakeRadius());
  const before=h.run('JSON.stringify(w)');h.run('for(let i=0;i<20;i++)WolfAI.update(state,.05)');
  assert.equal(h.run('JSON.stringify(w)'),before);
  h.run('w.x=c.x;w.y=c.y;c.invulnerable=0');assert.equal(h.run('Player.checkCatch(state)'),false);
});
function LakeRadius(){return 310;}

test('leaving the arena cancels progress and returns the wolf after a reaction grace period',()=>{
  const h=setup();h.run('LakeChallenge.start(state)');dodge(h);
  h.run('c.x=g.home.x+400;LakeChallenge.update(state,.05)');
  assert.equal(h.run('state.lake.active'),false);assert.equal(h.run('state.lake.misses'),0);
  assert.equal(h.run('w.huntUnlockTimer'),2);assert.equal(h.run('SkinSystem.unlocked("goose")'),false);
  h.run('for(let i=0;i<50;i++)WolfAI.update(state,.05)');assert.equal(h.run('w.huntUnlockTimer'),0);
});

test('F and the visible button start or cancel, and held keys do not restart repeatedly',()=>{
  const h=setup();h.events.window.keydown({key:'f',repeat:false,target:{tagName:'CANVAS'}});
  assert.equal(h.run('state.lake.active'),true);
  h.events.window.keydown({key:'f',repeat:true,target:{tagName:'CANVAS'}});assert.equal(h.run('state.lake.active'),true);
  h.events.elements.lakeChallengeBtn.click();assert.equal(h.run('state.lake.active'),false);
  h.events.elements.lakeChallengeBtn.click();assert.equal(h.run('state.lake.active'),true);
});

test('pause freezes the attempt and continuing preserves the dodge counter',()=>{
  const h=setup();h.run('LakeChallenge.start(state)');dodge(h);h.run('GameUI.showMenu(state)');
  const before=h.run('JSON.stringify(state.lake)');h.run('updateGame(.05);LakeChallenge.update(state,.05)');
  assert.equal(h.run('JSON.stringify(state.lake)'),before);
  h.events.elements.continueBtn.click();assert.equal(h.run('state.lake.active'),true);assert.equal(h.run('state.lake.misses'),1);
});

test('an interrupted saved attempt restarts safely without losing the adventure',()=>{
  const h=createGame(()=>.5);h.run(`GameManager.rescue(state,state.entities.animals[0]);state.lake.active=true;state.lake.misses=2;
    GameManager.save(state);var saved=GameManager.read();GameManager.restore(state,saved)`);
  assert.equal(h.run('state.lake.active'),false);assert.equal(h.run('state.lake.misses'),0);
  assert.equal(h.run('state.rescuedCount'),1);assert.equal(h.run('state.score'),100);
  assert.equal(h.run('state.lake.interrupted'),true);assert.ok(h.run('state.entities.goose.grace')>0);
});

test('completed bridge and wardrobe survive save, restore, and a new browser context',()=>{
  const h=createGame(()=>.5);h.run(`GameManager.rescue(state,state.entities.animals[0]);state.lake.completed=true;state.lake.misses=3;
    SkinSystem.unlockLake(state);SkinSystem.equip(state,'goose');GameManager.save(state)`);
  const loaded=createGame(()=>.5,{storage:new Map(h.storage),fullStartup:true});
  assert.equal(loaded.run('state.lake.completed'),true);assert.equal(loaded.run('state.entities.goose.mode'),'defeated');
  assert.equal(loaded.run('state.rescuedCount'),1);assert.equal(loaded.run('state.entities.chicken.skin'),'goose');
  assert.equal(loaded.run('OBSTACLES.filter(o=>o.type==="pond").length'),2);
});

test('restarting even the same seed resets the bridge but keeps the earned cosmetic',()=>{
  const h=createGame(()=>.5);h.run(`state.lake.completed=true;state.lake.misses=3;SkinSystem.unlockLake(state);buildObstacles(state);resetGame(state.worldSeed)`);
  assert.equal(h.run('state.lake.completed'),false);assert.equal(h.run('SkinSystem.unlocked("goose")'),true);
  assert.equal(h.run('OBSTACLES.filter(o=>o.type==="pond").length'),1);
});

test('legacy or malformed lake data never destroys a valid main-game save',()=>{
  const h=createGame(()=>.5);h.run('GameManager.rescue(state,state.entities.animals[0]);GameManager.save(state);var saved=GameManager.read()');
  for(const bad of [undefined,null,'won',{}, {version:1,completed:true,misses:999}, {version:1,completed:'true',misses:3}, {version:2,completed:true,misses:3}]){
    h.context.bad=bad;h.run('saved.lake=bad;GameManager.restore(state,saved)');
    assert.equal(h.run('state.lake.completed'),false);assert.equal(h.run('state.rescuedCount'),1);
  }
});

test('a victory save restores its cosmetic even if the wardrobe record was unavailable',()=>{
  const h=createGame(()=>.5);h.run('state.lake.completed=true;state.lake.misses=3;GameManager.save(state)');
  h.storage.delete('galinha-guardia-wardrobe-v1');
  const loaded=createGame(()=>.5,{storage:new Map(h.storage),fullStartup:true});
  assert.equal(loaded.run('SkinSystem.unlocked("goose")'),true);
});

test('rescuing every friend and chick does not grant the challenge-exclusive goose skin',()=>{
  const h=createGame(()=>.5);h.run('for(const a of RescueSystem.all(state))GameManager.rescue(state,Object.assign(a,{discovered:true}))');
  assert.equal(h.run('SkinSystem.unlocked("priest")'),true);assert.equal(h.run('SkinSystem.unlocked("goose")'),false);
  h.run('GameManager.win(state)');assert.equal(h.run('state.phase'),'win_cutscene');
});

test('the earned skin uses goose frames but never changes speed, hitbox or rescue counters',()=>{
  const h=setup();h.run('var hb=JSON.stringify(c.hitbox),speed=c.speed;SkinSystem.unlockLake(state);SkinSystem.equip(state,"goose");GameUI.update(state)');
  assert.equal(h.run('CharacterArt.frameFor("chicken",{skin:c.skin}).spriteName'),'goose');
  assert.equal(h.run('JSON.stringify(c.hitbox)===hb'),true);assert.equal(h.run('c.speed===speed'),true);assert.equal(h.run('state.rescuedCount'),0);
  assert.match(h.elements.get('skin-goose').textContent,/usando/);assert.equal(h.elements.get('menu-skin-goose').disabled,false);
});

test('opening the real bridge changes collisions and allows walking across all tested farm layouts',()=>{
  const h=createGame(()=>.5);
  for(const version of [1,2]) for(let seed=0;seed<100;seed++){
    h.run(`resetGame(${seed},${version});var b=LakeChallenge.bridge();var c=state.entities.chicken;
      Object.assign(c,{x:b.x+b.w/2,y:b.y});Player.move(c,0,b.h);`);
    assert.ok(h.run('c.y < b.y+b.h-40'),`closed ${seed}/${version}`);
    h.run(`state.lake.completed=true;state.lake.misses=3;buildObstacles(state);c.x=b.x+b.w/2;c.y=b.y;Player.move(c,0,b.h);`);
    assert.ok(h.run('Math.abs(c.y-b.y-b.h)<.01'),`open ${seed}/${version}`);
  }
});

test('the wolf navigation cache sees the new crossing instead of reusing the old pond detour',()=>{
  const h=createGame(()=>.5);h.run(`var b=LakeChallenge.bridge();var w=state.entities.wolf;w.x=b.x+b.w/2;w.y=b.y;
    var end={x:w.x,y:b.y+b.h};var closed=WolfAI.findPath(w,end);
    state.lake.completed=true;state.lake.misses=3;buildObstacles(state);var open=WolfAI.findPath(w,end);`);
  assert.ok(h.run('closed.length')>1);assert.equal(h.run('open.length'),1);
});

test('the challenge panel reports actual progress and never offers to fight a defeated goose',()=>{
  const h=setup();h.run('LakeChallenge.start(state);LakeChallenge.updateUI(state)');
  assert.match(h.elements.get('lakeHelp').textContent,/0\/3/);assert.match(h.elements.get('lakeChallengeBtn').textContent,/Sair/);
  dodge(h);h.run('LakeChallenge.updateUI(state)');assert.match(h.elements.get('lakeHelp').textContent,/1\/3/);
  dodge(h);dodge(h);h.run('LakeChallenge.updateUI(state)');
  assert.equal(h.elements.get('lakeChallengeBtn').hidden,true);assert.match(h.elements.get('lakeHelp').textContent,/Atalho aberto/);
});
