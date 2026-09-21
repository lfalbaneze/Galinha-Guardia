const { loadImage, createCanvas } = require('@napi-rs/canvas');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
async function loadArt() {
  const context = vm.createContext({ console, setTimeout, clearTimeout });
  for (const file of ['sprite-style.js','sprite-data.js','arcade-art-data.js','premium-art-data.js','pixel-art-data.js','pixellab-art-data.js', 'character-art.js'])
    vm.runInContext(fs.readFileSync(path.join(root, 'systems', file), 'utf8'), context);
  vm.runInContext('SpriteStyle',context).install(createCanvas);
  const art = vm.runInContext('CharacterArt', context);
  await art.load(src => loadImage(path.join(root, src)));
  if (!art.ready) throw Error('Sprite preview failed: ' + art.errors.join(', '));
  return art;
}
async function loadGameSprites(game) {
  game.run('SpriteStyle').install(createCanvas);
  const art = game.run('CharacterArt');
  await art.load(src => loadImage(path.join(root, src)));
  if (!art.ready) throw Error('Game preview failed: ' + art.errors.join(', '));
  await game.run('GooseArt').load(src => loadImage(path.join(root, src)));
  await game.run('FoxArt').load(src => loadImage(path.join(root, src)));
  await game.run('OwlArt').load(src => loadImage(path.join(root, src)));
  await game.run('ThorArt').load(src => loadImage(path.join(root, src)));
  await game.run('ThorCinematic').load(src => loadImage(path.join(root, src)));
  await game.run('ScarecrowArt').load(src => loadImage(path.join(root, src)));
  await game.run('FarmSprites').load(loadImage, createCanvas);
  await game.run('FarmSprites').loadNursery(loadImage, createCanvas);
  await game.run('FarmSprites').loadHabitats(loadImage, createCanvas);
  await game.run('FarmSprites').loadProps(loadImage, createCanvas);
  await game.run('FarmSprites').loadCohesive(loadImage, createCanvas);
  await game.run('FarmScenery').load(loadImage, createCanvas);
  game.run('FarmTerrain').install(createCanvas);
}
module.exports = { loadArt, loadGameSprites };
