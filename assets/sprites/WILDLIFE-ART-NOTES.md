# Sprites da raposa e da coruja

As folhas aprovadas para o jogo foram recortadas e preparadas para o Canvas, sem alterar as regras dos encontros.

| Recurso | Folha | Quadro | Linha da base |
| --- | --- | --- | --- |
| Raposa | `sources/fox.png` — 192 × 256 | 64 × 64 | 60 |
| Coruja | `sources/owl.png` — 144 × 192 | 48 × 48 | 44 |

Cada folha tem três colunas e quatro linhas, nesta ordem: costas, direita, frente e esquerda. Na imagem aprovada a ordem era frente, esquerda, direita e costas; as linhas foram reorganizadas, não espelhadas. Na raposa, a primeira coluna é o repouso, e as outras duas alternam os passos. A coruja usa as variações nas fases de observação, descanso e alerta.

A preparação mantém uma escala única por animal, remove partículas transparentes soltas e alinha a base de cada quadro. As imagens usam transparência e uma paleta reduzida, sem interpolação ao desenhar. Os recortes não alteram hitboxes, alcance dos avisos, posicionamento, velocidade ou salvamentos.

A raposa é desenhada no plano `entity.y + 14`. As garras da coruja ficam no plano do galho, `perch.y - 42`. O carregamento no navegador usa uma revisão na URL para não reutilizar o PNG antigo do cache.

Panto é o nome exibido do ganso. Os identificadores `goose` e `pond-goose` e as chaves de salvamento permanecem iguais para preservar a aparência já desbloqueada e o progresso do lago.

## Imagens aprovadas

Hashes SHA-256 das folhas recebidas, antes do recorte:

- Raposa: `056433e731c37ab078607d9e63f88440c36c2026501ec7de7b1b346cd8c82393`
- Coruja: `ab67a930fc31926823e64c55a809ea8c2f25844cae2651c38eedc83438eb9f81`
