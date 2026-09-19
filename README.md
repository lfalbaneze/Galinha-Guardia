# 🐔 Penas pro Ar!

### Uma fazenda cheia de encrenca

Feito por **Luis Albaneze**.

O lobo está à solta, os bichos se espalharam pela fazenda e sobrou para uma galinha colocar ordem na bagunça.

**Penas pro Ar!** é uma aventura 2D de exploração e furtividade na **Fazenda do tio Clau**, para jogar direto no navegador. Encontre os **12 amigos**, use o feno e a vegetação para se esconder e escolha a hora certa de correr. A cada resgate, o lobo fica mais atento — salvar a turma vai exigir mais do que sair correndo pela fazenda.

Cada amigo tem seu próprio sprite e passos alternados. Os dez amigos originais e os pintinhos têm quatro direções; cavalo e peru usam poses laterais. Veja a [prévia da turma](preview/rescue-animals.png) e as [folhas e prompts de arte](assets/sprites/RESCUE-ART-NOTES.md).

A protagonista é **Erina**, a carijó, com duas opções também liberadas desde o começo: **Midori**, a sedosa japonesa de topete e patas plumadas, e **Alzira**, a galinha azul inspirada na mascote da Maggi. Escolha na aba **Bichos**; todas têm quatro direções e passos alternados, com as mesmas regras de movimento. Veja a [prévia das três](preview/chickens.png) e os [sprites e prompts](assets/sprites/HEN-ART-NOTES.md).

Pelo caminho, piados revelam **seis pintinhos escondidos**. Encontrá-los é opcional, mas rende pontos e ajuda a desbloquear outros personagens. Quando os 12 amigos estão seguros, chega a vez de a turma acertar as contas com o lobo, numa confusão de desenho animado.

## Pela Fazenda do tio Clau

- **Uma fazenda diferente a cada aventura.** Explore regiões conectadas, com caminhos, construções e esconderijos que mudam a cada nova partida.
- **Um lobo que não larga do seu pé.** Ele patrulha também os pastos afastados, investiga barulhos e procura na direção em que viu você fugir. A corrida deixa pegadas por oito segundos: ele só as encontra se passar perto, com visão livre. Andar de mansinho não cria novas pegadas.
- **Resgates que dão trabalho.** Os bichos também se assustam e fogem da galinha. Chegue de mansinho ou aproveite quando eles pararem para descansar.
- **Espantalho de folga.** Três corvos descansam no chapéu e nos braços perto do milharal. Aproximar a galinha espanta o bando; correr assusta de mais longe. Eles voltam após sete segundos de sossego e podem ser espantados novamente.
- **Segredos e aparências.** Procure os pintinhos para liberar Zeca, o pato; Pipoca, o coelho; Stella, a gata; e Paçoca, o caramelo, cada um com seu tema musical. O desafio do lago libera também Gumercindo, o ganso cinzento. Todos têm sprites próprios e acessórios da roça.
- **Três dificuldades.** Escolha entre Dia tranquilo, Penas em risco e Lobo à solta. O progresso e as preferências ficam salvos no navegador quando o armazenamento local está disponível.

## Como jogar

Baixe ou clone o repositório e abra `index.html` no navegador. Não é necessário instalar dependências para jogar; os scripts compilados acompanham o projeto.

Para servir os arquivos em um endereço local fixo, execute na pasta do projeto, com Python instalado:

```sh
python -m http.server 8765 --bind 127.0.0.1
```

Depois, abra **http://127.0.0.1:8765**.

### Controles

| Tecla | Ação |
| --- | --- |
| WASD ou setas | Mover a galinha |
| Shift | Correr enquanto houver fôlego |
| C | Andar de mansinho |
| E | Chamar o pintinho próximo; sem pintinho ao alcance, entrar ou sair do esconderijo indicado |
| Pressionar uma direção novamente | Sair do esconderijo |
| Esc ou P | Pausar e abrir o menu |
| H | Exibir colisões para depuração |
| F | Começar ou sair do desafio opcional do lago |

Encoste nos amigos para resgatá-los. Eles vão para o refúgio e ficam a salvo pelo restante da aventura. Encontrar os 12 conclui a missão, mesmo sem todos os pintinhos.

Na aba **Controles**, é possível trocar C e Shift por comandos de ligar/desligar, sem precisar manter a tecla pressionada. As preferências ficam salvas neste navegador.

**Celular e tablet:** os botões de toque aparecem automaticamente em dispositivos com toque e também podem ser ativados na aba Controles. Use as setas para caminhar; Mansinho e Correr funcionam com um toque. O botão de interação muda entre Chamar, Esconder e Sair. Em telas horizontais baixas, os comandos ficam ao lado do mapa.

**Controle com mapeamento padrão do navegador:** analógico esquerdo ou direcional move; A interage; B liga/desliga mansinho; RT corre; X entra/sai do desafio de PANTO; Menu pausa. Nos menus, direcional navega, A confirma, B volta e esquerda/direita ajustam opções e volume. O analógico tem zona morta e velocidade proporcional. Ao desconectar o controle, a partida pausa; depois de retomar, solte os comandos antes de mover novamente.

**Cuidado com os esconderijos:** se o lobo vir você entrar, ele pode ir até lá. Saia, despiste-o e procure outra cobertura sem ser vista. A corrida tem fôlego limitado; caminhar recupera a reserva, e se esconder recupera mais rápido.

## PANTO, o dono do lago

O ganso patrulha a margem, para para observar você e abre as asas antes de avançar. A direção da investida fica marcada no chão e não muda durante o ataque. Às vezes ele blefa: observe a indicação antes de gastar fôlego. Depois de errar, fica atordoado e precisa se recuperar.

PANTO também cisca, ajeita as penas e caminha pela margem. Ao ver você no limite do território, ele se aproxima; entre tentativas, pode andar para o lado e procurar outro ângulo. A mudança de posição termina **antes do aviso completo**: a faixa continua fixa durante a investida, dando tempo para uma esquiva justa.

O sprite de PANTO tem plumagem branca detalhada, pescoço longo e expressão de fiscal bravo, combinando com os outros animais. São 12 poses em quatro direções, incluindo o grasnado de asas abertas. [Antes e depois](preview/panto-v2-comparison.png) · [Arte e prompt](assets/sprites/PANTO-ART-NOTES.md).

Ele observa o lado das suas esquivas e tenta fechar esse lado na próxima aproximação. Uma esquiva antecipada pode provocar um blefe; movimento lateral pode fazê-lo contornar. Paredes e esconderijos interrompem a observação, e ele não acompanha a posição escondida da galinha.

Depois de um bote, PANTO se recupera onde parou e prepara a próxima aproximação dali. Ele procura espaço ao redor dos obstáculos e muda de ângulo, mantendo o aviso completo antes de cada investida. Durante o desafio, reage em toda a área do círculo.

A faixa no chão mostra a largura de contato. Depois do aviso, afastar-se para o lado continua valendo como esquiva, mesmo saindo do alcance em que ele percebe você. Se uma cerca deixa o ganso sem espaço para investir, ele se reposiciona devagar e dá um aviso completo antes de tentar. O painel do desafio indica quando se aproximar, desviar ou esperar.

O ganso se chama **PANTO**, com uma pequena identificação sobre ele. Quando estiver perto o suficiente, um botão compacto permite **Desafiar PANTO**; também é possível usar **F**. As instruções aparecem junto do contador durante o desafio, e as regras completas ficam em **Como jogar**. São três rodadas: **bote direto**, **bote duplo** (duas faixas, cada uma com seu aviso) e **blefe seguido de arrancada**. A última investida considera seu movimento visível antes do aviso; a faixa continua fixa depois disso.

Desvie da sequência inteira para deixar PANTO tonto. O som curto, o anel verde e a barra de tempo indicam uma abertura de **3,6 s no Fácil, 3 s no Médio ou 2,5 s no Difícil**. Aproxime-se e use **E / A do controle / Carimbar no toque** para pegar um carimbo. Só desviar e ficar longe não concede progresso. Um bote que percorreu espaço e errou ainda abre a oportunidade mesmo parando por tempo ou contra um obstáculo; um bote travado no início não abre. Na rodada dupla, não há abertura entre os dois botes.

O contador **0/3 → 3/3** mostra os carimbos; o painel também mostra a rodada e as chances restantes. **Três bicadas encerram a tentativa**, zerando os carimbos daquele desafio. As bicadas não apagam resgates, vidas ou pontos da fazenda. Durante a tentativa, o lobo espera fora da área. **F novamente** ou sair do círculo também interrompe a tentativa. Pausar congela inclusive a abertura para o carimbo; recarregar a página exige iniciar o desafio de novo com segurança.

Ao pegar os três carimbos, a vinheta de vitória toca, PANTO para de atacar, a **ponte sobre o lago abre um atalho real** e a **aparência de ganso** fica disponível no baú. O tablado termina nas margens, com apoios de pedra, corrimãos e ligações aos caminhos próximos. A ponte permanece aberta nessa fazenda; a aparência continua desbloqueada nas próximas aventuras. Vitórias salvas antes desta revisão continuam válidas. Nenhum dos 12 amigos ou seis pintinhos exige vencer esse desafio.

## Campo de girassóis

A Fazenda do tio Clau tem um campo de girassóis altos, com placa junto ao canteiro e marca amarela no minimapa. Ele ocupa uma clareira livre junto aos caminhos, inclusive nas fazendas de saves anteriores, sem deslocar construções ou bloquear passagens. As hastes dos dois lados cedem ao corpo da personagem mesmo ao passar entre fileiras, mantendo as raízes no chão, e voltam suavemente à posição. De mansinho, as folhas reagem de leve; andando, caem algumas pétalas da flor; correndo, a inclinação, as pétalas e o farfalhar aumentam. Parar não continua soltando partículas. O movimento reduzido suaviza a reação sem alterar o barulho percebido pelo lobo.

Durante a ronda, o lobo pode caminhar até o campo, esconder-se e esperar. Seu corpo e sua marca no minimapa ficam ocultos. Ele só prepara o bote se enxergar a personagem; paredes e esconderijos continuam protegendo. Antes do salto, as flores se agitam, ouve-se um farfalhar e uma faixa indica a direção fixa da investida: **1,4 s de aviso no Fácil, 1,15 s no Médio e 0,95 s no Difícil**. Desvie para o lado; depois de errar, ele se recupera por 1,2 s. O acerto tira uma vida, com a proteção normal contra danos seguidos. O aviso visual permanece com movimento reduzido.

Thor interrompe a emboscada. Pausar congela o ataque; carregar uma partida interrompida devolve o lobo à rotina com um intervalo seguro antes de outra tentativa. O desafio do Panto suspende essa mecânica.

## Lorenzo, a raposa, e a coruja

As duas usam as folhas de sprites fornecidas pelo usuário, com 12 poses e quatro direções. As imagens originais são preservadas; recortes individuais evitam cortar orelhas, caudas e patas. Consulte as [notas da arte](assets/sprites/USER-WILDLIFE-NOTES.md).

Nas moitas junto aos caminhos, **Lorenzo, a raposa, fica visível na borda da vegetação**, mesmo enquanto espera, com uma identificação discreta sobre o personagem. Antes do bote, ele faz as folhas farfalharem, e uma faixa mostra a direção e a largura da investida. Desvie para o lado: Lorenzo não corrige a direção no meio do ataque. Uma investida que acerta **tira um coração**, empurra a personagem e dá 1,2 segundo de proteção contra outro acerto. A última vida encerra a tentativa. Pontos e resgates não sofrem desconto pelo acerto.

A moita que abriga uma raposa fica marcada como **ocupada** e não pode ser usada como esconderijo, mesmo durante a saída dela. Depois do bote, a raposa descansa e retorna à toca. Se o lobo a vir exposta nesse intervalo, respeitando sua visão e os obstáculos, ele dispara **“Quem manda nesta fazenda sou eu!”**. A raposa corre para longe dele, volta à moita e demora mais para atacar outra vez. O lobo mantém a perseguição que já estiver fazendo; assustado pelo Thor, ele não banca o valentão.

A **coruja** fica em uma árvore e observa um setor marcado no chão. O alerta só completa enquanto ela continua vendo a galinha. Saia do campo de visão ou entre em cobertura para interrompê-lo. Quando o alarme completa, um lobo próximo pode investigar o ponto observado — a coruja não acompanha a galinha escondida.

O alcance do pio parte da coruja, e paredes entre ela e o lobo abafam o som. Se ele ouvir, investiga apenas a posição que ela viu naquele instante; não recebe a posição atual de quem já saiu dali ou se escondeu.

Os encontros aproveitam árvores e moitas existentes, longe do início, dos pintinhos escondidos e da arena do ganso. A quantidade depende dos locais seguros disponíveis, até duas raposas e duas corujas por fazenda. Eles ficam pausados durante o desafio do lago e não participam da cena final. As novas folhas de sprites acompanham o jogo offline; se uma imagem falhar, o menu oferece uma nova tentativa antes de liberar a partida.

## Thor e os amigos da fazenda

**Thor**, o golden retriever, ajuda de acordo com a dificuldade:

- **Fácil:** quando resta **1 coração**, ele vem automaticamente e dá **+1 coração**, uma única vez por tentativa.
- **Médio:** reúna **2 ossos** e chame Thor para recuperar os **3 corações**.
- **Difícil:** reúna **3 ossos** e chame Thor para recuperar os **3 corações**.

Os ossos ficam nos caminhos, aparecem no minimapa e são recolhidos ao encostar. Quando houver ossos suficientes e faltar vida, use **T**, **Y no controle** ou o botão **Chamar Thor**. A vida cheia preserva os ossos. A chamada reserva os ossos uma vez; outro conjunto fica disponível para uma futura ajuda. No Médio e Difícil, saia da água ou termine o desafio de PANTO para chamar. No Fácil, a ajuda automática também funciona no lago.

A ajuda abre uma cena de **5,4 segundos**: Thor sai da casinha, corre até a personagem e entrega os corações. O jogo e o relógio ficam congelados; ao voltar, Thor está por perto e o lobo foge por sete segundos. É possível pausar ou pular a cena, recebendo a mesma ajuda. O fim da cena devolve o foco ao jogo e limpa os comandos segurados. A preferência por movimento reduzido desativa a corrida e os pulos da apresentação.

Uma fanfarra original acompanha a cena, com um acorde na entrega dos corações, e reduz a música de fundo. Respeita silêncio, volume e pausa; continuar um save não repete a música nem a cura. Ossos, uso único no Fácil e progresso da cena são salvos juntos. Uma nova tentativa reinicia a ajuda gratuita e os ossos. A música pode ser regenerada com `node scripts/generate-thor-audio.cjs`. [Arte e prompt da casinha](assets/cinematics/ART-NOTES.md).

A missão tem **um amigo de cada tipo**: ovelha, porquinho, pato, cordeirinho, vaca, cabra, coelho, gato, burrinho, cachorro, cavalo e peru. Cavalo e peru contam no objetivo, rendem 100 pontos e têm lugares próprios no refúgio. Todos os amigos são identificados por corações; a população de bichos decorativos foi removida.

Os amigos procuram abrigo e companheiros seguros na fuga. O cavalo tem mais fôlego; o peru se assusta e cansa mais depressa. Uma aproximação de mansinho acalma os dois. Coelhos e gatos mudam de direção mais rápido. A vegetação, os pequenos pastos, as flores e as poças continuam preenchendo os espaços entre as áreas, preservando estradas e portões.

A atualização para o mapa 7 mantém o progresso e a ponte conquistada; mapas 5 e 6 também mantêm a geografia e a posição válida da galinha. Partidas em andamento recebem cavalo e peru para resgatar; partidas já concluídas continuam concluídas, sem repetir o bônus. Há uma cópia do save anterior no armazenamento local. Os sprites de cavalo e peru têm [arte e prompts documentados](assets/sprites/FARM-RESIDENTS-ART-NOTES.md).

## Cenário e placas

O cenário reage ao contato: milho, trigo, flores, taboas e arbustos cedem à passagem; as árvores balançam de leve e soltam folhas, com a base do tronco firme. Correr provoca reações maiores; andar de mansinho reduz o movimento e o barulho. A vegetação volta ao lugar depois da passagem, e a preferência de movimento reduzido diminui os efeitos sem mudar as regras.

Água rasa produz ondas, respingos e passos molhados na saída; barro deixa pegadas escuras, e correr nos caminhos levanta poeira. Água e barro reduzem a velocidade em 22% e 16%; o milho, em 9%. A água interrompe a trilha de corrida usada pelo lobo e lava a lama das patas. Pegadas anteriores continuam onde foram deixadas. O lobo pode ouvir respingos e folhas, respeitando distância e paredes, e investiga o ponto do barulho. A ponte conquistada permanece seca. Efeitos param ao pausar e não entram no save.

Os três sons curtos de contato são originais e podem ser regenerados com `node scripts/generate-environment-audio.cjs`, sem alterar as gravações dos animais.

Na parte funda da lagoa, a galinha e as aparências de coelho, gato e cachorro usam uma boia automaticamente. Pato e ganso nadam sem boia: na água funda, o ganso nada a 94% da velocidade básica de caminhada; o poder do pato aumenta esse nado em 25%. Na boia, a velocidade é 56%. Na margem rasa, começa em 78% e muda gradualmente ao entrar. O comando de correr acelera as remadas e usa fôlego; sair pela margem recolhe a boia. Há balanço suave, corpo parcialmente submerso, ondas e respingos. As poças menores continuam rasas, e a ponte conquistada oferece uma travessia seca e rápida. Entrar para nadar durante o desafio do PANTO encerra a tentativa, sem conceder carimbos. A aparência e a posição salva determinam o nado ao retomar, sem salvar efeitos transitórios. Prévia: [nado e boias](preview/swimming.png).

As novas fazendas reservam terrenos completos para cada atividade. A **horta** tem canteiros retangulares, fileiras contínuas e corredores; o **milharal** tem pés de milho, um galinheiro e um silo; o **curral** tem vaca, cabra, bebedouro, estábulo e cercas com dois portões abertos. Os galinheiros ficam apenas no poleiro e no milharal, e o pomar concentra as árvores frutíferas. Copas e construções não invadem os canteiros.

Os acessos às construções e aos portões se ligam à estrada. A vegetação fica fora dos caminhos e das fachadas; flores aparecem em pequenos grupos junto aos plantios, e taboas acompanham a margem do lago. O curral tem um abrigo aberto de madeira, o pomar mistura macieiras e pereiras, e um salgueiro marca a margem quando há espaço seguro. Objetos redundantes que não cabem com folga são retirados. A [folha de arte complementar e seu prompt](assets/farm/HABITAT-ART-NOTES.md) estão documentados no projeto.

As cercas do curral bloqueiam a passagem, e os portões permitem atravessá-lo e chegar aos animais. Feno e moitas continuam servindo de esconderijo, inclusive para os pintinhos. **Fazendas antigas são atualizadas para a organização atual**, preservando resgates, pontos e desbloqueios. A atualização coloca a galinha em um início seguro e os amigos restantes em locais acessíveis.

## Pintinhos e aparências

Ao ouvir um piado, aproxime-se da moita, árvore ou feno indicado. Quando aparecer **E · chamar pintinho**, aperte **E uma vez**: o pequeno aparece, vem até a galinha e fica a salvo no ninho. Não é preciso entrar no esconderijo nem segurar uma tecla. Cada resgate rende 100 pontos, com confirmação imediata e salvamento automático.

A chamada funciona pela borda do esconderijo e respeita cercas e construções. Se a galinha estiver num esconderijo que o lobo viu, **E continua sendo a saída**. Pintinhos já revelados em partidas antigas também atendem ao E quando estão próximos, sem exigir outra perseguição.

| Resgates na mesma aventura | Aparência desbloqueada | Tema musical |
| --- | --- | --- |
| 3 amigos + 2 pintinhos | Zeca, o pato | Passos na Fazenda |
| 6 amigos + 4 pintinhos | Pipoca, o coelho | Pulos ao Luar |
| 9 amigos + 6 pintinhos | Stella, a gata | Passo Furtivo |
| 10 amigos + 6 pintinhos | Paçoca, o caramelo | Companheiro da Roça |
| Vencer o desafio do lago | Gumercindo, o ganso | Trilha da fazenda selecionada |

As aparências são escolhidas no **Baú dos bichos**. Cada aparência secreta tem um poder passivo, apresentado no seletor e lembrado junto à barra de fôlego:

| Aparência | Poder | Efeito |
| --- | --- | --- |
| Paçoca | Au-mizade | Os cães não fogem da personagem, mesmo correndo, e se aproximam a até 140 pixels com visão livre. Ainda fogem do lobo. |
| Pipoca | Pé de foguete | Movimento 15% mais rápido em terra, inclusive correndo; a boia mantém a velocidade normal. |
| Stella | Passo de veludo | Anda de mansinho 50% mais rápido. Reduz pela metade o alcance dos passos e do farfalhar que o lobo ouve, sem alterar a visão ou as pegadas. |
| Zeca | Pato a jato | Nado 25% mais rápido que o ganso na água funda, com transição suave na margem. |
| Gumercindo | Fôlego de ganso | A carga completa de fôlego sustenta 4,5 segundos de corrida ou nado acelerado, em vez de 3. |

Zeca usa chapéu de palha e lenço cor de telha; Pipoca tem lenço verde e uma orelha dobrada; Stella tem patinhas claras, laço lilás e guizo; Gumercindo usa lenço azul xadrez; Paçoca tem pelo caramelo, orelhas castanhas e lenço vermelho. As folhas próprias têm quatro direções e dois passos, usadas na partida, no menu, no baú e nos retratos. Os desbloqueios antigos continuam válidos. Veja a [prévia dos cinco personagens](preview/skin-characters.png) e as [notas de arte e prompts](assets/sprites/SKIN-ART-NOTES.md).

Erina, Midori e Alzira mantêm os atributos básicos. Só o poder equipado vale, e a troca preserva o fôlego atual, as vidas e as colisões. Os desbloqueios permanecem entre aventuras, e aparências ganhas em saves anteriores já recebem seus poderes. Para conquistar todos na mesma partida, encontre os pintinhos **antes de resgatar o último amigo**.

## Som e progresso

O jogo tem músicas para a fazenda e para as aparências, gravações dos animais e efeitos para os resgates, esconderijos e a cena final. Música e efeitos têm controles de volume separados; também é possível desligar todo o som.

O salvamento automático permite continuar a mesma fazenda, com os resgates, a pontuação e a dificuldade escolhida. **Reiniciar** ou **Gerar nova fazenda** substitui a aventura atual, mas mantém as aparências desbloqueadas.

Quando acabam os três corações, é **fim de jogo**. **Tentar novamente** reinicia a mesma fazenda e dificuldade, com três vidas, zero pontos, nenhum resgate e os desafios por fazer. Voltar ao menu ou recarregar a página mantém a derrota; não recupera a tentativa perdida. Aparências desbloqueadas continuam no baú. Partidas pausadas com vidas restantes ainda podem ser continuadas normalmente.

O progresso pertence ao navegador e ao endereço usado para jogar. Abrir por `file://` e acessar pelo servidor local não compartilha o mesmo salvamento. Se o armazenamento estiver bloqueado, o jogo avisa que o progresso vale apenas para a sessão.

## Interface da partida

A partida ocupa a janela inteira. Uma faixa compacta reúne personagem, corações, resgates, pintinhos, pontos e pausa; localização e alerta do lobo ficam em pequenos avisos sobre o mapa. O fôlego aparece quando usado, e a ajuda do Thor fica junto aos controles. Ações próximas usam um único aviso pequeno no cenário; o rodapé não repete a chamada. O minimapa destaca caminhos e pontos de interesse. O campo se adapta ao computador e ao celular sem esticar sprites nem exigir rolagem. A câmera mantém a personagem visível nas bordas, acima dos controles. Som, aparências, poderes e dificuldade continuam nas abas do menu de pausa. As animações respeitam a preferência por movimento reduzido. [Partida no computador](preview/farm-play-desktop.png) · [No celular](preview/farm-play-mobile.png).

O terreno usa verdes próximos, pouca textura e sulcos suaves nos caminhos. Pequenos grupos de flores ficam junto ao galinheiro, pomar e pastos floridos. Há uma única bancada de colheita na horta, inclusive nas fazendas antigas com vários canteiros. A horta tem fileiras elevadas de madeira, terra e passagens entre elas: alfaces de folhas enroladas, cenouras semienterradas, abóboras arredondadas e tomates apoiados em estacas. As plantas são desenhadas em pixels pelo renderer e continuam reagindo ao contato. A decoração é determinística e calculada uma vez por fazenda, sem mover obstáculos, resgates ou esconderijos dos saves existentes. [Horta](preview/farm-garden-desktop.png) · [Arte e prompt dos pequenos enfeites](assets/farm/MEADOW-ART-NOTES.md).

A abertura ocupa a janela com a fazenda ilustrada e os bichos passeando. O título tem uma pena desenhada em vetor, e o painel verde reúne os botões de jogar antes das configurações. A dificuldade usa três escolhas compactas; aparência, poder, som e controles ficam nas abas. No computador, o painel rola sem redimensionar a paisagem; no celular, a tela segue uma coluna sem rolagem horizontal. A composição está em `menu.css`. [Prévia da abertura](preview/menu-new-desktop.png).

**Brincar com a turma:** clique no botão ou toque em um bicho no terreiro. Eles alternam cambalhotas, dancinhas, desafios de pulo e giros, com piadas próprias e respostas de um colega. A turma também faz pequenas apresentações espontâneas, sem iniciar áudio; um toque toca a voz do animal escolhido. As falas respeitam a aparência equipada. No celular, há espaço reservado para as brincadeiras, e os balões procuram um lugar livre do título e dos controles. Movimento reduzido mantém as frases acionadas pelo usuário, sem giros, saltos ou apresentações automáticas. Tudo para ao sair do menu ou abrir a ajuda, preservando a partida. [Cambalhota no computador](preview/menu-play-desktop-tumble.png) · [No celular](preview/menu-play-mobile-tumble.png).

A ajuda abre em uma janela com rolagem própria, sem aumentar o cenário do menu. As dicas da partida acompanham o dispositivo usado. As escolhas de controles, alternativas a segurar teclas e preservação de progresso foram orientadas por práticas descritas no [suporte de Untitled Goose Game](https://untitled.goose.game/support/) e nas [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/full-list/).

## Desenvolvimento

O núcleo de gameplay usa **TypeScript**, com **HTML, CSS e Canvas 2D**, sem framework ou serviço externo necessário para jogar. O áudio, o gerador de mundo, o loop principal e parte dos sistemas visuais continuam em JavaScript durante a migração gradual. Imagens e sons acompanham o repositório.

Os sistemas de jogador, lobo, ganso, detecção, esconderijos, resgates, salvamento e regiões são editados em `src/systems/`. O desenho do ganso também fica nessa pasta. O compilador atualiza suas versões em `systems/`, nos mesmos caminhos usados pelo navegador. Consulte o [guia de TypeScript](docs/typescript.md) para detalhes sobre os tipos, a compilação e os testes.

### Estrutura

| Caminho | Conteúdo |
| --- | --- |
| `index.html` | Página do jogo e carregamento dos scripts |
| `src/systems/` | Fontes TypeScript do gameplay e do desenho do ganso |
| `src/types/` | Tipos compartilhados e contratos com o JavaScript existente |
| `game.js` | Loop principal, integração dos sistemas e colisões |
| `systems/` | JavaScript do navegador: sistemas compilados e módulos ainda não migrados |
| `assets/` | Sprites, cenários, músicas, efeitos e créditos |
| `tests/` | Testes de comportamento e contratos de tipos |
| `scripts/` | Compilação, build e ferramentas de preparação de recursos e prévias |
| `preview/` | Prévias visuais e de áudio |
| `.baseline/` | Cópia dos arquivos da versão inicial |

### Preparar o ambiente

Com Node.js 20 ou superior e npm instalados:

```sh
npm ci
npm run typecheck
npm test
npm run build
```

`npm test` compila antes de executar a suíte. O build também compila e prepara os arquivos públicos em `dist/`. Para executar checagem de tipos, testes e build em sequência, use `npm run verify`.

Durante a edição, `npm run dev` recompila os arquivos TypeScript a cada alteração; não inicia servidor nem recarrega a página. **Edite os sistemas migrados em `src/systems/` e inclua seus JavaScript compilados no commit.** `npm run check:generated` verifica se essas saídas estão atualizadas.

Os testes cobrem resgates, progressão, desbloqueios, salvamento, detecção, esconderijos, navegação, interface e áudio. As verificações automatizadas complementam os testes de jogabilidade no navegador.

<details>
<summary>Ferramentas de sprites, áudio e prévias</summary>

```sh
# Atualizar coordenadas dos sprites e imagens das aparências
npm run sprites:build

# Gerar pranchas para revisão dos personagens
npm run sprites:review

# Renderizar prévias do jogo
npm run preview:render

# Gerar músicas e efeitos sintetizados
npm run audio:generate

# Montar a prévia de áudio
npm run audio:preview
```

A dependência `@napi-rs/canvas` é usada pelas ferramentas de renderização, não pelo jogo no navegador.

As vozes atuais estão em `assets/audio/voices/v3/`, incluindo cavalo, peru e dois grasnados do Panto. Para refazer os arquivos: execute `python scripts/prepare-animal-audio.py` para obter as fontes anteriores e depois `python scripts/prepare-animal-audio-v3.py`. A preparação usa `numpy`, `soundfile` e `py7zr`; essas dependências não são necessárias para jogar. O manifesto registra os cortes, as licenças e os hashes de cada trecho, sem alterar a afinação ou duplicar chamadas.

A [comparação de sons](assets/audio/revisao.html) permite ouvir antes e depois. No jogo, as chamadas espontâneas têm menor volume, intervalo mínimo de 4,8 segundos e aguardam o fim das outras vozes. Os resgates continuam respondendo imediatamente; no máximo dois bichos falam juntos. O desafio do Panto tem prioridade sobre as chamadas de ambiente.

Para conferir os recursos, abra a [prévia dos sprites](preview/sprites.html) ou a [página de escuta](preview/audio.html) pelo servidor local.

</details>

## Créditos

As fontes, os autores e as licenças dos recursos estão nos [créditos dos sprites](assets/sprites/CREDITS.html) e nos [créditos de áudio](assets/audio/CREDITS.html), também acessíveis pelo jogo.

Os registros de produção das artes estão nas notas do [menu](assets/menu/ART-NOTES.md), do [cenário](assets/farm/ART-NOTES.md) e do [lobo](assets/sprites/WOLF-ART-NOTES.md).
