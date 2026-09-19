// Real Chromium screenshots and interaction checks for the responsive game field.
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.cache/playfield-review'),pending=new Map();let next=0,buffer='';
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'index.html'),fs.readFileSync(path.join(root,'index.html'),'utf8').replace('<head>',`<head><base href="${pathToFileURL(root+path.sep).href}"><script>window.nativeRAF=requestAnimationFrame;window.requestAnimationFrame=()=>0;</script>`));
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',[
  '--headless=new','--disable-gpu','--no-first-run','--disable-background-networking','--remote-debugging-pipe',
  ...(process.env.FARM_STRICT_FILE==='1'?[]:['--allow-file-access-from-files']),
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
  for(const [name,width,height,touch] of [['desktop',1440,900,false],['laptop',1280,720,false],['mobile',390,844,true],['landscape',844,390,true]]) {
    const {targetId}=await call('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
    await call('Runtime.enable',{},sessionId);
    if(touch)await call('Emulation.setTouchEmulationEnabled',{enabled:true},sessionId);
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:touch},sessionId);
    await call('Page.navigate',{url:pathToFileURL(path.join(out,'index.html')).href},sessionId);
    const evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression,returnByValue:true},sessionId);if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
    let ready=false;
    for(let i=0;i<150;i++){ready=await evaluate('typeof FarmScenery!=="undefined" && typeof state!=="undefined" && FarmScenery.ready && [CharacterArt,GooseArt,FoxArt,OwlArt,ThorArt,ScarecrowArt].every(a=>a.ready)');if(ready)break;await wait(100);}
    if(!ready)throw Error('Assets did not finish loading');
    const errors=[],assert=(ok,message)=>{if(!ok)errors.push(message);};
    await evaluate(`document.getElementById('tab-controls').click();var touchOption=document.getElementById('controlTouch');touchOption.checked=${touch};touchOption.dispatchEvent(new Event('change'));document.getElementById('startBtn').click();resetGame(814237);state.phase='playing';state.entities.chicken.skin='punk';GameUI.update(state);renderGame();updateCamera(10);renderGame();`);
    await wait(180);
    assert(await evaluate(`document.documentElement.scrollWidth<=innerWidth && document.documentElement.scrollHeight<=innerHeight`),'no page scrolling');
    assert(await evaluate(`(()=>{const r=document.getElementById('gameCanvas').getBoundingClientRect();return r.width===innerWidth&&r.height===innerHeight&&Math.abs(canvas.width/canvas.height-r.width/r.height)<.005;})()`),'field fills window without distorting sprites');
    assert(await evaluate(`['pauseBtn','farmHud','livesCard','chickCounter'].every(id=>{const r=document.getElementById(id).getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;})`),'HUD visible inside viewport');
    assert(await evaluate('Sunlight.inspect().casts>0'),'off-screen sunlight still projects the scenery shadows');
    assert(await evaluate(`(()=>{const accents=FarmScenery.details(WORLD.layout);return accents.length>0&&accents.length<=12&&accents.every(p=>p.kind<=1);})()`),'planted landmark accents without loose decorative tools');
    assert(await evaluate(`getComputedStyle(document.getElementById('skinPowerBadge')).display==='none' && getComputedStyle(document.getElementById('hiddenText')).display==='none'`),'passive badges do not repeat the equipped skin or normal visibility');
    if(touch) {
      assert(await evaluate(`!document.getElementById('touchControls').hidden && Array.from(document.querySelectorAll('.touch-controls button')).every(b=>{const r=b.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;})`),'touch targets fit');
      const point=await evaluate(`(()=>{const r=document.getElementById('touchRight').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
      const before=await evaluate('state.entities.chicken.x');
      await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:1}]},sessionId);
      await evaluate('Player.update(state,.05)');
      await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]},sessionId);
      assert(await evaluate('state.entities.chicken.x')>before,'touch movement works');
      assert(await evaluate('Player.moveVector().x===0'),'touch release stops movement');
    }
    const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sessionId);
    fs.writeFileSync(path.join(root,`preview/farm-play-${name}.png`),Buffer.from(shot.data,'base64'));
    const stateBefore=await evaluate('JSON.stringify([state.worldSeed,state.rescuedCount,state.rescuedChicks,state.lives])');
    await evaluate("document.getElementById('pauseBtn').click();");
    assert(await evaluate("state.phase==='menu' && !document.getElementById('menuScreen').hidden"),'pause opens menu');
    await evaluate("document.getElementById('continueBtn').click();renderGame();");
    assert(await evaluate("state.phase==='playing'"),'resume returns to play');
    assert(await evaluate('JSON.stringify([state.worldSeed,state.rescuedCount,state.rescuedChicks,state.lives])')===stateBefore,'pause preserves progress');
    if(!touch) {
      const before=await evaluate('state.entities.chicken.x');
      await call('Input.dispatchKeyEvent',{type:'keyDown',key:'d',code:'KeyD',windowsVirtualKeyCode:68},sessionId);
      await evaluate('updateGame(.05);');
      await call('Input.dispatchKeyEvent',{type:'keyUp',key:'d',code:'KeyD',windowsVirtualKeyCode:68},sessionId);
      assert(await evaluate('state.entities.chicken.x')>before,'keyboard still moves player');
    }
    for(const id of touch?['garden']:['meadow','garden']) {
      await evaluate(`var destination=${id==='garden'?"WORLD.layout.plots.find(p=>p.kind==='garden')":"WORLD.layout.habitats.find(h=>h.kind==='flowers')"};Object.assign(state.entities.chicken,{x:destination.x+(destination.w||0)/2,y:destination.y+(destination.h||0)/2+65});MapManager.update(state,0);if(state.mapTransition)state.mapTransition.time=0;updateCamera(10);GameUI.update(state);renderGame();`);
      const frame=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sessionId);
      fs.writeFileSync(path.join(root,`preview/farm-${id}-${name}.png`),Buffer.from(frame.data,'base64'));
    }
    // A secret chick has one nearby action cue, with no duplicate footer instruction.
    await evaluate(`var chick=state.entities.chicks.find(c=>!c.rescued);Object.assign(state.entities.chicken,{x:chick.x,y:chick.y});MapManager.update(state,0);state.mapTransition.time=0;HidingSpots.update(state,0);updateCamera(10);GameUI.update(state);renderGame();`);
    assert(await evaluate(`!!RescueSystem.callTarget(state)&&document.getElementById('contextHint').dataset.important==='false'`),'chick action appears only in the world');
    const interactionFrame=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sessionId);
    fs.writeFileSync(path.join(root,`preview/farm-quiet-interact-${name}.png`),Buffer.from(interactionFrame.data,'base64'));
    for(const edge of ['north','south']) {
      await evaluate(`state.entities.chicken.y=${edge==='north'?'24':'WORLD.height-24'};updateCamera(10);renderGame();`);
      assert(await evaluate(`(()=>{const r=canvas.getBoundingClientRect(),scale=r.height/canvas.height,y=(state.entities.chicken.y-camera.y)*scale;return y-58*scale>document.querySelector('.expedition-bar').getBoundingClientRect().bottom && y+14*scale<innerHeight-${touch?110:30};})()`),`player stays visible at ${edge} edge`);
    }
    await evaluate('resetGame(814237);GameUI.update(state);renderGame();lastTime=performance.now();window.requestAnimationFrame=window.nativeRAF;requestAnimationFrame(tick);window.animationStart=state.elapsed;');
    await wait(550);
    assert(await evaluate('state.elapsed>animationStart'),'normal animation loop advances');
    await evaluate('window.requestAnimationFrame=()=>0;');
    const layout=await evaluate(`({canvas:[canvas.width,canvas.height],camera:[camera.w,camera.h],scenery:FarmScenery.details(WORLD.layout).length,items:FarmScenery.details(WORLD.layout).reduce((a,p)=>(a[p.kind]=(a[p.kind]||0)+1,a),{})})`);
    results.push({name,width,height,touch,layout,errors});console.log(JSON.stringify(results.at(-1)));await call('Target.closeTarget',{targetId});
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,runtimeErrors},null,2));
  if(results.some(r=>r.errors.length)||runtimeErrors.length)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await call('Browser.close').catch(()=>{});browser.kill();});
