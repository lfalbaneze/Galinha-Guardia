const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

function setup(mode, seed=52) {
  const h = createGame();
  h.run(`difficultySelect.value='${mode}';resetGame(${seed});state.phase='playing';
    state.entities.chicken.hidden=true;state.entities.wolf.huntUnlockTimer=100;
    var initial=state.entities.foxes.map(f=>f.bushId);`);
  return h;
}
const step = (h, seconds) => h.run(`for(let i=0;i<${seconds * 20};i++)FoxSystem.update(state,.05);`);

test('only hard and hardcore foxes change bushes, walking through the real seeded map', () => {
  for (const mode of ['easy','normal','hard','hardcore']) {
    const h=setup(mode);
    h.run(`var moved=false,arrived=false,legal=true,previous=state.entities.foxes.map(f=>({x:f.x,y:f.y}));
      for(let i=0;i<1600;i++){
        FoxSystem.update(state,.05);
        for(const [j,f] of state.entities.foxes.entries()){
          if(f.bushId!==initial[j]){moved=true;if(f.mode==='hidden'&&distance(f,f.home)<1)arrived=true;}
          legal &&= WildlifeRules.clear(previous[j],f,f.hitbox) && distance(previous[j],f)<20;
          previous[j]={x:f.x,y:f.y};
        }
      }`);
    assert.equal(h.run('moved'), ['hard','hardcore'].includes(mode), mode);
    assert.equal(h.run('arrived'), ['hard','hardcore'].includes(mode), mode);
    assert.equal(h.run('legal'), true, 'no teleporting or crossing obstacles');
    assert.equal(h.run('state.lives'), 3, 'travel alone does not deal damage');
  }
});

test('moving dens avoid chicks, the refuge, the hidden player and other foxes', () => {
  for (const seed of [1, 32, 52, 2147483648]) {
    const h=setup('hardcore', seed);
    h.run(`var safe=true;for(let i=0;i<1400;i++){
      FoxSystem.update(state,.05);
      safe &&= new Set(state.entities.foxes.map(f=>f.bushId)).size===state.entities.foxes.length &&
        state.entities.foxes.every(f=>!WildlifeRules.reserved(state,f.home) &&
          !state.entities.chicks.some(c=>c.coverId===f.bushId) && f.bushId!==state.entities.chicken.hidingSpotId);
    }`);
    assert.equal(h.run('safe'), true, `seed ${seed}`);
  }
});

test('save while moving preserves position and target den, then completes the journey', () => {
  const h=setup('hard');
  h.run(`var f=state.entities.foxes[0];f.relocateIn=0;f.grace=0;FoxSystem.update(state,.05);`);
  assert.equal(h.run('f.mode'), 'relocate');
  step(h, .5);
  h.run('var saved=FoxSystem.snapshot(state),before=JSON.stringify(saved.map(f=>[f.x,f.y,f.bushId]));FoxSystem.restore(state,saved);');
  assert.equal(h.run('JSON.stringify(FoxSystem.snapshot(state).map(f=>[f.x,f.y,f.bushId]))===before'), true);
  h.run('state.entities.foxes.forEach(f=>f.relocateIn=20);');
  step(h, 15);
  assert.ok(h.run('state.entities.foxes.some(f=>f.mode==="hidden"&&distance(f,f.home)<1)'));
});

test('restoring exchanged dens does not reset either fox to its original bush', () => {
  const h=setup('hard');
  h.run(`var saved=FoxSystem.snapshot(state),homes=state.entities.foxes.map(f=>({...f.home}));
    [saved[0].bushId,saved[1].bushId]=[saved[1].bushId,saved[0].bushId];
    Object.assign(saved[0],homes[1]);Object.assign(saved[1],homes[0]);FoxSystem.restore(state,saved);`);
  assert.equal(h.run('state.entities.foxes.every((f,i)=>f.bushId===saved[i].bushId&&distance(f,saved[i])<.01)'), true);
});

test('a player hiding in a vacated den remains hidden after loading the moving foxes', () => {
  const h=setup('hard');
  h.run(`var fox=state.entities.foxes[0],oldDen=HidingSpots.getSpots().find(s=>s.id===fox.bushId);
    fox.relocateIn=0;fox.grace=0;FoxSystem.update(state,.05);
    Object.assign(state.entities.chicken,{x:oldDen.x+oldDen.w/2,y:oldDen.y+oldDen.h-18,hidden:true,hidingSpotId:oldDen.id});
    GameManager.save(state);var saved=GameManager.read();resetGame(52);GameManager.restore(state,saved);`);
  assert.equal(h.run('state.entities.chicken.hidden'), true);
  assert.equal(h.run('state.entities.chicken.hidingSpotId===oldDen.id'), true);
});

test('foxes leave occupied hiding places alone and stay put if other bushes are unreachable', () => {
  const h=setup('hard');
  h.run(`OBSTACLES=[];WildlifeRules.reserved=()=>false;WildlifeRules.pathDistance=()=>0;
    HidingSpots.initialize({...WORLD.layout,vegetation:[
      {id:'home',type:'bush',x:950,y:700,w:100,h:109},
      {id:'hidden-player',type:'bush',x:1250,y:700,w:100,h:109},
      {id:'blocked',type:'bush',x:1650,y:700,w:100,h:109}]});
    var f=state.entities.foxes[0];state.entities.foxes=[f];
    Object.assign(f,{x:1000,y:800,home:{x:1000,y:800},bushId:'home',mode:'hidden',grace:0,relocateIn:0});
    Object.assign(state.entities.chicken,{x:1300,y:760,hidden:true,hidingSpotId:'hidden-player'});
    OBSTACLES=[{x:1500,y:0,w:30,h:WORLD.height}];`);
  step(h, 15);
  assert.equal(h.run('f.bushId'), 'home');
  assert.equal(h.run('f.x'), 1000);
});

test('relocation freezes in menus, finales and the lake challenge', () => {
  for (const phase of ['menu','won','lose','win_cutscene','lake']) {
    const h=setup('hard');
    h.run(phase==='lake'?'state.lake.active=true':`state.phase='${phase}'`);
    const before=h.run('JSON.stringify(state.entities.foxes)');
    step(h, 20);
    assert.equal(h.run('JSON.stringify(state.entities.foxes)'),before);
  }
});
