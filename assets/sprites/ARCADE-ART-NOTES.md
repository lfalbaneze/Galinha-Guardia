# Arte arcade — edição 93

Revisão atual dos quadrúpedes: [edição 96 — ciclos laterais e inspeção quadro a quadro](QUADRUPEDS-96-NOTES.md). As folhas 93–95 abaixo documentam o histórico; os quadrúpedes agora usam os atlas de execução 96.

Correção posterior dos oito quadros laterais da vaca: [edição 95 — quatro patas legíveis](COW-95-NOTES.md).

Atualização de vaca, cachorro, cabra e cavalo: [edição 94, arquivos e prompts](ARCADE-94-NOTES.md). As quatro folhas de execução da edição 94 substituem as correspondentes abaixo; as outras dezoito continuam em uso.

Gerada em 20/09/2026 com a ferramenta integrada **OpenAI ImageGen** (`image_gen.imagegen`). Nenhuma chamada de API externa ou serviço de sprites. A folha da carijó serviu de referência de estilo para os demais animais e para o cenário.

## Direção visual

Animais com proporções naturais, olhos pequenos, luz superior esquerda, contornos seletivos finos e cores de fazenda. Caminhada de quatro quadros por direção; ordem das linhas: frente, direita, costas, esquerda. Colunas: contato esquerdo, passagem, contato direito, passagem. A folha base da carijó segue essa direção; este parágrafo registra o resumo do seu pedido inicial.

## Arquivos finais

- Originais transparentes: [arcade-93/](arcade-93/), 22 folhas PNG sem alteração.
- Sprites de execução: [arcade-93/runtime/](arcade-93/runtime/). O exportador recorta pela transparência e aplica a mesma redução e paleta de `SpriteStyle`, preservando a escala e os pontos de apoio. Os originais continuam disponíveis.
- Cenário: [farm-arcade-93.png](../farm/farm-arcade-93.png), 16 objetos; metadados em [arcade-data.js](../farm/arcade-data.js).
- Metadados dos personagens: [arcade-art-data.js](../../systems/arcade-art-data.js).
- Exportação reproduzível: `npm run build`, que executa `scripts/build-arcade-art.cjs` e `scripts/build-arcade-world.cjs`.

A revisão substitui galinha, lobo, doze amigos, pintinho e sete aparências adicionais (22 folhas). Panto, raposas, Thor, coruja, corvos, boia e a paisagem do título mantêm seus recursos existentes. Os IDs e desbloqueios salvos permanecem os mesmos.

## Prompts finais registrados

### wolf

Arquivo: [wolf.png](arcade-93/wolf.png)

```text
Use case: stylized-concept. Asset type: production 4-direction, 4-frame animated sprite atlas for the same top-down farm arcade game as the reference.
Reference image 1 is STYLE REFERENCE ONLY: match its restrained 16-bit pixel clusters, warm highlights, thin selective colored outlines and small eyes. Create a NEW a lean dark slate-grey wolf with pale muzzle, golden eyes, long tail and pointed ears. Alert, predatory expression, natural canine proportions, larger and longer than the hen. Not a hen. No huge shiny eyes, rosy cheeks, oversized baby head, plush toy style, thick sticker border, glow or noisy realistic texture. Readable mature animal silhouette and expressive face. Upper-left light. Pixel art rendered on approximately 48–64 logical pixels per animal, clean enlarged pixels.
STRICT layout: square transparent image with exactly 4 equal columns and 4 equal rows, SIXTEEN isolated full-body sprites, evenly spaced with generous transparent gutters and margins. Rows top to bottom DOWN/front, RIGHT, UP/rear, LEFT. Each row is a consistent four-frame WALK cycle: contact left feet, passing neutral, contact right feet, passing neutral. Quadrupeds alternate diagonal leg pairs naturally; hold head/body proportions constant, shift feet and subtle one-pixel body bounce, no changing animal identity or size. All feet share a baseline per row, body centers on each cell. Small identical logical silhouette size in all cells. All right row animals face right, rear row show backs, left row face left. Genuinely TRANSPARENT alpha background. NO shadows, floor, props, words, labels, outlines around cells, watermarks or UI.
```

### sheep

Arquivo: [sheep.png](arcade-93/sheep.png)

```text
Use case: stylized-concept. Asset type: production 4-direction, 4-frame animated sprite atlas for the same top-down farm arcade game as the reference.
Reference image 1 is STYLE REFERENCE ONLY: match its restrained 16-bit pixel clusters, warm highlights, thin selective colored outlines and small eyes. Create a NEW an adult sheep with an ivory wool body, small brown face and brown hooves, modest ears and no accessories. Not a hen. No huge shiny eyes, rosy cheeks, oversized baby head, plush toy style, thick sticker border, glow or noisy realistic texture. Readable mature animal silhouette and expressive face. Upper-left light. Pixel art rendered on approximately 48–64 logical pixels per animal, clean enlarged pixels.
STRICT layout: square transparent image with exactly 4 equal columns and 4 equal rows, SIXTEEN isolated full-body sprites, evenly spaced with generous transparent gutters and margins. Rows top to bottom DOWN/front, RIGHT, UP/rear, LEFT. Each row is a consistent four-frame WALK cycle: contact left feet, passing neutral, contact right feet, passing neutral. Quadrupeds alternate diagonal leg pairs naturally; hold head/body proportions constant, shift feet and subtle one-pixel body bounce, no changing animal identity or size. All feet share a baseline per row, body centers on each cell. Small identical logical silhouette size in all cells. All right row animals face right, rear row show backs, left row face left. Genuinely TRANSPARENT alpha background. NO shadows, floor, props, words, labels, outlines around cells, watermarks or UI.
```

### pig

Arquivo: [pig.png](arcade-93/pig.png)

```text
Use case: stylized-concept. Asset type: production 4-direction, 4-frame animated sprite atlas for the same top-down farm arcade game as the reference.
Reference image 1 is STYLE REFERENCE ONLY: match its restrained 16-bit pixel clusters, warm highlights, thin selective colored outlines and small eyes. Create a NEW an adult pink farm pig with dusty coral shading, a broad snout, small ears, short legs and curled tail. Not a hen. No huge shiny eyes, rosy cheeks, oversized baby head, plush toy style, thick sticker border, glow or noisy realistic texture. Readable mature animal silhouette and expressive face. Upper-left light. Pixel art rendered on approximately 48–64 logical pixels per animal, clean enlarged pixels.
STRICT layout: square transparent image with exactly 4 equal columns and 4 equal rows, SIXTEEN isolated full-body sprites, evenly spaced with generous transparent gutters and margins. Rows top to bottom DOWN/front, RIGHT, UP/rear, LEFT. Each row is a consistent four-frame WALK cycle: contact left feet, passing neutral, contact right feet, passing neutral. Quadrupeds alternate diagonal leg pairs naturally; hold head/body proportions constant, shift feet and subtle one-pixel body bounce, no changing animal identity or size. All feet share a baseline per row, body centers on each cell. Small identical logical silhouette size in all cells. All right row animals face right, rear row show backs, left row face left. Genuinely TRANSPARENT alpha background. NO shadows, floor, props, words, labels, outlines around cells, watermarks or UI.
```

### cow

Arquivo: [cow.png](arcade-93/cow.png)

```text
Use case: stylized-concept. Asset type: production 4-direction, 4-frame animated sprite atlas for the same top-down farm arcade game as the reference.
Reference image 1 is STYLE REFERENCE ONLY: match its restrained 16-bit pixel clusters, warm highlights, thin selective colored outlines and small eyes. Create a NEW an adult black-and-ivory dairy cow with pale horns, coral muzzle, small ears, hooves, tail and a tiny brass bell. Not a hen. No huge shiny eyes, rosy cheeks, oversized baby head, plush toy style, thick sticker border, glow or noisy realistic texture. Readable mature animal silhouette and expressive face. Upper-left light. Pixel art rendered on approximately 48–64 logical pixels per animal, clean enlarged pixels.
STRICT layout: square transparent image with exactly 4 equal columns and 4 equal rows, SIXTEEN isolated full-body sprites, evenly spaced with generous transparent gutters and margins. Rows top to bottom DOWN/front, RIGHT, UP/rear, LEFT. Each row is a consistent four-frame WALK cycle: contact left feet, passing neutral, contact right feet, passing neutral. Quadrupeds alternate diagonal leg pairs naturally; hold head/body proportions constant, shift feet and subtle one-pixel body bounce, no changing animal identity or size. All feet share a baseline per row, body centers on each cell. Small identical logical silhouette size in all cells. All right row animals face right, rear row show backs, left row face left. Genuinely TRANSPARENT alpha background. NO shadows, floor, props, words, labels, outlines around cells, watermarks or UI.
```

### duck

Arquivo: [duck.png](arcade-93/duck.png)

```text
Use case: stylized-concept. Production pixel-art walk-cycle sprite atlas for a polished top-down farm arcade game. Reference is STYLE ONLY: small eyes, natural adult animal proportions, economical 16-bit pixel clusters, warm highlights, selective thin colored outlines. Create an adult ivory farm duck with ochre bill and webbed feet. Upper-left light. No plush-toy proportions, huge eyes, cheeks, thick dark sticker outline, blur or realistic noisy fur. STRICTLY 4 rows by 4 columns of full-body sprites on a genuinely TRANSPARENT alpha square canvas. Make each animal SMALLER inside its cell, occupying at most 70% of cell width and 72% of cell height, with broad TRANSPARENT GUTTERS on every side so feet and tails NEVER touch cells or image boundaries. Exactly 16 sprites. Rows: FRONT facing down; SIDE facing right; BACK facing up; SIDE facing left. Four columns: left feet contact, passing neutral, right feet contact, passing neutral. Consistent body size, identical center and baseline, natural alternating steps, subtle body bounce, no identity changes. Rear poses show no face. Pixel-art game asset, no words, labels, ground, shadows, props, gridlines or UI.
```

### rabbit

Arquivo: [rabbit.png](arcade-93/rabbit.png)

```text
Use case: stylized-concept. Production pixel-art walk-cycle sprite atlas for a polished top-down farm arcade game. Reference is STYLE ONLY: small eyes, natural adult animal proportions, economical 16-bit pixel clusters, warm highlights, selective thin colored outlines. Create a warm chestnut rabbit with long ears, ivory muzzle, small paws and white tail. Upper-left light. No plush-toy proportions, huge eyes, cheeks, thick dark sticker outline, blur or realistic noisy fur. STRICTLY 4 rows by 4 columns of full-body sprites on a genuinely TRANSPARENT alpha square canvas. Make each animal SMALLER inside its cell, occupying at most 70% of cell width and 72% of cell height, with broad TRANSPARENT GUTTERS on every side so feet and tails NEVER touch cells or image boundaries. Exactly 16 sprites. Rows: FRONT facing down; SIDE facing right; BACK facing up; SIDE facing left. Four columns: left feet contact, passing neutral, right feet contact, passing neutral. Consistent body size, identical center and baseline, natural alternating steps, subtle body bounce, no identity changes. Rear poses show no face. Pixel-art game asset, no words, labels, ground, shadows, props, gridlines or UI.
```

### dog

Arquivo: [dog.png](arcade-93/dog.png)

```text
Use case: stylized-concept. Production pixel-art walk-cycle sprite atlas for a polished top-down farm arcade game. Reference is STYLE ONLY: small eyes, natural adult animal proportions, economical 16-bit pixel clusters, warm highlights, selective thin colored outlines. Create a caramel and cream farm dog with floppy ears and a teal collar. Upper-left light. No plush-toy proportions, huge eyes, cheeks, thick dark sticker outline, blur or realistic noisy fur. STRICTLY 4 rows by 4 columns of full-body sprites on a genuinely TRANSPARENT alpha square canvas. Make each animal SMALLER inside its cell, occupying at most 70% of cell width and 72% of cell height, with broad TRANSPARENT GUTTERS on every side so feet and tails NEVER touch cells or image boundaries. Exactly 16 sprites. Rows: FRONT facing down; SIDE facing right; BACK facing up; SIDE facing left. Four columns: left feet contact, passing neutral, right feet contact, passing neutral. Consistent body size, identical center and baseline, natural alternating steps, subtle body bounce, no identity changes. Rear poses show no face. Pixel-art game asset, no words, labels, ground, shadows, props, gridlines or UI.
```

### cat

Arquivo: [cat.png](arcade-93/cat.png)

```text
Use case: stylized-concept. Production pixel-art walk-cycle sprite atlas for a polished top-down farm arcade game. Reference is STYLE ONLY: small eyes, natural adult animal proportions, economical 16-bit pixel clusters, warm highlights, selective thin colored outlines. Create a ginger tabby farm cat with an ivory muzzle, striped tail and small alert ears. Upper-left light. No plush-toy proportions, huge eyes, cheeks, thick dark sticker outline, blur or realistic noisy fur. STRICTLY 4 rows by 4 columns of full-body sprites on a genuinely TRANSPARENT alpha square canvas. Make each animal SMALLER inside its cell, occupying at most 70% of cell width and 72% of cell height, with broad TRANSPARENT GUTTERS on every side so feet and tails NEVER touch cells or image boundaries. Exactly 16 sprites. Rows: FRONT facing down; SIDE facing right; BACK facing up; SIDE facing left. Four columns: left feet contact, passing neutral, right feet contact, passing neutral. Consistent body size, identical center and baseline, natural alternating steps, subtle body bounce, no identity changes. Rear poses show no face. Pixel-art game asset, no words, labels, ground, shadows, props, gridlines or UI.
```

### goat

Arquivo: [goat.png](arcade-93/goat.png)

```text
Use case: stylized-concept. Production pixel-art walk-cycle sprite atlas for a polished top-down farm arcade game. Reference is STYLE ONLY: small eyes, natural adult animal proportions, economical 16-bit pixel clusters, warm highlights, selective thin colored outlines. Create an adult ivory farm goat with a chestnut face, small curved horns, a short beard and dark cloven hooves. Upper-left light. No plush-toy proportions, huge eyes, cheeks, thick dark sticker outline, blur or realistic noisy fur. STRICTLY 4 rows by 4 columns of full-body sprites on a genuinely TRANSPARENT alpha square canvas. Make each animal SMALLER inside its cell, occupying at most 70% of cell width and 72% of cell height, with broad TRANSPARENT GUTTERS on every side so feet and tails NEVER touch cells or image boundaries. Exactly 16 sprites. Rows: FRONT facing down; SIDE facing right; BACK facing up; SIDE facing left. Four columns: left feet contact, passing neutral, right feet contact, passing neutral. Consistent body size, identical center and baseline, natural alternating steps, subtle body bounce, no identity changes. Rear poses show no face. Pixel-art game asset, no words, labels, ground, shadows, props, gridlines or UI.
```

### donkey

Arquivo: [donkey.png](arcade-93/donkey.png)

```text
Use case: stylized-concept. Production pixel-art walk-cycle sprite atlas for a polished top-down farm arcade game. Reference is STYLE ONLY: small eyes, natural adult animal proportions, economical 16-bit pixel clusters, warm highlights, selective thin colored outlines. Create an adult slate-brown donkey with long ears, dark mane, pale muzzle and dark hooves. Upper-left light. No plush-toy proportions, huge eyes, cheeks, thick dark sticker outline, blur or realistic noisy fur. STRICTLY 4 rows by 4 columns of full-body sprites on a genuinely TRANSPARENT alpha square canvas. Make each animal SMALLER inside its cell, occupying at most 70% of cell width and 72% of cell height, with broad TRANSPARENT GUTTERS on every side so feet and tails NEVER touch cells or image boundaries. Exactly 16 sprites. Rows: FRONT facing down; SIDE facing right; BACK facing up; SIDE facing left. Four columns: left feet contact, passing neutral, right feet contact, passing neutral. Consistent body size, identical center and baseline, natural alternating steps, subtle body bounce, no identity changes. Rear poses show no face. Pixel-art game asset, no words, labels, ground, shadows, props, gridlines or UI.
```

### horse

Arquivo: [horse.png](arcade-93/horse.png)

```text
Use case: stylized-concept. Production pixel-art walk-cycle sprite atlas for a polished top-down farm arcade game. Reference is STYLE ONLY: small eyes, natural adult animal proportions, economical 16-bit pixel clusters, warm highlights, selective thin colored outlines. Create an adult chestnut farm horse with a dark mane and tail, small white forehead blaze, dark hooves and natural equine proportions. Upper-left light. No plush-toy proportions, huge eyes, cheeks, thick dark sticker outline, blur or realistic noisy fur. STRICTLY 4 rows by 4 columns of full-body sprites on a genuinely TRANSPARENT alpha square canvas. Make each animal SMALLER inside its cell, occupying at most 70% of cell width and 72% of cell height, with broad TRANSPARENT GUTTERS on every side so feet and tails NEVER touch cells or image boundaries. Exactly 16 sprites. Rows: FRONT facing down; SIDE facing right; BACK facing up; SIDE facing left. Four columns: left feet contact, passing neutral, right feet contact, passing neutral. Consistent body size, identical center and baseline, natural alternating steps, subtle body bounce, no identity changes. Rear poses show no face. Pixel-art game asset, no words, labels, ground, shadows, props, gridlines or UI.
```

### lamb

Arquivo: [lamb.png](arcade-93/lamb.png)

```text
Use case: stylized-concept. Production pixel-art walk-cycle sprite atlas for a polished top-down farm arcade game. Reference is STYLE ONLY: small eyes, natural adult animal proportions, economical 16-bit pixel clusters, warm highlights, selective thin colored outlines. Create a small ivory lamb with a light beige face, short ears and tiny brown hooves; a younger sheep but still restrained realistic animal proportions. Upper-left light. No plush-toy proportions, huge eyes, cheeks, thick dark sticker outline, blur or realistic noisy fur. STRICTLY 4 rows by 4 columns of full-body sprites on a genuinely TRANSPARENT alpha square canvas. Make each animal SMALLER inside its cell, occupying at most 70% of cell width and 72% of cell height, with broad TRANSPARENT GUTTERS on every side so feet and tails NEVER touch cells or image boundaries. Exactly 16 sprites. Rows: FRONT facing down; SIDE facing right; BACK facing up; SIDE facing left. Four columns: left feet contact, passing neutral, right feet contact, passing neutral. Consistent body size, identical center and baseline, natural alternating steps, subtle body bounce, no identity changes. Rear poses show no face. Pixel-art game asset, no words, labels, ground, shadows, props, gridlines or UI.
```

### turkey

Arquivo: [turkey.png](arcade-93/turkey.png)

```text
Use case: stylized-concept. Production pixel-art walk-cycle sprite atlas for a polished top-down farm arcade game. Reference is STYLE ONLY: small eyes, natural adult animal proportions, economical 16-bit pixel clusters, warm highlights, selective thin colored outlines. Create an adult bronze-brown farm turkey with small bare blue head, red wattle, bronze layered feathers and a restrained fan tail. Upper-left light. No plush-toy proportions, huge eyes, cheeks, thick dark sticker outline, blur or realistic noisy fur. STRICTLY 4 rows by 4 columns of full-body sprites on a genuinely TRANSPARENT alpha square canvas. Make each animal SMALLER inside its cell, occupying at most 70% of cell width and 72% of cell height, with broad TRANSPARENT GUTTERS on every side so feet and tails NEVER touch cells or image boundaries. Exactly 16 sprites. Rows: FRONT facing down; SIDE facing right; BACK facing up; SIDE facing left. Four columns: left feet contact, passing neutral, right feet contact, passing neutral. Consistent body size, identical center and baseline, natural alternating steps, subtle body bounce, no identity changes. Rear poses show no face. Pixel-art game asset, no words, labels, ground, shadows, props, gridlines or UI.
```

### chick

Arquivo: [chick.png](arcade-93/chick.png)

```text
Use case: stylized-concept. Production pixel-art walk-cycle sprite atlas for a polished top-down farm arcade game. Reference is STYLE ONLY: small eyes, natural adult animal proportions, economical 16-bit pixel clusters, warm highlights, selective thin colored outlines. Create a tiny golden-yellow chick with ochre feet and beak, simple fluffy silhouette and small dark eyes. Upper-left light. No plush-toy proportions, huge eyes, cheeks, thick dark sticker outline, blur or realistic noisy fur. STRICTLY 4 rows by 4 columns of full-body sprites on a genuinely TRANSPARENT alpha square canvas. Make each animal SMALLER inside its cell, occupying at most 70% of cell width and 72% of cell height, with broad TRANSPARENT GUTTERS on every side so feet and tails NEVER touch cells or image boundaries. Exactly 16 sprites. Rows: FRONT facing down; SIDE facing right; BACK facing up; SIDE facing left. Four columns: left feet contact, passing neutral, right feet contact, passing neutral. Consistent body size, identical center and baseline, natural alternating steps, subtle body bounce, no identity changes. Rear poses show no face. Pixel-art game asset, no words, labels, ground, shadows, props, gridlines or UI.
```

### hen-silkie

Arquivo: [hen-silkie.png](arcade-93/hen-silkie.png)

```text
Use case: stylized-concept. Production pixel-art walk-cycle sprite atlas for a polished top-down farm arcade game. Reference is STYLE ONLY: small eyes, natural adult animal proportions, economical 16-bit pixel clusters, warm highlights, selective thin colored outlines. Create Midori, an ivory Japanese silkie hen with a fluffy crest, charcoal face, dark beak and feathered feet, recognizable as a silkie rather than a round plush toy. Upper-left light. No plush-toy proportions, huge eyes, cheeks, thick dark sticker outline, blur or realistic noisy fur. STRICTLY 4 rows by 4 columns of full-body sprites on a genuinely TRANSPARENT alpha square canvas. Make each animal SMALLER inside its cell, occupying at most 70% of cell width and 72% of cell height, with broad TRANSPARENT GUTTERS on every side so feet and tails NEVER touch cells or image boundaries. Exactly 16 sprites. Rows: FRONT facing down; SIDE facing right; BACK facing up; SIDE facing left. Four columns: left feet contact, passing neutral, right feet contact, passing neutral. Consistent body size, identical center and baseline, natural alternating steps, subtle body bounce, no identity changes. Rear poses show no face. Pixel-art game asset, no words, labels, ground, shadows, props, gridlines or UI.
```

### hen-blue

Arquivo: [hen-blue.png](arcade-93/hen-blue.png)

```text
Use case: stylized-concept. Production pixel-art walk-cycle sprite atlas for a polished top-down farm arcade game. Reference is STYLE ONLY: small eyes, natural adult animal proportions, economical 16-bit pixel clusters, warm highlights, selective thin colored outlines. Create Alzira, a blue-grey farm hen with slate feather bands, golden ochre beak and feet and a red comb and wattle. Upper-left light. No plush-toy proportions, huge eyes, cheeks, thick dark sticker outline, blur or realistic noisy fur. STRICTLY 4 rows by 4 columns of full-body sprites on a genuinely TRANSPARENT alpha square canvas. Make each animal SMALLER inside its cell, occupying at most 70% of cell width and 72% of cell height, with broad TRANSPARENT GUTTERS on every side so feet and tails NEVER touch cells or image boundaries. Exactly 16 sprites. Rows: FRONT facing down; SIDE facing right; BACK facing up; SIDE facing left. Four columns: left feet contact, passing neutral, right feet contact, passing neutral. Consistent body size, identical center and baseline, natural alternating steps, subtle body bounce, no identity changes. Rear poses show no face. Pixel-art game asset, no words, labels, ground, shadows, props, gridlines or UI.
```

### skin-zeca

Arquivo: [skin-zeca.png](arcade-93/skin-zeca.png)

```text
Use case: stylized-concept. Production pixel-art walk-cycle sprite atlas for a polished top-down farm arcade game. Reference is STYLE ONLY: small eyes, natural adult animal proportions, economical 16-bit pixel clusters, warm highlights, selective thin colored outlines. Create Zeca, an adult ivory duck with a small straw farm hat and green neckerchief, ochre bill and feet. Upper-left light. No plush-toy proportions, huge eyes, cheeks, thick dark sticker outline, blur or realistic noisy fur. STRICTLY 4 rows by 4 columns of full-body sprites on a genuinely TRANSPARENT alpha square canvas. Make each animal SMALLER inside its cell, occupying at most 70% of cell width and 72% of cell height, with broad TRANSPARENT GUTTERS on every side so feet and tails NEVER touch cells or image boundaries. Exactly 16 sprites. Rows: FRONT facing down; SIDE facing right; BACK facing up; SIDE facing left. Four columns: left feet contact, passing neutral, right feet contact, passing neutral. Consistent body size, identical center and baseline, natural alternating steps, subtle body bounce, no identity changes. Rear poses show no face. Pixel-art game asset, no words, labels, ground, shadows, props, gridlines or UI.
```

### skin-pipoca

Arquivo: [skin-pipoca.png](arcade-93/skin-pipoca.png)

```text
Use case: stylized-concept. Production pixel-art walk-cycle sprite atlas for a polished top-down farm arcade game. Reference is STYLE ONLY: small eyes, natural adult animal proportions, economical 16-bit pixel clusters, warm highlights, selective thin colored outlines. Create Pipoca, a chestnut rabbit with a GREEN neckerchief, ivory muzzle, white tail and one ear slightly folded. Upper-left light. No plush-toy proportions, huge eyes, cheeks, thick dark sticker outline, blur or realistic noisy fur. STRICTLY 4 rows by 4 columns of full-body sprites on a genuinely TRANSPARENT alpha square canvas. Make each animal SMALLER inside its cell, occupying at most 70% of cell width and 72% of cell height, with broad TRANSPARENT GUTTERS on every side so feet and tails NEVER touch cells or image boundaries. Exactly 16 sprites. Rows: FRONT facing down; SIDE facing right; BACK facing up; SIDE facing left. Four columns: left feet contact, passing neutral, right feet contact, passing neutral. Consistent body size, identical center and baseline, natural alternating steps, subtle body bounce, no identity changes. Rear poses show no face. Pixel-art game asset, no words, labels, ground, shadows, props, gridlines or UI.
```

### skin-amora

Arquivo: [skin-amora.png](arcade-93/skin-amora.png)

```text
Use case: stylized-concept. Production pixel-art walk-cycle sprite atlas for a polished top-down farm arcade game. Reference is STYLE ONLY: small eyes, natural adult animal proportions, economical 16-bit pixel clusters, warm highlights, selective thin colored outlines. Create Stella, a charcoal-grey cat with ivory sock paws, a small LILAC bow at the neck and a tiny brass bell. Upper-left light. No plush-toy proportions, huge eyes, cheeks, thick dark sticker outline, blur or realistic noisy fur. STRICTLY 4 rows by 4 columns of full-body sprites on a genuinely TRANSPARENT alpha square canvas. Make each animal SMALLER inside its cell, occupying at most 70% of cell width and 72% of cell height, with broad TRANSPARENT GUTTERS on every side so feet and tails NEVER touch cells or image boundaries. Exactly 16 sprites. Rows: FRONT facing down; SIDE facing right; BACK facing up; SIDE facing left. Four columns: left feet contact, passing neutral, right feet contact, passing neutral. Consistent body size, identical center and baseline, natural alternating steps, subtle body bounce, no identity changes. Rear poses show no face. Pixel-art game asset, no words, labels, ground, shadows, props, gridlines or UI.
```

### skin-pacoca

Arquivo: [skin-pacoca.png](arcade-93/skin-pacoca.png)

```text
Use case: stylized-concept. Production pixel-art walk-cycle sprite atlas for a polished top-down farm arcade game. Reference is STYLE ONLY: small eyes, natural adult animal proportions, economical 16-bit pixel clusters, warm highlights, selective thin colored outlines. Create Paçoca, a caramel mixed-breed dog with one floppy ear, ivory chest and a RED neckerchief. Upper-left light. No plush-toy proportions, huge eyes, cheeks, thick dark sticker outline, blur or realistic noisy fur. STRICTLY 4 rows by 4 columns of full-body sprites on a genuinely TRANSPARENT alpha square canvas. Make each animal SMALLER inside its cell, occupying at most 70% of cell width and 72% of cell height, with broad TRANSPARENT GUTTERS on every side so feet and tails NEVER touch cells or image boundaries. Exactly 16 sprites. Rows: FRONT facing down; SIDE facing right; BACK facing up; SIDE facing left. Four columns: left feet contact, passing neutral, right feet contact, passing neutral. Consistent body size, identical center and baseline, natural alternating steps, subtle body bounce, no identity changes. Rear poses show no face. Pixel-art game asset, no words, labels, ground, shadows, props, gridlines or UI.
```

### skin-gumercindo

Arquivo: [skin-gumercindo.png](arcade-93/skin-gumercindo.png)

```text
Use case: stylized-concept. Production pixel-art walk-cycle sprite atlas for a polished top-down farm arcade game. Reference is STYLE ONLY: small eyes, natural adult animal proportions, economical 16-bit pixel clusters, warm highlights, selective thin colored outlines. Create Gumercindo, a grey domestic goose with pale chest, orange bill and feet and a red-and-ivory checked neckerchief. Upper-left light. No plush-toy proportions, huge eyes, cheeks, thick dark sticker outline, blur or realistic noisy fur. STRICTLY 4 rows by 4 columns of full-body sprites on a genuinely TRANSPARENT alpha square canvas. Make each animal SMALLER inside its cell, occupying at most 70% of cell width and 72% of cell height, with broad TRANSPARENT GUTTERS on every side so feet and tails NEVER touch cells or image boundaries. Exactly 16 sprites. Rows: FRONT facing down; SIDE facing right; BACK facing up; SIDE facing left. Four columns: left feet contact, passing neutral, right feet contact, passing neutral. Consistent body size, identical center and baseline, natural alternating steps, subtle body bounce, no identity changes. Rear poses show no face. Pixel-art game asset, no words, labels, ground, shadows, props, gridlines or UI.
```

### Cenário

```text
Use case: stylized-concept. Asset type: production scenery atlas for a polished top-down 16-bit FARM ARCADE game.
Reference image is the character style reference: restrained pixel art, warm upper-left light, crisp small pixel clusters, thin selective colored contour, subtle material shading. Draw a NEW coherent farm scenery set in the same visual world. Rich olive/sage foliage, weathered terracotta, honey straw, warm timber. More crafted farm environment, no round toy buildings, no enormous fruit, no plastic gloss, no thick black/brown sticker borders. Camera is top-down three-quarter RPG view with vertical walls, aligned to horizontal/vertical game axes; NOT isometric diamonds.
STRICT square 4 by 4 atlas of SIXTEEN ISOLATED sprites, one object per equal cell, a genuinely TRANSPARENT alpha background and wide clear gutters. All objects fit within 75% of their cell width and height. Upper-left light and consistent pixel size. No ground tiles, cast shadows, text, people, animals or cell lines.
ROW 1 left to right: (1) mature compact apple tree with a visible trunk and just a few SMALL red apples; (2) dense broad green hiding bush with a readable low silhouette; (3) pear tree with small ochre pears; (4) graceful willow tree with a readable trunk.
ROW 2: (1) low dark-green bramble bush with subtle purple berries; (2) open-front small livestock shelter with weathered timber and muted ochre pitched roof; (3) red barn with ivory trim, closed double doors and terracotta roof; (4) small raised wooden henhouse with ivory trim, entrance hole, sloped red roof.
ROW 3: (1) tall stone silo with terracotta dome; (2) compact rectangular tightly tied straw bale; (3) low wooden water trough with teal water; (4) horizontal wooden fence section with exactly three upright posts and two rails, generous transparent space in the holes.
ROW 4: (1) a contained clump of small white daisies and green leaves; (2) a contained lavender clump; (3) a compact wooden crate of harvested vegetables; (4) an OPEN-FRONT chick nursery shelter, small red sloping roof, two timber side walls, exactly two straw nests on the floor with a wide accessible front. Keep these silhouettes clear and separate. No words, labels, border or UI.
```
