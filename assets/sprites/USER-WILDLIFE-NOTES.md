# Raposa e coruja fornecidas pelo usuário

`sources/fox-custom.png` e `sources/owl-custom.png` são cópias integrais dos PNGs enviados pelo usuário para o jogo. Ambos medem 1086 × 1448 pixels e contêm 12 poses: frente, esquerda, direita e costas, com três quadros por direção.

O jogo lê os recortes diretamente das imagens, sem redesenhar ou regenerar a arte. Os espaços entre as linhas não são uniformes; os limites de cada quadro estão em `src/systems/fox-art.ts` e `src/systems/owl-art.ts`. A escala é fixa entre as poses, o apoio inferior fica alinhado e o Canvas desativa a suavização para preservar os pixels. A caminhada da raposa alterna repouso e os dois passos. A coruja continua pousada, usando as poses durante observação, descanso e alerta.

As folhas anteriores permanecem como referência; seus créditos se encontram em `CREDITS.html`. A autoria e a licença das novas imagens não foram informadas pelo usuário.

Para revisar as 24 poses na escala real do jogo: `node scripts/render-user-wildlife.cjs`. Os encontros no cenário são renderizados por `node scripts/render-encounters.cjs`.
