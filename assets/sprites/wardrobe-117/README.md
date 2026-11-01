# Aparências de vitória

Serrano, Valente, Luar e Trovão são aparências jogáveis com recompensas próprias
do Difícil e do Hardcore. A origem das poses é o elenco PixelLab já instalado.
As edições são produzidas no ComfyUI local com FLUX.2 Klein 4B, usando as skins
Zeca, Pipoca, Stella e Paçoca como referências de estilo.

O fluxo de edição modifica o personagem inteiro. As roupas não são acessórios
colados pelo renderizador. Cada direção usa sua pose original e uma descrição
explícita da orientação; os quadros de caminhada preservam os apoios da referência.
O bode usa chifres maiores, com o chapéu baixo entre suas bases.

`scripts/generate-klein-rewards.py --samples --views goat` exporta quatro vistas
de conferência. Sem `--samples`, o script produz os atlas e seus registros em
`meta`. `scripts/build-comfyui-art.cjs` valida os arquivos e calcula os apoios
das patas para o jogo. As prévias e os intermediários não são arte publicada.

Os modelos gratuitos ficam em `.cache/comfyui`, fora do Git e do build.
`scripts/setup-comfyui-klein.py` baixa os arquivos oficiais e verifica SHA-256.
Referências: [workflow oficial](https://docs.comfy.org/tutorials/flux/flux-2-klein)
e [modelo e licença Apache 2.0](https://huggingface.co/black-forest-labs/FLUX.2-klein-4b-fp8).
