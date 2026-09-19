// Review the four labels in the actual game scene, using their generated positions.
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,GlobalFonts}=require('@napi-rs/canvas');
const {createGame}=require('../tests/helpers.cjs');
async function main(){
  for(const [file,family] of [['trebuc.ttf','Trebuchet MS'],['arial.ttf','Arial']]) {
    const font=path.join('C:/Windows/Fonts',file);if(fs.existsSync(font))GlobalFonts.registerFromPath(font,family);
  }
  const canvas=createCanvas(900,520),game=createGame(()=>.5,{drawingContext:canvas.getContext('2d')});
  await require('./sprite-loader.cjs').loadGameSprites(game);
  game.run('resetGame(814237);state.phase="playing";');
  const sheet=createCanvas(1800,1040),ctx=sheet.getContext('2d');
  for(const [i,area] of ['granja','estabulo','horta','quintal'].entries()) {
    game.run(`var label=FarmArt.getProps(WORLD.layout).find(p=>p.type==='sign'&&p.areaId==='${area}');
      camera.x=clamp(label.x+label.w/2-450,0,WORLD.width-900);
      camera.y=clamp(label.y-350,0,WORLD.height-520);renderGame();`);
    ctx.drawImage(canvas,(i%2)*900,Math.floor(i/2)*520);
  }
  fs.mkdirSync(path.resolve(__dirname,'../preview'),{recursive:true});
  fs.writeFileSync(path.resolve(__dirname,'../preview/signs.png'),sheet.toBuffer('image/png'));
  console.log('Rendered cornfield, paddock, garden and apple orchard labels.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
