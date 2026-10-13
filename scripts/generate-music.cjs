// Revised original scores. Reuses the game's instruments, PCM writer and mastering.
'use strict';
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {SR,track,voice,costumeVoice,note,finish,wav,validate}=require('./generate-audio.cjs');
const output=path.resolve(__dirname,'../assets/audio/music/v2');
fs.mkdirSync(output,{recursive:true});
const chords=list=>list.map(row=>row.split(' '));
const scores=[
  {id:'forest',title:'Floresta encantada',bpm:96,meter:'6/8',beats:6,unit:.5,
    style:'folk',lead:'flute',answer:'clarinet',
    description:'Passeio em 6/8 com flauta e clarinete, violão dedilhado, piano, baixo e percussão leve. Ponte com acordeão e reprise com respostas melódicas.',
    harmony:chords(['G3 B3 D4 F#4','E3 G3 B3 D4','C3 E3 G3 B3','D3 F#3 A3 C4','E3 G3 B3 D4','C3 E3 G3 B3','A3 C4 E4 G4','D3 F#3 A3 C4']),
    bridge:chords(['A3 C4 E4 G4','C3 E3 G3 B3','E3 G3 B3 D4','D3 F#3 A3 C4','C3 E3 G3 B3','G3 B3 D4 E4','A3 C4 E4 G4','D3 F#3 A3 C4']),
    a:['G4 B4 D5 B4 A4','E5 D5 B4 G4 B4','C5 E5 G5 E5 D5','B4 A4 D5 F#5 A4','E5 G5 E5 D5 B4','C5 B4 A4 G4 E4','A4 C5 E5 D5 C5','F#4 A4 D5 C5 A4'],
    b:['E5 G5 A5 G5 E5','G5 E5 D5 C5 B4','B4 D5 E5 G5 E5','F#5 E5 D5 C5 A4','E5 G5 B5 A5 G5','D5 B4 G4 A4 B4','C5 E5 G5 E5 C5','A4 C5 D5 F#5 A4']},
  {id:'whistle',title:'Assobio da galinha',bpm:116,meter:'4/4',beats:4,unit:1,
    style:'swing',lead:'whistle',answer:'piano',
    description:'Assobio brincalhão com swing, piano saltitante, acordeão, violão e baixo caminhando. Solo instrumental e retorno do refrão.',
    harmony:chords(['F3 A3 C4 D4','C3 E3 G3 A#3','D3 F3 A3 C4','G3 A#3 D4 F4','A#2 D3 F3 A3','F3 A3 C4 D4','G3 A#3 D4 F4','C3 E3 G3 A#3']),
    bridge:chords(['A#2 D3 F3 A3','C3 E3 G3 A#3','A3 C4 E4 G4','D3 F3 A3 C4','G3 A#3 D4 F4','C3 E3 G3 A#3','F3 A3 C4 D4','C3 E3 G3 A#3']),
    a:['F5 A5 G5 F5 D5 C5','E5 G5 A5 G5 E5 C5','D5 F5 A5 G5 F5 D5','G5 A5 A#5 A5 G5 D5','F5 D5 A#4 D5 F5 G5','A5 G5 F5 C5 D5 F5','G5 A#5 A5 G5 D5 F5','E5 G5 E5 D5 C5 E5'],
    b:['D5 F5 A5 F5 D5 F5','G5 A#5 G5 E5 D5 C5','E5 G5 A5 G5 E5 C5','F5 A5 D6 C6 A5 F5','A#5 A5 G5 F5 D5 G5','E5 G5 A#5 A5 G5 E5','A5 G5 F5 D5 C5 A4','G4 A4 C5 E5 G5 E5']},
  {id:'skin-punk',title:'Zeca · Passos na Fazenda',bpm:136,meter:'4/4',beats:4,unit:1,
    style:'rock',lead:'guitar',answer:'organ',
    description:'Rock cartoon com guitarras em estéreo, baixo elétrico, bateria com viradas, ponte em contratempo e solo de órgão curto.',
    harmony:chords(['E3 G3 B3 D4','C3 E3 G3 B3','G3 B3 D4 E4','D3 F#3 A3 C4','E3 G3 B3 D4','C3 E3 G3 A3','A2 C3 E3 G3','B2 D#3 F#3 A3']),
    bridge:chords(['C3 E3 G3 A3','D3 F#3 A3 C4','E3 G3 B3 D4','G3 B3 D4 E4','A2 C3 E3 G3','C3 E3 G3 A3','B2 D#3 F#3 A3','B2 D#3 F#3 A3']),
    a:['E5 G5 E5 D5 B4 E5','G5 E5 C5 D5 E5 G5','B4 D5 G5 F#5 D5 B4','E5 D5 A4 B4 D5 E5','E5 G5 B5 A5 G5 E5','E5 G5 E5 D5 C5 G4','A4 C5 E5 D5 C5 A4','B4 D#5 F#5 D#5 B4 A4'],
    b:['G5 E5 C5 D5 E5 G5','A5 F#5 D5 E5 F#5 A5','B5 A5 G5 E5 G5 B5','D6 B5 G5 E5 D5 B4','C5 E5 A5 G5 E5 C5','E5 G5 C6 B5 G5 E5','F#5 D#5 B4 A4 F#4 D#5','B4 D#5 F#5 A5 F#5 D#5']},
  {id:'skin-astronaut',title:'Pipoca · Pulos ao Luar',bpm:84,meter:'4/4',beats:4,unit:1,
    style:'space',lead:'spaceKey',answer:'flute',
    description:'Tema lunar com piano elétrico, camadas suaves, arpejos estéreo, sinos espaçados e uma ponte de flauta. Bateria discreta e baixo macio.',
    harmony:chords(['C3 E3 G3 B3','A2 C3 E3 G3','F2 A3 C4 E4','G2 B3 D4 A4','E3 G3 B3 D4','A2 C3 E3 G3','F2 A3 C4 E4','G2 B3 D4 A4']),
    bridge:chords(['F2 A3 C4 E4','E3 G3 B3 D4','A2 C3 E3 G3','C3 E3 G3 B3','D3 F3 A3 C4','F2 A3 C4 E4','G2 B3 D4 A4','G2 B3 D4 A4']),
    a:['E5 G5 B5 G5','A5 G5 E5 C5','C5 E5 G5 A5','D5 G5 A5 D5','B5 G5 E5 D5','C6 B5 G5 E5','A5 G5 E5 C5','D5 A4 B4 D5'],
    b:['A5 G5 E5 C5','G5 B5 D6 B5','C6 A5 G5 E5','B5 G5 E5 D5','F5 A5 C6 A5','G5 E5 C5 E5','D5 G5 A5 B5','A5 G5 D5 B4']},
  {id:'skin-robocop',title:'Stella · Passo Furtivo',bpm:108,meter:'4/4',beats:4,unit:1,
    style:'funk',lead:'robotKey',answer:'piano',
    description:'Funk furtivo com baixo sincopado, piano elétrico, guitarra abafada, bateria com notas fantasmas e ponte instrumental.',
    harmony:chords(['D3 F3 A3 C4','D3 F3 A3 C4','A#2 D3 F3 A3','C3 E3 G3 A#3','D3 F3 A3 C4','F3 A3 C4 E4','G2 A#3 D4 F4','A2 C#3 E3 G3']),
    bridge:chords(['G2 A#3 D4 F4','A2 C#3 E3 G3','D3 F3 A3 C4','C3 E3 G3 A#3','A#2 D3 F3 A3','G2 A#3 D4 F4','A2 C#3 E3 G3','A2 C#3 E3 G3']),
    a:['D5 F5 A5 F5 E5 D5','E5 D5 A4 C5 D5 F5','D5 F5 A#5 A5 F5 D5','G5 E5 C5 G4 A4 C5','A5 F5 D5 F5 A5 C6','C6 A5 F5 G5 E5 C5','D5 G5 A5 A#5 A5 F5','A5 G5 E5 C#5 A4 C#5'],
    b:['A#4 D5 F5 G5 A5 G5','C#5 E5 A5 G5 E5 C#5','F5 E5 D5 A4 C5 D5','E5 G5 A#5 G5 E5 C5','D5 F5 A5 F5 D5 A4','A#4 D5 G5 F5 D5 A#4','E5 G5 A5 C#6 A5 E5','G5 E5 C#5 A4 G4 E5']},
  {id:'skin-priest',title:'Paçoca · Companheiro da Roça',bpm:88,meter:'3/4',beats:3,unit:1,
    style:'waltz',lead:'accordion',answer:'clarinet',
    description:'Valsa calorosa com acordeão e clarinete, piano de salão, violão, órgão suave e sininhos. Ponte mais delicada e reprise completa.',
    harmony:chords(['F3 A3 C4 D4','C3 E3 G3 A#3','D3 F3 A3 C4','A#2 D3 F3 A3','G3 A#3 D4 F4','F3 A3 C4 D4','C3 E3 G3 A#3','C3 F3 A3 D4']),
    bridge:chords(['A#2 D3 F3 A3','F3 A3 C4 D4','G3 A#3 D4 F4','C3 E3 G3 A#3','D3 F3 A3 C4','A#2 D3 F3 A3','C3 E3 G3 A#3','C3 E3 G3 A#3']),
    a:['A4 C5 F5','E5 G5 E5','F5 A5 E5','D5 F5 D5','D5 C5 A#4','A4 C5 A4','G4 E5 D5','C5 A4 G4'],
    b:['F5 D5 A#4','C5 A4 F4','A#4 D5 G5','G5 E5 C5','A5 F5 D5','F5 D5 A#4','E5 G5 A#5','G5 E5 C5']}
];
const clips=[];
for(const score of scores){
  const beat=60/score.bpm*score.unit,bar=score.beats*beat,song=track(bar*32,true),instruments=new Set();
  function play(type,at,length,pitch,gain,pan=0,release=.12){
    const v=['flute','whistle','bass','pad','pizz','marimba','bell','shaker','brush','kick'].includes(type)?voice:costumeVoice;
    v(song,type,at,length,pitch,gain,pan,{release});
    instruments.add(type);
  }
  for(let b=0;b<32;b++){
    const section=Math.floor(b/8),i=b%8,start=b*bar,chord=(section===1?score.bridge:score.harmony)[i];
    const space=score.style==='space',rock=score.style==='rock',funk=score.style==='funk',waltz=score.style==='waltz';
    const sparse=section===2,energy=sparse?.7:section===3?1.08:1;
    const bass=space?'electricBass':funk?'robotBass':rock?'electricBass':'bass';
    const bassBeats=funk?[0,.75,1.5,2.25,2.75,3.5]:space?[0,2]:score.beats===6?[0,3]:waltz?[0]:[0,1,2,3];
    for(const [j,t]of bassBeats.entries()){
      const root=note(chord[0])/2,fifth=root*1.4983;
      const next=note((section===1?score.bridge:score.harmony)[(i+1)%8][0])/2;
      const pitch=j===bassBeats.length-1&&i%2?next:j%2?fifth:root;
      play(bass,start+t*beat,beat*(space?1.5:.53),pitch,(rock||funk?.135:.10)*energy,0,.10);
    }
    if(space){
      chord.forEach((pitch,j)=>play('spacePad',start,bar-.4,pitch,.038*energy,(j-1.5)*.35,.65));
      for(let j=0;j<8;j++)play('spaceKey',start+j*beat/2,.16,note(chord[[0,2,1,3,2,1,3,2][j]])*2,.037*energy,j%2?.5:-.5,.24);
    }else if(rock){
      for(const t of section===1?[.5,1.5,2.5,3.5]:[0,.75,1.5,2,2.75,3.5])for(const [j,ratio]of [1,1.4983,2].entries())
        play('guitar',start+t*beat,.22*beat,note(chord[0])*ratio,.044*energy,j%2?.48:-.48,.045);
      if(section===3)chord.slice(1).forEach((p,j)=>play('organ',start,bar-.18,p,.018,j*.3-.3,.18));
    }else{
      const positions=waltz?[1,2]:score.beats===6?[0,2,3,5]:funk?[.5,2.5]:[.5,1.5,2.5,3.5];
      for(const t of positions)chord.slice(1).forEach((pitch,j)=>play(funk?'acousticGuitar':'piano',start+t*beat+j*.007,beat*(waltz?.65:.38),pitch,.038*energy,j*.28-.4,.17));
      if(!funk)for(let j=0;j<score.beats;j++)play('acousticGuitar',start+j*beat+.012,beat*.65,chord[(j+b)%4],.038*energy,j%2?.35:-.35,.16);
      if(waltz||section===1)chord.slice(1).forEach((pitch,j)=>play(waltz?'organ':'accordion',start,bar-.18,pitch,.018*energy,j*.3-.3,.24));
    }
    // The bridge changes harmony; the instrumental passage leaves room between phrases.
    const phrase=(section===1?score.b:score.a)[i].split(' ');
    const rhythm=score.beats===6?[0,1,2,4,5]:space?[.25,1.25,2.25,3.25]:waltz?[0,1,2]:[0,.5,1.5,2,2.5,3.25];
    const lead=section===1||sparse?score.answer:score.lead;
    if(!sparse||i%2===0)phrase.forEach((pitch,j)=>{
      const t=rhythm[j],next=j+1<rhythm.length?rhythm[j+1]:score.beats;
      const swing=score.style==='swing'&&t%1===.5?.055:0;
      play(lead,start+t*beat+swing+.006,(next-t)*beat*.78,pitch,(space?.115:rock?.082:score.lead==='whistle'?.115:.11)*energy,j%2?.04:-.04,space?.35:.14);
    });
    if(sparse&&i%2===1||section===3&&i%2===1){
      for(const [j,t]of (waltz?[1,2]:score.beats===6?[4,5]:[2.5,3.25]).entries())
        play(space?'bell':rock?'organ':'clarinet',start+t*beat,beat*.45,note(chord[j+1])*2,.05,j?.23:-.23,.18);
    }
    const pulse=score.beats===6?[0,3]:waltz?[0]:[0,2];
    for(const t of pulse)play('kick',start+t*beat,.105,60,(rock||funk?.17:.06)*energy,0,.03);
    const backbeats=score.beats===6?[3]:waltz?[1,2]:[1,3];
    for(const t of backbeats)play(rock||funk?'snare':'brush',start+t*beat+.006,.085,190,(rock?.09:funk?.06:.042)*energy,.12,.035);
    const steps=score.beats*2;
    for(let j=0;j<steps;j++)if(!sparse||j%2===0)play(rock||funk?'hat':'shaker',start+j*beat/2+.003,.04,1000,(j%2?.012:.019)*energy,.32,.023);
    if((rock||funk)&&!sparse)for(const t of [.75,2.75])play('snare',start+t*beat,.045,190,.022,-.15,.02);
    if(i===7&&!sparse)for(let j=0;j<3;j++)play(rock||funk?'snare':'marimba',start+bar-beat*(.75-j*.25),.10,rock||funk?170+j*25:note(chord[3-j])*2,.041,j*.2-.2,.08);
    if(space&&i%2)play('bell',start+beat*3,.3,note(chord[3])*2,.035,.4,.6);
  }
  finish(song,true);
  const bytes=wav(song),file=score.id+'.wav',analysis=validate(bytes,true);
  // Music must meet the splice more gently than an ordinary adjacent PCM sample.
  if(analysis.loopBoundaryDelta>.009)throw Error(file+' has an audible-risk loop seam');
  fs.writeFileSync(path.join(output,file),bytes);
  clips.push({file,title:score.title,description:score.description,bpm:score.bpm,timeSignature:score.meter,bars:32,
    form:['Tema','Ponte','Passagem instrumental','Reprise'],instruments:[...instruments],
    loop:true,...analysis,sha256:createHash('sha256').update(bytes).digest('hex')});
  console.log(`${file}: ${analysis.durationSeconds.toFixed(1)}s, RMS ${analysis.rms}, loop seam ${analysis.loopBoundaryDelta}`);
}
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify({generator:'scripts/generate-music.cjs',source:'Original composed arrangements, synthesized instruments; no external samples or quoted melodies.',sampleRate:SR,
  mastering:'Stereo, gentle room tails wrapping over the loop, peak <= 0.60 and RMS <= 0.108. Original effects and recordings are untouched.',clips},null,2)+'\n');
const cards=clips.map(c=>`<article><h2>${c.title}</h2><p>${c.description}</p><p>${c.bpm} BPM · ${c.timeSignature} · ${Math.round(c.durationSeconds)} s</p><audio controls loop preload="none" aria-label="${c.title}" src="${c.file}"></audio><p><a href="../../${c.file}">Ouvir a versão anterior</a></p></article>`);
fs.writeFileSync(path.join(output,'index.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Trilhas da fazenda</title><style>body{max-width:900px;margin:32px auto;padding:0 20px;background:#19382e;color:#fff1cc;font:17px/1.5 system-ui}article{padding:20px;margin:24px 0;background:#254c3d;border-radius:16px}h2{font-size:22px}audio{width:100%;max-width:520px}a{color:#ffe1a0}</style><a href="../../CREDITS.html">Créditos de áudio</a><h1>Trilhas da fazenda</h1><p>Seis arranjos originais com tema, ponte, passagem instrumental e reprise. O volume inicial acompanha o jogo.</p>${cards.join('')}<script>for(const sound of document.querySelectorAll('audio')){sound.volume=.25;sound.addEventListener('play',()=>document.querySelectorAll('audio').forEach(other=>{if(other!==sound)other.pause();}));}</script></html>\n`);
