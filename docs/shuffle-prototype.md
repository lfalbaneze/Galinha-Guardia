# Modo Shuffle — campanha procedural de 10 fases

Entrada opcional em `shuffle/index.html`. A aventura clássica, o curral, Panto do
modo original e seus saves não são alterados.

## Campanha

| Fase | Cenário | Objetivo |
| --- | --- | --- |
| 1 | Pomar do susto | 3 amigos; 1 perseguidor |
| 2 | Trilhas do milharal | 3 amigos; 2 perseguidores |
| 3 | Bosque dos cochichos | 4 amigos; 2 perseguidores |
| 4 | Campo dos espantalhos | 4 amigos; 2 perseguidores |
| 5 | Panto, fiscal da porteira | Chefe: 3 contra-ataques; depois use a saída |
| 6 | Colheita em disparada | 4 amigos; 3 perseguidores |
| 7 | Pedreira das penas | 5 amigos; 3 perseguidores |
| 8 | Pomar ao entardecer | 5 amigos; 3 perseguidores |
| 9 | Caminho do último feno | 5 amigos; 4 perseguidores |
| 10 | Baltazar, o sem-almoço | Chefe final: 5 contra-ataques |

São oito fases de exploração e duas de chefe, dez no total. Os 33 resgates são
cumulativos; fases de chefe não acrescentam três amigos fictícios ao contador.
Panto derrotado libera a porteira para a sexta fase, não a vitória da campanha.
A vitória só acontece ao derrotar Baltazar na fase 10.

## Geração real e repetível

`shuffle/maps.js` deriva uma semente de mapa da semente da tentativa e do índice da
fase. O sorteio de cartas usa outro fluxo aleatório: trocar a oferta ou renderizar
mais quadros não muda o mapa. Mesma semente e mesma versão do gerador reproduzem a
mesma geometria, posições e caminhos. O botão "Repetir mapas e cartas" reutiliza a
semente; "Novo baralho" sorteia outra.

Mudam os caminhos, a orientação da entrada/saída, a posição dos resgates e inimigos,
a espécie dos amigos e a distribuição de árvores, feno e pedras. Temas, número de
objetivos e marcos dos chefes são definidos pela campanha, não sorteados.

O gerador reserva rotas largas antes de colocar obstáculos. A entrada, a saída e
todos os objetivos pertencem à rede conectada. Obstáculos têm distância mínima,
não cobrem as rotas e respeitam a área de surgimento. Inimigos aparecem a pelo menos
380 unidades da entrada. Um grid de navegação permite contornar os objetos.
Nas fases de chefe, o piso central de combate permanece aberto; acessos, saída e
cobertura periférica variam. Não são dez cópias de um cenário que só muda de cor.

## Habilidades e encontros

Antes de cada fase há três cartas sem repetição, uma escolha e um embaralhamento
extra. Níveis máximos são respeitados. As seis habilidades anteriores continuam;
três novas mantêm variedade ao longo de dez escolhas:

- Pena escorregadia: +0,35 segundo de imunidade após um golpe por nível.
- Fôlego do resgate: cura um coração a cada três resgates; nível 2, a cada dois.
- Pausa pro lanche: cura mais um coração entre fases por nível.

O escudo é renovado no início de cada fase. Isca e esquiva continuam com recargas.
Resgates e contra-ataques nunca atravessam objetos sólidos, mesmo com alcance extra.
Panto anuncia uma investida e fica tonto ao terminar. Baltazar, a partir de três
pontos de resistência restantes, faz dois botes antes de ficar vulnerável. Cada
bote tem um novo aviso visível e direção travada; o segundo não mira escondido.
Derrotas, pausa e imunidade breve após dano continuam funcionando.

## Controles e checkpoint

WASD/setas: mover; Espaço: esquiva; Q: isca desbloqueada; E: contra-atacar;
Escape: pausa. Touch mantém joystick e botões fora da área jogável. Gamepad e áudio
do Shuffle ainda não estão implementados.

Campanha usa `penas-pro-ar.shuffle.v2`, formato 2 e gerador 1. O checkpoint do antigo
protótipo de três fases (`v1`) permanece guardado, mas não é convertido para a
campanha nova; ela começa sua própria tentativa. Nenhuma chave do jogo clássico é
lida ou apagada. Novas fases e escolhas são salvas; reabrir reinicia a fase atual
com os mesmos mapas, cartas e corações do checkpoint. Checkpoints incompatíveis ou
inválidos são recusados. Ausência de armazenamento não impede uma tentativa na aba.

## Arte e verificação

Reutiliza os sprites PixelLab já publicados, inclusive Panto, sem API ou créditos.
Terreno e props continuam sendo a arte provisória do Shuffle; não há migração para
Python nem promessa de revisão gráfica final nesta alteração.

`node --test tests/shuffle-run.test.cjs` verifica geração, rotas, colisões, cartas,
progressão até a fase 10, chefes e checkpoints. Inclui 2.000 mapas, flood-fill
independente de 250 mapas e 80 campanhas de estado completas. Esses testes de
estado são fixtures, não relatos de partidas humanas.

`python tests/browser/shuffle_smoke.py` roda contra `dist/` servido na porta 8765:
desktop, touch retrato/paisagem, dez fixtures de fases renderizadas, entrada pelo
menu, pausa, recarga, isolamento dos saves e abertura `file://`. Os encontros dos
chefes começam por checkpoints explícitos e depois usam somente entradas reais
de teclado e botões para desviar/contra-atacar. Balanceamento final ainda requer
playtests humanos.
