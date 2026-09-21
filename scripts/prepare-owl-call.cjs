// A quick, two-part warning from the licensed real owl recording. No oscillator.
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'assets/audio/voices');
function read(file){const b=fs.readFileSync(file);let data,rate,channels,bits;
 for(let i=12;i+8<b.length;){const n=b.readUInt32LE(i+4),id=b.toString('ascii',i,i+4);
  if(id==='fmt '){rate=b.readUInt32LE(i+12);channels=b.readUInt16LE(i+10);bits=b.readUInt16LE(i+22);}
  if(id==='data')data=b.subarray(i+8,i+8+n);i+=8+n+(n%2);}
 if(bits!==16||!data)throw Error('Expected PCM16');
 const samples=Float64Array.from({length:data.length/(2*channels)},(_,i)=>{let v=0;for(let c=0;c<channels;c++)v+=data.readInt16LE((i*channels+c)*2)/32768;return v/channels;});return {samples,rate};}
function wav(samples,rate){const b=Buffer.alloc(44+samples.length*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(samples.length*2,40);samples.forEach((v,i)=>b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*32767),44+i*2));return b;}
const output=path.join(folder,'v6');fs.mkdirSync(output,{recursive:true});
const old=JSON.parse(fs.readFileSync(path.join(folder,'v5/manifest.json'),'utf8'));
const recordings=[];
for(const file of ['owl-hoot.wav','owl-hoot-2.wav']){
 const {samples,rate}=read(path.join(folder,'v5',file));
 const block=Math.round(rate*.01),energy=[];
 for(let i=0;i<samples.length;i+=block){let e=0;for(let j=i;j<Math.min(samples.length,i+block);j++)e+=samples[j]**2;energy.push(Math.sqrt(e/block));}
 const peak=Math.max(...energy),first=Math.max(0,energy.findIndex(e=>e>peak*.16)-1)*block;
 // Preserve the recorded attack and vocal harmonics, with a modest 8% speed lift.
 const length=Math.min(Math.round(rate*.46),samples.length-first),note=new Float64Array(Math.floor(length/1.08));
 for(let i=0;i<note.length;i++){const p=first+i*1.08,j=Math.floor(p),f=p-j;note[i]=((samples[j]||0)*(1-f)+(samples[j+1]||0)*f)*Math.min(1,i/(rate*.008),(note.length-i)/(rate*.045));}
 const result=new Float64Array(Math.round(rate*.74));
 for(const [start,gain]of [[0,.85],[.28,1]])for(let i=0;i<note.length&&i+Math.round(start*rate)<result.length;i++)result[i+Math.round(start*rate)]+=note[i]*gain;
 let max=0,rms=0;for(const v of result){max=Math.max(max,Math.abs(v));rms+=v*v;}
 const gain=Math.min(.75/Math.max(max,.0001),.18/Math.max(Math.sqrt(rms/result.length),.0001));
 for(let i=0;i<result.length;i++)result[i]*=gain;
 const bytes=wav(result,rate),source=old.specialEffects.find(r=>r.file===file);
 fs.writeFileSync(path.join(output,file),bytes);
 const {activeWeightedRms,...credit}=source;
 recordings.push({...credit,derivedSourceSha256:source.sha256,sha256:createHash('sha256').update(bytes).digest('hex'),derivedFrom:'../v5/'+file,processing:{speed:1.08,leadingSilenceRemoved:first/rate,twoPartCall:true,peakCeiling:.75},seconds:result.length/rate,peak:max*gain,rms:Math.sqrt(rms/result.length)*gain});
}
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify({version:6,sampleRate:22050,channels:1,bits:16,description:'Chamada curta de alerta, derivada da gravação natural CC0; ataque imediato e duas notas.',recordings},null,2)+'\n');
console.log('Prepared two 740ms natural owl warning variants.');
