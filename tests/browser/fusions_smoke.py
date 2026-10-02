"""Real recipe UI, keyboard/mobile pause flow and rendered fusion combat."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
import os
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '.cache' / 'fusion-review'
OUT.mkdir(parents=True, exist_ok=True)

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel=os.environ.get('BROWSER_CHANNEL', 'chrome'))
        results = []
        folder = 'dist/' if os.environ.get('FUSIONS_DIST') else ''
        for width, height, reduced in [(1280,900,False),(390,844,False),(844,390,True)]:
            context = browser.new_context(viewport={'width':width,'height':height},has_touch=width!=1280,
                                          reduced_motion='reduce' if reduced else 'no-preference')
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            url = (ROOT/'dist/shuffle/index.html').as_uri() if os.environ.get('FUSIONS_FILE') else f'http://127.0.0.1:{server.server_port}/{folder}shuffle/index.html'
            page.goto(url+'#survival',wait_until='networkidle')
            page.wait_for_function('ShuffleDemo.ready && ShuffleDemo.run?.mode==="survival"')
            page.locator('#fusionBook').click()
            assert page.locator('[data-craft]:disabled').count() == 8
            time = page.evaluate('ShuffleDemo.run.elapsed')
            page.wait_for_timeout(100)
            assert page.evaluate('ShuffleDemo.run.elapsed') == time
            page.screenshot(path=str(OUT/f'book-{width}.png'))
            page.keyboard.press('Escape')
            assert not page.evaluate('ShuffleDemo.run.paused')
            for id in page.evaluate('Object.keys(ShuffleSurvival.FUSIONS)'):
                page.evaluate('''id=>{const r=ShuffleDemo.run;Object.assign(r,ShuffleSurvival.newRun(614));
                    r.obstacles=[];r.layout.obstacles=[];r.pickups=[];r.spawnTimer=999;r.heroCooldown=999;r.powers={};
                    Object.assign(r.player,{x:560,y:360,invulnerable:999});
                    for(const item of ShuffleSurvival.FUSIONS[id].items)r.powers[item]=3;
                    r.enemies=Array.from({length:8},(_,i)=>({species:'fox',x:560+Math.cos(i*Math.PI/4)*130,
                        y:360+Math.sin(i*Math.PI/4)*130,r:18,speed:0,health:9999,traveled:0,moving:false,
                        route:[],routeTimer:0,routeTarget:null}));}''',id)
                page.wait_for_function('document.querySelector("#fusionBook").textContent.includes("(1)")')
                page.locator('#fusionBook').click()
                assert page.locator('[data-craft]:enabled').count() == 1
                button = page.locator(f'[data-craft="{id}"]')
                button.scroll_into_view_if_needed()
                if id == 'solar': page.screenshot(path=str(OUT/f'ready-{width}.png'))
                button.click()
                assert page.evaluate('ShuffleDemo.run.fusions') == [id]
                assert not page.evaluate('ShuffleDemo.run.paused')
                page.locator('#powerHud .fused-power').wait_for(state='visible')
                assert page.evaluate('document.activeElement.id') == 'game'
                page.wait_for_timeout(150)
                page.screenshot(path=str(OUT/f'{id}-{width}-cast.png'))
                page.wait_for_timeout(650)
                page.screenshot(path=str(OUT/f'{id}-{width}-impact.png'))
                assert page.evaluate('ShuffleDemo.run.enemies.some(e=>e.health<9999)'),id
                page.locator('#fusionBook').click()
                assert page.locator(f'[data-craft="{id}"]').is_disabled()
                page.locator('#closeFusions').click()
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'horizontal overflow'
            assert not errors,errors
            results.append({'width':width,'reduced':reduced,'eightRecipes':True,'craft':True,'combat':True,'errors':errors})
            context.close()
        browser.close()
        print(json.dumps(results))
finally:
    server.shutdown();server.server_close()
