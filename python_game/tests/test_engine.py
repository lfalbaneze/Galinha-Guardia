from __future__ import annotations
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import json
import math
import tempfile
import unittest
from collections import deque
from engine import new_run, Run, SKILLS, BY_ID, restore, load, save
from world import STAGES, WIDTH, HEIGHT, generate, distance, Prop


def begin(seed=47):
    r=new_run(seed);r.choose(r.choices[0]);return r


def skill_run(id):
    for seed in range(1,200):
        r=new_run(seed)
        if id in r.choices:r.choose(id);return r
    raise AssertionError(id)


def boss_run(stage=4):
    r=Run(91,91,stage=stage,skills={'boots':2,'heart':2,'shield':1},level=5,hp=5)
    r.begin_stage();return r


def clear_regular(r):
    r.enemies=[]
    for f in r.friends:
        r.player.x,r.player.y=f.pos;r.tick(.01)
    r.player.x,r.player.y=r.layout.exit;r.tick(.01)

class WorldTests(unittest.TestCase):
    def test_campaign(self):
        self.assertEqual(len(STAGES),10)
        self.assertEqual([(i+1,s.boss) for i,s in enumerate(STAGES) if s.boss],[(5,'panto'),(10,'baltazar')])
        self.assertEqual(sum(s.friends for s in STAGES),33)

    def test_250_maps_have_required_counts_and_safe_spawns(self):
        for seed in range(25):
            for stage,cfg in enumerate(STAGES):
                with self.subTest(seed=seed,stage=stage):
                    m=generate(seed,stage)
                    self.assertEqual(len(m.friends),cfg.friends);self.assertEqual(len(m.enemies),cfg.enemies)
                    for p in [m.spawn,m.exit]+[f[2] for f in m.friends]+[e[1] for e in m.enemies]+([m.boss] if m.boss else []):
                        self.assertTrue(m.clear(p,24))
                    self.assertTrue(all(distance(m.spawn,e[1])>=550 for e in m.enemies))
                    self.assertTrue(all(m.line_clear(a,b,24) for a,b in m.roads))

    def test_same_seed_and_stage_reproduce_geometry(self):
        for i in range(10):
            a,b=generate(729,i),generate(729,i)
            self.assertEqual(a,b)
            self.assertNotEqual(a.props,generate(730,i).props)

    def test_route_finder_connects_spawn_to_every_goal(self):
        for seed in (1,91,421):
            for stage in range(10):
                m=generate(seed,stage)
                for target in [m.exit]+[f[2] for f in m.friends]+([m.boss] if m.boss else []):
                    route=m.route(m.spawn,target,19)
                    self.assertTrue(route,(seed,stage,target))
                    prev=m.spawn
                    for p in route:
                        self.assertTrue(m.line_clear(prev,p,19));prev=p
                    self.assertEqual(route[-1],target)

    def test_independent_sampled_floor_connectivity(self):
        # Independent grid flood-fill does not call the production route finder.
        for seed in (41,618):
            for stage in range(10):
                m=generate(seed,stage)
                nodes={(x,y) for x in range(64,WIDTH-63,32) for y in range(64,HEIGHT-63,32) if m.clear((x,y),20)}
                nearest=lambda p:min(nodes,key=lambda n:distance(n,p))
                start=nearest(m.spawn);seen={start};q=deque([start])
                while q:
                    x,y=q.popleft()
                    for n in [(x-32,y),(x+32,y),(x,y-32),(x,y+32)]:
                        if n in nodes and n not in seen and m.clear(((x+n[0])/2,(y+n[1])/2),20):seen.add(n);q.append(n)
                for target in [m.exit]+[f[2] for f in m.friends]:self.assertIn(nearest(target),seen)

    def test_invalid_stages(self):
        for n in (-1,10,1.5,True):
            with self.assertRaises(ValueError):generate(10,n)

class CampaignTests(unittest.TestCase):
    def test_seeded_unique_drafts_and_one_reroll(self):
        for seed in range(100):
            r=new_run(seed);copy=new_run(seed)
            self.assertEqual(r.choices,copy.choices);self.assertEqual(len(set(r.choices)),3)
            before=set(r.choices);self.assertTrue(r.reroll());self.assertNotEqual(before,set(r.choices))
            self.assertFalse(r.reroll());self.assertEqual(r.level,0)
            self.assertFalse(r.choose('hacked'));id=r.choices[0]
            self.assertTrue(r.choose(id));self.assertFalse(r.choose(id))

    def test_card_rng_does_not_change_maps(self):
        r=new_run(93);s=new_run(93);s.reroll();r.choose(r.choices[0]);s.choose(s.choices[0])
        self.assertEqual(r.layout,s.layout)

    def test_full_campaign_state_progression_and_skill_caps(self):
        for seed in range(12):
            r=new_run(seed)
            for stage in range(10):
                self.assertEqual(r.stage,stage);self.assertEqual(r.phase,'draft')
                self.assertEqual(len(r.choices),3)
                self.assertTrue(all(r.skills.get(k,0)<BY_ID[k].maximum for k in r.choices))
                r.choose(r.choices[0])
                if r.boss:
                    for _ in range(r.boss.maximum):
                        r.boss.mode='stunned';r.player.x,r.player.y=r.boss.pos
                        self.assertTrue(r.interact())
                    if stage==4:
                        self.assertEqual(r.phase,'playing');r.player.x,r.player.y=r.layout.exit;r.tick(.01)
                else:clear_regular(r)
            self.assertEqual(r.phase,'won');self.assertEqual(r.total_rescued,33)
            self.assertEqual(r.bosses,2);self.assertEqual(r.level,10)

    def test_locked_gate(self):
        r=begin();r.player.x,r.player.y=r.layout.exit;r.tick(.01)
        self.assertEqual(r.stage,0);self.assertFalse(r.exit_ready)

    def test_movement_is_normalized_and_boots_apply(self):
        r=skill_run('boots');r.enemies=[];r.layout.props=[];r.player.x,r.player.y=800,528
        r.tick(.05,1,0);speed=r.player.x-800
        self.assertGreater(speed,205*.05)
        r.player.x,r.player.y=800,528;r.tick(.05,1,1)
        self.assertAlmostEqual(distance(r.player.pos,(800,528)),speed)

    def test_rescued_friends_follow_actual_player_trail(self):
        r=begin();r.enemies=[];r.layout.props=[]
        f=r.friends[0];r.player.x,r.player.y=f.pos;r.tick(.01)
        self.assertTrue(f.rescued);old=f.pos
        for _ in range(100):r.tick(1/60,1,0)
        self.assertNotEqual(f.pos,old);self.assertTrue(f.moving);self.assertGreater(f.travel,0)

    def test_dash_collision_and_cooldown(self):
        r=skill_run('dash');r.enemies=[];r.layout.props=[Prop(850,528,'hay',60,30)]
        r.player.x,r.player.y=790,528
        self.assertTrue(r.dash(1,0));self.assertFalse(r.dash(1,0))
        for _ in range(30):r.tick(1/60)
        self.assertLess(r.player.x,850-30-r.player.radius+.01)
        self.assertTrue(r.layout.clear(r.player.pos,r.player.radius))
        self.assertLess(r.player.dash_cooldown,3.6)

    def test_shield_invulnerability_and_defeat(self):
        r=skill_run('shield');p=r.player;p.invulnerable=0
        self.assertTrue(r.hurt());self.assertEqual(r.hp,3);self.assertFalse(p.shield)
        self.assertFalse(r.hurt());p.invulnerable=0;r.hp=1;r.hurt()
        self.assertEqual(r.phase,'lost');self.assertEqual(r.hp,0);self.assertFalse(r.dash())

    def test_heart_medicine_and_healing(self):
        r=skill_run('heart');self.assertEqual(r.max_hp,4);self.assertEqual(r.hp,4)
        r.skills['medicine']=1;r.skills['recovery']=1;r.hp=1;r.enemies=[]
        for f in r.friends:r.player.x,r.player.y=f.pos;r.tick(.01)
        self.assertEqual(r.hp,2)
        r.player.x,r.player.y=r.layout.exit;r.tick(.01)
        self.assertEqual(r.hp,4)

    def test_lure_requires_card_and_expires(self):
        r=skill_run('corn');self.assertTrue(r.lure());self.assertFalse(r.lure())
        r.enemies=[]
        for _ in range(301):r.tick(1/60)
        self.assertIsNone(r.decoy)
        self.assertFalse(skill_run('boots').lure())

    def test_contacts_do_not_go_through_obstacles(self):
        r=begin();r.enemies=[];r.skills['call']=2
        r.layout.props=[Prop(800,528,'hay',40,18)]
        f=r.friends[0];f.x,f.y=833,528;r.player.x,r.player.y=767,528
        r.tick(.01);self.assertFalse(f.rescued)

    def test_boss_warns_and_locks_aim(self):
        r=boss_run();r.tick(.05)
        for _ in range(110):r.tick(1/60)
        self.assertEqual(r.boss.mode,'warning');aim=r.boss.aim
        r.player.y+=80;r.tick(.01);self.assertEqual(r.boss.aim,aim)
        for _ in range(200):
            if r.boss.mode=='stunned':break
            r.tick(1/60)
        self.assertEqual(r.boss.mode,'stunned')

    def test_boss_counter_distance_and_one_per_opening(self):
        r=boss_run();b=r.boss
        self.assertFalse(r.interact());b.mode='stunned';self.assertFalse(r.interact())
        r.player.x,r.player.y=b.pos;self.assertTrue(r.interact());self.assertFalse(r.interact())
        self.assertEqual(b.health,2)

    def test_final_boss_two_charges_have_separate_warnings(self):
        r=boss_run(9);b=r.boss;b.health=3;b.timer=0;r.tick(.01)
        self.assertEqual(b.mode,'warning');self.assertEqual(b.combo,1)
        b.mode='charge';b.timer=0;r.tick(.01)
        self.assertEqual(b.mode,'warning');self.assertEqual(b.combo,0)
        self.assertIn('SEGUNDO',r.notice)
        b.mode='charge';b.timer=0;r.tick(.01);self.assertEqual(b.mode,'stunned')

    def test_pause_and_invalid_dt_freeze(self):
        r=boss_run();r.paused=True;before=repr(r)
        for dt in (.01,0,-2,float('nan'),float('inf')):r.tick(dt,1,0)
        self.assertEqual(repr(r),before);self.assertFalse(r.interact());self.assertFalse(r.dash())
        r.paused=False;before=repr(r)
        for dt in (0,-2,float('nan'),float('inf')):r.tick(dt,1,0)
        self.assertEqual(repr(r),before)

class SaveTests(unittest.TestCase):
    def test_round_trip_draft_and_playing(self):
        r=new_run(875);r.reroll();s=restore(r.checkpoint())
        self.assertEqual(r.choices,s.choices);self.assertEqual(s.rerolls,0)
        r.choose(r.choices[0]);s=restore(r.checkpoint())
        self.assertEqual(r.layout,s.layout);self.assertEqual(r.skills,s.skills)
        old=s.player.pos;r.player.x+=15
        self.assertEqual(restore(r.checkpoint()).player.pos,old)

    def test_corrupt_or_cross_game_checkpoints_are_refused(self):
        good=begin().checkpoint()
        bad=[None,{},[],dict(good,version=99),dict(good,map_version=23),dict(good,phase='won'),
             dict(good,stage=10),dict(good,hp=float('inf')),dict(good,skills={'hacked':1}),
             dict(good,level=200),dict(good,seed=True),dict(good,elapsed=-2),dict(good,choices=['heart'])]
        for data in bad:self.assertIsNone(restore(data))

    def test_atomic_save_uses_only_own_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'python.json';other=Path(tmp)/'classic.json';other.write_text('untouched')
            r=begin();self.assertTrue(save(r,path));self.assertIsNotNone(load(path))
            r.phase='lost';save(r,path);self.assertFalse(path.exists());self.assertEqual(other.read_text(),'untouched')
            path.write_text('{broken');self.assertIsNone(load(path))

if __name__=='__main__':unittest.main()
