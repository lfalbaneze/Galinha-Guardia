from pathlib import Path
import re, hashlib
root=Path('.')
p=root/'menu.css';s=p.read_text()
a=s.index('#menuScreen .menu-mischief {'); b=s.index('#menuScreen #menuBanter {',a)
s=s[:a]+'''/* An invitation beside the herd, not an arrow/link pointing out of the scene. */
#menuScreen .menu-mischief { position:absolute; z-index:2; right:auto; left:70%; top:auto; bottom:44px; width:250px; max-width:calc(100% - 32px); transform:translateX(-50%); text-align:center; user-select:none; }
#menuScreen #menuScatter { display:inline-flex; justify-content:center; align-items:center; gap:8px; min-height:44px; padding:10px 16px; border:1px solid #d9c28c99; border-radius:22px; background:#243f32e8; color:#fff0c5; box-shadow:0 3px 8px #16372a40; font:800 13px/1.2 var(--menu-text); text-shadow:none; }
#menuScreen #menuScatter:hover:not(:disabled) { background:#3a5940; color:#fff6de; }
#menuScreen #menuScatter svg { flex:none; width:18px; height:18px; }
#menuScreen #menuPlayHint { display:block; margin:6px 0 0; color:#fff2cf; font:700 12px/1.4 var(--menu-text); text-shadow:0 1px 4px #173c2b; }
/* In very crowded layouts keep the keyboard/touch button in normal flow. */
#menuScreen #menuMischief[data-placement='flow'] { position:relative; left:auto; right:auto; top:auto; bottom:auto; transform:none; grid-column:1 / -1; grid-row:4; order:3; justify-self:center; align-self:start; margin:12px auto 36px; }
'''+s[b:]
s=s.replace("  #menuScreen .menu-mischief { right:25px; bottom:20px; }\n  #menuScreen #menuPlayHint { display:none; }","  #menuScreen .menu-mischief { left:50%; bottom:38px; }")
s=s.replace("  #menuScreen .menu-mischief { right:22px; bottom:9px; max-width:148px; }\n  #menuScreen #menuScatter { font-size:10px; gap:5px; }\n  #menuScreen #menuScatter svg { width:15px; height:15px; }\n  #menuScreen #menuScatter > span { display:none; }","  #menuScreen .menu-mischief { bottom:max(36px,env(safe-area-inset-bottom,0px)); width:240px; }\n  #menuScreen #menuScatter { font-size:12px; gap:7px; }\n  #menuScreen #menuScatter svg { width:16px; height:16px; }")
s=s.replace("  #menuScreen .menu-mischief { bottom:4px; }","  #menuScreen .menu-mischief { bottom:32px; }")
p.write_text(s)
p=root/'systems/menu-scene.js';s=p.read_text()
s=s.replace('let canvas, world, button, caption, captionLink, screen, context;','let canvas, world, button, caption, captionLink, screen, context, playHint, invitation;')
s=s.replace("    captionLink = document.getElementById('menuBanterLink');","    captionLink = document.getElementById('menuBanterLink');\n    playHint = document.getElementById('menuPlayHint'); invitation = document.getElementById('menuMischief');")
s=s.replace("    window.addEventListener('resize', () => { resizeDirty = true; });","    window.addEventListener('resize', () => { resizeDirty = true; });\n    document.fonts?.ready.then(() => { resizeDirty = true; });")
anchor='  function placeCaption() {'
fn='''  function placePlayHint() {
    // Anchor once per layout change to the paths, not to an animal that keeps
    // walking. This avoids chasing the button with a pointer or keyboard focus.
    const area=screen.getBoundingClientRect(), bounds=canvas.getBoundingClientRect();
    const rootWidth=area.width || width, rootHeight=area.height || height;
    if (!rootWidth || !rootHeight || !bounds.width || !bounds.height) return;
    invitation.dataset.placement='herd';
    const size=invitation.getBoundingClientRect();
    const boxWidth=Math.min(size.width || 250,rootWidth-32), boxHeight=size.height || 68;
    const view=projection(width,height), sx=bounds.width/width, sy=bounds.height/height;
    const offsetX=(bounds.left || 0)-(area.left || 0), offsetY=(bounds.top || 0)-(area.top || 0);
    const group=[];
    // Use the whole route envelope so normal walking never runs under the hint.
    for (const animal of herd) for (const point of animal.route) {
      const x=offsetX+(view.x+point[0]*view.scale)*sx;
      const y=offsetY+(view.y+point[1]*view.scale)*sy;
      const scale=actorScale(point[1],view), art=CharacterArt.frameFor(animal.species,appearance(animal));
      const aw=art.pose.width*art.scale*scale*sx, ah=(art.pose.bottom-art.pose.top)*art.scale*scale*sy;
      if (x+aw/2<0 || x-aw/2>rootWidth || y<0 || y-ah>rootHeight) continue;
      group.push({left:x-aw/2,right:x+aw/2,top:y-ah,bottom:y});
    }
    if (!group.length) return;
    const herdBox={left:Math.max(8,Math.min(...group.map(p=>p.left))),right:Math.min(rootWidth-8,Math.max(...group.map(p=>p.right))),
      top:Math.max(8,Math.min(...group.map(p=>p.top))),bottom:Math.min(rootHeight-8,Math.max(...group.map(p=>p.bottom)))};
    const rectangles=['menuCard','farmTitle','menuTagline'].map(id=>document.getElementById(id)?.getBoundingClientRect());
    rectangles.push(screen.querySelector?.('.menu-footer')?.getBoundingClientRect());
    const blockers=rectangles.filter(r=>r?.width>0&&r?.height>0).map(r=>({left:r.left-(area.left||0),right:r.left+r.width-(area.left||0),
      top:r.top-(area.top||0),bottom:r.top+r.height-(area.top||0)}));
    blockers.push(...group);
    const half=boxWidth/2, center=(herdBox.left+herdBox.right)/2;
    const candidates=[{x:center,y:herdBox.bottom+18},{x:center,y:herdBox.top-boxHeight-18},
      {x:herdBox.right+half+18,y:herdBox.bottom-boxHeight},{x:herdBox.left-half-18,y:herdBox.bottom-boxHeight}];
    for (const y of [rootHeight-boxHeight-16,herdBox.bottom+18,herdBox.top-boxHeight-18])
      for (const x of [center,rootWidth/2,rootWidth-half-16,half+16]) candidates.push({x,y});
    const fits=p=>p.x-half>=12&&p.x+half<=rootWidth-12&&p.y>=12&&p.y+boxHeight<=rootHeight-12&&
      !blockers.some(r=>p.x+half>r.left-10&&p.x-half<r.right+10&&p.y+boxHeight>r.top-10&&p.y<r.bottom+10);
    const chosen=candidates.map(p=>({...p,x:Math.max(half+16,Math.min(rootWidth-half-16,p.x))})).find(fits);
    invitation.dataset.placement=chosen?'herd':'flow';
    invitation.style.left=chosen?`${Math.round(chosen.x)}px`:'';
    invitation.style.top=chosen?`${Math.round(chosen.y)}px`:'';
    invitation.style.bottom=chosen?'auto':'';
  }
  function updatePlayHint() {
    const device=typeof GameInput==='undefined'?'keyboard':GameInput.device;
    const text=device==='gamepad'?'Selecione o botão para brincar.':device==='touch'?'Toque nos bichos para brincar.':'Clique nos bichos para brincar.';
    if (playHint.textContent===text) return false;
    playHint.textContent=text;
    return true;
  }
'''
assert s.count(anchor)==1;s=s.replace(anchor,fn+anchor)
s=s.replace("    if (!active || !context || !CharacterArt.ready) return;\n    if (resizeDirty) {","    if (!active || !context || !CharacterArt.ready) return;\n    const hintChanged=updatePlayHint();\n    const placeHint=resizeDirty || hintChanged;\n    if (resizeDirty) {")
s=s.replace('    dt = Math.max(0,Math.min(.1,dt));','    if (placeHint) placePlayHint();\n    dt = Math.max(0,Math.min(.1,dt));')
p.write_text(s)
p=root/'index.html';s=p.read_text()
old='Brincar com a turma <span aria-hidden="true">↗</span>'
assert s.count(old)==1;s=s.replace(old,'Brincar com a turma')
assert s.count('Toque nos bichos: eles também aprontam.')==1
s=s.replace('Toque nos bichos: eles também aprontam.','Clique nos bichos para brincar.')
for file in ['menu.css','systems/menu-scene.js']:
    version=hashlib.sha256((root/file).read_bytes()).hexdigest()[:12]
    s,count=re.subn(re.escape(file)+r'\?v=[^"\s]+',file+'?v='+version,s)
    assert count==1,(file,count)
p.write_text(s)
