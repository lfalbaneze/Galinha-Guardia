# Quadrúpedes — revisão 96

Revisão em 20/09/2026. A revisão anterior foi insuficiente: havia membros ausentes nos desenhos e pares de patas que se fundiam na redução. Foram substituídos os oito quadros laterais de 14 quadrúpedes e os perfis compartilhados por Lorenzo e Amanda. Thor foi incluído na inspeção; seus três desenhos por direção já mostram os dois pares de patas e foram mantidos.

## Arquivos e referências

- [Originais transparentes aprovados](arcade-96/): 15 folhas `*-sides.png`, duas linhas de quatro quadros (direita, esquerda).
- [Atlas usados pelo jogo](arcade-96/runtime/): 14 folhas com quatro direções, mais os oito perfis da raposa.
- [Prévia animada do elenco](../../preview/animal-walks.html): 17 opções, pausa, avanço de quadro, quatro direções e oito passos laterais separados.
- [Referências e prompts exatos](arcade-96/generation.json): registro de todas as 23 chamadas à ferramenta integrada **OpenAI ImageGen** (`image_gen.imagegen`), incluindo as revisões rejeitadas, originais gerados e destinos finais. Não houve uso de API externa ou CLI de geração.

Cada edição usa o animal existente como referência. As marcas assimétricas, como os flancos da vaca, da cabra e do cachorro, continuam próprias de cada lado. Os PNGs originais gerados são preservados sem redesenho por código. O exportador recorta pela transparência e reduz com o mesmo tratamento de paleta usado no jogo.

Frente e costas continuam vindas das folhas anteriores, na escala original. Uma comparação de pixels confirmou os **112 quadros** preservados. Os oito perfis novos de cada animal usam escala própria para evitar alterar o porte ao substituir a folha lateral. A raposa recebe quatro quadros laterais reais; frente e costas mantêm o ciclo original. O laço da Amanda acompanha o novo ponto de apoio na orelha.

## Inspeção visual

Foram vistos os originais e todos os quadros laterais exportados em 1× e 3×. As patas distantes têm posição e valor mais escuro para distinguir os dois pares. A tabela registra os quadros conferidos por direção; a contagem anatômica é uma inspeção visual, **não** uma garantia dos testes automáticos.

| Animal | Direita: quadros conferidos | Esquerda: quadros conferidos | Pixels exportados |
| --- | --- | --- | --- |
| Lobo | 1, 2, 3, 4 | 1, 2, 3, 4 | [Prancha](../../preview/quadrupeds/wolf.png) |
| Ovelha | 1, 2, 3, 4 | 1, 2, 3, 4 | [Prancha](../../preview/quadrupeds/sheep.png) |
| Porco | 1, 2, 3, 4 | 1, 2, 3, 4 | [Prancha](../../preview/quadrupeds/pig.png) |
| Cabra | 1, 2, 3, 4 | 1, 2, 3, 4 | [Prancha](../../preview/quadrupeds/goat.png) |
| Vaca | 1, 2, 3, 4 | 1, 2, 3, 4 | [Prancha](../../preview/quadrupeds/cow.png) |
| Coelho | 1, 2, 3, 4 | 1, 2, 3, 4 | [Prancha](../../preview/quadrupeds/rabbit.png) |
| Cachorro | 1, 2, 3, 4 | 1, 2, 3, 4 | [Prancha](../../preview/quadrupeds/dog.png) |
| Gato | 1, 2, 3, 4 | 1, 2, 3, 4 | [Prancha](../../preview/quadrupeds/cat.png) |
| Burro | 1, 2, 3, 4 | 1, 2, 3, 4 | [Prancha](../../preview/quadrupeds/donkey.png) |
| Cordeiro | 1, 2, 3, 4 | 1, 2, 3, 4 | [Prancha](../../preview/quadrupeds/lamb.png) |
| Cavalo | 1, 2, 3, 4 | 1, 2, 3, 4 | [Prancha](../../preview/quadrupeds/horse.png) |
| Pipoca | 1, 2, 3, 4 | 1, 2, 3, 4 | [Prancha](../../preview/quadrupeds/skin-pipoca.png) |
| Amora | 1, 2, 3, 4 | 1, 2, 3, 4 | [Prancha](../../preview/quadrupeds/skin-amora.png) |
| Paçoca | 1, 2, 3, 4 | 1, 2, 3, 4 | [Prancha](../../preview/quadrupeds/skin-pacoca.png) |
| Lorenzo e Amanda | 1, 2, 3, 4 | 1, 2, 3, 4 | [Prancha](../../preview/quadrupeds/fox.png) |
| Thor | 1, 2, 3, 4 do ciclo original | 1, 2, 3, 4 do ciclo original | [Prancha](../../preview/quadrupeds/thor.png) |

O Thor usa a sequência original 0–1–0–2. [Amanda também foi conferida com o laço](../../preview/quadrupeds/amanda.png). Frente e costas foram preservadas: nessa perspectiva, membros distantes podem ficar naturalmente atrás dos próximos.

A primeira geração de ovelha e cordeiro ainda omitia um membro; foi rejeitada. Burro, porco, coelho, cabra e cavalo precisaram de separação adicional das patas. A vaca ainda escondia um membro em um quadro; a revisão seguinte produziu um quinto membro e também foi rejeitada. Apenas a versão corrigida entrou no atlas final. O registro de prompts mantém essa sequência para não confundir geração com aprovação.

## Verificação

- 43 testes passaram: carregamento, recortes, transparência, escala, ciclos, raposas, acessório da Amanda e renderização/sombras.
- TypeScript e os 24 JavaScript compilados conferidos.
- Build completo sem quadros cortados; as 22 folhas principais continuam abaixo de 1 MB no total.
- Partida em Chromium no desktop sem erros; prévia carregou, animou, pausou e avançou um quadro em todas as 17 opções.
- As URLs dos atlas e versões dos scripts foram atualizadas para não reutilizar a arte anterior em cache.

Para repetir a inspeção: `node scripts/render-quadruped-walks.cjs`, `node scripts/check-quadruped-fronts.cjs`, `node --test tests/sprite-loading.test.cjs`. Abra a prévia a partir da pasta completa do projeto. A pasta `preview` é material de revisão local e não faz parte da distribuição pública.
