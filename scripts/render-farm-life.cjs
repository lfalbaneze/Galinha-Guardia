// Inspect the actual renderer and local assets without depending on a browser driver.
const fs=require('node:fs'),path=require('node:path');
const {createCanvas}=require('@napi-rs/canvas');
const {createGame}=require('../tests/helpers.cjs');
async function main(){
  const folder=path.resolve(__dirname,'../.cache/farm-life-review');fs.mkdirSync(folder,{recursive:true});
  const canvas=createCanvas(900,520),h=createGame(()=>.5,{drawingContext:canvas.getContext('2d')});
  await require('./sprite-loader.cjs').loadGameSprites(h);
  for(const version of [5,7]) {
    h.context.reviewVersion=version;
    h.run(`resetGame(2147483648,reviewVersion);state.phase='playing';camera.x=1900;camera.y=0;
      state.entities.chicken.x=2450;state.entities.chicken.y=180;state.entities.chicken.invulnerable=0;renderGame();`);
    fs.writeFileSync(path.join(folder,version===5?'empty-corner-before.png':'empty-corner-after.png'),canvas.toBuffer('image/png'));
  }
  h.run("resetGame(814237);state.phase='playing';state.thorVisit.nextIn=22;");
  for(const [name,x,y] of [['northeast',1900,0],['southwest',0,1280]]) {
    h.context.viewX=x;h.context.viewY=y;
    h.run(`camera.x=viewX;camera.y=viewY;state.entities.chicken.x=viewX+450;state.entities.chicken.y=viewY+250;
      state.entities.chicken.invulnerable=0;renderGame();`);
    fs.writeFileSync(path.join(folder,name+'.png'),canvas.toBuffer('image/png'));
  }
  for(const species of ['horse','turkey']){
    h.context.species=species;
    h.run(`var a=state.entities.animals.find(a=>a.species===species),c=state.entities.chicken;
      Object.assign(c,{x:a.x-68,y:a.y+28,invulnerable:0});resolveEnvironment(c);
      camera.x=clamp(a.x-450,0,WORLD.width-900);camera.y=clamp(a.y-270,0,WORLD.height-520);
      RescueSystem.update(state,.05);renderGame();`);
    fs.writeFileSync(path.join(folder,species+'.png'),canvas.toBuffer('image/png'));
  }
  h.run(`var g=state.entities.goose;Object.assign(c,{x:g.home.x+100,y:g.home.y,invulnerable:0});resolveEnvironment(c);
    camera.x=clamp(g.x-450,0,WORLD.width-900);camera.y=clamp(g.y-260,0,WORLD.height-520);
    g.grace=0;g.cooldown=0;g.attempts=1;
    for(let i=0;i<10;i++)GooseSystem.update(state,.05);renderGame();`);
  fs.writeFileSync(path.join(folder,'panto-circle.png'),canvas.toBuffer('image/png'));
  console.log(folder);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
