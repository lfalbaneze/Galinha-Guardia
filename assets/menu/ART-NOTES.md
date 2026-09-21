# Ilustração da missão — PixelLab

`rescue-ensemble-b0ff47268d75.png` é a ilustração original de 624 × 416 pixels criada pela API PixelLab Pro (`/generate-image-v2`, seed 520926) em 20/09/2026. O PNG recebido foi preservado integralmente, sem recortes ou retoques.

O pedido foi substituir a imagem e a composição do painel “A turma conta com você”, não redistribuir sprites sobre a paisagem antiga. A cena nova reúne a galinha sobre um caixote, ovelha, porco, Paçoca, coelho, vaca, pato e dois pintinhos num pomar com portão de madeira. O grupo forma uma composição próxima e triangular, com expressões e poses voltadas para o centro. As referências foram as vistas PixelLab da galinha, Paçoca, ovelha e porco.

O painel exibe a imagem completa na proporção original. A identificação da aparência equipada continua no retrato separado “na missão”. A ilustração do pomar é a cena de **Aventura**.

## Uma cena por dificuldade

As quatro dificuldades exibem ilustrações diferentes, selecionadas junto com o modo de jogo. Todas têm 624 × 416 pixels e o mesmo tratamento de pixel art. As imagens são carregadas antecipadamente; nenhuma geração ocorre durante a partida.

- **Explorador:** manhã tranquila no campo, Erina e os pintinhos observando uma borboleta, Paçoca e a ovelha descansando.
- **Aventura:** reunião da turma no pomar, com Erina sobre o caixote.
- **Contra o tempo:** resgate em corrida numa composição diagonal, com uma ampulheta como símbolo de urgência.
- **Última luz:** grupo protegido pela luz de uma lanterna ao anoitecer, com o lobo distante no pomar.

As três cenas adicionais usam a ilustração do pomar no campo de referência de estilo e quatro vistas individuais dos animais como referências de identidade, sem reutilizar a composição. Originais produzidos pela API PixelLab Pro, preservados sem retoques. Prompts e seeds em [difficulty-prompts.json](difficulty-prompts.json), arquivos em [difficulty-art.json](difficulty-art.json); produção reproduzível por `scripts/generate-difficulty-art.cjs`, com registro de trabalhos para evitar reenvios pagos. As primeiras tentativas com a cena inteira como referência de personagem foram rejeitadas e não estão instaladas.

Na revisão final de Contra o tempo (seed 620938), a referência de estilo foi a cena de Explorador, para afastar a composição do retrato estático no pomar.

## Capa do jogo

`cover-9dd81acab19e.png` é a capa de **Penas pro Ar!**, criada pela API PixelLab Pro em 20/09/2026, seed 620940, com 624 × 416 pixels. O original foi preservado integralmente, incluindo o título desenhado. Erina protege os pintinhos, com Paçoca, ovelha e porco em primeiro plano; o lobo aparece atrás da cerca. A capa abre o README e está disponível como PNG independente. Prompt e referências em [cover-prompt.json](cover-prompt.json).

## Cenário da tela inicial

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
