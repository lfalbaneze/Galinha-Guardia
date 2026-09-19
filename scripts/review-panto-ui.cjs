// Isolated Chromium: compact Panto prompts, responsive placement and real click/touch controls.
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.cache/panto-ui-review'),pending=new Map();let next=0,buffer='';
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
  for(const [name,width,height,touch] of [['desktop',1440,900,false],['mobile',390,844,true],['small-mobile',360,640,true],['landscape',844,390,true]]){
    const {targetId}=await call('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
    await call('Runtime.enable',{},sessionId);
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:touch},sessionId);
    if(touch)await call('Emulation.setTouchEmulationEnabled',{enabled:true},sessionId);
    const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
    await call('Page.navigate',{url:pathToFileURL(path.join(out,'index.html')).href},sessionId);
    let ready=false;
    for(let i=0;i<100;i++){ready=await evaluate('typeof state!=="undefined"&&FarmScenery.ready&&[CharacterArt,ThorArt,GooseArt,FoxArt,OwlArt,ScarecrowArt].every(a=>a.ready)');if(ready)break;await wait(100);}
    if(!ready)throw Error('Assets did not load');
    await evaluate(`document.getElementById('startBtn').click();resetGame(814237);state.phase='playing';
      var touchOption=document.getElementById('controlTouch');touchOption.checked=${touch};touchOption.dispatchEvent(new Event('change'));
      var g=state.entities.goose,c=state.entities.chicken;g.x=g.home.x;g.y=g.home.y;g.mode='patrol';g.notice=0;
      var spot=Array.from({length:16},(_,i)=>({x:g.home.x+Math.cos(i*Math.PI/8)*115,y:g.home.y+Math.sin(i*Math.PI/8)*115})).find(p=>{
        Object.assign(c,p);return WildlifeRules.clear(c,c,c.hitbox)&&LakeChallenge.available(state);});
      if(!spot)throw Error('No clear place to invite');Object.assign(c,spot);GameUI.update(state);renderGame();updateCamera(10);renderGame();`);
    const rect=async id=>evaluate(`(()=>{const r=document.getElementById('${id}').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};})()`);
    const shot=async suffix=>{await evaluate('GameUI.update(state);renderGame()');const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sessionId);fs.writeFileSync(path.join(root,`preview/panto-compact-${name}-${suffix}.png`),Buffer.from(r.data,'base64'));};
    const click=async id=>{const r=await rect(id),p={x:r.x+r.w/2,y:r.y+r.h/2};
      if(touch){await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1}]},sessionId);await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]},sessionId);}
      else{await call('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1},sessionId);await call('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1},sessionId);}
    };
    const invitation=await rect('lakePanel');
    if(invitation.w>230||invitation.h>48||invitation.h<44||invitation.x<0||invitation.bottom>height)throw Error('Invitation is not compact '+JSON.stringify(invitation));
    if(await evaluate("document.getElementById('lakePanel').hidden"))throw Error('Invitation hidden near Panto');
    await shot('invite');await click('lakeChallengeBtn');
    if(!await evaluate('state.lake.active'))throw Error('Could not start from the compact button');
    await evaluate('GameUI.update(state);renderGame()');
    if(!await evaluate("!document.getElementById('lakeCounter').hidden&&document.getElementById('contextHint').dataset.important==='false'"))throw Error('Hints are duplicated or missing');
    const counter=await rect('lakeCounter'),exit=await rect('lakeChallengeBtn');
    if(exit.x<counter.right&&exit.right>counter.x&&exit.y<counter.bottom&&exit.bottom>counter.y)throw Error('Exit covers progress '+JSON.stringify({counter,exit}));
    await shot('challenge');
    await evaluate("g.mode='stunned';g.chargeCounted=true;state.lake.counterWindow=2;state.lake.counterDuration=3;state.lake.misses=1;GameUI.update(state);renderGame();");
    await shot('counter');
    await click('lakeChallengeBtn');if(await evaluate('state.lake.active'))throw Error('Could not exit');
    await evaluate('c.x=WORLD.layout.start.x;c.y=WORLD.layout.start.y;GameUI.update(state)');
    if(!await evaluate("document.getElementById('lakePanel').hidden"))throw Error('Invitation visible far away');
    await evaluate('Object.assign(c,spot);state.lake.completed=true;GameUI.update(state)');
    if(!await evaluate("document.getElementById('lakePanel').hidden"))throw Error('Invitation visible after completion');
    const bridge=await evaluate(`(()=>{
      buildObstacles(state);const b=LakeChallenge.bridge();let dry=true;
      c.x=b.x-24;c.y=b.y+b.h/2-14;c.direction='right';
      for(let i=0;i<Math.ceil((b.w+48)/4);i++){Player.move(c,4,0);dry&&=!SwimmingSystem.profile(state).swimming;}
      const east=c.x>=b.x+b.w+24;
      c.direction='left';
      for(let i=0;i<Math.ceil((b.w+48)/4);i++){Player.move(c,-4,0);dry&&=!SwimmingSystem.profile(state).swimming;}
      const west=Math.abs(c.x-(b.x-24))<.01;
      c.x=b.x+b.w/2;c.y=b.y+b.h/2-14;c.direction='down';g.mode='defeated';g.speechTimer=0;
      updateCamera(10);return {horizontal:b.w>b.h,east,west,dry};
    })()`);
    if(Object.values(bridge).some(ok=>!ok))throw Error('Invalid bridge crossing '+JSON.stringify(bridge));
    await shot('bridge');
    results.push({name,invitation,counter,exit,touch,start:true,cancel:true,hints:true,bridge});await call('Target.closeTarget',{targetId});
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,runtimeErrors},null,2));
  console.log(JSON.stringify({results,runtimeErrors}));if(runtimeErrors.length)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await call('Browser.close').catch(()=>{});browser.kill();});
