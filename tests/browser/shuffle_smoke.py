"""Packaged Shuffle: generated floors, touch, checkpoints and boss input tests.
Stage checkpoints are explicit fixtures, not a claimed human campaign playthrough.
"""
from pathlib import Path
import json
import math
import os
from playwright.sync_api import sync_playwright

BASE=os.environ.get('SHUFFLE_BASE','http://127.0.0.1:8765/dist/')
OUT=Path('.cache/shuffle-review');OUT.mkdir(parents=True,exist_ok=True)
READY='window.ShuffleDemo && ShuffleDemo.ready'
results=[]

def fixture(stage,phase='playing'):
    picks=['boots','boots','heart','heart','dash','dash','call','call','shield','feather']
    level=stage if phase=='draft' else stage+1
    skills={}
    for s in picks[:level]:skills[s]=skills.get(s,0)+1
    return dict(version=2,mapVersion=1,seed=814237,rng=19,stage=stage,phase=phase,
                skills=skills,level=level,hp=3+skills.get('heart',0),choices=[],rerolls=1,elapsed=0)

def restore(page,data):
    page.evaluate('(d)=>localStorage.setItem(ShuffleDemo.saveKey,JSON.stringify(d))',data)
    page.reload(wait_until='networkidle');page.wait_for_function(READY)
    page.locator('#continueRun').click()

held=set()
def move_keys(page,x,y):
    wanted=set()
    if abs(x)>.18:wanted.add('d' if x>0 else 'a')
    if abs(y)>.18:wanted.add('s' if y>0 else 'w')
    for key in held-wanted:page.keyboard.up(key)
    for key in wanted-held:page.keyboard.down(key)
    held.clear();held.update(wanted)

def go_toward(page,target):
    step=page.evaluate('''t=>{const r=ShuffleDemo.run,p=r.player;
        const route=ShuffleRun.route(r.layout,p,t,p.r),q=route.find(n=>Math.hypot(n.x-p.x,n.y-p.y)>5)||t;
        const d=Math.hypot(q.x-p.x,q.y-p.y)||1;return {x:(q.x-p.x)/d,y:(q.y-p.y)/d};}''',target)
    move_keys(page,step['x'],step['y'])

def play_boss(page,stage):
    restore(page,fixture(stage));name='Panto' if stage==4 else 'Baltazar'
    assert page.locator('#bossName').inner_text().startswith(name.upper())
    assert page.locator('#bossMeter').get_attribute('max')==('3' if stage==4 else '5')
    seen=set();hits=0;previous=3 if stage==4 else 5
    # All gameplay after the checkpoint uses keyboard/button input and normal RAF updates.
    for turn in range(1200):
        r=page.evaluate('''()=>{const r=ShuffleDemo.run;return {phase:r.phase,p:r.player,b:r.boss,hp:r.hp,reach:ShuffleRun.stats(r).reach};}''')
        if r['phase']=='lost':raise AssertionError(f'{name}: lost during browser input test')
        b=r['b'];p=r['p'];seen.add(b['mode'])
        if b['courage']<previous:hits+=previous-b['courage'];previous=b['courage']
        if b['courage']==0:break
        if b['mode']=='stunned':
            if math.hypot(p['x']-b['x'],p['y']-b['y'])<r['reach']+b['r']-5:
                move_keys(page,0,0);page.locator('#interact').click()
            else:go_toward(page,dict(x=b['x'],y=b['y']))
        elif b['mode'] in ['warning','charge']:
            # Step perpendicular to the announced lane; do not follow an unannounced aim.
            ax=b['aimX'];ay=b['aimY'];offset=(p['x']-b['x'])*(-ay)+(p['y']-b['y'])*ax
            sign=1 if offset>=0 else -1
            dx=-ay*sign;dy=ax*sign
            if not (65<p['x']+dx*75<1055 and 65<p['y']+dy*75<655):dx=-dx;dy=-dy
            if abs(offset)<83:move_keys(page,dx,dy)
            else:move_keys(page,0,0)
        else:
            d=math.hypot(p['x']-b['x'],p['y']-b['y'])
            if d>230:go_toward(page,dict(x=b['x'],y=b['y']))
            else:move_keys(page,0,0)
        if turn==50:page.screenshot(path=str(OUT/f'boss-{stage+1}-fight.png'))
        page.wait_for_timeout(65)
    else:raise AssertionError(f'{name}: counter did not complete: {r}')
    move_keys(page,0,0)
    assert {'warning','charge','stunned'}.issubset(seen),seen
    assert hits==(3 if stage==4 else 5)
    if stage==4:
        assert page.evaluate("ShuffleDemo.run.phase==='playing' && ShuffleRun.exitReady(ShuffleDemo.run)")
        for _ in range(450):
            if page.evaluate("ShuffleDemo.run.phase==='draft'"):break
            go_toward(page,page.evaluate('ShuffleDemo.run.exit'));page.wait_for_timeout(55)
        move_keys(page,0,0)
        assert page.evaluate("ShuffleDemo.run.stage===5 && ShuffleDemo.run.phase==='draft'")
        assert page.locator('[data-skill]').count()==3
        page.locator('[data-skill]').first.click()
        assert page.evaluate('ShuffleDemo.run.stage===5 && !ShuffleDemo.run.boss')
    else:assert page.evaluate("ShuffleDemo.run.phase==='won' && ShuffleDemo.run.stage===9")
    results.append({'boss':name,'realInputCounters':hits,'warning':True,'nextPhaseOrWin':True})

with sync_playwright() as p:
    browser=p.chromium.launch()
    for width,height,touch in [(1280,900,False),(390,844,True),(844,390,True)]:
        context=browser.new_context(viewport={'width':width,'height':height},has_touch=touch,is_mobile=touch)
        page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(BASE+'shuffle/',wait_until='networkidle');page.wait_for_function(READY)
        page.evaluate("localStorage.setItem('penas-pro-ar.shuffle.v1','preserve-legacy');localStorage.setItem('classic-save-sentinel','keep')")
        page.locator('#startRun').click();assert page.locator('[data-skill]').count()==3
        assert page.locator('.campaign>span').count()==10
        assert page.locator('.campaign .boss').count()==2
        page.locator('#reroll').click();assert page.locator('#reroll').is_disabled()
        page.screenshot(path=str(OUT/f'cards-{width}.png'))
        page.locator('[data-skill]').first.click()
        before=page.evaluate('({x:ShuffleDemo.run.player.x,y:ShuffleDemo.run.player.y})')
        direction=page.evaluate('''()=>{const r=ShuffleDemo.run,p=r.player,q=r.layout.hub,d=Math.hypot(q.x-p.x,q.y-p.y);return{x:(q.x-p.x)/d,y:(q.y-p.y)/d};}''')
        if touch:
            stick=page.locator('#joystick').bounding_box();assert stick and stick['width']>=60
            x=stick['x']+stick['width']*(.5+.3*direction['x']);y=stick['y']+stick['height']*(.5+.3*direction['y'])
            cdp=context.new_cdp_session(page);cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
            page.wait_for_timeout(300);cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});cdp.detach()
        else:move_keys(page,direction['x'],direction['y']);page.wait_for_timeout(250);move_keys(page,0,0)
        after=page.evaluate('({x:ShuffleDemo.run.player.x,y:ShuffleDemo.run.player.y})')
        assert math.hypot(after['x']-before['x'],after['y']-before['y'])>10
        page.locator('#dash').click();page.wait_for_function('ShuffleDemo.run.player.dashCooldown>0')
        page.locator('#pause').click();old=page.evaluate('JSON.stringify(ShuffleDemo.run.player)');page.wait_for_timeout(100)
        assert old==page.evaluate('JSON.stringify(ShuffleDemo.run.player)');page.locator('#resume').click()
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        for name in ['dash','corn','interact']:
            box=page.locator('#'+name).bounding_box();assert box and box['height']>=44
        map_before=page.evaluate('JSON.stringify(ShuffleDemo.run.layout)')
        page.screenshot(path=str(OUT/f'play-{width}.png'))
        page.reload(wait_until='networkidle');page.wait_for_function(READY);page.locator('#continueRun').click()
        assert page.evaluate('JSON.stringify(ShuffleDemo.run.layout)')==map_before
        assert page.evaluate("localStorage.getItem('penas-pro-ar.shuffle.v1')")=='preserve-legacy'
        assert page.evaluate("localStorage.getItem('classic-save-sentinel')")=='keep'
        assert not errors,errors
        results.append({'viewport':[width,height],'touch':touch,'movement':True,'pause':True,'sameMapReload':True,'errors':errors})
        context.close()
    context=browser.new_context(viewport={'width':1280,'height':900});page=context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE+'shuffle/',wait_until='networkidle');page.wait_for_function(READY)
    maps=[]
    for stage in range(10):
        restore(page,fixture(stage));assert page.locator('#stageLabel').inner_text().startswith(f'{stage+1} / 10')
        assert page.evaluate('!!ShuffleDemo.run.boss')==(stage in [4,9])
        maps.append(page.evaluate('ShuffleDemo.run.layout.id'))
        page.screenshot(path=str(OUT/f'phase-{stage+1:02}.png'))
    assert len(set(maps))==10
    results.append({'allTenStageFixturesRender':True,'bossesOnlyAt':[5,10]})
    data=fixture(1,'draft');data.update(skills={'corn':1},level=1,hp=3,choices=['boots','heart','call'])
    restore(page,data);assert page.evaluate('ShuffleDemo.run.player===null');assert page.locator('[data-skill]').count()==3
    page.locator('[data-skill]').first.click();assert page.evaluate('ShuffleDemo.run.skills.corn===1')
    play_boss(page,4);play_boss(page,9)
    assert not errors,errors
    page.goto(BASE+'index.html',wait_until='networkidle');page.locator('#shuffleModeLink').wait_for(state='visible')
    page.locator('#shuffleModeLink').click();page.wait_for_url('**/shuffle/index.html');page.wait_for_function(READY)
    results.append({'classicMenuEntry':True})
    context.close()
    page=browser.new_page();page.goto((Path('dist')/'shuffle'/'index.html').resolve().as_uri(),wait_until='networkidle')
    page.wait_for_function(READY);page.locator('#startRun').click();assert page.locator('[data-skill]').count()==3
    results.append({'packagedFileProtocol':True})
    browser.close()
(OUT/'results.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
print(json.dumps(results))
