# Modo Shuffle — primeiro protótipo jogável

Modo opcional em `shuffle/index.html`. Não substitui a aventura clássica: usa outro
motor, outra página e outra chave de salvamento (`penas-pro-ar.shuffle.v1`).

## Conteúdo desta versão

Duas arenas curtas de resgate (Pomar e Milharal) e um confronto final com Baltazar.
Cada arena de resgate tem três amigos; a porteira só libera a próxima etapa quando
todos são encontrados. Antes de cada uma das três etapas, escolha uma entre três
cartas sorteadas. As escolhas acumulam durante a tentativa. Há um embaralhamento
extra por etapa, sem custo e sem compras.

Seis habilidades: Pé de vento, Coração valente, Pena de aço, Asa ligeira, Isca de
milho e Có-có de alcance. Os efeitos alteram velocidade, vida, proteção, recarga da
esquiva, distração e distância de interação. O sorteio não repete cartas na mesma
oferta nem oferece habilidades no nível máximo. Uma semente própria permite
repetir o mesmo sorteio sem alterar os números aleatórios do jogo clássico.

Baltazar anuncia a direção do bote e não a muda durante a investida. Depois da
corrida, abre uma janela de contra-ataque: aproxime-se e interaja. Três acertos
encerram a tentativa com vitória. Colisão, imunidade curta após um golpe, esquiva,
pausa e derrota estão implementadas.

## Controles e salvamento

WASD/setas movem; Espaço esquiva; Q solta a isca quando desbloqueada; E interage;
Escape pausa. Em telas de toque, joystick e três botões ficam fora da área jogável.
O layout acompanha a janela, retrato e paisagem. Sair da aba pausa automaticamente.
O modo não implementa gamepad ainda.

O checkpoint é salvo no início de cada fase e durante a escolha de cartas. Reabrir
a página reinicia a fase em andamento, mantendo as habilidades e os corações do
checkpoint. Não salva a posição a cada frame. Ao terminar a tentativa, o checkpoint
é removido; nenhuma outra chave de armazenamento é apagada. Sem armazenamento
permitido pelo navegador, é possível jogar sem persistência.

## Arte e escopo

Reutiliza os atlas PixelLab já instalados. Não chama API, não usa créditos e não
cria sprites novos. O terreno e os objetos da arena são provisórios; esta versão
valida progressão e habilidades, não é a prometida revisão gráfica final do jogo.
Panto, curral, sombras, cercas e regras do modo clássico não são alterados.

Próximos marcos, ainda não implementados: arenas com arte final e layouts variados,
mais inimigos/chefes com identidade própria, áudio, gamepad e balanceamento por
playtest. Python não faz parte do runtime; pode continuar sendo usado em ferramentas
de produção, sem migrar o jogo do navegador.

## Verificação

`node --test tests/shuffle-run.test.cjs` testa sorteio, efeitos, colisões, progressão,
chefe, pausa e validação do checkpoint. `python tests/browser/shuffle_smoke.py`
verifica a distribuição em `dist` via servidor local na porta 8765, desktop, toque,
retrato/paisagem, entrada pelo menu, recarga e abertura `file://`.

O teste de chefe no navegador inicia de um checkpoint de fixture válido; não é
uma alegação de playthrough humano completo nem substitui testes de balanceamento.
