"""Integration check for named rescues and contact-only scenery, with real assets."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'.cache/names-scenery';OUT.mkdir(parents=True,exist_ok=True)
READY='[CharacterArt,GooseArt,FoxArt,OwlArt,ThorArt,ScarecrowArt].every(a=>a.ready)'
report={'checks':[],'errors':[]}
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 page=browser.new_page(viewport={'width':1280,'height':900})
 page.on('pageerror',lambda e:report['errors'].append(str(e)))
 page.add_init_script('window.requestAnimationFrame=()=>0')
 page.goto('http://127.0.0.1:8765',wait_until='networkidle')
 page.wait_for_function(READY,polling=50)
 page.locator('#newAdventureBtn').click();page.locator('#startBtn').click()
 page.evaluate('''()=>{
   resetGame(52);window.friend=state.entities.animals.find(a=>a.species==='rabbit');
   const c=state.entities.chicken;
   for(const [dx,dy]of [[-90,0],[90,0],[0,90],[0,-90]]){
     const at={x:friend.x+dx,y:friend.y+dy};
     if(WildlifeRules.clear(at,at,c.hitbox)&&DetectionSystem.hasLineOfSight(at,getHitbox(friend))){Object.assign(c,at);break;}
   }
   friend.speechTime=0;friend.moving=false;updateCamera(1);
   window.drawLabels=()=>{
     const original=ctx.fillText,labels=[];
     ctx.fillText=function(t,...args){labels.push(t);return original.call(this,t,...args)};
     try{GameUI.update(state);renderGame();}finally{ctx.fillText=original;}
     return labels;
   };
 }''')
 assert 'Jay Jay' in page.evaluate('drawLabels()')
 page.screenshot(path=str(OUT/'jay-jay-name.png'))
 report['checks'].append('Visible menu flow and Jay Jay name with actual game sprites')
 labels=page.evaluate('friend.speechTime=2;friend.speech=RescueSystem.stealthLines[0];drawLabels()')
 assert labels.count('Jay Jay')==1
 assert page.evaluate('friend.speech') in labels
 report['checks'].append('Name header preserves contextual stealth dialogue')
 page.evaluate('''()=>{
   const before=JSON.stringify([WORLD.layout,OBSTACLES]);
   const surface=document.createElement('canvas');surface.width=400;surface.height=400;
   const c=surface.getContext('2d'),old=Sunlight.cast;let projections=0;
   Sunlight.cast=(...args)=>{projections++;return old(...args)};
   try{
     Sunlight.begin(0);Sunlight.beginLayer(c);
     for(const type of ['tree','bush','sign','hay','coop','silo','trough','stable','corn','crop','sunflower'])
       FarmArt.drawProp(c,{type,x:140,y:180,w:100,h:60,name:'POMAR',variant:1},{x:0,y:0,shakeX:0,shakeY:0});
     if(projections)throw Error('Grounded scenery still casts long silhouettes');
   }finally{Sunlight.cast=old;Sunlight.end();}
   if(JSON.stringify([WORLD.layout,OBSTACLES])!==before)throw Error('Visual correction changed geometry');
 }''')
 report['checks'].append('Production scenery uses contacts only, with unchanged map and collision data')
 page.set_viewport_size({'width':390,'height':844});page.evaluate('GameUI.update(state);renderGame()')
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 page.screenshot(path=str(OUT/'phone-viewport.png'))
 report['checks'].append('Phone viewport has no horizontal overflow')
 page.evaluate('Object.assign(state.entities.chicken,{x:friend.x,y:friend.y});friend.speechTime=0;RescueSystem.update(state,0);GameManager.save(state)')
 assert page.evaluate('state.rescueNotice.name')=='Jay Jay'
 assert page.evaluate('state.rescuedCount')==1
 page.reload(wait_until='networkidle');page.wait_for_function(READY,polling=50)
 assert page.evaluate('state.entities.animals.find(a=>a.species==="rabbit").rescued')
 assert page.evaluate('RescueSystem.nameOf(state.entities.animals.find(a=>a.species==="rabbit"),state)')=='Jay Jay'
 report['checks'].append('Named rescue and saved progress survive reload')
 offline=browser.new_page();offline.add_init_script('window.requestAnimationFrame=()=>0')
 offline.on('pageerror',lambda e:report['errors'].append(str(e)))
 offline.goto((ROOT/'dist/index.html').as_uri(),wait_until='load');offline.wait_for_function(READY,polling=50)
 offline.locator('#newAdventureBtn').click();offline.locator('#startBtn').click()
 assert offline.evaluate('state.phase')=='playing'
 assert offline.evaluate('RescueSystem.nameOf(state.entities.animals.find(a=>a.species==="rabbit"),state)')=='Jay Jay'
 report['checks'].append('Packaged file:// game starts with the same names')
 browser.close()
assert not report['errors'],report['errors']
(OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False))
