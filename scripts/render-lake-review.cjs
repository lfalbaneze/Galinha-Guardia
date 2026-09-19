// Render the real game, including pond, bridge and collision-aware scenery.
const fs=require('node:fs'),path=require('node:path');
const {createCanvas}=require('@napi-rs/canvas');
const {createGame}=require('../tests/helpers.cjs');
async function main(){
  const canvas=createCanvas(900,520),h=createGame(()=>.5,{drawingContext:canvas.getContext('2d')});
  await require('./sprite-loader.cjs').loadGameSprites(h);
  h.run(`resetGame(814237);state.phase='playing';var p=STRUCTURES.pond,g=state.entities.goose,c=state.entities.chicken;
    c.x=p.x-58;c.y=p.y+p.h/2-14;c.invulnerable=0;c.direction='right';
    camera.x=clamp(p.x+p.w/2-450,0,WORLD.width-900);camera.y=clamp(p.y+p.h/2-245,0,WORLD.height-520);`);
  const save=name=>{h.run('renderGame()');fs.writeFileSync(path.join(__dirname,'../preview/'+name+'.png'),canvas.toBuffer('image/png'));};
  save('lake-bridge-closed');
  h.run("state.lake.completed=true;state.lake.misses=3;g.mode='defeated';buildObstacles(state)");
  save('lake-bridge-open');
  h.run(`state.lake.completed=false;state.lake.active=true;state.lake.misses=1;state.lake.counterWindow=2;state.lake.counterDuration=3;
    g.mode='stunned';g.chargeCounted=true;g.x=c.x+55;g.y=c.y;buildObstacles(state);`);
  save('panto-counter');
  console.log('Rendered closed/open bridge and counter opportunity with actual game code.');
}
main().catch(error=>{console.error(error);process.exitCode=1});
