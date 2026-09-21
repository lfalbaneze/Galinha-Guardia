# Apoio do cenário e nomes da turma

O cenário fixo usa somente sombras curtas no contorno que toca o chão. Árvores e moitas não projetam outra cópia da copa; placas apoiam os dois postes; cercas, plantas, feno e construções conservam a mesma posição e colisão. Sombras e fundações são compostas abaixo dos personagens. Repinturas de cobertura não criam outra sombra. Aves em voo e elevações intencionais continuam independentes.

Os nomes são apenas de apresentação. Espécies, identificadores dos saves, poderes, resgates e regras de stealth não mudam. Nomes próximos respeitam a visibilidade e não revelam pintinhos escondidos.

| Animal resgatável | Nome |
| --- | --- |
| Coelho | Jay Jay |
| Ovelha | Amélia |
| Porco | Tonico |
| Cabra | Josefina |
| Vaca | Mimosa |
| Pato | Quincas |
| Cachorro | Bento |
| Gato | Nino |
| Burro | Astolfo |
| Cordeiro | Floquinho |
| Cavalo | Ventania |
| Peru | Osvaldo |

Pintinhos, na ordem dos identificadores: Pingo, Fubá, Quindim, Cacau, Farofa, Dengo, Biscoito, Mel, Tutu e Jujuba. Os quatro últimos aparecem quando a dificuldade usa dez pintinhos.

O lobo se chama Baltazar; as corujas, Aurora e Olívia; os corvos, Tico, Teco e Cacá. Permanecem Panto, Thor, Lorenzo e Amanda. As aparências jogáveis mantêm seus nomes: o coelho Pipoca não foi renomeado para Jay Jay.

## Verificações reproduzíveis

`tests/scenery-contact-layer.test.cjs` usa as imagens reais e a camada de sombras ativa, verificando contato, oclusão, ausência de projeção duplicada e preservação da geometria. `tests/animal-names.test.cjs` verifica nomes, resgates, saves antigos e visibilidade. `tests/browser/names_scenery_smoke.py` verifica a interface e a versão empacotada. `scripts/review-grounded-props.cjs` produz uma folha de revisão pelos renderizadores do jogo.
