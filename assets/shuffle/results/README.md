# Poses de resultado do Shuffle

32 imagens PixelLab, duas por personagem: vitória e derrota cômica.
As aparências existentes servem de referência; os inimigos novos seguem o
catálogo de identidade do projeto. São poses estáticas de resultado, separadas
das animações de movimentação em oito direções.

`manifest.json` e `shuffle/result-art.js` apontam para PNGs transparentes de
128 × 128, com nomes derivados do conteúdo. Os arquivos funcionam offline.

Geração: `node scripts/generate-shuffle-results.cjs [identificador]`.
Depois da inspeção visual: `node scripts/generate-shuffle-results.cjs --install [identificador]`.
Referências, resultados rejeitados e registros de geração ficam em `preview/pixellab/results`
e `.cache/pixellab`, fora do pacote publicado. A chave fica em `.env.local`.
