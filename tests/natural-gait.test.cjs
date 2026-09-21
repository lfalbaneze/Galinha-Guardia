const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
const h=createGame(),art=h.run('CharacterArt');

test('every species gait follows distance and is independent of frame rate',()=>{
  for(const species of art.species) {
    const total=art.advance(0,species,100);
    for(const hz of [30,60,144]) {
      let phase=0;for(let i=0;i<hz*2;i++)phase=art.advance(phase,species,50/hz);
      assert.ok(Math.abs(phase-total)<1e-9,species);
    }
    assert.equal(art.advance(total,species,0),total,'standing still preserves foot phase');
  }
  assert.ok(art.advance(0,'horse',50)<art.advance(0,'dog',50));
  assert.ok(art.advance(0,'dog',50)<art.advance(0,'chick',50));
});

test('playable animal stride uses its own species and scales with movement',()=>{
  assert.equal(art.advance(0,'chicken',40,{skin:'priest'}),art.advance(0,'dog',40));
  assert.equal(art.advance(0,'chicken',80,{skin:'priest'}),2*art.advance(0,'dog',40));
});

test('full-speed gait retains its twelve phases without frantic seven-cycle repetition',()=>{
  for(const speed of [30,85,150,300,396]){
    const cycle=art.advance(0,'chicken',speed,{speed})/4;
    assert.ok(cycle<4,'cadence stays readable even when sprinting');
    for(const hz of [30,60,144]){
      let phase=0;for(let i=0;i<hz;i++)phase=art.advance(phase,'chicken',speed/hz,{speed});
      assert.ok(Math.abs(phase-cycle*4)<1e-9,'cadence is independent of frame rate');
    }
  }
});

test('front and back use separately drawn phases for the opposite half cycle',()=>{
  for(const species of art.species.filter(s=>s!=='goose'))for(const direction of ['down','up']) {
    const a=art.frameFor(species,{direction,moving:true,anim:0});
    const b=art.frameFor(species,{direction,moving:true,anim:2});
    assert.notEqual(a.frame.x,b.frame.x,species+'/'+direction); assert.equal(a.frame.src,b.frame.src);
  }
});

test('rescued animals keep their feet at their home instead of sliding in place',()=>{
  h.run(`GameManager.rescue(state,state.entities.animals[0]);
    const friend=state.entities.animals[0],home=RescueSystem.safePosition(0);
    for(let i=0;i<50;i++)RescueSystem.update(state,.05);`);
  assert.equal(h.run('distance(friend,home)'),0);
  assert.equal(h.run('friend.moving'),false);
});
