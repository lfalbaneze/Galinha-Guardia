"""Locomotion must animate in all eight directions, including reduced motion."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '.cache' / 'shuffle-animation'
OUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', args=['--allow-file-access-from-files'])
    for preference in ['no-preference', 'reduce']:
        page = browser.new_page(reduced_motion=preference, viewport={'width':1280, 'height':900})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto((ROOT / 'shuffle/index.html').as_uri() + '#survival')
        page.wait_for_function('ShuffleDemo.ready && ShuffleDemo.run?.mode === "survival"')
        page.evaluate('''()=>{for(const id of ['fuinha','mula-sem-cabeca','curupira','boitata','cuca']){
            const d=PixelLabArtData[id];if(!d)throw Error('Missing atlas '+id);
            for(const action of ['walk','run'])for(const direction of ['up','upright','right','downright','down','downleft','left','upleft']){
                const pose=d.actions[action][direction];
                if(!pose||pose.frames.length!==(id==='curupira'?8:12)||pose.flip)throw Error('Incomplete authored clip '+id+'/'+action+'/'+direction);
                const f=CharacterArt.frameFor(id,{direction,moving:true,sprinting:action==='run',anim:1});
                if(f.direction!==direction||f.pose!==pose)throw Error('Wrong selected clip '+id+'/'+direction);
            }
        }}''')
        page.evaluate('''()=>{
            const r=ShuffleDemo.run;
            r.layout.obstacles=[];r.obstacles=[];r.enemies=[];r.pickups=[];
            r.spawnTimer=999;r.heroCooldown=999;r.powers={};r.player.invulnerable=999;
            window.gaitFrames={};window.footChecks=0;window.footErrors=[];
            const ink=new Map();
            for(const [id,d] of Object.entries(PixelLabArtData))for(const poses of Object.values(d.actions))
                for(const pose of Object.values(poses))for(const f of pose.frames)
                    ink.set(id+'/'+[f.x,f.y,f.w,f.h].join(','),f.grounding);
            const draw=CanvasRenderingContext2D.prototype.drawImage;
            CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
                if(this.canvas.id==='game' && args.length===8){
                    const id=Object.keys(PixelLabArtData).find(id=>image.src?.endsWith(PixelLabArtData[id].source));
                    if(id){
                        (gaitFrames[id] ||= new Set()).add(args.slice(0,4).join(','));
                        const ground=ink.get(id+'/'+args.slice(0,4).join(','));
                        if(ground&&!['owl','crow'].includes(id)){
                            const actors=[r.player,...r.enemies,...r.friends].filter(a=>{
                                const appearance=CharacterArt.appearances[a.skin];
                                return (appearance?.sprite||appearance?.species||a.species)===id;
                            });
                            const feet=args[5]+ground.bottom*args[7];
                            const error=Math.min(...actors.map(a=>Math.abs(feet-a.y)));
                            footChecks++;if(error>1&&footErrors.length<20)footErrors.push({id,error,feet});
                        }
                    }
                }
                return draw.call(this,image,...args);
            };
        }''')
        # Real input drives the player; real AI drives ordinary and recovered enemies.
        for direction, keys in [('right',['d']),('downright',['d','s']),('down',['s']),
                                ('downleft',['s','a']),('left',['a']),('upleft',['a','w']),
                                ('up',['w']),('upright',['w','d'])]:
            page.evaluate('''()=>{
                const r=ShuffleDemo.run;Object.assign(r.player,{x:650,y:450});
                r.enemies=['wolf','goose','fox','fuinha','mula-sem-cabeca','curupira','boitata','cuca'].map((species,i)=>({species,x:200+i*55,y:220,
                    r:18,speed:80,baseSpeed:80,health:100,dx:1,dy:1,traveled:0,moving:false,
                    route:[],routeTimer:0,routeTarget:null,mode:'hunt',timer:999,age:0,side:1,stun:0}));
                window.gaitFrames={};
            }''')
            for key in keys: page.keyboard.down(key)
            page.wait_for_timeout(500)
            for key in keys: page.keyboard.up(key)
            frames = page.evaluate('Object.fromEntries(Object.entries(gaitFrames).map(([id,frames])=>[id,frames.size]))')
            hero = page.evaluate('(()=>{const a=CharacterArt.appearances[ShuffleDemo.run.player.skin];return a.sprite||a.species})()')
            for species in [hero,'wolf','goose','fox','fuinha','mula-sem-cabeca','curupira','boitata','cuca']:
                assert frames.get(species,0)>2, (preference,direction,species,frames)
        page.screenshot(path=str(OUT / f'{preference}.png'))
        assert page.evaluate('footChecks')>100
        assert page.evaluate('footErrors')==[],page.evaluate('footErrors')
        page.evaluate('''()=>{const r=ShuffleDemo.run;r.player.skin='priest';r.defeatedBoss={species:'goose',name:'Panto, fiscal da colheita'};
            r.phase='stage-clear';r.encounter=0;r.bossesDefeated=1;}''')
        page.locator('.result-quips').wait_for(state='visible')
        assert page.locator('[data-pose="hero-priest-win"]').get_attribute('data-source')==page.evaluate('ShuffleResultArt["hero-priest"].win')
        assert page.locator('[data-pose="enemy-goose-lose"]').get_attribute('data-source')==page.evaluate('ShuffleResultArt["enemy-goose"].lose')
        page.screenshot(path=str(OUT / f'{preference}-result.png'))
        for skin in page.evaluate('Object.keys(CharacterArt.appearances)'):
            for won in [False,True]:
                expected=page.evaluate('''({skin,won})=>{const r=ShuffleDemo.run;r.player.skin=skin;
                    r.defeatedBy=r.defeatedBoss={species:'goose',name:'Panto'};r.phase=won?'won':'lost';
                    return ShuffleResultArt['hero-'+skin][won?'win':'lose'];}''',{'skin':skin,'won':won})
                outcome = 'win' if won else 'lose'
                page.locator(f'.result-quips .banter-row[data-outcome="{outcome}"] [data-source="{expected}"]').wait_for(state='visible')
                assert page.locator('.result-quips canvas').evaluate_all('''cs=>cs.every(c=>c.getContext('2d')
                    .getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0))''')
        assert not errors, errors
        print(f'{preference}: five enemies have real walk/run clips in eight directions; locomotion and eight hero result pairs render from their dedicated poses.')
        page.close()
    browser.close()
