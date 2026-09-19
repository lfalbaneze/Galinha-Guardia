// Actual world, plants and wolf simulation rendered with the game's Canvas code.
const fs=require('node:fs'),path=require('node:path');
const {createCanvas}=require('@napi-rs/canvas');
const {createGame}=require('../tests/helpers.cjs');
async function main(){
  const c=createCanvas(900,520),h=createGame(()=>.5,{drawingContext:c.getContext('2d')});
  await require('./sprite-loader.cjs').loadGameSprites(h);
  const out=path.resolve(__dirname,'../preview');fs.mkdirSync(out,{recursive:true});
  h.run(`resetGame(814237);state.phase='playing';state.mapTransition.time=0;
    var field=SunflowerSystem.plot(),w=state.entities.wolf,p=state.entities.chicken;
    var target={x:field.x+field.w*.5,y:field.y+field.h*.63};
    Object.assign(w,{x:target.x-90,y:target.y,mode:'patrol',heading:0,huntUnlockTimer:0,pauseTimer:0});
    Object.assign(p,{x:100,y:500,hidden:false,invulnerable:0});SunflowerSystem.reset(state,0);
    for(let i=0;i<100&&SunflowerSystem.mode(state)!=='hidden';i++)WolfAI.update(state,.05);
    if(!SunflowerSystem.concealed(state))throw Error('Wolf never reached the field');
    p.x=w.x+Math.cos(w.heading)*175;p.y=w.y+Math.sin(w.heading)*175;
    camera.x=clamp(w.x-450,0,WORLD.width-900);camera.y=clamp(w.y-260,0,WORLD.height-520);
    renderGame();`);
  fs.writeFileSync(path.join(out,'sunflowers-hidden.png'),c.toBuffer('image/png'));
  h.run('WolfAI.update(state,.05);renderGame();');
  fs.writeFileSync(path.join(out,'sunflowers-warning.png'),c.toBuffer('image/png'));
  h.run(`const heading=w.heading;p.x+=Math.cos(heading+Math.PI/2)*120;p.y+=Math.sin(heading+Math.PI/2)*120;
    for(let i=0;i<27;i++)WolfAI.update(state,.05);renderGame();`);
  fs.writeFileSync(path.join(out,'sunflowers-dash.png'),c.toBuffer('image/png'));
  console.log('Rendered the sunflower field, concealed wolf, warning and committed leap.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
