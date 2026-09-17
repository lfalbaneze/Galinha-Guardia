# Thor

- Final asset: `sources/thor.png`, 1024 × 1536 RGBA. Original generated pixels and alpha preserved.
- Tool: built-in imagegen, generate mode, one candidate. No CLI or API fallback.
- Reference images: user-supplied fox and owl sheets, for visual style only.
- Integration: `src/systems/thor-art.ts` selects twelve source rectangles, uses a shared scale and aligns each frame to its grounded paws. Rows: down, left, right, up. Columns: idle and two movement poses.
- Visual review: `node scripts/render-thor.cjs` draws all poses and an actual farm encounter with the production Canvas renderer. The two side walking poses are similar; the animation includes the idle pose between steps. No source pixels were recolored or removed.

## Final generation prompt

```text
Use case: stylized-concept.
Asset type: production transparent PNG sprite sheet for a top-down pixel-art farm game.
Create exactly ONE sprite sheet containing exactly twelve full-body frames of Thor, a friendly golden retriever. Use the two previously viewed fox and owl sprite sheets ONLY as pixel-art style references: crisp chunky square pixel clusters, dark warm outline, restrained shading, charming slightly large head, game-ready readable silhouettes. Do not reproduce the fox or owl and do not edit their sheets.

Canvas and layout: portrait sheet, preferably 1024 x 1536 pixels, genuinely transparent alpha background. Precisely three equally spaced columns and four equally spaced rows, twelve invisible equal cells, generous completely empty gutters and exterior margins. Keep each entire sprite well inside its cell, including all paws, tail, ears and outline. Center each sprite consistently; identical scale and head/body proportions across all twelve frames. Align the grounded paw baseline uniformly within each row. No visible grid.

Exact row order:
Row 1: DOWN / front view, walking toward the viewer.
Row 2: LEFT / strict side view, muzzle points to the left edge.
Row 3: RIGHT / strict side view, muzzle points to the right edge.
Row 4: UP / back view, walking away from the viewer, show rear of head and back.
Exact column order in every row:
Column 1: idle, standing naturally on four paws.
Column 2: walking step A, left foreleg and right hindleg reaching forward, opposite pair back.
Column 3: walking step B, opposite leg phase with right foreleg and left hindleg reaching forward, other pair back.
Walking frames must have clearly distinct alternating leg positions, not duplicates of idle or of each other. Body identity, scale, anatomy, coat colors, and facial features stay consistent.

Subject design: clearly a golden retriever dog, friendly and confident. Soft honey-gold fluffy coat, lighter golden cream chest and gentle broad muzzle, rounded dark nose, warm dark eyes, sturdy four-legged dog proportions and soft feathering on legs. Short rounded floppy ears hang down at the sides of the head in every direction; NEVER erect triangular ears. A feathered golden retriever tail, carried naturally, never a fox's white-tipped tail and never a tightly curled spitz tail. Front face has a gentle happy expression with a subtle relaxed smile. The same single dog identity in all frames.

Style: polished cozy farm-game pixel art, crisp pixel boundaries and coherent block shading, limited warm golden palette with amber and brown shadow pixels; match the visual pixel density and friendly readability of the supplied references. Orthographic game sprite presentation with a mild top-down view where appropriate, no dramatic perspective.
Output constraints: genuinely transparent background, no painted checkerboard, no background color, no ground, no ground shadows, no text, no labels, no captions, no watermark, no UI, no hearts, no props, no collar, no extra animals. Exactly 3 columns by 4 rows. Only the twelve separate complete dog frames.
```
