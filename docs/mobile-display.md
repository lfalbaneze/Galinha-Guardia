# Controles e tela no celular

Os controles usam detecção automática por capacidade de toque (any-pointer: coarse,
maxTouchPoints e o primeiro pointerdown de toque). Não dependem do nome do navegador
ou de uma lista de modelos de celular. Mouse e teclado continuam disponíveis.

Na aba Controles, “Detectar controles de toque automaticamente” é o padrão. Alterar
“Controles de toque” manualmente salva o modo ligado/desligado. Marcar a detecção
novamente volta ao automático. Saves antigos que só continham touch: false não
bloqueiam mais a detecção; as outras preferências são mantidas.

O botão ⛶ durante a partida e o botão da aba Controles pedem tela cheia apenas após
um clique/toque. São usadas as APIs nativa e prefixada quando disponíveis. Quando o
navegador ou a permissão do iframe impede fullscreen, o modo expandido ocupa a área
que o jogo realmente pode usar. Isso não remove a barra do navegador nem permite
escapar do iframe do itch.io. O mesmo botão desfaz o modo expandido; Escape também.

A área disponível é medida novamente ao redimensionar, girar o aparelho, entrar/sair
da tela cheia ou mudar a altura da barra do navegador. VisualViewport é usado sem
confundir zoom por pinça com resolução do jogo. O modo normal no celular já ocupa a
largura e altura disponíveis; tela cheia é opcional. O canvas preenche o stage e a
câmera usa um zoom lógico mínimo adaptativo (0,70–0,88 em telas touch pequenas), para
mostrar uma área jogável útil em 320–600 CSS px sem esticar sprites nem multiplicar o
mundo pelo DPR. Joystick e botões também diminuem conforme o lado menor da tela.
Safe areas continuam respeitadas e o menu permanece rolável.

## Validação desta alteração

- `node --check systems/game-input.js`: passou.
- `node --test tests/mobile-controls.test.cjs`: 17 testes passaram.
- Chromium headless: controles e layout isolados passaram em 320x568, 390x844,
  844x390, 1024x768 e 1440x900; DPR 1, 2 e 3. Nos perfis touch foram verificados
  limites dos botões, rotação, modo expandido e saída. O teste de navegador usou
  uma página de teste reduzida, não uma partida completa com todos os sprites.
- Fullscreen nativo, API prefixada e rejeição de permissão foram simulados nos
  testes de unidade. Não houve validação em Android/iPhone físicos nem Safari.
- A suíte completa `npm run verify` não foi executada neste ambiente.

## Publicação

Estas mudanças alteram o repositório, não a versão já enviada ao itch.io. É preciso
regerar o build e substituir o ZIP publicado. No itch.io, confira também a opção de
compatibilidade mobile e a apresentação do jogo; o iframe pai determina o espaço
disponível e a permissão para fullscreen.
