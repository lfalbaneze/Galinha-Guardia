// Actual production rendering of the starting area before and after Continue.
const fs=require('node:fs'),path=require('node:path');
const {createCanvas}=require('@napi-rs/canvas');
const {createGame}=require('../tests/helpers.cjs');
async function main(){
  const folder=path.resolve(__dirname,'../.cache/map-cleanup');fs.mkdirSync(folder,{recursive:true});
  const canvas=createCanvas(900,520),h=createGame(()=>.5,{drawingContext:canvas.getContext('2d')});
  await require('./sprite-loader.cjs').loadGameSprites(h);
  h.run(`resetGame(814237,2);state.phase='playing';camera.x=0;camera.y=180;
    state.entities.chicken.x=460;state.entities.chicken.y=420;renderGame();`);
  fs.writeFileSync(path.join(folder,'before.png'),canvas.toBuffer('image/png'));
  h.run(`GameManager.save(state);var old=GameManager.read();resetGame(old.worldSeed);GameManager.restore(state,old);
    state.phase='playing';camera.x=0;camera.y=180;renderGame();`);
  fs.writeFileSync(path.join(folder,'after.png'),canvas.toBuffer('image/png'));
  console.log('Actual old-save upgrade rendered: '+folder);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
