# A turma de resgate

**Atualização:** as folhas atuais da turma são as versões `cute-*-v2.png`, documentadas em [CUTE-ART-NOTES.md](CUTE-ART-NOTES.md). Esta página registra a versão anterior preservada no acervo.

As novas folhas foram criadas com a ferramenta integrada `image_gen.imagegen` (skill imagegen), sem o modo CLI. A galinha original serviu de referência de pixel art; a nova ovelha fixou o estilo das demais folhas.

## Arquivos finais

Todos os PNGs têm fundo transparente e são preservados integralmente em `assets/sprites/sources/`:

| Personagem | Arquivo |
| --- | --- |
| Ovelha | [rescue-sheep.png](sources/rescue-sheep.png) |
| Porquinho | [rescue-pig.png](sources/rescue-pig.png) |
| Cabra | [rescue-goat.png](sources/rescue-goat.png) |
| Vaquinha | [rescue-cow.png](sources/rescue-cow.png) |
| Pato | [rescue-duck.png](sources/rescue-duck.png) |
| Coelho | [rescue-rabbit.png](sources/rescue-rabbit.png) |
| Cachorrinho | [rescue-dog.png](sources/rescue-dog.png) |
| Gatinho | [rescue-cat.png](sources/rescue-cat.png) |
| Burrinho | [rescue-donkey.png](sources/rescue-donkey.png) |
| Cordeirinho | [rescue-lamb.png](sources/rescue-lamb.png) |
| Pintinho | [rescue-chick.png](sources/rescue-chick.png) |
| Cavalo e peru | [farm-residents.png](sources/farm-residents.png) — três poses laterais por espécie |

Os prompts completos, referências e caminhos de saída estão em [rescue-prompts.json](rescue-prompts.json).

## Direção de arte e integração

Silhuetas compactas, contorno marrom, cores quentes, olhos legíveis e anatomia própria de cada espécie. O cordeirinho tem rosto claro e laço azul, distinguindo-se da ovelha adulta de rosto escuro. O cachorro tricolor também se distingue do Thor, que continua sendo um golden retriever.

Cada folha `rescue-*.png` possui doze imagens: frente, direita, costas e esquerda; em cada direção há uma pose parada e dois passos alternados. O ciclo é parada, passo A, parada, passo B. O gerador detecta os espaços transparentes reais, preservando orelhas e caudas que passam das divisões matemáticas da folha. Cada quadro tem seu próprio centro e base, com escala única por espécie. Cavalo e peru reutilizam a [folha documentada aqui](FARM-RESIDENTS-ART-NOTES.md), com três poses laterais e espelhamento à esquerda.

`scripts/build-sprite-data.cjs` publica as coordenadas em `systems/sprite-data.js`; `CharacterArt` utiliza as mesmas imagens na partida, refúgio, HUD, baú e final. Os pintinhos têm amarelo próprio, sem filtro de cor. IDs, colisões, IA, resgates e desbloqueios permanecem os mesmos.

Para regenerar os metadados e conferir a integração:

```sh
npm run sprites:build
node scripts/render-rescue-art.cjs
```

Prévias: [turma em quatro direções](../../preview/rescue-animals.png) e [refúgio no renderizador do jogo](../../preview/rescue-in-game.png).

Os sprites anteriores e seus créditos/licenças permanecem no projeto como arquivo histórico; não são sobrepostos pelos novos PNGs.
