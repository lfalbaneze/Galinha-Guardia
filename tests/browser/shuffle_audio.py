"""Real media playback from the nested roguelike page, over HTTP and file://."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import sys
from playwright.sync_api import sync_playwright

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parents[2]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (ConnectionResetError, BrokenPipeError):
            pass  # Switching scores cancels the previous media download.


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', args=['--allow-file-access-from-files'])
        for base in [f'http://127.0.0.1:{server.server_port}/', ROOT.as_uri() + '/']:
            page = browser.new_page(viewport={'width': 390, 'height': 844})
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.add_init_script('''
                window.media = []; window.plays = [];
                const NativeAudio = window.Audio;
                window.Audio = function(src) {
                    const audio = new NativeAudio(src); media.push(audio);
                    const pause=audio.pause.bind(audio); audio.pauseCount=0;
                    audio.pause=()=>{audio.pauseCount++;pause();};
                    audio.addEventListener('playing', () => plays.push(audio.src));
                    return audio;
                };
            ''')
            page.goto(base + 'shuffle/index.html#survival')
            page.wait_for_function('ShuffleDemo.ready && ShuffleDemo.run?.mode === "survival"')
            assert page.evaluate('media.length') == 0, 'No autoplay before a gesture'
            page.locator('#audioMute').click()
            page.wait_for_function('media.some(a => a.loop && !a.paused && a.currentTime > .1 && a.volume > 0)')
            assert page.locator('#audioMute').inner_text() == 'Silenciar'
            page.evaluate('''() => {
                const r=ShuffleDemo.run; r.spawnTimer=999; r.enemies=[];
                r.heroCooldown=999; r.powers={}; r.pickups=[];
            }''')
            # One actual music element switches all scores and crosses each loop splice.
            for skin, track in [('classic', 'forest'), ('classic', 'whistle'), ('punk', 'skin-punk'),
                                ('astronaut', 'skin-astronaut'), ('robocop', 'skin-robocop'), ('priest', 'skin-priest')]:
                page.evaluate('''([skin,track]) => {
                    ShuffleDemo.run.player.skin=skin;
                    if(!track.startsWith('skin-'))AudioSystem.setTrack(track);
                }''', [skin, track])
                suffix = f'/music/v2/{track}.wav'
                page.wait_for_function('(suffix)=>media.some(a=>a.loop&&a.src.endsWith(suffix)&&!a.paused&&a.currentTime>.1&&a.duration>55)', arg=suffix)
                page.evaluate('''() => {
                    window.musicCheck=media.find(a=>a.loop);
                    musicCheck.currentTime=musicCheck.duration-.15;
                }''')
                page.wait_for_function('musicCheck.currentTime<1 && !musicCheck.paused')
                page.wait_for_function('musicCheck.currentTime>.2 && musicCheck.currentTime<3 && !musicCheck.paused')
            assert page.evaluate('media.filter(a=>a.loop).length') == 1
            page.evaluate("ShuffleDemo.run.player.skin='classic';AudioSystem.setTrack('forest')")
            # Real HTMLAudio decoding through the same queue used by enemy AI.
            for species in ['fuinha', 'mula-sem-cabeca', 'curupira', 'boitata', 'cuca']:
                for event in ['warn', 'attack', 'defeat']:
                    page.wait_for_function('media.filter(a=>!a.loop).every(a=>a.paused)')
                    page.evaluate('''([species,event]) => {
                        const r=ShuffleDemo.run;
                        r.sounds.add({species,event,position:{x:r.player.x+40,y:r.player.y}});
                    }''', [species, event])
                    suffix = f'/folklore-{species}-{event}.wav'
                    page.wait_for_function('(suffix)=>media.some(a=>a.src.endsWith(suffix)&&!a.paused&&a.currentTime>.03&&a.volume>0)', arg=suffix)
            page.wait_for_function('media.filter(a=>!a.loop).every(a=>a.paused)')
            assert page.evaluate('new Set(plays.filter(src=>src.includes("/folklore-v1/"))).size') == 15
            cues={'amanda':['fox-rustle','panto-dodge','runaway'],
                  'crow':['fox-rustle','panto-dodge','squeak'],'owl':['owl-hoot','owl-siren','dizzy']}
            for species,names in cues.items():
                for event,name in zip(['warn','attack','defeat'],names):
                    page.wait_for_function('media.filter(a=>!a.loop).every(a=>a.paused)')
                    page.wait_for_timeout(850)
                    page.evaluate('''([species,event])=>{const r=ShuffleDemo.run;
                        r.sounds.add({species,event,position:{x:r.player.x+40,y:r.player.y}});}''',[species,event])
                    page.wait_for_function('name=>media.some(a=>new RegExp("/"+name+"(?:-2)?\\\\.wav$").test(a.src)&&!a.paused&&a.currentTime>.03&&a.volume>0)',arg=name)
            page.keyboard.press('Space')
            page.wait_for_function('plays.some(src => src.endsWith("/boing.wav"))')
            page.evaluate('''() => {
                const r=ShuffleDemo.run;
                r.pickups.push({x:r.player.x,y:r.player.y,kind:'xp',value:1});
                r.player.invulnerable=0; r.player.dashTime=0; ShuffleRun.hurt(r);
            }''')
            page.wait_for_function('plays.some(src => src.endsWith("/pop.wav")) && plays.some(src => src.includes("/animal-chicken"))')
            page.locator('#pause').click()
            assert page.evaluate('media.every(a => a.paused)'), 'Pause stops all audio'
            count = page.evaluate('plays.length')
            page.wait_for_timeout(200)
            assert page.evaluate('plays.length') == count
            page.locator('#resume').click()
            page.wait_for_function('media.some(a => a.loop && !a.paused)')
            page.locator('#audioMute').click()
            assert page.evaluate('AudioSystem.settings.muted && media.every(a => a.paused)')
            page.locator('#audioMute').click()
            page.wait_for_function('media.some(a => a.loop && !a.paused)')
            # Level-up freezes combat, while the very same music keeps advancing.
            page.evaluate('''() => {
                window.track=media.find(a=>a.loop); window.pauseCount=track.pauseCount;
                const r=ShuffleDemo.run;
                r.pickups=[{x:r.player.x,y:r.player.y,kind:'xp',value:ShuffleSurvival.xpNeeded(r)}];
            }''')
            page.wait_for_function('ShuffleDemo.run.phase === "power-draft"')
            frozen = page.evaluate('ShuffleDemo.run.elapsed')
            music_time = page.evaluate('track.currentTime')
            page.wait_for_function('(time)=>!track.paused && track.currentTime > time + .15', arg=music_time)
            assert page.evaluate('track.pauseCount === pauseCount'), 'No music interruption on level-up'
            assert page.evaluate('ShuffleDemo.run.elapsed') == frozen, 'Draft still freezes combat'
            page.evaluate("window.dispatchEvent(new Event('blur'))")
            page.wait_for_timeout(150)
            assert page.evaluate('media.every(a=>a.paused)'), 'Draft audio stays off while unfocused'
            page.evaluate("window.dispatchEvent(new Event('focus'))")
            page.wait_for_function('!track.paused')
            page.evaluate('pauseCount=track.pauseCount')
            page.wait_for_function('media.filter(a=>!a.loop).every(a=>a.paused)')
            page.evaluate('plays=[]')
            page.locator('#reroll').click()
            page.wait_for_function('plays.some(src=>src.endsWith("/pop.wav"))')
            page.locator('#cards button').first.click()
            page.wait_for_function('plays.some(src=>src.endsWith("/rescue.wav"))')
            assert page.evaluate('track.pauseCount === pauseCount'), 'Card choice keeps music continuous'
            page.evaluate('''() => {
                const r=ShuffleDemo.run;r.powers={egg:3,fireball:3};r.cooldowns={egg:999,fireball:999};
            }''')
            page.locator('#fusionBook').click()
            assert page.evaluate('!track.paused && track.pauseCount === pauseCount')
            page.locator('[data-craft="solar"]').click()
            page.wait_for_function('plays.some(src=>src.endsWith("/panto-victory.wav"))')
            page.wait_for_function('media.filter(a=>!a.loop).every(a=>a.paused)')
            page.evaluate('''() => {
                const r=ShuffleDemo.run;r.fusions=[];r.powers={cross:1};r.cooldowns={};plays=[];
            }''')
            page.wait_for_function('plays.some(src=>src.endsWith("/step-water.wav"))')
            page.evaluate('ShuffleDemo.run.powers={}')
            page.evaluate("window.dispatchEvent(new Event('blur'))")
            assert page.evaluate('ShuffleDemo.run.paused && media.every(a => a.paused)')
            page.locator('#resume').click()
            page.evaluate("window.dispatchEvent(new Event('pagehide'))")
            assert page.evaluate('media.every(a => a.paused)')
            assert page.evaluate('AudioSystem.status.failedClips.length') == 0
            assert page.evaluate('media.every(a => a.src.includes("/assets/audio/") && !a.src.includes("/shuffle/assets/"))')
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Mobile controls fit'

            # A normal campaign start must unlock audio on the card click, too.
            page.goto(base + 'shuffle/index.html')
            page.wait_for_function('ShuffleDemo.ready')
            page.locator('#startRun').click()
            page.wait_for_function('media.some(a => a.loop && !a.paused && a.currentTime > .1)')
            page.locator('#cards button').first.click()
            page.wait_for_function('media.some(a => a.loop && !a.paused && a.currentTime > .1)')
            assert page.evaluate('AudioSystem.status.failedClips.length') == 0
            assert not errors, errors
            print(base.split(':')[0] + ': six music loops, 15 folklore cues, nine new enemy cues, draft/fusion music, power sounds, mute, pause and campaign passed')
            page.close()
        browser.close()
finally:
    server.shutdown()
