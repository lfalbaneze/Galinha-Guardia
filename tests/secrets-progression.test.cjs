const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

function secretArena(options={}) {
  const h=createGame(() => .5,options);
  h.run(`resetGame(814237); OBSTACLES=[];
    const chicken=state.entities.chicken, chick=state.entities.chicks[0];
    Object.assign(chick,{x:600,y:400,targetX:600,targetY:400,coverId:null});
    Object.assign(chicken,{x:560,y:400,moving:false,sprinting:false});`);
  return h;
}

test('a local clue guides the player from farther away without revealing the secret', () => {
  const { run, elements } = secretArena();
  run(`chicken.x=420; const labels=[];ctx.fillText=text=>labels.push(text); renderGame();`);
  assert.equal(run('RescueSystem.secretHint(state)===chick'), true);
  assert.equal(run('labels.includes("Chegue de mansinho")'), true);
  assert.equal(elements.get('chickCounter').hidden, false);
  assert.equal(run('RescueSystem.isSecret(chick)'), true);
  run(`chicken.x=560;labels.length=0;renderGame();`);
  assert.equal(run('labels.includes("Segure C · investigar")'), true);
  run('chicken.x=400;');
  assert.equal(run('RescueSystem.secretHint(state)'), null);
});

test('all six cover bonuses can be investigated in actual generated farms', () => {
  const { run } = createGame(() => .5);
  for (const version of [1, 2]) for (const seed of [0, 814237, 391602]) {
    run(`resetGame(${seed},${version}); state.entities.wolf.huntUnlockTimer=100;`);
    for (let i = 0; i < 6; i++) {
      run(`Object.assign(state.entities.chicken,{x:state.entities.chicks[${i}].x,
        y:state.entities.chicks[${i}].y,sprinting:false,hidden:false});`);
      assert.equal(run(`RescueSystem.secretHint(state)===state.entities.chicks[${i}]`), true);
      run(`HidingSpots.toggle(state); input.add('c');`);
      assert.equal(run('state.entities.chicken.hidden'), true);
      run('for(let step=0;step<17;step++)RescueSystem.update(state,.05);');
      assert.equal(run(`state.entities.chicks[${i}].discovered`), true);
      run('RescueSystem.update(state,.016);');
      assert.equal(run('state.rescuedChicks'), i + 1);
    }
    assert.equal(run('state.rescuedChickIds.size'), 6);
  }
});

test('every friend rescue increases actual wolf pressure in all difficulties and chick totals', () => {
  const {run}=createGame(() => .5);
  for (const mode of ['easy','normal','hard']) for(let chicks=0;chicks<=6;chicks++) {
    run(`difficultySelect.value='${mode}';resetGame(814237);
      for(const c of state.entities.chicks.slice(0,${chicks}))GameManager.rescue(state,Object.assign(c,{discovered:true}));`);
    let prior=JSON.parse(run('JSON.stringify(WolfAI.getConfig(state))'));
    for(let friend=0;friend<10;friend++) {
      run(`GameManager.rescue(state,state.entities.animals[${friend}]);`);
      const next=JSON.parse(run('JSON.stringify(WolfAI.getConfig(state))'));
      for(const key of ['speed','range','searchDuration','fov','pressure'])
        assert.ok(next[key]>prior[key],`${mode}, ${chicks} chicks, friend ${friend+1}: ${key} must increase`);
      assert.ok(next.awarenessTime<prior.awarenessTime);
      assert.ok(next.speed<run('state.settings.chickenSpeed*Player.sprintMultiplier'));
      prior=next;
    }
    const before=run('JSON.stringify(WolfAI.getConfig(state))');
    assert.equal(run('GameManager.rescue(state,state.entities.animals[0])'),false);
    assert.equal(run('JSON.stringify(WolfAI.getConfig(state))'),before);
  }
});

test('the chick objective and wardrobe requirements are explained before the first discovery', () => {
  const {run,elements}=secretArena();
  for(const phase of ['playing','menu','lose']) {
    run(`state.phase='${phase}';GameUI.update(state);`);
    assert.equal(elements.get('chickCounter').hidden,false);
    assert.match(elements.get('wardrobeNote').textContent,/6 pintinhos.*escondem.*E.*C/);
    for(const id of ['skin-punk','menu-skin-punk'])
      assert.match(elements.get(id).textContent,/2 pintinhos/);
    assert.equal(run('state.entities.chicks.every(c=>RescueSystem.isSecret(c))'),true);
  }
});

test('running over a secret cannot reveal or rescue it, including direct rescue requests', () => {
  const {run}=secretArena();
  run(`Object.assign(chicken,{x:600,y:400,sprinting:true,moving:true});
    for(let i=0;i<30;i++)RescueSystem.update(state,.05);`);
  assert.equal(run('!!chick.discovered'),false);
  assert.equal(run('chick.x'),600);
  assert.equal(run('chick.y'),400);
  assert.equal(run('state.rescuedChicks'),0);
  assert.equal(run('GameManager.rescue(state,chick)'),false);
  assert.equal(run('RescueSystem.visible(state,chick)'),false);
});

test('legacy unbound secrets retain their old investigation and contact interaction', () => {
  const {run,elements}=secretArena();
  run(`input.add('c');for(let i=0;i<16;i++){Player.update(state,.05);RescueSystem.update(state,.05);}`);
  assert.equal(run('!!chick.discovered'),false);
  run('RescueSystem.update(state,.05);');
  assert.equal(run('chick.discovered'),true);
  assert.equal(run('state.rescuedChicks'),0);
  assert.equal(elements.get('chickCounter').hidden,false);
  assert.match(elements.get('skin-punk').textContent,/pintinhos/);
  run('Player.update(state,.05);RescueSystem.update(state,.05);');
  assert.equal(run('chick.temper'),'idle','holding C must remain quiet after finding the chick');
  run('chicken.x=chick.x;chicken.y=chick.y;RescueSystem.update(state,.016);');
  assert.equal(run('state.rescuedChicks'),1);
});

test('walls, distance, movement without C, pauses and zero-time updates cannot investigate', () => {
  const {run}=secretArena();
  run('for(let i=0;i<30;i++)RescueSystem.update(state,.05);');
  assert.equal(run('!!chick.discovered'),false);
  run(`input.add('c');OBSTACLES=[{x:577,y:300,w:4,h:200}];
    for(let i=0;i<30;i++)RescueSystem.update(state,.05);`);
  assert.equal(run('RescueSystem.secretHint(state)'),null);
  assert.equal(run('!!chick.discovered'),false);
  run(`OBSTACLES=[];chicken.x=490;for(let i=0;i<30;i++)RescueSystem.update(state,.05);`);
  assert.equal(run('!!chick.discovered'),false);
  run(`chicken.x=560;for(let i=0;i<30;i++)RescueSystem.update(state,0);
    state.phase='menu';for(let i=0;i<30;i++)RescueSystem.update(state,.05);`);
  assert.equal(run('!!chick.discovered'),false);
});

test('legacy discovery without capture persists and leaves other secrets hidden on reload', () => {
  const {run,storage}=secretArena();
  run(`input.add('c');for(let i=0;i<17;i++)RescueSystem.update(state,.05);`);
  const loaded=createGame(() => .5,{storage:new Map(storage),fullStartup:true});
  assert.equal(loaded.run('state.rescuedChicks'),0);
  assert.equal(loaded.run('state.entities.chicks[0].discovered'),true);
  assert.equal(loaded.run('!!state.entities.chicks[1].discovered'),false);
  assert.equal(loaded.elements.get('chickCounter').hidden,false);
  loaded.run('resetGame(814237);GameUI.update(state);');
  assert.equal(loaded.elements.get('chickCounter').hidden,false);
  assert.equal(loaded.run('state.entities.chicks.every(c=>RescueSystem.isSecret(c))'),true);
});

test('secret sprites and hearts are absent until discovered', () => {
  const draws=[];
  const context=new Proxy({canvas:{width:900,height:520}}, {
    get:(o,k)=>o[k]??((...args)=>{draws.push([k,...args]);return {addColorStop(){},width:20};}),
    set:(o,k,v)=>(o[k]=v,true)
  });
  const {run}=secretArena({drawingContext:context});
  draws.length=0;run('drawAnimal(chick);');
  assert.equal(draws.length,0);
  run('chick.discovered=true;drawAnimal(chick);');
  assert.ok(draws.length>0);
});

test('the nearby piu is audible, spaced out and respects a wall', () => {
  const {run}=secretArena();
  run(`const sounds=[];AudioSystem.playAnimal=(name,options)=>{if(name==='chick')sounds.push({name,...options});};
    RescueSystem.update(state,.05);for(let i=0;i<20;i++)RescueSystem.update(state,.05);`);
  assert.equal(run('sounds.length'),1);
  assert.equal(run('sounds[0].name'),'chick');
  assert.ok(run('sounds[0].volume') >= .4);
  run(`OBSTACLES=[{x:577,y:300,w:4,h:200}];for(let i=0;i<110;i++)RescueSystem.update(state,.05);`);
  assert.equal(run('sounds.length'),1);
});

test('saving and reloading preserves pressure without adding another difficulty increment', () => {
  const {run,storage}=createGame(() => .5);
  run(`for(const a of state.entities.animals.slice(0,5))GameManager.rescue(state,a);
    GameManager.save(state);`);
  const before=run('JSON.stringify(WolfAI.getConfig(state))');
  const loaded=createGame(() => .5,{storage:new Map(storage),fullStartup:true});
  assert.equal(loaded.run('JSON.stringify(WolfAI.getConfig(state))'),before);
});
