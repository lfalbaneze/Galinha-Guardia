# Abrigo dos pintinhos

O abrigo faz parte do cercado dos amigos e acomoda os pintinhos resgatados durante a aventura.

## Arquivos

- `assets/farm/chick-nursery.png`: imagem de 1536 × 1024 pixels.
- `assets/farm/atlas-data.js`: cópia embutida para uso offline.
- `assets/farm/farm-atlas.png`: referência visual dos demais elementos da fazenda.

## Integração visual

O abrigo tem três aberturas com palha, teto baixo e frente aberta para manter os pintinhos visíveis. A frente baixa cobre apenas os pés dos personagens.

O jogo interpreta o fundo branco como transparência, preservando as flores e os detalhes internos. A imagem de origem permanece intacta; o posicionamento dos pintinhos e a sobreposição das camadas são feitos pelo renderizador.

Ao ajustar o desenho ou a escala, confira se os seis pintinhos continuam visíveis no cercado e se a frente do abrigo não cobre seus rostos.
