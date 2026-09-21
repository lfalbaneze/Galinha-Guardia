# Direção de jogo — edição 94

Penas pro Ar! é uma aventura curta de exploração e furtividade. O objetivo é resgatar os doze amigos numa fazenda com rotas, cobertura e ameaças legíveis. Pintinhos e Panto são objetivos opcionais. A conclusão acontece no décimo segundo amigo; o menu explica que os opcionais devem ser procurados antes disso.

## Apresentação

A edição 93 substitui 22 folhas de personagens por uma família de pixel art com proporções naturais, contornos seletivos finos e quatro quadros de caminhada em cada direção. Árvores, moitas, construções e cercas compartilham uma nova folha de 16 objetos. A escala distingue os animais grandes dos pequenos mesmo quando viram; as bases ficam alinhadas aos pés. A tipografia da abertura e os retratos de resultado usam a mesma apresentação arcade da partida. O resultado mostra a aparência equipada na vitória e o lobo na derrota.

Os PNGs originais estão preservados em `assets/sprites/arcade-93/`. O build exporta versões de execução com menos de 1 MB combinado, aplicando a redução e a paleta do renderizador antes da publicação. A geração valida margens, recortes e os 16 quadros de cada folha. [Direção, arquivos e prompts](../assets/sprites/ARCADE-ART-NOTES.md).

Placas de região e de girassóis têm colisão obtida da mesma geometria usada no desenho. Elas bloqueiam aproximações rápidas pelos quatro lados e mantêm as regras de visão do lobo. Saves antigos com a personagem dentro de uma placa são reposicionados pelo resolvedor existente, preservando progresso. Cercas e construções mantêm seus testes de passagem e profundidade.

A paisagem e os personagens carregam o tema de fazenda. A interface usa tinta escura, linho e detalhes de latão, com tipografia legível. Molduras de madeira, relevo e contadores decorativos saem da partida. Vida e objetivo ocupam o canto esquerdo; relógio e pontos ficam à direita. O aviso do lobo aparece quando existe uma mudança relevante. O começo recebe uma orientação curta, que cede lugar a resgates e ameaças. O resultado informa dificuldade, duração, resgates e desempenho.

`expedition-ui.css` substitui as antigas folhas `pixel-ui.css` e `arcade-hud.css` na página. As folhas antigas ficam arquivadas, sem serem carregadas. O build gera nomes com hash para as folhas públicas.

A tela inicial aproxima o pátio da fazenda e distribui seis animais maiores pelo caminho, com o cachorro inteiro dentro do enquadramento. Fundo e sprites compartilham a mesma projeção. As rotas usam curvas suaves, desaceleração e uma pequena pausa antes de inverter o sentido. A posição acompanha cada quadro do navegador; a passada acompanha a distância percorrida, sem o antigo limite de 24 quadros por segundo. A renderização com posição fracionária é usada apenas nessa cena; a partida mantém seu alinhamento de pixels. As brincadeiras param cada participante apenas durante sua ação. O botão de interação reaparece junto da turma. Telas estreitas ou muito baixas priorizam os controles, e a cena para quando a preparação é aberta ou o usuário pede movimento reduzido. Os testes do menu conferem o caminho sobre a terra, cliques, saves e deslocamento equivalente a 30, 60 e 144 Hz.

A preparação do resgate usa um painel escuro, com o elenco do jogo à esquerda e quatro modos à direita. A personagem equipada aparece com os amigos numa pequena cena feita com o terreno, a cerca e a moita da partida. O objetivo de doze resgates e os três corações aparecem abaixo. Pintinhos e Panto ilustram os bônus opcionais; a quantidade de pintinhos e suas recompensas acompanham o modo escolhido. As dificuldades usam sprites do pintinho, da galinha e do lobo; mantêm numeração, contraste de fundo e uma pequena marca lateral. Relógio, pontos por resgate e Thor têm ícones e valores próprios. Os canvases são transparentes, sem herdar a moldura do campo de jogo. `menu-briefing.js` usa os renderizadores existentes, redesenha somente quando a seleção ou os recursos mudam e não movimenta entidades da partida. O contorno dos controles aparece ao navegar por teclado.

`menu.css` concentra os estilos dessa preparação. As regras antigas de dificuldade, abas e painel de áudio foram retiradas de `style.css` e `expedition-ui.css`, evitando a sobreposição de molduras. No celular, a ilustração cede espaço às escolhas; telas baixas usam uma grade de modos. Voltar e começar ficam acessíveis enquanto o conteúdo rola. A prévia de dificuldade nunca altera a aventura salva.

Revisão reproduzível: `npm run build` e `node scripts/review-rescue-menu.cjs`. O roteiro abre a versão de publicação em seis tamanhos, seleciona os quatro modos, verifica teclado e toque, abre todas as abas, retoma um save e conclui uma partida. Imagens e relatório ficam em `.cache/rescue-menu-review`.

O resultado tem apresentação arcade: título grande, números de placar em pixel, verde de fazenda e amarelo de milho. A derrota anuncia GAME OVER e a causa; a vitória anuncia RESGATE TOTAL e destaca os bônus. A revanche reinicia a mesma fazenda e dificuldade, com placar e resgates zerados; os personagens desbloqueados ficam. O placar usa os pontos reais, com seis dígitos mínimos, e se ajusta aos totais de saves antigos. O HUD de jogo fica oculto nas duas telas. `results.css` concentra esse visual, com entrada curta e respeito à preferência de movimento reduzido. As regras antigas de resultado foram removidas das demais folhas. `node scripts/review-results.cjs` revisa derrota por tempo, derrota por vidas, vitória, teclado, toque e telas pequenas na versão de publicação.

## Regras

A fome do lobo cresce apenas durante a caça ativa: uma barra completa em 420s no Fácil, 240s no Médio, 180s no Difícil e 140s no Hardcore, antes dos acréscimos de resgate. Cada amigo soma 3,5 pontos percentuais e cada pintinho soma 1. Aos 35% ele fica Faminto; aos 75%, Voraz. A fome escala continuamente velocidade nominal (+12%, +18%, +22%, +26% por modo), duração da busca (até +60%), raio da busca (+15%), memória da entrada numa moita (+30%) e investigação de sons (+50%). A busca recebe até três pontos adicionais. O limite de velocidade ainda preserva vantagem para a corrida; no teto de progressão a fome aumenta persistência sem ultrapassar esse limite. A fome não concede visão de alvos escondidos nem reduz os cinco segundos de uma entrada testemunhada.

Menus, fim da tentativa, desafio do lago, pausa após captura, trégua inicial e fuga do Thor não acumulam fome. Reinicializar a rota do lobo não a apaga. O save preserva seu valor; saves antigos começam com a fome vazia e uma nova tentativa a zera. A duração de cada busca é fixada quando começa, evitando prolongamento infinito enquanto a fome continua crescendo.

A edição 94 também substitui os quatro atlas de vaca, cachorro, cabra e cavalo por flancos distintos e quatro fases de passada. O eixo visual tem uma faixa de tolerância nas diagonais para evitar oscilações bruscas. Isso vale para o movimento na fazenda e para os animais do título. [Prévia animada](../preview/animal-walks.html) e [prompts completos](../assets/sprites/ARCADE-94-NOTES.md).

| Modo | Proposta | Início | Resgate | Segundo restante |
| --- | --- | --- | --- | --- |
| Explorador / Fácil | Aprender e explorar | Sem limite | 100 pontos | — |
| Aventura / Médio | Furtividade e leitura do terreno | Sem limite | 100 pontos | — |
| Contra o tempo / Difícil | Escolher rotas sob pressão | 60s | 150 pontos | 2 pontos |
| Última luz / Hardcore | Dominar rotas e combos | 45s | 200 pontos | 4 pontos |

A velocidade básica é 300 em todos os modos. A dificuldade muda a oposição e as exigências da partida; os comandos mantêm a mesma resposta. Aparências mantêm seus poderes e a água mantém suas regras.

Amigos, pintinhos e o Panto conquistado concedem o valor de resgate uma única vez. Cada vida preservada concede 250 pontos na vitória. O bônus de tempo usa segundos inteiros, sem multiplicar pela quantidade de pintinhos ou pelo combo. Mesmo uma partida completa sem gastar tempo recebe mais pontos pelos resgates que pelo relógio.

Difícil: +10s por amigo e +20s por pintinho. Hardcore: +15s por par de amigos; dez pintinhos com sequência de +5, +10, +20, +40 e +50s, limitada a +50s por resgate. A janela começa em dez segundos, recebe as extensões existentes e nunca ultrapassa dez. A captura continua exigindo contato; o lobo pode descobrir em até cinco segundos um esconderijo em que viu a personagem entrar. Custos do Thor, avisos das raposas e regras do lago continuam em vigor.

## Progresso e compatibilidade

Saves preservam pontos já conquistados, resgates, personagens e resultados. Novos resgates de uma aventura em andamento usam a pontuação revisada. Vitórias antigas conservam o bônus e o multiplicador registrados, sem serem recalculadas. Preferências de áudio, controles e acessibilidade permanecem válidas.

Os testes automatizados cobrem recompensas únicas, carregamento, relógio, entrada e saída da orientação inicial e consistência de movimento. A revisão em navegador cobre teclado, toque, menus, resultado e enquadramento em computador e celular. Isso verifica a implementação; o equilíbrio fino de dificuldade ainda deve ser acompanhado em partidas humanas completas.
