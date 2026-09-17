const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
test('three dodges complete real shore encounters on three farms at every difficulty',()=>{
const h=createGame(()=>.5);
for(const seed of [0,52,814237])for(const difficulty of ['easy','normal','hard']) {
  h.context.auditSeed=seed;h.context.auditDifficulty=difficulty;
  const result=h.run(`(()=>{
    difficultySelect.value=auditDifficulty;resetGame(auditSeed);state.phase='playing';
    const g=state.entities.goose,c=state.entities.chicken;
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
    Object.assign(c,provoke);if(!LakeChallenge.start(state))return {error:'start'};
    let goal=provoke,route=[],dodging=false,hits=0,steps=0,previousHit=false;
    for(;steps<2400&&!state.lake.completed;steps++) {
      const dt=.05;
      if(g.mode==='warning'&&!dodging) {
        const dx=g.target.x-g.anchor.x,dy=g.target.y-g.anchor.y,len=Math.hypot(dx,dy)||1;
        const escapes=[-1,1].flatMap(side=>[85,110].map(r=>({x:c.x-dy/len*r*side,y:c.y+dx/len*r*side})))
          .filter(p=>distance(p,g.home)<290&&free(c,p));
        if(!escapes.length)return {error:'no dodge point',misses:state.lake.misses,goose:{x:g.x,y:g.y},player:{x:c.x,y:c.y}};
        goal=escapes[0];route=[goal];dodging=true;
      }else if(!['warning','charge'].includes(g.mode)&&dodging) {dodging=false;goal=provoke;route=[];}
      if(!dodging&&distance(c,goal)>3&&!route.length)route=WolfAI.findPath(c,goal);
      if(route.length) {
        const p=route[0],dx=p.x-c.x,dy=p.y-c.y,len=Math.hypot(dx,dy);
        if(len<2)route.shift();else {const travel=Math.min(len,c.speed*dt);Player.move(c,dx/len*travel,dy/len*travel);}
      }
      c.invulnerable=Math.max(0,c.invulnerable-dt);
      GooseSystem.update(state,dt);LakeChallenge.update(state,dt);
      if(g.chargeHit&&!previousHit)hits++;previousHit=!!g.chargeHit;
      if(!state.lake.active&&!state.lake.completed)return {error:'cancelled'};
      if(!free(c,c)||!WildlifeRules.clear(g,g,g.hitbox))return {error:'collision'};
    }
    return {completed:state.lake.completed,misses:state.lake.misses,seconds:steps*.05,hits,mode:g.mode};
  })()`);
  assert.equal(result.completed,true,JSON.stringify({seed,difficulty,...result}));
  assert.equal(result.misses,3);assert.equal(result.hits,0);assert.ok(result.seconds<40);
  assert.equal(h.run('state.lives'),3);
}

});
