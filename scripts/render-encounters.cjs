// Review the real sprites, map and warning layers without a browser or a server.
const fs=require('node:fs'),path=require('node:path');
const {createCanvas}=require('@napi-rs/canvas');
const {createGame}=require('../tests/helpers.cjs');
async function main(){
  const folder=path.resolve(__dirname,'../.cache/wildlife-review');fs.mkdirSync(folder,{recursive:true});
  const canvas=createCanvas(900,520),game=createGame(()=>.5,{drawingContext:canvas.getContext('2d')});
  await require('./sprite-loader.cjs').loadGameSprites(game);
  for(const kind of ['goose','fox','owl']) {
    game.context.reviewKind=kind;
    game.run(`resetGame(reviewKind==='owl'?52:814237);state.phase='playing';
      var focus=reviewKind==='goose'?state.entities.goose:reviewKind==='fox'?state.entities.foxes[0]:state.entities.owls[0];
      var player=state.entities.chicken;
      var choices=Array.from({length:32},(_,i)=>({x:focus.x+Math.cos(i*Math.PI/16)*90,y:focus.y+Math.sin(i*Math.PI/16)*90}));
      var place=choices.find(p=>WildlifeRules.clear(p,p,player.hitbox)&&
        (reviewKind==='owl'?OwlSystem.canSee(focus,{...player,...p}):WildlifeRules.clear(focus,p,focus.hitbox)));
      if(!place)throw Error('No visible review position');
      Object.assign(player,place);player.invulnerable=0;
      camera.x=clamp(focus.x-450,0,WORLD.width-900);camera.y=clamp(focus.y-260,0,WORLD.height-520);
      focus.grace=0;focus.cooldown=0;focus.timer=1;
      if(reviewKind==='goose') {state.lake.active=true;for(let i=0;i<10;i++)GooseSystem.update(state,.05);}
      if(reviewKind==='fox')FoxSystem.update(state,.05);
      if(reviewKind==='owl')for(let i=0;i<14;i++)OwlSystem.update(state,.05);
      renderGame();`);
    fs.writeFileSync(path.join(folder,kind+'.png'),canvas.toBuffer('image/png'));
  }
  console.log('Encounter renders: '+folder);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
