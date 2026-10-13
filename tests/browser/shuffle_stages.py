"""Review all survival arenas and observe the new enemies' actual movement clips."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
import os
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'.cache'/'shuffle-stages-review'
OUT.mkdir(parents=True,exist_ok=True)
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='chrome',args=['--allow-file-access-from-files'])
        folder=ROOT/'dist' if os.environ.get('CHECK_DIST') else ROOT
        prefix='dist/' if folder!=ROOT else ''
        results=[]
        for transport,url in [('http',f'http://127.0.0.1:{server.server_port}/{prefix}shuffle/index.html#survival'),
                              ('file',(folder/'shuffle/index.html').as_uri()+'#survival')]:
            page=browser.new_page(viewport={'width':1280,'height':1100})
            errors=[]
            page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto(url,wait_until='networkidle')
            page.wait_for_function('ShuffleDemo.ready && ShuffleDemo.run?.mode==="survival"')
            layouts=[]
            stage_count=page.evaluate('ShuffleSurvival.STAGES.length')
            for stage in range(stage_count):
                page.evaluate('''()=>{const r=ShuffleDemo.run;r.elapsed=240;r.spawnTimer=0;
                    r.player.invulnerable=999;r.heroCooldown=999;r.powers={};r.pickups=[];
                    ShuffleSurvival.tick(r,.01);r.spawnTimer=999;
                    r.player.x=560;r.player.y=360;r.paused=false;r.enemies.forEach(e=>e.stun=999);}''')
                page.wait_for_timeout(150)
                details=page.evaluate('''()=>{const r=ShuffleDemo.run;return{theme:r.layout.theme,
                    name:ShuffleSurvival.STAGES[r.encounter].name,count:r.enemies.length,
                    roster:[...new Set(r.enemies.map(e=>e.species))],roads:JSON.stringify(r.layout.roads)};}''')
                assert details['count']>=4+stage,details
                assert f'FASE {stage+1} / {stage_count}' in page.locator('#stageLabel').inner_text()
                page.screenshot(path=str(OUT/f'{prefix.replace("/", "") or "source"}-{transport}-phase-{stage+1}.png'))
                layouts.append(details)
                if stage<stage_count-1:
                    page.evaluate('''()=>{const r=ShuffleDemo.run;r.paused=false;r.phase='stage-clear';
                        r.defeatedBoss={species:ShuffleSurvival.STAGES[r.encounter].boss,name:'Chefe'};
                        r.bossesDefeated=r.encounter+1;}''')
                    page.locator('#nextStage').click()
            assert len({l['theme'] for l in layouts})==len({l['roads'] for l in layouts})==stage_count
            page.evaluate('''()=>{const r=ShuffleDemo.run;r.paused=false;r.enemies=[];r.pickups=[];
                r.obstacles=[];r.layout.obstacles=[];r.spawnTimer=999;r.heroCooldown=999;r.powers={};
                window.clips={};const lookup=new Map();
                for(const id of ['amanda','crow','owl'])for(const [direction,pose]of Object.entries(
                    PixelLabArtData[id].actions[id==='owl'?'fly':'walk']))pose.frames.forEach((f,i)=>
                        lookup.set(id+'/'+[f.x,f.y,f.w,f.h].join(','),{key:id+'/'+direction,index:i}));
                const draw=CanvasRenderingContext2D.prototype.drawImage;
                CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
                    if(this.canvas.id==='game'&&args.length===8){
                        const id=['amanda','crow','owl'].find(id=>image.src?.endsWith(PixelLabArtData[id].source));
                        const clip=lookup.get(id+'/'+args.slice(0,4).join(','));
                        if(clip)(clips[clip.key]||=new Set()).add(clip.index);
                    }return draw.call(this,image,...args);};}''')
            for direction,(dx,dy) in {'right':(1,0),'downright':(.707,.707),'down':(0,1),
                    'downleft':(-.707,.707),'left':(-1,0),'upleft':(-.707,-.707),
                    'up':(0,-1),'upright':(.707,-.707)}.items():
                for species in ['amanda','crow','owl']:
                    page.evaluate('''({dx,dy,species})=>{const r=ShuffleDemo.run,t=ShuffleSurvival.ENEMIES[species];
                        Object.assign(r.player,{x:560+dx*310,y:360+dy*310});
                        r.enemies=[{species,x:560,y:360,r:t.r,health:99,maxHealth:99,speed:t.speed,
                            baseSpeed:t.speed,mode:'hunt',timer:999,age:0,side:1,route:[],routeTimer:0,
                            routeTarget:null,dx,dy,traveled:0,moving:false}];}''',{'dx':dx,'dy':dy,'species':species})
                    page.wait_for_timeout(500)
                    count=page.evaluate('key=>clips[key]?.size||0',species+'/'+direction)
                    assert count>1,(transport,species,direction,count,page.evaluate('({phase:ShuffleDemo.run.phase,paused:ShuffleDemo.run.paused,e:ShuffleDemo.run.enemies,clips:Object.keys(clips)})'))
            assert not errors,errors
            results.append({'transport':transport,'stages':layouts,'threeEnemiesEightDirections':True})
            page.close()
        browser.close()
        (OUT/f'{prefix.replace("/", "") or "source"}-results.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
        print(json.dumps([{'transport':r['transport'],'stages':[s['name'] for s in r['stages']],
            'threeEnemiesEightDirections':r['threeEnemiesEightDirections']} for r in results]))
finally:
    server.shutdown();server.server_close()
