const fs=require('node:fs'),path=require('node:path');
const {createCanvas}=require('@napi-rs/canvas');
const {createGame}=require('../tests/helpers.cjs');
const {loadGameSprites}=require('./sprite-loader.cjs');
async function main() {
  const canvas=createCanvas(900,520),h=createGame(()=>.5,{drawingContext:canvas.getContext('2d')});
  await loadGameSprites(h);
  h.run(`resetGame(814237);var plot=WORLD.layout.plots.find(p=>p.kind==='garden');
    camera.x=plot.x-280;camera.y=plot.y-100;var c=state.entities.chicken;
    Object.assign(c,{x:plot.x+plot.w+40,y:plot.y+105,skin:'priest',invulnerable:0});renderGame();`);
  const shot=name=>fs.writeFileSync(path.join(__dirname,'../preview/'+name+'.png'),canvas.toBuffer('image/png'));
  shot('garden-renewed');
  h.run(`var crop=FarmArt.getCrops(WORLD.layout).find(p=>p.plotId===plot.id&&!p.sprout&&p.variant===1);
    Object.assign(c,{x:crop.x-24,y:crop.y-14});EnvironmentSystem.initialize(state);input.add('d');input.add('shift');
    for(var i=0;i<9;i++)Player.update(state,1/60);renderGame();`);
  shot('garden-contact');
  console.log(h.run('JSON.stringify(EnvironmentSystem.inspect(state))'));
  h.run(`input.clear();for(var i=0;i<150;i++)Player.update(state,1/60);renderGame();`);
  shot('garden-settled');
  console.log('Garden contact and settled frames saved.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
