const fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {createGame}=require('../tests/helpers.cjs');
const {loadGameSprites}=require('./sprite-loader.cjs');
async function main() {
  const h=createGame(()=>.5),a=h.run('FarmSprites');await a.loadCohesive(loadImage,createCanvas);
  const c=createCanvas(640,400).getContext('2d');c.fillStyle='#789552';c.fillRect(0,0,640,400);c.scale(2,2);
  a.draw(c,'coop',15,10,136,150,{grounded:true});
  a.draw(c,'coop',165,10,136,150,{grounded:true,shadow:true,foundation:true});
  fs.writeFileSync(path.join(__dirname,'../preview/coop-supports.png'),c.canvas.toBuffer('image/png'));
  const canvas=createCanvas(900,520),game=createGame(()=>.5,{drawingContext:canvas.getContext('2d')});
  await loadGameSprites(game);
  game.run(`resetGame(814237);var coop=FarmArt.getProps(WORLD.layout).find(p=>p.type==='coop'&&p.areaId==='granja')||FarmArt.getProps(WORLD.layout).find(p=>p.type==='coop');
    camera.x=clamp(coop.x-330,0,WORLD.width-900);camera.y=clamp(coop.y-170,0,WORLD.height-520);
    Object.assign(state.entities.chicken,{x:coop.x-40,y:coop.y+coop.h+15,skin:'robocop',invulnerable:0});renderGame();`);
  fs.writeFileSync(path.join(__dirname,'../preview/grounded-coop.png'),canvas.toBuffer('image/png'));
  console.log('Coop foundations rendered at 2x and in the actual farm.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
