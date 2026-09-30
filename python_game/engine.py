"""Native Python campaign simulation. No browser, JavaScript or webview is executed."""
from __future__ import annotations
from dataclasses import dataclass, field
from math import hypot, isfinite
from pathlib import Path
import json
import os
import tempfile
from world import Layout, Point, STAGES, VERSION as MAP_VERSION, distance, generate

SAVE_VERSION = 1
@dataclass(frozen=True)
class Skill:
    id: str
    name: str
    kind: str
    text: str
    maximum: int = 2

SKILLS = (
    Skill('boots','Pé de vento','Movimento','Caminhe 12% mais rápido por nível.'),
    Skill('heart','Coração valente','Defesa','Ganhe um coração máximo e recupere um agora.'),
    Skill('shield','Pena de aço','Defesa','Bloqueie o primeiro golpe de cada fase.',1),
    Skill('dash','Asa ligeira','Movimento','Reduza a recarga da esquiva em 25% por nível.'),
    Skill('corn','Isca de milho','Truque','Q deixa uma isca. Nível 2: distração mais longa.'),
    Skill('call','Có-có de alcance','Resgate','Ganhe 18 pontos de alcance para resgatar e interagir.'),
    Skill('feather','Pena escorregadia','Defesa','Mais 0,35 segundo de proteção depois de um golpe.'),
    Skill('medicine','Fôlego do resgate','Resgate','Cure a cada 3 resgates. Nível 2: a cada 2.'),
    Skill('recovery','Pausa pro lanche','Defesa','Recupere mais um coração entre fases por nível.'),
)
BY_ID = {s.id:s for s in SKILLS}

@dataclass
class Actor:
    species: str
    x: float
    y: float
    radius: float = 16.
    name: str = ''
    dx: float = 0.
    dy: float = 1.
    travel: float = 0.
    moving: bool = False
    rescued: bool = False
    home: Point | None = None
    target: Point | None = None
    timer: float = 0.
    route: list[Point] = field(default_factory=list)
    route_timer: float = 0.
    @property
    def pos(self) -> Point: return self.x, self.y

@dataclass
class Player(Actor):
    invulnerable: float = 1.5
    dash_time: float = 0.
    dash_cooldown: float = 0.
    dash_vector: Point = (1.,0.)
    corn_cooldown: float = 0.
    shield: bool = False

@dataclass
class Boss(Actor):
    id: str = ''
    health: int = 3
    maximum: int = 3
    mode: str = 'recover'
    timer: float = 1.8
    aim: Point = (0.,1.)
    combo: int = 0

@dataclass
class Run:
    seed: int
    rng: int
    stage: int = 0
    phase: str = 'draft'
    skills: dict[str,int] = field(default_factory=dict)
    choices: list[str] = field(default_factory=list)
    rerolls: int = 1
    level: int = 0
    hp: int = 3
    elapsed: float = 0.
    total_rescued: int = 0
    rescued: int = 0
    bosses: int = 0
    paused: bool = False
    player: Player | None = None
    layout: Layout | None = None
    friends: list[Actor] = field(default_factory=list)
    enemies: list[Actor] = field(default_factory=list)
    boss: Boss | None = None
    decoy: tuple[float,float,float] | None = None
    notice: str = ''
    notice_time: float = 0.
    effects: list[dict] = field(default_factory=list)
    trail: list[Point] = field(default_factory=list)

    def random(self) -> float:
        self.rng = (1664525*self.rng + 1013904223) & 0xffffffff
        return self.rng/4294967296

    @property
    def max_hp(self) -> int: return 3+self.skills.get('heart',0)
    @property
    def speed(self) -> float: return 205*(1+.12*self.skills.get('boots',0))
    @property
    def reach(self) -> float: return 32+18*self.skills.get('call',0)

    def offer(self) -> None:
        pool = [s.id for s in SKILLS if self.skills.get(s.id,0)<s.maximum]
        for i in range(len(pool)-1,0,-1):
            j = int(self.random()*(i+1)); pool[i],pool[j] = pool[j],pool[i]
        self.choices = pool[:3]

    def reroll(self) -> bool:
        if self.phase != 'draft' or self.rerolls == 0: return False
        previous = set(self.choices)
        self.offer()
        if set(self.choices) == previous:
            different = [s.id for s in SKILLS if s.id not in previous and self.skills.get(s.id,0)<s.maximum]
            if different: self.choices[-1] = different[int(self.random()*len(different))]
        self.rerolls -= 1
        return True

    def choose(self, skill: str) -> bool:
        if self.phase != 'draft' or skill not in self.choices: return False
        if skill not in BY_ID or self.skills.get(skill,0)>=BY_ID[skill].maximum: return False
        self.skills[skill] = self.skills.get(skill,0)+1
        self.level += 1
        if skill == 'heart': self.hp = min(self.max_hp,self.hp+1)
        self.choices = []
        self.begin_stage()
        return True

    def begin_stage(self) -> None:
        self.layout = generate(self.seed,self.stage)
        self.player = Player('chicken',*self.layout.spawn,radius=14,name='Erina',shield=bool(self.skills.get('shield')))
        self.player.dx = self.layout.exit[0]-self.player.x
        self.player.dy = self.layout.exit[1]-self.player.y
        self.friends = [Actor(s,*p,name=n,home=p,timer=i*.7) for i,(s,n,p) in enumerate(self.layout.friends)]
        self.enemies = [Actor(s,*p,radius=19,home=p) for s,p in self.layout.enemies]
        cfg = STAGES[self.stage]
        self.boss = None
        if cfg.boss:
            hp = 3 if cfg.boss=='panto' else 5
            self.boss = Boss('goose' if hp==3 else 'wolf',*self.layout.boss,radius=23,
                             name='Panto' if hp==3 else 'Baltazar',id=cfg.boss,health=hp,maximum=hp)
        self.phase = 'playing'; self.paused = False; self.rescued = 0
        self.effects = []; self.decoy = None; self.trail = [self.player.pos]
        self.say('Desvie da investida e interaja quando o chefe ficar tonto.' if cfg.boss
                 else f'Reúna {cfg.friends} amigos e leve a turma até a porteira.',5)

    def say(self, text: str, seconds: float = 3.) -> None:
        self.notice,self.notice_time = text,seconds

    def effect(self, actor: Actor, kind: str) -> None:
        self.effects.append(dict(x=actor.x,y=actor.y,kind=kind,time=.55))

    def move(self, a: Actor, dx: float, dy: float) -> float:
        old = a.pos
        steps = max(1,int(hypot(dx,dy)/5)+1)
        for _ in range(steps):
            if self.layout.clear((a.x+dx/steps,a.y),a.radius): a.x += dx/steps
            if self.layout.clear((a.x,a.y+dy/steps),a.radius): a.y += dy/steps
        moved = distance(a.pos,old)
        a.moving = moved > .01
        a.travel += moved
        if a.moving: a.dx,a.dy = a.x-old[0],a.y-old[1]
        return moved

    def dash(self, x: float = 0., y: float = 0.) -> bool:
        p = self.player
        if self.phase!='playing' or self.paused or p.dash_cooldown>0: return False
        if hypot(x,y)<.01: x,y = p.dx,p.dy
        length = hypot(x,y) or 1.
        p.dash_vector=(x/length,y/length);p.dash_time=.19
        p.dash_cooldown=3.6*(1-.25*self.skills.get('dash',0))
        self.effect(p,'dash'); return True

    def lure(self) -> bool:
        p = self.player
        if self.phase!='playing' or self.paused or not self.skills.get('corn') or p.corn_cooldown>0: return False
        self.decoy = p.x,p.y,(6. if self.skills['corn']==2 else 4.)
        p.corn_cooldown=9.
        self.say('Milho no chão. Focinho distraído!');return True

    def hurt(self) -> bool:
        p = self.player
        if self.phase!='playing' or self.paused or p.invulnerable>0 or p.dash_time>0: return False
        if p.shield:
            p.shield=False;self.say('A pena de aço segurou essa!');self.effect(p,'shield')
        else:
            self.hp-=1;self.say('Essa passou raspando nas penas!');self.effect(p,'hurt')
        p.invulnerable=1.65+.35*self.skills.get('feather',0)
        if self.hp<=0: self.hp=0;self.phase='lost';p.moving=False
        return True

    def interact(self) -> bool:
        b,p = self.boss,self.player
        if self.phase!='playing' or self.paused or not b or b.mode!='stunned': return False
        if distance(p.pos,b.pos)>self.reach+b.radius or not self.layout.line_clear(p.pos,b.pos,0): return False
        b.health-=1;b.mode='recover';b.timer=1.2;b.combo=0
        self.effect(b,'rescue')
        self.say(f'{b.name}: "Isso foi falta de educação!"')
        if b.health==0:
            b.mode='defeated';b.moving=False;self.bosses+=1
            if self.stage==9: self.phase='won';p.moving=False
            else: self.say('Panto: "Passagem aprovada! Próxima porteira, por favor."',6)
        return True

    def steer(self, a: Actor, target: Point, speed: float, dt: float) -> None:
        a.route_timer -= dt
        if self.layout.line_clear(a.pos,target,a.radius): a.route=[]
        elif a.route_timer<=0 or not a.route:
            a.route=self.layout.route(a.pos,target,a.radius);a.route_timer=.65
        while a.route and distance(a.pos,a.route[0])<5: a.route.pop(0)
        dest = a.route[0] if a.route else target
        dx,dy = dest[0]-a.x,dest[1]-a.y
        length = hypot(dx,dy)
        if length>.01:
            step=min(length,speed*dt);self.move(a,dx/length*step,dy/length*step)
        else: a.moving=False

    def warn(self, second: bool = False) -> None:
        b = self.boss
        target = self.decoy[:2] if self.decoy else self.player.pos
        dx,dy = target[0]-b.x,target[1]-b.y
        length=hypot(dx,dy) or 1.
        b.aim=(dx/length,dy/length);b.dx,b.dy=dx,dy;b.mode='warning'
        b.timer=.9 if second else (1.2 if b.id=='panto' else 1.05)
        self.say('SEGUNDO BOTE! Saia da nova faixa!' if second else f'{b.name} vai investir! Desvie para o lado.',1.5)

    def update_boss(self, dt: float) -> None:
        b,p = self.boss,self.player
        if not b or b.mode=='defeated': return
        b.timer-=dt;b.moving=False
        if b.mode=='recover' and b.timer<=0:
            b.combo=int(b.id=='baltazar' and b.health<=3);self.warn()
        elif b.mode=='warning' and b.timer<=0: b.mode='charge';b.timer=1.15
        elif b.mode=='charge':
            speed=340 if b.id=='panto' else (390 if b.health>2 else 420)
            moved=self.move(b,b.aim[0]*speed*dt,b.aim[1]*speed*dt)
            if distance(p.pos,b.pos)<p.radius+b.radius and self.layout.line_clear(p.pos,b.pos,0): self.hurt()
            if self.decoy and distance(b.pos,self.decoy[:2])<30: self.decoy=None;b.timer=0
            if b.timer<=0 or moved<speed*dt*.65:
                if b.combo: b.combo-=1;self.warn(True)
                else:
                    b.mode='stunned';b.timer=2.65 if b.id=='panto' else 2.4
                    self.say('Ficou tonto! Chegue perto e aperte E.',b.timer)
        elif b.mode=='stunned' and b.timer<=0: b.mode='recover';b.timer=.8

    @property
    def exit_ready(self) -> bool:
        return self.phase=='playing' and (self.boss.health==0 if self.boss else self.rescued==len(self.friends))

    def tick(self, dt: float, x: float = 0., y: float = 0.) -> None:
        if self.phase!='playing' or self.paused or not isfinite(dt) or dt<=0: return
        dt=min(.05,dt);self.elapsed+=dt;self.notice_time=max(0.,self.notice_time-dt)
        self.effects=[e for e in self.effects if e['time']>dt]
        for e in self.effects:e['time']-=dt
        p=self.player
        for key in ('invulnerable','dash_cooldown','corn_cooldown'):setattr(p,key,max(0.,getattr(p,key)-dt))
        if self.decoy:
            self.decoy=(*self.decoy[:2],self.decoy[2]-dt) if self.decoy[2]>dt else None
        x=x if isfinite(x) else 0.;y=y if isfinite(y) else 0.
        length=max(1.,hypot(x,y))
        if p.dash_time>0:
            self.move(p,p.dash_vector[0]*620*dt,p.dash_vector[1]*620*dt);p.dash_time=max(0.,p.dash_time-dt)
        else:self.move(p,x/length*self.speed*dt,y/length*self.speed*dt)
        if distance(p.pos,self.trail[-1])>7:
            self.trail.append(p.pos);self.trail=self.trail[-220:]
        follow_index=0
        for i,f in enumerate(self.friends):
            if not f.rescued and distance(p.pos,f.pos)<self.reach+f.radius and self.layout.line_clear(p.pos,f.pos,0):
                f.rescued=True;self.rescued+=1;self.total_rescued+=1;self.effect(f,'rescue')
                rank=self.skills.get('medicine',0)
                if rank and self.total_rescued%(4-rank)==0:self.hp=min(self.max_hp,self.hp+1)
                self.say(f'{f.name}: "O almoço pediu demissão!"')
                if self.rescued==len(self.friends):self.say('Turma reunida! Siga até a porteira dourada.',5)
            if f.rescued:
                target=self.trail[max(0,len(self.trail)-7-7*follow_index)];follow_index+=1
                if distance(f.pos,target)>12:self.steer(f,target,self.speed*.98,dt)
                else:f.moving=False
            else:
                # Friends remain local, with small walks instead of static decorations.
                f.timer-=dt
                if f.timer<=0:
                    angle=(i+1)*2.4+self.elapsed*.35
                    from math import cos,sin
                    f.target=(f.home[0]+cos(angle)*20,f.home[1]+sin(angle)*16);f.timer=3.5+i*.2
                if f.target and distance(f.pos,f.target)>2:self.steer(f,f.target,18,dt)
                else:f.moving=False
        for i,e in enumerate(self.enemies):
            target=self.decoy[:2] if self.decoy else p.pos
            self.steer(e,target,119+self.stage*3.1+(i%2)*5,dt)
            if distance(e.pos,p.pos)<e.radius+p.radius and self.layout.line_clear(e.pos,p.pos,0):self.hurt()
        if self.phase!='playing':return
        self.update_boss(dt)
        if self.exit_ready and distance(p.pos,self.layout.exit)<44 and self.stage<9:
            self.stage+=1;self.phase='draft';self.hp=min(self.max_hp,self.hp+1+self.skills.get('recovery',0))
            self.rerolls=1;self.offer();p.moving=False

    def checkpoint(self) -> dict:
        return dict(version=SAVE_VERSION,map_version=MAP_VERSION,seed=self.seed,rng=self.rng,
                    stage=self.stage,phase=self.phase,skills=dict(self.skills),choices=list(self.choices),
                    rerolls=self.rerolls,level=self.level,hp=self.hp,elapsed=self.elapsed)


def new_run(seed: int) -> Run:
    seed=(int(seed)&0xffffffff) or 1
    # Mix nearby seeds before the card stream so short numeric seeds are diverse too.
    mixed=((seed^(seed>>16))*0x7feb352d)&0xffffffff
    mixed=((mixed^(mixed>>15))*0x846ca68b)&0xffffffff
    run=Run(seed,mixed^(mixed>>16));run.offer();return run


def restore(data: object) -> Run | None:
    if not isinstance(data,dict):return None
    try:
        if data['version']!=SAVE_VERSION or data['map_version']!=MAP_VERSION:return None
        seed,rng,stage,level,hp=(data[k] for k in ('seed','rng','stage','level','hp'))
        if any(type(n) is not int for n in (seed,rng,stage,level,hp)):return None
        if not 1<=seed<=0xffffffff or not 0<=rng<=0xffffffff or not 0<=stage<10:return None
        phase=data['phase'];skills=data['skills'];choices=data['choices'];elapsed=data['elapsed']
        if phase not in ('draft','playing') or not isinstance(skills,dict) or not isinstance(choices,list):return None
        if any(k not in BY_ID or type(v) is not int or not 1<=v<=BY_ID[k].maximum for k,v in skills.items()):return None
        if sum(skills.values())!=level or level!=(stage if phase=='draft' else stage+1):return None
        if not 1<=hp<=3+skills.get('heart',0) or type(elapsed) not in (int,float) or not isfinite(elapsed) or not 0<=elapsed<=86400:return None
        if type(data['rerolls']) is not int or data['rerolls'] not in (0,1):return None
        if any(not isinstance(c,str) for c in choices):return None
        if phase=='draft' and (len(choices)!=3 or len(set(choices))!=3 or any(
            c not in BY_ID or skills.get(c,0)>=BY_ID[c].maximum for c in choices)):return None
        if phase=='playing' and choices:return None
        run=Run(seed,rng,stage=stage,phase=phase,skills=dict(skills),choices=list(choices),
                rerolls=data['rerolls'],level=level,hp=hp,elapsed=float(elapsed),
                total_rescued=sum(s.friends for s in STAGES[:stage]),bosses=int(stage>4))
        if phase=='playing':run.begin_stage()
        return run
    except (KeyError,TypeError,ValueError,OverflowError):return None


def save_path() -> Path:
    base=Path(os.environ.get('APPDATA') or os.environ.get('XDG_DATA_HOME') or Path.home()/'.local'/'share')
    return base/'PenasProAr'/'python-shuffle-v1.json'


def load(path: Path | None = None) -> Run | None:
    path=path or save_path()
    try:
        if path.stat().st_size>65536:return None
        return restore(json.loads(path.read_text(encoding='utf-8')))
    except (OSError,ValueError,RecursionError):return None


def save(run: Run, path: Path | None = None) -> bool:
    path=path or save_path();temporary=None
    try:
        path.parent.mkdir(parents=True,exist_ok=True)
        if run.phase in ('won','lost'):
            path.unlink(missing_ok=True);return True
        with tempfile.NamedTemporaryFile('w',encoding='utf-8',dir=path.parent,delete=False) as f:
            temporary=Path(f.name);json.dump(run.checkpoint(),f,ensure_ascii=False)
        os.replace(temporary,path);return True
    except OSError:return False
    finally:
        if temporary and temporary.exists():temporary.unlink(missing_ok=True)
