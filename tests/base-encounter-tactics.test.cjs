const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
function arena(species='fuinha'){
  const h=createGame();h.run(`OBSTACLES=[];camera.x=700;camera.y=500;
    state.phase='playing';state.difficultyKey='normal';state.rescuedCount=10;state.entities.thor=null;state.lake.active=false;
    var c=state.entities.chicken,e=state.entities.folklore.find(e=>e.species===${JSON.stringify(species)}),f=state.entities.foxes[1];
    Object.assign(c,{x:1150,y:800,hidden:false,invulnerable:0,vx:0,vy:0});
    Object.assign(e,{x:1000,y:800,home:{x:1000,y:800},active:true,mode:'patrol',timer:0,grace:0,route:[],routeTimer:0});
    Object.assign(f,{x:1000,y:800,home:{x:1000,y:800},anchor:{x:1000,y:800},mode:'hidden',relocateIn:20,grace:0,cooldown:0});
    Object.assign(state.entities.wolf,{x:2500,y:1600,huntUnlockTimer:100});
    state.entities.foxes=[f];state.entities.folklore=[e];state.folkloreThreats=[];`);return h;
}
const step=(h,system,seconds)=>h.run(`for(let i=0;i<${Math.ceil(seconds/.05)};i++)${system}.update(state,.05);`);

test('Sophis flanks a distant visible runner before a fully announced committed dash',()=>{
  const h=arena();h.run('c.x=1220;FoxSystem.update(state,.05)');
  assert.equal(h.run('f.mode'),'stalk');assert.equal(h.run('state.lives'),3);
  h.run("for(let i=0;i<35&&f.mode==='stalk';i++)FoxSystem.update(state,.05)");
  assert.equal(h.run('f.mode'),'warning');assert.ok(h.run('Math.abs(f.y-800)>40'));
  assert.ok(h.run('f.timer>=FoxSystem.getConfig(state).warning-.01'));
  h.run('var aimed=JSON.stringify(f.target);c.y=810;FoxSystem.update(state,.05)');
  assert.equal(h.run('JSON.stringify(f.target)===aimed'),false);assert.equal(h.run('state.lives'),3);
});

test('Lorenzo waits for close ambush range while Sophis abandons an unseen flank',()=>{
  const h=arena();h.run("c.x=1220;f.name='Lorenzo';FoxSystem.update(state,.05)");
  assert.equal(h.run('f.mode'),'hidden');
  h.run("f.name='Sophis';FoxSystem.update(state,.05);var sighting=JSON.stringify(f.sighting);c.hidden=true;c.y=1400;FoxSystem.update(state,.05)");
  assert.equal(h.run('f.mode'),'return');assert.equal(h.run('JSON.stringify(f.sighting)===sighting'),true);
  assert.equal(h.run('f.attempts'),0);assert.equal(h.run('state.lives'),3);
});

test('blocked flank candidates cannot move Sophis through a fence',()=>{
  const h=arena();h.run(`c.x=1220;OBSTACLES=[{x:1010,y:755,w:130,h:15},{x:1010,y:835,w:130,h:15}];
    FoxSystem.update(state,.05);`);
  assert.equal(h.run('f.mode'),'hidden');assert.equal(h.run('f.x'),1000);assert.equal(h.run('f.y'),800);
});

test('Curupira changes root formations after a counter and keeps all announced centers fixed',()=>{
  const h=arena('curupira');h.run('FolkloreSystem.update(state,.05)');
  assert.equal(h.run('e.attackPoints.length'),1);
  h.run("e.mode='patrol';e.timer=0;e.courage=2;FolkloreSystem.update(state,.05);var planned=JSON.stringify(e.attackPoints);c.y=950;");
  assert.equal(h.run('e.attackPoints.length'),3);
  step(h,'FolkloreSystem',.9);
  assert.equal(h.run('JSON.stringify(e.attackPoints)===planned'),true);
  assert.equal(h.run('state.folkloreThreats.length'),3);
  assert.ok(h.run('state.folkloreThreats.every(h=>h.arm>0)'));
  assert.equal(h.run('state.lives'),3);
});

test('root placement checks the entire radius and refuses the refuge rim',()=>{
  const h=arena('curupira');h.run('OBSTACLES=[{x:1170,y:760,w:8,h:80}];FolkloreSystem.update(state,.05)');
  assert.equal(h.run('e.attackPoints.length'),0);
  step(h,'FolkloreSystem',1);assert.equal(h.run('state.folkloreThreats.length'),0);
  assert.equal(h.run('WildlifeRules.overlapsRefuge({x:365,y:400},30)'),true);
  assert.equal(h.run('WildlifeRules.overlapsRefuge({x:390,y:400},30)'),false);
});

test('Cuca alternates a fan and an open-center volley, with a line for every projectile',()=>{
  const h=arena('cuca');h.run('FolkloreSystem.update(state,.05)');
  assert.equal(h.run('e.attackPoints.length'),3);
  h.run("e.mode='patrol';e.timer=0;FolkloreSystem.update(state,.05);var planned=JSON.stringify(e.attackPoints);c.y=860;");
  assert.equal(h.run('e.attackPoints.length'),4);
  h.run('var strokes=[];ctx.lineTo=(x,y)=>strokes.push([x,y]);var before=JSON.stringify(e);FolkloreSystem.drawGround(state)');
  assert.equal(h.run('strokes.length'),8);assert.equal(h.run('JSON.stringify(e)===before'),true);
  step(h,'FolkloreSystem',1.25);
  assert.equal(h.run('JSON.stringify(e.attackPoints)===planned'),true);
  assert.equal(h.run('state.folkloreThreats.length'),4);
  assert.ok(h.run('state.folkloreThreats.every(h=>Math.abs(h.vy)>25)'),'the second fan leaves its center open');
});

test('Cuca retreats from close pressure but cannot postpone her next warning forever',()=>{
  const h=arena('cuca');h.run('c.x=1080;FolkloreSystem.update(state,.05)');
  assert.equal(h.run('e.mode'),'hunt');assert.ok(h.run('e.x<1000'));
  h.run("for(let i=0;i<40&&e.mode!=='warning';i++)FolkloreSystem.update(state,.05)");
  assert.equal(h.run('e.mode'),'warning');assert.ok(h.run('e.timer>=.65'));
});

test('Boitata announces a fixed multi-leg sweep, leaves delayed fire and opens a counter window',()=>{
  const h=arena('boitata');h.run('FolkloreSystem.update(state,.05);var route=JSON.stringify(e.attackPoints)');
  assert.equal(h.run('e.mode'),'warning');assert.ok(h.run('e.attackPoints.length>=2'));
  assert.equal(h.run('state.folkloreThreats.length'),0);
  h.run('c.y=1000');step(h,'FolkloreSystem',.4);
  assert.equal(h.run('JSON.stringify(e.attackPoints)===route'),true);
  h.run("for(let i=0;i<40&&e.mode!=='attack';i++)FolkloreSystem.update(state,.05);FolkloreSystem.update(state,.05)");
  assert.ok(h.run('state.folkloreThreats.some(h=>h.kind==="fire"&&h.arm>0)'));
  h.run("for(let i=0;i<90&&e.mode!=='rest';i++)FolkloreSystem.update(state,.05)");
  assert.equal(h.run('e.mode'),'rest');assert.ok(h.run('e.timer>=2.9'));
  assert.equal(h.run('state.lives'),3);
});

test('wolf intercept warning and breath recovery appear in the live HUD without mutating simulation',()=>{
  const h=arena();h.run(`var w=state.entities.wolf;Object.assign(w,{x:1000,y:800,mode:'chase',interceptPhase:'warning',
    interceptTarget:{x:1200,y:900},interceptTime:.4,pursuitRest:0});
    var before=JSON.stringify(w),labels=[];ctx.fillText=t=>labels.push(t);GameplayHud.drawTactics(state);GameUI.update(state);`);
  assert.equal(h.run('JSON.stringify(w)===before'),true);
  assert.ok(h.run('labels.includes("VAI CORTAR CAMINHO!")'));
  assert.match(h.elements.get('wolfStateText').textContent,/interceptação/);
  assert.match(h.elements.get('threatText').textContent,/Mude de direção/);
  h.run('w.interceptPhase=null;w.pursuitRest=2;GameUI.update(state)');
  assert.match(h.elements.get('wolfStateText').textContent,/fôlego/);
  assert.match(h.elements.get('threatText').textContent,/cansou/);
});

test('a narrow viewport keeps danger lanes visible even with the attacker outside its left edge',()=>{
  for(const species of ['cuca','curupira']){
    const h=arena(species);h.run(`canvas.width=400;camera.x=1070;camera.y=540;c.x=1270;
      FolkloreSystem.update(state,.05);var strokes=0;ctx.stroke=()=>strokes++;FolkloreSystem.drawGround(state);`);
    assert.equal(h.run('WildlifeRules.onScreen(e,60)'),false);assert.equal(h.run('e.mode'),'warning');
    assert.ok(h.run('strokes>0'),species+' warns the visible target');
    h.run(`Object.assign(state.entities.wolf,{x:970,y:800,interceptPhase:'warning',interceptTime:.4,
      interceptTarget:{x:1280,y:800}});strokes=0;GameplayHud.drawTactics(state);`);
    assert.equal(h.run('strokes'),0,'body lunges no longer reveal a floor trajectory');
    h.run('GameUI.update(state)');
    assert.match(h.elements.get('threatText').textContent,/Mude de direção/,'the HUD still warns about an offscreen wolf');
  }
});
