"""Prepare licensed animal recordings, independently of the generated music/SFX.

Requires numpy, soundfile and py7zr (only at asset preparation time).
Sources are cached in .cache/audio-sources; shipped WAVs need no dependencies.
Attribution and licenses: assets/audio/CREDITS.html.
"""
from pathlib import Path
import hashlib
import json
import sys
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.cache/audio-tools'))
import numpy as np
import soundfile as sf
import py7zr

CACHE = ROOT / '.cache/audio-sources'
OUT = ROOT / 'assets/audio/voices'
CACHE.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
OGA = 'https://opengameart.org/sites/default/files/'
DOWNLOADS = {
    'mudchuteanimals.7z': OGA + 'mudchuteanimals.7z',
    'dog.7z': OGA + 'dog.7z',
    'snom-ringtone.wav': OGA + 'snom-ringtone.wav',
    'RabbitEating.wav': OGA + 'RabbitEating.wav',
    'chicken_sound_effect.zip': OGA + 'chicken_sound_effect.zip',
    'Meow.ogg': 'https://upload.wikimedia.org/wikipedia/commons/6/62/Meow.ogg',
    'donkey.wav': 'https://upload.wikimedia.org/wikipedia/commons/2/25/157763_felix-blume_a-donkey-is-braying-in-his-enclosure-in-south-of-france.wav',
    'chicks.mp3': 'https://cdn.freesound.org/previews/243/243503_582848-hq.mp3',
}
for filename, url in DOWNLOADS.items():
    destination = CACHE / filename
    if not destination.exists():
        request = urllib.request.Request(url, headers={'User-Agent': 'FarmGameAssetPreparation/1.0'})
        destination.write_bytes(urllib.request.urlopen(request, timeout=60).read())
for filename in ['mudchuteanimals', 'dog']:
    if not (CACHE / filename).exists():
        with py7zr.SevenZipFile(CACHE / (filename + '.7z')) as archive:
            if any('..' in Path(name).parts or Path(name).is_absolute() for name in archive.getnames()):
                raise ValueError('Unsafe archive path')
            archive.extractall(CACHE / filename)
if not (CACHE / 'chicken').exists():
    with zipfile.ZipFile(CACHE / 'chicken_sound_effect.zip') as archive:
        archive.extractall(CACHE / 'chicken')

farm = 'mudchuteanimals/MudchuteAnimals/Mudchute_'
# name, source, start/end in seconds, additional identical calls, target peak
CLIPS = [
    ('cow', farm + 'cow_1.ogg', 0, None, 1, .82),
    ('duck', farm + 'duck_2.ogg', 0, None, 1, .82),
    ('sheep', farm + 'sheep_1.ogg', 0, None, 1, .82),
    ('lamb', farm + 'lamb_1.ogg', 0, None, 2, .76),
    ('pig', farm + 'pig_1.ogg', 0, None, 2, .82),
    ('goat', 'snom-ringtone.wav', 0, None, 1, .78),
    ('dog', 'dog/Dog/Dog Bark.wav', 0, None, 2, .82),
    ('cat', 'Meow.ogg', 0, None, 1, .80),
    ('donkey', 'donkey.wav', 5.75, 8.9, 1, .82),
    ('rabbit', 'RabbitEating.wav', 1.5, 3.3, 1, .50),
    ('chicken', 'chicken/Chicken Sound Effect.ogg', 0, None, 1, .80),
    ('chick', 'chicks.mp3', 1, 2.2, 1, .70),
]
RATE = 22050
manifest = {'sampleRate': RATE, 'channels': 1, 'bits': 16, 'recordings': [],
            'downloads': [{'file': f, 'url': u, 'sha256': hashlib.sha256((CACHE / f).read_bytes()).hexdigest()}
                          for f, u in DOWNLOADS.items()]}
for species, source, start, end, repeats, peak in CLIPS:
    samples, rate = sf.read(CACHE / source, always_2d=True)
    samples = samples[int(start * rate):int(end * rate) if end is not None else None].mean(axis=1)
    samples -= np.mean(samples)
    if rate > RATE:
        # Windowed sinc low-pass before downsampling, preserving the original pitch.
        t = np.arange(-32, 33)
        cutoff = 9500 / rate
        kernel = 2 * cutoff * np.sinc(2 * cutoff * t) * np.hamming(len(t))
        samples = np.convolve(samples, kernel / kernel.sum(), mode='same')
    samples = np.interp(np.arange(round(len(samples) * RATE / rate)) * rate / RATE,
                        np.arange(len(samples)), samples)
    samples *= peak / max(.001, np.max(np.abs(samples)))
    fade = min(round(RATE * .015), len(samples) // 8)
    samples[:fade] *= np.linspace(0, 1, fade)
    samples[-fade:] *= np.linspace(1, 0, fade)
    if repeats > 1:
        samples = np.concatenate([samples, np.zeros(round(RATE * .22)), samples])
    filename = ('chick' if species == 'chick' else 'animal-' + species) + '.wav'
    sf.write(OUT / filename, samples, RATE, subtype='PCM_16')
    manifest['recordings'].append({'species': species, 'file': filename, 'source': source,
        'start': start, 'end': end, 'repeats': repeats, 'seconds': round(len(samples) / RATE, 4),
        'peak': round(float(np.max(np.abs(samples))), 4),
        'rms': round(float(np.sqrt(np.mean(samples ** 2))), 4),
        'sha256': hashlib.sha256((OUT / filename).read_bytes()).hexdigest()})
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf8')
print('Prepared 12 animal recordings; all WAVs are mono PCM16 with no clipped samples.')
