// Inventory the runtime catalog, including every variant, music loop and effect.
// Active RMS is a diagnostic, not a LUFS reading or a listening-quality judgment.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),context=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root,'systems/audio-system.js'),'utf8'),context);
const catalog=vm.runInContext('AudioSystem.catalog',context),clips=[];
for(const clip of catalog){
 const bytes=fs.readFileSync(path.join(root,clip.src));
 if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')throw Error('Invalid WAV '+clip.src);
 let format,pcm;
 for(let i=12;i+8<=bytes.length;){const name=bytes.toString('ascii',i,i+4),size=bytes.readUInt32LE(i+4);if(i+8+size>bytes.length)throw Error('Truncated '+clip.src);if(name==='fmt ')format=bytes.subarray(i+8,i+8+size);if(name==='data')pcm=bytes.subarray(i+8,i+8+size);i+=8+size+size%2;}
 const channels=format?.readUInt16LE(2),rate=format?.readUInt32LE(4);
 if(!pcm||format.readUInt16LE(0)!==1||![1,2].includes(channels)||rate!==22050||format.readUInt16LE(14)!==16)throw Error('Unsupported format '+clip.src);
 const size=Math.floor(rate/50)*channels,blocks=[];let peak=0,square=0,dc=0,clipped=0;
 for(let start=0;start<pcm.length/2;start+=size){let sum=0,count=0;for(let i=start;i<Math.min(start+size,pcm.length/2);i++){const v=pcm.readInt16LE(i*2)/32768;peak=Math.max(peak,Math.abs(v));square+=v*v;sum+=v*v;dc+=v;count++;if(Math.abs(v)>=.999)clipped++;}blocks.push(Math.sqrt(sum/count));}
 const active=blocks.filter(v=>v>Math.max(.00001,Math.max(...blocks)*.1));
 const rms=Math.sqrt(square/(pcm.length/2)),activeRms=Math.sqrt(active.reduce((s,v)=>s+v*v,0)/active.length);
 const boundaryJump=Math.max(...Array.from({length:channels},(_,i)=>Math.abs(pcm.readInt16LE(i*2)-pcm.readInt16LE(pcm.length-channels*2+i*2))/32768));
 if(clipped||rms<.001||!Number.isFinite(rms))throw Error('Silent or clipped '+clip.src);
 clips.push({...clip,seconds:pcm.length/2/channels/rate,channels,sampleRate:rate,peak,rms,activeRms,trimmedActiveRms:activeRms*clip.trim,
  dc:dc/(pcm.length/2),boundaryJump,clippedSamples:clipped,sha256:createHash('sha256').update(bytes).digest('hex')});
}
const out=path.join(root,'preview/media-review/audio-report.json');fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify({note:'Technical PCM analysis. Active RMS is not LUFS; timbre is not assessed by these measurements.',clips},null,2));
console.log(JSON.stringify({files:clips.length,music:clips.filter(c=>c.kind==='music').length,voices:clips.filter(c=>c.kind==='voice').length,
 effects:clips.filter(c=>c.kind==='effect').length,clippedSamples:clips.reduce((s,c)=>s+c.clippedSamples,0),output:out}));
