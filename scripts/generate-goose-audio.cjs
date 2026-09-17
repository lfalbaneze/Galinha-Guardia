// A short cartoon honk, synthesized as mono PCM using Node built-ins only.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const rate = 22050, duration = .64, samples = Math.round(rate * duration);
const wav = Buffer.alloc(44 + samples * 2);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(samples * 2, 40);
let phase = 0;
for (let i = 0; i < samples; i++) {
  const t = i / rate, u = t / duration;
  const frequency = 370 + 90 * Math.sin(Math.PI * u) - 95 * u + 9 * Math.sin(t * 94);
  phase += Math.PI * 2 * frequency / rate;
  const envelope = Math.min(1, t / .035) * Math.min(1, (duration - t) / .12);
  const nasal = (Math.sin(phase) + .5 * Math.sin(phase * 2) + .28 * Math.sin(phase * 3) + .15 * Math.sin(phase * 5)) / 1.93;
  const value = nasal * envelope * .7 * (.9 + .1 * Math.sin(t * 55));
  wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value)) * 32767), 44 + i * 2);
}
const output = path.resolve(__dirname, '../assets/audio/goose-honk.wav');
fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, wav);
console.log('Generated assets/audio/goose-honk.wav');
