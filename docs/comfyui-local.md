# Geração local com ComfyUI

O ComfyUI está instalado em `.cache/comfyui/ComfyUI`, com um Python separado em
`.cache/comfyui/venv`. Essas pastas ficam fora do Git e do jogo publicado.

Para iniciar, na raiz do projeto:

```powershell
python scripts/start-comfyui.py
```

Abra <http://127.0.0.1:8188>. O serviço escuta somente no computador local. O
iniciador utiliza o modo offline e carrega apenas a extensão IPAdapter Plus.
Não é necessário alterar a política de execução de scripts do Windows.

## Aparências de vitória

As novas aparências usam edição por referência com FLUX.2 Klein 4B. O sprite
original define espécie, direção e apoio das patas; Zeca, Pipoca, Stella e Paçoca
definem o acabamento. Os figurinos são desenhados junto com o personagem.

```powershell
python scripts/setup-comfyui-klein.py
python scripts/generate-klein-rewards.py --samples --views goat
python scripts/generate-klein-rewards.py
node scripts/render-reward-review.cjs
```

O instalador verifica os arquivos oficiais por SHA-256. Modelos, filas e imagens
intermediárias permanecem em `.cache`. O iniciador usa VAE em FP32 para preservar
as cores e permite que o ComfyUI gerencie a memória da GPU sem overclock.
Conferir `preview/reward-skins` antes de reconstruir o registro e o pacote do jogo.

## Referência e testes

Os primeiros testes ficam em `preview/comfyui/curupira/`. `reference.png` foi
extraído do atlas efetivamente usado pelo jogo, sem redesenho. A entrada
`reference-input.png` amplia essa referência com nearest-neighbor, sobre branco.

Cada geração tem um PNG, um arquivo `.api.json` com o pedido executado e um
`.workflow.json` para abrir no ComfyUI. O PNG também contém o workflow. A entrada
está instalada em `ComfyUI/input/curupira-reference.png`. O relatório registra os
identificadores das gerações locais.

Esses primeiros testes eram candidatos isolados, sem ciclo animado. Alterar demais a força da
geração pode mudar a identidade do personagem. Preservar as oito direções exige
avaliar as vistas e os quadros em conjunto, inclusive em movimento.

Na revisão inicial de 31/10/2026, os sete testes ainda não haviam sido aprovados:
os primeiros mudaram o rosto e partes da roupa; o IPAdapter recuperou melhor
o tema e as cores, mas introduziu olhos, volume e sombreamento diferentes do
original. A nova pose de invocação também não foi obtida. A comparação está em
`preview/comfyui/curupira/comparison.png`. Depois, o usuário autorizou a
substituição; a versão 55 foi escolhida como referência de estilo para os atlas
completos descritos abaixo. A nova pose de invocação não faz parte da integração.

## Modelos instalados

- [ComfyUI oficial](https://github.com/Comfy-Org/ComfyUI), commit
  `0dbfd493b4cc604db743c699f0f7ce01348e54a4`.
- [DreamShaper 8, do autor Lykon](https://huggingface.co/Lykon/DreamShaper):
  `DreamShaper_8_pruned.safetensors`. SHA-256:
  `879db523c30d3b9017143d56705015e15a2cb5628762c11d086fed9538abd7fd`.
- [IPAdapter Plus](https://github.com/cubiq/ComfyUI_IPAdapter_plus) com
  [pesos publicados pelo projeto](https://huggingface.co/h94/IP-Adapter):
  `ip-adapter-plus_sd15.safetensors` e CLIP ViT-H.

Os downloads foram conferidos contra os hashes publicados. Os modelos são
arquivos locais; as gerações não utilizam uma API paga. As licenças acompanham
os respectivos projetos e páginas de origem.

Os logs e o PID do servidor ficam em `.cache/comfyui/`. Para liberar a GPU sem
fechar a interface, o endpoint local `/free` aceita
`{"unload_models": true, "free_memory": true}`. O modelo será carregado de novo
quando outra geração for executada.

## Arte integrada em 31/10/2026

O lobo comum (392 quadros) e o Curupira (136) recuperam os desenhos PixelLab
originais, após a repintura deformar rostos e contornos. A variante escura
exclusiva do Hardcore mantém sua repintura especial (392 quadros). Os dois modos
usam os desenhos nítidos recuperados, incluindo os retratos de resultado.
As oito direções, a transparência e o apoio dos pés foram preservados. O carregador comum inclui os três atlas; o modo
Shuffle também usa o registro de arte atualizado. Nenhum identificador de
personagem ou formato do jogo salvo foi alterado.

`scripts/generate-comfyui-cast.py` gera lotes de quatro poses com o mesmo ruído
por quadro para reduzir variações. Os resultados intermediários e recibos ficam
em `.cache/secret-boss-release/`; os atlas finais ficam em
`assets/sprites/comfyui-110/`. `scripts/build-comfyui-art.cjs` valida os atlas e
recria o carregador público sem precisar do ComfyUI ligado.

Os quatro finais usam composições próprias, montadas com os elementos da fazenda
por `scripts/render-ending-stages.cjs` e repintadas pelo
`scripts/generate-comfyui-endings.py`. O manifesto em
`assets/cinematics/endings-110/manifest.json` registra os workflows reais.
`scripts/render-comfyui-review.cjs` renderiza os finais no tamanho de desktop e
em retrato. A revisão ao vivo no navegador ficou pendente: o controle de
computador foi interrompido porque não conseguiu confirmar a URL atual.

A URL do jogo continua `http://127.0.0.1:5500/index.html` no Live Server.
O endereço `127.0.0.1:8188` atende somente à geração local.

Para reproduzir a geração com os modelos instalados e o servidor ligado:

```powershell
.\.cache\comfyui\venv\Scripts\python.exe scripts/generate-comfyui-cast.py
node scripts/render-ending-stages.cjs
.\.cache\comfyui\venv\Scripts\python.exe scripts/generate-comfyui-endings.py
node scripts/build-comfyui-art.cjs
```

Os modelos da base são lidos do carregador PixelLab instalado; a referência
aprovada do Curupira fica em `assets/sprites/comfyui-110/meta/`. As prévias
`preview/comfyui/release/walk-animated.png` e `run-animated.png` mostram os
quadros reais no tamanho do jogo, em duas velocidades.

## Revoada do Caos

O pedido seguinte ampliou a revisão para todos os sprites deste modo. Os 25
modelos usados em campo têm registros em `assets/sprites/chaos-112/`.
24 usam os atlas PixelLab originais recuperados, incluindo os quatro chefes
folclóricos e demais inimigos. As repinturas por quadro borravam faces e chamas
e apagavam as cores da Cuca. A Midori mantém a correção local sem a crista e a
barbela vermelhas incorretas da versão anterior. As passadas e oito direções
permanecem completas; a campanha e a Revoada compartilham os desenhos nativos.

Os 65 sprites de poderes, projéteis, itens e objetos ficam em
`assets/shuffle/chaos-111/`. Os 38 retratos usam as identidades destes atlas;
36 são recortes exatos dos atlas, e os dois da Midori mantêm sua correção local. A geração usa
somente o ComfyUI local, sem cobrança de API. Os parâmetros e prompts do elenco
ficam nos metadados individuais; os estáticos usam descrições no script.

```powershell
node scripts/prepare-chaos-sprites.cjs
.\.cache\comfyui\venv\Scripts\python.exe scripts/generate-comfyui-chaos-cast.py
.\.cache\comfyui\venv\Scripts\python.exe scripts/generate-comfyui-chaos.py --statics
node scripts/build-chaos-art.cjs
node scripts/prepare-chaos-sprites.cjs --mode
.\.cache\comfyui\venv\Scripts\python.exe scripts/generate-comfyui-chaos.py
node scripts/build-chaos-art.cjs
node scripts/render-chaos-review.cjs
```

O build valida os PNGs e os registros sem depender do servidor de geração.
As filas e intermediários permanecem em `.cache/chaos-sprite-review` e
`.cache/secret-boss-release`; nenhum modelo de IA entra no jogo publicado.
A revisão usa o renderizador real do modo em Canvas. A validação visual dentro
da partida continua pendente porque o controle do Chrome foi bloqueado por
não conseguir confirmar a URL atual com segurança.
