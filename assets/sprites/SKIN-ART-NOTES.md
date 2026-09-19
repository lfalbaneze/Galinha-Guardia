# Cinco amigos para o baú

Sprites criados com a ferramenta integrada **image_gen.imagegen**, pela skill imagegen. Prompts completos: [skin-prompts.json](skin-prompts.json). Referência de estilo: a folha de pato de resgate já existente no projeto. Cada personagem foi gerado em uma chamada própria.

| Nome | Identidade | PNG final | ID salvo |
| --- | --- | --- | --- |
| Zeca | Pato de cabeça verde, chapéu de palha e lenço cor de telha | [skin-zeca.png](sources/skin-zeca.png) | `punk` |
| Pipoca | Coelho creme e canela, orelha dobrada e lenço verde | [skin-pipoca.png](sources/skin-pipoca.png) | `astronaut` |
| Stella | Gata escura de olhos verdes, patinhas claras, laço lilás e guizo | [skin-amora.png](sources/skin-amora.png) | `robocop` |
| Gumercindo | Ganso cinzento com pescoço longo claro, cabeça menor e lenço azul xadrez | [skin-gumercindo-v2.png](sources/skin-gumercindo-v2.png) | `goose` |
| Paçoca | Vira-lata caramelo, orelhas castanhas e lenço vermelho | [skin-pacoca.png](sources/skin-pacoca.png) | `priest` |

Os PNGs originais de 1024 × 1536 foram copiados integralmente para `sources/`, preservando o alfa. Cada folha tem quatro linhas (frente, direita, costas, esquerda) e três colunas (parado, passo 1, passo 2). O gerador lê as margens transparentes, calcula recortes individuais e mantém os pés na mesma base durante a animação. A caminhada usa parado / passo 1 / parado / passo 2.

O campo `species` mantém a identidade de cada animal para voz e natação. O campo `sprite` seleciona a folha exclusiva da aparência. Os identificadores do baú permanecem iguais, preservando seleções e desbloqueios antigos. Amigos de resgate, PANTO e Thor continuam usando suas próprias artes.

Os cinco aparecem na partida, nas animações do menu, no baú e nos retratos. O arquivo [skin-characters.png](../../preview/skin-characters.png) mostra as quatro direções, os dois passos e o tamanho real no mapa, renderizados pelo mesmo `CharacterArt` do jogo. O script também produz cinco capturas do mapa em `preview/skin-*-in-game.png`.

Revisão do Gumercindo: o sprite recebeu pescoço mais longo, cabeça menor, bico mais estreito e penas das asas mais legíveis. A nova folha foi criada com a ferramenta integrada `image_gen.imagegen`, usando a folha anterior como alvo e o pato de resgate como referência de estilo. O prompt está em [gumercindo-v2-prompt.txt](gumercindo-v2-prompt.txt). O PNG gerado permanece intacto, com alfa original, e a versão anterior foi preservada. Os recortes de quatro direções e três poses, o retrato do menu e o ícone do baú foram reconstruídos; o nome, o desbloqueio e as habilidades permanecem iguais.

Para reconstruir os recortes, retratos e a revisão:

```sh
node scripts/build-sprite-data.cjs
node scripts/render-wardrobe.cjs
node scripts/render-skin-review.cjs
```
