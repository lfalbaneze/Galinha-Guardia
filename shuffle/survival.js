/* Browser survival: shared farm maps, collisions, movement and eight-way actors. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./engine.js'),require('./maps.js'));
  else root.ShuffleSurvival=factory(root.ShuffleRun,root.ShuffleMaps);
})(typeof globalThis!=='undefined'?globalThis:this,function(E,M){
  'use strict';
  const DURATION=300,MAX_ENEMIES=48;
  const ENEMIES=Object.freeze({
    fox:{name:'Raposa',wave:1,hp:1.8,speed:138,r:17,height:43,xp:1,color:'#de8244',text:'Tenta chegar pelos lados.'},
    fuinha:{name:'Fuinha',wave:1,hp:1.4,speed:142,r:12,height:35,xp:1,color:'#be9768',text:'Pequena, rápida e cheia de arrancadas.'},
    wolf:{name:'Lobo',wave:2,hp:3.5,speed:94,r:18,height:61,xp:1,color:'#8d9eab',text:'Persegue sem desistir.'},
    goose:{name:'Ganso',wave:2,hp:2,speed:116,r:18,height:62,xp:1,color:'#e5dcc2',text:'Avança junto da horda.'},
    'mula-sem-cabeca':{name:'Mula sem Cabeça',wave:3,hp:7,speed:90,r:20,height:70,xp:3,color:'#ffae49',text:'Saia da faixa antes da investida!'},
    curupira:{name:'Curupira',wave:4,hp:4,speed:112,r:14,height:53,xp:2,color:'#9dce6d',text:'Raízes surgem onde você estava.'},
    boitata:{name:'Boitatá',wave:6,hp:7,speed:103,r:18,height:58,xp:3,color:'#ffc65a',text:'Cuidado com o rastro de fogo.'},
    cuca:{name:'Cuca',wave:8,hp:28,speed:72,r:20,height:75,xp:8,color:'#c799ed',limit:1,text:'A bruxa prepara três feitiços!'}
  });
  const POWERS=Object.freeze({
    cornshot:{name:'Milho Kombat',text:'Fatality de pipoca! Dispara no inimigo mais próximo.',color:'#ffd355',mark:'M'},
    egg:{name:'Resident Ovo',text:'O terror do galinheiro: ovos em todas as direções.',color:'#fff2d7',mark:'O'},
    sickle:{name:'Foice May Cry',text:'A colheita veio cobrar: corta os inimigos próximos.',color:'#9fded7',mark:'F'},
    boots:{name:'Super Bota Bros.',text:'O encanador foi pra roça! Cada nível aumenta a velocidade em 12%.',color:'#d7a771',mark:'B'}
  });
  const HEROES=Object.freeze({
    classic:{name:'Ovo of War',text:'Erina lança um ovo explosivo no inimigo mais próximo a cada 4 s. A omelete é por conta da horda!',color:'#ffe6ab',cooldown:4},
    silkie:{name:'Final Penasy',text:'Midori renova um escudo a cada 9 s e espalha uma nevasca de penas que desacelera inimigos por 3 s.',color:'#e6edff',cooldown:9},
    blue:{name:'The Legend of Zé-Raio',text:'Alzira encadeia um raio em até quatro inimigos a cada 4 s. Triforça de cerca elétrica!',color:'#82d8ff',cooldown:4},
    punk:{name:"Quack'em Up",text:'Zeca dispara três jatos que atravessam a horda a cada 3 s. Banho de mangueira liberado!',color:'#78dccf',cooldown:3},
    astronaut:{name:'Cenoura Gear Solid',text:'Pipoca deixa cenouras-mina ao esquivar. Elas armam em meio segundo e explodem quando alguém chega perto.',color:'#ffb35e',cooldown:0},
    robocop:{name:"Garra's Creed",text:'Stella gira duas garras ao seu redor, atingindo quem entrar no alcance. Nada é verdade, tudo é arranhável.',color:'#ddb5ef',cooldown:.4},
    priest:{name:'Au de Guerra',text:'Paçoca late a cada 4 s, causa dano e empurra a horda. O caramelo tem voz de comando!',color:'#eac08b',cooldown:4},
    goose:{name:'Grasna em Skyrim',text:'Gumercindo solta um FUS RO QUACK em cone a cada 5 s: dano e 2 s de paralisia. Dragão nenhum dorme!',color:'#c9dfac',cooldown:5}
  });
  const gap=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const wave=r=>Math.min(10,1+Math.floor(r.elapsed/30));
  const xpNeeded=r=>5+r.level*3;
  function random(r){r.rng=(Math.imul(r.rng,1664525)+1013904223)>>>0;return r.rng/4294967296;}
  const pick=(r,list)=>list[Math.floor(random(r)*list.length)];
  function say(r,text){r.notice=text;r.noticeTime=4;}
  function effect(r,p,kind){r.effects.push({x:p.x,y:p.y,kind,time:.55});}
  function newRun(seed,available=Object.keys(ENEMIES),skin='classic'){
    const r=E.newRun(seed);r.rng=M.seedFor(r.seed,17);
    r.mode='survival';r.stage=pick(r,[0,1,2,3,5,6,7,8]);r.hp=5;r.level=1;r.choices=[];
    E.beginStage(r);r.friends=[];r.enemies=[];
    r.player.skin=Object.hasOwn(HEROES,skin)?skin:'classic';
    Object.assign(r,{powers:{cornshot:1},cooldowns:{cornshot:0,egg:0,sickle:0},
      pickups:[],shots:[],hazards:[],hexes:[],mines:[],heroCooldown:1,mineCooldown:0,kills:0,xp:0,spawnTimer:0,itemTimer:15,locations:[],
      enemyTypes:Object.keys(ENEMIES).filter(id=>available.includes(id)),seenEnemies:[]});
    for(const {a,b} of r.layout.roads)for(let t=0;t<=8;t++)r.locations.push({x:a.x+(b.x-a.x)*t/8,y:a.y+(b.y-a.y)*t/8});
    const first=[...r.locations].sort((a,b)=>gap(a,r.player)-gap(b,r.player)).find(p=>gap(p,r.player)>=75);
    r.pickups.push({...first,kind:'egg',value:1});
    const kinds=[...Object.keys(POWERS),...Object.keys(POWERS),'milk','milk','milk'];
    for(let i=kinds.length-1;i>0;i--){const j=Math.floor(random(r)*(i+1));[kinds[i],kinds[j]]=[kinds[j],kinds[i]];}
    for(const kind of kinds)placeItem(r,kind);
    say(r,'Sobreviva 5 minutos. Colete poderes; os ataques são automáticos!');r.noticeTime=7;
    return r;
  }
  function placeItem(r,kind){
    const points=r.locations.filter(p=>gap(p,r.player)>90&&r.pickups.every(item=>gap(p,item)>55));
    if(points.length)r.pickups.push({...pick(r,points),kind,value:1});
  }
  function spawnWave(r){
    let points=r.locations.filter(p=>gap(p,r.player)>360&&r.enemies.every(e=>gap(p,e)>38));
    const count=Math.min(2+wave(r),MAX_ENEMIES-r.enemies.length);
    for(let i=0;i<count&&points.length;i++){
      const pool=r.enemyTypes.filter(id=>ENEMIES[id].wave<=wave(r)&&
        r.enemies.filter(e=>e.species===id).length<(ENEMIES[id].limit||MAX_ENEMIES));
      if(!pool.length)break;
      const p=pick(r,points),species=pool.find(id=>!r.seenEnemies.includes(id))||pick(r,pool),type=ENEMIES[species];
      const health=type.hp+wave(r)*.3,speed=type.speed+Math.min(24,wave(r)*2);
      r.enemies.push({...p,species,r:type.r,dx:0,dy:1,traveled:0,moving:false,
        health,maxHealth:health,speed,baseSpeed:speed,age:random(r)*3,side:random(r)<.5?-1:1,
        mode:'hunt',timer:1+random(r)*2,trailTimer:0,route:[],routeTimer:random(r)*.5,routeTarget:null});
      if(!r.seenEnemies.includes(species)){
        r.seenEnemies.push(species);if(type.wave>=3)say(r,`${type.name}: ${type.text}`);
      }
      effect(r,p,'spawn');points=points.filter(q=>gap(p,q)>38);
    }
  }
  function hazard(r,p,kind){
    // ponytail: at most 48 short-lived ground hazards, enough for the 48-enemy cap.
    if(r.hazards.length>=48||!M.clearCircle(r,p,12))return;
    r.hazards.push({x:p.x,y:p.y,kind,r:kind==='roots'?29:18,arm:kind==='roots'?.95:.5,life:kind==='roots'?3:2.7});
  }
  function moveEnemy(r,e,target,dt){
    e.stun=Math.max(0,(e.stun||0)-dt);e.slow=Math.max(0,(e.slow||0)-dt);
    if(e.stun>0){e.moving=false;return;}
    if(e.slow>0)dt*=.45;
    const type=ENEMIES[e.species];
    // Existing campaign/test actors have no survival AI state.
    if(!type||e.baseSpeed===undefined){E.chase(r,e,target,dt);return;}
    e.age+=dt;e.timer-=dt;e.speed=e.baseSpeed;
    const distance=gap(e,target),dx=(target.x-e.x)/(distance||1),dy=(target.y-e.y)/(distance||1);
    if(e.species==='mula-sem-cabeca'||e.species==='cuca'){
      if(e.mode==='warning'){
        e.moving=false;
        if(e.timer<=0){
          if(e.species==='cuca'){
            for(const angle of [-.22,0,.22])if(r.hexes.length<24){
              const x=e.aimX*Math.cos(angle)-e.aimY*Math.sin(angle),y=e.aimX*Math.sin(angle)+e.aimY*Math.cos(angle);
              r.hexes.push({x:e.x,y:e.y,vx:x*155,vy:y*155,life:3.2});
            }
            e.mode='recover';e.timer=1.5;
          }else {e.mode='charge';e.timer=.75;}
        }
        return;
      }
      if(e.mode==='charge'){
        const moved=E.move(r,e,e.aimX*340*dt,e.aimY*340*dt);
        if(e.timer<=0||moved<340*dt*.6){e.mode='recover';e.timer=1.2;}
        return;
      }
      if(e.mode==='recover'){
        e.moving=false;if(e.timer<=0){e.mode='hunt';e.timer=2.4;}return;
      }
      if(e.timer<=0&&distance<390&&M.clearSegment(r,e,target,e.r)){
        e.mode='warning';e.timer=e.species==='cuca'?1.05:.9;e.aimX=dx;e.aimY=dy;e.dx=dx;e.dy=dy;e.moving=false;return;
      }
    }
    let goal=target;
    if(['fox','fuinha','curupira','boitata'].includes(e.species)&&distance>65){
      const side=e.species==='boitata'?Math.sin(e.age*3):e.side;
      const offset=(e.species==='fox'?70:e.species==='curupira'?100:40)*side*Math.min(1,(distance-50)/100);
      const flank={x:target.x-dy*offset,y:target.y+dx*offset};
      if(M.clearCircle(r,flank,e.r))goal=flank;
    }
    if(e.species==='fuinha')e.speed*=e.age%2.7<.5?1.5:.92;
    if(e.species==='curupira'&&e.timer<=0&&distance<330&&M.clearSegment(r,e,target,0)){
      hazard(r,target,'roots');e.timer=3.8;
    }
    E.chase(r,e,goal,dt);
    if(e.species==='boitata'){
      e.trailTimer-=dt;if(e.moving&&e.trailTimer<=0){hazard(r,e,'fire');e.trailTimer=.65;}
    }
  }
  function threats(r,dt){
    r.hazards=r.hazards.filter(h=>{
      h.arm-=dt;h.life-=dt;
      if(h.life>0&&h.arm<=0&&gap(h,r.player)<h.r+r.player.r&&M.clearSegment(r,h,r.player,0))E.hurt(r);
      return h.life>0;
    });
    r.hexes=r.hexes.filter(h=>{
      const old={x:h.x,y:h.y};h.x+=h.vx*dt;h.y+=h.vy*dt;h.life-=dt;
      if(h.life<=0||!M.clearSegment(r,old,h,5))return false;
      if(segmentGap(r.player,old,h)<r.player.r+6){E.hurt(r);return false;}
      return true;
    });
  }
  function damage(r,e,amount){
    e.health-=amount;effect(r,e,'hurt');if(e.health>0)return;
    r.enemies.splice(r.enemies.indexOf(e),1);r.kills++;
    const gems=r.pickups.filter(p=>p.kind==='xp');
    // ponytail: cap loose XP at 160; merge into the nearest gem beyond that.
    const reward=ENEMIES[e.species]?.xp||1;
    if(gems.length>=160)gems.reduce((a,b)=>gap(a,e)<gap(b,e)?a:b).value+=reward;
    else r.pickups.push({x:e.x,y:e.y,kind:'xp',value:reward});
    if(e.species==='cuca'){placeItem(r,'milk');say(r,'Cuca afastada! O caldeirão ficou sem dona.');}
    if(r.kills%12===0)placeItem(r,pick(r,[...Object.keys(POWERS),'milk']));
  }
  function collect(r,item){
    if(item.kind==='xp'){
      r.xp+=item.value;
      while(r.xp>=xpNeeded(r)){r.xp-=xpNeeded(r);r.level++;r.hp=Math.min(5,r.hp+1);say(r,`Nível ${r.level}! Mais dano e um coração recuperado.`);}
    }else if(item.kind==='milk'){
      r.hp=Math.min(5,r.hp+2);say(r,'Leite Up! Até dois corações recuperados. O cogumelo tirou folga.');
    }else{
      const rank=r.powers[item.kind]||0;
      if(rank<3){
        r.powers[item.kind]=rank+1;if(item.kind==='boots')r.skills.boots=rank+1;
        say(r,`${POWERS[item.kind].name} ${rank+1}/3: ${POWERS[item.kind].text}`);
      }else{r.hp=Math.min(5,r.hp+1);say(r,'Poder no máximo: um coração recuperado.');}
    }
    effect(r,r.player,'rescue');
  }
  function segmentGap(p,a,b){
    const dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy;
    const t=d?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/d)):0;
    return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);
  }
  function attack(r,dt){
    const p=r.player;
    for(const kind of Object.keys(r.cooldowns)){
      r.cooldowns[kind]=Math.max(0,r.cooldowns[kind]-dt);
      const rank=r.powers[kind]||0;if(!rank||r.cooldowns[kind]>0)continue;
      const power=(1+.15*(r.level-1))*(1+.35*(rank-1));
      const shot=(vx,vy,damage)=>r.shots.push({kind,x:p.x,y:p.y,vx,vy,damage,life:1.4});
      if(kind==='cornshot'){
        const targets=r.enemies.filter(e=>gap(p,e)<440&&M.clearSegment(r,p,e,4));
        if(!targets.length)continue;
        const target=targets.reduce((a,b)=>gap(a,p)<gap(b,p)?a:b),d=gap(p,target)||1;
        shot((target.x-p.x)/d*440,(target.y-p.y)/d*440,power*2);
        r.cooldowns[kind]=.7-.12*(rank-1);
      }else if(kind==='egg'){
        for(let i=0;i<6+rank*2;i++){const a=i*Math.PI*2/(6+rank*2);shot(Math.cos(a)*270,Math.sin(a)*270,power*1.5);}
        r.cooldowns[kind]=3.2-.4*rank;
      }else{
        const radius=68+rank*16;
        for(const e of [...r.enemies])if(gap(p,e)<=radius+e.r&&M.clearSegment(r,p,e,0))damage(r,e,power*2);
        r.effects.push({x:p.x,y:p.y,kind:'sickle',time:.55,radius});r.cooldowns[kind]=2.2-.3*rank;
      }
    }
    r.shots=r.shots.filter(s=>{
      const old={x:s.x,y:s.y};s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;
      const hit=[...r.enemies].sort((a,b)=>gap(a,old)-gap(b,old)).find(e=>segmentGap(e,old,s)<=e.r+5&&M.clearSegment(r,old,e,0));
      if(s.piercing){
        for(const e of [...r.enemies])if(!s.hits.has(e)&&segmentGap(e,old,s)<=e.r+5&&M.clearSegment(r,old,e,0)){
          s.hits.add(e);damage(r,e,s.damage);
        }
      }else if(hit){
        if(s.blast)blast(r,hit,s.blast,s.damage,s.color);else damage(r,hit,s.damage);
      }
      return (s.piercing||!hit)&&s.life>0&&M.clearSegment(r,old,s,4);
    });
  }
  function pulse(r,p,radius,color,extra={}){r.effects.push({x:p.x,y:p.y,kind:'hero',time:.55,radius,color,...extra});}
  function blast(r,p,radius,power,color){
    pulse(r,p,radius,color);
    for(const e of [...r.enemies])if(gap(p,e)<radius+e.r&&M.clearSegment(r,p,e,0))damage(r,e,power);
  }
  function claws(r){return [0,Math.PI].map(a=>({x:r.player.x+Math.cos(r.elapsed*3+a)*65,y:r.player.y+Math.sin(r.elapsed*3+a)*65}));}
  function heroAttack(r,dt){
    const p=r.player,id=p.skin,hero=HEROES[id],power=1+.15*(r.level-1);
    r.heroCooldown=Math.max(0,r.heroCooldown-dt);r.mineCooldown=Math.max(0,r.mineCooldown-dt);
    r.mines=r.mines.filter(m=>{
      m.arm-=dt;m.life-=dt;
      if(m.arm<=0&&r.enemies.some(e=>gap(m,e)<42+e.r&&M.clearSegment(r,m,e,0))){blast(r,m,88,4*power,hero.color);return false;}
      return m.life>0;
    });
    if(id==='astronaut'){
      if(p.dashTime>0&&r.mineCooldown===0&&r.mines.length<12){r.mines.push({x:p.x,y:p.y,arm:.5,life:8});r.mineCooldown=.1;}
      return;
    }
    if(r.heroCooldown>0)return;
    const targets=r.enemies.filter(e=>gap(p,e)<420&&M.clearSegment(r,p,e,4)).sort((a,b)=>gap(p,a)-gap(p,b)),target=targets[0];
    if(!target&&id!=='silkie'&&id!=='robocop')return;
    r.heroCooldown=hero.cooldown;
    const distance=target?gap(p,target)||1:1,dx=target?(target.x-p.x)/distance:0,dy=target?(target.y-p.y)/distance:1;
    if(id==='classic'||id==='punk'){
      for(const angle of id==='punk'?[-.2,0,.2]:[0])r.shots.push({kind:'hero',color:hero.color,x:p.x,y:p.y,
        vx:(dx*Math.cos(angle)-dy*Math.sin(angle))*330,vy:(dx*Math.sin(angle)+dy*Math.cos(angle))*330,
        life:1.4,damage:power*(id==='classic'?4:2),blast:id==='classic'?80:0,piercing:id==='punk',hits:new Set()});
    }else if(id==='silkie'){
      p.shield=true;pulse(r,p,150,hero.color);
      for(const e of targets)if(gap(p,e)<150+e.r)e.slow=3;
    }else if(id==='blue'){
      let from=p;const remaining=[...targets];
      for(let i=0;i<4;i++){
        const next=remaining.filter(e=>gap(from,e)<(i?145:420)&&M.clearSegment(r,from,e,0)).sort((a,b)=>gap(from,a)-gap(from,b))[0];
        if(!next)break;
        pulse(r,from,0,hero.color,{toX:next.x,toY:next.y});damage(r,next,power*2.5);remaining.splice(remaining.indexOf(next),1);from=next;
      }
    }else if(id==='robocop'){
      for(const e of targets)if(claws(r).some(c=>gap(c,e)<e.r+15))damage(r,e,power*1.5);
    }else if(id==='priest'){
      pulse(r,p,150,hero.color);
      for(const e of targets)if(gap(p,e)<150+e.r){const d=gap(p,e)||1;damage(r,e,power*2);if(e.health>0)E.move(r,e,(e.x-p.x)/d*90,(e.y-p.y)/d*90);}
    }else if(id==='goose'){
      pulse(r,p,215,hero.color,{angle:Math.atan2(dy,dx)});
      for(const e of targets){const d=gap(p,e)||1;if(d<215+e.r&&((e.x-p.x)*dx+(e.y-p.y)*dy)/d>.55){damage(r,e,power*2);e.stun=2;}}
    }
  }
  function tick(r,dt,input={}){
    if(r.phase!=='playing'||r.paused||!Number.isFinite(dt)||dt<=0)return;
    const positions=r.enemies.map(e=>({x:e.x,y:e.y,traveled:e.traveled}));
    dt=Math.min(.05,dt);E.tick(r,dt,input,moveEnemy);if(r.phase!=='playing')return;
    // Pairwise body contact keeps the capped horde from collapsing into one sprite.
    for(let i=0;i<r.enemies.length;i++)for(let j=i+1;j<r.enemies.length;j++){
      const a=r.enemies[i],b=r.enemies[j],d=gap(a,b),spacing=a.r+b.r-4;
      if(d>=spacing)continue;
      const dx=d?(b.x-a.x)/d:Math.cos(i+j),dy=d?(b.y-a.y)/d:Math.sin(i+j),push=(spacing-d)/2;
      E.move(r,a,-dx*push,-dy*push);E.move(r,b,dx*push,dy*push);
    }
    r.enemies.forEach((e,i)=>{
      const dx=e.x-positions[i].x,dy=e.y-positions[i].y,distance=Math.hypot(dx,dy);e.moving=distance>.01;
      // Feet follow the final displacement, excluding contact pushes cancelled in this tick.
      e.traveled=positions[i].traveled+distance;
      if(e.moving){e.dx=dx;e.dy=dy;}
    });
    if(r.elapsed>=DURATION){r.elapsed=DURATION;r.phase='won';r.player.moving=false;return;}
    threats(r,dt);if(r.phase!=='playing')return;
    r.spawnTimer-=dt;
    if(r.spawnTimer<=0){spawnWave(r);r.spawnTimer=Math.max(1.5,4.2-wave(r)*.25);}
    r.itemTimer-=dt;
    if(r.itemTimer<=0){if(r.pickups.filter(p=>p.kind!=='xp').length<12)placeItem(r,pick(r,[...Object.keys(POWERS),'milk']));r.itemTimer=15;}
    heroAttack(r,dt);attack(r,dt);
    r.pickups=r.pickups.filter(item=>{
      const d=gap(item,r.player);if(!M.clearSegment(r,item,r.player,0))return true;
      if(d<28){collect(r,item);return false;}
      if(item.kind==='xp'&&d<100){const step=Math.min(d,320*dt);item.x+=(r.player.x-item.x)/d*step;item.y+=(r.player.y-item.y)/d*step;}
      return true;
    });
  }
  return Object.freeze({newRun,tick,POWERS,HEROES,ENEMIES,DURATION,MAX_ENEMIES,wave,xpNeeded,claws});
});
