// Review of the installed identities, through the same renderer as the game.
const fs=require('node:fs'),path=require('node:path'),{createCanvas}=require('@napi-rs/canvas');
(async()=>{
 const art=await require('./sprite-loader.cjs').loadArt(),canvas=createCanvas(1040,480),c=canvas.getContext('2d');
 c.fillStyle='#18382d';c.fillRect(0,0,canvas.width,canvas.height);
 for(const [row,id,label] of [[0,'hen-silkie','Midori · sedosa japonesa'],[1,'thor','Thor · golden retriever']]){
  const y=row*240;c.fillStyle='#fff0c7';c.font='bold 23px sans-serif';c.textAlign='left';c.fillText(label,25,y+34);
  for(const [i,direction] of ['down','downleft','left','up','right','downright'].entries()){
   const x=85+i*174,options={direction,moving:false,shadow:false,scale:1.8};
   if(art.frameFor(id,options).definition.provider!=='pixellab')throw Error('Non-PixelLab model');
   art.draw(c,id,x,y+186,options);c.fillStyle='#bacda8';c.font='14px sans-serif';c.textAlign='center';
   c.fillText(['Frente','Diagonal','Esquerda','Costas','Direita','Diagonal'][i],x,y+223);
  }
 }
 const destination=path.resolve(__dirname,'../preview/pixellab/identities.png');fs.writeFileSync(destination,canvas.toBuffer('image/png'));console.log(destination);
})().catch(e=>{console.error(e.message);process.exitCode=1});
