# Cenário da tela inicial

O arquivo `farm-title.png` é o fundo da tela inicial de **Penas pro Ar!**.

## Arquivo

PNG de 1536 × 1024 pixels, com a paisagem da fazenda. O título, os botões e os personagens animados são exibidos separadamente pelo HTML e pelo Canvas; não fazem parte da imagem.

## Composição

O celeiro e a cerca ocupam a região esquerda e central. O céu à esquerda deixa espaço para o título, enquanto a área mais livre à direita recebe o painel da partida. O caminho e o terreiro em primeiro plano servem de fundo para a movimentação dos personagens.

Ao substituir o cenário, mantenha essas áreas livres para não prejudicar a leitura do menu. Os créditos dos sprites usados sobre o fundo estão em `../sprites/CREDITS.html`.

## Retratos do menu

Os ícones de dificuldade usam ilustrações próprias de rosto e peito, em vez de reduzir os sprites de corpo inteiro da partida. A galinha também aparece no cabeçalho do cartão. A prévia animada do personagem fica na aba Bichos.

- `portraits/chick.png`: pintinho para Dia tranquilo.
- `portraits/carijo-face.png`: rosto da galinha carijó para Penas em risco, com o mesmo enquadramento próximo do pintinho e do lobo. Criado com a ferramenta integrada `image_gen.imagegen` a partir da identidade de Erina e dos outros dois retratos; PNG original com alfa preservado. Prompt em [portraits/carijo-face-prompt.txt](portraits/carijo-face-prompt.txt). O arquivo é independente dos retratos de corpo inteiro reconstruídos pelo gerador do baú. `portraits/hen.png` permanece como versão anterior.
- O cabeçalho acompanha a aparência equipada: `carijo.png`, `silkie.png`, `blue.png`, `punk.png`, `astronaut.png`, `robocop.png`, `priest.png` ou `goose.png`. A troca é imediata e também respeita a escolha salva ao reabrir o jogo.
- `portraits/wolf-expressivo.png`: novo lobo para Lobo à solta, combinando com a folha usada na partida. `portraits/wolf.png` permanece como versão anterior.

Os três retratos originais foram criados com a ferramenta integrada `image_gen.imagegen`, com transparência real, e redimensionados para 256 × 256 pixels mantendo o canal alfa. Seus prompts estão em [portraits/PROMPTS.json](portraits/PROMPTS.json).

O novo retrato do lobo também foi criado com a ferramenta integrada `image_gen.imagegen`, usando o retrato anterior como referência de composição e a nova folha como referência do personagem. O PNG gerado é preservado integralmente, com alfa; o menu o exibe a 64 pixels (56 em telas menores). Prompt e detalhes em [WOLF-ART-NOTES.md](../sprites/WOLF-ART-NOTES.md) e [wolf-prompts.json](../sprites/wolf-prompts.json).

Os retratos das aparências têm 192 × 192 pixels e são reconstruídos por `scripts/render-wardrobe.cjs`, usando a pose de frente de cada personagem. As três novas galinhas e seus prompts estão em [HEN-ART-NOTES.md](../sprites/HEN-ART-NOTES.md).
