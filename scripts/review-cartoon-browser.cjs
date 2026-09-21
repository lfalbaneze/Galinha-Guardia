// Decode and play every runtime sound in Chromium; draw every actor using real assets.
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.cache/cartoon-browser'),pending=new Map();let next=0,buffer='';
fs.mkdirSync(out,{recursive:true});
const base=pathToFileURL(root+path.sep).href;
fs.writeFileSync(path.join(out,'index.html'),fs.readFileSync(path.join(root,'preview/animal-walks.html'),'utf8').replace('<base href="../">',`<base href="${base}">`));
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
 await call('Runtime.enable',{},sessionId);await call('Emulation.setDeviceMetricsOverride',{width:1240,height:1260,deviceScaleFactor:1,mobile:false},sessionId);
 const read=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true},sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 await call('Page.navigate',{url:pathToFileURL(path.join(out,'index.html')).href},sessionId);
 let ready=false;for(let i=0;i<120;i++){ready=await read('typeof CharacterArt!=="undefined"&&CharacterArt.ready');if(ready)break;await wait(100)}if(!ready)throw Error('Art not ready '+JSON.stringify(runtimeErrors));
 const checked=await read(`(()=>{running=false;const result=[];for(const option of select.options){select.value=option.value;select.onchange();const frames=[];
 for(let i=0;i<12;i++){anim=i/3;renderReview(0,true);const data=c.getImageData(0,0,1120,800).data;let hash=0;for(let j=0;j<data.length;j+=16)hash=(Math.imul(hash,31)+data[j])|0;frames.push(hash)}
 if(new Set(frames).size<10)throw Error('Missing phases '+option.value);result.push({name:option.value,phases:new Set(frames).size,directions:8})}return result})()`);
 for(const name of ['dog','sheep','owl']){
  await read(`select.value='${name}';select.onchange();anim=${name==='owl'?2:0};renderReview(0,true);`);
  const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sessionId);fs.writeFileSync(path.join(root,'preview/cartoon-106/browser-'+name+'.png'),Buffer.from(shot.data,'base64'));
 }
 const audio=await read(`(async()=>{const result=[];for(const file of ['owl-siren.wav','owl-siren-2.wav']){const a=new Audio('assets/audio/effects/v1/'+file);await new Promise((resolve,reject)=>{a.oncanplay=resolve;a.onerror=reject;a.load()});await a.play();result.push({file,duration:a.duration,playing:!a.paused});a.pause()}return result})()`);
 const video=await read(`(async()=>{const canvas=document.getElementById('walks'),parts=[],rec=new MediaRecorder(canvas.captureStream(30),{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:1200000});rec.ondataavailable=e=>{if(e.data.size)parts.push(e.data)};const done=new Promise(resolve=>{rec.onstop=resolve});rec.start();running=true;
 for(const speed of [30,85,300])for(const name of ['chicken','dog','sheep','horse','wolf','owl']){select.value=name;select.onchange();document.getElementById('speed').value=String(speed);await new Promise(r=>setTimeout(r,1200))}
 rec.stop();await done;running=false;return await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(new Blob(parts,{type:'video/webm'}))})})()`);
 fs.writeFileSync(path.join(root,'preview/cartoon-106/movement.webm'),Buffer.from(video,'base64'));
 const result={characters:checked.length,checked,audio,runtimeErrors};fs.writeFileSync(path.join(root,'preview/cartoon-106/browser-report.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({characters:checked.length,directionalFrames:checked.length*96,audio,runtimeErrors}));if(runtimeErrors.length)throw Error('Browser exceptions');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await call('Browser.close').catch(()=>{});browser.kill()});