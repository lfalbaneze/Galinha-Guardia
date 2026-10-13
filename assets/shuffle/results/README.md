# Poses de resultado do Shuffle

38 imagens PixelLab, duas por personagem para vitória e derrota.
As aparências existentes servem de referência; os inimigos novos seguem o
catálogo de identidade do projeto. São poses estáticas de resultado, separadas
das animações de movimentação em oito direções.

Sophis, corvo e coruja reutilizam seis quadros distintos dos atlas PixelLab
instalados, com escala inteira e margens transparentes. São poses selecionadas
de repouso, caminhada e alerta, sem novas expressões desenhadas para o resultado.
`atlas-poses.json` registra o atlas, seu hash e os recortes usados. Os previews
desenhados à mão e as gerações rejeitadas não foram instalados.

`manifest.json` e `shuffle/result-art.js` apontam para PNGs transparentes de
128 × 128, com nomes derivados do conteúdo. Os arquivos funcionam offline.

Geração: `node scripts/generate-shuffle-results.cjs [identificador]`.
Depois da inspeção visual: `node scripts/generate-shuffle-results.cjs --install [identificador]`.
Extração local sem API: `node scripts/generate-shuffle-results.cjs --from-atlas enemy-amanda enemy-crow enemy-owl`.
Após conferir os arquivos `*-atlas.png`, repetir com `--install` para atualizar o manifest.
Referências, resultados rejeitados e registros de geração ficam em `preview/pixellab/results`
e `.cache/pixellab`, fora do pacote publicado. A chave fica em `.env.local`.
