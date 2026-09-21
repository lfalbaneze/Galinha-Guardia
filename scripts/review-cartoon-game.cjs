// Real Chromium screenshots and interaction checks for the responsive game field.
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.cache/cartoon-game'),pending=new Map();let next=0,buffer='';
const reviewFolder=path.join(root,'preview',process.argv.includes('--pixellab')?'pixellab':'cartoon-106');fs.mkdirSync(reviewFolder,{recursive:true});
const publicRoot=process.argv.includes('--dist')?path.join(root,'dist'):root;
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'index.html'),fs.readFileSync(path.join(publicRoot,'index.html'),'utf8').replace('<head>',`<head><base href="${pathToFileURL(publicRoot+path.sep).href}"><script>window.nativeRAF=requestAnimationFrame;window.requestAnimationFrame=()=>0;</script>`));
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',[
  '--headless=new','--mute-audio','--disable-gpu','--no-first-run','--disable-background-networking','--remote-debugging-pipe','--allow-file-access-from-files','--autoplay-policy=no-user-gesture-required',
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
// The browser/CDP bootstrap is shared with the existing menu interaction review.
// Runtime geometry below observes the actual transformed sprites, not menu routes.
(async()=>{
 const {targetId}=await call('Target.createTarget',{url:'about:blank'}),{sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
 await call('Runtime.enable',{},sessionId);await call('Emulation.setDeviceMetricsOverride',{width:1100,height:750,deviceScaleFactor:1,mobile:false},sessionId);
 const read=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 await call('Page.navigate',{url:pathToFileURL(path.join(out,'index.html')).href},sessionId);
 let ready=false;for(let i=0;i<120;i++){ready=await read('typeof CharacterArt!=="undefined"&&[CharacterArt,GooseArt,FoxArt,OwlArt,ScarecrowArt,ThorArt,FarmSprites].every(a=>a.ready)');if(ready)break;await wait(100)}if(!ready)throw Error('Incomplete assets');
 const briefing=await read(`(()=>{MenuBriefing.render(state,'normal');return document.getElementById('journeyCast').toDataURL('image/png').split(',')[1]})()`);
 fs.writeFileSync(path.join(reviewFolder,'briefing.png'),Buffer.from(briefing,'base64'));
 if(process.argv.includes('--briefing-only')){
  for(const skin of ['classic','silkie','priest','goose','astronaut','robocop','punk','blue']){
   const shot=await read(`(()=>{state.entities.chicken.skin='${skin}';MenuBriefing.render(state,'normal');return document.getElementById('journeyCast').toDataURL('image/png').split(',')[1]})()`);
   fs.writeFileSync(path.join(reviewFolder,'briefing-'+skin+'.png'),Buffer.from(shot,'base64'));
  }
  if(runtimeErrors.length)throw Error(JSON.stringify(runtimeErrors));console.log('Mission scene rendered with all eight equipped appearances.');return;
 }
 const directions=await read(`(()=>{resetGame(17);state.phase='playing';OBSTACLES=[];GameUI.update(state);const p=state.entities.chicken,result=[];
 for(const [keys,expected]of [[['w'],'up'],[['w','d'],'upright'],[['d'],'right'],[['d','s'],'downright'],[['s'],'down'],[['s','a'],'downleft'],[['a'],'left'],[['a','w'],'upleft']]){input.clear();keys.forEach(k=>input.add(k));const before={x:p.x,y:p.y};Player.update(state,.05);const heading=CharacterArt.heading(p);if(heading!==expected||distance(p,before)<=0)throw Error('Direction '+expected+' got '+heading);result.push(heading)}input.clear();return result})()`);
 await read(`for(let seed=0;!state.entities.owls.length&&seed<20;seed++){resetGame(seed);state.phase='playing';OBSTACLES=[];}var owl=state.entities.owls[0],hero=state.entities.chicken,wolf=state.entities.wolf;
 Object.assign(hero,{x:owl.x+Math.cos(owl.heading)*90,y:owl.y+Math.sin(owl.heading)*90,hidden:false,invulnerable:0,sneaking:false,vx:0,vy:0,moving:false});
 Object.assign(wolf,{x:owl.x+130,y:owl.y+30,mode:'patrol',huntUnlockTimer:0,pauseTimer:0});Object.assign(owl,{grace:0,cooldown:0,alertProgress:0,mode:'watch',alertTime:.35,callTime:0});
 MapManager.update(state,0);if(state.mapTransition)state.mapTransition.time=0;updateCamera(10);GameUI.update(state);`);
 const phases=[];
 for(const [name,steps]of [['notice',2],['call',5],['settle',10]]){
  const phase=await read(`(()=>{for(let i=0;i<${steps};i++)OwlSystem.update(state,.05);renderGame();return {mode:owl.mode,callTime:owl.callTime,frame:OwlArt.frameFor(owl),wolf:wolf.mode}})()`);phases.push({name,...phase});
  const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sessionId);fs.writeFileSync(path.join(reviewFolder,'owl-game-'+name+'.png'),Buffer.from(shot.data,'base64'));
 }
 if(phases[0].mode!=='alert'||phases[1].wolf!=='investigate'||phases[1].frame.column!==6)throw Error('Owl timing '+JSON.stringify(phases));
 const audio=await read(`(async()=>{const result=[];for(const clip of AudioSystem.catalog.filter(c=>c.name==='owl-siren')){const a=new Audio(clip.src);await new Promise((resolve,reject)=>{a.oncanplay=resolve;a.onerror=reject;a.load()});await a.play();result.push({src:clip.src,duration:a.duration,playing:!a.paused});a.pause()}return result})()`);
 await read(`hero.hidden=true;for(let i=0;i<20&&owl.mode!=='relocate';i++)OwlSystem.update(state,.05);if(!owl.flight)throw Error('No owl flight');var oldTree=owl.treeId,destinationTree=owl.flight.treeId;
  while(owl.flight&&owl.flight.progress<.45)OwlSystem.update(state,.05);
  camera.x=clamp(owl.x-canvas.width/2,0,WORLD.width-canvas.width);camera.y=clamp(owl.y-canvas.height/2,0,WORLD.height-canvas.height);renderGame();`);
 const flightShot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sessionId);fs.writeFileSync(path.join(reviewFolder,'owl-game-flight.png'),Buffer.from(flightShot.data,'base64'));
 const flight=await read(`({from:oldTree,to:destinationTree,frame:OwlArt.frameFor(owl),progress:owl.flight.progress,x:owl.x,y:owl.y})`);
 const video=await read(`(async()=>{const parts=[],rec=new MediaRecorder(canvas.captureStream(30),{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:1200000});rec.ondataavailable=e=>{if(e.data.size)parts.push(e.data)};const done=new Promise(resolve=>rec.onstop=resolve);rec.start();
  await new Promise(resolve=>{let frames=0;function tick(){OwlSystem.update(state,1/60);camera.x=clamp(owl.x-canvas.width/2,0,WORLD.width-canvas.width);camera.y=clamp(owl.y-canvas.height/2,0,WORLD.height-canvas.height);renderGame();if(++frames<240)window.nativeRAF(tick);else resolve()}window.nativeRAF(tick)});
  rec.stop();await done;return await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(new Blob(parts,{type:'video/webm'}))})})()`);
 fs.writeFileSync(path.join(reviewFolder,'owl-flight.webm'),Buffer.from(video,'base64'));
 const landed=await read(`(()=>{for(let i=0;i<200&&owl.flight;i++)OwlSystem.update(state,.05);renderGame();if(owl.treeId!==destinationTree||owl.treeId===oldTree||owl.flight)throw Error('Bad owl landing');return {treeId:owl.treeId,mode:owl.mode,grace:owl.grace}})()`);
 const landingShot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sessionId);fs.writeFileSync(path.join(reviewFolder,'owl-game-landed.png'),Buffer.from(landingShot.data,'base64'));
 const repeated=await read(`(()=>{
  if(owl.mode!=='watch'||owl.cooldown!==0)throw Error('Owl did not resume watching after landing');
  hero.x=owl.x+Math.cos(owl.heading)*90;hero.y=owl.y+Math.sin(owl.heading)*90;
  hero.hidden=false;hero.invulnerable=0;hero.sneaking=false;
  camera.x=clamp(owl.x-canvas.width/2,0,WORLD.width-canvas.width);camera.y=clamp(owl.y-canvas.height/2,0,WORLD.height-canvas.height);
  let called=false;for(let i=0;i<60&&!owl.flight;i++){OwlSystem.update(state,.05);if(owl.callTime>0)called=true;}
  if(!called||!owl.flight||owl.flight.treeId===destinationTree)throw Error('Second owl alarm or departure failed');
  const nextTree=owl.flight.treeId;hero.hidden=true;
  for(let i=0;i<400&&owl.flight;i++)OwlSystem.update(state,.05);
  if(owl.flight||owl.treeId!==nextTree||owl.mode!=='watch')throw Error('Second owl landing failed');
  return {called,from:destinationTree,to:nextTree,mode:owl.mode,relocations:owl.relocations};
 })()`);
 if(runtimeErrors.length)throw Error(JSON.stringify(runtimeErrors));const result={directions,phases,audio,flight,landed,repeated,runtimeErrors};fs.writeFileSync(path.join(reviewFolder,'game-report.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await call('Browser.close').catch(()=>{});browser.kill()});
