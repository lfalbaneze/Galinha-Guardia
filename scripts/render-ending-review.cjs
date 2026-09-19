// Render the actual end-game sequence and sprites at its key visual beats.
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('node:fs'), path = require('node:path');
const { createGame } = require('../tests/helpers.cjs');
const root = path.resolve(__dirname, '..');
GlobalFonts.registerFromPath('C:/Windows/Fonts/trebucbd.ttf', 'Trebuchet MS');
(async () => {
  const canvas = createCanvas(900, 520), sheet = createCanvas(1800, 1560);
  const game = createGame(() => .5, { drawingContext: canvas.getContext('2d') });
  await require('./sprite-loader.cjs').loadGameSprites(game);
  game.context.document.createElement = () => createCanvas(300, 174);
  game.run(`for(const friend of RescueSystem.all(state)) GameManager.rescue(state,Object.assign(friend,{discovered:true})); GameManager.win(state);`);
  const shots = [['gather', 5.5], ['charge', 6.65], ['brawl', 8.12], ['final-hit', 10.45], ['dizzy', 11.8], ['party', 18.1]];
  for (const [i, [name, time]] of shots.entries()) {
    game.run(`while(state.cutscene.time < ${time}-.00001) updateGame(Math.min(.05,${time}-state.cutscene.time));renderGame();`);
    fs.writeFileSync(path.join(root, `preview/ending-${name}.png`), canvas.toBuffer('image/png'));
    sheet.getContext('2d').drawImage(canvas, (i % 2) * 900, Math.floor(i / 2) * 520);
  }
  fs.writeFileSync(path.join(root, 'preview/ending-storyboard.png'), sheet.toBuffer('image/png'));
  console.log('Rendered six finale beats with the real game sprites.');
})().catch(error => { console.error(error); process.exitCode = 1; });
