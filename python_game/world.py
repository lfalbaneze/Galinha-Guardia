"""Seeded farm layouts and navigation; no dependency on the renderer or card RNG."""
from __future__ import annotations
from dataclasses import dataclass, field
from collections import deque
from math import hypot
import random

WIDTH, HEIGHT, GRID, VERSION = 1600, 1056, 32, 1
Point = tuple[float, float]

@dataclass(frozen=True)
class Stage:
    name: str
    theme: str
    friends: int
    enemies: int
    boss: str = ''

STAGES = (
    Stage('Pomar do susto', 'orchard', 3, 1),
    Stage('Trilhas do milharal', 'harvest', 3, 2),
    Stage('Bosque dos cochichos', 'grove', 4, 2),
    Stage('Campo dos espantalhos', 'field', 4, 2),
    Stage('Panto, fiscal da porteira', 'pond', 0, 0, 'panto'),
    Stage('Colheita em disparada', 'harvest', 4, 3),
    Stage('Pedreira das penas', 'quarry', 5, 3),
    Stage('Pomar ao entardecer', 'sunset', 5, 3),
    Stage('Caminho do último feno', 'dusk', 5, 4),
    Stage('Baltazar, o sem-almoço', 'night', 0, 0, 'baltazar'),
)
FRIENDS = (('sheep', 'Amélia'), ('pig', 'Tonico'), ('rabbit', 'Jay Jay'),
           ('cow', 'Mimosa'), ('duck', 'Quincas'), ('dog', 'Bento'))

def distance(a: Point, b: Point) -> float:
    return hypot(a[0]-b[0], a[1]-b[1])

def point_segment(p: Point, a: Point, b: Point) -> float:
    dx, dy = b[0]-a[0], b[1]-a[1]
    d = dx*dx+dy*dy
    t = max(0., min(1., ((p[0]-a[0])*dx+(p[1]-a[1])*dy)/d)) if d else 0.
    return distance(p, (a[0]+t*dx, a[1]+t*dy))

@dataclass(frozen=True)
class Prop:
    x: float
    y: float  # contact point on the floor, not the top of the picture
    kind: str
    size: int
    radius: float

@dataclass
class Layout:
    seed: int
    stage: int
    spawn: Point
    exit: Point
    roads: list[tuple[Point, Point]]
    friends: list[tuple[str, str, Point]]
    enemies: list[tuple[str, Point]]
    props: list[Prop]
    boss: Point | None
    _graphs: dict = field(default_factory=dict, repr=False, compare=False)

    def clear(self, p: Point, radius: float = 16) -> bool:
        x, y = p
        return (32+radius <= x <= WIDTH-32-radius and 32+radius <= y <= HEIGHT-32-radius
                and all(not o.radius or distance(p, (o.x, o.y)) > radius+o.radius for o in self.props))

    def line_clear(self, a: Point, b: Point, radius: float = 16) -> bool:
        return self.clear(a, radius) and self.clear(b, radius) and all(
            not o.radius or point_segment((o.x, o.y), a, b) > o.radius+radius for o in self.props)

    def route(self, a: Point, b: Point, radius: float = 18) -> list[Point]:
        if self.line_clear(a, b, radius):
            return [b]
        key = int(radius)
        if key not in self._graphs:
            nodes = {(x, y): (float(x*GRID), float(y*GRID))
                     for y in range(2, HEIGHT//GRID-1) for x in range(2, WIDTH//GRID-1)
                     if self.clear((x*GRID, y*GRID), radius+1)}
            edges = {n: [q for q in ((n[0]-1,n[1]),(n[0]+1,n[1]),(n[0],n[1]-1),(n[0],n[1]+1))
                         if q in nodes and self.line_clear(nodes[n], nodes[q], radius)] for n in nodes}
            self._graphs[key] = nodes, edges
        nodes, edges = self._graphs[key]
        def nearest(p: Point):
            for n in sorted(nodes, key=lambda n: distance(nodes[n], p)):
                if self.line_clear(p, nodes[n], radius): return n
            return None
        start, goal = nearest(a), nearest(b)
        if start is None or goal is None: return []
        previous = {start: None}
        queue = deque([start])
        while queue and goal not in previous:
            current = queue.popleft()
            for q in edges[current]:
                if q not in previous:
                    previous[q] = current
                    queue.append(q)
        if goal not in previous: return []
        path, current = [b], goal
        while current is not None:
            path.append(nodes[current])
            current = previous[current]
        path.reverse()
        while len(path)>1 and self.line_clear(a,path[1],radius): path.pop(0)
        return path


def generate(seed: int, stage: int) -> Layout:
    if type(seed) is not int or type(stage) is not int or not 0 <= stage < len(STAGES):
        raise ValueError('Semente ou fase inválida.')
    rnd = random.Random((seed & 0xffffffff) ^ ((stage+1)*0x9e3779b9) ^ VERSION)
    cfg = STAGES[stage]
    side = rnd.randrange(4)
    def edge(s):
        return ((100 if s == 0 else WIDTH-100), rnd.randrange(240, HEIGHT-240)) if s%2 == 0 else (
            rnd.randrange(320, WIDTH-320), 100 if s == 1 else HEIGHT-100)
    spawn, exit_ = edge(side), edge((side+2)%4)
    hub = (rnd.randrange(650, 950), rnd.randrange(410, 640))
    roads: list[tuple[Point, Point]] = []
    def connect(a, b):
        # Two slightly irregular segments rather than a duplicate fixed rectangle.
        mid = ((a[0]+b[0])/2+rnd.randrange(-45,46), (a[1]+b[1])/2+rnd.randrange(-45,46))
        roads.extend(((a, mid), (mid, b)))
    connect(spawn, hub); connect(hub, exit_)
    candidates = [(x+rnd.randrange(-22,23),y+rnd.randrange(-20,21))
                  for y in range(220, HEIGHT-120, 150) for x in range(240, WIDTH-140, 180)]
    rnd.shuffle(candidates)
    species = list(FRIENDS); rnd.shuffle(species)
    friends = []
    for p in candidates:
        if len(friends) == cfg.friends: break
        if distance(p,spawn) < 330 or distance(p,exit_) < 150 or any(distance(p,f[2]) < 220 for f in friends): continue
        name, title = species[len(friends)]
        friends.append((name, title, p)); connect(p,hub)
    if len(friends) != cfg.friends: raise RuntimeError('Não foi possível posicionar os resgates.')
    enemies = []
    for p in candidates:
        if len(enemies) == cfg.enemies: break
        if distance(p,spawn) < 550 or any(distance(p,f[2]) < 150 for f in friends) or any(distance(p,e[1]) < 230 for e in enemies): continue
        enemies.append(('wolf' if len(enemies)%2 == 0 else 'fox', p)); connect(p,hub)
    if len(enemies) != cfg.enemies: raise RuntimeError('Não foi possível posicionar os inimigos.')
    boss = None
    if cfg.boss:
        boss = (1100 if side == 0 else 500, 528) if side%2 == 0 else (800, 760 if side == 1 else 290)
        connect(spawn,boss); connect(boss,exit_)
    protected = [spawn,exit_,hub] + [f[2] for f in friends] + [e[1] for e in enemies] + ([boss] if boss else [])
    props = []
    kinds = ['tree','pear','bush','hay','bramble']
    if cfg.theme in ('grove','night','dusk'): kinds = ['tree','willow','bush','bramble','hay']
    if cfg.theme in ('harvest','field'): kinds = ['hay','harvest','pear','tree','bramble']
    if cfg.theme == 'quarry': kinds = ['silo','hay','bush','tree']
    for _ in range(700):
        if len(props) >= (22 if cfg.boss else 46): break
        x, y = rnd.randrange(100,WIDTH-100), rnd.randrange(145,HEIGHT-85)
        kind = rnd.choice(kinds)
        size = rnd.randrange(155, 205) if kind in ('tree','pear','willow','silo') else rnd.randrange(75,120)
        radius = 22 if kind in ('tree','pear','willow') else (32 if kind=='silo' else size*.29)
        if cfg.boss and 250 < x < WIDTH-250 and 200 < y < HEIGHT-140: continue
        if any(distance((x,y),p) < 135 for p in protected): continue
        if any(point_segment((x,y),a,b) < 104 for a,b in roads): continue
        if any(distance((x,y),(o.x,o.y)) < 124 for o in props): continue
        props.append(Prop(x,y,kind,size,radius))
    # Decorative blooms are nonblocking and stay off the rescue paths.
    for _ in range(35):
        x,y = rnd.randrange(80,WIDTH-80),rnd.randrange(100,HEIGHT-80)
        if all(point_segment((x,y),a,b)>80 for a,b in roads) and all(distance((x,y),(o.x,o.y))>70 for o in props):
            props.append(Prop(x,y,rnd.choice(['daisies','lavender']),rnd.randrange(32,52),0))
    return Layout(seed,stage,spawn,exit_,roads,friends,enemies,props,boss)
