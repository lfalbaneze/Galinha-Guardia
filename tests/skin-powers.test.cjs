const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
const ids=['classic','silkie','blue','punk','astronaut','robocop','priest','goose'];
function fixture(){
  const storage=new Map([['galinha-guardia-wardrobe-v1',JSON.stringify({version:2,best:6,selected:'classic',unlocked:ids})]]);
  const h=createGame(()=>.5,{storage});
  h.run('var c=state.entities.chicken,w=state.entities.wolf;');
  return h;
}
function flat(h){
  h.run(`WORLD.layout={...WORLD.layout,paths:[],lanes:[],clearings:[],plots:[],habitats:[],vegetation:[],decorations:[]};
    OBSTACLES=[];Object.assign(c,{x:1000,y:986,hidden:false});EnvironmentSystem.initialize(state);`);
}
function move(h,frames,keys=['d']){
  h.run(`input.clear();${keys.map(k=>`input.add('${k}');`).join('')}
    for(let i=0;i<${frames};i++)Player.update(state,1/60);`);
}

test('dog appearance calms a panicking dog even at a sprint, but a visible wolf still makes it flee',()=>{
  const h=fixture();
  h.run(`OBSTACLES=[];var dog=state.entities.animals.find(a=>a.species==='dog'),home={x:dog.x,y:dog.y};
    Object.assign(w,{x:50,y:50,huntUnlockTimer:100});Object.assign(c,{x:dog.x-110,y:dog.y,sprinting:true});
    Object.assign(dog,{fleeFrom:{x:c.x,y:c.y,kind:'player'},fleeTime:.9,restTime:0});
    SkinSystem.equip(state,'priest');var before=distance(c,dog);RescueSystem.update(state,.1);`);
  assert.equal(h.run('dog.temper'),'calm');assert.equal(h.run('dog.fleeFrom'),null);
  assert.ok(h.run('distance(c,dog)<before'));assert.equal(h.run('dog.rescued'),false,'friendship still requires reaching the dog');
  h.run(`SkinSystem.equip(state,'classic');RescueSystem.update(state,.1);`);
  assert.equal(h.run('dog.fleeFrom.kind'),'player');
  h.run(`SkinSystem.equip(state,'priest');Object.assign(w,{x:dog.x+65,y:dog.y,mode:'patrol',huntUnlockTimer:0,pauseTimer:0});
    RescueSystem.update(state,.1);`);
  assert.equal(h.run('dog.fleeFrom.kind'),'wolf');assert.equal(h.run('dog.temper'),'fleeing');
});

test('canine friendship respects walls, pause and the usual one-time rescue',()=>{
  const h=fixture();
  h.run(`OBSTACLES=[];SkinSystem.equip(state,'priest');var dog=state.entities.animals.find(a=>a.species==='dog');
    Object.assign(w,{x:50,y:50,huntUnlockTimer:100});Object.assign(c,{x:dog.x-110,y:dog.y,sprinting:true});
    Object.assign(dog,{targetX:dog.x,targetY:dog.y,wanderTime:100});
    OBSTACLES=[{x:dog.x-60,y:dog.y-100,w:15,h:200,type:'barn'}];
    var before={x:dog.x,y:dog.y};RescueSystem.update(state,.1);`);
  assert.equal(h.run('distance(dog,before)'),0);assert.notEqual(h.run('dog.temper'),'calm');
  h.run('OBSTACLES=[];state.phase="menu";RescueSystem.update(state,1);');
  assert.equal(h.run('distance(dog,before)'),0);
  h.run('state.phase="playing";for(let i=0;i<120&&!dog.rescued;i++)RescueSystem.update(state,.05);');
  assert.equal(h.run('dog.rescued'),true);assert.equal(h.run('state.rescuedCount'),1);
  h.run('var score=state.score;RescueSystem.update(state,.1);');assert.equal(h.run('state.score===score'),true);
});

test('rabbit power increases real ground movement by 15% without stacking, diagonal boosts or crossing walls',()=>{
  const h=fixture();flat(h);const distances=[];
  for(const skin of ['classic','astronaut','silkie','blue','classic']){
    h.run(`SkinSystem.equip(state,'${skin}');c.x=1000;c.y=986;var from={x:c.x,y:c.y};`);
    move(h,12,['d','s']);distances.push(h.run('distance(c,from)'));
  }
  assert.ok(Math.abs(distances[1]/distances[0]-1.15)<1e-9);
  for(const d of distances.slice(2))assert.ok(Math.abs(d-distances[0])<1e-9);
  h.run(`SkinSystem.equip(state,'astronaut');Object.assign(c,{x:1000,y:986});
    OBSTACLES=[{x:1040,y:900,w:20,h:200,type:'barn'}];`);
  move(h,30,['d','shift']);
  assert.ok(h.run('getHitbox(c).x+getHitbox(c).r<=1040.001'));
  h.run(`OBSTACLES=[];var pond=STRUCTURES.pond;Object.assign(c,{x:pond.x+pond.w/2,y:pond.y+pond.h/2-14});
    var before={x:c.x,y:c.y};`);
  move(h,6);
  assert.ok(Math.abs(h.run('distance(c,before)/(c.speed*6/60)')-.56)<1e-9,'rabbit has the ordinary float speed');
});

test('cat sneaks 50% faster and halves sprint hearing range without becoming invisible',()=>{
  const h=fixture();flat(h);const distances=[];
  for(const skin of ['classic','robocop']){
    h.run(`SkinSystem.equip(state,'${skin}');c.x=1000;var from=c.x;`);
    move(h,12,['d','c']);distances.push(h.run('c.x-from'));
  }
  assert.ok(Math.abs(distances[1]/distances[0]-1.5)<1e-9);
  h.run(`Object.assign(c,{x:1000,y:986,sprinting:true,vx:100,vy:0});Object.assign(w,{x:1100,y:986,heading:0});
    SkinSystem.equip(state,'classic');var heard=DetectionSystem.perceive(w,c).heardPoint;`);
  assert.ok(h.run('!!heard'));
  h.run('SkinSystem.equip(state,"robocop");');
  assert.equal(h.run('DetectionSystem.perceive(w,c).heardPoint'),null);
  h.run('w.x=1050;');assert.ok(h.run('!!DetectionSystem.perceive(w,c).heardPoint'));
  h.run('w.x=1150;w.heading=Math.PI;');assert.equal(h.run('DetectionSystem.perceive(w,c).visible'),true);
});

test('cat quiet steps also reduce the actual rustling heard by the wolf in corn',()=>{
  for(const skin of ['classic','robocop']){
    const h=fixture();flat(h);
    h.run(`SkinSystem.equip(state,'${skin}');
      WORLD.layout.plots=[{kind:'corn',x:970,y:950,w:400,h:100,areaId:'milharal'}];
      WORLD.layout.decorations=[{type:'corn',x:1030,y:1000}];WORLD.layout={...WORLD.layout};EnvironmentSystem.initialize(state);
      Object.assign(w,{x:1230,y:1000,mode:'patrol',huntUnlockTimer:0,pauseTimer:0});`);
    move(h,10,['d','shift']);
    assert.equal(h.run('w.mode'),skin==='classic'?'investigate':'patrol');
    assert.ok(h.run('EnvironmentSystem.inspect(state).reactions.length>0'),'a quiet cat still moves the plants');
  }
});

test('goose can sprint for 4.5 seconds, pause freezes stamina and swapping powers never refills it',()=>{
  const h=fixture();flat(h);
  h.run(`SkinSystem.equip(state,'goose');input.add('shift');
    var runFrames=n=>{for(let i=0;i<n;i++){input.delete('a');input.delete('d');input.add(Math.floor(i/60)%2?'a':'d');Player.update(state,1/60);}};
    runFrames(180);`);
  assert.ok(Math.abs(h.run('c.stamina')-1/3)<1e-9);assert.equal(h.run('c.exhausted'),false);
  h.run('var remaining=c.stamina;state.phase="menu";runFrames(60);');
  assert.equal(h.run('c.stamina'),h.run('remaining'));
  h.run('state.phase="playing";for(const id of ["astronaut","priest","goose"])SkinSystem.equip(state,id);');
  assert.equal(h.run('c.stamina'),h.run('remaining'));
  h.run('runFrames(90);');assert.equal(h.run('c.stamina'),0);assert.equal(h.run('c.exhausted'),true);
  h.run('SkinSystem.equip(state,"astronaut");');assert.equal(h.run('c.exhausted'),true);
});

test('earned powers appear in both selectors and survive reload; locked powers cannot be equipped',()=>{
  const h=fixture(),names=['Pato a jato','Pé de foguete','Passo de veludo','Au-mizade','Fôlego de ganso'];
  for(const [i,id] of ['punk','astronaut','robocop','priest','goose'].entries()){
    h.elements.get('menuSkinSelect').value=id;h.events.elements.menuSkinSelect.change();
    assert.equal(h.elements.get('menuPowerName').textContent,names[i]);
    assert.ok(h.elements.get('menuPowerDescription').textContent.length>40);
    assert.ok(h.elements.get('skinPowerText').textContent.includes(names[i]));
    assert.equal(h.elements.get('skinPowerBadge').hidden,false);
  }
  h.run('SkinSystem.equip(state,"astronaut");GameManager.save(state);');
  const reload=createGame(()=>.5,{storage:new Map(h.storage),fullStartup:true});
  assert.equal(reload.run('state.entities.chicken.skin'),'astronaut');
  assert.equal(reload.run('SkinSystem.power(state.entities.chicken).landSpeed'),1.15);
  const fresh=createGame();
  assert.equal(fresh.run('SkinSystem.equip(state,"astronaut")'),false);
  assert.equal(fresh.run('SkinSystem.power(state.entities.chicken).landSpeed'),1);
  for(const skin of ['missing','toString','__proto__'])
    assert.equal(fresh.run(`SkinSystem.power({skin:'${skin}'}).landSpeed`),1);
});
