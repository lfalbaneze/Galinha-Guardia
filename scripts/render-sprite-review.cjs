async function main() {
// Render the actual character code at game scale and enlarged; no browser needed.
const {createCanvas, GlobalFonts}=require('@napi-rs/canvas');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
for(const [file,family] of [['arial.ttf','Arial'],['arialbd.ttf','Arial']]) {
  const font=path.join('C:/Windows/Fonts',file);
  if(fs.existsSync(font))GlobalFonts.registerFromPath(font,family);
}
const load=file=>vm.runInNewContext(fs.readFileSync(file,'utf8')+'\nCharacterArt;');
const art=await require('./sprite-loader.cjs').loadArt();
const names=['Galinha','Lobo','Ovelha','Porco','Cabra','Vaca','Pato','Coelho','Cão','Gato','Burro','Cordeiro','Pintinho'];
const poses=[['Frente',{direction:'down'}],['Direita',{direction:'right'}],['Costas',{direction:'up'}],['Esquerda',{direction:'left'}],['Fugindo',{direction:'up',lookBack:true,moving:true,sprinting:true,anim:1.2}],['Brabo',{direction:'right',mood:'angry'}],['Chorando',{direction:'right',mood:'crying',anim:1.5}]];
const output=path.join(root,'preview');fs.mkdirSync(output,{recursive:true});
const canvas=createCanvas(1080,1370),c=canvas.getContext('2d');
c.fillStyle='#f7efdc';c.fillRect(0,0,1080,1370);
c.fillStyle='#513e35';c.font='bold 28px Arial';c.fillText('A turma da fazenda',25,40);
c.font='15px Arial';c.fillText('Mesmos desenhos usados no jogo · direção, fuga e expressões',25,67);
c.textAlign='center';c.font='bold 13px Arial';
poses.forEach(([label],i)=>c.fillText(label,196+i*133,98));
art.species.forEach((species,i)=>{
  const y=172+i*90;
  c.fillStyle=i%2?'#88ac57':'#94b562';c.fillRect(12,y-61,1056,87);
  c.fillStyle='#304329';c.textAlign='left';c.font='bold 14px Arial';c.fillText(names[i],26,y-16);
  poses.forEach(([,pose],j)=>art.draw(c,species,196+j*133,y,{scale:1.15,...pose}));
});
fs.writeFileSync(path.join(output,'sprite-turnarounds.png'),canvas.toBuffer('image/png'));

// Optional reference from before this change, kept outside the shipped source.
if(process.argv[2]) {
  const before=load(path.resolve(process.argv[2]));
  const compare=createCanvas(1080,520),p=compare.getContext('2d');
  p.fillStyle='#f7efdc';p.fillRect(0,0,1080,520);
  p.fillStyle='#513e35';p.font='bold 27px Arial';p.fillText('Sprites da fazenda — antes e agora',26,41);
  p.font='15px Arial';p.fillText('Mesmos ângulos e mesma escala. Desenhos do próprio jogo.',26,69);
  const samples=[['Galinha · costas','chicken','up'],['Galinha · lado','chicken','right'],['Porco · lado','pig','left'],['Lobo · lado','wolf','right'],['Ovelha · lado','sheep','right'],['Vaca · frente','cow','down']];
  for(const [row,renderer] of [before,art].entries()) {
    const y=245+row*216;
    p.fillStyle=row?'#89ad55':'#a3ba77';p.fillRect(12,y-119,1056,174);
    p.fillStyle='#304329';p.font='bold 17px Arial';p.textAlign='left';p.fillText(row?'AGORA':'ANTES',26,y-91);
    samples.forEach(([label,species,direction],i)=>{
      const x=103+i*177;
      renderer.draw(p,species,x,y,{direction,scale:1.8,anim:0});
      p.textAlign='center';p.font='12px Arial';p.fillStyle='#304329';p.fillText(label,x,y+40);
    });
  }
  fs.writeFileSync(path.join(output,'sprites-before-after.png'),compare.toBuffer('image/png'));
}
console.log('Sprite review images rendered into preview/.');

}
main().catch(error => { console.error(error); process.exitCode = 1; });
