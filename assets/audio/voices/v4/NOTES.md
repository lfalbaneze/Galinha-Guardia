# Vozes suaves

18 chamadas das 15 espécies vocais da fazenda, mais o piado original da coruja e o choro cômico do lobo. Os sons são usados no menu, exploração, resgates, reações das skins e na chegada do Thor. Cada espécie conserva seu som característico; o coelho continua com uma mastigação discreta.

Gerador: `node scripts/prepare-cute-audio.cjs`. Não precisa de rede ou bibliotecas externas. Parte das gravações locais da versão 3 e aplica uma pequena elevação de afinação específica por espécie, filtragem de ruído grave/agudo, compressão suave de transientes, volume reduzido e entradas/saídas suaves. O navegador toca os arquivos na velocidade normal, sem variar a afinação ao acaso. A coruja e o choro do lobo derivam dos efeitos sintetizados originais do jogo.

Os originais permanecem em `../v3`. Cada gravação derivada conserva autor, fonte, licença e SHA do original no [manifesto](manifest.json), junto aos parâmetros e métricas do resultado. As licenças originais, incluindo CC BY-SA, continuam aplicáveis aos respectivos arquivos derivados. [Créditos completos](../../CREDITS.html) · [Comparação antes/depois](../../revisao.html).
