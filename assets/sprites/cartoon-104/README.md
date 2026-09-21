# Elenco cartoon — edição 104

29 personagens e aparências, incluindo as três galinhas, cinco personagens desbloqueáveis, animais da fazenda, lobo, Lorenzo, Amanda, Thor, Panto, coruja, espantalho e corvos.

Direção: cartoon de aventura, olhos menores, proporções adultas, contorno escuro e cores contidas. Sem olhos brilhantes de mascote bebê. As folhas anteriores das edições 102 e 103 são estudos descartados.

Cada folha original contém cinco vistas desenhadas (lateral, diagonal frontal, frente, diagonal traseira e costas), com oito quadros. As três vistas para a esquerda são espelhadas na exportação, formando oito direções e 64 quadros por personagem. A coruja tem poses de percepção/chamado; os corvos, voo; o espantalho, movimento de tecido. Coelhos possuem poses de salto próprias. Panto tem uma folha adicional com oito fases de aviso, abrindo as asas antes de atacar; a corrida continua usando o ciclo das patas.

Arte criada e revisada com OpenAI ImageGen. Os prompts completos, caminhos dos originais e revisões estão em [manifest.json](manifest.json). Os originais RGBA foram preservados em `raw/`; `runtime/` contém as folhas usadas pelo jogo. O exportador separa as silhuetas, normaliza o enquadramento por direção sem distorcer x/y, mantém escala fixa durante cada ciclo e alinha o corpo para reduzir tremidas. Não mistura gerações dentro de um personagem.

O movimento real seleciona as oito vistas com uma margem de estabilidade angular; a distância percorrida determina a fase da passada. Repouso mantém a última orientação. Os balões continuam com ponta curta de gibi.

Revisão: [prévia animada](../../../preview/animal-walks.html), [elenco no tamanho do jogo](../../../preview/cartoon-104/cast.png), [gravação de movimento em três velocidades](../../../preview/cartoon-104/movement.webm). A análise visual continua sendo necessária: quantidade de quadros, integridade dos PNGs e testes aprovados não comprovam naturalidade da animação.

Reprodução: `node scripts/build-premium-art.cjs`, `node scripts/render-cartoon-review.cjs`, `node scripts/review-cartoon-browser.cjs`.

A coruja também possui [uma folha de voo](raw/owl-flight.png), gerada com a ferramenta ImageGen integrada a partir da identidade existente. O [prompt completo](owl-flight-prompt.json) está salvo, assim como a entrada no manifesto geral. São oito batidas de asa por direção, usadas no trajeto entre árvores após a sirene. O voo acelera na saída, desacelera no pouso e faz um arco de altura; o campo de visão fica desativado durante o trajeto. Árvores ocupadas e a árvore atual não entram no sorteio. O destino fica preservado ao salvar.
