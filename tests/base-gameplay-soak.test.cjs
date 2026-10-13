const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

// Analog-stick input follows real collision-safe routes. The pilot knows all
// friend positions: these runs check simulation stability, not human win rates.
function installPilot(h) {
  h.run(`
    var controls={x:0,y:0};GameInput.vector=()=>controls;
    function steer(goal,sprint=false){
      const p=state.entities.chicken,dx=goal.x-p.x,dy=goal.y-p.y,len=Math.hypot(dx,dy)||1;
      controls={x:dx/len,y:dy/len};input.clear();if(sprint)input.add('shift');
    }
    function driveTo(goal,seconds=20){
      let route=[],repath=0;
      for(let tick=0;tick<seconds*20&&state.phase==='playing';tick++){
        const p=state.entities.chicken;if(distance(p,goal)<7)break;
        if(FarmRefuge.contains(p)&&goal.x>370)route=[{x:400,y:390}];
        else if((repath-=.05)<=0||!route.length){route=WolfAI.findPath(p,goal);repath=1;}
        while(route.length&&distance(p,route[0])<7)route.shift();
        steer(route[0]||goal);updateGame(.05);
      }
      controls={x:0,y:0};input.clear();
      return distance(state.entities.chicken,goal);
    }
    function simulationSnapshot(){return JSON.stringify({elapsed:state.elapsed,time:state.timeRemaining,
      hunger:state.wolfHunger,lives:state.lives,entities:state.entities,threats:state.folkloreThreats});}
  `);
}

for (const difficulty of ['easy','normal','hard','hardcore']) {
  test(`complete gameplay loop stays finite and progresses on real routes: ${difficulty}`, t => {
    const h = createGame(() => .5);
    h.run(`difficultySelect.value='${difficulty}';resetGame(814237);state.phase='playing';`);
    installPilot(h);
    const result = h.run(`
      var report={seconds:0,distance:0,damage:0,damageTimes:[],damageProtection:[],modes:new Set(),restFrames:0,
        failures:[],maxHunger:0,minStamina:1,maxStall:0,paused:false,restored:false};
      var route=[],target=null,repath=0,stall=0;
      for(let tick=0;tick<3600&&state.phase==='playing';tick++){
        const p=state.entities.chicken,before={x:p.x,y:p.y},lives=state.lives;
        if(ThorSystem.active(state)){ThorSystem.skip(state);continue;}
        if(!target||target.rescued){target=state.entities.animals.filter(a=>!a.rescued).sort((a,b)=>distance(a,p)-distance(b,p))[0];route=[];repath=0;}
        if(!target)break;
        if(FarmRefuge.contains(p))route=[{x:400,y:390}];
        else if((repath-=.05)<=0||!route.length){route=WolfAI.findPath(p,target);repath=1;}
        while(route.length&&distance(p,route[0])<9)route.shift();
        steer(route[0]||target,tick%200<65&&!(distance(p,target)<130&&target.restTime>1));
        updateGame(.05);
        const step=distance(p,before);report.seconds+=.05;
        if(state.phase==='playing')report.distance+=step; // The ending deliberately relocates the cast.
        if(lives>state.lives){report.damage+=lives-state.lives;report.damageTimes.push(report.seconds);report.damageProtection.push(p.invulnerable);}
        report.minStamina=Math.min(report.minStamina,p.stamina);report.maxHunger=Math.max(report.maxHunger,state.wolfHunger);
        stall=step<.1?stall+.05:0;report.maxStall=Math.max(report.maxStall,stall);
        for(const e of [state.entities.wolf,state.entities.goose,...state.entities.foxes,...state.entities.folklore])
          if(e)report.modes.add((e.species||e.id||'wolf')+':'+e.mode);
        for(const a of state.entities.animals){
          if(a.restTime>0&&!a.rescued)report.restFrames++;
          if(![a.x,a.y,a.vx,a.vy].every(Number.isFinite))report.failures.push('friend position '+a.id);
          if((a.restTime||0)<0||(a.fatigue||0)<0)report.failures.push('friend recovery '+a.id);
        }
        if(![p.x,p.y,p.stamina,state.wolfHunger].every(Number.isFinite)||p.stamina<0||p.stamina>1||state.wolfHunger<0||state.wolfHunger>1)
          report.failures.push('player resource bounds');
        if(state.lives<0||state.rescuedCount!==state.rescuedIds.size)report.failures.push('run accounting');
        if(!report.paused&&state.rescuedCount>=4&&state.phase==='playing'){
          GameUI.showMenu(state);const frozen=simulationSnapshot();
          for(let i=0;i<300;i++)updateGame(.05);
          if(simulationSnapshot()!==frozen)report.failures.push('simulation advanced during pause');
          state.phase=state.resumePhase;report.paused=true;
        }
        if(!report.restored&&state.rescuedCount>=6&&state.phase==='playing'){
          GameManager.save(state);const saved=GameManager.read();
          if(!saved)report.failures.push('unreadable save');
          else {
            GameManager.restore(state,saved);
            if(state.rescuedCount!==saved.rescuedIds.length||state.lives!==saved.lives||state.score!==saved.score||
              state.elapsed!==saved.elapsed||state.timeRemaining!==saved.timeRemaining||state.entities.chicken.stamina!==saved.chicken.stamina)
              report.failures.push('save changed progress or resources');
          }
          route=[];repath=0;report.restored=true;
        }
      }
      ({...report,modes:[...report.modes],phase:state.phase,lives:state.lives,rescues:state.rescuedCount,time:state.timeRemaining})
    `);
    assert.deepEqual(Array.from(result.failures),[]);
    assert.ok(result.paused && result.restored,'crossed pause and save/load mid-adventure');
    assert.ok(result.rescues>=8,`pilot stalled before reaching most friends: ${JSON.stringify(result)}`);
    assert.ok(result.distance>5000,'crossed multiple real farm areas');
    assert.ok(result.maxStall<3,`route stuck for ${result.maxStall}s`);
    assert.equal(result.minStamina,0,'sprint exhaustion exercised');
    assert.ok(result.restFrames>0,'friend fatigue/recovery exercised');
    assert.ok(result.maxHunger>0 && result.maxHunger<=1);
    assert.ok(['win_cutscene','lose'].includes(result.phase),'adventure reached a valid terminal transition');
    if(result.phase==='win_cutscene')assert.equal(result.rescues,12);
    else assert.ok(result.lives===0||result.time===0,'defeat has an actual cause');
    for(let i=1;i<result.damageTimes.length;i++)
      assert.ok(result.damageTimes[i]-result.damageTimes[i-1]>=result.damageProtection[i-1]-.051,'overlapping dangers bypassed damage protection');
    t.diagnostic(JSON.stringify({difficulty,seconds:+result.seconds.toFixed(2),rescues:result.rescues,
      lives:result.lives,phase:result.phase,distance:Math.round(result.distance),maxHunger:+result.maxHunger.toFixed(3),
      maxStall:result.maxStall,enemyModes:result.modes.length}));
  });
}

test('real cover entry, hidden recovery, save/load and refuge return remain usable after movement', t => {
  const h=createGame(()=>.5);
  h.run(`difficultySelect.value='easy';resetGame(814237);state.phase='playing';`);
  installPilot(h);
  const result=h.run(`
    var coverOptions=HidingSpots.getSpots().filter(s=>s.type!=='tree'&&!HidingSpots.occupied(state,s)).flatMap(s=>[
      {x:s.x+s.w/2,y:s.y+s.h-18},{x:s.x+18,y:s.y+s.h/2},{x:s.x+s.w-18,y:s.y+s.h/2}
    ].filter(p=>HidingSpots.candidate(p)?.id===s.id&&OBSTACLES.every(o=>o.blocking===false||
      Math.hypot(p.x-clamp(p.x,o.x,o.x+o.w),p.y+state.entities.chicken.hitbox.oy-clamp(p.y+state.entities.chicken.hitbox.oy,o.y,o.y+o.h))>state.entities.chicken.hitbox.r+3)));
    coverOptions.sort((a,b)=>distance(a,state.entities.chicken)-distance(b,state.entities.chicken));
    var selected=coverOptions[0],coverDistance=driveTo(selected);
    HidingSpots.toggle(state);var entered=state.entities.chicken.hidden;
    var hiddenId=state.entities.chicken.hidingSpotId;
    GameManager.save(state);GameManager.restore(state,GameManager.read());
    var restoredHidden=state.entities.chicken.hidden&&state.entities.chicken.hidingSpotId===hiddenId;
    state.entities.chicken.stamina=.1;
    for(let tick=0;tick<80;tick++)updateGame(.05);
    var recovered=state.entities.chicken.stamina;
    HidingSpots.toggle(state);
    var exitDistance=driveTo({x:400,y:390});
    // The generic predator route graph excludes the safe yard. Enter through its actual east gate.
    for(let tick=0;tick<40&&!FarmRefuge.contains(state.entities.chicken);tick++){
      steer({x:300,y:390});updateGame(.05);
    }
    controls={x:0,y:0};input.clear();
    var safe=FarmRefuge.contains(state.entities.chicken),safeLives=state.lives;
    for(let tick=0;tick<400;tick++)updateGame(.05);
    ({entered,restoredHidden,coverDistance,exitDistance,recovered,safe,safeLives,lives:state.lives,
      hidden:state.entities.chicken.hidden,seconds:state.elapsed,phase:state.phase})
  `);
  assert.ok(result.coverDistance<7 && result.exitDistance<7,'walked to cover and back through the real map');
  assert.ok(result.entered && result.restoredHidden,'cover and save preserve hidden status');
  assert.equal(result.recovered,1,'hidden stamina fully recovers');
  assert.ok(result.safe && !result.hidden,'left cover and entered refuge through its gate');
  assert.equal(result.lives,result.safeLives,'refuge remains safe throughout continued full simulation');
  assert.equal(result.phase,'playing');
  t.diagnostic(`Cover, save/load and refuge exercised over ${result.seconds.toFixed(2)} simulated seconds.`);
});
