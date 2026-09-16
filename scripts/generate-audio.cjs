/* Original score and cartoon effects. Rebuild with: node scripts/generate-audio.cjs
   Node built-ins only; stereo PCM WAV also works from a local file:// game. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const SR = 22050, TAU = Math.PI * 2;
const output = path.resolve(__dirname, '..', 'assets', 'audio');
fs.mkdirSync(output, { recursive: true });
let randomState = 0x618dce39;
function noise() { randomState ^= randomState << 13; randomState ^= randomState >>> 17; randomState ^= randomState << 5; return (randomState >>> 0) / 2147483648 - 1; }
function note(name) {
  if (typeof name === 'number') return name;
  const [,letter,sharp,octave] = /^([A-G])(#?)(-?\d+)$/.exec(name);
  const pitch = {C:0,D:2,E:4,F:5,G:7,A:9,B:11}[letter] + (sharp ? 1 : 0);
  return 440 * 2 ** (((Number(octave) + 1) * 12 + pitch - 69) / 12);
}
function track(duration, loop = false) {
  const length = Math.round(duration * SR);
  return { duration: length / SR, loop, length, left: new Float64Array(length), right: new Float64Array(length) };
}
function envelope(t, sustain, attack = .025, release = .09) {
  if (t < attack) return Math.sin(t / attack * Math.PI / 2) ** 2;
  if (t < sustain) return 1;
  return Math.max(0, 1 - (t - sustain) / release) ** 2;
}
function voice(song, type, at, duration, pitch, volume = .15, pan = 0, extra = {}) {
  const f = note(pitch), release = extra.release ?? (['flute','whistle','pad'].includes(type) ? .15 : .24);
  const count = Math.ceil((duration + release) * SR), start = Math.round(at * SR);
  const left = Math.cos((pan + 1) * Math.PI / 4) * volume, right = Math.sin((pan + 1) * Math.PI / 4) * volume;
  let phase = 0, filteredNoise = 0, previousNoise = 0;
  for (let i = 0; i < count; i++) {
    const t = i / SR, progress = t / Math.max(duration, .01);
    let value = 0, frequency = f;
    const vibrato = Math.sin(TAU * (type === 'whistle' ? 5.7 : 4.8) * t) * Math.min(1, t * 5);
    if (type === 'whistle') frequency *= 1 + .0047 * vibrato - .009 * Math.exp(-t * 34);
    if (type === 'flute') frequency *= 1 + .0025 * vibrato - .005 * Math.exp(-t * 25);
    if (type === 'boing') frequency = 115 + 190 * Math.exp(-t * 4.6) + 105 * Math.sin(TAU * 8 * t) * Math.exp(-t * 5);
    if (type === 'pop') frequency = 170 + 800 * Math.exp(-t * 35);
    if (type === 'squeak') frequency = 780 + 460 * Math.sin(Math.min(1, progress) * Math.PI) + 45 * Math.sin(TAU * 16 * t);
    if (type === 'sob') frequency = f * (1 - .22 * progress + .055 * Math.sin(TAU * 7 * t)) * (1 + .035 * Math.sin(TAU * 17 * t));
    if (type === 'chirp') frequency = f * (1.16 - .47 * Math.min(1, progress)) * (1 + .012 * Math.sin(TAU * 19 * t));
    if (type === 'slide') frequency = f * 2 ** (extra.semitones * Math.min(1, progress) / 12);
    phase += TAU * frequency / SR;
    const white = noise(); filteredNoise += (white - filteredNoise) * .16;
    if (type === 'flute' || type === 'whistle') {
      const breath = filteredNoise * (type === 'flute' ? .055 : .024);
      value = (Math.sin(phase) + (type === 'flute' ? .18 : .035) * Math.sin(phase * 2) + .016 * Math.sin(phase * 3) + breath)
        * envelope(t, duration, type === 'flute' ? .042 : .026, release) * (.89 + .11 * Math.exp(-t * 9));
    } else if (type === 'pad') {
      value = (Math.sin(phase) * .73 + Math.sin(phase * 1.0025 + .4) * .18 + Math.sin(phase * 2) * .07)
        * envelope(t, duration, .16, release);
    } else if (type === 'pizz') {
      value = (Math.sin(phase) * Math.exp(-t * 5) + .25 * Math.sin(phase * 2) * Math.exp(-t * 10) + .1 * Math.sin(phase * 3) * Math.exp(-t * 17))
        * envelope(t, duration, .006, release);
    } else if (type === 'marimba' || type === 'bell') {
      const ring = type === 'bell' ? 2.2 : 5.5;
      value = (Math.sin(phase) * Math.exp(-t * ring) + .25 * Math.sin(phase * 3.98) * Math.exp(-t * 14) + .06 * Math.sin(phase * 8.06) * Math.exp(-t * 24))
        * envelope(t, duration, .004, release);
    } else if (type === 'bass') {
      value = (Math.sin(phase) + .17 * Math.sin(phase * 2)) * Math.exp(-t * 2.8) * envelope(t, duration, .012, release);
    } else if (type === 'shaker') {
      value = (white - previousNoise * .8) * Math.exp(-t * 50) * envelope(t, duration, .003, .02);
    } else if (type === 'brush') {
      value = filteredNoise * Math.exp(-t * 22) * envelope(t, duration, .006, .035);
    } else if (type === 'kick') {
      value = Math.sin(TAU * (62 * t + 2.3 * (1 - Math.exp(-t * 22)))) * Math.exp(-t * 25) * envelope(t, duration, .004, .03);
    } else if (type === 'boing') {
      value = (Math.sin(phase) + .24 * Math.sin(phase * 2.03)) * Math.exp(-t * 5.3) * envelope(t, duration, .008, release);
    } else if (type === 'pop') {
      value = (Math.sin(phase) * .85 + filteredNoise * .18) * Math.exp(-t * 31) * envelope(t, duration, .0025, release);
    } else if (type === 'bonk') {
      value = (Math.sin(phase) + .48 * Math.sin(phase * 1.91) + .16 * Math.sin(phase * 3.43)) * Math.exp(-t * 19) * envelope(t, duration, .003, release);
    } else if (type === 'squeak') {
      value = (Math.sin(phase) + .06 * Math.sin(phase * 2)) * envelope(t, duration, .025, release) * (.76 + .18 * Math.sin(TAU * 15 * t));
    } else if (type === 'sob') {
      value = (Math.sin(phase) + .23 * Math.sin(phase * 2) + .06 * Math.sin(phase * 3) + filteredNoise * .11)
        * envelope(t, duration, .065, release) * (.65 + .3 * Math.sin(TAU * 5.3 * t) ** 2);
    } else if (type === 'chirp') {
      value = (Math.sin(phase) + .025 * Math.sin(phase * 2)) * envelope(t, duration, .013, release);
    } else if (type === 'slide') {
      value = (Math.sin(phase) + .05 * Math.sin(phase * 2)) * envelope(t, duration, .014, release);
    }
    previousNoise = white;
    const index = start + i;
    if (!song.loop && index >= song.length) break;
    const target = ((index % song.length) + song.length) % song.length;
    song.left[target] += value * left; song.right[target] += value * right;
  }
}
function room(song, amount = .13) {
  const sourceL = song.left.slice(), sourceR = song.right.slice();
  // Circular taps preserve the final note's room tail across the music loop boundary.
  const taps = [[.041,.65],[.079,.45],[.127,.32],[.193,.24],[.293,.15],[.419,.085]];
  for (const [seconds, gain] of taps) {
    const delay = Math.round(seconds * SR);
    for (let i = 0; i < song.length; i++) {
      if (!song.loop && i < delay) continue;
      const previous = (i - delay + song.length) % song.length;
      song.left[i] += sourceR[previous] * gain * amount;
      song.right[i] += sourceL[previous] * gain * amount;
    }
  }
}
function finish(song, music) {
  room(song, music ? .16 : .095);
  const silentEdge = Math.round((song.silentEdge ?? 0) * SR);
  const fadeAt = i => song.loop ? 1 : Math.max(0, Math.min(1, (i - silentEdge) / (SR*.004), (song.length-1-i-silentEdge)/(SR*.018)));
  let square = 0, peak = 0;
  for (const channel of [song.left, song.right]) {
    const raw = channel.slice(); let mean = 0;
    for (let i = 0; i < song.length; i++) {
      const p1 = i ? raw[i-1] : song.loop ? raw[song.length-1] : 0;
      const p2 = i > 1 ? raw[i-2] : song.loop ? raw[(i-2+song.length)%song.length] : 0;
      channel[i] = raw[i] * .64 + p1 * .25 + p2 * .11; mean += channel[i];
    }
    // Remove the mean after accounting for the endpoint fade, so even short
    // asymmetric impacts remain centered without introducing a new edge step.
    mean = 0; let weight = 0;
    for (let i = 0; i < song.length; i++) {
      const fade = fadeAt(i);
      mean += channel[i] * fade; weight += fade;
    }
    mean /= weight;
    for (let i = 0; i < song.length; i++) {
      channel[i] -= mean;
      if (!song.loop) channel[i] *= fadeAt(i);
      if (!Number.isFinite(channel[i])) throw new Error('Non-finite audio sample');
      square += channel[i] ** 2; peak = Math.max(peak, Math.abs(channel[i]));
    }
  }
  const rms = Math.sqrt(square / (song.length * 2));
  // Peak cap applies before runtime volume; never aggressively boost a quiet effect.
  const gain = Math.min(music ? 1.8 : 1.2, .60 / peak, (music ? .108 : .12) / rms);
  for (const channel of [song.left, song.right]) for (let i = 0; i < song.length; i++) channel[i] *= gain;
  return song;
}
function wav(song) {
  const bytes = song.length * 4, out = Buffer.alloc(44 + bytes);
  out.write('RIFF',0);out.writeUInt32LE(36+bytes,4);out.write('WAVEfmt ',8);out.writeUInt32LE(16,16);out.writeUInt16LE(1,20);out.writeUInt16LE(2,22);
  out.writeUInt32LE(SR,24);out.writeUInt32LE(SR*4,28);out.writeUInt16LE(4,32);out.writeUInt16LE(16,34);out.write('data',36);out.writeUInt32LE(bytes,40);
  for(let i=0;i<song.length;i++){out.writeInt16LE(Math.round(song.left[i]*32767),44+i*4);out.writeInt16LE(Math.round(song.right[i]*32767),46+i*4);}
  return out;
}
function validate(buffer, loop) {
  if(buffer.toString('ascii',0,4)!=='RIFF'||buffer.toString('ascii',8,12)!=='WAVE'||buffer.readUInt16LE(20)!==1||buffer.readUInt16LE(22)!==2||buffer.readUInt32LE(24)!==SR||buffer.readUInt16LE(34)!==16) throw new Error('Invalid WAV header');
  const length=buffer.readUInt32LE(40)/4;
  if(buffer.length!==44+length*4) throw new Error('Incorrect PCM byte length');
  let peak=0,square=0,zero=0,dcL=0,dcR=0,maxDelta=0;
  let prevL=0,prevR=0;
  for(let i=0;i<length;i++){
    const l=buffer.readInt16LE(44+i*4)/32768,r=buffer.readInt16LE(46+i*4)/32768;
    peak=Math.max(peak,Math.abs(l),Math.abs(r));square+=l*l+r*r;dcL+=l;dcR+=r;if(l===0&&r===0)zero++;
    if(i)maxDelta=Math.max(maxDelta,Math.abs(l-prevL),Math.abs(r-prevR));prevL=l;prevR=r;
  }
  const edgeDelta=Math.max(Math.abs(prevL-buffer.readInt16LE(44)/32768),Math.abs(prevR-buffer.readInt16LE(46)/32768));
  const rms=Math.sqrt(square/(length*2)), dc=Math.max(Math.abs(dcL/length),Math.abs(dcR/length));
  if(peak>.605||rms<.001||zero===length) throw new Error('Clipped or empty audio');
  if(dc>.0001)throw new Error('Excessive DC offset');
  if(loop&&edgeDelta>Math.max(.012,maxDelta*1.1))throw new Error('Discontinuous loop boundary');
  return {durationSeconds:length/SR,bytes:buffer.length,peak:+peak.toFixed(5),rms:+rms.toFixed(5),dcOffset:+dc.toFixed(8),loopBoundaryDelta:+edgeDelta.toFixed(6),maxSampleDelta:+maxDelta.toFixed(6),clippedSamples:0};
}
const files=[];
function save(name,song,description,meta={}) {
  finish(song,!!meta.music);const buffer=wav(song);const file=path.join(output,name);fs.writeFileSync(file,buffer);
  const analysis=validate(fs.readFileSync(file),song.loop);
  if (song.silentEdge) {
    const edgeFrames = Math.floor(song.silentEdge * SR);
    for (let i = 0; i < edgeFrames; i++) for (const frame of [i, song.length - 1 - i]) {
      if (buffer.readInt16LE(44 + frame * 4) !== 0 || buffer.readInt16LE(46 + frame * 4) !== 0) throw new Error('Animal call must have silent edges');
    }
    analysis.silentEdgeSeconds = song.silentEdge;
  }
  files.push({file:name,description,loop:song.loop,sampleRate:SR,channels:2,bitsPerSample:16,...meta,...analysis});
  console.log(`${name}: ${analysis.durationSeconds.toFixed(2)} s, peak ${analysis.peak}, RMS ${analysis.rms}, boundary ${analysis.loopBoundaryDelta}`);
}

// "Trilha do Bosque": 24 bars in 6/8, dotted-quarter = 60, original A/B/A' melody.
// Notes are deliberately composed here, with no quotations or sampled recordings.
const forest=track(48,true), eighth=1/3, bar=2;
const forestChords=[['G3','B3','D4'],['E3','G3','B3'],['C3','E3','G3'],['D3','F#3','A3'],['E3','G3','B3'],['C3','E3','G3'],['A3','C4','E4'],['D3','F#3','A3']];
const melodyA=[
  [[0,1,'G4'],[1,1,'B4'],[2,1.7,'D5'],[4,.8,'B4'],[5,.8,'A4']],
  [[0,2.5,'E5'],[3,1,'D5'],[4,1,'B4'],[5,.8,'G4']],
  [[0,1,'C5'],[1,1,'E5'],[2,1.8,'G5'],[4,1,'E5'],[5,.8,'D5']],
  [[0,1.7,'B4'],[2,.8,'A4'],[3,2.6,'D5']],
  [[0,1,'E5'],[1,1.7,'G5'],[3,.8,'E5'],[4,1,'D5'],[5,.8,'B4']],
  [[0,1.5,'C5'],[2,1,'B4'],[3,1,'A4'],[4,1.7,'G4']],
  [[0,.8,'A4'],[1,.8,'C5'],[2,1,'E5'],[3,1.8,'D5'],[5,.8,'C5']],
  [[0,1.8,'F#4'],[2,.8,'A4'],[3,2.2,'D5']],
];
const melodyB=[
  [[0,1.7,'D5'],[2,.8,'G5'],[3,1.7,'B5'],[5,.8,'A5']],
  [[0,2.5,'G5'],[3,1,'E5'],[4,1.7,'B4']],
  [[0,1,'E5'],[1,1,'D5'],[2,1.7,'C5'],[4,.8,'G4'],[5,.8,'C5']],
  [[0,1.8,'A4'],[2,.8,'D5'],[3,1.7,'F#5'],[5,.8,'E5']],
  [[0,1.7,'G5'],[2,.8,'B5'],[3,1,'A5'],[4,1.7,'G5']],
  [[0,2.5,'E5'],[3,1,'D5'],[4,1.7,'C5']],
  [[0,.8,'A4'],[1,.8,'B4'],[2,1,'C5'],[3,1.7,'E5'],[5,.8,'C5']],
  [[0,1.7,'D5'],[2,.8,'A4'],[3,1,'F#4'],[4,1.7,'A4']],
];
for(let b=0;b<24;b++){
  const chord=forestChords[b%8],start=b*bar,section=Math.floor(b/8);
  chord.forEach((pitch,i)=>voice(forest,'pad',start,1.83,pitch,.035,i*.36-.36,{release:.28}));
  for(const beat of [0,3])voice(forest,'bass',start+beat*eighth,.77,note(chord[beat?2:0])/2,.118,-.18);
  for(const [index,beat] of [0,2,3,5].entries())voice(forest,'pizz',start+beat*eighth,.37,chord[(index+b)%3],.07, index%2?.35:-.4);
  for(let beat=0;beat<6;beat++)voice(forest,'shaker',start+beat*eighth,.057,900,beat%3===0?.022:.014,.38,{release:.025});
  voice(forest,'kick',start,.095,70,.06,-.06,{release:.04});
  voice(forest,'brush',start+1,.07,200,.07,.1,{release:.04});
  const phrase=(section===1?melodyB:melodyA)[b%8];
  phrase.forEach(([beat,length,pitch],j)=>{
    const variation=section===2&&b%8===1&&j===0?'G5':pitch;
    voice(forest,'flute',start+beat*eighth,length*eighth*.92,variation,.169,Math.sin(b*.7)*.11);
  });
  if(b%2===1)for(const beat of [4.5,5.5])voice(forest,'marimba',start+beat*eighth,.22,note(chord[b%3])*2,.047,-.42);
}
save('forest.wav',forest,'Trilha do Bosque — original lilting forest folk melody, breathy flute, plucked strings, wooden marimba and gentle percussion.',{music:true,bpm:90,timeSignature:'6/8',bars:24,title:'Trilha do Bosque'});

// "Passeio da Galinha": original jaunty whistle with a lightly swung eight-note pulse.
const whistle=track(32,true), hop=.25;
const whistleChords=[['F3','A3','C4'],['C3','E3','G3'],['D3','F3','A3'],['G3','A#3','D4'],['A#2','D3','F3'],['F3','A3','C4'],['G3','A#3','D4'],['C3','E3','G3']];
const whistleMelody=[
  [[0,1.6,'F5'],[2,.8,'A5'],[3,.8,'G5'],[4,1.5,'F5'],[6,.8,'D5'],[7,.7,'C5']],
  [[0,.8,'E5'],[1,.8,'G5'],[2,1.6,'C6'],[4,1.5,'G5'],[6,1.3,'E5']],
  [[0,1.6,'D5'],[2,.8,'F5'],[3,.8,'A5'],[4,2.7,'F5']],
  [[1,.8,'G5'],[2,.8,'A5'],[3,.8,'A#5'],[4,1.6,'A5'],[6,1.3,'G5']],
  [[0,1.6,'F5'],[2,1.4,'D5'],[4,.8,'A#4'],[5,.8,'D5'],[6,1.3,'F5']],
  [[0,.8,'A5'],[1,.8,'G5'],[2,1.6,'F5'],[4,.8,'C5'],[5,.8,'D5'],[6,1.3,'F5']],
  [[0,1.6,'G5'],[2,.8,'A#5'],[3,.8,'A5'],[4,1.6,'G5'],[6,1.3,'D5']],
  [[0,1.6,'E5'],[2,1.3,'G5'],[4,.8,'E5'],[5,.8,'D5'],[6,1.3,'C5']],
];
for(let b=0;b<16;b++){
  const chord=whistleChords[b%8],start=b*2;
  for(let beat=0;beat<4;beat++){
    voice(whistle,'bass',start+beat*.5,.32,note(chord[beat%2?2:0])/2,.105,-.15);
    voice(whistle,'brush',start+beat*.5+.25,.055,300,.05,.18,{release:.035});
    chord.forEach((pitch,i)=>voice(whistle,'pizz',start+beat*.5+.28,.18,pitch,.042,-.38+i*.36));
  }
  whistleMelody[b%8].forEach(([beat,length,pitch],j)=>{
    const swung=beat%2?.03:0;
    const variation=b>=8&&b%8===2&&j===3?'A5':pitch;
    voice(whistle,'whistle',start+beat*hop+swung,length*hop*.87,variation,.185,.06);
    if(b>=8&&j===0)voice(whistle,'marimba',start+beat*hop,.25,note(variation)/2,.041,-.4);
  });
  if(b%4===3){voice(whistle,'chirp',start+1.84,.075,1250,.04,-.45,{release:.025});}
}
save('whistle.wav',whistle,'Passeio da Galinha — original cheerful whistled tune with bouncing bass, plucked accompaniment and tiny chicken chirps.',{music:true,bpm:120,timeSignature:'4/4',bars:16,title:'Passeio da Galinha'});

function effect(name,duration,description,build){const song=track(duration);if(name.startsWith('animal-'))song.silentEdge=.015;build(song);save(name+'.wav',song,description);}
effect('boing',.65,'Soft rubbery spring bounce.',s=>voice(s,'boing',0,.47,200,.44,0,{release:.12}));
effect('pop',.22,'Small rounded bubble pop.',s=>voice(s,'pop',0,.12,440,.47,0,{release:.06}));
effect('bonk',.36,'Hollow wooden comic bonk, without a sharp realistic impact.',s=>voice(s,'bonk',0,.19,184,.40,0,{release:.1}));
effect('squeak',.52,'Silly rubber-toy pitch bend.',s=>voice(s,'squeak',0,.32,1000,.22,0,{release:.12}));
effect('dizzy',1.55,'A tiny tumbling bell constellation.',s=>['G6','E6','C6','A5','F5'].forEach((p,i)=>voice(s,'bell',i*.19,.3,p,.17,i%2?.38:-.38,{release:.35})));
effect('sob',1.42,'Three synthetic cartoon whimpers with a trembling pitch.',s=>{voice(s,'sob',.01,.34,390,.24,-.05,{release:.14});voice(s,'sob',.48,.28,350,.23,.05,{release:.13});voice(s,'sob',.93,.31,315,.22,0,{release:.14});});
effect('runaway',1.15,'Hurrying little wooden footsteps and a slide whistle.',s=>{for(let i=0;i<7;i++)voice(s,'bonk',i*.095,.07,160+i*24,.2,i%2?.18:-.18,{release:.04});voice(s,'slide',.45,.48,850,.14,.2,{semitones:9,release:.12});});
effect('rescue',1.15,'A warm four-note rescue chime.',s=>['G5','B5','D6','G6'].forEach((p,i)=>voice(s,'bell',i*.14,.29,p,.19,i*.12-.18,{release:.37})));
effect('chick',.37,'Two small soft peeps for a chick.',s=>{voice(s,'chirp',0,.092,1470,.16,-.08,{release:.034});voice(s,'chirp',.17,.104,1640,.145,.08,{release:.036});});
effect('victory',1.95,'Original short woodland celebration fanfare.',s=>{
  ['G4','B4','D5'].forEach((p,i)=>voice(s,'pizz',0,.42,p,.12,i*.25-.25));
  [['G5',0,.25],['B5',.29,.25],['D6',.57,.33],['G5',.94,.65]].forEach(([p,t,d])=>voice(s,'flute',t,d,p,.18,.05));
  ['G4','B4','D5','G5'].forEach((p,i)=>voice(s,'bell',.94+i*.022,.45,p,.12,i*.18-.27,{release:.5}));
  voice(s,'brush',.95,.12,300,.10,.1,{release:.07});
});

// Animal calls use a vocal source shaped by moving mouth resonances. These
// differ in articulation, breath, roughness and rhythm, not just oscillator pitch.
function curve(points, position) {
  if (position <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    if (position <= points[i][0]) {
      const [a, x] = points[i - 1], [b, y] = points[i];
      const mix = (position - a) / (b - a);
      return x + (y - x) * mix;
    }
  }
  return points[points.length - 1][1];
}
function animalVoice(song, at, duration, options) {
  const start = Math.round(at * SR), count = Math.round(duration * SR);
  const volume = options.volume ?? .3, pitch = options.pitch;
  const mouths = options.mouths;
  const formantCurves = [0,1,2].map(index => mouths.map(([time, values]) => [time, values[index]]));
  const bandwidth = options.bandwidth ?? [95,150,260];
  const weights = new Float64Array(40), shimmer = options.shimmer ?? .07;
  let phase = 0, lowNoise = 0, slowNoise = 0, weightNorm = 1;
  const attack = options.attack ?? .04, release = options.release ?? .16;
  for (let i = 0; i < count && start + i < song.length; i++) {
    const time = i / SR, position = i / (count - 1), white = noise();
    lowNoise += (white - lowNoise) * .19;
    slowNoise += (white - slowNoise) * .013;
    const tremble = Math.sin(TAU * (options.vibrato ?? 5.4) * time);
    const frequency = curve(pitch, position) * (1 + (options.wobble ?? .018) * tremble + (options.jitter ?? .008) * slowNoise);
    phase += TAU * frequency / SR;
    if (i % 32 === 0) {
      weightNorm = 0;
      const formants = formantCurves.map(points => curve(points, position));
      for (let harmonic = 1; harmonic < weights.length; harmonic++) {
        const hz = harmonic * frequency;
        let weight = .035 / harmonic;
        for (let band = 0; band < 3; band++) {
          weight += [.95,.65,.3][band] * Math.exp(-.5 * ((hz - formants[band]) / bandwidth[band]) ** 2) / Math.sqrt(harmonic);
        }
        weights[harmonic] = hz < SR * .42 ? weight : 0;
        weightNorm += weights[harmonic] ** 2;
      }
      weightNorm = Math.sqrt(Math.max(weightNorm, .01));
    }
    let sound = 0;
    for (let harmonic = 1; harmonic < weights.length; harmonic++) {
      sound += Math.sin(phase * harmonic + harmonic * .13) * weights[harmonic];
    }
    sound /= weightNorm;
    // Low subharmonics make barks, grunts and a donkey's exhalation rougher.
    sound = sound * (1 - (options.rough ?? 0)) + Math.sin(phase * .5) * (options.rough ?? 0) * 1.7;
    sound += lowNoise * (options.breath ?? .04) * (1 + .7 * Math.sin(phase));
    sound *= 1 - shimmer + shimmer * Math.sin(TAU * (options.pulse ?? 8) * time);
    const shape = Math.sin(Math.min(1, time / attack) * Math.PI / 2) ** 2
      * Math.sin(Math.min(1, (duration - time) / release) * Math.PI / 2) ** 2
      * curve(options.loudness ?? [[0,.8],[.3,1],[1,.5]], position);
    const value = Math.tanh(sound * .85) * shape * volume;
    song.left[start + i] += value * .7071;
    song.right[start + i] += value * .7071;
  }
}
const mouth = (start, middle, end = middle) => [[0,start],[.4,middle],[1,end]];

effect('animal-sheep',1.25,'Sheep: a warm, throaty baa with a fluttering open vowel.',s=>animalVoice(s,.035,1.08,{
  pitch:[[0,215],[.18,275],[.68,238],[1,190]], mouths:mouth([280,780,2100],[680,1180,2400],[470,1020,2200]),
  wobble:.041,vibrato:8.3,shimmer:.15,pulse:8.3,rough:.11,volume:.34,release:.23
}));
effect('animal-pig',.94,'Pig: two low nasal oinks with breathy snorting attacks.',s=>{
  for (const [at,duration,pitch] of [[.035,.32,152],[.48,.34,132]]) animalVoice(s,at,duration,{
    pitch:[[0,pitch*1.23],[.15,pitch],[.55,pitch*.83],[1,pitch*.68]], mouths:mouth([380,1120,2450],[580,860,2200],[330,700,1800]),
    bandwidth:[170,190,330],attack:.017,release:.095,breath:.8,rough:.34,shimmer:.18,pulse:21,wobble:.075,jitter:.12,volume:.38
  });
});
effect('animal-goat',1.19,'Goat: two bright nasal meh calls with a quick, strongly wavering bleat.',s=>{
  for (const [at,duration,pitch] of [[.035,.35,310],[.48,.56,290]]) animalVoice(s,at,duration,{
    pitch:[[0,pitch*.85],[.15,pitch*1.2],[.8,pitch],[1,pitch*.8]], mouths:mouth([420,1620,2850],[580,1800,3000],[480,1610,2720]),
    bandwidth:[95,170,230],wobble:.10,vibrato:12,shimmer:.23,pulse:12,rough:.045,volume:.31,attack:.018,release:.11
  });
});
effect('animal-cow',1.6,'Cow: a deep rounded moo, opening slowly and falling into a closed hum.',s=>animalVoice(s,.035,1.42,{
  pitch:[[0,94],[.2,115],[.5,123],[.8,96],[1,79]], mouths:mouth([180,430,1700],[400,740,1900],[190,480,1550]),
  bandwidth:[90,140,230],rough:.16,breath:.045,wobble:.022,vibrato:4.4,shimmer:.035,volume:.38,attack:.15,release:.32
}));
effect('animal-duck',.91,'Duck: two scratchy, flat-billed quacks with a steep clipped pitch fall.',s=>{
  for (const [at,duration,base] of [[.035,.3,430],[.46,.3,390]]) animalVoice(s,at,duration,{
    pitch:[[0,base*1.12],[.17,base],[.5,base*.67],[1,base*.45]], mouths:mouth([700,1280,3100],[830,1500,3300],[670,1180,2600]),
    bandwidth:[220,240,380],rough:.18,breath:.65,jitter:.16,wobble:.045,shimmer:.22,pulse:32,volume:.31,attack:.012,release:.10,
    loudness:[[0,.35],[.13,1],[.6,.85],[1,.2]]
  });
});
effect('animal-rabbit',1.0,'Rabbit: a quiet low purr and three soft friendly nasal grunts.',s=>{
  for (const [at,duration] of [[.04,.26],[.36,.23],[.67,.20]]) animalVoice(s,at,duration,{
    pitch:[[0,180],[.45,205],[1,158]], mouths:mouth([190,680,1500],[280,720,1560],[210,650,1490]),
    bandwidth:[100,160,280],rough:.31,breath:.23,wobble:.012,shimmer:.34,pulse:25,volume:.20,attack:.055,release:.09
  });
});
effect('animal-dog',1.02,'Dog: a pair of cheerful woof barks, with a chesty attack and rough falling tail.',s=>{
  for (const [at,duration,base] of [[.035,.32,190],[.49,.36,170]]) animalVoice(s,at,duration,{
    pitch:[[0,base*.72],[.045,base*1.42],[.2,base],[1,base*.64]], mouths:mouth([430,900,2300],[680,1280,2700],[320,720,1700]),
    bandwidth:[185,260,380],rough:.28,breath:.48,jitter:.13,shimmer:.08,pulse:33,wobble:.035,volume:.38,attack:.012,release:.16,
    loudness:[[0,.6],[.06,1],[.25,.88],[1,.14]]
  });
});
effect('animal-cat',1.36,'Cat: a clear upward meow turning from a bright ee into an open ah and rounded ow.',s=>animalVoice(s,.035,1.18,{
  pitch:[[0,430],[.13,670],[.3,740],[.48,630],[.76,400],[1,310]],
  mouths:[[0,[310,2280,3120]],[.18,[420,2200,3090]],[.48,[880,1480,2760]],[.75,[570,950,2210]],[1,[320,740,1900]]],
  bandwidth:[155,220,330],rough:.045,breath:.045,wobble:.028,vibrato:7.6,shimmer:.045,volume:.32,attack:.08,release:.25
}));
effect('animal-donkey',1.73,'Donkey: an exaggerated high nasal hee followed by a coarse low haw.',s=>{
  animalVoice(s,.035,.64,{
    pitch:[[0,280],[.15,480],[.65,575],[1,450]], mouths:mouth([380,2130,3180],[420,2280,3280],[500,1920,2980]),
    bandwidth:[140,180,270],wobble:.06,vibrato:9.5,shimmer:.14,pulse:9.5,breath:.18,volume:.30,attack:.08,release:.12
  });
  animalVoice(s,.75,.81,{
    pitch:[[0,235],[.17,195],[.6,155],[1,105]], mouths:mouth([630,1020,2380],[760,1250,2640],[370,720,1800]),
    bandwidth:[160,240,340],wobble:.085,vibrato:6.2,shimmer:.18,pulse:6.2,rough:.28,breath:.23,volume:.36,attack:.035,release:.23
  });
});
effect('animal-lamb',.99,'Lamb: two small, soft, high baa syllables, lighter and shorter than the adult sheep.',s=>{
  for (const [at,duration,base] of [[.035,.3,410],[.44,.4,440]]) animalVoice(s,at,duration,{
    pitch:[[0,base*.86],[.17,base*1.1],[.6,base],[1,base*.82]], mouths:mouth([450,1330,2800],[770,1520,3020],[500,1240,2690]),
    bandwidth:[170,210,330],wobble:.035,vibrato:9,shimmer:.11,pulse:9,rough:.025,breath:.035,volume:.27,attack:.035,release:.14
  });
});

const totalBytes=files.reduce((sum,file)=>sum+file.bytes,0);
if(totalBytes>10000000)throw new Error(`Audio package exceeds 10 MB: ${totalBytes}`);
const manifest={
  format:'Stereo, 22050 Hz, signed 16-bit PCM WAV',
  generator:'scripts/generate-audio.cjs',
  composition:'All melodies, arrangements and synthesized sound effects were created for Galinha Guardiã. No recordings, samples or melodies from existing games or songs are included.',
  mastering:'Gentle peak cap at 0.60; moderate RMS, DC removal, soft transients. Music release and room tails wrap around loop boundaries.',
  verification:'Re-read every generated WAV, validated headers, sample lengths, non-silence, clipping, DC and music loop continuity. Technical verification only; no listening audition was available in this environment.',
  totalBytes,files,
};
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Validated ${files.length} original assets, ${(totalBytes/1000000).toFixed(2)} MB total.`);
