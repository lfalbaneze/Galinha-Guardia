/* Accessible ability choices; the simulation stops, not just the drawing. */
const ExpeditionUI=(()=>{
  let root,dialog,choices,status,reroll,game,lastSignature='',padHeld=true,padDirection=0;
  function initialize(){
    if(root||typeof document.createElement!=='function')return;
    const home=document.getElementById('menuHome'),stage=document.getElementById('gameStage');
    if(!home||!stage)return;
    const css=document.createElement('link');css.rel='stylesheet';css.href='./systems/expedition.css?v=1';document.head.append(css);
    const mode=document.createElement('a');mode.id='expeditionModeLink';
    const url=new URL(window.location.href);
    if(ExpeditionSystem.enabled())url.searchParams.delete('modo');else url.searchParams.set('modo','expedicao');
    mode.href=url.href;mode.className='expedition-mode-link';
    mode.textContent=ExpeditionSystem.enabled()?'Voltar ao modo clássico':'Experimentar Expedição';
    mode.title='Três etapas, habilidades sorteadas e progresso separado do modo clássico.';
    home.append(mode);
    root=document.createElement('section');root.id='expeditionStatus';root.hidden=true;root.setAttribute('aria-label','Progresso da expedição');stage.append(root);
    dialog=document.createElement('dialog');dialog.id='expeditionDraft';dialog.setAttribute('aria-labelledby','expeditionTitle');
    dialog.innerHTML='<div class="expedition-sheet"><p class="expedition-kicker" id="expeditionChapter"></p><h2 id="expeditionTitle">Um truque na manga. Ou na asa.</h2><p class="expedition-lead">Escolha uma habilidade para esta expedição.</p><div id="expeditionChoices"></div><div class="expedition-draft-footer"><button type="button" id="expeditionReroll">Embaralhar · 1 chance</button><button type="button" id="expeditionPause">Pausar</button><p>O jogo está pausado enquanto você escolhe.</p></div></div>';
    document.body.append(dialog);choices=dialog.querySelector('#expeditionChoices');reroll=dialog.querySelector('#expeditionReroll');
    reroll.addEventListener('click',()=>{if(game&&ExpeditionSystem.reroll(game)){GameManager.save(game);lastSignature='';sync(game);choices.querySelector('button')?.focus();}});
    const pause=()=>{if(!game)return;GameInput.clear();if(dialog.open)dialog.close();GameUI.showMenu(game);sync(game);};
    dialog.querySelector('#expeditionPause').addEventListener('click',pause);
    dialog.addEventListener('cancel',event=>{event.preventDefault();pause();});
    dialog.addEventListener('keydown',event=>{
      const buttons=[...choices.querySelectorAll('button')];
      if(['1','2','3'].includes(event.key)&&!event.repeat){event.preventDefault();buttons[Number(event.key)-1]?.click();}
      if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'].includes(event.key)){
        event.preventDefault();const index=Math.max(0,buttons.indexOf(document.activeElement));
        buttons[(index+(['ArrowRight','ArrowDown'].includes(event.key)?1:buttons.length-1))%buttons.length]?.focus();
      }
    });
  }
  function sync(current){
    game=current;initialize();if(!root)return;
    const run=game.expedition,show=game.phase==='playing'&&!!run;
    root.hidden=!show;
    const signature=run?`${game.phase}:${game.rescuedCount}:${run.owned.join(',')}:${run.offered.join(',')}:${run.rerolls}:${run.shield}`:game.phase;
    const shouldOpen=ExpeditionSystem.pending(game);
    if(!shouldOpen&&dialog.open){dialog.close();GameInput.clear();lastSignature='';}
    if(signature!==lastSignature){
      lastSignature=signature;
      if(run){
        const chapter=ExpeditionSystem.chapter(game);
        root.textContent='';
        const title=document.createElement('strong');title.textContent=`EXPEDIÇÃO · ETAPA ${chapter+1}/3`;
        const detail=document.createElement('span');detail.textContent=`${ExpeditionSystem.chapters[chapter]} · ${game.rescuedCount}/${(chapter+1)*4} resgates`;
        const skills=document.createElement('small');skills.textContent=run.owned.map(id=>ExpeditionSystem.cards[id].name+(id==='casca'&&!run.shield?' (usada)':'')).join(' · ')||'Escolha seu primeiro truque';
        root.append(title,detail,skills);
        if(shouldOpen){
          dialog.querySelector('#expeditionChapter').textContent=`ETAPA ${chapter+1} / 3 · ${ExpeditionSystem.chapters[chapter]}`;
          choices.replaceChildren();
          run.offered.forEach((id,index)=>{
            const card=ExpeditionSystem.cards[id],button=document.createElement('button');button.type='button';button.dataset.ability=id;
            const number=document.createElement('span');number.className='expedition-card-number';number.textContent=`0${index+1}`;
            const kind=document.createElement('small');kind.textContent=card.kind;
            const name=document.createElement('strong');name.textContent=card.name;
            const text=document.createElement('span');text.className='expedition-card-effect';text.textContent=card.description;
            const flavor=document.createElement('em');flavor.textContent=card.flavor;
            button.append(number,kind,name,text,flavor);
            button.addEventListener('click',()=>{
              if(!ExpeditionSystem.choose(game,id))return;
              GameInput.clear();GameManager.save(game);refreshHud();sync(game);document.getElementById('gameCanvas')?.focus();
            });choices.append(button);
          });
          reroll.disabled=run.rerolls===0;reroll.textContent=run.rerolls?'Embaralhar · 1 chance':'Embaralhamento usado';
        }
      }
    }
    if(shouldOpen&&!dialog.open){
      GameInput.clear();dialog.showModal();padHeld=true;padDirection=0;choices.querySelector('button')?.focus();
    }
  }
  function gate(current){
    if(ExpeditionSystem.ensureDraft(current)){
      if(!dialog?.open)GameManager.save(current);
      if(typeof GameInput!=='undefined')GameInput.clear();
      sync(current);return true;
    }
    sync(current);return false;
  }
  function blocking(current){return ExpeditionSystem.pending(current);}
  function poll(current){
    sync(current);
    const pad=typeof navigator!=='undefined'&&navigator.getGamepads?.()?.find(p=>p?.connected);
    if(!pad){padHeld=false;return;}
    const confirm=!!pad.buttons[0]?.pressed,pause=!!pad.buttons[1]?.pressed||!!pad.buttons[9]?.pressed;
    const direction=(pad.buttons[15]?.pressed||pad.buttons[13]?.pressed||(pad.axes[0]||0)>.55||(pad.axes[1]||0)>.55)?1:
      (pad.buttons[14]?.pressed||pad.buttons[12]?.pressed||(pad.axes[0]||0)<-.55||(pad.axes[1]||0)<-.55)?-1:0;
    if(direction&&direction!==padDirection&&choices){
      const buttons=[...choices.querySelectorAll('button')],index=Math.max(0,buttons.indexOf(document.activeElement));
      buttons[(index+direction+buttons.length)%buttons.length]?.focus();
    }
    if(!padHeld&&pause)dialog?.querySelector('#expeditionPause').click();
    else if(!padHeld&&confirm&&dialog?.contains(document.activeElement))document.activeElement.click();
    padHeld=confirm||pause;padDirection=direction;
  }
  return {initialize,sync,gate,blocking,poll};
})();
