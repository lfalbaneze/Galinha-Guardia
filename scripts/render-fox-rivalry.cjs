// Review the actual game renderer: occupied den and a wolf scaring the fox.
const fs=require('node:fs'),path=require('node:path');
const {createCanvas}=require('@napi-rs/canvas');
const {createGame}=require('../tests/helpers.cjs');
async function main(){
  const canvas=createCanvas(900,520),h=createGame(()=>.5,{drawingContext:canvas.getContext('2d')});
  await require('./sprite-loader.cjs').loadGameSprites(h);
  const output=path.resolve(__dirname,'../preview');fs.mkdirSync(output,{recursive:true});
  h.run(`resetGame(814237);state.phase='playing';state.mapTransition.time=0;
    var fox=state.entities.foxes[0],player=state.entities.chicken,wolf=state.entities.wolf;
    var den=HidingSpots.getSpots().find(s=>s.id===fox.bushId);
    Object.assign(player,{x:den.x+den.w/2,y:den.y+den.h-18,invulnerable:0});
    HidingSpots.update(state);HidingSpots.toggle(state);
    camera.x=clamp(fox.x-450,0,WORLD.width-900);camera.y=clamp(fox.y-300,0,WORLD.height-520);
    renderGame();`);
  fs.writeFileSync(path.join(output,'fox-den.png'),canvas.toBuffer('image/png'));
  h.run(`var encounter=null;
    for(let i=0;i<32&&!encounter;i++){
      const a=i*Math.PI/16,p={x:fox.home.x+Math.cos(a)*90,y:fox.home.y+Math.sin(a)*90};
      const w={...wolf,x:fox.home.x+Math.cos(a)*10,y:fox.home.y+Math.sin(a)*10,heading:a};
      if(WildlifeRules.clear(fox.home,p,fox.hitbox)&&WildlifeRules.clear(w,w,wolf.hitbox)&&
        DetectionSystem.canSee(w,p,WolfAI.getConfig(state)))encounter={p,w};
    }
    if(!encounter)throw Error('No clear stage for the wolf encounter');
    Object.assign(fox,encounter.p,{mode:'rest',timer:2,cooldown:2,grace:0,scaredTime:0});
    Object.assign(wolf,{x:encounter.w.x,y:encounter.w.y,heading:encounter.w.heading,
      mode:'patrol',huntUnlockTimer:0,pauseTimer:0,foxScoldCooldown:0});
    Player.face(wolf,fox.x-wolf.x,fox.y-wolf.y);
    for(let i=0;i<5;i++)FoxSystem.update(state,.05);
    HidingSpots.update(state);renderGame();`);
  fs.writeFileSync(path.join(output,'fox-wolf-rivalry.png'),canvas.toBuffer('image/png'));
  console.log('Rendered occupied den and wolf rivalry with the actual game sprites and map.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
