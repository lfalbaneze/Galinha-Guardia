/* Offline audition of the real AudioSystem cue schedule and generated WAV files.
   Rebuild: node scripts/render-audio-preview.cjs
   Frame timing, pool reuse, gain, ducking and stops use the live runtime module.
   Playback-rate changes use linear PCM resampling; browser pitch preservation may differ. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const RATE = 22050, FPS = 60, DURATION = 19.1;
const frames = Math.round(RATE * DURATION);
const cache = new Map(), elements = [], cues = [];
let sample = 0;

function readWav(src) {
  const filename = path.resolve(ROOT, src);
  const audioRoot = path.join(ROOT, 'assets', 'audio') + path.sep;
  if (!filename.startsWith(audioRoot)) throw new Error(`Unexpected audio source: ${src}`);
  if (cache.has(filename)) return cache.get(filename);
  const data = fs.readFileSync(filename);
  if (data.toString('ascii', 0, 4) !== 'RIFF' || data.toString('ascii', 8, 12) !== 'WAVE') throw new Error(`Invalid WAV: ${src}`);
  let format, pcm;
  for (let offset = 12; offset + 8 <= data.length;) {
    const name = data.toString('ascii', offset, offset + 4), length = data.readUInt32LE(offset + 4);
    if (offset + 8 + length > data.length) throw new Error(`Truncated WAV chunk: ${src}`);
    if (name === 'fmt ') format = data.subarray(offset + 8, offset + 8 + length);
    if (name === 'data') pcm = data.subarray(offset + 8, offset + 8 + length);
    offset += 8 + length + length % 2;
  }
  const channels=format?.readUInt16LE(2);
  if (!format || !pcm || format.readUInt16LE(0) !== 1 || ![1,2].includes(channels) ||
      format.readUInt32LE(4) !== RATE || format.readUInt16LE(14) !== 16 || pcm.length % (channels*2)) {
    throw new Error(`Expected mono/stereo ${RATE} Hz PCM16: ${src}`);
  }
  const length = pcm.length / (channels*2), left = new Float64Array(length), right = new Float64Array(length);
  for (let i = 0; i < length; i++) {
    left[i] = pcm.readInt16LE(i * channels*2) / 32768;
    right[i] = pcm.readInt16LE(i * channels*2 + (channels===2?2:0)) / 32768;
  }
  const result = { left, right, length };
  cache.set(filename, result);
  return result;
}

class RenderAudio {
  constructor(src) {
    this.src = src; this.paused = true; this.volume = 1; this.playbackRate = 1; this.loop = false;
    elements.push(this);
  }
  set src(value) { this.source = value; this.clip = readWav(value); this.cursor = 0; }
  get src() { return this.source; }
  set currentTime(value) { this.cursor = value * RATE; }
  get currentTime() { return this.cursor / RATE; }
  play() {
    this.paused = false;
    cues.push({ time: sample / RATE, name: path.basename(this.src, '.wav'), music: this.loop,
      gain: this.volume, rate: this.playbackRate });
    // An already-decoded HTMLAudio implementation may return undefined from play().
  }
  pause() { this.paused = true; }
  next() {
    if (this.paused) return [0, 0];
    const whole = Math.floor(this.cursor), fraction = this.cursor - whole;
    const following = whole + 1 < this.clip.length ? whole + 1 : this.loop ? 0 : whole;
    const left = (this.clip.left[whole] * (1 - fraction) + this.clip.left[following] * fraction) * this.volume;
    const right = (this.clip.right[whole] * (1 - fraction) + this.clip.right[following] * fraction) * this.volume;
    this.cursor += this.playbackRate;
    if (this.cursor >= this.clip.length) {
      if (this.loop) this.cursor %= this.clip.length;
      else { this.cursor = this.clip.length; this.paused = true; if (this.onended) this.onended(); }
    }
    return [left, right];
  }
}

const context = vm.createContext({
  Audio: RenderAudio,
  localStorage: { getItem: () => null, setItem() {} },
  document: { hidden: false, addEventListener() {} },
});
// Loading the real ending module obtains its timing without invoking its drawing code.
vm.runInContext(fs.readFileSync(path.join(ROOT, 'systems', 'end-game-sequence.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'systems', 'audio-system.js'), 'utf8'), context);
const audio = vm.runInContext('AudioSystem', context);
const timing = vm.runInContext('EndGameSequence.timing', context);
const game = { phase: 'win_cutscene', cutscene: { time: 0, stage: 'arrival' } };
audio.sync(game); audio.unlock();
const left = new Float64Array(frames), right = new Float64Array(frames);
let tick = 0, peak = 0, square = 0, clipped = 0, maxEffectVoices = 0;
for (sample = 0; sample < frames; sample++) {
  if (sample >= Math.round(tick * RATE / FPS)) {
    const time = tick / FPS;
    game.cutscene.time = time;
    game.cutscene.stage = time >= timing.celebrate ? 'celebrate' : time >= timing.flee ? 'flee' :
      time >= timing.dizzy ? 'dizzy' : time >= timing.cloud ? 'cloud' : time >= timing.rush ? 'rush' :
      time >= timing.circle ? 'circle' : time >= 1.3 ? 'message' : 'arrival';
    game.phase = time >= timing.done ? 'won' : 'win_cutscene';
    audio.update(game, 1 / FPS);
    tick++;
  }
  let effectCount = 0;
  for (const element of elements) {
    if (!element.loop && !element.paused) effectCount++;
    const [l, r] = element.next(); left[sample] += l; right[sample] += r;
  }
  maxEffectVoices = Math.max(maxEffectVoices, effectCount);
  for (const value of [left[sample], right[sample]]) {
    if (!Number.isFinite(value)) throw new Error('Non-finite mixed sample');
    peak = Math.max(peak, Math.abs(value)); square += value * value;
    if (Math.abs(value) >= 1) clipped++;
  }
}
if (clipped || peak >= 0.98) throw new Error(`Mix lacks headroom: peak=${peak}, clipped=${clipped}. No normalization applied.`);
if (maxEffectVoices > 6) throw new Error(`Effect voice limit exceeded: ${maxEffectVoices}`);
const pcmBytes = frames * 4, output = Buffer.alloc(44 + pcmBytes);
output.write('RIFF', 0); output.writeUInt32LE(36 + pcmBytes, 4); output.write('WAVEfmt ', 8);
output.writeUInt32LE(16, 16); output.writeUInt16LE(1, 20); output.writeUInt16LE(2, 22);
output.writeUInt32LE(RATE, 24); output.writeUInt32LE(RATE * 4, 28); output.writeUInt16LE(4, 32);
output.writeUInt16LE(16, 34); output.write('data', 36); output.writeUInt32LE(pcmBytes, 40);
for (let i = 0; i < frames; i++) {
  output.writeInt16LE(Math.round(left[i] * 32767), 44 + i * 4);
  output.writeInt16LE(Math.round(right[i] * 32767), 46 + i * 4);
}
const destination = path.join(ROOT, 'preview', 'finale-audio.wav');
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, output);
const effects = cues.filter(cue => !cue.music);
const counts = {};
for (const cue of effects) counts[cue.name] = (counts[cue.name] || 0) + 1;
console.log(JSON.stringify({
  output: 'preview/finale-audio.wav', seconds: DURATION, sampleRate: RATE, channels: 2, bits: 16,
  bytes: output.length, peak: +peak.toFixed(6), rms: +Math.sqrt(square / (frames * 2)).toFixed(6),
  clippedSamples: clipped, normalizationApplied: false, musicVolume: audio.settings.musicVolume,
  effectsVolume: audio.settings.effectsVolume, cueCount: effects.length, cues: counts, maxEffectVoices,
  note: 'Actual AudioSystem timeline and assets; linear resampling for rate changes, not a browser listening test.',
}, null, 2));
