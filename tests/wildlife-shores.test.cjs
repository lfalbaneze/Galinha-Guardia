const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
const {playChallenge}=require('./panto-driver.cjs');
test('three dodge-and-counter rounds complete real shore encounters on three farms at every difficulty',()=>{
const h=createGame(()=>.5);
for(const seed of [0,52,814237])for(const difficulty of ['easy','normal','hard']) {
  h.context.auditSeed=seed;h.context.auditDifficulty=difficulty;
  const started=h.run(`difficultySelect.value=auditDifficulty;resetGame(auditSeed);state.phase='playing';
    var g=state.entities.goose,c=state.entities.chicken;
    (()=>{
    const free=(a,b)=>WildlifeRules.clear(a,b,c.hitbox);
    const candidates=[];
    for(let a=0;a<16;a++)for(const r of [90,110]) {
      const angle=a*Math.PI/8,p={x:g.home.x+Math.cos(angle)*r,y:g.home.y+Math.sin(angle)*r};
      if(free(p,p)&&WildlifeRules.clear(g,p,g.hitbox))candidates.push(p);
    }
    const provoke=candidates.find(p=>[-1,1].some(side=>{
      const dx=p.x-g.x,dy=p.y-g.y,len=Math.hypot(dx,dy);
      const q={x:p.x-dy/len*side*90,y:p.y+dx/len*side*90};
      return distance(q,g.home)<280&&free(p,q);
    }));
    if(!provoke)return {error:'no provoking point'};
    Object.assign(c,provoke);return LakeChallenge.start(state);
  })()`);
  assert.equal(started,true,`start ${seed}/${difficulty}: ${JSON.stringify(started)}`);
  playChallenge(h,800);
  const result=h.run(`({completed:state.lake.completed,misses:state.lake.misses,
    seconds:challengeFrames*.05,hits:state.lake.attempts,mode:g.mode,counters:counterPresses,clear:challengeClear})`);
  assert.equal(result.completed,true,JSON.stringify({seed,difficulty,...result}));
  assert.equal(result.misses,3);assert.equal(result.counters,3);assert.equal(result.hits,0);
  assert.ok(result.seconds<40);assert.equal(result.clear,true,`collision ${seed}/${difficulty}`);
  assert.equal(h.run('seenTactics.has("double") && seenTactics.has("rush")'),true);
  assert.equal(h.run('state.lives'),3);
}

});
