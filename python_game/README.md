# Penas pro Ar — Python Shuffle

Versão **nativa em Python + pygame-ce**, para computador. Não é uma página web
embrulhada: geração de mapas, movimentação, colisões, chefes, habilidades,
salvamento e desenho da tela são executados em Python.

A aventura original e o Shuffle do navegador permanecem intactos. Esta versão
fica exclusivamente em `python_game/` e reutiliza a arte já existente do projeto.

## Jogar no Windows

Extraia o pacote completo e abra **`Jogar.bat`** na pasta principal, ou
**`python_game/Jogar.bat`** dentro do projeto. É preciso ter
**Python 3.10 ou superior** instalado. Na primeira execução, o lançador cria um
ambiente `.venv` e instala `pygame-ce==2.5.8` pela internet. Nas próximas, utiliza a
instalação local. Nenhum Node.js, navegador ou npm é necessário para jogar.

Alternativa no PowerShell, a partir da raiz do projeto:

```powershell
py -3 -m venv .venv-python
.\.venv-python\Scripts\python.exe -m pip install -r .\python_game\requirements.txt
.\.venv-python\Scripts\python.exe .\python_game\main.py
```

Em Linux/macOS, execute `sh python_game/jogar.sh` com Python 3.10+ disponível.
O pacote inclui a pasta `assets/` com os personagens. Não a apague. Para aplicar
no repositório original, copie `python_game/` para a raiz; os mesmos personagens
já existem em `assets/`. Nenhum arquivo do jogo web precisa ser substituído.
As fontes do projeto não são incluídas no pacote: a versão avulsa usa fontes
disponíveis no sistema; dentro do repositório, usa as fontes já existentes.

## Campanha

Dez fases procedurais, com oito etapas de resgate e duas de chefe:

1. Pomar do susto — 3 amigos.
2. Trilhas do milharal — 3 amigos.
3. Bosque dos cochichos — 4 amigos.
4. Campo dos espantalhos — 4 amigos.
5. **Panto, fiscal da porteira** — 3 contra-ataques; libera a próxima fase.
6. Colheita em disparada — 4 amigos.
7. Pedreira das penas — 5 amigos.
8. Pomar ao entardecer — 5 amigos.
9. Caminho do último feno — 5 amigos.
10. **Baltazar, o sem-almoço** — 5 contra-ataques; encerra a campanha.

A semente muda entrada, saída, caminhos, objetivos, inimigos e a distribuição de
árvores, moitas, feno e outros objetos. As rotas são reservadas antes de colocar
os obstáculos. Os inimigos usam um grid de navegação para contorná-los. Os chefes
anunciam a direção do ataque antes de investir; Baltazar faz dois botes a partir
de três pontos de resistência. Cada bote tem seu próprio aviso.

Há uma escolha entre três habilidades antes de cada fase e um embaralhamento
extra. As nove habilidades incluem velocidade, vida, escudo, recarga de esquiva,
isca, alcance, proteção após dano e recuperação de vida. Escolhas acumulam até o
fim da tentativa. Iniciar outro baralho zera a campanha; repetir a semente refaz
os mapas e, tomando as mesmas decisões, o mesmo sorteio.

Os animais resgatados **seguem a galinha** até a saída, em vez de desaparecer.
Amigos ainda livres fazem caminhadas curtas próximas ao ponto de resgate.

## Controles

- WASD / setas: mover.
- Espaço: esquiva, com recarga.
- Q: isca de milho, depois de escolher a carta.
- E: contra-atacar um chefe tonto e próximo.
- 1, 2, 3 ou mouse: escolher habilidade; R: embaralhar.
- Esc: pausar; F11: tela cheia; M: silenciar/reativar efeitos simples.

A janela é redimensionável; o jogo mantém as proporções e ajusta o clique dos
botões. Perder o foco pausa a partida. Não há controles touch nem gamepad nesta
entrega nativa. Não confundir com o suporte mobile da versão web original.

## Salvamento

Checkpoint no início de cada fase, depois da escolha, e durante o sorteio.
Reabrir reinicia a fase atual, com as mesmas habilidades e os corações daquele
checkpoint; não restaura a posição exata. Vitória ou derrota removem somente o
checkpoint Python.

No Windows: `%APPDATA%/PenasProAr/python-shuffle-v1.json`.
Em outros sistemas: `$XDG_DATA_HOME/PenasProAr/` ou `~/.local/share/PenasProAr/`.
A gravação usa arquivo temporário e substituição atômica. Dados inválidos são
ignorados. Não lê, converte ou apaga saves do navegador. Sem permissão de escrita,
o jogo funciona na sessão e mostra o aviso de falta de salvamento.

## Arte e limites desta entrega

Personagens usam os atlas PixelLab já aprovados, nas oito direções, com caminhada
ligada à distância percorrida. Cenário usa árvores, moitas e feno do atlas da
fazenda, não os blocos provisórios do protótipo web. Sombras de cenário são
projetadas antes dos objetos; não são acrescentadas sombras ovais aos personagens.

Terreno, interface e efeitos são renderizados em pygame. A troca de linguagem,
sozinha, não produz arte melhor: aqui a diferença visual vem da utilização dos
assets, texturas, profundidade e composição da interface. Os efeitos sonoros são
sinais simples; não há trilha nova, arte nova de personagens nem gastos de API.
O balanceamento da campanha ainda precisa de partidas humanas.

**Esta pasta não é um build HTML5 e não deve ser colocada dentro da `dist` web.**
Para publicar esta versão no itch.io, é necessária uma distribuição para desktop.
Ainda não há um `.exe` distribuído aqui, nem versão Python para navegador/celular.

## Desenvolvimento e testes

```sh
python -m unittest discover -s python_game/tests -v
python python_game/main.py --smoke --screenshots .cache/python-review
```

`world.py`: geração e navegação; `engine.py`: regras e checkpoint;
`art.py`: composição visual e carregamento de sprites; `main.py`: janela,
interface, eventos e loop a 60 passos por segundo.

Testes incluem 250 mapas, conectividade por verificação independente, campanhas
completas de estado, habilidades, colisões, chefes, checkpoint e eventos SDL.
Fixtures de estado não são relatos de playthrough humano. Capturas do smoke test
são renderizações reais do pygame.

`tools/export_assets.cjs` é uma ferramenta OPCIONAL de desenvolvimento para
reexportar metadados de arte se os atlas originais mudarem. Usa Node apenas nessa
etapa de produção; os JSON e PNG exportados já ficam no Git. O jogo Python não
executa esse script nem qualquer JavaScript.

Os resultados e limitações da verificação estão em `VALIDACAO.md`.
