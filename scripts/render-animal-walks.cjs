const fs=require('node:fs'),path=require('node:path'),{createCanvas}=require('@napi-rs/canvas');
(async()=>{
 const art=await require('./sprite-loader.cjs').loadArt(),canvas=createCanvas(1300,692),c=canvas.getContext('2d');
 c.fillStyle='#203c2e';c.fillRect(0,0,1300,692);c.fillStyle='#f4e5bc';c.font='bold 22px sans-serif';
 c.fillText('Penas pro Ar! · flancos e passadas',24,34);c.font='14px sans-serif';
 for(let j=0;j<8;j++)c.fillText((j<4?'Direita':'Esquerda')+' · '+(j%4+1),156+j*143,65);
 [['cow','Vaca'],['dog','Cachorro'],['goat','Cabra'],['horse','Cavalo']].forEach(([species,name],i)=>{
  const y=193+i*157;c.fillStyle='#aebe99';c.font='bold 16px sans-serif';c.fillText(name,24,y-35);
  c.fillStyle='#395036';c.fillRect(141,y+16,1140,1);
  for(let j=0;j<8;j++)art.draw(c,species,203+j*143,y,{direction:j<4?'right':'left',moving:true,anim:j%4,shadow:false});
 });
 fs.writeFileSync(path.resolve(__dirname,'../preview/animal-walks.png'),canvas.toBuffer('image/png'));
})().catch(e=>{console.error(e);process.exitCode=1});
