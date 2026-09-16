# Arte do cenário — Penas pro Ar!

Arte original produzida em 16 de setembro de 2026 com a ferramenta integrada **OpenAI ImageGen**. O CLI/API não foi usado.

- Arquivo final: `assets/farm/farm-atlas.png` (1536 × 1024).
- Cópia embutida para uso offline: `assets/farm/atlas-data.js`.
- A imagem original permanece intacta. O renderizador de sprites interpreta o fundo branco como transparência ao carregar, preservando flores e detalhes brancos. Os recortes são definidos em `systems/farm-sprites.js`.
- Celeiro, galinheiro, silo, árvore, moita, feno, cerca e bebedouro são usados no mapa. O cercado também usa um [abrigo próprio para os pintinhos](NURSERY-ART-NOTES.md).
- Chão, trilhas, canteiros, pedras, palha e ninhos são desenhados pelo jogo. As texturas usam a semente salva e ficam em cache; a arte não modifica obstáculos nem pontos de resgate.

## Prompt final

A technical GAME SPRITE SHEET on a PURE WHITE #FFFFFF background. WHITE BACKGROUND IS MANDATORY. No atmosphere, no gradient, no vignette, no dark background, no cast shadows, no colored lighting behind the props. A 4-column 2-row sheet of eight fully isolated pixel-art farm objects, 1536x1024. Row one: red barn with terracotta tiled roof, honey-brown chicken coop with straw roof, silver grain silo, leafy fruit tree. Row two: small flowering bush, golden tied hay bale, wooden fence section, oval water trough. Every object with at least 40 white pixels of margin from every other object and from all image edges. The entire background, including the holes in the fence and gaps under the coop, is WHITE. Cozy detailed 16-bit pixel art for a top-down farming adventure, three-quarter top-down non-isometric perspective showing fronts and roofs, sunlight from top left, rich greens and warm wood, crisp dark pixel outlines and readable forms. No labels, no text, no animals, no people, no grass islands, no ground platforms. Treat this as an art asset contact sheet on white paper, not a lit scene. Strong flat pure white negative space between all objects.
