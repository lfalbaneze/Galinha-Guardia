# Passadas — revisão 100

Correção motivada por ciclos que repetiam a pata dianteira próxima à frente em ambas as metades da caminhada.

- `dog-missing.png`: apoio recuado e retorno da pata do cachorro; complementa os dois primeiros quadros da folha anterior.
- `livestock.png`, `companions.png`, `heroes.png`: metade recuada dos ciclos laterais.
- `*-forward.png`: metade adiantada, editada a partir da mesma arte para conservar a identidade ao longo do ciclo.
- `rabbits.png`: pouso, compressão, impulso e recolhimento para o coelho e Pipoca.
- `runtime/`: recortes e redução exportados por `scripts/build-arcade-art.cjs`. A direção esquerda espelha a direita para manter a mesma anatomia e ordem das patas.

Arte gerada/editada com OpenAI ImageGen nesta revisão. Os PNGs de origem foram preservados; o exportador apenas recorta, dimensiona e empacota. As tentativas rejeitadas não são referenciadas pelo jogo.

O relógio da passada avança pela distância realmente percorrida, com comprimento de ciclo próprio de cada espécie. Colisões e pausas não fazem as patas correrem no lugar. Coelhos recebem elevação discreta durante a fase de voo. Animais resgatados ficam apoiados em suas posições, sem deslocamento artificial de repouso.

Inspeção: `node scripts/render-quadruped-walks.cjs` e `preview/animal-walks.html` (controle de velocidade, pausa e quadros). Testes automáticos verificam recortes, transparência, escala e sincronização; naturalidade e continuidade exigem inspeção visual.
