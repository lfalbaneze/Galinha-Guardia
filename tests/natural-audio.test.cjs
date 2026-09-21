const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const base = path.join(__dirname, '../assets/audio/voices/v5');
const manifest = JSON.parse(fs.readFileSync(path.join(base, 'manifest.json'), 'utf8'));
const clips = [...manifest.recordings, ...manifest.specialEffects];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

test('every current animal clip is decodable PCM with headroom, quiet edges and preserved source attribution',()=>{
  assert.equal(clips.length,26);
  for(const clip of clips){
    const wav=fs.readFileSync(path.join(base,clip.file));
    assert.equal(sha(wav),clip.sha256,clip.file);
    const raw=fs.readFileSync(path.resolve(base,clip.derivedFrom));
    assert.equal(sha(raw),clip.rawSha256,'original source cut is preserved');
    assert.ok(clip.author&&clip.license);
    if(!clip.originalEffect)assert.match(clip.sourcePage,/^https:\/\//);
    assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');
    let data,rate;
    for(let offset=12;offset+8<=wav.length;){
      const id=wav.toString('ascii',offset,offset+4),length=wav.readUInt32LE(offset+4);
      if(id==='fmt '){
        assert.equal(wav.readUInt16LE(offset+8),1);assert.equal(wav.readUInt16LE(offset+10),1);
        rate=wav.readUInt32LE(offset+12);assert.equal(rate,22050);assert.equal(wav.readUInt16LE(offset+22),16);
      }
      if(id==='data')data=wav.subarray(offset+8,offset+8+length);
      offset+=8+length+(length%2);
    }
    assert.ok(data&&data.length>rate*.2*2,clip.file);
    let peak=0,sum=0;
    for(let i=0;i<data.length;i+=2){const v=data.readInt16LE(i)/32768;peak=Math.max(peak,Math.abs(v));sum+=v*v;}
    assert.ok(peak<=.421&&peak>.05,clip.file+' has audible signal without clipped peaks');
    const rms=Math.sqrt(sum/(data.length/2));assert.ok(Math.abs(rms-clip.rms)<.00001);
    assert.ok(Math.abs(peak-clip.peak)<.00001);
    for(const edge of [data.subarray(0,220*2),data.subarray(-220*2)]){
      assert.ok(edge.every(byte=>byte===0),clip.file+' has silent boundaries to prevent boundary clicks');
    }
    assert.equal(clip.processing.pitchRatio,1);
  }
});

test('alternate calls are distinct source excerpts and chick calls stay short',()=>{
  for(const [species,count] of [['chicken',3],['chick',2],['pig',2],['goose',2],['owl',2],['wolf',2]]){
    const calls=clips.filter(c=>c.species===species);
    assert.equal(calls.length,count);
    assert.equal(new Set(calls.map(c=>c.rawSha256)).size,count,species+' uses distinct raw calls');
    assert.equal(new Set(calls.map(c=>c.sha256)).size,count);
  }
  assert.ok(clips.filter(c=>c.species==='chick').every(c=>c.seconds<.8));
  assert.ok(clips.find(c=>c.species==='rabbit').peak<=.181);
});

test('active voice levels remain close while chicks and rabbit stay intentionally quieter',()=>{
  const adults=manifest.recordings.filter(c=>!['chick','rabbit'].includes(c.species)).map(c=>c.activeWeightedRms);
  assert.ok(20*Math.log10(Math.max(...adults)/Math.min(...adults))<2,'adult active levels within 2 dB');
  for(const chick of clips.filter(c=>c.species==='chick'))assert.ok(chick.activeWeightedRms<Math.min(...adults));
  assert.ok(clips.find(c=>c.species==='rabbit').activeWeightedRms<.03);
});
