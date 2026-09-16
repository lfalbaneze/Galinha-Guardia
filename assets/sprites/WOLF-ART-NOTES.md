# Lobo feroz

Ferramenta: OpenAI ImageGen (`image_gen.imagegen`). Uma geração, sem variantes.
Arquivo em uso: `assets/sprites/sources/wolf-feroz.png`.
Retorno: PNG transparente de 1254 × 1254 (o pedido era 1024 × 1024).
Integração: seleção de quadros pelos espaços transparentes da folha; pivôs individuais alinham as patas. PNG original preservado, sem retoques. Escala no Canvas: 0,3.

Prompt enviado:

```text
Use case: stylized-concept.
Asset type: production sprite sheet for a top-down 16-bit pixel-art farm game.
Create exactly ONE original 1024x1024 PNG image with a genuinely fully transparent background, containing exactly 16 complete wolf sprites arranged on an exact uniform 4-column by 4-row invisible grid of 256x256 cells. Cell centers are x=128,384,640,896 and y=128,384,640,896. Each cell contains ONE full centered animal with consistent identity, scale and baseline and generous transparent margins. No wolf crosses a cell boundary.
Subject: a ferocious quadruped grey wolf, visibly snarling with prominent ivory fangs, long angular muzzle, pointed ears pinned slightly back, broad raised shoulders, charcoal shaggy mane, silver-grey body, powerful paws, bushy tail, and small intense amber eyes. Menacing wild predator, fierce alert posture. Normal wolf anatomy on four legs.
Style: coherent crisp 16-bit game pixel art; deliberate square pixel clusters, strongly readable silhouettes, dark outlines, restrained silver/grey/charcoal palette, sharp high-contrast features. Keep it legible at 80px game-canvas size. No painterly blur, no antialiasing or smooth gradients.
Exact row orientations, from TOP to BOTTOM:
ROW 1: DOWN/front, facing toward viewer. Top-down three-quarter overhead RPG angle, showing the visible back/body and four paws.
ROW 2: LEFT, full left-facing side profile. Head on left, tail on right.
ROW 3: RIGHT, full right-facing side profile. Head on right, tail on left.
ROW 4: UP/back, walking away from viewer. Top-down three-quarter overhead RPG angle, showing the back/body and four paws.
Exact column animation poses, from LEFT to RIGHT, repeated within EVERY row:
COLUMN 1: standing ready and snarling.
COLUMN 2: left forepaw stepping forward in a walk.
COLUMN 3: passing/ready walking pose.
COLUMN 4: right forepaw stepping forward in a walk.
Keep these four animation poses distinct while preserving the same animal design, size and consistent baseline in each row. Front and back animals should fill roughly 170x170 pixels centered within their cells. Side-profile animals may be roughly 205 pixels wide including complete tail, centered within each cell.
Critical constraints: genuine alpha transparency throughout empty background; entire paws, ears, muzzle and tail visible in every cell; no cropped features, no overlapping sprites, no drop shadows, no text, no labels, no grid lines, no scenery, no ground, no white background, no checkerboard pattern baked into the image, no borders, no extra objects. Avoid muddy brown color, weak or cute expression, fluffy puppy appearance, humanoid pose, standing upright, clothing, blood or gore.
```
