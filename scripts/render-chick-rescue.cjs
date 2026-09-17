// Render the actual approach, call and response with the game's own art and UI.
const fs=require('node:fs'),path=require('node:path');
const {createCanvas}=require('@napi-rs/canvas');
const {createGame}=require('../tests/helpers.cjs');
async function main(){
  const folder=path.resolve(__dirname,'../.cache/chick-review');fs.mkdirSync(folder,{recursive:true});
  const canvas=createCanvas(900,520),game=createGame(()=>.5,{drawingContext:canvas.getContext('2d')});
  await require('./sprite-loader.cjs').loadGameSprites(game);
  for(const type of ['hay','bush','tree']) {
    game.context.reviewType=type;
    game.run(`for(let seed=1;seed<30;seed++){
        resetGame(seed);if(state.entities.chicks.some(c=>HidingSpots.getSpots().find(s=>s.id===c.coverId).type===reviewType))break;
      }
      var chick=state.entities.chicks.find(c=>HidingSpots.getSpots().find(s=>s.id===c.coverId).type===reviewType);
      var cover=HidingSpots.getSpots().find(s=>s.id===chick.coverId),player=state.entities.chicken;
      Object.assign(player,WORLD.layout.start);state.entities.wolf.huntUnlockTimer=100;
      var route=WolfAI.findPath(player,chick),near=null,far=null;
      for(const point of route){
        while(distance(player,point)>2){
          var before={x:player.x,y:player.y},dx=point.x-player.x,dy=point.y-player.y,len=Math.hypot(dx,dy);
          Player.move(player,dx/len*Math.min(8,len),dy/len*Math.min(8,len));
          if(distance(before,player)<.1)break;
          if(!far && RescueSystem.secretHint(state)===chick && !RescueSystem.callTarget(state))far={x:player.x,y:player.y};
          if(!near && RescueSystem.callTarget(state)===chick)near={x:player.x,y:player.y};
        }
      }
      if(!near||!far)throw Error('Missing approach for '+reviewType);
      camera.x=clamp((near.x+chick.x)/2-450,0,WORLD.width-900);
      camera.y=clamp((near.y+chick.y)/2-260,0,WORLD.height-520);`);
    for(const stage of ['clue','call','saved']) {
      game.run(stage==='clue'?'Object.assign(player,far);':stage==='call'?'Object.assign(player,near);':
        'RescueSystem.callChick(state);RescueSystem.update(state,.25);');
      game.run('GameUI.update(state);renderGame();');
      fs.writeFileSync(path.join(folder,type+'-'+stage+'.png'),canvas.toBuffer('image/png'));
    }
  }
  console.log('Chick rescue renders: '+folder);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
