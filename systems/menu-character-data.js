/* The named guests and playable outfits each have their own comedy voice. */
const MenuCharacterData = {
  secret: {
    wolf:['Finalmente umas férias sem galinha!','Eu não autorizei esse passeio!','Eu pedi um lanche, não uma creche!'],
    chick:['Piu? Esse cachorro tem orelha estranha.','Piu! A babá chegou! Formar a fila!','Não foge, tio Baltazar! Falta a história!']
  },
  diets: {
    chicken:'grain',turkey:'grain',duck:'greens',goose:'greens',rabbit:'rabbitFood',
    sheep:'hay',lamb:'hay',horse:'hay',donkey:'hay',goat:'leaves',cow:'grass',
    pig:'vegetables',dog:'dogFood',cat:'catFood',owl:'crickets'
  },
  palette: {o:'#493727',a:'#9d6635',b:'#d1a04d',y:'#f4d171',h:'#ffe4a1',
    g:'#387139',l:'#81b94d',v:'#b6d479',r:'#cf632f',s:'#ee9a42',
    w:'#e9d6b0',d:'#7b412b',u:'#497b91',c:'#8cb3bc'},
  foods: {
    grain:{name:'grãos',pixels:[
      '................','................','.......oo.......','...oo.obyo.oo...',
      '..obyo.oo.obyo..','...oo..oo..oo...','.oo..obyo..oo...','obyo..oo..obyo..',
      '.oo..oo.oo.oo...','....obyo.obyo...','.....oo.oo......','................']},
    hay:{name:'feno',pixels:[
      '................','....b..b.b......','..obyybyybbo....','.obhyhybyhybo...',
      '.oybyhyaybyyo...','obhybyyayhyhbo..','oybyhybaybyhyo..','.oyhybyayhybo...',
      '..obyybabybo....','...obyyabyo.....','.....oooo.......','................']},
    rabbitFood:{name:'feno e folhas',pixels:[
      '................','.....oo.........','....oglo.oo.....','...oglvloglo....',
      '....ogllgglo....','...bbogggob.....','..obyhybyybo....','.obhyhybyhybo...',
      '..obyhyybybo....','...obyybybo.....','....oooooo......','................']},
    greens:{name:'folhas e verduras',pixels:[
      '................','....oo...oo.....','...oglo.oglo....','..oglvooglvlo...',
      '..oglvloglvlo...','...ogllogllo....','..oogglggloo....','.oglvggglvlo...',
      '..ogllggllo.....','...oogggoo......','.....ogo........','......o.........']},
    leaves:{name:'galhos com folhas',pixels:[
      '................','..ooo...........','.oglvo...ooo....','..oglo..ogllo...',
      '...oa..ogllo....','....oa.ooo......','..oo.oa.........','.oglo.oa.ooo....',
      '..oglo.oaoglo...','...ooo..oalo....','.........oa.....','..........o.....']},
    grass:{name:'capim',pixels:[
      '................','...o....o.......','...go..og...o...','.o.glo.gl..og...',
      '..oglo.glo.gl...','..oglloglooglo..','...ogllgllgglo..','..oogglgllglo...',
      '.ogllggglglo....','..ogggggglo.....','...ooooooo......','................']},
    vegetables:{name:'legumes',pixels:[
      '................','....og..........','...oglo.........','...oooo..ogo....',
      '..orssro.oglo...','.orsrsrsrooo....','.osrsrsrsoosro..','.osrsrsrso.sro..',
      '..orsrsro.osro..','...ooooo...oro..','............o...','................']},
    dogFood:{name:'ração de cachorro',pixels:[
      '................','................','....ooooooo.....','..ooadbadadoo...',
      '.orwbadbadbwro..','.ordbadbadadro..','..orrrrrrrrro...', '..ordddddrro....',
      '...orrrrrro.....','....oooooo......','................','................']},
    catFood:{name:'ração de gato',pixels:[
      '................','................','....ooooooo.....','..oobadbabaoo...',
      '.oucabdabacuo..','.ouabdabdabuo..','..ouuuuuuuuo...', '..oucccccuo....',
      '...ouuuuuo......','....ooooo.......','................','................']},
    crickets:{name:'grilos',pixels:[
      '................','...o.......o....','....o..o..o.....','...ooggoo.......',
      '..ogllggo..o....','...oggggoo......','..oo.o.o.oo.....','.o..o..o...o....',
      '...o....o.......','................','................','................']}
  },
  voices: {
    'skin-classic': {
      stunts:['Se eu cair, chama de ovo mexido!','Meu voo está em manutenção.','Eu descolo do chão. O chão não colabora.'],
      heckles:['Você pousou ou foi plantado, {other}?','Esse passo vai assustar o lobo!','Se achar meu voo aí em cima, traz!','Minha omelete giratória perdeu pra essa.'],
      sneeze:['Pena no bico... ATCHIM!','Saúde! Quase botei um susto!','Agora tem pena até no celeiro.'],
      race:['Até a porteira! Proibido cortar pelo céu!','Nem precisei abrir as asas. Quase.','Eu tava contando os pintinhos, pô!'],
      gossip:['Quem contou pro lobo onde fica o poleiro?','Foi o vento. A porteira ouviu tudo.','Vou pôr senha no galinheiro.'],
      parade:['Passinho do poleiro! Uma pata de cada vez!','Isso vai virar moda no galinheiro.','Se cair, entra na coreografia.'],
      snack:['Meus grãos! Hoje ninguém belisca meu prato.','Tô bicando devagar pra durar mais.','Já conferi: não sobrou nem um grão.']
    },
    'skin-silkie': {
      stunts:['Um salto elegante. Não olha a aterrissagem.','Demorei uma hora pra arrumar esse topete!','Minhas penas chegaram antes de mim.'],
      heckles:['Achei uma pena minha no seu pouso.','{other}, cuidado com meu penteado!','Se encontrar uma nuvem, pede meu pente.','Esse giro desembaraça topete?'],
      sneeze:['Pó no topete... a-a-ATCHIM!','Saúde! Meu topete ficou de lado.','O espirro penteou a fazenda inteira.'],
      race:['Sem encostar no topete na ultrapassagem!','Primeiro lugar. Penteado intacto.','Perdi tempo ajeitando uma pena.'],
      gossip:['Alguém andou usando meu pente de novo?','Essa história veio toda despenteada.','Vou guardar o pente num cofre.'],
      parade:['Rodem com delicadeza. Isso aqui é seda.','Gostei! Só falta pentear o ritmo.','Acabou o baile. Hora do meu banho de pó.'],
      snack:['Grãos no prato, longe das minhas penas!','Uma bicadinha. Depois arrumo o topete.','Prato limpo e plumagem impecável.']
    },
    'skin-blue': {
      stunts:['Esse salto tinha um refrão. Eu esqueci.','Hoje eu canto. A gravidade faz o baixo.','Aterrissei fora do tom, foi?'],
      heckles:['Seu pouso fez um dó bem grave.','{other}, você entrou antes do refrão.','Esse salto bateu na nota mais alta!','Gira em compasso de três, por favor.'],
      sneeze:['Vou testar um agudo... ATCHIM!','Saúde! Esse agudo derrubou uma nota.','Pronto. Batizei o espirro em dó maior.'],
      race:['Quem chegar primeiro escolhe a música!','Cheguei! Agora vai ter bis.','Eu tava marcando o compasso da corrida!'],
      gossip:['Quem disse que eu canto dormindo?','Eu ouvi a fofoca. Tava desafinada.','Então meu próximo solo vai ser bem alto.'],
      parade:['Um, dois, três... ninguém pisa no refrão!','Esse passinho merece uma segunda voz.','O celeiro inteiro pediu bis!'],
      snack:['Trouxeram meus grãos? Canto depois.','Bico ocupado. Coro em pausa.','Acabou o lanche. Agora eu solto a voz.']
    },
    'skin-punk': {
      stunts:['Se voar o chapéu, pega pra mim!','Esse passo dá pra fazer de chinelo?','Foi manobra. Eu juro pelo meu chapéu.'],
      heckles:['Belo tombo. Cabe num clipe de forró.','Esse ritmo combina com meu chapéu.','Lá de cima você vê meu descanso?','{other}, minha cabeça girou de tabela.'],
      sneeze:['Poeira na aba... ATCHIM, uai!','Saúde! Segurei o chapéu por instinto.','O chapéu ficou. Eu quase fui embora.'],
      race:['Valendo! Mas eu corro na sombra.','Ganhei sem suar o lenço. Respeita.','A aba do chapéu fez resistência ao vento!'],
      gossip:['Falaram que meu chapéu é emprestado?','Eu só escutei. Deitado ali na sombra.','Emprestado nada. A sombra dele é minha.'],
      parade:['Puxa o fole que o pato tá pronto!','Eu aceito esse baile. Com intervalo.','Já deu. Meu chapéu pediu descanso.'],
      snack:['Verduras pra mim, debaixo dessa sombra.','Não amassa minhas folhas, {other}.','Prato vazio. Agora cabe uma soneca.']
    },
    'skin-astronaut': {
      stunts:['Salto calculado! O cálculo sumiu.','Meu lenço é a bandeira da expedição!','Quem botou a gravidade tão alta?'],
      heckles:['Pouso confirmado. Vou desenhar um mapa.','Esse passo entra no diário de bordo.','Vê se acha uma trilha nova aí de cima!','Isso é treino pra entrar em órbita?'],
      sneeze:['Poeira na expedição... ATCHIM!','Saúde! O eco chegou no próximo morro.','Anota aí: pólen também é obstáculo.'],
      race:['Expedição porteira! Partiu, {other}!','Bandeira fincada! Quer dizer, lenço.','Eu fui explorar um atalho imaginário.'],
      gossip:['Quem andou lendo meu mapa secreto?','Eu ouvi isso numa expedição. Não conto qual.','Vou esconder o próximo mapa na cenoura.'],
      parade:['Nova missão: dançar sem pisar no lenço!','Achei uma trilha boa nesse passinho.','Missão cumprida. As orelhas sobreviveram.'],
      snack:['Folhas e feno! Provisões da expedição!','Guardei uma folha pra volta da trilha.','As provisões acabaram. Hora de voltar.']
    },
    'skin-robocop': {
      stunts:['Isso foi ensaio. O espetáculo vem depois.','A pose é minha. O tombo eu terceirizo.','Meu laço não autorizou esse vento.'],
      heckles:['Eu daria uma nota. Melhor não.','{other}, faltou pose no final.','Ótimo salto. Pousar também faz parte.','Já vi esse giro numa cortina minha.'],
      sneeze:['Alergia a poeira... e a falta de classe. ATCHIM!','Saúde. Sua elegância saiu pelo nariz.','Ninguém filmou isso. Entendido?'],
      race:['Uma volta rápida. Não sujem minhas patas.','Obrigada pelos aplausos imaginários.','Eu estava desfilando. Corrida é outra coisa.'],
      gossip:['Disseram que meu laço é exagerado?','Essa história merecia uma caixa de areia.','Exagerada é a coragem de falar do meu laço.'],
      parade:['Observem a pata. É uma aula gratuita.','A coreografia precisa de supervisão felina.','Podem aplaudir. Sem tocar no laço.'],
      snack:['Minha ração felina. No potinho, por favor.','Não me apressa. Estou avaliando o aroma.','Aceitável. Vou deixar isso como elogio.']
    },
    'skin-priest': {
      stunts:['Alguém disse vai buscar? Já tô indo!','Meu lenço também quer brincar!','Quatro patas. Nenhuma sabe o freio.'],
      heckles:['{other}! Se cair alguma coisa, eu busco!','Eu aprendi esse passo perseguindo o rabo.','Pula de novo! Foi muito bom!','Seu giro tá quase pegando meu rabo!'],
      sneeze:['Cheirei tudo de uma vez... ATCHIM!','Saúde! Posso buscar seu espirro?','Foi só um cheiro novo. Eu investigo de novo!'],
      race:['Quem chegar ganha carinho? Tô dentro!','Cheguei! Cadê o carinho combinado?','Voltei pra ver se você precisava de ajuda!'],
      gossip:['Quem falou que eu ronco no celeiro?','Eu ouvi, mas eu prometi guardar segredo!','Ah, mas é um ronco tão simpático.'],
      parade:['Eu faço a dança do rabo feliz!','Quero aprender! Ensina outra vez!','Foi o melhor baile da minha vida. Até agora.'],
      snack:['Minha ração de cachorro! Até o lenço pulou!','Eu como e depois lambo o potinho.','Lavei o prato com a língua. Serviço completo!']
    },
    'skin-goose': {
      stunts:['Abram passagem para o pescoço oficial!','Minha elegância tem prioridade na pista.','A aterrissagem não consta no regulamento.'],
      heckles:['Esse pouso precisa de uma autorização.','{other}, você está dançando sem licença.','Muito alto. Vou multar essa nuvem.','Estou fiscalizando o sentido desse giro.'],
      sneeze:['Silêncio, vou... HONK-ATCHIM!','Saúde! Isso acordou meu pescoço inteiro.','Foi um comunicado oficial do meu nariz.'],
      race:['Abram a pista! Buzina não é enfeite!','Vitória devidamente homologada por mim.','Vou protocolar um recurso de pescoço.'],
      gossip:['Quem espalhou que minha buzina falha?','Isso passou pela comissão de fofoca?','A buzina funciona. Quer uma demonstração?'],
      parade:['Baile autorizado. Mantenham a formação.','Esse passo viola três normas de elegância.','A fiscalização aprovou. Com ressalvas.'],
      snack:['Verduras frescas para a autoridade local.','Estou inspecionando folha por folha.','Prato aprovado e oficialmente vazio.']
    },
    'skin-goat': {
      stunts:['Chifres a postos. Chapéu bem preso.','Esse salto é fácil. Difícil é tirar foto.','Se meu chapéu cair, eu desço pra buscar.'],
      heckles:['Seu pouso precisa de um apoio de montanha.','Esse passo fica melhor numa pedra.','{other}, do alto dá pra ver meu chapéu?','Girar no penhasco é nível avançado.'],
      sneeze:['Pó da trilha... ATCHIM! Segura o chapéu!','Saúde! Quase enganchei o susto nos chifres.','Os chifres ficaram. O chapéu também. Ufa.'],
      race:['Porteira ou cume? Eu aceito os dois!','Cheguei. Tinha uma subida de aquecimento?','Essa pista é plana demais pro meu talento.'],
      gossip:['Disseram que meus chifres são cabide?','Essa fofoca escorregou da trilha, {other}.','Cabide nada. Só o chapéu tem vaga aqui.'],
      parade:['Dança de montanha. Cuidado com os chifres!','Esse passinho tá pedindo uma subida.','Chapéu no lugar. Pode encerrar o baile.'],
      snack:['Folhas no galho! Essa trilha tem serviço bom.','Meu chapéu não é prato, {other}.','Próxima parada: uma árvore com sobremesa.']
    },
    'skin-turkey': {
      stunts:['Tripulação, observar esta manobra!','Meu boné já passou na vistoria.','Isso foi pouso de emergência, soldado.'],
      heckles:['Manobra ousada. Relatório preocupante.','{other}, seu compasso desertou.','Altitude boa. Falta planejar o retorno.','Esse giro tá deixando a tropa enjoada.'],
      sneeze:['Pelotão, prepar... ATCHIM!','Saúde! O pelotão inteiro recuou.','Treinamento de susto encerrado.'],
      race:['Operação porteira. Avançar!','Missão cumprida antes do toque de recolher.','Eu tava cobrindo a retaguarda da tropa.'],
      gossip:['Quem disse que eu tenho medo da sirene?','Essa informação não passou pelo comando.','Eu respeito a sirene. É bem diferente.'],
      parade:['Um, dois! Até a cauda marca o passo!','Esse pelotão precisa de ensaio extra.','Dispensados. Mas guardem o ritmo.'],
      snack:['Grãos para o capitão e para a tropa!','Ração conferida. Até o último grão.','Suprimentos consumidos. Boné ainda limpo.']
    },
    'skin-owl': {
      stunts:['Quem marcou acrobacia de dia...?','Me avisem quando chegar a parte da soneca.','Meu laço acordou. Eu ainda não.'],
      heckles:['Belo pouso. Acordei só pra ver.','Esse passo existe numa nota de rodapé.','Daqui a pouco você chega na minha noite.','Avise quando parar de girar. Eu cochilo.'],
      sneeze:['Pó nos livros... a... ATCHIM...','Saúde. Até meu sonho tomou um susto.','Pronto. Já gastei a energia de hoje.'],
      race:['Uma corrida curtinha. Depois anoitece?','Cheguei antes da minha própria soneca.','De noite eu corro melhor. Fato científico.'],
      gossip:['Quem falou que eu durmo na vigilância?','Ouvi isso de noite. A fonte era sonâmbula.','Eu vigio de olhos fechados por experiência.'],
      parade:['Só um passinho. Bem baixinho.','Esse ritmo combina com um luar.','Terminou? Meu travesseiro tá me chamando.'],
      snack:['Grilos pra mim. Pode deixar perto do livro.','O lanche pulou. Eu ainda tô acordando.','Agora sim. Barriga cheia, olhos fechando.']
    },
    'skin-pony': {
      stunts:['Segura o chapéu que o chão tá pequeno!','Um salto de respeito pra esse lenço.','A sela da dignidade escorregou um pouco.'],
      heckles:['Esse pouso levantou poeira de rodeio.','{other}, seu passinho precisa de rédea.','Bom salto! Quer tentar com chapéu?','Esse giro quase laçou minha crina.'],
      sneeze:['Poeira do galope... ATCHIM!','Saúde! Isso deu um coice no silêncio.','Minha crina nem perdeu a risca.'],
      race:['Porteira à vista! Abre alas pro Trovão!','Poeira pra trás. Chapéu pra frente.','Meu chapéu tava fazendo a volta de honra.'],
      gossip:['Disseram que meu chapéu corre por mim?','Essa conversa veio montada num boato.','O chapéu só dá estilo. O galope é meu.'],
      parade:['Baile do curral! Tira o pé da poeira!','Isso é dança ou treino de ferradura?','O lenço acompanhou. A cerca não aguentou.'],
      snack:['Feno caprichado. Galope bom começa no cocho.','Respeita meu feno, {other}.','Abastecido. Agora essa porteira que espere.']
    },
    sheep: {
      stunts:['Se eu rolar, viro novelo!','Penteei a lã pra esse momento.','Eu conto ovelhas e me perco em mim.'],
      heckles:['Esse pouso fez um nó na minha lã.','Meu tricô tem mais ritmo que isso!','Se cair, eu empresto um pouco de lã.','Parece minha lã dentro do cesto.'],
      sneeze:['Um fiapo no nariz... ATCHIM!','Saúde! Minha lã arrepiou inteira.','Soltei um espirro ou uma nuvem de lã?'],
      race:['Sem puxar a lã na ultrapassagem!','Cheguei primeiro. Nem desfiz o penteado.','A lã pesou. Na próxima eu aparo as pontas.'],
      gossip:['Quem espalhou que eu durmo me contando?','Eu fui costurando os detalhes da história.','Vou dar um ponto final nessa fofoca.'],
      parade:['Dança leve, que minha lã tá penteada!','Esse ritmo dá pra acompanhar tricotando.','Acabei o baile e mais meia blusa.'],
      snack:['Meu feno! Ainda bem que não veio na lã.','Mastigar e tricotar. Uma coisa de cada vez.','Cocho vazio. Novelo cheio de planos.']
    },
    pig: {
      stunts:['Isso não é tombo. É carinho no chão.','Vim pelo lanche. Fiquei pelo show.','Eu rolo, mas não enrolo!'],
      heckles:['Pouso seco. Na lama ficava melhor.','Esse passo abre meu apetite!','Alguém leva uma bandeja lá em cima?','Gira mais! Quase bateu minha vitamina.'],
      sneeze:['Cheirei o tempero... ATCHIM!','Saúde! Quase perdi meu apetite. Quase.','Nota dez pro espirro. Zero pro tempero.'],
      race:['Quem chegar primeiro escolhe o cardápio!','Ganhei! Hoje tem entrada e sobremesa.','Corri com fome. A culpa é da organização.'],
      gossip:['Quem falou que eu repeti o almoço?','Eu só escuto fofoca com acompanhamento.','Repeti foi a sobremesa. Corrige isso aí.'],
      parade:['Dança do prato cheio! Bora, {other}!','Esse rebolado devia ter nome no cardápio.','Gastei energia. Agora preciso repor.'],
      snack:['Legumes! Quem cozinhou merece uma medalha.','Essa abóbora tá no ponto. Eu conferi duas vezes.','O prato tá limpo. Posso avaliar outro?']
    },
    duck: {
      stunts:['Quáse que eu consigo!','Sou pato. Pago mico nas horas vagas.','Minha aterrissagem pede um lago.'],
      heckles:['Meu lago recebe pousos melhores.','Esse passo vai espirrar água pra todo lado.','Avisa se encontrar um lago lá em cima.','Tá girando ou procurando vaga na lagoa?'],
      sneeze:['Água no nariz... QUÁ-ATCHIM!','Saúde! Esse espirro fez onda.','Vou patentear o espirro anfíbio.'],
      race:['Valendo! Não vale atravessar pelo lago!','Vitória seca! E eu nem molhei as patas.','Me dá uma pista com água pra ver, {other}.'],
      gossip:['Quem disse que eu afundei na poça?','Eu recebi essa fofoca boiando.','Afundei nada. Tava inspecionando o fundo.'],
      parade:['Passo da lagoa! Sem pisar nas membranas.','Esse rebolado vai agitar meu lago.','Tá bom de baile. Minhas patas pedem água.'],
      snack:['Verdurinhas! Pode servir perto da lagoa.','As folhas boiam? É pra um teste gastronômico.','Papo cheio. Agora eu vou fazer onda.']
    },
    rabbit: {
      stunts:['Minhas orelhas não vieram com freio!','Pulo alto. Planejamento, nem tanto.','Cenoura dá asa? É pra um amigo.'],
      heckles:['Já anotei onde você caiu, {other}.','O pé até dança. A orelha perdeu o ritmo.','Minhas orelhas chegam nessa altura sozinhas.','Para que minhas orelhas tão dando nó!'],
      sneeze:['Folhinha no focinho... ATCHIM!','Saúde! Minhas orelhas pousam depois.','O espirro saiu. As orelhas tão voltando.'],
      race:['Eu já posso ir? E agora? Agora valeu?','Cheguei! E ainda sobrou orelha pra trás.','Eu ouvi a largada duas vezes. Duas orelhas.'],
      gossip:['Quem contou que eu tenho medo de alface?','Minhas orelhas ouviram versões diferentes.','Medo de alface? Eu tenho é pressa de comer.'],
      parade:['Uma pata, outra pata... orelhas por último!','Esse passo embaralhou minhas orelhas.','Vou precisar de um pente pra desfazer isso.'],
      snack:['Folhas e feno! Minhas orelhas viram primeiro.','Devagar, Jay Jay. Mastiga antes de saltar.','Já terminei. Minhas orelhas ainda tão na fila.']
    },
    dog: {
      stunts:['Quem jogou? Eu busco até elogio!','Isso vale biscoito?','Tentei pegar o rabo. Ele fugiu.'],
      heckles:['Se sua dignidade cair, eu busco, {other}!','Meu rabo tá tentando aprender esse passo.','Eu alcanço! Não sei como, mas alcanço!','É assim que começa a caça ao próprio rabo.'],
      sneeze:['Farejei poeira demais... ATCHIM!','Saúde! Achei seu espirro pelo cheiro.','Meu nariz resolveu latir por conta própria.'],
      race:['Eu guardo a porteira! Quer dizer, corro até ela!','Cheguei! A porteira tava bem protegida.','Parei pra farejar uma informação importante.'],
      gossip:['Quem espalhou que eu tenho medo do portão?','Eu farejei a fofoca antes de ouvir.','Medo não. Eu lato por excesso de educação.'],
      parade:['Passo da patrulha! Rabo sempre em alerta.','Esse baile tá precisando de um bom latido.','Pode encerrar. Eu vigio o resto da festa.'],
      snack:['Minha ração! Eu senti o cheiro do celeiro.','Vou conferir se o fundo do pote tá bom.','Prato vistoriado. Nenhum grão escapou.']
    },
    cat: {
      stunts:['Eu planejei esse tombo.','Caí de pé. A dignidade vem depois.','Miau… viu? Não viu? Ótimo.'],
      heckles:['Eu faria melhor, mas tô com sono.','Essa dança perturba minha soneca.','Lá em cima você acha um canto mais quieto?','{other}, girar só muda o lado do vexame.'],
      sneeze:['Poeira no bigode... atchim. Não comenta.','Saúde. Eu preferia o silêncio de antes.','Foi o bigode. Eu não tive nada com isso.'],
      race:['Uma corrida? Bem na hora do meu descanso?','Pronto. Ganhei. Posso voltar a deitar?','Cheguei depois por decisão pessoal.'],
      gossip:['Quem disse que eu durmo o dia inteiro?','A fofoca passou aqui. Eu fingi que dormia.','O dia inteiro não. Também durmo de noite.'],
      parade:['Só observo. Tá, talvez uma patinha.','Esse passo cabe na minha próxima soneca.','Já participei bastante. Considerem um luxo.'],
      snack:['Ração de gato. No meu pote, sem visitas.','Tô comendo. Não é um convite, {other}.','Gostei. Vou demonstrar ficando por perto.']
    },
    goat: {
      stunts:['A cerca tá me chamando pra pular.','Subir eu sei. Descer é surpresa!','Hoje eu mastigo os aplausos.'],
      heckles:['Aterrissar numa cerca é que é difícil.','Esse passo funciona no telhado?','Se achar um galho bom, guarda pra mim!','Dá pra girar e subir ao mesmo tempo?'],
      sneeze:['Uma folha fez cócega... ATCHIM!','Saúde! Meus chifres tremeram junto.','O galho fugiu. Vou negociar com a árvore.'],
      race:['Até a porteira? Eu prefiro por cima dela!','Já cheguei. Quer que eu abra pelo alto?','Parei pra estudar uma subida interessante.'],
      gossip:['Quem disse que eu andei comendo a cerca?','Essa história tem cheiro de galho roído.','Eu provei um cantinho. Provei, só isso.'],
      parade:['Baile lá em cima! Quem sabe subir?','Esse passo ia bem no telhado do celeiro.','Agora eu quero a versão em cima da cerca.'],
      snack:['Galhos com folhas! Isso sim é serviço.','Mastigo a folha. A cerca pode ficar tranquila.','Sobrou o galhinho. Já resolvo isso também.']
    },
    cow: {
      stunts:['Se eu girar, sai manteiga?','O pasto aplaudiu. Eu ouvi!','Muuuuita calma nessa hora!'],
      heckles:['O chão sentiu esse pouso, {other}.','Dança devagar que eu tô ruminando.','Quando voltar, te conto uma coisa calma.','Esse giro vai coalhar a paciência de alguém.'],
      sneeze:['Capim no nariz... MUU-ATCHIM!','Saúde. Aqui até o susto rumina.','O pasto inteiro ouviu. Eu percebi.'],
      race:['Eu vou. Mas sem parar de mastigar.','Cheguei. Até minha mastigada foi mais rápida.','Eu prefiro chegar com o capim bem mastigado.'],
      gossip:['Quem falou que eu sou devagar?','Essa história precisa ser bem ruminada.','Devagar é uma forma elegante de ter tempo.'],
      parade:['Um passo de cada vez. O leite agradece.','Esse baile tá mexendo com a nata.','Vou terminar a dança deitada no pasto.'],
      snack:['Capim fresquinho. Agora sim podemos conversar.','Estou ruminando a qualidade desse prato.','Já acabou? Eu ainda tenho o que mastigar.']
    },
    horse: {
      stunts:['Troquei o galope por um passinho.','A crina tá pronta pro vento!','Freio? Achei que era recreio.'],
      heckles:['Seu pouso levantou uma brisa respeitável.','Esse passo precisa de mais vento na crina.','Salto bom. Agora imagina com quatro cascos!','Assim você desmancha minha crina de longe.'],
      sneeze:['Poeira na crina... HII-ATCHIM!','Saúde! Minha crina voou sem autorização.','Vou chamar isso de rajada de Ventania.'],
      race:['Abre a porteira que a Ventania chegou!','Cheguei antes da poeira. Ela vem logo ali.','Meu vento pegou um caminho mais comprido.'],
      gossip:['Disseram que eu corro pra aparecer?','Eu ouvi essa conversa passando a galope.','Não corro pra aparecer. Apareço correndo.'],
      parade:['Galope de salão! Sem pisar no casco alheio.','Essa dança vai pedir escova na crina.','O baile acabou. O vento continua comigo.'],
      snack:['Feno pra Ventania! Sem poeira, por favor.','Fazendo uma pausa no galope pra mastigar.','Abasteci. Agora eu vou passear com o vento.']
    },
    donkey: {
      stunts:['Esse passo eu inventei agora.','Minhas orelhas aplaudem sozinhas!','Devagar também chega bonito.'],
      heckles:['Eu avisei o chão. Ele não saiu.','Esse passo é teimoso. Gostei.','Minhas orelhas chegaram aí antes de você.','Isso aí é indecisão com velocidade.'],
      sneeze:['Pó no ouvido... no nariz... IÓ-ATCHIM!','Saúde! Ouvi duas vezes. Duas orelhas.','Não foi teimosia. O espirro não queria sair.'],
      race:['Eu vou quando eu decidir. Decidi.','Cheguei. Foi exatamente quando eu planejei.','Ficar pra trás também foi escolha minha.'],
      gossip:['Quem disse que eu nunca mudo de ideia?','Só repito fofoca quando eu decido repetir.','Mudo de ideia sim. Mudei pra não mudar.'],
      parade:['Esse é meu passo. Não aceito correção.','Finalmente uma dança com personalidade teimosa.','Eu paro quando quiser. Quero parar agora.'],
      snack:['Feno no meu canto. Eu escolho a primeira palha.','Não me apressa. Essa palha exige atenção.','Terminei porque eu quis. O cocho confirmou.']
    },
    lamb: {
      stunts:['Pequeno no tamanho. Grande no salto!','Minha lã amortece o vexame.','Ainda tô aprendendo a contar ovelhas.'],
      heckles:['Quando eu crescer, caio assim também?','Ensina devagar que minhas patas são pequenas!','Me pega na volta, {other}!','Girou tanto que fiquei tonto só de olhar!'],
      sneeze:['Um fiapinho... atchinzinho!','Saúde! Até meu sustinho é fofinho.','Meu espirro já conta como rugido?'],
      race:['Eu também corro! Espera minhas patinhas!','Ganhei? Ganhei mesmo? Vou contar pra mamãe!','Minhas patas fizeram o caminho curtinho!'],
      gossip:['Quem falou que eu sou uma almofada?','Posso ouvir a fofoca ou sou pequeno demais?','Almofada nenhuma pula desse jeito!'],
      parade:['Eu vou imitar! Só não dança muito rápido!','Acertei uma pata! Faltam as outras.','Aprendi o começo. Amanhã tento o resto!'],
      snack:['Feno pra mim! Cabe uma montanhinha pequena.','Escolhi a palhinha mais bonita. Já vou comer.','Barriguinha cheia. Cabe um pulinho?']
    },
    turkey: {
      stunts:['Abri a cauda. Podem aplaudir!','Glu-glu… perdi o compasso.','Meu desfile inclui tropeço.'],
      heckles:['Belo pouso. Minha cauda faria mais sucesso.','Esse passo funciona melhor com uma cauda.','Dá pra ver meu desfile aí de cima?','{other}, a passarela não faz curva assim!'],
      sneeze:['Pó na passarela... GLU-ATCHIM!','Saúde! Minha cauda abriu de susto.','Foi um espirro com abertura de desfile.'],
      race:['Corrida com desfile. Não amassem minha cauda.','Primeiro lugar e melhor figurino da pista.','Eu precisava mostrar a cauda na curva.'],
      gossip:['Quem espalhou que minha cauda é peruca?','Essa fofoca não combina com meu figurino.','Cada pena é original. Podem contar.'],
      parade:['Abre a roda! A cauda precisa de espaço!','Faltou uma entrada triunfal nesse passinho.','Encerramento de gala. Aplausos permitidos.'],
      snack:['Grãos selecionados pro astro do desfile!','Uma bicada sem desarrumar as penas.','Papo cheio. Cauda pronta pra próxima entrada.']
    }
  }
};
