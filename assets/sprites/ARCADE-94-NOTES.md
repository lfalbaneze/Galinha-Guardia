# Arte arcade — edição 94

Os perfis da vaca desta edição foram substituídos na [correção das patas laterais, edição 95](COW-95-NOTES.md). Frente, costas e os demais animais continuam em uso.

Gerada em 20/09/2026 com **OpenAI ImageGen** (`image_gen.imagegen`), pela ferramenta integrada. Revisão de quatro animais: vaca, cachorro, cabra e cavalo. Os demais personagens e objetos conservam a edição 93, registrada em [ARCADE-ART-NOTES.md](ARCADE-ART-NOTES.md).

## Arquivos e revisão

Originais com transparência preservados em [arcade-94/](arcade-94/). O exportador `scripts/build-arcade-art.cjs` cria [arcade-94/runtime/](arcade-94/runtime/) e atualiza os recortes em `systems/arcade-art-data.js`. Cada animal tem quatro direções com quatro quadros de caminhada. Os dois perfis usam recortes próprios, sem inversão horizontal pelo renderizador. Não houve conversão vetorial ou recorte manual das silhuetas.

Vaca: flanco claro com manchas pequenas e flanco escuro com barriga clara. Cachorro: ombro, orelha e fivela próprios por lado. Cabra: mancha no ombro de um lado e na anca do outro. Cavalo: crina cai sobre apenas um flanco; patas escuras em todos os quadros. A seleção de direção mantém o eixo em pequenas oscilações junto à diagonal para evitar viradas repetidas.

A primeira geração foi recusada: a vaca continuava com manchas quase simétricas, e alguns perfis aproximavam focinho e cauda da borda. A revisão solicitou margens maiores, corrigiu a pelagem e eliminou a meia inconsistente do cavalo. Os arquivos gerados originais permanecem na pasta do ImageGen; cópias dos quatro resultados finais estão no projeto. A escala de execução do cavalo foi ajustada para manter sua silhueta maior que a galinha em todos os lados.

[Prévia animada no renderizador do jogo](../../preview/animal-walks.html) · [Quadros em escala de execução](../../preview/animal-walks.png)

## Prompts e proveniência

Referência de estilo da primeira passagem: `assets/sprites/arcade-93/cow.png`. A segunda passagem editou cada resultado da primeira, sem misturar espécies.

### cow

Arquivo final: [cow.png](arcade-94/cow.png)

Primeira passagem:

```text
Use case: stylized-concept. Production sprite atlas for the existing farm arcade game. The reference is STYLE ONLY: restrained original pixel art, natural adult anatomy, small eyes, warm top-left light, thin selective colored outlines, clean economical pixel clusters, no plush toy faces. Create a black-and-ivory Holstein cow with a small brass bell on a tan collar and pink muzzle. SIDE ROW FACING RIGHT: THREE separate small black rounded flank patches, mostly ivory belly. SIDE ROW FACING LEFT: ONE large irregular black saddle patch across shoulder/ribs plus a small hip patch. These are two DIFFERENT physical flanks, not reflected copies. Front white blaze, rear tail and udder. Small ears and adult bovine build..
CRITICAL: independently DRAW every direction, NEVER mirror or flip a profile. World light remains upper SCREEN LEFT on BOTH profiles: head lit when facing left, rump lit when facing right. Near legs have clear highlights and overlap far darker legs; show different visible flanks with the specified asymmetry. Each of 4 columns is a DISTINCT phase of a readable walk: near front hoof forward / passing under torso / near front hoof back / lifted recovery. Far legs counterstep, knees bend and feet lift, body volume stays constant. All 4 frames in each row preserve identical markings, anatomy, scale, body centre and baseline. Do NOT simply shift the same image or swap identical feet.
Exactly FOUR rows and FOUR columns =16 isolated full-body sprites. Row1 FRONT facing down; row2 SIDE facing RIGHT; row3 BACK facing up; row4 SIDE facing LEFT. Match top-down 3/4 RPG view. Each figure fits within 72% of its equal cell, generous transparent gutters and image margins, nothing touching neighbour cells or canvas edges. Square canvas, genuinely TRANSPARENT alpha background. No floor, shadows, labels, words, panels or gridlines.
```

Revisão final:

```text
Edit this production animal atlas, keeping the same character identity and art style. Repair sprite clipping: RECOMPOSE with 4 equal rows and 4 equal columns, each full-body animal scaled DOWN by 30 percent and centred in its cell. Every animal should occupy at most 65% of cell width and height. LARGE transparent gaps between ALL sixteen figures, and a large transparent outer border on all four sides. No head, ear, tail, hoof or silhouette may touch the canvas or another cell. This margin requirement is crucial.
MOST IMPORTANT new cow coat: row 2 RIGHT-facing has an IVORY torso with just THREE SMALL BLACK SPOTS. Row 4 LEFT-facing has a NEARLY SOLID BLACK torso from shoulder to hip with a thin IVORY belly strip, NO SPOTS on that dark flank. Strong unmistakable difference between the two physical flanks. Keep that EXACT coat across all four columns in each row. Front/back show the meeting of these two flanks.
Four rows: DOWN front, RIGHT side, UP rear, LEFT side. Four columns are distinct successive walking phases, not duplicate poses: reach, passing, opposite reach, lifted recovery. Keep body volume consistent. Do not mirror profiles. Top-left screen light remains consistent, near legs lighter than far legs. Clean restrained game pixel art, selective fine outline, small eyes, no toy-like proportions. Preserve true transparent alpha background with no background image, no ground or shadows, no grid lines, no labels.
```

Original da referência intermediária: `C:\Users\user\.codex\generated_images\01a0ba9f-80f1-7850-a538-7a2446bec9dc\exec-ae4c506a-69b9-4f58-a92a-400710a5f7cb.png`

Original do resultado final: `C:\Users\user\.codex\generated_images\01a0ba9f-80f1-7850-a538-7a2446bec9dc\exec-540126d7-8952-4e6f-8464-f86dad35e059.png`

### dog

Arquivo final: [dog.png](arcade-94/dog.png)

Primeira passagem:

```text
Use case: stylized-concept. Production sprite atlas for the existing farm arcade game. The reference is STYLE ONLY: restrained original pixel art, natural adult anatomy, small eyes, warm top-left light, thin selective colored outlines, clean economical pixel clusters, no plush toy faces. Create an adult chestnut and ivory farm dog with teal collar, pointed muzzle and semi-floppy ears. ROW FACING RIGHT shows an ivory shoulder and a small chestnut rib spot, its near ear folded. ROW FACING LEFT shows a broad chestnut shoulder, ivory low belly, its near ear perked. Collar buckle on RIGHT-facing flank, collar plain on opposite. Maintain one dog with this asymmetric coat/ears across all directions..
CRITICAL: independently DRAW every direction, NEVER mirror or flip a profile. World light remains upper SCREEN LEFT on BOTH profiles: head lit when facing left, rump lit when facing right. Near legs have clear highlights and overlap far darker legs; show different visible flanks with the specified asymmetry. Each of 4 columns is a DISTINCT phase of a readable walk: near front hoof forward / passing under torso / near front hoof back / lifted recovery. Far legs counterstep, knees bend and feet lift, body volume stays constant. All 4 frames in each row preserve identical markings, anatomy, scale, body centre and baseline. Do NOT simply shift the same image or swap identical feet.
Exactly FOUR rows and FOUR columns =16 isolated full-body sprites. Row1 FRONT facing down; row2 SIDE facing RIGHT; row3 BACK facing up; row4 SIDE facing LEFT. Match top-down 3/4 RPG view. Each figure fits within 72% of its equal cell, generous transparent gutters and image margins, nothing touching neighbour cells or canvas edges. Square canvas, genuinely TRANSPARENT alpha background. No floor, shadows, labels, words, panels or gridlines.
```

Revisão final:

```text
Edit this production animal atlas, keeping the same character identity and art style. Repair sprite clipping: RECOMPOSE with 4 equal rows and 4 equal columns, each full-body animal scaled DOWN by 30 percent and centred in its cell. Every animal should occupy at most 65% of cell width and height. LARGE transparent gaps between ALL sixteen figures, and a large transparent outer border on all four sides. No head, ear, tail, hoof or silhouette may touch the canvas or another cell. This margin requirement is crucial.
Keep distinct flanks: right-facing dog shows ivory shoulder, small brown rib spot, folded near ear, collar buckle. Left-facing shows brown shoulder, perked near ear, plain collar. Same distinctive markings in all four columns. Small pointed farm dog muzzle. Full tail and muzzle must be visible in every frame.
Four rows: DOWN front, RIGHT side, UP rear, LEFT side. Four columns are distinct successive walking phases, not duplicate poses: reach, passing, opposite reach, lifted recovery. Keep body volume consistent. Do not mirror profiles. Top-left screen light remains consistent, near legs lighter than far legs. Clean restrained game pixel art, selective fine outline, small eyes, no toy-like proportions. Preserve true transparent alpha background with no background image, no ground or shadows, no grid lines, no labels.
```

Original da referência intermediária: `C:\Users\user\.codex\generated_images\01a0ba9f-80f1-7850-a538-7a2446bec9dc\exec-b17144e7-3b0d-4364-bd7d-61d047c16ac9.png`

Original do resultado final: `C:\Users\user\.codex\generated_images\01a0ba9f-80f1-7850-a538-7a2446bec9dc\exec-dd337669-8360-4b0c-a862-e0038704eb94.png`

### goat

Arquivo final: [goat.png](arcade-94/goat.png)

Primeira passagem:

```text
Use case: stylized-concept. Production sprite atlas for the existing farm arcade game. The reference is STYLE ONLY: restrained original pixel art, natural adult anatomy, small eyes, warm top-left light, thin selective colored outlines, clean economical pixel clusters, no plush toy faces. Create an adult ivory goat with brown head and legs, short beard, gently swept horns. ROW FACING RIGHT: a small brown shoulder spot and visible collar knot on near side. ROW FACING LEFT: plain ivory shoulder, brown hip patch, no knot. Horn overlap, beard direction and rear leg articulation must be newly drawn in each direction. Natural slender goat, not sheep..
CRITICAL: independently DRAW every direction, NEVER mirror or flip a profile. World light remains upper SCREEN LEFT on BOTH profiles: head lit when facing left, rump lit when facing right. Near legs have clear highlights and overlap far darker legs; show different visible flanks with the specified asymmetry. Each of 4 columns is a DISTINCT phase of a readable walk: near front hoof forward / passing under torso / near front hoof back / lifted recovery. Far legs counterstep, knees bend and feet lift, body volume stays constant. All 4 frames in each row preserve identical markings, anatomy, scale, body centre and baseline. Do NOT simply shift the same image or swap identical feet.
Exactly FOUR rows and FOUR columns =16 isolated full-body sprites. Row1 FRONT facing down; row2 SIDE facing RIGHT; row3 BACK facing up; row4 SIDE facing LEFT. Match top-down 3/4 RPG view. Each figure fits within 72% of its equal cell, generous transparent gutters and image margins, nothing touching neighbour cells or canvas edges. Square canvas, genuinely TRANSPARENT alpha background. No floor, shadows, labels, words, panels or gridlines.
```

Revisão final:

```text
Edit this production animal atlas, keeping the same character identity and art style. Repair sprite clipping: RECOMPOSE with 4 equal rows and 4 equal columns, each full-body animal scaled DOWN by 30 percent and centred in its cell. Every animal should occupy at most 65% of cell width and height. LARGE transparent gaps between ALL sixteen figures, and a large transparent outer border on all four sides. No head, ear, tail, hoof or silhouette may touch the canvas or another cell. This margin requirement is crucial.
Keep right-facing small shoulder spot and left-facing single brown hip patch, on all four columns; adult goat with small beard, slender legs, swept horns. Consistent markings and 4 newly articulated walk phases.
Four rows: DOWN front, RIGHT side, UP rear, LEFT side. Four columns are distinct successive walking phases, not duplicate poses: reach, passing, opposite reach, lifted recovery. Keep body volume consistent. Do not mirror profiles. Top-left screen light remains consistent, near legs lighter than far legs. Clean restrained game pixel art, selective fine outline, small eyes, no toy-like proportions. Preserve true transparent alpha background with no background image, no ground or shadows, no grid lines, no labels.
```

Original da referência intermediária: `C:\Users\user\.codex\generated_images\01a0ba9f-80f1-7850-a538-7a2446bec9dc\exec-7a5afe1b-6784-4a96-9af5-0432793f72d9.png`

Original do resultado final: `C:\Users\user\.codex\generated_images\01a0ba9f-80f1-7850-a538-7a2446bec9dc\exec-7a44bb04-7f71-4ffb-a264-5c64cdeea609.png`

### horse

Arquivo final: [horse.png](arcade-94/horse.png)

Primeira passagem:

```text
Use case: stylized-concept. Production sprite atlas for the existing farm arcade game. The reference is STYLE ONLY: restrained original pixel art, natural adult anatomy, small eyes, warm top-left light, thin selective colored outlines, clean economical pixel clusters, no plush toy faces. Create an adult dark chestnut farm horse with cream muzzle stripe, dark mane falling on only ONE side of its neck, dark tail and ONE ivory front sock. ROW FACING RIGHT shows full dark mane over near neck and no near white sock (it is the far front leg). ROW FACING LEFT shows clear chestnut neck with the mane just peeking beyond crest and visible ivory near front sock. Strong adult equine build, 4 articulated walking legs, anatomically correct walk..
CRITICAL: independently DRAW every direction, NEVER mirror or flip a profile. World light remains upper SCREEN LEFT on BOTH profiles: head lit when facing left, rump lit when facing right. Near legs have clear highlights and overlap far darker legs; show different visible flanks with the specified asymmetry. Each of 4 columns is a DISTINCT phase of a readable walk: near front hoof forward / passing under torso / near front hoof back / lifted recovery. Far legs counterstep, knees bend and feet lift, body volume stays constant. All 4 frames in each row preserve identical markings, anatomy, scale, body centre and baseline. Do NOT simply shift the same image or swap identical feet.
Exactly FOUR rows and FOUR columns =16 isolated full-body sprites. Row1 FRONT facing down; row2 SIDE facing RIGHT; row3 BACK facing up; row4 SIDE facing LEFT. Match top-down 3/4 RPG view. Each figure fits within 72% of its equal cell, generous transparent gutters and image margins, nothing touching neighbour cells or canvas edges. Square canvas, genuinely TRANSPARENT alpha background. No floor, shadows, labels, words, panels or gridlines.
```

Revisão final:

```text
Edit this production animal atlas, keeping the same character identity and art style. Repair sprite clipping: RECOMPOSE with 4 equal rows and 4 equal columns, each full-body animal scaled DOWN by 30 percent and centred in its cell. Every animal should occupy at most 65% of cell width and height. LARGE transparent gaps between ALL sixteen figures, and a large transparent outer border on all four sides. No head, ear, tail, hoof or silhouette may touch the canvas or another cell. This margin requirement is crucial.
Keep dark mane falling on the RIGHT-facing visible flank. LEFT-facing has bare chestnut neck, mane only peeks beyond crest. Remove the white leg sock entirely on ALL legs in ALL 16 poses: all legs chestnut with dark hooves, while the face has a cream blaze. One anatomically consistent horse.
Four rows: DOWN front, RIGHT side, UP rear, LEFT side. Four columns are distinct successive walking phases, not duplicate poses: reach, passing, opposite reach, lifted recovery. Keep body volume consistent. Do not mirror profiles. Top-left screen light remains consistent, near legs lighter than far legs. Clean restrained game pixel art, selective fine outline, small eyes, no toy-like proportions. Preserve true transparent alpha background with no background image, no ground or shadows, no grid lines, no labels.
```

Original da referência intermediária: `C:\Users\user\.codex\generated_images\01a0ba9f-80f1-7850-a538-7a2446bec9dc\exec-713c5530-433b-4d95-8538-450315a1df10.png`

Original do resultado final: `C:\Users\user\.codex\generated_images\01a0ba9f-80f1-7850-a538-7a2446bec9dc\exec-c3fe98d7-65d0-4765-aa93-f953a18e41a4.png`
