# Repinturas locais — edição 110

Curupira (136 quadros) e lobo comum (392) recuperam os desenhos PixelLab
originais: a repintura por quadro deformava rostos e contornos. A recuperação
é usada na campanha e na Revoada do Caos, incluindo seus retratos. Não há nova
geração de imagens para essa correção. O lobo exclusivo do Hardcore (392)
mantém a arte especial feita no ComfyUI local.
Cada ação mantém as oito vistas
originais, sem espelhamento. A transparência, o contorno e o apoio das patas foram
preservados para manter o deslocamento e as colisões consistentes.

O lobo do Hardcore usa pelagem escura, juba prateada e olhos âmbar. A variante é
selecionada pela dificuldade da partida, sem mudar identificadores ou saves.

Geração: `scripts/generate-comfyui-cast.py`, DreamShaper 8 e IPAdapter Plus SD1.5,
semente 20261031, lotes de quatro poses com ruído fixo por quadro. Os metadados
em `meta/` registram os atlas de origem e parâmetros; somente os atlas e o
carregador gerado são necessários ao jogo. O build não precisa do servidor de IA.

Origens dos modelos:

- https://huggingface.co/Lykon/DreamShaper
- https://huggingface.co/h94/IP-Adapter
- https://github.com/cubiq/ComfyUI_IPAdapter_plus

A direção visual foi autorizada pelo usuário. Os checks de transparência e
integração não substituem a avaliação artística em movimento: a revisão ao vivo
ficou pendente porque o controle do navegador não conseguiu confirmar a URL.
