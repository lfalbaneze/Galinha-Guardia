const test=require('node:test'),assert=require('node:assert/strict');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {createGame}=require('./helpers.cjs');
const clear=`a=>{const h=getHitbox(a);return OBSTACLES.every(r=>Math.hypot(h.x-clamp(h.x,r.x,r.x+r.w),h.y-clamp(h.y,r.y,r.y+r.h))>=h.r-.01);}`;

test('every rescued friend and chick has a separate, clear home inside the refuge',()=>{
  for(const version of [1,2])for(const seed of [0,814237,4294967295]) {
    const h=createGame(()=>.5);
    h.run(`resetGame(${seed},${version});
      for(const [i,a] of state.entities.animals.entries())Object.assign(a,RescueSystem.safePosition(i));
      for(const [i,a] of state.entities.chicks.entries())Object.assign(a,RescueSystem.chickPosition(i));`);
    assert.equal(h.run(`RescueSystem.all(state).every(${clear})`),true,`version ${version}, seed ${seed}`);
    assert.equal(h.run('new Set(RescueSystem.all(state).map(a=>`${a.x},${a.y}`)).size'),16);
    assert.equal(h.run('FarmArt.getProps(WORLD.layout).some(p=>p.id==="sign-poleiro")'),false);
    assert.equal(h.run('RescueSystem.all(state).every(a=>a.x>95&&a.x<338&&a.y>215&&a.y<460)'),true);
  }
});

test('refuge rails block movement while the visible east entrance stays open',()=>{
  const h=createGame(()=>.5);
  h.run('var c=state.entities.chicken;Object.assign(c,{x:200,y:325});Player.move(c,-160,0);');
  assert.ok(h.run('c.x')>=110);
  h.run('Object.assign(c,{x:380,y:390});Player.move(c,-90,0);');
  assert.ok(h.run('c.x')<340);
  assert.equal(h.run(`(${clear})(c)`),true);
  h.run('Object.assign(c,{x:300,y:325});Player.move(c,100,0);');
  assert.ok(h.run('c.x')<=330);
});

test('old yard saves keep their progress and move residents out of the new shelter walls',()=>{
  const h=createGame(()=>.5);
  h.run(`GameManager.rescue(state,state.entities.animals[0]);state.entities.chicks[0].discovered=true;GameManager.rescue(state,state.entities.chicks[0]);
    GameManager.save(state);var saved=GameManager.read();
    saved.animals[0].x=140;saved.animals[0].y=370;saved.chicks[0].x=135;saved.chicks[0].y=280;
    saved.chicken.x=210;saved.chicken.y=170;
    resetGame();GameManager.restore(state,saved);`);
  assert.equal(h.run('state.rescuedCount'),1);
  assert.equal(h.run('state.rescuedChicks'),1);
  assert.equal(h.run('state.score'),200);
  assert.equal(h.run('distance(state.entities.animals[0],RescueSystem.safePosition(0))'),0);
  assert.equal(h.run('distance(state.entities.chicks[0],RescueSystem.chickPosition(0))'),0);
  assert.equal(h.run(`(${clear})(state.entities.chicken)`),true);
});

test('the nursery loads once with transparent margins while keeping straw and flower details',async()=>{
  const h=createGame(()=>.5),art=h.run('FarmSprites');let calls=0;
  const loader=src=>{calls++;return loadImage(src);};
  const pending=art.loadNursery(loader,createCanvas);
  assert.equal(art.loadNursery(loader,createCanvas),pending);
  assert.equal(await pending,true);await art.loadNursery(loader,createCanvas);assert.equal(calls,1);
  const canvas=createCanvas(251,118),c=canvas.getContext('2d');
  assert.equal(art.draw(c,'nursery',0,0,251,118),true);
  const data=c.getImageData(0,0,251,118).data;
  let transparent=0,painted=0;
  for(let i=0;i<data.length;i+=4){if(data[i+3]===0)transparent++;else painted++;}
  assert.ok(transparent>251*118*.1);assert.ok(painted>251*118*.3);
});
