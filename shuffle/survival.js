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
    shield:{name:'Casca Grossa',text:'Renova um escudo a cada 13 s; reduz 3 s por nível.',visual:'egg',color:'#ede8c7'},
    harvest:{name:'Safra Dobrada',text:'+1 ponto por cristal coletado, por nível.',visual:'xp',color:'#b6ed9e'},
    thorns:{name:'Abraço de Espinhos',text:'Ao perder vida, causa 6 de dano ao redor por nível.',visual:'claw',color:'#d6c69a'}
  });
  const FUSIONS=Object.freeze({
    solar:{name:'Sol de Omelete',items:['egg','fireball'],visual:'egg',color:'#ffad55',text:'Seis ovos solares perseguem inimigos, explodem e deixam queimaduras.',delay:2.4},
    reaper:{name:'Ceifadora de Mundos',items:['sickle','boomerang'],visual:'sickle',color:'#99ffe0',text:'Três foices gigantes atravessam a horda e voltam cortando outra vez.',delay:1.5},
    storm:{name:'Tempestade do Poleiro',items:['thunder','cross'],visual:'lightning',color:'#75e4ff',text:'Raios saltam entre oito inimigos, paralisam e provocam explosões elétricas.',delay:2.2},
    blizzard:{name:'Nevasca da Midori',items:['frost','spiral'],visual:'feather',color:'#c3d7ff',text:'Dezesseis penas de gelo atravessam inimigos e desaceleram por cinco segundos.',delay:2},
    meteor:{name:'Cenoura Orbital',items:['sniper','mines'],visual:'carrot',color:'#ffbf72',text:'Marca três alvos: cenouras caem do céu e explodem após meio segundo.',delay:2.5},
    cauldron:{name:'Caldeirão Cataclísmico',items:['venom','quake'],visual:'water',color:'#c3f986',text:'Abre poças de veneno sob três alvos, causando dano contínuo por três segundos.',delay:3},
    fortress:{name:'Fortaleza de Garras',items:['orbit','shield'],visual:'claw',color:'#f0baff',text:'Seis garras maiores defendem seu espaço. Um escudo se renova a cada quatro segundos.',delay:.25},
    popcorn:{name:'Milhopocalipse',items:['cornshot','ricochet'],visual:'cornshot',color:'#ffe18b',text:'Cinco grãos explosivos saltam entre até sete inimigos. Contra Milho acrescenta mais tiros.',delay:.8}
  });
  const fused=(r,id)=>r.fusions.includes(id);
  const consumed=(r,id)=>r.fusions.some(f=>FUSIONS[f].items.includes(id));
  function canFuse(r,id){return r.mode==='survival'&&r.phase==='playing'&&Object.hasOwn(FUSIONS,id)&&!fused(r,id)&&FUSIONS[id].items.every(item=>rank(r,item)>=3);}
  function fuse(r,id){
    if(!canFuse(r,id))return false;
    r.fusions.push(id);r.cooldowns[id]=0;
    const recipe=FUSIONS[id];
    if(id==='fortress'){r.player.shield=true;r.cooldowns.fortressShield=4;}
    r.effects.push({x:r.player.x,y:r.player.y,kind:'fusion',fusion:id,visual:recipe.visual,color:recipe.color,radius:140,time:1.2,duration:1.2,
      ingredients:recipe.items.map(item=>POWERS[item].visual||item)});
    say(r,`FUSÃO! ${recipe.name}: ${recipe.text}`);r.noticeTime=6;
    return true;
  }
  const STAGES=Object.freeze([
    {name:'Pomar em polvorosa',boss:'goose',title:'Panto, fiscal da colheita',hp:60},
    {name:'Milharal dos uivos',boss:'wolf',title:'Baltazar, o sem-almoço',hp:100},
    {name:'Trilha das emboscadas',boss:'fox',title:'Lorenzo, mestre das emboscadas',hp:150},
    {name:'Bosque dos desaforos',boss:'fuinha',title:'Fuinha, ligeira do milharal',hp:210},
    {name:'Última luz da fazenda',boss:'wolf',title:'Baltazar, a última investida',hp:280}
  ]);
  const SECRET_BOSSES=Object.freeze([
    {species:'mula-sem-cabeca',title:'Mula sem Cabeça, tropel esquecido',mark:'♨',hint:'Uma ferradura quente marca o chão.'},
    {species:'curupira',title:'Curupira, dono das pegadas',mark:'✦',hint:'Pegadas ao contrário terminam num selo.'},
    {species:'boitata',title:'Boitatá, chama adormecida',mark:'∞',hint:'Um rastro luminoso forma uma espiral.'},
    {species:'cuca',title:'Cuca, segredo do caldeirão',mark:'☽',hint:'Há um cheiro de poção junto desta marca.'}
  ]);
  const secretSpecies=id=>SECRET_BOSSES.some(b=>b.species===id);
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
    pulse(r,altar,150,type.color,{visual:'lightning'});
    say(r,`CHEFE SECRETO! ${altar.title}. O relógio da fase espera este desafio.`);r.noticeTime=6;return true;
  }
  const GROUND_LOOT=['xp','xp','xp','milk'];
  const rank=(r,id)=>r.powers[id]||0;
  const strength=r=>(1+.15*(r.level-1))*(1+.2*rank(r,'might'));
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
      fuinha:{name:'Fuinha',win:['Pequena no tamanho, enorme no desaforo!','Passei tão rápido que a vitória nem me viu.'],lose:['Minhas pernas pediram demissão no meio do turno.','Eu ia fugir com elegância. Faltou a elegância.']},
      wolf:{name:'Lobo',win:['Quem ri por último tem o focinho maior!','Hoje eu soprei só para tirar a poeira da taça.'],lose:['Vou virar vegetariano. Até o próximo almoço.','Perdi para o almoço. Meu nutricionista vai surtar.']},
      goose:{name:'Ganso',win:['Passagem negada. Reclamações no meu bico!','Sou fiscal, juiz e buzina. Tudo concursado!'],lose:['Vou multar essa vitória por excesso de desaforo.','A porteira está aberta. Meu orgulho, interditado.']},
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
  function newRun(seed,available=Object.keys(ENEMIES),skin='classic',wins=0){
    const r=E.newRun(seed);r.rng=M.seedFor(r.seed,17);
    r.mode='survival';r.stage=pick(r,[0,1,2,3,5,6,7,8]);r.hp=5;r.level=1;r.choices=[];
    E.beginStage(r);r.friends=[];r.enemies=[];
    r.player.skin=Object.hasOwn(HEROES,skin)?skin:'classic';
    Object.assign(r,{powers:{cornshot:1},cooldowns:{cornshot:0,egg:0,sickle:0},
      pickups:[],shots:[],hazards:[],hexes:[],mines:[],fusions:[],fusionFields:[],heroCooldown:1,mineCooldown:0,kills:0,xp:0,spawnTimer:0,itemTimer:15,locations:[],
      enemyTypes:Object.keys(ENEMIES).filter(id=>available.includes(id)),seenEnemies:[],
      score:0,pendingChoices:0,encounter:0,victories:victories(wins),stageElapsed:0,bossSpawned:false,stageCleared:false,bossesDefeated:0,secretsDefeated:[]});
    r.mapOrder=[r.stage,...[0,1,2,7].filter(id=>id!==r.stage).slice(0,3),9];
    prepareField(r);
    say(r,'Colete cristais de XP! Cada nível libera a escolha de um poder.');r.noticeTime=7;
    return r;
  }
  function prepareField(r){
    r.locations=[];
    for(const {a,b} of r.layout.roads)for(let t=0;t<=8;t++)r.locations.push({x:a.x+(b.x-a.x)*t/8,y:a.y+(b.y-a.y)*t/8});
    const first=[...r.locations].sort((a,b)=>gap(a,r.player)-gap(b,r.player)).find(p=>gap(p,r.player)>=75);
    r.pickups.push({...first,kind:'xp',value:5});
    const kinds=[...GROUND_LOOT,...GROUND_LOOT,'milk'];
    for(let i=kinds.length-1;i>0;i--){const j=Math.floor(random(r)*(i+1));[kinds[i],kinds[j]]=[kinds[j],kinds[i]];}
    for(const kind of kinds)placeItem(r,kind);
    prepareSecret(r);
  }
  function offer(r,exclude=[]){
    const pool=Object.keys(POWERS).filter(id=>rank(r,id)<3&&!exclude.includes(id));
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(random(r)*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    const fresh=pool.find(id=>!rank(r,id));
    if(fresh){pool.splice(pool.indexOf(fresh),1);pool.unshift(fresh);}
    return pool.slice(0,3);
  }
  function openDraft(r){
    if(!r.pendingChoices)return;
    r.choices=offer(r);
    if(!r.choices.length){r.pendingChoices=0;return;}
    r.phase='power-draft';r.rerolls=1;r.player.moving=false;
  }
  function addPoints(r,points){
    r.score+=points;r.xp+=points;
    while(r.xp>=xpNeeded(r)){
      r.xp-=xpNeeded(r);r.level++;r.pendingChoices++;r.hp=Math.min(E.stats(r).maxHp,r.hp+1);
    }
  }
  function grant(r,id){
    if(!Object.hasOwn(POWERS,id)||rank(r,id)>=3)return false;
    r.powers[id]=rank(r,id)+1;
    if(['boots','heart','dash','feather'].includes(id))r.skills[id]=rank(r,id);
    if(id==='heart')r.hp=Math.min(E.stats(r).maxHp,r.hp+1);
    if(id==='shield')r.player.shield=true;
    say(r,`${POWERS[id].name} ${rank(r,id)}/3: ${POWERS[id].text}`);return true;
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
    r.choices=[...alternatives,...r.choices].slice(0,3);r.rerolls--;return true;
  }
  function nextStage(r){
    if(r.phase!=='stage-clear'||r.encounter>=STAGES.length-1)return false;
    const skin=r.player.skin;r.encounter++;r.stage=r.mapOrder[r.encounter];
    E.beginStage(r);r.player.skin=skin;r.player.shield=rank(r,'shield')>0;r.friends=[];r.enemies=[];r.boss=null;
    Object.assign(r,{pickups:[],shots:[],hazards:[],hexes:[],mines:[],fusionFields:[],banter:null,stageElapsed:0,
      bossSpawned:false,stageCleared:false,spawnTimer:1,itemTimer:15});
    r.hp=Math.min(E.stats(r).maxHp,r.hp+2);prepareField(r);
    say(r,`Fase ${r.encounter+1}: ${STAGES[r.encounter].name}. O chefe chega em 60 s!`);return true;
  }
  function spawnBoss(r){
    const config=STAGES[r.encounter],species=r.enemyTypes.includes(config.boss)?config.boss:r.enemyTypes.find(id=>!secretSpecies(id));
    if(!species)return false;
    const type=ENEMIES[species],points=r.locations.filter(p=>gap(p,r.player)>300&&M.clearCircle(r,p,type.r));
    if(!points.length)return false;
    const p=pick(r,points),speed=type.speed*.85*(1+Math.min(.4,pressure(r)*.045));
    const health=config.hp*(1+r.encounter*.25+r.victories*.6);
    if(r.enemies.length>=MAX_ENEMIES)r.enemies.pop();
    r.enemies.push({...p,species,r:type.r,dx:0,dy:1,traveled:0,moving:false,
      health,maxHealth:health,speed,baseSpeed:speed,age:0,side:1,
      mode:'hunt',timer:1.5,trailTimer:0,route:[],routeTimer:0,routeTarget:null,
      isBoss:true,name:species===config.boss?config.title:`${type.name}, guardião da fase`});
    r.bossSpawned=true;say(r,`${r.enemies.at(-1).name}! Desvie dos ataques e derrote o chefe.`);return true;
  }
  function placeItem(r,kind){
    const points=r.locations.filter(p=>gap(p,r.player)>90&&r.pickups.every(item=>gap(p,item)>55));
    if(points.length&&r.pickups.length<160)r.pickups.push({...pick(r,points),kind,value:kind==='xp'?3:1});
  }
  function spawnWave(r){
    let points=r.locations.filter(p=>gap(p,r.player)>360&&r.enemies.every(e=>gap(p,e)>38));
    const count=Math.min(r.bossSpawned?2+Math.min(6,pressure(r)):2+wave(r)+Math.min(12,pressure(r)*2),MAX_ENEMIES-r.enemies.length);
    for(let i=0;i<count&&points.length;i++){
      const pool=r.enemyTypes.filter(id=>!secretSpecies(id)&&ENEMIES[id].wave<=wave(r)&&
        r.enemies.filter(e=>e.species===id).length<(ENEMIES[id].limit||MAX_ENEMIES));
      if(!pool.length)break;
      const p=pick(r,points),species=pool.find(id=>!r.seenEnemies.includes(id))||pick(r,pool),type=ENEMIES[species];
      const health=(type.hp+wave(r)*.3)*(1+r.encounter*.5+r.victories*.45);
      const speed=(type.speed+Math.min(24,wave(r)*2))*(1+Math.min(.4,pressure(r)*.045));
      r.enemies.push({...p,species,r:type.r,dx:0,dy:1,traveled:0,moving:false,
        health,maxHealth:health,speed,baseSpeed:speed,age:random(r)*3,side:random(r)<.5?-1:1,
        mode:'hunt',timer:1+random(r)*2,trailTimer:0,route:[],routeTimer:random(r)*.5,routeTarget:null});
      if(!r.seenEnemies.includes(species)){
        r.seenEnemies.push(species);if(type.wave>=3)say(r,`${type.name}: ${type.text}`);
      }
      effect(r,p,'spawn');points=points.filter(q=>gap(p,q)>38);
    }
  }
  function hazard(r,p,kind,source){
    // ponytail: at most 48 short-lived ground hazards, enough for the 48-enemy cap.
    if(r.hazards.length>=48||!M.clearCircle(r,p,12))return;
    r.hazards.push({x:p.x,y:p.y,kind,source:{species:source.species,name:source.name},r:kind==='roots'?29:18,arm:kind==='roots'?.95:.5,life:kind==='roots'?3:2.7});
  }
  function moveEnemy(r,e,target,dt){
    e.stun=Math.max(0,(e.stun||0)-dt);e.slow=Math.max(0,(e.slow||0)-dt);
    if(e.stun>0){e.moving=false;return;}
    if(e.slow>0)dt*=.45;
    const type=ENEMIES[e.species];
    // Existing campaign/test actors have no survival AI state.
    if(!type||e.baseSpeed===undefined){E.chase(r,e,target,dt);return;}
    e.age+=dt;e.timer-=dt*(e.mode==='hunt'||e.mode==='recover'?1+Math.min(1,pressure(r)*.12):1);e.speed=e.baseSpeed;
    const distance=gap(e,target),dx=(target.x-e.x)/(distance||1),dy=(target.y-e.y)/(distance||1);
    if(e.species==='mula-sem-cabeca'||e.species==='cuca'||e.isBoss&&['goose','wolf','fox','fuinha','boitata'].includes(e.species)){
      if(e.mode==='warning'){
        e.moving=false;
        if(e.timer<=0){
          if(e.species==='cuca'||e.isBoss&&e.species==='boitata'){
            for(const angle of e.isBoss?[-.6,-.3,0,.3,.6]:[-.22,0,.22])if(r.hexes.length<24){
              const x=e.aimX*Math.cos(angle)-e.aimY*Math.sin(angle),y=e.aimX*Math.sin(angle)+e.aimY*Math.cos(angle);
              const speed=155*(1+Math.min(.65,pressure(r)*.08));
              r.hexes.push({x:e.x,y:e.y,vx:x*speed,vy:y*speed,life:3.2,source:{species:e.species,name:e.name}});
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
      hazard(r,target,'roots',e);e.timer=3.8;
    }
    E.chase(r,e,goal,dt);
    if(e.species==='boitata'){
      e.trailTimer-=dt;if(e.moving&&e.trailTimer<=0){hazard(r,e,'fire',e);e.trailTimer=.65;}
    }
  }
  function threats(r,dt){
    r.hazards=r.hazards.filter(h=>{
      h.arm-=dt;h.life-=dt;
      if(h.life>0&&h.arm<=0&&gap(h,r.player)<h.r+r.player.r&&M.clearSegment(r,h,r.player,0))E.hurt(r,h.source);
      return h.life>0;
    });
    r.hexes=r.hexes.filter(h=>{
      const old={x:h.x,y:h.y};h.x+=h.vx*dt;h.y+=h.vy*dt;h.life-=dt;
      if(h.life<=0||!M.clearSegment(r,old,h,5))return false;
      if(segmentGap(r.player,old,h)<r.player.r+6){E.hurt(r,h.source);return false;}
      return true;
    });
  }
  function damage(r,e,amount){
    if(!r.enemies.includes(e))return;
    e.health-=amount;
    // Continuous poison still deals every tick; its hit particles need only ten bursts per second.
    if(r.elapsed>=(e.hitFxUntil||0)){effect(r,e,'hurt');e.hitFxUntil=r.elapsed+.1;}
    if(e.health>0)return;
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
        for(let i=1;i<=(r.powers.volley||0);i++)spread.push(-.25*i,.25*i);
        for(const angle of spread)r.shots.push({...weapon,kind,color:HEROES[p.skin].color,x:p.x,y:p.y,
          vx:(dx*Math.cos(angle)-dy*Math.sin(angle))*weapon.speed,vy:(dx*Math.sin(angle)+dy*Math.cos(angle))*weapon.speed,
          life:(weapon.life||1.25)*reach(r),blast:weapon.blast?weapon.blast*reach(r):0,damage:power*2*(weapon.damage||1),hits:new Set()});
        r.cooldowns[kind]=(.7-.12*(rank-1))*cadence(r);
      }else if(kind==='egg'){
        for(let i=0;i<6+rank*2;i++){const a=i*Math.PI*2/(6+rank*2);shot(Math.cos(a)*270,Math.sin(a)*270,power*1.5);}
        r.cooldowns[kind]=(3.2-.4*rank)*cadence(r);
      }else{
        const radius=(68+rank*16)*reach(r);
        for(const e of [...r.enemies])if(gap(p,e)<=radius+e.r&&M.clearSegment(r,p,e,0))damage(r,e,power*2);
        r.effects.push({x:p.x,y:p.y,kind:'sickle',time:.55,radius});r.cooldowns[kind]=(2.2-.3*rank)*cadence(r);
      }
    }
    r.shots=r.shots.filter(s=>{
      if(s.homing){
        const target=r.enemies.filter(e=>!s.hits.has(e)&&M.clearSegment(r,s,e,4)).sort((a,b)=>gap(s,a)-gap(s,b))[0];
        if(target){const d=gap(s,target)||1,speed=Math.hypot(s.vx,s.vy);s.vx=(target.x-s.x)/d*speed;s.vy=(target.y-s.y)/d*speed;}
      }
      if(s.returning&&s.life<s.returning&&!s.returned){s.vx=-s.vx;s.vy=-s.vy;s.hits.clear();s.returned=true;}
      const old={x:s.x,y:s.y};s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;
      const impact=e=>{
        r.effects.push({x:e.x,y:e.y,kind:'impact',fusion:s.fusion,visual:s.visual||s.kind,color:s.color||POWERS[s.kind]?.color,time:.55});
        if(s.blast)blast(r,e,s.blast,s.damage,s.color,{visual:s.visual||'egg',fusion:s.fusion});else damage(r,e,s.damage);
        if(e.health>0){
          if(s.slow)e.slow=Math.max(e.slow||0,s.slow);
          if(s.stun)e.stun=Math.max(e.stun||0,s.stun);
          if(s.push){const speed=Math.hypot(s.vx,s.vy)||1;E.move(r,e,s.vx/speed*s.push,s.vy/speed*s.push);}
          if(s.dot)e.dot={time:s.dot.time,dps:s.dot.dps};
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
  }
  function pulse(r,p,radius,color,extra={}){r.effects.push({x:p.x,y:p.y,kind:'hero',time:.55,radius,color,...extra});}
  function blast(r,p,radius,power,color,extra={}){
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
        vx:Math.cos(a)*360,vy:Math.sin(a)*360,damage:hit*2,life:1.5*range,hits:new Set(),...extra});
      if(['sniper','homing','boomerang','ricochet','fireball','frost','venom','thunder'].includes(id)&&!target)continue;
      if(id==='rear'){
        for(let i=0;i<n;i++)shoot(Math.atan2(p.dy,p.dx)+Math.PI+(i-(n-1)/2)*.22);delay=1.4;
      }else if(id==='cross'){
        for(let i=0;i<4;i++)shoot(i*Math.PI/2,{piercing:true});
      }else if(id==='spiral'){
        for(let i=0;i<6+n*2;i++)shoot(r.elapsed+i*Math.PI*2/(6+n*2));delay=3;
      }else if(id==='sniper')shoot(angle,{vx:Math.cos(angle)*700,vy:Math.sin(angle)*700,damage:hit*5,piercing:true});
      else if(id==='homing'){for(let i=0;i<n;i++)shoot(angle+(i-(n-1)/2)*.35,{homing:true});delay=2.4;}
      else if(id==='boomerang')shoot(angle,{piercing:true,returning:.75*range});
      else if(id==='ricochet')shoot(angle,{bounces:n+1,life:3*range});
      else if(id==='fireball'){shoot(angle,{blast:65*range,dot:{time:3,dps:hit}});delay=3;}
      else if(id==='frost'){for(const a of [-.22,0,.22])shoot(angle+a,{slow:1+n,damage:hit});}
      else if(id==='venom')shoot(angle,{dot:{time:4,dps:hit*1.5}});
      else if(id==='thunder'){
        let from=p;const remaining=[...targets];
        for(let i=0;i<n+2;i++){
          const next=remaining.find(e=>gap(from,e)<(i?170:480)*range&&M.clearSegment(r,from,e,0));if(!next)break;
          pulse(r,from,0,color,{toX:next.x,toY:next.y});damage(r,next,hit*2.5);remaining.splice(remaining.indexOf(next),1);from=next;
        }delay=3.5;
      }else if(id==='mines'){
        if(r.mines.length<12)r.mines.push({x:p.x,y:p.y,arm:.5,life:10,power:hit*4});delay=3;
      }else if(id==='orbit'){
        for(const e of targets)if(orbits(r).some(c=>gap(c,e)<e.r+18))damage(r,e,hit);delay=.35;
      }else if(id==='quake'){
        const radius=(100+n*20)*range;pulse(r,p,radius,color,{visual:'bark'});
        for(const e of targets)if(gap(p,e)<radius+e.r){const d=gap(p,e)||1;damage(r,e,hit*3);if(e.health>0)E.move(r,e,(e.x-p.x)/d*65,(e.y-p.y)/d*65);}delay=4;
      }else if(id==='regen'){
        r.hp=Math.min(E.stats(r).maxHp,r.hp+1);pulse(r,p,35,color);delay=20-n*4;
      }else if(id==='shield'){p.shield=true;pulse(r,p,35,color);delay=16-n*3;}
      r.cooldowns[id]=delay*(['regen','shield'].includes(id)?1:cadence(r));
    }
  }
  function fusionAttack(r,dt){
    const p=r.player,power=strength(r),range=reach(r);
    r.fusionFields=r.fusionFields.filter(f=>{
      f.time-=dt;
      if(f.fusion==='meteor'){
        if(f.time>0)return true;
        blast(r,f,f.radius,f.damage,f.color,{visual:'carrot',fusion:f.fusion});return false;
      }
      for(const e of [...r.enemies])if(gap(f,e)<f.radius+e.r&&M.clearSegment(r,f,e,0)){
        damage(r,e,f.damage*dt);e.dot={time:2,dps:power*2};
      }
      return f.time>0;
    });
    if(fused(r,'fortress')){
      r.cooldowns.fortressShield-=dt;
      if(r.cooldowns.fortressShield<=0){p.shield=true;r.cooldowns.fortressShield=4;pulse(r,p,105*range,FUSIONS.fortress.color,{fusion:'fortress',visual:'claw'});}
    }
    for(const id of r.fusions){
      r.cooldowns[id]=Math.max(0,(r.cooldowns[id]||0)-dt);if(r.cooldowns[id]>0)continue;
      const recipe=FUSIONS[id],targets=r.enemies.filter(e=>gap(p,e)<520*range&&M.clearSegment(r,p,e,4)).sort((a,b)=>gap(p,a)-gap(p,b));
      if(!targets.length)continue;
      const target=targets[0],angle=Math.atan2(target.y-p.y,target.x-p.x),color=recipe.color;
      const shoot=(a,extra={})=>r.shots.push({kind:'fusion',fusion:id,visual:recipe.visual,color,x:p.x,y:p.y,
        vx:Math.cos(a)*420,vy:Math.sin(a)*420,damage:power*7,life:2*range,hits:new Set(),...extra});
      if(id==='solar')for(let i=0;i<6;i++)shoot(angle+i*Math.PI/3,{homing:true,blast:85*range,dot:{time:4,dps:power*3}});
      else if(id==='reaper')for(const a of [-.3,0,.3])shoot(angle+a,{piercing:true,returning:range,damage:power*9});
      else if(id==='blizzard')for(let i=0;i<16;i++)shoot(angle+i*Math.PI/8,{piercing:true,slow:5,damage:power*12});
      else if(id==='popcorn')for(let i=0,n=5+rank(r,'volley')*2;i<n;i++)shoot(angle+(i-(n-1)/2)*.13,{bounces:6,blast:48*range,damage:power*5,life:3*range});
      else if(id==='storm'){
        let from=p;const remaining=[...targets];
        for(let i=0;i<8;i++){
          const next=remaining.filter(e=>r.enemies.includes(e)&&gap(from,e)<(i?220:520)*range&&M.clearSegment(r,from,e,0)).sort((a,b)=>gap(from,a)-gap(from,b))[0];if(!next)break;
          pulse(r,from,0,color,{toX:next.x,toY:next.y,fusion:id});next.stun=.8;
          blast(r,next,55*range,power*9,color,{visual:'lightning',fusion:id});remaining.splice(remaining.indexOf(next),1);from=next;
        }
      }else if(id==='meteor'||id==='cauldron'){
        for(const e of targets.slice(0,3))if(r.fusionFields.length<9)r.fusionFields.push({x:e.x,y:e.y,fusion:id,color,
          radius:(id==='meteor'?105:80)*range,time:id==='meteor'?.55:3,duration:id==='meteor'?.55:3,damage:power*(id==='meteor'?22:7)});
      }else if(id==='fortress'){
        for(const e of targets)if(orbits(r).some(c=>gap(c,e)<e.r+27)){
          damage(r,e,power*5);pulse(r,e,30,color,{visual:'claw',fusion:id});
        }
      }
      r.cooldowns[id]=recipe.delay*cadence(r);
    }
  }
  function heroAttack(r,dt){
    const p=r.player,id=p.skin,hero=HEROES[id],power=strength(r),range=reach(r);
    r.heroCooldown=Math.max(0,r.heroCooldown-dt);r.mineCooldown=Math.max(0,r.mineCooldown-dt);
    r.mines=r.mines.filter(m=>{
      m.arm-=dt;m.life-=dt;
      if(m.arm<=0&&r.enemies.some(e=>gap(m,e)<42+e.r&&M.clearSegment(r,m,e,0))){blast(r,m,88*range,m.power||4*power,hero.color,{visual:'carrot'});return false;}
      return m.life>0;
    });
    if(id==='astronaut'){
      if(p.dashTime>0&&r.mineCooldown===0&&r.mines.length<12){r.mines.push({x:p.x,y:p.y,arm:.5,life:8});r.mineCooldown=.1;}
      return;
    }
    if(r.heroCooldown>0)return;
    const targets=r.enemies.filter(e=>gap(p,e)<420&&M.clearSegment(r,p,e,4)).sort((a,b)=>gap(p,a)-gap(p,b)),target=targets[0];
    if(!target&&id!=='silkie'&&id!=='robocop')return;
    r.heroCooldown=hero.cooldown*cadence(r);
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
      for(const e of targets)if(claws(r).some(c=>gap(c,e)<e.r+15))damage(r,e,power*1.5);
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
    const hp=r.hp;
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
      const dx=d?(b.x-a.x)/d:Math.cos(i+j),dy=d?(b.y-a.y)/d:Math.sin(i+j),push=(spacing-d)/2;
      E.move(r,a,-dx*push,-dy*push);E.move(r,b,dx*push,dy*push);
    }
    r.enemies.forEach((e,i)=>{
      const dx=e.x-positions[i].x,dy=e.y-positions[i].y,distance=Math.hypot(dx,dy);e.moving=distance>.01;
      // Feet follow the final displacement, excluding contact pushes cancelled in this tick.
      e.traveled=positions[i].traveled+distance;
      if(e.moving){e.dx=dx;e.dy=dy;}
    });
    threats(r,dt);if(r.phase!=='playing')return;
    if(r.hp<hp&&rank(r,'thorns'))blast(r,r.player,135*reach(r),6*rank(r,'thorns')*strength(r),POWERS.thorns.color,{visual:'claw'});
    if(r.stageElapsed>=60&&!r.bossSpawned&&!secretFight)spawnBoss(r);
    r.spawnTimer-=dt;
    if(r.spawnTimer<=0){
      spawnWave(r);
      r.spawnTimer=r.bossSpawned?Math.max(3,7-pressure(r)*.5):Math.max(.65,(4.2-wave(r)*.25)/(1+pressure(r)*.22));
    }
    r.itemTimer-=dt;
    if(r.itemTimer<=0){if(r.pickups.filter(p=>p.kind==='milk').length<12)placeItem(r,pick(r,GROUND_LOOT));r.itemTimer=15;}
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
  return Object.freeze({newRun,tick,choose,reroll,nextStage,awaken,canAwaken,SECRET_BOSSES,fuse,canFuse,consumed,FUSIONS,quip,QUIPS,POWERS,STAGES,HEROES,SHOTS,ENEMIES,DURATION,MAX_ENEMIES,wave,victories,xpNeeded,claws,orbits});
});
