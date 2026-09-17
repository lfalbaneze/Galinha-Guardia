// A brief double hoot and dry leaf rustle. The game plays these shipped PCM assets.
const fs=require('node:fs'),path=require('node:path');
const rate=22050,count=17640,data=Buffer.alloc(44+count*2);
data.write('RIFF');data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);
data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);
data.writeUInt32LE(rate,24);data.writeUInt32LE(rate*2,28);data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);
data.write('data',36);data.writeUInt32LE(count*2,40);
for(let i=0;i<count;i++){
 const t=i/rate,u=t<.32?t:t-.42;
 const v=u>0&&u<.28?.25*Math.sin(Math.PI*u/.28)**2*(Math.sin(2*Math.PI*(440*u-90*u*u))+.22*Math.sin(2*Math.PI*880*u)):0;
 data.writeInt16LE(Math.trunc(Math.max(-1,Math.min(1,v))*32767),44+i*2);
}
fs.writeFileSync(path.join(__dirname,'../assets/audio/owl-hoot.wav'),data);

const rustleCount=Math.round(rate*.32),rustle=Buffer.alloc(44+rustleCount*2);
data.copy(rustle,0,0,44);rustle.writeUInt32LE(rustle.length-8,4);rustle.writeUInt32LE(rustleCount*2,40);
let seed=0x71f0a51,low=0;
for(let i=0;i<rustleCount;i++) {
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const noise=seed/2147483648-1,t=i/rate;
  low+=.24*(noise-low);
  const envelope=Math.sin(Math.PI*t/.32)**2*(.45+.55*Math.sin(Math.PI*t/.11)**2);
  rustle.writeInt16LE(Math.trunc((noise-low)*.26*envelope*32767),44+i*2);
}
fs.writeFileSync(path.join(__dirname,'../assets/audio/fox-rustle.wav'),rustle);
