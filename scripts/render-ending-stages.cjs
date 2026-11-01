// Draft new stage layouts with the game's own scenery before the local AI repaint.
const {createCanvas}=require('@napi-rs/canvas'),fs=require('node:fs'),path=require('node:path');
const {createGame}=require('../tests/helpers.cjs'),{loadGameSprites}=require('./sprite-loader.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.cache/secret-boss-release/stages');
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const canvas=createCanvas(900,600),c=canvas.getContext('2d'),game=createGame(()=>.5,{drawingContext:c});
  await loadGameSprites(game);const farm=game.run('FarmSprites');
  const prop=(name,x,y,w,h,palette=0)=>{c.save();if(palette===2)c.globalAlpha=.58;farm.draw(c,name,x,y,w,h,{grounded:true,palette});c.restore();};
  for(const key of ['easy','normal','hard','hardcore']){
    const night=key==='hardcore';
    for(let y=0;y<600;y+=3)for(let x=0;x<900;x+=3){
      const n=((Math.imul(x+7,374761393)^Math.imul(y+31,668265263))>>>0)%100;
      const path=Math.abs(y-(460-x*.31+Math.sin(x*.009)*24))<75+Math.sin(x*.034)*9;
      const light=night?Math.exp(-(((x-450)/370)**2+((y-320)/230)**2))*27:0;
      const rgb=night?[42+light,55+light,72+light]:key==='normal'?[169,139,94]:key==='hard'&&path?[187,158,108]:[113,146,82];
      const shade=n<8?-9:n>91?7:0;
      c.fillStyle=`rgb(${rgb.map(v=>Math.round(v+shade)).join(',')})`;c.fillRect(x,y,3,3);
    }
    if(key==='easy'){
      for(const [x,y,w,h]of [[-55,-35,230,260],[180,-85,210,220],[690,-45,260,280]])prop('tree',x,y,w,h);
      c.fillStyle='#79b2b4';c.beginPath();c.ellipse(780,115,87,42,-.2,0,Math.PI*2);c.fill();
      prop('pear',610,18,135,150);prop('bush',-30,460,150,110);prop('bush',790,450,140,115);
      prop('fence',385,90,140,80);prop('fence',510,95,140,80);
      c.fillStyle='#a76e3c';c.fillRect(200,400,48,30);c.strokeStyle='#69472d';c.lineWidth=7;c.beginPath();c.arc(224,399,18,Math.PI,Math.PI*2);c.stroke();
    }else if(key==='normal'){
      prop('barn',80,-45,230,210);prop('coop',700,6,150,145);prop('hay',72,160,90,70);prop('hay',738,162,95,75);
      prop('tree',-90,-90,210,250);prop('tree',790,-65,220,245);
      c.fillStyle='#aa7c4c';c.fillRect(255,240,390,190);
      for(let y=240;y<430;y+=19){c.strokeStyle='#8b623e';c.lineWidth=3;c.strokeRect(255,y,390,19);}
      for(let i=0;i<320;i++){c.fillStyle=i%2?'#ba8e5d':'#936a43';c.fillRect(260+(i*47)%380,247+(i*31)%175,5+i%9,2);}
      c.fillStyle='#d6ae70';c.fillRect(255,240,390,5);
      prop('bush',-25,455,150,115);prop('bush',795,455,145,110);
    }else if(key==='hard'){
      prop('silo',62,-10,92,190);prop('hay',155,70,100,80);prop('coop',-30,330,150,145);
      prop('fence',295,100,125,72);prop('fence',410,100,125,72);prop('tree',825,310,160,200);
      c.fillStyle='#bea475';c.fillRect(707,23,100,151);c.fillStyle='#735a40';c.beginPath();c.moveTo(690,25);c.lineTo(756,-35);c.lineTo(824,25);c.fill();
      c.fillStyle='#554b3e';c.fillRect(741,130,29,44);c.save();c.translate(756,36);c.rotate(.25);
      for(let i=0;i<4;i++){c.rotate(Math.PI/2);c.fillStyle='#e3d5a6';c.fillRect(0,8,19,91);c.fillStyle='#736444';c.fillRect(7,0,5,105);}c.restore();
    }else{
      for(const [x,y,w,h]of [[-100,-95,280,300],[735,-90,290,310],[-95,385,205,225],[805,410,190,205]])prop('willow',x,y,w,h,2);
      prop('coop',590,-22,135,130,2);prop('fence',160,112,130,75,2);prop('fence',685,164,120,72,2);
      c.fillStyle='#e0ad58';c.fillRect(651,26,10,13);c.fillRect(675,26,10,13);
      c.strokeStyle='#263441';c.lineWidth=17;c.beginPath();c.moveTo(102,170);c.lineTo(92,40);c.lineTo(55,0);c.moveTo(92,100);c.lineTo(158,45);c.lineTo(179,0);c.stroke();
    }
    fs.writeFileSync(path.join(out,key+'.png'),canvas.toBuffer('image/png'));
  }
  console.log('Four clear stage layouts rendered with installed farm art.');
})().catch(error=>{console.error(error);process.exitCode=1;});
