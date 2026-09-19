# Lobo expressivo

A folha [sources/wolf-expressivo.png](sources/wolf-expressivo.png) contém o lobo usado na partida, no HUD e no final. O desenho tem pelagem cinza-carvão, focinho claro, olhos âmbar, patas maiores e um rosnado discreto, com contornos legíveis sobre a grama.

Arte criada com a ferramenta integrada **image_gen.imagegen**, pela skill imagegen; não foi usado o modo CLI. Os prompts completos da folha e do retrato estão em [wolf-prompts.json](wolf-prompts.json).

## Folha e animação

PNG transparente de 1254 × 1254 pixels, com 16 quadros. As linhas são frente, direita, costas e esquerda; cada linha tem quatro poses de espera e caminhada, usadas sem espelhar a direção oposta.

A integração seleciona os quadros pelos espaços transparentes da folha. Os pivôs individuais alinham as patas entre as poses. Uma única escala limita a folha a 90 pixels de altura e 96 de largura no mapa, preservando as proporções entre direções.

A imagem gerada permanece intacta, inclusive o canal alfa. `scripts/build-sprite-data.cjs` calcula os recortes e publica `systems/sprite-data.js`; os ajustes de alinhamento e escala são feitos no renderizador. A colisão e a IA não dependem do tamanho do desenho.

O retrato [wolf-expressivo.png](../menu/portraits/wolf-expressivo.png) foi gerado a partir do retrato anterior e da nova folha como referência de identidade; aparece na dificuldade Lobo à solta.

Revisão pelo Canvas real: [16 quadros e retrato](../../preview/wolf-new.png), [lobo no mapa](../../preview/wolf-in-game.png). Para reconstruir os recortes e a revisão:

```sh
node scripts/build-sprite-data.cjs
node scripts/render-wolf-review.cjs
```

## Manutenção

Ao substituir ou ajustar os sprites, preserve a correspondência entre direção e animação. Confira também a posição das patas e a relação entre o desenho e a área de colisão; mudar o tamanho visual não altera a lógica de perseguição.

As folhas anteriores `sources/wolf-feroz.png` e `sources/wolf.png`, além do retrato `../menu/portraits/wolf.png`, permanecem como histórico. Os autores e a licença da arte original estão em [CREDITS.html](CREDITS.html).
