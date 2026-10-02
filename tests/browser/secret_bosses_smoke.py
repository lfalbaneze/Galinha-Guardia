"""Optional survival seals through real keyboard/touch controls; no automatic folklore spawns."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import os
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'.cache/secret-boss-review';OUT.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='chrome')
        folder='dist/' if os.environ.get('SECRET_DIST') else ''
        for width,height in [(1280,900),(390,844)]:
            context=browser.new_context(viewport={'width':width,'height':height},has_touch=width==390)
            page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            url=(ROOT/folder/'shuffle/index.html').as_uri() if os.environ.get('SECRET_FILE') else f'http://127.0.0.1:{server.server_port}/{folder}shuffle/index.html'
            page.goto(url+'#survival',wait_until='networkidle')
            page.wait_for_function('ShuffleDemo.ready && ShuffleDemo.run?.mode==="survival"')
            assert page.evaluate('ShuffleSurvival.SECRET_BOSSES.every(b=>ShuffleDemo.run.enemyTypes.includes(b.species))')
            page.evaluate('''()=>{window.bossArtDrawn=new Set();const draw=CanvasRenderingContext2D.prototype.drawImage;
                CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
                    if(this.canvas.id==='game')for(const id of Object.keys(ShuffleSurvival.ENEMIES)){
                        const source=PixelLabArtData[id]?.source||ShuffleResultArt['enemy-'+id]?.win;
                        if(source&&image.src?.endsWith(source))bossArtDrawn.add(id);
                    }return draw.call(this,image,...args);};}''')
            for stage in range(4):
                species=page.evaluate('''stage=>{const r=ShuffleDemo.run;Object.assign(r,ShuffleSurvival.newRun(614,r.enemyTypes));
                    for(let i=0;i<stage;i++){r.phase='stage-clear';ShuffleSurvival.nextStage(r);}
                    r.enemies=[];r.pickups=[];r.spawnTimer=999;r.powers={};r.heroCooldown=999;
                    Object.assign(r.player,{x:r.secretAltar.x,y:r.secretAltar.y,invulnerable:999});
                    return r.secretAltar.species;}''',stage)
                page.locator('#interact').wait_for(state='visible')
                assert page.evaluate('ShuffleDemo.run.enemies.every(e=>!e.isSecretBoss)')
                page.screenshot(path=str(OUT/f'{species}-{width}-seal.png'))
                if width==390:page.locator('#interact').click()
                else:page.keyboard.press('e')
                page.wait_for_function('ShuffleDemo.run.enemies.some(e=>e.isSecretBoss)')
                page.wait_for_function('species=>bossArtDrawn.has(species)',arg=species)
                page.evaluate('ShuffleDemo.run.player.x+=65')
                clock=page.evaluate('ShuffleDemo.run.stageElapsed');page.wait_for_timeout(400)
                assert page.evaluate('ShuffleDemo.run.stageElapsed')==clock
                assert 'SECRETO' in page.locator('#objective').inner_text()
                page.screenshot(path=str(OUT/f'{species}-{width}-boss.png'))
                page.evaluate('''()=>{const r=ShuffleDemo.run,boss=r.enemies.find(e=>e.isSecretBoss);
                    r.obstacles=[];r.layout.obstacles=[];boss.x=r.player.x+40;boss.y=r.player.y;boss.health=.1;
                    r.powers={sickle:3};r.cooldowns.sickle=0;}''')
                page.wait_for_function('ShuffleDemo.run.secretsDefeated.length===1')
                while page.evaluate('ShuffleDemo.run.phase')=='power-draft':page.locator('[data-skill]').first.click()
                assert page.evaluate('ShuffleDemo.run.bossesDefeated===0&&!ShuffleDemo.run.stageCleared')
                assert page.evaluate('ShuffleDemo.run.secretAltar.defeated')
                assert page.evaluate('ShuffleDemo.run.score>=35')
                assert not page.locator('#interact').is_visible()
            assert not errors,errors
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            context.close()
        browser.close()
    print('Four optional bosses: desktop and touch discovery, awakening, frozen phase clock, real damage, rewards and continued main progression pass.')
finally:
    server.shutdown();server.server_close()
