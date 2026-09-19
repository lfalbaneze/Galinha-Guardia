# PANTO, o fiscal do lago

Nova folha: [sources/panto-v2.png](sources/panto-v2.png), gerada com a ferramenta integrada `image_gen` em 18/09/2026. [Prompt completo](panto-v2-prompt.txt).

O alvo da edição foi o antigo `sources/goose.png`. A folha do Gumercindo serviu de referência para a anatomia de ganso e o pato da turma para contornos e cores. PANTO mantém plumagem branca, bico e pés laranja, sem acessórios; a expressão de bravo, o pescoço e as penas receberam mais definição. O PNG de 1024 × 1536 e seu alfa original foram preservados integralmente. A folha antiga continua no projeto.

São quatro direções — frente, direita, costas e esquerda — com três poses por direção: parada, passo e grasnado com asas abertas. Os recortes usam os espaços transparentes reais; todos compartilham a mesma escala e a base dos pés. A altura no mapa é de até 64 pixels. Asas abertas continuam indicando o aviso e a investida; estrelas e ponto de interrogação acompanham a nova altura.

`src/systems/goose-art.ts` usa as 12 poses. `scripts/build-sprite-data.cjs` publica também parada e passo para o renderizador geral. A aparência jogável Gumercindo, as colisões, o comportamento e os dados salvos permanecem independentes.

Revisões: [12 poses](../../preview/panto-v2-poses.png) · [antes e depois](../../preview/panto-v2-comparison.png). Reproduza com `node scripts/render-panto-review.cjs` e `node scripts/review-panto-ui.cjs`.
