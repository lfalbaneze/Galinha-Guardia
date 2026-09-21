# Vozes da fazenda — versão 5

26 arquivos WAV PCM mono, 16 bits, 22.050 Hz. Há 20 chamadas para 15 espécies, dois pios de coruja, duas reações do lobo, o aviso das raposas e o efeito de dano do coelho. O áudio é carregado sob demanda pelo navegador.

As vozes partem das gravações originais, sem aumentar afinação ou velocidade. Cada espécie recebe filtros próprios, redução conservadora de ruído quando há fundo isolável, ajuste de nível e fades curtos. O limite de pico é 0,42; a mastigação do coelho usa 0,18. Pintinhos e coelho ficam mais discretos que os adultos. O nível `activeWeightedRms` é uma medida interna de sinal ativo, **não uma medição LUFS** nem uma avaliação auditiva.

A galinha alterna três cacarejos reais: o segundo corte anterior tinha pouco canto e foi substituído. Pintinhos, porcos e ganso têm duas chamadas distintas. A coruja usa dois pios gravados. O lobo usa dois ganidos de **cachorro**, como reação à derrota. O farfalhar das raposas e a reação cômica ao dano do coelho continuam sendo efeitos originais sintetizados, agora tratados.

## Reproduzir

Com Python, NumPy e SoundFile instalados:

```sh
python scripts/prepare-animal-audio-v5.py
```

Os recortes em `../raw-v5/` permitem reconstrução offline. Seus hashes são verificados antes do tratamento. `--import-sources` é uma etapa opcional de produção que requer as gravações originais em `.cache/audio-sources/`; não é necessária para reconstruir as vozes incluídas. Os arquivos das versões anteriores ficam preservados.

O [manifesto](manifest.json) identifica o tratamento e o hash de cada WAV. Autores, fontes e licenças estão no [registro das fontes](../raw-v5/manifest.json) e nos [créditos de áudio](../../CREDITS.html). Cada adaptação conserva a licença da fonte, inclusive CC BY-SA 3.0 quando aplicável. Os efeitos originais seguem a licença do projeto.

[Comparar antes e depois](../../revisao.html). A página usa o mesmo volume de reprodução para ambos. No jogo, falas espontâneas aguardam os resgates e avisos, usam volume menor e respeitam pausa, mudo e aba oculta. Testes verificam arquivos, reprodução e níveis; a preferência de timbre deve ser avaliada ouvindo a comparação.
