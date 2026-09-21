const fs=require('node:fs'),path=require('node:path'),{createCanvas}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),out=path.join(root,'preview/cartoon-106');fs.mkdirSync(out,{recursive:true});
(async()=>{const art=await require('./sprite-loader.cjs').loadArt(),names=art.species;
 const all=createCanvas(1400,Math.ceil(names.length/4)*178+55),c=all.getContext('2d');c.fillStyle='#243e30';c.fillRect(0,0,all.width,all.height);c.fillStyle='#f5e4b9';c.font='bold 23px sans-serif';c.fillText('Elenco completo · cartoon de aventura · escala do jogo',24,34);
 names.forEach((name,i)=>{const x=i%4*350,y=55+Math.floor(i/4)*178;c.fillStyle='#304934';c.fillRect(x+5,y+5,340,168);c.fillStyle='#ead3a3';c.font='14px sans-serif';c.fillText(name,x+18,y+26);
  ['right','downright','down'].forEach((direction,j)=>art.draw(c,name,x+62+j*112,y+137,{direction,moving:true,anim:0,shadow:false}));
 });fs.writeFileSync(path.join(out,'cast.png'),all.toBuffer('image/png'));
 for(const name of ['dog','sheep','horse','wolf','rabbit','owl']){
  const b=createCanvas(1840,850),ctx=b.getContext('2d');ctx.fillStyle='#243e30';ctx.fillRect(0,0,b.width,b.height);ctx.fillStyle='#f5e4b9';ctx.font='bold 21px sans-serif';ctx.fillText(name+' · oito direções / doze quadros',20,27);
  ['right','downright','down','downleft','left','upleft','up','upright'].forEach((direction,row)=>{
   ctx.fillStyle='#aec49b';ctx.font='12px sans-serif';ctx.fillText(direction,6,80+row*94);
   for(let f=0;f<12;f++)art.draw(ctx,name,140+f*142,120+row*94,{direction,moving:true,anim:f/3,shadow:false});
  });fs.writeFileSync(path.join(out,name+'.png'),b.toBuffer('image/png'));
 }console.log('Rendered all 29 characters plus six complete 96-frame review boards.');
})().catch(e=>{console.error(e);process.exitCode=1});
