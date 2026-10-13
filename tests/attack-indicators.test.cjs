const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const S=require('../shuffle/survival.js');

test('shuffle warnings cover every enemy and boss attack without drawing range geometry',()=>{
  const source=fs.readFileSync('shuffle/ui.js','utf8');
  const danger=source.slice(source.indexOf('  function danger(){'),source.indexOf('  const noise='));
  let geometry=0,hazards=0;
  const ctx=new Proxy({}, {get:(_,key)=>['stroke','arc','lineTo'].includes(key)?()=>geometry++:()=>{}});
  const run={elapsed:0,hazards:[{kind:'roots'}],enemies:[]};
  const draw=vm.runInNewContext(danger+';danger',{ctx,run,S,reduced:true,ShuffleFX:{hazard(){hazards++;}}});
  const attacks=['fire-fan','hoof-ring','fire-gallop','fire-coil','spell-fan','roots','brew','gust','howl','claw','dirt','pounce'];
  for(const species of Object.keys(S.ENEMIES))for(const attack of [undefined,...attacks]){
    run.enemies=[{species,attack,mode:'warning',x:300,y:300,isBoss:true,aimX:1,aimY:0,angles:[-.3,0,.3]}];
    const before=JSON.stringify(run),warnings=draw();
    assert.equal(warnings.length,1,species+' '+attack);
    assert.ok(warnings[0][0]);assert.equal(geometry,0);
    assert.equal(JSON.stringify(run),before);
  }
  assert.ok(hazards>0,'warnings retain existing hazard effects');
});

test('pending shuffle hazards retain their warning cue without a radius outline',()=>{
  const fx=vm.runInNewContext(fs.readFileSync('shuffle/effects.js','utf8')+';ShuffleFX');
  let arcs=0;const labels=[];
  const ctx=new Proxy({}, {get:(_,key)=>key==='arc'?()=>arcs++:key==='fillText'?t=>labels.push(t):()=>{},set:()=>true});
  for(const kind of ['roots','fire','poison']){
    const h={kind,x:300,y:300,r:30,arm:.5,life:3},before=JSON.stringify(h);
    fx.hazard(ctx,h,0,true);assert.equal(arcs,0);assert.equal(labels.at(-1),'!');
    assert.equal(JSON.stringify(h),before);
  }
  fx.hazard(ctx,{kind:'fire',x:300,y:300,r:30,arm:0,life:3},0,true);
  assert.equal(arcs,1,'active fire remains visible');
});
