# Arte do cenário — Penas pro Ar!

A folha `farm-atlas.png` reúne a vegetação e os objetos de fallback. Celeiro, galinheiro, silo, feno, bebedouro e cerca usam agora a folha [farm-props.png](farm-props.png), descrita em [PROP-ART-NOTES.md](PROP-ART-NOTES.md).

## Arquivos e integração

- `assets/farm/farm-atlas.png`: folha de 1536 × 1024 pixels.
- `assets/farm/atlas-data.js`: cópia embutida para funcionamento offline.
- `systems/farm-sprites.js`: coordenadas dos recortes usados pelo renderizador.

O jogo interpreta o fundo branco da folha como transparência ao carregar os sprites, preservando flores e detalhes brancos internos. A imagem de origem permanece intacta.

## Elementos do mapa

O conjunto inclui celeiro, galinheiro, silo, árvore, moita, feno, cerca e bebedouro. O cercado também usa um [abrigo próprio para os pintinhos](NURSERY-ART-NOTES.md).

Chão, trilhas, canteiros, pedras, palha e ninhos são desenhados pelo jogo. As texturas usam a semente salva da fazenda e ficam em cache.

As imagens não definem as colisões: trocar um recorte ou sua escala não altera automaticamente os obstáculos nem os pontos de resgate. Ao modificar o cenário, confira separadamente a aparência e a área física de cada elemento.

## Apresentação no mapa

`FarmSprites.draw` aceita `grounded: true`: recorta margens transparentes e reduz o desenho em etapas. A vegetação e o atlas antigo usam uma paleta de 28 cores; os novos objetos preservam suas cores de madeira, água e metal. O resultado fica em cache por elemento e material. O PNG original não é modificado. Duas variantes das moitas mostram só folhas; a terceira mantém as flores.

`FarmDetails.drawFooting` posiciona a sombra junto à base. Árvores usam o pé do tronco, não a copa; as placas têm contato em cada poste. O desenho não espelha construções nem usa um celeiro no lugar de um galinheiro.

As cercas espalhadas nas bordas das regiões pelos geradores antigos eram decorativas e não fechavam áreas. Elas não são desenhadas. Permanecem as divisas da fazenda e o refúgio com entrada e colisões próprias. Feno, árvores e moitas continuam nas posições salvas porque também fazem parte dos resgates e esconderijos.
