const fs=require('node:fs'),path=require('node:path');
const {createCanvas}=require('@napi-rs/canvas');
const {createGame}=require('../tests/helpers.cjs');
const {loadGameSprites}=require('./sprite-loader.cjs');
async function main(){
  const canvas=createCanvas(900,520),h=createGame(()=>.5,{drawingContext:canvas.getContext('2d')});
  await loadGameSprites(h);
  h.run(`resetGame(52);state.phase='playing';var s=state.scarecrow,c=state.entities.chicken;
    c.x=s.x+260;c.y=s.y+60;c.invulnerable=0;resolveEnvironment(c);
    camera.x=clamp(s.x-450,0,WORLD.width-900);camera.y=clamp(s.y-330,0,WORLD.height-520);renderGame();`);
  const out=path.resolve(__dirname,'../preview');
  fs.writeFileSync(path.join(out,'scarecrow-perched.png'),canvas.toBuffer('image/png'));
  h.run(`var approach=Array.from({length:16},(_,i)=>({x:s.x+Math.cos(i*Math.PI/8)*115,y:s.y+Math.sin(i*Math.PI/8)*115}))
    .find(p=>WildlifeRules.clear(p,p,c.hitbox)&&DetectionSystem.hasLineOfSight(p,s));
    if(!approach)throw Error('No clear approach to the scarecrow');Object.assign(c,approach);
    for(let i=0;i<15;i++)ScarecrowSystem.update(state,.05);renderGame();`);
  fs.writeFileSync(path.join(out,'scarecrow-flight.png'),canvas.toBuffer('image/png'));
  console.log('Rendered scarecrow-perched.png and scarecrow-flight.png; flock mode:',h.run('s.mode'));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
