# Elenco cartoon 106

Direção de 20/09/2026: cartoons bonitinhos, arredondados, com contorno de gibi e expressões legíveis. A imagem de U.S. Acres / Fazenda do Orson enviada pelo usuário orientou a linguagem gráfica; os nomes, cores e acessórios do elenco do jogo foram preservados.

Arte criada e revisada com a ferramenta integrada OpenAI ImageGen. Fontes em `raw/`, folhas usadas pelo jogo em `runtime/*.webp` e matrizes PNG de exportação em `runtime/*.png`. O WebP usa qualidade 95, mantendo transparência sem perdas e resolução dupla; as matrizes PNG ficam fora do pacote público. O arquivo `generation-spec.json` registra a especificação do elenco, e `meta/*.json` e `manifest.json` registram os prompts finais e caminhos dos originais gerados.

- 29 personagens e aparências, além das folhas de alarme do Panto e voo da coruja.
- 12 quadros por direção. Cinco vistas desenhadas (frente, costas, lateral direita e duas diagonais direitas), com as três vistas esquerdas espelhadas, formando os oito sentidos selecionados pelo deslocamento real.
- Exportação com pivô estável, escala fixa durante cada ciclo, margem transparente e resolução dupla para os contornos suaves. A validação rejeita silhuetas que encostem na borda da fonte.
- Cadência vinculada à distância percorrida, considerando a velocidade; desenho em posições fracionárias. O menu e as cenas finais compartilham as mesmas folhas.
- Na apresentação da missão, o arbusto fica atrás do lobo e sua posição foi ajustada para mostrar o corpo inteiro.

Revisão: [painel do elenco](../../../preview/cartoon-106/cast.png), [revisão interativa em movimento](../../../preview/animal-walks.html), [gravação das passadas](../../../preview/cartoon-106/movement.webm). A qualidade de anatomia e movimento exige inspeção visual, além dos testes de recorte e carregamento.

Para reconstruir as folhas: `node scripts/build-cartoon-cast.cjs`. O build de produção exige o elenco completo; `--preview` permite inspecionar fontes parciais sem substituir os dados do jogo.
