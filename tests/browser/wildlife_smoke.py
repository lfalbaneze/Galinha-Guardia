"""Real Chromium checks. Positions are controlled; attacks, keys and visibility use game code."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json
import os
ROOT=Path(__file__).resolve().parents[2]
OUT=Path(os.environ.get('WILDLIFE_SCREENSHOTS',ROOT/'.cache/wildlife-review'));OUT.mkdir(parents=True,exist_ok=True)
BASE=os.environ.get('GAME_BASE_URL','http://127.0.0.1:8765')
READY='CharacterArt.ready && GooseArt.ready && FoxArt.ready && OwlArt.ready && FarmSprites.ready'
report={'checks':[],'page_errors':[],'http_errors':[]}
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 page=browser.new_page(viewport={'width':1280,'height':1000})
 page.on('pageerror',lambda e:report['page_errors'].append(str(e)))
 page.on('response',lambda r:report['http_errors'].append([r.url,r.status]) if r.status>=400 else None)
 try:
  page.goto(BASE,wait_until='networkidle');page.wait_for_function(READY)
  page.locator('#startBtn').click();page.wait_for_timeout(120)
  assert 'Luis Albaneze' in page.locator('.game-author').inner_text()
  before=page.evaluate('state.entities.chicken.x')
  page.keyboard.down('d');page.wait_for_timeout(150);page.keyboard.up('d')
  assert page.evaluate('state.entities.chicken.x')>before
  report['checks'].append('Normal startup, all PNGs ready, authorship and live keyboard movement')
  page.close()
  page=browser.new_page(viewport={'width':1280,'height':1000})
  page.add_init_script('window.requestAnimationFrame=()=>0')
  page.on('pageerror',lambda e:report['page_errors'].append(str(e)))
  page.on('response',lambda r:report['http_errors'].append([r.url,r.status]) if r.status>=400 else None)
  page.goto(BASE,wait_until='networkidle');page.wait_for_function(READY);page.locator('#startBtn').click()
  page.evaluate("""()=>{
    resetGame(2147483648);state.phase='playing';
    window.foxApproach=()=>{
      const f=state.entities.foxes[0],c=state.entities.chicken;
      Object.assign(f,{x:f.home.x,y:f.home.y,mode:'hidden',cooldown:0,grace:0,hit:false,timer:0,route:[]});
      for(const [dx,dy] of [[85,0],[-85,0],[0,85],[0,-85]])for(const sign of [1,-1]){
        const start={x:f.home.x+dx,y:f.home.y+dy};
        const end={x:start.x+(dy?105*sign:0),y:start.y+(dx?105*sign:0)};
        if(!WildlifeRules.clear(start,start,c.hitbox)||!WildlifeRules.clear(start,end,c.hitbox))continue;
        Object.assign(c,{...start,hidden:false,invulnerable:0});
        camera.x=clamp(f.x-420,0,WORLD.width-900);camera.y=clamp(f.y-230,0,WORLD.height-520);
        FoxSystem.update(state,.05);
        if(f.mode!=='warning')continue;
        state.entities.wolf.huntUnlockTimer=10;GameUI.update(state);renderGame();
        return dy?(sign>0?'d':'a'):(sign>0?'s':'w');
      }throw Error('No clear ambush approach');
    };
  }""")
  dodge=page.evaluate('foxApproach()');page.locator('#gameCanvas').focus()
  page.screenshot(path=str(OUT/'fox-warning.png'))
  target=page.evaluate('JSON.stringify(state.entities.foxes[0].target)')
  page.keyboard.down(dodge);page.evaluate('for(let i=0;i<7;i++)updateGame(.05)');page.keyboard.up(dodge)
  assert page.evaluate('JSON.stringify(state.entities.foxes[0].target)')==target
  page.evaluate("for(let i=0;i<30&&state.entities.foxes[0].mode==='warning';i++)updateGame(.05)")
  assert page.evaluate('state.entities.foxes[0].mode')=='dash'
  page.evaluate("for(let i=0;i<20&&state.entities.foxes[0].mode==='dash';i++)updateGame(.05);renderGame()")
  assert page.evaluate('!state.entities.foxes[0].hit && state.entities.foxes[0].mode==="rest"')
  assert page.evaluate('state.lives')==3
  page.screenshot(path=str(OUT/'fox-after-dodge.png'))
  report['checks'].append('Fox warning, fixed target, real keyboard sidestep, completed miss and rest')
  page.evaluate('foxApproach()')
  page.evaluate('for(let i=0;i<36&&!state.entities.foxes[0].hit;i++)updateGame(.05)')
  assert page.evaluate('state.entities.foxes[0].hit && state.entities.chicken.invulnerable>0 && state.lives===3')
  report['checks'].append('Fox contact causes protected knockback, not lost lives')
  page.evaluate("""()=>{
    window.owlApproach=()=>{
      const o=state.entities.owls[0],c=state.entities.chicken;
      Object.assign(o,{mode:'watch',cooldown:0,grace:0,alertProgress:0,target:null});
      const dx=Math.cos(o.heading),dy=Math.sin(o.heading);
      for(const range of [200,220,180]){
        const pos={x:o.x+dx*range,y:o.y+dy*range},end={x:o.x+dx*(range+110),y:o.y+dy*(range+110)};
        if(!WildlifeRules.clear(pos,pos,c.hitbox)||!WildlifeRules.clear(pos,end,c.hitbox))continue;
        Object.assign(c,{...pos,hidden:false,invulnerable:0});
        if(!OwlSystem.canSee(o,c))continue;
        camera.x=clamp(o.x-440,0,WORLD.width-900);camera.y=clamp(o.y-240,0,WORLD.height-520);
        const w=state.entities.wolf;w.x=pos.x;w.y=pos.y;w.mode='patrol';w.huntUnlockTimer=0;w.pauseTimer=0;w.heardPoint=null;
        return Math.abs(dx)>Math.abs(dy)?(dx<0?'a':'d'):(dy<0?'w':'s');
      }throw Error('No clear sentinel approach');
    };
  }""")
  escape=page.evaluate('owlApproach()')
  page.evaluate('for(let i=0;i<8;i++)OwlSystem.update(state,.05);renderGame()')
  assert page.evaluate('state.entities.owls[0].mode')=='alert'
  page.screenshot(path=str(OUT/'owl-warning.png'))
  page.locator('#gameCanvas').focus();page.keyboard.down(escape)
  page.evaluate('for(let i=0;i<8;i++){Player.update(state,.05);OwlSystem.update(state,.05)}')
  page.keyboard.up(escape)
  assert page.evaluate('state.entities.owls[0].alertProgress')==0
  assert page.evaluate('state.entities.wolf.heardPoint') is None
  report['checks'].append('Owl visible sector and warning; keyboard exit cancels it before completion')
  page.evaluate('owlApproach()');observed=page.evaluate('JSON.stringify({x:state.entities.chicken.x,y:state.entities.chicken.y})')
  page.evaluate('for(let i=0;i<30;i++)OwlSystem.update(state,.05);GameUI.update(state);renderGame()')
  assert page.evaluate('state.entities.owls[0].mode')=='cooldown'
  assert page.evaluate('state.entities.wolf.mode')=='investigate'
  assert page.evaluate('JSON.stringify(state.entities.wolf.heardPoint)')==observed
  page.screenshot(path=str(OUT/'owl-after-alarm.png'))
  report['checks'].append('Completed alarm creates a local observation snapshot for the wolf')
  before=page.evaluate('JSON.stringify([state.entities.foxes,state.entities.owls])')
  page.keyboard.press('Escape');page.evaluate('for(let i=0;i<20;i++){FoxSystem.update(state,.05);OwlSystem.update(state,.05)}')
  assert page.evaluate('JSON.stringify([state.entities.foxes,state.entities.owls])')==before
  page.locator('#continueBtn').click();page.evaluate('GameManager.save(state)')
  saved_ids=page.evaluate('state.entities.foxes.map(f=>f.id)');page.reload(wait_until='networkidle');page.wait_for_function(READY);page.locator('#continueBtn').click()
  assert page.evaluate('state.entities.foxes.map(f=>f.id)')==saved_ids
  assert page.evaluate('state.entities.foxes.every(f=>f.mode!=="dash"&&f.mode!=="warning"&&f.grace>0)')
  assert page.evaluate('state.entities.owls.every(o=>o.alertProgress===0&&o.grace>0)')
  for width in [360,600,900,1440]:
   page.set_viewport_size({'width':width,'height':1000})
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  report['checks'].append('Pause freezes encounters; reload restores identities with grace; four viewport widths')
  for name in ['fox','owl']:
   failure=browser.new_page();failure.add_init_script('window.requestAnimationFrame=()=>0')
   pattern=f'**/assets/sprites/sources/{name}.png'
   failure.route(pattern,lambda route:route.abort())
   failure.goto(BASE,wait_until='networkidle');failure.wait_for_function(f'{name.capitalize()}Art.errors.length>0')
   assert failure.locator('#startBtn').is_disabled();assert failure.locator('#retrySprites').is_visible()
   failure.unroute(pattern);failure.locator('#retrySprites').click();failure.wait_for_function(READY)
   assert failure.locator('#startBtn').is_enabled()
   failure.locator('#startBtn').click();assert failure.evaluate('state.phase')=='playing';failure.close()
  report['checks'].append('Each missing enemy PNG blocks start and can be retried successfully')
  offline=browser.new_page();offline.add_init_script('window.requestAnimationFrame=()=>0')
  offline.on('pageerror',lambda e:report['page_errors'].append(str(e)))
  offline.goto((ROOT/'dist/index.html').as_uri(),wait_until='networkidle');offline.wait_for_function(READY)
  offline.locator('#startBtn').click();offline.evaluate('updateGame(.05);renderGame()')
  assert offline.evaluate('state.entities.foxes.length>0 || state.entities.owls.length>0')
  offline.screenshot(path=str(OUT/'offline.png'));offline.close()
  report['checks'].append('Built distribution loads the new PNG sheets via file://')
  assert not report['page_errors'],report['page_errors'];assert not report['http_errors'],report['http_errors']
 finally:
  try: page.screenshot(path=str(OUT/'last-state.png'))
  except Exception: pass
  (OUT/'checks.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
  browser.close()
print(json.dumps(report,ensure_ascii=False))
