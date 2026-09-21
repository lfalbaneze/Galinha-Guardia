# Boia

Arte criada em 19/09/2026 com a ferramenta integrada `imagegen`, usando a skill `imagegen`.

- Arquivo final: [sources/lifebuoy.png](sources/lifebuoy.png), PNG RGBA de 1536 × 1024, com transparência no exterior e na abertura central.
- Referência de estilo: [sources/cute-hen-v2.png](sources/cute-hen-v2.png).
- O original gerado foi copiado sem alterações. O jogo usa o recorte `(304, 196, 928, 632)` e a mesma redução de sprites de `SpriteStyle`, em duas camadas: atrás da personagem e sobre sua cintura. As coordenadas de desenho são inteiras para manter o contorno estável.
- Prévia: [../../preview/swimming.png](../../preview/swimming.png).

## Prompt final

```text
Use case: stylized-concept. Create one production-ready game sprite: a chunky inflatable lifebuoy for a cute farm animal rescue game. The attached chicken sheet is STYLE REFERENCE ONLY; do not include any chicken, character, background, or sprite sheet. Draw exactly one empty lifebuoy on a genuinely transparent background, including a transparent center hole. Three-quarter overhead view, horizontally aligned oval, seen at the same camera angle as a Stardew Valley farm game, visually matching the reference's dark warm-brown pixel outlines and crisp stepped pixel edges. A thick rounded inflated tube, rich coral red with four broad warm ivory bands, rich burgundy undersides, peach highlights, a clean substantial rounded front wall. Symmetrical silhouette, center opening large enough for a small animal's waist. Outer oval width about twice its height, visibly thick depth, not a thin flat disk. Polished readable low-resolution pixel art, small controlled palette, large clean color clusters, no noisy texture, no fine dithering, no blurred outlines, no antialiasing effects, no photorealism. This will be displayed 65 to 82 pixels wide in-game: strong simple silhouette and 1–2 pixel dark contour at that size. The tube's central opening and front/back arcs must read clearly. Center it with generous transparent padding, whole object uncropped. No water, no splashes, no shadow outside the object, no rope, no handles, no wings, no face, no text, no extra objects. Output a single transparent PNG.
```
