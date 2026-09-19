const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
const plain=value=>JSON.parse(JSON.stringify(value));
function setup(difficulty='normal'){
  const h=createGame(()=>.5);h.run(`state.difficultyKey='${difficulty}';state.lives=3;var c=state.entities.chicken,cues=[];AudioSystem.play=name=>cues.push(name);ThorSystem.initialize(state);`);return h;
}
function collect(h,count=3){const bones=plain(h.run('ThorSystem.bones(state)')).slice(0,count);for(const b of bones)h.run(`c.x=${b.x};c.y=${b.y};ThorSystem.update(state,.05)`);return bones;}
const step=(h,t)=>h.run(`for(let i=0;i<${Math.ceil(t/.05)};i++){const wasActive=ThorSystem.active(state);ThorSystem.update(state,.05);if(wasActive&&!ThorSystem.active(state))break;}`);

test('normal costs two bones and hard costs three; neither summons automatically',()=>{
  for(const [difficulty,cost] of [['normal',2],['hard',3]]){
    const h=setup(difficulty);assert.equal(h.run('ThorSystem.cost(state)'),cost);
    collect(h,cost-1);h.run('state.lives=1;ThorSystem.update(state,.05)');
    assert.equal(h.run('ThorSystem.request(state)'),false);
    assert.equal(h.run('state.thorRescue'),undefined);
    collect(h,1);h.run('ThorSystem.update(state,.05);GameUI.update(state)');
    assert.equal(h.run('ThorSystem.active(state)'),false,'wait for the player to call');
    assert.equal(h.elements.get('thorSupply').disabled,false);
    assert.match(h.elements.get('thorSupply').textContent,/Chamar Thor/);
    assert.equal(h.run('ThorSystem.request(state)'),true);
    assert.equal(h.run('ThorSystem.boneCount(state)'),0,'one payment is reserved when calling');
    assert.equal(h.run('cues.filter(n=>n==="thor-hero").length'),1);
    assert.equal(h.run('ThorSystem.request(state)'),false,'double click cannot charge twice');
    step(h,5.5);assert.equal(h.run('state.lives'),3);
  }
});

test('paid help fills life from one or two hearts, but full health keeps the bones',()=>{
  for(const difficulty of ['normal','hard'])for(const lives of [1,2,3]){
    const h=setup(difficulty);collect(h);h.run(`state.lives=${lives}`);
    assert.equal(h.run('ThorSystem.request(state)'),lives<3);
    step(h,5.5);assert.equal(h.run('state.lives'),3);
    assert.equal(h.run('ThorSystem.boneCount(state)'),lives===3?(difficulty==='normal'?2:3):0);
  }
});

test('easy has no bones or manual paid summon',()=>{
  const h=setup('easy');assert.equal(h.run('ThorSystem.bones(state).length'),0);
  assert.equal(h.run('ThorSystem.request(state)'),false);
  h.run('GameUI.update(state)');assert.match(h.elements.get('thorSupply').textContent,/automática/);
});

test('one payment and pending/full heal survive reloads without double consumption or rewards',()=>{
  for(const elapsed of [1,3.8]){
    const h=setup(),old=collect(h);h.run('state.lives=1;ThorSystem.request(state)');step(h,elapsed);h.run('GameManager.save(state)');
    const restored=createGame(()=>.5,{storage:new Map(h.storage),fullStartup:true});
    assert.equal(restored.run('state.thorVisit.cycle'),1);assert.equal(restored.run('ThorSystem.boneCount(state)'),0);
    restored.run('state.phase="playing"');step(restored,6);
    assert.equal(restored.run('state.lives'),3);assert.equal(restored.run('state.thorVisit.cycle'),1);
    const fresh=plain(restored.run('ThorSystem.bones(state)'));assert.equal(fresh.length,2);
    assert.ok(fresh.every(b=>old.every(o=>o.id!==b.id)));
  }
});

test('collected bones persist and cannot be picked twice; a new attempt resets them',()=>{
  const h=setup(),[bone]=collect(h,1);
  h.run('GameManager.save(state);var saved=GameManager.read();resetGame();GameManager.restore(state,saved);c=state.entities.chicken;state.phase="playing";');
  assert.equal(h.run('ThorSystem.boneCount(state)'),1);
  h.run(`c.x=${bone.x};c.y=${bone.y};ThorSystem.update(state,.05)`);assert.equal(h.run('ThorSystem.boneCount(state)'),1);
  h.run('resetGame()');assert.equal(h.run('ThorSystem.boneCount(state)'),0);
});

test('bones do not collect through fences, during pause or the lake challenge',()=>{
  const h=setup(),bone=plain(h.run('ThorSystem.bones(state)'))[0];
  h.run(`c.x=${bone.x}-26;c.y=${bone.y};OBSTACLES.push({x:c.x+10,y:c.y-30,w:6,h:60,type:'fence'});ThorSystem.update(state,.05)`);
  assert.equal(h.run('ThorSystem.boneCount(state)'),0);
  h.run(`OBSTACLES=[];c.x=${bone.x};state.phase='menu';ThorSystem.update(state,1)`);assert.equal(h.run('ThorSystem.boneCount(state)'),0);
  h.run('state.phase="playing";state.lake.active=true;ThorSystem.update(state,1)');assert.equal(h.run('ThorSystem.boneCount(state)'),0);
  h.run('state.lake.active=false;ThorSystem.update(state,.05)');assert.equal(h.run('ThorSystem.boneCount(state)'),1);
});

test('legacy and malformed records do not mint bones or free paid rescues',()=>{
  const h=setup();h.run('state.lives=1;ThorSystem.restore(state,{nextIn:0,visits:0,visitor:null});ThorSystem.update(state,.05)');
  assert.equal(h.run('ThorSystem.active(state)'),false);
  h.run("ThorSystem.restore(state,{version:2,nextIn:0,visits:2,cycle:0,boneIds:['bone-0-0','bone-0-0','bone-1-1','garbage'],visitor:null})");
  assert.equal(h.run('ThorSystem.boneCount(state)'),1);
});

test('difficulty-specific bones stay deterministic, separated, dry and reachable across maps and cycles',()=>{
  const h=setup();
  for(const difficulty of ['normal','hard'])for(const version of [1,7])for(const seed of [0,52,814237,4294967295])for(const cycle of [0,1]){
    h.run(`resetGame(${seed},${version});state.difficultyKey='${difficulty}';state.thorVisit.cycle=${cycle};var before=JSON.stringify(WORLD.layout),bones=ThorSystem.bones(state),p=state.entities.chicken;`);
    assert.equal(h.run('bones.length'),difficulty==='normal'?2:3);
    assert.equal(h.run("bones.every((b,i)=>WildlifeRules.clear(b,b,p.hitbox)&&EnvironmentSystem.surfaceAt(state,{x:b.x,y:b.y+14})!=='water'&&bones.every((q,j)=>i===j||distance(b,q)>=240)&&distance(WolfAI.findPath(p,b).at(-1),b)<4)"),true);
    assert.equal(h.run('JSON.stringify(WORLD.layout)===before'),true);
    h.run('var positions=JSON.stringify(bones);ThorSystem.restore(state,ThorSystem.snapshot(state))');
    assert.equal(h.run('JSON.stringify(ThorSystem.bones(state))===positions'),true);
  }
});
