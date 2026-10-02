"""Production asset loading and base-game integration; attacks use positioned fixtures."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import os
from playwright.sync_api import sync_playwright
from game_ui import start_adventure

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'.cache/folklore-base-review';OUT.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='chrome')
        page=browser.new_page(viewport={'width':1280,'height':900})
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.add_init_script('window.requestAnimationFrame=()=>0')
        folder='dist/' if os.environ.get('FOLKLORE_DIST') else ''
        url=(ROOT/folder/'index.html').as_uri() if os.environ.get('FOLKLORE_FILE') else f'http://127.0.0.1:{server.server_port}/{folder}index.html'
        page.goto(url,wait_until='networkidle')
        start_adventure(page)
        page.wait_for_function('FolkloreSystem.ready',polling=50)
        # The normal bootstrap loads the art; only the common marten wakes automatically.
        page.evaluate('''()=>{
            resetGame(42);state.phase='playing';
            for(const a of state.entities.animals.slice(0,9))GameManager.rescue(state,a);
            updateGame(.05);
        }''')
        assert page.evaluate('state.entities.folklore.filter(e=>e.active).map(e=>e.species)')==['fuinha']
        for species in ['fuinha','mula-sem-cabeca','curupira','boitata','cuca']:
            page.evaluate('''species=>{
                resetGame(42);state.phase='playing';OBSTACLES=[];state.rescuedCount=10;
                const e=state.entities.folklore.find(e=>e.species===species),c=state.entities.chicken;
                Object.assign(e,{x:1000,y:800,home:{x:1000,y:800},active:species==='fuinha',mode:'patrol',timer:0,grace:0});
                Object.assign(c,{x:species==='fuinha'?1150:1070,y:800,hidden:false,invulnerable:0});
                state.entities.folklore=[e];camera.x=680;camera.y=550;
                FolkloreSystem.update(state,.05);GameUI.update(state);renderGame();
            }''',species)
            if species!='fuinha':
                assert not page.evaluate('state.entities.folklore[0].active')
                page.screenshot(path=str(OUT/f'{species}-seal.png'))
                page.keyboard.press('e')
                assert page.evaluate('state.entities.folklore[0].active')
                page.evaluate('''()=>{const e=state.entities.folklore[0];e.grace=0;e.timer=0;
                    state.entities.chicken.invulnerable=0;state.entities.chicken.x=1150;
                    FolkloreSystem.update(state,.05);GameUI.update(state);renderGame();}''')
            if species!='boitata':assert page.evaluate('state.entities.folklore[0].mode')=='warning'
            page.screenshot(path=str(OUT/f'{species}-warning.png'))
            page.evaluate('for(let i=0;i<30;i++)FolkloreSystem.update(state,.05);renderGame()')
            page.screenshot(path=str(OUT/f'{species}-attack.png'))
            if species!='fuinha':
                before=page.evaluate('state.score')
                for remaining in [2,1,0]:
                    page.evaluate("()=>{const boss=state.entities.folklore[0];boss.mode='rest';boss.timer=3;state.entities.chicken.x=boss.x+60;state.entities.chicken.y=boss.y;GameUI.update(state);renderGame()}")
                    if remaining==2:page.screenshot(path=str(OUT/f'{species}-opening.png'))
                    page.keyboard.press('e')
                    assert page.evaluate('state.entities.folklore[0].courage')==remaining
                assert page.evaluate('state.score')==before+250
                assert page.evaluate('state.entities.folklore[0].defeated&&!state.entities.folklore[0].active')
        page.evaluate('''()=>{
            resetGame(42);state.phase='playing';
            for(const a of state.entities.animals.slice(0,9))GameManager.rescue(state,a);
            FolkloreSystem.update(state,.05);
            const boss=state.entities.folklore.find(e=>e.species==='cuca');
            boss.courage=0;boss.defeated=true;boss.discovered=true;GameManager.save(state);
        }''')
        saved=page.evaluate('JSON.stringify(FolkloreSystem.snapshot(state))')
        page.reload(wait_until='networkidle')
        page.wait_for_function('FolkloreSystem.ready',polling=50)
        assert page.evaluate('JSON.stringify(FolkloreSystem.snapshot(state))')==saved
        assert page.evaluate('state.folkloreThreats.length')==0
        assert page.evaluate('state.entities.folklore.every(e=>e.grace>=2)')
        assert not errors,errors
        mobile=browser.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
        mobile.on('pageerror',lambda e:errors.append(str(e)))
        mobile.add_init_script('window.requestAnimationFrame=()=>0')
        mobile.goto(url,wait_until='networkidle');start_adventure(mobile)
        mobile.wait_for_function('FolkloreSystem.ready',polling=50)
        mobile.evaluate('''()=>{state.phase='playing';OBSTACLES=[];state.rescuedCount=9;
            const e=state.entities.folklore.find(e=>e.species==='cuca');state.entities.folklore=[e];
            Object.assign(e,{x:1000,y:800,home:{x:1000,y:800},active:false});
            Object.assign(state.entities.chicken,{x:1070,y:800,hidden:false});camera.x=880;camera.y=500;
            FolkloreSystem.update(state,.01);GameUI.update(state);renderGame();}''')
        button=mobile.locator('#touchInteract')
        assert button.is_enabled() and button.inner_text()=='Despertar'
        mobile.screenshot(path=str(OUT/'cuca-mobile-seal.png'))
        button.tap();assert mobile.evaluate('state.entities.folklore[0].active')
        mobile.evaluate("state.entities.folklore[0].mode='rest';GameUI.update(state);renderGame()")
        assert button.is_enabled() and button.inner_text()=='Contra-atacar'
        mobile.screenshot(path=str(OUT/'cuca-mobile-opening.png'))
        button.tap();assert mobile.evaluate('state.entities.folklore[0].courage')==2
        assert not errors,errors
        browser.close()
    print('Only the marten spawns normally; four secret seals, keyboard awakening, attacks, three counters, rewards and save/reload pass; no browser errors.')
finally:
    server.shutdown();server.server_close()
