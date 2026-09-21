const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
const step=(h,seconds,code='ThorSystem.update(state,.05)')=>h.run(`for(let i=0;i<${Math.ceil(seconds/.05)};i++){${code};}`);
function setup(difficulty='easy'){
  const h=createGame(()=>.5);
  h.run(`state.difficultyKey='${difficulty}';state.phase='playing';var c=state.entities.chicken,w=state.entities.wolf;
    Object.assign(c,{...WORLD.layout.start,invulnerable:0});state.lives=3;
    var cues=[];AudioSystem.play=(name)=>cues.push(name);ThorSystem.initialize(state);`);
  return h;
}
function emergency(h){h.run('state.lives=1;ThorSystem.update(state,.05)');}

test('easy automatically starts only at one heart, independently of rescue progress',()=>{
  const h=setup();
  for(const lives of [1,2,3])for(const rescued of [0,5,9]){
    h.run(`state.lives=${lives};state.rescuedCount=${rescued};ThorSystem.initialize(state);ThorSystem.update(state,.05)`);
    assert.equal(h.run('ThorSystem.active(state)'),lives===1);
  }
});

test('easy emergency also protects the player in water and suspends an active lake encounter',()=>{
  for(const place of ['water','lake']){
    const h=setup();
    if(place==='water')h.run('var pond=STRUCTURES.pond;c.x=pond.x+pond.w/2;c.y=pond.y+pond.h/2-14;');
    else h.run('state.lake.active=true;state.lake.counterWindow=2;');
    emergency(h);assert.equal(h.run('ThorSystem.active(state)'),true);
    h.run('for(let i=0;i<120&&ThorSystem.active(state);i++)updateGame(.05);');
    assert.equal(h.run('state.lives'),2);assert.equal(h.run('state.thorVisit.easyUsed'),true);
    if(place==='lake')assert.equal(h.run('state.lake.counterWindow'),2);
  }
});

test('easy gives exactly one extra heart once per attempt, even after another injury and a reload',()=>{
  const h=setup();emergency(h);
  assert.equal(h.run('state.lives'),1,'heal happens at the arrival beat');
  assert.equal(h.run('state.thorVisit.easyUsed'),true,'the single use is reserved durably');
  step(h,5.5);
  assert.equal(h.run('state.lives'),2);assert.equal(h.run('state.thorVisit.visits'),1);
  assert.equal(h.run('state.entities.wolf.mode'),'frightened');
  assert.equal(h.run('state.rescuedCount+state.rescuedChicks'),0);
  h.run('state.lives=1;GameManager.save(state)');
  const resumed=createGame(()=>.5,{storage:new Map(h.storage),fullStartup:true});
  resumed.run('state.phase="playing"');step(resumed,100);
  assert.equal(resumed.run('state.lives'),1);assert.equal(resumed.run('ThorSystem.active(state)'),false);
  assert.equal(resumed.run('state.thorVisit.visits'),1);
  h.run('resetGame();state.phase="playing";state.difficultyKey="easy";state.lives=1;ThorSystem.update(state,.05)');
  assert.equal(h.run('ThorSystem.active(state)'),true,'a new attempt earns its own emergency');
});

test('cutscene suspends movement, the wolf, time, hazards and rescue totals, then returns control',()=>{
  const h=setup();
  h.run('state.lives=1;input.add("d");updateGame(.05);var frozen=JSON.stringify([c.x,c.y,w.x,w.y,state.elapsed,state.rescuedCount,state.rescuedChicks]);');
  step(h,2,'updateGame(.05)');
  assert.equal(h.run('JSON.stringify([c.x,c.y,w.x,w.y,state.elapsed,state.rescuedCount,state.rescuedChicks])===frozen'),true);
  assert.equal(h.run('Player.checkCatch(state)'),false);
  assert.equal(h.run('LakeChallenge.start(state)'),false);
  step(h,3.6,'updateGame(.05)');
  assert.equal(h.run('ThorSystem.active(state)'),false);
  assert.equal(h.run('input.size'),0);
  h.run('var oldElapsed=state.elapsed;updateGame(.05)');
  assert.equal(h.run('state.elapsed>oldElapsed'),true);
});

test('pause and inactive pages preserve scene progress; invalid dt cannot advance or heal',()=>{
  const h=setup();emergency(h);step(h,1);
  const before=h.run('JSON.stringify(ThorSystem.snapshot(state))');
  for(const phase of ['menu','won','lose','win_cutscene']){h.run(`state.phase='${phase}'`);step(h,2);assert.equal(h.run('JSON.stringify(ThorSystem.snapshot(state))'),before);}
  h.run('state.phase="playing";ThorSystem.update(state,NaN);ThorSystem.update(state,Infinity);ThorSystem.update(state,-1)');
  assert.equal(h.run('JSON.stringify(ThorSystem.snapshot(state))'),before);
});

test('saving before or after the heal resumes the same scene without repeating the reward or fanfare',()=>{
  for(const seconds of [1.5,3.8]){
    const h=setup();emergency(h);step(h,seconds);h.run('GameManager.save(state)');
    const expected=h.run('state.lives'),at=h.run('state.thorRescue.time');
    const resumed=createGame(()=>.5,{storage:new Map(h.storage),fullStartup:true});
    assert.equal(resumed.run('state.lives'),expected);assert.equal(resumed.run('state.thorRescue.time'),at);
    resumed.run('var cues=[];AudioSystem.play=name=>cues.push(name);state.phase="playing"');step(resumed,6);
    assert.equal(resumed.run('state.lives'),2);assert.equal(resumed.run('state.thorVisit.visits'),1);
    assert.equal(resumed.run('cues.filter(n=>n==="thor-hero").length'),0);
  }
});

test('skipping delivers the same one-time help and clears held inputs',()=>{
  const h=setup();emergency(h);
  assert.equal(h.run('ThorSystem.skip(state)'),false,'ignore the initial key that triggered the scene');
  step(h,.7);h.run('input.add("d")');
  assert.equal(h.run('ThorSystem.skip(state)'),true);
  assert.equal(h.run('state.lives'),2);assert.equal(h.run('ThorSystem.active(state)'),false);
  assert.equal(h.run('input.size'),0);assert.equal(h.run('ThorSystem.skip(state)'),false);
});

test('legacy saves do not restore unlimited free help; malformed scenes cannot mint health',()=>{
  const h=setup();
  h.run('state.lives=1;ThorSystem.restore(state,{version:2,nextIn:42,visits:1,boneIds:[],cycle:0,visitor:null});ThorSystem.update(state,.05)');
  assert.equal(h.run('ThorSystem.active(state)'),false);
  h.run('ThorSystem.restore(state,{version:3,nextIn:0,visits:0,easyUsed:false,cycle:0,boneIds:[],rescue:{time:4,before:1,healed:false},visitor:null})');
  assert.equal(h.run('state.thorRescue'),undefined);assert.equal(h.run('state.lives'),1);
});

test('the cinematic lands Thor on clear ground across farm districts and his exit remains traversable',()=>{
  const h=setup();
  for(const seed of [52,814237,4294967295]){
    h.run(`resetGame(${seed});state.phase='playing';state.difficultyKey='easy';c=state.entities.chicken;`);
    const hubs=h.run('WORLD.areas.map(a=>a.hub||{x:a.x+a.w/2,y:a.y+a.h/2})');
    for(const hub of hubs){
      h.context.hub=hub;h.run('var open=WolfAI.findPath(c,hub).pop();Object.assign(c,open);ThorSystem.initialize(state)');
      emergency(h);step(h,5.5);
      assert.equal(h.run('state.lives'),2);
      assert.equal(h.run('!state.entities.thor||WildlifeRules.clear(state.entities.thor,state.entities.thor,state.entities.thor.hitbox)'),true);
      step(h,4);
      assert.equal(h.run('!state.entities.thor||WildlifeRules.clear(state.entities.thor,state.entities.thor,state.entities.thor.hitbox)'),true);
    }
  }
});

test('a frightened wolf cannot catch or witness hiding, then resumes patrol',()=>{
  const h=setup();h.run('OBSTACLES=[];Object.assign(c,{x:1000,y:800});Object.assign(w,{x:1180,y:800,huntUnlockTimer:0,pauseTimer:0});WolfAI.frighten(state,c,6)');
  const gap=h.run('distance(w,c)');step(h,2,'WolfAI.update(state,.05)');
  assert.ok(h.run('distance(w,c)')>gap+100);
  h.run('c.x=w.x;c.y=w.y;c.invulnerable=0');assert.equal(h.run('Player.checkCatch(state)'),false);
  assert.equal(h.run('WolfAI.witnessHide(state,HidingSpots.getSpots()[0])'),false);
  step(h,4.05,'WolfAI.update(state,.05)');assert.equal(h.run('w.mode'),'patrol');
});

test('Thor art validates its sheet and both map and hero drawing preserve canvas state',async()=>{
  const h=createGame(()=>.5,{skipThorInstall:true}),art=h.run('ThorArt');
  assert.equal(await art.load(async()=>({width:1,height:1})),false);
  assert.equal(art.errors.length,1);
  assert.equal(await art.load(async()=>({width:art.width,height:art.height})),true);
  assert.ok(art.columns>=8);assert.equal(art.frames.length,art.columns*8);
  for(const direction of ['down','right','up','left','downright','upright','downleft','upleft']){
    const poses=[0,.5,1,1.5,2,2.5,3,3.5].map(anim=>art.frameFor({direction,anim,moving:true}));
    assert.equal(new Set(poses.map(p=>p.row+':'+p.column)).size,8);
  }
  let depth=0,draws=0;const c=new Proxy({save(){depth++;},restore(){depth--;},drawImage(){draws++;}}, {get:(o,k)=>o[k]??(()=>{})});
  art.drawHero(c,200,300,180,'right',1);
  assert.equal(depth,0);assert.equal(draws,1);
});
