"""Pygame rendering with the project's existing, eight-direction pixel art."""
from __future__ import annotations
from pathlib import Path
from math import atan2, cos, sin, pi, hypot
import json
import random
import pygame as pg
from world import WIDTH, HEIGHT, STAGES, Prop, Layout, point_segment
from engine import Actor, Run, SKILLS
from survival import Survival, POWERS, COLORS, DURATION

HERE=Path(__file__).resolve().parent
ROOT=HERE.parent
SIZE=(1200,760)
INK=(44,59,37); PAPER=(249,239,212); GOLD=(237,201,124); MUTED=(185,201,168)

class Art:
    def __init__(self):
        self.sheets={};self.frames={};self.props={};self.shadows={};self.fonts={}
        manifest=json.loads((HERE/'assets/characters.json').read_text(encoding='utf-8'))
        target={'chicken':59,'wolf':73,'fox':49,'goose':76,'sheep':53,'pig':48,'rabbit':41,'cow':72,'duck':44,'dog':52}
        for species,d in manifest.items():
            sheet=pg.image.load(ROOT/d['source']).convert_alpha()
            idle=d['actions']['idle']['down'][0]
            scale=target[species]/max(1,idle[5]-idle[6])
            for action,dirs in d['actions'].items():
                for direction,frames in dirs.items():
                    output=[]
                    for x,y,w,h,cx,bottom,top in frames:
                        image=sheet.subsurface((x,y,w,h))
                        image=pg.transform.scale(image,(round(w*scale),round(h*scale)))
                        output.append((image,round(cx*scale),round(bottom*scale)))
                    self.frames[species,action,direction]=output
        self.scene=pg.image.load(HERE/'assets/scenery.png').convert_alpha()
        self.scene_frames=json.loads((HERE/'assets/scenery.json').read_text())
        self.ground=None;self.ground_key=None

    def font(self,size,display=False):
        key=size,display
        if key not in self.fonts:
            file=ROOT/'assets/fonts'/('LilitaOne-Regular.ttf' if display else 'Nunito-Variable.ttf')
            fallback=pg.font.match_font('arialroundedmtbold,trebuchetms,dejavusans' if display else 'trebuchetms,verdana,dejavusans')
            self.fonts[key]=pg.font.Font(str(file) if file.is_file() else fallback,size)
            if not display: self.fonts[key].set_bold(True)
        return self.fonts[key]

    def text(self,surface,text,pos,size=18,color=PAPER,display=False,center=False):
        rendered=self.font(size,display).render(text,True,color)
        rect=rendered.get_rect(center=pos) if center else rendered.get_rect(topleft=pos)
        surface.blit(rendered,rect)
        return rect

    def wrap(self,surface,text,rect,size=18,color=PAPER,line_height=None):
        y=rect.y;line='';lh=line_height or size+7
        for word in text.split():
            joined=(line+' '+word).strip()
            if self.font(size).size(joined)[0]>rect.w and line:
                self.text(surface,line,(rect.x,y),size,color);y+=lh;line=word
            else:line=joined
        if line:self.text(surface,line,(rect.x,y),size,color);y+=lh
        return y

    def actor(self,surface,a:Actor,camera=(0.,0.),alpha=255):
        dirs=['right','downright','down','downleft','left','upleft','up','upright']
        direction=dirs[round(atan2(a.dy,a.dx)/(pi/4))%8]
        frames=self.frames[a.species,'walk' if a.moving else 'idle',direction]
        image,cx,bottom=frames[int(a.travel/74*len(frames))%len(frames) if a.moving else 0]
        if alpha!=255:image=image.copy();image.set_alpha(alpha)
        surface.blit(image,(round(a.x-camera[0]-cx),round(a.y-camera[1]-bottom)))

    def prop(self,p:Prop):
        key=p.kind,p.size
        if key not in self.props:
            image=self.scene.subsurface(self.scene_frames[p.kind]).copy()
            bounds=image.get_bounding_rect(min_alpha=96)
            image=image.subsurface(bounds).copy()
            image=pg.transform.scale(image,(round(image.get_width()*p.size/image.get_height()),p.size))
            # Contact point is the visible base; transparent canvas padding is not the floor.
            self.props[key]=image
            mask=pg.mask.from_surface(image,100).to_surface(setcolor=(22,39,22,55),unsetcolor=(0,0,0,0))
            self.shadows[key]=pg.transform.flip(pg.transform.scale(mask,(image.get_width(),max(3,round(p.size*.22)))),False,True)
        return self.props[key]

    def terrain(self,layout:Layout):
        key=layout.seed,layout.stage
        if key==self.ground_key:return self.ground
        self.ground_key=key
        rnd=random.Random(layout.seed^(layout.stage+4)*314159)
        theme=STAGES[layout.stage].theme
        palettes={
            'orchard':((105,139,70),(165,142,88)), 'harvest':((126,148,67),(178,147,88)),
            'grove':((76,113,65),(148,128,81)), 'field':((117,146,73),(170,146,87)),
            'pond':((91,131,94),(163,149,101)), 'quarry':((104,119,78),(156,146,114)),
            'sunset':((126,135,66),(185,142,91)), 'dusk':((91,113,79),(151,126,91)),
            'night':((75,101,83),(141,126,100))}
        grass,dirt=palettes.get(theme,palettes['orchard'])
        small=pg.Surface((WIDTH//2,HEIGHT//2));small.fill(grass)
        # Baked grass texture: no per-frame random noise, shimmer, or repeated giant tiles.
        for _ in range(23000):
            x,y=rnd.randrange(WIDTH//2),rnd.randrange(HEIGHT//2);shade=rnd.randrange(-13,15)
            col=tuple(max(0,min(255,c+shade)) for c in grass)
            pg.draw.line(small,col,(x,y),(x+rnd.randrange(1,5),y),1)
        ground=pg.transform.scale(small,(WIDTH,HEIGHT))
        # Draw ALL outer verges, then ALL interiors; crossings have no round seams.
        for width,col in [(114,tuple(max(0,c-9) for c in grass)),(104,tuple(max(0,c-17) for c in dirt)),(96,dirt)]:
            for a,b in layout.roads:
                pg.draw.line(ground,col,a,b,width);pg.draw.circle(ground,col,a,width//2);pg.draw.circle(ground,col,b,width//2)
        # Pebbles and small irregular verges make paths read as ground, not colored boxes.
        for a,b in layout.roads:
            dx,dy=b[0]-a[0],b[1]-a[1];length=hypot(dx,dy) or 1
            nx,ny=-dy/length,dx/length
            for i in range(max(1,int(length/12))):
                t=rnd.random();offset=rnd.uniform(-42,42)
                x=a[0]+dx*t+nx*offset;y=a[1]+dy*t+ny*offset
                color=tuple(max(0,min(255,c+rnd.choice([-16,-9,9,13]))) for c in dirt)
                pg.draw.rect(ground,color,(x,y,rnd.randrange(3,8),rnd.randrange(2,4)))
            for i in range(max(1,int(length/28))):
                t=rnd.random();offset=rnd.choice([-1,1])*rnd.uniform(50,57)
                x=a[0]+dx*t+nx*offset;y=a[1]+dy*t+ny*offset
                pg.draw.line(ground,tuple(max(0,c-14) for c in grass),(x-4,y),(x,y-7),2)
                pg.draw.line(ground,tuple(min(255,c+10) for c in grass),(x,y),(x+3,y-6),2)
        # Projected prop silhouettes are drawn on the ground BEFORE any upright sprite.
        for p in layout.props:
            self.prop(p)
            if p.radius:
                shadow=self.shadows[p.kind,p.size]
                ground.blit(shadow,(round(p.x-shadow.get_width()/2+8),round(p.y-3)))
        # Boundary stones provide a readable edge without changing the original fences.
        for x in range(24,WIDTH,34):
            for y in (24,HEIGHT-24):
                pg.draw.rect(ground,(65,85,49),(x,y,26,11),border_radius=3)
                pg.draw.rect(ground,(131,145,87),(x,y,23,4),border_radius=2)
        for y in range(50,HEIGHT-40,34):
            for x in (22,WIDTH-34):
                pg.draw.rect(ground,(65,85,49),(x,y,12,27),border_radius=3)
                pg.draw.rect(ground,(131,145,87),(x,y,10,4),border_radius=2)
        self.ground=ground
        return ground

    def panel(self,surface,rect,color=(28,51,40,235),border=(192,179,123),radius=14):
        layer=pg.Surface(rect.size,pg.SRCALPHA)
        pg.draw.rect(layer,color,layer.get_rect(),border_radius=radius)
        pg.draw.rect(layer,(*border,110),layer.get_rect(),1,border_radius=radius)
        surface.blit(layer,rect)

    def scene_draw(self,surface,run:Run,camera:Point):
        cx,cy=camera
        surface.fill((43,67,44))
        surface.blit(self.terrain(run.layout),(-round(cx),-round(cy)))
        # Gate stays centered on its navigable destination, regardless of map orientation.
        gx,gy=run.layout.exit;gx-=cx;gy-=cy
        col=GOLD if run.exit_ready else (180,171,129)
        pg.draw.rect(surface,(66,62,36),(gx-36,gy-10,10,43),border_radius=3)
        pg.draw.rect(surface,(66,62,36),(gx+28,gy-10,10,43),border_radius=3)
        pg.draw.rect(surface,col,(gx-40,gy-45,84,38),border_radius=6)
        self.text(surface,'FAZENDA' if isinstance(run,Survival) else 'SAÍDA' if run.exit_ready else 'PORTEIRA',(gx+2,gy-26),15,INK,True,True)
        if run.exit_ready:
            pg.draw.line(surface,(255,225,139),(gx-21,gy+14),(gx+20,gy+14),3)
            pg.draw.lines(surface,(255,225,139),False,[(gx+12,gy+6),(gx+20,gy+14),(gx+12,gy+22)],3)
        if run.boss and run.boss.mode in ('warning','charge'):
            b=run.boss;layer=pg.Surface(SIZE,pg.SRCALPHA)
            start=(b.x-cx,b.y-cy);end=(start[0]+b.aim[0]*460,start[1]+b.aim[1]*460)
            pg.draw.line(layer,(255,176,65,74),start,end,54)
            pg.draw.line(layer,(255,211,112,200),start,end,2)
            angle=atan2(b.aim[1],b.aim[0])
            tip1=(end[0]-cos(angle-.55)*18,end[1]-sin(angle-.55)*18)
            tip2=(end[0]-cos(angle+.55)*18,end[1]-sin(angle+.55)*18)
            pg.draw.lines(layer,(255,217,127,245),False,[tip1,end,tip2],3)
            surface.blit(layer,(0,0))
        if run.decoy:
            for i in range(9):
                x=run.decoy[0]-cx+(i%3)*6-8;y=run.decoy[1]-cy+(i//3)*5-4
                pg.draw.rect(surface,(246,205,68),(x,y,4,3),border_radius=1)
        if isinstance(run,Survival):
            for item in run.pickups:
                x,y=round(item.x-cx),round(item.y-cy)
                if not -30<x<SIZE[0]+30 or not -30<y<SIZE[1]+30:continue
                color=COLORS[item.kind]
                if item.kind=='xp':
                    pg.draw.polygon(surface,color,[(x,y-7),(x+5,y),(x,y+7),(x-5,y)])
                else:
                    self.pickup_icon(surface,item.kind,x,y)
                    if distance2(item.pos,run.player.pos)<100:
                        self.tag(surface,POWERS[item.kind][0] if item.kind in POWERS else 'Leite · +2 vidas',(x,y-38))
        drawables=[(p.y,0,p) for p in run.layout.props]
        drawables += [(a.y,1,a) for a in run.friends+run.enemies+[run.player]+([run.boss] if run.boss else [])]
        for _,kind,a in sorted(drawables,key=lambda v:v[0]):
            if not -240<a.x-cx<SIZE[0]+240 or not -70<a.y-cy<SIZE[1]+250:continue
            if kind==0:
                image=self.prop(a)
                rect=image.get_rect(midbottom=(round(a.x-cx),round(a.y-cy)))
                if isinstance(run,Survival) and a.y>run.player.y and rect.collidepoint(run.player.x-cx,run.player.y-cy-30):
                    image=image.copy();image.set_alpha(100)
                surface.blit(image,rect)
            else:
                self.actor(surface,a,camera,145 if a is run.player and a.invulnerable>0 and int(run.elapsed*12)%2 else 255)
        for f in run.friends:
            if not f.rescued and distance2(f.pos,run.player.pos)<180:
                self.tag(surface,f.name,(f.x-cx,f.y-cy-80))
        if run.boss and run.boss.mode=='stunned':
            b=run.boss
            self.tag(surface,'E · CONTRA-ATACAR',(b.x-cx,b.y-cy-100))
            for i in range(3):
                a=run.elapsed*4+i*pi*2/3
                pg.draw.rect(surface,GOLD,(b.x-cx+cos(a)*27,b.y-cy-80+sin(a)*7,5,5))
        if run.player.shield:
            p=run.player
            pg.draw.arc(surface,GOLD,(p.x-cx-28,p.y-cy-72,56,50),.25,2.9,2)
        for e in run.effects:
            t=1-e['time']/.55
            if e['kind']=='sickle':
                radius=e['radius']
                rect=pg.Rect(e['x']-cx-radius,e['y']-cy-radius,2*radius,2*radius)
                pg.draw.arc(surface,COLORS['sickle'],rect,t*2*pi,t*2*pi+2.2,4)
            col=(246,179,124) if e['kind']=='hurt' else GOLD
            for i in range(8):
                a=i*pi/4
                pg.draw.rect(surface,col,(e['x']-cx+cos(a)*t*38,e['y']-cy-10+sin(a)*t*28,4,3))
        if isinstance(run,Survival):
            for shot in run.shots:
                x,y=round(shot.x-cx),round(shot.y-cy)
                pg.draw.ellipse(surface,INK,(x-6,y-8,12,16))
                pg.draw.ellipse(surface,COLORS[shot.kind],(x-4,y-6,8,12))

    def pickup_icon(self,surface,kind,x,y):
        rect=pg.Rect(x-15,y-15,30,30)
        pg.draw.rect(surface,INK,rect,border_radius=7)
        pg.draw.rect(surface,COLORS[kind],rect,2,border_radius=7)
        color=COLORS[kind]
        if kind=='cornshot':
            pg.draw.ellipse(surface,color,(x-5,y-10,10,19))
            pg.draw.lines(surface,(115,184,92),False,[(x-10,y),(x,y+11),(x+9,y-3)],3)
        elif kind=='egg':pg.draw.ellipse(surface,color,(x-7,y-10,14,21))
        elif kind=='sickle':
            pg.draw.line(surface,(190,140,90),(x-6,y+10),(x+1,y-4),3)
            pg.draw.arc(surface,color,(x-7,y-10,18,15),-.5,pi,3)
        elif kind=='boots':
            pg.draw.polygon(surface,color,[(x-7,y-9),(x+2,y-9),(x+2,y+4),(x+9,y+4),(x+9,y+10),(x-7,y+10)])
        else:
            pg.draw.rect(surface,color,(x-6,y-7,12,17),border_radius=3)
            pg.draw.rect(surface,PAPER,(x-4,y-11,8,5))

    def tag(self,surface,text,pos):
        w=self.font(15).size(text)[0]+18
        rect=pg.Rect(0,0,w,27);rect.center=pos
        self.panel(surface,rect,(31,55,39,222),radius=7)
        self.text(surface,text,rect.center,15,PAPER,center=True)

    def hud(self,surface,run:Run,buttons:list):
        if isinstance(run,Survival):
            self.survival_hud(surface,run,buttons)
            return
        cfg=STAGES[run.stage]
        self.panel(surface,pg.Rect(20,18,320,78))
        self.text(surface,f'FASE {run.stage+1:02} / 10   ·   NÍVEL {run.level}',(36,28),13,GOLD)
        self.text(surface,cfg.name,(36,50),24,PAPER,True)
        self.panel(surface,pg.Rect(956,18,224,78))
        self.text(surface,'VIDAS',(973,28),12,MUTED)
        for i in range(run.max_hp):self.heart(surface,(982+i*33,63),i<run.hp)
        text=f'{run.rescued}/{cfg.friends} amigos reunidos' if not run.boss else ('Porteira liberada' if run.boss.health==0 else 'Espere a abertura do chefe')
        self.panel(surface,pg.Rect(375,20,450,46),(33,54,38,222))
        self.text(surface,text,(600,43),18,PAPER,center=True)
        if run.boss and run.boss.health>0:
            b=run.boss;self.panel(surface,pg.Rect(430,82,340,56),(55,40,32,234))
            self.text(surface,b.name.upper(),(600,96),14,GOLD,center=True)
            pg.draw.rect(surface,(97,77,57),(453,116,294,7),border_radius=3)
            pg.draw.rect(surface,(220,155,100),(453,116,round(294*b.health/b.maximum),7),border_radius=3)
        # Minimap shows actual procedural positions, not an unrelated stock picture.
        rect=pg.Rect(996,112,184,120);self.panel(surface,rect,(26,48,34,225),radius=9)
        def mp(p):return round(rect.x+8+p[0]/WIDTH*(rect.w-16)),round(rect.y+8+p[1]/HEIGHT*(rect.h-16))
        for a,b in run.layout.roads:pg.draw.line(surface,(130,125,81),mp(a),mp(b),2)
        for f in run.friends:
            if not f.rescued:pg.draw.circle(surface,GOLD,mp(f.pos),3)
        for e in run.enemies:pg.draw.circle(surface,(222,122,87),mp(e.pos),3)
        if run.boss:pg.draw.circle(surface,(222,122,87),mp(run.boss.pos),4)
        pg.draw.rect(surface,GOLD,(*mp(run.layout.exit),5,5))
        pg.draw.circle(surface,PAPER,mp(run.player.pos),4)
        self.panel(surface,pg.Rect(0,684,1200,76),(22,43,34,248),radius=0)
        self.text(surface,'WASD / SETAS',(24,695),13,GOLD)
        self.text(surface,'Mover   ·   ESC pausa   ·   F11 tela cheia',(24,718),14,MUTED)
        for key,label,cool,x,enabled in [
            ('ESPAÇO','Esquiva',run.player.dash_cooldown,470,True),
            ('Q','Isca de milho',run.player.corn_cooldown,695,bool(run.skills.get('corn'))),
            ('E','Interagir',0,920,bool(run.boss and run.boss.mode=='stunned'))]:
            r=pg.Rect(x,694,205,54)
            self.panel(surface,r,(42,65,45,235) if enabled and cool<=0 else (30,48,37,220),radius=10)
            self.text(surface,key,(x+12,700),11,GOLD if enabled else MUTED)
            self.text(surface,(f'{cool:.1f}s' if cool>0 else label) if enabled else 'Carta necessária' if key=='Q' else label,(x+12,719),17,PAPER if enabled else MUTED,True)
            buttons.append((r,'dash' if key=='ESPAÇO' else 'corn' if key=='Q' else 'interact'))
        if run.notice_time>0:
            width=min(830,self.font(17).size(run.notice)[0]+36);r=pg.Rect(0,0,width,43);r.center=(600,655)
            self.panel(surface,r,(31,52,37,241),radius=10)
            self.text(surface,run.notice,r.center,17,PAPER,center=True)

    @staticmethod
    def heart(surface,pos,full):
        x,y=pos;col=(231,144,111) if full else (78,95,76)
        points=[(x-10,y-5),(x-6,y-9),(x-1,y-9),(x+2,y-6),(x+5,y-9),(x+10,y-9),(x+14,y-5),(x+14,y),(x+2,y+11),(x-10,y)]
        pg.draw.polygon(surface,col,points)

    def survival_hud(self,surface,run,buttons):
        self.panel(surface,pg.Rect(20,18,320,78))
        self.text(surface,f'SHUFFLE  ·  ONDA {min(10,run.wave)}  ·  NÍVEL {run.level}',(36,28),13,GOLD)
        self.text(surface,STAGES[run.stage].name,(36,50),24,PAPER,True)
        self.panel(surface,pg.Rect(400,18,400,78))
        remaining=max(0,int(DURATION-run.elapsed))
        self.text(surface,f'{remaining//60:02}:{remaining%60:02}  ·  {run.kills} afastados  ·  {len(run.enemies)} na horda',(600,42),18,PAPER,center=True)
        pg.draw.rect(surface,(63,82,53),(423,66,354,9),border_radius=4)
        pg.draw.rect(surface,COLORS['xp'],(423,66,round(354*run.xp/run.xp_needed),9),border_radius=4)
        self.panel(surface,pg.Rect(956,18,224,78))
        self.text(surface,'VIDAS',(973,28),12,MUTED)
        for i in range(run.max_hp):self.heart(surface,(982+i*33,63),i<run.hp)
        rect=pg.Rect(996,112,184,120);self.panel(surface,rect,(26,48,34,225),radius=9)
        def mp(p):return round(rect.x+8+p[0]/WIDTH*(rect.w-16)),round(rect.y+8+p[1]/HEIGHT*(rect.h-16))
        for a,b in run.layout.roads:pg.draw.line(surface,(130,125,81),mp(a),mp(b),2)
        for item in run.pickups:
            if item.kind!='xp':pg.draw.circle(surface,COLORS[item.kind],mp(item.pos),3)
        for enemy in run.enemies:pg.draw.circle(surface,(222,122,87),mp(enemy.pos),2)
        pg.draw.circle(surface,PAPER,mp(run.player.pos),4)
        self.panel(surface,pg.Rect(0,684,1200,76),(22,43,34,248),radius=0)
        self.text(surface,'WASD / SETAS  ·  ESC pausa',(20,695),13,GOLD)
        self.text(surface,'Ataques automáticos · Colete os itens',(20,721),14,MUTED)
        for i,kind in enumerate(POWERS):
            x=360+i*164;rank=run.powers.get(kind,0)
            self.pickup_icon(surface,kind,x+16,719)
            label={'cornshot':'Milho','egg':'Ovos','sickle':'Foice','boots':'Botas'}[kind]
            self.text(surface,label,(x+39,694),14,GOLD)
            self.text(surface,f'{rank}/3' if rank else 'Colete',(x+39,718),16,PAPER if rank else MUTED)
        rect=pg.Rect(1032,695,153,54);self.panel(surface,rect)
        self.text(surface,'ESPAÇO',(1044,701),11,GOLD)
        cool=run.player.dash_cooldown
        self.text(surface,f'{cool:.1f}s' if cool>0 else 'Esquiva',(1044,721),16)
        buttons.append((rect,'dash'))
        if run.notice_time>0:
            width=min(1120,self.font(17).size(run.notice)[0]+36);rect=pg.Rect(0,0,width,43);rect.center=(600,655)
            self.panel(surface,rect)
            self.text(surface,run.notice,rect.center,17,PAPER,center=True)


def distance2(a,b):return hypot(a[0]-b[0],a[1]-b[1])
