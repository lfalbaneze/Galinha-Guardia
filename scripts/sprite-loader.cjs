const { loadImage, createCanvas } = require('@napi-rs/canvas');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
async function loadArt() {
  const context = vm.createContext({ console, setTimeout, clearTimeout });
  for (const file of ['sprite-data.js', 'character-art.js'])
    vm.runInContext(fs.readFileSync(path.join(root, 'systems', file), 'utf8'), context);
  const art = vm.runInContext('CharacterArt', context);
  await art.load(src => loadImage(path.join(root, src)));
  if (!art.ready) throw Error('Sprite preview failed: ' + art.errors.join(', '));
  return art;
}
async function loadGameSprites(game) {
  const art = game.run('CharacterArt');
  await art.load(src => loadImage(path.join(root, src)));
  if (!art.ready) throw Error('Game preview failed: ' + art.errors.join(', '));
  await game.run('FarmSprites').load(loadImage, createCanvas);
  await game.run('FarmSprites').loadNursery(loadImage, createCanvas);
  game.run('FarmTerrain').install(createCanvas);
}
module.exports = { loadArt, loadGameSprites };
