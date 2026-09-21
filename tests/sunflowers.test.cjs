const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
function ready(options={}){
  const h=createGame(()=>.5,options);
  h.run(`var p=SunflowerSystem.plot(),w=state.entities.wolf,c=state.entities.chicken;
    var goal={x:p.x+p.w*.5,y:p.y+p.h*.63};
    Object.assign(w,{x:goal.x-90,y:goal.y,mode:'patrol',heading:0,huntUnlockTimer:0,pauseTimer:0});
    Object.assign(c,{x:100,y:500,hidden:false,invulnerable:0});SunflowerSystem.reset(state,0);
    var biggestStep=0;
    for(let i=0;i<100&&SunflowerSystem.mode(state)!=='hidden';i++){
      const old={x:w.x,y:w.y};WolfAI.update(state,.05);biggestStep=Math.max(biggestStep,distance(old,w));
    }`);
  assert.equal(h.run('SunflowerSystem.mode(state)'),'hidden');return h;
}
function warn(h){
  h.run(`c.x=w.x+Math.cos(w.heading)*120;c.y=w.y+Math.sin(w.heading)*120;
    c.hidden=false;c.invulnerable=0;WolfAI.update(state,.05);`);
  assert.equal(h.run('SunflowerSystem.mode(state)'),'warning');
}
function step(h,time){h.run(`for(let i=0;i<${Math.ceil(time/.05)};i++){WolfAI.update(state,.05);Player.checkCatch(state);}`);}
function barrier(h) {
  // A generated field may face any road. Put the wall across the actual attack line.
  h.run(`var dx=c.x-w.x,dy=c.y-w.y,length=Math.hypot(dx,dy),horizontal=Math.abs(dx)>Math.abs(dy);
    var bx=w.x+dx/length*55,by=w.y+dy/length*55;
    OBSTACLES.push({x:bx-(horizontal?6:100),y:by-(horizontal?100:6),w:horizontal?12:200,h:horizontal?200:12});`);
}

test('new and old layouts get a deterministic sunflower field without moving saved geometry or blocking roads',()=>{
  const h=createGame(()=>.5);
  for(const version of [1,2,7])for(const seed of [0,1,17,52,903,814237]){
    h.run(`resetGame(${seed},${version});var before=JSON.stringify(WORLD.layout),bed=SunflowerSystem.plot();`);
    assert.equal(h.run('!!bed'),true,`${version}/${seed}`);
    assert.equal(h.run('JSON.stringify(WORLD.layout)===before'),true);
    assert.equal(h.run('SunflowerSystem.plot()===bed'),true);
    assert.equal(h.run(`WORLD.paths.concat(WORLD.layout.lanes||[]).some(r=>bed.x<r.x+r.w&&bed.x+bed.w>r.x&&bed.y<r.y+r.h&&bed.y+bed.h>r.y)`),false);
    assert.ok(h.run('SunflowerSystem.props(WORLD.layout).filter(p=>p.type==="sunflower").length')>=24);
    assert.equal(h.run(`(()=>{const sign=OBSTACLES.find(o=>o.id==='sunflower-sign'),box=state.entities.wolf.hitbox;
      for(let y=bed.y+80;y<bed.y+bed.h-25;y+=24)for(let x=bed.x+28;x<bed.x+bed.w-28;x+=24){
        // The field's own sign is intentionally solid; the planted ground around it remains walkable.
        if(sign&&!WildlifeRules.clear({x,y},{x,y},box,[sign]))continue;
        if(!WildlifeRules.clear({x,y},{x,y},box))return false;
      }return true;})()`),true);
  }
});

test('the wolf reaches the flowers physically, hides from the renderer and then leaves if nobody comes',()=>{
  const h=ready();assert.ok(h.run('biggestStep')<18);
  assert.equal(h.run('SunflowerSystem.concealed(state)'),true);
  assert.equal(h.run('SunflowerSystem.canCatch(state)'),false);
  h.run(`var drawings=0;const original=drawWolf;drawWolf=()=>{drawings++};renderGame();drawWolf=original;`);
  assert.equal(h.run('drawings'),0);
  step(h,12.2);assert.equal(h.run('SunflowerSystem.concealed(state)'),false);
});

test('the warning allows a perpendicular dodge and the dash never redirects to the new position',()=>{
  const h=ready();warn(h);
  h.run('var origin={x:w.x,y:w.y},heading=w.heading; c.x+=Math.cos(heading+Math.PI/2)*130;c.y+=Math.sin(heading+Math.PI/2)*130;');
  step(h,.8);assert.equal(h.run('SunflowerSystem.mode(state)'),'warning');
  assert.equal(h.run('distance(w,origin)'),0);assert.equal(h.run('state.lives'),3);
  step(h,.9);
  assert.equal(h.run('state.lives'),3);
  assert.ok(h.run('Math.abs((w.x-origin.x)*Math.sin(heading)-(w.y-origin.y)*Math.cos(heading))')<.001);
  assert.equal(h.run('SunflowerSystem.mode(state)'),'recover');
  h.run('c.x=w.x;c.y=w.y;');assert.equal(h.run('Player.checkCatch(state)'),false);
});

test('staying in the announced line costs one heart and retains the usual invulnerability',()=>{
  const h=ready();warn(h);step(h,2);
  assert.equal(h.run('state.lives'),2);assert.equal(h.run('c.invulnerable'),3);
  h.run('c.x=w.x;c.y=w.y;Player.checkCatch(state);');assert.equal(h.run('state.lives'),2);
});

test('hidden players and walls do not give a concealed wolf a target',()=>{
  const h=ready();
  h.run(`c.x=w.x+Math.cos(w.heading)*120;c.y=w.y+Math.sin(w.heading)*120;c.hidden=true;`);
  step(h,.2);assert.equal(h.run('SunflowerSystem.mode(state)'),'hidden');
  h.run('c.hidden=false');barrier(h);
  step(h,.2);assert.equal(h.run('SunflowerSystem.mode(state)'),'hidden');
});

test('a fence added across the announced dash stops it instead of letting the wolf pass through',()=>{
  const h=ready();warn(h);
  h.run('var start={x:w.x,y:w.y};');barrier(h);
  step(h,2);assert.equal(h.run('state.lives'),3);
  assert.ok(h.run('distance(w,start)<55'),'the wolf stops before the wall');
});

test('pause preserves the warning, Thor cancels it, and an interrupted save resumes without a surprise dash',()=>{
  const h=ready();warn(h);
  h.run("state.phase='menu';var before=JSON.stringify({x:w.x,y:w.y,lives:state.lives});");step(h,2);
  assert.equal(h.run('JSON.stringify({x:w.x,y:w.y,lives:state.lives})===before'),true);
  h.run("state.phase='playing';");assert.equal(h.run('SunflowerSystem.mode(state)'),'warning');
  h.run('GameManager.save(state);var saved=GameManager.read();WolfAI.frighten(state,{x:w.x+70,y:w.y},6);');
  assert.equal(h.run('SunflowerSystem.mode(state)'),'none');assert.equal(h.run('w.mode'),'frightened');
  h.run('GameManager.restore(state,saved);');
  assert.equal(h.run('SunflowerSystem.concealed(state)'),false);
  assert.ok(h.run('state.entities.chicken.invulnerable')>0);
});

test('the optional goose challenge never starts a sunflower ambush',()=>{
  const h=ready();h.run('state.lake.active=true;var before={x:w.x,y:w.y};');step(h,2);
  assert.equal(h.run('distance(w,before)'),0);assert.equal(h.run('state.lives'),3);
});

test('sunflower stalks react to the player and reduced motion still draws a visible attack warning',()=>{
  const canvas=require('@napi-rs/canvas').createCanvas(900,520),ctx=canvas.getContext('2d');
  const h=ready({reducedMotion:true,drawingContext:ctx});
  h.run(`var plant=SunflowerSystem.props(WORLD.layout).find(p=>p.type==='sunflower');
    Object.assign(c,{x:plant.x,y:plant.y-14,moving:true,vx:40,vy:0});
    EnvironmentSystem.update(state,.05,{x:c.x-5,y:c.y});`);
  h.context.checkCanvas=ctx;
  h.run('EnvironmentSystem.transform(checkCanvas,plant,state);');
  assert.notEqual(ctx.getTransform().c,0);
  ctx.resetTransform();ctx.clearRect(0,0,900,520);
  warn(h);h.run('camera.x=w.x-450;camera.y=w.y-280;SunflowerSystem.drawWarning(state);GameUI.update(state);InterfaceMotion.update(state,0);');
  assert.ok(ctx.getImageData(0,0,900,520).data.some((value,i)=>i%4===3&&value));
  assert.match(h.elements.get('contextHint').textContent,/girassóis/);
});

test('walking between sunflower stalks opens both sides of the row, keeps roots fixed and lets the plants settle',()=>{
  const canvas=require('@napi-rs/canvas').createCanvas(900,520),ctx=canvas.getContext('2d');
  const h=createGame(()=>.5,{drawingContext:ctx});
  h.run(`var flowers=SunflowerSystem.props(WORLD.layout).filter(p=>p.type==='sunflower');
    var left=flowers[3],right=flowers[4],c=state.entities.chicken;
    Object.assign(c,{x:(left.x+right.x)/2,y:left.y-14-36});
    var before=JSON.stringify(WORLD.layout);EnvironmentSystem.initialize(state);input.add('s');
    for(let i=0;i<100&&c.y+14<left.y;i++)Player.update(state,1/60);
    var reactions=EnvironmentSystem.inspect(state).reactions;
    var leftReaction=reactions.find(r=>r.key==='sunflower:'+left.x+':'+left.y);
    var rightReaction=reactions.find(r=>r.key==='sunflower:'+right.x+':'+right.y);`);
  assert.ok(h.run('leftReaction.bend')<0,'left plants lean away from the body');
  assert.ok(h.run('rightReaction.bend')>0,'right plants lean away from the body');
  assert.equal(h.run('reactions.some(r=>r.key===`sunflower:${flowers.at(-1).x}:${flowers.at(-1).y}`)'),false);
  h.context.checkCanvas=ctx;
  h.run('EnvironmentSystem.transform(checkCanvas,left,state);');
  const matrix=ctx.getTransform(),root=h.run('({x:left.x,y:left.y})');
  assert.ok(Math.abs(matrix.a*root.x+matrix.c*root.y+matrix.e-root.x)<.001);
  assert.ok(Math.abs(matrix.b*root.x+matrix.d*root.y+matrix.f-root.y)<.001);
  assert.ok(Math.abs(matrix.c*65)>8,'flower heads move visibly even between adjacent stalks');
  h.run('input.clear();for(let i=0;i<150;i++)Player.update(state,1/60);');
  assert.equal(h.run('EnvironmentSystem.inspect(state).reactions.length'),0);
  assert.equal(h.run('EnvironmentSystem.inspect(state).particles'),0,'standing in a field does not shed endless petals');
  assert.equal(h.run('JSON.stringify(WORLD.layout)===before'),true);
});

test('real sprinting bends sunflowers harder and drops more petals; sneaking only brushes their leaves',()=>{
  const measurements=[];
  for(const key of ['c','','shift']){
    const canvas=require('@napi-rs/canvas').createCanvas(900,520),ctx=canvas.getContext('2d');
    const h=createGame(()=>.5,{drawingContext:ctx});
    h.run(`var flowers=SunflowerSystem.props(WORLD.layout).filter(p=>p.type==='sunflower');
      var flower=flowers[3],c=state.entities.chicken;
      Object.assign(c,{x:flower.x+14,y:flower.y-14-36});
      EnvironmentSystem.initialize(state);input.add('s');${key?`input.add('${key}');`:''}
      for(let i=0;i<150&&c.y+14<flower.y;i++)Player.update(state,1/60);
      camera.x=flower.x-450;camera.y=flower.y-260;camera.shakeX=0;camera.shakeY=0;
      EnvironmentSystem.drawAir(state);`);
    const pixels=ctx.getImageData(0,0,900,520).data;
    let petals=0;
    for(let y=0;y<225;y++)for(let x=0;x<900;x++){
      const i=(y*900+x)*4;
      if(pixels[i]>220&&pixels[i+1]>160&&pixels[i+2]<130&&pixels[i+3]>80)petals++;
    }
    measurements.push({petals,bend:Math.abs(h.run('EnvironmentSystem.inspect(state).reactions.find(r=>r.key===`sunflower:${flower.x}:${flower.y}`).bend'))});
  }
  assert.equal(measurements[0].petals,0);
  assert.ok(measurements[1].petals>0,'walking releases yellow petals near the flower head');
  assert.ok(measurements[2].petals>measurements[1].petals,'sprinting shakes off more petals');
  assert.ok(measurements[1].bend>measurements[0].bend*1.5);
  assert.ok(measurements[2].bend>measurements[1].bend*1.3);
});
