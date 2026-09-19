// The review uses the actual game renderer, player movement, water effects and equipped sprites.
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,GlobalFonts}=require('@napi-rs/canvas');
const {createGame}=require('../tests/helpers.cjs');
async function main(){
  for(const [file,family] of [['arial.ttf','Arial'],['trebuc.ttf','Trebuchet MS']]) {
    const font=path.join('C:/Windows/Fonts',file);if(fs.existsSync(font))GlobalFonts.registerFromPath(font,family);
  }
  const canvas=createCanvas(900,520),h=createGame(()=>.5,{drawingContext:canvas.getContext('2d')});
  await require('./sprite-loader.cjs').loadGameSprites(h);
  h.run('resetGame(814237);state.phase="playing";state.lake.active=false;state.elapsed=2.4;');
  const sheet=createCanvas(1200,850),p=sheet.getContext('2d');p.fillStyle='#fff0cf';p.fillRect(0,0,1200,850);
  const variants=[['classic','Carijó de boia'],['blue','Galinha azul de boia'],['punk','Pato · nado livre'],['goose','Ganso · nado livre']];
  for(const [i,[skin,title]] of variants.entries()){
    h.run(`var pond=STRUCTURES.pond,c=state.entities.chicken;
      Object.assign(c,{x:pond.x+pond.w/2-32,y:pond.y+pond.h/2-14,skin:'${skin}',hidden:false,invulnerable:0,direction:'right',anim:0});
      EnvironmentSystem.initialize(state);input.clear();input.add('d');
      for(var step=0;step<12;step++){state.elapsed+=1/60;Player.update(state,1/60);}input.clear();
      camera.x=clamp(pond.x+pond.w/2-450,0,WORLD.width-900);camera.y=clamp(pond.y+pond.h/2-260,0,WORLD.height-520);
      renderGame();`);
    const pond=h.run('STRUCTURES.pond'),cam=h.run('camera'),x=i%2*600,y=Math.floor(i/2)*425;
    p.fillStyle='#335641';p.font='bold 20px Arial';p.fillText(title,x+22,y+30);
    // An enlarged crop exposes compositing at the waterline as well as the bank.
    p.imageSmoothingEnabled=false;
    p.drawImage(canvas,pond.x-cam.x-70,pond.y-cam.y-70,pond.w+140,pond.h+140,x+15,y+45,570,365);
    if(i===0)fs.writeFileSync(path.resolve(__dirname,'../preview/swimming-in-game.png'),canvas.toBuffer('image/png'));
  }
  fs.writeFileSync(path.resolve(__dirname,'../preview/swimming.png'),sheet.toBuffer('image/png'));
  console.log('Rendered chicken floats and natural duck/goose swimming through the game.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
