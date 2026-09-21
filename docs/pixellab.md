# Sprites PixelLab

**Escopo atual:** o usuário interrompeu o tratamento adicional dos outros personagens em 20/09/2026. As filas gerais `extras`, `extras-rest` e `extras-wild` foram paradas e marcadas como canceladas. Continuam apenas as correções de identidade da Midori (sedosa japonesa) e do Thor (golden retriever), além da remoção das sombras ovais. Os exemplos de produção abaixo são documentação, não autorização para retomar os outros personagens.

O usuário autorizou pixel art fofinho em 20/09/2026. A integração usa a API oficial PixelLab apenas durante a produção. O jogo recebe PNGs locais e funciona sem chave ou conexão com a PixelLab.

## Configuração

Crie uma chave em https://www.pixellab.ai/pixellab-api. Copie `.env.example` para `.env.local` e preencha `PIXELLAB_API_KEY`. Esse arquivo está ignorado pelo Git e fora dos arquivos publicados. Também é possível definir a variável de ambiente. Não coloque a chave em HTML, JavaScript público ou no chat.

```powershell
npm run sprites:pixellab -- status
npm run sprites:pixellab -- status --account
npm run sprites:pixellab -- plan --all
```

`plan` descreve as requisições sem usar créditos. `generate` usa os créditos da conta. `npm run build` nunca chama a API.

## Produção e revisão

```powershell
# Primeiro teste: um personagem, caminhada nas oito direções.
npm run sprites:pixellab -- generate --character=skin-pacoca --actions=walk

# Acrescentar corrida e expressões ao mesmo personagem.
npm run sprites:pixellab -- generate --character=skin-pacoca

# Produzir o restante após conferir o saldo: cada direção animada consome cota.
npm run sprites:pixellab -- generate --all --actions=walk
```

A criação padrão usa v3 (Pixen para desenhar o personagem, v3 para as oito vistas), com telas de 64, 96 ou 128 pixels conforme o tamanho no jogo. A fila usa oito quadros por ciclo e 12 para os avisos, sem inserir a pose estática como primeiro quadro. O comando individual mantém 12 como padrão; `--frames=8` escolhe oito. As oito direções são enviadas explicitamente. Todos os animais têm descrições próprias em `scripts/lib/pixellab-cast.cjs`; quadrúpedes usam templates quadrúpedes. A coruja inclui percepção/chamado e voo; Panto inclui o aviso com asas abertas.

O custo varia com a tela e a quantidade de quadros. Na [tabela oficial de animação v3](https://www.pixellab.ai/docs/tools/animate-with-text-new), uma direção com oito quadros custa uma geração em 64×64 e duas em 96×96 ou 128×128. Portanto, quantidade de direções não é igual ao consumo de cota. Trabalhos aceitos e ainda em processamento já podem estar descontados do saldo.

`--creation=pro --style-from=ID` seleciona explicitamente criação Pro com referência de estilo; `--mode=pro` seleciona animação Pro. Esses modelos consomem muito mais cota (a documentação indica 20–40 gerações por criação ou direção animada). Não são o padrão. A cota inicial de 40 gerações não cobre os 29 personagens completos, mesmo em v3. Não há compra automática nem troca de fornecedor quando o saldo acaba.

`--frames=8` usa oito quadros por ciclo (também aceita 10, 12, 14 ou 16). `--size=64` fixa o tamanho de geração. Preserve essas opções ao retomar o mesmo trabalho. Se a API aceitar apenas parte das direções por falta de vagas, o comando completa as restantes sem repetir as aceitas. `--remaining-frames=8` permite usar oito quadros somente para as direções ainda não aceitas; as sequências já prontas são preservadas.

Abra `preview/pixellab/index.html`: escolha personagem, ação, tamanho real, ampliação e velocidade; pause e avance quadro a quadro. Verifique anatomia, orelhas, expressão, escala, câmera, apoio das patas e fechamento do ciclo. Testes e ausência de cortes não comprovam a qualidade artística. Revise também no jogo e no menu.

```powershell
# Instala somente os candidatos já inspecionados, com nomes de arquivo por hash.
npm run sprites:pixellab -- install --character=skin-pacoca
npm run build
```

`install --all` instala o elenco completo já gerado. A instalação é separada da geração para não substituir automaticamente o elenco por uma tentativa com anatomia errada. Até a primeira instalação, o jogo mantém as imagens existentes.

## Retomada e arquivos

Execute o mesmo comando de geração para retomar. O registro de trabalhos em `.cache/pixellab/jobs` evita reenviar trabalhos já aceitos/concluídos. Se uma conexão cair durante um envio pago, o registro fica marcado como `submitting`: confira a conta antes de decidir reenviar. Falhas confirmadas e requisições ambíguas não são repetidas automaticamente.

- `.cache/pixellab/frames`: PNGs originais e organização das sequências; sem chave.
- `preview/pixellab`: candidatos e revisão animada.
- `assets/sprites/pixellab-108/runtime`: atlas instalados, incluídos no jogo.
- `assets/sprites/pixellab-108/meta`: origem, geometria, verificações e avisos; excluídos de `dist`.
- `systems/pixellab-art-data.js`: mapa gerado dos sprites instalados.

O importador exige oito direções, pelo menos oito quadros por animação, transparência nas bordas e quatro quadros distintos no mínimo. Não fabrica diagonais por espelhamento. Usa um recorte comum para todo o personagem e posicionamento fixo, conservando os movimentos verticais originais. Reduz uma única vez com vizinho mais próximo para o tamanho do jogo; não mistura cores nem quantiza a paleta novamente.

Se o desenho original tocar a borda, a importação para para revisão. Duas vistas estáticas da nova Midori têm apenas um pixel preto da ponta fechada dos dedos na borda; foram conferidas ampliadas e registradas por SHA-256 em `scripts/lib/pixellab-border-reviews.json`. Os registros de três imagens anteriores permanecem como histórico. O atlas acrescenta a margem transparente sem cortar ou redesenhar esses pixels. Essa exceção vale somente para os arquivos exatos revisados. Quadros diferentes continuam sujeitos ao bloqueio de borda.

`scripts/lib/pixellab-clip-selections.json` registra substituições pontuais de sequências rejeitadas na revisão visual. O registro é ligado ao identificador imutável do personagem na PixelLab e à direção específica. Assim, corrigir uma virada indevida da cabeça não exige pagar ou substituir as outras sete direções.

Contrato consultado: https://api.pixellab.ai/v2/openapi.json e https://api.pixellab.ai/v2/docs. Autenticação Bearer apenas no domínio da API; downloads públicos de PNG não recebem a chave. O usuário acrescentou cota em 20/09/2026 e autorizou concluir o elenco pela PixelLab. Consulte `status --account` para saldo atual e personagens efetivamente instalados. Testes locais cobrem falhas de rede, retomada, resposta parcial, importação de grupos separados e apoio estável durante a abertura das asas.

Para retomar a produção em lotes, use `node scripts/pixellab-batch.cjs --phase=base --workers=6` e depois `--phase=extras`. Os lotes deixam candidatos para revisão; não os instalam automaticamente. `node scripts/render-pixellab-review.cjs ID` cria folhas de conferência a partir dos quadros originais. Após a instalação, `node scripts/sync-pixellab-dist.cjs` atualiza os sprites da cópia local de distribuição sem chamar a API.
