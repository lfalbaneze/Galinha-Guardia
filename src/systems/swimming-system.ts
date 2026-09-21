/* Swimming follows the real shoreline and equipped animal; no extra save state is needed. */
const SwimmingSystem = (() => {
  type Swimmer = Farm.Chicken & {skin?:string};
  const FEET=14;
  function depthAt(game: Farm.GameState, feet: Farm.Point): number {
    if(game.phase==='win_cutscene'||game.phase==='won')return 0;
    const pond=WORLD.layout.structures.pond;
    if(!pond||pond.w<=0||pond.h<=0)return 0;
    if(game.lake?.completed) {
      const b=LakeChallenge.bridge();
      if(feet.x>=b.x&&feet.x<=b.x+b.w&&feet.y>=b.y&&feet.y<=b.y+b.h)return 0;
    }
    const radius=Math.hypot((feet.x-pond.x-pond.w/2)/(pond.w*.47),(feet.y-pond.y-pond.h/2)/(pond.h*.47));
    // A shallow rim gives the feet time to enter before the float appears.
    return clamp((.94-radius)/.22,0,1);
  }
  function profile(game: Farm.GameState): {depth:number;native:boolean;swimming:boolean} {
    const c=game.entities.chicken as Swimmer, species=CharacterArt.appearances[c.skin||'classic']?.species;
    const depth=depthAt(game,{x:c.x,y:c.y+FEET});
    return {depth,native:species==='duck'||species==='goose',swimming:depth>.15};
  }
  function hint(game: Farm.GameState): string | null {
    const swim=profile(game);
    if(!swim.swimming) {
      const pond=WORLD.layout.structures.pond,c=game.entities.chicken;
      if(!pond||pond.w<=0||pond.h<=0)return null;
      const radius=Math.hypot((c.x-pond.x-pond.w/2)/(pond.w*.47),(c.y+FEET-pond.y-pond.h/2)/(pond.h*.47));
      return radius>=.9&&radius<1.5 ? 'Pode entrar! Boia automática para quem não nasceu pato. Nade com os mesmos controles.' : null;
    }
    const run=typeof GameInput==='undefined'?'Shift':GameInput.label('run');
    return swim.native ? `Pé de pato, licença vitalícia! ${run} para nadar mais rápido. Vá até a margem para sair.` :
      `Boia na cintura, dignidade na margem. ${run} para remar mais rápido. É só voltar à margem para sair!`;
  }
  function draw(game: Farm.GameState): boolean {
    const swim=profile(game),c=game.entities.chicken as Swimmer;
    if(swim.depth<=0||c.hidden)return false;
    const p=worldToScreen(c),current=CharacterArt.frameFor('chicken',{direction:CharacterArt.heading(c),skin:c.skin});
    if(!current)return false;
    const reduced=InterfaceMotion.reduced,clock=game.elapsed||0,amount=swim.depth;
    const bob=reduced?0:Math.sin(clock*3.3)*1.3*amount;
    const rx=Math.round(Math.max(swim.native?23:30,Math.min(swim.native?32:36,current.pose.width*current.scale*(swim.native?.62:.58))));
    // Shorter animals keep their faces above the near rim in every direction.
    const sink=swim.native?12:clamp((current.pose.bottom-current.pose.top)*current.scale*.35-7,4,14);
    const waterY=p.y+FEET-5*amount,ringY=waterY+bob;
    ctx.save();ctx.imageSmoothingEnabled=false;
    // The submerged silhouette has no land shadow; the waterline and wake give it weight.
    ctx.save();ctx.globalAlpha*=amount;
    const pond=WORLD.layout.structures.pond;
    ctx.beginPath();ctx.ellipse(worldX(pond.x+pond.w/2),worldY(pond.y+pond.h/2),pond.w*.47,pond.h*.47,0,0,Math.PI*2);ctx.clip();
    ctx.fillStyle='#246f7933';ctx.beginPath();ctx.ellipse(p.x,waterY+3,rx+3,9,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#d7f1d8';ctx.lineWidth=1.5;
    const phase=reduced?0:(clock*1.8)%1;
    for(let i=0;i<(c.moving?3:1);i++) {
      const step=i*6+phase*5;
      const vx=c.moving?-c.vx/Math.max(1,Math.hypot(c.vx,c.vy))*step:0;
      const vy=c.moving?-c.vy/Math.max(1,Math.hypot(c.vx,c.vy))*step:0;
      ctx.globalAlpha*=.7;ctx.beginPath();ctx.ellipse(p.x+vx,waterY+vy,rx+4+step*.3,7+step*.2,0,.05,Math.PI-.05);ctx.stroke();
    }
    if(swim.native&&c.moving) {
      ctx.globalAlpha=.35*amount;ctx.fillStyle='#eeb15d';
      const kick=reduced?0:Math.sin(clock*11)*3;
      ctx.fillRect(p.x-12,waterY+2+kick,5,3);ctx.fillRect(p.x+7,waterY+2-kick,5,3);
    }
    ctx.restore();
    if(!swim.native){ctx.save();ctx.globalAlpha*=amount;CharacterArt.drawFloat(ctx,p.x,ringY,rx*2,false);ctx.restore();}
    ctx.save();ctx.beginPath();ctx.rect(p.x-100,p.y-160,200,waterY+3-(p.y-160));ctx.clip();
    CharacterArt.draw(ctx,'chicken',p.x,p.y+amount*sink+bob,
      {skin:c.skin,direction:CharacterArt.heading(c),moving:c.moving,anim:c.anim*.5,shadow:false});
    ctx.restore();
    if(!swim.native){ctx.save();ctx.globalAlpha*=amount;CharacterArt.drawFloat(ctx,p.x,ringY,rx*2,true);ctx.restore();}
    else {
      ctx.globalAlpha*=amount;ctx.strokeStyle='#dcf4de';ctx.lineWidth=2;ctx.beginPath();
      ctx.ellipse(p.x,waterY+2,Math.min(23,rx-3),4,0,0,Math.PI);ctx.stroke();
    }
    ctx.restore();return true;
  }
  function drawWater(game: Farm.GameState): void {
    const pond=WORLD.layout.structures.pond;if(!pond)return;
    const clock=InterfaceMotion.reduced?0:game.elapsed||0;
    ctx.save();ctx.imageSmoothingEnabled=false;
    // Slow glints show that the deeper center is moving, even before entering it.
    for(let i=0;i<9;i++) {
      const a=i*2.4,rx=pond.w*(.12+(i%3)*.07),ry=pond.h*(.12+(i%2)*.09);
      const p={x:pond.x+pond.w/2+Math.cos(a)*rx,y:pond.y+pond.h/2+Math.sin(a)*ry};
      if(game.lake?.completed&&depthAt(game,p)===0)continue;
      ctx.globalAlpha=.14+(Math.sin(clock*1.5+i)+1)*.12;ctx.fillStyle='#daf4dc';
      ctx.fillRect(Math.round(worldX(p.x)),Math.round(worldY(p.y)),8+i%3*4,2);
    }
    ctx.restore();
  }
  return {depthAt,profile,hint,draw,drawWater};
})();
