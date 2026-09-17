# Lobo feroz

A folha `assets/sprites/sources/wolf-feroz.png` contém os sprites do lobo usado na partida.

## Folha e animação

PNG transparente de 1254 × 1254 pixels, com 16 quadros organizados em quatro direções. Cada direção possui poses de espera e caminhada.

A integração seleciona os quadros pelos espaços transparentes da folha. Os pivôs individuais alinham as patas entre as poses, evitando que o personagem pareça saltar durante a animação. A escala usada no Canvas é 0,3.

A imagem de origem permanece intacta. Os ajustes de recorte, alinhamento e escala são feitos no renderizador.

## Manutenção

Ao substituir ou ajustar os sprites, preserve a correspondência entre direção e animação. Confira também a posição das patas e a relação entre o desenho e a área de colisão; mudar o tamanho visual não altera a lógica de perseguição.

A folha anterior, `sources/wolf.png`, permanece como referência. Seus autores e sua licença estão em [CREDITS.html](CREDITS.html).
