// Original, quiet contact Foley. Rebuild only these clips; keep recorded animal voices intact.
const fs=require('node:fs'),path=require('node:path');
const rate=22050;
for(const kind of ['water','leaves','mud']) {
  const duration=kind==='water'?.31:kind==='leaves'?.24:.2;
  const samples=Math.round(rate*duration),data=Buffer.alloc(samples*2);
  let seed=37193,low=0,slow=0;
  for(let i=0;i<samples;i++) {
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const noise=seed/2147483648-1,t=i/rate;
    low+=(noise-low)*(kind==='leaves'?.38:.13);slow+=(low-slow)*.06;
    const envelope=Math.min(1,t/.012)*Math.pow(1-t/duration,2.5);
    // Water: a soft broadband splash with short, irregular bubble resonances.
    // Leaves: two dry brushes. Mud: a low, damp compression without a comic pitch slide.
    let value=kind==='water' ? low*.7+Math.sin(2*Math.PI*(360*t+45*t*t))*Math.exp(-t*24)*.13 :
      kind==='leaves' ? (low-slow)*(.45+.3*Math.sin(t*47)**2) : slow*1.3+low*.12;
    value*=envelope*.7;
    data.writeInt16LE(Math.round(Math.max(-1,Math.min(1,value))*32767),i*2);
  }
  const header=Buffer.alloc(44);
  header.write('RIFF');header.writeUInt32LE(36+data.length,4);header.write('WAVEfmt ',8);
  header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);
  header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*2,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);
  header.write('data',36);header.writeUInt32LE(data.length,40);
  fs.writeFileSync(path.join(__dirname,`../assets/audio/step-${kind}.wav`),Buffer.concat([header,data]));
}
console.log('Generated three short environment contact clips.');
