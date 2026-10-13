/* Browser adapter for the isolated prototype. Uses only existing reviewed atlases. */
(() => {
  'use strict';
  const E=ShuffleRun, S=ShuffleSurvival, SAVE_KEY='penas-pro-ar.shuffle.v2';
  const DIFFICULTY_KEY='penas-pro-ar.shuffle-victories.v1';
  function savedVictories(){try{return S.victories(JSON.parse(localStorage.getItem(DIFFICULTY_KEY)));}catch{return 0;}}
  let victories=savedVictories();
  let autoSurvival=location.hash==='#survival';
  const isSurvival=()=>run?.mode==='survival';
  const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
  const panel=$('panel'),overlay=$('overlay'),keys=new Set(),images=new Map();
  const data=typeof PixelLabArtData==='undefined'?{}:PixelLabArtData;
  const equipped={entities:{chicken:{}}};SkinSystem.initialize(equipped);
  let selectedSkin=equipped.entities.chicken.skin,selectedStyle='colheita',powerKey='';
  let run=null,ready=false,view={width:1,height:1,scale:1,x:0,y:0},screenKey='',last=0,accumulator=0;
  let checkpoint=null,saveAvailable=true,joystick={x:0,y:0,id:null},pending={};
  let audioRun=null,heardEffects=new WeakSet(),audioHp=0,audioSuspended=false;
  const powerSounds={
    cornshot:['pop',.28,1.2],egg:['pop',.38,.85],sickle:['boing',.3,.8],
    feather:['boing',.25,1.3],water:['step-water',.45,1.15],carrot:['pop',.35,.75],
    lightning:['panto-dodge',.6,1.3],claw:['fox-rustle',.35,1.2],
    bark:['animal-dog',.55],honk:['goose-honk',.5],milk:['rescue',.45],shield:['boing',.3],
    explosion:['bonk',.5,.75],level:['rescue',.65],upgrade:['rescue',.55,1.25],
    fusion:['panto-victory',.65],shuffle:['pop',.45,.9],
  };
  function syncAudio(dt=0){
    if(audioRun!==run){AudioSystem.reset();audioRun=run;heardEffects=new WeakSet();audioHp=run?.hp||0;}
    const choosing=run&&(['draft','power-draft','stage-clear'].includes(run.phase)||(run.paused&&!overlay.hidden&&!!$('closeFusions')));
    const game={phase:audioSuspended?'paused':choosing?'playing':run?.paused?'paused':run?.phase||'menu',entities:{chicken:run?.player}};
    AudioSystem.update(game,dt);
    if(run){
      if(run.hp<audioHp)AudioSystem.playPlayerHurt(game);
      audioHp=run.hp;
      // One cue per activation family per frame, even for volleys and chain attacks.
      for(const sound of run.sounds||[]){
        if(sound&&typeof sound==='object'){AudioSystem.playEnemy(sound.species,sound.event,sound.position);continue;}
        const cue=powerSounds[sound];
        if(cue)AudioSystem.play(cue[0],{volume:cue[1],rate:cue[2]});
      }
      run.sounds?.clear();
      for(const effect of run.effects){
        if(heardEffects.has(effect))continue;
        heardEffects.add(effect);
        const cue={dash:'boing',shield:'bonk',hurt:'bonk',impact:'pop',collect:'pop',rescue:'rescue'}[effect.kind];
        if(cue)AudioSystem.play(cue,{volume:effect.kind==='collect'?.25:.4});
      }
    }
    const {muted}=AudioSystem.settings,{unlocked,blocked,unsupported,failedClips}=AudioSystem.status;
    $('audioMute').textContent=unsupported?'Som indisponível':muted||!unlocked||blocked||failedClips.length?'Ativar som':'Silenciar';
    $('audioMute').setAttribute('aria-pressed',String(muted));$('audioMute').disabled=unsupported;
  }
  function unlockAudio(event){
    if(event.target.closest?.('#audioMute'))return;
    audioSuspended=false;syncAudio();
    if(!AudioSystem.status.unlocked||AudioSystem.status.blocked)AudioSystem.unlock();
  }
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,touchControls=matchMedia('(pointer: coarse)').matches;
  const store=payload=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(payload));}catch{saveAvailable=false;}};
  try {checkpoint=E.restore(JSON.parse(localStorage.getItem(SAVE_KEY)||'null'));}catch {saveAvailable=false;}
  function clearInput(){keys.clear();joystick.x=0;joystick.y=0;const id=joystick.id;joystick.id=null;const pad=$('joystick');if(id!==null&&pad.hasPointerCapture(id))pad.releasePointerCapture(id);pending={};$('knob').style.transform='none';}
  function modal(html){clearInput();panel.innerHTML=html;overlay.hidden=false;$('pause').disabled=true;for(const id of ['dash','corn','interact'])$(id).disabled=true;
    requestAnimationFrame(()=>{(panel.querySelector('.result-quips')?panel:panel.querySelector('button:not(:disabled)')||panel).focus({preventScroll:true});panel.scrollTop=0;overlay.scrollTop=0;});}
  function element(tag,text,cls){const node=document.createElement(tag);node.textContent=text;if(cls)node.className=cls;return node;}
  function powerIcon(kind){const icon=document.createElement('canvas');icon.width=72;icon.height=72;icon.className='power-icon';icon.setAttribute('aria-hidden','true');ShuffleFX.catalogIcon(icon.getContext('2d'),kind,36,36,60);return icon;}
  function fusionIcon(id){const icon=powerIcon('fusion');ShuffleFX.fusionIcon(icon.getContext('2d'),{...S.FUSIONS[id],fusion:id},36,36,60);return icon;}
  function fusionBook(){
    if(!isSurvival()||run.phase!=='playing')return;
    E.pause(run,true);screenKey='playing-paused';
    modal('<span class="eyebrow">A ROÇA NÃO SE RESPONSABILIZA.</span><h2 id="panelTitle">Receitas da Bagunça</h2><p>Leve os dois ingredientes ao nível 3 e aperte Fundir. A mistura substitui os ataques dos dois ingredientes: prepare armadilhas, abra passagem, recolha XP ou responda aos golpes. Continua nas próximas fases!</p><div class="panel-actions fusion-actions"><button id="closeFusions" class="primary">Voltar à batalha</button></div><p class="subtle">A partida está pausada. Esc também volta ao jogo.</p><div id="fusionRecipes" class="fusion-recipes"></div>');
    $('closeFusions').onclick=pause;
    for(const [id,recipe] of Object.entries(S.FUSIONS)){
      const owned=run.fusions.includes(id),available=S.canFuse(run,id),card=element('article','','fusion-recipe');
      card.dataset.fusion=id;card.dataset.state=owned?'owned':available?'ready':'locked';card.style.setProperty('--fusion-color',recipe.color);
      const title=element('h3',recipe.name);title.prepend(fusionIcon(id));card.append(title);
      const ingredients=element('div','','fusion-ingredients');
      recipe.items.forEach((item,i)=>{
        if(i)ingredients.append(element('b','+'));
        const power=S.POWERS[item],entry=element('span',`${power.name} · ${run.powers[item]||0}/${S.maxRank(item)} · exige 3`);
        entry.prepend(powerIcon(item));ingredients.append(entry);
      });
      const button=element('button',owned?'Fusão equipada':available?'Fundir!':'Faltam ingredientes no nível 3',available?'primary':'');
      button.disabled=owned||!available;button.dataset.craft=id;button.setAttribute('aria-label',`${button.textContent}: ${recipe.name}`);
      button.onclick=()=>{if(S.fuse(run,id)){pause();}};
      card.append(ingredients,element('p',recipe.text),button);$('fusionRecipes').append(card);
    }
    sync();
  }
  function quipRow(line,result=false){
    const row=element('div','','banter-row'),portrait=document.createElement('canvas'),bubble=element('blockquote','','speech-bubble');
    portrait.width=portrait.height=96;portrait.className='banter-portrait';portrait.setAttribute('aria-hidden','true');
    const actor=line.actor,appearance=CharacterArt.appearances[actor.skin],id=appearance?.sprite||appearance?.species||actor.species;
    const pose=result&&ShuffleResultArt[line.artId]?.[line.outcome],img=images.get(pose||id);
    row.dataset.outcome=line.outcome;
    if(img){
      portrait.width=portrait.height=128;portrait.dataset.pose=line.artId+'-'+line.outcome;portrait.dataset.source=pose||id;
      const c=portrait.getContext('2d');c.imageSmoothingEnabled=false;
      if(pose)c.drawImage(img,0,0,128,128);
      else{
        const f=CharacterArt.frameFor(actor.species,{skin:actor.skin,direction:'down',mood:line.outcome==='win'?'happy':'sad',moving:false,anim:0}).frame;
        const scale=Math.min(104/(f.width||f.w),104/(f.bottom-f.top||f.h));
        c.drawImage(img,f.x,f.y,f.w,f.h,64-f.cx*scale,116-f.bottom*scale,f.w*scale,f.h*scale);
      }
    }
    const badge=img?portrait:element('span',line.name[0],'banter-portrait portrait-initial');
    badge.setAttribute('aria-hidden','true');
    bubble.append(element('strong',line.name),element('span',line.text));row.append(badge,bubble);return row;
  }
  function resultQuips(won){
    const group=element('div','','result-quips');group.setAttribute('aria-label','O que a turma tem a dizer');
    const opponent=won?run.defeatedBoss||run.boss:run.defeatedBy;
    for(const line of [S.quip(run,run.player,won),opponent&&S.quip(run,opponent,!won)])if(line)group.append(quipRow(line,true));
    for(const row of group.children)row.prepend(element('span',row.dataset.outcome==='win'?'VENCEU!':'REVANCHE?','result-stamp'));
    panel.querySelector('.route').before(group);
  }
  const heroDescription=id=>`Tiro: ${S.SHOTS[id].name}. ${S.HEROES[id].text}`;
  function startSurvival(seed=crypto.getRandomValues(new Uint32Array(1))[0]){
    if(!ready)return;victories=Math.max(victories,savedVictories());run=S.newRun(seed,Object.keys(S.ENEMIES).filter(id=>images.has(id)&&Object.keys(data[id].actions.walk).length===8&&Object.values(data[id].actions.walk).every(p=>p.frames.length>1)),selectedSkin,victories,selectedStyle);screenKey='';accumulator=0;clearInput();sync();canvas.focus();
  }
  function wardrobe(){
    const box=element('div','','survival-wardrobe'),label=element('label','Quem vai defender a fazenda?'),select=document.createElement('select'),description=element('p','','subtle');
    select.id='survivalSkin';label.htmlFor=select.id;description.id='heroDescription';select.setAttribute('aria-describedby',description.id);
    for(const skin of SkinSystem.catalog){const option=element('option',`${skin.name} · ${S.HEROES[skin.id].name}${SkinSystem.unlocked(skin.id)?'':' · bloqueado'}`);option.value=skin.id;option.disabled=!SkinSystem.unlocked(skin.id);select.append(option);}
    select.value=selectedSkin;
    select.onchange=()=>{selectedSkin=select.value;description.textContent=heroDescription(selectedSkin);};select.onchange();
    const modeLabel=element('label','Tipo de Revoada'),mode=document.createElement('select'),modeText=element('p','','subtle');
    mode.id='survivalStyle';modeLabel.htmlFor=mode.id;modeText.id='styleDescription';mode.setAttribute('aria-describedby',modeText.id);
    for(const [id,config] of Object.entries(S.STYLES)){const option=element('option',`${config.name} · chefe em ${config.seconds}s`);option.value=id;mode.append(option);}
    mode.value=selectedStyle;mode.onchange=()=>{selectedStyle=mode.value;modeText.textContent=S.STYLES[selectedStyle].text;};mode.onchange();
    box.append(label,select,description,modeLabel,mode,modeText);panel.querySelector('.panel-actions').before(box);
  }
  function intro(){screenKey='intro';modal(`<span class="eyebrow">UMA CORRIDA. UM BARALHO DIFERENTE.</span><h1 id="panelTitle">As penas mudam.<br>A coragem fica.</h1><p>10 fases procedurais: oito resgates, Panto na 5ª e Baltazar na 10ª. Antes de cada etapa, escolha uma entre três habilidades sorteadas.</p><div class="route"><span><b>01–04</b>Explorar</span><span><b>05</b>Panto</span><span><b>06–09</b>Avançar</span><span><b>10</b>Baltazar</span></div><p class="subtle">Este é um protótipo separado: não altera sua aventura, personagens desbloqueados ou progresso do jogo original.</p><div class="panel-actions"><button id="startRun" class="primary" disabled>Carregando os bichos…</button>${checkpoint?'<button id="continueRun" disabled>Continuar campanha</button>':''}</div><p id="loading" class="subtle" role="status">Preparando os sprites já usados no jogo.</p><a class="back" href="../index.html">Voltar à aventura original</a>`);
    const survivalButton=element('button','Sobrevivência · hordas e poderes','primary');survivalButton.id='startSurvival';survivalButton.disabled=!ready;
    panel.querySelector('.panel-actions').prepend(survivalButton);survivalButton.onclick=()=>startSurvival();
    panel.querySelector('.eyebrow').textContent=`30 HABILIDADES. ${S.STAGES.length} FASES. SEGREDOS NA FAZENDA.`;
    panel.querySelector('p').textContent=`Derrote inimigos e colete cristais de XP. A cada nível, escolha um entre três poderes; evolua suas habilidades e combine armas. São ${S.STAGES.length} arenas diferentes com chefes, hordas crescentes e selos de lendas secretas. Ou jogue a campanha de resgate.`;
    $('startRun').classList.remove('primary');
    $('startRun').onclick=()=>{if(!ready)return;run=E.newRun(crypto.getRandomValues(new Uint32Array(1))[0]);store(E.checkpoint(run));screenKey='';sync();};
    if($('continueRun'))$('continueRun').onclick=()=>{if(!ready)return;run=checkpoint;screenKey='';sync();};
    wardrobe();if(ready)loaded();
  }
  function loaded(){if(!$('startRun'))return;$('startRun').disabled=false;$('startRun').textContent='Campanha de resgate';
    $('startSurvival').disabled=false;
    if($('continueRun'))$('continueRun').disabled=false;
    $('loading').textContent=`Sobrevivência: ${S.STAGES.length} fases e chefes, sem checkpoint. `+(saveAvailable?'Campanha: salva no início de cada fase.':'Campanha sem acesso ao salvamento nesta aba.');
    if(autoSurvival){autoSurvival=false;startSurvival();}
  }
  function draft(){const stage=E.STAGES[run.stage];modal(`<span class="eyebrow">ETAPA ${run.stage+1} DE ${E.STAGES.length} · ESCOLHA 1 HABILIDADE</span><h2 id="panelTitle">${stage.name}</h2><p>${stage.subtitle} As habilidades escolhidas continuam nas próximas fases.</p><nav class="campaign" aria-label="Progresso das 10 fases">${E.STAGES.map((s,i)=>`<span class="${i<run.stage?'done':i===run.stage?'current':''} ${s.boss?'boss':''}" title="${s.name}" ${i===run.stage?'aria-current="step"':''}>${String(i+1).padStart(2,'0')}${s.boss?'<small>CHEFE</small>':''}</span>`).join('')}</nav><div id="cards" class="cards"></div><div class="panel-actions"><button id="reroll" ${run.rerolls?'':'disabled'}>${run.rerolls?'Embaralhar uma vez':'Embaralhamento usado'}</button></div><p class="subtle">O jogo fica pausado enquanto você escolhe. Entre fases, recupera ${E.stats(run).stageHealing} ${E.stats(run).stageHealing>1?'corações':'coração'}. Semente: ${run.seed}.</p>`);
    for(const id of run.choices){const card=E.SKILLS.find(s=>s.id===id),rank=(run.skills[id]||0)+1;
      const button=element('button','', 'card');button.type='button';button.dataset.skill=id;
      button.append(element('span',card.mark,'mark'),element('span',card.kind,'kind'),element('strong',card.name),
        element('span',card.text,'description'),element('span',`NÍVEL ${rank} / ${card.max}`,'rank'));
      button.onclick=()=>{if(!E.choose(run,id))return;store(E.checkpoint(run));screenKey='';clearInput();sync();AudioSystem.play('rescue',{volume:.55});canvas.focus();};$('cards').append(button);
    }
    $('reroll').onclick=()=>{if(E.reroll(run)){store(E.checkpoint(run));screenKey='';sync();AudioSystem.play('pop',{volume:.45});}};
  }
  function powerDraft(){
    const rewardLevel=run.level-run.pendingChoices+1;
    modal(`<span class="eyebrow">SUBIU DE NÍVEL · ${S.style(run).name.toUpperCase()}</span><h2 id="panelTitle">Nível ${rewardLevel}!</h2><p>Armas até 5: novas formas de atacar nos níveis 3 e 5. Apoios até 3. Escolha uma carta.</p><div class="build-slots">${S.slots(run,'Arma')} / 6 armas · ${S.slots(run,'Apoio')} / 6 apoios · fusões liberam espaço</div><div id="cards" class="cards"></div><div class="panel-actions"><button id="reroll" ${run.rerolls?'':'disabled'}>${run.rerolls?'Embaralhar uma vez':'Embaralhamento usado'}</button></div><p class="subtle">Combate pausado. ${run.pendingChoices>1?`Você ganhou mais ${run.pendingChoices-1} nível(is): escolha uma carta para cada um. `:''}Nível e poderes continuam nas próximas fases desta partida.</p>`);
    for(const id of run.choices){
      const card=S.POWERS[id],rank=(run.powers[id]||0)+1,button=element('button','','card power-card');
      button.type='button';button.dataset.skill=id;button.style.borderColor=card.color;
      button.append(powerIcon(id),element('span',`${S.powerKind(id)} · ${rank===1?'NOVA':rank===5?'MAESTRIA':rank===3&&S.maxRank(id)===5?'EVOLUÇÃO':'MELHORIA'}`,'kind'),element('strong',card.name));
      if(rank>1)button.append(element('span',`Agora · ${S.powerText(id,rank-1)}`,'power-before'));
      button.append(element('span',`${rank>1?'Depois · ':''}${S.powerText(id,rank)}`,'description'),element('span',`NÍVEL ${rank-1} → ${rank} / ${S.maxRank(id)}`,'rank'));
      const progress=element('span','','rank-pips');progress.setAttribute('aria-hidden','true');
      for(let i=1;i<=S.maxRank(id);i++)progress.append(element('i','',i<rank?'filled':i===rank?'next':''));button.append(progress);
      const recipe=Object.values(S.FUSIONS).find(f=>f.items.includes(id));
      if(recipe){const partner=recipe.items.find(item=>item!==id);button.append(element('span',`Fusão no nível 3: + ${S.POWERS[partner].name} (${run.powers[partner]||0}/${S.maxRank(partner)}) → ${recipe.name}`,'recipe-hint'));}
      button.onclick=()=>{if(!S.choose(run,id))return;screenKey='';clearInput();sync();if(run.phase==='playing')canvas.focus();};$('cards').append(button);
    }
    $('reroll').onclick=()=>{if(S.reroll(run)){screenKey='';sync();}};
  }
  function stageClear(){
    modal(`<span class="eyebrow">CHEFE VENCIDO · ${run.bossesDefeated} / ${S.STAGES.length}</span><h2 id="panelTitle">Essa roça é nossa!</h2><p>Próxima fase: ${S.STAGES[run.encounter+1].name}. ${S.STAGES[run.encounter+1].text} Seus poderes seguem com você e você recupera um coração.</p><div class="route">${S.STAGES.map((s,i)=>`<span><b>${i<=run.encounter?'✓':String(i+1).padStart(2,'0')}</b>${s.name}</span>`).join('')}</div><div class="panel-actions"><button id="nextStage" class="primary">Seguir para a próxima fase</button></div>`);
    resultQuips(true);
    $('nextStage').onclick=()=>{if(S.nextStage(run)){screenKey='';clearInput();sync();canvas.focus();}};
  }
  function end(){if(isSurvival()){survivalEnd();return;}const won=run.phase==='won';modal(`<span class="eyebrow">${won?'VALENTÃO SEM ALMOÇO':'A TURMA ESPERA A REVANCHE'}</span><h2 id="panelTitle">${won?'Deu galinha!':'Essa foi por pouco.'}</h2><p>${won?'Dez fases vencidas! Panto liberou a passagem e Baltazar ficou sem almoço.':'Teste outra combinação de habilidades e tente de novo.'}</p><div class="route"><span>${run.totalRescued} amigos resgatados</span><span>${run.bossesDefeated} / 2 chefes</span><span>Fase ${run.stage+1} / 10 · Nível ${run.level}</span><span>${Math.floor(run.elapsed/60)}min ${Math.floor(run.elapsed%60)}s</span></div><p id="endBuild"></p><div class="panel-actions"><button id="again" class="primary">Novo baralho</button><button id="same">Repetir mapas e cartas</button></div><a class="back" href="../index.html">Voltar à aventura original</a>`);
    resultQuips(won);
    $('endBuild').textContent=E.SKILLS.filter(s=>run.skills[s.id]).map(s=>`${s.name} ${run.skills[s.id]}`).join(' · ');
    const restart=seed=>{run=E.newRun(seed);store(E.checkpoint(run));screenKey='';sync();};
    $('again').onclick=()=>restart(crypto.getRandomValues(new Uint32Array(1))[0]);$('same').onclick=()=>restart(run.seed);
    try{localStorage.removeItem(SAVE_KEY);}catch{}
  }
  function survivalEnd(){
    const won=run.phase==='won';
    if(won&&!run.victoryRecorded&&run.bossesDefeated===S.STAGES.length){
      run.victoryRecorded=true;victories=Math.max(victories,savedVictories(),S.victories(run.victories+1));
      try{localStorage.setItem(DIFFICULTY_KEY,JSON.stringify(victories));}catch{saveAvailable=false;}
    }
    modal(`<span class="eyebrow">REVOADA DO CAOS</span><h2 id="panelTitle">${won?'A fazenda resistiu!':'Essa foi por pouco.'}</h2><p>${won?`${S.STAGES.length} chefes vencidos! A fazenda inteira pode respirar.`:'Embaralhe as cartas e tente uma nova combinação.'}</p><div class="route"><span>${run.score} pontos</span><span>${run.kills} inimigos afastados</span><span>${run.bossesDefeated} / ${S.STAGES.length} chefes · Nível ${run.level}</span><span>${Math.floor(run.elapsed/60)}min ${Math.floor(run.elapsed%60)}s</span></div><p id="endBuild"></p><div class="panel-actions"><button id="again" class="primary">Nova fazenda</button><button id="same">Repetir semente</button></div><p class="subtle">Semente ${run.seed} · Sem checkpoint nesta modalidade.</p><a class="back" href="../index.html">Voltar ao menu principal</a>`);
    resultQuips(won);
    panel.querySelector('.route').append(element('span',`${run.secretsDefeated.length} lendas secretas vencidas`));
    const escalation=element('p',won?`Revanche ${victories}: a próxima tentativa terá hordas mais resistentes, mais reforços e chefes mais agressivos.`:
      `Dificuldade: ${run.victories?`Revanche ${run.victories}`:'Estreia'}. Cada chefe vencido aumenta a pressão; perder não reduz a revanche.`,'subtle');
    panel.querySelector('.route').after(escalation);
    $('endBuild').textContent=[...run.fusions.map(id=>`${S.FUSIONS[id].name} ★`),...Object.entries(run.powers).filter(([id])=>!S.consumed(run,id)).map(([id,rank])=>`${S.POWERS[id].name} ${rank}/${S.maxRank(id)}`)].join(' · ');
    wardrobe();
    $('again').onclick=()=>startSurvival();$('same').onclick=()=>startSurvival(run.seed);
  }
  function pause(){if(!run||run.phase!=='playing')return;E.pause(run,!run.paused);clearInput();screenKey='';sync();if(!run.paused)canvas.focus();}
  let banterKey=null;
  function sync(dt=0){
    syncAudio(dt);
    if(!run)return;
    const state=run.phase+(run.paused?'-paused':'')+(run.phase.includes('draft')?run.choices.join()+':'+run.pendingChoices:'');
    if(state!==screenKey){screenKey=state;
      if(run.phase==='draft')draft();else if(run.phase==='power-draft')powerDraft();else if(run.phase==='stage-clear')stageClear();else if(['won','lost'].includes(run.phase))end();
      else if(run.paused){modal('<span class="eyebrow">UMA PAUSA PARA AS PENAS</span><h2 id="panelTitle">Respira, galinha.</h2><p>'+(isSurvival()?'A tentativa continua enquanto esta aba estiver aberta. Voltar ao menu ou recarregar encerra esta sobrevivência; não há checkpoint.':'Esta fase continua de onde você parou enquanto a aba estiver aberta. Ao recarregar, o checkpoint volta ao início da fase.')+'</p><div class="panel-actions"><button id="resume" class="primary">Continuar</button></div><a class="back" href="../index.html">Voltar à aventura original</a>');$('resume').onclick=pause;}
      else {overlay.hidden=true;$('pause').disabled=false;}
      if(run.paused&&isSurvival()){
        const detail=element('p',heroDescription(run.player.skin));panel.querySelector('.panel-actions').before(detail);
        const change=element('button','Bicho e tipo de partida · reiniciar');change.onclick=()=>{run=null;$('powerHud').hidden=true;$('fusionBook').hidden=true;intro();};panel.querySelector('.panel-actions').append(change);
      }
    }
    const s=E.STAGES[run.stage],p=run.player,stat=E.stats(run);
    $('stageLabel').textContent=`${run.stage+1} / ${E.STAGES.length} · ${s.name.toUpperCase()}`;
    $('objective').textContent=s.boss?(E.exitReady(run)?'Panto vencido · Vá à porteira!':run.boss?.mode==='stunned'?'Perto dele: E / Interagir!':'Desvie dos botes e espere a abertura.'):`${run.rescued} / ${s.friendCount} amigos${E.exitReady(run)?' · Porteira liberada':''}`;
    $('health').textContent=`${run.hp} / ${stat.maxHp} vidas${p?.shield?' · escudo':''}`;$('level').textContent=`Nível ${run.level}`;
    $('xpHud').hidden=!isSurvival();
    $('bossHud').hidden=!s.boss||run.phase!=='playing';if(run.boss){$('bossMeter').max=run.boss.maxCourage;$('bossMeter').value=run.boss.courage;$('bossName').textContent=`${run.boss.name.toUpperCase()} · ${run.boss.courage} / ${run.boss.maxCourage}`;}
    const message=run.phase==='playing'&&run.noticeTime>0?run.notice:'';
    if($('notice').textContent!==message)$('notice').textContent=message;
    $('combatQuip').hidden=!isSurvival()||run.phase!=='playing'||run.paused||!run.banter||run.elapsed>=run.banterUntil-1;
    if(!$('combatQuip').hidden&&banterKey!==run.banter){banterKey=run.banter;$('combatQuip').replaceChildren(quipRow(run.banter));}
    $('buildSummary').textContent=E.SKILLS.filter(s=>run.skills[s.id]).map(s=>`${s.name} ${run.skills[s.id]}`).join(' · ')||'Suas habilidades aparecem aqui.';
    $('dash').disabled=run.phase!=='playing'||run.paused||!p||p.dashCooldown>0;
    $('dash').querySelector('small').textContent=p?.dashCooldown>0?`${p.dashCooldown.toFixed(1)}s`:'Espaço';
    $('corn').disabled=run.phase!=='playing'||run.paused||!run.skills.corn||p.cornCooldown>0;
    $('corn').querySelector('small').textContent=!run.skills.corn?'Carta necessária':p?.cornCooldown>0?`${p.cornCooldown.toFixed(1)}s`:'Q';
    $('interact').disabled=isSurvival()?!S.canAwaken(run):run.phase!=='playing'||run.paused||!run.boss||run.boss.mode!=='stunned';
    $('interact').firstChild.nodeValue=isSurvival()?'Despertar ':'Interagir ';
    $('corn').hidden=isSurvival();$('interact').hidden=isSurvival()&&!S.canAwaken(run);
    $('powerHud').hidden=!isSurvival()||run.phase!=='playing'||run.paused;
    $('fusionBook').hidden=!isSurvival();$('fusionBook').disabled=run.phase!=='playing'||run.paused;
    if(isSurvival()){
      const available=Object.keys(S.FUSIONS).filter(id=>S.canFuse(run,id)).length;
      $('fusionBook').textContent=available?`Fusões (${available})`:'Fusões';$('fusionBook').classList.toggle('fusion-ready',available>0);
      const remaining=Math.max(0,Math.ceil(S.style(run).seconds-run.stageElapsed)),boss=run.enemies.find(e=>e.isBoss);
      $('stageLabel').textContent=`FASE ${run.encounter+1} / ${S.STAGES.length} · ${S.STAGES[run.encounter].name.toUpperCase()}${run.victories?` · REVANCHE ${run.victories}`:''}`;
      $('objective').textContent=`${S.style(run).name} · ${boss?(boss.isSecretBoss?'CHEFE SECRETO · BÔNUS':'VENÇA O CHEFE'):`Chefe em ${remaining}s`} · ${run.score} pontos · ${run.kills} afastados`;
      const needed=S.xpNeeded(run);
      $('level').textContent=`NÍVEL ${run.level}`;
      $('xpMeter').max=needed;$('xpMeter').value=run.xp;
      $('xpMeter').setAttribute('aria-valuetext',`${run.xp} de ${needed} XP. Próximo nível libera um poder.`);
      $('xpLabel').textContent=`${run.xp} / ${needed} XP · +1 poder`;
      $('bossHud').hidden=!boss||run.phase!=='playing';
      if(boss){$('bossMeter').max=boss.maxHealth;$('bossMeter').value=Math.max(0,boss.health);$('bossName').textContent=boss.name;}
      $('buildSummary').textContent=`${S.slots(run,'Arma')}/6 armas · ${S.slots(run,'Apoio')}/6 apoios · ${S.SHOTS[p.skin].name}`;
      const signature=p.skin+JSON.stringify(run.powers)+run.fusions.join();
      if(powerKey!==signature){
        powerKey=signature;$('powerHud').replaceChildren();
        const badge=element('span',`${CharacterArt.appearances[p.skin].name} · ${S.SHOTS[p.skin].name}`,'hero-power');badge.title=heroDescription(p.skin);badge.prepend(powerIcon(S.SHOTS[p.skin].visual));$('powerHud').append(badge);
        for(const id of run.fusions){const recipe=S.FUSIONS[id],chip=element('span',`${recipe.name} ★`,'fused-power');chip.title=recipe.text;chip.style.borderColor=recipe.color;chip.prepend(fusionIcon(id));$('powerHud').append(chip);}
        for(const [id,power] of Object.entries(S.POWERS))if(run.powers[id]&&!S.consumed(run,id)){
          const chip=element('span',`${power.name}: ${run.powers[id]}/${S.maxRank(id)}`);chip.title=S.powerText(id,run.powers[id]);chip.style.borderColor=power.color;chip.prepend(powerIcon(id));$('powerHud').append(chip);
        }
      }
    }
    document.querySelector('.brand small').textContent=isSurvival()?'SOBREVIVÊNCIA':'10 FASES';
    document.querySelector('.keyboard-hint strong').textContent=isSurvival()?'Colete XP. Suba de nível. Escolha poderes.':'Resgate. Escolha. Improvise.';
    document.querySelector('.keyboard-hint>span').textContent=isSurvival()?'WASD / setas · mover   Espaço · esquiva   E · despertar selo   Esc · pausa':'WASD / setas · mover   Espaço · esquiva   E · interagir   Q · isca';
    canvas.setAttribute('aria-label',isSurvival()?'Sobrevivência: WASD ou setas para mover, espaço para esquivar. Colete XP e escolha um poder por nível; ataques automáticos.':'Use WASD ou setas para mover, espaço para esquivar, Q para isca e E para interagir.');
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
  function sprite(actor,alpha=1){const appearance=actor.skin&&CharacterArt.appearances[actor.skin],id=appearance?.sprite||appearance?.species||actor.species,d=data[id],img=images.get(id);
    const bossScale=actor.isSecretBoss?1.8:actor.isBoss?1.45:1;
    if(!d||!img)return;
    // Locomotion shows direction and speed; reduced motion only suppresses decorative effects.
    const a=animation(actor),preparing=actor.mode==='warning',alarming=actor.species==='owl'&&preparing;
    const current=CharacterArt.frameFor(actor.species,{direction:a.direction,action:alarming?'alert':actor.species==='owl'&&actor.moving?'fly':undefined,
      mood:preparing&&!alarming?'angry':undefined,skin:actor.skin,anim:alarming?actor.age*7:a.anim,moving:actor.moving||alarming,sprinting:actor.dashTime>0||actor.mode==='charge'||a.speed>175});
    const f=current.frame;
    const idle=(d.actions.idle?.down||d.poses.down).frames[0],heights={chicken:51,rabbit:35,sheep:44,pig:46,cow:66,duck:40,dog:45};
    const scale=bossScale*(appearance?(heights[appearance.species]||51):(S.ENEMIES[actor.species]?.height||heights[actor.species]||46))/(idle.bottom-idle.top||64);
    ctx.save();ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=false;
    if(actor.hitFlash>0&&!reduced)ctx.filter='brightness(1.5)';
    const w=Math.round(f.w*scale),h=Math.round(f.h*scale);
    const flying=['owl','crow'].includes(id)||['fly','alert'].includes(current.action);
    const bottom=!flying&&f.grounding?f.grounding.bottom*h:f.bottom*scale;
    ctx.drawImage(img,f.x,f.y,f.w,f.h,Math.round(actor.x-f.cx*scale),Math.round(actor.y-bottom),w,h);ctx.restore();
    if(isSurvival()&&!actor.isBoss&&actor.species!=='cuca'&&actor.health>0&&actor.health<actor.maxHealth){
      const top=actor.y-(S.ENEMIES[actor.species]?.height||46)-9;ctx.fillStyle='#263c31';ctx.fillRect(actor.x-14,top,28,4);ctx.fillStyle='#edca84';ctx.fillRect(actor.x-13,top+1,26*actor.health/actor.maxHealth,2);
    }
    if((actor.isBoss||actor.species==='cuca')&&actor.maxHealth){
      const top=actor.y-S.ENEMIES[actor.species].height*(actor.isSecretBoss?1.8:actor.isBoss?1.45:1)-14;
      ctx.fillStyle='#263c31';ctx.fillRect(actor.x-27,top,54,6);
      ctx.fillStyle=S.ENEMIES[actor.species].color;ctx.fillRect(actor.x-26,top+1,52*Math.max(0,actor.health/actor.maxHealth),4);
      if(actor.mode!=='warning')label(actor.isSecretBoss?'LENDA SECRETA':actor.isBoss?'CHEFE':'CUCA',actor.x,top-9);
    }
  }
  function danger(){
    const warnings=[];
    ctx.save();
    for(const h of run.hazards)ShuffleFX.hazard(ctx,h,run.elapsed,reduced);
    for(const e of run.enemies)if(e.mode==='warning'){
      if(e.species==='owl'){
        ctx.strokeStyle='#ffe5a9';ctx.setLineDash([7,6]);ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,240,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
        warnings.push(['SIRENE · HORDA ACELERA!',e.x,e.y-65]);continue;
      }
      if(e.attack){
        const names={'fire-fan':'RAJADA DE FOGO!','hoof-ring':'FERRADURAS EM CHAMAS!','fire-gallop':'GALOPE · CUIDADO COM AS PEGADAS!',
          'fire-coil':'CERCO DE FOGO!','spell-fan':'FEITIÇO!','roots':'TRILHA DE RAÍZES!','brew':'POÇÃO NO CHÃO!',gust:'BUZINAÇO!',howl:'UIVO · REFORÇOS!',claw:'GARRADA!',dirt:'TERRA À VISTA!',pounce:'BOTE · SAIA PARA O LADO!'};
        if(e.attack==='fire-fan'||e.attack==='spell-fan'||e.attack==='fire-gallop'||['gust','claw','dirt'].includes(e.attack)){
          const spread=e.angles||[0],length=e.attack==='claw'?210:300;
          ctx.strokeStyle=S.ENEMIES[e.species].color+'60';ctx.lineWidth=e.attack==='fire-gallop'?e.r*2:3;
          for(const a of spread){const dx=e.aimX*Math.cos(a)-e.aimY*Math.sin(a),dy=e.aimX*Math.sin(a)+e.aimY*Math.cos(a);
            ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+dx*length,e.y+dy*length);ctx.stroke();}
        }
        warnings.push([names[e.attack]||'CUIDADO!',e.x,e.y-S.ENEMIES[e.species].height*(e.isSecretBoss?1.8:e.isBoss?1.45:1)-18]);continue;
      }
      const witch=e.species==='cuca'||e.isBoss&&e.species==='boitata',length=witch?260:255,color=S.ENEMIES[e.species].color;
      ctx.strokeStyle=color+'55';ctx.lineWidth=12;
      for(const angle of witch?(e.isBoss?[-.6,-.3,0,.3,.6]:[-.22,0,.22]):[]){
        const dx=e.aimX*Math.cos(angle)-e.aimY*Math.sin(angle),dy=e.aimX*Math.sin(angle)+e.aimY*Math.cos(angle);
        ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+dx*length,e.y+dy*length);ctx.stroke();
      }
      warnings.push([witch?'FEITIÇO!':e.species==='crow'?'RASANTE!':e.species==='amanda'?'EMBOSCADA!':'INVESTIDA!',e.x,e.y-(S.ENEMIES[e.species].height+12)]);
    }
    ctx.restore();
    return warnings;
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
    const palettes={orchard:['#729557','#c8ad7c'],corn:['#849b51','#ccb37d'],grove:['#537a58','#b8a47b'],
      field:['#819b57','#c1a776'],pond:['#6f9567','#baa477'],harvest:['#8d9c55','#c5a671'],
      quarry:['#7c8c75','#b8b098'],sunset:['#91945a','#bda072'],dusk:['#718157','#ae986d'],night:['#4b6b60','#99977a']};
    const [grass,road]=palettes[layout.theme]||palettes.orchard,nseed=layout.seed%999983;
    g.fillStyle=grass;g.fillRect(0,0,E.WIDTH,E.HEIGHT);
    // Broad quiet patches leave actors and hazards as the highest contrast shapes.
    for(let i=0;i<26;i++){
      const x=noise(i,11,nseed)*E.WIDTH,y=noise(i,47,nseed)*E.HEIGHT,r=40+noise(i,83,nseed)*85;
      g.fillStyle=i%3?'#b8cf8010':'#315c3b10';g.beginPath();
      g.moveTo(x-r,y);g.bezierCurveTo(x-r,y-r,x+r*.5,y-r*.7,x+r,y-r*.2);
      g.bezierCurveTo(x+r*1.2,y+r*.6,x-r*.8,y+r*.8,x-r,y);g.fill();
    }
    for(let i=0;i<180;i++){
      const x=noise(i,31,nseed)*E.WIDTH,y=noise(i,57,nseed)*E.HEIGHT;
      if(layout.roads.some(r=>roadDistance({x,y},r)<r.width/2+16))continue;
      g.fillStyle=i%3?'#b4cb7a38':'#3c6a4830';g.fillRect(Math.round(x),Math.round(y),2,4);g.fillRect(Math.round(x)+3,Math.round(y)+2,2,3);
    }
    g.lineCap='round';g.lineJoin='round';
    // Paint every verge before every interior: junctions never have pipe-like seams.
    for(const [extra,color] of [[6,'#456d4938'],[2,'#af9569'],[0,road]])for(const r of layout.roads){
      const length=Math.hypot(r.b.x-r.a.x,r.b.y-r.a.y),steps=Math.max(1,Math.ceil(length/26));
      const nx=-(r.b.y-r.a.y)/(length||1),ny=(r.b.x-r.a.x)/(length||1);
      g.strokeStyle=color;g.lineWidth=r.width*.78+extra;g.beginPath();g.moveTo(r.a.x,r.a.y);
      for(let i=1;i<=steps;i++){const offset=i===steps?0:(noise(i,r.a.x+r.a.y,nseed)-.5)*5;g.lineTo(r.a.x+(r.b.x-r.a.x)*i/steps+nx*offset,r.a.y+(r.b.y-r.a.y)*i/steps+ny*offset);}
      g.stroke();
    }
    for(const [index,r] of layout.roads.entries()){
      const dx=r.b.x-r.a.x,dy=r.b.y-r.a.y,length=Math.hypot(dx,dy)||1,nx=-dy/length,ny=dx/length;
      for(let i=0;i<length/65;i++){
        const t=noise(i,index+17,nseed),offset=(noise(i,index+64,nseed)-.5)*r.width;
        const x=r.a.x+dx*t+nx*offset,y=r.a.y+dy*t+ny*offset;
        g.fillStyle=i%3?'#ead4a420':'#92795120';g.fillRect(Math.round(x),Math.round(y),4+noise(i,index+93,nseed)*5,2);
      }
      for(let i=0;i<length/55;i++){
        const t=noise(i,index+24,nseed),side=i%2?1:-1,offset=(r.width*.39+7+noise(i,index+29,nseed)*6)*side;
        const x=r.a.x+dx*t+nx*offset,y=r.a.y+dy*t+ny*offset;
        if(layout.roads.some(other=>other!==r&&roadDistance({x,y},other)<other.width/2+8))continue;
        g.strokeStyle=i%3?'#6b874956':'#c4ce875c';g.lineWidth=1;
        g.beginPath();g.moveTo(x-3,y);g.lineTo(x-1,y-4);g.moveTo(x,y+1);g.lineTo(x+2,y-3);g.stroke();
      }
    }
    sceneryProps=layout.obstacles.map(o=>{
      const wooded=['grove','night','pond','dusk'].includes(layout.theme),variant=noise(o.x,o.y,71);
      const name=o.art|| (o.kind==='tree'?(wooded?(variant>.45?'willow':'tree'):(variant>.45?'pear':'tree')):o.kind==='hay'?(layout.theme==='corn'?'chaosCorn':'hay'):layout.theme==='quarry'?'chaosRock':variant>.45?'bramble':'harvest');
      const w=o.kind==='tree'?Math.max(82,Math.min(106,o.w*1.5)):o.w+6;
      return {name,x:o.x+o.w/2,y:o.y+o.h,w:o.kind==='landmark'?96:w,h:o.kind==='tree'?126:name==='chaosRock'?o.h+8:name==='chaosCorn'?78:o.kind==='landmark'?108:o.h+22,blocking:true};
    });
    // Low, nonblocking flowers occupy verges, away from routes and pickup objectives.
    for(let i=0;i<36;i++){
      const x=60+noise(i,97,nseed)*(E.WIDTH-120),y=70+noise(i,119,nseed)*(E.HEIGHT-130);
      if(layout.roads.some(r=>roadDistance({x,y},r)<r.width/2+26))continue;
      if(layout.obstacles.some(o=>x>o.x-25&&x<o.x+o.w+25&&y>o.y-25&&y<o.y+o.h+25))continue;
      if([layout.spawn,layout.exit,...layout.friends].some(p=>Math.hypot(x-p.x,y-p.y)<75))continue;
      const w=12+Math.floor(noise(i,121,nseed)*8);
      sceneryProps.push({name:i%3?'daisies':'lavender',x,y,w,h:w,blocking:false});
    }
    if(layout.theme==='night')for(const r of layout.roads)for(const p of [r.a,r.b]){
      const x=p.x+54,y=p.y;
      if(x>70&&x<E.WIDTH-70&&!sceneryProps.some(o=>Math.hypot(o.x-x,o.y-y)<75)&&layout.obstacles.every(o=>x<o.x-12||x>o.x+o.w+12||y<o.y-12||y>o.y+o.h+12))sceneryProps.push({name:'chaosLantern',x,y,w:38,h:72,blocking:false});
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
    if(p&&o.blocking&&p.y<o.y&&p.y>o.y-o.h&&Math.abs(p.x-o.x)<o.w/2+10)ctx.globalAlpha=.78;
    if(o.name.startsWith('chaos')){
      const sheet=images.get('chaosScenery'),cell={chaosCorn:0,chaosRock:64,chaosLantern:128}[o.name];
      ctx.imageSmoothingEnabled=false;ctx.drawImage(sheet,cell,0,64,96,o.x-o.w/2,o.y-o.h*88/96,o.w,o.h);
      if(o.name==='chaosLantern'){const glow=ctx.createRadialGradient(o.x,o.y-o.h*.55,0,o.x,o.y-o.h*.55,52);glow.addColorStop(0,'#ffd76c24');glow.addColorStop(1,'#ffd76c00');ctx.fillStyle=glow;ctx.fillRect(o.x-52,o.y-o.h*.55-52,104,104);}
    }else if(o.name==='stone'){
      ctx.save();ctx.translate(o.x,o.y);ctx.scale(o.w/16,o.h/12);
      ctx.fillStyle='#48564e';for(const [x,y,w,h]of [[-7,-2,14,2],[-8,-4,16,2],[-7,-7,14,3],[-5,-9,10,2],[-3,-10,6,1]])ctx.fillRect(x,y,w,h);
      ctx.fillStyle='#87917d';ctx.fillRect(-7,-4,14,2);ctx.fillRect(-6,-7,12,3);ctx.fillRect(-4,-9,8,2);
      ctx.fillStyle='#bac0a2';ctx.fillRect(-3,-9,5,1);ctx.fillRect(-5,-7,4,1);
      ctx.fillStyle='#647563';ctx.fillRect(2,-7,3,4);ctx.fillRect(4,-4,3,2);ctx.fillRect(-4,-3,2,1);ctx.restore();
    }else FarmSprites.draw(ctx,o.name,o.x-o.w/2,o.y-o.h,o.w,o.h,{shadow:false});ctx.restore();
  }
  function label(text,x,y,color='#fff2c4'){ctx.font='bold 12px FarmText, sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#243e2b';ctx.strokeText(text,x,y);ctx.fillStyle=color;ctx.fillText(text,x,y);}
  function legendSeal(a){
    const color=S.ENEMIES[a.species].color,img=images.get(a.species);
    const f=CharacterArt.frameFor(a.species,{direction:a.species==='mula-sem-cabeca'?'downleft':'down',moving:false}).frame;
    ctx.save();ctx.translate(Math.round(a.x),Math.round(a.y));
    // A framed portrait reuses the installed atlas, including each legend's anatomy.
    ctx.fillStyle='#263c35';ctx.beginPath();ctx.moveTo(-34,-54);ctx.lineTo(-25,-64);ctx.lineTo(25,-64);ctx.lineTo(34,-54);ctx.lineTo(34,4);ctx.lineTo(-34,4);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#ead19a';ctx.lineWidth=3;ctx.stroke();
    ctx.fillStyle='#46574a';ctx.fillRect(-28,-52,56,48);
    ctx.fillStyle=color;ctx.fillRect(-27,-51,2,45);ctx.fillRect(25,-51,2,45);
    const left=Math.floor(f.grounding.left*f.w),right=Math.ceil(f.grounding.right*f.w);
    const w=right-left,h=f.bottom-f.top,scale=Math.min(46/h,44/w);
    ctx.drawImage(img,f.x+left,f.y+f.top,w,h,-Math.round(w*scale/2),-51+Math.round((46-h*scale)/2),Math.round(w*scale),Math.round(h*scale));
    ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,-72);ctx.lineTo(6,-66);ctx.lineTo(0,-60);ctx.lineTo(-6,-66);ctx.closePath();ctx.fill();
    ctx.fillStyle='#263c35';ctx.fillRect(-39,3,78,10);
    ctx.fillStyle='#a99b73';ctx.fillRect(-36,3,72,4);ctx.fillStyle='#d4c59b';ctx.fillRect(-31,-1,62,4);
    if(!reduced)for(let i=0;i<3;i++){
      const t=(run.elapsed*.35+i/3)%1;ctx.globalAlpha=Math.sin(t*Math.PI)*.75;
      ctx.fillStyle=color;ctx.fillRect((i%2?1:-1)*(39+i*3),-8-t*47,3,3);
    }
    ctx.restore();
  }
  function pickup(item){ShuffleFX.loot(ctx,item,run.elapsed,reduced);}
  function resize(){const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);view.width=r.width;view.height=r.height;canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
  function render(){if(!view.width||!view.height)return;const stage=run?.stage||0,p=run?.player||{x:530,y:365};
    const scale=Math.min(1.45,Math.max(view.width/1120,view.height/720));view.scale=scale;
    const vw=view.width/scale,vh=view.height/scale;
    view.x=vw>=E.WIDTH?(E.WIDTH-vw)/2:Math.min(E.WIDTH-vw,Math.max(0,p.x-vw*.5));
    view.y=vh>=E.HEIGHT?(E.HEIGHT-vh)/2:Math.min(E.HEIGHT-vh,Math.max(0,p.y-vh*.52));
    if(isSurvival()){
      const topInset=run.enemies.some(e=>e.isBoss)?150:80;
      view.y=Math.min(Math.max(-topInset/scale,E.HEIGHT-vh+45/scale),Math.max(-topInset/scale,p.y-vh*.52));
    }
    ctx.imageSmoothingEnabled=false;ctx.fillStyle='#294330';ctx.fillRect(0,0,view.width,view.height);ctx.save();ctx.scale(scale,scale);ctx.translate(-view.x,-view.y);ctx.drawImage(background(run?.layout||previewMap),0,0);
    if(!run?.player){for(const prop of [...sceneryProps].sort((a,b)=>a.y-b.y))obstacle(prop);ctx.restore();return;}
    if(run.stage<9&&!isSurvival()){const gate=run.exit,open=E.exitReady(run);ctx.save();ctx.translate(gate.x,gate.y);if(gate.side%2)ctx.rotate(Math.PI/2);ctx.fillStyle=open?'#e3c77f':'#314f3b';ctx.fillRect(-17,-36,34,72);ctx.strokeStyle='#e9dab0';ctx.lineWidth=2;ctx.strokeRect(-20,-39,40,78);ctx.restore();label(open?'SAÍDA':run.boss?'VENÇA PANTO':`${run.friends.length} RESGATES`,gate.x,gate.y-51);}
    if(run.boss?.mode==='warning'||run.boss?.mode==='charge'){const b=run.boss;ctx.save();ctx.strokeStyle=b.mode==='warning'?'#ffce6288':'#f6835777';ctx.lineWidth=44;ctx.setLineDash(b.mode==='warning'?[12,10]:[]);ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x+b.aimX*(b.chargeSpeed+(b.id==='baltazar'&&b.courage<=2?30:0))*b.chargeSeconds,b.y+b.aimY*(b.chargeSpeed+(b.id==='baltazar'&&b.courage<=2?30:0))*b.chargeSeconds);ctx.stroke();ctx.restore();}
    if(run.decoy){ctx.fillStyle='#f1cf58';for(let i=0;i<9;i++)ctx.fillRect(run.decoy.x+(i%3)*6-8,run.decoy.y+Math.floor(i/3)*4-4,4,3);}
    if(isSurvival())for(const item of run.pickups){pickup(item);if(item.kind!=='xp'&&Math.hypot(item.x-p.x,item.y-p.y)<90)label(S.POWERS[item.kind]?.name||'Leite · +2 vidas',item.x,item.y-24);}
    const warnings=isSurvival()?danger():[];
    if(isSurvival())for(const field of run.fusionFields)ShuffleFX.field(ctx,field,run.elapsed,reduced);
    const altar=isSurvival()&&run.secretAltar;
    const sealed=altar?.discovered&&!altar.awakened&&!run.bossSpawned;
    const drawables=sceneryProps.map(o=>({y:o.y,draw:()=>obstacle(o)}));
    if(sealed)drawables.push({y:altar.y,draw:()=>legendSeal(altar)});
    for(const a of [...run.friends.filter(f=>!f.rescued),...run.enemies,...(run.boss?[run.boss]:[]),run.player])drawables.push({y:a.y,draw:()=>sprite(a,a===run.player&&a.invulnerable>0&&Math.floor(run.elapsed*10)%2?.5:1)});
    drawables.sort((a,b)=>a.y-b.y).forEach(d=>d.draw());
    for(const [text,x,y]of warnings)label(text,x,y);
    if(sealed&&Math.hypot(altar.x-p.x,altar.y-p.y)<190){
      const x=Math.max(view.x+78,Math.min(view.x+view.width/view.scale-78,altar.x));
      label(S.ENEMIES[altar.species].name.toLocaleUpperCase('pt-BR'),x,altar.y+28);
      const awake=S.canAwaken(run),prompt=awake?(touchControls?'DESPERTAR':'DESPERTAR · E'):'APROXIME-SE';
      ctx.save();ctx.font='bold 11px FarmText, sans-serif';ctx.textAlign='center';
      const w=ctx.measureText(prompt).width+20;ctx.fillStyle=awake?'#f4d494':'#263c35';ctx.fillRect(x-w/2,altar.y+34,w,19);
      ctx.fillStyle=awake?'#263c35':'#e0d9bd';ctx.fillText(prompt,x,altar.y+47);ctx.restore();
    }
    if(isSurvival()){
      for(const hex of run.hexes)ShuffleFX.enemyShot(ctx,hex,run.elapsed,reduced);
      for(const shot of run.shots)ShuffleFX.projectile(ctx,shot,run.elapsed,reduced);
      for(const mine of run.mines){ctx.save();ctx.globalAlpha=mine.arm>0?.6:1;ShuffleFX.icon(ctx,'carrot',mine.x,mine.y-8,30);ctx.restore();}
      for(const claw of S.orbits(run)){
        if(run.fusions.includes('fortress'))ShuffleFX.fusionIcon(ctx,{...S.FUSIONS.fortress,fusion:'fortress'},claw.x,claw.y-10,40);
        else ShuffleFX.icon(ctx,'claw',claw.x,claw.y-10,28,reduced?0:run.elapsed*3);
      }
      if(p.skin==='robocop')for(const claw of S.claws(run)){ctx.strokeStyle=S.HEROES.robocop.color;ctx.lineWidth=3;for(let i=-1;i<=1;i++){ctx.beginPath();ctx.arc(claw.x+i*5,claw.y,9,-1,1);ctx.stroke();}}
      for(const effect of run.effects)if(['hero','sickle','impact','collect','fusion'].includes(effect.kind))ShuffleFX.effect(ctx,effect,reduced);
    }
    for(const f of run.friends)if(!f.rescued&&Math.hypot(f.x-p.x,f.y-p.y)<180)label(f.name,f.x,f.y-57);
    if(p.shield)ShuffleFX.icon(ctx,'shield',p.x+20,p.y-48,24);
    if(run.boss?.mode==='stunned'){const b=run.boss;label('TONTO · E',b.x,b.y-78);for(let i=0;i<3;i++){const a=i*2.1+(reduced?0:run.elapsed*3);ctx.fillStyle='#ffd16b';ctx.fillRect(b.x+Math.cos(a)*22-3,b.y-64+Math.sin(a)*5,5,5);}}
    if(!reduced)for(const effect of run.effects.filter(e=>!['hero','sickle','impact','collect','fusion'].includes(e.kind))){const t=1-effect.time/.55;ctx.fillStyle=effect.kind==='hurt'?'#e79071':'#f8deb0';ctx.globalAlpha=1-t;for(let i=0;i<7;i++){const a=i*Math.PI*2/7;ctx.fillRect(effect.x+Math.cos(a)*t*32,effect.y-12+Math.sin(a)*t*26,3,3);}ctx.globalAlpha=1;}
    ctx.restore();
    // A small map and an edge marker keep goals discoverable on portrait phones.
    ctx.save();const mw=102,mh=66,mx=isSurvival()&&(p.x-view.x)*scale>view.width*.65?12:view.width-mw-12,my=Math.min(view.height-mh-8,run.boss||run.enemies.some(e=>e.isBoss)?164:isSurvival()?110:82);ctx.fillStyle='#183b2dd9';ctx.fillRect(mx-4,my-4,mw+8,mh+8);ctx.fillStyle='#819353';ctx.fillRect(mx,my,mw,mh);
    const dot=(x,y,c,r=2)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(mx+x/E.WIDTH*mw,my+y/E.HEIGHT*mh,r,0,Math.PI*2);ctx.fill();};
    for(const f of run.friends)if(!f.rescued)dot(f.x,f.y,'#fce2a1',3);for(const e of run.enemies)dot(e.x,e.y,e.isBoss?'#ffdf65':'#ec9d72',e.isBoss?4:2);if(run.boss)dot(run.boss.x,run.boss.y,'#ec9d72',3);dot(p.x,p.y,'#fff9e0',3);
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
  const stop=()=>{audioSuspended=true;clearInput();if(run?.phase==='playing'&&!run.paused){E.pause(run,true);screenKey='';sync();}else syncAudio();};
  window.addEventListener('focus',()=>{audioSuspended=false;syncAudio();});
  window.addEventListener('blur',stop);window.addEventListener('pagehide',()=>{stop();AudioSystem.pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  for(const event of ['pointerdown','keydown','click'])document.addEventListener(event,unlockAudio,{capture:true});
  $('audioMute').onclick=()=>{
    audioSuspended=false;
    const status=AudioSystem.status;
    if(AudioSystem.settings.muted||status.unlocked&&!status.blocked&&!status.failedClips.length)AudioSystem.toggleMute();
    if(!AudioSystem.settings.muted)AudioSystem.unlock();syncAudio();
  };
  $('fusionBook').onclick=fusionBook;
  $('pause').onclick=pause;$('dash').onclick=()=>{pending.dash=true;};$('corn').onclick=()=>{pending.corn=true;};$('interact').onclick=()=>{pending.interact=true;};
  const stick=$('joystick');function touch(e){const b=stick.getBoundingClientRect(),r=b.width*.35,dx=e.clientX-b.left-b.width/2,dy=e.clientY-b.top-b.height/2,len=Math.hypot(dx,dy),div=Math.max(r,len);joystick.x=dx/div;joystick.y=dy/div;$('knob').style.transform=`translate(${joystick.x*r}px,${joystick.y*r}px)`;}
  stick.addEventListener('pointerdown',e=>{if(!overlay.hidden||joystick.id!==null)return;joystick.id=e.pointerId;stick.setPointerCapture(e.pointerId);touch(e);e.preventDefault();});
  stick.addEventListener('pointermove',e=>{if(e.pointerId===joystick.id)touch(e);});
  const release=e=>{if(e.pointerId===joystick.id){joystick.id=null;joystick.x=0;joystick.y=0;$('knob').style.transform='none';}};
  for(const event of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(event,release);
  new ResizeObserver(resize).observe($('playfield'));
  function frame(now){let elapsed=Math.min(.1,(now-last)/1000||0);last=now;accumulator+=elapsed;
    if(run){const before=run.phase;const i=input();if(pending.dash)E.dash(run,i.x,i.y);if(pending.corn)E.decoy(run);if(pending.interact)(isSurvival()?S.awaken:E.interact)(run);pending={};
      while(accumulator>=1/60){const active=run.phase==='playing'&&!run.paused;(isSurvival()?S:E).tick(run,1/60,i);if(active)animate(1/60);accumulator-=1/60;}
      if(before==='playing'&&run.phase==='draft')store(E.checkpoint(run));sync(elapsed);
    }else {accumulator=0;syncAudio();}render();requestAnimationFrame(frame);}
  intro();resize();requestAnimationFrame(frame);
  const required=[...new Set(['chicken','wolf','goose','fox','sheep','pig','rabbit','cow','duck','dog',...Object.values(CharacterArt.appearances).map(a=>a.sprite||a.species),...Object.keys(S.ENEMIES).filter(id=>data[id])])];
  const poses=Object.values(ShuffleResultArt).flatMap(pair=>Object.values(pair));
  const sources=[['shuffleItems','assets/shuffle/items-pixel.png?v=1'],['chaosPowers','assets/shuffle/chaos-powers.png?v=1'],['chaosCatalog','assets/shuffle/power-catalog.png?v=1'],['chaosScenery','assets/shuffle/chaos-scenery.png?v=1'],...poses.map(source=>[source,source]),...required.map(id=>[id,data[id]?.source]),['fencePost','assets/farm/fence-post.png'],['fenceHorizontal','assets/farm/fence-rail-h.png'],['fenceVertical','assets/farm/fence-rail-v.png']];
  Promise.all([FarmSprites.loadCohesive().then(ok=>{if(!ok)throw Error('Não carregou o atlas da fazenda.');}),...sources.map(([id,source])=>new Promise((resolve,reject)=>{if(!source)return reject(Error(`Faltou o atlas de ${id}.`));const img=new Image(),timer=setTimeout(()=>reject(Error('O carregamento demorou demais.')),20000);img.onload=()=>{clearTimeout(timer);images.set(id,img);resolve();};img.onerror=()=>{clearTimeout(timer);reject(Error(`Não carregou: ${id}.`));};img.src='../'+source.replace(/^\.\//,'');}))])
    .then(()=>{ShuffleFX.setItemSheet(images.get('shuffleItems'));ShuffleFX.setPowerSheet(images.get('chaosPowers'));ShuffleFX.setCatalogSheet(images.get('chaosCatalog'),[...Object.keys(S.POWERS),'milk','xp',...Object.keys(S.FUSIONS).map(id=>'fusion-'+id)]);ready=true;loaded();}).catch(error=>{if($('loading'))$('loading').textContent=`${error.message} Recarregue a página ou volte ao jogo original.`;console.error(error);});
  // Debug handles for deterministic browser tests; isolated from classic state.
  window.ShuffleDemo=Object.freeze({get run(){return run;},get ready(){return ready;},get saveKey(){return SAVE_KEY;}});
})();
