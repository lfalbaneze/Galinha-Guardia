const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
const step=(h,seconds,code='ThorSystem.update(state,.05)')=>h.run(`for(let i=0;i<${Math.ceil(seconds/.05)};i++){${code};}`);
function setup(){
  const h=createGame(()=>.5);
  h.run(`OBSTACLES=[];var c=state.entities.chicken,w=state.entities.wolf;
    Object.assign(c,{x:1000,y:800,invulnerable:0});Object.assign(w,{x:1180,y:800,huntUnlockTimer:0,pauseTimer:0});
    camera.x=550;camera.y=540;state.lives=1;state.thorVisit.nextIn=0;ThorSystem.update(state,.05);`);
  return h;
}
test('visits draw from random intervals and never depend on health, seed, rescues or difficulty',()=>{
  const h=createGame(()=>.5);
  const values=[.01,.2,.5,.8,.99].map(n=>h.run(`ThorSystem.nextDelay(()=>${n})`));
  assert.ok(values.every((v,i)=>Number.isFinite(v)&&v>=20&&(!i||v>values[i-1])));
  assert.ok(values[4]-values[0]>200);
  for(const lives of [1,2,3])for(const rescued of [0,5,9]){
    h.run(`state.lives=${lives};state.rescuedCount=${rescued};ThorSystem.initialize(state)`);
    assert.equal(h.run('state.thorVisit.nextIn'),values[2]);
  }
});
test('Thor arrives offscreen, approaches, heals once, frightens the wolf, and leaves without joining rescue totals',()=>{
  const h=setup();
  assert.ok(h.run('state.entities.thor && !WildlifeRules.onScreen(state.entities.thor,70)'));
  step(h,4);
  assert.equal(h.run('state.lives'),2);assert.equal(h.run('state.thorVisit.visits'),1);
  assert.equal(h.run('state.entities.wolf.mode'),'frightened');
  assert.match(h.run('GameUI.activeNotice(state).title'),/Thor.*1 coração/);
  step(h,25);
  assert.equal(h.run('state.entities.thor'),null);assert.equal(h.run('state.lives'),2);
  assert.equal(h.run('state.rescuedCount+state.rescuedChicks'),0);
  assert.ok(h.run('state.thorVisit.nextIn>0'));
});
test('full hearts stay at three, while the wolf still flees',()=>{
  const h=setup();h.run('state.lives=3');step(h,4);
  assert.equal(h.run('state.lives'),3);assert.equal(h.run('state.thorNotice.healed'),false);
  assert.equal(h.run('w.mode'),'frightened');
  assert.match(h.run('GameUI.activeNotice(state).detail'),/Corações cheios/);
});
test('pause, lake and ending freeze the countdown and the active visit; invalid dt does nothing',()=>{
  const h=setup();const before=h.run('JSON.stringify(ThorSystem.snapshot(state))');
  for(const phase of ['menu','won','lose','win_cutscene']){h.run(`state.phase='${phase}'`);step(h,2);assert.equal(h.run('JSON.stringify(ThorSystem.snapshot(state))'),before);}
  h.run('state.phase="playing";state.lake.active=true');step(h,2);
  h.run('state.lake.active=false;ThorSystem.update(state,NaN);ThorSystem.update(state,Infinity);ThorSystem.update(state,-1)');
  assert.equal(h.run('JSON.stringify(ThorSystem.snapshot(state))'),before);
  h.run('ThorSystem.initialize(state);state.phase="menu"');const wait=h.run('state.thorVisit.nextIn');step(h,3);assert.equal(h.run('state.thorVisit.nextIn'),wait);
});
test('a frightened wolf cannot catch, observe a hiding entrance, or follow an owl; it retreats then resumes patrol',()=>{
  const h=setup();h.run(`w.mode='chase';w.lastKnown={x:c.x,y:c.y};w.exposedCover={spotId:'test',x:c.x,y:c.y,remaining:8,inspectTime:.8};WolfAI.frighten(state,c,6)`);
  assert.equal(h.run('w.lastKnown'),null);assert.equal(h.run('w.exposedCover'),null);
  const gap=h.run('distance(w,c)');step(h,2,'WolfAI.update(state,.05)');
  assert.ok(h.run('distance(w,c)')>gap+100);assert.equal(h.run('w.mode'),'frightened');
  assert.equal(h.run('WolfAI.investigateSound(state,w,360)'),false);
  h.run('c.x=w.x;c.y=w.y;c.invulnerable=0');assert.equal(h.run('Player.checkCatch(state)'),false);
  assert.equal(h.run('WolfAI.witnessHide(state,HidingSpots.getSpots()[0])'),false);
  step(h,4.05,'WolfAI.update(state,.05)');assert.equal(h.run('w.mode'),'patrol');
});
test('reload preserves a waiting random visit and never repeats a delivered heart',()=>{
  const h=setup();step(h,2.1);
  assert.equal(h.run('state.entities.thor.mode'),'greet');assert.equal(h.run('state.lives'),2);
  h.run('GameManager.save(state)');const saved=h.run('GameManager.read()');
  const restored=createGame(()=>.5,{storage:new Map(h.storage),fullStartup:true});
  assert.equal(restored.run('state.lives'),2);assert.equal(restored.run('state.entities.thor.mode'),'greet');
  assert.equal(restored.run('state.entities.wolf.mode'),'frightened');
  restored.run('state.phase="playing"');step(restored,15);
  assert.equal(restored.run('state.lives'),2);
  h.context.savedThor=saved.thor;h.run('ThorSystem.restore(state,{nextIn:42,visits:4,visitor:null});GameManager.save(state)');
  const waiting=createGame(()=>.9,{storage:new Map(h.storage),fullStartup:true});
  assert.equal(waiting.run('state.thorVisit.nextIn'),42);assert.equal(waiting.run('state.thorVisit.visits'),4);
});
test('old saves gain random visits; corrupt visitor data cannot grant or duplicate health',()=>{
  const h=setup();h.run('ThorSystem.restore(state,undefined)');assert.ok(h.run('state.thorVisit.nextIn>=20'));
  for(const value of [null,{nextIn:NaN},{nextIn:-1},{nextIn:42,visits:1,visitor:{x:-1,y:10,mode:'greet'}}]){
    h.context.bad=value;h.run('ThorSystem.restore(state,bad)');assert.equal(h.run('state.entities.thor'),null);assert.equal(h.run('state.lives'),1);
  }
});
test('Thor and the frightened wolf follow traversable routes around a wall',()=>{
  const h=setup();h.run(`OBSTACLES=[{x:700,y:680,w:30,h:240}];state.entities.thor.x=560;state.entities.thor.y=800;state.entities.thor.route=[];state.entities.thor.routeTimer=0;`);
  for(let i=0;i<150;i++){
    h.run('ThorSystem.update(state,.05)');assert.ok(h.run('!state.entities.thor || WildlifeRules.clear(state.entities.thor,state.entities.thor,state.entities.thor.hitbox)'));
  }
  assert.equal(h.run('state.lives'),2);
  h.run(`w.x=650;w.y=800;WolfAI.frighten(state,{x:500,y:800},6)`);
  for(let i=0;i<120;i++){
    h.run('WolfAI.update(state,.05)');assert.ok(h.run('WildlifeRules.clear(w,w,w.hitbox)'));
  }
});
test('Thor sheet checks dimensions, exposes load errors and allows retry',async()=>{
  const h=createGame(()=>.5,{skipThorInstall:true}),art=h.run('ThorArt');
  assert.equal(await art.load(async()=>({width:1,height:1})),false);
  assert.deepEqual(Array.from(art.errors),['assets/sprites/sources/thor.png']);
  assert.equal(await art.load(async()=>({width:1024,height:1536})),true);
  assert.equal(art.ready,true);assert.equal(art.errors.length,0);
});
test('visits reach actual farm districts without spawning or walking inside props',()=>{
  const h=createGame(()=>.5);
  for(const seed of [52,814237,4294967295]){
    h.run(`resetGame(${seed});state.phase='playing'`);
    const hubs=h.run('WORLD.areas.map(a=>a.hub||{x:a.x+a.w/2,y:a.y+a.h/2})');
    for(const hub of hubs){
      h.context.hub=hub;
      h.run(`var open=WolfAI.findPath(state.entities.chicken,hub).pop();Object.assign(state.entities.chicken,open);
        camera.x=clamp(open.x-450,0,WORLD.width-900);camera.y=clamp(open.y-260,0,WORLD.height-520);
        ThorSystem.initialize(state);state.thorVisit.nextIn=0;state.lives=1;ThorSystem.update(state,.05)`);
      assert.ok(h.run('state.entities.thor'),`Thor spawn, seed ${seed}`);
      let frames=0;
      while(h.run('state.entities.thor.mode')==='enter'&&frames++<350){
        h.run('ThorSystem.update(state,.05)');
        assert.ok(h.run('WildlifeRules.clear(state.entities.thor,state.entities.thor,state.entities.thor.hitbox)'));
      }
      assert.equal(h.run('state.entities.thor.mode'),'greet',`Thor reaches district, seed ${seed}`);
      assert.equal(h.run('state.lives'),2);
    }
  }
});
