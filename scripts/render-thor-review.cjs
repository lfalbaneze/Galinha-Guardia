// Actual Canvas scenes and HUD text, without requiring a browser or advancing the saved game.
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,GlobalFonts}=require('@napi-rs/canvas');
const {createGame}=require('../tests/helpers.cjs');
async function main(){
  for(const [file,family]of [['arial.ttf','Arial'],['trebuc.ttf','Trebuchet MS']]){
    const font=path.join('C:/Windows/Fonts',file);if(fs.existsSync(font))GlobalFonts.registerFromPath(font,family);
  }
  const canvas=createCanvas(900,520),h=createGame(()=>.5,{drawingContext:canvas.getContext('2d')});
  await require('./sprite-loader.cjs').loadGameSprites(h);
  h.run(`resetGame(814237);state.phase='playing';state.difficultyKey='normal';state.elapsed=1;
    var bones=ThorSystem.bones(state),c=state.entities.chicken,first=bones[0];
    c.x=first.x-65;c.y=first.y;c.direction='right';c.invulnerable=0;
    camera.x=clamp(first.x-450,0,WORLD.width-900);camera.y=clamp(first.y-270,0,WORLD.height-520);`);
  const sheet=createCanvas(1800,580),p=sheet.getContext('2d');p.fillStyle='#fff0ce';p.fillRect(0,0,1800,580);
  function capture(i,title){
    h.run('GameUI.update(state);renderGame()');
    p.fillStyle='#36563d';p.font='bold 20px Arial';p.fillText(title,20+i*900,28);
    p.font='15px Arial';p.fillText(h.elements.get('thorSupply').textContent.replaceAll('🦴','Ossos ·').replaceAll('✓','pronto'),20+i*900,51);p.drawImage(canvas,i*900,60);
  }
  capture(0,'Ossos pelos caminhos · marcados no minimapa');
  h.run(`for(const b of bones){c.x=b.x;c.y=b.y;ThorSystem.update(state,.05);}
    c.x=first.x-65;c.y=first.y;state.lives=1;ThorSystem.request(state);
    for(let i=0;i<78;i++)ThorSystem.update(state,.05);`);
  capture(1,'Médio: 2 ossos para chamar Thor e recuperar toda a vida');
  fs.writeFileSync(path.resolve(__dirname,'../preview/thor-help.png'),sheet.toBuffer('image/png'));
  console.log('Rendered collectible bones and the emergency arrival with actual HUD counter text.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
