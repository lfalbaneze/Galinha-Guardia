const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

function winChallenge(h) {
  h.run(`var g=state.entities.goose,c=state.entities.chicken;
    Object.assign(state.lake,{active:true,completed:false,misses:2,counterWindow:1});
    Object.assign(g,{mode:'stunned',chargeCounted:true});
    Object.assign(c,{x:g.x,y:g.y,hidden:false});
    LakeChallenge.interact(state);GameUI.update(state);`);
}

test('winning rescues Panto into his own clear place in the refuge and awards 100 points once', () => {
  const h=createGame();
  assert.equal(h.run('GooseSystem.rescue(state)'),false);
  winChallenge(h);
  assert.equal(h.run('state.entities.goose.rescued'),true);
  assert.equal(h.run('state.score'),100);
  assert.equal(h.run('state.rescuedCount'),0);
  assert.equal(h.run('distance(g,FarmRefuge.gooseHome())'),0);
  assert.ok(h.run('WildlifeRules.clear(g,g,g.hitbox)'));
  assert.ok(h.run('Array.from({length:12},(_,i)=>FarmRefuge.home(i)).every(p=>distance(p,g)>36)'));
  assert.equal(h.elements.get('pantoRescue').hidden,false);
  h.run('GooseSystem.rescue(state);LakeChallenge.interact(state);GooseSystem.update(state,.05);');
  assert.equal(h.run('state.score'),100);
  assert.equal(h.run('distance(g,FarmRefuge.gooseHome())'),0);
  assert.equal(h.run('LakeChallenge.available(state)'),false);
});

test('rescued Panto and his points survive repeated reloads, including a saved finale', () => {
  let h=createGame();
  winChallenge(h);
  for(let i=0;i<2;i++) {
    h=createGame(()=>.5,{storage:new Map(h.storage),fullStartup:true});
    assert.equal(h.run('state.entities.goose.rescued'),true);
    assert.equal(h.run('state.score'),100);
    assert.equal(h.run('distance(state.entities.goose,FarmRefuge.gooseHome())'),0);
  }
  h.events.elements.continueBtn.click();
  h.run('for(const a of state.entities.animals)GameManager.rescue(state,a);GameManager.win(state);');
  const loaded=createGame(()=>.5,{storage:new Map(h.storage),fullStartup:true});
  assert.equal(loaded.run('state.score'),2050);
  assert.equal(loaded.run('state.cutscene.attackers.filter(a=>a.ref.type==="goose").length'),1);
});

test('Panto joins and renders throughout the finale, and appears in the victory summary', () => {
  const h=createGame();winChallenge(h);
  h.run(`for(const a of state.entities.animals)GameManager.rescue(state,a);GameManager.win(state);
    var draws=0,drawPanto=GooseArt.draw;GooseArt.draw=(...args)=>{draws++;return drawPanto(...args);};
    for(let i=0;i<400;i++){updateGame(.05);renderGame();}`);
  assert.equal(h.run('state.phase'),'won');
  assert.equal(h.run('state.score'),2050);
  assert.equal(h.run('state.cutscene.attackers.length'),13);
  assert.ok(h.run('draws>0'));
  assert.ok(h.run('Number.isFinite(g.x)&&Number.isFinite(g.y)&&g.direction==="down"'));
  assert.match(h.elements.get('endSummary').textContent,/Panto resgatado/);
});

test('older completed challenges bring Panto home without retroactive points; retry resets him', () => {
  const h=createGame();
  h.run(`GameManager.rescue(state,state.entities.animals[0]);GameManager.save(state);
    var saved=GameManager.read();saved.lake={version:1,completed:true,misses:3,active:false};
    GameManager.restore(state,saved);GameManager.save(state);`);
  assert.equal(h.run('state.entities.goose.rescued'),true);
  assert.equal(h.run('state.score'),100);
  h.run('resetGame(state.worldSeed);');
  assert.equal(h.run('state.entities.goose.rescued'),false);
  assert.equal(h.run('state.lake.gooseRescued'),false);
  assert.equal(h.run('state.score'),0);
  assert.equal(h.run('SkinSystem.unlocked("goose")'),true);
});

test('unfinished and malformed challenge saves cannot rescue Panto', () => {
  const h=createGame();
  h.run(`GameManager.save(state);var saved=GameManager.read();
    saved.lake={version:1,active:false,completed:false,misses:2,gooseRescued:true};GameManager.restore(state,saved);`);
  assert.equal(h.run('state.entities.goose.rescued'),false);
  assert.equal(h.run('state.score'),0);
  h.run('saved.lake.completed=true;GameManager.restore(state,saved);');
  assert.equal(h.run('state.entities.goose.rescued'),false);
});
