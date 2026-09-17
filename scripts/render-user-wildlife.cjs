const fs=require('node:fs'),path=require('node:path');
const {createCanvas}=require('@napi-rs/canvas');
const {createGame}=require('../tests/helpers.cjs');
async function main(){
 const folder=path.resolve(__dirname,'../.cache/wildlife-review');fs.mkdirSync(folder,{recursive:true});
 const canvas=createCanvas(780,460),ctx=canvas.getContext('2d'),game=createGame(()=>.5,{drawingContext:ctx});
 await require('./sprite-loader.cjs').loadGameSprites(game);
 game.context.reviewContext=ctx;
 ctx.fillStyle='#557f36';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.font='bold 18px sans-serif';ctx.fillStyle='#fff4d8';ctx.textAlign='center';
 ctx.fillText('Raposa · arte enviada',195,30);ctx.fillText('Coruja · arte enviada',585,30);
 const directions=['down','left','right','up'];
 for(let row=0;row<4;row++)for(let col=0;col<3;col++){
  const x=100+col*100,y=115+row*100;
  game.run(`var fox={...state.entities.foxes[0],x:${x},y:${y-14},direction:'${directions[row]}',moving:true,anim:${[0,1,3][col]}};
   FoxArt.draw(reviewContext,fox,{x:0,y:0});
   var owl={...state.entities.owls[0],perch:{x:${x+390},y:${y+42}},direction:'${directions[row]}',mode:'${['watch','cooldown','alert'][col]}'};
   OwlArt.draw(reviewContext,owl,{x:0,y:0});`);
  ctx.fillStyle='#a8c184';ctx.fillRect(x-35,y+3,70,1);ctx.fillRect(x+355,y+3,70,1);
 }
 fs.writeFileSync(path.join(folder,'user-poses.png'),canvas.toBuffer('image/png'));
 console.log(path.join(folder,'user-poses.png'));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
