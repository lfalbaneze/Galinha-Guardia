// Isolated Chromium: real finale, pause, responsive layout and reduced motion.
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.cache/ending-review'),pending=new Map();let next=0,buffer='';
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
  for(const [name,width,height,touch] of [['desktop',1440,900,false],['mobile',390,844,true],['landscape',844,390,true]]) {
    const {targetId}=await call('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
    await call('Runtime.enable',{},sessionId);
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:touch},sessionId);
    if(touch)await call('Emulation.setTouchEmulationEnabled',{enabled:true},sessionId);
    const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
    const assertCleanEnding=async()=>{
      const visible=await evaluate(`Array.from(document.querySelectorAll('.expedition-bar,.play-hud,.play-region,.game-feedback,#thorSupply,.live-controls,.region-notice,.lake-panel,.lake-counter,.touch-controls,.thor-scene-controls,.status-line'))
        .filter(el=>el.getClientRects().length&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden').map(el=>el.id||el.className)`);
      if(visible.length)throw Error('Gameplay UI overlaps ending: '+visible.join(', '));
    };
    const reviewResult=async label=>{
      await evaluate("Promise.all(document.getElementById('endScreen').getAnimations().map(a=>a.finished.catch(()=>{})))");
      const contrast=await evaluate(`(()=>{
        const rgb=value=>value.match(/[\\d.]+/g).map(Number);
        const light=color=>color.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
        return ['endTitle','endEyebrow','endMessage','endSummary','replayBtn','menuBtn'].map(id=>{
          const el=document.getElementById(id),style=getComputedStyle(el),ink=rgb(style.color);let node=el,bg;
          while(node){bg=rgb(getComputedStyle(node).backgroundColor);if(bg.length===3||bg[3]>=.999)break;node=node.parentElement;}
          const a=light(ink),b=light(bg),rect=el.getBoundingClientRect();
          return {id,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),inside:rect.left>=0&&rect.right<=innerWidth&&rect.top>=0&&rect.bottom<=innerHeight};
        });
      })()`);
      if(contrast.some(c=>c.ratio<4.5||!c.inside))throw Error('Result readability: '+JSON.stringify(contrast));
      const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sessionId);
      fs.writeFileSync(path.join(root,`preview/result-${name}-${label}.png`),Buffer.from(shot.data,'base64'));
      return Math.min(...contrast.map(c=>c.ratio));
    };
    await call('Page.navigate',{url:pathToFileURL(path.join(out,'index.html')).href},sessionId);
    for(let i=0;i<100;i++){if(await evaluate('typeof state!=="undefined"&&CharacterArt.ready&&FarmSprites.ready&&FarmSprites.propsReady'))break;await wait(100);}
    if(!await evaluate('CharacterArt.ready&&FarmSprites.propsReady'))throw Error('Art did not load');
    await evaluate(`localStorage.clear();difficultySelect.value='${name==='desktop'?'easy':name==='mobile'?'normal':'hard'}';resetGame(814237);state.phase='playing';GameUI.update(state);
      for(const friend of RescueSystem.all(state))GameManager.rescue(state,Object.assign(friend,{discovered:true}));GameManager.win(state);`);
    await assertCleanEnding();
    const shots=[];
    for(const [label,t] of [['circle',5.5],['brawl',8.12],['impact',10.45],['crying',11.8],['escape',14.2],['party',18.1]]) {
      await evaluate(`while(state.cutscene.time<${t}-.00001)updateGame(Math.min(.05,${t}-state.cutscene.time));GameUI.update(state);renderGame();`);
      await assertCleanEnding();
      const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sessionId);
      fs.writeFileSync(path.join(root,`preview/ending-${name}-${label}.png`),Buffer.from(r.data,'base64'));shots.push(label);
      if(label==='brawl') {
        const before=await evaluate('state.cutscene.time');
        const frozenFrame=await evaluate('canvas.toDataURL()');
        // No gameplay buttons during the finale. Escape and losing focus still pause it.
        if(touch)await evaluate("window.dispatchEvent(new Event('blur'))");
        else {
          await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27},sessionId);
          await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27},sessionId);
        }
        await evaluate('updateGame(2)');
        if(!await evaluate(`state.phase==='menu'&&state.cutscene.time===${before}`))throw Error('Pause failed');
        await evaluate("document.getElementById('continueBtn').click();GameUI.update(state);renderGame();");
        if(!await evaluate("state.phase==='win_cutscene'&&getComputedStyle(document.querySelector('.play-hud')).display==='none'"))throw Error('Resume/HUD failed');
        await assertCleanEnding();
        if(await evaluate('canvas.toDataURL()')!==frozenFrame)throw Error('Paused animation changed on resume');
      }
    }
    await evaluate("while(state.phase==='win_cutscene')updateGame(.05);GameUI.update(state);renderGame();");
    if(!await evaluate("state.phase==='won'&&!document.getElementById('endScreen').hidden&&GameManager.read().phase==='won'"))throw Error('Win did not persist');
    await assertCleanEnding();
    const victoryContrast=await reviewResult('victory');
    await evaluate("document.getElementById('replayBtn').click();GameUI.update(state);renderGame();");
    if(!await evaluate("state.phase==='playing'&&document.getElementById('expeditionBar').getClientRects().length>0&&document.getElementById('thorSupply').getClientRects().length>0&&state.score===0"))throw Error('Replay/HUD failed');
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]},sessionId);
    await evaluate(`for(const friend of RescueSystem.all(state))GameManager.rescue(state,Object.assign(friend,{discovered:true}));GameManager.win(state);while(state.cutscene.time<8.1)updateGame(.05);renderGame();`);
    if(!await evaluate('InterfaceMotion.reduced&&!EndGameSequence.pose(state,state.entities.wolf).rotation'))throw Error('Reduced motion failed');
    const reduced=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sessionId);
    fs.writeFileSync(path.join(root,`preview/ending-${name}-reduced.png`),Buffer.from(reduced.data,'base64'));
    await evaluate("resetGame(814237);state.phase='lose';state.lives=0;GameUI.update(state);renderGame();");
    const defeatContrast=await reviewResult('defeat');
    results.push({name,shots,pause:true,replay:true,persisted:true,reducedMotion:true,victoryContrast,defeatContrast});
    await call('Target.closeTarget',{targetId});
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,runtimeErrors},null,2));
  console.log(JSON.stringify({results,runtimeErrors}));if(runtimeErrors.length)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await call('Browser.close').catch(()=>{});browser.kill();});
