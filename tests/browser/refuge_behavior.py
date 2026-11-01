"""Keep rescued residents separated and calm in the actual published package."""
from pathlib import Path
import base64
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
from game_ui import READY

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '.cache/refuge-behavior'
OUT.mkdir(parents=True, exist_ok=True)
assert (ROOT / 'systems/rescue-system.js').read_bytes() == (ROOT / 'dist/systems/rescue-system.js').read_bytes()
SETUP = """({version,seed}) => {
    difficultySelect.value='easy';resetGame(seed,version);
    state.entities.foxes=[];state.entities.owls=[];state.entities.folklore=[];
    Object.assign(state.entities.wolf,{x:2400,y:1500,huntUnlockTimer:999});
    Object.assign(state.entities.chicken,{x:500,y:600});
    for(const a of state.entities.animals.slice(0,-1))GameManager.rescue(state,a);
    RescueSystem.update(state,0);
    let randomSeed=seed;Math.random=()=>{randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0;return randomSeed/4294967296;};
}"""
reports = []
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome')
    page = browser.new_page(viewport={'width':1280,'height':900})
    page.add_init_script('window.requestAnimationFrame=()=>0;')
    page.goto((ROOT / 'dist/index.html').as_uri(), wait_until='load')
    page.wait_for_function(READY, polling=50)
    for version in [1,7]:
        for hz in [30,60,144]:
            page.evaluate(SETUP, {'version':version,'seed':814237})
            result = page.evaluate("""hz => {
                const residents=state.entities.animals.filter(a=>a.rescued),travel=residents.map(()=>0);
                const initialMinimum=Math.min(...residents.flatMap((a,i)=>residents.slice(i+1).map(b=>RescueSystem.refugeSpace(a,a,b))));
                let minimum=Infinity,idleTurns=0,maxSpeed=0,reversals=0,clear=true;
                const score=state.score;
                for(let frame=0;frame<hz*20;frame++){
                    const before=residents.map(a=>({x:a.x,y:a.y,direction:a.direction,moving:a.moving,vx:a.vx,vy:a.vy}));
                    RescueSystem.update(state,1/hz);
                    for(const [i,a] of residents.entries()){
                        const old=before[i];travel[i]+=distance(a,old);
                        maxSpeed=Math.max(maxSpeed,Math.hypot(a.vx,a.vy));
                        if(!old.moving&&!a.moving&&a.direction!==old.direction)idleTurns++;
                        if(old.moving&&a.moving&&old.vx*a.vx+old.vy*a.vy<-.01)reversals++;
                        clear&&=FarmRefuge.contains(a,15)&&WildlifeRules.clear(a,a,a.hitbox);
                        for(const b of residents.slice(i+1))minimum=Math.min(minimum,RescueSystem.refugeSpace(a,a,b));
                    }
                }
                renderGame();
                return {hz,initialMinimum,minimum,idleTurns,maxSpeed,reversals,clear,travel,scorePreserved:score===state.score,
                    phase:state.phase,positions:residents.map(a=>({species:a.species,x:a.x,y:a.y}))};
            }""", hz)
            assert result['phase'] == 'playing', result
            assert result['minimum'] >= min(1,result['initialMinimum'])-.001, result
            assert result['idleTurns'] == 0, result
            assert result['maxSpeed'] <= 32, result
            assert result['clear'] and result['scorePreserved'], result
            assert sum(d>2 for d in result['travel']) >= len(result['travel'])-2, result
            assert result['reversals'] <= len(result['travel'])*2, result
            page.screenshot(path=str(OUT / f'yard-v{version}-{hz}hz.png'))
            reports.append({'version':version,**result})
            print(json.dumps(reports[-1]), flush=True)
    context=browser.new_context(viewport={'width':1280,'height':900})
    live=context.new_page()
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'dist')))
    Thread(target=server.serve_forever,daemon=True).start()
    live.goto(f'http://127.0.0.1:{server.server_port}/index.html',wait_until='load')
    live.wait_for_function(READY,polling=50)
    live.evaluate(SETUP,{'version':7,'seed':814237})
    live.evaluate("""() => {
        const chunks=[];window.penRecorder=new MediaRecorder(gameCanvas.captureStream(30));
        window.penRecording=new Promise(resolve=>{
            penRecorder.ondataavailable=e=>chunks.push(e.data);
            penRecorder.onstop=()=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(new Blob(chunks,{type:'video/webm'}));};
        });
        penRecorder.start();
        window.liveTrace=[];const original=RescueSystem.update;
        RescueSystem.update=(game,dt)=>{
            original(game,dt);
            liveTrace.push({phase:game.phase,time:game.elapsed,
                residents:game.entities.animals.filter(a=>a.rescued).map(a=>({x:a.x,y:a.y,moving:a.moving,direction:a.direction}))});
        };
    }""")
    live.wait_for_timeout(7000)
    assert live.evaluate("liveTrace.length>100&&liveTrace.every(f=>f.phase==='playing')")
    live.screenshot(path=str(OUT/'live-yard.png'))
    recording=live.evaluate('async()=>{penRecorder.stop();return await penRecording;}')
    (OUT/'curral-corrigido.webm').write_bytes(base64.b64decode(recording))
    context.close()
    server.shutdown()
    browser.close()
(OUT / 'report.json').write_text(json.dumps(reports,indent=2),encoding='utf-8')
