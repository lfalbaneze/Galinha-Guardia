// Built-game review: mode selection, pointer/keyboard/touch, saves, settings and results.
// Run npm run build, then node scripts/review-rescue-menu.cjs [viewport].
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../dist'),out=path.resolve(__dirname,'../.cache/rescue-menu-review'),pending=new Map();let next=0,buffer='';
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'index.html'),fs.readFileSync(path.join(root,'index.html'),'utf8').replace('<head>',`<head><base href="${pathToFileURL(root+path.sep).href}"><script>window.nativeRAF=requestAnimationFrame;window.requestAnimationFrame=()=>0;</script>`));
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',[
  '--headless=new','--mute-audio','--disable-gpu','--no-first-run','--disable-background-networking','--remote-debugging-pipe','--allow-file-access-from-files',
  '--user-data-dir='+path.join(out,'profile')],{windowsHide:true,stdio:['ignore','ignore','ignore','pipe','pipe']});
const errors=[];
browser.stdio[4].on('data',chunk=>{buffer+=chunk.toString();let end;while((end=buffer.indexOf('\0'))>=0){
  const data=buffer.slice(0,end);buffer=buffer.slice(end+1);if(!data)continue;const message=JSON.parse(data),task=pending.get(message.id);
  if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails);
  if(task){pending.delete(message.id);clearTimeout(task.timer);message.error?task.reject(Error(JSON.stringify(message.error))):task.resolve(message.result);}
}});
const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++next;
  const timer=setTimeout(()=>{pending.delete(id);reject(Error('Timeout: '+method));},20000);pending.set(id,{resolve,reject,timer});
  browser.stdio[3].write(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})})+'\0');});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 const results=[];
 for(const [name,width,height,touch] of [['wide',1920,900,false],['desktop',1440,900,false],['laptop',1366,768,false],['mobile',390,844,true],['small',360,640,true],['landscape',844,390,true]].filter(([name])=>!process.argv[2]||name===process.argv[2])){
  const {targetId}=await call('Target.createTarget',{url:'about:blank'}),{sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
  await call('Runtime.enable',{},sessionId);await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:touch},sessionId);
  if(touch)await call('Emulation.setTouchEmulationEnabled',{enabled:true},sessionId);
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const click=async id=>{const point=await evaluate(`(()=>{const e=document.getElementById('${id}');e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);if(touch){await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]},sessionId);await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]},sessionId);}else{await call('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1},sessionId);await call('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1},sessionId);}};
  const shot=async label=>{await evaluate('InterfaceMotion.frame(state,.1);document.getAnimations().forEach(a=>a.finish())');await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:width-1,y:height-1},sessionId);await wait(90);const {data}=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sessionId);fs.writeFileSync(path.join(out,`${name}-${label}.png`),Buffer.from(data,'base64'));};
  const result={name,issues:[]},check=async(expression,message)=>{if(!await evaluate(expression))result.issues.push(message);};
  await call('Page.navigate',{url:pathToFileURL(path.join(out,'index.html')).href},sessionId);
  let ready=false;for(let i=0;i<120;i++){ready=await evaluate(`typeof state!=='undefined'&&[CharacterArt,GooseArt,FoxArt,OwlArt,ThorArt,ScarecrowArt].every(a=>a.ready)`);if(ready)break;await wait(100);}if(!ready)throw Error('Assets not ready: '+JSON.stringify(errors));
  await evaluate(`difficultySelect.value='normal';resetGame(52);state.hasSave=false;state.phase='menu';GameUI.update(state);InterfaceMotion.frame(state,.1);document.fonts.ready`);
  await shot('home'); await check(`getComputedStyle(document.querySelector('.home-actions')).flexDirection==='column' && getComputedStyle(document.getElementById('farmTitle')).fontFamily.includes('Farm Display') && getComputedStyle(document.getElementById('menuCard')).backgroundColor==='rgba(0, 0, 0, 0)'`,'expedition title styles did not apply');
  await check(`document.fonts.check('14px "Farm Text"')`,'interface font missing');
  await check(`getComputedStyle(document.getElementById('expeditionBar')).display==='none'`,'gameplay HUD leaked into title screen');
  await check(`document.documentElement.scrollWidth<=innerWidth&&document.getElementById('menuScreen').scrollHeight<=document.getElementById('menuScreen').clientHeight+1`,'home needs scrolling');
  await check(`document.getElementById('menuSettings').hidden&&document.getElementById('continueBtn').hidden`,'home not isolated');
  if(width>980&&height>520){
    const savedTitle=await evaluate('JSON.stringify(state)');
    await click('menuScatter');
    await evaluate('for(let i=0;i<18;i++)InterfaceMotion.frame(state,.05)');await shot('walking');
    await check(`!document.getElementById('menuBanter').hidden&&document.getElementById('menuBanter').textContent.includes('Erina')`,'title troupe did not react');
    await check(`(()=>{const bubble=document.getElementById('menuBanter');if(getComputedStyle(bubble).visibility==='hidden')return !document.getElementById('menuBanterLink').getAttribute('d');const b=bubble.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth&&b.top>=0&&b.bottom<=innerHeight&&['menuCard','farmTitle','menuTagline','menuSubtitle','menuMischief'].every(id=>{const r=document.getElementById(id).getBoundingClientRect();return !(b.right>r.left&&b.left<r.right&&b.bottom>r.top&&b.top<r.bottom);});})()`,'title speech covers controls or leaves viewport');
    await evaluate('for(let i=0;i<48;i++)InterfaceMotion.frame(state,.05)');await shot('reply');
    await check(`!document.getElementById('menuBanter').textContent.startsWith('Erina')`,'title partner did not reply');
    await evaluate('for(let i=0;i<70;i++)InterfaceMotion.frame(state,.05)');
    const target=await evaluate(`(()=>{const c=document.getElementById('menuScene'),ctx=c.getContext('2d'),orig={save:ctx.save,restore:ctx.restore,translate:ctx.translate,scale:ctx.scale};let depth=0;const actors=[];
      ctx.save=function(){depth++;orig.save.call(this)};ctx.restore=function(){depth--;orig.restore.call(this)};
      ctx.translate=function(x,y){if(depth===1)actors.push({x,y});orig.translate.call(this,x,y)};
      ctx.scale=function(x,y){if(depth===1)actors.at(-1).scale=x;orig.scale.call(this,x,y)};
      InterfaceMotion.frame(state,.016);Object.assign(ctx,orig);
      const r=c.getBoundingClientRect(),card=document.getElementById('menuCard').getBoundingClientRect();
      return actors.map(a=>({x:r.left+a.x/c.clientWidth*r.width,y:r.top+(a.y-16*a.scale)/c.clientHeight*r.height})).find(p=>p.x>30&&p.x<innerWidth-30&&p.y>50&&p.y<innerHeight-40&&!(p.x>card.left&&p.x<card.right&&p.y>card.top&&p.y<card.bottom));})()`);
    if(!target)result.issues.push('no visible title animal to touch');
    else{await call('Input.dispatchMouseEvent',{type:'mousePressed',...target,button:'left',clickCount:1},sessionId);await call('Input.dispatchMouseEvent',{type:'mouseReleased',...target,button:'left',clickCount:1},sessionId);await check(`!document.getElementById('menuBanter').hidden`,'direct animal click missed');}
    await check(`JSON.stringify(state)===${JSON.stringify(savedTitle)}`,'title animation changed the saved game');
  }
  await click('newAdventureBtn');await shot('setup');
  await check(`!document.getElementById('menuSettings').hidden&&state.phase==='menu'`,'new adventure did not open setup');
  const beforeBriefing=await evaluate('JSON.stringify(state)');
  await evaluate('for(let i=0;i<10;i++)InterfaceMotion.frame(state,.05)');
  await check(`JSON.stringify(state)===${JSON.stringify(beforeBriefing)}`,'mission art changed the saved simulation');
  await check(`['journeyCast','journeyChick','journeyPanto','journeyThor','journeyPlayer','difficultyArt-easy','difficultyArt-normal','difficultyArt-hard','difficultyArt-hardcore'].every(id=>{const c=document.getElementById(id),s=getComputedStyle(c),p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return s.backgroundColor==='rgba(0, 0, 0, 0)'&&s.borderWidth==='0px'&&p.some((v,i)=>i%4===3&&v>0);})`,'mission sprites missing or inherited an old canvas frame');
  await check(`document.activeElement.id==='menuSettings'&&!document.querySelector('#menuSettings button:focus-visible')`,'pointer opening shows a keyboard-only outline');
  const rowHeights=await evaluate(`Array.from(document.querySelectorAll('.difficulty-picks button'),b=>b.getBoundingClientRect().height)`);
  const difficultyImages=[];
  for(const mode of ['easy','normal','hard','hardcore']){
    await click('difficulty-'+mode);
    await check(`(()=>{const buttons=Array.from(document.querySelectorAll('.difficulty-picks button')),selected=document.getElementById('difficulty-${mode}'),rules=DIFFICULTIES['${mode}'];return buttons.filter(b=>b.getAttribute('aria-checked')==='true').length===1&&selected.getAttribute('aria-checked')==='true'&&buttons.filter(b=>b.tabIndex===0).length===1&&getComputedStyle(selected).borderWidth==='0px'&&document.getElementById('difficultyClock').textContent===(rules.timeLimit?rules.timeLimit+'s iniciais':'Sem limite')&&document.getElementById('difficultyReward').textContent===(rules.rescueScore||100)+' pontos'&&document.getElementById('panel-adventure').dataset.difficulty==='${mode}'&&buttons.every((b,i)=>Math.abs(b.getBoundingClientRect().height-${JSON.stringify(rowHeights)}[i])<1);})()`,'wrong or unstable mode presentation: '+mode);
    await shot(mode);
    await check(`(()=>{const source=document.querySelector('.journey-landscape[data-difficulty="${mode}"]'),actual=document.getElementById('journeyCast');
      if(!source?.complete||source.naturalWidth!==624||source.naturalHeight!==416)return false;
      const expected=document.createElement('canvas');expected.width=624;expected.height=416;expected.getContext('2d').drawImage(source,0,0);
      return actual.toDataURL()===expected.toDataURL();})()`,'wrong illustration for difficulty: '+mode);
    difficultyImages.push(await evaluate(`document.getElementById('journeyCast').toDataURL()`));
    await check(`document.getElementById('journeyChickCount').textContent===(DIFFICULTIES['${mode}'].bonusChicks||WORLD.targetChicks)+' pintinhos'`,'mission bonus count does not match mode');
  }
  if(new Set(difficultyImages).size!==4)result.issues.push('difficulty illustrations are not distinct');
  const key=async(key,code=key,vk)=>{await call('Input.dispatchKeyEvent',{type:'keyDown',key,code,...(vk?{windowsVirtualKeyCode:vk}:{})},sessionId);await call('Input.dispatchKeyEvent',{type:'keyUp',key,code,...(vk?{windowsVirtualKeyCode:vk}:{})},sessionId);};
  await key('ArrowDown','ArrowDown',40);
  await check(`document.activeElement.id==='difficulty-easy'&&document.activeElement.matches(':focus-visible')&&difficultySelect.value==='easy'`,'arrow navigation does not wrap with visible focus');
  await key('End','End',35);await shot('keyboard');
  await check(`document.activeElement.id==='difficulty-hardcore'&&difficultySelect.value==='hardcore'&&getComputedStyle(document.activeElement).outlineStyle!=='none'`,'End does not choose hardcore with keyboard focus');
  await check(`document.documentElement.scrollWidth<=innerWidth&&document.getElementById('menuSettings').scrollWidth<=document.getElementById('menuSettings').clientWidth+1`,'setup has horizontal overflow');
  await check(`(()=>{const b=document.getElementById('menuBackBtn').getBoundingClientRect(),s=document.getElementById('startBtn').getBoundingClientRect();return b.y>=0&&b.bottom<=innerHeight&&s.y>=0&&s.bottom<=innerHeight;})()`,'back or start action outside viewport');

  await check(`difficultySelect.value==='hardcore'&&state.difficultyKey==='normal'`,'difficulty changed saved game');
  await evaluate(`document.getElementById('difficultyRules').open=true`);
  await check(`(()=>{const e=document.getElementById('startBtn'),r=e.getBoundingClientRect();return r.y>=0&&r.bottom<=innerHeight})()`,'start button clipped with rules open');
  await evaluate(`document.getElementById('difficultyRules').open=false`);
  await click('menuBackBtn');await click('menuCharacterBtn');await shot('characters');
  await check(`!document.getElementById('panel-outfit').hidden&&document.getElementById('menuStartFooter').hidden`,'character panel wrong');
  const originalCast=await evaluate(`document.getElementById('journeyPlayer').toDataURL()`);
  await evaluate(`document.getElementById('menuSkinSelect').value='silkie';document.getElementById('menuSkinSelect').dispatchEvent(new Event('change',{bubbles:true}));`);
  await click('tab-adventure');await shot('chosen-character');
  await check(`document.getElementById('journeyPlayerName').textContent==='Midori na missão'&&document.getElementById('journeyPlayer').toDataURL()!==${JSON.stringify(originalCast)}`,'mission portrait did not follow equipped character');
  await click('tab-outfit');await evaluate(`document.getElementById('menuSkinSelect').value='classic';document.getElementById('menuSkinSelect').dispatchEvent(new Event('change',{bubbles:true}));`);
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27},sessionId);await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27},sessionId);
  await check(`document.getElementById('menuSettings').hidden&&document.activeElement.id==='menuCharacterBtn'`,'escape does not return focus');
  await click('menuOptionsBtn');await shot('audio');await click('tab-controls');await shot('controls');
  await click('menuBackBtn');await click('howToPlayBtn');await check(`document.getElementById('howToPlayDialog').open`,'help not reachable');await evaluate(`document.getElementById('howToPlayDialog').close()`);
  await click('newAdventureBtn');await click('startBtn');await check(`state.phase==='playing'&&state.difficultyKey==='hardcore'`,'start uses wrong mode');
  await evaluate(`for(const a of state.entities.animals.slice(0,7))GameManager.rescue(state,a);GameUI.showMenu(state);`);await shot('saved');
  const saved=await evaluate('JSON.stringify([state.worldSeed,state.rescuedCount,state.difficultyKey])');
  await click('newAdventureBtn');await click('difficulty-easy');await click('menuBackBtn');await click('continueBtn');
  await check(`state.phase==='playing'&&JSON.stringify([state.worldSeed,state.rescuedCount,state.difficultyKey])===${JSON.stringify(saved)}`,'continue changed saved progress');
  await evaluate(`for(const chick of state.entities.chicks.slice(0,4))GameManager.rescue(state,Object.assign(chick,{discovered:true}));state.timeRemaining=14;state.elapsed=96;GameUI.update(state);updateCamera(10);renderGame();`);
  await shot('pressure');
  await check(`getComputedStyle(document.getElementById('comboMultiplier')).fontFamily.includes('Farm Text')&&parseFloat(getComputedStyle(document.getElementById('comboMultiplier')).fontSize)<=14`,'combo inherited the old HUD font');
  await check(`['runTimer','chickCombo','pauseBtn','livesCard','chickCounter'].every(id=>{const r=document.getElementById(id).getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;})`,'timed HUD does not fit');
  await evaluate(`for(const friend of RescueSystem.all(state))GameManager.rescue(state,Object.assign(friend,{discovered:true}));GameManager.win(state);for(let i=0;i<410;i++)updateGame(.05);renderGame();`);
  await shot('result');
  await check(`state.phase==='won'&&!document.getElementById('endScreen').hidden&&getComputedStyle(document.getElementById('expeditionBar')).display==='none'`,'result or HUD isolation failed');
  await check(`(()=>{const r=document.querySelector('#endScreen .end-card').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;})()`,'result does not fit screen');
  await click('replayBtn');await check(`state.phase==='playing'&&state.score===0&&state.rescuedCount===0`,'retry did not start cleanly');
  results.push(result);console.log(JSON.stringify(result));await call('Target.closeTarget',{targetId});
 }
 fs.writeFileSync(path.join(out,process.argv[2]?`report-${process.argv[2]}.json`:'report.json'),JSON.stringify({results,errors},null,2));if(errors.length||results.some(r=>r.issues.length))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>browser.kill());
