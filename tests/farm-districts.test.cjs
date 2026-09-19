const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

test('100 new farms have complete useful districts, unbroken beds and clear crop canopies', () => {
  const game = createGame(() => .5);
  for(let seed=0;seed<100;seed++) {
    game.run(`resetGame(${seed});var layout=WORLD.layout;var props=FarmArt.getProps(layout);`);
    const result=game.run(`(()=>{
      const plots=layout.plots, overlap=FarmDetails.overlaps;
      return {
        version:layout.version,
        corn:plots.some(p=>p.kind==='corn'&&p.areaId==='granja'),
        garden:plots.some(p=>p.kind==='garden'&&p.areaId==='horta'),
        yard:plots.some(p=>p.kind==='pasture'&&p.areaId==='estabulo'),
        roads:plots.every(p=>!WORLD.paths.some(r=>overlap(p,r,24))),
        scenery:plots.every(p=>!props.filter(q=>['tree','bush','coop','silo','stable','hay'].includes(q.type))
          .some(q=>overlap(p,FarmDetails.shape(q)))),
        rows:plots.filter(p=>p.kind!=='pasture').every(p=>{
          const crops=layout.decorations.filter(d=>d.plotId===p.id);
          const ys=[...new Set(crops.map(c=>c.y))];
          const rows=ys.map(y=>crops.filter(c=>c.y===y).map(c=>c.x).sort((a,b)=>a-b));
          return rows.length>=3&&rows.every(r=>r.length>=6&&r.every((x,i)=>!i||x-r[i-1]===32))&&
            rows.every(r=>JSON.stringify(r)===JSON.stringify(rows[0]));
        }),
        coops:STRUCTURES.coops.length===1&&STRUCTURES.coops.every(p=>p.areaId==='granja'),
        hay:STRUCTURES.hayBales.length===1&&STRUCTURES.hayBales[0].areaId==='estabulo',
        animals:state.entities.animals.filter(a=>a.areaId==='estabulo').map(a=>a.species).sort().join(','),
        fox:state.entities.foxes.length>=1,
        accents:layout.decorations.every(d=>d.plotId||d.groupId),
        access:layout.entrances.length===STRUCTURES.coops.length+STRUCTURES.silos.length+STRUCTURES.stables.length+plots.length+2,
        clearLanes:props.filter(p=>['tree','bush'].includes(p.type)).every(p=>
          [...layout.paths,...layout.lanes].every(r=>!overlap(FarmDetails.shape(p),r))),
        fronts:props.filter(p=>['tree','bush'].includes(p.type)).every(p=>
          props.filter(q=>['coop','stable','silo','hay','barn'].includes(q.type)).every(q=>!overlap(FarmDetails.shape(p),FarmDetails.shape(q)))),
        livestock:layout.animalSpawns.filter(a=>a.areaId==='estabulo').every(a=>{
          const yard=plots.find(p=>p.kind==='pasture');return a.x>yard.x&&a.x<yard.x+yard.w&&a.y>yard.y&&a.y<yard.y+yard.h;
        }),
        signs:props.filter(p=>p.type==='sign').length,
        labels:props.filter(p=>p.type==='sign').every(sign=>{
          const target=sign.areaId==='quintal' ? props.filter(p=>p.type==='tree'&&p.areaId==='quintal'&&(!p.art||p.art==='tree')).map(FarmDetails.shape) :
            plots.filter(p=>p.areaId===sign.areaId&&p.kind===({granja:'corn',estabulo:'pasture',horta:'garden'}[sign.areaId]));
          const gap=box=>Math.hypot(Math.max(box.x-sign.x-sign.w,sign.x-box.x-box.w,0),
            Math.max(box.y-sign.y-sign.h,sign.y-box.y-box.h,0));
          return target.some(p=>gap(p)<=112)&&
            [...layout.paths,...layout.lanes,...layout.clearings].every(p=>!overlap(sign,p,12));
        })
      };
    })()`);
    assert.equal(result.version,7);
    for(const key of ['corn','garden','yard','roads','scenery','rows','coops','hay','fox','accents','access','clearLanes','fronts','livestock','labels'])
      assert.equal(result[key],true,`${seed}: ${key}`);
    assert.equal(result.animals,'cow,goat,horse',`${seed}: livestock`);
    assert.equal(result.signs,4,`${seed}: signs`);
  }
});

test('curral gates can be crossed while rails stop movement and cattle remain reachable', () => {
  const game=createGame(() => .5);
  for(let seed=0;seed<30;seed++) {
    game.run(`resetGame(${seed});var yard=WORLD.layout.plots.find(p=>p.kind==='pasture');`);
    assert.equal(game.run(`(()=>{
      const box={ox:0,oy:0,r:21},x=yard.x+yard.w/2;
      return WildlifeRules.clear({x,y:yard.y-28},{x,y:yard.y+yard.h+28},box)&&
        !WildlifeRules.clear({x:yard.x-28,y:yard.y+yard.h/2},{x:yard.x+28,y:yard.y+yard.h/2},box)&&
        state.entities.animals.filter(a=>a.areaId==='estabulo').every(a=>WildlifeRules.clear(a,a,a.hitbox));
    })()`),true,`gate/collision ${seed}`);
  }
});

test('waiting and warning foxes participate in the actual render before the dash', () => {
  const game=createGame(() => .5);
  game.run(`var drawn=[];FoxArt.draw=(_c,f)=>{drawn.push(f.mode);return true;};`);
  for(const mode of ['hidden','warning','dash']) {
    game.run(`drawn=[];state.entities.foxes[0].mode='${mode}';renderGame();`);
    assert.equal(game.run(`drawn.includes('${mode}')`),true,mode);
  }
});

test('loading a historical farm upgrades the scenery while retaining progress', () => {
  const game=createGame(() => .5);
  assert.ok(game.run("OBSTACLES.some(o=>o.type==='paddock-fence')"));
  game.run('resetGame(814237,2);GameManager.rescue(state,state.entities.animals[2]);GameManager.save(state)');
  const loaded=createGame(() => .5,{storage:new Map(game.storage),fullStartup:true});
  assert.equal(loaded.run('state.worldVersion'),7);
  assert.equal(loaded.run('STRUCTURES.coops.length'),1);
  assert.equal(loaded.run('state.rescuedIds.has("animal_2")'),true);
  assert.ok(loaded.storage.has('galinha-guardia-save-before-map-7'));
});
