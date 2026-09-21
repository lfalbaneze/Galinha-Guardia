const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
const plain=x=>JSON.parse(JSON.stringify(x));
test('all twelve friends have unique names and the rescued rabbit is Jay Jay, not playable Pipoca',()=>{
 const h=createGame();
 const names=plain(h.run('state.entities.animals.map(a=>RescueSystem.nameOf(a,state))'));
 assert.equal(names.length,12);assert.equal(new Set(names).size,12);
 assert.equal(h.run('RescueSystem.nameOf(state.entities.animals.find(a=>a.species==="rabbit"),state)'),'Jay Jay');
 assert.equal(h.run('RescueSystem.nameOf({type:"chicken",skin:"astronaut"})'),'Pipoca');
 assert.equal(h.run('RescueSystem.nameOf({type:"chicken",skin:"classic"})'),'Erina');
});
test('all ten chicks keep individual names across difficulty, reorder and save/restore',()=>{
 const h=createGame();const six=plain(h.run('state.entities.chicks.map(a=>RescueSystem.nameOf(a,state))'));
 h.run('difficultySelect.value="hardcore";resetGame(52)');
 const ten=plain(h.run('state.entities.chicks.map(a=>RescueSystem.nameOf(a,state))'));
 assert.equal(ten.length,10);assert.equal(new Set(ten).size,10);assert.deepEqual(ten.slice(0,6),six);
 h.run('GameManager.save(state);var saved=GameManager.read();GameManager.restore(state,saved)');
 assert.deepEqual(plain(h.run('state.entities.chicks.map(a=>RescueSystem.nameOf(a,state))')),ten);
 h.run('state.entities.chicks.reverse()');
 assert.deepEqual(plain(h.run('state.entities.chicks.map(a=>RescueSystem.nameOf(a,state))')),ten.slice().reverse());
});
test('legacy farms still identify the rabbit by species, not its spawn slot',()=>{
 const h=createGame();for(const v of [1,2,7]){
  h.run(`resetGame(52,${v})`);
  assert.equal(h.run('RescueSystem.nameOf(state.entities.animals.find(a=>a.species==="rabbit"),state)'),'Jay Jay');
 }
});
test('Jay Jay rescue and chick discovery show the correct name without changing rewards',()=>{
 const h=createGame();
 h.run('OBSTACLES=[];var rabbit=state.entities.animals.find(a=>a.species==="rabbit");Object.assign(state.entities.chicken,{x:rabbit.x,y:rabbit.y});RescueSystem.update(state,0)');
 assert.equal(h.run('state.rescueNotice.name'),'Jay Jay');assert.equal(h.run('state.score'),100);
 assert.match(h.elements.get('statusText').textContent,/Jay Jay/);
 h.run('var chick=state.entities.chicks[0];chick.coverId=null;Object.assign(state.entities.chicken,{x:chick.x,y:chick.y});RescueSystem.callChick(state)');
 assert.equal(h.run('state.secretNotice.name'),'Pingo');assert.equal(h.run('state.rescuedChicks'),1);
 assert.match(h.elements.get('statusText').textContent,/Pingo/);
});
test('names and speech headers stay local and never reveal hidden chicks or actors through walls',()=>{
 const h=createGame();
 h.run(`OBSTACLES=[];camera.x=0;camera.y=0;var labels=[];ctx.fillText=t=>labels.push(t);ctx.strokeText=()=>{};ctx.measureText=t=>({width:String(t).length*7});
  for(const a of RescueSystem.all(state))Object.assign(a,{x:2200,y:1500});
  var rabbit=state.entities.animals.find(a=>a.species==='rabbit');Object.assign(rabbit,{x:500,y:390,speechTime:0});
  Object.assign(state.entities.chicken,{x:420,y:390});Object.assign(state.entities.wolf,{x:2500,y:1500,mode:'patrol'});
  var chick=state.entities.chicks[0];Object.assign(chick,{x:600,y:390,discovered:false});GameUI.render(state);`);
 assert.ok(h.run('labels.includes("Jay Jay")'));assert.equal(h.run('labels.includes("Pingo")'),false);
 h.run('labels=[];rabbit.speechTime=2;rabbit.speech=RescueSystem.stealthLines[0];GameUI.render(state)');
 assert.equal(h.run('labels.filter(x=>x==="Jay Jay").length'),1);assert.ok(h.run('labels.includes(RescueSystem.stealthLines[0])'));
 h.run('labels=[];rabbit.speechTime=0;chick.discovered=true;GameUI.render(state)');assert.ok(h.run('labels.includes("Pingo")'));
 h.run('labels=[];OBSTACLES=[{x:460,y:0,w:10,h:500,type:"wall"}];GameUI.render(state)');assert.equal(h.run('labels.includes("Jay Jay")'),false);
});
test('existing named characters stay unchanged; both owls and all crows get identities',()=>{
 const h=createGame();
 assert.equal(h.run('RescueSystem.nameOf(state.entities.goose,state)'),'Panto');
 assert.equal(h.run('RescueSystem.nameOf({type:"thor"})'),'Thor');
 assert.deepEqual(plain(h.run('state.entities.foxes.map(a=>RescueSystem.nameOf(a,state))')),['Lorenzo','Amanda']);
 assert.deepEqual(plain(h.run('state.entities.owls.map(a=>RescueSystem.nameOf(a,state))')),['Aurora','Olívia']);
 assert.deepEqual(plain(h.run('state.scarecrow.birds.map((_,i)=>RescueSystem.nameOf({type:"crow",id:`crow_${i}`}))')),['Tico','Teco','Cacá']);
 assert.equal(h.run('RescueSystem.nameOf(state.entities.wolf,state)'),'Baltazar');
});
test('name lookup never consumes random numbers or changes species, physics or save IDs',()=>{
 const h=createGame();
 h.run('var before=JSON.stringify(state);var oldRandom=Math.random;Math.random=()=>{throw Error("RNG")};for(const a of RescueSystem.all(state))RescueSystem.nameOf(a,state);Math.random=oldRandom');
 assert.equal(h.run('JSON.stringify(state)'),h.run('before'));
});
