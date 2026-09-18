# Objetos da fazenda

`farm-props.png` é o original RGBA de 1536 × 1024, preservado sem alterações. Gerado com a ferramenta **imagegen integrada**, em uma única chamada, em 17/09/2026.

Grade de três colunas por duas linhas, com células de 512 × 512: celeiro, galinheiro, silo; feno, bebedouro, cerca. O carregador recorta as células, encontra a silhueta por alpha e prepara os tamanhos de jogo com bordas nítidas. O PNG original continua intacto. A grade é respeitada; as margens solicitadas de 40 pixels não foram cumpridas em todos os objetos, por isso cada célula é recortada individualmente.

O atlas anterior fica como fallback de carregamento. Vegetação e abrigo do curral mantêm suas imagens próprias. As sprites de raposa e coruja enviadas pelo usuário não foram alteradas.

## Prompt exato

```text
Use case: stylized-concept.
Asset type: one production sprite atlas for a cozy pixel-art top-down farm RPG.
Primary request: Generate ONE new image, exactly 1536 pixels wide by 1024 pixels high, RGBA PNG with a genuinely transparent alpha background. The invisible layout is exactly 3 columns by 2 rows, each cell 512 by 512 pixels. Six isolated sprites, exactly one centered in each cell, with at least 40 pixels of clear transparent margin to every edge of its cell. Object centers: (256,256), (768,256), (1280,256), (256,768), (768,768), (1280,768). Do not draw the grid.
Top row, left to right: (1) a red wooden barn with wide double doors and a gray-blue roof, (2) a small wooden chicken coop with a red-brown tiled sloped roof and a short ramp, (3) a galvanized cylindrical silo with ribbed metal and a conical roof.
Bottom row, left to right: (4) exactly ONE rectangular golden straw bale bound twice with twine, (5) a low long wooden water trough visibly filled with clearly blue water, (6) one rustic wooden fence segment with exactly two upright posts and horizontal rails.
Style/medium: handcrafted cozy Stardew-like pixel-art game props. Slight top/front three-quarter perspective appropriate for a top-down RPG. Clean dark warm outlines, broad limited color clusters, chunky deliberate square pixels, crisp nearest-neighbor edges. Consistent visual language across all six objects. Enough material detail to be appealing, but every sprite must remain clear and readable when reduced to about 100 pixels. Strong distinct silhouettes.
Lighting: consistent northwest/upper-left illumination, with darker bottom-right planes. Any contact shading must stay attached to the object.
Composition: each object fully visible and individually isolated, centered in its cell, no overlap across cells. Objects may differ in natural aspect ratio: silo vertical, trough and fence horizontal. Maximize readable silhouettes within the safe 40-pixel margins.
Avoid: ground, grass, landscape, floor tiles, labels, text, numbers, borders, grids, extra objects, trees, flowers, characters, animals, decorative accessories, duplicate variants, multiple bales, detached cast shadows, watercolor, blurry edges, smooth vector gradients, photorealism, white background, white checkerboard, fake transparency. The background and all gutters must be empty transparent alpha.
```
