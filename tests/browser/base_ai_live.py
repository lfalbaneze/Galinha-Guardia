"""Live RAF, keyboard dodges and pause: no manual stepping of the simulation."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import base64
import json
import os
from playwright.sync_api import sync_playwright
from game_ui import start_adventure

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '.cache/base-ai-live'
OUT.mkdir(parents=True, exist_ok=True)


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
reports = []
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel=os.environ.get('BROWSER_CHANNEL', 'chrome'))
        for width, height in [(1280, 900), (390, 844)]:
            page = browser.new_page(viewport={'width': width, 'height': height})
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(f'http://127.0.0.1:{server.server_port}/index.html', wait_until='networkidle')
            start_adventure(page)
            page.evaluate('''() => {
                resetGame(814237);state.phase='playing';OBSTACLES=[];
                const w=state.entities.wolf,c=state.entities.chicken;
                state.entities.foxes=[];state.entities.owls=[];state.entities.folklore=[];
                Object.assign(w,{x:1000,y:800,heading:0,mode:'chase',awareness:1,
                    huntUnlockTimer:0,interceptCooldown:0,pursuitEffort:1.9});
                Object.assign(c,{x:1230,y:800,hidden:false,invulnerable:0});
                window.liveTrace=[];
                const original=WolfAI.update;
                WolfAI.update=(s,dt)=>{
                    original(s,dt);
                    const wolf=s.entities.wolf;
                    if(liveTrace.length<1500)liveTrace.push({time:s.elapsed,x:wolf.x,y:wolf.y,
                        phase:wolf.interceptPhase|| (wolf.pursuitRest>0?'rest':'pursuit'),
                        target:wolf.interceptTarget?{...wolf.interceptTarget}:null,lives:s.lives});
                };
                const chunks=[],stream=document.querySelector('#gameCanvas').captureStream(24);
                window.liveRecorder=new MediaRecorder(stream,{mimeType:'video/webm'});
                liveRecorder.ondataavailable=event=>chunks.push(event.data);
                window.liveRecording=new Promise(resolve=>{
                    liveRecorder.onstop=()=>{
                        stream.getTracks().forEach(track=>track.stop());
                        const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);
                        reader.readAsDataURL(new Blob(chunks,{type:'video/webm'}));
                    };
                });
                liveRecorder.start();GameUI.update(state);
            }''')
            page.locator('#gameCanvas').focus()
            page.keyboard.down('s')
            page.wait_for_function("state.entities.wolf.interceptPhase==='warning'", timeout=15000)
            page.screenshot(path=str(OUT / f'{width}-warning.png'))
            page.wait_for_function("state.entities.wolf.interceptPhase==='charge'", timeout=15000)
            page.keyboard.up('s')
            page.keyboard.down('w')
            page.screenshot(path=str(OUT / f'{width}-charge.png'))
            page.wait_for_function('state.entities.wolf.pursuitRest>0', timeout=15000)
            page.keyboard.up('w')
            page.screenshot(path=str(OUT / f'{width}-recovery.png'))
            trace = page.evaluate('liveTrace')
            warning = [frame for frame in trace if frame['phase'] == 'warning']
            charge = [frame for frame in trace if frame['phase'] == 'charge']
            assert warning and charge and trace[-1]['phase'] == 'rest', trace
            assert all(frame['lives'] == 3 for frame in trace), 'Live dodge took damage'
            assert len({json.dumps(frame['target'], sort_keys=True) for frame in warning}) > 1, 'Preparation did not track the runner'
            assert len({json.dumps(frame['target'], sort_keys=True) for frame in charge}) == 1, 'Charge steered after launch'
            assert len({(frame['x'], frame['y']) for frame in warning}) == 1, 'Moved during warning'
            assert abs(charge[-1]['x'] - charge[0]['x']) > 20, 'Charge did not advance'
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            page.locator('#pauseBtn').click()
            before = page.evaluate('JSON.stringify([state.elapsed,state.entities.wolf,state.entities.chicken])')
            page.wait_for_timeout(750)
            assert page.evaluate('JSON.stringify([state.elapsed,state.entities.wolf,state.entities.chicken])') == before
            page.locator('#continueBtn').click()
            page.wait_for_function("state.phase==='playing'")
            page.evaluate('liveRecorder.stop()')
            video = page.evaluate('liveRecording')
            (OUT / f'{width}-dodge.webm').write_bytes(base64.b64decode(video))
            assert not errors, errors
            reports.append({'width': width, 'frames': len(trace), 'lives': trace[-1]['lives'],
                            'phases': list(dict.fromkeys(frame['phase'] for frame in trace)), 'errors': errors})
            page.close()
        browser.close()
finally:
    server.shutdown()
    server.server_close()
    (OUT / 'report.json').write_text(json.dumps(reports, indent=2), encoding='utf-8')
print(json.dumps(reports))
