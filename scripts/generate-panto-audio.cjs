// Original, deterministic toy-marimba cues for Panto. No external recordings.
'use strict';
const fs=require('node:fs'),path=require('node:path');
const rate=22050;
function write(name,duration,notes){
  const count=Math.ceil(rate*duration),samples=new Float64Array(count);
  for(const [start,midi,length,gain] of notes){
    const frequency=440*2**((midi-69)/12);
    for(let i=Math.floor(start*rate);i<Math.min(count,(start+length)*rate);i++){
      const t=i/rate-start,phase=t*frequency*2*Math.PI;
      const envelope=Math.min(1,t/.006)*Math.exp(-t*5/length)*Math.min(1,(length-t)/.045);
      samples[i]+=gain*envelope*(Math.sin(phase)+.22*Math.sin(phase*2)+.09*Math.sin(phase*3));
    }
  }
  const wav=Buffer.alloc(44+count*2);
  wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);
  wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);
  wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);
  wav.write('data',36);wav.writeUInt32LE(count*2,40);
  const peak=samples.reduce((max,v)=>Math.max(max,Math.abs(v)),.01);
  for(let i=0;i<count;i++)wav.writeInt16LE(Math.round(samples[i]/peak*.72*32767),44+i*2);
  fs.writeFileSync(path.resolve(__dirname,`../assets/audio/${name}.wav`),wav);
}
write('panto-dodge',.52,[[0,74,.3,.7],[.12,81,.38,.6]]);
write('panto-victory',2.5,[
  [0,74,.35,.6],[.16,78,.35,.6],[.32,81,.4,.65],[.52,86,.55,.75],
  [.92,81,.3,.6],[1.08,83,.3,.6],[1.28,86,1.15,.65],
  [0,50,.48,.26],[.52,57,.55,.24],[1.28,50,1.18,.3],[1.28,66,1.1,.24],[1.28,69,1.1,.22],
]);
console.log('Generated Panto dodge and victory cues.');
