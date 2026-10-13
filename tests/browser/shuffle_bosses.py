"""Real-time boss warning, attack, dodge and rendering fixtures; not a campaign playthrough."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import base64, json, os
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'.cache/boss-pattern-review';OUT.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
CASES=[('mula-sem-cabeca',0,'fire-fan'),('mula-sem-cabeca',1,'hoof-ring'),('mula-sem-cabeca',2,'fire-gallop'),
    ('goose',0,'gust'),('wolf',0,'howl'),('wolf',1,'pounce'),('fox',0,'claw'),('fox',1,'pounce'),('amanda',1,'pounce'),('fuinha',0,'dirt'),('curupira',0,'roots'),
    ('boitata',0,'fire-coil'),('boitata',1,'fire-fan'),('cuca',0,'spell-fan'),('cuca',1,'brew')]
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='chrome',args=['--allow-file-access-from-files'])
        folder='dist/' if os.environ.get('CHECK_DIST') else ''
        transport='file' if os.environ.get('BOSSES_FILE') else 'http'
        tag=f'{folder.replace("/","") or "source"}-{transport}'
        results=[]
        for width,height,reduced in [(1280,900,False),(390,844,False),(844,390,True)]:
            page=browser.new_page(viewport={'width':width,'height':height},has_touch=width<1000,
                reduced_motion='reduce' if reduced else 'no-preference')
            errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            url=(ROOT/folder/'shuffle/index.html').as_uri() if transport=='file' else f'http://127.0.0.1:{server.server_port}/{folder}shuffle/index.html'
            page.goto(url+'#survival',wait_until='networkidle');page.wait_for_function('ShuffleDemo.ready && ShuffleDemo.run?.mode==="survival"')
            page.evaluate('''()=>{
                window.warningOrder=[];let bodies=0;
                const draw=CanvasRenderingContext2D.prototype.drawImage,fill=CanvasRenderingContext2D.prototype.fillText;
                CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
                    if(this.canvas.id==='game'){
                        if(image instanceof HTMLCanvasElement&&image.width===ShuffleRun.WIDTH&&image.height===ShuffleRun.HEIGHT)bodies=0;
                        if(image.src?.includes('pixellab-108/runtime/'))bodies++;
                    }
                    return draw.call(this,image,...args);
                };
                CanvasRenderingContext2D.prototype.fillText=function(text,...args){
                    if(this.canvas.id==='game'&&text.includes('BOTE'))warningOrder.push(bodies>=2);
                    return fill.call(this,text,...args);
                };
            }''')
            if transport=='http':
                page.evaluate('''()=>{window.chunks=[];window.stream=document.getElementById('game').captureStream(30);
                    window.recorder=new MediaRecorder(stream,{mimeType:'video/webm'});
                    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.start();}''')
            observed=[]
            for species,step,attack in CASES[:3] if reduced else CASES:
                page.evaluate('''({species,step})=>{const r=ShuffleDemo.run;Object.assign(r,ShuffleSurvival.newRun(614));
                    Object.assign(r,{powers:{},pickups:[],spawnTimer:999,itemTimer:999,heroCooldown:999,noticeTime:0});
                    Object.assign(r.player,{x:560,y:360,invulnerable:0});
                    const t=ShuffleSurvival.ENEMIES[species];
                    r.enemies=[{x:740,y:360,species,r:t.r,health:10000,maxHealth:10000,
                        speed:t.speed,baseSpeed:t.speed,dx:-1,dy:0,traveled:0,moving:false,age:0,side:1,
                        mode:'hunt',timer:0,trailTimer:0,attackStep:step,route:[],routeTimer:0,routeTarget:null,
                        isBoss:true,isSecretBoss:ShuffleSurvival.SECRET_BOSSES.some(b=>b.species===species),name:t.name}];
                }''',{'species':species,'step':step})
                page.wait_for_function('attack=>ShuffleDemo.run.enemies.find(e=>e.isBoss)?.attack===attack',arg=attack)
                page.wait_for_timeout(120)
                assert page.evaluate('ShuffleDemo.run.enemies.find(e=>e.isBoss).mode')=='warning'
                page.screenshot(path=str(OUT/f'{tag}-{width}-{species}-{attack}-warning.png'))
                if attack=='pounce':page.wait_for_function('ShuffleDemo.run.enemies.find(e=>e.isBoss)?.timer<=.12')
                if attack in ['fire-gallop','pounce']:page.keyboard.down('KeyS')
                page.wait_for_function('ShuffleDemo.run.enemies.find(e=>e.isBoss)?.mode!=="warning"')
                page.wait_for_timeout(480 if attack in ['fire-gallop','pounce'] else 230)
                page.keyboard.up('KeyS')
                details=page.evaluate('''()=>{const r=ShuffleDemo.run,e=r.enemies.find(e=>e.isBoss);return {
                    mode:e.mode,attack:e.attack,health:r.hp,traveled:e.traveled,
                    shots:r.hexes.map(h=>h.kind),ground:r.hazards.map(h=>h.kind),count:r.enemies.length};}''')
                if attack in ['fire-fan','spell-fan','gust','dirt']:
                    kind={'fire-fan':'fire','spell-fan':'spell'}.get(attack,attack)
                    assert kind in details['shots'],(width,attack,details)
                if attack in ['hoof-ring','fire-gallop']:assert 'hoof' in details['ground'],details
                if attack=='fire-gallop':assert details['health']==5 and details['traveled']>70,details
                if attack=='pounce':
                    assert details['health']==5 and details['traveled']>70 and not details['ground'],details
                    assert page.evaluate('warningOrder.length>0 && warningOrder.every(Boolean)'), 'Warning drawn below depth-sorted bodies'
                if attack=='howl':assert details['count']==3,details
                if attack=='roots':assert details['ground'].count('roots')==3,details
                if attack=='brew':assert 'poison' in details['ground'],details
                if attack=='fire-coil':assert 4<=details['ground'].count('fire')<=8,details # Solid scenery can occupy a marked point.
                page.screenshot(path=str(OUT/f'{tag}-{width}-{species}-{attack}-active.png'))
                observed.append(attack)
                if attack=='fire-gallop' and transport=='http':
                    encoded=page.evaluate('''()=>new Promise(resolve=>{recorder.onstop=async()=>{
                        const bytes=new Uint8Array(await new Blob(chunks,{type:'video/webm'}).arrayBuffer());let s='';
                        for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.slice(i,i+32768));
                        stream.getTracks().forEach(t=>t.stop());resolve(btoa(s));};recorder.stop();})''')
                    (OUT/f'{tag}-{width}-mula.webm').write_bytes(base64.b64decode(encoded))
            dodges=[]
            if not reduced:
                for species in ['fox','wolf','fuinha','amanda','crow']:
                    for turn in [False,True]:
                        page.evaluate('''species=>{const r=ShuffleDemo.run;Object.assign(r,ShuffleSurvival.newRun(614));
                            r.obstacles=[];r.layout.obstacles=[];
                            Object.assign(r,{powers:{},pickups:[],spawnTimer:999,itemTimer:999,heroCooldown:999});
                            Object.assign(r.player,{x:560,y:360,invulnerable:0});const t=ShuffleSurvival.ENEMIES[species];
                            r.enemies=[{x:615,y:360,species,r:t.r,health:100,maxHealth:100,speed:t.speed,baseSpeed:t.speed,
                                dx:-1,dy:0,traveled:0,moving:false,age:0,side:1,mode:'hunt',timer:0,trailTimer:0,
                                route:[],routeTimer:0,routeTarget:null,name:t.name}];
                        }''',species)
                        page.keyboard.down('KeyS')
                        page.wait_for_function('ShuffleDemo.run.enemies[0].mode==="charge"')
                        if turn:
                            page.keyboard.up('KeyS');page.keyboard.down('KeyW')
                        page.wait_for_function('ShuffleDemo.run.enemies[0].mode==="recover"')
                        page.keyboard.up('KeyW' if turn else 'KeyS')
                        hp=page.evaluate('ShuffleDemo.run.hp')
                        assert hp==(5 if turn else 4),(width,species,turn,hp)
                        dodges.append({'species':species,'late_turn':turn,'hp':hp})
            page.locator('#pause').click();snapshot=page.evaluate('JSON.stringify(ShuffleDemo.run)')
            page.wait_for_timeout(120);assert page.evaluate('JSON.stringify(ShuffleDemo.run)')==snapshot
            assert not errors,errors;results.append({'width':width,'reduced':reduced,'attacks':observed,'dodges':dodges,'errors':errors});page.close()
        browser.close();print(json.dumps(results))
finally:server.shutdown();server.server_close()
