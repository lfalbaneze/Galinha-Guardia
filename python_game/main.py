"""Penas pro Ar — native pygame-ce entry point. Run: python python_game/main.py."""
from __future__ import annotations
import os
os.environ.setdefault('PYGAME_HIDE_SUPPORT_PROMPT','1')
import argparse
from array import array
from math import sin, pi
from pathlib import Path
import secrets
import sys
import time

try:
    import pygame as pg
except ImportError:
    raise SystemExit('Instale as dependências: python -m pip install -r python_game/requirements.txt')

from engine import Run, SKILLS, BY_ID, new_run, load, save
from world import WIDTH, HEIGHT, STAGES
from art import Art, SIZE, PAPER, GOLD, MUTED, INK

class App:
    def __init__(self, save_file: Path | None = None):
        pg.mixer.pre_init(44100,-16,1,512)
        pg.init()
        self.window=pg.display.set_mode(SIZE,pg.RESIZABLE)
        pg.display.set_caption('Penas pro Ar — Python Shuffle')
        self.surface=pg.Surface(SIZE)
        self.art=Art()
        self.buttons=[];self.running=True;self.fullscreen=False;self.normal_size=SIZE
        self.run:Run|None=None;self.save_file=save_file;self.saved=load(save_file)
        self.save_ok=True;self.mode='menu';self.keys=set();self.accumulator=0.
        self.camera=(150.,130.);self.demo=new_run(641817);self.demo.choose(self.demo.choices[0])
        self.muted=False;self.sounds={};self.last_rescued=0;self.last_hp=3
        if pg.mixer.get_init():
            for name,hz in [('choose',520),('rescue',740),('hurt',160),('win',880)]:
                samples=array('h',(int(4500*sin(2*pi*hz*i/44100)*(1-i/4410)**2) for i in range(4410)))
                self.sounds[name]=pg.mixer.Sound(buffer=samples.tobytes())

    def sound(self,name):
        if not self.muted and name in self.sounds:self.sounds[name].play()

    def persist(self):
        if self.run:self.save_ok=save(self.run,self.save_file)

    def start(self,seed=None):
        self.run=new_run(secrets.randbits(32) if seed is None else seed)
        self.mode='run';self.keys.clear();self.accumulator=0.;self.persist()

    def choose(self,id):
        if self.run and self.run.choose(id):
            self.sound('choose');self.keys.clear();self.accumulator=0.;self.persist()
            self.camera=self.camera_target(self.run)
            self.last_rescued=self.run.total_rescued;self.last_hp=self.run.hp

    def pause(self):
        if self.run and self.run.phase=='playing':
            self.run.paused=not self.run.paused;self.keys.clear();self.accumulator=0.

    def camera_target(self,run):
        return (max(0.,min(WIDTH-SIZE[0],run.player.x-SIZE[0]*.5)),
                max(0.,min(HEIGHT-684,run.player.y-390)))

    def command(self,command):
        r=self.run
        if command=='start':self.start();return
        if command=='continue' and self.saved:
            self.run=self.saved;self.saved=None;self.mode='run'
            if self.run.player:self.camera=self.camera_target(self.run)
            return
        if command=='quit':self.running=False;return
        if command=='menu':
            self.mode='menu';self.run=None;self.keys.clear();self.saved=load(self.save_file);return
        if command=='retry':self.start(r.seed);return
        if command=='new':self.start();return
        if not r:return
        if command.startswith('skill:'):self.choose(command.split(':',1)[1])
        elif command=='reroll':
            if r.reroll():self.sound('choose');self.persist()
        elif command=='pause':self.pause()
        elif command=='dash':r.dash(*self.movement())
        elif command=='corn':r.lure()
        elif command=='interact':
            if r.interact():self.sound('rescue');self.persist() if r.phase=='won' else None

    def movement(self):
        return (int(bool(self.keys&{pg.K_d,pg.K_RIGHT}))-int(bool(self.keys&{pg.K_a,pg.K_LEFT})),
                int(bool(self.keys&{pg.K_s,pg.K_DOWN}))-int(bool(self.keys&{pg.K_w,pg.K_UP})))

    def logical_mouse(self,p):
        w,h=self.window.get_size();scale=min(w/SIZE[0],h/SIZE[1])
        return ((p[0]-(w-SIZE[0]*scale)/2)/scale,(p[1]-(h-SIZE[1]*scale)/2)/scale)

    def event(self,e):
        if e.type==pg.QUIT:self.running=False
        elif e.type==pg.WINDOWFOCUSLOST:
            self.keys.clear()
            if self.run and self.run.phase=='playing':self.run.paused=True;self.accumulator=0.
        elif e.type==pg.VIDEORESIZE and not self.fullscreen:
            self.normal_size=(max(640,e.w),max(400,e.h))
            self.window=pg.display.set_mode(self.normal_size,pg.RESIZABLE)
        elif e.type==pg.KEYUP:self.keys.discard(e.key)
        elif e.type==pg.KEYDOWN:
            if getattr(e,'repeat',False):return
            if e.key==pg.K_F11:
                self.fullscreen=not self.fullscreen
                self.window=pg.display.set_mode((0,0) if self.fullscreen else self.normal_size,pg.FULLSCREEN if self.fullscreen else pg.RESIZABLE)
                self.keys.clear();return
            if e.key==pg.K_m:self.muted=not self.muted;return
            if self.mode=='menu':
                if e.key==pg.K_RETURN:self.command('start')
                elif e.key==pg.K_c:self.command('continue')
                elif e.key==pg.K_ESCAPE:self.running=False
                return
            if not self.run:return
            r=self.run
            if r.phase=='draft':
                if e.key in (pg.K_1,pg.K_2,pg.K_3):self.choose(r.choices[e.key-pg.K_1])
                elif e.key==pg.K_r:self.command('reroll')
                elif e.key==pg.K_ESCAPE:self.command('menu')
            elif r.phase in ('won','lost'):
                if e.key==pg.K_RETURN:self.command('new')
                elif e.key==pg.K_ESCAPE:self.command('menu')
            elif e.key==pg.K_ESCAPE:self.pause()
            elif not r.paused:
                self.keys.add(e.key)
                action={pg.K_SPACE:'dash',pg.K_q:'corn',pg.K_e:'interact'}.get(e.key)
                if action:self.command(action)
        elif e.type==pg.MOUSEBUTTONUP and e.button==1:
            pos=self.logical_mouse(e.pos)
            for rect,command in reversed(self.buttons):
                if rect.collidepoint(pos):self.command(command);break

    def update(self,dt):
        r=self.run
        if not r or r.phase!='playing' or r.paused:self.accumulator=0.;return
        before_phase=r.phase;before_rescued=r.total_rescued;before_hp=r.hp
        self.accumulator+=min(.1,max(0.,dt));x,y=self.movement()
        while self.accumulator>=1/60:
            r.tick(1/60,x,y);self.accumulator-=1/60
        if r.phase!=before_phase:self.keys.clear();self.persist()
        if r.total_rescued>before_rescued:self.sound('rescue')
        if r.hp<before_hp:self.sound('hurt')
        if r.phase=='won':self.sound('win')
        target=self.camera_target(r)
        self.camera=tuple(a+(b-a)*min(1.,dt*9) for a,b in zip(self.camera,target))

    def button(self,rect,label,command,primary=False,enabled=True):
        mouse=self.logical_mouse(pg.mouse.get_pos());hover=rect.collidepoint(mouse) and enabled
        color=(248,220,160) if hover and primary else GOLD if primary else (60,84,56) if hover else (33,57,42)
        if not enabled:color=(49,60,44)
        pg.draw.rect(self.surface,(12,31,23),rect.move(0,4),border_radius=11)
        pg.draw.rect(self.surface,color,rect,border_radius=11)
        pg.draw.rect(self.surface,GOLD if enabled else (84,97,72),rect,1,border_radius=11)
        self.art.text(self.surface,label,rect.center,19,INK if primary else PAPER if enabled else MUTED,True,True)
        if enabled:self.buttons.append((rect,command))

    def dim(self,alpha=180):
        veil=pg.Surface(SIZE,pg.SRCALPHA);veil.fill((13,32,25,alpha));self.surface.blit(veil,(0,0))

    def draw_menu(self):
        a=self.art;s=self.surface
        self.dim(128)
        a.panel(s,pg.Rect(62,87,560,572),(25,47,35,238),radius=24)
        a.text(s,'UMA NOVA EXPEDIÇÃO  /  PYTHON',(103,123),15,GOLD)
        a.text(s,'Penas',(97,157),110,PAPER,True)
        a.text(s,'pro Ar',(98,252),102,GOLD,True)
        a.wrap(s,'Resgate a turma, improvise com as habilidades e deixe os valentões sem almoço.',pg.Rect(105,370,438,100),21)
        self.button(pg.Rect(105,473,430,57),'Nova expedição   [Enter]','start',True)
        self.button(pg.Rect(105,544,280,48),'Continuar   [C]','continue',enabled=bool(self.saved))
        self.button(pg.Rect(398,544,137,48),'Sair','quit')
        a.panel(s,pg.Rect(723,192,391,370),(30,53,35,224),radius=21)
        a.text(s,'DEZ FASES. NENHUM ALMOÇO.',(750,220),16,GOLD)
        for y,number,title,subtitle in [(278,'01–04','Explore a fazenda','Mapas e resgates mudam por semente.'),
                                       (372,'05','Panto quer passagem','Desvie. Espere. Contra-ataque.'),
                                       (466,'06–10','A última correria','Baltazar espera na décima fase.')]:
            a.text(s,number,(751,y),23,GOLD,True)
            a.text(s,title,(848,y),21,PAPER,True)
            a.wrap(s,subtitle,pg.Rect(751,y+38,327,38),15,MUTED)
        a.text(s,'Aventura original preservada • Salvamento próprio',(600,700),16,PAPER,center=True)
        a.text(s,'F11 tela cheia   ·   M som   ·   Feito para PC',(600,729),14,MUTED,center=True)

    def draw_draft(self):
        a=self.art;r=self.run;s=self.surface
        self.dim(197)
        a.text(s,f'FASE {r.stage+1:02} DE 10   /   ESCOLHA SUA PRÓXIMA HABILIDADE',(600,79),16,GOLD,center=True)
        a.text(s,STAGES[r.stage].name,(600,126),44,PAPER,True,True)
        a.text(s,'Uma das três cartas. O efeito acompanha você até o fim desta tentativa.',(600,177),18,MUTED,center=True)
        for i,id in enumerate(r.choices):
            skill=BY_ID[id];x=64+i*367;rect=pg.Rect(x,223,337,349)
            pg.draw.rect(s,(12,28,19),rect.move(0,8),border_radius=20)
            pg.draw.rect(s,PAPER,rect,border_radius=20)
            pg.draw.rect(s,GOLD,rect,2,border_radius=20)
            a.text(s,f'0{i+1}',(x+25,245),32,(141,116,65),True)
            a.text(s,skill.kind.upper(),(x+25,293),12,(101,122,80))
            a.wrap(s,skill.name,pg.Rect(x+25,316,287,64),27,INK,33)
            a.wrap(s,skill.text,pg.Rect(x+25,385,285,80),19,(85,104,63),27)
            a.text(s,f'NÍVEL {r.skills.get(id,0)+1} / {skill.maximum}',(x+25,481),13,(133,110,58))
            self.button(pg.Rect(x+22,514,293,43),f'Escolher  [{i+1}]',f'skill:{id}',True)
        self.button(pg.Rect(434,609,331,48),'Embaralhar  [R]' if r.rerolls else 'Embaralhamento usado','reroll',enabled=bool(r.rerolls))
        a.text(s,f'Semente {r.seed}   ·   {r.hp}/{r.max_hp} vidas   ·   ESC volta ao menu',(600,694),15,MUTED,center=True)
        a.text(s,'O tempo fica parado enquanto você escolhe.',(600,723),14,MUTED,center=True)

    def draw_pause(self):
        a=self.art;s=self.surface;self.dim(192)
        a.panel(s,pg.Rect(310,160,580,430),(27,48,35,249),radius=22)
        a.text(s,'UMA PAUSA PARA AS PENAS',(600,207),15,GOLD,center=True)
        a.text(s,'Respira, galinha.',(600,268),49,PAPER,True,True)
        a.wrap(s,'Continuar mantém esta fase. Ao fechar o jogo, você retorna ao checkpoint do início da fase, com as habilidades escolhidas.',pg.Rect(365,320,470,100),19,MUTED)
        self.button(pg.Rect(370,440,460,54),'Continuar  [ESC]','pause',True)
        self.button(pg.Rect(370,511,460,46),'Voltar ao menu','menu')

    def draw_end(self):
        a=self.art;r=self.run;s=self.surface;self.dim(185);won=r.phase=='won'
        a.panel(s,pg.Rect(235,108,730,548),(29,49,35,246),radius=24)
        a.text(s,'VALENTÃO SEM ALMOÇO' if won else 'A TURMA ESPERA A REVANCHE',(600,151),16,GOLD,center=True)
        a.text(s,'Deu galinha!' if won else 'Foi por pouco.',(600,221),62,PAPER,True,True)
        a.text(s,f'{r.total_rescued} amigos   ·   {r.bosses} chefes   ·   Fase {r.stage+1} / 10',(600,295),22,GOLD,center=True)
        build='  ·  '.join(f'{BY_ID[k].name} {v}' for k,v in r.skills.items())
        a.wrap(s,build,pg.Rect(295,344,610,100),18,MUTED)
        self.button(pg.Rect(315,456,570,55),'Novo baralho  [Enter]','new',True)
        self.button(pg.Rect(315,529,340,46),'Repetir mapas e cartas','retry')
        self.button(pg.Rect(672,529,213,46),'Menu','menu')
        a.text(s,f'Semente {r.seed}   ·   {int(r.elapsed)//60}min {int(r.elapsed)%60:02}s',(600,620),15,MUTED,center=True)

    def draw(self):
        self.buttons=[]
        r=self.run if self.run and self.run.player else self.demo
        self.art.scene_draw(self.surface,r,self.camera if self.mode=='run' and self.run and self.run.player else (200.,180.))
        if self.mode=='menu':self.draw_menu()
        elif self.run.phase=='draft':self.draw_draft()
        elif self.run.phase in ('won','lost'):self.draw_end()
        else:
            self.art.hud(self.surface,self.run,self.buttons)
            if self.run.paused:self.buttons=[];self.draw_pause()
        if not self.save_ok:self.art.text(self.surface,'Sem permissão para salvar: mantenha a janela aberta.',(20,658),15,(255,195,134))
        w,h=self.window.get_size();scale=min(w/SIZE[0],h/SIZE[1]);size=(round(SIZE[0]*scale),round(SIZE[1]*scale))
        self.window.fill((14,28,22))
        image=self.surface if size==SIZE else pg.transform.scale(self.surface,size)
        self.window.blit(image,((w-size[0])//2,(h-size[1])//2));pg.display.flip()

    def loop(self):
        clock=pg.time.Clock()
        while self.running:
            dt=clock.tick(60)/1000
            for event in pg.event.get():self.event(event)
            self.update(dt);self.draw()
        pg.quit()


def main():
    parser=argparse.ArgumentParser(description='Penas pro Ar: campanha Shuffle nativa em Python.')
    parser.add_argument('--smoke',action='store_true',help='Valida inicialização, movimento e renderização e encerra.')
    parser.add_argument('--screenshots',type=Path,help='Diretório de capturas do teste (use com --smoke).')
    args=parser.parse_args()
    if args.smoke:
        os.environ.setdefault('SDL_VIDEODRIVER','dummy');os.environ.setdefault('SDL_AUDIODRIVER','dummy')
    try:
        if args.smoke:
            import tempfile
            with tempfile.TemporaryDirectory() as tmp:
                app=App(Path(tmp)/'save.json');out=args.screenshots
                if out:out.mkdir(parents=True,exist_ok=True)
                app.draw()
                if out:pg.image.save(app.surface,out/'python-menu.png')
                app.start(641817);app.draw()
                if out:pg.image.save(app.surface,out/'python-cards.png')
                app.event(pg.event.Event(pg.KEYDOWN,key=pg.K_1))
                assert app.run.phase=='playing'
                old=app.run.player.pos
                # Head toward the connected interior rather than into a map edge.
                x,y=app.run.player.pos
                key=pg.K_d if x<WIDTH/2 else pg.K_a
                app.event(pg.event.Event(pg.KEYDOWN,key=key))
                start=time.perf_counter()
                for _ in range(120):app.update(1/60);app.draw()
                elapsed=time.perf_counter()-start
                app.event(pg.event.Event(pg.KEYUP,key=key))
                assert app.run.player.pos!=old
                app.event(pg.event.Event(pg.KEYDOWN,key=pg.K_ESCAPE));before=app.run.player.pos
                app.update(.05);assert app.run.paused and app.run.player.pos==before
                app.event(pg.event.Event(pg.KEYDOWN,key=pg.K_ESCAPE));assert not app.run.paused
                if out:app.draw();pg.image.save(app.surface,out/'python-gameplay.png')
                print(f'SMOKE OK: menu, cartas, movimento, pausa e 120 quadros em {elapsed:.2f}s.');pg.quit()
        else:App().loop()
    except (OSError,ValueError,KeyError,pg.error) as error:
        pg.quit()
        print(f'Não foi possível abrir o jogo: {error}\nExecute a partir de uma cópia completa do repositório e confira python_game/README.md.',file=sys.stderr)
        return 1
    return 0

if __name__=='__main__':raise SystemExit(main())
