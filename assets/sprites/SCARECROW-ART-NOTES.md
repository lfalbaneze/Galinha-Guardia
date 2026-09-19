# Espantalho e corvos

Arte criada em 18/09/2026 com a ferramenta integrada imagegen, sem uso de CLI.

- Atlas original: [sources/scarecrow-crows.png](sources/scarecrow-crows.png), PNG RGBA de 1536 × 1024, preservado integralmente.
- Integração visual: `src/systems/scarecrow-art.ts`.
- Comportamento: `src/systems/scarecrow-system.ts`.
- Prévias do renderer real do jogo: [pousados](../../preview/scarecrow-perched.png) e [em voo](../../preview/scarecrow-flight.png).
- Reprodução das prévias: `node scripts/render-scarecrow.cjs`.

Há um espantalho próximo ao milharal, escolhido por semente em uma área livre de trilhas, plantações, construções e pontos de nascimento. Seus três corvos descansam no chapéu e nos braços, saem em sequência quando a galinha se aproxima e voam na direção oposta. Correr assusta de mais longe. Depois de sete segundos sem a galinha por perto, o mesmo bando retorna e pousa. Pausa, derrota e desafio do lago congelam o ciclo.

O atlas contém um espantalho, duas poses de repouso e três poses de voo. A renderização usa recortes e pivôs por pose; o PNG não foi recortado, repintado nem ampliado. Transparência e enquadramento foram conferidos por inspeção da imagem e dos pixels, e as duas prévias foram renderizadas com os sprites reais.

| Pose | x | y | Largura | Altura |
| --- | --- | --- | --- | --- |
| Espantalho | 87 | 48 | 406 | 472 |
| Corvo pousado | 628 | 190 | 281 | 270 |
| Corvo olhando para baixo | 1129 | 231 | 272 | 230 |
| Asas levantadas | 96 | 575 | 365 | 337 |
| Asas abertas | 568 | 669 | 421 | 253 |
| Asas baixas | 1109 | 725 | 352 | 230 |

## Prompt exato

```text
Use case: stylized-concept. Asset type: ONE transparent PNG sprite atlas for a cozy top-down pixel-art farm adventure. Create a 1536 x 1024 PNG, EXACTLY three columns and two rows of equal 512 x 512 cells, SIX isolated complete sprites. Top left cell: one charming rustic scarecrow viewed from slightly above, facing camera, straw hat with russet band, burlap head with stitched friendly smile, faded teal patched shirt with sleeves stretched along a wooden crossbar, little tufts of straw at cuffs and waist, a single wooden supporting post reaching the bottom. NO birds attached to this scarecrow, no base/ground. Top middle cell: one small black farm CROW, perched on its feet, facing RIGHT, folded wings, short stout black beak, glossy charcoal plumage with subtle blue-grey highlights, NOT a yellow-beaked songbird. Top right cell: the same crow facing RIGHT, perched and looking downward. Bottom row has THREE flight animation poses of that EXACT same crow facing RIGHT: left cell wings fully raised, middle cell wings extended horizontally with a slightly visible back, right cell wings down. Flight bodies have the same orientation, size and center; change only wing pose. Pixel-art medium with finely shaded color clusters and warm dark outlines, detailed but readable silhouettes matching a charming 16-bit farm RPG. Limited natural palette, consistent light from upper left. Scarecrow fits within 340 wide by 425 tall at center of its cell, crow perched fits roughly 220 wide by 230 tall at center of its cells; flight crow body about 220 wide, spread wings fit within 420 wide by 350 tall with body centered at x256 y285 in EACH flight cell. Leave generous transparent gutters, no limb touches any cell edge. Genuinely transparent alpha background across all empty pixels, no backdrop, no checkerboard, no ground, no shadows, no labels, no text, no cell borders. Do not add extra birds or props. These will render at 90px tall for the scarecrow and 27px body length for crows, so keep crisp shapes and recognizable wings.
```

