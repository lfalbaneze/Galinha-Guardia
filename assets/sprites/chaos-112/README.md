# Arte da Revoada do Caos

31 modelos usados neste modo: 30 recuperados diretamente dos atlas PixelLab
originais, após a repintura por quadro borrar rostos, contornos e cores.
A recuperação inclui Mula sem Cabeça, Curupira, Boitatá, Cuca, demais inimigos,
aparências equipáveis e amigos resgatados. As poses e passadas são preservadas.
A Midori mantém a correção local de identidade feita no ComfyUI.
Os dez novos inimigos da fazenda reutilizam esses desenhos nativos: pintinho,
pato, porco, peru, cordeiro, bode, burro, ovelha, cavalo e vaca. Seus ataques,
avisos, pausas e retratos são próprios; os 58 retratos preservam as identidades.
As oito direções, os recortes e o apoio dos pés foram preservados. A Midori usa
referências corrigidas para a raça sedosa japonesa, sem crista vermelha.

Os arquivos em `meta` registram as fontes, prompts e parâmetros reais. Não são
publicados no build. `scripts/build-chaos-art.cjs` valida os PNGs e cria o
registro do modo. A campanha e a Revoada compartilham os desenhos recuperados.
`scripts/render-chaos-review.cjs` usa o renderizador real para gerar as folhas
de direção e prévias de caminhada e corrida em `preview/chaos-sprites`.

A geração pode ser reproduzida com `scripts/prepare-chaos-sprites.cjs` e
`scripts/generate-comfyui-chaos-cast.py`. O servidor e os modelos ficam em
`.cache/comfyui`; os trabalhos intermediários ficam fora do jogo publicado.
Instalação e fontes dos modelos: [documentação local](../../../docs/comfyui-local.md).
