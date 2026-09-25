"""Check the invitation in the actual title screen at desktop and touch sizes."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
OUT=Path('.cache/menu-hint-review'); OUT.mkdir(parents=True,exist_ok=True)
report=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    for width,height,touch in [(1440,900,False),(1920,1080,False),(1280,720,False),(900,1000,False),(900,1000,True),(390,844,True),(844,390,True)]:
        context=browser.new_context(viewport={'width':width,'height':height},is_mobile=touch,has_touch=touch)
        page=context.new_page(); errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.add_init_script("window.requestAnimationFrame=()=>0;let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);")
        page.goto('http://127.0.0.1:8765',wait_until='networkidle')
        page.wait_for_function("typeof CharacterArt!=='undefined' && CharacterArt.ready && typeof state!=='undefined'")
        page.evaluate('document.fonts.ready')
        page.evaluate('GameUI.showMenu(state);MenuScene.frame(state,0,true)')
        hint=page.locator('#menuMischief');button=page.locator('#menuScatter')
        assert '↗' not in button.inner_text()
        expected='Toque' if touch else 'Clique'
        assert page.locator('#menuPlayHint').inner_text().startswith(expected)
        page.screenshot(path=str(OUT/f'menu-{width}x{height}-{"touch" if touch else "mouse"}.png'),full_page=True)
        # The existing compact title layout deliberately hides the animal canvas.
        # Do not re-enable a button inviting users to play with invisible animals.
        if not page.locator('#menuScene').is_visible():
            assert not button.is_visible(), 'Invitation shown without the herd'
            assert not errors, errors
            report.append({'viewport':[width,height],'touch':touch,'hiddenWithHerd':True,'errors':errors})
            context.close()
            continue
        box=button.bounding_box();assert box and box['height']>=43.99, (width,height,box)
        assert box['x']>=0 and box['x']+box['width']<=width+1
        placement=hint.get_attribute('data-placement')
        if placement=='herd':
            invitation=hint.bounding_box(); card=page.locator('#menuCard').bounding_box()
            assert not (invitation['x']<card['x']+card['width'] and invitation['x']+invitation['width']>card['x'] and invitation['y']<card['y']+card['height'] and invitation['y']+invitation['height']>card['y']), 'Hint covers main controls'
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        button.click()
        page.evaluate('MenuScene.frame(state,.1,true)')
        assert page.evaluate("state.phase==='menu' && !document.getElementById('menuBanter').hidden"), 'Play button no longer starts a reaction'
        before=hint.get_attribute('style')
        page.evaluate('for(let i=0;i<60;i++)MenuScene.frame(state,1/60,false)')
        assert hint.get_attribute('style')==before, 'Hint chases the walking animals'
        assert not errors, errors
        report.append({'viewport':[width,height],'touch':touch,'placement':placement,'button':box,'hint':page.locator('#menuPlayHint').inner_text(),'buttonWorks':True,'errors':errors})
        context.close()
    browser.close()
(OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False))
