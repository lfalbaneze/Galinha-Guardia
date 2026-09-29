/* Optional, saved ability drafts. Cosmetic/menu changes never mutate a classic run. */
declare namespace Farm {
  type ExpeditionAbility = 'vento' | 'folego' | 'respiro' | 'mansinho' | 'casca' | 'lanche' | 'resgate' | 'sanguefrio';
  interface ExpeditionSave {
    version: 1; seed: number; owned: ExpeditionAbility[]; offered: ExpeditionAbility[];
    rerolls: number; shield: boolean;
  }
  interface GameState { expedition?: ExpeditionSave; }
  interface SaveData { expedition?: ExpeditionSave; }
}
const ExpeditionSystem = (() => {
  type Ability = Farm.ExpeditionAbility;
  const cards: Readonly<Record<Ability, Readonly<{name:string; kind:string; description:string; flavor:string}>>> = Object.freeze({
    vento: {name:'Penas ao vento',kind:'MOVIMENTO',description:'Movimente-se 10% mais rápido.',flavor:'Duas patas. Zero limite de velocidade.'},
    folego: {name:'Fôlego de maratona',kind:'CORRIDA',description:'Seu fôlego de corrida dura 35% mais.',flavor:'O lobo que peça uma pausa.'},
    respiro: {name:'Respira e vai',kind:'RECUPERAÇÃO',description:'Recupere o fôlego 40% mais rápido.',flavor:'Có… inspira. Có… expira.'},
    mansinho: {name:'Ninja de penas',kind:'FURTIVIDADE',description:'Ande de mansinho 25% mais rápido.',flavor:'Silenciosa. Até pisar no graveto.'},
    casca: {name:'Casca de respeito',kind:'DEFESA',description:'Bloqueie um golpe do lobo. Uso único nesta partida.',flavor:'Ovo frágil? Vai nessa, Baltazar.'},
    lanche: {name:'Milho de emergência',kind:'CUIDADO',description:'Recupere um coração agora, até o máximo de três.',flavor:'Primeiros socorros em forma de pipoca.'},
    resgate: {name:'Torcida do curral',kind:'RESGATE',description:'Cada amigo ou pintinho resgatado recupera 40% do fôlego.',flavor:'A turma grita. Você ganha um gás.'},
    sanguefrio: {name:'Penas de aço',kind:'DEFESA',description:'Ganhe mais 1 segundo de proteção após um golpe do lobo.',flavor:'Amassou o penteado. Não a coragem.'},
  });
  const ids = Object.keys(cards) as Ability[];
  const chapters = ['Abrindo a porteira', 'Correria na fazenda', 'Ninguém fica para trás'];
  function enabled(): boolean {
    return typeof window !== 'undefined' && /(?:^|[?&])modo=expedicao(?:&|$)/.test(window.location?.search || '');
  }
  function saveKey(): string { return enabled() ? 'galinha-guardia-expedition-v1' : 'galinha-guardia-save-v1'; }
  function initialize(game: Farm.GameState, active = enabled()): void {
    if (!active) { delete game.expedition; return; }
    game.expedition = {version:1,seed:((game.worldSeed >>> 0) ^ 0x5a17beef) >>> 0,owned:[],offered:[],rerolls:1,shield:false};
  }
  function chapter(game: Farm.GameState): number { return Math.min(2,Math.floor(Math.max(0,game.rescuedCount)/4)); }
  function has(game: Farm.GameState, id: Ability): boolean { return !!game.expedition?.owned.includes(id); }
  function random(run: Farm.ExpeditionSave): number {
    run.seed = (Math.imul(run.seed,1664525)+1013904223) >>> 0;
    return run.seed / 4294967296;
  }
  function pool(game: Farm.GameState): Ability[] {
    return ids.filter(id => !has(game,id) && (id !== 'lanche' || game.lives < 3));
  }
  function draw(game: Farm.GameState): void {
    const run = game.expedition!;
    const candidates = pool(game);
    for(let i=candidates.length-1;i>0;i--) {
      const j=Math.floor(random(run)*(i+1));
      [candidates[i],candidates[j]]=[candidates[j],candidates[i]];
    }
    run.offered=candidates.slice(0,3);
  }
  function canChoose(game: Farm.GameState): boolean {
    return !!game.expedition && game.phase === 'playing' && !game.lake?.active &&
      !(typeof ThorSystem !== 'undefined' && ThorSystem.active(game));
  }
  function ensureDraft(game: Farm.GameState): boolean {
    const run=game.expedition;
    if(!run || !canChoose(game) || game.rescuedCount>=12)return false;
    if(!run.offered.length && run.owned.length<chapter(game)+1) {
      run.rerolls=1; draw(game);
    }
    return run.offered.length>0;
  }
  function pending(game: Farm.GameState): boolean { return canChoose(game) && !!game.expedition?.offered.length; }
  function choose(game: Farm.GameState, id: string): boolean {
    const run=game.expedition;
    if(!run || !canChoose(game) || !run.offered.includes(id as Ability) || run.owned.includes(id as Ability) ||
      run.owned.length>=chapter(game)+1 || run.owned.length>=3)return false;
    run.owned.push(id as Ability);run.offered=[];
    if(id==='casca')run.shield=true;
    if(id==='lanche')game.lives=Math.min(3,game.lives+1);
    return true;
  }
  function reroll(game: Farm.GameState): boolean {
    const run=game.expedition;
    if(!run || !pending(game) || run.rerolls<=0)return false;
    const old=[...run.offered];run.rerolls--;draw(game);
    // A shuffle always reveals at least one different card when one is available.
    if(run.offered.every(id=>old.includes(id))) {
      const alternate=pool(game).find(id=>!old.includes(id));
      if(alternate)run.offered[run.offered.length-1]=alternate;
    }
    return true;
  }
  function modifiers(game: Farm.GameState): {speed:number;sprint:number;recovery:number;sneak:number;hurtGrace:number} {
    return {speed:has(game,'vento')?1.10:1,sprint:has(game,'folego')?1.35:1,
      recovery:has(game,'respiro')?1.40:1,sneak:has(game,'mansinho')?1.25:1,hurtGrace:has(game,'sanguefrio')?1:0};
  }
  function onRescue(game: Farm.GameState): void {
    if(has(game,'resgate'))game.entities.chicken.stamina=Math.min(1,game.entities.chicken.stamina+.4);
  }
  function blockWolfHit(game: Farm.GameState): boolean {
    const run=game.expedition;
    if(!run?.shield || !has(game,'casca') || game.phase!=='playing')return false;
    run.shield=false;
    game.entities.chicken.invulnerable=Math.max(1.2,game.entities.chicken.invulnerable);
    game.entities.wolf.pauseTimer=Math.max(.8,game.entities.wolf.pauseTimer);
    return true;
  }
  function snapshot(game: Farm.GameState): Farm.ExpeditionSave | undefined {
    const run=game.expedition;
    return run?{version:1,seed:run.seed,owned:[...run.owned],offered:[...run.offered],rerolls:run.rerolls,shield:run.shield}:undefined;
  }
  function restore(game: Farm.GameState, value: unknown): void {
    if(!enabled()) { delete game.expedition;return; }
    initialize(game,true);
    if(!value || typeof value!=='object')return;
    const saved=value as Partial<Farm.ExpeditionSave>,run=game.expedition!;
    if(saved.version!==1)return;
    if(Number.isInteger(saved.seed) && saved.seed!>=0 && saved.seed!<=0xffffffff)run.seed=saved.seed!;
    const valid=(list:unknown):Ability[] => Array.isArray(list)?[...new Set(list.filter((id):id is Ability=>ids.includes(id)))]:[];
    run.owned=valid(saved.owned).slice(0,Math.min(3,chapter(game)+1));
    const offered=valid(saved.offered).filter(id=>!run.owned.includes(id));
    // Keep saved offers intact; reloading cannot generate an advantageous new draft.
    if(offered.length===3 && run.owned.length<chapter(game)+1)run.offered=offered;
    run.rerolls=saved.rerolls===0?0:1;
    run.shield=saved.shield===true && run.owned.includes('casca');
  }
  return {cards,chapters,enabled,saveKey,initialize,chapter,has,ensureDraft,pending,choose,reroll,modifiers,onRescue,blockWolfHit,snapshot,restore};
})();
