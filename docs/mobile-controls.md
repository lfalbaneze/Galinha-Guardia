# Jogar no celular

Os controles aparecem automaticamente em aparelhos com tela sensível ao toque. Uma preferência salva na aba **Controles** continua sendo respeitada.

Arraste o analógico à esquerda para andar. A distância até o centro regula o movimento, com uma pequena zona morta para evitar movimentos acidentais. Use o outro dedo nos botões **Mansinho**, **Correr**, **Chamar / Esconder / Sair / Carimbar** e **Pausar**. Mansinho e Correr são alternáveis e não ficam ligados ao mesmo tempo.

Na aba **Controles**, desmarque **Usar analógico virtual** para voltar às setas. Teclado e controle físico continuam disponíveis. O botão **Tela cheia** aparece quando a API está disponível; a recusa do navegador não impede a partida.

O layout considera orientação, altura visível do navegador e áreas reservadas do aparelho. Menus continuam roláveis; a supressão de gestos fica restrita ao campo e aos controles. Soltar o dedo, cancelar um toque, perder o foco, pausar ou girar a tela limpa o movimento.

## Verificação

```sh
node --test tests/mobile-controls.test.cjs
npm run verify
```

Os oito testes específicos cobrem detecção, carregamento em subpasta, zona morta, diagonais, dois dedos, ações sem duplicação, cancelamento, pausa, troca de orientação, preferências e preservação do teclado. O teste específico é incluído automaticamente por `npm test`.

A verificação de navegador dos controles isolados foi feita em Chromium com toque emulado em 320×568, 390×844, 844×390 e 1024×768, mais desktop sem toque. Isso não substitui uma partida completa em Android e Safari/iPhone reais.

## Publicar

`npm run build` inclui o CSS móvel porque a pasta `systems/` já faz parte do pacote. Para atualizar a versão HTML no itch.io, envie um novo ZIP com o conteúdo de `dist/` e `index.html` na raiz. Atualizar o GitHub, sozinho, não substitui o ZIP já publicado.
