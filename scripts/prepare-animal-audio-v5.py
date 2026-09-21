"""Natural farm voices from source recordings, without pitch or speed changes.

Run once with --import-sources to extract the credited cuts from .cache/audio-sources.
The resulting raw-v5 files are shipped so later builds are offline and reproducible.
Requires numpy and soundfile; the game itself has no audio processing dependencies.
"""
from pathlib import Path
import argparse
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.cache/audio-tools'))
import numpy as np
import soundfile as sf

RATE = 22050
BASE = ROOT / 'assets/audio/voices'
RAW, OUT = BASE / 'raw-v5', BASE / 'v5'
PROFILES = {
    # High-pass, low-pass, active weighted RMS. Small mouths stay naturally quieter.
    'cow': (55, 5500, .075), 'duck': (110, 6200, .075),
    'sheep': (85, 6500, .075), 'lamb': (120, 6500, .075),
    'pig': (65, 5200, .075), 'goat': (100, 6500, .075),
    'dog': (85, 6200, .075), 'cat': (85, 7000, .075),
    'donkey': (75, 5600, .075), 'rabbit': (180, 6500, .028),
    'chicken': (140, 6500, .075), 'chick': (650, 7800, .052),
    'horse': (95, 6300, .075), 'turkey': (110, 6200, .075),
    'goose': (120, 5800, .075), 'owl': (170, 3400, .075),
    'wolf': (100, 5800, .075), 'fox': (500, 7200, .065),
    'reaction': (220, 4600, .055),
}


def sha(file):
    return hashlib.sha256(Path(file).read_bytes()).hexdigest()


def bandpass(x, rate, high, low):
    t = np.arange(-192, 193)
    def lowpass(hz):
        k = 2 * hz / rate * np.sinc(2 * hz / rate * t) * np.hamming(len(t))
        return k / k.sum()
    return np.convolve(x, lowpass(min(low, rate * .44)) - lowpass(high), mode='same')


def import_sources():
    old = json.loads((BASE / 'v3/manifest.json').read_text(encoding='utf-8'))
    clips = []
    for clip in old['recordings']:
        c = {k: clip[k] for k in ['species', 'variant', 'file', 'source', 'sourcePage', 'author', 'license', 'start', 'end']}
        # The former second hen cut was mostly background. These are separate clucks.
        if c['species'] == 'chicken' and c['variant'] == 2:
            c.update(start=4.5, end=5.4)
        if c['species'] == 'chick':
            c.update(start=1.02, end=1.72)
        if c['species'] == 'goose' and c['variant'] == 1:
            c.update(start=0, end=1.12)
        # Use a natural farm duck instead of the cartoon quack used before.
        if c['species'] == 'duck':
            c.update(source='mudchuteanimals/MudchuteAnimals/Mudchute_duck_2.ogg', start=0, end=None,
                     author='Secretlondon; submitted by qubodup', license='CC-BY-SA-3.0',
                     sourcePage='https://opengameart.org/content/farm-animals')
        clips.append(c)
    for species, variant, start, end in [('chicken', 3, 7.1, 8.0), ('chick', 2, 2.2, 2.78)]:
        c = next(c.copy() for c in clips if c['species'] == species)
        c.update(variant=variant, file=c['file'].replace('.wav', f'-{variant}.wav'), start=start, end=end)
        clips.append(c)
    for variant, start, end in [(1, .08, 1.3), (2, 2.7, 4.15)]:
        clips.append(dict(species='owl', variant=variant, file=f'owl-hoot{"-2" if variant==2 else ""}.wav',
                          source='owl-hoot.mp3', start=start, end=end, author='Breviceps', license='CC0-1.0',
                          sourcePage='https://freesound.org/people/Breviceps/sounds/465697/'))
    for variant, start, end in [(1, .62, 1.65), (2, 1.78, 2.8)]:
        clips.append(dict(species='wolf', variant=variant, file=f'sob{"-2" if variant==2 else ""}.wav',
                          source='dog/Dog/Sad Dog.wav', start=start, end=end, author='pauliuw', license='CC0-1.0',
                          sourcePage='https://opengameart.org/content/dog-sounds',
                          description='Canine whimper used as the defeated wolf reaction.'))
    for species, file in [('fox', 'fox-rustle.wav'), ('reaction', 'squeak.wav')]:
        clips.append(dict(species=species, variant=1, file=file, source=file, start=0, end=None,
                          author='Penas pro Ar! — original synthesis', license='Project original',
                          originalEffect=True))
    RAW.mkdir(parents=True, exist_ok=True)
    for c in clips:
        source = ROOT / ('assets/audio' if c.get('originalEffect') else '.cache/audio-sources') / c['source']
        x, rate = sf.read(source, always_2d=True)
        x = x[int(c['start'] * rate):int(c['end'] * rate) if c['end'] is not None else None].mean(axis=1)
        if rate != RATE:
            # Resample once; the source duration and fundamental pitch are preserved.
            x = bandpass(x, rate, 15, min(9500, RATE * .44))
            x = np.interp(np.arange(round(len(x) * RATE / rate)) * rate / RATE, np.arange(len(x)), x)
        sf.write(RAW / c['file'], x, RATE, subtype='PCM_16')
        c.update(sourceSha256=sha(source), rawSha256=sha(RAW / c['file']), repeats=1)
    (RAW / 'manifest.json').write_text(json.dumps({'version': 5, 'recordings': clips}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def denoise(x):
    # A conservative spectral floor only uses genuinely quiet frames. A sustained
    # moo is never treated as noise. Reduction is capped at 8 dB, with smoothed gains.
    size, hop = 1024, 256
    window = np.hanning(size)
    padded = np.pad(x, (size, size + (-len(x)) % hop))
    frames = np.lib.stride_tricks.sliding_window_view(padded, size)[::hop]
    energy = np.sqrt(np.mean(frames * frames, axis=1))
    interior = energy[(energy > .00001) & (np.arange(len(energy)) > size // hop) &
                      (np.arange(len(energy)) < len(energy) - size // hop)]
    if len(interior) < 8 or np.quantile(interior, .15) > np.quantile(interior, .9) * .16:
        return x, False
    quiet = (energy > .00001) & (energy < np.quantile(interior, .2))
    if np.sum(quiet) < 3:
        return x, False
    spectrum = np.fft.rfft(frames * window, axis=1)
    power = np.abs(spectrum) ** 2
    noise = np.median(power[quiet], axis=0)
    gains = np.sqrt(np.clip(1 - noise[None, :] * .8 / np.maximum(power, 1e-16), .16, 1))
    gains = (gains + np.roll(gains, 1, axis=1) + np.roll(gains, -1, axis=1)) / 3
    gains = (gains * 2 + np.vstack([gains[:1], gains[:-1]]) + np.vstack([gains[1:], gains[-1:]])) / 4
    recovered = np.fft.irfft(spectrum * gains, n=size, axis=1) * window
    out, weight = np.zeros(len(padded)), np.zeros(len(padded))
    for i, frame in enumerate(recovered):
        out[i * hop:i * hop + size] += frame
        weight[i * hop:i * hop + size] += window * window
    return (out / np.maximum(weight, 1e-9))[size:size + len(x)], True


def weighted_active_rms(x):
    # A modest presence weighting for relative voice matching, not a LUFS claim.
    frequencies = np.fft.rfftfreq(len(x), 1 / RATE)
    weight = frequencies / np.sqrt(frequencies ** 2 + 100 ** 2)
    weight *= 1 + .4 * frequencies ** 2 / (frequencies ** 2 + 1800 ** 2)
    weighted = np.fft.irfft(np.fft.rfft(x) * weight, n=len(x))
    size = 441
    blocks = np.sqrt(np.mean(np.pad(weighted ** 2, (0, (-len(x)) % size)).reshape(-1, size), axis=1))
    active = blocks[blocks > max(.0001, blocks.max() * .12)]
    return float(np.sqrt(np.mean(active ** 2))) if len(active) else 0


def master(x, species):
    high, low, target = PROFILES[species]
    x = bandpass(x - np.mean(x), RATE, high, low)
    x, reduced = denoise(x)
    size = 220
    energy = np.sqrt(np.mean(np.pad(x * x, (0, (-len(x)) % size)).reshape(-1, size), axis=1))
    active = np.flatnonzero(energy > max(.00005, energy.max() * .035))
    if len(active):
        x = x[max(0, active[0] * size - 220):min(len(x), (active[-1] + 1) * size + 660)]
    x *= target / max(weighted_active_rms(x), .00001)
    # Smoothly round only the exceptional peaks, leaving the body of calls intact.
    knee, ceiling = (.1, .18) if species == 'rabbit' else (.28, .42)
    x = np.sign(x) * np.where(np.abs(x) <= knee, np.abs(x), knee + (ceiling-knee) * np.tanh((np.abs(x)-knee)/(ceiling-knee)))
    attack, release = min(110, len(x) // 8), min(880, len(x) // 5)
    x[:attack] *= np.sin(np.linspace(0, np.pi / 2, attack)) ** 2
    x[-release:] *= np.cos(np.linspace(0, np.pi / 2, release)) ** 2
    x = np.pad(x, (int(RATE * .012), int(RATE * .035)))
    return x, dict(pitchRatio=1, highpassHz=high, lowpassHz=low, noiseReductionDb=8 if reduced else 0,
                   activeWeightedRmsTarget=target, peakCeiling=ceiling)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--import-sources', action='store_true')
    args = parser.parse_args()
    if args.import_sources:
        import_sources()
    source = json.loads((RAW / 'manifest.json').read_text(encoding='utf-8'))
    OUT.mkdir(parents=True, exist_ok=True)
    result = dict(version=5, sampleRate=RATE, channels=1, bits=16,
                  description='Natural pitch, individually cleaned recordings and matched voice levels.', recordings=[], specialEffects=[])
    for clip in source['recordings']:
        if sha(RAW / clip['file']) != clip['rawSha256']:
            raise ValueError('Source checksum mismatch: ' + clip['file'])
        raw, rate = sf.read(RAW / clip['file'])
        if rate != RATE:
            raise ValueError('Unexpected source rate')
        samples, processing = master(raw, clip['species'])
        sf.write(OUT / clip['file'], samples, RATE, subtype='PCM_16')
        decoded, _ = sf.read(OUT / clip['file'])
        record = dict(clip, derivedFrom='../raw-v5/' + clip['file'], processing=processing,
                      seconds=round(len(decoded) / RATE, 4), peak=round(float(np.max(np.abs(decoded))), 5),
                      rms=round(float(np.sqrt(np.mean(decoded ** 2))), 5),
                      activeWeightedRms=round(weighted_active_rms(decoded), 5), sha256=sha(OUT / clip['file']))
        result['specialEffects' if clip['species'] in ['owl', 'wolf', 'fox', 'reaction'] else 'recordings'].append(record)
        print(clip['file'], record['seconds'], 's; active', record['activeWeightedRms'], '; peak', record['peak'])
    (OUT / 'manifest.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Prepared', len(source['recordings']), 'files. Natural pitch and original sources preserved.')


if __name__ == '__main__':
    main()
