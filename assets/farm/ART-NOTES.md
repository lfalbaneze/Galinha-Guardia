# Arte do cenário — Penas pro Ar!

A folha `farm-atlas.png` reúne os elementos de cenário usados durante a partida.

## Arquivos e integração

- `assets/farm/farm-atlas.png`: folha de 1536 × 1024 pixels.
- `assets/farm/atlas-data.js`: cópia embutida para funcionamento offline.
- `systems/farm-sprites.js`: coordenadas dos recortes usados pelo renderizador.

O jogo interpreta o fundo branco da folha como transparência ao carregar os sprites, preservando flores e detalhes brancos internos. A imagem de origem permanece intacta.

## Elementos do mapa

O conjunto inclui celeiro, galinheiro, silo, árvore, moita, feno, cerca e bebedouro. O cercado também usa um [abrigo próprio para os pintinhos](NURSERY-ART-NOTES.md).

Chão, trilhas, canteiros, pedras, palha e ninhos são desenhados pelo jogo. As texturas usam a semente salva da fazenda e ficam em cache.

As imagens não definem as colisões: trocar um recorte ou sua escala não altera automaticamente os obstáculos nem os pontos de resgate. Ao modificar o cenário, confira separadamente a aparência e a área física de cada elemento.
