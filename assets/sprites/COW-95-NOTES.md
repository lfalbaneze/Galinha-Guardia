# Vaca — correção das patas laterais, edição 95

Correção pontual em 20/09/2026 com a ferramenta integrada **OpenAI ImageGen** (`image_gen.imagegen`). A edição 94 deixou a pata traseira distante ausente ou sobreposta em alguns quadros de perfil; a revisão anterior não identificou essa falha visual.

## Arquivos finais

- [cow-sides.png](arcade-95/cow-sides.png): original transparente da geração aprovada, oito quadros em duas linhas (direita e esquerda).
- [runtime/cow.png](arcade-95/runtime/cow.png): folha usada no jogo, com 16 quadros. Frente e costas continuam vindo de `arcade-94/cow.png`, na mesma escala; somente os dois ciclos laterais foram substituídos.
- [Revisão dos oito passos](../../preview/cow-walks.png): pixels reais de execução ampliados três vezes, sem suavização adicional.
- [Prévia animada](../../preview/animal-walks.html).

A inspeção foi feita nos oito quadros exportados, no tamanho do jogo e ampliados. A primeira geração ainda deixou uma pata ausente na segunda pose para a direita; uma edição direcionada a adicionou. A redução mostrou os cascos traseiros se unindo em três poses para a esquerda; uma segunda edição separou essas silhuetas. Os testes de atlas verificam recortes, margens, transparência e ciclos; a contagem anatômica foi uma revisão visual, não uma garantia desses testes.

O exportador `scripts/build-arcade-art.cjs` aceita as duas fontes da vaca e preserva a escala independente de cada folha. Os demais animais conservam suas fontes anteriores. A URL do atlas de execução e a versão dos metadados foram alteradas para evitar reaproveitar a vaca antiga em cache.

## Ferramenta, referência e prompts

Referência inicial: `assets/sprites/arcade-94/cow.png`.
Original final preservado em: `C:\Users\user\.codex\generated_images\01a0ba9f-80f1-7850-a538-7a2446bec9dc\exec-0cf75ae0-c5e9-47a0-95c3-cea19722cfa4.png`.

### Geração dos perfis

```text
Use case: precise-object-edit.
Asset type: corrected lateral walk sprite sheet for a top-down farm game.
Input image: reference of the SAME cow identity and pixel-art style; its side views have a defective missing/merged hind leg. Correct that anatomy.

Output a new sheet of EIGHT full-body cow sprites, arranged in exactly TWO ROWS of FOUR columns. Top row walks to the RIGHT. Bottom row walks to the LEFT. No front/back views.
CRITICAL REQUIREMENT: EVERY sprite must visibly have exactly FOUR distinct complete legs ending in FOUR separate dark hooves: near foreleg, far foreleg, near hind leg, far hind leg. None may be absent, hidden completely behind another leg, fused into the udder, or fused to another hoof. Count the four individual hooves in every cell before completing. Use the same slightly elevated 3/4 side camera, with the far legs offset horizontally and slightly higher in the image, so ALL FOUR limbs remain visibly distinguishable. A small but clear transparent gap between each adjacent hoof even in passing poses. Draw the far hind leg extending from the pelvis beside/behind the pink udder; the udder is not a leg. Far legs dark charcoal brown, near legs ivory with clear dark hooves. Keep each limb thick enough to remain clear when the whole cow is reduced to roughly 106 pixels wide. Exactly four legs, no extra limbs.

Four successive walk phases per direction: (1) near foreleg forward and near hind leg back; far pair counterstep; (2) near foreleg passing under shoulder with hoof lifted, far foreleg planted forward, hind pair separately offset; (3) near foreleg back and near hind leg forward; far pair counterstep; (4) opposite passing/recovery. Real bending joints, changing foot positions. At least three hooves grounded or near ground, fourth lifted. Maintain steady body size, head, coat markings and feet baseline across frames.

Identity invariants: black and ivory cow, pink muzzle, small brass bell on tan collar, short horns and small ears. RIGHT-facing flank is mostly IVORY with three small BLACK patches; LEFT-facing flank is nearly SOLID BLACK with ivory belly and legs. They are two physical flanks, not mirror copies. Preserve this asymmetry.
Style: same restrained game pixel art, warm upper-left screen light, selective fine dark outline, small eyes, original natural adult cow proportions. No extra props.
Layout: all eight animals occupy at most 65% of their cell, centred, generous transparent gutter and outer margin. Full ears, tail and all four hooves inside cell. Genuine transparent alpha background, NO background color, checkerboard, floor, shadows, labels, text, panels or grid.
```

### Correção da pata ausente

Referência: `C:\Users\user\.codex\generated_images\01a0ba9f-80f1-7850-a538-7a2446bec9dc\exec-f6b4eb1a-dd46-40e0-816d-6d041b5cd4e6.png`.

```text
Use case: precise-object-edit. Correct ONE remaining anatomy error in this transparent eight-sprite cow sheet.
EDIT TARGET: the SECOND cow in the TOP ROW (right-facing, second column). It still visibly has only THREE legs/hooves. ADD its missing FAR HIND LEG. The near hind hoof is at the left underneath the tail; far front hoof is near the middle-right; near front hoof is at the right. The missing FAR HIND LEG belongs in the gap BETWEEN the near hind leg and the far front leg, below/behind the pink udder. Draw the upper limb connected anatomically to the rear pelvis behind the udder, the dark shank descending at an angle, and a separate dark hoof, offset horizontally from the other three hooves. It must be clearly visible, not hidden behind the udder or merged with any limb.
Retain exactly FOUR individual hooves in every one of the eight cells. Ensure a transparent gap of at least 8 source pixels between adjacent hoof silhouettes, especially near/far hind hooves in passing poses. The udder remains pink and distinctly separate from the leg.
Preserve ALL other content: same cow, SAME 2-row by 4-column layout, scale, generous margins, right flank with small black spots, left dark flank, head/bell/tail and existing walk phases. Top row faces RIGHT, bottom row faces LEFT. No new animal identity, no mirror flip. Four complete legs per cow, not five. Genuine transparent alpha background. No ground, shadow, text, grid or labels.
```

### Separação dos cascos após a redução

```text
Precise anatomy edit of this eight-sprite cow atlas. The bottom row, columns 2, 3 and 4, still has the two hind hooves touching/merging; at game resolution this again looks like three legs. Fix those three LEFT-facing poses:
Move the FAR HIND LEG and hoof FORWARD toward the belly, so its hoof sits in the open space directly below the pink udder, BETWEEN the far forehoof and the near hind hoof. In the image, this means move that far hind hoof LEFT, away from the rightmost near hind leg. Trace its shank anatomically back to the hip behind the udder. Keep the udder pink, with the leg in medium dark grey-brown. The other three legs stay.
All eight cows must have FOUR CLEARLY COUNTABLE HOOF SILHOUETTES, separated by visible transparent gaps at least 18 source pixels wide (about 5 pixels at game size); no hoof-to-hoof contact at all, including passing frames. For the top row's last two poses, also widen any gap between the two rear hooves as needed. At each cell's lower edge, there should be FOUR spatially separate feet, never a two-foot connected black blob. Make far hooves slightly higher and medium brown, near hooves dark brown, but all four must remain distinct.
Keep the current character, black/ivory asymmetric flanks, head, bell, tail, fixed torso volume, all eight cells and their generous margins. Same 2 rows x4 columns; right-facing above, left-facing below. Keep the four walk phases, bending knees and ankle offsets. Genuine transparent alpha; no floor, shadows, background, grid or text. Exactly four legs per cow.
```

