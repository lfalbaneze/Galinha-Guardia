/* Browser survival: shared farm maps, collisions, movement and eight-way actors. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./engine.js'),require('./maps.js'));
  else root.ShuffleSurvival=factory(root.ShuffleRun,root.ShuffleMaps);
})(typeof globalThis!=='undefined'?globalThis:this,function(E,M){
  'use strict';
  const DURATION=600,MAX_ENEMIES=48;
  const ENEMIES=Object.freeze({
    fox:{name:'Raposa',wave:1,hp:1.8,speed:138,r:17,height:43,xp:1,color:'#de8244',text:'Flanqueia e anuncia um bote curto. Desvie para o lado.'},
    fuinha:{name:'TIH',wave:1,hp:1.4,speed:142,r:12,height:35,xp:1,color:'#be9768',text:'Corre em arrancadas e se encolhe antes de saltar.'},
    wolf:{name:'Lobo',wave:2,hp:3.5,speed:94,r:18,height:61,xp:1,color:'#8d9eab',text:'Corta sua rota e prepara uma investida. Mude de direção.'},
    goose:{name:'Ganso',wave:2,hp:2,speed:116,r:18,height:62,xp:1,color:'#e5dcc2',text:'Mantém distância e avisa antes de empurrar com um grasnado.'},
    amanda:{name:'Sophis',wave:2,hp:3.5,speed:126,r:16,height:48,xp:2,color:'#e6a9c4',text:'Finge recuar e prepara uma emboscada pelo lado.'},
    crow:{name:'Corvo',wave:1,hp:1.5,speed:125,r:11,height:35,xp:1,color:'#bdacdf',text:'Sinaliza o rasante, passa em linha reta e precisa se recuperar.'},
    owl:{name:'Coruja',wave:3,hp:4,speed:80,r:15,height:50,xp:2,color:'#e5c88a',limit:2,text:'A sirene avisa uma investida coordenada dos inimigos próximos.'},
    'mula-sem-cabeca':{name:'Mula sem Cabeça',wave:3,hp:7,speed:90,r:20,height:70,xp:3,color:'#ffae49',text:'Desvie das rajadas de fogo e das ferraduras em chamas. O galope deixa pegadas perigosas.'},
    curupira:{name:'Curupira',wave:4,hp:4,speed:112,r:14,height:53,xp:2,color:'#9dce6d',text:'Raízes surgem onde você estava.'},
    boitata:{name:'Boitatá',wave:6,hp:7,speed:103,r:18,height:58,xp:3,color:'#ffc65a',text:'Cuidado com o rastro de fogo.'},
    cuca:{name:'Cuca',wave:8,hp:28,speed:72,r:20,height:75,xp:8,color:'#c799ed',limit:1,text:'A bruxa prepara três feitiços!'}
  });
  const LUNGES=Object.freeze({
    fox:{range:125,warning:.38,speed:340,recovery:.85},
    wolf:{range:170,warning:.5,speed:360,recovery:1.35},
    fuinha:{range:100,warning:.3,speed:380,recovery:1}
  });
  const POWERS=Object.freeze({
    cornshot:{name:'Milho Kombat',text:'Turbina o tiro próprio do seu bicho: mais dano e disparos mais rápidos.',color:'#ffd355',mark:'M'},
    egg:{name:'Resident Ovo',text:'O terror do galinheiro: ovos em todas as direções.',color:'#fff2d7',mark:'O'},
    sickle:{name:'Foice May Cry',text:'A colheita veio cobrar: corta os inimigos próximos.',color:'#9fded7',mark:'F'},
    boots:{name:'Super Bota Bros.',text:'+12% de velocidade por nível.',color:'#d7a771',mark:'B'},
    volley:{name:'Contra Milho',text:'Acrescenta dois tiros em leque ao ataque básico por nível.',visual:'cornshot',color:'#ffd355'},
    rear:{name:'Ré de Respeito',text:'Dispara para trás a cada 1,4 s. Mais tiros por nível.',visual:'feather',color:'#f4d8ff'},
    cross:{name:'Cruzada do Galinheiro',text:'Quatro jatos cruzados a cada 2 s. Mais dano por nível.',visual:'water',color:'#75daec'},
    spiral:{name:'Galáxia de Penas',text:'Espiral de 8 penas a cada 3 s; +2 penas por nível.',visual:'feather',color:'#c5baff'},
    sniper:{name:'Cenoura de Elite',text:'Cenoura veloz que atravessa inimigos a cada 2 s. Mais dano por nível.',visual:'carrot',color:'#ffb35e'},
    homing:{name:'Ovo te Encontrar',text:'Ovos perseguem alvos visíveis. Um ovo extra por nível.',visual:'egg',color:'#fff2d7'},
    boomerang:{name:'Foice de Volta',text:'Foice atravessa a horda e retorna, atingindo de novo. Mais dano por nível.',visual:'sickle',color:'#a9e1c9'},
    ricochet:{name:'Pipoca Ricochete',text:'Um grão salta entre 2 inimigos; +1 salto por nível.',visual:'cornshot',color:'#f8db8a'},
    fireball:{name:'Omelete em Chamas',text:'Ovo explode e queima por 3 s. Mais dano por nível.',visual:'egg',color:'#ff9264'},
    frost:{name:'Frio de Rachar o Bico',text:'Três penas geladas desaceleram por 2 s; +1 s por nível.',visual:'feather',color:'#bcefff'},
    venom:{name:'Caldo da Cuca',text:'Gota envenena por 4 s. Mais dano por nível.',visual:'water',color:'#b2e482'},
    thunder:{name:'Cerca Elétrica',text:'Raio encadeado em até 3 alvos; +1 alvo por nível.',visual:'lightning',color:'#82d8ff'},
    mines:{name:'Horta Minada',text:'Planta uma cenoura explosiva a cada 3 s. Mais dano por nível.',visual:'carrot',color:'#ffb35e'},
    orbit:{name:'Garras Satélites',text:'Duas garras orbitam e cortam a horda; +1 garra por nível.',visual:'claw',color:'#ddb5ef'},
    quake:{name:'Có-có Sísmico',text:'Onda a cada 4 s causa dano e empurra. Alcance cresce por nível.',visual:'bark',color:'#efbf87'},
    heart:{name:'Coração de Fazenda',text:'+1 coração máximo e recupera 1 coração por nível.',visual:'milk',color:'#ffa6bf'},
    dash:{name:'Asa Ligeira',text:'Reduz a recarga da esquiva em 20% por nível.',visual:'boots',color:'#e5c883'},
    feather:{name:'Pena Escorregadia',text:'+0,35 s de proteção após levar dano, por nível.',visual:'feather',color:'#dce3ff'},
    magnet:{name:'Ímã de Colheita',text:'+60 de alcance para atrair cristais por nível.',visual:'xp',color:'#b5e8cf'},
    might:{name:'Milho Maromba',text:'+20% de dano em todos os ataques por nível.',visual:'cornshot',color:'#ffbc70'},
    haste:{name:'Café com Có-có',text:'Ataques e especiais recarregam 15% mais rápido por nível.',visual:'lightning',color:'#e3bb86'},
    reach:{name:'Latifúndio de Pancada',text:'+20% de alcance dos tiros e explosões por nível.',visual:'honk',color:'#d4f49b'},
    regen:{name:'Hora do Leite',text:'Recupera 1 coração a cada 16 s; reduz 4 s por nível.',visual:'milk',color:'#ffddd4'},
    shield:{name:'Casca Grossa',text:'Renova um escudo a cada 13 s; reduz 3 s por nível.',visual:'shield',color:'#ede8c7'},
    harvest:{name:'Safra Dobrada',text:'+1 ponto por cristal coletado, por nível.',visual:'xp',color:'#b6ed9e'},
    thorns:{name:'Abraço de Espinhos',text:'Ao perder vida, causa 6 de dano ao redor por nível.',visual:'claw',color:'#d6c69a'}
  });
  const FUSIONS=Object.freeze({
    solar:{name:'Ovo de Mau Humor',items:['egg','fireball'],visual:'egg',accent:'lightning',color:'#ffad55',text:'Quatro ovos grudam no bicho e levam o pavio junto: explodem após 0,65 s e queimam os vizinhos.',delay:2.4},
    reaper:{name:'Capina de Ré',items:['sickle','boomerang'],visual:'sickle',accent:'xp',color:'#99ffe0',text:'Três foices cortam na ida, seguem você na volta e trazem os cristais de XP pelo caminho.',delay:1.8},
    storm:{name:'Bebedouro em Curto',items:['thunder','cross'],visual:'lightning',accent:'water',color:'#75e4ff',text:'Quatro poças formam uma cruz. A água dá choques a cada 0,6 s e trava quem pisa nela.',delay:2.8},
    blizzard:{name:'Varal de Arrepiar',items:['frost','spiral'],visual:'feather',accent:'shield',color:'#c3d7ff',text:'Estende um varal de penas atrás de você por 2,8 s. Quem cruza leva dano e fica lento por 5 s.',delay:2},
    meteor:{name:'Desaforo de Raiz',items:['sniper','mines'],visual:'carrot',accent:'boots',color:'#ffbf72',text:'Três raízes puxam os bichos para o canteiro. Após 0,55 s, cenouras brotam com uma explosão.',delay:2.5},
    cauldron:{name:'Caldo Malcriado',items:['venom','quake'],visual:'water',accent:'bark',color:'#c3f986',text:'Três poças envenenam por 3 s. A fervura empurra os bichos a cada 0,7 s e abre espaço para fugir.',delay:3.2},
    fortress:{name:'Aqui Não, Querida',items:['orbit','shield'],visual:'claw',accent:'shield',color:'#f0baff',text:'Seis garras protegem você. Quebraram o escudo? Elas disparam para fora e empurram a horda. Escudo novo em 4 s.',delay:.25},
    popcorn:{name:'Fofoca Estourada',items:['cornshot','ricochet'],visual:'cornshot',accent:'cornshot',color:'#ffe18b',text:'Dois grãos levam a fofoca: cada um solta duas pipocas no primeiro impacto, que saltam entre os vizinhos. Contra Milho acrescenta grãos.',delay:.9}
  });
  const WEAPONS=['cornshot','egg','sickle','rear','cross','spiral','sniper','homing','boomerang','ricochet','fireball','frost','venom','thunder','mines','orbit','quake'];
  const maxRank=id=>WEAPONS.includes(id)?5:3;
  const powerKind=id=>WEAPONS.includes(id)?'Arma':'Apoio';
  const STYLES=Object.freeze({
    colheita:{name:'Colheita',seconds:60,spawn:1,speed:1,xp:1,text:'Dez mapas, dez chefes e pressão crescente. Monte suas fusões e preserve seus corações.'},
    correria:{name:'Correria',seconds:45,spawn:.8,speed:1.1,xp:1.3,text:'Chefes em 45 s, inimigos mais rápidos e 30% mais XP. Evolua em disparada.'},
    cerco:{name:'Cerco',seconds:75,spawn:.65,speed:1,xp:1.2,text:'Chefes em 75 s, reforços frequentes e 20% mais XP. Controle o espaço da horda.'}
  });
  const style=r=>STYLES[r.style]||STYLES.colheita;
  function powerText(id,n=1){
    const details={
      cornshot:`Dano ×${(1+.35*(n-1)).toFixed(2)}; tiro a cada ${(.7-.12*(n-1)).toFixed(2)} s.${n>=3?' Mais dois tiros em leque.':''}${n>=5?' Os tiros atravessam a horda.':''}`,
      egg:`${6+n*2} ovos em roda a cada ${(3.2-.4*n).toFixed(1)} s.${n>=3?' Atravessam inimigos.':''}${n>=5?' Explodem ao acertar.':''}`,
      sickle:`Corte com raio ${68+n*16} a cada ${(2.2-.3*n).toFixed(1)} s.${n>=3?' Empurra os inimigos.':''}${n>=5?' Desacelera por 2 s.':''}`,
      rear:`${n} tiros para trás a cada 1,4 s.`,cross:`${n>=3?8:4} jatos cruzados a cada 2 s.${n>=5?' Desaceleram por 2 s.':''}`,
      spiral:`${6+n*2} penas em espiral a cada 3 s.${n>=5?' Atravessam inimigos.':''}`,
      sniper:`${n>=3?2:1} cenoura(s) perfurante(s) a cada 2 s.${n>=5?' Explodem ao acertar.':''}`,
      homing:`${n} ovo(s) teleguiado(s) a cada 2,4 s.`,boomerang:`${n>=5?3:1} foice(s) atravessam inimigos e voltam a cada 2 s.`,
      ricochet:`Salta até ${n+1} vezes entre inimigos.`,fireball:`${n>=3?3:1} ovo(s) explosivo(s); queima por 3 s.`,
      frost:`${n>=5?7:n>=3?5:3} penas geladas; lentidão por ${n+1} s.`,venom:`Veneno por 4 s.${n>=3?' Atravessa inimigos.':''}${n>=5?' Espalha veneno numa explosão.':''}`,
      thunder:`Raio em até ${n+2} alvos.${n>=5?' Paralisa por 1 s.':''}`,mines:`${n>=3?2:1} cenoura(s)-mina a cada 3 s; explosão com raio ${n>=5?120:88}.`,
      orbit:`${n+1} garras giram ao seu redor.`,quake:`Onda com raio ${100+n*20} a cada 4 s.${n>=5?' Paralisa por 1 s.':''}`,
      boots:`+${n*12}% de velocidade.`,volley:`+${n*2} tiros em leque ao ataque básico.`,heart:`+${n} coração(ões) máximo(s); recupera 1 ao escolher.`,
      dash:`-${n*20}% na recarga da esquiva.`,feather:`+${(n*.35).toFixed(2)} s de proteção após dano.`,magnet:`Atrai cristais até ${100+n*60} de distância.`,
      might:`+${n*20}% de dano em todos os ataques.`,haste:`Recarga dos ataques ÷ ${(1+n*.15).toFixed(2)}.`,reach:`+${n*20}% de alcance.`,
      regen:`Recupera 1 coração a cada ${20-n*4} s.`,shield:`Renova o escudo a cada ${16-n*3} s.`,harvest:`+${n} XP por cristal.`,thorns:`Contra-ataque de ${6*n} de dano ao perder vida.`
    };
    return (details[id]||'')+(WEAPONS.includes(id)&&id!=='cornshot'?` Dano da arma ×${(1+(id==='egg'||id==='sickle'?.35:.4)*(n-1)).toFixed(2)}.`:'');
  }
  const fused=(r,id)=>r.fusions.includes(id);
  const consumed=(r,id)=>r.fusions.some(f=>FUSIONS[f].items.includes(id));
  function canFuse(r,id){return r.mode==='survival'&&r.phase==='playing'&&Object.hasOwn(FUSIONS,id)&&!fused(r,id)&&FUSIONS[id].items.every(item=>rank(r,item)>=3);}
  function fuse(r,id){
    if(!canFuse(r,id))return false;
    r.fusions.push(id);r.cooldowns[id]=0;
    r.sounds.add('fusion');
    const recipe=FUSIONS[id];
    if(id==='fortress'){r.player.shield=true;r.cooldowns.fortressShield=4;}
    r.effects.push({x:r.player.x,y:r.player.y,kind:'fusion',fusion:id,visual:recipe.visual,accent:recipe.accent,color:recipe.color,radius:80,time:.8,duration:.8,
      ingredients:recipe.items.map(item=>POWERS[item].visual||item)});
    say(r,`Mistura pronta! ${recipe.name}`);r.noticeTime=3;
    return true;
  }
  const STAGES=Object.freeze([
    {name:'Pomar em polvorosa',map:0,roster:['fox','fuinha','crow'],horde:6,boss:'goose',title:'Panto, fiscal da colheita',hp:95,text:'Contorne as árvores. Fuinhas correm pelos lados e corvos anunciam rasantes.'},
    {name:'Milharal dos uivos',map:1,roster:['wolf','goose','amanda'],horde:7,boss:'wolf',title:'Baltazar, o sem-almoço',hp:140,text:'Troque de corredor nas passagens. Sophis tenta fechar a sua rota de fuga.'},
    {name:'Pedreira dos rasantes',map:6,roster:['crow','owl','fox','goose'],horde:8,boss:'fox',title:'Lorenzo, mestre das emboscadas',hp:190,text:'Use as curvas e pedras como proteção. A sirene da coruja anuncia uma onda mais veloz.'},
    {name:'Bosque dos desaforos',map:2,roster:['fuinha','amanda','wolf','owl'],horde:9,boss:'fuinha',title:'TIH, ligeira do milharal',hp:250,text:'As trilhas circulares têm saídas cruzadas. Mude de rota para escapar das emboscadas.'},
    {name:'Campo sem sossego',map:3,roster:['fox','amanda','crow','goose'],horde:10,boss:'amanda',title:'Sophis, dona do desvio',hp:310,text:'Cruze o campo pelas diagonais. As raposas atacam entre os rasantes.'},
    {name:'Colheita sitiada',map:5,roster:['wolf','fuinha','goose','owl'],horde:11,boss:'goose',title:'Panto, embargo da safra',hp:370,text:'Os corredores de feno se encontram no centro. Não deixe a sirene fechar as duas saídas.'},
    {name:'Volta do bebedouro',map:4,roster:['amanda','crow','fox','owl'],horde:12,boss:'owl',title:'Coruja, regente da sirene',hp:430,text:'A trilha contorna o bebedouro e tem pontes entre os lados. Interrompa a sirene antes dos reforços.'},
    {name:'Pomar em brasa',map:7,roster:['wolf','fox','fuinha','crow'],horde:13,boss:'crow',title:'Corvo, dono do céu',hp:500,text:'As diagonais dividem o pomar. Os rasantes deixam corredores livres por pouco tempo.'},
    {name:'Trilhas da penumbra',map:8,roster:['wolf','amanda','fuinha','owl'],horde:14,boss:'fox',title:'Lorenzo, última emboscada',hp:580,text:'Três voltas ligadas por atalhos. Escolha outra volta quando as garras fecharem a passagem.'},
    {name:'Última luz da fazenda',map:9,roster:['wolf','goose','fox','fuinha','amanda','crow','owl'],horde:15,boss:'wolf',title:'Baltazar, uivo da última luz',hp:680,text:'Arena aberta: a horda combina perseguição, rasantes e sirenes. Preserve espaço para esquivar.'}
  ]);
  const SECRET_BOSSES=Object.freeze([
    {species:'mula-sem-cabeca',title:'Mula sem Cabeça, tropel esquecido',mark:'♨',hint:'Uma ferradura quente marca o chão.'},
    {species:'curupira',title:'Curupira, dono das pegadas',mark:'✦',hint:'Pegadas ao contrário terminam num selo.'},
    {species:'boitata',title:'Boitatá, chama adormecida',mark:'∞',hint:'Um rastro luminoso forma uma espiral.'},
    {species:'cuca',title:'Cuca, segredo do caldeirão',mark:'☽',hint:'Há um cheiro de poção junto desta marca.'}
  ]);
  const secretSpecies=id=>SECRET_BOSSES.some(b=>b.species===id);
  function enemySound(r,e,event){
    if(['fuinha','mula-sem-cabeca','curupira','boitata','cuca','amanda','crow','owl'].includes(e.species))
      r.sounds.add({species:e.species,event,position:{x:e.x,y:e.y}});
  }
  function prepareSecret(r){
    const config=SECRET_BOSSES[r.encounter];r.secretAltar=null;
    if(!config||!r.enemyTypes.includes(config.species))return;
    const points=r.locations.filter(p=>gap(p,r.player)>250&&M.clearCircle(r,p,48));
    const p=[...points].sort((a,b)=>gap(b,r.player)-gap(a,r.player)).find(p=>M.route(r.layout,r.player,p,r.player.r).length);
    if(p)r.secretAltar={...p,...config,discovered:false,awakened:false,defeated:false};
  }
  function canAwaken(r){
    const altar=r.secretAltar;
    return !!(r.mode==='survival'&&r.phase==='playing'&&!r.paused&&altar&&!altar.awakened&&!r.bossSpawned&&
      gap(r.player,altar)<85&&M.clearSegment(r,r.player,altar,0));
  }
  function awaken(r){
    if(!canAwaken(r))return false;
    const altar=r.secretAltar,type=ENEMIES[altar.species],health=(150+r.encounter*70)*(1+victories(r.victories)*.6);
    if(r.enemies.length>=MAX_ENEMIES)r.enemies.pop();
    r.enemies.push({x:altar.x,y:altar.y,species:altar.species,r:type.r*1.25,dx:0,dy:1,traveled:0,moving:false,
      health,maxHealth:health,speed:type.speed,baseSpeed:type.speed*(1+Math.min(.4,pressure(r)*.045)),age:0,side:1,
      mode:'hunt',timer:2,trailTimer:0,route:[],routeTimer:0,routeTarget:null,stun:1.2,
      isBoss:true,isSecretBoss:true,name:altar.title});
    altar.awakened=true;altar.discovered=true;r.player.invulnerable=Math.max(r.player.invulnerable||0,1.8);
    enemySound(r,r.enemies.at(-1),'warn');
    pulse(r,altar,150,type.color,{visual:'lightning'});
    say(r,`CHEFE SECRETO! ${altar.title}. O relógio da fase espera este desafio.`);r.noticeTime=6;return true;
  }
  const GROUND_LOOT=['xp','xp','xp','milk'];
  const rank=(r,id)=>r.powers[id]||0;
  const strength=r=>(1+.08*Math.min(24,r.level-1))*(1+.2*rank(r,'might'));
  const reach=r=>1+.2*rank(r,'reach');
  const cadence=r=>1/(1+.15*rank(r,'haste'));
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
  const QUIPS=Object.freeze({
    heroes:{
      classic:{name:'Erina',win:['O almoço pediu demissão. Agora é a chefona!','Quem nasceu primeiro? Não sei. Quem ganhou? EU!'],lose:['Foi só um teste de resistência da casca. Reprovou.','Não perdi. Estou chocando um plano melhor.']},
      silkie:{name:'Midori',win:['Fofinha, sim. Almofada de pancada, jamais!','Ganhei e nem desmanchei o topete. Quase.'],lose:['Amassaram meu topete. Isso vai pro sindicato.','Preciso de revanche e de um condicionador.']},
      blue:{name:'Alzira',win:['A cerca era elétrica. Eu sou o boleto!','Azul é minha pena. Roxo vai ser o orgulho deles.'],lose:['Deu curto na galinha. Alguém viu o disjuntor?','Faltou energia bem na hora do có-có final.']},
      punk:{name:'Zeca',win:['Pato aqui, pato ali... pato campeão!','Dei um banho na horda. Sem cobrar o shampoo!'],lose:['Paguei o pato. De novo.','Meu plano fez água. E olha que eu sou pato.']},
      astronaut:{name:'Pipoca',win:['A cenoura era orgânica. A pancada, artesanal!','Velocidade de coelho, freio vendido separadamente.'],lose:['Tropecei na própria vantagem evolutiva.','Minhas orelhas chegaram. O resto ficou no caminho.']},
      robocop:{name:'Stella',win:['Ganhei. Agora podem voltar a me admirar.','A horda virou meu arranhador. Cinco estrelas.'],lose:['Isso não conta. Eu estava no modo soneca.','Vou descontar essa derrota no sofá.']},
      priest:{name:'Paçoca',win:['Quem é o bom garoto? O CAMPEÃO aqui!','Au de vitória! Agora cadê meu biscoito?'],lose:['Eu vi uma bolinha. Acontece nas melhores famílias.','Perdi a luta, mas ninguém levou meu graveto.']},
      goose:{name:'Gumercindo',win:['Venci e ainda tenho fôlego para reclamar!','GRAS! Tradução: respeita o pescoço.'],lose:['Vou abrir uma reclamação no lago!','Meu advogado é um ganso. Preparem os ouvidos.']}
    },
    enemies:{
      fox:{name:'Raposa',win:['Astúcia: dez. Modéstia: em manutenção.','Hoje o plano não tinha buraco. Milagre!'],lose:['Era uma emboscada. Só errei quem caía nela.','Vou dizer que fui derrotada por uma galinha gigante.']},
      fuinha:{name:'TIH',win:['Pequena no tamanho, enorme no desaforo!','Passei tão rápido que a vitória nem me viu.'],lose:['Minhas pernas pediram demissão no meio do turno.','Eu ia fugir com elegância. Faltou a elegância.']},
      wolf:{name:'Lobo',win:['Quem ri por último tem o focinho maior!','Hoje eu soprei só para tirar a poeira da taça.'],lose:['Vou virar vegetariano. Até o próximo almoço.','Perdi para o almoço. Meu nutricionista vai surtar.']},
      goose:{name:'Ganso',win:['Passagem negada. Reclamações no meu bico!','Sou fiscal, juiz e buzina. Tudo concursado!'],lose:['Vou multar essa vitória por excesso de desaforo.','A porteira está aberta. Meu orgulho, interditado.']},
      amanda:{name:'Sophis',win:['A saída era uma armadilha. Dei até sinalização!','Recuar? Eu só estava buscando um ângulo melhor.'],lose:['Meu plano tinha três saídas. Usei a errada.','Lorenzo, apaga a câmera da emboscada!']},
      crow:{name:'Corvo',win:['Vitória por via aérea! Bagagem cobrada à parte.','O rasante veio com entrega expressa.'],lose:['Meu plano de voo virou plano de chão.','A pista estava livre. Meu juízo, ocupado.']},
      owl:{name:'Coruja',win:['Avisei com sirene. Educação em primeiro lugar!','Quem manda na noite também carimba o placar.'],lose:['Vou revisar essa ocorrência depois da soneca.','Minha sirene precisa de uma pilha e de um advogado.']},
      'mula-sem-cabeca':{name:'Mula sem Cabeça',win:['Ganhei sem cabeça. Imagina se eu pensasse!','A concorrência ficou com a cabeça quente. Eu já vim assim.'],lose:['Perdi a cabeça faz tempo. Agora perdi o resto.','Faltou juízo. Tecnicamente, faltou onde guardar.']},
      curupira:{name:'Curupira',win:['Meus pés são ao contrário. Meu placar, não!','Seguiu minhas pegadas? Caiu no tutorial errado.'],lose:['Fui comemorar e corri para o lado errado.','Tropecei numa raiz. Favor não contar para a floresta.']},
      boitata:{name:'Boitatá',win:['Vitória quentinha, direto do forno!','Acendi a disputa. Ninguém trouxe extintor.'],lose:['Apagaram meu brilho. Deve ser conta de luz.','Virei minhoca de aniversário: sopraram e acabou.']},
      cuca:{name:'Cuca',win:['Receita de vitória: maldade e uma pitada de deboche.','Hoje o caldeirão serve derrota à la carte!'],lose:['A receita dizia fogo baixo, não autoestima baixa!','Vou trocar de caldeirão. Esse só cozinha meu orgulho.']}
    }
  });
  function quip(r,actor,won){
    const hero=actor?.skin||actor?.species==='chicken',id=hero?(actor.skin||'classic'):actor?.species;
    const book=hero?QUIPS.heroes:QUIPS.enemies;
    if(!Object.hasOwn(book,id))return null;
    const entry=book[id],lines=entry[won?'win':'lose'];
    // Dialogue has no access to the gameplay random stream; reopening a panel keeps its line.
    const index=(M.seedFor(r.seed,41)+(r.kills||0)+(r.bossesDefeated||0))%lines.length;
    return {name:hero?entry.name:actor.name||entry.name,text:lines[index],outcome:won?'win':'lose',artId:(hero?'hero-':'enemy-')+id,actor:{species:actor.species,skin:actor.skin}};
  }
  const gap=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const SHOTS=Object.freeze({
    classic:{name:'Ovinho estourado',visual:'egg',speed:360,spread:[0],blast:32},
    silkie:{name:'Leque de penas',visual:'feather',speed:310,spread:[-.16,0,.16],slow:1.1,damage:.55},
    blue:{name:'Faísca elétrica',visual:'lightning',speed:620,spread:[0],piercing:true,damage:.8},
    punk:{name:'Jato de lagoa',visual:'water',speed:460,spread:[0],piercing:true,damage:.85},
    astronaut:{name:'Cenouras gêmeas',visual:'carrot',speed:400,spread:[-.09,.09],damage:.65},
    robocop:{name:'Arranhão triplo',visual:'claw',speed:510,spread:[-.18,0,.18],life:.5,damage:.65},
    priest:{name:'Latido de impacto',visual:'bark',speed:380,spread:[0],push:28},
    goose:{name:'Gras nocaute',visual:'honk',speed:420,spread:[0],stun:.25}
  });
  const wave=r=>Math.min(10,1+Math.floor(r.elapsed/30));
  const victories=value=>Number.isSafeInteger(value)&&value>=0?Math.min(99,value):0;
  const pressure=r=>r.encounter+victories(r.victories)*2;
  const xpNeeded=r=>5+r.level*3;
  function random(r){r.rng=(Math.imul(r.rng,1664525)+1013904223)>>>0;return r.rng/4294967296;}
  const pick=(r,list)=>list[Math.floor(random(r)*list.length)];
  function say(r,text){r.notice=text;r.noticeTime=4;}
  function effect(r,p,kind){r.effects.push({x:p.x,y:p.y,kind,time:.55});}
  function newRun(seed,available=Object.keys(ENEMIES),skin='classic',wins=0,runStyle='colheita'){
    const r=E.newRun(seed);r.rng=M.seedFor(r.seed,17);
    r.mode='survival';r.stage=STAGES[0].map;r.hp=5;r.level=1;r.choices=[];
    E.beginStage(r,M.survival(r.seed,0));r.friends=[];r.enemies=[];
    r.player.skin=Object.hasOwn(HEROES,skin)?skin:'classic';
    Object.assign(r,{powers:{cornshot:1},cooldowns:{cornshot:0,egg:0,sickle:0},
      pickups:[],shots:[],hazards:[],hexes:[],mines:[],fusions:[],fusionFields:[],sounds:new Set(),heroCooldown:1,mineCooldown:0,kills:0,xp:0,spawnTimer:0,itemTimer:15,locations:[],
      enemyTypes:Object.keys(ENEMIES).filter(id=>available.includes(id)),seenEnemies:[],
      score:0,pendingChoices:0,encounter:0,style:Object.hasOwn(STYLES,runStyle)?runStyle:'colheita',xpFraction:0,victories:victories(wins),stageElapsed:0,bossSpawned:false,stageCleared:false,bossesDefeated:0,secretsDefeated:[]});
    r.mapOrder=STAGES.map(s=>s.map);
    prepareField(r);
    say(r,STAGES[0].text+' Colete XP para escolher poderes.');r.noticeTime=7;
    return r;
  }
  function prepareField(r){
    r.locations=[];
    for(const {a,b} of r.layout.roads)for(let t=0;t<=8;t++)r.locations.push({x:a.x+(b.x-a.x)*t/8,y:a.y+(b.y-a.y)*t/8});
    const first=[...r.locations].sort((a,b)=>gap(a,r.player)-gap(b,r.player)).find(p=>gap(p,r.player)>=75);
    r.pickups.push({...first,kind:'xp',value:5});
    const kinds=[...GROUND_LOOT,'xp','xp','xp'];
    for(let i=kinds.length-1;i>0;i--){const j=Math.floor(random(r)*(i+1));[kinds[i],kinds[j]]=[kinds[j],kinds[i]];}
    for(const kind of kinds)placeItem(r,kind);
    prepareSecret(r);
  }
  function offer(r,exclude=[]){
    const pool=Object.keys(POWERS).filter(id=>canGrant(r,id)&&!exclude.includes(id));
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(random(r)*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    const upgrade=pool.find(id=>rank(r,id)),fresh=pool.find(id=>!rank(r,id));
    const partner=pool.find(id=>Object.values(FUSIONS).some(f=>f.items.includes(id)&&f.items.some(p=>p!==id&&rank(r,p))));
    return [...new Set([upgrade,fresh,partner,...pool].filter(Boolean))].slice(0,3);
  }
  function slots(r,kind){return Object.keys(r.powers).filter(id=>rank(r,id)&&!consumed(r,id)&&powerKind(id)===kind).length+(kind==='Arma'?r.fusions.length:0);}
  function canGrant(r,id){return Object.hasOwn(POWERS,id)&&!consumed(r,id)&&rank(r,id)<maxRank(id)&&(rank(r,id)>0||slots(r,powerKind(id))<6);}
  function openDraft(r){
    if(!r.pendingChoices)return;
    r.choices=offer(r);
    if(!r.choices.length){r.pendingChoices=0;return;}
    r.phase='power-draft';r.rerolls=1;r.player.moving=false;
  }
  function addPoints(r,points){
    r.score+=points;r.xpFraction+=points*style(r).xp;
    const gained=Math.floor(r.xpFraction+1e-9);r.xpFraction-=gained;r.xp+=gained;
    while(r.xp>=xpNeeded(r)){
      r.xp-=xpNeeded(r);r.level++;r.pendingChoices++;r.hp=Math.min(E.stats(r).maxHp,r.hp+1);
      r.sounds.add('level');
    }
  }
  function grant(r,id){
    if(!canGrant(r,id))return false;
    r.powers[id]=rank(r,id)+1;
    r.sounds.add('upgrade');
    if(['boots','heart','dash','feather'].includes(id))r.skills[id]=rank(r,id);
    if(id==='heart')r.hp=Math.min(E.stats(r).maxHp,r.hp+1);
    if(id==='shield')r.player.shield=true;
    say(r,`${POWERS[id].name} · nível ${rank(r,id)}/${maxRank(id)}`);return true;
  }
  function choose(r,id){
    if(r.phase!=='power-draft'||!r.choices.includes(id)||!grant(r,id))return false;
    r.pendingChoices--;r.choices=[];r.phase=r.stageCleared?'stage-clear':'playing';
    openDraft(r);return true;
  }
  function reroll(r){
    if(r.phase!=='power-draft'||!r.rerolls)return false;
    const alternatives=offer(r,r.choices);
    if(!alternatives.length)return false;
    r.choices=[...alternatives,...r.choices].slice(0,3);r.rerolls--;r.sounds.add('shuffle');return true;
  }
  function nextStage(r){
    if(r.phase!=='stage-clear'||r.encounter>=STAGES.length-1)return false;
    const skin=r.player.skin;r.encounter++;r.stage=r.mapOrder[r.encounter];
    E.beginStage(r,M.survival(r.seed,r.encounter));r.player.skin=skin;r.player.shield=rank(r,'shield')>0;r.friends=[];r.enemies=[];r.boss=null;
    Object.assign(r,{pickups:[],shots:[],hazards:[],hexes:[],mines:[],fusionFields:[],banter:null,stageElapsed:0,
      bossSpawned:false,stageCleared:false,spawnTimer:1,itemTimer:15});
    r.hp=Math.min(E.stats(r).maxHp,r.hp+1);prepareField(r);
    say(r,`Fase ${r.encounter+1}: ${STAGES[r.encounter].name}. ${STAGES[r.encounter].text}`);r.noticeTime=7;return true;
  }
  function spawnBoss(r){
    const config=STAGES[r.encounter],species=r.enemyTypes.includes(config.boss)?config.boss:r.enemyTypes.find(id=>!secretSpecies(id));
    if(!species)return false;
    const type=ENEMIES[species],p=spawnPoint(r,r.locations.filter(p=>gap(p,r.player)>300),type.r);
    if(!p)return false;
    const speed=type.speed*.85*(1+Math.min(.4,pressure(r)*.045));
    const health=config.hp*(1+r.encounter*.25+r.victories*.6);
    if(r.enemies.length>=MAX_ENEMIES)r.enemies.pop();
    r.enemies.push({...p,species,r:type.r,dx:0,dy:1,traveled:0,moving:false,
      health,maxHealth:health,speed,baseSpeed:speed,age:0,side:1,
      mode:'hunt',timer:1.5,trailTimer:0,route:[],routeTimer:0,routeTarget:null,
      isBoss:true,name:species===config.boss?config.title:`${type.name}, guardião da fase`});
    r.bossSpawned=true;enemySound(r,r.enemies.at(-1),'warn');say(r,`${r.enemies.at(-1).name}! Desvie dos ataques e derrote o chefe.`);return true;
  }
  function placeItem(r,kind){
    const points=r.locations.filter(p=>gap(p,r.player)>90&&r.pickups.every(item=>gap(p,item)>55));
    if(points.length&&r.pickups.length<160)r.pickups.push({...pick(r,points),kind,value:kind==='xp'?3:1});
  }
  function spawnPoint(r,points,radius){
    const approaches=[r.player,...Array.from({length:8},(_,i)=>({
      x:r.player.x+Math.cos(i*Math.PI/4)*(radius+2),y:r.player.y+Math.sin(i*Math.PI/4)*(radius+2)
    }))].filter(p=>M.clearCircle(r,p,radius)&&M.clearSegment(r,p,r.player,0));
    if(!approaches.length)return null;
    const candidates=points.filter(p=>M.clearCircle(r,p,radius)&&r.enemies.every(e=>gap(p,e)>radius+e.r+10));
    for(let tries=0;tries<24&&candidates.length;tries++){
      const index=Math.floor(random(r)*candidates.length),p=candidates.splice(index,1)[0];
      if(approaches.some(target=>M.route(r.layout,p,target,radius).length))return p;
    }
    return null;
  }
  function spawnWave(r,summoned=null,limit=null){
    const points=r.locations.filter(p=>gap(p,r.player)>360);
    const stage=STAGES[r.encounter];
    const count=Math.min(limit??(r.bossSpawned?5+Math.min(10,pressure(r)):stage.horde+wave(r)+Math.min(10,pressure(r))),MAX_ENEMIES-r.enemies.length);
    for(let i=0;i<count&&points.length;i++){
      const eligible=r.enemyTypes.filter(id=>!secretSpecies(id)&&(id===summoned||ENEMIES[id].wave<=wave(r))&&
        r.enemies.filter(e=>e.species===id).length<(ENEMIES[id].limit||MAX_ENEMIES));
      const preferred=eligible.filter(id=>stage.roster.includes(id)),pool=summoned?eligible.filter(id=>id===summoned):preferred.length?preferred:eligible;
      if(!pool.length)break;
      const species=pool.find(id=>!r.seenEnemies.includes(id))||pick(r,pool),type=ENEMIES[species],p=spawnPoint(r,points,type.r);
      if(!p)break;
      const health=(type.hp*1.5+wave(r)*.45)*(1+r.encounter*.6+r.victories*.45);
      const speed=(type.speed+Math.min(24,wave(r)*2))*(1+Math.min(.4,pressure(r)*.045))*style(r).speed;
      r.enemies.push({...p,species,r:type.r,dx:0,dy:1,traveled:0,moving:false,
        health,maxHealth:health,speed,baseSpeed:speed,age:random(r)*3,side:random(r)<.5?-1:1,
        mode:'hunt',timer:1+random(r)*2,trailTimer:0,route:[],routeTimer:random(r)*.5,routeTarget:null});
      if(!r.seenEnemies.includes(species)){
        enemySound(r,r.enemies.at(-1),'warn');
        r.seenEnemies.push(species);if(type.wave>=3)say(r,`${type.name}: ${type.text}`);
      }
      effect(r,p,'spawn');
    }
  }
  function hazard(r,p,kind,source,extra={}){
    const radius=extra.r??(kind==='roots'?29:kind==='hoof'?16:18);
    if(r.hazards.length>=48||!M.clearCircle(r,p,radius))return;
    r.hazards.push({x:p.x,y:p.y,kind,source:{species:source.species,name:source.name},r:radius,arm:kind==='roots'?.95:.5,life:kind==='roots'?3:2.7,...extra});
  }
  function attackReady(r,e,target){
    if(e.isBoss)return true;
    const limit=wave(r)>=6?3:2;
    return r.enemies.filter(other=>other!==e&&other.species!=='owl'&&
      (other.mode==='warning'||other.mode==='charge')&&gap(other,target)<420).length<limit;
  }
  function enemyVolley(r,e,kind,angles,speed,life=2.4,push=0){
    for(const angle of angles)if(r.hexes.length<24){
      const x=e.aimX*Math.cos(angle)-e.aimY*Math.sin(angle),y=e.aimX*Math.sin(angle)+e.aimY*Math.cos(angle);
      const lift=kind==='fire'?ENEMIES[e.species].height*(e.isSecretBoss?1.8:e.isBoss?1.45:1)*.65:10;
      r.hexes.push({x:e.x,y:e.y,vx:x*speed,vy:y*speed,life,kind,push,lift,traveled:0,r:kind==='gust'?13:7,source:{species:e.species,name:e.name}});
    }
  }
  function hoofprints(r,e,before){
    const moved=gap(e,before);if(moved<.01)return;
    const dx=(e.x-before.x)/moved,dy=(e.y-before.y)/moved;
    e.hoofStride=(e.hoofStride||0)+moved;
    if(e.hoofStride>=28){
      e.hoofStride%=28;e.hoofSide=-(e.hoofSide||1);
      hazard(r,{x:e.x-dy*10*e.hoofSide,y:e.y+dx*10*e.hoofSide},'hoof',e,{angle:Math.atan2(dy,dx),arm:.35,life:3.3});
    }
  }
  function aimLunge(r,e,target,speed){
    // Follow the visible escape during preparation, then leave a brief commitment before launch.
    if(e.timer<=.12||!M.clearSegment(r,e,target,0))return;
    const vx=target.vx||0,vy=target.vy||0,dx=target.x+vx*.12-e.x,dy=target.y+vy*.12-e.y;
    const relativeSpeed=speed*speed-vx*vx-vy*vy,dot=dx*vx+dy*vy;
    const flight=relativeSpeed>1?(dot+Math.sqrt(dot*dot+relativeSpeed*(dx*dx+dy*dy)))/relativeSpeed:gap(e,target)/speed;
    const lead=Math.min(.95,.12+flight);
    const predicted={x:target.x+vx*lead,y:target.y+vy*lead};
    const goal=M.clearCircle(r,predicted,e.r)&&M.clearSegment(r,e,predicted,e.r)?predicted:target;
    const distance=gap(e,goal);
    if(distance<1)return;
    e.aimX=(goal.x-e.x)/distance;e.aimY=(goal.y-e.y)/distance;
    e.dx=e.aimX;e.dy=e.aimY;
    e.chargeTime=Math.min(e.species==='crow'?.55:.9,(distance+30)/speed);
  }
  function bossPattern(r,e,target,dt,dx,dy,distance){
    if(!['mula-sem-cabeca','goose'].includes(e.species)&&(!e.isBoss||!['wolf','fox','amanda','fuinha','curupira','boitata','cuca'].includes(e.species)))return false;
    if(e.mode==='warning'){
      e.moving=false;
      if(e.attack==='pounce')aimLunge(r,e,target,360);
      if(e.timer>0)return true;
      enemySound(r,e,'attack');
      if(e.attack==='fire-fan')enemyVolley(r,e,'fire',e.angles,190);
      else if(e.attack==='spell-fan')enemyVolley(r,e,'spell',e.angles,155*(1+Math.min(.65,pressure(r)*.08)),3.2);
      else if(e.attack==='gust'){enemyVolley(r,e,'gust',e.angles,180,2,65);r.sounds.add('honk');}
      else if(e.attack==='claw'){enemyVolley(r,e,'claw',e.angles,400,.55,25);r.sounds.add('claw');}
      else if(e.attack==='dirt')enemyVolley(r,e,'dirt',e.angles,230,1.4,35);
      else if(e.attack==='howl'){e.callPack=true;e.rally=3;}
      if(['fire-gallop','pounce'].includes(e.attack)){e.mode='charge';e.timer=e.attack==='pounce'?e.chargeTime:1.15;e.contactDamage=true;}
      else {e.mode='recover';e.timer=e.attack==='howl'?.8:1.4;}
      return true;
    }
    if(e.mode==='charge'){
      const before={x:e.x,y:e.y},speed=e.attack==='pounce'?360:260,moved=E.move(r,e,e.aimX*speed*dt,e.aimY*speed*dt);
      if(e.attack==='fire-gallop')hoofprints(r,e,before);
      if(e.timer<=0||moved<speed*dt*.6){e.mode='recover';e.timer=1.5;e.contactDamage=false;}
      return true;
    }
    if(e.mode==='recover'){
      e.moving=false;if(e.timer<=0){e.mode='hunt';e.timer=e.isBoss?2.2:3.2;}return true;
    }
    const near=['fox','amanda'].includes(e.species)?210:e.species==='goose'&&!e.isBoss?270:390;
    if(e.timer<=0&&distance<near&&M.clearSegment(r,e,target,0)&&attackReady(r,e,target)){
      const step=e.attackStep||0;
      e.attack=e.species==='mula-sem-cabeca'?['fire-fan','hoof-ring','fire-gallop'][step%3]:
        e.species==='goose'?'gust':e.species==='wolf'?(step%2?'pounce':'howl'):['fox','amanda'].includes(e.species)?(step%2?'pounce':'claw'):e.species==='fuinha'?'dirt':
        e.species==='curupira'?'roots':e.species==='boitata'?(step%2?'fire-fan':'fire-coil'):(step%2?'brew':'spell-fan');
      e.attackStep=step+1;e.mode='warning';e.timer=e.species==='cuca'?1.05:e.attack==='claw'?.7:e.attack==='pounce'?.55:1.1;
      const enraged=e.isBoss&&e.health<e.maxHealth*.5;
      e.angles=e.attack==='fire-fan'?(e.health<e.maxHealth*.5?[-.5,-.25,0,.25,.5]:[-.32,0,.32]):
        e.attack==='spell-fan'?[-.6,-.3,0,.3,.6]:e.attack==='dirt'?[-.5,-.25,0,.25,.5]:e.attack==='gust'?(enraged?[-.64,-.32,0,.32,.64]:e.isBoss?[-.32,0,.32]:[0]):e.attack==='claw'?(enraged?[-.6,-.3,0,.3,.6]:[-.3,0,.3]):[0];
      e.aimX=dx;e.aimY=dy;e.dx=dx;e.dy=dy;e.moving=false;e.contactDamage=false;enemySound(r,e,'warn');
      if(e.attack==='pounce')aimLunge(r,e,target,360);
      if(e.attack==='hoof-ring'){
        for(let ring=0;ring<(e.health<e.maxHealth*.5?2:1);ring++)for(let i=0;i<8;i++){
          const a=i*Math.PI/4+ring*Math.PI/8,d=70+ring*65;
          hazard(r,{x:e.x+Math.cos(a)*d,y:e.y+Math.sin(a)*d},'hoof',e,{angle:a,arm:1.1,life:4.1});
        }
      }else if(e.attack==='roots'){
        const len=Math.hypot(target.dx,target.dy)||1;
        for(let i=0;i<3;i++)hazard(r,{x:target.x+target.dx/len*i*70,y:target.y+target.dy/len*i*70},'roots',e);
      }else if(e.attack==='fire-coil'){
        const a=Math.atan2(dy,dx);
        for(let i=1;i<=8;i++)hazard(r,{x:target.x+Math.cos(a+i*Math.PI/5)*105,y:target.y+Math.sin(a+i*Math.PI/5)*105},'fire',e,{arm:1.1,life:4});
      }else if(e.attack==='brew'){
        for(const side of [-1,0,1])hazard(r,{x:target.x-dy*side*90,y:target.y+dx*side*90},'poison',e,{arm:1.05,life:4.5,r:26});
      }
      return true;
    }
    return false;
  }
  function moveEnemy(r,e,target,dt){
    e.contactDamage=false;
    e.hitFlash=Math.max(0,(e.hitFlash||0)-dt);
    e.stun=Math.max(0,(e.stun||0)-dt);e.slow=Math.max(0,(e.slow||0)-dt);
    if(e.stun>0){e.moving=false;return;}
    if(e.slow>0)dt*=.45;
    const type=ENEMIES[e.species];
    // Existing campaign/test actors have no survival AI state.
    if(!type||e.baseSpeed===undefined){e.contactDamage=true;E.chase(r,e,target,dt);return;}
    const lunge=e.isBoss?null:LUNGES[e.species];
    e.contactDamage=!['warning','recover','feint'].includes(e.mode)&&
      (!(lunge||['goose','owl','cuca'].includes(e.species))||e.mode==='charge');
    const ageBefore=e.age;
    e.rally=Math.max(0,(e.rally||0)-dt);
    e.age+=dt;e.timer-=dt*(e.mode==='hunt'?1+Math.min(1,pressure(r)*.12):1);e.speed=e.baseSpeed*(e.rally>0?1.18:1);
    const distance=gap(e,target),dx=(target.x-e.x)/(distance||1),dy=(target.y-e.y)/(distance||1);
    if(bossPattern(r,e,target,dt,dx,dy,distance))return;
    if(e.species==='owl'){
      if(e.mode==='warning'){
        e.moving=false;
        if(e.timer<=0){
          for(const other of r.enemies)if(other!==e&&other.species!=='owl'&&gap(e,other)<240)other.rally=3;
          enemySound(r,e,'attack');
          const trees=r.obstacles.filter(o=>o.kind==='tree').map(o=>({x:o.x+o.w/2,y:o.y+o.h+35}));
          const nearest=(a,b)=>gap(e,a)-gap(e,b),alternatives=[...trees.sort(nearest),...[...r.locations].sort(nearest)];
          e.perch=alternatives.filter(p=>gap(e,p)>120&&M.clearCircle(r,p,e.r))
            .find(p=>M.route(r.layout,e,p,e.r).length)||{x:e.x,y:e.y};
          e.mode='recover';e.timer=3.2;
        }
      }else if(e.mode==='recover'){
        E.chase(r,e,e.perch||e,dt);
        if(e.timer<=0||gap(e,e.perch||e)<8){e.mode='hunt';e.timer=3.8;}
      }else if(e.timer<=0&&distance<400&&M.clearSegment(r,e,target,0)){
        e.mode='warning';e.timer=1.15;e.dx=dx;e.dy=dy;e.moving=false;enemySound(r,e,'warn');
      }else{
        if(distance>210)E.chase(r,e,target,dt);else e.moving=false;
      }
      return;
    }
    if(e.species==='amanda'&&e.mode==='feint'){
      const escape={x:e.x-dx*90-dy*65*e.side,y:e.y-dy*90+dx*65*e.side};
      if(M.clearCircle(r,escape,e.r))E.chase(r,e,escape,dt);else e.moving=false;
      if(e.timer<=0){e.mode='hunt';e.timer=0;e.side*=-1;}
      return;
    }
    if(e.species==='amanda'&&e.mode==='hunt'&&e.timer>0&&e.timer<.65&&distance<300){
      e.mode='feint';e.timer=.6;e.contactDamage=false;enemySound(r,e,'warn');return;
    }
    if(lunge||['cuca','crow','amanda'].includes(e.species)){
      if(e.mode==='warning'){
        e.moving=false;
        if(e.species!=='cuca')aimLunge(r,e,target,lunge?lunge.speed:e.species==='crow'?390:340);
        if(e.timer<=0){
          enemySound(r,e,'attack');
          if(e.species==='cuca'){
            enemyVolley(r,e,'spell',[-.22,0,.22],155*(1+Math.min(.65,pressure(r)*.08)),3.2);
            e.mode='recover';e.timer=1.5;
          }else {e.mode='charge';e.timer=e.chargeTime;e.contactDamage=true;}
        }
        return;
      }
      if(e.mode==='charge'){
        const speed=lunge?lunge.speed:e.species==='crow'?390:340;
        const moved=E.move(r,e,e.aimX*speed*dt,e.aimY*speed*dt);
        if(e.timer<=0||moved<speed*dt*.6){e.mode='recover';e.timer=lunge?lunge.recovery:e.species==='crow'?1.6:1.2;e.contactDamage=false;}
        return;
      }
      if(e.mode==='recover'){
        e.moving=false;if(e.timer<=0){e.mode='hunt';e.timer=2.4;}return;
      }
      if(e.timer<=0&&distance<(lunge?lunge.range:390)&&M.clearSegment(r,e,target,lunge?0:e.r)&&attackReady(r,e,target)){
        e.mode='warning';e.timer=lunge?lunge.warning:e.species==='cuca'?1.05:e.species==='crow'?.4:.45;
        e.aimX=dx;e.aimY=dy;e.dx=dx;e.dy=dy;e.moving=false;e.contactDamage=false;enemySound(r,e,'warn');
        if(e.species!=='cuca')aimLunge(r,e,target,lunge?lunge.speed:e.species==='crow'?390:340);
        return;
      }
    }
    if(['goose','cuca'].includes(e.species)&&distance<180){
      const retreat={x:e.x-dx*80-dy*45*e.side,y:e.y-dy*80+dx*45*e.side};
      if(M.clearCircle(r,retreat,e.r)&&M.clearSegment(r,e,retreat,e.r))E.chase(r,e,retreat,dt);else e.moving=false;
      return;
    }
    let goal=target;
    if(e.species==='wolf'&&distance>80){
      const lead=Math.min(.45,distance/(e.speed+160)),intercept={x:target.x+(target.vx||0)*lead,y:target.y+(target.vy||0)*lead};
      if(M.clearCircle(r,intercept,e.r))goal=intercept;
    }
    if(['fox','amanda','fuinha','curupira','boitata'].includes(e.species)&&distance>65){
      const side=e.species==='boitata'?Math.sin(e.age*3):e.side;
      const velocity=Math.hypot(target.vx||0,target.vy||0),forwardX=velocity>20?target.vx/velocity:dx,forwardY=velocity>20?target.vy/velocity:dy;
      const offset=(e.species==='amanda'?105:e.species==='fox'?70:e.species==='curupira'?100:40)*side*Math.min(1,(distance-50)/100);
      const lead=['fox','amanda','fuinha'].includes(e.species)?Math.min(.9,distance/(e.speed+160)):0;
      const flank={x:target.x+(target.vx||0)*lead-forwardY*offset,y:target.y+(target.vy||0)*lead+forwardX*offset};
      if(M.clearCircle(r,flank,e.r))goal=flank;
    }
    if(e.species==='fuinha')e.speed*=e.age%2.7<.5?1.5:.92;
    if(e.species==='curupira'&&e.timer<=0&&distance<330&&M.clearSegment(r,e,target,0)){
      hazard(r,target,'roots',e);e.timer=3.8;enemySound(r,e,'attack');
    }
    const before={x:e.x,y:e.y};E.chase(r,e,goal,dt);
    if(e.species==='mula-sem-cabeca')hoofprints(r,e,before);
    if(e.species==='fuinha'&&e.moving&&Math.floor(ageBefore/2.7)!==Math.floor(e.age/2.7))enemySound(r,e,'attack');
    if(e.species==='boitata'){
      if(e.moving&&(ageBefore===0||Math.floor(ageBefore/3)!==Math.floor(e.age/3)))enemySound(r,e,'attack');
      e.trailTimer-=dt;if(e.moving&&e.trailTimer<=0){hazard(r,e,'fire',e);e.trailTimer=.65;
      }
    }
  }
  function threats(r,dt){
    r.hazards=r.hazards.filter(h=>{
      h.arm-=dt;h.life-=dt;
      if(h.life>0&&h.arm<=0&&gap(h,r.player)<h.r+r.player.r&&M.clearSegment(r,h,r.player,0))E.hurt(r,h.source);
      return h.life>0;
    });
    r.hexes=r.hexes.filter(h=>{
      const old={x:h.x,y:h.y};h.x+=h.vx*dt;h.y+=h.vy*dt;h.life-=dt;h.traveled=(h.traveled||0)+gap(old,h);
      if(h.life<=0||!M.clearSegment(r,old,h,h.r||5))return false;
      if(segmentGap(r.player,old,h)<r.player.r+(h.r||6)){
        if(E.hurt(r,h.source)&&h.push){const speed=Math.hypot(h.vx,h.vy)||1;E.move(r,r.player,h.vx/speed*h.push,h.vy/speed*h.push);}
        return false;
      }
      return true;
    });
  }
  function damage(r,e,amount){
    if(!r.enemies.includes(e))return;
    e.health-=amount;
    // Continuous poison still deals every tick; its hit particles need only ten bursts per second.
    if(r.elapsed>=(e.hitFxUntil||0)){effect(r,e,'hurt');e.hitFxUntil=r.elapsed+.1;e.hitFlash=.08;}
    if(e.health>0)return;
    enemySound(r,e,'defeat');
    r.enemies.splice(r.enemies.indexOf(e),1);r.kills++;
    if(e.isBoss||r.elapsed>=(r.banterUntil||0)){
      r.banter=quip(r,e,false);r.banterUntil=r.elapsed+5;
    }
    const gems=r.pickups.filter(p=>p.kind==='xp');
    // ponytail: cap loose XP at 160; merge into the nearest gem beyond that.
    const reward=ENEMIES[e.species]?.xp||1;
    if(gems.length>=160)gems.reduce((a,b)=>gap(a,e)<gap(b,e)?a:b).value+=reward;
    else r.pickups.push({x:e.x,y:e.y,kind:'xp',value:reward});
    if(e.species==='cuca'){placeItem(r,'milk');say(r,'Cuca afastada! O caldeirão ficou sem dona.');}
    if(e.isSecretBoss){
      r.secretsDefeated.push(e.species);if(r.secretAltar)r.secretAltar.defeated=true;
      r.hazards=r.hazards.filter(h=>h.source?.species!==e.species);r.hexes=r.hexes.filter(h=>h.source?.species!==e.species);
      r.hp=Math.min(E.stats(r).maxHp,r.hp+2);addPoints(r,35+r.encounter*10);
      say(r,`SEGREDO VENCIDO! ${e.name}: +${35+r.encounter*10} pontos e até 2 corações!`);r.noticeTime=6;
    }else if(e.isBoss){r.defeatedBoss={species:e.species,name:e.name};r.bossesDefeated++;r.stageCleared=true;addPoints(r,20+r.encounter*5);say(r,`${e.name} vencido!`);}
    if(r.kills%12===0)placeItem(r,pick(r,GROUND_LOOT));
  }
  function collect(r,item){
    if(item.kind==='xp'){
      addPoints(r,item.value+rank(r,'harvest'));
    }else if(item.kind==='milk'){
      r.hp=Math.min(E.stats(r).maxHp,r.hp+2);say(r,'Leite Up! Até dois corações recuperados. O cogumelo tirou folga.');
    }
    r.effects.push({x:item.x,y:item.y,kind:'collect',visual:item.kind,color:item.kind==='xp'?'#9fe8e4':'#ffa6bf',time:.55});
  }
  function segmentGap(p,a,b){
    const dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy;
    const t=d?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/d)):0;
    return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);
  }
  function attack(r,dt){
    const p=r.player;
    for(const kind of ['cornshot','egg','sickle']){
      r.cooldowns[kind]=Math.max(0,r.cooldowns[kind]-dt);
      const rank=r.powers[kind]||0;if(!rank||consumed(r,kind)||r.cooldowns[kind]>0)continue;
      const power=strength(r)*(1+.35*(rank-1));
      const shot=(vx,vy,damage)=>r.shots.push({kind,x:p.x,y:p.y,vx,vy,damage,life:1.4*reach(r)});
      if(kind==='cornshot'){
        const targets=r.enemies.filter(e=>gap(p,e)<440*reach(r)&&M.clearSegment(r,p,e,4));
        if(!targets.length)continue;
        const target=targets.reduce((a,b)=>gap(a,p)<gap(b,p)?a:b),d=gap(p,target)||1;
        const weapon=SHOTS[p.skin],dx=(target.x-p.x)/d,dy=(target.y-p.y)/d;
        const spread=[...weapon.spread];
        if(rank>=3)spread.push(-.12,.12);
        for(let i=1;i<=(r.powers.volley||0);i++)spread.push(-.25*i,.25*i);
        for(const angle of spread)r.shots.push({...weapon,kind,color:HEROES[p.skin].color,x:p.x,y:p.y,
          vx:(dx*Math.cos(angle)-dy*Math.sin(angle))*weapon.speed,vy:(dx*Math.sin(angle)+dy*Math.cos(angle))*weapon.speed,
          level:rank,piercing:rank>=5||weapon.piercing,life:(weapon.life||1.25)*reach(r),blast:weapon.blast?weapon.blast*reach(r):0,damage:power*2*(weapon.damage||1),hits:new Set()});
        r.cooldowns[kind]=(.7-.12*(rank-1))*cadence(r);
      }else if(kind==='egg'){
        for(let i=0;i<6+rank*2;i++){const a=i*Math.PI*2/(6+rank*2);shot(Math.cos(a)*270,Math.sin(a)*270,power*1.5);Object.assign(r.shots.at(-1),{level:rank,piercing:rank>=3,blast:rank>=5?32*reach(r):0,hits:new Set()});}
        r.cooldowns[kind]=(3.2-.4*rank)*cadence(r);
      }else{
        const radius=(68+rank*16)*reach(r);
        for(const e of [...r.enemies])if(gap(p,e)<=radius+e.r&&M.clearSegment(r,p,e,0)){
          damage(r,e,power*2);if(rank>=3&&e.health>0){const d=gap(p,e)||1;E.move(r,e,(e.x-p.x)/d*25,(e.y-p.y)/d*25);}if(rank>=5)e.slow=2;
        }
        r.effects.push({x:p.x,y:p.y,kind:'sickle',time:.55,radius});r.cooldowns[kind]=(2.2-.3*rank)*cadence(r);
      }
      r.sounds.add(kind==='cornshot'?SHOTS[p.skin].visual:kind);
    }
    const sprouts=[];
    r.shots=r.shots.filter(s=>{
      if(s.homing){
        const target=r.enemies.includes(s.target)&&M.clearSegment(r,s,s.target,4)?s.target:
          r.enemies.filter(e=>!s.hits.has(e)&&M.clearSegment(r,s,e,4)).sort((a,b)=>gap(s,a)-gap(s,b))[0];
        if(target){const d=gap(s,target)||1,speed=Math.hypot(s.vx,s.vy);s.vx=(target.x-s.x)/d*speed;s.vy=(target.y-s.y)/d*speed;}
      }
      if(s.returning&&s.life<s.returning&&!s.returned){s.vx=-s.vx;s.vy=-s.vy;s.hits.clear();s.returned=true;}
      if(s.returned&&s.fusion==='reaper'){
        const d=gap(s,p)||1,speed=Math.hypot(s.vx,s.vy);s.vx=(p.x-s.x)/d*speed;s.vy=(p.y-s.y)/d*speed;
        if(d<18)return false;
      }
      const old={x:s.x,y:s.y};s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;
      if(s.returned&&s.fusion==='reaper')for(const item of r.pickups)if(item.kind==='xp'&&segmentGap(item,old,s)<32&&M.clearSegment(r,item,p,0)){
        item.x=s.x;item.y=s.y;
      }
      const impact=e=>{
        r.effects.push({x:e.x,y:e.y,kind:'impact',fusion:s.fusion,visual:s.visual||s.kind,color:s.color||POWERS[s.kind]?.color,time:.55});
        if(s.fusion==='solar'&&r.fusionFields.filter(f=>f.fusion==='solar').length<8){
          r.fusionFields.push({x:e.x,y:e.y,target:e,fusion:'solar',color:s.color,radius:85*reach(r),time:.65,duration:.65,damage:s.damage*2});
          damage(r,e,s.damage*.2);
        }else if(s.blast)blast(r,e,s.blast,s.damage,s.color,{visual:s.visual||'egg',fusion:s.fusion});else damage(r,e,s.damage);
        if(e.health>0){
          if(s.slow)e.slow=Math.max(e.slow||0,s.slow);
          if(s.stun)e.stun=Math.max(e.stun||0,s.stun);
          if(s.push){const speed=Math.hypot(s.vx,s.vy)||1;E.move(r,e,s.vx/speed*s.push,s.vy/speed*s.push);}
          if(s.dot)e.dot={time:s.dot.time,dps:s.dot.dps};
        }
        if(s.fusion==='popcorn'&&!s.popped){
          s.popped=true;
          for(const next of r.enemies.filter(n=>n!==e&&!s.hits.has(n)&&gap(e,n)<220*reach(r)&&M.clearSegment(r,e,n,4)).sort((a,b)=>gap(e,a)-gap(e,b)).slice(0,2)){
            const d=gap(e,next)||1;sprouts.push({...s,x:e.x,y:e.y,vx:(next.x-e.x)/d*420,vy:(next.y-e.y)/d*420,
              damage:s.damage*.6,blast:32*reach(r),bounces:3,life:2*reach(r),popped:true,hits:new Set([...s.hits,e])});
          }
        }
      };
      const hit=[...r.enemies].sort((a,b)=>gap(a,old)-gap(b,old)).find(e=>!s.hits?.has(e)&&segmentGap(e,old,s)<=e.r+5&&M.clearSegment(r,old,e,0));
      if(s.piercing){
        for(const e of [...r.enemies])if(!s.hits.has(e)&&segmentGap(e,old,s)<=e.r+5&&M.clearSegment(r,old,e,0)){
          s.hits.add(e);impact(e);
        }
      }else if(hit){
        impact(hit);s.hits?.add(hit);
        if(s.bounces>0){
          const next=r.enemies.filter(e=>!s.hits.has(e)&&gap(hit,e)<220*reach(r)&&M.clearSegment(r,hit,e,4)).sort((a,b)=>gap(hit,a)-gap(hit,b))[0];
          if(next){const d=gap(hit,next)||1,speed=Math.hypot(s.vx,s.vy);s.x=hit.x;s.y=hit.y;s.vx=(next.x-hit.x)/d*speed;s.vy=(next.y-hit.y)/d*speed;s.bounces--;return s.life>0;}
        }
      }
      return (s.piercing||!hit)&&s.life>0&&M.clearSegment(r,old,s,4);
    });
    r.shots.push(...sprouts);
  }
  function pulse(r,p,radius,color,extra={}){r.effects.push({x:p.x,y:p.y,kind:'hero',time:.55,radius,color,...extra});}
  function blast(r,p,radius,power,color,extra={}){
    r.sounds.add('explosion');
    pulse(r,p,radius,color,extra);
    for(const e of [...r.enemies])if(gap(p,e)<radius+e.r&&M.clearSegment(r,p,e,0))damage(r,e,power);
  }
  function claws(r){return [0,Math.PI].map(a=>({x:r.player.x+Math.cos(r.elapsed*3+a)*65,y:r.player.y+Math.sin(r.elapsed*3+a)*65}));}
  function orbits(r){const count=fused(r,'fortress')?6:rank(r,'orbit')?rank(r,'orbit')+1:0;return Array.from({length:count},(_,i)=>{
    const a=r.elapsed*3+i*Math.PI*2/count,radius=(fused(r,'fortress')?105:78)*reach(r);
    return {x:r.player.x+Math.cos(a)*radius,y:r.player.y+Math.sin(a)*radius};
  });}
  function powersAttack(r,dt){
    const p=r.player,power=strength(r),range=reach(r);
    for(const e of [...r.enemies])if(e.dot){
      damage(r,e,e.dot.dps*Math.min(dt,e.dot.time));e.dot.time-=dt;if(e.dot.time<=0)e.dot=null;
    }
    const active=['rear','cross','spiral','sniper','homing','boomerang','ricochet','fireball','frost','venom','thunder','mines','orbit','quake','regen','shield'];
    for(const id of active){
      const n=rank(r,id);if(!n||consumed(r,id))continue;
      r.cooldowns[id]=Math.max(0,(r.cooldowns[id]||0)-dt);if(r.cooldowns[id]>0)continue;
      const targets=r.enemies.filter(e=>gap(p,e)<480*range&&M.clearSegment(r,p,e,4)).sort((a,b)=>gap(p,a)-gap(p,b));
      const target=targets[0],angle=target?Math.atan2(target.y-p.y,target.x-p.x):Math.atan2(p.dy,p.dx);
      const color=POWERS[id].color,hit=power*(1+.4*(n-1));
      let delay=2;
      const shoot=(a,extra={})=>r.shots.push({kind:id,visual:POWERS[id].visual,color,x:p.x,y:p.y,
        level:n,vx:Math.cos(a)*360,vy:Math.sin(a)*360,damage:hit*2,life:1.5*range,hits:new Set(),...extra});
      if(['sniper','homing','boomerang','ricochet','fireball','frost','venom','thunder'].includes(id)&&!target)continue;
      if(id==='rear'){
        for(let i=0;i<n;i++)shoot(Math.atan2(p.dy,p.dx)+Math.PI+(i-(n-1)/2)*.22);delay=1.4;
      }else if(id==='cross'){
        for(let i=0,total=n>=3?8:4;i<total;i++)shoot(i*Math.PI*2/total,{piercing:true,slow:n>=5?2:0});
      }else if(id==='spiral'){
        for(let i=0;i<6+n*2;i++)shoot(r.elapsed+i*Math.PI*2/(6+n*2),{piercing:n>=5});delay=3;
      }else if(id==='sniper')for(const offset of n>=3?[-.08,.08]:[0])shoot(angle+offset,{vx:Math.cos(angle+offset)*700,vy:Math.sin(angle+offset)*700,damage:hit*5,piercing:true,blast:n>=5?45*range:0});
      else if(id==='homing'){for(let i=0;i<n;i++)shoot(angle+(i-(n-1)/2)*.35,{homing:true});delay=2.4;}
      else if(id==='boomerang')for(const offset of n>=5?[-.25,0,.25]:[0])shoot(angle+offset,{piercing:true,returning:.75*range});
      else if(id==='ricochet')shoot(angle,{bounces:n+1,life:3*range});
      else if(id==='fireball'){for(const offset of n>=3?[-.2,0,.2]:[0])shoot(angle+offset,{blast:65*range,dot:{time:3,dps:hit}});delay=3;}
      else if(id==='frost'){for(let i=0,total=n>=5?7:n>=3?5:3;i<total;i++)shoot(angle+(i-(total-1)/2)*.22,{slow:1+n,damage:hit});}
      else if(id==='venom')shoot(angle,{dot:{time:4,dps:hit*1.5},piercing:n>=3,blast:n>=5?55*range:0});
      else if(id==='thunder'){
        let from=p;const remaining=[...targets];
        for(let i=0;i<n+2;i++){
          const next=remaining.find(e=>gap(from,e)<(i?170:480)*range&&M.clearSegment(r,from,e,0));if(!next)break;
          pulse(r,from,0,color,{toX:next.x,toY:next.y});damage(r,next,hit*2.5);if(n>=5)next.stun=1;remaining.splice(remaining.indexOf(next),1);from=next;
        }delay=3.5;
      }else if(id==='mines'){
        for(const offset of n>=3?[-18,18]:[0])if(r.mines.length<12&&M.clearCircle(r,{x:p.x+offset,y:p.y},8))r.mines.push({x:p.x+offset,y:p.y,arm:.5,life:10,power:hit*4,radius:n>=5?120:88});delay=3;
      }else if(id==='orbit'){
        for(const e of targets)if(orbits(r).some(c=>gap(c,e)<e.r+18)){damage(r,e,hit);r.sounds.add('claw');}delay=.35;
      }else if(id==='quake'){
        const radius=(100+n*20)*range;pulse(r,p,radius,color,{visual:'bark'});
        for(const e of targets)if(gap(p,e)<radius+e.r){const d=gap(p,e)||1;damage(r,e,hit*3);if(n>=5)e.stun=1;if(e.health>0)E.move(r,e,(e.x-p.x)/d*65,(e.y-p.y)/d*65);}delay=4;
      }else if(id==='regen'){
        r.hp=Math.min(E.stats(r).maxHp,r.hp+1);pulse(r,p,35,color);delay=20-n*4;
      }else if(id==='shield'){p.shield=true;pulse(r,p,35,color);delay=16-n*3;}
      r.cooldowns[id]=delay*(['regen','shield'].includes(id)?1:cadence(r));
      if(id!=='orbit')r.sounds.add(POWERS[id].visual||id);
    }
  }
  function fusionAttack(r,dt){
    const p=r.player,power=strength(r),range=reach(r);
    r.fusionFields=r.fusionFields.filter(f=>{
      if(f.fusion==='solar'&&r.enemies.includes(f.target)){f.x=f.target.x;f.y=f.target.y;}
      f.time-=dt;
      if(f.fusion==='meteor'||f.fusion==='solar'){
        if(f.fusion==='meteor')for(const e of r.enemies)if(gap(f,e)<f.radius+e.r&&M.clearSegment(r,f,e,0)){
          const d=gap(f,e);if(d>10)E.move(r,e,(f.x-e.x)/d*110*dt,(f.y-e.y)/d*110*dt);
        }
        if(f.time>0)return true;
        blast(r,f,f.radius,f.damage,f.color,{visual:f.fusion==='meteor'?'carrot':'egg',fusion:f.fusion});
        if(f.fusion==='solar')for(const e of r.enemies)if(gap(f,e)<f.radius+e.r&&M.clearSegment(r,f,e,0))e.dot={time:4,dps:power*3};
        return false;
      }
      f.pulse=Math.max(0,(f.pulse||0)-dt);const beat=f.pulse<=0;
      if(beat)f.pulse=f.fusion==='storm'?.6:.7;
      for(const e of [...r.enemies])if((f.fusion==='blizzard'?segmentGap(e,f.a,f.b)<24*range+e.r:gap(f,e)<f.radius+e.r)&&M.clearSegment(r,f,e,0)){
        if(f.fusion==='storm'){
          if(beat){pulse(r,f,0,f.color,{toX:e.x,toY:e.y,fusion:'storm'});damage(r,e,f.damage);e.stun=.7;}
        }else{
          damage(r,e,f.damage*dt);
          if(f.fusion==='blizzard')e.slow=Math.max(e.slow||0,5);
          else{
            e.dot={time:2,dps:power*2};
            if(beat&&e.health>0){const d=gap(f,e),away=gap(p,e)||1;E.move(r,e,(d?(e.x-f.x)/d:(e.x-p.x)/away)*40,(d?(e.y-f.y)/d:(e.y-p.y)/away)*40);}
          }
        }
      }
      if(beat&&f.fusion==='cauldron')pulse(r,f,f.radius,f.color,{visual:'bark'});
      return f.time>0;
    });
    if(fused(r,'fortress')){
      if(r.fortressRetaliation){
        r.fortressRetaliation=false;
        for(let i=0;i<6;i++){const a=r.elapsed*3+i*Math.PI/3;r.shots.push({kind:'fusion',fusion:'fortress',visual:'claw',color:FUSIONS.fortress.color,
          x:p.x,y:p.y,vx:Math.cos(a)*420,vy:Math.sin(a)*420,damage:power*10,life:1.1*range,piercing:true,stun:.6,push:60,hits:new Set()});}
        r.sounds.add('claw');pulse(r,p,105*range,FUSIONS.fortress.color,{visual:'claw',fusion:'fortress'});
      }
      r.cooldowns.fortressShield-=dt;
      if(r.cooldowns.fortressShield<=0){p.shield=true;r.cooldowns.fortressShield=4;r.sounds.add('shield');pulse(r,p,105*range,FUSIONS.fortress.color,{fusion:'fortress',visual:'claw'});}
    }
    for(const id of r.fusions){
      r.cooldowns[id]=Math.max(0,(r.cooldowns[id]||0)-dt);if(r.cooldowns[id]>0)continue;
      const recipe=FUSIONS[id],targets=r.enemies.filter(e=>gap(p,e)<520*range&&M.clearSegment(r,p,e,4)).sort((a,b)=>gap(p,a)-gap(p,b));
      if(!targets.length)continue;
      const target=targets[0],angle=Math.atan2(target.y-p.y,target.x-p.x),color=recipe.color;
      const fieldCount=()=>r.fusionFields.filter(f=>f.fusion===id).length;
      const shoot=(a,extra={})=>r.shots.push({kind:'fusion',fusion:id,visual:recipe.visual,color,x:p.x,y:p.y,
        vx:Math.cos(a)*420,vy:Math.sin(a)*420,damage:power*7,life:2*range,hits:new Set(),...extra});
      if(id==='solar')for(let i=0;i<4;i++)shoot(angle+(i-1.5)*.35,{homing:true,target:targets[i%targets.length],damage:power*10});
      else if(id==='reaper')for(const a of [-.3,0,.3])shoot(angle+a,{piercing:true,returning:range,damage:power*9});
      else if(id==='blizzard'){
        const d=Math.hypot(p.dx,p.dy)||1,dx=p.dx/d,dy=p.dy/d,x=p.x-dx*25,y=p.y-dy*25;
        if(fieldCount()<3)r.fusionFields.push({x,y,a:{x:x-dy*150*range,y:y+dx*150*range},b:{x:x+dy*150*range,y:y-dx*150*range},
          fusion:id,color,radius:24*range,time:2.8,duration:2.8,damage:power*18});
      }else if(id==='popcorn')for(let i=0,n=2+rank(r,'volley')*2;i<n;i++)shoot(angle+(i-(n-1)/2)*.13,{bounces:3,blast:48*range,damage:power*10,life:3*range});
      else if(id==='storm'){
        for(let i=0;i<4;i++){
          const a=angle+i*Math.PI/2,x=p.x+Math.cos(a)*110*range,y=p.y+Math.sin(a)*110*range;
          if(fieldCount()<4&&M.clearSegment(r,p,{x,y},4))r.fusionFields.push({x,y,fusion:id,color,radius:80*range,time:2.5,duration:2.5,damage:power*16,pulse:0});
        }
      }else if(id==='meteor'||id==='cauldron'){
        for(const e of targets.slice(0,3))if(fieldCount()<3)r.fusionFields.push({x:e.x,y:e.y,fusion:id,color,
          radius:(id==='meteor'?105:80)*range,time:id==='meteor'?.55:3,duration:id==='meteor'?.55:3,damage:power*(id==='meteor'?22:7)});
      }else if(id==='fortress'){
        for(const e of targets)if(orbits(r).some(c=>gap(c,e)<e.r+27)){
          damage(r,e,power*5);r.sounds.add('claw');pulse(r,e,30,color,{visual:'claw',fusion:id});
        }
      }
      r.cooldowns[id]=recipe.delay*cadence(r);
      if(id!=='fortress')r.sounds.add(recipe.visual);
    }
  }
  function heroAttack(r,dt){
    const p=r.player,id=p.skin,hero=HEROES[id],power=strength(r),range=reach(r);
    r.heroCooldown=Math.max(0,r.heroCooldown-dt);r.mineCooldown=Math.max(0,r.mineCooldown-dt);
    r.mines=r.mines.filter(m=>{
      m.arm-=dt;m.life-=dt;
      if(m.arm<=0&&r.enemies.some(e=>gap(m,e)<42+e.r&&M.clearSegment(r,m,e,0))){blast(r,m,(m.radius||88)*range,m.power||4*power,hero.color,{visual:'carrot'});return false;}
      return m.life>0;
    });
    if(id==='astronaut'){
      if(p.dashTime>0&&r.mineCooldown===0&&r.mines.length<12){r.mines.push({x:p.x,y:p.y,arm:.5,life:8});r.mineCooldown=.1;r.sounds.add('carrot');}
      return;
    }
    if(r.heroCooldown>0)return;
    const targets=r.enemies.filter(e=>gap(p,e)<420&&M.clearSegment(r,p,e,4)).sort((a,b)=>gap(p,a)-gap(p,b)),target=targets[0];
    if(!target&&id!=='silkie'&&id!=='robocop')return;
    r.heroCooldown=hero.cooldown*cadence(r);
    if(id!=='robocop')r.sounds.add({classic:'egg',silkie:'feather',blue:'lightning',punk:'water',priest:'bark',goose:'honk'}[id]);
    const distance=target?gap(p,target)||1:1,dx=target?(target.x-p.x)/distance:0,dy=target?(target.y-p.y)/distance:1;
    if(id==='classic'||id==='punk'){
      for(const angle of id==='punk'?[-.2,0,.2]:[0])r.shots.push({kind:'hero',visual:id==='classic'?'egg':'water',color:hero.color,x:p.x,y:p.y,
        vx:(dx*Math.cos(angle)-dy*Math.sin(angle))*330,vy:(dx*Math.sin(angle)+dy*Math.cos(angle))*330,
        life:1.4*range,damage:power*(id==='classic'?4:2),blast:id==='classic'?80*range:0,piercing:id==='punk',hits:new Set()});
    }else if(id==='silkie'){
      p.shield=true;pulse(r,p,150,hero.color,{visual:'feather'});
      for(const e of targets)if(gap(p,e)<150+e.r)e.slow=3;
    }else if(id==='blue'){
      let from=p;const remaining=[...targets];
      for(let i=0;i<4;i++){
        const next=remaining.filter(e=>gap(from,e)<(i?145:420)&&M.clearSegment(r,from,e,0)).sort((a,b)=>gap(from,a)-gap(from,b))[0];
        if(!next)break;
        pulse(r,from,0,hero.color,{toX:next.x,toY:next.y});damage(r,next,power*2.5);remaining.splice(remaining.indexOf(next),1);from=next;
      }
    }else if(id==='robocop'){
      for(const e of targets)if(claws(r).some(c=>gap(c,e)<e.r+15)){damage(r,e,power*1.5);r.sounds.add('claw');}
    }else if(id==='priest'){
      pulse(r,p,150,hero.color,{visual:'bark'});
      for(const e of targets)if(gap(p,e)<150+e.r){const d=gap(p,e)||1;damage(r,e,power*2);if(e.health>0)E.move(r,e,(e.x-p.x)/d*90,(e.y-p.y)/d*90);}
    }else if(id==='goose'){
      pulse(r,p,215,hero.color,{visual:'honk',angle:Math.atan2(dy,dx)});
      for(const e of targets){const d=gap(p,e)||1;if(d<215+e.r&&((e.x-p.x)*dx+(e.y-p.y)*dy)/d>.55){damage(r,e,power*2);e.stun=2;}}
    }
  }
  function tick(r,dt,input={}){
    if(r.phase!=='playing'||r.paused||!Number.isFinite(dt)||dt<=0)return;
    const positions=r.enemies.map(e=>({x:e.x,y:e.y,traveled:e.traveled}));
    const hp=r.hp,shield=r.player.shield;
    dt=Math.min(.05,dt);E.tick(r,dt,input,moveEnemy);if(r.phase!=='playing')return;
    const secretFight=r.enemies.some(e=>e.isSecretBoss);
    if(!secretFight)r.stageElapsed+=dt;
    const altar=r.secretAltar;
    if(altar&&!altar.discovered&&gap(r.player,altar)<190&&M.clearSegment(r,r.player,altar,0)){
      altar.discovered=true;say(r,`${altar.hint} Aproxime-se e use E / Despertar para um desafio opcional.`);r.noticeTime=6;
    }
    // Pairwise body contact keeps the capped horde from collapsing into one sprite.
    for(let i=0;i<r.enemies.length;i++)for(let j=i+1;j<r.enemies.length;j++){
      const a=r.enemies[i],b=r.enemies[j],d=gap(a,b),spacing=a.r+b.r-4;
      if(d>=spacing)continue;
      const lockedA=a.mode==='warning'||a.mode==='charge',lockedB=b.mode==='warning'||b.mode==='charge';
      if(lockedA&&lockedB)continue;
      const dx=d?(b.x-a.x)/d:Math.cos(i+j),dy=d?(b.y-a.y)/d:Math.sin(i+j),push=(spacing-d)/(lockedA||lockedB?1:2);
      // Other bodies yield to the advertised attack corridor.
      if(!lockedA)E.move(r,a,-dx*push,-dy*push);
      if(!lockedB)E.move(r,b,dx*push,dy*push);
    }
    r.enemies.forEach((e,i)=>{
      const dx=e.x-positions[i].x,dy=e.y-positions[i].y,distance=Math.hypot(dx,dy);e.moving=distance>.01;
      // Feet follow the final displacement, excluding contact pushes cancelled in this tick.
      e.traveled=positions[i].traveled+distance;
      if(e.moving){e.dx=dx;e.dy=dy;}
    });
    threats(r,dt);if(r.phase!=='playing')return;
    if(shield&&!r.player.shield&&fused(r,'fortress'))r.fortressRetaliation=true;
    if(r.hp<hp&&rank(r,'thorns'))blast(r,r.player,135*reach(r),6*rank(r,'thorns')*strength(r),POWERS.thorns.color,{visual:'claw'});
    if(r.stageElapsed>=style(r).seconds&&!r.bossSpawned&&!secretFight)spawnBoss(r);
    r.spawnTimer-=dt;
    if(r.spawnTimer<=0){
      spawnWave(r);
      r.spawnTimer=r.bossSpawned?Math.max(2,4.5-pressure(r)*.3):Math.max(.65,(3.2-wave(r)*.2)/(1+pressure(r)*.22));
      r.spawnTimer*=style(r).spawn;
    }
    // Summons are queued until after the movement snapshot, like ordinary spawns.
    for(const e of r.enemies)if(e.callPack){
      e.callPack=false;spawnWave(r,'wolf',e.isBoss&&e.health<e.maxHealth*.5?4:2);
      for(const other of r.enemies)if(other!==e&&gap(e,other)<300)other.rally=3;
    }
    r.itemTimer-=dt;
    if(r.itemTimer<=0){const kind=pick(r,GROUND_LOOT);if(kind!=='milk'||r.pickups.filter(p=>p.kind==='milk').length<2)placeItem(r,kind);r.itemTimer=20;}
    powersAttack(r,dt);fusionAttack(r,dt);heroAttack(r,dt);attack(r,dt);
    r.pickups=r.pickups.filter(item=>{
      const d=gap(item,r.player);if(!M.clearSegment(r,item,r.player,0))return true;
      if(d<28){collect(r,item);return false;}
      if(item.kind==='xp'&&d<100+60*rank(r,'magnet')){const step=Math.min(d,320*dt);item.x+=(r.player.x-item.x)/d*step;item.y+=(r.player.y-item.y)/d*step;}
      return true;
    });
    if(r.stageCleared){
      r.player.moving=false;r.phase=r.encounter===STAGES.length-1?'won':'stage-clear';
      if(r.phase==='won')return;
    }
    openDraft(r);
  }
  return Object.freeze({newRun,tick,choose,reroll,nextStage,awaken,canAwaken,SECRET_BOSSES,fuse,canFuse,consumed,FUSIONS,quip,QUIPS,POWERS,STAGES,HEROES,SHOTS,ENEMIES,STYLES,style,maxRank,powerKind,powerText,slots,DURATION,MAX_ENEMIES,wave,victories,xpNeeded,claws,orbits});
});
