# Galinha Guardiã — Resgate na Fazenda

Evolução do jogo original em **JavaScript puro + Canvas 2D**, sem dependências para jogar. Movimento, câmera, colisões, resgate e IA foram mantidos; os personagens usam sprites licenciados, o cenário é desenhado no Canvas e a fazenda é gerada proceduralmente. Uma cópia dos três arquivos originais está em `.baseline/`.


## Sítio do Fuzuê

Cada amigo resgatado aumenta de imediato a velocidade real, a visão, a abertura do campo de visão e a duração de busca do lobo, além de reduzir seu tempo de reação. Os nomes dos quatro níveis continuam, mas não há mais intervalos de resgates sem aumento de dificuldade. Os tetos também avançam aos poucos: mesmo perto do final, cada resgate aumenta a pressão, preservando uma vantagem de velocidade para a corrida da galinha. O HUD mostra o **Cerco** e o aviso de resgate confirma o aumento.

Os seis pintinhos são **segredos**: ficam sob tufos de mato, imóveis e sem sprite, coração ou marcador até serem descobertos. A menos de 190 px, com linha de visão, há um piado e a pista “Chegue de mansinho”. A até 48 px, aparece “Segure C · investigar”: segure **C por 0,85 segundo**, inclusive parada. Correr por cima, encostar, ficar atrás de uma parede ou pausar não revela nem resgata. Depois da descoberta, o pintinho aparece amarelinho, menor que a galinha, e pode fugir e ser resgatado normalmente. O contador, o ninho e os requisitos do baú só revelam os pintinhos depois do primeiro achado. Descobertas ficam salvas; novas aventuras escondem novamente os segredos. O final continua reunindo todos; após salvar os dez amigos, uma dica lembra os piados ainda não investigados.

A interface usa placas de madeira, caderneta e um **Baú de domingo** com prévias dos trajes. As regiões ganharam plantas diferentes, frutas, bandeirolas e rastros de carroça. Os rostos laterais dos sprites têm dois olhos em três quartos; os bichos espiam por cima do ombro ao fugir.

Os bichos agora fogem da galinha com falas próprias, como “Sai pra lá, esquisita!” e “Não tem lobo aqui!”. Correr assusta de mais longe. Segure **C** para se aproximar devagar e encoste, ou persiga até cansarem. A fuga dura até 2,8 / 4,4 / 6 segundos no Fácil / Médio / Difícil e dá uma janela de descanso de 3,1 segundos. Construções bloqueiam a percepção, e os bichos respeitam colisões e os limites da região. Descoberta e cansaço são salvos.

## Sprites prontos — troca concluída

Os 13 personagens usam agora folhas de sprites licenciadas, com quatro direções, caminhada e parada. As quatro skins continuam disponíveis como sobreposições na nova galinha, inclusive escondida e no final. O desenho não altera colisões, resgates, progressão ou partidas salvas. As folhas originais, créditos, fontes e licenças estão em [assets/sprites/CREDITS.html](assets/sprites/CREDITS.html), acessíveis também pelo rodapé do jogo.

Abra [a prévia animada](preview/sprites.html) para testar direções, caminhada e roupas sem mudar seu progresso. [A comparação antes/depois](preview/sprites-before-after.png) mostra a substituição dos desenhos anteriores. O navegador interativo não estava disponível nesta sessão; a verificação visual foi feita renderizando os PNGs reais no Canvas, além dos testes automatizados e da entrega HTTP dos arquivos.

Para refazer as coordenadas dos quadros e as imagens do baú depois de alterar as folhas, instale as dependências de desenvolvimento e execute `npm run sprites:build`. `npm run sprites:review` atualiza as pranchas de personagens e roupas. O build público inclui as imagens e os créditos e continua funcionando offline, sem serviço externo de sprites.

## Jogar

A interface acompanha a partida com JavaScript: placar com contagem animada, progresso dos resgates, indicador de alerta do lobo, moldura que reage ao perigo, avisos de chegada às regiões e teclas que acendem durante o uso. O menu tem abas **Aventura / Trajes / Som**, escolha rápida de dificuldade e a galinha animada com o traje equipado; na aba Trajes é possível girar e parar os passinhos. As setas navegam entre abas, e o foco não entra em painéis escondidos. A preferência de movimento reduzido desativa essas animações. A prévia do menu não avança a simulação nem modifica o salvamento.

Abra `index.html` no navegador. Você também pode manter o salvamento em um endereço local fixo:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Então acesse `http://127.0.0.1:8765`. O Canvas combina os sprites PNG dos personagens com o cenário desenhado pelo jogo.

| Controle | Ação |
| --- | --- |
| WASD ou setas | Mover |
| Shift | Correr por até 3 segundos; solte e recupere o fôlego antes de uma nova arrancada |
| C | Segurar para andar de mansinho; investigar piados ao chegar pertinho |
| E | Entrar/sair do esconderijo marcado com E |
| Uma nova pressão na direção | Sair do esconderijo |
| Esc ou P / Pausar | Abrir o menu e pausar |
| H | Mostrar colisões para depuração |

Encoste nos **dez amigos e seis pintinhos** para resgatá-los. A caderneta revela amigos e pintinhos vistos de perto, com linha de visão. Pistas apagadas guardam a última posição vista, sem rastrear bichos distantes. Todos vão para o refúgio ou ninho do Poleiro e não podem ser perdidos. O final começa quando os dez amigos **e** os seis pintinhos estão a salvo, em qualquer ordem. Cada resgate vale 100 pontos; o bônus final é de 250 por vida restante.

O lobo persegue a galinha com cara furiosa, dentes cerrados, sobrancelhas fechadas e vapor. Falas como “GRRR! VOLTA AQUI!” acompanham a perseguição, com intervalos para não se sobreporem. Uma captura custa uma vida, com três segundos de proteção para escapar. A dificuldade selecionada só é aplicada ao começar uma nova aventura.

Ao se aproximar de feno ou vegetação, aparece **E · ESCONDER** junto da galinha. Ao entrar sem ser vista, ela se agacha, continua espiando por cima de folhas/palha e recebe **ESCONDIDA** dentro do mapa. Se o lobo presenciar a entrada de perto, o aviso muda para **ELE VIU VOCÊ!**, com contorno laranja e fundo vermelho: ele conhece aquele esconderijo e pode capturá-la ali. Uma tecla de movimento que já estava pressionada antes de E não cancela a cobertura; pressione novamente para sair.

Os personagens, incluindo os pintinhos secretos, têm poses de frente, costas e dos dois lados, com volume, passos alternados e movimentos de asas, caudas e orelhas. A direção acompanha o deslocamento; personagens bloqueados e amigos no refúgio deixam de caminhar no lugar. A galinha escondida vira o rosto para quem joga, mantendo os olhos visíveis.

A corrida dá 32% de velocidade extra por até três segundos. O medidor aparece no HUD e sob a galinha durante o uso e a recuperação. Caminhar recupera a reserva; esconder-se recupera mais rápido. Ao esgotar, solte Shift para liberar a próxima corrida. Correr contra uma parede não gasta fôlego nem produz ruído. Colisões usam passos pequenos para evitar atravessar obstáculos durante movimento rápido ou o recuo de uma captura.

## Pintinhos e skins

| Resgates na mesma aventura | Skin liberada | Tema musical exclusivo |
| --- | --- | --- |
| 2 pintinhos + 3 amigos | Punk — moicano, colete e rebites | Penas Rebeldes — guitarra, baixo e bateria |
| 4 pintinhos + 6 amigos | Astronauta — capacete transparente, traje e mochila | Órbita do Galinheiro — sintetizadores e arpejos espaciais |
| 6 pintinhos + 9 amigos | Robocop — armadura metálica e visor | Patrulha de Aço — baixo eletrônico e batida mecânica |
| 6 pintinhos + 10 amigos | Padre — batina e colarinho branco | Sinos da Capelinha — órgão e sininhos |

Escolha no **guarda-roupa abaixo do jogo** ou na opção **Sua skin** do menu de pausa. As roupas funcionam nas quatro direções, durante a corrida, o esconderijo e a cena final. São cosméticas: não alteram velocidade, colisão, vidas nem pontos. As conquistas e a skin escolhida permanecem após perder, reiniciar ou recarregar o navegador. Os dois requisitos precisam ser atingidos na mesma aventura. Conquistas antigas de 1/2/4/6 pintinhos são migradas e preservadas; aventuras novas usam os requisitos conjuntos.

Os seis pintinhos elevam gradualmente a pressão do lobo de **1,00× para 1,50× no total**: `1 + 0.5 × pintinhos / 6`. O fator aumenta a velocidade nominal, a visão e a duração de busca, além de reduzir o tempo para reagir. Limites de velocidade e percepção mantêm os esconderijos e a corrida úteis.

## Final da aventura

A cena dura 19 segundos e reúne os 16 resgatados. Os amigos e a galinha fazem cara de bravos antes de cercar o lobo. A confusão fica dentro de uma nuvem animada, com penas, estrelinhas e “POF!”, “PAF!” e “PUF!”. Depois o lobo aparece chorando, pede “MAMÃÃÃE! Vem me buscar!” e foge gritando “MAMÃE! EU QUERO COLO!”. A turma abre passagem para a fuga e termina comemorando.

## Música e efeitos

Há seis trilhas originais em loop: duas da fazenda e quatro das skins secretas. **Floresta encantada** tem flauta, cordas dedilhadas e percussão leve; **Assobio da galinha** tem uma melodia assobiada e saltitante. Escolha a trilha da fazenda abaixo do jogo ou em **Som e música** no menu de pausa. Música e efeitos têm volumes separados e um botão para desligar todo o som. As preferências ficam salvas na chave independente `galinha-resgate:audio:v1`.

**Tema musical da skin** vem ativado: equipar Punk, Astronauta, Robocop ou Padre troca automaticamente para a música correspondente da tabela acima. Ao voltar à Clássica, retorna a trilha da fazenda que você escolheu. Desmarque essa opção para usar Floresta encantada ou Assobio com qualquer roupa. O nome da trilha aparece nos controles; a preferência acompanha o salvamento da skin entre aventuras, e as configurações antigas preservam os volumes e a trilha da fazenda. A troca reutiliza um único player e respeita pausa, silêncio e volume, incluindo o volume reduzido durante a confusão do final.

A confusão do final tem estalos, molas, pancadinhas e guinchos sincronizados com a animação. O lobo ganha efeitos de tontura, choramingo e fuga; a família termina com uma pequena fanfarra. A música abaixa durante a confusão e o choro. Esconderijo e captura também têm efeitos próprios.

**Cada animal faz seu próprio som ao ser resgatado:** a vaca muge, o cachorro late, o gato mia, o pato grasna, o porco grunhe e o burro zurra. Ovelha, cabra e cordeirinho têm balidos diferentes; o coelho faz um grunhidinho suave e os pintinhos piam. As onze vozes foram suavizadas para lembrar filhotes de desenho animado: chamadas curtas de 0,43–1,27 segundo, ataques macios, menos graves ásperos, chiado e tremulação, mantendo a articulação própria de cada espécie. Tocam uma vez por resgate confirmado. Reencontrar um amigo no refúgio ou carregar a partida não repete o som. Todas respeitam o volume de efeitos, silêncio e pausa.

O áudio começa após clicar em **Começar**, **Continuar** ou **Reiniciar**. Pausar, sair da janela ou ocultar a página interrompe o som e a partida. Ao continuar, os efeitos já tocados não se repetem. Os arquivos WAV são locais e funcionam sem internet; não há dependências de áudio externas.

Abra [a página de escuta](preview/audio.html) para ouvir as seis músicas, os vinte efeitos (incluindo as vozes dos animais) e uma prévia sonora do final sem completar a missão. Os arquivos foram sintetizados por `scripts/generate-audio.cjs`; para regenerá-los e montar a prévia, use:

```powershell
npm run audio:generate
npm run audio:preview
```

Esses dois scripts usam apenas módulos nativos do Node.js. A prévia utiliza os tempos e controles do sistema real, com reamostragem simples nas mudanças de velocidade; o tratamento de afinação do navegador pode soar um pouco diferente.

## Fazenda procedural

**Gerar nova fazenda** e **Reiniciar** criam outra semente. O Poleiro e o refúgio ficam no início; as outras quatro regiões mudam de posição, tamanho e disposição. Caminhos interligados, construções, árvores, feno, canteiros e detalhes também variam. São dois amigos por região e seis pintinhos distribuídos pelas cinco regiões, com dois no Quintal. Os passeios ficam próximos ao ponto de origem; durante a fuga, os bichos podem se afastar dentro de sua região. Amigos e pintinhos preferem cantos livres dos campos e entradas de coberturas, longe dos centros dos caminhos. A distribuição usa uma segunda sequência determinística para preservar construções, obstáculos e IDs de esconderijos das sementes anteriores.

As novas fazendas usam a geração 2: as regiões ocupam retângulos sorteados sem sobreposição, e uma árvore de conexões com rotas adicionais liga seus centros. Isso varia a geometria e as ligações, além das construções e decorações. O refúgio permanece no início para orientar o jogador.

**Continuar** recupera a mesma semente e a mesma versão da geografia. Partidas anteriores, sem `worldVersion`, usam a geração 1 e preservam seus caminhos e esconderijos; **Gerar nova fazenda** inicia a geração 2. A geração reserva primeiro os caminhos, o refúgio e os pontos dos animais; depois coloca obstáculos com distância suficiente para passar. Testes de conectividade verificam regiões, dez amigos, seis pintinhos e esconderijos em 30 sementes. Também verificam variação de posições, tamanhos e redes de caminhos, além da compatibilidade exata das sementes antigas.

## Sistemas

| Arquivo | Responsabilidade |
| --- | --- |
| `game.js` | Integração, loop, ordenação por profundidade, geometria e colisões |
| `systems/character-art.js` | Quatro direções, pintinhos, costumes, expressões de raiva/choro e animações |
| `systems/skin-system.js` | Desbloqueios, escolha e persistência de skins entre aventuras |
| `systems/audio-system.js` | Música, efeitos sincronizados, volumes, pausa e persistência das preferências |
| `systems/audio-controls.js` | Controles de áudio sincronizados entre a página e o menu de pausa |
| `systems/farm-art.js` | Terreno, caminhos, construções, vegetação e cobertura em primeiro plano |
| `systems/world-generator.js` | Semente determinística, regiões, caminhos livres e distribuição do cenário |
| `systems/game-manager.js` | IDs resgatados, pontuação, níveis do lobo, vitória e salvamento validado |
| `systems/rescue-system.js` | Contato com os amigos, feedback e posições no refúgio |
| `systems/player.js` | Direção, movimento com colisão em passos curtos, fôlego, captura e proteção temporária |
| `systems/wolf-ai.js` | Patrulha com pausas, suspeita, investigação de ruído, perseguição e busca por caminhos livres |
| `systems/wolf-dialogue.js` | Falas de perseguição, suspeita e busca, com intervalo entre mensagens |
| `systems/detection-system.js` | Visão bloqueada por objetos e audição com alcance local e atenuação por paredes |
| `systems/hiding-spots.js` | Feno, árvores/vegetação, interação E e estado escondido |
| `systems/map-manager.js` | Regiões conectadas, transições e identidade do estado entre áreas |
| `systems/ui.js` | Menu, pausa, continuar, HUD e tela final |
| `systems/interface-motion.js` | Abas, prévia animada, placar, indicadores e transições da interface |
| `systems/end-game-sequence.js` | Chegada ao refúgio, cerco, nuvem cômica, fuga e comemoração |

Os scripts clássicos são carregados na ordem de `index.html`. Isso preserva a abertura direta do projeto sem bundler. A mesma instância da partida e do lobo percorre Poleiro, Granja, Estábulo, Horta e Quintal Central. Os caminhos são uma região de ligação; não há reinicialização ao cruzar suas fronteiras.

Para alterar a geração, ajuste temas, posições possíveis, reservas e objetos em `world-generator.js`; a arte correspondente fica em `farm-art.js`. `MapManager.generate(seed)` aplica o resultado antes de criar entidades. Alterações nos obstáculos devem continuar respeitando a largura das passagens e os testes de conectividade.

## Regras de detecção e progressão

Uma visão breve faz o lobo parar e desconfiar: a barra **DESCONFIOU** se preenche antes da perseguição. Sair do campo de visão faz a suspeita diminuir. A aquisição leva aproximadamente 0,16–0,73 segundo, conforme distância, amigos e pintinhos resgatados; contato muito próximo pode gerar uma reação imediata. A patrulha faz pausas para olhar em volta e segue marcos públicos da fazenda, sem consultar a posição oculta da galinha.

O lobo só atualiza `lastKnown` após uma observação visual confirmada. Edificações, fardos e troncos bloqueiam a visão; água não. Correr fora de sua visão pode produzir **OUVIU ALGO**: ele investiga uma posição aproximada registrada em intervalos de 0,65 segundo, sem receber a localização visual exata. A audição alcança de 120 a 180 pixels conforme o nível; cada barreira reduz esse alcance. A investigação de som acaba se não houver novas pistas.

Esconder-se bloqueia novas observações visuais e ruídos, inclusive a curta distância. A exceção é **entrar no esconderijo diante do lobo**: no instante de apertar E, ele precisa ter visão livre, respeitar o campo de visão e estar a até **180 px no Fácil, 220 px no Médio ou 260 px no Difícil**. A percepção próxima continua cobrindo seu entorno imediato. O atraso inicial e o atordoamento após uma captura impedem esse testemunho.

Quando vê a entrada, ele avisa **“EU VI VOCÊ ENTRAR AÍ!”**, mantém a expressão furiosa e segue por caminhos livres até o ponto observado. A captura exige contato físico, passagem visual livre entre os dois e ausência de proteção temporária. Ela retira a galinha da cobertura, desconta uma vida uma única vez e concede três segundos para fugir. Para escapar, saia e quebre a visão antes de usar outra cobertura.

Essa lembrança dura de 8 a 14 segundos conforme o nível de amigos resgatados. O lobo confere o local vazio por 0,8 segundo antes de continuar a busca; também abandona uma aproximação que esgote o prazo. Se a galinha mudar de esconderijo sem ser vista, ele continua indo ao ponto antigo. Entradas não testemunhadas permanecem seguras. Pausar congela a lembrança; recarregar preserva o tempo restante e o ponto conhecido. Na busca avançada comum, ele visita coberturas próximas da última observação, sem saber qual o jogador ocupa. Um resgate mostra o nome do amigo, os pontos e a contagem na própria tela.

| Amigos resgatados (pontos da progressão contínua, antes do fator dos pintinhos) | Visão | Busca | Comportamento |
| --- | --- | --- | --- |
| 0 | 340 px / 92° | 4 s | Memória curta e pouca investigação |
| 3 | 421 px / 109,4° | 7,6 s | Mais percepção e investigação |
| 6 | 502 px / 126,8° | 11,2 s | Busca mais longa e ampla |
| 10 | 610 px / 150° | 16 s | Seis pontos e inspeção de esconderijos próximos |

No modo Médio, a velocidade básica do lobo subiu de cerca de 168 para 230 px/s no primeiro nível e chega a 303 px/s no último, antes dos pintinhos. O limite final corresponde a 96% da corrida da galinha no Médio/Difícil e 90% no Fácil. Com seis pintinhos, visão e busca ficam limitadas a 840 px e 24 segundos; a audição continua limitada a 180 px e nunca revela alguém escondido. O modo escolhido também ajusta a velocidade inicial e o tempo antes de o lobo começar a detectar.

## Salvamento

O progresso é mantido em memória entre regiões e salvo automaticamente a cada dois segundos, nos resgates, entrada no esconderijo, transições e pausa, usando `localStorage` com a chave `galinha-guardia-save-v1` (formato interno versão 3). Inclui semente, amigos e pintinhos resgatados, posições, vidas, pontos, dificuldade, fôlego, esconderijo, suspeita do lobo, pista sonora, entrada em cobertura testemunhada e andamento da busca. Recarregar durante uma busca preserva o tempo restante e o ponto investigado. A lembrança de cobertura é opcional e validada; partidas antigas não recebem conhecimento inventado. Uma vitória salva repete a cena final. **Gerar nova fazenda/Reiniciar** substitui a missão anterior, mas mantém as skins na chave separada `galinha-guardia-wardrobe-v1`.

Partidas no formato 2 preservam a mesma fazenda, resgates, pontos e vidas, e recebem os seis pintinhos ainda disponíveis. Uma vitória antiga volta à exploração para completar os pintinhos, sem conceder novamente o bônus de vidas. Partidas do formato 1, que usavam outra geografia, preservam progresso e recebem os novos pontos acessíveis de uma semente de migração fixa.

Se o navegador bloquear o armazenamento, o jogo continua funcionando e o HUD informa que o progresso vale só nesta sessão. Dados inválidos são ignorados. O salvamento pertence ao navegador e ao endereço utilizado: `file://` e `http://127.0.0.1:8765` não compartilham a mesma origem.

## Verificação

Validação final: **143 testes aprovados**, sintaxe conferida e prévias Canvas revisadas. Os oito testes da interface cobrem abas, foco, dificuldade da próxima aventura, placar, indicadores, transições, prévia e movimento reduzido; não substituem um teste visual no navegador.

Requer Node.js apenas para rodar os testes, sem `npm install`:

```powershell
node --test
```

Os testes exercitam os scripts reais em uma página simulada, com relógio controlado. Cobrem os dez amigos e seis pintinhos, resgate único, desbloqueios e escolha de skins, persistência entre aventuras, migração, armazenamento inválido/bloqueado, visão e oclusão, memória, busca, navegação, cobertura, captura, transições e o fluxo final. Esse ambiente não substitui uma inspeção visual no navegador.

Os testes também verificam limites do lobo com os seis pintinhos, escape por cobertura, falas com intervalo, expressões e choro nas fases corretas e ausência de bônus duplicado ao migrar uma vitória antiga. O tempo de busca começa depois de o lobo alcançar a última posição conhecida; um destino inacessível não o prende em uma busca infinita.

Treze testes adicionais cobrem a entrada em cobertura testemunhada: limites exatos por dificuldade, visão e obstáculos, captura em feno e arbusto reais, rota ao redor de lago, proteção e captura única, fuga para outro esconderijo, pausas, término da inspeção e salvamento válido/antigo/malformado. A prévia `preview/hiding-exposed.png` mostra o aviso e o lobo bravo; reproduza com `node scripts/render-witness-preview.cjs`.

Os 28 testes de áudio verificam início por interação, volumes, troca de música sem sobreposição, limite de efeitos simultâneos, sincronização do final, pausa e retomada, preferências, falhas de reprodução e integração com resgates e menus. Incluem o som correto dos dez amigos e dos seis pintinhos, sem repetição após o resgate ou recarregamento. Também verificam os quatro temas por desbloqueio real, troca automática e manual, configurações antigas e persistência da skin e de sua música após recarregar ou reiniciar. Os WAVs passaram por validação de formato, duração, amostras, clipping e continuidade dos loops. A mistura da prévia final usa 22 efeitos e não apresentou clipping. A reprodução foi simulada nos testes; não houve avaliação auditiva em navegador nesta sessão.

As imagens em `preview/` foram geradas pelos desenhos reais do jogo e revisadas. Para reproduzir essa verificação visual, instale apenas a dependência de desenvolvimento:

```powershell
npm ci
npm run preview:render
node scripts/render-characters.cjs
```

As folhas `costumes.png` e `expressions.png` mostram as novas skins e expressões; `chick-rescue.png` mostra o desbloqueio. Os quadros `final-angry.png`, `final-cloud.png`, `final-crying.png`, `final-flee.png` e `final-party.png` registram a sequência final.

`@napi-rs/canvas` é usado somente nesses scripts; não é necessário para abrir o jogo nem para rodar os testes de lógica. O navegador interativo estava indisponível nesta sessão. A renderização offline verifica a arte, mas não substitui um playtest de controles e balanceamento no navegador.
