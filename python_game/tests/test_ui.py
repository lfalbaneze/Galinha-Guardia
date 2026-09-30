"""SDL event/render checks. These are automated fixtures, not claims of human playtesting."""
import os
os.environ['SDL_VIDEODRIVER']='dummy'
os.environ['SDL_AUDIODRIVER']='dummy'
os.environ['PYGAME_HIDE_SUPPORT_PROMPT']='1'
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import tempfile
import unittest
import pygame as pg
from main import App
from engine import Run,SKILLS
from world import STAGES
from survival import Survival, POWERS

class InterfaceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp=tempfile.TemporaryDirectory()
        cls.app=App(Path(cls.tmp.name)/'checkpoint.json')
    @classmethod
    def tearDownClass(cls):
        pg.quit();cls.tmp.cleanup()

    def test_keyboard_choice_movement_pause_and_resume(self):
        a=self.app;a.start(614);a.draw()
        a.event(pg.event.Event(pg.KEYDOWN,key=pg.K_1))
        self.assertEqual(a.run.phase,'playing')
        p=a.run.player;before=p.pos
        key=pg.K_d if p.x<800 else pg.K_a
        a.event(pg.event.Event(pg.KEYDOWN,key=key))
        for _ in range(20):a.update(1/60)
        a.event(pg.event.Event(pg.KEYUP,key=key));self.assertNotEqual(p.pos,before)
        a.event(pg.event.Event(pg.KEYDOWN,key=pg.K_ESCAPE));before=p.pos
        for _ in range(10):a.update(1/60)
        self.assertTrue(a.run.paused);self.assertEqual(p.pos,before)
        a.event(pg.event.Event(pg.KEYDOWN,key=pg.K_ESCAPE));self.assertFalse(a.run.paused)
        a.event(pg.event.Event(pg.WINDOWFOCUSLOST));self.assertTrue(a.run.paused)

    def test_mouse_choice_after_window_resize(self):
        a=self.app;a.start(971)
        a.event(pg.event.Event(pg.VIDEORESIZE,w=900,h=720));a.draw()
        rect,command=next(b for b in a.buttons if b[1].startswith('skill:'))
        w,h=a.window.get_size();scale=min(w/1200,h/760)
        point=(rect.centerx*scale+(w-1200*scale)/2,rect.centery*scale+(h-760*scale)/2)
        a.event(pg.event.Event(pg.MOUSEBUTTONUP,button=1,pos=point))
        self.assertEqual(a.run.phase,'playing');self.assertIn(command.split(':')[1],a.run.skills)
        a.event(pg.event.Event(pg.VIDEORESIZE,w=1200,h=760))

    def test_all_ten_stages_and_boss_indicators_render(self):
        a=self.app
        for stage in range(10):
            a.run=Run(614,614,stage=stage);a.run.begin_stage();a.mode='run';a.camera=a.camera_target(a.run)
            a.draw();self.assertEqual(a.surface.get_size(),(1200,760))
            if a.run.boss:
                a.run.warn();a.draw();a.run.boss.mode='stunned';a.draw()
        a.run.phase='lost';a.draw();a.run.phase='won';a.draw()

    def test_original_art_is_loaded_in_eight_directions_without_js_runtime(self):
        a=self.app
        for species in ['chicken','wolf','goose','sheep','pig','rabbit']:
            for direction in ['down','up','left','right','downleft','downright','upleft','upright']:
                self.assertGreaterEqual(len(a.art.frames[species,'walk',direction]),8)
                self.assertGreater(a.art.frames[species,'idle',direction][0][0].get_width(),0)
        for name in ['main.py','art.py','world.py','engine.py']:
            code=(Path(__file__).resolve().parents[1]/name).read_text(encoding='utf-8')
            self.assertNotIn('import subprocess',code)
            self.assertNotIn('webview',code.replace('JavaScript or webview',''))

    def test_survival_menu_events_render_retry_and_campaign_save_isolation(self):
        a=self.app;a.start(614)
        saved=a.save_file.read_bytes()
        a.command('menu');a.draw()
        self.assertTrue(any(command=='survival' for _,command in a.buttons))
        a.event(pg.event.Event(pg.KEYDOWN,key=pg.K_s))
        self.assertIsInstance(a.run,Survival)
        seed=a.run.seed
        a.run.powers=dict.fromkeys(POWERS,3)
        for _ in range(30):a.update(1/60)
        a.draw()
        self.assertTrue(a.run.enemies)
        a.event(pg.event.Event(pg.KEYDOWN,key=pg.K_ESCAPE));a.draw()
        self.assertTrue(a.run.paused)
        a.run.phase='lost';a.persist();a.draw();a.command('retry')
        self.assertIsInstance(a.run,Survival);self.assertEqual(a.run.seed,seed)
        self.assertEqual(a.run.powers,{'cornshot':1})
        a.run.phase='won';a.draw();a.command('new')
        self.assertIsInstance(a.run,Survival)
        a.command('menu');a.command('continue')
        self.assertNotIsInstance(a.run,Survival)
        self.assertEqual(a.save_file.read_bytes(),saved)

if __name__=='__main__':unittest.main()
