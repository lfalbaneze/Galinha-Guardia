// Render the actual game at district scale, including entities and depth sorting.
const fs = require('node:fs');
const path = require('node:path');
const { createCanvas } = require('@napi-rs/canvas');
const { createGame } = require('../tests/helpers.cjs');
async function main() {
  const folder = path.resolve(__dirname, '../.cache/farm-review');
  fs.mkdirSync(folder, { recursive: true });
  const canvas = createCanvas(900,520);
  const game = createGame(() => .5, { drawingContext: canvas.getContext('2d') });
  await require('./sprite-loader.cjs').loadGameSprites(game);
  game.run('resetGame(814237); state.phase="playing";');
  for (const id of ['poleiro','granja','estabulo','horta','quintal','fox']) {
    game.run(`{
      const area=WORLD.areas.find(a=>a.id===${JSON.stringify(id)});
      const focus=area?{x:area.x+area.w/2,y:area.y+area.h/2}:state.entities.foxes[0];
      if(!focus)throw Error('Missing review focus');
      Object.assign(state.entities.chicken,{x:focus.x+75,y:focus.y+75});
      camera.x=clamp(focus.x-450,0,WORLD.width-900);
      camera.y=clamp(focus.y-260,0,WORLD.height-520);
      renderGame();
    }`);
    fs.writeFileSync(path.join(folder,id+'.png'),canvas.toBuffer('image/png'));
  }
  console.log('District and waiting fox renders: .cache/farm-review/');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
