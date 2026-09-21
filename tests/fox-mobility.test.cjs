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

function attackArena(mode='hard', index=0) {
  const h=setup(mode);
  h.run(`OBSTACLES=[];WildlifeRules.reserved=()=>false;WildlifeRules.pathDistance=()=>0;
    HidingSpots.initialize({...WORLD.layout,vegetation:[
      {id:'home',type:'bush',x:950,y:700,w:100,h:109},
      {id:'next',type:'bush',x:1350,y:700,w:100,h:109}]});
    camera.x=700;camera.y=500;
    var f=state.entities.foxes[${index}],c=state.entities.chicken;
    state.entities.foxes=[f];
    Object.assign(f,{x:1000,y:800,home:{x:1000,y:800},bushId:'home',
      mode:'hidden',grace:0,cooldown:0,relocateIn:20});
    Object.assign(c,{x:1100,y:800,hidden:false,hidingSpotId:null,invulnerable:0});
    FoxSystem.update(state,.05);`);
  assert.equal(h.run('f.mode'),'warning','the encounter starts with its normal warning');
  h.run(`for(let i=0;i<30&&f.mode==='warning';i++)FoxSystem.update(state,.05);`);
  assert.equal(h.run('f.mode'),'dash');
  return h;
}

for(const hit of [false,true])test(`after a ${hit?'successful':'missed'} attack, both foxes change bushes in every mode`,()=>{
  for(const mode of ['easy','normal','hard','hardcore'])for(const index of [0,1]){
    const h=attackArena(mode,index);
    if(!hit)h.run('c.y=900;');
    h.run(`for(let i=0;i<30&&f.mode==='dash';i++)FoxSystem.update(state,.05);`);
    assert.equal(h.run('f.mode'),'rest');
    assert.equal(h.run('state.lives'),hit?2:3);
    step(h,.5);
    assert.equal(h.run('f.mode'),'rest','keep the pause after the dash');
    h.run(`for(let i=0;i<30&&f.mode==='rest';i++)FoxSystem.update(state,.05);`);
    assert.equal(h.run('f.mode'),'relocate',`${mode}/${index}`);
    assert.equal(h.run('f.bushId'),'next');
    h.run(`var legal=true;
      for(let i=0;i<240&&f.mode!=='hidden';i++){
        const previous={x:f.x,y:f.y};FoxSystem.update(state,.05);
        legal &&= WildlifeRules.clear(previous,f,f.hitbox) && distance(previous,f)<20;
      }`);
    assert.equal(h.run('f.mode'),'hidden');
    assert.ok(h.run('distance(f,f.home)<1'));
    assert.equal(h.run('legal'),true,'walk the entire route without teleporting');
    assert.equal(h.run('state.lives'),hit?2:3,'returning or relocating cannot deal extra damage');
  }
});

test('a nearby player cannot keep postponing a scheduled bush change with new attacks',()=>{
  const h=attackArena();
  h.run(`Object.assign(f,{mode:'hidden',relocateIn:0,cooldown:0});FoxSystem.update(state,.05);`);
  assert.equal(h.run('f.mode'),'relocate');
  assert.equal(h.run('f.bushId'),'next');
});

test('a missed attack still changes dens when the player stands near the next free bush',()=>{
  for(const [mode,index] of [['hard',1],['hardcore',0]]){
    const h=attackArena(mode,index);
    // This is outside the warned dash but within the old 180px destination exclusion.
    h.run(`Object.assign(c,{x:1230,y:820});
      for(let i=0;i<30&&f.mode==='dash';i++)FoxSystem.update(state,.05);
      for(let i=0;i<30&&f.mode==='rest';i++)FoxSystem.update(state,.05);`);
    assert.equal(h.run('state.lives'),3);
    assert.equal(h.run('f.mode'),'relocate',`${mode}: proximity is not occupation`);
    assert.equal(h.run('f.bushId'),'next');
    step(h,3);
    assert.equal(h.run('f.mode'),'hidden');
    assert.ok(h.run('distance(f,f.home)<1'));
    assert.equal(h.run('state.lives'),3,'travel does not damage the nearby player');
  }
});

test('a temporarily occupied destination is retried soon after the player vacates it',()=>{
  const h=attackArena('hard',1);
  h.run('Object.assign(c,{x:1400,y:800});');
  step(h,4);
  assert.equal(h.run('f.bushId'),'home','do not enter a bush occupied by the player');
  assert.equal(h.run('f.mode'),'hidden');
  h.run('Object.assign(c,{x:1700,y:1000});');
  step(h,1.2);
  assert.equal(h.run('f.mode'),'relocate','a failed attempt must not reset the full patrol delay');
  assert.equal(h.run('f.bushId'),'next');
});

test('a wolf interrupting the post-attack pause does not cancel the next bush change',()=>{
  for(const mode of ['hard','hardcore']){
    const h=attackArena(mode);
    h.run(`c.y=900;for(let i=0;i<30&&f.mode==='dash';i++)FoxSystem.update(state,.05);
      Object.assign(state.entities.wolf,{x:f.x+100,y:f.y,heading:Math.PI,mode:'patrol',huntUnlockTimer:0,pauseTimer:0});
      FoxSystem.update(state,.05);`);
    assert.equal(h.run('f.mode'),'flee');
    h.run(`for(let i=0;i<40&&f.mode==='flee';i++)FoxSystem.update(state,.05);`);
    assert.equal(h.run('f.mode'),'relocate',mode);
    assert.equal(h.run('f.bushId'),'next');
  }
});

test('autosaving a hit on the real farm preserves the next den change after loading',()=>{
  for(const mode of ['hard','hardcore'])for(const seed of [52,814237]){
    const h=setup(mode,seed);
    h.run(`var f=state.entities.foxes[0],c=state.entities.chicken;
      var approach=Array.from({length:16},(_,i)=>({x:f.x+Math.cos(i*Math.PI/8)*100,y:f.y+Math.sin(i*Math.PI/8)*100}))
        .find(p=>WildlifeRules.clear(f,p,f.hitbox)&&WildlifeRules.clear(p,p,c.hitbox));
      if(!approach)throw new Error('No clear approach to this den');
      Object.assign(c,approach,{hidden:false,hidingSpotId:null,invulnerable:0});
      Object.assign(f,{cooldown:0,grace:0,relocateIn:20});
      camera.x=f.x-300;camera.y=f.y-200;FoxSystem.update(state,.05);`);
    assert.equal(h.run('f.mode'),'warning');
    h.run(`for(let i=0;i<60&&f.mode!=='rest';i++)FoxSystem.update(state,.05);`);
    assert.equal(h.run('state.lives'),2,'the normal dash hits and autosaves');
    h.run(`var saved=GameManager.read(),id=f.id,oldDen=f.bushId;
      resetGame(${seed});GameManager.restore(state,saved);f=state.entities.foxes.find(v=>v.id===id);
      state.entities.wolf.huntUnlockTimer=100;`);
    assert.equal(h.run('f.mode'),'rest');
    h.run(`for(let i=0;i<40&&f.mode==='rest';i++)FoxSystem.update(state,.05);`);
    assert.equal(h.run('f.mode'),'relocate',`${mode}/${seed}`);
    assert.notEqual(h.run('f.bushId'),h.run('oldDen'));
    h.run(`var legal=true;
      for(let i=0;i<1200&&f.mode==='relocate';i++){
        const previous={x:f.x,y:f.y};FoxSystem.update(state,.05);
        legal &&= WildlifeRules.clear(previous,f,f.hitbox)&&distance(previous,f)<20;
      }`);
    assert.equal(h.run('legal'),true,'the real farm route respects the sprite collisions');
    assert.equal(h.run('f.mode'),'hidden');
    assert.ok(h.run('distance(f,f.home)<1'));
    assert.equal(h.run('state.lives'),2);
  }
});

test('if the next den is unreachable after a dash, the fox returns safely and can try again later',()=>{
  const h=attackArena();
  h.run(`c.y=900;for(let i=0;i<30&&f.mode==='dash';i++)FoxSystem.update(state,.05);
    OBSTACLES=[{x:1250,y:0,w:30,h:WORLD.height}];`);
  step(h,4);
  assert.equal(h.run('f.mode'),'hidden');
  assert.equal(h.run('f.bushId'),'home');
  assert.ok(h.run('distance(f,f.home)<1'));
  h.run('OBSTACLES=[];c.hidden=true;');
  step(h,15);
  assert.equal(h.run('f.bushId'),'next');
});

test('foxes in every difficulty change bushes, walking through the real seeded map', () => {
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
    assert.equal(h.run('moved'), true, mode);
    assert.equal(h.run('arrived'), true, mode);
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
