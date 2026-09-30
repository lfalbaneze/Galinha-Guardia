/* Optional Shuffle prototype. No dependency on the classic game or its save. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./maps.js'));
  else root.ShuffleRun = factory(root.ShuffleMaps);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Maps) {
  'use strict';
  const VERSION = 2, MAP_VERSION = Maps.VERSION, WIDTH = Maps.WIDTH, HEIGHT = Maps.HEIGHT;
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const gap = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const SKILLS = Object.freeze([
    { id:'boots', name:'Pé de vento', kind:'Movimento', max:2, mark:'01', text:'+12% de velocidade ao caminhar por nível.' },
    { id:'heart', name:'Coração valente', kind:'Defesa', max:2, mark:'02', text:'+1 coração máximo e recupera 1 coração agora.' },
    { id:'shield', name:'Pena de aço', kind:'Defesa', max:1, mark:'03', text:'Bloqueia o primeiro golpe de cada fase.' },
    { id:'dash', name:'Asa ligeira', kind:'Movimento', max:2, mark:'04', text:'Reduz a recarga da esquiva em 25% por nível.' },
    { id:'corn', name:'Isca de milho', kind:'Truque', max:2, mark:'05', text:'Desbloqueia uma isca para distrair os inimigos. Nível 2 dura mais.' },
    { id:'call', name:'Có-có de alcance', kind:'Resgate', max:2, mark:'06', text:'+18 pixels de alcance para resgatar e contra-atacar.' },
    { id:'feather', name:'Pena escorregadia', kind:'Defesa', max:2, mark:'07', text:'+0,35s de proteção após receber um golpe, por nível.' },
    { id:'medicine', name:'Fôlego do resgate', kind:'Resgate', max:2, mark:'08', text:'Recupera 1 coração a cada 3 resgates. Nível 2: a cada 2.' },
    { id:'recovery', name:'Pausa pro lanche', kind:'Defesa', max:2, mark:'09', text:'Recupera mais 1 coração entre fases por nível.' }
  ].map(Object.freeze));
  const STAGES = Maps.STAGES;
  const rescuesBefore = stage => STAGES.slice(0,stage).reduce((n,s)=>n+s.friendCount,0);
  const byId = new Map(SKILLS.map(s => [s.id, s]));
  function entity(species, x, y, radius=16) { return {species,x,y,r:radius,dx:0,dy:1,traveled:0,moving:false}; }
  function random(run) {
    run.rng = (Math.imul(run.rng, 1664525) + 1013904223) >>> 0;
    return run.rng / 4294967296;
  }
  function stats(run) {
    return {speed:(run.mode==='survival'?205:176)*(1+.12*(run.skills.boots||0)), maxHp:run.mode==='survival'?5:3+(run.skills.heart||0),
      dashCooldown:3.6*(1-.25*(run.skills.dash||0)), reach:30+18*(run.skills.call||0),
      cornDuration:run.skills.corn===2?6:4, cornCooldown:9,
      hurtGrace:1.65+.35*(run.skills.feather||0), stageHealing:1+(run.skills.recovery||0)};
  }
  function offer(run) {
    const pool=SKILLS.filter(s=>(run.skills[s.id]||0)<s.max).map(s=>s.id);
    // Fisher-Yates on a private seeded stream. No duplicates, no maxed cards.
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(random(run)*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    return pool.slice(0,3);
  }
  function newRun(seed=Date.now()) {
    const run={version:VERSION,mapVersion:MAP_VERSION,seed:(Number(seed)>>>0)||1,rng:(Number(seed)>>>0)||1,
      stage:0,phase:'draft',skills:{},level:0,hp:3,choices:[],rerolls:1,rescued:0,
      totalRescued:0,bossesDefeated:0,layout:null,exit:null,elapsed:0,notice:'Escolha sua primeira habilidade.',noticeTime:4,
      player:null,enemies:[],friends:[],obstacles:[],boss:null,decoy:null,effects:[],paused:false};
    run.choices=offer(run);return run;
  }
  function reroll(run) {
    if(run.phase!=='draft'||run.rerolls<=0)return false;
    const previous=run.choices.join(',');
    run.choices=offer(run);
    // Change the visible offer whenever a different combination is available.
    if(run.choices.join(',')===previous)run.choices=offer(run);
    run.rerolls--;return true;
  }
  function clearCircle(run, p, radius) { return Maps.clearCircle(run,p,radius); }
  function clearContact(run,a,b,r=0) { return Maps.clearSegment(run,a,b,r); }
  function move(run, actor, dx, dy) {
    const before={x:actor.x,y:actor.y},len=Math.hypot(dx,dy),steps=Math.max(1,Math.ceil(len/5));
    for(let i=0;i<steps;i++){
      const x=dx/steps,y=dy/steps;
      if(clearCircle(run,{x:actor.x+x,y:actor.y},actor.r))actor.x+=x;
      if(clearCircle(run,{x:actor.x,y:actor.y+y},actor.r))actor.y+=y;
    }
    const traveled=gap(before,actor);actor.moving=traveled>.01;actor.traveled+=traveled;
    if(actor.moving){actor.dx=actor.x-before.x;actor.dy=actor.y-before.y;}
    return traveled;
  }
  function beginStage(run) {
    const config=STAGES[run.stage],layout=Maps.generate(run.seed,run.stage);
    run.phase='playing';run.paused=false;run.rescued=0;run.decoy=null;run.effects=[];
    run.layout=layout;run.exit={...layout.exit};run.obstacles=layout.obstacles;
    const heading={x:layout.hub.x-layout.spawn.x,y:layout.hub.y-layout.spawn.y};
    run.player=Object.assign(entity('chicken',layout.spawn.x,layout.spawn.y,13),{
      dx:heading.x,dy:heading.y,dashTime:0,dashCooldown:0,dashX:1,dashY:0,
      cornCooldown:0,invulnerable:1.6,shield:!!run.skills.shield});
    run.friends=layout.friends.map(f=>Object.assign(entity(f.species,f.x,f.y,f.species==='rabbit'?13:16),{name:f.name,rescued:false}));
    run.enemies=layout.enemies.map((e,i)=>Object.assign(entity(e.species,e.x,e.y,18),{
      speed:103+run.stage*3.5+(i%2)*6,route:[],routeTimer:0,routeTarget:null}));
    run.boss=null;
    if(config.boss){
      const panto=config.bossId==='panto',hp=panto?3:5;
      run.boss=Object.assign(entity(layout.boss.species,layout.boss.x,layout.boss.y,22),{
        id:config.bossId,name:panto?'Panto':'Baltazar',maxCourage:hp,courage:hp,
        mode:'recover',timer:1.8,aimX:0,aimY:0,hitThisStun:false,comboRemaining:0,
        warningSeconds:panto?1.15:1.05,chargeSpeed:panto?285:325,chargeSeconds:panto?.9:1.05});
    }
    notice(run,config.subtitle,6);
  }
  function choose(run, id) {
    if(run.phase!=='draft'||!run.choices.includes(id)||!byId.has(id))return false;
    const card=byId.get(id);if((run.skills[id]||0)>=card.max)return false;
    run.skills[id]=(run.skills[id]||0)+1;run.level++;
    if(id==='heart')run.hp=Math.min(stats(run).maxHp,run.hp+1);
    run.choices=[];beginStage(run);return true;
  }
  function notice(run,text,time=3) {run.notice=text;run.noticeTime=time;}
  function burst(run,x,y,kind) {run.effects.push({x,y,kind,time:.55});}
  function hurt(run) {
    const p=run.player;
    if(run.phase!=='playing'||run.paused||p.invulnerable>0||p.dashTime>0)return false;
    if(p.shield){p.shield=false;notice(run,'A pena de aço segurou essa!');burst(run,p.x,p.y,'shield');}
    else {run.hp--;notice(run,'Essa passou raspando nas penas!');burst(run,p.x,p.y,'hurt');}
    p.invulnerable=stats(run).hurtGrace;
    if(run.hp<=0){run.hp=0;run.phase='lost';p.moving=false;notice(run,run.mode==='survival'?'A horda levou essa. Outra fazenda, outra tentativa.':'Baltazar ganhou essa. Outro baralho, outra tentativa.',99);}
    return true;
  }
  function decoy(run) {
    const p=run.player;if(run.phase!=='playing'||run.paused||!run.skills.corn||p.cornCooldown>0)return false;
    run.decoy={x:p.x,y:p.y,time:stats(run).cornDuration};p.cornCooldown=stats(run).cornCooldown;
    notice(run,'Milho no chão. Focinho distraído!');return true;
  }
  function dash(run,x=0,y=0) {
    const p=run.player;if(run.phase!=='playing'||run.paused||p.dashCooldown>0)return false;
    let len=Math.hypot(x,y);if(len<.01){x=p.dx;y=p.dy;len=Math.hypot(x,y)||1;}
    p.dashX=x/len;p.dashY=y/len;p.dashTime=.18;p.dashCooldown=stats(run).dashCooldown;
    burst(run,p.x,p.y,'dash');return true;
  }
  function interact(run) {
    if(run.phase!=='playing'||run.paused||!run.boss)return false;
    const b=run.boss;
    if(b.mode!=='stunned'||b.hitThisStun||gap(run.player,b)>stats(run).reach+b.r||!clearContact(run,run.player,b))return false;
    b.courage--;b.hitThisStun=true;b.mode='recover';b.timer=1.1;b.comboRemaining=0;
    notice(run,b.courage?`${b.name}: "Isso foi falta de educação!"`:
      run.stage===STAGES.length-1?'Turma salva. Valentão sem pose!':'Panto: "Passagem aprovada! Pode seguir pela porteira."',5);
    burst(run,b.x,b.y,'rescue');
    if(b.courage===0){
      run.bossesDefeated++;b.mode='defeated';b.moving=false;
      if(run.stage===STAGES.length-1){run.phase='won';run.player.moving=false;}
    }
    return true;
  }
  function chase(run,e,target,dt) {
    e.routeTimer=Math.max(0,e.routeTimer-dt);
    if(clearContact(run,e,target,e.r)){e.route=[];e.routeTarget=null;}
    else if(!e.routeTarget||gap(e.routeTarget,target)>52||e.routeTimer<=0||!e.route.length){
      e.route=Maps.route(run.layout,e,target,e.r);e.routeTarget={x:target.x,y:target.y};e.routeTimer=.5;
    }
    while(e.route.length&&gap(e,e.route[0])<4)e.route.shift();
    const waypoint=e.route[0]||target,dx=waypoint.x-e.x,dy=waypoint.y-e.y,len=Math.hypot(dx,dy);
    const amount=Math.min(len,e.speed*dt);
    if(len>.01)move(run,e,dx/len*amount,dy/len*amount);else e.moving=false;
  }
  function warnBoss(run,second=false){
    const b=run.boss,target=run.decoy||run.player,dx=target.x-b.x,dy=target.y-b.y,len=Math.hypot(dx,dy)||1;
    b.aimX=dx/len;b.aimY=dy/len;b.dx=dx;b.dy=dy;
    b.mode='warning';b.timer=second?.85:b.warningSeconds;
    // A fresh visible warning locks EVERY charge, including the second charge.
    notice(run,second?'SEGUNDO BOTE! Saia da nova faixa!':`${b.name} vai investir! Saia para o lado.`,1.5);
  }
  function updateBoss(run,dt) {
    const b=run.boss,p=run.player;if(!b||b.mode==='defeated')return;
    b.timer-=dt;b.moving=false;
    if(b.mode==='recover'&&b.timer<=0){
      b.comboRemaining=b.id==='baltazar'&&b.courage<=3?1:0;warnBoss(run);
    }else if(b.mode==='warning'&&b.timer<=0){b.mode='charge';b.timer=b.chargeSeconds;}
    else if(b.mode==='charge'){
      const speed=b.chargeSpeed+(b.id==='baltazar'&&b.courage<=2?30:0);
      const moved=move(run,b,b.aimX*speed*dt,b.aimY*speed*dt);
      if(gap(p,b)<p.r+b.r&&clearContact(run,p,b))hurt(run);
      if(run.decoy&&gap(run.decoy,b)<b.r+12){run.decoy=null;b.timer=0;}
      if(b.timer<=0||moved<speed*dt*.65){
        if(b.comboRemaining>0){b.comboRemaining--;warnBoss(run,true);}
        else{b.mode='stunned';b.timer=b.id==='panto'?2.6:2.4;b.hitThisStun=false;notice(run,'Ficou tonto! Chegue perto e interaja.',b.timer);}
      }
    }else if(b.mode==='stunned'&&b.timer<=0){b.mode='recover';b.timer=.8;}
  }
  function exitReady(run){return run.mode!=='survival'&&run.phase==='playing'&&(run.boss?run.boss.courage===0:run.rescued===run.friends.length);}
  function advance(run) {
    if(!exitReady(run)||!run.exit||gap(run.player,run.exit)>39)return false;
    if(run.stage>=STAGES.length-1)return false;
    run.stage++;run.phase='draft';run.hp=Math.min(stats(run).maxHp,run.hp+stats(run).stageHealing);run.rerolls=1;
    run.choices=offer(run);run.paused=false;run.player.moving=false;return true;
  }
  function tick(run,dt,input={},enemyStep=chase) {
    if(run.phase!=='playing'||run.paused||!Number.isFinite(dt)||dt<=0)return;
    dt=Math.min(.05,dt);run.elapsed+=dt;run.noticeTime=Math.max(0,run.noticeTime-dt);
    run.effects=run.effects.filter(e=>(e.time-=dt)>0);
    const p=run.player;
    for(const key of ['invulnerable','dashCooldown','cornCooldown'])p[key]=Math.max(0,p[key]-dt);
    if(run.decoy&&(run.decoy.time-=dt)<=0)run.decoy=null;
    let x=Number.isFinite(input.x)?input.x:0,y=Number.isFinite(input.y)?input.y:0,len=Math.hypot(x,y);
    if(len>1){x/=len;y/=len;}
    if(p.dashTime>0){move(run,p,p.dashX*525*dt,p.dashY*525*dt);p.dashTime=Math.max(0,p.dashTime-dt);}
    else move(run,p,x*stats(run).speed*dt,y*stats(run).speed*dt);
    for(const f of run.friends)if(!f.rescued&&gap(p,f)<stats(run).reach+f.r&&clearContact(run,p,f)){
      f.rescued=true;run.rescued++;run.totalRescued++;
      if(run.skills.medicine&&run.totalRescued%(4-run.skills.medicine)===0)run.hp=Math.min(stats(run).maxHp,run.hp+1);
      burst(run,f.x,f.y,'rescue');
      notice(run,run.rescued===run.friends.length?'Turma reunida! Siga a seta até a porteira.':`${f.name}: "O almoço pediu demissão!"`);
    }
    for(const e of run.enemies){
      enemyStep(run,e,run.decoy||p,dt);
      if(run.decoy&&gap(e,run.decoy)<28){e.moving=false;}
      if(gap(e,p)<p.r+e.r&&clearContact(run,p,e))hurt(run);
      if(run.phase!=='playing')break;
    }
    if(run.phase==='playing')updateBoss(run,dt);
    if(input.interact)interact(run);
    if(run.phase==='playing')advance(run);
  }
  function pause(run,value=!run.paused){if(run.phase==='playing')run.paused=!!value;}
  function checkpoint(run) {
    return {version:VERSION,mapVersion:MAP_VERSION,seed:run.seed,rng:run.rng,stage:run.stage,phase:run.phase,
      skills:{...run.skills},level:run.level,hp:run.hp,choices:[...run.choices],rerolls:run.rerolls,
      totalRescued:rescuesBefore(run.stage),elapsed:run.elapsed};
  }
  function restore(data) {
    if(!data||data.version!==VERSION||data.mapVersion!==MAP_VERSION||
      !Number.isInteger(data.seed)||data.seed<1||data.seed>0xffffffff||
      !Number.isInteger(data.rng)||data.rng<0||data.rng>0xffffffff||
      !Number.isInteger(data.stage)||data.stage<0||data.stage>=STAGES.length||
      !['draft','playing','won'].includes(data.phase)||!data.skills||typeof data.skills!=='object'||
      !Number.isInteger(data.hp)||!Number.isFinite(data.elapsed)||data.elapsed<0||!Number.isInteger(data.level)||
      ![0,1].includes(data.rerolls)||!Array.isArray(data.choices))return null;
    let levels=0;
    for(const [id,rank] of Object.entries(data.skills)){
      if(!byId.has(id)||!Number.isInteger(rank)||rank<1||rank>byId.get(id).max)return null;
      levels+=rank;
    }
    if(levels!==data.level||levels!==(data.phase==='draft'?data.stage:data.stage+1))return null;
    if(data.hp<=0||data.hp>3+(data.skills.heart||0))return null;
    if(data.phase==='won'&&data.stage!==STAGES.length-1)return null;
    if(data.phase==='draft'&&(data.choices.length!==3||new Set(data.choices).size!==3||
      data.choices.some(id=>!byId.has(id)||(data.skills[id]||0)>=byId.get(id).max)))return null;
    const run=newRun(data.seed);
    Object.assign(run,{rng:data.rng>>>0,stage:data.stage,skills:{...data.skills},level:data.level,
      hp:data.hp,elapsed:clamp(data.elapsed,0,86400),totalRescued:rescuesBefore(data.stage),bossesDefeated:data.stage>4?1:0,rerolls:data.rerolls});
    if(data.phase==='draft'){run.phase='draft';run.choices=[...data.choices];}
    else {beginStage(run);if(data.phase==='won'){run.phase='won';run.boss.courage=0;run.boss.mode='defeated';run.bossesDefeated=2;}}
    return run;
  }
  return Object.freeze({VERSION,MAP_VERSION,WIDTH,HEIGHT,SKILLS,STAGES,newRun,stats,reroll,choose,tick,
    dash,decoy,interact,pause,checkpoint,restore,clearCircle,exitReady,beginStage,move,chase,hurt,generateStage:Maps.generate,route:Maps.route});
});
