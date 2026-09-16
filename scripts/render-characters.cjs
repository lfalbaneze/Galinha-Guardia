async function main() {
const { createCanvas } = require('@napi-rs/canvas');
const { readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const art = await require('./sprite-loader.cjs').loadArt();
const canvas = createCanvas(2400, 1760), ctx = canvas.getContext('2d');
ctx.fillStyle = '#eee7d6'; ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = '#655143'; ctx.font = 'bold 42px sans-serif'; ctx.fillText('Amigos do campo', 52, 62);
ctx.font = '23px sans-serif'; ctx.fillText('Quatro direções · volumes suaves · passos alternados · animações de corrida e esconderijo', 54, 105);
const names = ['Galinha', 'Lobo', 'Ovelha', 'Porco', 'Cabra', 'Vaca', 'Pato', 'Coelho', 'Cão', 'Gato', 'Burro', 'Cordeiro'];
const directions = ['down', 'right', 'up', 'left'], labels = ['Frente', 'Direita', 'Costas', 'Esquerda'];
ctx.textAlign = 'center';
art.species.slice(0, 12).forEach((species, i) => {
  const x = 35 + (i % 4) * 595, y = 140 + Math.floor(i / 4) * 408;
  ctx.fillStyle = '#faf5e8'; ctx.beginPath(); ctx.roundRect(x, y, 560, 385, 22); ctx.fill();
  ctx.fillStyle = '#655143'; ctx.font = 'bold 25px sans-serif'; ctx.fillText(names[i], x + 280, y + 38);
  directions.forEach((direction, j) => {
    const cx = x + 72 + j * 137;
    art.draw(ctx, species, cx, y + 155, { scale: 1.7, direction, anim: 1.1, moving: true });
    ctx.fillStyle = '#87745f'; ctx.font = '17px sans-serif'; ctx.fillText(labels[j], cx, y + 207);
    art.draw(ctx, species, cx, y + 308, { direction, anim: 0 });
  });
  ctx.fillStyle = '#a08d72'; ctx.font = '15px sans-serif'; ctx.fillText('Escala do jogo', x + 280, y + 359);
});
const poses = [
  ['Corrida · passo 1', 'chicken', { direction: 'right', moving: true, sprinting: true, anim: .73 }],
  ['Corrida · passo 2', 'chicken', { direction: 'right', moving: true, sprinting: true, anim: 2.2 }],
  ['Agachando', 'chicken', { direction: 'down', hideBlend: .5 }],
  ['Escondida', 'chicken', { direction: 'down', hidden: true, hideBlend: 1 }],
  ['Em alerta', 'wolf', { direction: 'down', mood: 'alert' }],
  ['Farejando', 'wolf', { direction: 'right', mood: 'sniff', anim: 1.7 }],
];
poses.forEach(([label, species, options], i) => {
  const x = 200 + i * 398;
  art.draw(ctx, species, x, 1574, { scale: 2.5, ...options });
  ctx.fillStyle = '#655143'; ctx.font = '23px sans-serif'; ctx.fillText(label, x, 1647);
});
ctx.fillStyle = '#8d7b64'; ctx.font = '20px sans-serif'; ctx.fillText('Desenhos vetoriais originais · mesma âncora de colisão em todas as poses', 1200, 1721);
const target = path.join(root, 'preview'); mkdirSync(target, { recursive: true });
writeFileSync(path.join(target, 'characters.png'), canvas.toBuffer('image/png'));

const wardrobe = createCanvas(1800, 1640), wc = wardrobe.getContext('2d');
wc.fillStyle='#eee7d6';wc.fillRect(0,0,1800,1640);wc.fillStyle='#655143';wc.font='bold 38px sans-serif';wc.fillText('O guarda-roupa da galinha',45,60);
wc.font='22px sans-serif';wc.fillText('Roupas completas nas quatro direções, durante a corrida e no esconderijo',45,102);
wc.textAlign='center';wc.font='19px sans-serif';['Frente','Direita','Costas','Esquerda','Escondida','Escala do jogo'].forEach((label,j)=>wc.fillText(label,330+j*260,141));
const skins=[['classic','Clássica'],['punk','Punk'],['astronaut','Astronauta'],['robocop','Robocop'],['priest','Padre']];
skins.forEach(([skin,label],i)=>{
  const y=307+i*277;
  wc.fillStyle='#faf5e8';wc.beginPath();wc.roundRect(30,y-149,1740,249,20);wc.fill();
  wc.fillStyle='#655143';wc.font='bold 26px sans-serif';wc.fillText(label,118,y-18);
  directions.forEach((direction,j)=>art.draw(wc,'chicken',330+j*260,y,{skin,direction,scale:2.1,anim:1.3,moving:true,sprinting:true}));
  art.draw(wc,'chicken',1370,y,{skin,direction:'down',scale:2.1,hideBlend:1,hidden:true});
  art.draw(wc,'chicken',1630,y,{skin,direction:'down'});
});
writeFileSync(path.join(target,'costumes.png'),wardrobe.toBuffer('image/png'));

const expressions=createCanvas(1800,1580),ec=expressions.getContext('2d');
ec.fillStyle='#eee7d6';ec.fillRect(0,0,1800,1580);ec.fillStyle='#655143';ec.font='bold 38px sans-serif';ec.fillText('Raiva de desenho animado, lágrimas e pintinhos',45,60);
ec.font='23px sans-serif';ec.fillText('O lobo fica furioso na perseguição e sai chorando no final',45,103);
function caption(label,y){ec.fillStyle='#655143';ec.font='bold 28px sans-serif';ec.textAlign='left';ec.fillText(label,50,y);}
caption('FURIOSO',160);
directions.forEach((direction,j)=>{
  art.draw(ec,'wolf',225+j*450,320,{direction,mood:'furious',scale:3,anim:1.7,moving:true});
  ec.fillStyle='#655143';ec.font='20px sans-serif';ec.textAlign='center';ec.fillText(labels[j],225+j*450,390);
});
caption('CHORANDO',460);
directions.forEach((direction,j)=>{
  art.draw(ec,'wolf',225+j*450,635,{direction,mood:'crying',scale:3,anim:1.7,moving:true});
  ec.fillStyle='#655143';ec.font='20px sans-serif';ec.textAlign='center';ec.fillText(labels[j],225+j*450,705);
});
caption('A TURMA TODA FICA BRAVA',790);
art.species.slice(0,12).forEach((species,i)=>{
  const x=150+(i%6)*300,y=946+Math.floor(i/6)*203;
  art.draw(ec,species,x,y,{direction:i%2?'right':'down',mood:'angry',scale:2,anim:1.3});
  ec.fillStyle='#655143';ec.font='20px sans-serif';ec.textAlign='center';ec.fillText(names[i],x,y+58);
});
caption('SEIS PINTINHOS PARA A FAMÍLIA',1300);
for(let i=0;i<6;i++){
  const x=150+i*300;
  art.draw(ec,'chick',x,1450,{direction:directions[i%4],scale:2.7,anim:i*.5,moving:true,mood:i===5?'angry':'normal'});
  art.draw(ec,'chick',x+82,1450,{direction:directions[i%4],anim:i*.5,moving:true});
  ec.fillStyle='#655143';ec.font='20px sans-serif';ec.textAlign='center';ec.fillText(`Pintinho ${i+1}`,x,1515);
}
writeFileSync(path.join(target,'expressions.png'),expressions.toBuffer('image/png'));
console.log('preview/characters.png\npreview/costumes.png\npreview/expressions.png');

}
main().catch(error => { console.error(error); process.exitCode = 1; });
