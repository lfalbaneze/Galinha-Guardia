"""Browser validation of the HUD and goose sprite (Playwright 1.57.0)."""
import json, os, threading
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from playwright.sync_api import sync_playwright
root = Path.cwd()
output = Path(os.environ.get('HUD_REVIEW_DIR', '/tmp/hud-review'))
output.mkdir(parents=True, exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(root)))
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}/index.html'
results = {'checks': [], 'viewports': [], 'errors': [], 'failed_requests': []}
def checked(name): results['checks'].append(name)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width':1440,'height':1050})
    page = context.new_page()
    page.on('pageerror', lambda e: results['errors'].append(str(e)))
    page.on('requestfailed', lambda r: results['failed_requests'].append(r.url))
    page.goto(url, wait_until='networkidle')
    page.wait_for_function('CharacterArt.ready && GooseArt.ready')
    assert page.locator('#startBtn').is_enabled()
    page.locator('#startBtn').click()
    page.wait_for_function('state.phase === "playing"')
    before=page.evaluate('state.entities.chicken.x')
    page.keyboard.down('d');page.wait_for_timeout(180);page.keyboard.up('d')
    assert page.evaluate('state.entities.chicken.x') != before
    checked('PNG decoded; start screen and keyboard movement work')
    assert page.locator('.play-header').bounding_box()['height'] <= 80
    assert page.locator('#farmHud').is_visible()
    assert not page.locator('.wardrobe').is_visible()
    checked('compact gameplay header and pause-only settings')
    page.evaluate('''() => {
        for(const a of state.entities.animals.slice(0,3))GameManager.rescue(state,a);
        for(const c of state.entities.chicks.slice(0,2)){c.discovered=true;GameManager.rescue(state,c);}
        state.lives=2;GameManager.save(state);GameUI.update(state);
    }''')
    page.reload(wait_until='networkidle');page.wait_for_function('CharacterArt.ready && GooseArt.ready')
    page.locator('#continueBtn').click()
    assert page.evaluate('state.rescuedCount') == 3
    assert page.evaluate('state.rescuedChicks') == 2
    assert page.locator('#lifeHeart3').get_attribute('data-full') == 'false'
    page.locator('#pauseBtn').click()
    assert page.evaluate('state.phase')=='menu'
    page.locator('#tab-audio').click();assert page.locator('#panel-audio').is_visible()
    page.locator('#tab-outfit').click();assert page.locator('#panel-outfit').is_visible()
    page.screenshot(path=str(output/'menu-preserved.png'), full_page=True)
    page.locator('#continueBtn').click();assert page.evaluate('state.phase')=='playing'
    checked('progress reload, heart state, pause, audio and outfit tabs, resume')
    page.evaluate('window.requestAnimationFrame=()=>0');page.wait_for_timeout(100)
    page.evaluate('''() => {
        resetGame(42);state.entities.wolf.huntUnlockTimer=999;
        for(const a of state.entities.animals.slice(0,3))GameManager.rescue(state,a);
        for(const c of state.entities.chicks.slice(0,2)){c.discovered=true;GameManager.rescue(state,c);}
        state.lives=2;state.entities.chicken.stamina=.7;
        const g=state.entities.goose,c=state.entities.chicken;
        Object.assign(g,{x:g.home.x,y:g.home.y,direction:'right',mode:'warning',notice:2,target:{x:g.home.x+95,y:g.home.y+35}});
        Object.assign(c,{x:g.home.x+95,y:g.home.y+35,hidden:false,direction:'left'});
        camera.x=clamp(g.x-370,0,WORLD.width-900);camera.y=clamp(g.y-230,0,WORLD.height-520);
        camera.shakeX=0;camera.shakeY=0;
        MapManager.update(state,0);GameUI.update(state);InterfaceMotion.frame(state,1);refreshHud();
        state.skinNotice=null;state.secretNotice=null;state.rescueNotice=null;state.mapTransition.time=0;
        renderGame();
    }''')
    page.wait_for_timeout(600)
    assert page.locator('#lifeHeart1').get_attribute('data-full')=='true'
    assert page.locator('#lifeHeart3').get_attribute('data-full')=='false'
    assert page.locator('#missionProgress').evaluate('(e)=>e.value') == 3
    for width,height in [(1440,1050),(1024,900),(768,1024),(390,844),(320,720)]:
        page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(150)
        result=page.evaluate('''() => ({width:innerWidth,scroll:document.documentElement.scrollWidth,
          overflowing:[...document.querySelectorAll('.run-card')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.className),
          idsUnique:new Set([...document.querySelectorAll('[id]')].map(e=>e.id)).size===document.querySelectorAll('[id]').length})''')
        assert result['scroll'] <= width
        assert not result['overflowing']
        assert result['idsUnique']
        results['viewports'].append(result)
        page.screenshot(path=str(output/f'gameplay-{width}.png'),full_page=True)
    checked('HUD counters and layout at 320, 390, 768, 1024 and 1440 pixels')
    page.set_viewport_size({'width':1440,'height':1050})
    page.evaluate("state.entities.wolf.mode='chase';state.lives=1;GameUI.update(state);refreshHud();renderGame()")
    page.wait_for_timeout(500)
    assert page.locator('#livesCard').get_attribute('data-critical')=='true'
    assert page.locator('#threatIndicator').get_attribute('data-level')=='danger'
    page.screenshot(path=str(output/'gameplay-danger.png'),full_page=True)
    page.evaluate("state.entities.chicken.hidden=true;state.entities.wolf.exposedCover=null;GameUI.update(state)")
    assert page.locator('#threatIndicator').get_attribute('data-level')=='safe'
    checked('critical life, danger and safe-state HUD variants')
    failure=context.new_page()
    failure.route('**/assets/sprites/sources/goose.png', lambda route: route.abort())
    failure.goto(url,wait_until='networkidle');failure.wait_for_function('GooseArt.errors.length === 1')
    assert failure.locator('#startBtn').is_disabled()
    assert failure.locator('#spriteStatus').is_visible()
    failure.unroute('**/assets/sprites/sources/goose.png')
    assert failure.evaluate('async () => { const ok=await GooseArt.load();GameUI.update(state);return ok; }')
    assert failure.locator('#startBtn').is_enabled()
    failure.close();checked('missing sprite blocks gameplay and can be retried')
    offline=browser.new_context(viewport={'width':1024,'height':900},reduced_motion='reduce')
    off=offline.new_page();off.on('pageerror',lambda e:results['errors'].append(str(e)))
    off.goto((root/'index.html').as_uri(),wait_until='load');off.wait_for_function('CharacterArt.ready && GooseArt.ready')
    off.locator('#startBtn').click()
    assert off.evaluate('state.phase')=='playing'
    assert off.evaluate("GooseArt.frameFor({...state.entities.goose,moving:true,anim:1}).column")==0
    checked('file:// startup with local PNG and reduced motion')
    assert not results['errors'],results['errors']
    assert not results['failed_requests'],results['failed_requests']
    browser.close()
server.shutdown()
(output/'browser-validation.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print(json.dumps(results,ensure_ascii=False))
