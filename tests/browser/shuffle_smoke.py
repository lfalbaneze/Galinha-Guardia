"""Real-browser smoke test for the independent Shuffle prototype and packaged files."""
from pathlib import Path
import json
import os
from playwright.sync_api import sync_playwright

BASE = os.environ.get('SHUFFLE_BASE', 'http://127.0.0.1:8765/dist/')
OUT = Path('.cache/shuffle-review')
OUT.mkdir(parents=True, exist_ok=True)
results = []
with sync_playwright() as p:
    browser = p.chromium.launch()
    for width, height, touch in [(1280, 900, False), (390, 844, True), (844, 390, True)]:
        context = browser.new_context(viewport={'width': width, 'height': height}, has_touch=touch, is_mobile=touch)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(BASE + 'shuffle/', wait_until='networkidle')
        page.wait_for_function('window.ShuffleDemo && ShuffleDemo.ready')
        page.evaluate("localStorage.setItem('shuffle-regression-unrelated', 'do-not-touch')")
        page.locator('#startRun').click()
        assert page.locator('[data-skill]').count() == 3
        page.locator('#reroll').click()
        assert page.locator('#reroll').is_disabled()
        assert page.locator('[data-skill]').count() == 3
        page.screenshot(path=str(OUT / f'cards-{width}.png'))
        chosen = page.locator('[data-skill]').first.get_attribute('data-skill')
        page.locator('[data-skill]').first.click()
        assert page.evaluate('ShuffleDemo.run.phase') == 'playing'
        assert page.evaluate('(id) => ShuffleDemo.run.skills[id]', chosen) == 1
        start_x = page.evaluate('ShuffleDemo.run.player.x')
        if touch:
            stick = page.locator('#joystick').bounding_box()
            assert stick and stick['width'] >= 60
            x, y = stick['x'] + stick['width'] * .8, stick['y'] + stick['height'] / 2
            cdp = context.new_cdp_session(page)
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y}]})
            page.wait_for_timeout(350)
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
            cdp.detach()
        else:
            page.keyboard.down('d')
            page.wait_for_timeout(300)
            page.keyboard.up('d')
        assert page.evaluate('ShuffleDemo.run.player.x') > start_x + 10
        page.locator('#dash').click()
        page.wait_for_function('ShuffleDemo.run.player.dashCooldown>0')
        page.locator('#pause').click()
        before = page.evaluate('JSON.stringify(ShuffleDemo.run.player)')
        page.wait_for_timeout(100)
        assert page.evaluate('JSON.stringify(ShuffleDemo.run.player)') == before
        page.locator('#resume').click()
        assert page.evaluate('!ShuffleDemo.run.paused')
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        for name in ['dash', 'corn', 'interact']:
            b = page.locator('#' + name).bounding_box()
            assert b and b['height'] >= 44
        page.screenshot(path=str(OUT / f'play-{width}.png'))
        page.reload(wait_until='networkidle')
        page.wait_for_function('window.ShuffleDemo && ShuffleDemo.ready')
        page.locator('#continueRun').click()
        assert page.evaluate('(id) => ShuffleDemo.run.skills[id]', chosen) == 1
        assert page.evaluate('ShuffleDemo.run.stage') == 0
        assert page.evaluate("localStorage.getItem('shuffle-regression-unrelated')") == 'do-not-touch'
        assert not errors, errors
        results.append({'viewport': [width, height], 'touch': touch, 'errors': errors, 'movement': True, 'pause': True, 'checkpoint': True})
        context.close()
    # Restoring a draft with corn has no player object until a card is chosen.
    context = browser.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
    page = context.new_page()
    draft_errors = []
    page.on('pageerror', lambda error: draft_errors.append(str(error)))
    page.goto(BASE + 'shuffle/', wait_until='networkidle')
    page.wait_for_function('window.ShuffleDemo && ShuffleDemo.ready')
    page.evaluate("""() => localStorage.setItem(ShuffleDemo.saveKey, JSON.stringify({version:1,seed:19,rng:19,stage:1,phase:'draft',skills:{corn:1},level:1,hp:3,choices:['boots','heart','call'],rerolls:1,elapsed:1}))""")
    page.reload(wait_until='networkidle')
    page.wait_for_function('window.ShuffleDemo && ShuffleDemo.ready')
    page.locator('#continueRun').click()
    assert page.locator('[data-skill]').count() == 3
    assert page.evaluate('ShuffleDemo.run.player === null')
    page.locator('[data-skill]').first.click()
    assert page.evaluate("ShuffleDemo.run.phase === 'playing' && ShuffleDemo.run.skills.corn === 1 && ShuffleDemo.run.level === 2")
    assert not draft_errors, draft_errors
    results.append({'restoredDraftWithCorn': True})
    context.close()
    # A valid boss-phase checkpoint is a fixture, not an injected victory.
    context = browser.new_context(viewport={'width': 1280, 'height': 900})
    page = context.new_page()
    page.goto(BASE + 'shuffle/', wait_until='networkidle')
    page.wait_for_function('window.ShuffleDemo && ShuffleDemo.ready')
    page.evaluate("""() => localStorage.setItem(ShuffleDemo.saveKey, JSON.stringify({version:1,seed:19,rng:19,stage:2,phase:'playing',skills:{boots:2,heart:1},level:3,hp:4,choices:[],rerolls:1,elapsed:1}))""")
    page.reload(wait_until='networkidle')
    page.wait_for_function('window.ShuffleDemo && ShuffleDemo.ready')
    page.locator('#continueRun').click()
    page.wait_for_function("ShuffleDemo.run.boss.mode==='warning'")
    assert page.locator('#bossHud').is_visible()
    page.screenshot(path=str(OUT / 'boss-warning.png'))
    page.wait_for_function("ShuffleDemo.run.boss.mode==='stunned'")
    page.keyboard.down('d')
    page.keyboard.press('Space')
    page.wait_for_function('Math.hypot(ShuffleDemo.run.player.x-ShuffleDemo.run.boss.x,ShuffleDemo.run.player.y-ShuffleDemo.run.boss.y)<ShuffleRun.stats(ShuffleDemo.run).reach+20', timeout=2500)
    page.keyboard.up('d')
    page.locator('#interact').click()
    page.wait_for_function('ShuffleDemo.run.boss.courage===2')
    results.append({'bossFixture': True, 'warning': True, 'counterViaButton': True})
    page.goto(BASE + 'index.html', wait_until='networkidle')
    page.locator('#shuffleModeLink').wait_for(state='visible')
    assert page.locator('#shuffleModeLink').get_attribute('href') == './shuffle/index.html'
    page.locator('#shuffleModeLink').click()
    page.wait_for_url('**/shuffle/index.html')
    page.wait_for_function('window.ShuffleDemo && ShuffleDemo.ready')
    results.append({'classicMenuEntry': True})
    context.close()
    page = browser.new_page()
    page.goto((Path('dist') / 'shuffle' / 'index.html').resolve().as_uri(), wait_until='networkidle')
    page.wait_for_function('window.ShuffleDemo && ShuffleDemo.ready')
    page.locator('#startRun').click()
    assert page.locator('[data-skill]').count() == 3
    results.append({'packagedFileProtocol': True})
    browser.close()
(OUT / 'results.json').write_text(json.dumps(results, indent=2), encoding='utf-8')
print(json.dumps(results))
