# Produção PixelLab

Sprites produzidos pela API oficial https://api.pixellab.ai/v2. Criação v3/Pixen, animação v3 e correções Pro pela mesma API; nenhum outro gerador foi usado nesta produção.

34 personagens/aparências instalados. Esta tabela é atualizada a partir dos atlas que o jogo realmente carrega.

| Personagem | Direções de caminhada | Ações instaladas | Quadros |
| --- | --- | --- | --- |
| amanda | 8/8 | idle, walk | 72 |
| boitata | 8/8 | idle, walk, run | 200 |
| cat | 8/8 | idle, walk | 72 |
| chick | 8/8 | idle, walk | 72 |
| chicken | 8/8 | idle, walk, happy, scared, angry, sad, run | 420 |
| cow | 8/8 | idle, walk | 72 |
| crow | 8/8 | idle, walk | 72 |
| cuca | 8/8 | idle, walk, run | 200 |
| curupira | 8/8 | idle, walk, run | 136 |
| dog | 8/8 | idle, walk | 72 |
| donkey | 8/8 | idle, walk | 72 |
| duck | 8/8 | idle, walk | 72 |
| fox | 8/8 | idle, walk | 72 |
| fuinha | 8/8 | idle, walk, run | 200 |
| goat | 8/8 | idle, walk | 72 |
| goose | 8/8 | idle, walk, alert | 168 |
| hen-blue | 8/8 | idle, walk, happy, scared, angry, sad, run | 392 |
| hen-silkie | 8/8 | idle, walk, happy, scared, angry, sad, run | 392 |
| horse | 8/8 | idle, walk | 72 |
| lamb | 8/8 | idle, walk | 72 |
| mula-sem-cabeca | 8/8 | idle, walk, run | 200 |
| owl | 8/8 | idle, walk, alert, fly | 296 |
| pig | 8/8 | idle, walk | 72 |
| rabbit | 8/8 | idle, walk | 72 |
| scarecrow | 8/8 | idle, walk | 72 |
| sheep | 8/8 | idle, walk | 72 |
| skin-amora | 8/8 | idle, walk, happy, scared, angry, sad, run | 392 |
| skin-gumercindo | 8/8 | idle, walk | 72 |
| skin-pacoca | 8/8 | idle, walk | 76 |
| skin-pipoca | 8/8 | idle, walk, sad, run, happy, scared, angry | 392 |
| skin-zeca | 8/8 | idle, walk, happy, scared, angry, sad, run | 392 |
| thor | 8/8 | idle, walk, happy, scared, angry, sad, run | 392 |
| turkey | 8/8 | idle, walk | 72 |
| wolf | 8/8 | idle, walk, happy, scared, angry, sad, run | 392 |

Cada direção usa imagens próprias da PixelLab. O importador não espelha nem inventa quadros. Ajustes de rótulos direcionais estão registrados em `viewRotation` nos metadados e preservam os pixels originais.

Caminhadas são sincronizadas à distância percorrida. O importador mantém uma escala comum, margens transparentes e o movimento vertical dos quadros. Nas asas abertas, conserva o apoio da vista em repouso.

Os atlas locais em `runtime` são usados no jogo e no menu. A chave fica fora da distribuição; jogar não consulta a API. Créditos adicionais foram autorizados pelo usuário em 20/09/2026 e 05/10/2026. O saldo atual é consultado pelo comando de produção, não por este documento.

A revisão inclui quadros, recortes, animação em diferentes velocidades e integração no navegador. Testes técnicos não substituem a avaliação artística. Candidatos ainda em produção ficam separados em `preview/pixellab`.
