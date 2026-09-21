// Original toy-siren effect: rounded "wee-oo" sweeps, a kazoo overtone and a comic falling tail.
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const output=path.resolve(__dirname,'../assets/audio/effects/v1'),rate=22050,seconds=.72;
fs.mkdirSync(output,{recursive:true});
const recordings=[];
for(let variant=1;variant<=2;variant++){
 const samples=new Float64Array(Math.round(rate*seconds));let phase=0,peak=0,energy=0;
 for(let i=0;i<samples.length;i++){
  const t=i/rate,cycle=t/(variant===1?.29:.31),sweep=(1-Math.cos(cycle*Math.PI*2))*.5;
  const tail=Math.max(0,(t-.6)/.12),hz=(430+430*sweep)*(1-tail*.32)*(1+.018*Math.sin(t*2*Math.PI*23));
  phase+=2*Math.PI*hz/rate;
  const envelope=Math.min(1,t/.008,(seconds-t)/.055)*(1-.12*tail);
  const tone=Math.sin(phase)+.23*Math.sin(phase*2+.4)+.09*Math.sin(phase*3);
  samples[i]=tone*envelope*(.88+.12*Math.sin(Math.PI*2*t*11));
  peak=Math.max(peak,Math.abs(samples[i]));energy+=samples[i]**2;
 }
 const gain=Math.min(.65/peak,.21/Math.sqrt(energy/samples.length));
 const bytes=Buffer.alloc(44+samples.length*2);
 bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);
 bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(rate,24);bytes.writeUInt32LE(rate*2,28);
 bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(samples.length*2,40);
 samples.forEach((v,i)=>bytes.writeInt16LE(Math.round(v*gain*32767),44+i*2));
 const file=`owl-siren${variant===1?'':'-2'}.wav`;fs.writeFileSync(path.join(output,file),bytes);
 recordings.push({file,seconds,sampleRate:rate,channels:1,bits:16,peak:peak*gain,rms:Math.sqrt(energy/samples.length)*gain,
  sha256:createHash('sha256').update(bytes).digest('hex'),source:'Original procedural composition; no third-party samples.'});
}
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify({description:'Sirene cômica da coruja: duas variações curtas de uí-ó, sincronizadas ao chamado.',generator:'scripts/generate-owl-siren.cjs',recordings},null,2)+'\n');
console.log('Generated two 720ms owl toy-siren effects.');
