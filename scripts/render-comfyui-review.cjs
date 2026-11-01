// Actual game renderer: compare the new endings at desktop and portrait sizes.
const {createCanvas,Image,GlobalFonts}=require('@napi-rs/canvas');
const fs=require('node:fs'),path=require('node:path');
const {createGame}=require('../tests/helpers.cjs'),{loadGameSprites}=require('./sprite-loader.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'preview/comfyui/release');
GlobalFonts.registerFromPath('C:/Windows/Fonts/trebucbd.ttf','Trebuchet MS');
class LocalImage extends Image {
  set src(value){super.src=typeof value==='string'?fs.readFileSync(path.resolve(root,value)):value;}
  get src(){return super.src;}
}
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const art=await require('./sprite-loader.cjs').loadArt();
  const motion=path.join(root,'.cache/secret-boss-release/motion');fs.mkdirSync(motion,{recursive:true});
  for(const action of ['walk','run'])for(let phase=0;phase<8;phase++){
    const c=createCanvas(960,420),g=c.getContext('2d');g.fillStyle='#75945c';g.fillRect(0,0,c.width,c.height);
    for(const [row,[id,variant,title]]of [['curupira',undefined,'Curupira'],['wolf',undefined,'Lobo'],['wolf','hardcore','Lobo · Hardcore']].entries()){
      g.font="bold 14px 'Trebuchet MS', sans-serif";g.fillStyle='#fff5d5';g.fillText(title,10,row*140+19);
      for(const [column,direction]of art.directions.entries()){
        art.draw(g,id,column*120+60,row*140+113,{variant,direction,action,moving:true,anim:phase*.5,shadow:false});
        g.font="11px 'Trebuchet MS', sans-serif";g.fillStyle='#243c2a';g.fillText(direction,column*120+8,row*140+134);
      }
    }
    fs.writeFileSync(path.join(motion,`${action}-${phase}.png`),c.toBuffer('image/png'));
    if(phase===0)fs.writeFileSync(path.join(out,`${action}-directions.png`),c.toBuffer('image/png'));
  }
  for(const [width,height,label]of [[900,520,'desktop'],[600,1100,'portrait']]){
    const sheet=createCanvas(width*2,height*2);
    for(const [index,key]of ['easy','normal','hard','hardcore'].entries()){
      const canvas=createCanvas(width,height),game=createGame(()=>.5,{drawingContext:canvas.getContext('2d'),Image:LocalImage});
      const element=game.elements.get('gameCanvas');element.width=width;element.height=height;
      await loadGameSprites(game);game.context.document.createElement=()=>createCanvas(300,400);
      game.run(`difficultySelect.value='${key}';resetGame();for(const friend of RescueSystem.all(state))GameManager.rescue(state,Object.assign(friend,{discovered:true}));GameManager.win(state);`);
      game.run('while(state.cutscene.time<9.65)updateGame(.05);renderGame()');
      const file=path.join(out,`ending-${key}-${label}.png`);fs.writeFileSync(file,canvas.toBuffer('image/png'));
      sheet.getContext('2d').drawImage(canvas,(index%2)*width,Math.floor(index/2)*height);
    }
    fs.writeFileSync(path.join(out,`endings-${label}.png`),sheet.toBuffer('image/png'));
  }
  console.log('Rendered all four real endings in two screen layouts.');
})().catch(error=>{console.error(error);process.exitCode=1;});
