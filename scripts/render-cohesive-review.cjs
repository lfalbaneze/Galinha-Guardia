// Compare the production renderers at their actual world scale, not fitted thumbnails.
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,GlobalFonts}=require('@napi-rs/canvas');
const {createGame}=require('../tests/helpers.cjs');
const {loadGameSprites}=require('./sprite-loader.cjs');
const root=path.resolve(__dirname,'..');
async function main(){
  GlobalFonts.registerFromPath('C:/Windows/Fonts/arial.ttf','Arial');
  const canvas=createCanvas(1280,1010),c=canvas.getContext('2d');
  const game=createGame(()=>.5,{drawingContext:c});await loadGameSprites(game);
  const farm=game.run('FarmSprites'),animals=game.run('CharacterArt');
  c.fillStyle='#779552';c.fillRect(0,0,1280,1010);
  function heading(text,y){c.fillStyle='#fff2cd';c.font='bold 20px Arial';c.textAlign='left';c.fillText(text,28,y);}
  function label(text,x,y){c.fillStyle='#f8edcc';c.font='14px Arial';c.textAlign='center';c.fillText(text,x,y);}
  function asset(name,labelText,x,feet,w,h){farm.draw(c,name,x-w/2,feet-h,w,h,{grounded:true});label(labelText,x,feet+22);}
  heading('Um mesmo conjunto • proporções usadas na fazenda',34);
  heading('Árvores, moitas e flores',76);
  for(const [name,title,x,w,h] of [['tree','Macieira',130,160,182],['pear','Pereira',340,148,182],['willow','Salgueiro',550,160,166],['bush','Moita',750,108,66],['bramble','Amoreira',930,108,60],['daisies','Flores',1070,22,22],['harvest','Colheita',1180,28,28]])asset(name,title,x,285,w,h);
  animals.draw(c,'chicken',230,271,{direction:'right'});
  animals.draw(c,'chicken',840,271,{skin:'robocop',direction:'left'});
  heading('Construções, cercas e objetos',354);
  for(const [name,title,x,w,h]of [['barn','Celeiro',145,206,195],['coop','Galinheiro',345,136,150],['silo','Silo',480,74,174],['shelter','Abrigo',650,164,107],['nursery','Berçário',890,242,114],['hay','Feno',1070,74,58],['trough','Bebedouro',1190,74,30]])asset(name,title,x,565,w,h);
  heading('Animais • todos com os pés na mesma linha',635);
  const roster=[['chick','Pintinho'],['duck','Pato'],['cat','Gato'],['rabbit','Coelho'],['lamb','Cordeiro'],['dog','Cachorro'],['chicken','Erina'],['pig','Porco'],['turkey','Peru'],['sheep','Ovelha'],['goat','Cabra'],['donkey','Burro'],['cow','Vaca'],['horse','Cavalo']];
  roster.forEach(([name,title],i)=>{const x=42+i*91;animals.draw(c,name,x,763,{direction:'down'});label(title,x,800);});
  heading('Skins • tamanhos próprios por espécie',850);
  for(const [i,skin] of ['classic','silkie','blue','punk','astronaut','robocop','priest','goose'].entries()){
    const x=85+i*155;animals.draw(c,'chicken',x,950,{skin,direction:'right'});label(animals.appearances[skin].name,x,985);
  }
  fs.writeFileSync(path.join(root,'preview/style-scale-review.png'),canvas.toBuffer('image/png'));
  // A real orchard view with Stella and the same apple tree shown in the size board.
  const scene=createCanvas(900,520),live=createGame(()=>.5,{drawingContext:scene.getContext('2d')});await loadGameSprites(live);
  live.run(`resetGame(814237);var tree=FarmArt.getProps(WORLD.layout).find(p=>p.type==='tree'&&p.areaId==='quintal'&&p.art!=='willow');
    Object.assign(state.entities.chicken,{skin:'robocop',x:tree.x+tree.w+105,y:tree.y+110,direction:'right',invulnerable:0});
    camera.x=clamp(tree.x-290,0,WORLD.width-900);camera.y=clamp(tree.y-230,0,WORLD.height-520);renderGame();`);
  fs.writeFileSync(path.join(root,'preview/cohesive-orchard.png'),scene.toBuffer('image/png'));
  console.log('Rendered style-scale-review.png and cohesive-orchard.png');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
