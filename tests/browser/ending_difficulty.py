"""Verify the actual itch.io package, including saved victory replays."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
from game_ui import READY

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '.cache/ending-difficulty'
OUT.mkdir(parents=True, exist_ok=True)
SCRIPTS = ['game.js', 'systems/end-game-sequence.js', 'systems/rescue-system.js',
           'systems/goose-system.js', 'systems/fox-system.js', 'systems/folklore-system.js']
for script in SCRIPTS:
    assert (ROOT / script).read_bytes() == (ROOT / 'dist' / script).read_bytes(), script + ' is stale in dist'

reports = []
with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome')
    for width, height in [(1280, 900), (390, 844)]:
        for mode, expected in [('easy', 'sniff'), ('normal', 'wrongstep'), ('hard', 'cleanup'), ('hardcore', 'cloud')]:
            page = browser.new_page(viewport={'width': width, 'height': height})
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.add_init_script('window.requestAnimationFrame = () => 0;')
            page.goto((ROOT / 'dist/index.html').as_uri(), wait_until='load')
            page.wait_for_function(READY, polling=50)
            page.evaluate("""mode => {
                difficultySelect.value=mode;resetGame(814237);
                for(const a of state.entities.chicks){a.discovered=true;GameManager.rescue(state,a);}
                for(const a of state.entities.animals)GameManager.rescue(state,a);
                if(!GameManager.win(state))throw Error('victory did not start');
                for(let i=0;i<160;i++)updateGame(.05);
                renderGame();
            }""", mode)
            snapshot = page.evaluate("""() => ({
                mode:state.difficultyKey,stage:state.cutscene.stage,cloud:state.cutscene.cloud,
                score:state.score,time:state.cutscene.time
            })""")
            assert snapshot['stage'] == expected, snapshot
            assert snapshot['cloud'] == (mode == 'hardcore'), snapshot
            page.screenshot(path=str(OUT / f'{mode}-{width}.png'))
            page.evaluate('GameUI.showMenu(state);updateGame(2);')
            assert page.evaluate('state.cutscene.time') == snapshot['time'], 'menu advanced the ending'
            page.evaluate("""() => {
                GameUI.resume();
                for(let i=0;i<240 && state.phase==='win_cutscene';i++)updateGame(.05);
                renderGame();
            }""")
            assert page.evaluate('state.phase') == 'won'
            assert page.evaluate('state.score') == snapshot['score'], 'ending changed the victory score'
            page.reload(wait_until='load')
            page.wait_for_function(READY, polling=50)
            page.evaluate("""() => {
                GameUI.resume();
                for(let i=0;i<160;i++)updateGame(.05);
                renderGame();
            }""")
            assert page.evaluate('state.cutscene.stage') == expected, 'saved victory replay used the wrong ending'
            assert not errors, errors
            reports.append({**snapshot, 'width': width, 'pause': True, 'savedReplay': True, 'errors': errors})
            print(json.dumps(reports[-1]), flush=True)
            page.close()
    browser.close()
(OUT / 'report.json').write_text(json.dumps(reports, indent=2), encoding='utf-8')
