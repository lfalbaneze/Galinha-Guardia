const fs=require('node:fs'),path=require('node:path');
const {createCanvas}=require('@napi-rs/canvas');
const {createGame}=require('../tests/helpers.cjs');
const {loadGameSprites}=require('./sprite-loader.cjs');
async function main(){
  const canvas=createCanvas(900,520),h=createGame(()=>.5,{drawingContext:canvas.getContext('2d')});
  await loadGameSprites(h);
  h.run(`resetGame(814237);var cover=HidingSpots.getSpots().find(s=>s.type==='hay');
    var c=state.entities.chicken,b=cover.bale;
    camera.x=clamp(b.x-430,0,WORLD.width-900);camera.y=clamp(b.y-220,0,WORLD.height-520);
    Object.assign(c,{x:b.x+b.w/2,y:b.y+b.h+23,skin:'classic',invulnerable:0});`);
  const shot=name=>{h.run('renderGame()');fs.writeFileSync(path.join(__dirname,'../preview/'+name+'.png'),canvas.toBuffer('image/png'));};
  shot('hay-before');h.run('HidingSpots.toggle(state);HidingSpots.update(state,.04)');shot('hay-entering');
  h.run('for(var i=0;i<60;i++)HidingSpots.update(state,1/60)');shot('hay-hidden');
  console.log(h.run('JSON.stringify({hidden:c.hidden,blend:c.hideBlend,cover:b})'));
  for(const skin of ['priest','robocop','goose']){h.context.skin=skin;h.run('c.skin=skin');shot('hay-hidden-'+skin);}
  h.run('c.skin="classic";HidingSpots.toggle(state);for(var i=0;i<60;i++)HidingSpots.update(state,1/60)');shot('hay-exit');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
