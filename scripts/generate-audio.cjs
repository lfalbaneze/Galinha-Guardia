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
      value = (Math.sin(phase) + .025 * Math.sin(phase * 2)) * envelope(t, duration, extra.attack ?? .013, release);
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

function effect(name,duration,description,build){const song=track(duration);if(name.startsWith('animal-')||name==='chick')song.silentEdge=.015;build(song);save(name+'.wav',song,description);}
effect('boing',.65,'Soft rubbery spring bounce.',s=>voice(s,'boing',0,.47,200,.44,0,{release:.12}));
effect('pop',.22,'Small rounded bubble pop.',s=>voice(s,'pop',0,.12,440,.47,0,{release:.06}));
effect('bonk',.36,'Hollow wooden comic bonk, without a sharp realistic impact.',s=>voice(s,'bonk',0,.19,184,.40,0,{release:.1}));
effect('squeak',.52,'Silly rubber-toy pitch bend.',s=>voice(s,'squeak',0,.32,1000,.22,0,{release:.12}));
effect('dizzy',1.55,'A tiny tumbling bell constellation.',s=>['G6','E6','C6','A5','F5'].forEach((p,i)=>voice(s,'bell',i*.19,.3,p,.17,i%2?.38:-.38,{release:.35})));
effect('sob',1.42,'Three synthetic cartoon whimpers with a trembling pitch.',s=>{voice(s,'sob',.01,.34,390,.24,-.05,{release:.14});voice(s,'sob',.48,.28,350,.23,.05,{release:.13});voice(s,'sob',.93,.31,315,.22,0,{release:.14});});
effect('runaway',1.15,'Hurrying little wooden footsteps and a slide whistle.',s=>{for(let i=0;i<7;i++)voice(s,'bonk',i*.095,.07,160+i*24,.2,i%2?.18:-.18,{release:.04});voice(s,'slide',.45,.48,850,.14,.2,{semitones:9,release:.12});});
effect('rescue',1.15,'A warm four-note rescue chime.',s=>['G5','B5','D6','G6'].forEach((p,i)=>voice(s,'bell',i*.14,.29,p,.19,i*.12-.18,{release:.37})));
// Keep the two voice lengths unchanged to preserve the following effects' random stream.
effect('chick',.43,'Chick: two tiny rounded peeps, with gentle attacks and a playful rising answer.',s=>{voice(s,'chirp',.025,.092,1190,.135,-.06,{release:.034,attack:.027});voice(s,'chirp',.215,.104,1320,.12,.06,{release:.036,attack:.027});});
effect('victory',1.95,'Original short woodland celebration fanfare.',s=>{
  ['G4','B4','D5'].forEach((p,i)=>voice(s,'pizz',0,.42,p,.12,i*.25-.25));
  [['G5',0,.25],['B5',.29,.25],['D6',.57,.33],['G5',.94,.65]].forEach(([p,t,d])=>voice(s,'flute',t,d,p,.18,.05));
  ['G4','B4','D5','G5'].forEach((p,i)=>voice(s,'bell',.94+i*.022,.45,p,.12,i*.18-.27,{release:.5}));
  voice(s,'brush',.95,.12,300,.10,.1,{release:.07});
});

// Young cartoon voices retain each animal's mouth shape and syllable rhythm.
// A stronger fundamental, restrained upper formants and smooth amplitude ramps
// keep them rounded and friendly without reducing every call to a pitched beep.
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
  const volume = options.volume ?? .24, pitch = options.pitch;
  const mouths = options.mouths;
  const formantCurves = [0,1,2].map(index => mouths.map(([time, values]) => [time, values[index]]));
  const bandwidth = options.bandwidth ?? [140,210,320];
  const weights = new Float64Array(28), shimmer = options.shimmer ?? .035;
  const color = options.color ?? [.95,.38,.10];
  const cutoff = options.cutoff ?? 2400;
  const smoothing = 1 - Math.exp(-TAU * cutoff / SR);
  let phase = 0, lowNoise = 0, slowNoise = 0, rounded = 0, weightNorm = 1;
  const attack = options.attack ?? .065, release = options.release ?? .17;
  for (let i = 0; i < count && start + i < song.length; i++) {
    const time = i / SR, position = i / (count - 1), white = noise();
    lowNoise += (white - lowNoise) * .10;
    slowNoise += (white - slowNoise) * .013;
    const tremble = Math.sin(TAU * (options.vibrato ?? 5.4) * time);
    const frequency = curve(pitch, position) * (1 + (options.wobble ?? .01) * tremble + (options.jitter ?? .004) * slowNoise);
    phase += TAU * frequency / SR;
    if (i % 32 === 0) {
      weightNorm = 0;
      const formants = formantCurves.map(points => curve(points, position));
      for (let harmonic = 1; harmonic < weights.length; harmonic++) {
        const hz = harmonic * frequency;
        let weight = .065 / harmonic + (harmonic === 1 ? .38 : harmonic === 2 ? .075 : 0);
        for (let band = 0; band < 3; band++) {
          weight += color[band] * Math.exp(-.5 * ((hz - formants[band]) / bandwidth[band]) ** 2) / Math.sqrt(harmonic);
        }
        weights[harmonic] = hz < SR * .42 ? weight * Math.exp(-(harmonic - 1) * .085) : 0;
        weightNorm += weights[harmonic] ** 2;
      }
      weightNorm = Math.sqrt(Math.max(weightNorm, .01));
    }
    let sound = 0;
    for (let harmonic = 1; harmonic < weights.length; harmonic++) {
      sound += Math.sin(phase * harmonic + harmonic * .13) * weights[harmonic];
    }
    sound /= weightNorm;
    // Just a hint of soft throat texture: no growling sub-bass or hard distortion.
    sound = sound * (1 - (options.rough ?? 0)) + Math.sin(phase * .5) * (options.rough ?? 0) * .65;
    sound += lowNoise * (options.breath ?? .035) * (1 + .35 * Math.sin(phase));
    sound *= 1 - shimmer + shimmer * Math.sin(TAU * (options.pulse ?? 7) * time);
    rounded += (sound - rounded) * smoothing;
    const shape = Math.sin(Math.min(1, time / attack) * Math.PI / 2) ** 2
      * Math.sin(Math.min(1, (duration - time) / release) * Math.PI / 2) ** 2
      * curve(options.loudness ?? [[0,.65],[.3,1],[1,.38]], position);
    const value = Math.tanh(rounded * .62) * shape * volume;
    song.left[start + i] += value * .7071;
    song.right[start + i] += value * .7071;
  }
}
const mouth = (start, middle, end = middle) => [[0,start],[.4,middle],[1,end]];

effect('animal-sheep',.94,'Sheep: one cuddly, rounded baa with a little gentle flutter.',s=>animalVoice(s,.04,.77,{
  pitch:[[0,280],[.22,340],[.63,314],[1,265]], mouths:mouth([340,920,2020],[620,1190,2220],[440,950,2040]),
  wobble:.016,vibrato:6.8,shimmer:.045,pulse:6.8,rough:.018,volume:.34,attack:.085,release:.20
}));
effect('animal-pig',.79,'Piglet: two soft oink-oinks, with a tiny rounded snuffle and no coarse growl.',s=>{
  for (const [at,duration,pitch] of [[.035,.265,285],[.385,.28,315]]) animalVoice(s,at,duration,{
    pitch:[[0,pitch*.96],[.2,pitch*1.08],[.64,pitch*.9],[1,pitch*.82]], mouths:mouth([340,980,2210],[560,890,2120],[340,720,1820]),
    bandwidth:[180,220,330],attack:.045,release:.105,breath:.16,rough:.035,shimmer:.055,pulse:16,wobble:.013,jitter:.018,volume:.34,cutoff:2100
  });
});
effect('animal-goat',.90,'Young goat: two sweet meh calls with a light quick wobble, softened nasal vowels.',s=>{
  for (const [at,duration,pitch] of [[.035,.29,390],[.40,.36,415]]) animalVoice(s,at,duration,{
    pitch:[[0,pitch*.90],[.23,pitch*1.08],[.72,pitch],[1,pitch*.88]], mouths:mouth([420,1410,2520],[580,1540,2720],[470,1380,2440]),
    bandwidth:[165,240,340],wobble:.022,vibrato:9.5,shimmer:.06,pulse:9.5,rough:.012,volume:.33,attack:.052,release:.12,color:[.95,.34,.09]
  });
});
effect('animal-cow',1.16,'Calf: a small warm moo, opening into a soft smile and closing to a hum.',s=>animalVoice(s,.04,.98,{
  pitch:[[0,190],[.22,242],[.51,250],[.82,208],[1,183]], mouths:mouth([230,570,1590],[410,820,1900],[260,630,1550]),
  bandwidth:[145,195,300],rough:.018,breath:.04,wobble:.009,vibrato:4.6,shimmer:.02,volume:.34,attack:.13,release:.26,cutoff:2000
}));
effect('animal-duck',.72,'Duckling: two little rounded quacks with a bouncy fall and a soft bill-like buzz.',s=>{
  for (const [at,duration,base] of [[.035,.24,510],[.36,.245,555]]) animalVoice(s,at,duration,{
    pitch:[[0,base*1.08],[.2,base],[.56,base*.82],[1,base*.69]], mouths:mouth([650,1220,2560],[780,1420,2810],[620,1080,2380]),
    bandwidth:[230,290,380],rough:.023,breath:.16,jitter:.02,wobble:.012,shimmer:.045,pulse:22,volume:.315,attack:.04,release:.095,
    loudness:[[0,.35],[.22,1],[.58,.84],[1,.23]],color:[.95,.31,.085],cutoff:2400
  });
});
effect('animal-rabbit',.78,'Rabbit: three very soft friendly hums, with a tiny purring texture.',s=>{
  for (const [at,duration,base] of [[.04,.20,290],[.30,.18,315],[.545,.14,340]]) animalVoice(s,at,duration,{
    pitch:[[0,base*.95],[.45,base*1.04],[1,base*.92]], mouths:mouth([260,720,1500],[340,790,1620],[280,710,1480]),
    bandwidth:[135,220,330],rough:.026,breath:.065,wobble:.008,shimmer:.075,pulse:20,volume:.275,attack:.05,release:.075,color:[.95,.25,.07],cutoff:1850
  });
});
effect('animal-dog',.80,'Puppy: two friendly little woofs with a cushioned attack and a playful upward answer.',s=>{
  for (const [at,duration,base] of [[.035,.275,335],[.415,.27,375]]) animalVoice(s,at,duration,{
    pitch:[[0,base*.91],[.15,base*1.15],[.4,base],[1,base*.77]], mouths:mouth([420,1000,2140],[650,1370,2450],[340,800,1820]),
    bandwidth:[190,270,370],rough:.045,breath:.12,jitter:.016,shimmer:.035,pulse:19,wobble:.009,volume:.35,attack:.036,release:.14,
    loudness:[[0,.4],[.16,1],[.4,.82],[1,.18]],cutoff:2350
  });
});
effect('animal-cat',1.03,'Kitten: one sweet meow with a gentle rising greeting and a warm rounded ending.',s=>animalVoice(s,.035,.86,{
  pitch:[[0,440],[.2,570],[.39,605],[.60,525],[.82,435],[1,370]],
  mouths:[[0,[330,1940,2770]],[.21,[430,1840,2680]],[.49,[730,1380,2430]],[.75,[520,980,2080]],[1,[350,790,1830]]],
  bandwidth:[185,255,360],rough:.009,breath:.045,wobble:.01,vibrato:5.9,shimmer:.018,volume:.33,attack:.085,release:.23,color:[.95,.40,.10],cutoff:2550
}));
effect('animal-donkey',1.27,'Young donkey: a playful little hee-haw, with a sweet lifted first syllable and warm low answer.',s=>{
  animalVoice(s,.035,.44,{
    pitch:[[0,330],[.2,455],[.65,480],[1,405]], mouths:mouth([360,1830,2770],[430,1950,2830],[470,1690,2570]),
    bandwidth:[175,250,340],wobble:.018,vibrato:7.2,shimmer:.04,pulse:7.2,breath:.075,volume:.32,attack:.075,release:.14,color:[.95,.35,.09]
  });
  animalVoice(s,.57,.56,{
    pitch:[[0,300],[.2,290],[.64,250],[1,215]], mouths:mouth([530,1020,2180],[650,1210,2370],[360,770,1790]),
    bandwidth:[185,265,365],wobble:.017,vibrato:5.8,shimmer:.045,pulse:5.8,rough:.035,breath:.075,volume:.335,attack:.065,release:.19,cutoff:2150
  });
});
effect('animal-lamb',.80,'Baby lamb: two tiny airy baa syllables, delicate and higher than the sheep.',s=>{
  for (const [at,duration,base] of [[.035,.26,465],[.39,.29,495]]) animalVoice(s,at,duration,{
    pitch:[[0,base*.93],[.24,base*1.065],[.62,base],[1,base*.89]], mouths:mouth([430,1160,2490],[670,1380,2680],[470,1090,2330]),
    bandwidth:[195,260,370],wobble:.014,vibrato:7.7,shimmer:.035,pulse:7.7,rough:.006,breath:.05,volume:.30,attack:.055,release:.125,color:[.95,.29,.075],cutoff:2350
  });
});

// Secret costume scores are composed independently, after every existing asset.
// Keep their random stream separate so rebuilding preserves the original WAVs.
randomState = 0x3478ab2d;
function costumeVoice(song, type, at, duration, pitch, volume = .12, pan = 0, options = {}) {
  const frequency = note(pitch), release = options.release ?? .16;
  const count = Math.ceil((duration + release) * SR), start = Math.round(at * SR);
  const left = Math.cos((pan + 1) * Math.PI / 4) * volume;
  const right = Math.sin((pan + 1) * Math.PI / 4) * volume;
  let phase = 0, filteredNoise = 0, previousNoise = 0;
  for (let i = 0; i < count; i++) {
    const t = i / SR, white = noise();
    filteredNoise += (white - filteredNoise) * .21;
    phase += TAU * frequency / SR;
    let value = 0;
    if (type === 'guitar') {
      // A band-limited plucked source, mildly overdriven after its attack.
      const string = Math.sin(phase) + .44 * Math.sin(phase * 2) * Math.exp(-t * 3)
        + .27 * Math.sin(phase * 3) + .11 * Math.sin(phase * 5) * Math.exp(-t * 5);
      value = Math.tanh(string * 2.1) * (.48 + .52 * Math.exp(-t * 5.5))
        * envelope(t, duration, .004, release);
    } else if (type === 'electricBass') {
      value = Math.tanh((Math.sin(phase) + .26 * Math.sin(phase * 2) + .12 * Math.sin(phase * 3)) * 1.7)
        * (.65 + .35 * Math.exp(-t * 7)) * envelope(t, duration, .008, release);
    } else if (type === 'snare') {
      value = ((white - filteredNoise * .6) * Math.exp(-t * 19)
        + Math.sin(TAU * 175 * t) * Math.exp(-t * 34) * .65) * envelope(t, duration, .003, release);
    } else if (type === 'hat') {
      value = (white - previousNoise * .86) * Math.exp(-t * (options.open ? 13 : 65))
        * envelope(t, duration, .002, release);
    } else if (type === 'spacePad') {
      value = (Math.sin(phase) * .60 + Math.sin(phase * 1.003 + .3) * .25
        + Math.sin(phase * 2) * .10 + Math.sin(phase * 3.997) * .035)
        * (.88 + .12 * Math.sin(TAU * .7 * t)) * envelope(t, duration, .40, release);
    } else if (type === 'spaceKey') {
      value = Math.sin(phase + Math.sin(phase * 2) * 1.4 * Math.exp(-t * 5))
        * (.25 + .75 * Math.exp(-t * 4)) * envelope(t, duration, .015, release);
    } else if (type === 'robotBass') {
      const roundedPulse = Math.sin(phase) + .30 * Math.sin(phase * 3) + .11 * Math.sin(phase * 5);
      value = Math.tanh(roundedPulse * 1.7 + Math.sin(phase * 2) * .45 * Math.exp(-t * 17))
        * (.4 + .6 * Math.exp(-t * 7)) * envelope(t, duration, .008, release);
    } else if (type === 'robotKey') {
      value = (Math.sin(phase + Math.sin(phase * 2) * .58) + Math.sin(phase * 3) * .13)
        * Math.exp(-t * 3.2) * envelope(t, duration, .005, release);
    } else if (type === 'organ') {
      value = (Math.sin(phase) * .65 + Math.sin(phase * 2) * .24
        + Math.sin(phase * 3) * .12 + Math.sin(phase * 4) * .08)
        * (.96 + .04 * Math.sin(TAU * 4.2 * t)) * envelope(t, duration, .055, release);
    }
    previousNoise = white;
    const index = ((start + i) % song.length + song.length) % song.length;
    song.left[index] += value * left;
    song.right[index] += value * right;
  }
}

// Penas Rebeldes: a playful original garage-rock riff in E minor, 140 BPM.
// Two choruses keep the same hook, then vary its answer and drum fills.
const punkBeat = 60 / 140, punkBar = punkBeat * 4, punk = track(punkBar * 16, true);
const punkRoots = ['E3','C3','G3','D3','E3','C3','A2','B2'];
const punkMelody = [
  [[0,.7,'E5'],[1,.35,'G5'],[1.5,.35,'E5'],[2,.7,'D5'],[3,.65,'B4']],
  [[0,.35,'G5'],[.5,.35,'E5'],[1,.7,'C5'],[2,.35,'D5'],[2.5,.35,'E5'],[3,.7,'G5']],
  [[0,1.2,'B4'],[1.5,.35,'D5'],[2,.7,'G5'],[3,.7,'F#5']],
  [[0,.7,'E5'],[1,.7,'D5'],[2,.35,'A4'],[2.5,.35,'B4'],[3,.65,'D5']],
  [[0,.35,'E5'],[.5,.35,'G5'],[1,.7,'B5'],[2,.7,'A5'],[3,.7,'G5']],
  [[0,.7,'E5'],[1,.35,'G5'],[1.5,.35,'E5'],[2,.7,'D5'],[3,.7,'C5']],
  [[0,.7,'A4'],[1,.7,'C5'],[2,.35,'E5'],[2.5,.35,'D5'],[3,.65,'C5']],
  [[0,.7,'B4'],[1,.35,'D#5'],[1.5,.35,'F#5'],[2,.7,'D#5'],[3,.65,'B4']],
];
for (let b = 0; b < 16; b++) {
  const start = b * punkBar, root = note(punkRoots[b % 8]);
  for (const beat of [0,.75,1.5,2,2.75,3.5]) {
    for (const [ratio,pan] of [[1,-.52],[1.4983,.49],[2,-.28]]) {
      costumeVoice(punk,'guitar',start + beat * punkBeat,.27 * punkBeat,root * ratio,.081,pan,{release:.045});
    }
  }
  for (let step = 0; step < 8; step++) {
    const at = start + step * punkBeat / 2;
    costumeVoice(punk,'electricBass',at,punkBeat * .33,root / 2 * (step === 6 ? 1.4983 : 1),.139,0,{release:.045});
    costumeVoice(punk,'hat',at,.05,1000,step % 2 ? .027 : .040,.23,{release:.025});
  }
  for (const beat of [0,1.5,2,2.75]) voice(punk,'kick',start + beat * punkBeat,.12,60,.32,-.08,{release:.035});
  for (const beat of [1,3]) costumeVoice(punk,'snare',start + beat * punkBeat,.13,190,.17,.05,{release:.055});
  if (b % 4 === 3) for (const beat of [3.5,3.75]) costumeVoice(punk,'snare',start + beat * punkBeat,.065,190,.105,beat === 3.5 ? -.2 : .2,{release:.03});
  punkMelody[b % 8].forEach(([beat,duration,pitch],i) => {
    const variant = b === 12 && i === 2 ? 'E6' : pitch;
    costumeVoice(punk,'guitar',start + beat * punkBeat,duration * punkBeat,variant,.099,.10,{release:.055});
  });
}
save('skin-punk.wav',punk,'Original playful garage-rock theme with overdriven guitar power chords, a melodic riff, electric bass and energetic drums.',{music:true,skin:'punk',bpm:140,timeSignature:'4/4',bars:16,title:'Penas Rebeldes'});

// Orbita do Galinheiro: weightless major-seventh pads and answering FM keys.
const spaceBeat = .75, spaceBar = spaceBeat * 4, astronaut = track(spaceBar * 8,true);
const spaceChords = [
  ['C3','G3','B3','E4'],['A2','E3','G3','B3'],['F2','C3','E3','A3'],['G2','D3','A3','B3'],
  ['E3','G3','B3','D4'],['A2','E3','G3','C4'],['F2','A3','C4','E4'],['G2','B3','D4','A4'],
];
const spaceMelody = [
  [[.5,1.2,'E5'],[2,1.6,'B5']],[[0,1.4,'A5'],[2,1.5,'E5']],
  [[.5,.7,'C5'],[1.5,1,'E5'],[3,.65,'G5']],[[0,1.4,'D5'],[2,1.7,'A5']],
  [[0,1.3,'B5'],[1.75,.7,'G5'],[3,.6,'E5']],[[.5,1.2,'C6'],[2,1.5,'B5']],
  [[0,.7,'A5'],[1,.7,'G5'],[2,1.5,'E5']],[[0,1.3,'D5'],[2,1.5,'B4']],
];
for (let b = 0; b < 8; b++) {
  const start = b * spaceBar, chord = spaceChords[b];
  chord.forEach((pitch,i) => costumeVoice(astronaut,'spacePad',start,spaceBar - .30,pitch,.078,i / 2 - .75,{release:.60}));
  costumeVoice(astronaut,'electricBass',start,spaceBeat * 2.5,note(chord[0]) / 2,.052,0,{release:.42});
  for (let step = 0; step < 8; step++) {
    const pitch = note(chord[[0,2,1,3,2,1,3,2][step]]) * 2;
    costumeVoice(astronaut,'spaceKey',start + step * spaceBeat / 2,.18,pitch,.058,step % 2 ? .42 : -.42,{release:.30});
    if (step % 2 === 0) voice(astronaut,'brush',start + step * spaceBeat / 2,.08,200,.025,.12,{release:.05});
  }
  spaceMelody[b].forEach(([beat,duration,pitch]) => costumeVoice(astronaut,'spaceKey',start + beat * spaceBeat,duration * spaceBeat,pitch,.150,-.04,{release:.44}));
  if (b % 2) voice(astronaut,'bell',start + spaceBeat * 3,.36,note(chord[3]) * 2,.069,.35,{release:.52});
}
save('skin-astronaut.wav',astronaut,'Original gentle orbital theme with floating detuned pads, shimmering FM-key arpeggios and spacious bell answers.',{music:true,skin:'astronaut',bpm:80,timeSignature:'4/4',bars:8,title:'Órbita do Galinheiro'});

// Patrulha de Aco: original D-minor mechanical funk, with syncopated bass.
const robotBeat = 60 / 112, robotBar = robotBeat * 4, robocop = track(robotBar * 8,true);
const robotRoots = ['D2','D2','A#1','C2','D2','F2','G2','A2'];
const robotMelody = [
  [[.5,.3,'D5'],[1.25,.3,'F5'],[2,.65,'A5'],[3.5,.3,'F5']],
  [[0,.3,'E5'],[.75,.3,'D5'],[2,.3,'A4'],[2.75,.65,'C5']],
  [[.5,.3,'D5'],[1.25,.65,'F5'],[2.5,.3,'A#5'],[3.25,.3,'A5']],
  [[0,.3,'G5'],[.75,.3,'E5'],[1.5,.65,'C5'],[3,.65,'G4']],
  [[0,.3,'A5'],[.75,.3,'F5'],[1.5,.65,'D5'],[3,.3,'F5']],
  [[.5,.65,'C6'],[1.5,.3,'A5'],[2.25,.3,'F5'],[3,.65,'G5']],
  [[0,.3,'D5'],[.75,.3,'G5'],[1.5,.65,'A5'],[3,.65,'A#5']],
  [[0,.3,'A5'],[.75,.3,'G5'],[1.5,.3,'E5'],[2.25,.65,'C#5'],[3.5,.3,'A4']],
];
for (let b = 0; b < 8; b++) {
  const start = b * robotBar, root = note(robotRoots[b]);
  for (const [beat,length,ratio] of [[0,.37,1],[.75,.17,2],[1.5,.37,1],[2.25,.17,1.4983],[2.75,.17,2],[3.5,.27,1]]) {
    costumeVoice(robocop,'robotBass',start + beat * robotBeat,length * robotBeat,root * ratio,.235,0,{release:.045});
  }
  for (let step = 0; step < 16; step++) {
    costumeVoice(robocop,'hat',start + step * robotBeat / 4,.038,2000,step % 2 ? .014 : .030,step % 2 ? .24 : -.24,{release:.018});
  }
  for (const beat of [0,1.75,2.5]) voice(robocop,'kick',start + beat * robotBeat,.15,65,.32,0,{release:.035});
  for (const beat of [1,3]) {
    costumeVoice(robocop,'snare',start + beat * robotBeat,.075,190,.102,.1,{release:.042});
    voice(robocop,'bonk',start + beat * robotBeat,.058,480,.068,-.12,{release:.035});
  }
  for (const beat of [.5,2.5]) [1,1.4983,2].forEach((ratio,i) => costumeVoice(robocop,'robotKey',start + beat * robotBeat,.13,root * ratio * 4,.030,i * .34 - .34,{release:.055}));
  robotMelody[b].forEach(([beat,duration,pitch]) => costumeVoice(robocop,'robotKey',start + beat * robotBeat,duration * robotBeat,pitch,.133,.08,{release:.085}));
}
save('skin-robocop.wav',robocop,'Original mechanical funk theme with a syncopated rounded synth bass, precise electronic percussion and robotic FM-key motifs.',{music:true,skin:'robocop',bpm:112,timeSignature:'4/4',bars:8,title:'Patrulha de Aço'});

// Sinos da Capelinha: a light original organ waltz, with little bell replies.
const priestBeat = 60 / 72, priestBar = priestBeat * 3, priest = track(priestBar * 8,true);
const priestChords = [
  ['F3','A3','C4'],['C3','E3','G3'],['D3','F3','A3'],['A#2','D3','F3'],
  ['G3','A#3','D4'],['F3','A3','C4'],['C3','E3','G3'],['C3','F3','A3'],
];
const priestMelody = [
  [[0,.8,'A4'],[1,.8,'C5'],[2,.8,'F5']],[[0,1.7,'E5'],[2,.75,'G5']],
  [[0,.8,'F5'],[1,.8,'A5'],[2,.8,'E5']],[[0,1.7,'D5'],[2,.75,'F5']],
  [[0,.8,'D5'],[1,.8,'C5'],[2,.8,'A#4']],[[0,.8,'A4'],[1,.8,'C5'],[2,.8,'A4']],
  [[0,.8,'G4'],[1,.8,'E5'],[2,.8,'D5']],[[0,1.7,'C5'],[2,.75,'A4']],
];
for (let b = 0; b < 8; b++) {
  const start = b * priestBar, chord = priestChords[b];
  costumeVoice(priest,'organ',start,priestBar - .20,note(chord[0]) / 2,.109,-.04,{release:.24});
  chord.forEach((pitch,i) => costumeVoice(priest,'organ',start,priestBar - .22,pitch,.066,i * .36 - .36,{release:.26}));
  priestMelody[b].forEach(([beat,duration,pitch]) => costumeVoice(priest,'organ',start + beat * priestBeat,duration * priestBeat,pitch,.120,.06,{release:.12}));
  for (const beat of [1,2]) voice(priest,'bell',start + beat * priestBeat,.30,note(chord[(b + beat) % 3]) * 4,.058,beat === 1 ? -.36 : .36,{release:.45});
  if (b % 2 === 0) voice(priest,'bell',start,.45,note(chord[0]),.057,0,{release:.52});
}
save('skin-priest.wav',priest,'Original light chapel waltz with warm pipe-organ harmony, a gentle melodic line and small answering bells.',{music:true,skin:'priest',bpm:72,timeSignature:'3/4',bars:8,title:'Sinos da Capelinha'});

const totalBytes=files.reduce((sum,file)=>sum+file.bytes,0);
if(totalBytes>22000000)throw new Error(`Audio package exceeds 22 MB: ${totalBytes}`);
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
