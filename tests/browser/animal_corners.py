"""Regression: unrescued animals stop at pen corners instead of ping-ponging."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
from game_ui import READY

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'.cache/animal-corners'
OUT.mkdir(parents=True,exist_ok=True)
assert (ROOT/'systems/rescue-system.js').read_bytes()==(ROOT/'dist/systems/rescue-system.js').read_bytes()
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome')
    page=browser.new_page(viewport={'width':1280,'height':900})
    page.add_init_script('window.requestAnimationFrame=()=>0;')
    page.goto((ROOT/'dist/index.html').as_uri(),wait_until='load')
    page.wait_for_function(READY,polling=50)
    results=page.evaluate("""() => {
      const results=[];
      for(const mode of ['easy','normal','hard'])for(const hz of [30,60,144])
      for(const quiet of [false,true])
      for(const species of ['sheep','rabbit','cow'])for(const [sx,sy] of [[1,1],[-1,1],[1,-1],[-1,-1]]){
        difficultySelect.value=mode;resetGame(814237);
        const a=state.entities.animals[0],c=state.entities.chicken;
        state.entities.animals=[a];state.entities.chicks=[];state.entities.foxes=[];state.entities.owls=[];
        state.entities.goose=undefined;state.entities.folklore=[];state.folkloreThreats=[];
        Object.assign(WORLD.areas[0],{x:800,y:500,w:700,h:700});
        WORLD.layout.animalSpawns=[{x:1100,y:800,areaId:a.areaId}];
        OBSTACLES=[{x:980,y:680,w:20,h:240,type:'fence'},{x:1200,y:680,w:20,h:240,type:'fence'},
          {x:980,y:680,w:240,h:20,type:'fence'},{x:980,y:900,w:240,h:20,type:'fence'}];
        Object.assign(a,{species,x:1100+sx*60,y:800+sy*50,targetX:1100+sx*60,targetY:800+sy*50,
          restTime:0,fatigue:0,wanderTime:99,direction:'down'});
        Object.assign(c,{x:1100,y:800,vx:100,vy:0,hidden:quiet,sneaking:false,sprinting:false,skin:'classic'});
        state.entities.wolf.huntUnlockTimer=999;camera.x=800;camera.y=600;
        let reversals=0,rapidReversals=0,lastReversal=-Infinity,previous=null,tired=false,clear=true,maxStep=0;
        for(let frame=0;frame<hz*8;frame++){
          const old={x:a.x,y:a.y};RescueSystem.update(state,1/hz);
          const v={x:a.x-old.x,y:a.y-old.y};
          if(previous&&Math.hypot(v.x,v.y)>.1&&Math.hypot(previous.x,previous.y)>.1&&v.x*previous.x+v.y*previous.y<0){
            reversals++;if(frame-lastReversal<hz*.3)rapidReversals++;lastReversal=frame;
          }
          previous=v;tired||=a.temper==='tired';maxStep=Math.max(maxStep,Math.hypot(v.x,v.y));
          const foot=getHitbox(a);
          clear&&=OBSTACLES.every(o=>Math.hypot(foot.x-clamp(foot.x,o.x,o.x+o.w),foot.y-clamp(foot.y,o.y,o.y+o.h))>=foot.r-.001);
        }
        const unrescued=!a.rescued;
        Object.assign(c,{x:a.x,y:a.y,vx:0,hidden:false});RescueSystem.update(state,0);
        results.push({mode,hz,species,sx,sy,quiet,reversals,rapidReversals,tired,clear,maxStep,unrescued,rescuable:a.rescued});
      }
      return results;
    }""")
    for case in results:
        assert case['rapidReversals']==0,case
        if not case['quiet']:
            assert case['reversals']<=2 and case['tired'],case
        assert case['clear'] and case['unrescued'] and case['rescuable'],case
        assert case['maxStep']<=case['hz']**-1*400+.001,case
    print(json.dumps({'cases':len(results),'maximumFleeReversals':max(r['reversals'] for r in results if not r['quiet']),
        'rapidWanderReversals':max(r['rapidReversals'] for r in results if r['quiet']),
        'allStoppedSafely':True,'allTiredAndRescuable':True}),flush=True)
    (OUT/'report.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
    browser.close()
