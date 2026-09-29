/* Optional Shuffle prototype. No dependency on the classic game or its save. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ShuffleRun = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 1, WIDTH = 1120, HEIGHT = 720;
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const gap = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const SKILLS = Object.freeze([
    { id:'boots', name:'Pé de vento', kind:'Movimento', max:2, mark:'01', text:'+12% de velocidade ao caminhar por nível.' },
    { id:'heart', name:'Coração valente', kind:'Defesa', max:2, mark:'02', text:'+1 coração máximo e recupera 1 coração agora.' },
    { id:'shield', name:'Pena de aço', kind:'Defesa', max:1, mark:'03', text:'Bloqueia o primeiro golpe de cada fase.' },
    { id:'dash', name:'Asa ligeira', kind:'Movimento', max:2, mark:'04', text:'Reduz a recarga da esquiva em 25% por nível.' },
    { id:'corn', name:'Isca de milho', kind:'Truque', max:2, mark:'05', text:'Desbloqueia uma isca para distrair os inimigos. Nível 2 dura mais.' },
    { id:'call', name:'Có-có de alcance', kind:'Resgate', max:2, mark:'06', text:'+18 pixels de alcance para resgatar e contra-atacar.' }
  ].map(Object.freeze));
  const STAGES = Object.freeze([
    { name:'Pomar do susto', subtitle:'Resgate os 3 amigos e alcance a porteira.', theme:'orchard', enemyCount:1, boss:false },
    { name:'Milharal do corre-corre', subtitle:'Mais perseguidores. Use a esquiva e suas habilidades.', theme:'corn', enemyCount:2, boss:false },
    { name:'Baltazar, o sem-almoço', subtitle:'Desvie da investida. Aproxime-se quando ele ficar tonto e interaja.', theme:'sunset', enemyCount:0, boss:true }
  ].map(Object.freeze));
  const byId = new Map(SKILLS.map(s => [s.id, s]));
  function entity(species, x, y, radius=16) { return {species,x,y,r:radius,dx:0,dy:1,traveled:0,moving:false}; }
  function random(run) {
    run.rng = (Math.imul(run.rng, 1664525) + 1013904223) >>> 0;
    return run.rng / 4294967296;
  }
  function stats(run) {
    return {speed:176*(1+.12*(run.skills.boots||0)), maxHp:3+(run.skills.heart||0),
      dashCooldown:3.6*(1-.25*(run.skills.dash||0)), reach:30+18*(run.skills.call||0),
      cornDuration:run.skills.corn===2?6:4, cornCooldown:9};
  }
  function offer(run) {
    const pool=SKILLS.filter(s=>(run.skills[s.id]||0)<s.max).map(s=>s.id);
    // Fisher-Yates on a private seeded stream. No duplicates, no maxed cards.
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(random(run)*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    return pool.slice(0,3);
  }
  function newRun(seed=Date.now()) {
    const run={version:VERSION,seed:(Number(seed)>>>0)||1,rng:(Number(seed)>>>0)||1,
      stage:0,phase:'draft',skills:{},level:0,hp:3,choices:[],rerolls:1,rescued:0,
      totalRescued:0,elapsed:0,notice:'Escolha sua primeira habilidade.',noticeTime:4,
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
  function clearCircle(run, p, radius) {
    if(p.x-radius<28||p.y-radius<28||p.x+radius>WIDTH-28||p.y+radius>HEIGHT-28)return false;
    return run.obstacles.every(o=>Math.hypot(p.x-clamp(p.x,o.x,o.x+o.w),p.y-clamp(p.y,o.y,o.y+o.h))>radius);
  }
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
    const boss=STAGES[run.stage].boss;
    run.phase='playing';run.paused=false;run.rescued=0;run.decoy=null;run.effects=[];
    run.player=Object.assign(entity('chicken',100,360,13),{dashTime:0,dashCooldown:0,
      dashX:1,dashY:0,cornCooldown:0,invulnerable:1.6,shield:!!run.skills.shield});
    run.obstacles=boss ? [
      {x:325,y:160,w:76,h:46,kind:'hay'},{x:745,y:160,w:76,h:46,kind:'hay'},
      {x:325,y:520,w:76,h:46,kind:'hay'},{x:745,y:520,w:76,h:46,kind:'hay'}
    ] : [
      {x:370,y:255,w:90,h:95,kind:'tree'},{x:650,y:435,w:88,h:92,kind:'tree'},
      {x:570,y:130,w:84,h:44,kind:'hay'},{x:250,y:520,w:85,h:44,kind:'hay'}
    ];
    run.friends=boss?[]:[Object.assign(entity('sheep',300,160),{name:'Amélia',rescued:false}),
      Object.assign(entity('pig',815,175),{name:'Tonico',rescued:false}),
      Object.assign(entity('rabbit',890,595,13),{name:'Jay Jay',rescued:false})];
    run.enemies=Array.from({length:STAGES[run.stage].enemyCount},(_,i)=>Object.assign(
      entity(i?'fox':'wolf',i?885:825,i?590:355,18),{speed:103+run.stage*15+i*7,turn:i?1:-1}));
    run.boss=boss?Object.assign(entity('wolf',825,360,22),{
      courage:3,mode:'recover',timer:1.8,aimX:0,aimY:0,hitThisStun:false}):null;
    notice(run,STAGES[run.stage].subtitle,6);
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
    p.invulnerable=1.65;
    if(run.hp<=0){run.hp=0;run.phase='lost';p.moving=false;notice(run,'Baltazar ganhou essa. Outro baralho, outra tentativa.',99);}
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
    if(b.mode!=='stunned'||b.hitThisStun||gap(run.player,b)>stats(run).reach+b.r)return false;
    b.courage--;b.hitThisStun=true;b.mode='recover';b.timer=1.1;
    notice(run,b.courage?'Baltazar: "Isso foi falta de educação!"':'Turma salva. Valentão sem pose!');
    burst(run,b.x,b.y,'rescue');
    if(b.courage===0){run.phase='won';run.player.moving=false;}
    return true;
  }
  function chase(run,e,target,dt) {
    const dx=target.x-e.x,dy=target.y-e.y,len=Math.hypot(dx,dy)||1,amount=e.speed*dt;
    const traveled=move(run,e,dx/len*amount,dy/len*amount);
    if(traveled<amount*.5){
      // Slide along the obstacle rather than teleporting through it.
      const turn=e.turn||1;
      const side=move(run,e,-dy/len*amount*turn,dx/len*amount*turn);
      if(side<.01)e.turn=-turn;
    }
  }
  function updateBoss(run,dt) {
    const b=run.boss,p=run.player;if(!b)return;
    b.timer-=dt;b.moving=false;
    if(b.mode==='recover'&&b.timer<=0){
      const target=run.decoy||p,dx=target.x-b.x,dy=target.y-b.y,len=Math.hypot(dx,dy)||1;
      b.aimX=dx/len;b.aimY=dy/len;b.dx=dx;b.dy=dy;b.mode='warning';b.timer=b.courage===1?.85:1.05;
      notice(run,'Bote anunciado! Saia para o lado.',1.4);
    }else if(b.mode==='warning'&&b.timer<=0){b.mode='charge';b.timer=1.15;}
    else if(b.mode==='charge'){
      const speed=b.courage===1?355:310;
      const moved=move(run,b,b.aimX*speed*dt,b.aimY*speed*dt);
      if(gap(p,b)<p.r+b.r)hurt(run);
      if(run.decoy&&gap(run.decoy,b)<b.r+12){run.decoy=null;b.timer=0;}
      if(b.timer<=0||moved<speed*dt*.65){b.mode='stunned';b.timer=2.15;b.hitThisStun=false;notice(run,'Ele ficou tonto! Chegue perto e interaja.',2.15);}
    }else if(b.mode==='stunned'&&b.timer<=0){b.mode='recover';b.timer=.75;}
  }
  function advance(run) {
    if(run.phase!=='playing'||run.boss||run.rescued!==run.friends.length)return false;
    if(gap(run.player,{x:WIDTH-76,y:HEIGHT/2})>43)return false;
    run.stage++;run.phase='draft';run.hp=Math.min(stats(run).maxHp,run.hp+1);run.rerolls=1;
    run.choices=offer(run);run.paused=false;return true;
  }
  function tick(run,dt,input={}) {
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
    for(const f of run.friends)if(!f.rescued&&gap(p,f)<stats(run).reach+f.r){
      f.rescued=true;run.rescued++;run.totalRescued++;burst(run,f.x,f.y,'rescue');
      notice(run,run.rescued===run.friends.length?'Turma reunida! Siga a seta até a porteira.':`${f.name}: "O almoço pediu demissão!"`);
    }
    for(const e of run.enemies){
      chase(run,e,run.decoy||p,dt);
      if(run.decoy&&gap(e,run.decoy)<28){e.moving=false;}
      if(gap(e,p)<p.r+e.r)hurt(run);
    }
    if(run.phase==='playing')updateBoss(run,dt);
    if(input.interact)interact(run);
    if(run.phase==='playing')advance(run);
  }
  function pause(run,value=!run.paused){if(run.phase==='playing')run.paused=!!value;}
  function checkpoint(run) {
    return {version:VERSION,seed:run.seed,rng:run.rng,stage:run.stage,phase:run.phase,
      skills:{...run.skills},level:run.level,hp:run.hp,choices:[...run.choices],rerolls:run.rerolls,
      totalRescued:run.stage*3,elapsed:run.elapsed};
  }
  function restore(data) {
    if(!data||data.version!==VERSION||!Number.isInteger(data.seed)||!Number.isInteger(data.rng)||
      !Number.isInteger(data.stage)||data.stage<0||data.stage>=STAGES.length||
      !['draft','playing','won'].includes(data.phase)||!data.skills||typeof data.skills!=='object'||
      !Number.isFinite(data.hp)||!Number.isFinite(data.elapsed)||!Number.isInteger(data.level)||
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
      hp:data.hp,elapsed:clamp(data.elapsed,0,86400),totalRescued:data.stage*3,rerolls:data.rerolls});
    if(data.phase==='draft'){run.phase='draft';run.choices=[...data.choices];}
    else {beginStage(run);if(data.phase==='won'){run.phase='won';run.boss.courage=0;}}
    return run;
  }
  return Object.freeze({VERSION,WIDTH,HEIGHT,SKILLS,STAGES,newRun,stats,reroll,choose,tick,
    dash,decoy,interact,pause,checkpoint,restore,clearCircle});
});
