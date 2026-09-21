# Direção de arte e animação

Tela inicial: sortear cinco convidados diferentes, suas posições nos caminhos e orientações entre oito direções a cada carregamento da página. Manter a aparência equipada como protagonista. O elenco sorteado permanece estável ao abrir/fechar menus e nunca altera a partida salva.

Coruja (20/09/2026): após a sirene, escolher outra árvore, voar e retomar a vigilância após o pouso. Não bloquear o ciclo quando faltarem árvores próximas dos caminhos ou sem bônus; priorizar essas árvores, mas permitir alternativas seguras. A espera por um destino não pode desativar a detecção indefinidamente.

Painel de preparação da missão (20/09/2026): o usuário pediu uma IMAGEM NOVA e uma COMPOSIÇÃO NOVA do grupo, depois uma ilustração DIFERENTE PARA CADA DIFICULDADE. Usar as quatro cenas PixelLab: Explorador no campo, Aventura no pomar, Contra o tempo em corrida e Última luz ao anoitecer. Preservar a composição inteira e manter a aparência equipada no retrato separado. Não reutilizar `farm-title.png` com sprites redistribuídos nem substituir cenas por filtros de cor.

Escopo mais recente (20/09/2026): o usuário cancelou o tratamento adicional dos OUTROS sprites. Interromper as filas gerais; manter somente as correções de identidade em andamento da Midori e do Thor e a remoção das sombras de bolinha. Não retomar os lotes gerais de expressões/corridas sem novo pedido.

Remover as sombras de bolinha/oval desenhadas sob os personagens, inclusive no menu e nos pássaros. Pedido explícito de 20/09/2026. As sombras projetadas pela iluminação do cenário são independentes.

Thor é um GOLDEN RETRIEVER. Preservar focinho alongado típico da raça, orelhas caídas douradas, pelagem dourada longa com franjas no peito/pernas/cauda, quatro patas, coleira azul e medalha. Não usar focinho achatado de pug, máscara preta, orelhas marrons escuras ou rabo enrolado.

Identidade reforçada pelo usuário em 20/09/2026: Midori (`hen-silkie` / `silkie`) é uma galinha sedosa japonesa, com topete arredondado volumoso, plumagem branca sedosa e patas plumadas. Não transformá-la em galinha comum de crista vermelha, pescoço liso e pés descobertos. Preservar a raça em todas as vistas e animações.

Atualização de 20/09/2026: o usuário autorizou usar a API PixelLab e aceitou pixel art, desde que os personagens sejam fofinhos, tenham identidade e mantenham anatomia e movimentos consistentes nas oito direções. Esta preferência substitui a exigência de acabamento cartoon liso; as demais exigências de animação continuam válidas.

Decisão mais recente em 20/09/2026: usar EXCLUSIVAMENTE a API PixelLab para gerar os novos sprites de todos os personagens. A chave foi configurada em .env.local, que deve permanecer ignorado pelo Git e fora do jogo publicado. Esta decisão substitui a autorização anterior para o gerador de imagens disponível. Não confundir integração da API com entrega efetiva: baixar, conferir e instalar os resultados reais. Não comprar créditos automaticamente nem trocar de fornecedor ao esgotar a cota.

Preferência explícita do usuário: sprites com movimentação fluida e acabamento profissional, com aparência de produção de alto investimento ("Arte CARA mesmo"). Esta é uma exigência de qualidade para o projeto, inclusive no menu.

Direção confirmada em 20/09/2026: TODOS os personagens e aparências devem ser mais cartoonizados e possuir animação nos OITO sentidos de movimento. Usar formas arredondadas, expressão e cores legíveis; não seguir o acabamento realista das tentativas intermediárias. Frente, costas, laterais e diagonais devem preservar a mesma anatomia, escala e câmera. As diagonais precisam ser selecionadas pelo movimento real no jogo, não apenas existir na folha de sprites.

- Priorizar anatomia consistente, silhueta legível, volume, cores e proporções estáveis entre os quadros e direções.
- Direção mais recente (20/09/2026): cartoons BONITINHOS inspirados em Fazenda do Orson / U.S. Acres, com formas arredondadas, olhos ovais expressivos, focinhos generosos, contorno preto limpo e cores chapadas. Esta preferência substitui a orientação anterior de olhos pequenos e proporções adultas. Preservar a identidade dos personagens, sem textura realista nem brilho plástico.
- Animar transferência de peso, apoio e retorno das patas, antecipação, impulso e recuperação próprios de cada espécie. Evitar mancar involuntariamente, deslizar, tremer ou mudar de forma entre quadros.
- Sincronizar as passadas com o deslocamento real. Trabalhar também transições entre repouso, caminhada, corrida, parada e mudança de direção.
- Usar quadros intermediários desenhados quando necessários à fluidez. Aumentar a velocidade, espelhar imagens ou adicionar oscilação ao corpo não substitui um ciclo bem animado.
- Avaliar animações em movimento, no tamanho real do jogo e em velocidades diferentes. Folhas estáticas e testes automáticos ajudam, mas não comprovam naturalidade nem acabamento profissional.
- Preservar a identidade visual dos personagens. Considerar correções técnicas como etapas; não declarar o padrão visual atingido apenas porque o build e os testes passaram.
- Nos diálogos, manter balões de gibi com pontinha curta integrada apontando para quem fala, sem linhas longas de ligação.
