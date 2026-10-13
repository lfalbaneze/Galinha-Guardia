"""Real mode selection, level cards, tier-five volleys and PixelLab render checks."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import os
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'.cache/chaos-review';OUT.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='chrome',args=['--allow-file-access-from-files'])
        for width,height,mode in [(1280,900,'colheita'),(390,844,'correria'),(844,390,'cerco')]:
            for transport in ['http','file']:
                page=browser.new_page(viewport={'width':width,'height':height},is_mobile=width!=1280,has_touch=width!=1280)
                errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
                folder='dist/' if os.environ.get('CHECK_DIST') else ''
                url=(ROOT/folder/'shuffle/index.html').as_uri() if transport=='file' else f'http://127.0.0.1:{server.server_port}/{folder}shuffle/index.html'
                page.goto(url,wait_until='networkidle');page.wait_for_function('ShuffleDemo.ready')
                page.locator('#survivalStyle').select_option(mode)
                page.locator('#startSurvival').click()
                page.wait_for_function('mode=>ShuffleDemo.run?.style===mode',arg=mode)
                page.evaluate('''()=>{
                    const r=ShuffleDemo.run;r.player.invulnerable=999;r.spawnTimer=999;r.heroCooldown=999;
                    r.powers={cornshot:2};r.pickups=[{kind:'xp',x:r.player.x,y:r.player.y,value:8}];
                    ShuffleSurvival.tick(r,.01);
                }''')
                card=page.locator('.power-card[data-skill="cornshot"]');card.wait_for()
                assert 'Agora' in card.inner_text() and 'Depois' in card.inner_text()
                assert '2 → 3 / 5' in card.inner_text()
                assert card.locator('.rank-pips i').count()==5
                frozen=page.evaluate('[ShuffleDemo.run.elapsed,ShuffleDemo.run.stageElapsed,ShuffleDemo.run.player.x]')
                page.wait_for_timeout(160)
                assert page.evaluate('[ShuffleDemo.run.elapsed,ShuffleDemo.run.stageElapsed,ShuffleDemo.run.player.x]')==frozen
                page.screenshot(path=str(OUT/f'{folder.replace("/","") or "source"}-{transport}-{width}-cards.png'))
                card.click();page.wait_for_function('ShuffleDemo.run.phase==="playing"')
                assert page.evaluate('ShuffleDemo.run.powers.cornshot')==3
                page.evaluate('''()=>{
                    const r=ShuffleDemo.run;r.pickups=[];r.shots=[];r.obstacles=[];r.layout.obstacles=[];
                    r.powers={cornshot:5,frost:5};r.cooldowns={cornshot:0,frost:0};r.enemies=[];
                    Object.assign(r.player,{x:560,y:360,invulnerable:999});
                    const t=ShuffleSurvival.ENEMIES.fox;r.enemies.push({x:690,y:360,species:'fox',r:t.r,
                        speed:0,health:10000,maxHealth:10000,traveled:0,moving:false,dx:0,dy:1,route:[],routeTimer:0});
                    window.newArtDraws=new Set();const original=CanvasRenderingContext2D.prototype.drawImage;
                    CanvasRenderingContext2D.prototype.drawImage=function(img,...args){
                        if(this.canvas.id==='game'&&img.src?.includes('chaos-powers.png'))newArtDraws.add(args.slice(0,4).join(','));
                        return original.call(this,img,...args);
                    };ShuffleSurvival.tick(r,.01);
                    if(r.shots.filter(s=>s.kind==='frost').length!==7)throw Error('Tier-five frost volley missing');
                    if(!r.shots.filter(s=>s.kind==='cornshot').every(s=>s.piercing))throw Error('Tier-five piercing missing');
                }''')
                page.wait_for_function('newArtDraws.size>0')
                if width==1280:
                    page.keyboard.down('KeyD');before=page.evaluate('ShuffleDemo.run.player.x');page.wait_for_timeout(180);page.keyboard.up('KeyD')
                    assert page.evaluate('ShuffleDemo.run.player.x')>before+5
                page.screenshot(path=str(OUT/f'{folder.replace("/","") or "source"}-{transport}-{width}-battle.png'))
                page.locator('#pause').click();page.get_by_role('button',name='Bicho e tipo de partida · reiniciar').click()
                assert page.locator('#survivalStyle').input_value()==mode
                assert not errors,errors
                print(f'{folder or "source/"}{transport} {width}: {mode}, cards, tier-five volleys, new sprites and restart passed')
                page.close()
        browser.close()
finally:
    server.shutdown();server.server_close()
