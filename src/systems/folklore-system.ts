/* Local encounters share the base game's collision, refuge and save rules. */
declare namespace Farm {
  type FolkloreSpecies='fuinha'|'mula-sem-cabeca'|'curupira'|'boitata'|'cuca';
  interface FolkloreEnemy extends Entity {
    type:'folklore'; species:FolkloreSpecies; home:Point; target:Point;
    active:boolean; mode:'patrol'|'hunt'|'warning'|'attack'|'rest'|'return';
    timer:number; grace:number; trailTimer:number; route:Point[]; routeTimer:number;
    discovered:boolean; defeated:boolean; courage:number; maxCourage:number;
    speech?:string; speechTime?:number; speechCooldown?:number; speechCounts?:Record<string,number>; landed?:boolean;
    lastSeen?:Point; memory?:number;
    attacks?:number; attackPoints?:Point[]; warningDuration?:number; maneuver?:Point; maneuverTime?:number;
  }
  interface FolkloreThreat extends Point {
    kind:'roots'|'fire'|'spell'; species:FolkloreSpecies; arm:number; life:number; vx:number; vy:number; r:number;
  }
}
const FolkloreSystem=(()=>{
  const cast={
    fuinha:{name:'TIH',after:1,speed:110,size:62,color:'#e6bf8b',hint:'Arrancada à vista! Saia da frente.'},
    'mula-sem-cabeca':{name:'Mula sem Cabeça',after:3,speed:85,size:88,color:'#ffb347',hint:'Tropel de fogo! Desvie para o lado da faixa.'},
    curupira:{name:'Curupira',after:5,speed:95,size:68,color:'#b6dd75',hint:'As raízes vão brotar! Saia do círculo.'},
    boitata:{name:'Boitatá',after:7,speed:100,size:88,color:'#ffd16b',hint:'A serpente vai cruzar a faixa! Passe pela abertura e evite o rastro.'},
    cuca:{name:'Cuca',after:9,speed:70,size:82,color:'#d7a6ed',hint:'Olhe as linhas do feitiço! Encontre uma abertura ou use as cercas.'}
  } as const;
  const ids=Object.keys(cast) as Farm.FolkloreSpecies[];
  const secret=(e:Farm.FolkloreEnemy)=>e.species!=='fuinha';
  const fuinhaLines={
    appear:['Cheguei! Pode conferir o galinheiro.','Sou pequena. O problema, nem tanto.','Essa fazenda precisava de um desaforo.'],
    hunt:['Essas perninhas têm turbo!','Você corre. Eu corto caminho.','Sou fuinha, não sou visita!'],
    warning:['Pisca que eu passo!','Licença! O freio ficou em casa!','Agora vai! Segura esse desaforo!'],
    hit:['Peguei! Cadê meu troféu?','Um susto tamanho família!','Pequena, sim. Inofensiva, jamais!'],
    miss:['Meu freio pediu demissão!','Era ensaio. O tombo era de verdade.','Você saiu bem na minha melhor pose!']
  };
  const box:Farm.Hitbox={ox:0,oy:4,r:16},point=WildlifeRules.point;
  function visible(game:Farm.GameState,e:Farm.FolkloreEnemy):boolean{
    return distance(game.entities.chicken,e)<420&&WildlifeRules.onScreen(e,60)&&
      DetectionSystem.hasLineOfSight(getHitbox(game.entities.chicken),getHitbox(e));
  }
  function say(game:Farm.GameState,e:Farm.FolkloreEnemy,event:keyof typeof fuinhaLines):void{
    if(e.species!=='fuinha'||!visible(game,e))return;
    const counts=e.speechCounts||(e.speechCounts={}),choices=fuinhaLines[event],index=counts[event]||0;
    e.speech=choices[index%choices.length];counts[event]=index+1;e.speechTime=3;e.speechCooldown=7;
  }
  function artReady(id:Farm.FolkloreSpecies):boolean{return CharacterArt.ready&&!!CharacterArt.frameFor(id);}
  async function load():Promise<void>{await CharacterArt.load();}
  const threshold=(game:Farm.GameState,id:Farm.FolkloreSpecies)=>Math.max(0,cast[id].after+(game.difficultyKey==='easy'?1:game.difficultyKey==='hardcore'?-1:0));
  function initialize(game:Farm.GameState):void{
    game.entities.folklore=[];game.folkloreThreats=[];
    const points:Farm.Point[]=[];
    for(const r of WORLD.paths){
      const length=Math.max(r.w,r.h),steps=Math.max(1,Math.ceil(length/100));
      for(let i=0;i<=steps;i++){
        const p={x:r.x+(r.w>=r.h?r.w*i/steps:r.w/2),y:r.y+(r.h>r.w?r.h*i/steps:r.h/2)};
        if(!WildlifeRules.reserved(game,p,160)&&WildlifeRules.clear(p,p,box))points.push(p);
      }
    }
    for(const [i,species]of ids.entries()){
      const sorted=[...points].sort((a,b)=>WildlifeRules.rank(`${species}:${a.x}:${a.y}`)-WildlifeRules.rank(`${species}:${b.x}:${b.y}`));
      const home=[550,300,140].map(gap=>sorted.find(p=>game.entities.folklore!.every(e=>distance(p,e.home)>gap))).find(Boolean);
      if(!home)continue;
      game.entities.folklore.push({id:'folklore-'+species,type:'folklore',species,...home,home:point(home),target:point(home),
        radius:22,hitbox:{...box},vx:0,vy:0,facing:1,direction:'down',moving:false,anim:0,areaId:getAreaAt(home.x,home.y).id,state:'idle',
        active:false,mode:'patrol',timer:1+i*.3,grace:2,trailTimer:0,route:[],routeTimer:0,
        discovered:false,defeated:false,courage:3,maxCourage:3,speech:'',speechTime:0,speechCooldown:0,speechCounts:{}});
    }
  }
  function protectedPlayer(game:Farm.GameState):boolean{
    const p=game.entities.chicken;
    return p.hidden||p.invulnerable>0||FarmRefuge.contains(p)||distance(p,WORLD.safeZone)<WORLD.safeZone.r+35;
  }
  function candidate(game:Farm.GameState):Farm.FolkloreEnemy|undefined{
    if(game.phase!=='playing'||game.lake?.active||ThorSystem.active(game)||game.entities.chicken.hidden)return;
    const player=game.entities.chicken,active=game.entities.folklore?.find(e=>secret(e)&&e.active);
    return game.entities.folklore?.filter(e=>secret(e)&&!e.defeated&&artReady(e.species)&&
      game.rescuedCount>=threshold(game,e.species)&&(!active||active===e)&&
      (e.active?e.mode==='rest':true)&&distance(player,e.active?e:e.home)<(e.active?105:85)&&
      DetectionSystem.hasLineOfSight(getHitbox(player),e.active?getHitbox(e):e.home))
      .sort((a,b)=>distance(player,a)-distance(player,b))[0];
  }
  function hint(game:Farm.GameState):string|null{
    if(game.phase!=='playing'||game.lake?.active||ThorSystem.active(game))return null;
    const e=candidate(game),key=GameInput.label('interact');
    if(e)return e.active?`${key} · Contra-atacar ${cast[e.species].name}!`:`${key} · Despertar selo esquecido (chefe opcional).`;
    const boss=game.entities.folklore?.find(e=>secret(e)&&e.active&&distance(e,game.entities.chicken)<500);
    return boss?`${cast[boss.species].name} · ${boss.courage}/${boss.maxCourage}. ${boss.mode==='rest'?`Abertura! Chegue perto e use ${key}.`:'Desvie e espere a abertura para contra-atacar.'}`:null;
  }
  function interact(game:Farm.GameState):boolean{
    const e=candidate(game);if(!e)return false;
    const player=game.entities.chicken;
    if(!e.active){
      Object.assign(e,point(e.home));e.active=true;e.discovered=true;e.mode='patrol';e.grace=2;e.timer=2;e.route=[];
      player.invulnerable=Math.max(player.invulnerable,2);
      AudioSystem.playFolklore(e.species,'warn',e);
      setStatus(`CHEFE SECRETO: ${cast[e.species].name}! Desvie dos ataques; chegue perto e use ${GameInput.label('interact')} quando aparecer ABERTURA. Você pode sair da região para recuar.`);
      spawnBurst(e.x,e.y,cast[e.species].color,20);
    }else{
      e.courage--;spawnBurst(e.x,e.y,cast[e.species].color,14);AudioSystem.play('bonk',{volume:.6});
      e.mode='return';e.timer=1.5;e.grace=1;e.route=[];e.attackPoints=[];e.maneuver=undefined;
      game.folkloreThreats=(game.folkloreThreats||[]).filter(h=>h.species!==e.species);
      if(e.courage<=0){
        AudioSystem.playFolklore(e.species,'defeat',e);
        e.defeated=true;e.active=false;game.score+=250;game.lives=Math.min(MAX_LIVES,game.lives+1);
        Object.assign(e,point(e.home));AudioSystem.play('rescue',{volume:.7});
        setStatus(`LENDA VENCIDA! ${cast[e.species].name}: +250 pontos e até 1 coração. O selo se apagou.`, 'win');
      }else setStatus(`${cast[e.species].name}: ${e.courage} contra-ataques restantes. Prepare-se para a próxima investida!`);
    }
    refreshHud();GameManager.save(game);return true;
  }
  function hit(game:Farm.GameState,from:Farm.Point,species:Farm.FolkloreSpecies,radius=28):boolean{
    const p=game.entities.chicken;
    if(game.phase!=='playing'||game.lake?.active||protectedPlayer(game)||distance(from,p)>radius+p.hitbox.r||
      !DetectionSystem.hasLineOfSight(from,getHitbox(p)))return false;
    p.invulnerable=1.6;game.lives=Math.max(0,game.lives-1);
    const d=distance(from,p)||1;Player.move(p,(p.x-from.x)/d*35,(p.y-from.y)/d*35);
    AudioSystem.playPlayerHurt(game);spawnBurst(p.x,p.y,cast[species].color,8);
    if(species==='fuinha'){
      const speaker=game.entities.folklore?.find(e=>e.species===species);
      if(speaker){speaker.landed=true;say(game,speaker,'hit');}
    }
    if(!game.lives)finishLose(`${cast[species].name} levou essa! ${cast[species].hint}`);
    else setStatus(`${cast[species].name} tirou um coração. ${cast[species].hint}`);
    refreshHud();GameManager.save(game);return true;
  }
  function threat(game:Farm.GameState,e:Farm.FolkloreEnemy,p:Farm.Point,kind:Farm.FolkloreThreat['kind'],vx=0,vy=0):void{
    const r=kind==='roots'?30:kind==='fire'?19:7;
    if((game.folkloreThreats?.length||0)>=32||WildlifeRules.overlapsRefuge(p,r)||!WildlifeRules.clear(p,p,{ox:0,oy:0,r}))return;
    game.folkloreThreats!.push({...p,kind,species:e.species,arm:kind==='roots'?.95:kind==='fire'?.6:0,
      life:kind==='spell'?2.5:3,vx,vy,r});
  }
  function lane(from:Farm.Point,to:Farm.Point,hitbox:Farm.Hitbox):Farm.Point{
    const length=distance(from,to);let end=point(from);
    for(let s=5;s<length+5;s+=5){
      const ratio=Math.min(s/Math.max(1,length),1),next={x:from.x+(to.x-from.x)*ratio,y:from.y+(to.y-from.y)*ratio};
      if(WildlifeRules.overlapsRefuge({x:next.x+hitbox.ox,y:next.y+hitbox.oy},hitbox.r)||!WildlifeRules.clear(end,next,hitbox))break;
      end=next;
    }
    return end;
  }
  function prepare(game:Farm.GameState,e:Farm.FolkloreEnemy,tempo:number,scale:number):void{
    const player=game.entities.chicken,angle=Math.atan2(player.y-e.y,player.x-e.x),turn=e.attacks||0;
    const phase=e.maxCourage-e.courage,hard=game.difficultyKey==='hard'||game.difficultyKey==='hardcore';
    e.target=point(player);e.attackPoints=[];e.attacks=turn+1;e.maneuver=undefined;
    if(e.species==='curupira'){
      const cross=angle+(turn%2?0:Math.PI/2),spread=game.difficultyKey==='easy'?125:110;
      const offsets=phase>0||hard?[-spread,0,spread]:[0];
      e.attackPoints=offsets.map(offset=>({x:player.x+Math.cos(cross)*offset,y:player.y+Math.sin(cross)*offset}))
        .filter(p=>distance(p,e.home)<420&&!WildlifeRules.overlapsRefuge(p,30)&&WildlifeRules.clear(p,p,{ox:0,oy:0,r:30})&&
          DetectionSystem.hasLineOfSight(getHitbox(e),p));
    }else if(e.species==='cuca'){
      const offsets=turn%2?[-.48,-.23,.23,.48]:phase>0||hard?[-.5,-.25,0,.25,.5]:[-.24,0,.24];
      e.attackPoints=offsets.map(offset=>lane(e,{x:e.x+Math.cos(angle+offset)*450*scale,
        y:e.y+Math.sin(angle+offset)*450*scale},{ox:0,oy:0,r:7})).filter(p=>distance(e,p)>20);
    }else if(e.species==='boitata'){
      const side=turn%2?1:-1,reach=Math.min(240,distance(e,player)+70);
      let from=point(e);
      // Three fixed legs leave a real escape side; the trail never follows a hidden player.
      for(const bend of [0,.7*side,1.4*side]){
        const next=lane(from,{x:from.x+Math.cos(angle+bend)*reach/(bend===0?1:1.8),
          y:from.y+Math.sin(angle+bend)*reach/(bend===0?1:1.8)},e.hitbox);
        if(distance(next,e.home)>420||distance(from,next)<20)break;
        e.attackPoints.push(next);from=next;
      }
      e.target=e.attackPoints[0]||point(e);
    }else{
      const speed=Math.hypot(player.vx,player.vy),lead=e.species==='fuinha'?Math.min(35,speed*.16):0;
      const reach=e.species==='mula-sem-cabeca'?90:0;
      const predicted={x:player.x+(speed?player.vx/speed*lead:0)+Math.cos(angle)*reach,
        y:player.y+(speed?player.vy/speed*lead:0)+Math.sin(angle)*reach};
      e.target=lane(e,predicted,e.hitbox);
    }
    e.mode='warning';e.route=[];e.landed=false;say(game,e,'warning');
    e.warningDuration=Math.max(.65,(e.species==='cuca'?1.15:e.species==='curupira'?.8:e.species==='boitata'?1.15:1)*tempo);
    e.timer=e.warningDuration;Player.face(e,player.x-e.x,player.y-e.y);
    AudioSystem.playFolklore(e.species,'warn',e);setStatus(`${cast[e.species].name}: ${cast[e.species].hint}`);
  }
  function approach(game:Farm.GameState,e:Farm.FolkloreEnemy,scale:number,dt:number):void{
    const p=game.entities.chicken,gap=distance(e,p),angle=Math.atan2(e.y-p.y,e.x-p.x);
    // Cuca keeps casting distance; the small hunters alternate sides instead of forming a queue.
    if((e.maneuverTime||0)<=0||!e.maneuver||distance(e,e.maneuver)<8){
      const radius=e.species==='cuca'?205:e.species==='curupira'?175:115;
      const side=(e.attacks||0)%2?1:-1;
      const candidates=[.55*side,-.55*side,0].map(offset=>({x:p.x+Math.cos(angle+offset)*radius,y:p.y+Math.sin(angle+offset)*radius}));
      e.maneuver=candidates.find(target=>distance(target,e.home)<400&&!WildlifeRules.overlapsRefuge(target,e.hitbox.r)&&
        WildlifeRules.clear(e,target,e.hitbox)&&DetectionSystem.hasLineOfSight(target,getHitbox(p)));
      e.maneuverTime=.75;
    }
    if(e.species==='cuca'&&gap>170&&gap<235)return;
    move(e,e.maneuver||p,cast[e.species].speed*scale,dt);
  }
  function move(e:Farm.FolkloreEnemy,target:Farm.Point,speed:number,dt:number,onStep?:()=>boolean):void{
    if(WildlifeRules.clear(e,target,e.hitbox))e.route=[];
    else {
      if(e.routeTimer<=0){e.route=WolfAI.findPath(e,target);e.routeTimer=.8;}
      if(!e.route.length)return;
      target=e.route[0];
    }
    const result=WildlifeRules.move(e,target,speed*dt,onStep);
    if(result==='arrived')e.route.shift();
    if(result==='blocked'){e.route=[];e.routeTimer=.3;}
  }
  function update(game:Farm.GameState,dt:number):void{
    if(game.phase!=='playing'||game.lake?.active||ThorSystem.active(game)||!Number.isFinite(dt)||dt<=0)return;
    dt=Math.min(.1,dt);const player=game.entities.chicken;
    const tempo=game.difficultyKey==='easy'?1.2:game.difficultyKey==='hard'?.95:game.difficultyKey==='hardcore'?.9:1;
    const scale=(game.difficultyKey==='easy'?.9:1)+Math.min(.3,game.rescuedCount*.018+
      (game.difficultyKey==='hardcore'?.1:game.difficultyKey==='hard'?.05:0));
    for(const e of game.entities.folklore||[]){
      if(!artReady(e.species))continue;
      e.speechTime=Math.max(0,(e.speechTime||0)-dt);e.speechCooldown=Math.max(0,(e.speechCooldown||0)-dt);
      if(!e.active){
        if(secret(e)){
          if(!e.defeated&&game.rescuedCount>=threshold(game,e.species)&&distance(e.home,player)<190&&
            DetectionSystem.hasLineOfSight(getHitbox(player),e.home)&&!e.discovered){
            e.discovered=true;setStatus(`Uma marca antiga apareceu no chão. Aproxime-se e use ${GameInput.label('interact')} para despertar uma lenda opcional.`);
          }
          continue;
        }
        if(game.rescuedCount<threshold(game,e.species)||distance(e,player)<260)continue;
        e.active=true;e.grace=2;AudioSystem.playFolklore(e.species,'warn',e);setStatus(`${cast[e.species].name} apareceu na fazenda! ${cast[e.species].hint}`);
      }
      if(secret(e)&&distance(player,e.home)>650){
        e.active=false;e.moving=false;Object.assign(e,point(e.home));
        game.folkloreThreats=(game.folkloreThreats||[]).filter(h=>h.species!==e.species);
        setStatus('Você recuou. O selo guarda seu progresso para outra tentativa.');GameManager.save(game);continue;
      }
      const before=point(e);e.timer-=dt;e.grace=Math.max(0,e.grace-dt);e.routeTimer-=dt;e.trailTimer-=dt;
      e.maneuverTime=(e.maneuverTime||0)-dt;
      const seen=!protectedPlayer(game)&&distance(player,e.home)<420&&WildlifeRules.observe(game,getHitbox(e),340);
      e.memory=Math.max(0,(e.memory||0)-dt);
      if(seen){e.lastSeen=point(player);e.memory=game.difficultyKey==='easy'?1.2:2.4;}
      if(FarmRefuge.contains(player)){
        e.memory=0;e.lastSeen=undefined;
        if(['hunt','warning','attack'].includes(e.mode)){e.mode='return';e.route=[];e.routeTimer=0;e.attackPoints=[];e.maneuver=undefined;}
      }
      if(e.species==='fuinha'&&seen&&!e.speechCounts?.appear)say(game,e,'appear');
      if(e.grace>0){e.moving=false;continue;}
      if(e.mode==='warning'){
        if(protectedPlayer(game)){e.mode='rest';e.timer=1;}
        else if(e.timer<=0){
          AudioSystem.playFolklore(e.species,'attack',e);
          if(e.species==='curupira'){
            for(const p of e.attackPoints||[e.target])threat(game,e,p,'roots');
            e.mode='rest';e.timer=3.2;
          }
          else if(e.species==='cuca'){
            for(const p of e.attackPoints||[e.target]){
              const a=Math.atan2(p.y-e.y,p.x-e.x);
              threat(game,e,e,'spell',Math.cos(a)*180*scale,Math.sin(a)*180*scale);
            }
            e.mode='rest';e.timer=3;
          }else{e.mode='attack';e.timer=e.species==='boitata'?3.2:Math.max(.8,distance(e,e.target)/(340*scale)+.1);e.trailTimer=0;}
        }
      }else if(e.mode==='attack'){
        const from=point(e);
        const speed=e.species==='fuinha'?250:e.species==='boitata'?180:340;
        const result=WildlifeRules.move(e,e.target,speed*scale*dt,()=>hit(game,e,e.species,18));
        if(e.species==='boitata'&&distance(e,from)>.1&&e.trailTimer<=0){threat(game,e,e,'fire');e.trailTimer=.38;}
        if(e.species==='boitata'&&result==='arrived'&&(e.attackPoints?.length||0)>1){
          e.attackPoints!.shift();e.target=e.attackPoints![0];
        }
        if(e.timer<=0||distance(e,e.target)<8||distance(e,from)<.1||player.invulnerable>0){
          if(!e.landed)say(game,e,'miss');e.mode='rest';e.timer=secret(e)?3:1.4;
        }
      }else if(e.mode==='rest'){
        if(e.timer<=0){e.mode='return';e.timer=.6;}
      }else if(!seen||e.mode==='return'){
        if(e.mode!=='return'&&e.lastSeen&&e.memory>0){
          e.mode='hunt';move(e,e.lastSeen,cast[e.species].speed*scale,dt);
        }else{
          move(e,e.home,cast[e.species].speed,dt);
          if(distance(e,e.home)<5){e.mode='patrol';if(e.timer<0)e.timer=.4;}
        }
      }else if(e.species==='cuca'&&distance(e,player)<135&&e.timer>-1.4){
        e.mode='hunt';approach(game,e,scale,dt);
      }else if(e.timer<=0&&distance(e,player)<(e.species==='fuinha'?165:290)){
        prepare(game,e,tempo,scale);
      }else{
        e.mode='hunt';approach(game,e,scale,dt);
        if((e.speechCooldown||0)<=0)say(game,e,'hunt');
      }
      const traveled=distance(before,e);e.vx=(e.x-before.x)/dt;e.vy=(e.y-before.y)/dt;e.moving=traveled>.01;
      e.anim=CharacterArt.advance(e.anim,e.species,traveled,{speed:traveled/dt});e.state=e.moving?'walk':'idle';
      if(game.phase!=='playing')break;
    }
    game.folkloreThreats=(game.folkloreThreats||[]).filter(h=>{
      if(game.phase!=='playing')return false;
      h.arm-=dt;h.life-=dt;if(h.life<=0)return false;
      if(h.kind==='spell'){
        const next={x:h.x+h.vx*dt,y:h.y+h.vy*dt};
        if(!WildlifeRules.clear(h,next,{ox:0,oy:0,r:h.r})||WildlifeRules.overlapsRefuge(next,h.r))return false;
        Object.assign(h,next);
      }
      if(h.arm<=0&&hit(game,h,h.species,h.r)&&h.kind==='spell')return false;
      return true;
    });
  }
  function drawEntity(e:Farm.FolkloreEnemy):void{
    if(!e.active)return;
    CharacterArt.draw(ctx,e.species,worldX(e.x),worldY(e.y),{direction:CharacterArt.heading(e),anim:e.anim,moving:e.moving,sprinting:e.mode==='attack',shadow:false,scale:secret(e)?1.5:1});
  }
  function drawGround(game:Farm.GameState):void{
    if(game.lake?.active)return;ctx.save();ctx.lineWidth=2;
    for(const e of game.entities.folklore||[])if(secret(e)&&e.discovered&&!e.active&&!e.defeated&&WildlifeRules.onScreen(e.home,50)){
      const x=worldX(e.home.x),y=worldY(e.home.y);ctx.strokeStyle=cast[e.species].color;ctx.fillStyle='#243a2bd9';
      ctx.beginPath();ctx.arc(x,y,26,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle=cast[e.species].color;ctx.font='bold 25px Trebuchet MS';ctx.textAlign='center';ctx.fillText('?',x,y+8);
    }
    for(const h of game.folkloreThreats||[]){
      if(!WildlifeRules.onScreen(h,50))continue;
      ctx.fillStyle=h.kind==='roots'?'#7fbb5760':h.kind==='fire'?'#ff933777':'#c18cff';
      ctx.strokeStyle=cast[h.species].color;ctx.setLineDash(h.arm>0?[4,4]:[]);
      ctx.beginPath();ctx.arc(worldX(h.x),worldY(h.y),h.r,0,Math.PI*2);ctx.fill();ctx.stroke();
    }
    ctx.setLineDash([]);
    for(const e of game.entities.folklore||[]){
      // The origin may be outside a narrow screen while the warned area is on the player.
      if(!e.active||e.mode!=='warning')continue;
      ctx.strokeStyle=cast[e.species].color;ctx.fillStyle=cast[e.species].color+'44';
      if(e.species==='curupira'){
        for(const p of e.attackPoints||[e.target]){
          ctx.beginPath();ctx.arc(worldX(p.x),worldY(p.y),30,0,Math.PI*2);ctx.fill();ctx.stroke();
        }
      }else{
        const points=e.species==='cuca'||e.species==='boitata'?e.attackPoints||[e.target]:[e.target];
        let from:Farm.Point=e;
        for(const p of points){
          ctx.lineWidth=e.species==='cuca'?14:2*(e.hitbox.r+game.entities.chicken.hitbox.r);ctx.globalAlpha=.28;
          ctx.beginPath();ctx.moveTo(worldX(from.x),worldY(from.y));ctx.lineTo(worldX(p.x),worldY(p.y));ctx.stroke();
          ctx.globalAlpha=.95;ctx.lineWidth=2;ctx.setLineDash([6,5]);
          ctx.beginPath();ctx.moveTo(worldX(from.x),worldY(from.y));ctx.lineTo(worldX(p.x),worldY(p.y));ctx.stroke();ctx.setLineDash([]);
          if(e.species==='boitata')from=p;
        }
        ctx.globalAlpha=1;
      }
      const x=worldX(e.x),y=worldY(e.y)-cast[e.species].size*(secret(e)?1.2:.65)-12;
      ctx.fillStyle='#243528';ctx.fillRect(x-25,y,50,6);ctx.fillStyle=cast[e.species].color;
      ctx.fillRect(x-24,y+1,48*clamp(1-e.timer/(e.warningDuration||1),0,1),4);
    }
    ctx.restore();
  }
  function drawLabels(game:Farm.GameState):void{
    if(game.lake?.active)return;ctx.save();ctx.textAlign='center';ctx.font='bold 12px Trebuchet MS, sans-serif';ctx.lineWidth=3;ctx.strokeStyle='#233828';
    const nearby=candidate(game);
    if(nearby&&!nearby.active){
      const text=GameInput.label('interact')+' · DESPERTAR',x=worldX(nearby.home.x),y=worldY(nearby.home.y)-36;
      ctx.strokeText(text,x,y);ctx.fillStyle='#fff0c5';ctx.fillText(text,x,y);
    }
    for(const e of game.entities.folklore||[])if(e.active&&WildlifeRules.onScreen(e,60)){
      if(e.species==='fuinha'&&(e.speechTime||0)>0&&e.speech&&visible(game,e)){
        const compact=canvas.width<600,font=compact?16:12,h=compact?54:46;
        ctx.font=font+'px Trebuchet MS, sans-serif';
        const width=Math.min(canvas.width-20,compact?340:280,Math.max(136,ctx.measureText(e.speech).width+26));
        const fx=worldX(e.x),fy=worldY(e.y),above=fy-CharacterArt.markerOffset(e.species)>130;
        const x=clamp(fx-width/2,10,canvas.width-width-10),y=above?fy-CharacterArt.markerOffset(e.species)-h-13:Math.min(canvas.height-h-14,fy+18);
        const tip=clamp(fx,x+14,x+width-14),r=8;
        ctx.fillStyle='#fff3ce';ctx.strokeStyle='#745b3b';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x+r,y);
        if(!above){ctx.lineTo(tip-6,y);ctx.lineTo(tip,y-7);ctx.lineTo(tip+6,y);}
        ctx.lineTo(x+width-r,y);ctx.quadraticCurveTo(x+width,y,x+width,y+r);
        ctx.lineTo(x+width,y+h-r);ctx.quadraticCurveTo(x+width,y+h,x+width-r,y+h);
        if(above){ctx.lineTo(tip+6,y+h);ctx.lineTo(tip,y+h+7);ctx.lineTo(tip-6,y+h);}
        ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();ctx.fill();ctx.stroke();
        ctx.fillStyle='#663d28';ctx.font=`bold ${compact?14:11}px Trebuchet MS, sans-serif`;ctx.fillText('TIH',x+width/2,y+(compact?18:15));
        ctx.font=font+'px Trebuchet MS, sans-serif';ctx.fillText(e.speech,x+width/2,y+(compact?40:34),width-18);continue;
      }
      const text=cast[e.species].name+(secret(e)?` · ${e.courage}/${e.maxCourage}`:'')+(e.mode==='warning'?' !':''),x=worldX(e.x),y=worldY(e.y)-cast[e.species].size*(secret(e)?1.2:.65);
      ctx.strokeText(text,x,y);ctx.fillStyle=cast[e.species].color;ctx.fillText(text,x,y);
      if(secret(e)){
        ctx.fillStyle='#243528';ctx.fillRect(x-45,y+7,90,7);ctx.fillStyle=cast[e.species].color;ctx.fillRect(x-44,y+8,88*e.courage/e.maxCourage,5);
        if(e.mode==='rest'){ctx.strokeText('ABERTURA · '+GameInput.label('interact'),x,y-18);ctx.fillText('ABERTURA · '+GameInput.label('interact'),x,y-18);}
      }
    }
    ctx.restore();
  }
  function snapshot(game:Farm.GameState):NonNullable<Farm.SaveData['folklore']>{
    return (game.entities.folklore||[]).map(e=>({id:e.id,...point(e),active:e.active,discovered:e.discovered,defeated:e.defeated,courage:e.courage}));
  }
  function restore(game:Farm.GameState,saved:unknown):void{
    initialize(game);if(!Array.isArray(saved))return;
    for(const e of game.entities.folklore||[]){
      const record=saved.find(s=>s&&s.id===e.id);
      const active=record?.active===true,courage=record?.courage,discovered=record?.discovered;
      if(!WildlifeRules.validPoint(record)||distance(record,e.home)>440||!WildlifeRules.clear(record,record,e.hitbox))continue;
      const progress=Number.isInteger(courage)&&courage>=0&&courage<=e.maxCourage;
      if(secret(e)&&progress){e.courage=courage;e.defeated=courage===0;e.discovered=discovered===true||active||e.defeated;}
      Object.assign(e,point(record));e.active=active&&!e.defeated&&(!secret(e)||progress)&&game.rescuedCount>=threshold(game,e.species)&&
        (!secret(e)||!game.entities.folklore?.some(other=>other.active&&secret(other)));
      e.mode='return';e.grace=2.5;
    }
  }
  return {cast,fuinhaLines,initialize,load,update,candidate,interact,hint,drawEntity,drawGround,drawLabels,snapshot,restore,get ready(){return ids.every(artReady);}};
})();
