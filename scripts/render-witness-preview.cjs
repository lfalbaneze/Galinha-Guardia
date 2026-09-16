async function main() {
// Render a witnessed hiding entrance through the real game runtime and farm.
// This does not move the wolf or simulate a capture; the frame shows the warning.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const { createGame } = require('../tests/helpers.cjs');

for (const [file, family] of [['arial.ttf', 'sans-serif'], ['arialbd.ttf', 'sans-serif'], ['trebuc.ttf', 'Trebuchet MS']]) {
  const font = path.join('C:/Windows/Fonts', file);
  if (fs.existsSync(font)) GlobalFonts.registerFromPath(font, family);
}

const canvas = createCanvas(900, 520);
const game = createGame(() => 0.5, { drawingContext: canvas.getContext('2d') });
await require('./sprite-loader.cjs').loadGameSprites(game);
game.run(`
  resetGame(814237);
  state.phase = 'playing';
  const chicken = state.entities.chicken, wolf = state.entities.wolf;
  const isFree = entity => {
    const h = getHitbox(entity);
    return h.x > h.r && h.y > h.r && h.x < WORLD.width - h.r && h.y < WORLD.height - h.r &&
      OBSTACLES.filter(r => r.blocking !== false).every(r =>
        Math.hypot(h.x - clamp(h.x, r.x, r.x + r.w), h.y - clamp(h.y, r.y, r.y + r.h)) >= h.r + 2);
  };
  let selectedCover = null;
  // Separate the real wolf speech and cover warning vertically. Both positions
  // must be traversable and visible, without moving any farm props for the shot.
  for (const spot of HidingSpots.getSpots().filter(s => s.type === 'bush')) {
    for (const { dx, dy } of [{ dx: 0, dy: -140 }, { dx: -116, dy: 80 }, { dx: 116, dy: 80 }]) {
      Object.assign(chicken, { x: spot.x + spot.w / 2, y: spot.y + spot.h / 2,
        hidden: false, hidingSpotId: null, invulnerable: 0, direction: 'down' });
      Object.assign(wolf, { x: chicken.x + dx, y: chicken.y + dy,
        heading: Math.atan2(-dy, -dx), huntUnlockTimer: 0, pauseTimer: 0 });
      if (isFree(chicken) && isFree(wolf) && HidingSpots.candidate(chicken)?.id === spot.id &&
          DetectionSystem.canSee(wolf, chicken, WolfAI.getConfig(state))) {
        selectedCover = spot;
        break;
      }
    }
    if (selectedCover) break;
  }
  if (!selectedCover) throw new Error('No accessible bush with a clear view at roughly 140 px.');
  HidingSpots.update(state, 0);
  HidingSpots.toggle(state);
  for (let i = 0; i < 15; i++) HidingSpots.update(state, 0.05);
  camera.x = clamp(chicken.x - 490, 0, WORLD.width - 900);
  camera.y = clamp(chicken.y - 360, 0, WORLD.height - 520);
  state.rescueNotice = null;
  state.skinNotice = null;
`);
assert.equal(game.run('WolfAI.isExposed(state)'), true);
assert.equal(game.run('wolf.mode'), 'inspect');
assert.equal(game.run('wolf.exposedCover.spotId'), game.run('selectedCover.id'));
assert.equal(game.run('state.lives'), 3);
assert.ok(game.run('distance(chicken, wolf)') > 135);
assert.ok(game.run('distance(chicken, wolf)') < 145);
assert.ok(game.run('worldToScreen(wolf).y') > 137, 'wolf speech must remain visible');

game.run('renderGame();');
const destination = path.resolve(__dirname, '../preview/hiding-exposed.png');
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, canvas.toBuffer('image/png'));
console.log(`Rendered ${path.relative(path.resolve(__dirname, '..'), destination)} with real cover memory: ${game.run('selectedCover.id')}.`);

}
main().catch(error => { console.error(error); process.exitCode = 1; });
