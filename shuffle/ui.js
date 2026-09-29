/* Browser adapter for the isolated prototype. Uses only existing reviewed atlases. */
(() => {
  'use strict';
  const E=ShuffleRun, SAVE_KEY='penas-pro-ar.shuffle.v2';
  const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
  const panel=$('panel'),overlay=$('overlay'),keys=new Set(),images=new Map();
  const data=typeof PixelLabArtData==='undefined'?{}:PixelLabArtData;
  let run=null,ready=false,view={width:1,height:1,scale:1,x:0,y:0},screenKey='',last=0,accumulator=0;
  let checkpoint=null,saveAvailable=true,joystick={x:0,y:0,id:null},pending={};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store=payload=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(payload));}catch{saveAvailable=false;}};
  try {checkpoint=E.restore(JSON.parse(localStorage.getItem(SAVE_KEY)||'null'));}catch {saveAvailable=false;}
  function clearInput(){keys.clear();joystick.x=0;joystick.y=0;const id=joystick.id;joystick.id=null;const pad=$('joystick');if(id!==null&&pad.hasPointerCapture(id))pad.releasePointerCapture(id);pending={};$('knob').style.transform='none';}
  function modal(html){clearInput();panel.innerHTML=html;overlay.hidden=false;$('pause').disabled=true;for(const id of ['dash','corn','interact'])$(id).disabled=true;
    requestAnimationFrame(()=>{(panel.querySelector('button:not(:disabled)')||panel).focus();});}
  function element(tag,text,cls){const node=document.createElement(tag);node.textContent=text;if(cls)node.className=cls;return node;}
  function intro(){screenKey='intro';modal(`<span class="eyebrow">UMA CORRIDA. UM BARALHO DIFERENTE.</span><h1 id="panelTitle">As penas mudam.<br>A coragem fica.</h1><p>10 fases procedurais: oito resgates, Panto na 5ª e Baltazar na 10ª. Antes de cada etapa, escolha uma entre três habilidades sorteadas.</p><div class="route"><span><b>01–04</b>Explorar</span><span><b>05</b>Panto</span><span><b>06–09</b>Avançar</span><span><b>10</b>Baltazar</span></div><p class="subtle">Este é um protótipo separado: não altera sua aventura, personagens desbloqueados ou progresso do jogo original.</p><div class="panel-actions"><button id="startRun" class="primary" disabled>Carregando os bichos…</button>${checkpoint?'<button id="continueRun" disabled>Continuar Shuffle</button>':''}</div><p id="loading" class="subtle" role="status">Preparando os sprites já usados no jogo.</p><a class="back" href="../index.html">Voltar à aventura original</a>`);
    $('startRun').onclick=()=>{if(!ready)return;run=E.newRun(crypto.getRandomValues(new Uint32Array(1))[0]);store(E.checkpoint(run));screenKey='';sync();};
    if($('continueRun'))$('continueRun').onclick=()=>{if(!ready)return;run=checkpoint;screenKey='';sync();};
    if(ready)loaded();
  }
  function loaded(){if(!$('startRun'))return;$('startRun').disabled=false;$('startRun').textContent='Começar Shuffle';
    if($('continueRun'))$('continueRun').disabled=false;
    $('loading').textContent=saveAvailable?'Progresso salvo no início de cada fase.':'Sem acesso ao salvamento: esta tentativa fica somente aberta nesta aba.';
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
  function end(){const won=run.phase==='won';modal(`<span class="eyebrow">${won?'VALENTÃO SEM ALMOÇO':'A TURMA ESPERA A REVANCHE'}</span><h2 id="panelTitle">${won?'Deu galinha!':'Essa foi por pouco.'}</h2><p>${won?'Dez fases vencidas! Panto liberou a passagem e Baltazar ficou sem almoço.':'Teste outra combinação de habilidades e tente de novo.'}</p><div class="route"><span>${run.totalRescued} amigos resgatados</span><span>${run.bossesDefeated} / 2 chefes</span><span>Fase ${run.stage+1} / 10 · Nível ${run.level}</span><span>${Math.floor(run.elapsed/60)}min ${Math.floor(run.elapsed%60)}s</span></div><p id="endBuild"></p><div class="panel-actions"><button id="again" class="primary">Novo baralho</button><button id="same">Repetir mapas e cartas</button></div><a class="back" href="../index.html">Voltar à aventura original</a>`);
    $('endBuild').textContent=E.SKILLS.filter(s=>run.skills[s.id]).map(s=>`${s.name} ${run.skills[s.id]}`).join(' · ');
    const restart=seed=>{run=E.newRun(seed);store(E.checkpoint(run));screenKey='';sync();};
    $('again').onclick=()=>restart(crypto.getRandomValues(new Uint32Array(1))[0]);$('same').onclick=()=>restart(run.seed);
    try{localStorage.removeItem(SAVE_KEY);}catch{}
  }
  function pause(){if(!run||run.phase!=='playing')return;E.pause(run,!run.paused);clearInput();screenKey='';sync();if(!run.paused)canvas.focus();}
  function sync(){
    if(!run)return;
    const state=run.phase+(run.paused?'-paused':'')+(run.phase==='draft'?run.choices.join():'');
    if(state!==screenKey){screenKey=state;
      if(run.phase==='draft')draft();else if(['won','lost'].includes(run.phase))end();
      else if(run.paused){modal('<span class="eyebrow">UMA PAUSA PARA AS PENAS</span><h2 id="panelTitle">Respira, galinha.</h2><p>Esta fase continua de onde você parou enquanto a aba estiver aberta. Ao recarregar, o checkpoint volta ao início da fase.</p><div class="panel-actions"><button id="resume" class="primary">Continuar</button></div><a class="back" href="../index.html">Voltar à aventura original</a>');$('resume').onclick=pause;}
      else {overlay.hidden=true;$('pause').disabled=false;}
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
  }
  const direction=a=>{if(!a)return'down';const names=['right','downright','down','downleft','left','upleft','up','upright'];return names[(Math.round(Math.atan2(a.dy,a.dx)/ (Math.PI/4))+8)%8];};
  function sprite(actor,alpha=1){const d=data[actor.species],img=images.get(actor.species);if(!d||!img)return;
    const dir=direction(actor),poses=actor.moving&&!reduced?d.actions.walk:d.actions.idle||d.poses;
    const pose=poses[dir]||poses.down;const frames=pose.frames;
    const f=frames[actor.moving&&!reduced?Math.floor(actor.traveled/58*frames.length)%frames.length:0];
    const idle=(d.actions.idle?.down||d.poses.down).frames[0],heights={chicken:51,wolf:61,goose:62,fox:43,rabbit:35,sheep:44,pig:46,cow:66,duck:40,dog:45};
    const scale=(heights[actor.species]||46)/(idle.bottom-idle.top||64);
    ctx.save();ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=false;
    ctx.drawImage(img,f.x,f.y,f.w,f.h,Math.round(actor.x-f.cx*scale),Math.round(actor.y-f.bottom*scale),Math.round(f.w*scale),Math.round(f.h*scale));ctx.restore();
  }
  const noise=(x,y,n=0)=>{let v=Math.imul(x+371,n+97)^Math.imul(y+73,1871);v^=v>>>13;return((v>>>0)%1000)/1000;};
  let ground=null,groundKey='';
  const previewMap=E.generateStage(321,0);
  function background(layout){
    if(ground&&groundKey===layout.id)return ground;groundKey=layout.id;
    ground=document.createElement('canvas');ground.width=E.WIDTH;ground.height=E.HEIGHT;const g=ground.getContext('2d');
    const palettes={orchard:['#72924f','#b49b62'],corn:['#8b9b4f','#bca568'],grove:['#53764b','#968158'],
      field:['#909c5c','#bea770'],pond:['#628f78','#bca777'],harvest:['#a99c52','#bf995d'],
      quarry:['#7d896c','#a8a28b'],sunset:['#8a8355','#bd9866'],dusk:['#63734f','#a38a60'],night:['#455f55','#858762']};
    const [grass,road]=palettes[layout.theme]||palettes.orchard,nseed=layout.seed%999983;
    g.fillStyle=grass;g.fillRect(0,0,E.WIDTH,E.HEIGHT);
    for(let y=0;y<E.HEIGHT;y+=8)for(let x=0;x<E.WIDTH;x+=9){const n=noise(x,y,nseed);g.fillStyle=n>.7?'#b6c98230':n<.22?'#1c453c30':'#a2b4621c';g.fillRect(x,y,3+Math.floor(n*8),3);}
    g.lineCap='round';g.lineJoin='round';
    for(const r of layout.roads){g.strokeStyle='#575b3944';g.lineWidth=r.width+8;g.beginPath();g.moveTo(r.a.x,r.a.y);g.lineTo(r.b.x,r.b.y);g.stroke();g.strokeStyle=road;g.lineWidth=r.width;g.stroke();}
    for(let i=0;i<320;i++){const x=noise(i,17,nseed)*E.WIDTH,y=noise(i,39,nseed)*E.HEIGHT;g.fillStyle=i%3?'#264e2d55':'#cfcb8066';g.fillRect(x,y,3,2);}
    g.fillStyle='#315d32';for(let x=16;x<E.WIDTH;x+=28){g.fillRect(x,12,22,13);g.fillRect(x,E.HEIGHT-24,22,13);}for(let y=35;y<E.HEIGHT-30;y+=28){g.fillRect(12,y,14,22);g.fillRect(E.WIDTH-24,y,14,22);}
    return ground;
  }
  function obstacle(o){const x=o.x,y=o.y;
    if(o.kind==='rock'){
      ctx.fillStyle='#4f5a52';ctx.fillRect(x,y-4,o.w,o.h+4);ctx.fillStyle='#818d7d';ctx.fillRect(x+5,y-10,o.w-10,o.h);
      ctx.fillStyle='#a1aa8e';ctx.fillRect(x+10,y-13,o.w-21,10);ctx.fillStyle='#667564';ctx.fillRect(x+o.w*.65,y+2,o.w*.2,o.h-6);return;
    }
    if(o.kind==='hay'){ctx.fillStyle='#5a482e';ctx.fillRect(x-3,y-21,o.w+6,o.h+22);ctx.fillStyle='#bd924a';ctx.fillRect(x,y-22,o.w,o.h+18);ctx.fillStyle='#e4bc68';ctx.fillRect(x+3,y-22,o.w-6,13);for(let i=8;i<o.w;i+=10){ctx.fillStyle='#a27a3b';ctx.fillRect(x+i,y-7,2,o.h+4);}ctx.fillStyle='#836137';ctx.fillRect(x+19,y-19,4,o.h+13);ctx.fillRect(x+o.w-22,y-19,4,o.h+13);return;}
    ctx.fillStyle='#6c482d';ctx.fillRect(x+o.w/2-10,y+o.h-20,20,25);
    for(let i=0;i<34;i++){const a=i*2.4,r=Math.sqrt(i/34)*o.w*.53,cx=x+o.w/2+Math.cos(a)*r,cy=y+o.h/2-22+Math.sin(a)*r*.8;ctx.fillStyle=['#355934','#476b36','#597f39','#719341'][i%4];ctx.fillRect(Math.round(cx-14),Math.round(cy-15),28,26);}
    ctx.fillStyle='#ce8438';for(let i=0;i<5;i++){const px=x+15+noise(i,7)*60,py=y-4+noise(i,9)*55;ctx.fillRect(px,py,6,7);}
  }
  function label(text,x,y,color='#fff2c4'){ctx.font='bold 12px FarmText, sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#243e2b';ctx.strokeText(text,x,y);ctx.fillStyle=color;ctx.fillText(text,x,y);}
  function resize(){const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);view.width=r.width;view.height=r.height;canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
  function render(){if(!view.width||!view.height)return;const stage=run?.stage||0,p=run?.player||{x:530,y:365};
    const scale=Math.min(1.45,Math.max(view.width/1120,view.height/720));view.scale=scale;
    const vw=view.width/scale,vh=view.height/scale;
    view.x=vw>=E.WIDTH?(E.WIDTH-vw)/2:Math.min(E.WIDTH-vw,Math.max(0,p.x-vw*.5));
    view.y=vh>=E.HEIGHT?(E.HEIGHT-vh)/2:Math.min(E.HEIGHT-vh,Math.max(0,p.y-vh*.52));
    ctx.clearRect(0,0,view.width,view.height);ctx.save();ctx.scale(scale,scale);ctx.translate(-view.x,-view.y);ctx.drawImage(background(run?.layout||previewMap),0,0);
    if(!run?.player){ctx.restore();return;}
    if(run.stage<9){const gate=run.exit,open=E.exitReady(run);ctx.save();ctx.translate(gate.x,gate.y);if(gate.side%2)ctx.rotate(Math.PI/2);ctx.fillStyle=open?'#e3c77f':'#314f3b';ctx.fillRect(-17,-36,34,72);ctx.strokeStyle='#e9dab0';ctx.lineWidth=2;ctx.strokeRect(-20,-39,40,78);ctx.restore();label(open?'SAÍDA':run.boss?'VENÇA PANTO':`${run.friends.length} RESGATES`,gate.x,gate.y-51);}
    if(run.boss?.mode==='warning'||run.boss?.mode==='charge'){const b=run.boss;ctx.save();ctx.strokeStyle=b.mode==='warning'?'#ffce6288':'#f6835777';ctx.lineWidth=44;ctx.setLineDash(b.mode==='warning'?[12,10]:[]);ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x+b.aimX*(b.chargeSpeed+(b.id==='baltazar'&&b.courage<=2?30:0))*b.chargeSeconds,b.y+b.aimY*(b.chargeSpeed+(b.id==='baltazar'&&b.courage<=2?30:0))*b.chargeSeconds);ctx.stroke();ctx.restore();}
    if(run.decoy){ctx.fillStyle='#f1cf58';for(let i=0;i<9;i++)ctx.fillRect(run.decoy.x+(i%3)*6-8,run.decoy.y+Math.floor(i/3)*4-4,4,3);}
    const drawables=run.obstacles.map(o=>({y:o.y+o.h,draw:()=>obstacle(o)}));
    for(const a of [...run.friends.filter(f=>!f.rescued),...run.enemies,...(run.boss?[run.boss]:[]),run.player])drawables.push({y:a.y,draw:()=>sprite(a,a===run.player&&a.invulnerable>0&&Math.floor(run.elapsed*10)%2?.5:1)});
    drawables.sort((a,b)=>a.y-b.y).forEach(d=>d.draw());
    for(const f of run.friends)if(!f.rescued&&Math.hypot(f.x-p.x,f.y-p.y)<180)label(f.name,f.x,f.y-57);
    if(p.shield){ctx.strokeStyle='#f4db7f';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y-27,31,Math.PI*1.05,Math.PI*1.96);ctx.stroke();}
    if(run.boss?.mode==='stunned'){const b=run.boss;label('TONTO · E',b.x,b.y-78);for(let i=0;i<3;i++){const a=i*2.1+(reduced?0:run.elapsed*3);ctx.fillStyle='#ffd16b';ctx.fillRect(b.x+Math.cos(a)*22-3,b.y-64+Math.sin(a)*5,5,5);}}
    if(!reduced)for(const effect of run.effects){const t=1-effect.time/.55;ctx.fillStyle=effect.kind==='hurt'?'#e79071':'#f8deb0';ctx.globalAlpha=1-t;for(let i=0;i<7;i++){const a=i*Math.PI*2/7;ctx.fillRect(effect.x+Math.cos(a)*t*32,effect.y-12+Math.sin(a)*t*26,3,3);}ctx.globalAlpha=1;}
    ctx.restore();
    // A small map and an edge marker keep goals discoverable on portrait phones.
    ctx.save();const mw=102,mh=66,mx=view.width-mw-12,my=run.boss?128:82;ctx.fillStyle='#183b2dd9';ctx.fillRect(mx-4,my-4,mw+8,mh+8);ctx.fillStyle='#819353';ctx.fillRect(mx,my,mw,mh);
    const dot=(x,y,c,r=2)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(mx+x/E.WIDTH*mw,my+y/E.HEIGHT*mh,r,0,Math.PI*2);ctx.fill();};
    for(const f of run.friends)if(!f.rescued)dot(f.x,f.y,'#fce2a1',3);for(const e of run.enemies)dot(e.x,e.y,'#ec9d72');if(run.boss)dot(run.boss.x,run.boss.y,'#ec9d72',3);dot(p.x,p.y,'#fff9e0',3);
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
    if(!overlay.hidden){if(e.key==='Tab'){const items=[...panel.querySelectorAll('button:not(:disabled),a')];if(items.length){const i=items.indexOf(document.activeElement);if((e.shiftKey&&i<=0)||(!e.shiftKey&&i===items.length-1)){e.preventDefault();items[e.shiftKey?items.length-1:0].focus();}}}if(e.code==='Escape'&&run?.paused){e.preventDefault();pause();}return;}
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
      while(accumulator>=1/60){E.tick(run,1/60,i);accumulator-=1/60;}
      if(before==='playing'&&run.phase==='draft')store(E.checkpoint(run));sync();
    }else accumulator=0;render();requestAnimationFrame(frame);}
  intro();resize();requestAnimationFrame(frame);
  const required=['chicken','wolf','goose','fox','sheep','pig','rabbit','cow','duck','dog'];
  Promise.all(required.map(id=>new Promise((resolve,reject)=>{const d=data[id];if(!d?.source)return reject(Error(`Faltou o atlas de ${id}.`));const img=new Image(),timer=setTimeout(()=>reject(Error('O carregamento demorou demais.')),20000);img.onload=()=>{clearTimeout(timer);images.set(id,img);resolve();};img.onerror=()=>{clearTimeout(timer);reject(Error(`Não carregou: ${id}.`));};img.src='../'+d.source.replace(/^\.\//,'');})))
    .then(()=>{ready=true;loaded();}).catch(error=>{if($('loading'))$('loading').textContent=`${error.message} Recarregue a página ou volte ao jogo original.`;console.error(error);});
  // Debug handles for deterministic browser tests; isolated from classic state.
  window.ShuffleDemo=Object.freeze({get run(){return run;},get ready(){return ready;},get saveKey(){return SAVE_KEY;}});
})();
