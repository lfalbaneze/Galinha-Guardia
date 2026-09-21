// Browser integration review and a real-time recording of the installed sprite loops.
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'preview/pixellab'),pending=new Map();let next=0,buffer='';
const selected=process.argv.slice(2).filter(id=>!id.startsWith('--'));
const requestedAction=process.argv.slice(2).find(arg=>arg.startsWith('--action='))?.slice(9);
if(requestedAction&&!['walk','run','happy','scared','angry','sad','alert','fly'].includes(requestedAction))throw Error('Invalid review action');
const installed=fs.readdirSync(path.join(root,'assets/sprites/pixellab-108/meta')).filter(n=>n.endsWith('.json')).map(n=>n.slice(0,-5));
const profile=path.join(root,'.cache/pixellab/browser-profile');fs.mkdirSync(profile,{recursive:true});
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',[
 '--headless=new','--mute-audio','--disable-gpu','--no-first-run','--disable-background-networking','--remote-debugging-pipe','--allow-file-access-from-files','--autoplay-policy=no-user-gesture-required','--user-data-dir='+profile],
 {windowsHide:true,stdio:['ignore','ignore','ignore','pipe','pipe']});
const errors=[];browser.stdio[4].on('data',chunk=>{buffer+=chunk.toString();let end;while((end=buffer.indexOf('\0'))>=0){
 const raw=buffer.slice(0,end);buffer=buffer.slice(end+1);if(!raw)continue;const m=JSON.parse(raw),task=pending.get(m.id);
 if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);
 if(task){pending.delete(m.id);clearTimeout(task.timer);m.error?task.reject(Error(JSON.stringify(m.error))):task.resolve(m.result);}
}});
const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++next,timer=setTimeout(()=>{pending.delete(id);reject(Error('Timeout '+method));},150000);
 pending.set(id,{resolve,reject,timer});browser.stdio[3].write(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})})+'\0');});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const {targetId}=await call('Target.createTarget',{url:'about:blank'}),{sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
 await call('Runtime.enable',{},sessionId);await call('Emulation.setDeviceMetricsOverride',{width:1240,height:1250,deviceScaleFactor:1,mobile:false},sessionId);
 const read=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true},sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 await call('Page.navigate',{url:pathToFileURL(path.join(out,'index.html')).href},sessionId);
 for(let i=0;i<120;i++){if(await read('typeof current!=="undefined"&&!!image'))break;await pause(100);}
 const checked=await read(`(async()=>{playing=false;const checks=[],selection=${JSON.stringify(selected)};for(const id of selection.length?selection:Object.keys(PixelLabCandidates)){
 selector.value=id;selector.onchange();while(!image)await new Promise(r=>setTimeout(r,10));const d=current.definition;
 for(const [name,poses]of Object.entries(d.actions)){if(Object.keys(poses).length!==8)throw Error(id+'/'+name+' directions');
 for(const p of Object.values(poses)){if(p.flip)throw Error('Mirrored '+id);for(const f of p.frames)if(f.x<0||f.y<0||f.x+f.w>image.width||f.y+f.h>image.height)throw Error('Clipped '+id);}}
 checks.push({id,actions:Object.keys(d.actions),directions:8,walkFrames:d.actions.walk.down.frames.length});}return checks})()`);
 for(const {id} of checked){
  await read(`(async()=>{selector.value='${id}';selector.onchange();while(!image)await new Promise(r=>setTimeout(r,10));document.getElementById('scale').value='2';phase=.75;const wanted=${JSON.stringify(requestedAction|| (id==='owl'?'alert':'walk'))};if(current.definition.actions[wanted])action.value=wanted;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));})()`);
  const shot=await call('Page.captureScreenshot',{format:'png'},sessionId);fs.writeFileSync(path.join(out,'browser-'+id+'.png'),Buffer.from(shot.data,'base64'));
 }
 console.log('Browser decoded all '+checked.length+' characters and eight directions per action.');
 for(const speed of ['0.5','1','1.5']){
 const video=await read(`(async()=>{const parts=[],rec=new MediaRecorder(canvas.captureStream(30),{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:1600000});rec.ondataavailable=e=>{if(e.data.size)parts.push(e.data)};const done=new Promise(r=>rec.onstop=r);rec.start();playing=true;document.getElementById('scale').value='1';
 for(const id of ${JSON.stringify(checked.map(x=>x.id))}){selector.value=id;selector.onchange();while(!image)await new Promise(r=>setTimeout(r,10));const wanted=${JSON.stringify(requestedAction)}||(id==='owl'?'fly':'walk');if(current.definition.actions[wanted])action.value=wanted;document.getElementById('speed').value='${speed}';await new Promise(r=>setTimeout(r,3000));}
 rec.stop();await done;playing=false;return await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result.split(',')[1]);f.readAsDataURL(new Blob(parts,{type:'video/webm'}))})})()`);
 fs.writeFileSync(path.join(out,'movement-'+(requestedAction?requestedAction+'-':'')+speed+'.webm'),Buffer.from(video,'base64'));
 if(speed==='1')fs.writeFileSync(path.join(out,'movement.webm'),Buffer.from(video,'base64'));
 console.log('Movement review recorded at '+speed+'x.');
 }
 await call('Page.navigate',{url:pathToFileURL(path.join(root,'index.html')).href},sessionId);
 let ready=false;for(let i=0;i<300;i++){ready=await read('typeof CharacterArt!=="undefined"&&CharacterArt.ready&&typeof OwlArt!=="undefined"&&OwlArt.ready');if(ready)break;await pause(100);}
 if(!ready)throw Error('Game art did not finish loading');
 const game=await read(`({characters:CharacterArt.species.length,newCharacters:CharacterArt.species.filter(id=>CharacterArt.frameFor(id).definition.provider==='pixellab').length,owl:OwlArt.ready,goose:GooseArt.ready,fox:FoxArt.ready})`);
 if(!checked.length||game.newCharacters!==installed.length)throw Error('PixelLab sprites are not active in the game');
 const audio=await read(`(async()=>{const results=[];for(const file of ['owl-siren.wav','owl-siren-2.wav']){const a=new Audio('assets/audio/effects/v1/'+file);await new Promise((r,j)=>{a.oncanplay=r;a.onerror=()=>j(Error(file));a.load()});await a.play();results.push({file,duration:a.duration,playing:!a.paused});a.pause()}return results})()`);
 const shot=await call('Page.captureScreenshot',{format:'png'},sessionId);fs.writeFileSync(path.join(out,'game-menu.png'),Buffer.from(shot.data,'base64'));
 const headings=await read(`(()=>{resetGame(17);state.phase='playing';OBSTACLES=[];GameUI.update(state);const p=state.entities.chicken,result=[];
 for(const [keys,expected]of [[['w'],'up'],[['w','d'],'upright'],[['d'],'right'],[['d','s'],'downright'],[['s'],'down'],[['s','a'],'downleft'],[['a'],'left'],[['a','w'],'upleft']]){input.clear();keys.forEach(k=>input.add(k));const before={x:p.x,y:p.y};Player.update(state,.05);const heading=CharacterArt.heading(p);if(heading!==expected||distance(p,before)<=0)throw Error('Direction '+expected+' got '+heading);result.push(heading)}input.clear();renderGame();return result})()`);
 const playShot=await call('Page.captureScreenshot',{format:'png'},sessionId);fs.writeFileSync(path.join(out,'game-play.png'),Buffer.from(playShot.data,'base64'));
 const report={checked,game,headings,audio,errors};fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({game,headings,audio,errors}));if(errors.length)throw Error('Browser exceptions');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await call('Browser.close').catch(()=>{});browser.kill()});
