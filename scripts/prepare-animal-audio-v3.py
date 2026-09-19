"""Prepare the revised local animal voices. No pitch changes or repeated copies.

Requires numpy and soundfile (also found in .cache/audio-tools). Existing sources
are fetched by prepare-animal-audio.py; new recordings below are cached locally.
The shipped PCM files work offline. Sources and licenses accompany the manifest.
"""
from pathlib import Path
import hashlib
import json
import sys
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.cache/audio-tools'))
import numpy as np
import soundfile as sf

CACHE = ROOT / '.cache/audio-sources'
OUT = ROOT / 'assets/audio/voices/v3'
OUT.mkdir(parents=True, exist_ok=True)
RATE = 22050
DOWNLOADS = {
    'horse-neigh.mp3': 'https://bigsoundbank.com/UPLOAD/mp3/0460.mp3',
    'turkey-gobble.mp3': 'https://cdn.freesound.org/previews/67/67675_523848-hq.mp3',
    'sheep-baa.flac': 'https://opengameart.org/sites/default/files/sheep_baa.flac',
    'cow-moo.mp3': 'https://soundbible.com/mp3/Cow_Moo-Mike_Koenig-42670858.mp3',
    'duck-quack.mp3': 'https://cdn.freesound.org/previews/445/445960_9159316-hq.mp3',
    'goose-honks.mp3': 'https://cdn.freesound.org/previews/470/470035_9564355-hq.mp3',
}
SOURCES = {
    'horse-neigh.mp3': ('Joseph Sardin', 'CC0-1.0', 'https://bigsoundbank.com/neighing-of-a-horse-s0460.html'),
    'turkey-gobble.mp3': ('sinatra314', 'CC-BY-3.0', 'https://freesound.org/people/sinatra314/sounds/67675/'),
    'sheep-baa.flac': ('mikewest; edited by AntumDeluge', 'CC0-1.0', 'https://opengameart.org/content/sheep-baa'),
    'cow-moo.mp3': ('Mike Koenig', 'CC-BY-3.0', 'https://soundbible.com/1778-Cow-Moo.html'),
    'duck-quack.mp3': ('Breviceps', 'CC0-1.0', 'https://freesound.org/people/Breviceps/sounds/445960/'),
    'goose-honks.mp3': ('iamkaylagreen', 'CC0-1.0', 'https://freesound.org/people/iamkaylagreen/sounds/470035/'),
    'mudchute': ('Secretlondon; submitted by qubodup', 'CC-BY-SA-3.0', 'https://opengameart.org/content/farm-animals'),
    'dog-clean.mp3': ('kwahmah_02', 'CC0-1.0', 'https://freesound.org/people/kwahmah_02/sounds/277058/'),
    'goat-field.mp3': ('klankbeeld', 'CC-BY-4.0', 'https://freesound.org/people/klankbeeld/sounds/343025/'),
    'Meow.ogg': ('Dan Crosby (Dcrosby)', 'CC-BY-SA-3.0', 'https://commons.wikimedia.org/wiki/File:Meow.ogg'),
    'donkey.wav': ('Felix Blume', 'CC0-1.0', 'https://freesound.org/people/felix.blume/sounds/157763/'),
    'RabbitEating.wav': ('Voltiment555', 'CC0-1.0', 'https://opengameart.org/content/rabbit-eating'),
    'hen-clucks.mp3': ('Breviceps', 'CC0-1.0', 'https://freesound.org/people/Breviceps/sounds/456803/'),
    'chicks.mp3': ('Lexana.uk', 'CC0-1.0', 'https://freesound.org/people/Lexana.uk/sounds/243503/'),
}
for filename, url in DOWNLOADS.items():
    destination = CACHE / filename
    if not destination.exists():
        req = urllib.request.Request(url, headers={'User-Agent': 'FarmGameAssetPreparation/1.0'})
        destination.write_bytes(urllib.request.urlopen(req, timeout=30).read())

farm = 'mudchuteanimals/MudchuteAnimals/Mudchute_'
# species, source, start, end, active RMS target, variant number
CLIPS = [
    ('cow', 'cow-moo.mp3', 0, 3.25, .12, 1),
    ('duck', 'duck-quack.mp3', 0, None, .105, 1),
    ('sheep', 'sheep-baa.flac', 0, None, .12, 1),
    ('lamb', farm+'lamb_1.ogg', 0, None, .105, 1),
    ('pig', farm+'pig_1.ogg', 0, None, .12, 1),
    ('pig', farm+'pig_2.ogg', 0, None, .12, 2),
    ('goat', 'goat-field.mp3', 0, None, .12, 1),
    ('dog', 'dog-clean.mp3', 0, None, .12, 1),
    ('cat', 'Meow.ogg', 0, None, .11, 1),
    ('donkey', 'donkey.wav', 6.25, 8.7, .115, 1),
    ('rabbit', 'RabbitEating.wav', 1.5, 2.55, .028, 1),
    ('chicken', 'hen-clucks.mp3', 1.12, 1.9, .10, 1),
    ('chicken', 'hen-clucks.mp3', 2.75, 3.45, .10, 2),
    ('chick', 'chicks.mp3', 1, 2.2, .09, 1),
    ('horse', 'horse-neigh.mp3', .25, 1.7, .115, 1),
    ('turkey', 'turkey-gobble.mp3', .35, 1.7, .115, 1),
    ('goose', 'goose-honks.mp3', 12.48, 13.5, .12, 1),
    ('goose', 'goose-honks.mp3', 15.18, 16.25, .12, 2),
]

def clean(samples, rate):
    samples = samples.mean(axis=1)
    samples -= samples.mean()
    # Gentle FIR filtering removes subsonic handling noise and hiss, not the voice.
    t = np.arange(-128, 129)
    def lowpass(hz):
        kernel = 2*hz/rate*np.sinc(2*hz/rate*t)*np.hamming(len(t))
        return kernel/kernel.sum()
    kernel = lowpass(min(8500, rate*.44)) - lowpass(55)
    samples = np.convolve(samples, kernel, mode='same')
    samples = np.interp(np.arange(round(len(samples)*RATE/rate))*rate/RATE, np.arange(len(samples)), samples)
    # Short-time RMS is less biased by silence than peak-only normalization.
    block = 220
    envelope = np.sqrt(np.mean(np.pad(samples**2, (0, (-len(samples)) % block)).reshape(-1, block), axis=1))
    active = np.flatnonzero(envelope > max(envelope.max()*.055, .0003))
    if len(active):
        first = max(0, int(active[0]*block)-int(.02*RATE))
        last = min(len(samples), int((active[-1]+1)*block)+int(.045*RATE))
        samples = samples[first:last]
    return samples

manifest = {'version': 3, 'sampleRate': RATE, 'channels': 1, 'bits': 16, 'recordings': []}
for species, source, start, end, target, variant in CLIPS:
    raw, rate = sf.read(CACHE/source, always_2d=True)
    raw = raw[int(start*rate):int(end*rate) if end is not None else None]
    samples = clean(raw, rate)
    block = 220
    rms = np.sqrt(np.mean(np.pad(samples**2, (0, (-len(samples)) % block)).reshape(-1, block), axis=1))
    active_rms = np.sqrt(np.mean(rms[rms > rms.max()*.18]**2))
    gain = min(target/max(active_rms, .0001), (.35 if species == 'rabbit' else .68)/max(abs(samples)))
    samples *= gain
    attack, release = min(220, len(samples)//8), min(770, len(samples)//8)
    samples[:attack] *= np.linspace(0, 1, attack)
    samples[-release:] *= np.linspace(1, 0, release)
    samples = np.pad(samples, (int(RATE*.012), int(RATE*.035)))
    base = 'chick' if species == 'chick' else 'goose-honk' if species == 'goose' else 'animal-'+species
    filename = base+('' if variant == 1 else '-'+str(variant))+'.wav'
    sf.write(OUT/filename, samples, RATE, subtype='PCM_16')
    author, license_id, page = SOURCES['mudchute' if source.startswith('mudchute') else source]
    record = {'species': species, 'variant': variant, 'file': filename, 'source': source,
              'sourcePage': page, 'author': author, 'license': license_id, 'start': start, 'end': end,
              'repeats': 1, 'seconds': round(len(samples)/RATE, 4),
              'peak': round(float(max(abs(samples))), 4),
              'rms': round(float(np.sqrt(np.mean(samples**2))), 4),
              'sha256': hashlib.sha256((OUT/filename).read_bytes()).hexdigest()}
    manifest['recordings'].append(record)
manifest['downloads'] = [{'file': f, 'url': url, 'sha256': hashlib.sha256((CACHE/f).read_bytes()).hexdigest()}
                         for f, url in DOWNLOADS.items()]
(OUT/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf8')
print('Prepared', len(CLIPS), 'clips for', len(set(c[0] for c in CLIPS)), 'species.')
for clip in manifest['recordings']:
    print(clip['file'], clip['seconds'], 's / peak', clip['peak'], '/ RMS', clip['rms'])
