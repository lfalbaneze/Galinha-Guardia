// Original short brass-and-bells hero fanfare; no recordings or external samples.
'use strict';
const fs=require('node:fs'),path=require('node:path');
const rate=22050,duration=5.4,samples=new Float64Array(Math.ceil(rate*duration));
function note(start,midi,length,gain,timbre='brass') {
  const hz=440*2**((midi-69)/12);
  for(let i=Math.floor(start*rate);i<Math.min(samples.length,(start+length)*rate);i++) {
    const t=i/rate-start,p=t*hz*2*Math.PI;
    const attack=Math.min(1,t/(timbre==='bell'?.008:.035)),release=Math.min(1,(length-t)/.13);
    const wave=timbre==='bass'?Math.sin(p)+.12*Math.sin(2*p):timbre==='bell'?Math.sin(p)+.20*Math.sin(3*p)*Math.exp(-t*12):
      Math.sin(p)+.30*Math.sin(2*p)+.14*Math.sin(3*p)+.055*Math.sin(4*p);
    samples[i]+=wave*gain*attack*release*(timbre==='bell'?Math.exp(-t*5):.83+.17*Math.exp(-t*8));
  }
}
// A rising call, answer, then a warm D-major arrival chord.
for(const [at,key,len]of [[0,62,.22],[.24,62,.18],[.46,69,.30],[.8,74,.55],[1.46,73,.22],[1.72,74,.26],[2.04,78,1.18]])
  note(at,key,len,.27);
for(const [at,keys,len]of [[0,[50,57],.65],[.8,[50,57,66],.56],[1.46,[45,57,64],.5],[2.04,[50,57,66,69],1.4]])
  for(const key of keys)note(at,key,len,key<58?.085:.065,key<58?'bass':'brass');
for(const [at,key]of [[.02,86],[.82,90],[2.06,90],[2.22,93],[2.39,98]])note(at,key,.8,.07,'bell');
// The rescue lands at 3.55 s: a second warm chord and bells follow the hearts.
for(const key of [50,57,66,69,74])note(3.5,key,1.55,key<58?.065:.05,key<58?'bass':'brass');
for(const [at,key]of [[3.55,86],[3.73,90],[3.92,93],[4.15,98]])note(at,key,.95,.07,'bell');
// Gentle low drum pulses anchor the fanfare without a harsh cymbal crash.
for(const at of [0,.46,.8,1.46,2.04])for(let i=0;i<rate*.15;i++){
  const t=i/rate,index=Math.floor(at*rate)+i;
  samples[index]+=.11*Math.sin(2*Math.PI*(70*t-80*t*t))*Math.exp(-t*30)*Math.min(1,t/.004);
}
const dry=samples.slice(),delay=Math.floor(rate*.105);
for(let i=delay;i<samples.length;i++)samples[i]+=dry[i-delay]*.12;
const peak=samples.reduce((a,b)=>Math.max(a,Math.abs(b)),.01),wav=Buffer.alloc(44+samples.length*2);
wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);
wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);
wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples.length*2,40);
for(let i=0;i<samples.length;i++){
  const fade=Math.min(1,i/(rate*.012),(samples.length-1-i)/(rate*.16));
  wav.writeInt16LE(Math.round(samples[i]/peak*.72*fade*32767),44+i*2);
}
fs.writeFileSync(path.resolve(__dirname,'../assets/audio/thor-hero.wav'),wav);
console.log('Created Thor hero fanfare: 5.4 s, original D-major brass and bells, synced to the rescue.');
