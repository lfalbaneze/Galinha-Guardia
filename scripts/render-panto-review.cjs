// Render the real GooseArt poses and a comparison without modifying either PNG.
const fs=require('node:fs'),path=require('node:path'),{createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas');
const {createGame}=require('../tests/helpers.cjs');
const root=path.resolve(__dirname,'..');
(async()=>{
  const font='C:/Windows/Fonts/trebuc.ttf';if(fs.existsSync(font))GlobalFonts.registerFromPath(font,'Trebuchet MS');
  const h=createGame(()=>.5,{skipGooseInstall:true});await require('./sprite-loader.cjs').loadGameSprites(h);
  const art=h.run('GooseArt'),base=h.run('state.entities.goose'),canvas=createCanvas(1080,720),c=canvas.getContext('2d');
  c.fillStyle='#213d30';c.fillRect(0,0,1080,720);c.font='bold 28px Trebuchet MS';c.fillStyle='#ffe09b';c.fillText('PANTO · O fiscal do lago',28,40);
  c.font='16px Trebuchet MS';c.fillStyle='#d6dfbb';c.fillText('Parado, andando e de asas abertas · as 12 poses do jogo',28,65);
  for(const [r,[mode,moving,anim,label]]of [['patrol',false,0,'Parado'],['patrol',true,1,'Passo'],['warning',false,0,'Grasnado']].entries()){
    for(const [col,[direction,title]]of [['down','Frente'],['right','Direita'],['up','Costas'],['left','Esquerda']].entries()){
      const x=col*270,y=80+r*210;c.fillStyle=(r+col)%2?'#33523b':'#2b4936';c.fillRect(x+12,y+8,246,196);
      c.fillStyle='#fff2c7';c.font='14px Trebuchet MS';c.fillText(`${title} · ${label}`,x+26,y+30);
      c.save();c.translate(x+135,y+184);c.scale(2,2);art.draw(c,{...base,x:0,y:-14,direction,mode,moving,anim,activity:undefined},{x:0,y:0});c.restore();
    }
  }
  fs.writeFileSync(path.join(root,'preview/panto-v2-poses.png'),canvas.toBuffer('image/png'));
  const comparison=createCanvas(680,330),p=comparison.getContext('2d'),old=await loadImage(path.join(root,'assets/sprites/sources/goose.png'));
  p.fillStyle='#294933';p.fillRect(0,0,680,330);p.fillStyle='#fff0bf';p.font='bold 22px Trebuchet MS';p.fillText('Antes',125,40);p.fillText('PANTO agora',415,40);
  p.imageSmoothingEnabled=false;p.drawImage(old,0,128,64,64,80,82,192,192);
  p.save();p.translate(495,260);p.scale(3,3);art.draw(p,{...base,x:0,y:-14,direction:'down',mode:'patrol',moving:false,activity:undefined},{x:0,y:0});p.restore();
  fs.writeFileSync(path.join(root,'preview/panto-v2-comparison.png'),comparison.toBuffer('image/png'));
  console.log('Rendered all 12 Panto poses and old/new comparison.');
})().catch(error=>{console.error(error);process.exitCode=1;});
