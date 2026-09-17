# 🐔 Penas pro Ar!

### Confusão no Sítio do Fuzuê

O lobo está à solta, os bichos se espalharam pela fazenda e sobrou para uma galinha colocar ordem na bagunça.

**Penas pro Ar!** é uma aventura 2D de exploração e furtividade para jogar direto no navegador. Encontre os **dez amigos**, use o feno e a vegetação para se esconder e escolha a hora certa de correr. A cada resgate, o lobo fica mais atento — salvar a turma vai exigir mais do que sair correndo pelo sítio.

Pelo caminho, piados revelam **seis pintinhos escondidos**. Encontrá-los é opcional, mas rende pontos e ajuda a desbloquear outros personagens. Quando os dez amigos estão seguros, chega a vez de a turma acertar as contas com o lobo, numa confusão de desenho animado.

## Pelo sítio

- **Uma fazenda diferente a cada aventura.** Explore regiões conectadas, com caminhos, construções e esconderijos que mudam a cada nova partida.
- **Um lobo que não larga do seu pé.** Ele patrulha, investiga barulhos e procura no último lugar em que viu você. Quebrar a linha de visão é tão importante quanto correr.
- **Resgates que dão trabalho.** Os bichos também se assustam e fogem da galinha. Chegue de mansinho ou aproveite quando eles pararem para descansar.
- **Segredos e aparências.** Procure os pintinhos para liberar Pato, Coelho, Gato e Cachorro, cada um com seu tema musical.
- **Três dificuldades.** Escolha entre Dia tranquilo, Fuzuê no sítio e Lobo à solta. O progresso e as preferências ficam salvos no navegador quando o armazenamento local está disponível.

## Como jogar

Baixe ou clone o repositório e abra `index.html` no navegador. Não é necessário instalar dependências para jogar; os scripts compilados acompanham o projeto.

Para servir os arquivos em um endereço local fixo, execute na pasta do projeto, com Python instalado:

```sh
python -m http.server 8765 --bind 127.0.0.1
```

Depois, abra **http://127.0.0.1:8765**.

### Controles

| Tecla | Ação |
| --- | --- |
| WASD ou setas | Mover a galinha |
| Shift | Correr enquanto houver fôlego |
| C | Andar de mansinho; dentro de um esconderijo com piados, segurar para procurar um pintinho |
| E | Entrar ou sair do esconderijo indicado |
| Pressionar uma direção novamente | Sair do esconderijo |
| Esc ou P | Pausar e abrir o menu |
| H | Exibir colisões para depuração |

Encoste nos amigos para resgatá-los. Eles vão para o refúgio e ficam a salvo pelo restante da aventura. Encontrar os dez conclui a missão, mesmo sem todos os pintinhos.

**Cuidado com os esconderijos:** se o lobo vir você entrar, ele pode ir até lá. Saia, despiste-o e procure outra cobertura sem ser vista. A corrida tem fôlego limitado; caminhar recupera a reserva, e se esconder recupera mais rápido.

## Pintinhos e aparências

Ao ouvir um piado, procure o esconderijo próximo. Entre com **E** e segure **C** para investigar. Cada pintinho encontrado rende 100 pontos e vai direto para o ninho.

| Resgates na mesma aventura | Aparência desbloqueada | Tema musical |
| --- | --- | --- |
| 3 amigos + 2 pintinhos | Pato | Passos no Terreiro |
| 6 amigos + 4 pintinhos | Coelho | Pulos ao Luar |
| 9 amigos + 6 pintinhos | Gato | Passo Furtivo |
| 10 amigos + 6 pintinhos | Cachorro | Companheiro da Roça |

As aparências são escolhidas no **Baú dos bichos** e não alteram velocidade, vidas ou colisões. Os desbloqueios permanecem entre aventuras. Para conquistar todos na mesma partida, encontre os pintinhos **antes de resgatar o último amigo**.

## Som e progresso

O jogo tem músicas para a fazenda e para as aparências, gravações dos animais e efeitos para os resgates, esconderijos e a cena final. Música e efeitos têm controles de volume separados; também é possível desligar todo o som.

O salvamento automático permite continuar a mesma fazenda, com os resgates, a pontuação e a dificuldade escolhida. **Reiniciar** ou **Gerar nova fazenda** substitui a aventura atual, mas mantém as aparências desbloqueadas.

O progresso pertence ao navegador e ao endereço usado para jogar. Abrir por `file://` e acessar pelo servidor local não compartilha o mesmo salvamento. Se o armazenamento estiver bloqueado, o jogo avisa que o progresso vale apenas para a sessão.

## Desenvolvimento

O núcleo de gameplay usa **TypeScript**, com **HTML, CSS e Canvas 2D**, sem framework ou serviço externo necessário para jogar. Os sistemas visuais, o áudio, o gerador de mundo e o loop principal continuam em JavaScript durante a migração gradual. Imagens e sons acompanham o repositório.

Os sete sistemas de jogador, lobo, detecção, esconderijos, resgates, salvamento e regiões são editados em `src/systems/`. O compilador atualiza suas versões em `systems/`, nos mesmos caminhos usados pelo navegador. Consulte o [guia de TypeScript](docs/typescript.md) para detalhes sobre os tipos, a compilação e os testes.

### Estrutura

| Caminho | Conteúdo |
| --- | --- |
| `index.html` | Página do jogo e carregamento dos scripts |
| `src/systems/` | Fontes TypeScript dos sete sistemas de gameplay |
| `src/types/` | Tipos compartilhados e contratos com o JavaScript existente |
| `game.js` | Loop principal, integração dos sistemas e colisões |
| `systems/` | JavaScript do navegador: sistemas compilados e módulos ainda não migrados |
| `assets/` | Sprites, cenários, músicas, efeitos e créditos |
| `tests/` | Testes de comportamento e contratos de tipos |
| `scripts/` | Compilação, build e ferramentas de preparação de recursos e prévias |
| `preview/` | Prévias visuais e de áudio |
| `.baseline/` | Cópia dos arquivos da versão inicial |

### Preparar o ambiente

Com Node.js 20 ou superior e npm instalados:

```sh
npm ci
npm run typecheck
npm test
npm run build
```

`npm test` compila antes de executar a suíte. O build também compila e prepara os arquivos públicos em `dist/`. Para executar checagem de tipos, testes e build em sequência, use `npm run verify`.

Durante a edição, `npm run dev` recompila os arquivos TypeScript a cada alteração; não inicia servidor nem recarrega a página. **Edite os sistemas migrados em `src/systems/` e inclua seus JavaScript compilados no commit.** `npm run check:generated` verifica se essas saídas estão atualizadas.

Os testes cobrem resgates, progressão, desbloqueios, salvamento, detecção, esconderijos, navegação, interface e áudio. As verificações automatizadas complementam os testes de jogabilidade no navegador.

<details>
<summary>Ferramentas de sprites, áudio e prévias</summary>

```sh
# Atualizar coordenadas dos sprites e imagens das aparências
npm run sprites:build

# Gerar pranchas para revisão dos personagens
npm run sprites:review

# Renderizar prévias do jogo
npm run preview:render

# Gerar músicas e efeitos sintetizados
npm run audio:generate

# Montar a prévia de áudio
npm run audio:preview
```

A dependência `@napi-rs/canvas` é usada pelas ferramentas de renderização, não pelo jogo no navegador.

As gravações dos animais são preparadas separadamente por `scripts/prepare-animal-audio.py`, com as dependências Python `numpy`, `soundfile` e `py7zr`. Elas não são necessárias para jogar.

Para conferir os recursos, abra a [prévia dos sprites](preview/sprites.html) ou a [página de escuta](preview/audio.html) pelo servidor local.

</details>

## Créditos

As fontes, os autores e as licenças dos recursos estão nos [créditos dos sprites](assets/sprites/CREDITS.html) e nos [créditos de áudio](assets/audio/CREDITS.html), também acessíveis pelo jogo.

Os registros de produção das artes estão nas notas do [menu](assets/menu/ART-NOTES.md), do [cenário](assets/farm/ART-NOTES.md) e do [lobo](assets/sprites/WOLF-ART-NOTES.md).
