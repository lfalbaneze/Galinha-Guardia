# Complemento de cenários — setembro de 2026

Arquivo: `farm-habitats.png` (1254 × 1254, RGBA). Gerado com a ferramenta ImageGen em uma única chamada. O PNG original foi mantido, com transparência nativa. A folha contém quatro objetos isolados: abrigo de gado, salgueiro, amoreira baixa e pereira.

Recortes, em pixels (`x, y, largura, altura`):

| Objeto | Recorte |
| --- | --- |
| Abrigo | 32, 231, 626, 359 |
| Salgueiro | 707, 44, 527, 610 |
| Amoreira | 52, 859, 581, 318 |
| Pereira | 787, 671, 374, 539 |

O carregador usa o canal alfa, sem remover branco. A renderização usa a mesma redução e paleta dos sprites existentes. Os recortes foram inspecionados no PNG e no Canvas real do jogo. A arte é embutida por `scripts/build-farm-data.cjs` para continuar funcionando sem conexão e ao abrir o HTML local.

## Prompt utilizado

```text
Use case: stylized-concept.
Asset type: production environment sprite atlas for a cozy classic 2D pixel-art farming RPG.
Generate ONE 1024x1024 PNG image with genuinely transparent background and preserved alpha, exactly FOUR isolated environment sprites arranged in a clean 2x2 grid. No background, ground plane, checkerboard, labels, text, extra scenery, animals, people, border or watermark.
Layout: each sprite is fully contained in its own 512x512 quadrant, centered horizontally, with at least 45 pixels of transparent padding from all quadrant edges. All four entire objects must be visible. Generous completely empty transparent gutters. Quadrants are crop frames.
TOP LEFT: a rustic open-front cattle shelter, wide low timber roof, two clearly visible open stalls separated by wooden posts, a little golden hay inside, natural dark timber walls with front and right side visible. Low wide silhouette, distinctly different from a tall red barn. NO animals.
TOP RIGHT: one graceful leafy willow tree, drooping olive-green canopy and visible warm-brown trunk and roots. Tall graceful asymmetrical hanging branches.
BOTTOM LEFT: one low wide leafy bramble shrub, asymmetrical silhouette with a few small dark red berries nestled in leaves. Dense low spreading olive foliage. NO white flowers.
BOTTOM RIGHT: one smaller upright pear tree, a tall oval irregular canopy with a few recognizable light yellow-green pears, warm brown trunk and visible roots, distinctly different from a round apple tree.
Style: crisp readable classic RPG pixel art with painted pixel clusters, dark moss-brown outlines and solid opaque fills. Coherent limited muted olive, ochre and weathered-wood palette. Three-quarter top-down RPG camera, front and right side visible, light from upper left. Clear large shape groups and controlled fine detail, designed to read at only 100–170 pixels high when used in game. Sprite edges are crisp and clean, no stray pixels, no floating objects, no detached shadows, no smooth vector style, no 3D render, no blurry painted edge. Roots, trunks, posts and hay belong to their own sprite, with NO grass mound or detached ground shadow. Absolutely transparent everywhere outside the four sprites.
```
