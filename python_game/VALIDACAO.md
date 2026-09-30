# Verificações desta entrega

## Executado

- Python 3.13.5 e pygame-ce 2.5.8 em Linux.
- `python -m unittest discover -s python_game/tests -v`: **28 testes passaram**.
- Inclui 250 mapas, conectividade independente, progressão das dez fases, chefes,
  cartas, colisões, checkpoint, eventos de teclado/mouse e redimensionamento.
- `python python_game/main.py --smoke`: passou, com renderização real do pygame
  usando o driver SDL de teste. Menu, cartas, movimento e pausa exercitados.
- Os casos de campanha são fixtures automatizadas, não partidas humanas completas.

## Não executado nesta sessão

- Não foi realizado teste em Windows ou macOS.
- Não foi gerado nem testado executável `.exe`.
- Não foi publicado em navegador nem celular.

O script `Jogar.bat` está preparado para Windows, mas não deve ser confundido com
um executável independente do Python. A configuração opcional em
`tools/check-python-shuffle.yml` executa os testes também no Windows quando
instalada em `.github/workflows/` e enviada ao repositório.
