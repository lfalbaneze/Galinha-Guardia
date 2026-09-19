// Real prop rendering at 2x: compare current artwork and the historical fallback.
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {createGame}=require('../tests/helpers.cjs');
const {loadGameSprites}=require('./sprite-loader.cjs');
const root=path.resolve(__dirname,'..');
async function main(){
  const folder=path.join(root,'.cache/grounding-review');fs.mkdirSync(folder,{recursive:true});
  for(const mode of ['legacy','cohesive']) {
    const h=createGame(()=>.5),art=h.run('FarmSprites');
    await art.load(loadImage,createCanvas);await art.loadProps(loadImage,createCanvas);
    await art.loadHabitats(loadImage,createCanvas);
    if(mode==='cohesive')await art.loadCohesive(loadImage,createCanvas);
    const c=createCanvas(960,500).getContext('2d');c.fillStyle='#789552';c.fillRect(0,0,960,500);c.scale(2,2);
    for(const p of [{type:'trough',x:10,y:100,w:68,h:24},{type:'stable',x:115,y:55,w:148,h:69},
      {type:'hay',x:290,y:82,w:68,h:42},{type:'paddock-fence',x:390,y:100,w:70,h:8}])
      h.run('FarmArt').drawProp(c,p,{x:0,y:0,shakeX:0,shakeY:0});
    fs.writeFileSync(path.join(folder,mode+'-after.png'),c.canvas.toBuffer('image/png'));
  }
  const canvas=createCanvas(900,520),live=createGame(()=>.5,{drawingContext:canvas.getContext('2d')});
  await loadGameSprites(live);
  live.run(`resetGame(814237);var p=WORLD.layout.structures.stables[0];
    camera.x=clamp(p.x-310,0,WORLD.width-900);camera.y=clamp(p.y-220,0,WORLD.height-520);
    Object.assign(state.entities.chicken,{x:p.x+220,y:p.y+80,invulnerable:0});renderGame();`);
  fs.writeFileSync(path.join(root,'preview/grounded-curral.png'),canvas.toBuffer('image/png'));
  live.run(`var water=WORLD.layout.structures.troughs[0];
    camera.x=clamp(water.x-430,0,WORLD.width-900);camera.y=clamp(water.y-230,0,WORLD.height-520);
    Object.assign(state.entities.chicken,{x:water.x+100,y:water.y+60});renderGame();`);
  fs.writeFileSync(path.join(root,'preview/grounded-trough.png'),canvas.toBuffer('image/png'));
  console.log('Grounding review: both atlases and the live paddock rendered.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
