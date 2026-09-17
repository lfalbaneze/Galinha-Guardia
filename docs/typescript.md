# Desenvolvimento em TypeScript

O núcleo de gameplay usa TypeScript com verificação estrita. A migração é gradual: o loop principal, o gerador de mundo, os sistemas visuais e o áudio continuam em JavaScript. Não foi adicionado framework. O ganso territorial também usa TypeScript, inclusive no carregamento e na renderização de seus sprites.

## Onde editar

| Fonte TypeScript | Responsabilidade |
| --- | --- |
| `src/systems/player.ts` | Movimento, corrida, fôlego e captura |
| `src/systems/wolf-ai.ts` | Patrulha, percepção lembrada, perseguição e navegação |
| `src/systems/detection-system.ts` | Campo de visão, obstáculos e audição |
| `src/systems/hiding-spots.ts` | Entrada e saída dos esconderijos |
| `src/systems/rescue-system.ts` | Resgates, fuga dos animais e pintinhos |
| `src/systems/game-manager.ts` | Estado da aventura, pontuação e salvamentos |
| `src/systems/map-manager.ts` | Regiões e transições dentro da fazenda |
| `src/systems/goose-system.ts` | Território, aviso, investida, empurrão e retorno do ganso |
| `src/systems/goose-art.ts` | Carregamento, recortes, animação e alinhamento do sprite do ganso |
| `src/systems/gameplay-hud.ts` | Corações de vida e retratos da HUD, sem alterar a simulação |

Os tipos compartilhados ficam em `src/types/game.d.ts`: jogador, lobo, animais, fases, dificuldade, coordenadas, obstáculos, navegação e dados de salvamento. Os contratos com o JavaScript que ainda não foi migrado ficam em `src/types/browser-bridge.d.ts`. Esses arquivos de declaração não geram código e não substituem a validação de dados lidos do navegador.

**Edite os sistemas em `src/systems/`, não suas cópias em `systems/`.** O compilador grava o JavaScript correspondente nos caminhos já usados pelo jogo. Esses arquivos compilados permanecem no Git para permitir jogar sem instalar Node.js.

## Preparar e verificar

Com Node.js 20 ou superior e npm instalados, execute na raiz:

```sh
npm ci
npm run typecheck
npm test
npm run build
```

`npm test` compila os sistemas antes de executar os testes. O build também compila antes de preparar a pasta `dist/`. Para executar as três verificações em sequência:

```sh
npm run verify
```

Para apenas atualizar os arquivos do navegador:

```sh
npm run compile
```

Durante o desenvolvimento, `npm run dev` observa os arquivos TypeScript e recompila quando eles mudam. **Esse comando não inicia um servidor nem recarrega a página.** Abra `index.html` e atualize o navegador após a compilação, ou use o servidor local descrito no README.

## Arquivos compilados e commits

Depois de alterar um sistema, inclua no commit tanto o `.ts` quanto o `.js` gerado. Esta verificação acusa saídas ausentes ou desatualizadas sem reescrevê-las:

```sh
npm run check:generated
```

Se ela falhar, execute `npm run compile`, confira o diff e adicione os arquivos atualizados. A versão do compilador está fixada no `package-lock.json` para manter a geração reproduzível.

## Testes

`tests/typescript-gameplay.test.cjs` exercita em conjunto os sistemas compilados, com substitutos para navegador, desenho e áudio. Cobre movimento, fôlego, dano, visão, audição, resgates, esconderijos, regiões e compatibilidade de salvamentos. Esses testes complementam a suíte existente; não substituem jogar no navegador.

`tests/types/gameplay.contracts.ts` contém exemplos que devem ser aceitos ou rejeitados pelo compilador. Entre os casos rejeitados estão resgatar um lobo como animal, usar texto no número de vidas, informar uma fase inexistente e restaurar um salvamento sem tratar a possibilidade de ausência. Esses exemplos são verificados por `npm run typecheck` e nunca carregados pelo jogo.

O ganso tem tipos próprios em `src/types/goose.d.ts`, testes de comportamento em `tests/goose.test.cjs` e contratos em `tests/types/goose.contracts.ts`. Ele não pertence à lista de amigos resgatáveis. Salvamentos antigos recebem o morador do lago sem perder progresso. O som pode ser reconstruído com `node scripts/generate-goose-audio.cjs`.

## Compatibilidade

A saída usa scripts clássicos, na mesma ordem de `index.html`, sem importações que exijam um servidor de módulos. Imagens, sons, créditos, controles e chaves do armazenamento local permanecem nos mesmos caminhos. A verificação de tipos cobre os sistemas migrados; os chamadores que continuam em JavaScript dependem dos testes de integração e dos contratos da ponte.

## HUD e sprite do ganso

O estilo da partida fica em `gameplay.css`, separado do menu ilustrado de `style.css`. Os IDs dos contadores, barras e botões continuam ligados ao estado do jogo. A apresentação usa os recursos já carregados e só redesenha os retratos quando a aparência muda. Som, aparências e dificuldade ficam nas abas do menu de pausa.

`assets/sprites/sources/goose.png` contém 12 quadros de 64 × 64 pixels: linhas cima, direita, frente e esquerda; colunas parado, passo e aviso com asas abertas. Todos usam a mesma escala e a linha 60 como base dos pés. O carregamento participa do bloqueio de início da partida: uma imagem ausente não cria um inimigo invisível. `tests/hud-sprites.test.cjs` cobre imagens, animação, alinhamento, falhas de carregamento e a HUD.

## Desafio opcional do lago

`src/systems/lake-challenge.ts` controla início, cancelamento, contagem, recompensa, persistência e colisões da ponte. A tecla F e o botão de contexto passam pelo mesmo método. `src/types/lake.d.ts` define os contratos. Os estados `notice`, `feint`, `stunned` e `defeated` complementam a máquina do ganso em `goose-system.ts`; a direção só é fixada no aviso e não segue uma galinha escondida.

O salvamento da aventura ganha o campo opcional `lake`, sem mudar sua chave ou invalidar versões anteriores. Uma vitória válida requer `version: 1`, `completed: true` e `misses: 3`. Tentativas interrompidas não retomam ataques. O baú preserva a chave anterior; `goose` é uma aparência exclusiva, não liberada por contagens de resgate.

A ponte divide o obstáculo do lago em duas margens, deixando 72 pixels livres entre elas. Reconstruir os obstáculos invalida a navegação do lobo. `systems/farm-details.js` calcula e armazena as variantes e os locais livres para placas, sem consumir a sequência aleatória da simulação. `FarmSprites` prepara variantes de materiais em cache, não por quadro.

Testes específicos: `tests/lake-challenge.test.cjs`, `tests/farm-details.test.cjs` e `tests/types/lake.contracts.ts`.

### Navegador

A verificação `Check lake in browser` joga o desafio com posições iniciais controladas, usando as teclas de movimento e os métodos normais de simulação. Os três pontos são obtidos por investidas reais, não inseridos no estado. Ela verifica a ponte, o baú, a recarga, a pausa, `file://` e quatro larguras de tela. Os PNGs e o relatório ficam no artefato `lake-browser-review`.

Para repetir localmente, compile o projeto, instale `tests/browser/requirements.txt`, execute `python -m playwright install chromium`, sirva o repositório com `python -m http.server 8765 --bind 127.0.0.1` e rode `python tests/browser/lake_smoke.py` em outro terminal.
