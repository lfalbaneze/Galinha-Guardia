// Review the shipped art at game scale, enlarged, and through the actual game renderer.
const fs = require('node:fs'), path = require('node:path');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const { createGame } = require('../tests/helpers.cjs');
const root = path.resolve(__dirname, '..');
async function main() {
  for (const font of ['arial.ttf', 'arialbd.ttf']) GlobalFonts.registerFromPath('C:/Windows/Fonts/' + font, 'Arial');
  const loader = require('./sprite-loader.cjs'), art = await loader.loadArt();
  const skins = ['punk', 'astronaut', 'robocop', 'goose', 'priest'];
  const quips = ['Chapéu firme, nadadeiras a mil.', 'As orelhas vão de carona.', 'Guizo pequeno, coragem grande.', 'Fôlego até para reclamar.', 'Caramelo da roça, amigo de todos.'];
  const canvas = createCanvas(1280, 1190), c = canvas.getContext('2d');
  c.fillStyle = '#f4ecd7'; c.fillRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = '#294c3b'; c.font = 'bold 32px Arial'; c.fillText('A turma que põe as penas pro ar', 32, 48);
  c.font = '17px Arial'; c.fillText('Cinco amigos da fazenda · sprites e animações usados no jogo', 33, 79);
  c.font = '14px Arial'; c.textAlign = 'center';
  ['Frente', 'Direita', 'Costas', 'Esquerda', 'Passo 1', 'Passo 2'].forEach((label, i) => c.fillText(label, 355 + i * 159, 110));
  skins.forEach((skin, row) => {
    const y = 124 + row * 204, identity = art.appearances[skin];
    c.fillStyle = row % 2 ? '#dce6cd' : '#e9dfbd'; c.fillRect(22, y, 1236, 192);
    c.textAlign = 'left'; c.fillStyle = '#294c3b'; c.font = 'bold 25px Arial'; c.fillText(identity.name, 40, y + 36);
    c.font = '13px Arial'; c.fillText(quips[row], 40, y + 61);
    art.draw(c, 'chicken', 137, y + 143, { skin, direction: 'down' });
    c.font = '12px Arial'; c.textAlign = 'center'; c.fillText('Tamanho no mapa', 137, y + 179);
    ['down', 'right', 'up', 'left', 'right', 'right'].forEach((direction, i) => {
      art.draw(c, 'chicken', 355 + i * 159, y + 142, { skin, direction, scale: 1.8, moving: i > 3, anim: i === 4 ? 1 : 3 });
    });
  });
  c.textAlign = 'left'; c.font = '14px Arial'; c.fillStyle = '#47633e';
  c.fillText('Zeca · Pipoca · Stella · Gumercindo · Paçoca', 33, 1170);
  fs.mkdirSync(path.join(root, 'preview'), { recursive: true });
  fs.writeFileSync(path.join(root, 'preview/skin-characters.png'), canvas.toBuffer('image/png'));

  const gameCanvas = createCanvas(900, 520);
  const storage = new Map([['galinha-guardia-wardrobe-v1', JSON.stringify({ version: 2, best: 6, selected: 'classic', unlocked: Object.keys(art.appearances) })]]);
  const h = createGame(() => .5, { storage, drawingContext: gameCanvas.getContext('2d') });
  await loader.loadGameSprites(h);
  h.run("resetGame(814237);state.phase='playing';camera.x=0;camera.y=0;state.entities.chicken.direction='down';");
  for (const skin of skins) {
    h.run(`SkinSystem.equip(state,'${skin}');renderGame()`);
    fs.writeFileSync(path.join(root, `preview/${art.appearances[skin].sprite}-in-game.png`), gameCanvas.toBuffer('image/png'));
  }
  console.log('Rendered five named skins, their steps, and five actual game frames.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
