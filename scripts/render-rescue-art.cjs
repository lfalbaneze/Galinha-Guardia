// Review production sprites through the same renderer used by the game.
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,GlobalFonts}=require('@napi-rs/canvas');
const {loadArt,loadGameSprites}=require('./sprite-loader.cjs');
const {createGame}=require('../tests/helpers.cjs');
const root=path.resolve(__dirname,'..');
async function main(){
  for(const file of ['arial.ttf','arialbd.ttf']){
    const font=path.join('C:/Windows/Fonts',file);if(fs.existsSync(font))GlobalFonts.registerFromPath(font,'Arial');
  }
  const art=await loadArt(),canvas=createCanvas(1380,1820),c=canvas.getContext('2d');
  c.fillStyle='#edf0d9';c.fillRect(0,0,1380,1820);
  c.fillStyle='#284e3b';c.font='bold 35px Arial';c.fillText('Os amigos da fazenda',32,53);
  c.font='18px Arial';c.fillText('12 amigos de resgate + pintinhos • um de cada tipo, todos com função na missão',34,86);
  const names={sheep:'Ovelha',pig:'Porquinho',goat:'Cabra',cow:'Vaquinha',duck:'Pato',rabbit:'Coelho',
    dog:'Cachorrinho',cat:'Gatinho',donkey:'Burrinho',lamb:'Cordeirinho',chick:'Pintinho',horse:'Cavalo',turkey:'Peru',chicken:'A galinha da turma'};
  for(const [i,[species,name]] of Object.entries(names).entries()){
    const x=24+i%2*676,y=113+Math.floor(i/2)*239;
    c.fillStyle='#fbf8e9';c.beginPath();c.roundRect(x,y,650,221,14);c.fill();
    c.fillStyle='#395441';c.font='bold 23px Arial';c.textAlign='left';c.fillText(name,x+20,y+34);
    c.fillStyle='#93ac67';c.beginPath();c.ellipse(x+88,y+175,68,18,0,0,Math.PI*2);c.fill();
    art.draw(c,species,x+88,y+149,{direction:'down',scale:1.3});
    for(const [j,direction] of ['right','up','left'].entries()) {
      art.draw(c,species,x+238+j*160,y+135,{direction,moving:true,anim:1.2});
      c.fillStyle='#718064';c.font='12px Arial';c.textAlign='center';c.fillText(['lado','costas','outro lado'][j],x+238+j*160,y+171);
    }
    c.fillStyle='#788666';c.font='12px Arial';c.textAlign='left';c.fillText('ampliado',x+60,y+205);
    c.textAlign='center';c.fillText('tamanho usado no jogo',x+398,y+205);
  }
  const out=path.join(root,'preview');fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'rescue-animals.png'),canvas.toBuffer('image/png'));
  const scene=createCanvas(900,520),h=createGame(()=>.5,{drawingContext:scene.getContext('2d')});
  await loadGameSprites(h);
  h.run(`resetGame(52);state.phase='playing';
    for(const [i,a] of state.entities.animals.entries())Object.assign(a,{...RescueSystem.safePosition(i),rescued:true,direction:'down'});
    for(const [i,a] of state.entities.chicks.entries())Object.assign(a,{...RescueSystem.chickPosition(i),rescued:true,direction:'down'});
    Object.assign(state.entities.chicken,{x:395,y:355,invulnerable:0});camera.x=0;camera.y=0;renderGame();`);
  fs.writeFileSync(path.join(out,'rescue-in-game.png'),scene.toBuffer('image/png'));
  console.log('Rendered preview/rescue-animals.png and preview/rescue-in-game.png');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
