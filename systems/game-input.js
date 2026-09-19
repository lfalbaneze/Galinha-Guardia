/* Input devices share the same movement, interactions and collision rules. */
const GameInput = (() => {
  const KEY='galinha-controls-v1',heldTouch=new Map(),padHeld=new Set(),latched={c:false,shift:false};
  const inputSource=document.currentScript?.src;
  const el={};let ready=false,device='keyboard',padVector={x:0,y:0},previous=new Set(),padIndex=null,neutral=false,menuDelay=0,lastPhase='';
  let stick=null,stickKnob=null,stickPointer=null,touchVector={x:0,y:0};
  let preferences={toggleSneak:false,toggleSprint:false,touch:window.matchMedia('(any-pointer: coarse)').matches||(typeof navigator!=='undefined'&&navigator.maxTouchPoints>0),joystick:true};
  try { const saved=JSON.parse(localStorage.getItem(KEY)||'null');for(const key of Object.keys(preferences))if(typeof saved?.[key]==='boolean')preferences[key]=saved[key]; } catch {}
  if(preferences.touch)device='touch';
  function resetStick() {
    const pointer=stickPointer;stickPointer=null;touchVector={x:0,y:0};
    if(stickKnob)stickKnob.style.transform='translate(0px, 0px)';
    if(stick){stick.dataset.active='false';try{if(pointer!==null&&stick.hasPointerCapture?.(pointer))stick.releasePointerCapture(pointer);}catch{}}
  }
  function clear() {
    input.clear();heldTouch.clear();padHeld.clear();padVector={x:0,y:0};latched.c=false;latched.shift=false;neutral=true;resetStick();
  }
  function held(key) { return input.has(key)||padHeld.has(key)||latched[key]===true||[...heldTouch.values()].includes(key); }
  function vector(keyboard) {
    let x=keyboard.x,y=keyboard.y;
    if(!x&&!y){x=Number(held('d'))-Number(held('a'));y=Number(held('s'))-Number(held('w'));}
    const len=Math.hypot(x,y);
    if(len)return {x:x/Math.max(1,len),y:y/Math.max(1,len)};
    return stickPointer!==null?touchVector:padVector;
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
  function savePreferences() { try{localStorage.setItem(KEY,JSON.stringify(preferences));}catch{} }
  function moveStick(event) {
    if(event.pointerId!==stickPointer)return;
    if(state.phase!=='playing'||ThorSystem.active(state)){resetStick();return;}
    event.preventDefault();
    const rect=stick.getBoundingClientRect(),radius=Math.max(1,Math.min(rect.width,rect.height)*.32);
    const x=event.clientX-rect.left-rect.width/2,y=event.clientY-rect.top-rect.height/2;
    const length=Math.hypot(x,y),distance=Math.min(length,radius);
    // A small dead zone absorbs finger jitter; diagonals never exceed normal speed.
    const strength=Math.max(0,(distance/radius-.15)/.85);
    touchVector=length?{x:x/length*strength,y:y/length*strength}:{x:0,y:0};
    stickKnob.style.transform=`translate(${length?x/length*distance:0}px, ${length?y/length*distance:0}px)`;
  }
  function initializeMobile() {
    // The headless gameplay harness has no DOM construction; retain its D-pad fallback.
    if(!document.createElement||!el.touchControls.querySelector)return;
    const shell=document.getElementById('gameShell');
    const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';
    stylesheet.href=new URL('mobile-controls.css?v=touch-1',inputSource||new URL('systems/game-input.js',document.baseURI)).href;
    document.head.appendChild(stylesheet);
    const viewport=document.querySelector('meta[name="viewport"]');
    if(viewport&&!/viewport-fit\s*=/.test(viewport.content))viewport.content+=', viewport-fit=cover';
    stick=document.createElement('div');stick.id='touchJoystick';stick.className='touch-joystick';
    stick.setAttribute('role','group');stick.setAttribute('aria-label','Analógico de movimento. Arraste para andar em qualquer direção.');
    stick.style.touchAction='none';stick.dataset.active='false';
    const arrows=document.createElement('span');arrows.className='touch-joystick-guide';arrows.textContent='✚';arrows.setAttribute('aria-hidden','true');
    stickKnob=document.createElement('span');stickKnob.className='touch-joystick-knob';stickKnob.setAttribute('aria-hidden','true');
    stick.append(arrows,stickKnob);el.touchControls.prepend(stick);
    el.touchDpad=el.touchControls.querySelector('.touch-dpad');
    stick.addEventListener('pointerdown',event=>{
      if(stickPointer!==null||state.phase!=='playing'||ThorSystem.active(state)||(event.button!==undefined&&event.button!==0))return;
      event.preventDefault();device='touch';stickPointer=event.pointerId;stick.dataset.active='true';
      try{stick.setPointerCapture?.(event.pointerId);}catch{}
      moveStick(event);
    });
    // Window fallbacks also release movement when an embedded browser loses capture.
    window.addEventListener('pointermove',moveStick,{passive:false});
    const release=event=>{heldTouch.delete(event.pointerId);if(event.pointerId===stickPointer)resetStick();};
    window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
    stick.addEventListener('lostpointercapture',release);
    el.touchControls.addEventListener('contextmenu',event=>event.preventDefault());
    const settings=document.getElementById('panel-controls');
    const label=document.createElement('label'),choice=document.createElement('input');
    choice.id='controlTouchStick';choice.type='checkbox';choice.checked=preferences.joystick;
    label.append(choice,document.createTextNode(' Usar analógico virtual (desmarque para usar setas)'));settings.appendChild(label);
    choice.addEventListener('change',()=>{preferences.joystick=choice.checked;savePreferences();clear();GameUI.update(state);});
    if(document.fullscreenEnabled&&shell.requestFullscreen){
      const fullscreen=document.createElement('button');fullscreen.type='button';fullscreen.id='mobileFullscreen';fullscreen.className='button-secondary';fullscreen.textContent='Tela cheia';
      settings.appendChild(fullscreen);
      fullscreen.addEventListener('click',async()=>{
        try{if(document.fullscreenElement)await document.exitFullscreen();else await shell.requestFullscreen();}
        catch{fullscreen.textContent='Tela cheia indisponível neste navegador';}
      });
      document.addEventListener('fullscreenchange',()=>{clear();fullscreen.textContent=document.fullscreenElement?'Sair da tela cheia':'Tela cheia';});
    }
    for(const paragraph of document.querySelectorAll('#howToPlayDialog .howto-body p'))
      if(paragraph.textContent.startsWith('No celular:'))paragraph.textContent='No celular: arraste o analógico à esquerda e use os botões à direita. Mansinho e Correr ligam e desligam com um toque. Você pode trocar o analógico por setas na aba Controles e jogar em pé ou deitado.';
    const resize=()=>{
      clear();
      const view=window.visualViewport;
      const height=view&&view.scale===1?view.height:window.innerHeight;
      if(height>0)shell.style.setProperty('--mobile-height',`${Math.round(height)}px`);
    };
    resize();window.addEventListener('resize',resize);window.addEventListener('orientationchange',resize);
    window.visualViewport?.addEventListener('resize',resize);
    window.addEventListener('blur',clear);window.addEventListener('pagehide',clear);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
  }
  function initialize() {
    if(ready)return;ready=true;
    for(const id of ['touchControls','touchRun','touchSneak','touchInteract','controlToggleSneak','controlToggleSprint','controlTouch','controlDevice'])el[id]=document.getElementById(id);
    for(const [id,key]of [['controlToggleSneak','toggleSneak'],['controlToggleSprint','toggleSprint'],['controlTouch','touch']]){
      el[id].checked=preferences[key];el[id].addEventListener('change',()=>{
        preferences[key]=el[id].checked;savePreferences();
        if(key==='touch')device=preferences.touch?'touch':'keyboard';
        clear();GameUI.update(state);
      });
    }
    for(const [id,key]of [['touchUp','w'],['touchDown','s'],['touchLeft','a'],['touchRight','d']]){
      const button=document.getElementById(id);
      button.addEventListener('pointerdown',event=>{
        if(state.phase!=='playing'||ThorSystem.active(state)||(event.button!==undefined&&event.button!==0))return;
        event.preventDefault();device='touch';try{button.setPointerCapture?.(event.pointerId);}catch{}heldTouch.set(event.pointerId,key);
      });
      for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,event=>heldTouch.delete(event.pointerId));
    }
    for(const [id,name]of [['touchInteract','interact'],['touchSneak','sneak'],['touchRun','run'],['touchPause','pause']]){
      const button=document.getElementById(id);
      const activate=()=>{device='touch';action(name);if(state.phase==='playing')document.getElementById('gameCanvas').focus({preventScroll:true});};
      // Act on contact so a second finger can interact while the first keeps steering.
      button.addEventListener('pointerdown',event=>{
        if(button.disabled||(event.button!==undefined&&event.button!==0))return;
        event.preventDefault();activate();
      });
      // Keyboard and assistive-technology clicks have detail=0. Do not double-fire touch clicks.
      button.addEventListener('click',(event={detail:0})=>{if(!event.detail)activate();});
    }
    initializeMobile();
  }
  function update(game) {
    initialize();const playing=game.phase==='playing'&&!ThorSystem.active(game);
    document.getElementById('gameShell').dataset.touch=String(preferences.touch);
    el.touchControls.hidden=!playing||!preferences.touch;
    document.getElementById('liveControls').hidden=!playing||preferences.touch;
    if(stick){stick.hidden=!preferences.joystick;el.touchDpad.hidden=preferences.joystick;if(!playing||!preferences.touch)resetStick();}
    el.touchRun.setAttribute('aria-pressed',String(held('shift')));el.touchSneak.setAttribute('aria-pressed',String(held('c')));
    const callable=playing&&RescueSystem.callTarget(game),hidden=game.entities.chicken.hidden;
    el.touchInteract.textContent=game.lake?.active?'Carimbar':callable?'Chamar':hidden?'Sair':'Esconder';
    el.touchInteract.disabled=!playing||(game.lake?.active?!LakeChallenge.canCounter(game):(!callable&&!hidden&&!HidingSpots.candidate(game.entities.chicken)));
    el.controlDevice.textContent=device==='gamepad'?'Controle conectado · A confirma, B volta, direcional navega.':device==='touch'?`${preferences.joystick?'Arraste o analógico':'Toque nas setas'} para andar. Mansinho e Correr ligam e desligam com um toque.`:'Teclado · WASD ou setas para mover; E para interagir.';
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
