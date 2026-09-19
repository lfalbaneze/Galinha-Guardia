// Real game frames; contact effects are advanced through Player.update, never painted into the preview.
const fs=require('node:fs'),path=require('node:path');
const {createCanvas}=require('@napi-rs/canvas');
const {createGame}=require('../tests/helpers.cjs');
async function main() {
  const canvas=createCanvas(900,520),h=createGame(()=>.5,{drawingContext:canvas.getContext('2d')});
  await require('./sprite-loader.cjs').loadGameSprites(h);
  h.run("resetGame(814237);state.phase='playing';var c=state.entities.chicken;");
  const save=name=>{
    h.run('camera.x=clamp(c.x-450,0,WORLD.width-900);camera.y=clamp(c.y-260,0,WORLD.height-520);camera.shakeX=0;camera.shakeY=0;renderGame()');
    fs.writeFileSync(path.join(__dirname,'../preview/'+name+'.png'),canvas.toBuffer('image/png'));
  };
  h.run(`var pool=WORLD.layout.habitats.find(h=>h.kind==='water');c.x=pool.x-68;c.y=pool.y-14;
    EnvironmentSystem.initialize(state);input.add('d');input.add('shift');for(var i=0;i<24;i++)Player.update(state,1/60);`);
  save('environment-water');
  h.run(`input.clear();var plot=WORLD.layout.plots.find(p=>p.kind==='corn');
    var stalk=WORLD.layout.decorations.filter(d=>d.type==='corn').sort((a,b)=>Math.abs(a.x-plot.x-plot.w/2)-Math.abs(b.x-plot.x-plot.w/2))[0];
    c.x=stalk.x-65;c.y=stalk.y-14;EnvironmentSystem.initialize(state);input.add('d');input.add('shift');
    for(var i=0;i<13;i++)Player.update(state,1/60);`);
  save('environment-corn');
  h.run(`input.clear();var bush=WORLD.layout.vegetation.find(p=>p.type==='bush'&&p.x>250&&p.y>300);
    c.x=bush.x-26;c.y=bush.y+bush.h*.75-14;EnvironmentSystem.initialize(state);input.add('d');input.add('shift');
    for(var i=0;i<13;i++)Player.update(state,1/60);`);
  save('environment-bush');
  console.log('Saved actual water, corn and bush contact frames.');
}
main().catch(error=>{console.error(error);process.exitCode=1});
