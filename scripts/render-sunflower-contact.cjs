// Review real player movement and scenery rendering at three stages of a pass.
const fs=require('node:fs'),path=require('node:path');
const {createCanvas}=require('@napi-rs/canvas');
const {createGame}=require('../tests/helpers.cjs');
async function main(){
  const canvas=createCanvas(900,520),h=createGame(()=>.5,{drawingContext:canvas.getContext('2d')});
  await require('./sprite-loader.cjs').loadGameSprites(h);
  h.run(`resetGame(814237);state.phase='playing';state.mapTransition.time=0;
    var flowers=SunflowerSystem.props(WORLD.layout).filter(p=>p.type==='sunflower');
    var flower=flowers[3],c=state.entities.chicken,bed=SunflowerSystem.plot();
    Object.assign(c,{x:flower.x+14,y:flower.y-14-45});
    EnvironmentSystem.initialize(state);
    camera.x=clamp(bed.x+bed.w/2-450,0,WORLD.width-900);camera.y=clamp(bed.y+bed.h/2-260,0,WORLD.height-520);
    camera.shakeX=0;camera.shakeY=0;`);
  const save=name=>{
    h.run('renderGame();');
    fs.writeFileSync(path.join(__dirname,'../preview/sunflowers-'+name+'.png'),canvas.toBuffer('image/png'));
  };
  save('before-contact');
  h.run(`input.add('s');input.add('shift');
    for(let i=0;i<100&&c.y+14<flower.y+27;i++){Player.update(state,1/60);state.elapsed+=1/60;}`);
  save('contact');
  h.run('input.clear();for(let i=0;i<150;i++){Player.update(state,1/60);state.elapsed+=1/60;}');
  save('settled');
  console.log('Rendered the actual sunflower field before contact, during a sprint and after settling.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
