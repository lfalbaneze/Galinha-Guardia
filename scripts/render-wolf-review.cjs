// Visual review through the same sprite renderer and Canvas scene used in the game.
const fs = require('node:fs'), path = require('node:path');
const {createCanvas, loadImage, GlobalFonts} = require('@napi-rs/canvas');
const {createGame} = require('../tests/helpers.cjs');
const {loadArt, loadGameSprites} = require('./sprite-loader.cjs');
const root = path.resolve(__dirname, '..');
async function main() {
  for (const font of ['arial.ttf','arialbd.ttf']) {
    const file = path.join('C:/Windows/Fonts', font);
    if (fs.existsSync(file)) GlobalFonts.registerFromPath(file, 'Arial');
  }
  fs.mkdirSync(path.join(root, 'preview'), {recursive:true});
  const art = await loadArt(), sheet = createCanvas(1100, 900), p = sheet.getContext('2d');
  p.fillStyle='#f7efd9'; p.fillRect(0,0,1100,900);
  p.fillStyle='#294c3b';p.font='bold 30px Arial';p.fillText('Lobo de olho no almoço',30,47);
  p.font='16px Arial';p.fillText('16 quadros · quatro direções · recortes e animação do jogo',30,77);
  for (const [row, direction] of ['down','right','up','left'].entries()) {
    const y=100+row*155;
    p.fillStyle=row%2?'#dbe4c7':'#e9dfbd';p.fillRect(20,y,1060,145);
    p.fillStyle='#34533b';p.font='bold 17px Arial';p.fillText(['Frente','Direita','Costas','Esquerda'][row],34,y+25);
    p.font='13px Arial';p.fillText('Tamanho no mapa',34,y+46);
    art.draw(p,'wolf',90,y+116,{direction});
    for (let anim=0;anim<4;anim++) art.draw(p,'wolf',355+anim*200,y+121,{direction,moving:true,anim,scale:1.3});
  }
  p.fillStyle='#34533b';p.font='bold 16px Arial';p.fillText('Perseguição',37,750);p.fillText('Final da aventura',235,750);
  art.draw(p,'wolf',110,845,{direction:'left',mood:'furious'});
  art.draw(p,'wolf',302,845,{direction:'down',mood:'crying'});
  const portrait=await loadImage(path.join(root,'assets/menu/portraits/wolf-expressivo.png'));
  p.fillText('Retrato do menu · 64 px',440,750);p.imageSmoothingEnabled=true;p.drawImage(portrait,490,778,64,64);
  p.fillText('Ao lado da galinha',737,750);
  art.draw(p,'wolf',806,843,{direction:'right'});art.draw(p,'chicken',956,843,{direction:'left',skin:'classic'});
  fs.writeFileSync(path.join(root,'preview/wolf-new.png'),sheet.toBuffer('image/png'));
  const canvas=createCanvas(900,520), h=createGame(()=>.5,{drawingContext:canvas.getContext('2d')});
  await loadGameSprites(h);
  h.run(`resetGame(814237);state.phase='playing';camera.x=0;camera.y=0;
    Object.assign(state.entities.wolf,{x:575,y:425,heading:Math.PI,huntUnlockTimer:0,mode:'chase',vx:-100,vy:0,anim:1,awareness:1});
    resolveEnvironment(state.entities.wolf);
    Object.assign(state.entities.chicken,{x:370,y:405,direction:'left',moving:true,sprinting:true});
    WolfDialogue.update(state,.05);renderGame();`);
  fs.writeFileSync(path.join(root,'preview/wolf-in-game.png'),canvas.toBuffer('image/png'));
  console.log('Rendered all 16 wolf frames, expressions, menu portrait and actual game scene.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
