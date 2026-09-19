// Contact sheets and in-game captures use CharacterArt, including real animation and foot anchors.
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,GlobalFonts}=require('@napi-rs/canvas');
const {createGame}=require('../tests/helpers.cjs');
async function main() {
  for(const font of ['arial.ttf','arialbd.ttf'])GlobalFonts.registerFromPath('C:/Windows/Fonts/'+font,'Arial');
  const art=await require('./sprite-loader.cjs').loadArt(),sheet=createCanvas(1140,700),p=sheet.getContext('2d');
  p.fillStyle='#f7efd9';p.fillRect(0,0,1140,700);p.fillStyle='#294c3b';p.font='bold 30px Arial';
  p.fillText('Três galinhas, zero vontade de virar almoço',32,49);
  p.font='17px Arial';p.fillText('Arte usada no jogo · frente, lado, costas e passinhos · as três já estão liberadas',32,80);
  const skins=[['classic','Erina','Rajadinha, mas nada discreta.'],['silkie','Midori','Um espanador com planos de fuga.'],['blue','Alzira','Hoje ninguém vira caldo.']];
  skins.forEach(([skin,title,quip],row)=>{
    const y=115+row*185;p.fillStyle=row%2?'#e1e8d0':'#e9dfbd';p.fillRect(22,y,1096,173);
    p.fillStyle='#34533b';p.font='bold 22px Arial';p.fillText(title,39,y+35);p.font='14px Arial';p.fillText(quip,39,y+59);
    art.draw(p,'chicken',137,y+126,{skin,direction:'down',scale:1.15});
    for(const [i,direction] of ['down','right','up','left'].entries())art.draw(p,'chicken',360+i*166,y+134,{skin,direction,scale:2,moving:true,anim:i%3});
  });
  fs.writeFileSync(path.join(__dirname,'../preview/chickens.png'),sheet.toBuffer('image/png'));
  const canvas=createCanvas(900,520),h=createGame(()=>.5,{drawingContext:canvas.getContext('2d')});
  await require('./sprite-loader.cjs').loadGameSprites(h);
  h.run("resetGame(814237);state.phase='playing';camera.x=0;camera.y=0;state.entities.chicken.direction='down';");
  for(const [skin] of skins) {
    h.run(`SkinSystem.equip(state,'${skin}');renderGame()`);
    fs.writeFileSync(path.join(__dirname,`../preview/hen-${skin}-in-game.png`),canvas.toBuffer('image/png'));
  }
  console.log('Rendered three hen turnarounds and three actual game frames.');
}
main().catch(error=>{console.error(error);process.exitCode=1});
