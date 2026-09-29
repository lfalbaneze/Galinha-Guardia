# Expedição — primeira versão jogável

Acesse **Experimentar Expedição** no menu. O botão abre o mesmo jogo com
`?modo=expedicao`. Escolha a dificuldade e inicie uma nova aventura normalmente.
**Voltar ao modo clássico** troca de modo sem apagar o progresso de nenhum deles.

Esta primeira versão mantém a fazenda atual e divide a partida em três etapas:
**Abrindo a porteira** (0–4 resgates), **Correria na fazenda** (4–8) e
**Ninguém fica para trás** (8–12). Não são três mapas novos. O encerramento
continua sendo a comemoração já existente, sem um novo chefe nesta entrega.

Na largada e ao atingir quatro e oito resgates, são sorteadas três habilidades.
Escolha uma: ela permanece até o fim daquela partida. Não há repetição de uma
habilidade já escolhida. Cada escolha permite embaralhar a oferta uma única vez.
São, no máximo, três habilidades por expedição. A partida, seus inimigos e seu
relógio param durante a escolha. Desafios do Panto e cenas do Thor nunca são
interrompidos por uma oferta.

## Habilidades disponíveis

| Habilidade | Efeito |
| --- | --- |
| Penas ao vento | Movimento 10% mais rápido. |
| Fôlego de maratona | Duração da corrida 35% maior. |
| Respira e vai | Recuperação do fôlego 40% mais rápida. |
| Ninja de penas | Movimento de mansinho 25% mais rápido. Não concede invisibilidade. |
| Casca de respeito | Bloqueia um golpe do **lobo**, uma única vez. Não protege de raposas. |
| Milho de emergência | Recupera um coração, até três. Só entra no sorteio quando falta vida. |
| Torcida do curral | Cada amigo ou pintinho resgatado recupera 40% do fôlego, até o máximo. |
| Penas de aço | Acrescenta um segundo à proteção concedida depois de sofrer um golpe do lobo. |

Os modificadores combinam com a aparência equipada sem alterar os dados da
aparência nem as dificuldades globais. Recarregar não repete a cura, não recarrega
a casca e não devolve um embaralhamento já gasto.

## Controles e persistência

Clique ou toque em uma carta. Também funcionam as teclas 1, 2 e 3, Tab/Enter e
setas. No controle, direcional/analógico navega, A confirma e B/Menu pausa.
Esc ou **Pausar** voltam ao menu sem descartar as cartas sorteadas.

O clássico usa `galinha-guardia-save-v1`; a expedição usa
`galinha-guardia-expedition-v1`. O sorteio tem gerador próprio e não consome o
aleatório do mapa. Ofertas, escolhas, uso do escudo e embaralhamentos são salvos.
O guarda-roupa continua compartilhado, como antes.

A proteção do curral permanece. A lagoa **não** volta a ser uma safe zone.
Nenhuma cerca ou arte existente foi substituída.

## Próximas etapas de desenvolvimento

Criar encontros de chefes com avisos claros e padrões de esquiva; transformar as
etapas em mapas/ambientes próprios; adicionar habilidades ativas e mais efeitos
visuais. Python pode ser usado nas ferramentas de preparação de assets, mas não
é necessário substituir o jogo de navegador. Novos sprites devem respeitar a
direção de arte registrada em `AGENTS.md`.

## Validação

`node --test tests/expedition.test.cjs` cobre sorteio, escolhas duplicadas,
embaralhamento, persistência, modificadores reais do Player e proteção do clássico.
`npm run compile` gera o JavaScript a partir de `src/systems/expedition-system.ts`.
