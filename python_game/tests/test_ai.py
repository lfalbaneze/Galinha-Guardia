"""Attack fairness and tactics shared by the native campaign and survival."""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from engine import Enemy, new_run
from world import Prop, distance


class EnemyAITests(unittest.TestCase):
    def arena(self, species='wolf', x=870, y=528):
        run = new_run(614)
        run.choose(run.choices[0])
        run.layout.props = []
        run.friends = []
        run.player.x, run.player.y = 800, 528
        run.player.invulnerable = 0
        run.player.shield = False
        run.enemies = [Enemy(species, x, y, radius=19, home=(x, y))]
        return run, run.enemies[0]

    def test_windup_locks_direction_and_only_strike_hurts(self):
        run, enemy = self.arena(x=825)
        hp = run.hp
        run.update_enemies(.01)
        self.assertEqual(enemy.mode, 'warning')
        self.assertGreaterEqual(enemy.timer, .55)
        self.assertEqual(run.hp, hp)  # Overlap does not inflict instant contact damage.
        aim = enemy.aim
        run.player.y += 50
        run.update_enemies(.1)
        self.assertEqual(enemy.aim, aim)
        run.player.y -= 50
        enemy.timer = 0
        run.update_enemies(.01)
        self.assertEqual(enemy.mode, 'strike')
        run.update_enemies(.01)
        self.assertEqual(run.hp, hp-1)
        self.assertEqual(enemy.mode, 'recover')
        run.player.invulnerable = 0
        run.update_enemies(.05)
        self.assertEqual(run.hp, hp-1)

    def test_sidestep_evades_committed_attack(self):
        run, enemy = self.arena()
        hp = run.hp
        run.update_enemies(.01)
        run.player.y += 90
        for _ in range(40): run.update_enemies(.05)
        self.assertEqual(run.hp, hp)
        self.assertGreater(enemy.cooldown, 0)

    def test_campaign_sight_and_memory_prevent_tracking_through_cover(self):
        run, enemy = self.arena(x=1060)
        self.assertEqual(run.enemy_target(enemy, .01), run.player.pos)
        seen = run.player.pos
        run.layout.props = [Prop(920, 528, 'hay', 80, 45)]
        run.player.x = 740
        self.assertEqual(run.enemy_target(enemy, .1), seen)
        self.assertIsNone(run.enemy_target(enemy, 3.1))
        run.update_enemies(.01)
        self.assertEqual(enemy.mode, 'patrol')

    def test_attack_states_decay_memory_once_and_refresh_visible_observations(self):
        for mode in ('warning', 'strike', 'recover'):
            with self.subTest(mode=mode):
                run, enemy = self.arena(x=1060)
                enemy.target, enemy.alert = run.player.pos, .08
                enemy.mode, enemy.timer, enemy.aim = mode, 1., (-1., 0.)
                run.layout.props = [Prop(920, 528, 'hay', 80, 45)]
                run.update_enemies(.05)
                self.assertAlmostEqual(enemy.alert, .03)
                run.update_enemies(.05)
                self.assertEqual(enemy.alert, 0)
                run.player.x, run.player.y = enemy.x, enemy.y+100
                run.update_enemies(.01)
                self.assertEqual(enemy.alert, 3.)
                self.assertEqual(enemy.target, run.player.pos)
                self.assertEqual(enemy.aim, (-1., 0.))

    def test_visible_lure_distracts_and_a_strike_consumes_it(self):
        run, enemy = self.arena(x=1000)
        run.decoy = 1050, 528, 4
        run.update_enemies(.01)
        self.assertEqual(enemy.mode, 'warning')
        self.assertEqual(enemy.aim, (1., 0.))
        enemy.timer = 0
        run.update_enemies(.01)
        for _ in range(10):run.update_enemies(.05)
        self.assertIsNone(run.decoy)
        self.assertEqual(enemy.mode, 'recover')

    def test_blocked_lure_does_not_hide_a_visible_player(self):
        run, enemy = self.arena(x=1000)
        run.decoy = 1120, 528, 4
        run.layout.props = [Prop(1060, 528, 'hay', 60, 22)]
        self.assertEqual(run.enemy_target(enemy, .01), run.player.pos)

    def test_attack_slots_leave_reaction_time_in_a_crowd(self):
        run, enemy = self.arena()
        run.enemies += [Enemy('fox', 800, 600), Enemy('wolf', 740, 528)]
        run.update_enemies(.01)
        self.assertEqual(sum(e.mode == 'warning' for e in run.enemies), 1)
        run.stage = 6
        run.update_enemies(.01)
        self.assertEqual(sum(e.mode == 'warning' for e in run.enemies), 2)

    def test_predators_use_distinct_flanking_and_intercept_targets(self):
        for species in ('fox', 'wolf'):
            run, enemy = self.arena(species, x=1050)
            run.player.moving = True
            run.player.dx, run.player.dy = 0, 1
            with patch.object(run, 'steer') as steer:
                run.update_enemies(.01)
            target = steer.call_args.args[1]
            self.assertGreater(target[1], run.player.y)
            if species == 'wolf':self.assertEqual(target[0], run.player.x)

    def test_goose_telegraphs_a_longer_charge(self):
        run, enemy = self.arena('goose', x=950)
        run.update_enemies(.01)
        self.assertEqual(enemy.mode, 'warning')
        self.assertGreater(enemy.strike_speed*enemy.strike_time, 130)

    def test_strike_stops_at_obstacles_and_does_not_hit_through_them(self):
        run, enemy = self.arena('goose', x=900)
        run.layout.props = [Prop(850, 528, 'hay', 60, 20)]
        enemy.mode, enemy.timer, enemy.aim = 'strike', .48, (-1, 0)
        hp = run.hp
        for _ in range(12):run.update_enemies(.05)
        self.assertEqual(run.hp, hp)
        self.assertEqual(enemy.mode, 'recover')
        self.assertTrue(run.layout.clear(enemy.pos, enemy.radius))

    def test_cover_behind_player_does_not_prevent_a_visible_attack(self):
        run, enemy = self.arena()
        run.layout.props = [Prop(763, 528, 'hay', 60, 22)]
        self.assertTrue(run.layout.clear(run.player.pos, run.player.radius))
        self.assertFalse(run.layout.clear(run.player.pos, enemy.radius))
        run.update_enemies(.01)
        self.assertEqual(enemy.mode, 'warning')

    def test_strike_cannot_outlast_its_telegraphed_distance(self):
        run, enemy = self.arena(x=1100)
        enemy.mode, enemy.timer, enemy.aim = 'strike', .02, (1., 0.)
        old = enemy.pos
        run.update_enemies(.05)
        self.assertAlmostEqual(distance(old, enemy.pos), enemy.strike_speed*.02)
        self.assertEqual(enemy.mode, 'recover')

    def test_overlapping_enemies_separate_without_teleporting(self):
        run, enemy = self.arena(x=1100)
        other = Enemy('wolf', *enemy.pos, radius=19)
        run.enemies.append(other)
        old = enemy.pos
        run.update_enemies(.05)
        self.assertGreater(distance(enemy.pos, other.pos), .1)
        self.assertLessEqual(distance(enemy.pos, old), enemy.speed*.05+.01)
        self.assertEqual((enemy.dx, enemy.dy), (enemy.x-old[0], enemy.y-old[1]))

    def test_stride_counts_net_motion_when_separation_opposes_pursuit(self):
        run, enemy = self.arena(x=1100)
        run.enemies.append(Enemy('wolf', 1080, enemy.y, radius=19))
        old = enemy.pos
        enemy.travel = 17.
        run.update_enemies(.05)
        self.assertLess(enemy.x, old[0])
        self.assertAlmostEqual(enemy.travel-17., distance(enemy.pos, old))

    def test_unreachable_route_retries_are_throttled(self):
        run, enemy = self.arena(x=1100)
        run.layout.props = [Prop(920, 528, 'hay', 80, 45)]
        with patch.object(run.layout, 'route', return_value=[]) as route:
            for _ in range(10):run.steer(enemy, run.player.pos, 0, .05)
        self.assertEqual(route.call_count, 1)


if __name__ == '__main__': unittest.main()
