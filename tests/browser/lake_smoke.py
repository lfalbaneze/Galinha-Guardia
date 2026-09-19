# Integration checks with the real browser DOM and game scripts.
# Install tests/browser/requirements.txt and Chromium; serve the repo at 127.0.0.1:8765.
# Controlled starting positions keep encounters reproducible; counters are earned by actual dashes.
from playwright.sync_api import sync_playwright
from pathlib import Path
import json
import os
ROOT=Path(__file__).resolve().parents[2]
OUT=Path(os.environ.get('LAKE_SCREENSHOTS', ROOT/'.cache/lake-review')); OUT.mkdir(parents=True,exist_ok=True)
result={'checks':[],'errors':[],'failed_requests':[]}
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 page=browser.new_page(viewport={'width':1280,'height':1000})
 page.on('pageerror',lambda e:result['errors'].append(str(e)))
 page.on('response',lambda r:result['failed_requests'].append({'url':r.url,'status':r.status}) if r.status>=400 else None)
 page.goto('http://127.0.0.1:8765',wait_until='networkidle')
 page.wait_for_function('CharacterArt.ready && GooseArt.ready && FarmSprites.ready')
 assert page.locator('.game-author').inner_text()=='Feito por Luis Albaneze'
 page.locator('#startBtn').click();page.wait_for_timeout(300)
 assert page.evaluate("!FarmArt.getProps(WORLD.layout).some(p=>p.type==='fence')")
 assert page.evaluate("FarmArt.getProps(WORLD.layout).some(p=>p.type==='refuge-rail')")
 assert 'Feito por Luis Albaneze' in page.locator('footer.sprite-credits').inner_text()
 result['checks'].append('Authorship in menu/footer; no decorative fence fragments; functional refuge retained')
 x=page.evaluate('state.entities.chicken.x')
 page.keyboard.down('d');page.wait_for_timeout(180);page.keyboard.up('d')
 assert page.evaluate('state.entities.chicken.x')!=x
 result['checks'].append('Real-time startup, PNG loading, keyboard movement')
 page.screenshot(path=str(OUT/'browser-farm.png'))
 page.close()
 page=browser.new_page(viewport={'width':1280,'height':1000})
 page.add_init_script('window.requestAnimationFrame=()=>0')
 page.on('pageerror',lambda e:result['errors'].append(str(e)))
 page.on('response',lambda r:result['failed_requests'].append({'url':r.url,'status':r.status}) if r.status>=400 else None)
 page.goto('http://127.0.0.1:8765',wait_until='networkidle');page.wait_for_function('CharacterArt.ready && GooseArt.ready && FarmSprites.ready')
 page.locator('#startBtn').click()
 page.evaluate("""() => {
   resetGame(814237);state.phase='playing';
   window.setupGooseApproach=()=>{
     const g=state.entities.goose,c=state.entities.chicken;
     const candidates=[[-100,0],[100,0],[0,100],[0,-100]];
     for(const [dx,dy] of candidates){
       c.x=g.home.x+dx;c.y=g.home.y+dy;c.hidden=false;c.invulnerable=0;
       const old={x:c.x,y:c.y};resolveEnvironment(c);
       if(distance(c,old)<.01&&DetectionSystem.hasLineOfSight(getHitbox(c),getHitbox(g))) {
         camera.x=clamp(c.x-450,0,WORLD.width-900);camera.y=clamp(c.y-270,0,WORLD.height-520);
         GameUI.update(state);renderGame();return {dx,dy};
       }
     }
     throw Error('No clear approach');
   };
   setupGooseApproach();
 }""")
 page.locator('#lakeChallengeBtn').click()
 assert page.evaluate('state.lake.active')
 assert page.evaluate('distance(state.entities.wolf,state.entities.goose.home)>400')
 result['checks'].append('Opt-in button and wolf exclusion in real seeded farm')
 def until(condition):
  value=page.evaluate("""condition=>{for(let i=0;i<600;i++){if(eval(condition))return true;updateGame(.05);}return {mode:state.entities.goose.mode,misses:state.lake.misses,c:state.entities.chicken,g:state.entities.goose}}""",condition)
  assert value is True, value
 for turn in range(3):
  # Each round may contain two committed dashes. No reward until the close interaction.
  for leg in range(8):
   until("state.entities.goose.mode==='warning'")
   page.evaluate('renderGame()')
   if turn==0:page.screenshot(path=str(OUT/'browser-goose-warning.png'))
   key=page.evaluate("""()=>{
     const g=state.entities.goose,c=state.entities.chicken,dx=g.target.x-g.x,dy=g.target.y-g.y;
     const opts=Math.abs(dx)>Math.abs(dy)?[['s',0,85],['w',0,-85]]:[['d',85,0],['a',-85,0]];
     for(const [key,x,y] of opts){const probe={...c};Player.move(probe,x,y);
       if(distance(probe,{x:c.x+x,y:c.y+y})<.01&&distance(probe,g.home)<295)return key;}
     throw Error('No dodge lane');
   }""")
   page.keyboard.down(key);page.evaluate('for(let i=0;i<6;i++)updateGame(.05)');page.keyboard.up(key)
   until("state.entities.goose.mode!=='warning'")
   until("state.entities.goose.mode==='warning'||state.lake.counterWindow>0")
   if page.evaluate('state.lake.counterWindow>0'):break
  assert page.evaluate('state.lake.misses')==turn
  reached=page.evaluate("""()=>{
    const c=state.entities.chicken,g=state.entities.goose;
    for(let i=0;i<100&&state.lake.counterWindow>0;i++){
      if(LakeChallenge.canCounter(state))return true;
      const route=WildlifeRules.clear(c,g,c.hitbox)?[g]:WolfAI.findPath(c,g);
      const p=route.find(p=>distance(c,p)>6)||g,len=distance(c,p),step=Math.min(len,c.speed*.05);
      if(len>.01)Player.move(c,(p.x-c.x)/len*step,(p.y-c.y)/len*step);updateGame(.05);
    }return false;
  }""")
  assert reached
  page.keyboard.press('e')
  assert page.evaluate('state.lake.misses')==turn+1
  if turn==0:
   page.locator('#pauseBtn').click();assert page.evaluate("state.phase==='menu'")
   page.locator('#continueBtn').click();assert page.evaluate('state.lake.active && state.lake.misses===1')
 result['checks'].append('Three rounds, keyboard dodges and close E counters, pause/resume, no injected stamps')
 assert page.evaluate('state.lake.completed && !state.lake.active && SkinSystem.unlocked("goose")')
 assert page.evaluate('state.lives===3 && state.rescuedCount===0')
 assert page.evaluate('state.entities.goose.rescued && state.lake.gooseRescued && state.score===100')
 page.evaluate('renderGame();GameUI.update(state);GameManager.save(state)')
 page.screenshot(path=str(OUT/'browser-lake-victory.png'))
 # Bridge collision uses real generated obstacles and the ordinary Player.move function.
 crossed=page.evaluate("""()=>{const b=LakeChallenge.bridge(),c=state.entities.chicken;c.x=b.x;c.y=b.y+b.h/2-14;Player.move(c,b.w,0);return Math.abs(c.x-b.x-b.w)<.01;}""")
 assert crossed;result['checks'].append('Unlocked bridge can actually be crossed')
 page.locator('#pauseBtn').click();page.locator('#tab-outfit').click()
 page.locator('#menuSkinSelect').select_option('goose');page.locator('#continueBtn').click()
 assert page.evaluate('state.entities.chicken.skin==="goose"')
 page.evaluate('GameUI.update(state);updateCamera(1);renderGame();GameManager.save(state)')
 page.screenshot(path=str(OUT/'browser-goose-skin.png'))
 page.reload(wait_until='networkidle');page.wait_for_function('CharacterArt.ready && GooseArt.ready')
 assert page.evaluate('state.lake.completed && SkinSystem.unlocked("goose") && state.entities.chicken.skin==="goose"')
 page.locator('#continueBtn').click();assert page.evaluate('state.entities.goose.mode==="defeated"')
 assert page.evaluate('state.entities.goose.rescued && distance(state.entities.goose,FarmRefuge.gooseHome())<1')
 result['checks'].append('Victory, open bridge and equipped cosmetic persisted after reload')
 page.evaluate("""()=>{resetGame(814237);state.phase='playing';const sign=FarmArt.getProps(WORLD.layout).find(p=>p.id==='sign-quintal');
   camera.x=clamp(sign.x-450,0,WORLD.width-900);camera.y=clamp(sign.y-260,0,WORLD.height-520);renderGame();GameUI.update(state);}""")
 page.screenshot(path=str(OUT/'browser-signs.png'))
 for width in [1280,900,600,390]:
  page.set_viewport_size({'width':width,'height':1000})
  assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),width
 result['checks'].append('No horizontal overflow at four viewport widths')
 # The packaged game must not require HTTP or a transpiler to start.
 offline=browser.new_page(viewport={'width':1100,'height':850},reduced_motion='reduce')
 offline.on('pageerror',lambda e:result['errors'].append(str(e)))
 offline.goto((ROOT/'dist/index.html').as_uri(),wait_until='load');offline.wait_for_function('CharacterArt.ready && GooseArt.ready')
 offline.locator('#startBtn').click();offline.wait_for_timeout(200)
 assert offline.evaluate("state.phase==='playing'")
 result['checks'].append('Packaged file:// startup with reduced motion')
 browser.close()
assert not result['errors'], result['errors']
assert not result['failed_requests'], result['failed_requests']
(OUT/'browser-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(result,ensure_ascii=False,indent=2))
