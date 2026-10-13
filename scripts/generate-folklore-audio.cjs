// Original cartoon foley and musical signatures; no third-party recordings.
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {track,voice,note,finish,wav,validate}=require('./generate-audio.cjs');
const output=path.resolve(__dirname,'../assets/audio/effects/folklore-v1');
fs.mkdirSync(output,{recursive:true});
const clips=[];
function cue(id,event,seconds,description,compose){
  const song=track(seconds);song.silentEdge=.008;compose(song);finish(song,false);
  const bytes=wav(song),file=`folklore-${id}-${event}.wav`;
  fs.writeFileSync(path.join(output,file),bytes);
  clips.push({file,description,...validate(fs.readFileSync(path.join(output,file)),false),sha256:createHash('sha256').update(bytes).digest('hex')});
}
const tone=(s,type,at,seconds,from,gain=.3,to=from,pan=0)=>voice(s,type,at,seconds,note(from),gain,pan,{endFrequency:note(to),release:.06,decay:type==='brush'?2.5:undefined});
// Each cue has a readable lead-in, character gesture and a short, soft tail.
cue('fuinha','warn',.64,'Três gritinhos curiosos, com farfalhar discreto.',s=>{
  for(const [at,hz]of [[.03,980],[.2,1210],[.39,1080]])tone(s,'squeak',at,.1,hz,.3,hz*.7);
  tone(s,'brush',.02,.35,100,.19);
});
cue('fuinha','attack',.44,'Arrancada veloz com patinhas leves e deslize cômico.',s=>{
  for(let i=0;i<4;i++)tone(s,'pop',.02+i*.065,.09,180+i*40,.24,110);
  tone(s,'slide',.03,.28,800,.23,170);
});
cue('fuinha','defeat',.75,'Gritinho de surpresa caindo em duas notas de madeira.',s=>{
  tone(s,'squeak',.02,.23,1150,.27,390);tone(s,'marimba',.32,.2,'D5',.3);tone(s,'marimba',.47,.18,'G4',.26);
});
cue('mula-sem-cabeca','warn',.9,'Dois cascos pesados, sopro de fogo e sino baixo de alerta.',s=>{
  for(const at of [.03,.25]){tone(s,'bonk',at,.16,100,.42,66);tone(s,'brush',at,.12,100,.28);}
  tone(s,'brush',.3,.45,90,.4);tone(s,'bell',.48,.22,'D4',.17);
});
cue('mula-sem-cabeca','attack',.72,'Tropel curto em quatro apoios, com labareda passando.',s=>{
  for(const [i,at]of [.02,.14,.24,.39].entries()){tone(s,'bonk',at,.15,i%2?118:85,.38,60,i%2?.15:-.15);tone(s,'brush',at,.14,80,.22);}
  tone(s,'brush',.16,.39,90,.5);tone(s,'slide',.1,.4,300,.12,90);
});
cue('mula-sem-cabeca','defeat',1.05,'Fogo se apagando, casco final e sinos de alívio.',s=>{
  tone(s,'brush',.02,.5,100,.35);tone(s,'bonk',.23,.22,100,.25,60);
  for(const [i,hz]of ['D5','A4','D4'].entries())tone(s,'bell',.38+i*.15,.2,hz,.22);
});
cue('curupira','warn',.87,'Assobio de duas notas respondido por madeira oca.',s=>{
  tone(s,'whistle',.03,.21,'G5',.3,'D6');tone(s,'whistle',.3,.24,'B5',.3,'G5');tone(s,'bonk',.59,.14,350,.22,210);
});
cue('curupira','attack',.62,'Raízes brotando: madeira, folhas e estalo ascendente.',s=>{
  for(const [i,at]of [.02,.14,.3].entries()){tone(s,'bonk',at,.13,160+i*85,.3,90);tone(s,'brush',at,.2,100,.3);}
  tone(s,'flute',.08,.29,450,.17,1150);
});
cue('curupira','defeat',.94,'Assobio travesso descendente e três notas de marimba.',s=>{
  tone(s,'whistle',.03,.28,'D6',.25,'G5');for(const [i,hz]of ['B4','A4','G4'].entries())tone(s,'marimba',.36+i*.14,.2,hz,.3);
});
cue('boitata','warn',.84,'Chiado de serpente, crepitar e ressonância quente.',s=>{
  tone(s,'brush',.02,.65,100,.62);tone(s,'sob',.08,.4,145,.19,100);
  for(const at of [.12,.29,.44,.61])tone(s,'pop',at,.07,550,.13,260);
});
cue('boitata','attack',.72,'Labareda varrendo o chão, seguida por pequenos estalos.',s=>{
  tone(s,'brush',.02,.52,120,.67);tone(s,'slide',.03,.42,250,.22,85);
  for(let i=0;i<5;i++)tone(s,'pop',.06+i*.1,.075,450+i*70,.16,170);
});
cue('boitata','defeat',1.0,'Chiado apagando e brilho de brasa em sinos.',s=>{
  tone(s,'brush',.03,.53,100,.55);for(const [i,hz]of ['E5','B4','E4'].entries())tone(s,'bell',.4+i*.14,.23,hz,.2);
});
cue('cuca','warn',1.05,'Risada cartoon em três sílabas graves com bolhas de caldeirão.',s=>{
  for(const [i,hz]of [220,270,195].entries()){tone(s,'sob',.04+i*.22,.14,hz,.32,hz*.75);tone(s,'brush',.04+i*.22,.1,100,.19);}
  tone(s,'pop',.73,.1,440,.26,170);tone(s,'pop',.86,.08,620,.22,230);
});
cue('cuca','attack',.8,'Feitiço em espiral com três bolhas e sino desafinado.',s=>{
  tone(s,'boing',.02,.4,170,.29,780);for(const [i,hz]of [430,560,720].entries())tone(s,'pop',.08+i*.15,.14,hz,.3,hz*.5);
  tone(s,'bell',.37,.29,'F#5',.22);
});
cue('cuca','defeat',1.1,'Feitiço murchando, bolha final e acorde de derrota cômica.',s=>{
  tone(s,'boing',.03,.38,700,.27,105);tone(s,'pop',.48,.14,260,.3,110);
  tone(s,'marimba',.67,.23,'C5',.27);tone(s,'marimba',.78,.2,'F#4',.25);tone(s,'marimba',.86,.16,'C4',.28);
});
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify({generator:'scripts/generate-folklore-audio.cjs',source:'Original procedural compositions and foley. No external samples.',clips},null,2)+'\n');
const title={fuinha:'Fuinha','mula-sem-cabeca':'Mula sem Cabeça',curupira:'Curupira',boitata:'Boitatá',cuca:'Cuca'},event={warn:'Aviso',attack:'Ataque',defeat:'Derrota'};
const rows=clips.map(c=>{const [,id,action]=/^folklore-(.*)-(warn|attack|defeat)\.wav$/.exec(c.file);return `<article><strong>${title[id]} · ${event[action]}</strong><p>${c.description}</p><audio controls preload="none" aria-label="${title[id]} · ${event[action]}" src="${c.file}"></audio></article>`;});
fs.writeFileSync(path.join(output,'index.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sons das lendas</title><style>body{max-width:900px;margin:32px auto;padding:0 20px;background:#19382e;color:#fff1cc;font:17px/1.5 system-ui}article{display:inline-block;width:260px;vertical-align:top;padding:16px}audio{width:100%}a{color:#ffe1a0}</style><a href="../../CREDITS.html">Créditos de áudio</a><h1>Sons das lendas</h1>${rows.join('')}</html>\n`);
console.log('Generated and validated 15 original folklore cues.');
