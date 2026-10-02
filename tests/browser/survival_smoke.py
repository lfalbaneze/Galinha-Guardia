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
    # Secret bosses have their own interaction/rendering checks in secret_bosses_smoke.py.
    page.evaluate('''()=>{
        const r=ShuffleDemo.run;Object.assign(r,ShuffleSurvival.newRun(614,r.enemyTypes));
        r.elapsed=240;r.player.invulnerable=300;r.powers={};r.pickups=[];
        ShuffleSurvival.tick(r,.01);r.spawnTimer=999;
        r.layout.obstacles=[];r.obstacles=r.layout.obstacles;
        r.player.x=ShuffleRun.WIDTH/2;r.player.y=ShuffleRun.HEIGHT/2;
        r.enemies=[...new Map(r.enemies.map(e=>[e.species,e])).values()];
        r.enemies.forEach((e,i)=>{e.x=r.player.x-210+i*140;e.y=r.player.y-80;
            e.timer=999;e.baseSpeed=35;e.route=[];e.routeTarget=null;});
        const original=CanvasRenderingContext2D.prototype.drawImage;window.enemyArtDrawn=new Set();
        CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
            if(this.canvas.id==='game')for(const id of Object.keys(ShuffleSurvival.ENEMIES)){
                const source=PixelLabArtData[id]?.source||ShuffleResultArt['enemy-'+id]?.win;
                if(source&&image.src?.endsWith(source))enemyArtDrawn.add(id);
            }return original.call(this,image,...args);
        };
    }''')
    page.wait_for_function('ids=>ids.every(id=>enemyArtDrawn.has(id))',arg=['fuinha','fox','wolf','goose'])
    assert page.evaluate('ShuffleDemo.run.enemies.every(e=>["fuinha","fox","wolf","goose"].includes(e.species))')
    page.screenshot(path=str(OUT/'ordinary-cast.png'))


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
        # Each playable animal speaks both outcomes with its own portrait and identity.
        for won in [True, False]:
            expected = page.evaluate('''won=>{const r=ShuffleDemo.run;
                r.defeatedBoss={species:'cuca',name:'Cuca'};r.defeatedBy={species:'wolf',name:'Baltazar'};
                r.phase=won?'won':'lost';return [ShuffleSurvival.quip(r,r.player,won).name,
                    ShuffleSurvival.quip(r,r.player,won).text,won?'Cuca':'Baltazar'];}''', won)
            page.locator('.result-quips').wait_for(state='visible')
            page.wait_for_function("expected=>expected.every(value=>document.querySelector('.result-quips')?.innerText.includes(value))", arg=expected)
            text = page.locator('.result-quips').inner_text()
            assert all(value in text for value in expected), text
            assert page.locator('.result-quips .banter-portrait').count() == 2
            assert page.locator(f'.result-quips [data-pose="hero-{skin}-{"win" if won else "lose"}"]').count() == 1
            assert page.locator('.result-quips canvas').evaluate_all('''canvases=>canvases.every(c=>
                c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0))''')
            if skin == 'silkie':
                page.screenshot(path=str(OUT/f'banter-{skin}-{won}.png'))
        page.locator('#again').click()
    for species in page.evaluate('Object.keys(ShuffleSurvival.ENEMIES)'):
        for won in [True, False]:
            pose = f'enemy-{species}-{"lose" if won else "win"}'
            page.evaluate('''({species,won})=>{const r=ShuffleDemo.run;
                r.defeatedBoss=r.defeatedBy={species,name:ShuffleSurvival.ENEMIES[species].name};
                r.phase=won?'won':'lost';}''', {'species':species,'won':won})
            page.locator(f'.result-quips [data-pose="{pose}"]').wait_for(state='visible')
            assert page.locator('.result-quips canvas').evaluate_all('''cs=>cs.every(c=>c.getContext('2d')
                .getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0))''')
    return {'case':'eight-heroes','equippedSkin':True,'correctAtlases':True,'selection':True,'wardrobePreserved':True}


def check(page, url, name, touch=False):
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(url, wait_until='networkidle')
    page.locator('#shuffleModeLink').click()
    page.wait_for_function(READY)
    # Movement has its own fixture; nearby XP is tested explicitly below.
    page.evaluate('ShuffleDemo.run.pickups=[]')
    assert page.evaluate('FarmSprites.cohesiveReady')
    page.evaluate('''()=>{const draw=FarmSprites.draw;window.sceneryDraws=new Set();
        FarmSprites.draw=(ctx,name,...args)=>{const result=draw(ctx,name,...args);
            if(result)sceneryDraws.add(name);return result;};}''')
    page.wait_for_function('sceneryDraws.size>=2')
    page.screenshot(path=str(OUT / f'scenery-{name}.png'))
    assert page.locator('#overlay').is_hidden()
    assert page.locator('#corn').is_hidden() and page.locator('#interact').is_hidden()
    assert 'FASE 1 / 5' in page.locator('#stageLabel').inner_text()
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
    page.evaluate('''()=>{const r=ShuffleDemo.run;r.player.dashTime=0;r.player.invulnerable=100;
        r.enemies=[];r.spawnTimer=999;r.heroCooldown=999;r.level=1;r.xp=0;
        r.pickups=[{kind:'xp',x:r.player.x,y:r.player.y,value:7}];}''')
    page.wait_for_function('ShuffleDemo.run.xp===7')
    assert page.locator('#xpHud').is_visible()
    assert page.locator('#xpMeter').evaluate('(p)=>p.value===7&&p.max===8')
    assert page.evaluate('ShuffleDemo.run.level')==1
    page.screenshot(path=str(OUT/f'xp-{name}.png'))
    before_powers=page.evaluate('JSON.stringify(ShuffleDemo.run.powers)')
    page.evaluate("ShuffleDemo.run.pickups=[{kind:'xp',x:ShuffleDemo.run.player.x,y:ShuffleDemo.run.player.y,value:1}]")
    page.wait_for_function("ShuffleDemo.run.phase==='power-draft'")
    assert page.locator('#panelTitle').inner_text()=='Nível 2!'
    assert page.locator('[data-skill]').count()==3
    assert page.evaluate('JSON.stringify(ShuffleDemo.run.powers)')==before_powers
    page.screenshot(path=str(OUT/f'level-up-{name}.png'))
    chosen=page.locator('[data-skill]').first.get_attribute('data-skill')
    rank=page.evaluate('id=>ShuffleDemo.run.powers[id]||0',chosen)
    page.locator('[data-skill]').first.click()
    assert page.evaluate('id=>ShuffleDemo.run.powers[id]',chosen)==rank+1
    assert page.locator('#xpMeter').evaluate('(p)=>p.value===0&&p.max===11')
    page.evaluate('''()=>{const r=ShuffleDemo.run;r.elapsed=210;r.player.invulnerable=100;r.spawnTimer=0;
        r.powers={};r.shots=[];r.pickups=[];r.heroCooldown=999;
        for(let i=0;i<500;i++)ShuffleSurvival.tick(r,.05);
        r.powers={cornshot:3,egg:3,sickle:3,boots:3};
        r.cooldowns={cornshot:999,egg:999,sickle:999};r.shots=[];}''')
    page.wait_for_timeout(100)
    assert page.evaluate('ShuffleDemo.run.enemies.length') > 8
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    hud = page.locator('#powerHud').bounding_box()
    field = page.locator('#playfield').bounding_box()
    assert hud['y'] >= field['y'] + field['height'] - 1, 'Powers must not cover the playfield'
    assert page.locator('#dash').bounding_box()['height'] >= 44
    page.screenshot(path=str(OUT / f'{name}.png'))
    # Points open a real card modal; reroll, keyboard focus and explicit choices.
    page.evaluate('''()=>{const r=ShuffleDemo.run;r.pickups=[{kind:'xp',x:r.player.x,y:r.player.y,value:40}];}''')
    page.wait_for_function("ShuffleDemo.run.phase==='power-draft'")
    assert page.locator('[data-skill]').count() == 3
    frozen = page.evaluate('JSON.stringify(ShuffleDemo.run)')
    page.wait_for_timeout(120)
    assert page.evaluate('JSON.stringify(ShuffleDemo.run)') == frozen
    assert page.locator('#dash').is_disabled()
    previous = page.locator('[data-skill]').evaluate_all('(cards)=>cards.map(c=>c.dataset.skill)')
    page.locator('#reroll').click()
    assert page.locator('#reroll').is_disabled()
    choices = page.locator('[data-skill]').evaluate_all('(cards)=>cards.map(c=>c.dataset.skill)')
    assert not set(previous).intersection(choices)
    page.screenshot(path=str(OUT / f'cards-{name}.png'))
    while page.evaluate("ShuffleDemo.run.phase==='power-draft'"):
        reward_level=page.evaluate('ShuffleDemo.run.level-ShuffleDemo.run.pendingChoices+1')
        assert page.locator('#panelTitle').inner_text()==f'Nível {reward_level}!'
        page.locator('[data-skill]').first.click()
    assert page.evaluate("ShuffleDemo.run.phase==='playing'")
    seed = page.evaluate('ShuffleDemo.run.seed')
    page.evaluate("ShuffleDemo.run.phase='lost'")
    page.locator('.result-quips').wait_for(state='visible')
    assert page.locator('.result-quips .speech-bubble').count() == 1
    page.screenshot(path=str(OUT / f'defeat-{name}.png'))
    page.locator('#same').click()
    assert page.evaluate('ShuffleDemo.run.seed') == seed
    assert page.evaluate('ShuffleDemo.run.powers') == {'cornshot':1}
    # Accelerate wave clocks, but require actual weapon hits to clear every boss.
    for stage in range(5):
        page.evaluate('''()=>{const r=ShuffleDemo.run;r.player.invulnerable=100;
            r.stageElapsed=59.99;r.pickups=[];r.spawnTimer=999;}''')
        page.wait_for_function('ShuffleDemo.run.enemies.some(e=>e.isBoss)')
        assert page.locator('#bossHud').is_visible()
        if stage == 0:
            page.screenshot(path=str(OUT / f'boss-{name}.png'))
        page.evaluate('''()=>{const r=ShuffleDemo.run,b=r.enemies.find(e=>e.isBoss);
            r.obstacles=[];r.layout.obstacles=r.obstacles;r.enemies=[b];
            r.player.x=560;r.player.y=360;Object.assign(b,{x:615,y:360,health:1,baseSpeed:0,timer:999});
            r.powers.sickle=3;r.cooldowns.sickle=0;}''')
        page.wait_for_function(f'ShuffleDemo.run.bossesDefeated==={stage+1}')
        while page.evaluate("ShuffleDemo.run.phase==='power-draft'"):
            page.locator('[data-skill]').first.click()
        if stage < 4:
            page.locator('.result-quips').wait_for(state='visible')
            assert page.locator('.result-quips .speech-bubble').count() == 2
            if stage == 0:
                page.screenshot(path=str(OUT / f'victory-{name}.png'))
            old_map = page.evaluate('ShuffleDemo.run.layout.id')
            page.locator('#nextStage').click()
            assert page.evaluate('ShuffleDemo.run.layout.id') != old_map
        else:
            page.wait_for_function("ShuffleDemo.run.phase==='won'")
    assert 'A fazenda resistiu' in page.locator('#panelTitle').inner_text()
    assert page.evaluate("JSON.parse(localStorage.getItem('penas-pro-ar.shuffle-victories.v1'))") == 1
    assert 'Revanche 1' in page.locator('#panel').inner_text()
    page.locator('#again').click()
    assert page.evaluate('ShuffleDemo.run.victories') == 1
    assert 'REVANCHE 1' in page.locator('#stageLabel').inner_text()
    assert page.evaluate('ShuffleDemo.run.mode') == 'survival'
    assert page.evaluate('localStorage.getItem(ShuffleDemo.saveKey)') == saved
    page.reload(wait_until='networkidle'); page.wait_for_function(READY)
    assert page.evaluate('ShuffleDemo.run.elapsed') < 5
    assert page.evaluate('ShuffleDemo.run.victories') == 1, 'Winning raises future runs after reload'
    assert page.evaluate('localStorage.getItem(ShuffleDemo.saveKey)') == saved
    if name == 'http-1280' and os.environ.get('CHECK_FOLKLORE') == '1':
        folklore_check(page)
    assert not errors, errors
    return {'case':name,'entry':True,'sceneryAtlas':True,'runAnimation':True,'movement':True,'pause':True,'collect':True,'cards':True,'fiveBosses':True,'retry':True,'savePreserved':True}


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel=os.environ.get('BROWSER_CHANNEL') or None)
        results = []
        prefix = '' if os.environ.get('SHUFFLE_SOURCE_ONLY') else 'dist/'
        base = f'http://127.0.0.1:{server.server_port}/{prefix}index.html'
        for width,height,touch in [(1280,900,False),(390,844,True),(844,390,True)]:
            context = browser.new_context(viewport={'width':width,'height':height},has_touch=touch,is_mobile=touch)
            results.append(check(context.new_page(),base,f'http-{width}',touch))
            context.close()
        for folder in ((ROOT,) if not prefix else (ROOT, ROOT/'dist')):
            context = browser.new_context(viewport={'width':1280,'height':900})
            results.append(check(context.new_page(),(folder/'index.html').as_uri(),f'file-{folder.name}'))
            context.close()
        context = browser.new_context(viewport={'width':1280,'height':900})
        results.append(heroes_check(context.new_page(),f'http://127.0.0.1:{server.server_port}/{prefix}shuffle/index.html#survival'))
        context.close()
        browser.close()
    (OUT/'results.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
    print(json.dumps(results))
finally:
    server.shutdown();server.server_close()
