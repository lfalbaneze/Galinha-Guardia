# Um conjunto para a fazenda

Arquivo final: [farm-cohesive-v2.png](farm-cohesive-v2.png), 1254 × 1254, com transparência original. Criado com a ferramenta integrada **image_gen.imagegen**, usando [Erina](../sprites/sources/cute-hen-v2.png) como referência de contorno, cores e sombreado. [Prompt completo](cohesive-v2-prompt.txt). A imagem foi copiada integralmente; os atlas anteriores continuam preservados.

São 16 sprites: macieira, moita, pereira, salgueiro, amoreira, abrigo, celeiro, galinheiro, silo, feno, bebedouro, cerca, margaridas, flores roxas, caixote com regador e berçário. Os recortes em `FarmSprites.cohesiveFrames` seguem os limites reais de cada desenho, pois a imagem gerada não seguiu exatamente a grade solicitada. `atlas-data.js` incorpora os bytes originais para uso offline.

O desenho usa formas de folhas maiores, contornos marrons, sombras simples e a mesma madeira nas construções. A horta desenhada em Canvas acompanha os contornos e cores desse conjunto. O renderer `SpriteStyle` usa a mesma redução em etapas, precisão de cor e transparência nas folhas de personagens, Panto, Thor, Lorenzo, coruja, espantalho e cenário. O resultado é guardado em cache, com pixels inteiros na escala do mundo. Nenhum PNG de origem é repintado ou redimensionado no disco.

## Proporções

Alturas máximas em pixels do mundo; a proporção de cada pose é mantida:

| Grupo | Alturas |
| --- | --- |
| Pintinho | 24 |
| Pato e gato de resgate | 38 |
| Coelho e cordeirinho | 40 e 42 |
| Cachorro, porco e ovelha | 48, 54 e 58 |
| Galinha, peru e cabra | 54, 54 e 62 |
| Burro, vaca e cavalo | 82, 88 e 104 |
| Stella, Zeca e Pipoca | 44, 46 e 46 |
| Paçoca e Gumercindo | 50 e 58 |
| Moitas grandes | até 66 |
| Árvores | até 182; copas menores perto de caminhos e placas |
| Flores e caixote | 22–24 e 28 de largura |

Skins pequenas não recebem mais um aumento automático para alcançar a altura das galinhas. Objetos são encaixados mantendo sua proporção e a base no chão, sem esticar folhas, silo ou bebedouro. As cercas usam a largura do trecho para manter a continuidade. Copas se ajustam ao espaço disponível sem mover os troncos ou colisões. Os pequenos enfeites continuam limitados aos seus pontos de interesse, sem aumentar sua quantidade.

## Conferência

`Sunlight` controla um sol ilustrado que percorre a parte superior da partida, mantendo espaço para HUD e minimapa. Sua posição vem de `state.elapsed` (ida e volta suave em 240s), preservando pausa e saves. As silhuetas dos sprites são projetadas no chão numa direção comum, com sombras mais curtas perto do meio do trajeto. Máscaras são feitas por composição Canvas e ficam em cache, sem leituras de pixels. Personagens, fauna, construções, vegetação, culturas, placas, cercas e borboletas usam essa luz; sombras curtas de contato e bases físicas continuam ancoradas. Partes de primeiro plano não repetem a sombra. Cenas finais e de Thor preservam sua iluminação própria; movimento reduzido fixa o sol no alto. Revisão: `scripts/render-sunlight-review.cjs` e `tests/sunlight.test.cjs`.

O galinheiro elevado possui uma pequena base de terra e três apoios de pedra medidos pelos pés do sprite; a rampa tem seu próprio contato com o solo. A perspectiva não é achatada até a ponta da rampa. A sombra de contato ignora os vãos suspensos entre os postes. `foundation:true` é usado somente nos galinheiros da fazenda, com geometria, escala e PNGs intactos. Revisão: `node scripts/render-coop-review.cjs`, `preview/grounded-coop.png` e `preview/coop-supports.png`.

Milho e girassóis usam o mesmo acabamento da horta: folhas largas, contorno marrom, espigas douradas e pétalas arredondadas. As raízes, alturas e reações ao contato continuam nas posições originais; aviso e bote do lobo permanecem ativos. `FarmDetails.drawRows` unifica a terra dos dois campos. As cinco placas físicas (Milharal, Curral, Horta, Pomar e Girassóis) compartilham `drawSign`, com madeira clara, letras escuras e postes apoiados. A placa dos girassóis é desenhada uma vez na camada de objetos. Prévia: `preview/signs.png`, `preview/sunflowers-contact.png` e `preview/sunflowers-warning.png`.

A horta usa desenhos Canvas próprios com formas largas, contorno marrom e cores quentes. As quatro culturas variam em tamanho, orientação e estágio de crescimento; a ordem das fileiras muda por canteiro sem alterar suas raízes salvas. Montículos de terra separados substituem o retângulo bege. Na partida, as plantas entram na ordenação por profundidade com os personagens. Contato dobra as folhas pela raiz; corrida solta poucas folhas, com som mais baixo ao andar de mansinho. `node scripts/render-garden-review.cjs` gera repouso, contato e recuperação; `tests/garden-interaction.test.cjs` cobre som, pausa, movimento reduzido e sobreposição.

O contato com o chão é medido no alfa do sprite já reduzido: a última linha opaca encosta na base do objeto. Sombras curtas acompanham seu contorno inferior, com apoio separado para cada pé do bebedouro; não há oval genérico pela largura da caixa. A máscara fica em cache e também atende à arte antiga de reserva. Cercas horizontais e verticais terminam na mesma linha. Recortes de primeiro plano do berçário não repetem a sombra. `node scripts/render-grounding-review.cjs` gera a revisão; `tests/prop-grounding.test.cjs` verifica os pixels, inclusive espelhamento, transparência, cache e geometria preservada.

[Comparação de tamanhos reais](../../preview/style-scale-review.png), [pomar com Stella](../../preview/cohesive-orchard.png) e [horta no navegador](../../preview/farm-garden-desktop.png).

Reproduzir: `node scripts/render-cohesive-review.cjs` e `node scripts/review-playfield.cjs`. Testes de recortes, alfa, proporção e cache: `node --test tests/cohesive-art.test.cjs`. As verificações existentes de fazendas procedurais, placas, colisões e carregamento continuam aplicáveis.
