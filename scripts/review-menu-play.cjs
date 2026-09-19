// Real Chromium screenshots and interaction checks for the responsive game field.
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.cache/menu-play-review'),pending=new Map();let next=0,buffer='';
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
  for(const [name,width,height,touch] of [['desktop',1440,900,false],['laptop',1280,720,false],['mobile',390,844,true],['small-mobile',360,640,true],['tablet',768,1024,true]]){
    const {targetId}=await call('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
    await call('Runtime.enable',{},sessionId);
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:touch},sessionId);
    if(touch)await call('Emulation.setTouchEmulationEnabled',{enabled:true},sessionId);
    await call('Page.navigate',{url:pathToFileURL(path.join(out,'index.html')).href},sessionId);
    const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true},sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
    let ready=false;
    for(let i=0;i<100;i++){ready=await evaluate('typeof state!=="undefined"&&CharacterArt.ready');if(ready)break;await wait(100);}
    if(!ready)throw Error('Menu assets did not load');
    await wait(450);
    await evaluate(`window.rolls=[];window.actors=[];window.beforeShow=JSON.stringify(state);window.beforeStorage=JSON.stringify(localStorage);
      window.sc=document.getElementById('menuScene').getContext('2d');window.oldRotate=sc.rotate.bind(sc);window.oldDraw=sc.drawImage.bind(sc);
      sc.rotate=a=>{rolls.push(a);oldRotate(a);};sc.drawImage=(im,...a)=>{const m=sc.getTransform(),cx=a[4]+a[6]/2,cy=a[5]+a[7]/2;actors.push({src:im.src,x:m.a*cx+m.c*cy+m.e,y:m.b*cx+m.d*cy+m.f});oldDraw(im,...a);};
      InterfaceMotion.frame(state,.05);`);
    const click=async p=>{
      if(touch){await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1}]},sessionId);await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]},sessionId);}
      else {await call('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1},sessionId);await call('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1},sessionId);}
    };
    const button=await evaluate("(()=>{const r=document.getElementById('menuScatter').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()");
    await click(button); await wait(250);
    const first=await evaluate("document.getElementById('menuBanter').textContent");
    if(!first.includes('\n'))throw Error('No joke after click');
    await evaluate('for(let i=0;i<18;i++)InterfaceMotion.frame(state,.05);');
    if(!await evaluate("(()=>{const b=document.getElementById('menuBanter').getBoundingClientRect();return ['menuCard','farmTitle','menuTagline','menuSubtitle','menuMischief'].every(id=>{const r=document.getElementById(id).getBoundingClientRect();return !(b.right>r.left&&b.left<r.right&&b.bottom>r.top&&b.top<r.bottom);});})()"))throw Error('Lead caption covers menu content');
    if(!await evaluate('rolls.some(a=>Math.abs(a)>Math.PI*.9)'))throw Error('No somersault');
    const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sessionId);
    fs.writeFileSync(path.join(root,'preview/menu-play-'+name+'-tumble.png'),Buffer.from(shot.data,'base64'));
    await evaluate('for(let i=0;i<48;i++)InterfaceMotion.frame(state,.05);');
    const reply=await evaluate("document.getElementById('menuBanter').textContent");
    if(reply===first)throw Error('No partner response');
    const bounds=await evaluate("(()=>{const b=document.getElementById('menuBanter').getBoundingClientRect(),c=document.getElementById('menuCard').getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,inside:b.left>=0&&b.right<=innerWidth&&b.top>=0&&b.bottom<=innerHeight,overCard:b.right>c.left&&b.left<c.right&&b.bottom>c.top&&b.top<c.bottom};})()");
    if(!bounds.inside||bounds.overCard)throw Error('Caption placement '+JSON.stringify(bounds));
    const replyShot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sessionId);
    fs.writeFileSync(path.join(root,'preview/menu-play-'+name+'-reply.png'),Buffer.from(replyShot.data,'base64'));
    await evaluate('for(let i=0;i<66;i++)InterfaceMotion.frame(state,.05);actors.length=0;InterfaceMotion.frame(state,.05);');
    const animal=await evaluate(`(()=>{const c=document.getElementById('menuScene'),r=c.getBoundingClientRect(),card=document.getElementById('menuCard').getBoundingClientRect();return actors.map(a=>({x:r.x+a.x/c.width*r.width,y:r.y+a.y/c.height*r.height,src:a.src})).find(p=>p.x>24&&p.x<innerWidth-24&&p.y>30&&p.y<innerHeight-30&&!(p.x>card.left&&p.x<card.right&&p.y>card.top&&p.y<card.bottom));})()`);
    if(!animal)throw Error('No visible animal to tap');
    await click({x:animal.x,y:animal.y});
    if(!await evaluate("!document.getElementById('menuBanter').hidden"))throw Error('Direct tap failed');
    const tapped=await evaluate("document.getElementById('menuBanter').textContent");
    if(!await evaluate('JSON.stringify(state)===beforeShow'))throw Error('Presentation changed saved simulation');
    await evaluate('for(let i=0;i<360;i++)InterfaceMotion.frame(state,.05);');
    const automatic=await evaluate("!document.getElementById('menuBanter').hidden&&document.getElementById('menuBanter').getAttribute('aria-live')==='off'");
    if(!automatic)throw Error('Ambient show failed');
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]},sessionId);
    await wait(100);
    await evaluate('InterfaceMotion.frame(state,.05);rolls.length=0;');
    await click(button);
    await evaluate('for(let i=0;i<400;i++)InterfaceMotion.frame(state,.05);');
    if(!await evaluate('rolls.length===0'))throw Error('Reduced motion still rotates');
    await evaluate("document.getElementById(document.getElementById('continueBtn').hidden?'startBtn':'continueBtn').click();renderGame();InterfaceMotion.frame(state,.05);");
    if(!await evaluate("state.phase==='playing'&&document.getElementById('menuBanter').hidden"))throw Error('Play did not close the show');
    results.push({name,first,reply,tapped,bounds,automatic});
    await call('Target.closeTarget',{targetId});
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,runtimeErrors},null,2));
  console.log(JSON.stringify({results,runtimeErrors}));
  if(runtimeErrors.length)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await call('Browser.close').catch(()=>{});browser.kill();});
