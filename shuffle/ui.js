/* Browser adapter for the isolated prototype. Uses only existing reviewed atlases. */
(() => {
  'use strict';
  const E=ShuffleRun, S=ShuffleSurvival, SAVE_KEY='penas-pro-ar.shuffle.v2';
  let autoSurvival=location.hash==='#survival';
  const isSurvival=()=>run?.mode==='survival';
  const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
  const panel=$('panel'),overlay=$('overlay'),keys=new Set(),images=new Map();
  const data=typeof PixelLabArtData==='undefined'?{}:PixelLabArtData;
  const equipped={entities:{chicken:{}}};SkinSystem.initialize(equipped);
  let selectedSkin=equipped.entities.chicken.skin,powerKey='';
  let run=null,ready=false,view={width:1,height:1,scale:1,x:0,y:0},screenKey='',last=0,accumulator=0;
  let checkpoint=null,saveAvailable=true,joystick={x:0,y:0,id:null},pending={};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store=payload=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(payload));}catch{saveAvailable=false;}};
  try {checkpoint=E.restore(JSON.parse(localStorage.getItem(SAVE_KEY)||'null'));}catch {saveAvailable=false;}
  function clearInput(){keys.clear();joystick.x=0;joystick.y=0;const id=joystick.id;joystick.id=null;const pad=$('joystick');if(id!==null&&pad.hasPointerCapture(id))pad.releasePointerCapture(id);pending={};$('knob').style.transform='none';}
  function modal(html){clearInput();panel.innerHTML=html;overlay.hidden=false;$('pause').disabled=true;for(const id of ['dash','corn','interact'])$(id).disabled=true;
    requestAnimationFrame(()=>{(panel.querySelector('button:not(:disabled)')||panel).focus();});}
  function element(tag,text,cls){const node=document.createElement(tag);node.textContent=text;if(cls)node.className=cls;return node;}
  function startSurvival(seed=crypto.getRandomValues(new Uint32Array(1))[0]){
    if(!ready)return;run=S.newRun(seed,Object.keys(data),selectedSkin);screenKey='';accumulator=0;clearInput();sync();canvas.focus();
  }
  function wardrobe(){
    const box=element('div','','survival-wardrobe'),label=element('label','Quem vai defender a fazenda?'),select=document.createElement('select'),description=element('p','','subtle');
    select.id='survivalSkin';label.htmlFor=select.id;description.id='heroDescription';select.setAttribute('aria-describedby',description.id);
    for(const skin of SkinSystem.catalog){const option=element('option',`${skin.name} · ${S.HEROES[skin.id].name}${SkinSystem.unlocked(skin.id)?'':' · bloqueado'}`);option.value=skin.id;option.disabled=!SkinSystem.unlocked(skin.id);select.append(option);}
    select.value=selectedSkin;
    select.onchange=()=>{selectedSkin=select.value;description.textContent=S.HEROES[selectedSkin].text;};select.onchange();
    box.append(label,select,description);panel.querySelector('.panel-actions').before(box);
  }
  function intro(){screenKey='intro';modal(`<span class="eyebrow">UMA CORRIDA. UM BARALHO DIFERENTE.</span><h1 id="panelTitle">As penas mudam.<br>A coragem fica.</h1><p>10 fases procedurais: oito resgates, Panto na 5ª e Baltazar na 10ª. Antes de cada etapa, escolha uma entre três habilidades sorteadas.</p><div class="route"><span><b>01–04</b>Explorar</span><span><b>05</b>Panto</span><span><b>06–09</b>Avançar</span><span><b>10</b>Baltazar</span></div><p class="subtle">Este é um protótipo separado: não altera sua aventura, personagens desbloqueados ou progresso do jogo original.</p><div class="panel-actions"><button id="startRun" class="primary" disabled>Carregando os bichos…</button>${checkpoint?'<button id="continueRun" disabled>Continuar Shuffle</button>':''}</div><p id="loading" class="subtle" role="status">Preparando os sprites já usados no jogo.</p><a class="back" href="../index.html">Voltar à aventura original</a>`);
    const survivalButton=element('button','Sobrevivência · hordas e poderes','primary');survivalButton.id='startSurvival';survivalButton.disabled=!ready;
    panel.querySelector('.panel-actions').prepend(survivalButton);survivalButton.onclick=()=>startSurvival();
    panel.querySelector('.eyebrow').textContent='MAPAS SORTEADOS. PODERES PELO CAMINHO.';
    panel.querySelector('p').textContent='Sobreviva por cinco minutos contra hordas da fazenda, coletando poderes com ataques automáticos. Ou escolha a campanha de dez fases de resgate.';
    $('startRun').classList.remove('primary');
    $('startRun').onclick=()=>{if(!ready)return;run=E.newRun(crypto.getRandomValues(new Uint32Array(1))[0]);store(E.checkpoint(run));screenKey='';sync();};
    if($('continueRun'))$('continueRun').onclick=()=>{if(!ready)return;run=checkpoint;screenKey='';sync();};
    wardrobe();if(ready)loaded();
  }
  function loaded(){if(!$('startRun'))return;$('startRun').disabled=false;$('startRun').textContent='Campanha de resgate';
    $('startSurvival').disabled=false;
    if($('continueRun'))$('continueRun').disabled=false;
    $('loading').textContent='Sobrevivência: tentativa de 5 minutos, sem checkpoint. '+(saveAvailable?'Campanha: salva no início de cada fase.':'Campanha sem acesso ao salvamento nesta aba.');
    if(autoSurvival){autoSurvival=false;startSurvival();}
  }
  function draft(){const stage=E.STAGES[run.stage];modal(`<span class="eyebrow">ETAPA ${run.stage+1} DE ${E.STAGES.length} · ESCOLHA 1 HABILIDADE</span><h2 id="panelTitle">${stage.name}</h2><p>${stage.subtitle} As habilidades escolhidas continuam nas próximas fases.</p><nav class="campaign" aria-label="Progresso das 10 fases">${E.STAGES.map((s,i)=>`<span class="${i<run.stage?'done':i===run.stage?'current':''} ${s.boss?'boss':''}" title="${s.name}" ${i===run.stage?'aria-current="step"':''}>${String(i+1).padStart(2,'0')}${s.boss?'<small>CHEFE</small>':''}</span>`).join('')}</nav><div id="cards" class="cards"></div><div class="panel-actions"><button id="reroll" ${run.rerolls?'':'disabled'}>${run.rerolls?'Embaralhar uma vez':'Embaralhamento usado'}</button></div><p class="subtle">O jogo fica pausado enquanto você escolhe. Entre fases, recupera ${E.stats(run).stageHealing} ${E.stats(run).stageHealing>1?'corações':'coração'}. Semente: ${run.seed}.</p>`);
    for(const id of run.choices){const card=E.SKILLS.find(s=>s.id===id),rank=(run.skills[id]||0)+1;
      const button=element('button','', 'card');button.type='button';button.dataset.skill=id;
      button.append(element('span',card.mark,'mark'),element('span',card.kind,'kind'),element('strong',card.name),
        element('span',card.text,'description'),element('span',`NÍVEL ${rank} / ${card.max}`,'rank'));
      button.onclick=()=>{if(!E.choose(run,id))return;store(E.checkpoint(run));screenKey='';clearInput();sync();canvas.focus();};$('cards').append(button);
    }
    $('reroll').onclick=()=>{if(E.reroll(run)){store(E.checkpoint(run));screenKey='';sync();}};
  }
  function end(){if(isSurvival()){survivalEnd();return;}const won=run.phase==='won';modal(`<span class="eyebrow">${won?'VALENTÃO SEM ALMOÇO':'A TURMA ESPERA A REVANCHE'}</span><h2 id="panelTitle">${won?'Deu galinha!':'Essa foi por pouco.'}</h2><p>${won?'Dez fases vencidas! Panto liberou a passagem e Baltazar ficou sem almoço.':'Teste outra combinação de habilidades e tente de novo.'}</p><div class="route"><span>${run.totalRescued} amigos resgatados</span><span>${run.bossesDefeated} / 2 chefes</span><span>Fase ${run.stage+1} / 10 · Nível ${run.level}</span><span>${Math.floor(run.elapsed/60)}min ${Math.floor(run.elapsed%60)}s</span></div><p id="endBuild"></p><div class="panel-actions"><button id="again" class="primary">Novo baralho</button><button id="same">Repetir mapas e cartas</button></div><a class="back" href="../index.html">Voltar à aventura original</a>`);
    $('endBuild').textContent=E.SKILLS.filter(s=>run.skills[s.id]).map(s=>`${s.name} ${run.skills[s.id]}`).join(' · ');
    const restart=seed=>{run=E.newRun(seed);store(E.checkpoint(run));screenKey='';sync();};
    $('again').onclick=()=>restart(crypto.getRandomValues(new Uint32Array(1))[0]);$('same').onclick=()=>restart(run.seed);
    try{localStorage.removeItem(SAVE_KEY);}catch{}
  }
  function survivalEnd(){
    const won=run.phase==='won';
    modal(`<span class="eyebrow">SOBREVIVÊNCIA SHUFFLE</span><h2 id="panelTitle">${won?'A fazenda resistiu!':'Essa foi por pouco.'}</h2><p>${won?'Cinco minutos de colheita e coragem!':'Colha outros poderes e tente uma nova combinação.'}</p><div class="route"><span>${run.kills} inimigos afastados</span><span>Onda ${S.wave(run)} · Nível ${run.level}</span><span>${Math.floor(run.elapsed/60)}min ${Math.floor(run.elapsed%60)}s</span></div><p id="endBuild"></p><div class="panel-actions"><button id="again" class="primary">Nova fazenda</button><button id="same">Repetir semente</button></div><p class="subtle">Semente ${run.seed} · Sem checkpoint nesta modalidade.</p><a class="back" href="../index.html">Voltar ao menu principal</a>`);
    $('endBuild').textContent=Object.entries(run.powers).map(([id,rank])=>`${S.POWERS[id].name} ${rank}/3`).join(' · ');
    wardrobe();
    $('again').onclick=()=>startSurvival();$('same').onclick=()=>startSurvival(run.seed);
  }
  function pause(){if(!run||run.phase!=='playing')return;E.pause(run,!run.paused);clearInput();screenKey='';sync();if(!run.paused)canvas.focus();}
  function sync(){
    if(!run)return;
    const state=run.phase+(run.paused?'-paused':'')+(run.phase==='draft'?run.choices.join():'');
    if(state!==screenKey){screenKey=state;
      if(run.phase==='draft')draft();else if(['won','lost'].includes(run.phase))end();
      else if(run.paused){modal('<span class="eyebrow">UMA PAUSA PARA AS PENAS</span><h2 id="panelTitle">Respira, galinha.</h2><p>'+(isSurvival()?'A tentativa continua enquanto esta aba estiver aberta. Voltar ao menu ou recarregar encerra esta sobrevivência; não há checkpoint.':'Esta fase continua de onde você parou enquanto a aba estiver aberta. Ao recarregar, o checkpoint volta ao início da fase.')+'</p><div class="panel-actions"><button id="resume" class="primary">Continuar</button></div><a class="back" href="../index.html">Voltar à aventura original</a>');$('resume').onclick=pause;}
      else {overlay.hidden=true;$('pause').disabled=false;}
      if(run.paused&&isSurvival()){
        const detail=element('p',S.HEROES[run.player.skin].text);panel.querySelector('.panel-actions').before(detail);
        const change=element('button','Trocar bicho · reiniciar');change.onclick=()=>{run=null;$('powerHud').hidden=true;intro();};panel.querySelector('.panel-actions').append(change);
      }
    }
    const s=E.STAGES[run.stage],p=run.player,stat=E.stats(run);
    $('stageLabel').textContent=`${run.stage+1} / ${E.STAGES.length} · ${s.name.toUpperCase()}`;
    $('objective').textContent=s.boss?(E.exitReady(run)?'Panto vencido · Vá à porteira!':run.boss?.mode==='stunned'?'Perto dele: E / Interagir!':'Desvie dos botes e espere a abertura.'):`${run.rescued} / ${s.friendCount} amigos${E.exitReady(run)?' · Porteira liberada':''}`;
    $('health').textContent=`${run.hp} / ${stat.maxHp} vidas${p?.shield?' · escudo':''}`;$('level').textContent=`Nível ${run.level}`;
    $('bossHud').hidden=!s.boss||run.phase!=='playing';if(run.boss){$('bossMeter').max=run.boss.maxCourage;$('bossMeter').value=run.boss.courage;$('bossName').textContent=`${run.boss.name.toUpperCase()} · ${run.boss.courage} / ${run.boss.maxCourage}`;}
    const message=run.phase==='playing'&&run.noticeTime>0?run.notice:'';
    if($('notice').textContent!==message)$('notice').textContent=message;
    $('buildSummary').textContent=E.SKILLS.filter(s=>run.skills[s.id]).map(s=>`${s.name} ${run.skills[s.id]}`).join(' · ')||'Suas habilidades aparecem aqui.';
    $('dash').disabled=run.phase!=='playing'||run.paused||!p||p.dashCooldown>0;
    $('dash').querySelector('small').textContent=p?.dashCooldown>0?`${p.dashCooldown.toFixed(1)}s`:'Espaço';
    $('corn').disabled=run.phase!=='playing'||run.paused||!run.skills.corn||p.cornCooldown>0;
    $('corn').querySelector('small').textContent=!run.skills.corn?'Carta necessária':p?.cornCooldown>0?`${p.cornCooldown.toFixed(1)}s`:'Q';
    $('interact').disabled=run.phase!=='playing'||run.paused||!run.boss||run.boss.mode!=='stunned';
    $('corn').hidden=$('interact').hidden=isSurvival();
    $('powerHud').hidden=!isSurvival()||run.phase!=='playing'||run.paused;
    if(isSurvival()){
      const remaining=Math.max(0,Math.ceil(S.DURATION-run.elapsed));
      $('stageLabel').textContent=`SOBREVIVÊNCIA · ONDA ${S.wave(run)} · ${s.name.toUpperCase()}`;
      $('objective').textContent=`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')} · ${run.kills} afastados · ${run.enemies.length} na horda`;
      $('level').textContent=`Nível ${run.level} · XP ${run.xp}/${S.xpNeeded(run)}`;
      const hero=S.HEROES[p.skin];
      $('buildSummary').textContent=hero.text;
      const signature=p.skin+JSON.stringify(run.powers);
      if(powerKey!==signature){
        powerKey=signature;$('powerHud').replaceChildren();
        const badge=element('span',`${CharacterArt.appearances[p.skin].name} · ${hero.name}`,'hero-power');badge.title=hero.text;$('powerHud').append(badge);
        for(const [id,power] of Object.entries(S.POWERS))if(run.powers[id]){
          const chip=element('span',`${power.name}: ${run.powers[id]}/3`);chip.title=power.text;chip.style.borderColor=power.color;$('powerHud').append(chip);
        }
      }
    }
    document.querySelector('.brand small').textContent=isSurvival()?'SOBREVIVÊNCIA':'10 FASES';
    document.querySelector('.keyboard-hint strong').textContent=isSurvival()?'Colha poderes. Segure a horda.':'Resgate. Escolha. Improvise.';
    document.querySelector('.keyboard-hint>span').textContent=isSurvival()?'WASD / setas · mover   Espaço · esquiva   Esc · pausa':'WASD / setas · mover   Espaço · esquiva   E · interagir   Q · isca';
    canvas.setAttribute('aria-label',isSurvival()?'Sobrevivência: WASD ou setas para mover, espaço para esquivar. Colete poderes; ataques automáticos.':'Use WASD ou setas para mover, espaço para esquivar, Q para isca e E para interagir.');
  }
  const animations=new WeakMap();
  function animation(actor){
    if(!animations.has(actor))animations.set(actor,{anim:0,traveled:actor.traveled,direction:'down',speed:0});
    return animations.get(actor);
  }
  function animate(dt){
    for(const actor of [run.player,...run.enemies,...run.friends,...(run.boss?[run.boss]:[])]){
      const a=animation(actor),distance=Math.max(0,actor.traveled-a.traveled);
      a.speed=distance/dt;a.traveled=actor.traveled;
      a.anim=CharacterArt.advance(a.anim,actor.species,distance,{speed:a.speed,skin:actor.skin});
      a.direction=CharacterArt.directionFor(a.direction,actor.dx,actor.dy);
    }
  }
  function sprite(actor,alpha=1){const appearance=actor.skin&&CharacterArt.appearances[actor.skin],id=appearance?.sprite||appearance?.species||actor.species,d=data[id],img=images.get(id);if(!d||!img)return;
    const a=animation(actor),current=CharacterArt.frameFor(actor.species,{direction:a.direction,
      skin:actor.skin,anim:a.anim,moving:actor.moving&&!reduced,sprinting:actor.dashTime>0||actor.mode==='charge'||a.speed>175});
    const f=current.frame;
    const idle=(d.actions.idle?.down||d.poses.down).frames[0],heights={chicken:51,rabbit:35,sheep:44,pig:46,cow:66,duck:40,dog:45};
    const scale=(appearance?(heights[appearance.species]||51):(S.ENEMIES[actor.species]?.height||heights[actor.species]||46))/(idle.bottom-idle.top||64);
    ctx.save();ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=false;
    ctx.drawImage(img,f.x,f.y,f.w,f.h,Math.round(actor.x-f.cx*scale),Math.round(actor.y-f.bottom*scale),Math.round(f.w*scale),Math.round(f.h*scale));ctx.restore();
    if(actor.species==='cuca'&&actor.maxHealth){
      ctx.fillStyle='#263c31';ctx.fillRect(actor.x-27,actor.y-87,54,6);
      ctx.fillStyle=S.ENEMIES.cuca.color;ctx.fillRect(actor.x-26,actor.y-86,52*Math.max(0,actor.health/actor.maxHealth),4);
      label('CUCA',actor.x,actor.y-102);
    }
  }
  function danger(){
    ctx.save();
    for(const h of run.hazards){
      const waiting=h.arm>0,fire=h.kind==='fire';
      ctx.fillStyle=waiting?'#efc46125':fire?'#d4542555':'#63894866';
      ctx.strokeStyle=waiting?'#ffe6a3':fire?'#ffbd59':'#c5e19a';ctx.lineWidth=2;
      ctx.setLineDash(waiting?[4,5]:[]);ctx.beginPath();ctx.arc(h.x,h.y,h.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.setLineDash([]);
      if(waiting){ctx.fillStyle='#fff1bd';ctx.font='bold 16px sans-serif';ctx.textAlign='center';ctx.fillText('!',h.x,h.y+5);}
      else for(let i=0;i<3;i++){
        const x=h.x+(i-1)*10,y=h.y+5;
        ctx.strokeStyle=fire?'#ffe48a':'#d1e5a4';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+2,y-7);ctx.lineTo(x-2,y-15);ctx.stroke();
      }
    }
    for(const e of run.enemies)if(e.mode==='warning'){
      const witch=e.species==='cuca',length=witch?260:255,color=S.ENEMIES[e.species].color;
      ctx.strokeStyle=color+'55';ctx.lineWidth=witch?12:e.r*2;
      for(const angle of witch?[-.22,0,.22]:[0]){
        const dx=e.aimX*Math.cos(angle)-e.aimY*Math.sin(angle),dy=e.aimX*Math.sin(angle)+e.aimY*Math.cos(angle);
        ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+dx*length,e.y+dy*length);ctx.stroke();
      }
      label(witch?'FEITIÇO!':'INVESTIDA!',e.x,e.y-(S.ENEMIES[e.species].height+12));
    }
    ctx.restore();
  }
  const noise=(x,y,n=0)=>{let v=Math.imul(x+371,n+97)^Math.imul(y+73,1871);v^=v>>>13;return((v>>>0)%1000)/1000;};
  let ground=null,groundKey='',sceneryProps=[];
  const previewMap=E.generateStage(321,0);
  function roadDistance(p,road){
    const {a,b}=road,dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy;
    const t=d?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/d)):0;
    return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);
  }
  function background(layout){
    const key=layout.id+':'+ready;
    if(ground&&groundKey===key)return ground;groundKey=key;
    ground=document.createElement('canvas');ground.width=E.WIDTH;ground.height=E.HEIGHT;const g=ground.getContext('2d');
    const palettes={orchard:['#7e9b56','#bba16c'],corn:['#839953','#c0a36d'],grove:['#64844f','#aa9668'],
      field:['#819b57','#c1a776'],pond:['#6f9567','#baa477'],harvest:['#8d9c55','#c5a671'],
      quarry:['#819071','#b1a782'],sunset:['#91945a','#bda072'],dusk:['#718157','#ae986d'],night:['#526e5b','#949171']};
    const [grass,road]=palettes[layout.theme]||palettes.orchard,nseed=layout.seed%999983;
    g.fillStyle=grass;g.fillRect(0,0,E.WIDTH,E.HEIGHT);
    for(let i=0;i<55;i++){
      const x=noise(i,11,nseed)*E.WIDTH,y=noise(i,47,nseed)*E.HEIGHT,r=45+noise(i,83,nseed)*110;
      const patch=g.createRadialGradient(x,y,0,x,y,r);patch.addColorStop(0,i%3?'#c3d58b22':'#294e3820');patch.addColorStop(1,'#81965000');
      g.fillStyle=patch;g.fillRect(x-r,y-r,r*2,r*2);
    }
    for(let i=0;i<11500;i++){
      const x=noise(i,31,nseed)*E.WIDTH,y=noise(i,57,nseed)*E.HEIGHT;
      g.fillStyle=i%3?'#c4d58b24':'#31573b20';g.fillRect(Math.round(x),Math.round(y),2+noise(i,61,nseed)*5,1);
    }
    g.lineCap='round';g.lineJoin='round';
    // Paint every verge before every interior: junctions never have pipe-like seams.
    for(const [extra,color] of [[22,'#79834b44'],[14,'#b3a273'],[8,road]])for(const r of layout.roads){
      const length=Math.hypot(r.b.x-r.a.x,r.b.y-r.a.y),steps=Math.max(1,Math.ceil(length/26));
      const nx=-(r.b.y-r.a.y)/(length||1),ny=(r.b.x-r.a.x)/(length||1);
      g.strokeStyle=color;g.lineWidth=r.width+extra;g.beginPath();g.moveTo(r.a.x,r.a.y);
      for(let i=1;i<=steps;i++){const offset=i===steps?0:(noise(i,r.a.x+r.a.y,nseed)-.5)*5;g.lineTo(r.a.x+(r.b.x-r.a.x)*i/steps+nx*offset,r.a.y+(r.b.y-r.a.y)*i/steps+ny*offset);}
      g.stroke();
    }
    for(const [index,r] of layout.roads.entries()){
      const dx=r.b.x-r.a.x,dy=r.b.y-r.a.y,length=Math.hypot(dx,dy)||1,nx=-dy/length,ny=dx/length;
      for(let i=0;i<length*1.3;i++){
        const t=noise(i,index+17,nseed),offset=(noise(i,index+64,nseed)-.5)*r.width;
        const x=r.a.x+dx*t+nx*offset,y=r.a.y+dy*t+ny*offset;
        g.fillStyle=i%3?'#efdaab35':'#7b68452a';g.fillRect(Math.round(x),Math.round(y),1+noise(i,index+93,nseed)*4,1);
      }
      for(let i=0;i<length/9;i++){
        const t=noise(i,index+24,nseed),side=i%2?1:-1,offset=(r.width/2+7+noise(i,index+29,nseed)*6)*side;
        const x=r.a.x+dx*t+nx*offset,y=r.a.y+dy*t+ny*offset;
        if(layout.roads.some(other=>other!==r&&roadDistance({x,y},other)<other.width/2+8))continue;
        g.strokeStyle=i%3?'#6b874956':'#c4ce875c';g.lineWidth=1;
        g.beginPath();g.moveTo(x-3,y);g.lineTo(x-1,y-4);g.moveTo(x,y+1);g.lineTo(x+2,y-3);g.stroke();
      }
    }
    sceneryProps=layout.obstacles.map(o=>{
      const wooded=['grove','night','pond','dusk'].includes(layout.theme),variant=noise(o.x,o.y,71);
      const name=o.kind==='tree'?(wooded?(variant>.45?'willow':'tree'):(variant>.45?'pear':'tree')):o.kind==='hay'?'hay':variant>.45?'bramble':'harvest';
      const w=o.kind==='tree'?Math.max(112,Math.min(152,o.w*1.85)):o.w+10;
      return {name,x:o.x+o.w/2,y:o.y+o.h,w,h:o.kind==='tree'?185:o.h+42,blocking:true};
    });
    // Low, nonblocking flowers occupy verges, away from routes and pickup objectives.
    for(let i=0;i<110;i++){
      const x=60+noise(i,97,nseed)*(E.WIDTH-120),y=70+noise(i,119,nseed)*(E.HEIGHT-130);
      if(layout.roads.some(r=>roadDistance({x,y},r)<r.width/2+26))continue;
      if(layout.obstacles.some(o=>x>o.x-25&&x<o.x+o.w+25&&y>o.y-25&&y<o.y+o.h+25))continue;
      if([layout.spawn,layout.exit,...layout.friends].some(p=>Math.hypot(x-p.x,y-p.y)<75))continue;
      const w=18+Math.floor(noise(i,121,nseed)*14);
      sceneryProps.push({name:i%3?'daisies':'lavender',x,y,w,h:w,blocking:false});
    }
    if(ready){
      const post=images.get('fencePost'),horizontal=images.get('fenceHorizontal'),vertical=images.get('fenceVertical');g.imageSmoothingEnabled=false;
      for(let x=24;x<E.WIDTH-24;x+=80)for(const y of [29,E.HEIGHT-21]){
        g.drawImage(horizontal,x,y-18,Math.min(80,E.WIDTH-24-x),22);g.drawImage(post,x-6,y-24,12,32);
      }
      for(let y=29;y<E.HEIGHT-21;y+=80)for(const x of [24,E.WIDTH-24]){
        g.drawImage(vertical,x-6,y-14,12,Math.min(80,E.HEIGHT-21-y));g.drawImage(post,x-6,y-24,12,32);
      }
      g.drawImage(post,E.WIDTH-30,E.HEIGHT-45,12,32);
    }
    return ground;
  }
  function obstacle(o){
    ctx.save();
    const p=run?.player;
    if(p&&o.blocking&&p.y<o.y&&p.y>o.y-o.h&&Math.abs(p.x-o.x)<o.w/2+10)ctx.globalAlpha=.35;
    FarmSprites.draw(ctx,o.name,o.x-o.w/2,o.y-o.h,o.w,o.h,{shadow:true});ctx.restore();
  }
  function label(text,x,y,color='#fff2c4'){ctx.font='bold 12px FarmText, sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#243e2b';ctx.strokeText(text,x,y);ctx.fillStyle=color;ctx.fillText(text,x,y);}
  function pickup(item){
    const {x,y,kind}=item;ctx.save();ctx.translate(x,y);
    ctx.fillStyle=kind==='xp'?'#7ce8a2':S.POWERS[kind]?.color||'#ffadb5';
    if(kind==='xp'){ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(5,0);ctx.lineTo(0,6);ctx.lineTo(-5,0);ctx.closePath();ctx.fill();}
    else{
      ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=2;ctx.fillStyle='#253c2cee';ctx.fillRect(-13,-14,26,28);ctx.strokeRect(-13,-14,26,28);
      ctx.fillStyle=S.POWERS[kind]?.color||'#ffadb5';
      if(kind==='egg'||kind==='cornshot'){ctx.beginPath();ctx.ellipse(0,0,kind==='egg'?7:4,10,0,0,Math.PI*2);ctx.fill();}
      else if(kind==='sickle'){ctx.beginPath();ctx.arc(1,-2,8,Math.PI,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(1,-2);ctx.lineTo(-6,10);ctx.stroke();}
      else if(kind==='boots'){ctx.fillRect(-7,-9,9,19);ctx.fillRect(0,4,9,6);}
      else{ctx.fillRect(-6,-7,12,17);ctx.fillRect(-4,-11,8,4);}
    }
    ctx.restore();
  }
  function resize(){const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);view.width=r.width;view.height=r.height;canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
  function render(){if(!view.width||!view.height)return;const stage=run?.stage||0,p=run?.player||{x:530,y:365};
    const scale=Math.min(1.45,Math.max(view.width/1120,view.height/720));view.scale=scale;
    const vw=view.width/scale,vh=view.height/scale;
    view.x=vw>=E.WIDTH?(E.WIDTH-vw)/2:Math.min(E.WIDTH-vw,Math.max(0,p.x-vw*.5));
    view.y=vh>=E.HEIGHT?(E.HEIGHT-vh)/2:Math.min(E.HEIGHT-vh,Math.max(0,p.y-vh*.52));
    if(isSurvival())view.y=Math.min(Math.max(-80/scale,E.HEIGHT-vh+45/scale),Math.max(-80/scale,p.y-vh*.52));
    ctx.fillStyle='#294330';ctx.fillRect(0,0,view.width,view.height);ctx.save();ctx.scale(scale,scale);ctx.translate(-view.x,-view.y);ctx.drawImage(background(run?.layout||previewMap),0,0);
    if(!run?.player){for(const prop of [...sceneryProps].sort((a,b)=>a.y-b.y))obstacle(prop);ctx.restore();return;}
    if(run.stage<9&&!isSurvival()){const gate=run.exit,open=E.exitReady(run);ctx.save();ctx.translate(gate.x,gate.y);if(gate.side%2)ctx.rotate(Math.PI/2);ctx.fillStyle=open?'#e3c77f':'#314f3b';ctx.fillRect(-17,-36,34,72);ctx.strokeStyle='#e9dab0';ctx.lineWidth=2;ctx.strokeRect(-20,-39,40,78);ctx.restore();label(open?'SAÍDA':run.boss?'VENÇA PANTO':`${run.friends.length} RESGATES`,gate.x,gate.y-51);}
    if(run.boss?.mode==='warning'||run.boss?.mode==='charge'){const b=run.boss;ctx.save();ctx.strokeStyle=b.mode==='warning'?'#ffce6288':'#f6835777';ctx.lineWidth=44;ctx.setLineDash(b.mode==='warning'?[12,10]:[]);ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x+b.aimX*(b.chargeSpeed+(b.id==='baltazar'&&b.courage<=2?30:0))*b.chargeSeconds,b.y+b.aimY*(b.chargeSpeed+(b.id==='baltazar'&&b.courage<=2?30:0))*b.chargeSeconds);ctx.stroke();ctx.restore();}
    if(run.decoy){ctx.fillStyle='#f1cf58';for(let i=0;i<9;i++)ctx.fillRect(run.decoy.x+(i%3)*6-8,run.decoy.y+Math.floor(i/3)*4-4,4,3);}
    if(isSurvival())for(const item of run.pickups){pickup(item);if(item.kind!=='xp'&&Math.hypot(item.x-p.x,item.y-p.y)<90)label(S.POWERS[item.kind]?.name||'Leite · +2 vidas',item.x,item.y-24);}
    if(isSurvival())danger();
    const drawables=sceneryProps.map(o=>({y:o.y,draw:()=>obstacle(o)}));
    for(const a of [...run.friends.filter(f=>!f.rescued),...run.enemies,...(run.boss?[run.boss]:[]),run.player])drawables.push({y:a.y,draw:()=>sprite(a,a===run.player&&a.invulnerable>0&&Math.floor(run.elapsed*10)%2?.5:1)});
    drawables.sort((a,b)=>a.y-b.y).forEach(d=>d.draw());
    if(isSurvival()){
      for(const hex of run.hexes){ctx.fillStyle='#b788dc';ctx.strokeStyle='#f9e5ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(hex.x,hex.y,6,0,Math.PI*2);ctx.fill();ctx.stroke();}
      for(const shot of run.shots){ctx.fillStyle=shot.color||S.POWERS[shot.kind].color;ctx.strokeStyle='#253c2c';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(shot.x,shot.y,shot.blast?7:4,shot.blast?9:6,0,0,Math.PI*2);ctx.fill();ctx.stroke();}
      for(const mine of run.mines){ctx.fillStyle=mine.arm>0?'#c49e6b':'#ffb35e';ctx.beginPath();ctx.moveTo(mine.x-6,mine.y-5);ctx.lineTo(mine.x+6,mine.y-5);ctx.lineTo(mine.x,mine.y+9);ctx.closePath();ctx.fill();ctx.strokeStyle='#85cc78';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(mine.x,mine.y-5);ctx.lineTo(mine.x-3,mine.y-11);ctx.moveTo(mine.x,mine.y-5);ctx.lineTo(mine.x+4,mine.y-10);ctx.stroke();}
      if(p.skin==='robocop')for(const claw of S.claws(run)){ctx.strokeStyle=S.HEROES.robocop.color;ctx.lineWidth=3;for(let i=-1;i<=1;i++){ctx.beginPath();ctx.arc(claw.x+i*5,claw.y,9,-1,1);ctx.stroke();}}
      for(const effect of run.effects)if(effect.kind==='hero'){
        const t=1-effect.time/.55;ctx.save();ctx.globalAlpha=1-t;ctx.strokeStyle=effect.color;ctx.lineWidth=3;ctx.beginPath();
        if(effect.toX!==undefined){ctx.moveTo(effect.x,effect.y);ctx.lineTo((effect.x+effect.toX)/2+6,(effect.y+effect.toY)/2-6);ctx.lineTo(effect.toX,effect.toY);}
        else if(effect.angle!==undefined){ctx.moveTo(effect.x,effect.y);ctx.arc(effect.x,effect.y,effect.radius*t,effect.angle-.98,effect.angle+.98);ctx.closePath();}
        else ctx.arc(effect.x,effect.y,effect.radius*t,0,Math.PI*2);
        ctx.stroke();ctx.restore();
      }
      for(const effect of run.effects)if(effect.kind==='sickle'){const t=1-effect.time/.55;ctx.strokeStyle=S.POWERS.sickle.color;ctx.lineWidth=4;ctx.beginPath();ctx.arc(effect.x,effect.y,effect.radius,t*Math.PI*2,t*Math.PI*2+2.2);ctx.stroke();}
    }
    for(const f of run.friends)if(!f.rescued&&Math.hypot(f.x-p.x,f.y-p.y)<180)label(f.name,f.x,f.y-57);
    if(p.shield){ctx.strokeStyle='#f4db7f';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y-27,31,Math.PI*1.05,Math.PI*1.96);ctx.stroke();}
    if(run.boss?.mode==='stunned'){const b=run.boss;label('TONTO · E',b.x,b.y-78);for(let i=0;i<3;i++){const a=i*2.1+(reduced?0:run.elapsed*3);ctx.fillStyle='#ffd16b';ctx.fillRect(b.x+Math.cos(a)*22-3,b.y-64+Math.sin(a)*5,5,5);}}
    if(!reduced)for(const effect of run.effects){const t=1-effect.time/.55;ctx.fillStyle=effect.kind==='hurt'?'#e79071':'#f8deb0';ctx.globalAlpha=1-t;for(let i=0;i<7;i++){const a=i*Math.PI*2/7;ctx.fillRect(effect.x+Math.cos(a)*t*32,effect.y-12+Math.sin(a)*t*26,3,3);}ctx.globalAlpha=1;}
    ctx.restore();
    // A small map and an edge marker keep goals discoverable on portrait phones.
    ctx.save();const mw=102,mh=66,mx=isSurvival()&&(p.x-view.x)*scale>view.width*.65?12:view.width-mw-12,my=run.boss?128:82;ctx.fillStyle='#183b2dd9';ctx.fillRect(mx-4,my-4,mw+8,mh+8);ctx.fillStyle='#819353';ctx.fillRect(mx,my,mw,mh);
    const dot=(x,y,c,r=2)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(mx+x/E.WIDTH*mw,my+y/E.HEIGHT*mh,r,0,Math.PI*2);ctx.fill();};
    for(const f of run.friends)if(!f.rescued)dot(f.x,f.y,'#fce2a1',3);for(const e of run.enemies)dot(e.x,e.y,'#ec9d72');if(run.boss)dot(run.boss.x,run.boss.y,'#ec9d72',3);dot(p.x,p.y,'#fff9e0',3);
    if(isSurvival())for(const item of run.pickups)if(item.kind!=='xp')dot(item.x,item.y,S.POWERS[item.kind]?.color||'#ffadb5',2);
    if(E.exitReady(run)&&run.stage<9){
      const gate=run.exit;dot(gate.x,gate.y,'#ffce58',4);
      const rawX=(gate.x-view.x)*scale,rawY=(gate.y-view.y)*scale;
      const x=Math.min(view.width-36,Math.max(36,rawX)),y=Math.min(view.height-65,Math.max(85,rawY));
      const dx=rawX-x,dy=rawY-y,arrow=Math.abs(dx)>Math.abs(dy)?(dx<0?'←':'→'):(dy<0?'↑':'↓');
      label(`SAÍDA ${arrow}`,x,y);
    }
    ctx.restore();
  }
  function input(){let x=(keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyA')?1:0),y=(keys.has('ArrowDown')||keys.has('KeyS')?1:0)-(keys.has('ArrowUp')||keys.has('KeyW')?1:0);if(Math.hypot(joystick.x,joystick.y)>.1){x=joystick.x;y=joystick.y;}return{x,y};}
  document.addEventListener('keydown',e=>{
    if(!overlay.hidden){if(e.key==='Tab'){const items=[...panel.querySelectorAll('button:not(:disabled),select,a')];if(items.length){const i=items.indexOf(document.activeElement);if((e.shiftKey&&i<=0)||(!e.shiftKey&&i===items.length-1)){e.preventDefault();items[e.shiftKey?items.length-1:0].focus();}}}if(e.code==='Escape'&&run?.paused){e.preventDefault();pause();}return;}
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
    if(e.code==='Escape'){pause();return;}keys.add(e.code);if(!e.repeat){if(e.code==='Space')pending.dash=true;if(e.code==='KeyQ')pending.corn=true;if(e.code==='KeyE')pending.interact=true;}
  });document.addEventListener('keyup',e=>keys.delete(e.code));
  const stop=()=>{clearInput();if(run?.phase==='playing'&&!run.paused){E.pause(run,true);screenKey='';sync();}};
  window.addEventListener('blur',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  $('pause').onclick=pause;$('dash').onclick=()=>{pending.dash=true;};$('corn').onclick=()=>{pending.corn=true;};$('interact').onclick=()=>{pending.interact=true;};
  const stick=$('joystick');function touch(e){const b=stick.getBoundingClientRect(),r=b.width*.35,dx=e.clientX-b.left-b.width/2,dy=e.clientY-b.top-b.height/2,len=Math.hypot(dx,dy),div=Math.max(r,len);joystick.x=dx/div;joystick.y=dy/div;$('knob').style.transform=`translate(${joystick.x*r}px,${joystick.y*r}px)`;}
  stick.addEventListener('pointerdown',e=>{if(!overlay.hidden||joystick.id!==null)return;joystick.id=e.pointerId;stick.setPointerCapture(e.pointerId);touch(e);e.preventDefault();});
  stick.addEventListener('pointermove',e=>{if(e.pointerId===joystick.id)touch(e);});
  const release=e=>{if(e.pointerId===joystick.id){joystick.id=null;joystick.x=0;joystick.y=0;$('knob').style.transform='none';}};
  for(const event of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(event,release);
  new ResizeObserver(resize).observe($('playfield'));
  function frame(now){let elapsed=Math.min(.1,(now-last)/1000||0);last=now;accumulator+=elapsed;
    if(run){const before=run.phase;const i=input();if(pending.dash)E.dash(run,i.x,i.y);if(pending.corn)E.decoy(run);if(pending.interact)E.interact(run);pending={};
      while(accumulator>=1/60){const active=run.phase==='playing'&&!run.paused;(isSurvival()?S:E).tick(run,1/60,i);if(active)animate(1/60);accumulator-=1/60;}
      if(before==='playing'&&run.phase==='draft')store(E.checkpoint(run));sync();
    }else accumulator=0;render();requestAnimationFrame(frame);}
  intro();resize();requestAnimationFrame(frame);
  const required=[...new Set(['chicken','wolf','goose','fox','sheep','pig','rabbit','cow','duck','dog',...Object.values(CharacterArt.appearances).map(a=>a.sprite||a.species),...Object.keys(S.ENEMIES).filter(id=>data[id])])];
  const sources=[...required.map(id=>[id,data[id]?.source]),['fencePost','assets/farm/fence-post.png'],['fenceHorizontal','assets/farm/fence-rail-h.png'],['fenceVertical','assets/farm/fence-rail-v.png']];
  Promise.all([FarmSprites.loadCohesive().then(ok=>{if(!ok)throw Error('Não carregou o atlas da fazenda.');}),...sources.map(([id,source])=>new Promise((resolve,reject)=>{if(!source)return reject(Error(`Faltou o atlas de ${id}.`));const img=new Image(),timer=setTimeout(()=>reject(Error('O carregamento demorou demais.')),20000);img.onload=()=>{clearTimeout(timer);images.set(id,img);resolve();};img.onerror=()=>{clearTimeout(timer);reject(Error(`Não carregou: ${id}.`));};img.src='../'+source.replace(/^\.\//,'');}))])
    .then(()=>{ready=true;loaded();}).catch(error=>{if($('loading'))$('loading').textContent=`${error.message} Recarregue a página ou volte ao jogo original.`;console.error(error);});
  // Debug handles for deterministic browser tests; isolated from classic state.
  window.ShuffleDemo=Object.freeze({get run(){return run;},get ready(){return ready;},get saveKey(){return SAVE_KEY;}});
})();
