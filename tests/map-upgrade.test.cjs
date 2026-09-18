const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
const SAVE='galinha-guardia-save-v1',BACKUP='galinha-guardia-save-before-map-5';
test('Continuar upgrades every old map without losing the screenshot progress, health or bonus unlocks',()=>{
  for(const version of [1,2,3,4]){
    const old=createGame(()=>.5);
    old.run(`resetGame(814237,${version});
      GameManager.rescue(state,state.entities.animals[0]);GameManager.rescue(state,state.entities.animals[3]);
      for(const c of state.entities.chicks.slice(0,2))GameManager.rescue(state,Object.assign(c,{discovered:true}));
      state.entities.chicks[3].discovered=true;state.lives=2;state.elapsed=137;
      state.lake.completed=true;state.lake.misses=3;state.thorVisit.nextIn=47;GameManager.save(state);`);
    const legacy=JSON.parse(old.storage.get(SAVE));
    const h=createGame(()=>.5,{fullStartup:true,storage:new Map(old.storage)});
    assert.equal(h.run('state.worldVersion'),5);
    for(const [key,value] of [['rescuedCount',2],['rescuedChicks',2],['lives',2],['score',400],['elapsed',137]])
      assert.equal(h.run(`state.${key}`),value,`v${version}: ${key}`);
    assert.equal(h.run('state.lake.completed'),true);assert.equal(h.run('state.thorVisit.nextIn'),47);
    assert.equal(h.run('state.entities.chicks[3].discovered'),true);
    assert.equal(h.run('STRUCTURES.coops.length'),1);
    assert.ok(h.run(`!STRUCTURES.coops.some(p=>p.areaId==='poleiro') && STRUCTURES.hayBales.length===1 &&
      STRUCTURES.hayBales.every(p=>p.areaId==='estabulo')`));
    assert.ok(h.run(`state.entities.animals.every(a=>WildlifeRules.clear(a,a,a.hitbox)) &&
      state.entities.chicks.every(a=>WildlifeRules.clear(a,a,a.hitbox))`));
    assert.deepEqual(JSON.parse(h.storage.get(BACKUP)).rescuedIds,legacy.rescuedIds);
    assert.equal(JSON.parse(h.storage.get(SAVE)).worldVersion,5);
    const clean=h.run('JSON.stringify(WORLD.layout)'),backup=h.storage.get(BACKUP);
    const again=createGame(()=>.5,{fullStartup:true,storage:new Map(h.storage)});
    assert.equal(again.run('JSON.stringify(WORLD.layout)'),clean);
    assert.equal(again.run('state.score'),400);assert.equal(again.storage.get(BACKUP),backup);
  }
});
test('removed props leave no collider, worn doorway, or dead-end path at the farm entrance',()=>{
  const h=createGame(()=>.5);
  for(const seed of [0,52,814237,4294967295]){
    h.run(`resetGame(${seed},4);var oldCoop=STRUCTURES.coops.find(p=>p.areaId==='poleiro');resetGame(${seed});`);
    assert.ok(h.run(`!OBSTACLES.some(p=>p.x===oldCoop.x&&p.y===oldCoop.y) &&
      !FarmArt.getProps(WORLD.layout).some(p=>p.type==='coop'&&p.areaId==='poleiro') &&
      !WORLD.layout.clearings.some(p=>p.x===oldCoop.x+oldCoop.w/2-26&&p.y===oldCoop.y+oldCoop.h-8)`));
    assert.ok(h.run(`WORLD.layout.lanes.every(l=>WORLD.layout.entrances.some(e=>e.id===l.entranceId))`));
  }
});
