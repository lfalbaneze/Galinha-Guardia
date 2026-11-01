const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {SR,track,voice,costumeVoice,note,finish,wav,validate}=require('./generate-audio.cjs');
const bpm=124,beat=60/bpm,bar=beat*4,song=track(bar*32,true);
const harmony=['D3 F3 A3 C4','A#2 D3 F3 A3','G2 A#3 D4 F4','A2 C#3 E3 G3'].map(c=>c.split(' '));
const phrases=['D5 A4 D5 F5 E5 C#5','F5 D5 A4 C5 D5 F5','G5 F5 D5 A#4 A4 G4','C#5 E5 A5 G5 E5 C#5'].map(p=>p.split(' '));
function play(type,at,length,pitch,gain,pan=0){
  (['pad','bass','pizz','bell','kick','brush','shaker'].includes(type)?voice:costumeVoice)(song,type,at,length,pitch,gain,pan,{release:type==='pad'?.3:.12});
}
for(let b=0;b<32;b++){
  const section=Math.floor(b/8),i=b%4,start=b*bar,chord=harmony[i],quiet=section===2;
  chord.forEach((p,j)=>play('pad',start,bar-.15,p,.034,j*.35-.5));
  for(const t of [0,1.5,2,3.5])play('bass',start+t*beat,beat*.65,note(chord[0])/2,quiet?.07:.11);
  for(let j=0;j<8;j++)if(!quiet||j%2===0)play('pizz',start+j*beat/2,beat*.32,
    note(chord[[0,2,1,2,3,2,1,2][j]])*(section===1?2:1),.065,j%2?.38:-.38);
  if(!quiet||b%2===0)phrases[i].forEach((p,j)=>play(section===1?'organ':'clarinet',start+[0,.5,1.5,2,2.5,3.25][j]*beat,
    beat*(j===5?.55:.38),p,section===1?.064:.105,j%2?.13:-.13));
  if(quiet)play('bell',start+beat,beat*.9,note(chord[2])*2,.045,.35);
  for(const t of quiet?[0]:[0,2])play('kick',start+t*beat,.12,60,.12);
  for(const t of [1,3])play('brush',start+t*beat,.09,190,quiet?.025:.055,.18);
  for(let j=0;j<8;j++)play('shaker',start+j*beat/2,.035,1000,j%2?.012:.02,-.32);
  if(b%8===7)for(let j=0;j<4;j++)play('pizz',start+(3+j*.25)*beat,.09,note(chord[3-j])*2,.07,j*.2-.3);
}
finish(song,true);
const bytes=wav(song),analysis=validate(bytes,true);
assert.ok(analysis.loopBoundaryDelta<.009&&analysis.peak<=.601&&analysis.rms<=.109);
const output=path.join(__dirname,'../assets/audio/music/secret-v1');fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,'secret-boss.wav'),bytes);
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify({title:'O bosque despertou',generator:'scripts/generate-secret-boss-music.cjs',
  source:'Original composition with synthesized instruments; no external samples or quoted melodies.',bpm,bars:32,sampleRate:SR,
  form:['Perseguição','Presságio','Suspense','Retorno'],loop:true,...analysis,sha256:createHash('sha256').update(bytes).digest('hex')},null,2));
console.log(JSON.stringify(analysis));
