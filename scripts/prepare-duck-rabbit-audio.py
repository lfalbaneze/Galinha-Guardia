"""Reuse credited local recordings: a distinct quack and quiet rabbit chewing, without pitch shifts."""
from array import array
from pathlib import Path
import hashlib
import json
import math
import sys
import wave

BASE = Path(__file__).resolve().parents[1] / 'assets/audio/voices'
OUT = BASE / 'v7'
OUT.mkdir(exist_ok=True)
recordings = []
for species, version, cutoff, target, ceiling in [('duck', 'v3', 3200, .075, .4), ('rabbit', 'raw-v5', 1600, .032, .18)]:
    name = f'animal-{species}.wav'
    source = BASE / version / name
    with wave.open(str(source), 'rb') as audio:
        assert (audio.getnchannels(), audio.getsampwidth(), audio.getframerate()) == (1, 2, 22050)
        samples = array('h', audio.readframes(audio.getnframes()))
    if sys.byteorder != 'little': samples.byteswap()
    # Two low-pass poles soften high-pitched background detail while keeping the original timing.
    alpha = 1 - math.exp(-2 * math.pi * cutoff / 22050)
    first = second = 0
    filtered = []
    mean = sum(samples) / len(samples)
    for value in samples:
        first += alpha * ((value - mean) / 32768 - first)
        second += alpha * (first - second)
        filtered.append(second)
    blocks = [math.sqrt(sum(v*v for v in filtered[i:i+220]) / len(filtered[i:i+220])) for i in range(0, len(filtered), 220)]
    active = [v for v in blocks if v > max(blocks) * .18]
    rms = math.sqrt(sum(v*v for v in active) / len(active))
    gain = min(target / rms, ceiling / max(map(abs, filtered)))
    output = array('h', [0] * 441)
    for i, value in enumerate(filtered):
        fade = min(1, i / 441, (len(filtered) - 1 - i) / 882)
        output.append(round(value * gain * fade * 32767))
    output.extend([0] * 441)
    peak = max(map(abs, output)) / 32768
    if sys.byteorder != 'little': output.byteswap()
    destination = OUT / name
    with wave.open(str(destination), 'wb') as audio:
        audio.setparams((1, 2, 22050, 0, 'NONE', 'not compressed'))
        audio.writeframes(output.tobytes())
    original = json.loads((BASE / version / 'manifest.json').read_text(encoding='utf-8'))
    credit = next(c for c in original['recordings'] if c['file'] == name)
    recordings.append({**{key: credit[key] for key in ['species', 'variant', 'file', 'author', 'license', 'sourcePage']},
        'derivedFrom': f'../{version}/{name}', 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
        'processing': {'pitchRatio': 1, 'lowpassHz': cutoff, 'poles': 2, 'peakCeiling': ceiling},
        'seconds': len(output) / 22050, 'peak': peak, 'sha256': hashlib.sha256(destination.read_bytes()).hexdigest()})
(OUT / 'manifest.json').write_text(json.dumps({'version': 7, 'recordings': recordings}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('Prepared duck quack and rabbit chewing from existing credited recordings.')
