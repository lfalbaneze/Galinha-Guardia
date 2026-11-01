# Poses de resultado do Shuffle

38 imagens de resultado, duas por personagem para vitória e derrota.
As referências vêm dos personagens realmente carregados pela Revoada do Caos.
36 imagens são recortes dos atlas nativos, preservando os pixels do desenho.
Usam as expressões de alegria e tristeza quando disponíveis; os demais usam
poses distintas de repouso e caminhada. A Midori mantém duas repinturas locais
que preservam sua identidade de galinha sedosa japonesa.

Sophis, corvo e coruja reutilizam seis quadros distintos dos atlas PixelLab
instalados, com escala inteira e margens transparentes. São poses selecionadas
de repouso, caminhada e alerta, sem novas expressões desenhadas para o resultado.
`atlas-poses.json` registra o atlas, seu hash e os recortes usados. Os previews
desenhados à mão e as gerações rejeitadas não foram instalados.

`manifest.json` e `shuffle/result-art.js` apontam para PNGs transparentes de
128 × 128, com nomes derivados do conteúdo. Os arquivos funcionam offline.

Com o ComfyUI local ligado e os atlas do modo instalados:
`node scripts/prepare-chaos-sprites.cjs --mode`, depois
`.\.cache\comfyui\venv\Scripts\python.exe scripts/generate-comfyui-chaos.py` e
`node scripts/build-chaos-art.cjs`.
As receitas, referências e resultados rejeitados ficam em `.cache`, fora do
pacote publicado. `assets/shuffle/chaos-111/portraits.json` registra cada recorte.
