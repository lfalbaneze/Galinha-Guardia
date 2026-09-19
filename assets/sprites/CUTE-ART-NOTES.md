# Bichinhos mais fofinhos — setembro de 2026

Arte criada com a habilidade **imagegen**, usando a ferramenta integrada `image_gen.imagegen` (sem CLI). Os PNGs originais gerados foram copiados integralmente para o projeto; a transparência e os pixels foram preservados. O renderizador só recorta os quadros e os mostra no tamanho do jogo.

São 14 personagens: galinha carijó, cachorro, ovelha, porco, pato, coelho, cabra, vaca, gato, burro, cordeirinho, pintinho, cavalo e peru. Cada folha tem 12 poses: frente, direita, costas e esquerda, com três poses por direção. O cavalo e o peru passam a ter costas e frente próprias. A turma usa rostos maiores, contornos limpos, sombreamento simples e cores quentes; roupas e marcas particulares continuam distinguindo as espécies e as skins.

## Arquivos finais e prompts

- Folhas transparentes: [sources/](sources/), arquivos `cute-*-v2.png` (a carijó usa `cute-hen-v2.png`).
- Cachorro e referência de estilo: [cute-prompts.json](cute-prompts.json).
- Galinha, cavalo e peru: [cute-batch1-prompts.json](cute-batch1-prompts.json).
- Ovelha, porquinho, pato e coelho: [cute-batch2-prompts.json](cute-batch2-prompts.json).
- Cabra, vaca, gato, burro, cordeirinho e pintinho: [cute-batch3-prompts.json](cute-batch3-prompts.json).
- Ícone apenas do rosto da galinha: [cute-carijo-face-v2.png](../menu/portraits/cute-carijo-face-v2.png), com [prompt completo](../menu/portraits/cute-hen-face-prompt.txt).

O cachorro tricolor anterior serviu como referência de identidade para o cachorro novo, que orientou a linguagem gráfica dos demais. Os sprites anteriores ficam no acervo. As aparências desbloqueáveis, Panto, Thor, Lorenzo e lobo preservam suas identidades próprias.

`scripts/build-sprite-data.cjs` detecta os intervalos transparentes, valida os quadros e publica os recortes em `systems/sprite-data.js`. Cada direção usa a mesma escala, e cada quadro tem sua própria base para manter as patas no chão. IDs, colisões e partidas salvas continuam compatíveis.

## Proporção no cenário

A revisão de escala diferencia o porte dos animais: cavalo até 104 px de altura, vaca 88, burro 82, cabra 62, ovelha 58, porco e peru 54, cachorro 48, cordeirinho 42, coelho 40, pato e gato 38, pintinho 24. A galinha continua com até 54 px. Os limites são medidos sobre o corpo opaco, com escala uniforme nas quatro direções; os PNGs originais permanecem intactos. Sombras acompanham o porte. O cercado distribui os três animais grandes na fileira de trás e os menores na frente, acima da cerca.

Para conferir a arte aplicada, execute `node scripts/render-rescue-art.cjs`: [turma e direções](../../preview/rescue-animals.png) e [cena no jogo](../../preview/rescue-in-game.png).
