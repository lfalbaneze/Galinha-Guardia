"""Five-minute farm survival, sharing campaign movement, maps and collision rules."""
from dataclasses import dataclass
from math import cos, sin, pi, isfinite
import random

from engine import Actor, Run
from world import distance, point_segment

DURATION = 300
MAX_ENEMIES = 48
POWERS = {
    'cornshot': ('Milho estourado', 'Dispara milho no inimigo mais próximo.'),
    'egg': ('Ovos em roda', 'Lança ovos em todas as direções.'),
    'sickle': ('Foice da colheita', 'Varre os inimigos próximos.'),
    'boots': ('Botas de borracha', 'Aumenta a velocidade de movimento.'),
}
COLORS = {'cornshot': (255, 211, 85), 'egg': (255, 242, 215),
          'sickle': (159, 222, 215), 'boots': (215, 167, 113),
          'milk': (255, 173, 181), 'xp': (124, 232, 162)}


@dataclass
class Enemy(Actor):
    health: float = 2
    speed: float = 110


@dataclass
class Pickup:
    kind: str
    x: float
    y: float
    value: int = 1

    @property
    def pos(self): return self.x, self.y


@dataclass
class Shot:
    kind: str
    x: float
    y: float
    vx: float
    vy: float
    damage: float
    life: float = 1.4


class Survival(Run):
    def __init__(self, seed: int):
        seed = (int(seed) & 0xffffffff) or 1
        self.dice = random.Random(seed ^ 0x51A7)
        super().__init__(seed, seed, stage=self.dice.choice((0, 1, 2, 3, 5, 6, 7, 8)), hp=5, level=1)
        self.begin_stage()
        self.friends = []
        self.enemies = []
        self.powers = {'cornshot': 1}
        self.cooldowns = dict.fromkeys(('cornshot', 'egg', 'sickle'), 0.)
        self.pickups = []
        self.shots = []
        self.kills = 0
        self.xp = 0
        self.spawn_timer = 0.
        self.item_timer = 15.
        # Reserved road segments are connected and wide enough for every actor.
        self.locations = [(a[0]+(b[0]-a[0])*t/8, a[1]+(b[1]-a[1])*t/8)
                          for a, b in self.layout.roads for t in range(9)]
        kinds = list(POWERS) * 2 + ['milk'] * 3
        self.dice.shuffle(kinds)
        near = sorted(self.locations, key=lambda p: distance(p, self.player.pos))
        first = next(p for p in near if distance(p, self.player.pos) >= 90)
        self.pickups.append(Pickup('egg', *first))
        for kind in kinds:
            self.place_item(kind)
        self.say('Sobreviva por 5 minutos. Pegue os itens; os ataques são automáticos!', 7)

    @property
    def max_hp(self): return 5

    @property
    def exit_ready(self): return False

    @property
    def wave(self): return min(10, 1 + int(self.elapsed // 30))

    @property
    def xp_needed(self): return 5 + self.level * 3

    def place_item(self, kind):
        candidates = [p for p in self.locations if distance(p, self.player.pos) > 100
                      and all(distance(p, item.pos) > 70 for item in self.pickups)]
        if candidates:
            self.pickups.append(Pickup(kind, *self.dice.choice(candidates)))

    def steer(self, actor, target, speed, dt):
        super().steer(actor, target, actor.speed if isinstance(actor, Enemy) else speed, dt)

    def spawn_wave(self):
        candidates = [p for p in self.locations if distance(p, self.player.pos) > 520
                      and all(distance(p, e.pos) > 42 for e in self.enemies)]
        self.dice.shuffle(candidates)
        for _ in range(min(2 + self.wave, MAX_ENEMIES-len(self.enemies))):
            if not candidates: break
            pos = candidates.pop()
            species = self.dice.choice(('fox', 'wolf', 'goose'))
            hp, speed = {'fox': (1.5, 142), 'wolf': (3.5, 94), 'goose': (2, 116)}[species]
            self.enemies.append(Enemy(species, *pos, radius=19, health=hp+self.wave*.3,
                                      speed=speed+min(32, self.wave*3), route_timer=self.dice.random()*.65))
            candidates = [p for p in candidates if distance(p, pos) > 42]

    def damage(self, enemy, amount):
        enemy.health -= amount
        self.effect(enemy, 'hurt')
        if enemy.health > 0: return
        self.enemies.remove(enemy)
        self.kills += 1
        # ponytail: cap loose XP at 160; merge into the nearest pickup beyond that.
        gems = [p for p in self.pickups if p.kind == 'xp']
        if len(gems) >= 160:
            min(gems, key=lambda p: distance(p.pos, enemy.pos)).value += 1
        else:
            self.pickups.append(Pickup('xp', *enemy.pos))
        if self.kills % 12 == 0:
            self.place_item(self.dice.choice(list(POWERS)+['milk']))

    def collect(self, item):
        if item.kind == 'xp':
            self.xp += item.value
            while self.xp >= self.xp_needed:
                self.xp -= self.xp_needed
                self.level += 1
                self.hp = min(self.max_hp, self.hp+1)
                self.say(f'Nível {self.level}! Mais dano e um coração recuperado.')
        elif item.kind == 'milk':
            self.hp = min(self.max_hp, self.hp+2)
            self.say('Leite fresquinho: até dois corações recuperados.')
        else:
            rank = self.powers.get(item.kind, 0)
            if rank < 3:
                self.powers[item.kind] = rank+1
                if item.kind == 'boots': self.skills['boots'] = rank+1
                name, description = POWERS[item.kind]
                self.say(f'{name} {rank+1}/3: {description}', 4)
            else:
                self.hp = min(self.max_hp, self.hp+1)
                self.say('Poder no máximo: um coração recuperado.')
        self.effect(self.player, 'rescue')

    def attack(self, dt):
        p = self.player
        for kind in self.cooldowns:
            self.cooldowns[kind] = max(0., self.cooldowns[kind]-dt)
            rank = self.powers.get(kind, 0)
            if not rank or self.cooldowns[kind] > 0: continue
            damage = (1 + .15*(self.level-1)) * (1 + .35*(rank-1))
            if kind == 'cornshot':
                targets = [e for e in self.enemies if distance(p.pos, e.pos) < 520
                           and self.layout.line_clear(p.pos, e.pos, 4)]
                if not targets: continue
                target = min(targets, key=lambda e: distance(p.pos, e.pos))
                length = distance(p.pos, target.pos) or 1
                self.shots.append(Shot(kind, p.x, p.y, (target.x-p.x)/length*440,
                                       (target.y-p.y)/length*440, damage*2))
                self.cooldowns[kind] = .7-.12*(rank-1)
            elif kind == 'egg':
                for i in range(6+rank*2):
                    angle = i*2*pi/(6+rank*2)
                    self.shots.append(Shot(kind, p.x, p.y, cos(angle)*270, sin(angle)*270, damage*1.5))
                self.cooldowns[kind] = 3.2-.4*rank
            else:
                radius = 76+rank*18
                for enemy in list(self.enemies):
                    if distance(p.pos, enemy.pos) <= radius+enemy.radius and self.layout.line_clear(p.pos, enemy.pos, 0):
                        self.damage(enemy, damage*2)
                self.effects.append(dict(x=p.x, y=p.y, kind='sickle', time=.55, radius=radius))
                self.cooldowns[kind] = 2.2-.3*rank
        for shot in list(self.shots):
            old = shot.x, shot.y
            shot.x += shot.vx*dt
            shot.y += shot.vy*dt
            shot.life -= dt
            end = shot.x, shot.y
            blocked = not self.layout.line_clear(old, end, 4)
            hit = None
            for enemy in sorted(self.enemies, key=lambda e: distance(old, e.pos)):
                if point_segment(enemy.pos, old, end) <= enemy.radius+5 and self.layout.line_clear(old, enemy.pos, 0):
                    hit = enemy
                    break
            if hit: self.damage(hit, shot.damage)
            if hit or blocked or shot.life <= 0: self.shots.remove(shot)

    def tick(self, dt, x=0., y=0.):
        if self.phase != 'playing' or self.paused or not isfinite(dt) or dt <= 0: return
        dt = min(.05, dt)
        super().tick(dt, x, y)
        if self.phase != 'playing': return
        if self.elapsed >= DURATION:
            self.elapsed = DURATION
            self.phase = 'won'
            self.player.moving = False
            return
        self.spawn_timer -= dt
        if self.spawn_timer <= 0:
            self.spawn_wave()
            self.spawn_timer = max(1.5, 4.2-self.wave*.25)
        self.item_timer -= dt
        if self.item_timer <= 0:
            if sum(p.kind != 'xp' for p in self.pickups) < 12:
                self.place_item(self.dice.choice(list(POWERS)+['milk']))
            self.item_timer = 15
        self.attack(dt)
        for item in list(self.pickups):
            length = distance(item.pos, self.player.pos)
            if not self.layout.line_clear(item.pos, self.player.pos, 0): continue
            if length < 30:
                self.pickups.remove(item)
                self.collect(item)
            elif item.kind == 'xp' and length < 110:
                step = min(length, 320*dt)
                item.x += (self.player.x-item.x)/length*step
                item.y += (self.player.y-item.y)/length*step
