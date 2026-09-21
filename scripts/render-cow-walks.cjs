// Enlarge the exact runtime pixels for visual inspection of every lateral step.
const fs=require('node:fs'),path=require('node:path'),{createCanvas}=require('@napi-rs/canvas');
(async()=>{
 const art=await require('./sprite-loader.cjs').loadArt(),canvas=createCanvas(1400,690),c=canvas.getContext('2d');
 c.fillStyle='#203c2e';c.fillRect(0,0,1400,690);c.fillStyle='#f1e4bf';c.font='bold 24px sans-serif';
 c.fillText('Vaca · revisão das quatro patas',24,38);
 for(const [row,direction] of ['right','left'].entries())for(let frame=0;frame<4;frame++) {
  const x=180+frame*345,y=280+row*320;c.fillStyle='#becbab';c.font='16px sans-serif';c.textAlign='center';
  c.fillText((direction==='right'?'Direita':'Esquerda')+' · passo '+(frame+1),x,y-220);
  art.draw(c,'cow',x,y,{direction,moving:true,anim:frame,scale:3,shadow:false});
 }
 fs.writeFileSync(path.resolve(__dirname,'../preview/cow-walks.png'),canvas.toBuffer('image/png'));
})().catch(e=>{console.error(e);process.exitCode=1});
