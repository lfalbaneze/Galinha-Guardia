const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
function arena(difficulty='normal'){
  const h=createGame();h.run(`OBSTACLES=[];state.difficultyKey=${JSON.stringify(difficulty)};
    var c=state.entities.chicken,e=state.entities.folklore.find(e=>e.species==='fuinha');
    Object.assign(c,{x:1230,y:800,hidden:false,invulnerable:0});
    Object.assign(e,{x:1000,y:800,home:{x:1000,y:800},active:true,mode:'patrol',timer:99,grace:0,route:[],routeTimer:0});
    state.entities.folklore=[e];state.entities.thor=null;state.lake.active=false;state.rescuedCount=3;`);return h;
}
test('folklore enemies investigate only their last visible sighting when the player hides',()=>{
  const h=arena();h.run('FolkloreSystem.update(state,.05);var sighting={...e.lastSeen},lost={x:e.x,y:e.y};c.hidden=true;c.y=970;');
  const start=h.run('e.x');h.run('for(let i=0;i<10;i++)FolkloreSystem.update(state,.05)');
  assert.equal(h.run('JSON.stringify(e.lastSeen)===JSON.stringify(sighting)'),true);
  assert.ok(h.run('e.x')>start);assert.ok(h.run('distance(e,sighting)<distance(lost,sighting)'));
  assert.ok(h.run('Math.abs((e.x-lost.x)*(sighting.y-lost.y)-(e.y-lost.y)*(sighting.x-lost.x))<.0001'));
  assert.equal(h.run('e.mode'),'hunt');
  h.run('for(let i=0;i<180;i++)FolkloreSystem.update(state,.05)');
  assert.equal(h.run('e.mode'),'patrol');assert.ok(h.run('distance(e,e.home)<5'));
});
test('folklore difficulty changes reaction windows without removing the warning',()=>{
  const warnings=[];
  for(const difficulty of ['easy','normal','hard','hardcore']){
    const h=arena(difficulty);h.run('c.x=1140;e.timer=0;FolkloreSystem.update(state,.05)');
    assert.equal(h.run('e.mode'),'warning');warnings.push(h.run('e.timer'));
    h.run('var aim=JSON.stringify(e.target);c.y+=100;FolkloreSystem.update(state,.05)');
    assert.ok(h.run('JSON.stringify(e.target)===aim'));
  }
  assert.ok(warnings.every(n=>n>=.6));
  assert.ok(warnings[0]>warnings[1]&&warnings[1]>warnings[2]&&warnings[2]>warnings[3]);
});
test('crossing the refuge gate cancels attacks and memory, including its inner rim',()=>{
  const h=arena();h.run(`Object.assign(c,{x:340,y:400});
    Object.assign(e,{x:365,y:400,home:{x:500,y:400},mode:'attack',timer:.8,
      target:{x:320,y:400},lastSeen:{x:340,y:400},memory:2});
    state.folkloreThreats=[{x:340,y:400,kind:'fire',species:'boitata',arm:0,life:2,vx:0,vy:0,r:30}];
    FolkloreSystem.update(state,.05);`);
  assert.equal(h.run('FarmRefuge.contains(c)'),true);
  assert.equal(h.run('state.lives'),3);assert.equal(h.run('e.mode'),'return');
  assert.equal(h.run('e.memory'),0);assert.equal(h.run('e.lastSeen'),undefined);
});
