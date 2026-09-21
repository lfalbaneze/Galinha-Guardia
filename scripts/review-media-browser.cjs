// Decode and play every runtime sound in Chromium; draw every actor using real assets.
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.cache/media-review-browser'),pending=new Map();let next=0,buffer='';
fs.mkdirSync(out,{recursive:true});
const base=pathToFileURL(root+path.sep).href;
fs.writeFileSync(path.join(out,'index.html'),fs.readFileSync(path.join(root,'preview/media-review.html'),'utf8').replace('<base href="../">',`<base href="${base}">`));
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
 const timer=setTimeout(()=>{pending.delete(id);reject(Error('Timeout: '+method));},40000);pending.set(id,{resolve,reject,timer});
 browser.stdio[3].write(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})})+'\0');});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 const {targetId}=await call('Target.createTarget',{url:'about:blank'}),{sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
 await call('Runtime.enable',{},sessionId);await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false},sessionId);
 const read=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true},sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 await call('Page.navigate',{url:pathToFileURL(path.join(out,'index.html')).href},sessionId);
 let ready=false;for(let i=0;i<120;i++){ready=await read('window.mediaReviewReady===true');if(ready)break;await wait(100)}
 if(!ready)throw Error('Review failed to load: '+JSON.stringify(runtimeErrors));
 const actors=await read(`(()=>{running=false;InterfaceMotion.reduced=false;label();const results=[];
 for(const option of cast.options){cast.value=option.value;const frames=[];for(let i=0;i<4;i++){phase=i;render();
  const p=ctx.getImageData(0,55,1120,230).data;let drawn=0;for(let k=0;k<p.length;k+=4)if(p[k]!==130||p[k+1]!==157||p[k+2]!==96)drawn++;
  if(drawn<200)throw Error('Missing actor '+option.value);frames.push(drawn)}results.push({name:option.value,frames})}
 cast.value='thor';phase=0;render();return results})()`);
 const audio=await read(`(async()=>{const result=[];for(const a of document.querySelectorAll('audio')){
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Audio timeout '+a.src)),8000);a.oncanplay=()=>{clearTimeout(timer);resolve()};a.onerror=()=>{clearTimeout(timer);reject(Error('Audio decode '+a.src))};a.load()});
  await a.play();if(a.paused||!Number.isFinite(a.duration)||a.duration<=0)throw Error('Unplayable '+a.src);
  result.push({src:a.getAttribute('src'),seconds:a.duration,volume:a.volume});a.pause();a.currentTime=0;
 }return result})()`);
 if(audio.length!==45||actors.length!==30)throw Error('Incomplete catalog');
 await wait(60);let shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sessionId);
 fs.writeFileSync(path.join(root,'preview/media-review/browser-desktop.png'),Buffer.from(shot.data,'base64'));
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true},sessionId);await wait(60);
 if(!await read('document.documentElement.scrollWidth<=innerWidth'))throw Error('Mobile horizontal overflow');
 shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sessionId);fs.writeFileSync(path.join(root,'preview/media-review/browser-mobile.png'),Buffer.from(shot.data,'base64'));
 const result={actors,audio,runtimeErrors};fs.writeFileSync(path.join(root,'preview/media-review/browser-report.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({actors:actors.length,actorFrames:actors.reduce((s,a)=>s+a.frames.length*4,0),audioFiles:audio.length,runtimeErrors}));
 if(runtimeErrors.length)throw Error('Browser exceptions');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await call('Browser.close').catch(()=>{});browser.kill()});
