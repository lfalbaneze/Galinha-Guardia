/* Speech reacts to observed AI state, without granting any new perception. */
const WolfDialogue = (() => {
  const animals = {
    chicken: {
      chase: ['Quem soltou essa galinha?!', 'Esse frango veio com turbo!'],
      alert: ['Esse mato fez có-có?', 'Foi pena ou foi poeira?'],
      investigate: ['Tem pena nessa história…', 'Pegada de galinha. Tô chegando!'],
      inspect: ['Eu vi esse bico entrar!', 'Esse feno tá cacarejando!'],
    },
    duck: {
      chase: ['Esse pato veio com motor?!', 'Nada de fugir fazendo quá-quá!'],
      alert: ['Esse mato fez quá-quá?', 'Ouvi um pato ou minha barriga?'],
      investigate: ['Pé de pato passou por aqui…', 'Tem um quá-quá nessa história!'],
      inspect: ['Eu vi esse pato entrar!', 'Esse feno tá fazendo quá-quá!'],
    },
    rabbit: {
      chase: ['Esse coelho não tem freio?!', 'Volta aqui, orelhudo!'],
      alert: ['Moita costuma ter orelhas?', 'Ouvi uns pulinhos por aqui…'],
      investigate: ['Pegadinhas de coelho. Aha!', 'Foi por aqui, aos pulinhos…'],
      inspect: ['Eu vi essas orelhas entrarem!', 'Esse feno tem orelhas!'],
    },
    cat: {
      chase: ['Essa gata tem sete marchas?!', 'Ei, gata! Para de fazer parkour!'],
      alert: ['Esse mato acabou de miar?', 'Ouvi um miau ou tô com fome?'],
      investigate: ['Tem patinha de gata por aqui…', 'Esse bigode deixou uma pista!'],
      inspect: ['Eu vi essa gata entrar!', 'Moita não faz miau!'],
    },
    dog: {
      chase: ['Esse cachorro corre demais!', 'Ei, cachorro! A corrida acabou!'],
      alert: ['Esse mato acabou de latir?', 'Ouvi um au-au por aqui…'],
      investigate: ['Pegada de cachorro. Achei!', 'Esse focinho passou por aqui…'],
      inspect: ['Eu vi esse cachorro entrar!', 'Esse feno tá abanando o rabo!'],
    },
    goose: {
      chase: ['Esse ganso veio com buzina?!', 'Ganso! Sem bicada, combinado?'],
      alert: ['Ouvi um ganso ou uma buzina?', 'Esse mato fez hóóónk?'],
      investigate: ['Tem pegada de ganso aqui…', 'Essa buzina passou por aqui!'],
      inspect: ['Eu vi esse ganso entrar!', 'Esse feno tá buzinando!'],
    },
  };
  function identity(game) {
    const appearance=CharacterArt.appearances[game.entities.chicken.skin]||CharacterArt.appearances.classic;
    return {name:appearance.name,lines:animals[appearance.species]||animals.chicken};
  }
  function choices(game,mode) {
    const {name,lines}=identity(game);
    if(mode==='chase')return [`${name}! Volta aqui!`,...lines.chase,'Correr de barriga vazia é duro!'];
    if(mode==='search')return [`${name}, cadê você?!`,'Ué. O almoço evaporou.','Nariz, colabora comigo!'];
    return lines[mode];
  }
  function witnessLine(game) { return identity(game).lines.inspect[0].toUpperCase(); }
  function update(game, dt) {
    const wolf = game.entities.wolf;
    if(SunflowerSystem.concealed(game)){wolf.speechTime=0;return;}
    wolf.speechTime = Math.max(0, (wolf.speechTime || 0) - dt);
    wolf.speechCooldown = Math.max(0, (wolf.speechCooldown || 0) - dt);
    wolf.speechPriority = Math.max(0, (wolf.speechPriority || 0) - dt);
    const skin=game.entities.chicken.skin||'classic';
    const skinChanged=wolf.speechSkin!==undefined&&wolf.speechSkin!==skin;
    wolf.speechSkin=skin;
    const changed = wolf.speechMode !== wolf.mode;
    wolf.speechMode = wolf.mode;
    if(wolf.speechPriority>0)return;
    if(skinChanged)wolf.speechTime=0;
    const options=choices(game,wolf.mode);
    if (!options || wolf.huntUnlockTimer > 0) return;
    if (skinChanged || (changed && wolf.mode === "chase") || wolf.speechCooldown <= 0) {
      if(skinChanged)wolf.speechIndex=0;
      wolf.speechIndex = (wolf.speechIndex || 0) + 1;
      wolf.speech = options[(wolf.speechIndex - 1) % options.length];
      wolf.speechTime = 2.1;
      wolf.speechCooldown = 5;
    }
  }
  return { update, witnessLine };
})();
