// Review the new props and a real gentle rescue without a browser.
const fs=require('node:fs'),path=require('node:path');
const {createCanvas}=require('@napi-rs/canvas');
const {createGame}=require('../tests/helpers.cjs');
async function main(){
  const folder=path.resolve(__dirname,'../.cache/polish-review');fs.mkdirSync(folder,{recursive:true});
  const canvas=createCanvas(900,520),h=createGame(()=>.5,{drawingContext:canvas.getContext('2d')});
  await require('./sprite-loader.cjs').loadGameSprites(h);
  h.run(`resetGame(814237);state.phase='playing';
    var friend=state.entities.animals[0],chicken=state.entities.chicken;
    const positions=Array.from({length:24},(_,i)=>({x:friend.x+Math.cos(i*Math.PI/12)*95,y:friend.y+Math.sin(i*Math.PI/12)*95}));
    const place=positions.find(p=>WildlifeRules.clear(p,p,chicken.hitbox)&&WildlifeRules.clear(friend,p,friend.hitbox));
    if(!place)throw Error('No clear calm approach');
    Object.assign(chicken,{...place,sneaking:true,hidden:false});state.entities.wolf.huntUnlockTimer=100;
    RescueSystem.update(state,.05);
    if(friend.temper!=='calm')throw Error('Friend did not calm down');
    camera.x=clamp(friend.x-450,0,WORLD.width-900);camera.y=clamp(friend.y-260,0,WORLD.height-520);renderGame();`);
  fs.writeFileSync(path.join(folder,'calm.png'),canvas.toBuffer('image/png'));
  const board=createCanvas(900,520),c=board.getContext('2d'),art=h.run('FarmSprites');
  c.fillStyle='#344d3c';c.fillRect(0,0,900,520);
  ['barn','coop','silo','hay','trough','fence'].forEach((name,i)=>{
    const x=(i%3)*300,y=Math.floor(i/3)*260;
    const sizes={barn:[176,186],coop:[164,184],silo:[90,184],hay:[176,128],trough:[196,112],fence:[190,132]};
    const [w,height]=sizes[name];art.draw(c,name,x+150-w/2,y+220-height,w,height,{grounded:true});
  });
  fs.writeFileSync(path.join(folder,'props.png'),board.toBuffer('image/png'));
  console.log('Polish renders: '+folder);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
