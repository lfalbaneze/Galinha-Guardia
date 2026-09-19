/* Input devices share the same movement, interactions and collision rules. */
const GameInput = (() => {
  const KEY='galinha-controls-v1',heldTouch=new Map(),padHeld=new Set(),latched={c:false,shift:false};
  const el={};let ready=false,device='keyboard',padVector={x:0,y:0},previous=new Set(),padIndex=null,neutral=false,menuDelay=0,lastPhase='';
  let preferences={toggleSneak:false,toggleSprint:false,touch:window.matchMedia('(any-pointer: coarse)').matches};
  try { const saved=JSON.parse(localStorage.getItem(KEY)||'null');for(const key of Object.keys(preferences))if(typeof saved?.[key]==='boolean')preferences[key]=saved[key]; } catch {}
  if(preferences.touch)device='touch';
  function clear() {
    input.clear();heldTouch.clear();padHeld.clear();padVector={x:0,y:0};latched.c=false;latched.shift=false;neutral=true;
  }
  function held(key) { return input.has(key)||padHeld.has(key)||latched[key]===true||[...heldTouch.values()].includes(key); }
  function vector(keyboard) {
    let x=keyboard.x,y=keyboard.y;
    if(!x&&!y){x=Number(held('d'))-Number(held('a'));y=Number(held('s'))-Number(held('w'));}
    const len=Math.hypot(x,y);return len?{x:x/Math.max(1,len),y:y/Math.max(1,len)}:padVector;
  }
  function toggle(key) { latched[key]=!latched[key];if(latched[key])latched[key==='c'?'shift':'c']=false; }
  function keyboard(event) {
    device='keyboard';const key=event.key.toLowerCase();
    if((key==='c'&&preferences.toggleSneak)||(key==='shift'&&preferences.toggleSprint)){
      if(!event.repeat)toggle(key);return true;
    }
    return false;
  }
  function action(name) {
    if(name==='pause'){if(state.phase==='menu')GameUI.resume();else if(state.phase==='playing')GameUI.showMenu(state);return;}
    if(state.phase!=='playing')return;
    if(ThorSystem.active(state)){if(name==='thor')ThorSystem.skip(state);return;}
    if(name==='thor'){ThorSystem.request(state);GameUI.update(state);return;}
    if(name==='interact'){if(!LakeChallenge.interact(state)&&!RescueSystem.callChick(state))HidingSpots.toggle(state);}
    else if(name==='lake'){if(state.lake?.active)LakeChallenge.cancel(state);else LakeChallenge.start(state);}
    else if(name==='sneak')toggle('c');
    else if(name==='run')toggle('shift');
    GameUI.update(state);
  }
  function initialize() {
    if(ready)return;ready=true;
    for(const id of ['touchControls','touchRun','touchSneak','touchInteract','controlToggleSneak','controlToggleSprint','controlTouch','controlDevice'])el[id]=document.getElementById(id);
    for(const [id,key]of [['controlToggleSneak','toggleSneak'],['controlToggleSprint','toggleSprint'],['controlTouch','touch']]){
      el[id].checked=preferences[key];el[id].addEventListener('change',()=>{
        preferences[key]=el[id].checked;try{localStorage.setItem(KEY,JSON.stringify(preferences));}catch{}
        if(key==='touch')device=preferences.touch?'touch':'keyboard';
        clear();GameUI.update(state);
      });
    }
    for(const [id,key]of [['touchUp','w'],['touchDown','s'],['touchLeft','a'],['touchRight','d']]){
      const button=document.getElementById(id);
      button.addEventListener('pointerdown',event=>{
        if(state.phase!=='playing'||ThorSystem.active(state)||(event.button!==undefined&&event.button!==0))return;
        event.preventDefault();device='touch';button.setPointerCapture?.(event.pointerId);heldTouch.set(event.pointerId,key);
      });
      for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,event=>heldTouch.delete(event.pointerId));
    }
    for(const [id,name]of [['touchInteract','interact'],['touchSneak','sneak'],['touchRun','run'],['touchPause','pause']])
      document.getElementById(id).addEventListener('click',()=>{device='touch';action(name);if(state.phase==='playing')document.getElementById('gameCanvas').focus({preventScroll:true});});
  }
  function update(game) {
    initialize();const playing=game.phase==='playing'&&!ThorSystem.active(game);
    document.getElementById('gameShell').dataset.touch=String(preferences.touch);
    el.touchControls.hidden=!playing||!preferences.touch;
    document.getElementById('liveControls').hidden=!playing||preferences.touch;
    el.touchRun.setAttribute('aria-pressed',String(held('shift')));el.touchSneak.setAttribute('aria-pressed',String(held('c')));
    const callable=playing&&RescueSystem.callTarget(game),hidden=game.entities.chicken.hidden;
    el.touchInteract.textContent=game.lake?.active?'Carimbar':callable?'Chamar':hidden?'Sair':'Esconder';
    el.touchInteract.disabled=!playing||(game.lake?.active?!LakeChallenge.canCounter(game):(!callable&&!hidden&&!HidingSpots.candidate(game.entities.chicken)));
    el.controlDevice.textContent=device==='gamepad'?'Controle conectado · A confirma, B volta, direcional navega.':device==='touch'?'Toque nas setas para andar. Mansinho e Correr ligam e desligam com um toque.':'Teclado · WASD ou setas para mover; E para interagir.';
    const labels=device==='gamepad'?['Analógico / ✚','B','RT','A']:device==='touch'?['✚','Mansinho','Correr',el.touchInteract.textContent]:['WASD / setas','C','Shift','E'];
    ['keyMove','keySneak','keySprint','keyHide'].forEach((id,i)=>{const item=document.getElementById(id);if(item.textContent!==labels[i])item.textContent=labels[i];});
  }
  function label(action) {
    if(action==='interact'&&device==='touch'&&state.lake?.active)return 'Carimbar';
    return ({keyboard:{interact:'E',hide:'E',exit:'E',lake:'F',sneak:preferences.toggleSneak?'aperte C':'segure C',run:'Shift'},
      gamepad:{interact:'A',hide:'A',exit:'A',lake:'X',sneak:'aperte B',run:'RT',thor:'Y'},touch:{interact:'Chamar',hide:'Esconder',exit:'Sair',lake:'',sneak:'toque em Mansinho',run:'Correr',thor:'Chamar Thor'}})[device][action] || (action==='thor'?'T':'');
  }
  function navigate(game,buttons,pressed,dt) {
    const help=document.getElementById('howToPlayDialog');
    const overlay=help.open?help:document.getElementById(game.phase==='menu'?'menuScreen':'endScreen');
    if(pressed(1)||pressed(9)){if(help.open)help.close();else if(game.phase==='menu'&&game.hasSave)GameUI.resume();return;}
    if(pressed(0)){document.activeElement?.click?.();return;}
    menuDelay=Math.max(0,menuDelay-dt);
    const x=buttons.has(15)?1:buttons.has(14)?-1:Math.abs(padVector.x)>.5?Math.sign(padVector.x):0;
    const y=buttons.has(13)?1:buttons.has(12)?-1:Math.abs(padVector.y)>.5?Math.sign(padVector.y):0;
    if(!x&&!y){menuDelay=0;return;}if(menuDelay>0)return;menuDelay=.2;
    const active=document.activeElement;
    if(x&&active?.tagName==='SELECT'){
      const choices=[...active.options].filter(o=>!o.disabled),index=choices.findIndex(o=>o.value===active.value);
      active.value=choices[(index+x+choices.length)%choices.length]?.value||active.value;active.dispatchEvent(new Event('change',{bubbles:true}));return;
    }
    if(x&&active?.type==='range'){active.value=String(clamp(Number(active.value)+x*5,Number(active.min),Number(active.max)));active.dispatchEvent(new Event('input',{bubbles:true}));return;}
    if(help.open&&active?.classList?.contains('howto-body')&&y&&
      ((y>0&&active.scrollTop+active.clientHeight<active.scrollHeight-1)||(y<0&&active.scrollTop>0))){active.scrollBy({top:y*70});return;}
    const items=[...overlay.querySelectorAll('button,select,input,a[href],[tabindex="0"]')].filter(e=>!e.disabled&&!e.hidden&&!e.closest('[hidden]')&&e.getClientRects().length);
    if(!items.length)return;let index=items.indexOf(active);index=index<0?0:(index+(y||x)+items.length)%items.length;items[index].focus({preventScroll:true});items[index].scrollIntoView({block:'nearest'});
  }
  function poll(game,dt) {
    if(typeof navigator==='undefined'||!navigator.getGamepads)return;
    const pads=[...navigator.getGamepads()].filter(p=>p?.connected&&p.mapping==='standard');
    const pad=pads.find(p=>p.index===padIndex)||pads[0];
    if(!pad){if(padIndex!==null){padIndex=null;clear();previous.clear();if(game.phase==='playing')GameUI.showMenu(game);}return;}
    padIndex=pad.index;
    const buttons=new Set(pad.buttons.flatMap((button,i)=>button.pressed?[i]:[]));
    const rawX=Number.isFinite(pad.axes[0])?pad.axes[0]:0,rawY=Number.isFinite(pad.axes[1])?pad.axes[1]:0,len=Math.hypot(rawX,rawY);
    const strength=clamp((len-.2)/.8,0,1);padVector=len?{x:rawX/len*strength,y:rawY/len*strength}:{x:0,y:0};
    const pressed=i=>buttons.has(i)&&!previous.has(i);
    if(lastPhase!==game.phase){neutral=true;lastPhase=game.phase;}
    if((buttons.size||strength>.1)&&device!=='gamepad'){device='gamepad';GameUI.update(game);}
    if(neutral&&buttons.size===0&&len<.2)neutral=false;
    padHeld.clear();
    if(neutral){padVector={x:0,y:0};previous=buttons;return;}
    if(game.phase==='playing'){
      for(const [n,key]of [[12,'w'],[13,'s'],[14,'a'],[15,'d'],[7,'shift']])if(buttons.has(n))padHeld.add(key);
      if(pressed(7))latched.c=false;
      if(pressed(9))action('pause');else if(pressed(3))action('thor');else if(pressed(0))action('interact');else if(pressed(1))action('sneak');else if(pressed(2))action('lake');
    }else if(['menu','won','lose'].includes(game.phase))navigate(game,buttons,pressed,dt);
    previous=buttons;
  }
  return {initialize,clear,held,vector,keyboard,action,update,poll,label,get device(){return device;},get preferences(){return {...preferences};}};
})();
