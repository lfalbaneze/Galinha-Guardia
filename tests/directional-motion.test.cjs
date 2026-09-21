const test=require('node:test'),assert=require('node:assert/strict'),{createGame}=require('./helpers.cjs');

test('art follows all eight velocity headings and preserves the last diagonal when stopped',()=>{
  const {run}=createGame();
  const expected=['right','downright','down','downleft','left','upleft','up','upright'];
  expected.forEach((direction,i)=>assert.equal(run(`CharacterArt.directionFor('down',Math.cos(${i}*Math.PI/4),Math.sin(${i}*Math.PI/4))`),direction));
  run("const actor={direction:'right',vx:20,vy:20};CharacterArt.heading(actor)");
  assert.equal(run('CharacterArt.heading(actor)'),'downright');
  run('actor.vx=0;actor.vy=0');assert.equal(run('CharacterArt.heading(actor)'),'downright');
  assert.equal(run("CharacterArt.directionFor('right',1,Math.tan(Math.PI/8+.02))"),'right');
  assert.equal(run("CharacterArt.directionFor('right',1,Math.tan(Math.PI/8+.12))"),'downright');
});
test('direction stays stable around diagonals, but clear turns and reversals respond immediately',()=>{
  const {run}=createGame();
  run(`const animal=state.entities.animals.find(a=>a.species==='cow');animal.direction='right';`);
  for(const [x,y] of [[1,.95],[.98,1],[1,.98],[.96,1]]) {
    run(`Player.face(animal,${x},${y})`);assert.equal(run('animal.direction'),'right');
  }
  run('Player.face(animal,0,1);');assert.equal(run('animal.direction'),'down');
  for(const x of [.95,1.05,.97]) {run(`Player.face(animal,${x},1)`);assert.equal(run('animal.direction'),'down');}
  for(const [x,y,direction] of [[-1,0,'left'],[1,0,'right'],[0,-1,'up'],[0,1,'down']]) {
    run(`Player.face(animal,${x},${y})`);assert.equal(run('animal.direction'),direction);
  }
  run('const before=JSON.stringify([animal.x,animal.y]);Player.face(animal,0,0);');
  assert.equal(run('animal.direction'),'down');
  assert.equal(run('JSON.stringify([animal.x,animal.y])'),run('before'));
});
