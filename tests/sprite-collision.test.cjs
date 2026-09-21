const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
const clear=`a=>{const h=getHitbox(a);return OBSTACLES.every(r=>r.blocking===false||(r.type==='pond'&&a.type==='chicken')||Math.hypot(h.x-clamp(h.x,r.x,r.x+r.w),h.y-clamp(h.y,r.y,r.y+r.h))>=h.r-.01)}`;

test('every drawn farm sign stops every playable appearance from all four sides',()=>{
  const h=createGame();
  h.run(`var signs=FarmArt.getProps(WORLD.layout).filter(p=>p.type==='sign'||p.type==='sunflower-sign');var c=state.entities.chicken;`);
  assert.ok(h.run('signs.length')>=4);
  assert.equal(h.run(`signs.every(p=>OBSTACLES.some(o=>o.type==='sign'&&o.x===p.x&&o.y===p.y&&o.w===p.w&&o.h===(p.h||49)))`),true);
  for(const skin of ['classic','silkie','blue','punk','astronaut','robocop','goose','priest'])for(let i=0;i<h.run('signs.length');i++) {
    h.run(`c.skin='${skin}';var wall=signs[${i}];OBSTACLES=[{...wall,h:wall.h||49,type:'sign'}];`);
    for(const [sx,sy,dx,dy] of [[-50,24,300,0],[200,24,-300,0],[45,-50,0,300],[45,130,0,-300]]) {
      h.run(`Object.assign(c,{x:wall.x+${sx},y:wall.y+${sy}});Player.move(c,${dx},${dy});`);
      assert.equal(h.run(`(${clear})(c)`),true,`${skin}/sign${i}`);
      assert.ok(h.run(`Math.hypot(c.x-(wall.x+${sx}),c.y-(wall.y+${sy}))<280`),'cannot tunnel to the other side');
    }
  }
});

test('an old save inside a newly solid sign restores outside it with progress intact',()=>{
  const h=createGame();
  h.run(`GameManager.rescue(state,state.entities.animals[0]);
    var sign=FarmArt.getProps(WORLD.layout).find(p=>p.type==='sign');
    Object.assign(state.entities.chicken,{x:sign.x+sign.w/2,y:sign.y+20});
    GameManager.save(state);var saved=GameManager.read();resetGame();GameManager.restore(state,saved);`);
  assert.equal(h.run('state.rescuedCount'),1);
  assert.equal(h.run('state.score===saved.score'),true);
  assert.equal(h.run(`(${clear})(state.entities.chicken)`),true);
});

test('the player stops on the inside of all four visible boundary fences, including diagonal pushes',()=>{
  const h=createGame();
  h.run(`var c=state.entities.chicken;OBSTACLES=OBSTACLES.filter(o=>o.type==='boundary-fence');`);
  for(const skin of ['classic','silkie','blue','punk','astronaut','robocop','goose','priest']){
    h.run(`c.skin='${skin}';`);
    for(const [side,dx,dy] of [['west',-4000,0],['east',4000,0],['north',0,-4000],['south',0,4000],['corner',4000,4000]]){
      h.run(`Object.assign(c,{x:WORLD.width/2,y:WORLD.height/2});Player.move(c,${dx},${dy});`);
      assert.ok(h.run(`(()=>{const b=getHitbox(c);return b.x-b.r>=27-.01&&b.x+b.r<=WORLD.width-27+.01&&b.y-b.r>=32-.01&&b.y+b.r<=WORLD.height-26+.01;})()`),`${skin}/${side}`);
      assert.equal(h.run(`(${clear})(c)`),true,`${skin}/${side}: no penetration`);
    }
  }
});

test('the front boundary fence is drawn after a player standing behind its rails',()=>{
  const h=createGame();
  h.run(`var c=state.entities.chicken;Object.assign(c,{x:1400,y:WORLD.height-50});
    camera.x=1000;camera.y=WORLD.height-500;
    var drawOrder=[];const originalProp=FarmArt.drawProp;
    FarmArt.drawProp=(ctx,p,...args)=>{
      if(p.type==='boundary-fence'&&p.w>p.h&&p.y>WORLD.height/2&&p.x<=c.x&&p.x+p.w>=c.x)drawOrder.push('fence');
      originalProp(ctx,p,...args);
    };
    drawChicken=()=>drawOrder.push('chicken');
    renderGame();`);
  assert.equal(h.run(`drawOrder.join(',')`),'chicken,fence');
});

test('loading a player in the old gap moves it inside the fence without losing progress',()=>{
  const h=createGame();
  h.run(`GameManager.rescue(state,state.entities.animals[0]);
    Object.assign(state.entities.chicken,{x:WORLD.width-16,y:WORLD.height-24});
    GameManager.save(state);var saved=GameManager.read();resetGame();GameManager.restore(state,saved);`);
  assert.ok(h.run(`(()=>{const b=getHitbox(state.entities.chicken);return b.x+b.r<=WORLD.width-27+.01&&b.y+b.r<=WORLD.height-26+.01;})()`));
  assert.equal(h.run('state.rescuedCount'),1);
  assert.equal(h.run('state.score===saved.score'),true);
  assert.equal(h.run(`(${clear})(state.entities.chicken)`),true);
});

test('nursery side walls stop both player and wolf, with the front open',()=>{
  const h=createGame();
  for(const who of ['chicken','wolf']){
    h.run(`var c=state.entities.${who};Object.assign(c,{x:340,y:245});Player.move(c,-190,0)`);
    assert.ok(h.run('getHitbox(c).x')>=309+h.run('c.hitbox.r')-.01,who+' right wall');
    h.run('Object.assign(c,{x:116,y:245});Player.move(c,190,0)');
    assert.ok(h.run('getHitbox(c).x')<=142-h.run('c.hitbox.r')+.01,who+' left wall');
    h.run('Object.assign(c,{x:212,y:318});Player.move(c,0,-150)');
    assert.ok(h.run('getHitbox(c).y')<270,who+' can use open front');
    assert.ok(h.run('getHitbox(c).y')>=222+h.run('c.hitbox.r')-.01,who+' rear wall');
    assert.equal(h.run(`(${clear})(c)`),true);
  }
});

test('a narrow passage never ejects a sprinting player through the adjacent fence',()=>{
  const h=createGame();
  h.run(`OBSTACLES=[{x:100,y:0,w:8,h:200,type:'fence'},{x:130,y:80,w:30,h:60,type:'barn'}];
    var c=state.entities.chicken;Object.assign(c,{x:124,y:210});`);
  for(let i=0;i<100;i++){
    h.run('Player.move(c,0,-6)');
    assert.equal(h.run(`(${clear})(c)`),true,'step '+i);
    assert.ok(h.run('getHitbox(c).x')>=124-.01,'cannot cross the fence');
  }
  assert.ok(h.run('getHitbox(c).y')>140,'body stops at the rounded mouth of the gap');
});

test('solid buildings stop fast and diagonal approaches for every playable appearance',()=>{
  const h=createGame();
  h.run("var solids=OBSTACLES.filter(r=>['barn','coop','silo','stable','hay','trough'].includes(r.type));var c=state.entities.chicken;");
  for(const skin of ['classic','silkie','blue','punk','astronaut','robocop','goose','priest']){
    h.run(`c.skin='${skin}';`);
    const solids=h.run('solids');
    for(let i=0;i<solids.length;i++){
      h.run(`var wall=solids[${i}];OBSTACLES=[wall];Object.assign(c,{x:wall.x+wall.w/2,y:wall.y+wall.h+50});Player.move(c,0,-400);`);
      assert.ok(h.run('getHitbox(c).y')>=solids[i].y+solids[i].h+16-.01,skin+'/'+solids[i].type);
      h.run('Object.assign(c,{x:wall.x-45,y:wall.y-45});Player.move(c,80,80)');
      assert.equal(h.run(`(${clear})(c)`),true,skin+' diagonal');
    }
  }
});

test('all ten rescued chicks fit inside the nursery walls and an old wall save restores clear',()=>{
  const h=createGame();
  h.run(`difficultySelect.value='hardcore';resetGame(814237);
    for(const chick of state.entities.chicks)GameManager.rescue(state,Object.assign(chick,{discovered:true}));
    state.entities.chicken.x=280;state.entities.chicken.y=240;GameManager.save(state);
    var saved=GameManager.read();resetGame();GameManager.restore(state,saved);`);
  assert.equal(h.run('state.rescuedChicks'),10);
  assert.equal(h.run(`state.entities.chicks.every(${clear})`),true);
  assert.equal(h.run(`(${clear})(state.entities.chicken)`),true);
  assert.equal(h.run('state.score===saved.score'),true);
});
