"""Determinism, collision and a complete accelerated survival simulation."""
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from survival import Survival, Enemy, Pickup, Shot, POWERS, MAX_ENEMIES, DURATION
from world import Prop, distance


class SurvivalTests(unittest.TestCase):
    def arena(self):
        run = Survival(614)
        run.layout.props = []
        run.player.x, run.player.y = 800, 528
        run.enemies = []
        run.pickups = []
        run.spawn_timer = 999
        return run

    def test_seeded_reachable_items_and_safe_waves(self):
        layouts = set()
        for seed in range(20):
            run, copy = Survival(seed), Survival(seed)
            self.assertEqual(run.layout, copy.layout)
            self.assertEqual(run.pickups, copy.pickups)
            layouts.add(run.stage)
            self.assertTrue(all(run.layout.clear(p.pos, 24) for p in run.pickups))
            self.assertTrue(all(any(run.layout.line_clear(p.pos, a, 24) for a,b in run.layout.roads)
                                for p in run.pickups))
            self.assertTrue(any(distance(p.pos, run.player.pos) < 170 for p in run.pickups))
            run.spawn_wave(); copy.spawn_wave()
            self.assertEqual(run.enemies, copy.enemies)
            self.assertTrue(all(distance(e.pos, run.player.pos) > 520 for e in run.enemies))
            self.assertTrue(all(run.layout.clear(e.pos, e.radius) for e in run.enemies))
        self.assertGreater(len(layouts), 3)

    def test_pickup_upgrades_healing_xp_and_caps(self):
        run = self.arena()
        for kind in POWERS:
            for _ in range(5):
                run.pickups.append(Pickup(kind, *run.player.pos)); run.tick(.01)
            self.assertEqual(run.powers[kind], 3)
        self.assertGreater(run.speed, 205)
        run.hp = 1; run.pickups.append(Pickup('milk', *run.player.pos)); run.tick(.01)
        self.assertEqual(run.hp, 3)
        run.pickups.append(Pickup('xp', *run.player.pos, value=run.xp_needed)); run.tick(.01)
        self.assertEqual((run.level, run.xp, run.hp), (2, 0, 4))

    def test_auto_weapons_damage_and_drop_xp(self):
        for kind in ('cornshot', 'egg', 'sickle'):
            run = self.arena(); run.powers = {kind: 1}
            run.enemies = [Enemy('fox', 865, 528, health=1, speed=0)]
            for _ in range(60): run.tick(1/60)
            self.assertEqual(run.kills, 1, kind)
            self.assertFalse(run.enemies)
            self.assertGreater(run.xp + sum(p.value for p in run.pickups if p.kind=='xp'), 0)

    def test_obstacles_block_attacks_and_collection(self):
        run = self.arena(); run.player.x = 760
        run.layout.props = [Prop(800, 528, 'hay', 40, 18)]
        run.powers = dict.fromkeys(('cornshot', 'egg', 'sickle'), 3)
        enemy = Enemy('fox', 840, 528, health=20)
        run.enemies = [enemy]
        run.shots = [Shot('cornshot', 777, 528, 440, 0, 5)]
        for _ in range(60): run.attack(1/60)
        self.assertEqual(enemy.health, 20)
        run.pickups = [Pickup('egg', 840, 528)]
        run.tick(.01)
        self.assertEqual(len([p for p in run.pickups if p.kind=='egg']), 1)

    def test_pause_defeat_victory_and_gate(self):
        run = self.arena(); run.paused = True; before = repr(run)
        for dt in (.05, float('nan'), float('inf'), -1): run.tick(dt, 1, 1)
        self.assertEqual(repr(run), before)
        self.assertFalse(run.shots)
        run.paused = False
        run.player.x, run.player.y = run.layout.exit
        stage = run.stage; run.tick(.01)
        self.assertEqual(run.stage, stage); self.assertEqual(run.phase, 'playing')
        run.hp = 1; run.player.invulnerable = 0; run.hurt()
        self.assertEqual(run.phase, 'lost')
        run = self.arena(); run.elapsed = DURATION-.01; run.tick(.02)
        self.assertEqual(run.phase, 'won'); self.assertEqual(run.wave, 10)

    def test_full_round_has_moving_enemies_bounded_entities_and_waves(self):
        run = Survival(614)
        run.powers = dict.fromkeys(('cornshot', 'egg', 'sickle'), 3)
        run.player.invulnerable = DURATION+1  # Fixture exercises five minutes, not human balance.
        max_count = 0
        moving = False
        for _ in range(DURATION*20+1):
            run.tick(.05)
            max_count = max(max_count, len(run.enemies))
            moving |= any(e.travel > 50 for e in run.enemies)
            self.assertLessEqual(len(run.enemies), MAX_ENEMIES)
            self.assertLessEqual(sum(p.kind=='xp' for p in run.pickups), 160)
        self.assertTrue(moving)
        self.assertGreater(max_count, 8)
        self.assertGreater(run.kills, 10)
        self.assertEqual(run.phase, 'won')


if __name__ == '__main__': unittest.main()
