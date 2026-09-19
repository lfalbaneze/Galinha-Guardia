// Real browser playback and pointer checks, including a dog cropped by the viewport.
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.cache/menu-dog-review'),pending=new Map();let next=0,buffer='';
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
  for(const [name,width,height,touch] of [['wide',1920,900,false],['desktop',1440,900,false],['mobile',390,844,true]]){
    const {targetId}=await call('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
    await call('Runtime.enable',{},sessionId);
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:touch},sessionId);
    if(touch)await call('Emulation.setTouchEmulationEnabled',{enabled:true},sessionId);
    const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
    await call('Page.navigate',{url:pathToFileURL(path.join(out,'index.html')).href},sessionId);
    let ready=false;
    for(let i=0;i<100;i++){ready=await evaluate('typeof state!=="undefined"&&CharacterArt.ready');if(ready)break;await wait(100);}
    if(!ready)throw Error('Menu assets did not load');
    await evaluate(`window.dogs=[];window.playback=[];window.before=JSON.stringify(state);
      const originalPlay=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){
        const event={src:this.src,volume:this.volume,playing:false,ended:false};playback.push(event);
        this.addEventListener('playing',()=>event.playing=true,{once:true});this.addEventListener('ended',()=>event.ended=true,{once:true});
        return originalPlay.call(this).catch(error=>{event.error=error.name;throw error;});};
      const c=document.getElementById('menuScene').getContext('2d'),oldDraw=c.drawImage.bind(c);
      c.drawImage=(im,...a)=>{if(im.src.includes('cute-dog-v2')){
        const m=c.getTransform(),p=[[a[4],a[5]],[a[4]+a[6],a[5]],[a[4],a[5]+a[7]],[a[4]+a[6],a[5]+a[7]]].map(([x,y])=>({x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f}));
        dogs.push({left:Math.min(...p.map(v=>v.x)),right:Math.max(...p.map(v=>v.x)),top:Math.min(...p.map(v=>v.y)),bottom:Math.max(...p.map(v=>v.y))});}oldDraw(im,...a);};
      InterfaceMotion.frame(state,.05);`);
    const dog=await evaluate(`(()=>{const c=document.getElementById('menuScene'),r=c.getBoundingClientRect(),d=dogs.at(-1);return {left:r.x+d.left/c.width*r.width,right:r.x+d.right/c.width*r.width,top:r.y+d.top/c.height*r.height,bottom:r.y+d.bottom/c.height*r.height};})()`);
    if(!dog||dog.top>=height||dog.bottom<=0)throw Error('Dog outside viewport '+name+' '+JSON.stringify(dog));
    const point={x:(dog.left+dog.right)/2,y:(Math.max(0,dog.top)+Math.min(height-4,dog.bottom))/2};
    if(touch){await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:1}]},sessionId);await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]},sessionId);}
    else{await call('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1},sessionId);await call('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1},sessionId);}
    // Wait for media completion rather than assuming a fixed decoding/startup time.
    for(let i=0;i<40;i++){
      if(await evaluate('playback.some(p=>p.src.endsWith("animal-dog.wav")&&(p.ended||p.error))'))break;
      await wait(100);
    }
    await evaluate('for(let i=0;i<5;i++)InterfaceMotion.frame(state,.05)');
    const audio=await evaluate('playback.find(p=>p.src.endsWith("animal-dog.wav"))');
    if(!audio?.playing||!audio?.ended||audio.volume<=0||audio.error)throw Error('Bark did not play '+JSON.stringify({name,dog,audio}));
    const caption=await evaluate("({text:document.getElementById('menuBanter').textContent,hidden:document.getElementById('menuBanter').hidden,species:document.getElementById('menuBanter').dataset.speaker})");
    if(caption.hidden||caption.species!=='dog')throw Error('Dog reaction disappeared');
    if(!await evaluate('JSON.stringify(state)===before'))throw Error('Menu click changed the game');
    const screenshot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sessionId);
    fs.writeFileSync(path.join(root,`preview/menu-dog-${name}.png`),Buffer.from(screenshot.data,'base64'));
    results.push({name,dog,cropped:dog.bottom>height,audio,caption});await call('Target.closeTarget',{targetId});
  }
  if(!results.some(r=>r.cropped))throw Error('No cropped dog covered by review');
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,runtimeErrors},null,2));
  console.log(JSON.stringify({results,runtimeErrors}));if(runtimeErrors.length)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await call('Browser.close').catch(()=>{});browser.kill();});
