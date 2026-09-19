# Detalhes do campo

O conjunto usado agora na partida é [o atlas coeso v2](COHESIVE-ART-NOTES.md), com flores simples, caixote compacto e a mesma textura dos demais sprites. O atlas abaixo foi preservado como versão anterior e fallback de carregamento.

Atlas criado com a ferramenta integrada **image_gen.imagegen**, usando `farm-props.png` como referência de estilo. [Prompt completo](scenery-prompt.txt). Arquivo final: [meadow-details.png](meadow-details.png), 1536 × 1024, copiado integralmente com transparência preservada.

São seis grupos em três colunas e duas linhas: margaridas e flores vermelhas; flores roxas e samambaias; pedras com musgo e cogumelos; carrinho de mão com abóboras; caixas de verduras com regador; vasos floridos. `FarmScenery.load` calcula os recortes a partir do alfa de cada célula, sem repintar a imagem. O atlas também é incorporado em `atlas-data.js` para funcionar offline.

`FarmScenery.details` coloca poucos grupos junto a lugares específicos: duas pequenas flores perto do galinheiro, do pomar e de cada um dos dois pastos floridos; um caixote com regador junto a um canto do maior canteiro da horta. Esse conjunto tem 28 px de largura, com 10–11 px entre ele e a borda do canteiro. Se nenhum canto estiver livre, ele é omitido; nunca procura uma posição mais distante no gramado. Os demais recortes continuam preservados no atlas, mas não são espalhados pelo mapa. A colocação evita passagens, áreas de água, plantações, estruturas, placas e pontos de nascimento. As flores antigas espalhadas pelo gerador deixam de ser desenhadas por cima dessa composição. São enfeites baixos, sem novas colisões ou efeitos sobre a IA. A lista é armazenada por layout e o renderer desenha somente a região visível. Borboletas são pequenos efeitos do renderer; ficam estáticas com movimento reduzido.

`FarmTerrain` mantém a textura em cache: variação suave de grama, pequenos tufos e dois sulcos de carroça nos caminhos. Nada disso muda a geometria ou a semente salva da fazenda.

Prévia no navegador real: [partida](../../preview/farm-play-desktop.png), [pasto](../../preview/farm-meadow-desktop.png), [horta](../../preview/farm-garden-desktop.png), [celular](../../preview/farm-play-mobile.png). Revisão reproduzível: `node scripts/review-playfield.cjs`.
