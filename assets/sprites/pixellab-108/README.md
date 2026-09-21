# Produção PixelLab — 20/09/2026

Sprites produzidos pela API oficial https://api.pixellab.ai/v2. Criação v3/Pixen e animação v3; nenhum outro gerador foi usado nesta produção.

29 de 29 personagens/aparências instalados. Esta tabela é atualizada a partir dos atlas que o jogo realmente carrega.

| Personagem | Direções por ação | Ações instaladas | Quadros |
| --- | --- | --- | --- |
| amanda | 8 | idle, walk | 72 |
| cat | 8 | idle, walk | 72 |
| chick | 8 | idle, walk | 72 |
| chicken | 8 | idle, walk, happy, scared, angry, sad, run | 420 |
| cow | 8 | idle, walk | 72 |
| crow | 8 | idle, walk | 72 |
| dog | 8 | idle, walk | 72 |
| donkey | 8 | idle, walk | 72 |
| duck | 8 | idle, walk | 72 |
| fox | 8 | idle, walk | 72 |
| goat | 8 | idle, walk | 72 |
| goose | 8 | idle, walk, alert | 168 |
| hen-blue | 8 | idle, walk, happy, scared, angry, sad, run | 392 |
| hen-silkie | 8 | idle, walk, happy, scared, angry, sad, run | 392 |
| horse | 8 | idle, walk | 72 |
| lamb | 8 | idle, walk | 72 |
| owl | 8 | idle, walk, alert, fly | 296 |
| pig | 8 | idle, walk | 72 |
| rabbit | 8 | idle, walk | 72 |
| scarecrow | 8 | idle, walk | 72 |
| sheep | 8 | idle, walk | 72 |
| skin-amora | 8 | idle, walk, happy, scared, angry, sad, run | 392 |
| skin-gumercindo | 8 | idle, walk | 72 |
| skin-pacoca | 8 | idle, walk | 76 |
| skin-pipoca | 8 | idle, walk, sad, run, happy, scared, angry | 392 |
| skin-zeca | 8 | idle, walk, happy, scared, angry, sad, run | 392 |
| thor | 8 | idle, walk, happy, scared, angry, sad, run | 392 |
| turkey | 8 | idle, walk | 72 |
| wolf | 8 | idle, walk, happy, scared, angry, sad, run | 392 |

Cada direção usa imagens próprias da PixelLab. O importador não espelha nem inventa quadros. Ajustes de rótulos direcionais estão registrados em `viewRotation` nos metadados e preservam os pixels originais.

Caminhadas são sincronizadas à distância percorrida. O importador mantém uma escala comum, margens transparentes e o movimento vertical dos quadros. Nas asas abertas, conserva o apoio da vista em repouso.

Os atlas locais em `runtime` são usados no jogo e no menu. A chave fica fora da distribuição; jogar não consulta a API. Créditos adicionais foram autorizados pelo usuário em 20/09/2026. O saldo atual é consultado pelo comando de produção, não por este documento.

A revisão inclui quadros, recortes, animação em diferentes velocidades e integração no navegador. Testes técnicos não substituem a avaliação artística. Candidatos ainda em produção ficam separados em `preview/pixellab`.
