// Real Canvas review of the visit, without browser automation.
const fs=require('node:fs'),path=require('node:path');
const {createCanvas}=require('@napi-rs/canvas');
const {createGame}=require('../tests/helpers.cjs');
async function main(){
  const folder=path.resolve(__dirname,'../.cache/thor-review');fs.mkdirSync(folder,{recursive:true});
  const canvas=createCanvas(900,520),game=createGame(()=>.5,{drawingContext:canvas.getContext('2d')});
  await require('./sprite-loader.cjs').loadGameSprites(game);
  game.run(`resetGame(814237);state.phase='playing';var c=state.entities.chicken,w=state.entities.wolf;
    Object.assign(c,{x:1000,y:600});resolveEnvironment(c);
    camera.x=clamp(c.x-450,0,WORLD.width-900);camera.y=clamp(c.y-260,0,WORLD.height-520);
    state.lives=1;state.thorVisit.nextIn=0;ThorSystem.update(state,.05);
    for(let i=0;i<300&&state.entities.thor.mode==='enter';i++)ThorSystem.update(state,.05);
    const at=WolfAI.findPath(w,{x:c.x+170,y:c.y+50}).pop();Object.assign(w,at);WolfAI.frighten(state,state.entities.thor,6);
    ThorSystem.update(state,.05);WolfAI.update(state,.05);renderGame();`);
  fs.writeFileSync(path.join(folder,'visit.png'),canvas.toBuffer('image/png'));
  const poses=createCanvas(600,520),ctx=poses.getContext('2d');
  ctx.fillStyle='#6b8e43';ctx.fillRect(0,0,600,520);
  for(const [row,direction]of ['down','left','right','up'].entries())for(let col=0;col<3;col++){
    const dog={...game.run('state.entities.thor'),x:100+col*200,y:110+row*128,direction,moving:col>0,anim:col===1?1:3,age:3,mode:'greet'};
    game.run('ThorArt').draw(ctx,dog,{x:0,y:0,shakeX:0,shakeY:0});
  }
  fs.writeFileSync(path.join(folder,'poses.png'),poses.toBuffer('image/png'));
  console.log('Thor review: '+folder);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
