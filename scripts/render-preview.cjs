async function main() {
// Offline Canvas rendering uses the exact game scripts, without driving a browser.
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('node:fs');
const path = require('node:path');
const { createGame } = require('../tests/helpers.cjs');
for (const [file, family] of [['arial.ttf','sans-serif'],['arialbd.ttf','sans-serif'],['trebuc.ttf','Trebuchet MS']]) {
  const font = path.join('C:/Windows/Fonts', file);
  if (fs.existsSync(font)) GlobalFonts.registerFromPath(font, family);
}
const folder = path.resolve(__dirname, '../preview');
fs.mkdirSync(folder, { recursive: true });
const canvas = createCanvas(900, 520);
const game = createGame(Math.random, { drawingContext: canvas.getContext('2d') });
await require('./sprite-loader.cjs').loadGameSprites(game);
game.run('resetGame(814237); state.phase="playing"; camera.x=0; camera.y=0;');
function save(name) {
  game.run('renderGame();');
  fs.writeFileSync(path.join(folder, name + '.png'), canvas.toBuffer('image/png'));
}
save('farm-start');

game.run(`const secretChick=state.entities.chicks[0];
  const approach=[-1,1].map(side=>({x:secretChick.x+side*42,y:secretChick.y})).find(point=>
    DetectionSystem.hasLineOfSight(point,getHitbox(secretChick))) || {x:secretChick.x,y:secretChick.y+40};
  Object.assign(state.entities.chicken,{...approach,moving:false,sprinting:false});
  camera.x=clamp(secretChick.x-450,0,WORLD.width-900);camera.y=clamp(secretChick.y-270,0,WORLD.height-520);`);
save('secret-clue');
game.run(`input.add('c');for(let i=0;i<10;i++)RescueSystem.update(state,.05);`);
save('secret-search');
game.run(`for(let i=0;i<7;i++)RescueSystem.update(state,.05);input.clear();`);
save('secret-found');
game.run('resetGame(814237);state.phase="playing";camera.x=0;camera.y=0;');
game.run(`const spot = HidingSpots.getSpots().find(s=>s.type==='bush' && s.areaId==='poleiro');
  state.entities.chicken.x=spot.x+spot.w/2; state.entities.chicken.y=spot.y+spot.h/2;
  camera.x=clamp(state.entities.chicken.x-450,0,WORLD.width-900);
  camera.y=clamp(state.entities.chicken.y-300,0,WORLD.height-520);
  RescueSystem.update(state,0); state.rescueNotice=null;
  HidingSpots.update(state,0.05);`);
save('before-hiding');
game.run('HidingSpots.toggle(state); for(let i=0;i<15;i++) HidingSpots.update(state,0.05);');
save('hiding');
game.run(`const hay=HidingSpots.getSpots().find(s=>s.type==='hay');
  state.entities.chicken.hidden=false; state.entities.chicken.hidingSpotId=null;
  state.entities.chicken.x=hay.bale.x+hay.bale.w/2; state.entities.chicken.y=hay.bale.y+hay.bale.h+15;
  resolveEnvironment(state.entities.chicken); HidingSpots.update(state,0.05); HidingSpots.toggle(state);
  for(let i=0;i<15;i++) HidingSpots.update(state,0.05);
  camera.x=clamp(state.entities.chicken.x-450,0,WORLD.width-900);
  camera.y=clamp(state.entities.chicken.y-300,0,WORLD.height-520);`);
save('hiding-hay');
game.run(`resetGame(814237); state.phase='playing'; camera.x=0; camera.y=0;
  Object.assign(state.entities.wolf,{x:575,y:425,heading:Math.PI,huntUnlockTimer:0});
  resolveEnvironment(state.entities.wolf);
  Object.assign(state.entities.chicken,{x:370,y:405,direction:'right'});
  for(let i=0;i<7;i++) WolfAI.update(state,0.05);`);
save('wolf-suspicion');
game.run(`input.add('a'); input.add('shift');
  for(let i=0;i<5;i++) Player.update(state,0.05);
  Object.assign(state.entities.wolf,{mode:'chase',awareness:1});WolfDialogue.update(state,0.05);`);
save('sprint');
game.run(`input.clear(); Object.assign(state.entities.chicken,{moving:false,sprinting:false});
  const friend=state.entities.animals[1];
  state.entities.chicken.x=friend.x; state.entities.chicken.y=friend.y;
  RescueSystem.update(state,0);`);
save('rescue');
game.run(`resetGame(814237); state.phase='playing';
  const firstChick=state.entities.chicks[0];
  state.entities.chicken.x=firstChick.x;state.entities.chicken.y=firstChick.y;
  input.add('c');for(let i=0;i<18;i++)RescueSystem.update(state,.05);input.clear();
  RescueSystem.update(state,0);SkinSystem.equip(state,'punk');
  camera.x=clamp(state.entities.chicken.x-450,0,WORLD.width-900);
  camera.y=clamp(state.entities.chicken.y-300,0,WORLD.height-520);`);
save('chick-rescue');
game.run(`for(const friend of RescueSystem.all(state)) GameManager.rescue(state,Object.assign(friend,{discovered:true}));
  SkinSystem.equip(state,'astronaut');GameManager.win(state);`);
for (const [name, time] of [['final-angry',5.7],['final-cloud',8.6],['final-crying',12.5],['final-flee',14.2],['final-party',18.5]]) {
  game.run(`while(state.cutscene.time < ${time}-0.00001) updateGame(Math.min(0.05,${time}-state.cutscene.time));`);
  save(name);
}
const atlas = createCanvas(2800, 1800), atlasCtx = atlas.getContext('2d');
game.context.previewCtx = atlasCtx;
for (const seed of [814237, 391602]) {
  game.run(`const previewLayout${seed}=WorldGenerator.generate(${seed});
    FarmArt.drawGround(previewCtx, previewLayout${seed}, {x:0,y:0});
    for(const p of FarmArt.getProps(previewLayout${seed})) FarmArt.drawProp(previewCtx,p,{x:0,y:0});`);
  fs.writeFileSync(path.join(folder, `farm-${seed}.png`), atlas.toBuffer('image/png'));
}
console.log('Rendered gameplay, chick rescue, five finale stages, hiding and two farms into preview/.');

}
main().catch(error => { console.error(error); process.exitCode = 1; });
