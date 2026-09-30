"""Real browser entry/input checks; pickups and end screens use explicit fixtures."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
import os
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '.cache' / 'survival-web-review'
OUT.mkdir(parents=True, exist_ok=True)
READY = "window.ShuffleDemo?.ready && ShuffleDemo.run?.mode==='survival'"


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass


def folklore_check(page):
    expected = ['fuinha', 'fox', 'mula-sem-cabeca', 'curupira', 'boitata', 'cuca']
    assert page.evaluate('ids=>ids.every(id=>PixelLabArtData[id]?.provider==="pixellab")', expected)
    page.evaluate('''()=>{
        const r=ShuffleDemo.run;Object.assign(r,ShuffleSurvival.newRun(614,Object.keys(PixelLabArtData)));
        r.elapsed=240;r.player.invulnerable=300;r.powers={};r.pickups=[];
        ShuffleSurvival.tick(r,.01);r.spawnTimer=999;
        r.layout.obstacles=[];r.obstacles=r.layout.obstacles;
        r.player.x=ShuffleRun.WIDTH/2;r.player.y=ShuffleRun.HEIGHT/2;
        r.enemies=[...new Map(r.enemies.map(e=>[e.species,e])).values()];
        r.enemies.forEach((e,i)=>{e.x=r.player.x-210+(i%4)*140;e.y=r.player.y-170+Math.floor(i/4)*320;
            e.timer=999;e.baseSpeed=35;e.route=[];e.routeTarget=null;});
        const original=CanvasRenderingContext2D.prototype.drawImage;window.enemyArtDrawn=new Set();
        CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
            if(this.canvas.id==='game')for(const id of Object.keys(ShuffleSurvival.ENEMIES))
                if(image.src?.endsWith(PixelLabArtData[id]?.source))enemyArtDrawn.add(id);
            return original.call(this,image,...args);
        };
    }''')
    page.wait_for_function('ids=>ids.every(id=>enemyArtDrawn.has(id))', arg=expected)
    page.wait_for_timeout(250)
    page.screenshot(path=str(OUT/'folklore-cast.png'))
    page.evaluate('''()=>{const r=ShuffleDemo.run,p=r.player;
        for(const [i,e] of r.enemies.filter(e=>['cuca','mula-sem-cabeca'].includes(e.species)).entries()){
            e.x=p.x+(i?190:-190);e.y=p.y-20;e.mode='warning';e.timer=1.05;
            const d=Math.hypot(p.x-e.x,p.y-e.y);e.aimX=(p.x-e.x)/d;e.aimY=(p.y-e.y)/d;}
        r.hazards=[{x:p.x,y:p.y+75,kind:'roots',r:29,arm:.95,life:3},
            {x:p.x+65,y:p.y+75,kind:'fire',r:18,arm:0,life:2.7}];
    }''')
    page.wait_for_timeout(100)
    page.screenshot(path=str(OUT/'folklore-warnings.png'))
    page.wait_for_function('ShuffleDemo.run.hexes.length===3')
    page.screenshot(path=str(OUT/'folklore-spells.png'))


def heroes_check(page, url):
    page.goto(url, wait_until='networkidle')
    page.wait_for_function(READY)
    page.locator('#pause').click()
    page.get_by_role('button', name='Trocar bicho · reiniciar').click()
    assert page.locator('#survivalSkin option:disabled').count() == 5
    profile = page.evaluate('''()=>{const profile=JSON.stringify({version:2,best:6,selected:'silkie',unlocked:Object.keys(ShuffleSurvival.HEROES)});
        localStorage.setItem('galinha-guardia-wardrobe-v1',profile);return profile;}''')
    page.reload(wait_until='networkidle');page.wait_for_function(READY)
    assert page.evaluate('ShuffleDemo.run.player.skin') == 'silkie', 'Inherit equipped appearance'
    page.evaluate('''()=>{window.heroArtDrawn=new Set();const draw=CanvasRenderingContext2D.prototype.drawImage;
        CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
            if(this.canvas.id==='game')heroArtDrawn.add(image.src);return draw.call(this,image,...args);};}''')
    for skin in ['classic','silkie','blue','punk','astronaut','robocop','priest','goose']:
        page.locator('#pause').click()
        page.get_by_role('button', name='Trocar bicho · reiniciar').click()
        page.locator('#survivalSkin').select_option(skin)
        assert page.locator('#heroDescription').inner_text()
        page.locator('#startSurvival').click()
        assert page.evaluate('ShuffleDemo.run.player.skin') == skin
        page.wait_for_function('''()=>{const a=CharacterArt.appearances[ShuffleDemo.run.player.skin];
            return [...heroArtDrawn].some(src=>src?.endsWith(PixelLabArtData[a.sprite||a.species].source));}''')
        page.evaluate('''()=>{const r=ShuffleDemo.run;r.player.invulnerable=60;r.heroCooldown=0;
            r.layout.obstacles=[];r.obstacles=r.layout.obstacles;r.player.x=560;r.player.y=360;
            r.enemies=[{species:'fox',x:660,y:360,r:18,speed:0,health:100,traveled:0,moving:false,
                route:[],routeTimer:0,routeTarget:null}];r.spawnTimer=999;r.pickups=[];}''')
        page.locator('#dash').click()
        page.wait_for_timeout(100)
        page.screenshot(path=str(OUT/f'hero-{skin}.png'))
        assert page.evaluate("localStorage.getItem('galinha-guardia-wardrobe-v1')") == profile
    return {'case':'eight-heroes','equippedSkin':True,'correctAtlases':True,'selection':True,'wardrobePreserved':True}


def check(page, url, name, touch=False):
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(url, wait_until='networkidle')
    page.locator('#shuffleModeLink').click()
    page.wait_for_function(READY)
    assert page.evaluate('FarmSprites.cohesiveReady')
    page.evaluate('''()=>{const draw=FarmSprites.draw;window.sceneryDraws=new Set();
        FarmSprites.draw=(ctx,name,...args)=>{const result=draw(ctx,name,...args);
            if(result)sceneryDraws.add(name);return result;};}''')
    page.wait_for_function('sceneryDraws.size>=2')
    page.screenshot(path=str(OUT / f'scenery-{name}.png'))
    assert page.locator('#overlay').is_hidden()
    assert page.locator('#corn').is_hidden() and page.locator('#interact').is_hidden()
    assert 'SOBREVIVÊNCIA' in page.locator('#stageLabel').inner_text()
    # Preserve a valid campaign checkpoint through every survival lifecycle action.
    saved = page.evaluate('''()=>{const data=JSON.stringify(ShuffleRun.checkpoint(ShuffleRun.newRun(42)));
        localStorage.setItem(ShuffleDemo.saveKey,data);return data;}''')
    # Observe actual atlas rectangles submitted to canvas, not just available clips.
    page.evaluate('''()=>{window.henFrames=new Set();const original=CanvasRenderingContext2D.prototype.drawImage;
        CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
            if(this.canvas.id==='game'&&image.src?.endsWith(PixelLabArtData.chicken.source))
                henFrames.add(args.slice(0,4).join(','));
            return original.call(this,image,...args);
        };}''')
    before = page.evaluate('({x:ShuffleDemo.run.player.x,y:ShuffleDemo.run.player.y})')
    direction = page.evaluate('''()=>{const r=ShuffleDemo.run,p=r.player,q=r.layout.hub;
        const d=Math.hypot(q.x-p.x,q.y-p.y)||1;return{x:(q.x-p.x)/d,y:(q.y-p.y)/d};}''')
    if touch:
        box = page.locator('#joystick').bounding_box()
        assert box and box['width'] >= 60
        cdp = page.context.new_cdp_session(page)
        cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{
            'x':box['x']+box['width']*(.5+.3*direction['x']),
            'y':box['y']+box['height']*(.5+.3*direction['y'])}]})
        page.wait_for_timeout(300)
        cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
        cdp.detach()
    else:
        key = ('d' if direction['x'] > 0 else 'a') if abs(direction['x']) > abs(direction['y']) else ('s' if direction['y'] > 0 else 'w')
        page.keyboard.down(key); page.wait_for_timeout(300); page.keyboard.up(key)
    after = page.evaluate('({x:ShuffleDemo.run.player.x,y:ShuffleDemo.run.player.y})')
    assert (after['x']-before['x'])**2+(after['y']-before['y'])**2 > 100
    page.locator('#dash').click()
    page.wait_for_function('ShuffleDemo.run.player.dashCooldown>0')
    page.wait_for_timeout(80)
    assert page.evaluate('''()=>Object.values(PixelLabArtData.chicken.actions.run).some(p=>
        p.frames.some(f=>henFrames.has([f.x,f.y,f.w,f.h].join(','))))'''), 'Run clip was never drawn'
    page.locator('#pause').click()
    frozen = page.evaluate('JSON.stringify(ShuffleDemo.run)')
    page.wait_for_timeout(100)
    assert page.evaluate('JSON.stringify(ShuffleDemo.run)') == frozen
    page.locator('#resume').click()
    page.evaluate("ShuffleDemo.run.player.dashTime=0;ShuffleDemo.run.powers.egg=0;ShuffleDemo.run.pickups.push({kind:'egg',x:ShuffleDemo.run.player.x,y:ShuffleDemo.run.player.y,value:1})")
    page.wait_for_function('ShuffleDemo.run.powers.egg>=1')
    assert 'Resident Ovo: 1/3' in page.locator('#powerHud').inner_text()
    page.evaluate('''()=>{const r=ShuffleDemo.run;r.elapsed=210;r.player.invulnerable=100;
        r.powers={};r.shots=[];r.pickups=[];
        for(let i=0;i<500;i++)ShuffleSurvival.tick(r,.05);
        r.powers={cornshot:3,egg:3,sickle:3,boots:3};}''')
    page.wait_for_timeout(100)
    assert page.evaluate('ShuffleDemo.run.enemies.length') > 8
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    hud = page.locator('#powerHud').bounding_box()
    field = page.locator('#playfield').bounding_box()
    assert hud['y'] >= field['y'] + field['height'] - 1, 'Powers must not cover the playfield'
    assert page.locator('#dash').bounding_box()['height'] >= 44
    page.screenshot(path=str(OUT / f'{name}.png'))
    seed = page.evaluate('ShuffleDemo.run.seed')
    page.evaluate("ShuffleDemo.run.phase='lost'")
    page.locator('#same').click()
    assert page.evaluate('ShuffleDemo.run.seed') == seed
    assert page.evaluate('ShuffleDemo.run.powers') == {'cornshot':1}
    page.evaluate('ShuffleDemo.run.elapsed=299.99;ShuffleDemo.run.player.invulnerable=10')
    page.wait_for_function("ShuffleDemo.run.phase==='won'")
    assert 'A fazenda resistiu' in page.locator('#panelTitle').inner_text()
    page.locator('#again').click()
    assert page.evaluate('ShuffleDemo.run.mode') == 'survival'
    assert page.evaluate('localStorage.getItem(ShuffleDemo.saveKey)') == saved
    page.reload(wait_until='networkidle'); page.wait_for_function(READY)
    assert page.evaluate('ShuffleDemo.run.elapsed') < 5
    assert page.evaluate('localStorage.getItem(ShuffleDemo.saveKey)') == saved
    if name == 'http-1280' and os.environ.get('CHECK_FOLKLORE') == '1':
        folklore_check(page)
    assert not errors, errors
    return {'case':name,'entry':True,'sceneryAtlas':True,'runAnimation':True,'movement':True,'pause':True,'collect':True,'retry':True,'savePreserved':True}


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel=os.environ.get('BROWSER_CHANNEL') or None)
        results = []
        base = f'http://127.0.0.1:{server.server_port}/dist/index.html'
        for width,height,touch in [(1280,900,False),(390,844,True),(844,390,True)]:
            context = browser.new_context(viewport={'width':width,'height':height},has_touch=touch,is_mobile=touch)
            results.append(check(context.new_page(),base,f'http-{width}',touch))
            context.close()
        for folder in (ROOT, ROOT/'dist'):
            context = browser.new_context(viewport={'width':1280,'height':900})
            results.append(check(context.new_page(),(folder/'index.html').as_uri(),f'file-{folder.name}'))
            context.close()
        context = browser.new_context(viewport={'width':1280,'height':900})
        results.append(heroes_check(context.new_page(),f'http://127.0.0.1:{server.server_port}/dist/shuffle/index.html#survival'))
        context.close()
        browser.close()
    (OUT/'results.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
    print(json.dumps(results))
finally:
    server.shutdown();server.server_close()
