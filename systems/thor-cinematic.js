/* A short presentation in screen space; simulation and saved world positions stay still. */
const ThorCinematic = (() => {
  let house=null,background=null,pending=null;
  function load(loader) {
    if(pending)return pending;
    const image=loader||(src=>new Promise(resolve=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>resolve(null);i.src=src;}));
    pending=Promise.all([image('./assets/cinematics/thor-house.png'),image('./assets/menu/farm-title.png')])
      .then(([h,b])=>{house=h;background=b;});
    return pending;
  }
  const ease=p=>1-Math.pow(1-clamp(p,0,1),3);
  function text(game) {
    const t=game.thorRescue?.time||0;
    return t<1.4?'Thor ouviu o chamado!':t<ThorSystem.healAt?'Segura firme. O reforço chegou!':
      ThorSystem.cost(game)?'Vida completa! Bom garoto, Thor!':'Mais 1 coração! Bom garoto, Thor!';
  }
  function heart(c,x,y,size,filled) {
    const pixels=['01100110','11111111','11111111','01111110','00111100','00011000'];
    c.fillStyle=filled?'#fa725c':'#b5b99a55';
    for(let row=0;row<pixels.length;row++)for(let col=0;col<8;col++)if(pixels[row][col]==='1')c.fillRect(x+(col-4)*size,y+(row-3)*size,size+.2,size+.2);
  }
  function draw(c,game) {
    const scene=game.thorRescue;if(!scene)return;
    const narrow=canvas.width/canvas.height<1,W=narrow?540:1000,s=canvas.width/W,H=canvas.height/s;
    const t=scene.time,reduced=InterfaceMotion.reduced,arrived=t>=ThorSystem.healAt;
    c.save();c.setTransform(1,0,0,1,0,0);c.fillStyle='#153c30';c.fillRect(0,0,canvas.width,canvas.height);c.scale(s,s);
    if(background){
      const cover=Math.max(W/background.width,H/background.height);
      c.drawImage(background,(W-background.width*cover)/2,(H-background.height*cover)/2,background.width*cover,background.height*cover);
    }
    c.fillStyle='#123c32ba';c.fillRect(0,0,W,H);
    const floor=H*(narrow?.66:.70),houseSize=Math.min(narrow?310:330,H*.58),houseX=narrow?-20:48;
    const homeX=houseX+houseSize*.64,homeFeet=floor-18;
    const playerX=W*(narrow?.78:.81),playerFeet=floor+24;
    const run=ease((t-1.25)/2.3),dogX=lerp(homeX,playerX-(narrow?118:150),reduced?(arrived?1:0):run);
    const dogFeet=lerp(homeFeet,playerFeet,reduced?(arrived?1:0):run);
    // A warm spotlight replaces screen flashes, including in reduced-motion mode.
    const glow=c.createRadialGradient(dogX,dogFeet-85,20,dogX,dogFeet-85,narrow?280:350);
    glow.addColorStop(0,'#ffdf8438');glow.addColorStop(1,'#ffdf8400');c.fillStyle=glow;c.fillRect(0,0,W,H);
    c.fillStyle='#18352870';c.beginPath();c.ellipse(W/2,floor+22,W*.42,30,0,0,Math.PI*2);c.fill();
    if(house)c.drawImage(house,houseX,floor-houseSize,houseSize,houseSize);
    else {
      c.fillStyle='#98703d';c.fillRect(houseX+30,floor-180,230,180);c.fillStyle='#214a3c';c.beginPath();c.moveTo(houseX+12,floor-180);c.lineTo(houseX+145,floor-280);c.lineTo(houseX+280,floor-180);c.fill();
      c.fillStyle='#302919';c.fillRect(houseX+115,floor-126,88,126);
    }
    c.fillStyle='#e7c986';c.font='bold 15px Trebuchet MS,sans-serif';c.textAlign='center';c.fillText('CASINHA DO THOR',houseX+houseSize*.52,floor+34);
    const playerSize=narrow?2.0:2.6;
    CharacterArt.draw(c,'chicken',playerX,playerFeet-14*playerSize,{skin:game.entities.chicken.skin,direction:'left',scale:playerSize,
      lift:arrived&&!reduced?Math.max(0,Math.sin((t-ThorSystem.healAt)*Math.PI*2))*10:0});
    const emerging=ease(t/.85),dogHeight=lerp(narrow?100:115,narrow?145:168,emerging);
    c.save();c.globalAlpha=reduced?1:emerging;
    ThorArt.drawHero(c,dogX,dogFeet,dogHeight,t<1.25?'down':arrived?'down':'right',reduced?0:t*10);c.restore();
    if(t>1.3&&t<ThorSystem.healAt&&!reduced){
      c.fillStyle='#fff1bb88';
      for(let i=0;i<7;i++){const dx=(t*120+i*23)%100;c.fillRect(dogX-45-dx,dogFeet-20+(i%3)*7,12+(i%2)*10,3);}
    }
    if(arrived){
      for(let i=0;i<5;i++){
        const angle=-Math.PI*.9+i*Math.PI*.2,age=reduced?.5:clamp((t-ThorSystem.healAt)/1.1,0,1);
        const x=lerp(dogX,playerX,.3+i*.14)+Math.cos(angle)*22,y=playerFeet-105-Math.sin(Math.PI*age)*55-(i%2)*17;
        heart(c,x,y,2.1,true);
      }
    }
    c.textAlign='center';c.fillStyle='#f5d57d';c.font=`bold ${narrow?15:16}px Trebuchet MS,sans-serif`;
    c.fillText('O HERÓI USA COLEIRA',W/2,H*(narrow?.16:.14));
    c.fillStyle='#fff6de';c.font=`bold ${narrow?39:52}px Trebuchet MS,sans-serif`;
    c.fillText(t<1.4?'THOR OUVIU!':arrived?'BOM GAROTO!':'LÁ VEM O THOR!',W/2,H*(narrow?.16:.14)+58,W-38);
    c.font=`${narrow?17:20}px Trebuchet MS,sans-serif`;c.fillStyle='#eadfba';
    c.fillText(t<1.4?'A soneca pode esperar.':arrived?(ThorSystem.cost(game)?'Vida completa. A aventura continua!':'+1 coração. Uma ajuda que vale ouro.'):'Patas ligeiras. Coração gigante.',W/2,H*(narrow?.16:.14)+93,W-34);
    const heartY=H*(narrow?.82:.87);
    c.fillStyle='#183b31e8';c.beginPath();c.roundRect(W/2-127,heartY-32,254,64,20);c.fill();
    const lives=arrived?(ThorSystem.cost(game)?MAX_LIVES:Math.min(MAX_LIVES,scene.before+1)):scene.before;
    for(let i=0;i<MAX_LIVES;i++)heart(c,W/2+(i-1)*66,heartY,5,i<lives);
    c.restore();
  }
  return {load,draw,text};
})();
