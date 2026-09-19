const test=require('node:test');
const assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
const key=(value,repeat=false)=>({key:value,repeat,preventDefault(){},target:{tagName:'CANVAS'}});
function padHarness(h) {
  const pad={index:0,connected:true,mapping:'standard',axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false}))};
  h.context.navigator={getGamepads:()=>pad.connected?[pad]:[]};
  const poll=()=>h.run('GameInput.poll(state,.21)');
  const release=()=>{pad.axes=[0,0];pad.buttons.forEach(b=>b.pressed=false);poll();};
  const press=n=>{pad.buttons[n].pressed=true;poll();};
  release();return {pad,poll,press,release};
}

test('hold and toggle preferences persist without repeats, conflicting latches or stuck movement after pause',()=>{
  const h=createGame(),{run,events,elements}=h;
  events.window.keydown(key('c'));assert.equal(run("GameInput.held('c')"),true);
  events.window.keyup(key('c'));assert.equal(run("GameInput.held('c')"),false);
  for(const id of ['controlToggleSneak','controlToggleSprint']){elements.get(id).checked=true;events.elements[id].change();}
  events.window.keydown(key('c'));events.window.keyup(key('c'));events.window.keydown(key('c',true));
  assert.equal(run("GameInput.held('c')"),true);
  events.window.keydown(key('Shift'));events.window.keyup(key('Shift'));
  assert.equal(run("GameInput.held('shift')"),true);assert.equal(run("GameInput.held('c')"),false);
  events.window.keydown(key('d'));run('GameUI.showMenu(state);GameUI.resume();');
  assert.equal(run("GameInput.held('shift')||GameInput.held('d')||GameInput.held('c')"),false);
  const reload=createGame(Math.random,{storage:h.storage});
  assert.equal(reload.run('GameInput.preferences.toggleSneak&&GameInput.preferences.toggleSprint'),true);
  assert.equal(reload.run("GameInput.held('shift')||GameInput.held('c')"),false);
});

test('touch supports diagonal multi-pointer movement, cancellation and one-tap actions',()=>{
  const {run,events,elements}=createGame();
  elements.get('controlTouch').checked=true;events.elements.controlTouch.change();
  assert.equal(elements.get('touchControls').hidden,false);
  const down=id=>({pointerId:id,button:0,preventDefault(){}});
  events.elements.touchRight.pointerdown(down(1));events.elements.touchUp.pointerdown(down(2));
  assert.ok(Math.abs(run('Math.hypot(Player.moveVector().x,Player.moveVector().y)')-1)<1e-9);
  assert.ok(run('Player.moveVector().x')>0);assert.ok(run('Player.moveVector().y')<0);
  events.elements.touchRight.pointercancel({pointerId:1});
  assert.equal(run('Player.moveVector().x'),0);assert.equal(run('Player.moveVector().y'),-1);
  events.elements.touchUp.lostpointercapture({pointerId:2});
  assert.equal(run('Player.moveVector().y'),0);
  events.elements.touchSneak.click();assert.equal(run("GameInput.held('c')"),true);
  assert.equal(elements.get('touchSneak').getAttribute('aria-pressed'),'true');
  events.elements.touchRun.click();assert.equal(run("GameInput.held('shift')"),true);
  assert.equal(run("GameInput.held('c')"),false);
  run(`var calls=0,oldCall=RescueSystem.callChick;RescueSystem.callChick=()=>{calls++;return true;};`);
  events.elements.touchInteract.click();assert.equal(run('calls'),1);
  run('RescueSystem.callChick=oldCall;');
  events.elements.touchPause.click();assert.equal(run('state.phase'),'menu');
  assert.equal(run("GameInput.held('shift')"),false);
});

test('standard controller uses dead zone and normalized analog movement, edge-triggered actions and safe reconnect',()=>{
  const h=createGame(),{run,elements}=h,{pad,poll,release,press}=padHarness(h);
  pad.axes=[.1,.1];poll();assert.equal(run('Player.moveVector().x'),0);
  pad.axes=[.6,0];poll();assert.ok(Math.abs(run('Player.moveVector().x')-.5)<1e-9);
  pad.axes=[1,1];poll();assert.ok(Math.abs(run('Math.hypot(Player.moveVector().x,Player.moveVector().y)')-1)<1e-9);
  release();press(1);poll();assert.equal(run("GameInput.held('c')"),true,'holding B only toggles once');
  release();press(7);assert.equal(run("GameInput.held('shift')"),true);assert.equal(run("GameInput.held('c')"),false);
  assert.equal(elements.get('keyHide').textContent,'A');
  release();press(9);assert.equal(run('state.phase'),'menu');
  release();press(9);assert.equal(run('state.phase'),'playing');
  pad.axes=[1,0];poll();assert.equal(run('Player.moveVector().x'),0,'resume waits for neutral controls');
  release();pad.axes=[1,0];poll();assert.equal(run('Player.moveVector().x'),1);
  pad.connected=false;poll();assert.equal(run('state.phase'),'menu');assert.equal(run('Player.moveVector().x'),0);
});

test('Thor keyboard and controller shortcuts charge once, block actions during the scene and recover focus',()=>{
  for(const device of ['keyboard','gamepad']){
    const h=createGame(),{run,events,elements}=h;
    run(`state.difficultyKey='normal';state.lives=2;ThorSystem.initialize(state);
      for(const b of ThorSystem.bones(state)){Object.assign(state.entities.chicken,{x:b.x,y:b.y});ThorSystem.update(state,.05);}
      Object.assign(state.entities.chicken,WORLD.layout.start);GameUI.update(state);`);
    const pad=device==='gamepad'?padHarness(h):null;
    if(pad){pad.press(3);pad.poll();}else {events.window.keydown(key('t'));events.window.keydown(key('t',true));}
    assert.equal(run('ThorSystem.active(state)'),true);assert.equal(run('state.thorVisit.visits'),1);
    assert.equal(run('ThorSystem.boneCount(state)'),0);
    events.window.keydown(key('d'));events.window.keydown(key('e'));events.elements.touchRun.click();
    assert.equal(run('input.size'),0);assert.equal(run("GameInput.held('shift')"),false);
    run('for(let i=0;i<16;i++)updateGame(.05)');
    if(pad){pad.release();pad.press(3);}else events.window.keydown(key(' '));
    run('GameUI.update(state)');
    assert.equal(run('ThorSystem.active(state)'),false);assert.equal(run('state.lives'),3);
    assert.equal(h.context.document.activeElement,elements.get('gameCanvas'));
    if(pad){pad.release();pad.pad.axes=[1,0];pad.poll();assert.equal(run('Player.moveVector().x'),1);}
    else {events.window.keydown(key('d'));assert.equal(run('input.has("d")'),true);}
  }
});

test('controller menu navigation, confirmation and help scrolling do not require a mouse',()=>{
  const h=createGame(),{run,context,elements}=h,{press,release}=padHarness(h);
  run('GameUI.showMenu(state);');release();
  const menu=elements.get('menuScreen'),first=elements.get('continueBtn'),second=elements.get('tab-controls');
  for(const e of [first,second]){e.closest=()=>null;e.getClientRects=()=>[{}];e.scrollIntoView=()=>{};}
  menu.querySelectorAll=()=>[first,second];first.focus();
  press(13);assert.equal(context.document.activeElement,second);
  second.click=()=>h.events.elements['tab-controls'].click();release();press(0);
  assert.equal(elements.get('panel-controls').hidden,false);
  const help=elements.get('howToPlayDialog'),body={classList:{contains:()=>true},scrollTop:0,clientHeight:80,scrollHeight:200,
    scrollBy({top}){this.scrollTop+=top;}};
  const footer={disabled:false,hidden:false,closest:()=>null,getClientRects:()=>[{}],scrollIntoView(){},focus(){context.document.activeElement=this;}};
  Object.assign(body,{disabled:false,hidden:false,closest:()=>null,getClientRects:()=>[{}]});
  help.open=true;help.querySelectorAll=()=>[body,footer];help.close=()=>{help.open=false;};context.document.activeElement=body;
  release();press(13);assert.equal(body.scrollTop,70);release();press(13);release();press(13);
  assert.equal(context.document.activeElement,footer,'can leave scroll area at the end');
  release();press(1);assert.equal(help.open,false);
});

test('hiding clears touch and controller movement until a fresh directional action',()=>{
  const h=createGame(),{run,events}=h,{pad,poll,release}=padHarness(h);
  run(`var cover=HidingSpots.getSpots().find(s=>s.type==='bush');state.entities.chicken.x=cover.x+cover.w/2;state.entities.chicken.y=cover.y+cover.h/2;`);
  pad.axes=[1,0];poll();
  events.elements.touchRight.pointerdown({pointerId:1,preventDefault(){}});
  run('HidingSpots.toggle(state);');assert.equal(run('state.entities.chicken.hidden'),true);
  poll();assert.equal(run('Player.moveVector().x'),0);
  release();pad.axes=[1,0];poll();run('Player.update(state,.016);');
  assert.equal(run('state.entities.chicken.hidden'),false);
});
