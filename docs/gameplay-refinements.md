# Comportamento da aventura, lagoa e stealth

As sombras dos personagens terrestres mantêm o desenho das patas em contato
com o chão, mesmo quando a projeção solar comprime as pernas finas. A projeção
é curta e acompanha a iluminação; saltos e aves voando mantêm sua separação do
chão. Não há sombras de bolinha ou oval sob os personagens.

## IA da aventura — 10/10/2026

As decisões abaixo pertencem ao jogo base. O modo Survivor mantém seus próprios
sistemas de combate e progressão.

- Baltazar prevê corridas laterais, acompanha a fuga durante a preparação e trava
  a mira nos últimos 0,12 s antes de investir, sem desenhar a rota no chão.
  Perseguições longas consomem seu fôlego e criam uma pausa para
  despistar. Ao perder visão, investiga a última pista e as saídas próximas dos
  caminhos, sem atualizar o destino com a posição escondida da galinha.
- Lorenzo espera uma aproximação curta para saltar da moita. Sophis pode sair
  antes, contornar por um lado livre e só então anunciar sua investida. Ambas
  precisam ver a preparação, respeitam obstáculos e podem escolher a próxima
  moita a partir de uma fuga que realmente observaram.
- Panto protege o centro do território, procura espaço navegável para o bote e
  investiga brevemente o último avistamento. Nos modos difíceis pode responder a
  esquivas repetidas com mais um bote, sempre avisado; a sequência de três rodadas
  da lagoa continua independente.
- As corujas varrem as entradas dos caminhos, procuram a última fuga observada e
  trocam de posto após a sirene ou uma vigília longa. Árvores menos favoráveis
  continuam sendo alternativas quando não existe um destino ideal.
- TIH alterna os lados da aproximação e antecipa um pouco uma corrida visível.
  A Mula atravessa uma faixa mais longa. Curupira muda a formação das raízes após
  contra-ataques; Cuca mantém distância e alterna leques com uma abertura central;
  Boitatá anuncia um percurso em curvas e deixa fogo que demora a armar. Os chefes
  continuam opcionais, com três contra-ataques e o mesmo progresso salvo.
- Os amigos percebem também raposas, Panto agressivo, lendas e perigos no chão.
  O alarme se propaga por uma vizinhança, sem corrente infinita. A fuga considera
  mais de uma ameaça e respeita os limites de sua região; os animais cansados
  aceitam uma aproximação tranquila depois de observar a galinha esperar.

O aviso de um ataque congela a trajetória. Cada espécie conserva sua pausa de
recuperação; raízes, fogo e projéteis validam toda a largura contra obstáculos.
As dificuldades variam tempo de reação, persistência, descanso e repertório, sem
conceder visão através de paredes. O carregamento descarta ataques em preparação
e concede a trégua habitual, preservando os resgates e chefes vencidos.

Regressões específicas: `base-wolf-tactics`, `base-sentinels-tactics`,
`base-animal-tactics` e `base-encounter-tactics` em `tests/`.

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
canvas, sem criar novas superfícies a cada frame. Os personagens, inclusive as aves,
projetam a silhueta pela iluminação do cenário, sem bolinhas ou elipses sob os pés.
O apoio dos sprites continua ancorado ao chão independentemente da elevação do corpo.
Os bloqueios de sombra do nado e do feno continuam respeitados. As cercas também
projetam sombras dos postes e travessas depois do carregamento de suas imagens.

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

## Validação local — 10/10/2026

- `tests/base-gameplay-soak.test.cjs`: campanhas nas quatro dificuldades, com
  navegação no mapa real, fôlego, danos, pausa, save/load e resgate dos 12 amigos.
  Também percorre esconderijo e refúgio, sem teletransporte ou invulnerabilidade extra.
- `tests/browser/base_ai_live.py`: animação pelo ciclo real do navegador, esquiva
  por teclado e pausa em 1280 e 390 px. Registra aviso, trajetória fixa, investida
  e recuperação, com gravações locais em `.cache/base-ai-live/`.
- Os testes de navegador de fauna, lagoa e folclore cobrem ataques, contra-ataques,
  alertas das corujas, recuperação de imagens ausentes e restauração da partida.
- `tests/browser/region_notice_smoke.py`: título da região e painel de perigo
  permanecem legíveis e separados em cinco larguras, de 320 a 1280 px.
- Os testes nativos de sombras verificam projeções abaixo dos corpos, ausência
  de elipses em todas as espécies e apoio dos sprites sem leitura de pixels por frame.
- Os retratos de Sophis, corvo e coruja usados nos resultados têm origem registrada
  nos atlas PixelLab instalados, com comparação exata dos pixels em teste.
- A suíte completa executou 944 testes: a única falha era um cenário de amizade
  canina fora do território do cão. Após corrigir o cenário, os sete testes daquele
  arquivo passaram; os cinco testes adicionais de campanha também passaram.
  Typecheck, sincronização dos 26 módulos gerados e build final passaram.
  A versão Python passou em seus 54 testes.

As campanhas automatizadas conhecem as posições dos amigos; demonstram progressão
e estabilidade, não a dificuldade percebida por jogadores. As gravações usam Chrome
emulado, sem teste em celular físico ou publicação no itch.io.
