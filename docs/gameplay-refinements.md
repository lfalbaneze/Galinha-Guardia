# Lagoa, sombras e stealth

## Lagoa do Panto

O desafio ativo continua protegendo a galinha do lobo. Depois de vencer as três
rodadas, a lagoa e uma faixa de 70 unidades ao redor se tornam um refúgio permanente
daquela partida. O contorno tracejado mostra o limite; o HUD indica “LAGOA SEGURA”.
A proteção depende da posição atual do centro da hitbox da galinha, não da posição
do ganso resgatado. Sair da área encerra a proteção geográfica imediatamente.

O lobo espera fora da área enquanto ela está ocupada. Ao entrar, um lobo que já
estava dentro é reposicionado para um ponto externo livre; não é reposicionado a
cada frame. A captura também verifica a proteção diretamente. O refúgio não aumenta
a invulnerabilidade nem altera vidas ou pontos. A vitória salva já existente restaura
o desbloqueio; uma nova partida ou tentativa interrompida não o recebe.

## Sombras no chão

O renderizador separa chão, sombras projetadas e personagens/objetos. Duas superfícies
reutilizáveis preservam o chão e acumulam sombras; a composição coloca as sombras
abaixo dos corpos, mesmo quando desenhadas posteriormente. O tamanho acompanha o
canvas, sem criar novas superfícies a cada frame. Pequenas sombras de contato ficam
ancoradas aos pés, independentemente da elevação do corpo. A coruja não recebe uma
sombra de contato de animal terrestre. Os bloqueios de sombra do nado e do feno
continuam respeitados. Contextos sem suporte mantêm a projeção anterior como fallback.

## Stealth

Mansinho reduz a percepção; não atrai os animais e não funciona como invisibilidade.
O animal percebe a galinha próxima dentro de um cone de visão de 100 graus e de um
alcance de 90 unidades ajustado por sua personalidade, desde que não exista obstáculo
bloqueando a visão. Aproximar-se por trás não faz o animal virar magicamente. Se ele
virar e avistar a galinha, foge. Ativar stealth após ser visto não apaga a lembrança
da ameaça. O resgate por contato continua disponível, sem seguimento automático.

Falas como “Tá, você guia!” não aparecem durante stealth. Um susto real usa frases
como “Eita! Quem tá aí?!” e “Você apareceu de fininho!”. Um animal que não percebeu a
galinha permanece quieto. Alarmes reais do lobo têm prioridade. A amizade concedida
por aparências especiais funciona fora do stealth; chamar pintinhos continua sendo
uma interação explícita.

## Validação local

- Sintaxe JavaScript e emissão dos três módulos TypeScript com TypeScript 5.8.3.
- 16 testes isolados em `tests/stealth-lagoon.test.cjs`: passaram.
- Chromium real, com canvases de teste: passaram as nove verificações compartilhadas
  de composição em `tests/shadow-layer-checks.cjs`, além do contato de um corpo elevado.
- Testes de regressão de comportamento atualizados para não exigir atração por stealth.
- Testes nativos de canvas adicionados em `tests/ground-shadows.test.cjs` para a suíte.

Os testes locais isolam os módulos; não equivalem a uma partida completa com todos
os sprites. A suíte completa, o typecheck integrado e o build devem ser conferidos
nos checks do pull request. Não houve teste em celular físico nem publicação no itch.io.
