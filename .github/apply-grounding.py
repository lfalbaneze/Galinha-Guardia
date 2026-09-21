from pathlib import Path
import re,hashlib,shutil
r=Path.cwd();base=r/'.cache/grounding-base';base.mkdir(parents=True,exist_ok=True)
expected={'systems/sunlight.js':'13c94f6b5cf62d7f8c411e2c390251801e49afcf','systems/farm-sprites.js':'d47e816786890aa2d4ea15c1c83b529d9d7061f4','systems/farm-details.js':'248e961ebefab189a351a21516b03f89bbd4ec58','systems/farm-art.js':'ae6f7b1a1a73c6e059aef239840ec2b8f6a5e1a8','src/systems/rescue-system.ts':'7de5d7d8f0a60bc3691a8b70b6af9706938fb880','src/systems/sunflower-system.ts':'7463a72684fc5c181eea137d35281c03d5c1aada','src/types/browser-bridge.d.ts':'506ad0c8ce75101dc2d8b3226703e04b82224452','src/types/game.d.ts':'65caa8d4b2905874a49b97b395d079ce0173fe6c','systems/ui.js':'8f6afb121ce5f554c18565874f3e65cd9ed0b415','tests/farm-rendering.test.cjs':'4f38a0b27df51afc0cce5c5480edabe59e05183d','tests/sunlight.test.cjs':'38ae33f129b5f952233b0e7d51c327034e07fa14'}
for file,wanted in expected.items():
 raw=(r/file).read_bytes();actual=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
 if actual!=wanted:raise RuntimeError(f'{file} changed since the reviewed main: {actual}')
def edit(name,fn):
 p=r/name
 if not (base/name).exists():
  d=base/name;d.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,d)
 p.write_text(fn(p.read_text()))
ground='''  function ground(c,paint) {
    if(!enabled||capturing||typeof paint!=='function')return false;
    const out=groundContext(c);out.save();
    try {paint(out);casts++;return true;} finally {out.restore();}
  }
'''
edit('systems/sunlight.js',lambda s:s.replace('  function mask(image,w,h,rect) {',ground+'  function mask(image,w,h,rect) {').replace('install,begin,beginLayer,actor,end,sample,cast,contact,footprint,native,rail,','install,begin,beginLayer,actor,end,sample,cast,contact,footprint,native,rail,ground,').replace('''    const dx=light.dx*height,dy=light.dy*height;
    out.beginPath();out.moveTo(x1,y1);out.lineTo(x1+dx,y1+dy);out.lineTo(x2+dx,y2+dy);out.lineTo(x2,y2);out.stroke();out.restore();''','''    // Fence supports touch this ground line; do not add a second raised rail silhouette.
    out.lineWidth=Math.min(3,width);
    out.beginPath();out.moveTo(x1,y1);out.lineTo(x2,y2);out.stroke();out.restore();casts++;'''))
edit('systems/farm-sprites.js',lambda s:s.replace('''    if(options.foundation&&placed.foundation)c.drawImage(placed.foundation,-8,0);
    if(options.solar!==false&&typeof Sunlight!=='undefined')Sunlight.cast(c,placed.tile,0,0,width,height,placed.bottom+1);
    if(options.shadow&&placed.shadow)c.drawImage(placed.shadow,-1,-1);''','''    // Static scenery has one attached contact contour, not a second stretched
    // copy of the whole object. Foreground re-paints must never cast it again.
    if(options.solar!==false&&(options.foundation||options.shadow)) {
      const paint=out=>{
        if(options.foundation&&placed.foundation)out.drawImage(placed.foundation,-8,0);
        if(options.shadow&&placed.shadow)out.drawImage(placed.shadow,-1,-1);
      };
      if(typeof Sunlight==='undefined'||!Sunlight.ground(c,paint))paint(c);
    }'''))
edit('systems/farm-details.js',lambda s:s.replace('''    if(typeof Sunlight!=='undefined')Sunlight.native(c,`sign/${p.name}/${p.w}/${p.h||49}`,
      {x:p.x-1,y:p.y-1,w:p.w+2,h:(p.h||49)+2},p.y+(p.h||49)-1,out=>drawSign(out,p));
''','').replace('''    // One sign family throughout the farm, with actual posts and short contact shadows.
    for(const at of [x+19,x+w-23]) {
      c.fillStyle='#30402640';c.fillRect(at-2,y+h-3,10,3);''','''    // Only the two visible post feet cast contact, below every body layer.
    const contact=out=>{out.fillStyle='#30402660';for(const at of [x+19,x+w-23])out.fillRect(at-1,y+h-3,8,3);};
    if(typeof Sunlight==='undefined'||!Sunlight.ground(c,contact))contact(c);
    for(const at of [x+19,x+w-23]) {'''))
def farm(s):
 s=s.replace('''    if(typeof Sunlight!=='undefined')Sunlight.native(c,`crop/${type}/${!!d.sprout}/${Math.round(n*10)}`,
      {x:d.x-17,y:d.y-35,w:34,h:39},d.y+2,out=>gardenPlant(out,d));
''','').replace('''    if(typeof Sunlight!=='undefined')Sunlight.native(c,`corn/${p.variant}/${Math.round(hash(p.x,p.y)*4)}`,
      {x:p.x-18,y:p.y-68,w:36,h:72},p.y+2,out=>corn(out,p));
''','')
 s=s.replace('  function gardenPlant(c,d) {','''  function ground(c,paint) {
    if(typeof Sunlight==='undefined'||!Sunlight.ground(c,paint)){c.save();try{paint(c);}finally{c.restore();}}
  }
  function gardenPlant(c,d) {''')
 for points in ['[[-4,1],[4,1]]','[[-8,2],[8,2]]','[[-7,2],[7,2]]','[[-9,2],[9,2]]','[[-4,2],[5,2]]']:
  s=s.replace(f"stroke({points},'#49332155',2);",f"ground(c,out=>line(out,{points},'#49332155',2));")
 s=s.replace("    c.fillStyle='#33442640';c.fillRect(-3,0,7,2);","    ground(c,out=>{out.fillStyle='#33442650';out.fillRect(-3,0,7,2);});")
 return s
edit('systems/farm-art.js',farm)
edit('src/systems/sunflower-system.ts',lambda s:s.replace('''    if(typeof Sunlight!=='undefined')Sunlight.native(c,`sunflower/${p.variant}`,
      {x:p.x-20,y:p.y-94,w:40,h:98},p.y+2,out=>drawPlant(out,p));
''','').replace("    c.fillStyle='#33442640';c.fillRect(-3,0,7,2);","    const contact=(out:CanvasRenderingContext2D)=>{out.fillStyle='#33442650';out.fillRect(-3,0,7,2);};\n    if(typeof Sunlight==='undefined'||!Sunlight.ground(c,contact))contact(c);"))
edit('src/types/browser-bridge.d.ts',lambda s:s.replace('declare const Sunlight: {','declare const Sunlight: {\n  ground(c:CanvasRenderingContext2D,paint:(out:CanvasRenderingContext2D)=>void):boolean;'))
identity='''  chickNames: ['Pingo','Fubá','Quindim','Cacau','Farofa','Dengo','Biscoito','Mel','Tutu','Jujuba'],
  owlNames: ['Aurora','Olívia'],
  crowNames: ['Tico','Teco','Cacá'],
  nameOf(animal: {species?:string;type?:string;id?:string;skin?:string;name?:string},game?:Farm.GameState): string {
    // Pipoca is a playable appearance; Jay Jay is the separate rescued rabbit.
    if(animal.type==='chicken'||animal.species==='chicken')return CharacterArt.appearances[animal.skin||'classic']?.name||'Erina';
    if(animal.name?.trim())return animal.name.trim();
    const species=animal.species||animal.type||'';
    const index=Number(/(?:^|[_-])(\\d+)$/.exec(animal.id||'')?.[1]||0);
    if(species==='chick')return RescueSystem.chickNames[index]||`Pintinho ${index+1}`;
    if(species==='owl'){
      const found=game?.entities.owls?.findIndex(o=>o.id===animal.id)??-1,n=found>=0?found:index;
      return RescueSystem.owlNames[n]||`Coruja ${n+1}`;
    }
    if(species==='crow')return RescueSystem.crowNames[index]||`Corvo ${index+1}`;
    if(species==='wolf')return 'Baltazar';
    if(species==='goose')return 'Panto';
    if(species==='thor')return 'Thor';
    if(species==='fox')return 'Lorenzo';
    return RescueSystem.names[species as Farm.Species]||'Amigo da fazenda';
  },
'''
def rescue(s):
 start=s.index('  names: {');end=s.index('  personalities:',start)
 s=s[:start]+'''  names: { sheep:'Amélia',pig:'Tonico',goat:'Josefina',cow:'Mimosa',duck:'Quincas',
    rabbit:'Jay Jay',dog:'Bento',cat:'Nino',donkey:'Astolfo',lamb:'Floquinho',chick:'Pingo',horse:'Ventania',turkey:'Osvaldo' },
'''+identity+s[end:]
 s=s.replace('RescueSystem.names[animal.species]','RescueSystem.nameOf(animal,game)')
 s=s.replace('game.secretNotice = { time: 4, bonus: true, x:','game.secretNotice = { time: 4, bonus: true, name: RescueSystem.nameOf(chick,game), x:')
 s=s.replace('setStatus(`Piu! Fim da expedição','setStatus(`${RescueSystem.nameOf(chick,game)}: Piu! Fim da expedição')
 return s
edit('src/systems/rescue-system.ts',rescue)
edit('src/types/game.d.ts',lambda s:s.replace('interface SecretNotice extends TimedNotice { bonus?: boolean;','interface SecretNotice extends TimedNotice { name?: string; bonus?: boolean;'))
def ui(s):
 insert='''  function renderNames(game,speaking) {
    const player=game.entities.chicken,occupied=[];
    const tag=(animal,offset,identity=animal)=>{
      if(distance(player,animal)>=300)return;
      const p=worldToScreen(animal),y=p.y-offset-12;
      if(p.x<12||p.x>canvas.width-12||y<72||y>canvas.height-12)return;
      const name=RescueSystem.nameOf(identity,game);
      ctx.font='bold 11px Trebuchet MS,sans-serif';
      const width=Math.min(130,ctx.measureText(name).width+8),x=clamp(p.x,width/2+8,canvas.width-width/2-8);
      const b={x:x-width/2,y:y-12,w:width,h:17};
      if(occupied.some(a=>b.x<a.x+a.w&&b.x+b.w>a.x&&b.y<a.y+a.h&&b.y+b.h>a.y))return;
      occupied.push(b);ctx.save();ctx.textAlign='center';ctx.lineWidth=3;ctx.lineJoin='round';
      ctx.strokeStyle='rgba(34,50,31,.9)';ctx.fillStyle='#fff3cf';
      ctx.strokeText(name,x,y,122);ctx.fillText(name,x,y,122);ctx.restore();
    };
    // Never label undiscovered chicks or reveal friends through cover.
    for(const a of RescueSystem.all(game).filter(a=>!speaking.has(a)&&RescueSystem.visible(game,a))
      .sort((a,b)=>distance(player,a)-distance(player,b)).slice(0,6))
      tag(a,CharacterArt.markerOffset(a.species)*(a.type==='chick'&&a.rescued?.72:1));
    const wolf=game.entities.wolf;
    if(wolf.mode==='patrol'&&!SunflowerSystem.concealed(game)&&DetectionSystem.hasLineOfSight(getHitbox(player),getHitbox(wolf)))
      tag(wolf,CharacterArt.markerOffset('wolf'));
    // Panto, Thor and the foxes already have named captions.
    for(const owl of game.entities.owls||[])if(owl.mode!=='relocate'&&OwlSystem.visible(game,owl))tag(owl,owl.mode==='alert'?124:112);
    const flock=game.scarecrow;
    if(flock&&flock.mode!=='away'&&DetectionSystem.hasLineOfSight(getHitbox(player),flock))
      for(const [i,b]of flock.birds.entries())if(!b.flying&&b.opacity>.9)tag(b,b.z+28,{type:'crow',id:`crow_${i}`});
  }

'''
 s=s.replace('  function render(game) {',insert+'  function render(game) {',1)
 s=s.replace('    for (const animal of talkers.slice(0, 2)) {','    renderNames(game,new Set(talkers.slice(0,2).filter(a=>a.speechTime>0)));\n    for (const animal of talkers.slice(0, 2)) {',1)
 s=s.replace('        const width = Math.min(260, ctx.measureText(animal.speech).width + 26);','        const name=RescueSystem.nameOf(animal,game);\n        const width = Math.min(canvas.width-20,260,Math.max(ctx.measureText(animal.speech).width,ctx.measureText(name).width)+26);',1)
 s=s.replace('const by = at.y - CharacterArt.markerOffset(animal.species) - 36;','const by = Math.max(6,at.y - CharacterArt.markerOffset(animal.species) - 52);',1)
 s=s.replace('panel(bx, by, width, 30, "#fff3ce");','panel(bx, by, width, 46, "#fff3ce");',1)
 s=s.replace('ctx.moveTo(at.x-5,by+29); ctx.lineTo(at.x+5,by+29); ctx.lineTo(at.x,by+36);','ctx.moveTo(at.x-5,by+45); ctx.lineTo(at.x+5,by+45); ctx.lineTo(at.x,by+52);',1)
 s=s.replace('        ctx.fillText(animal.speech, bx + width / 2, by + 20, width - 14);','        ctx.font="bold 11px Trebuchet MS,sans-serif";ctx.fillText(name,bx+width/2,by+15,width-14);\n        ctx.font="13px Trebuchet MS,sans-serif";ctx.fillText(animal.speech,bx+width/2,by+34,width-14);',1)
 s=s.replace('panel(w.x - 60, w.y - 94, 120, wolf.mode === "alert" ? 33 : 25,','panel(w.x - 60, w.y - 105, 120, wolf.mode === "alert" ? 44 : 36,',1)
 s=s.replace('      ctx.fillText(labels[wolf.mode] || "", w.x, w.y - 77);','      ctx.fillText(RescueSystem.nameOf(wolf,game),w.x,w.y-92,108);\n      ctx.fillText(labels[wolf.mode] || "", w.x, w.y - 77);',1)
 s=s.replace("title:game.secretNotice.bonus?'Pintinho no ninho!':'Esse piado tem perninhas!',","title:game.secretNotice.bonus?(game.secretNotice.name?`${game.secretNotice.name} no ninho!`:'Pintinho no ninho!'):'Esse piado tem perninhas!',",1)
 return s
edit('systems/ui.js',ui)
edit('tests/farm-rendering.test.cjs',lambda s:s.replace('labels.includes("Pintinho no ninho!")','labels.includes(`${state.secretNotice.name} no ninho!`)'))
edit('tests/sunlight.test.cjs',lambda s:s.replace('live renderers all cast solar shadows','live renderers cast their ground contacts or airborne shadows'))
print('Edits applied')
