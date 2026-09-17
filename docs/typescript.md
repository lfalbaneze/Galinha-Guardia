# Desenvolvimento em TypeScript

O núcleo de gameplay usa TypeScript com verificação estrita. A migração é gradual: o loop principal, o gerador de mundo, os sistemas visuais e o áudio continuam em JavaScript. Não foi adicionado framework nem alterada a jogabilidade.

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

Os tipos compartilhados ficam em `src/types/game.d.ts`: jogador, lobo, animais, fases, dificuldade, coordenadas, obstáculos, navegação e dados de salvamento. Os contratos com o JavaScript que ainda não foi migrado ficam em `src/types/browser-bridge.d.ts`. Esses arquivos de declaração não geram código e não substituem a validação de dados lidos do navegador.

**Edite os sete sistemas em `src/systems/`, não suas cópias em `systems/`.** O compilador grava o JavaScript correspondente nos caminhos já usados pelo jogo. Esses arquivos compilados permanecem no Git para permitir jogar sem instalar Node.js.

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

`tests/typescript-gameplay.test.cjs` exercita em conjunto os sete sistemas compilados, com substitutos para navegador, desenho e áudio. Cobre movimento, fôlego, dano, visão, audição, resgates, esconderijos, regiões e compatibilidade de salvamentos. Esses testes complementam a suíte existente; não substituem jogar no navegador.

`tests/types/gameplay.contracts.ts` contém exemplos que devem ser aceitos ou rejeitados pelo compilador. Entre os casos rejeitados estão resgatar um lobo como animal, usar texto no número de vidas, informar uma fase inexistente e restaurar um salvamento sem tratar a possibilidade de ausência. Esses exemplos são verificados por `npm run typecheck` e nunca carregados pelo jogo.

## Compatibilidade

A saída usa scripts clássicos, na mesma ordem de `index.html`, sem importações que exijam um servidor de módulos. Imagens, sons, créditos, controles e chaves do armazenamento local permanecem nos mesmos caminhos. A verificação de tipos cobre os sistemas migrados; os chamadores que continuam em JavaScript dependem dos testes de integração e dos contratos da ponte.
