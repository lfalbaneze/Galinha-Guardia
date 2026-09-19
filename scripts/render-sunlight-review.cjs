const fs=require('node:fs'),path=require('node:path');
const {createCanvas}=require('@napi-rs/canvas');
const {createGame}=require('../tests/helpers.cjs');
const {loadGameSprites}=require('./sprite-loader.cjs');
async function main(){
  const canvas=createCanvas(900,520),h=createGame(()=>.5,{drawingContext:canvas.getContext('2d')});
  await loadGameSprites(h);
  h.run(`resetGame(814237);var coop=FarmArt.getProps(WORLD.layout).find(p=>p.type==='coop'&&p.areaId==='granja');
    camera.x=clamp(coop.x-430,0,WORLD.width-900);camera.y=clamp(coop.y-220,0,WORLD.height-520);
    Object.assign(state.entities.chicken,{x:coop.x-30,y:coop.y+coop.h+40,skin:'robocop',invulnerable:0});`);
  for(const [name,time]of [['morning',0],['noon',42],['afternoon',102]]) {
    h.context.sunTime=time;h.run('state.elapsed=sunTime;renderGame()');
    fs.writeFileSync(path.join(__dirname,'../preview/sun-'+name+'.png'),canvas.toBuffer('image/png'));
    console.log(name,h.run('JSON.stringify(Sunlight.inspect())'));
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
