// Isolated Chromium: Thor costs, cinematic, pause, reload, touch and keyboard recovery.
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.cache/thor-cinematic-review'),pending=new Map();let next=0,buffer='';
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'index.html'),fs.readFileSync(path.join(root,'index.html'),'utf8').replace('<head>',`<head><base href="${pathToFileURL(root+path.sep).href}"><script>window.nativeRAF=requestAnimationFrame;window.requestAnimationFrame=()=>0;</script>`));
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',[
  '--headless=new','--mute-audio','--disable-gpu','--no-first-run','--disable-background-networking','--remote-debugging-pipe','--allow-file-access-from-files',
  '--user-data-dir='+path.join(out,'profile')],{windowsHide:true,stdio:['ignore','ignore','ignore','pipe','pipe']});
const runtimeErrors=[];
browser.stdio[4].on('data',chunk=>{buffer+=chunk.toString();let end;while((end=buffer.indexOf('\0'))>=0){
  const data=buffer.slice(0,end);buffer=buffer.slice(end+1);if(!data)continue;const message=JSON.parse(data),task=pending.get(message.id);
  if(message.method==='Runtime.exceptionThrown')runtimeErrors.push(message.params.exceptionDetails);
  if(task){pending.delete(message.id);clearTimeout(task.timer);message.error?task.reject(Error(JSON.stringify(message.error))):task.resolve(message.result);}
}});
const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++next;
  const timer=setTimeout(()=>{pending.delete(id);reject(Error('Timeout: '+method));},20000);pending.set(id,{resolve,reject,timer});
  browser.stdio[3].write(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})})+'\0');});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
  const results=[];
  for(const [name,width,height,touch,difficulty,cost] of [['desktop',1440,900,false,'easy',0],['mobile',390,844,true,'normal',2],['small-mobile',360,640,true,'hard',3],['landscape',844,390,true,'normal',2]]){
    const {targetId}=await call('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
    await call('Runtime.enable',{},sessionId);
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:touch},sessionId);
    if(touch)await call('Emulation.setTouchEmulationEnabled',{enabled:true},sessionId);
    const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
    const ready=async()=>{for(let i=0;i<100;i++){if(await evaluate('typeof state!=="undefined"&&[CharacterArt,ThorArt,GooseArt,FoxArt,OwlArt,ScarecrowArt].every(a=>a.ready)')){await evaluate('ThorCinematic.load()');await wait(200);return;}await wait(100);}throw Error('Sprites did not load');};
    const click=async id=>{const p=await evaluate(`(()=>{const r=document.getElementById('${id}').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);
      if(touch){await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1}]},sessionId);await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]},sessionId);}
      else{await call('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1},sessionId);await call('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1},sessionId);}
    };
    const shot=async suffix=>{await evaluate('GameUI.update(state);renderGame();');const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sessionId);fs.writeFileSync(path.join(root,`preview/thor-${name}-${suffix}.png`),Buffer.from(r.data,'base64'));};
    await call('Page.navigate',{url:pathToFileURL(path.join(out,'index.html')).href},sessionId);await ready();
    await evaluate(`localStorage.clear();difficultySelect.value='${difficulty}';document.getElementById('startBtn').click();state.lives=1;
      window.p=state.entities.chicken;for(const b of ThorSystem.bones(state)){p.x=b.x;p.y=b.y;ThorSystem.update(state,.05);}
      p.x=WORLD.layout.start.x;p.y=WORLD.layout.start.y;GameUI.update(state);renderGame();`);
    if(cost){
      if(!await evaluate(`ThorSystem.boneCount(state)===${cost}&&!ThorSystem.active(state)&&!document.getElementById('thorSupply').disabled`))throw Error('Paid summon readiness failed');
      await shot('ready');await click('thorSupply');
    }else await evaluate('updateGame(.05);');
    if(!await evaluate('ThorSystem.active(state)&&ThorSystem.boneCount(state)===0'))throw Error('No rescue started after call '+JSON.stringify(await evaluate('({phase:state.phase,difficulty:state.difficultyKey,lives:state.lives,visit:state.thorVisit,swim:SwimmingSystem.profile(state),lake:state.lake.active})')));
    await evaluate(`window.frozen=JSON.stringify([state.elapsed,state.entities.chicken.x,state.entities.chicken.y,state.entities.wolf.x,state.entities.wolf.y]);for(let i=0;i<16;i++)updateGame(.05);renderGame();`);
    if(!await evaluate('frozen===JSON.stringify([state.elapsed,state.entities.chicken.x,state.entities.chicken.y,state.entities.wolf.x,state.entities.wolf.y])'))throw Error('World advanced during scene');
    await shot('house');
    const controls=await evaluate("['thorScenePause','thorSceneSkip'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,w:r.width,h:r.height,inside:r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,visible:getComputedStyle(document.getElementById(id)).display!=='none'};})");
    if(controls.some(r=>!r.inside||!r.visible||r.w<44||r.h<44))throw Error('Scene controls '+JSON.stringify(controls));
    await click('thorScenePause');
    const paused=await evaluate('state.thorRescue.time');await evaluate('for(let i=0;i<15;i++)updateGame(.05)');
    if(!await evaluate(`state.phase==='menu'&&state.thorRescue.time===${paused}`))throw Error('Pause advanced scene');
    await evaluate("document.getElementById('continueBtn').click()");
    await evaluate('for(let i=0;i<32;i++)updateGame(.05);');await shot('run');
    // A real navigation reload resumes the saved scene with exactly one reserved payment.
    await evaluate('GameManager.save(state)');await call('Page.reload',{},sessionId);await ready();
    await evaluate("document.getElementById('continueBtn').click()");
    if(!await evaluate(`ThorSystem.active(state)&&state.thorVisit.visits===1&&ThorSystem.boneCount(state)===0&&state.lives===1`))throw Error('Reload lost scene or payment');
    await evaluate('for(let i=0;i<36;i++)updateGame(.05);');await shot('healed');
    if(!await evaluate(`state.lives===${cost?3:2}`))throw Error('Wrong heal amount');
    await evaluate('while(ThorSystem.active(state))updateGame(.05);GameUI.update(state);renderGame();');
    if(!await evaluate("document.getElementById('thorSceneControls').hidden&&document.activeElement===canvas"))throw Error('Focus not returned to game');
    await call('Input.dispatchKeyEvent',{type:'keyDown',key:'d',code:'KeyD',windowsVirtualKeyCode:68},sessionId);
    if(!await evaluate("input.has('d')"))throw Error('Keyboard did not recover');
    await call('Input.dispatchKeyEvent',{type:'keyUp',key:'d',code:'KeyD',windowsVirtualKeyCode:68},sessionId);
    if(!cost){await evaluate('state.lives=1;ThorSystem.update(state,.05);');if(await evaluate('ThorSystem.active(state)'))throw Error('Easy aid repeated');}
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]},sessionId);
    await evaluate(`resetGame(814237);state.lives=1;for(const b of ThorSystem.bones(state)){const p=state.entities.chicken;p.x=b.x;p.y=b.y;ThorSystem.update(state,.05);}state.entities.chicken.x=WORLD.layout.start.x;state.entities.chicken.y=WORLD.layout.start.y;${cost?'ThorSystem.request(state);':'ThorSystem.update(state,.05);'}for(let i=0;i<18;i++)updateGame(.05);GameUI.update(state);renderGame();`);
    await click('thorSceneSkip');if(!await evaluate(`!ThorSystem.active(state)&&state.lives===${cost?3:2}`))throw Error('Skip did not deliver help');
    results.push({name,difficulty,cost,hearts:cost?3:2,controls,pause:true,reload:true,worldFrozen:true,keyboard:true,skip:true});
    await call('Target.closeTarget',{targetId});
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,runtimeErrors},null,2));
  console.log(JSON.stringify({results,runtimeErrors}));if(runtimeErrors.length)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await call('Browser.close').catch(()=>{});browser.kill();});
