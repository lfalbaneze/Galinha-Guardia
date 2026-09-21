const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
function arena(options={}) {
  const h=createGame(()=>.5,options);
  h.run(`OBSTACLES=[];camera.x=700;camera.y=500;
    var f=state.entities.foxes[0],w=state.entities.wolf,c=state.entities.chicken;
    state.entities.foxes=[f];
    Object.assign(f,{x:1100,y:800,home:{x:1000,y:800},anchor:{x:1000,y:800},target:{x:1160,y:800},
      mode:'rest',timer:3,cooldown:3,grace:0,scaredTime:0,hit:false,route:[]});
    Object.assign(w,{x:1000,y:800,heading:0,mode:'patrol',huntUnlockTimer:0,pauseTimer:0,foxScoldCooldown:0});
    Object.assign(c,{x:1800,y:1200,hidden:false,invulnerable:0});`);
  return h;
}
const step=(h,seconds)=>h.run(`for(let i=0;i<${Math.ceil(seconds/.05)};i++)FoxSystem.update(state,.05);`);

test('a lethal fox dash saves defeat once and retry starts the attempt over',()=>{
  const h=arena();
  h.run(`GameManager.rescue(state,state.entities.animals[0]);state.lives=1;
    Object.assign(c,{x:f.x,y:f.y});f.mode='dash';w.x=2500;
    FoxSystem.update(state,.05);FoxSystem.update(state,.05);GameUI.update(state);`);
  assert.equal(h.run('state.phase'),'lose');assert.equal(h.run('state.lives'),0);
  assert.match(h.run('state.gameEndReason'),/Lorenzo/);
  assert.equal(h.run('GameManager.read().lives'),0);
  assert.equal(h.run('GameManager.read().phase'),'lose');
  assert.equal(h.elements.get('replayBtn').textContent,'Revanche');
  h.events.elements.replayBtn.click();
  assert.equal(h.run('state.phase'),'playing');assert.equal(h.run('state.lives'),3);
  assert.equal(h.run('state.rescuedCount'),0);assert.equal(h.run('state.score'),0);
});

test('the fox den rejects hiding in every fox state while other bushes stay usable',()=>{
  const h=arena();
  h.run(`HidingSpots.initialize({...WORLD.layout,vegetation:[
    {id:'den',type:'bush',x:950,y:750,w:120,h:100},
    {id:'empty',type:'bush',x:1150,y:750,w:120,h:100}]});f.bushId='den';
    Object.assign(c,{x:1000,y:800});w.x=2500;`);
  for(const mode of ['hidden','warning','dash','rest','return','flee']) {
    h.run(`f.mode='${mode}';HidingSpots.update(state,.05);HidingSpots.toggle(state);GameUI.update(state);`);
    assert.equal(h.run('c.hidden'),false,mode);
    assert.equal(h.run('c.hidingCandidate'),null,mode);
    assert.match(h.elements.get('contextHint').textContent,/Moita do Lorenzo/);
  }
  h.run('c.x=1200;HidingSpots.update(state);HidingSpots.toggle(state);');
  assert.equal(h.run('c.hidden'),true);assert.equal(h.run('c.hidingSpotId'),'empty');
});

test('loading an old save cannot put the player inside an occupied fox den',()=>{
  const h=createGame(()=>.5);
  h.run(`var fox=state.entities.foxes[0],bush=HidingSpots.getSpots().find(s=>s.id===fox.bushId);
    Object.assign(state.entities.chicken,{x:bush.x+bush.w/2,y:bush.y+bush.h-18,hidden:true,hidingSpotId:bush.id});
    GameManager.save(state);var savedDen=GameManager.read();GameManager.restore(state,savedDen);`);
  assert.equal(h.run('state.entities.chicken.hidden'),false);
  assert.equal(h.run('state.entities.chicken.hidingSpotId'),null);
  assert.equal(h.run('state.entities.chicken.hidingCandidate'),null);
  assert.equal(h.run('state.entities.chicken.hideBlend'),0);
});

test('a wolf seeing a fox after the dash scares it away without losing its chase memory',()=>{
  const h=arena();
  h.run(`w.mode='chase';w.lastKnown={x:1500,y:900};w.route=[{x:1400,y:850}];
    var oldMemory=JSON.stringify([w.mode,w.lastKnown,w.route]);var gap=distance(f,w);FoxSystem.update(state,.05);`);
  assert.equal(h.run('f.mode'),'flee');assert.ok(h.run('distance(f,w)>gap'));
  assert.equal(h.run('JSON.stringify([w.mode,w.lastKnown,w.route])===oldMemory'),true);
  assert.equal(h.run('w.speech'),'Quem manda nesta fazenda sou eu!');
  assert.ok(h.run('f.cooldown>=8'));assert.ok(h.run('f.scaredTime>0'));
  h.run("w.speechMode='patrol';WolfDialogue.update(state,.05);");
  assert.equal(h.run('w.speech'),'Quem manda nesta fazenda sou eu!');
});

test('walls, distance, facing away and Thor fear prevent the wolf from scaring the fox',()=>{
  const h=arena();
  for(const condition of [
    'w.heading=Math.PI', 'w.x=600', "w.mode='frightened';w.fearTime=4",
    'OBSTACLES=[{x:1040,y:700,w:12,h:200}]', 'w.huntUnlockTimer=2', 'w.pauseTimer=1',
  ]){
    h.run(`OBSTACLES=[];Object.assign(w,{x:1000,heading:0,mode:'patrol',huntUnlockTimer:0,pauseTimer:0,foxScoldCooldown:0,speech:''});
      Object.assign(f,{x:1100,y:800,mode:'rest',timer:3,scaredTime:0});${condition};FoxSystem.update(state,.05);`);
    assert.equal(h.run('f.mode'),'rest',condition);assert.equal(h.run('w.speech'),'',condition);
  }
});

test('the wolf interrupts only the exposed rest or return after an attack',()=>{
  const h=arena();
  for(const mode of ['hidden','warning','dash']){
    h.run(`Object.assign(f,{x:1100,y:800,mode:'${mode}',timer:3,scaredTime:0,cooldown:3});FoxSystem.update(state,.05);`);
    assert.equal(h.run('f.scaredTime'),0,mode);
  }
  h.run("Object.assign(f,{x:1100,y:800,mode:'return',timer:0});FoxSystem.update(state,.05);");
  assert.equal(h.run('f.mode'),'flee');
});

test('a scared fox uses clear steps, cannot hurt the player, returns home and waits',()=>{
  const h=arena();
  h.run(`OBSTACLES=[{x:1160,y:730,w:8,h:150}];FoxSystem.update(state,.05);
    var badStep=false,badWall=false;
    for(let i=0;i<80;i++){
      c.x=f.x;c.y=f.y;c.invulnerable=0;const before={x:f.x,y:f.y};FoxSystem.update(state,.05);
      if(distance(before,f)>FoxSystem.getConfig(state).speed*.05+.01)badStep=true;
      if(!WildlifeRules.clear(f,f,f.hitbox))badWall=true;
    }`);
  assert.equal(h.run('badStep'),false);assert.equal(h.run('badWall'),false);
  assert.equal(h.run('state.lives'),3);
  assert.equal(h.run('f.mode'),'hidden');assert.ok(h.run('distance(f,f.home)<1'));
  assert.ok(h.run('f.cooldown>0'));
});

test('fox rivalry stays paused in menus and during the lake challenge',()=>{
  const h=arena();
  for(const condition of ["state.phase='menu'",'state.lake.active=true']){
    h.run(`state.phase='playing';state.lake.active=false;${condition};var before=JSON.stringify([f,w]);`);
    step(h,1);
    assert.equal(h.run('JSON.stringify([f,w])===before'),true);
  }
});

test('a patrolling wolf displays the territorial speech bubble',()=>{
  const labels=[];
  const drawing=new Proxy({canvas:{width:900,height:520},fillText:(text)=>labels.push(text),measureText:text=>({width:text.length*7})},
    {get:(o,k)=>o[k]??(()=>({addColorStop(){}})),set:(o,k,v)=>(o[k]=v,true)});
  const h=arena({drawingContext:drawing});
  h.run('FoxSystem.update(state,.05);GameUI.render(state);');
  assert.ok(labels.includes('Quem manda nesta fazenda sou eu!'));
});
