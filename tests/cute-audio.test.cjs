const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const voices=path.resolve(__dirname,'../assets/audio/voices');
const old=JSON.parse(fs.readFileSync(path.join(voices,'v3/manifest.json')));
const current=JSON.parse(fs.readFileSync(path.join(voices,'v4/manifest.json')));
function metrics(file){const b=fs.readFileSync(file);let peak=0,sum=0,edge=0;
  for(let i=44;i<b.length;i+=2){const v=b.readInt16LE(i)/32768;peak=Math.max(peak,Math.abs(v));sum+=v*v;
    if(i<244||i>b.length-202)edge=Math.max(edge,Math.abs(v));}
  return {peak,rms:Math.sqrt(sum/((b.length-44)/2)),edge};}
test('every existing animal take has a distinct softer replacement with its original credit and license',()=>{
  assert.equal(current.recordings.length,old.recordings.length);
  for(const clip of current.recordings){const original=old.recordings.find(c=>c.file===clip.file);
    assert.ok(original);assert.equal(clip.author,original.author);assert.equal(clip.license,original.license);
    assert.equal(clip.sourceSha256,original.sha256);assert.notEqual(clip.sha256,original.sha256);
    const before=metrics(path.join(voices,'v3',clip.file)),after=metrics(path.join(voices,'v4',clip.file));
    assert.ok(after.peak<=.431,clip.file+' peak');assert.ok(after.rms<before.rms,clip.file+' reduced loudness');
    assert.ok(after.rms>.009,clip.file+' audible');assert.equal(after.edge,0,clip.file+' silent borders');
    assert.ok(clip.processing.pitchRatio>=1&&clip.processing.pitchRatio<=1.2);
  }
});
test('owl and wolf keep playable soft local cues',()=>{
  for(const file of ['owl-hoot.wav','sob.wav']){const m=metrics(path.join(voices,'v4',file));
    assert.ok(m.peak<=.431);assert.ok(m.rms>.01);assert.equal(m.edge,0);}
});
