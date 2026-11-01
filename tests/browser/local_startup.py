"""Check the real double-click entry point, as well as its published directory."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
from game_ui import start_adventure,READY

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'.cache/local-startup'
OUT.mkdir(parents=True,exist_ok=True)
reports=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome')
    for folder in [ROOT,ROOT/'dist']:
        for width,height in [(1280,900),(390,844)]:
            page=browser.new_page(viewport={'width':width,'height':height})
            errors=[]
            page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto((folder/'index.html').as_uri(),wait_until='load')
            page.wait_for_function(READY,polling=50)
            page.locator('#newAdventureBtn').wait_for(state='visible')
            styles=page.evaluate('''() => ({
                css:[...document.querySelectorAll('link[rel="stylesheet"]')].every(link=>link.sheet!==null),
                button:getComputedStyle(document.querySelector('#newAdventureBtn')).fontFamily,
                overflow:document.documentElement.scrollWidth>innerWidth+1
            })''')
            assert styles['css'],styles
            assert not styles['overflow'],styles
            page.screenshot(path=str(OUT/f'{folder.name}-{width}-menu.png'))
            for button,panel in [('menuCharacterBtn','panel-outfit'),('menuOptionsBtn','panel-audio')]:
                page.locator('#'+button).click()
                page.locator('#'+panel).wait_for(state='visible')
                page.locator('#menuBackBtn').click()
            page.locator('#howToPlayBtn').click()
            page.locator('#howToPlayDialog').wait_for(state='visible')
            page.get_by_role('button',name='Entendi',exact=True).click()
            start_adventure(page)
            page.wait_for_function('state.elapsed>.3')
            page.locator('#gameCanvas').focus()
            before=page.evaluate('({x:state.entities.chicken.x,y:state.entities.chicken.y})')
            page.keyboard.down('d');page.wait_for_timeout(200);page.keyboard.up('d')
            assert page.evaluate('(p)=>distance(p,state.entities.chicken)>1',before),'movement did not respond'
            page.screenshot(path=str(OUT/f'{folder.name}-{width}-game.png'))
            page.locator('#pauseBtn').click()
            saved=page.evaluate('({time:state.elapsed,x:state.entities.chicken.x,y:state.entities.chicken.y,seed:state.worldSeed})')
            page.wait_for_timeout(150)
            assert page.evaluate('state.elapsed')==saved['time'],'pause did not freeze the adventure'
            page.reload(wait_until='load');page.wait_for_function(READY,polling=50)
            page.locator('#continueBtn').click();page.wait_for_function("state.phase==='playing'")
            assert page.evaluate('(p)=>state.worldSeed===p.seed&&distance(p,state.entities.chicken)<1',saved),'reload lost saved position'
            page.locator('#pauseBtn').click()
            page.locator('#shuffleModeLink').click()
            page.wait_for_function('window.ShuffleDemo?.ready')
            if page.locator('#startSurvival').is_visible():page.locator('#startSurvival').click()
            page.wait_for_function("ShuffleDemo.run?.phase==='playing'")
            assert page.evaluate("[...document.querySelectorAll('link[rel=stylesheet]')].every(link=>link.sheet!==null)")
            page.screenshot(path=str(OUT/f'{folder.name}-{width}-chaos.png'))
            assert not errors,errors
            reports.append({'entry':str(folder.relative_to(ROOT)),'width':width,'styles':True,'menus':True,'movement':True,
                'pause':True,'savedReload':True,'chaos':True,'errors':errors})
            print(json.dumps(reports[-1]),flush=True)
            page.close()
    browser.close()
(OUT/'report.json').write_text(json.dumps(reports,indent=2),encoding='utf-8')
print(json.dumps(reports))
