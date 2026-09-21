// Real Chromium screenshots and interaction checks for the responsive game field.
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.cache/menu-banter-review'),pending=new Map();let next=0,buffer='';
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
// The browser/CDP bootstrap is shared with the existing menu interaction review.
// Runtime geometry below observes the actual transformed sprites, not menu routes.
(async()=>{
 const results=[];
 for(const [name,width,height] of [['wide',1920,900],['desktop',1440,900],['laptop',1280,720],['mobile',390,844],['small',360,640]]) {
  const {targetId}=await call('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
  await call('Runtime.enable',{},sessionId);
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500},sessionId);
  await call('Page.navigate',{url:pathToFileURL(path.join(out,'index.html')).href},sessionId);
  const read=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  let ready=false;for(let i=0;i<120;i++){ready=await read('typeof CharacterArt!=="undefined"&&CharacterArt.ready');if(ready)break;await wait(100);}if(!ready)throw Error('Art not ready');
  await read(`document.fonts.ready`);
  if(await read(`getComputedStyle(document.getElementById('menuScene')).display==='none'`)){
   await read(`document.getElementById('menuScatter').click();InterfaceMotion.frame(state,.05)`);
   if(!await read(`document.getElementById('menuBanter').hidden&&!document.getElementById('menuBanterLink').getAttribute('d')`))throw Error('Speech appears without visible animals');
   results.push({name,troupeHidden:true,captionHidden:true});await call('Target.closeTarget',{targetId});continue;
  }
  await read(`(()=>{window.actors=[];window.tileSources=new WeakMap();
   const oldTile=SpriteStyle.tile;SpriteStyle.tile=(image,...args)=>{const tile=oldTile(image,...args);if(tile)tileSources.set(tile,image.src);return tile;};
   const canvas=document.getElementById('menuScene'),c=canvas.getContext('2d'),oldDraw=c.drawImage.bind(c);
   c.drawImage=(image,...a)=>{
    const src=tileSources.get(image)||image.src;
    if(src){const rect=canvas.getBoundingClientRect(),m=c.getTransform();
     const [x,y,w,h]=a.length===2?[a[0],a[1],image.width,image.height]:a.length===4?a:a.slice(4);
     const points=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([px,py])=>({x:rect.left+(m.a*px+m.c*py+m.e)/canvas.width*rect.width,y:rect.top+(m.b*px+m.d*py+m.f)/canvas.height*rect.height}));
     actors.push({src,left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))});
    }oldDraw(image,...a);
   };
   GameUI.showMenu(state);InterfaceMotion.frame(state,0);
   window.stepReview=()=>{actors=[];InterfaceMotion.frame(state,.05);const e=document.getElementById('menuBanter'),b=e.getBoundingClientRect();
    if(e.hidden||getComputedStyle(e).visibility==='hidden')return {visible:false};
    const overlaps=actors.filter(a=>b.right>a.left&&b.left<a.right&&b.bottom>a.top&&b.top<a.bottom);
    const speaker=e.dataset.speaker,sprite=CharacterArt.frameFor(speaker,{skin:speaker==='chicken'?state.entities.chicken.skin:undefined});
    const who=actors.find(a=>sprite&&a.src===new URL(sprite.frame.src,document.baseURI).href);
    const path=document.getElementById('menuBanterLink'),length=path.getTotalLength(),matrix=path.getScreenCTM();
    const points=Array.from({length:40},(_,i)=>{const p=path.getPointAtLength(length*i/39);return new DOMPoint(p.x,p.y).matrixTransform(matrix)});
    const crossed=actors.filter(a=>a!==who&&points.some(p=>p.x>a.left&&p.x<a.right&&p.y>a.top&&p.y<a.bottom));
    const end=new DOMPoint(Number(path.getAttribute('data-tip-x')),Number(path.getAttribute('data-tip-y'))).matrixTransform(matrix),linked=!!who&&Math.hypot(Math.max(0,who.left-end.x,end.x-who.right),Math.max(0,who.top-end.y,end.y-who.bottom))<18;
    return {visible:true,speaker,text:e.textContent,overlaps:overlaps.map(a=>a.src),crossed:crossed.map(a=>a.src),inside:b.left>=0&&b.top>=0&&b.right<=innerWidth&&b.bottom<=innerHeight,linked};
   };})()`);
  const result=await read(`(()=>{let visible=0,hidden=0;const speakers=new Set(),failures=[];
   for(let show=0;show<12;show++){
    document.getElementById('menuScatter').click();
    for(let frame=0;frame<132;frame++){
     const r=stepReview();if(!r.visible){hidden++;continue;}visible++;speakers.add(r.speaker);
     if(r.overlaps.length||r.crossed.length||!r.inside||!r.linked)failures.push({show,frame,...r});
    }
   }return {visible,hidden,speakers:[...speakers],failures:failures.slice(0,8)};})()`);
  results.push({name,...result});
  if(result.failures.length||result.visible<100){
   const {data}=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sessionId);
   fs.writeFileSync(path.join(root,'preview/menu-banter-failed-'+name+'.png'),Buffer.from(data,'base64'));
   console.log(await read(`(()=>{const e=document.getElementById('menuBanter');return {hidden:e.hidden,visibility:e.style.visibility,text:e.textContent,blockers:['menuCard','farmTitle','menuTagline','menuSubtitle','menuMischief','menuScene'].map(id=>({id,rect:document.getElementById(id).getBoundingClientRect().toJSON()}))}})()`));
   throw Error(JSON.stringify(results.at(-1)));
  }
  await read(`(()=>{for(let show=0;show<12;show++){document.getElementById('menuScatter').click();for(let frame=0;frame<132;frame++){const r=stepReview();if(r.visible&&r.speaker==='duck'&&!r.overlaps.length)return;}}})()`);
  await wait(50);
  const {data}=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sessionId);
  fs.writeFileSync(path.join(root,'preview/menu-banter-'+name+'.png'),Buffer.from(data,'base64'));
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true},sessionId);
  await wait(50);await read('InterfaceMotion.frame(state,.05)');
  if(!await read(`document.getElementById('menuBanter').hidden&&!document.getElementById('menuBanterLink').getAttribute('d')`))throw Error('Orphan caption after responsive resize');
  await read(`state.phase='playing';InterfaceMotion.frame(state,.05);`);
  if(!await read(`document.getElementById('menuBanter').hidden&&!document.getElementById('menuBanterLink').getAttribute('d')`))throw Error('Caption or connector survived leaving menu');
  await call('Target.closeTarget',{targetId});
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,runtimeErrors},null,2));
 console.log(JSON.stringify({results,runtimeErrors}));if(runtimeErrors.length)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await call('Browser.close').catch(()=>{});browser.kill();});
