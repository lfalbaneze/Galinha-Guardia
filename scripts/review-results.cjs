// Review the built result screens with real fonts, keyboard, pointer and touch.
// npm run build && node scripts/review-results.cjs [viewport]
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../dist'),out=path.resolve(__dirname,'../.cache/arcade-results-review'),pending=new Map();let next=0,buffer='';
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'index.html'),fs.readFileSync(path.join(root,'index.html'),'utf8').replace('<head>',`<head><base href="${pathToFileURL(root+path.sep).href}"><script>window.requestAnimationFrame=()=>0;</script>`));
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
 for(const [name,width,height,touch] of [['desktop',1280,806,false],['mobile',390,844,true],['small',360,640,true],['narrow',320,568,true],['landscape',844,390,true]].filter(([name])=>!process.argv[2]||name===process.argv[2])){
  const {targetId}=await call('Target.createTarget',{url:'about:blank'}),{sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
  await call('Runtime.enable',{},sessionId);await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:touch},sessionId);
  if(touch)await call('Emulation.setTouchEmulationEnabled',{enabled:true},sessionId);
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const key=async(key,code,vk)=>{for(const type of ['keyDown','keyUp'])await call('Input.dispatchKeyEvent',{type,key,code,windowsVirtualKeyCode:vk,...(key==='Enter'&&type==='keyDown'?{text:'\r'}:{})},sessionId);};
  const click=async id=>{const point=await evaluate(`(()=>{const r=document.getElementById('${id}').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);if(touch){await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]},sessionId);await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]},sessionId);}else{await call('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1},sessionId);await call('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1},sessionId);}};
  const result={name,issues:[]},check=async(expression,message)=>{if(!await evaluate(expression))result.issues.push(message);};
  const shot=async label=>{await evaluate(`document.getAnimations().forEach(a=>a.finish())`);await wait(90);const {data}=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sessionId);fs.writeFileSync(path.join(out,`${name}-${label}.png`),Buffer.from(data,'base64'));};
  const fit=async label=>{
    await check(`(()=>{const card=document.querySelector('.end-card'),r=card.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth&&r.y>=0&&r.bottom<=innerHeight&&card.scrollWidth<=card.clientWidth+1&&card.scrollHeight<=card.clientHeight+1;})()`,label+': card overflows');
    await check(`['endTitle','endPoints','replayBtn','menuBtn'].every(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&e.scrollWidth<=e.clientWidth+1;})`,label+': title, score or controls clipped');
    await check(`document.getElementById('endPortrait').getContext('2d').getImageData(0,0,128,128).data.some((v,i)=>i%4===3&&v>0)`,label+': portrait missing');
    await check(`(()=>{const row=document.getElementById('endLives'),hearts=[...row.querySelectorAll('svg')],r=row.getBoundingClientRect();return row.textContent.trim()===''&&hearts.length===3&&hearts.every((h,i)=>{const b=h.getBoundingClientRect();return h.dataset.full===String(i<state.lives)&&b.width>0&&b.left>=r.left&&b.right<=r.right+.1&&b.top>=r.top&&b.bottom<=r.bottom+.1;});})()`,label+': hearts do not reflect remaining lives or do not fit');
  };
  await call('Page.navigate',{url:pathToFileURL(path.join(out,'index.html')).href},sessionId);
  let ready=false;for(let i=0;i<120;i++){ready=await evaluate(`typeof state!=='undefined'&&[CharacterArt,GooseArt,FoxArt,OwlArt,ThorArt,ScarecrowArt].every(a=>a.ready)`);if(ready)break;await wait(100);}if(!ready)throw Error('Assets not ready: '+JSON.stringify(errors));
  await evaluate(`difficultySelect.value='hardcore';resetGame(52);state.phase='playing';
    for(const a of state.entities.animals.slice(0,3))GameManager.rescue(state,a);
    Object.assign(state,{score:560,lives:1,elapsed:59,timeRemaining:.01});updateGame(.02);updateCamera(10);renderGame();document.fonts.ready;`);
  await shot('timeout');await fit('timeout');
  await check(`state.phase==='lose'&&document.getElementById('endTitle').textContent==='GAME OVER'&&document.getElementById('endEyebrow').textContent==='TEMPO ESGOTADO'&&document.getElementById('endPoints').textContent==='000560'`,'wrong timeout presentation');
  await check(`getComputedStyle(document.getElementById('endTitle')).fontFamily.includes('Farm Display')&&getComputedStyle(document.getElementById('endPoints')).fontFamily.includes('Farm Pixel')&&document.fonts.check('40px "Farm Display"')&&document.fonts.check('40px "Farm Pixel"')`,'arcade fonts missing');
  await check(`document.activeElement.id==='replayBtn'&&getComputedStyle(document.getElementById('expeditionBar')).display==='none'`,'result focus/HUD isolation');
  await evaluate(`state.lives=2;GameUI.update(state);`);await fit('two-lives');await shot('two-lives');
  await evaluate(`state.lives=1;GameUI.update(state);`);
  await key('Tab','Tab',9);await check(`document.activeElement.id==='menuBtn'`,'Tab missed menu');
  await key('Tab','Tab',9);await check(`document.activeElement.id==='replayBtn'`,'Tab escaped dialog');
  if(touch)await click('replayBtn');else await key('Enter','Enter',13);
  await check(`state.phase==='playing'&&state.score===0&&state.rescuedCount===0&&state.worldSeed===52&&state.difficultyKey==='hardcore'&&state.lives===3`,'revanche did not reset same farm');
  await evaluate(`state.lives=0;finishLose('O lobo pegou você.','caught');updateGame(.016);renderGame();`);
  await shot('caught');await fit('caught');
  await check(`document.getElementById('endEyebrow').textContent==='SEM VIDAS'&&document.getElementById('endPoints').textContent==='000000'`,'caught result or zero score wrong');
  await click('menuBtn');await check(`state.phase==='menu'&&state.resumePhase==='lose'`,'return to menu failed');
  await evaluate(`difficultySelect.value='hardcore';resetGame(52);state.phase='playing';
    for(const a of [...state.entities.chicks,...state.entities.animals])GameManager.rescue(state,Object.assign(a,{discovered:true}));
    state.entities.goose.rescued=true;state.timeRemaining=83;state.elapsed=196;GameManager.win(state);
    for(let i=0;i<410;i++)updateGame(.05);renderGame();`);
  await shot('victory');await fit('victory');
  await check(`state.phase==='won'&&document.getElementById('endTitle').textContent==='RESGATE TOTAL!'&&document.getElementById('endPoints').textContent===String(state.score).padStart(6,'0')&&!document.getElementById('endTimeBonus').hidden&&!document.getElementById('endPanto').hidden`,'victory totals or bonuses missing');
  await evaluate(`state.score=Number.MAX_SAFE_INTEGER;GameUI.update(state);`);await fit('legacy-score');
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]},sessionId);
  await evaluate(`GameUI.showMenu(state);state.phase='won';GameUI.update(state);`);
  await check(`getComputedStyle(document.querySelector('.end-card')).animationName==='none'`,'reduced motion ignored');
  await click('replayBtn');await check(`state.phase==='playing'&&state.score===0&&state.rescuedCount===0`,'new game after victory failed');
  results.push(result);console.log(JSON.stringify(result));await call('Target.closeTarget',{targetId});
 }
 fs.writeFileSync(path.join(out,process.argv[2]?`report-${process.argv[2]}.json`:'report.json'),JSON.stringify({results,errors},null,2));if(errors.length||results.some(r=>r.issues.length))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>browser.kill());
