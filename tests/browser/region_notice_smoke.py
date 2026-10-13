"""The transient region title must leave the complete danger panel readable."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
from game_ui import start_adventure

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '.cache/region-notice-review'
OUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel=os.environ.get('BROWSER_CHANNEL', 'chrome'))
    try:
        page = browser.new_page(viewport={'width': 390, 'height': 844})
        page.add_init_script('window.requestAnimationFrame=()=>0')
        page.goto((ROOT / 'index.html').as_uri(), wait_until='networkidle')
        start_adventure(page)
        for width in [320, 390, 600, 740, 1280]:
            page.set_viewport_size({'width': width, 'height': 844})
            for phase in ['warning', 'charge']:
                page.evaluate("""phase => {
                    state.elapsed=30;state.currentMap='caminhos';
                    state.mapTransition={name:'Caminhos da fazenda',time:3};
                    Object.assign(state.entities.wolf,{mode:'chase',interceptPhase:phase,pursuitRest:0});
                    GameUI.update(state);renderGame();
                    document.getAnimations().forEach(a=>a.finish());
                }""", phase)
                assert page.locator('#regionNotice').is_visible()
                assert page.locator('#threatIndicator').is_visible()
                assert page.evaluate("""() => {
                    const title=document.querySelector('#regionNotice'),danger=document.querySelector('#threatIndicator');
                    const a=title.getBoundingClientRect(),b=danger.getBoundingClientRect();
                    return (a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom)&&
                        a.left>=0&&a.right<=innerWidth&&title.scrollWidth<=title.clientWidth&&
                        danger.scrollWidth<=danger.clientWidth;
                }"""), f'{width}/{phase}: title overlaps or clips the danger panel'
                if width == 390 and phase == 'charge':
                    page.screenshot(path=str(OUT / '390-charge.png'))
        print('Region title and both danger warnings remain visible without overlap at five widths.')
    finally:
        browser.close()
