# As três galinhas

A carijó recebeu uma nova folha e um ícone de rosto, descritos em [CUTE-ART-NOTES.md](CUTE-ART-NOTES.md). A folha carijó abaixo fica no acervo; as folhas sedosa e azul continuam em uso.

Artes criadas com a ferramenta integrada **image_gen.imagegen**, pela skill imagegen; não foi usado o modo CLI. Os prompts completos estão em [hen-prompts.json](hen-prompts.json).

| Aparência | PNG final | Identidade no jogo |
| --- | --- | --- |
| Carijó | [sources/hen-carijo.png](sources/hen-carijo.png) | `classic`, personagem padrão |
| Sedosa japonesa | [sources/hen-silkie.png](sources/hen-silkie.png) | `silkie` |
| Galinha azul | [sources/hen-blue.png](sources/hen-blue.png) | `blue` |

Cada folha transparente de 1024 × 1536 contém quatro direções (frente, direita, costas e esquerda) e três poses por direção (parada e dois passos alternados). A carijó tem penas rajadas; a sedosa tem plumagem branca, topete e patas plumadas; a azul tem corpo arredondado, penas azuis, pintas escuras e crista vermelha.

A aparência azul foi criada a pedido do usuário, inspirada na Galinha Azul da Maggi, adaptada ao estilo do jogo. Referência de identidade: [apresentação da personagem pela Publicis](https://publicis.com.br/cases/galinha-azul-de-maggi-3d). A folha é uma imagem gerada para o jogo, não um arquivo oficial da marca.

Os PNGs gerados são preservados integralmente, inclusive o alfa. `scripts/build-sprite-data.cjs` lê os espaços transparentes e publica os recortes e âncoras em `systems/sprite-data.js`. O renderer prende os pés à base de cada quadro e mantém uma escala única por aparência. As três medem até 54 pixels de altura no mapa; as mesmas imagens aparecem no HUD, na prévia do baú e no final. A troca não muda colisão, velocidade, fôlego ou regras de resgate.

As três aparências estão disponíveis desde o início, inclusive em perfis antigos. O identificador `classic` agora usa a carijó; os demais desbloqueios e a aparência já equipada são preservados. O sprite anterior [chicken.png](sources/chicken.png) e seus créditos continuam no projeto como histórico.

Prévias renderizadas pelo código real: [as três galinhas](../../preview/chickens.png), [carijó no mapa](../../preview/hen-classic-in-game.png), [sedosa no mapa](../../preview/hen-silkie-in-game.png), [azul no mapa](../../preview/hen-blue-in-game.png).

Para reconstruir os recortes e as prévias:

```sh
node scripts/build-sprite-data.cjs
node scripts/render-wardrobe.cjs
node scripts/render-hen-review.cjs
```
