# Verificações desta entrega

## Executado

- Atualização de 30/09/2026: Python 3.12.10 e pygame-ce 2.5.8 em Windows.
- `python -m unittest discover -s python_game/tests -v`: **35 testes passaram**.
- Inclui 250 mapas, conectividade independente, progressão das dez fases, chefes,
  cartas, colisões, checkpoint, eventos de teclado/mouse e redimensionamento.
- `python python_game/main.py --smoke`: passou, com renderização real do pygame
  usando o driver SDL de teste. Menu, cartas, movimento, pausa e sobrevivência exercitados.
- Sobrevivência: sementes repetíveis, itens acessíveis, coleta, níveis, cura,
  bloqueio de ataques por obstáculos, vitória/derrota e campanha salva preservada.
- Simulação completa dos cinco minutos com invulnerabilidade de fixture:
  inimigos em movimento, ondas crescentes e limites de inimigos/XP conferidos.
- Capturas do menu e da sobrevivência inspecionadas; câmera mantém a galinha
  abaixo do HUD na borda superior e árvores que a encobrem ficam transparentes.
- Fixture de horda: 180 quadros simulados e desenhados em 0,96 s com SDL dummy.
  Este número não mede a apresentação em um monitor nem garante FPS em outro PC.
- Os casos de campanha são fixtures automatizadas, não partidas humanas completas.

## Não executado nesta sessão

- Não foi realizado playtest humano completo nem teste desta atualização em macOS/Linux.
- Não foi gerado nem testado executável `.exe`.
- Não foi publicado em navegador nem celular.

O script `Jogar.bat` não foi aberto interativamente nesta sessão; os testes usaram
Python diretamente. Ele não é um executável independente do Python. A configuração opcional em
`tools/check-python-shuffle.yml` executa os testes também no Windows quando
instalada em `.github/workflows/` e enviada ao repositório.
