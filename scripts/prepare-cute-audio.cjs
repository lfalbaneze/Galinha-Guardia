/* Softer animal calls from the existing licensed recordings. Offline, deterministic,
   no dependencies: gentle pitch lift, high/low-pass EQ, peak compression and fades.
   Originals stay in v3; derived recordings retain their original licenses. */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..'), folder = path.join(root, 'assets/audio/voices');
const input = path.join(folder, 'v3'), output = path.join(folder, 'v4');
const rate = 22050;
const profiles = {
  cow:[1.13,90,3300,.078], duck:[1.10,130,3400,.076], sheep:[1.12,130,3400,.075],
  lamb:[1.08,150,3600,.071], pig:[1.15,100,2600,.075], goat:[1.10,140,3100,.071],
  dog:[1.12,150,3100,.084], cat:[1.07,110,4200,.078], donkey:[1.10,140,2700,.072],
  rabbit:[1.02,170,3100,.023], chicken:[1.10,180,3500,.074], chick:[1.02,380,5600,.065],
  horse:[1.09,150,3200,.073], turkey:[1.10,150,3300,.074], goose:[1.09,160,2900,.077]
};
function readWav(file) {
  const b=fs.readFileSync(file);let data,format;
  if(b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WAVE')throw Error('Not PCM: '+file);
  for(let i=12;i+8<=b.length;){const id=b.toString('ascii',i,i+4),n=b.readUInt32LE(i+4);
    if(id==='fmt ')format={codec:b.readUInt16LE(i+8),channels:b.readUInt16LE(i+10),rate:b.readUInt32LE(i+12),bits:b.readUInt16LE(i+22)};
    if(id==='data')data=b.subarray(i+8,i+8+n);i+=8+n+(n%2);
  }
  if(!format||format.codec!==1||format.bits!==16||!data)throw Error('Unsupported WAV: '+file);
  const samples=new Float64Array(data.length/(format.channels*2));
  for(let i=0;i<samples.length;i++)for(let ch=0;ch<format.channels;ch++)samples[i]+=data.readInt16LE((i*format.channels+ch)*2)/32768/format.channels;
  return {samples,rate:format.rate};
}
function wav(samples) {
  const b=Buffer.alloc(44+samples.length*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);
  b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);
  b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(samples.length*2,40);
  samples.forEach((v,i)=>b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*32767),44+i*2));return b;
}
function soften(source,profile) {
  const [pitch,hp,lp,target]=profile,step=source.rate/rate*pitch;
  let samples=new Float64Array(Math.floor(source.samples.length/step));
  for(let i=0;i<samples.length;i++){const x=i*step,j=Math.floor(x),f=x-j;samples[i]=source.samples[j]*(1-f)+(source.samples[j+1]||0)*f;}
  // Remove rumble; two gentle low-pass poles round out hiss and sharp barks.
  const low=1-Math.exp(-2*Math.PI*lp/rate),high=Math.exp(-2*Math.PI*hp/rate);
  let prior=0,highState=0,a=0,b=0;
  for(let i=0;i<samples.length;i++){const x=samples[i];highState=high*(highState+x-prior);prior=x;a+=low*(highState-a);b+=low*(a-b);samples[i]=b;}
  let envelope=0;const attack=1-Math.exp(-1/(rate*.005)),release=1-Math.exp(-1/(rate*.09));
  for(let i=0;i<samples.length;i++){const abs=Math.abs(samples[i]);envelope+=(abs-envelope)*(abs>envelope?attack:release);
    const gain=envelope>.15?Math.pow(.15/envelope,.58):1;samples[i]*=gain;}
  const blocks=[];for(let i=0;i<samples.length;i+=220){let energy=0;const end=Math.min(i+220,samples.length);
    for(let j=i;j<end;j++)energy+=samples[j]**2;blocks.push(Math.sqrt(energy/(end-i)));}
  const max=Math.max(...blocks),active=blocks.filter(v=>v>max*.18),rms=Math.sqrt(active.reduce((sum,x)=>sum+x*x,0)/active.length);
  let peak=0;for(const x of samples)peak=Math.max(peak,Math.abs(x));
  const gain=Math.min(target/Math.max(.00001,rms),.43/Math.max(.00001,peak));
  const start=Math.min(Math.round(rate*.026),Math.floor(samples.length/5)),end=Math.min(Math.round(rate*.075),Math.floor(samples.length/4));
  for(let i=0;i<samples.length;i++)samples[i]*=gain*Math.sin(Math.min(1,i/start)*Math.PI/2)**2*Math.sin(Math.min(1,(samples.length-1-i)/end)*Math.PI/2)**2;
  const padded=new Float64Array(samples.length+Math.round(rate*.065));padded.set(samples,Math.round(rate*.018));return padded;
}
fs.mkdirSync(output,{recursive:true});
const original=JSON.parse(fs.readFileSync(path.join(input,'manifest.json'),'utf8'));
const manifest={version:4,sampleRate:rate,channels:1,bits:16,description:'Gentle farm calls; modest species-specific pitch lift, rounded transients and quieter loudness.',recordings:[]};
for(const source of original.recordings){
  const profile=profiles[source.species];if(!profile)throw Error('Missing profile: '+source.species);
  const samples=soften(readWav(path.join(input,source.file)),profile),bytes=wav(samples);
  fs.writeFileSync(path.join(output,source.file),bytes);let peak=0,energy=0;
  for(const x of samples){peak=Math.max(peak,Math.abs(x));energy+=x*x;}
  manifest.recordings.push({...source,derivedFrom:'../v3/'+source.file,sourceSha256:source.sha256,
    processing:{pitchRatio:profile[0],highpassHz:profile[1],lowpassHz:profile[2],activeRmsTarget:profile[3],peakCeiling:.43},
    seconds:+(samples.length/rate).toFixed(4),peak:+peak.toFixed(4),rms:+Math.sqrt(energy/samples.length).toFixed(4),
    sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
// The owl has an original synthesized hoot; soften it too without changing its cue.
manifest.originalEffects=[];
for(const [name,profile] of [['owl-hoot',[1.05,80,2100,.073]],['sob',[1.03,110,3000,.073]]]){
  const samples=soften(readWav(path.join(root,'assets/audio/'+name+'.wav')),profile),bytes=wav(samples);
  fs.writeFileSync(path.join(output,name+'.wav'),bytes);
  manifest.originalEffects.push({file:name+'.wav',author:'Penas pro Ar! — síntese original do projeto',derivedFrom:'../../'+name+'.wav',seconds:samples.length/rate,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Prepared '+manifest.recordings.length+' calls for all 15 vocal species, plus the owl. Originals preserved.');
for(const clip of manifest.recordings)console.log(clip.species,clip.variant,clip.seconds+'s','peak '+clip.peak,'RMS '+clip.rms);
