# Modo Shuffle — campanha procedural de 10 fases

## Sobrevivência no navegador (30/09/2026)

O botão **Sobrevivência Shuffle** no `index.html` principal abre
`shuffle/index.html#survival` e inicia a partida após carregar os sprites.
Funciona por `file://` ou HTTP, sem Python no computador do jogador. A versão
nativa permanece em `python_game/`; as mecânicas foram adaptadas para JavaScript
e Canvas em `shuffle/survival.js`, reutilizando mapas, colisão e navegação web.

Sobreviva cinco minutos, com dez ondas e até 48 inimigos simultâneos: raposas
rápidas, lobos resistentes e gansos. Colete milho, ovos, foice e botas (níveis 1–3),
leite para curar e XP para aumentar dano e recuperar vida. Os ataques são
automáticos. WASD/setas ou joystick touch movem; Espaço/botão esquiva; Esc pausa.
Minimapa mostra inimigos e itens; HUD mostra tempo, poderes, nível e experiência.
Repetir semente reproduz o mapa e os itens iniciais. As sementes web não
reproduzem a geometria Python: são geradores diferentes.

A sobrevivência não lê nem grava checkpoints: recarregar reinicia a tentativa.
Os saves da campanha Shuffle e da aventura permanecem preservados, inclusive
ao perder, vencer e repetir. Sem o fragmento `#survival`, a página permite
escolher sobrevivência ou campanha de resgate.

Validação: `node --test tests/shuffle-survival.test.cjs` e
`python tests/browser/survival_smoke.py` (após `npm run build`). O teste de navegador
aceita `BROWSER_CHANNEL=msedge` para usar o Edge instalado. A simulação de cinco
minutos usa invulnerabilidade de fixture; não é uma avaliação humana de dificuldade.

Verificado em 30/09/2026: 68 testes focados (Shuffle, movimento e integração
PixelLab) aprovados, typecheck e build web concluídos. Edge headless validou
seis cenários, incluindo as oito aparências, entrada pelo menu, teclado, toque em retrato e
paisagem, poderes, pausa, derrota/vitória, repetição e preservação do checkpoint.
Abertura por `file://` passou tanto na raiz quanto em `dist`. Capturas ficam em
`.cache/survival-web-review/`. A suíte geral `npm run verify` não ficou verde:
apontou falhas fora do Shuffle, incluindo fixtures de `FarmRefuge.contains`,
renderização de cercas e desafios de Panto; esses testes não foram alterados.

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
campanha nova; ela começa sua própria tentativa. O guarda-roupa clássico é apenas
lido para herdar a aparência equipada e os desbloqueios; nunca é alterado pelo Shuffle.
Novas fases e escolhas são salvas; reabrir reinicia a fase atual
com os mesmos mapas, cartas e corações do checkpoint. Checkpoints incompatíveis ou
inválidos são recusados. Ausência de armazenamento não impede uma tentativa na aba.

## Arte e verificação

### Poderes e personagens na sobrevivência

Os itens coletáveis são **Milho Kombat**, **Resident Ovo**, **Foice May Cry** e
**Super Bota Bros.**, com três níveis cada. **Leite Up** recupera até dois corações.
Os nomes e níveis aparecem numa faixa fora da arena; só entram os poderes coletados.

Cada aparência jogável mantém seu sprite e recebe uma habilidade própria:

| Personagem | Poder | Mecânica |
| --- | --- | --- |
| Erina | Ovo of War | Ovo explosivo, dano em área a cada 4 s. |
| Midori | Final Penasy | Escudo renovado a cada 9 s e penas que desaceleram. |
| Alzira | The Legend of Zé-Raio | Raio encadeado em até quatro alvos a cada 4 s. |
| Zeca | Quack'em Up | Três jatos perfurantes a cada 3 s. |
| Pipoca | Cenoura Gear Solid | Esquiva deixa minas, armadas em 0,5 s e com duração de 8 s. |
| Stella | Garra's Creed | Duas garras orbitais, dano a cada 0,4 s no alcance das garras. |
| Paçoca | Au de Guerra | Latido em área com dano e empurrão a cada 4 s. |
| Gumercindo | Grasna em Skyrim | Grasnado em cone a cada 5 s, dano e paralisia de 2 s. |

A entrada direta herda a aparência equipada. Na pausa, **Trocar bicho · reiniciar**
leva à seleção; também é possível escolher no fim de uma tentativa. Só aparecem
habilitados os personagens já desbloqueados na aventura. A escolha do Shuffle
vale para novas tentativas nesta aba, sem equipar ou desbloquear nada no save original.
Poderes automáticos ficam pausados com a partida, respeitam obstáculos e são
reiniciados ao tentar novamente. Pipoca usa a esquiva já existente (Espaço/touch).

`tests/shuffle-survival.test.cjs` verifica as oito mecânicas e seus limites.
`tests/browser/survival_smoke.py` confere desktop, celular nas duas orientações,
abertura local, coleta, HUD fora da arena, escolha e sprites reais das oito skins,
preservando o guarda-roupa. `CHECK_FOLKLORE=1` acrescenta a conferência dos novos
inimigos quando todos os atlas estiverem instalados.

Reutiliza os sprites de personagens já publicados, inclusive Panto, sem API ou créditos.
O cenário web agora usa o atlas `farm-arcade-93.png`, carregado pelo mesmo
`FarmSprites` do jogo principal: macieiras, pereiras, salgueiros, feno, moitas,
caixotes e flores substituem os blocos provisórios. Cercas usam as peças já
existentes da fazenda. Os recortes preservam proporção, transparência e base no
chão, com redução em cache; vegetação que encobre a galinha fica transparente.

Terreno e trilhas são desenhados uma vez por mapa, com textura irregular de
grama e terra, vegetação nas margens e cruzamentos sem emendas escuras.
Flores são decorativas e ficam fora das rotas. A composição visual não consome
o sorteio de itens nem altera obstáculos, objetivos ou checkpoints. O teste de
navegador também verifica o carregamento e uso real do atlas por HTTP e `file://`,
com capturas de início em `.cache/survival-web-review/scenery-*.png`.

O Shuffle reutiliza `CharacterArt` para selecionar as oito direções, estabilizar
mudanças de orientação e ajustar a passada por espécie e velocidade. Usa os
quadros de corrida existentes ao correr/esquivar; espécies sem esse ciclo
continuam usando sua caminhada. A fase acompanha o deslocamento real, inclusive
após resolver os contatos da horda. O teste de navegador observa os recortes
desenhados no canvas para comprovar que o ciclo de corrida é usado. Isso não
substitui avaliação artística em movimento nem cria quadros novos de animação.

### Inimigos da fazenda e do folclore

| Inimigo | Primeira onda | Comportamento |
| --- | --- | --- |
| Raposa | 1 | Aproximação pelos lados, fechando a distância até o contato. |
| Fuinha | 1 | Arrancadas curtas entre passos mais lentos. |
| Lobo e ganso | 2 | Perseguição pela malha de caminhos. |
| Mula sem Cabeça | 3 | Faixa de aviso, investida na direção travada e recuperação. |
| Curupira | 4 | Raízes avisadas no chão antes de causar dano. |
| Boitatá | 6 | Movimento sinuoso e rastro temporário de fogo. |
| Cuca | 8 | Três feitiços com preparação visível; só uma ativa, barra de vida e mais XP. |

Ataques respeitam os obstáculos, a pausa, a esquiva e a invulnerabilidade após
dano. Há no máximo 48 inimigos, 48 áreas temporárias e 24 feitiços. O sorteio
introduz primeiro os tipos ainda não vistos e usa somente espécies com arte
disponível no navegador. A aventura original mantém suas regras de inimigos.

Produção dos cinco sprites novos: `scripts/lib/pixellab-shuffle-cast.cjs`.
A raposa reutiliza seu atlas PixelLab existente. A opção `--shuffle` isola o
elenco novo das filas gerais anteriormente canceladas. Para retomar a produção
sem reenviar trabalhos aceitos:

```powershell
node --use-system-ca scripts/pixellab-batch.cjs --shuffle --phase=base --queue=shuffle-folklore --characters=fuinha --workers=1 --frames=12
node --use-system-ca scripts/pixellab-batch.cjs --shuffle --phase=base --queue=shuffle-legends --characters=curupira,boitata,cuca --workers=3 --frames=12
node --use-system-ca scripts/pixellab-batch.cjs --shuffle --phase=base --queue=shuffle-mule-corrected --characters=mula-sem-cabeca --workers=1 --frames=12
```

Conferir os candidatos em `preview/pixellab/index.html` antes de instalar com
`node scripts/pixellab.cjs install --shuffle --all` e reconstruir a distribuição.
A chave fica em `.env.local`; os atlas publicados não precisam da API para jogar.
A primeira Mula gerada tinha cabeça e foi rejeitada. A referência frontal
corrigida pela PixelLab está em `assets/sprites/pixellab-108/meta/references/`;
a criação v3 da Mula usa essa imagem em vez de recomeçar somente pelo texto.

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
