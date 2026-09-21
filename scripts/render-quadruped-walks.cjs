// Visual anatomy review: exact runtime pixels at 1x and nearest-neighbour 3x.
// This renders evidence for human review; it does not count or validate limbs.
const fs=require('node:fs'),path=require('node:path'),{createCanvas}=require('@napi-rs/canvas');
const cast={wolf:'Lobo',sheep:'Ovelha',pig:'Porco',goat:'Cabra',cow:'Vaca',rabbit:'Coelho',dog:'Cachorro',cat:'Gato',donkey:'Burro',lamb:'Cordeiro',horse:'Cavalo','skin-pipoca':'Pipoca','skin-amora':'Stella','skin-pacoca':'Paçoca'};
Object.assign(cast,{chicken:'Erina',duck:'Pato',chick:'Pintinho',turkey:'Peru',goose:'Gumercindo',
 'hen-silkie':'Midori','hen-blue':'Alzira','skin-zeca':'Zeca','skin-gumercindo':'Gumercindo'});
(async()=>{
 const art=await require('./sprite-loader.cjs').loadArt(),out=path.resolve(__dirname,'../preview/quadrupeds');
 fs.mkdirSync(out,{recursive:true});
 for(const [species,name] of Object.entries(cast)) {
  const canvas=createCanvas(1600,920),c=canvas.getContext('2d');
  c.fillStyle='#203c2e';c.fillRect(0,0,canvas.width,canvas.height);c.fillStyle='#f1e4bf';c.font='bold 26px sans-serif';
  c.fillText(name+' · todos os passos laterais · 1× / 3×',24,38);
  for(const [row,direction] of ['right','left'].entries())for(let frame=0;frame<4;frame++) {
   const x=200+frame*400,y=332+row*450;
   c.fillStyle='#becbab';c.font='18px sans-serif';c.textAlign='center';
   c.fillText((direction==='right'?'Direita':'Esquerda')+' · passo '+(frame+1),x,y-265);
   art.draw(c,species,x,y,{direction,moving:true,anim:frame,scale:3,shadow:false});
   art.draw(c,species,x,y+116,{direction,moving:true,anim:frame,scale:1,shadow:false});
  }
  fs.writeFileSync(path.join(out,species+'.png'),canvas.toBuffer('image/png'));
 }
 const {createGame}=require('../tests/helpers.cjs'),{loadImage}=require('@napi-rs/canvas'),game=createGame();
 game.run('SpriteStyle').install(createCanvas);
 for(const api of ['FoxArt','ThorArt']) {
  const a=game.run(api),sources=new Map();
  const paths=api==='FoxArt'?['assets/sprites/sources/fox-custom.png',game.run('FoxSideArtData.src')]:[a.source];
  for(const src of paths)sources.set(src,await loadImage(path.resolve(__dirname,'..',src)));
  a.install(src=>sources.get(src));
 }
 for(const name of ['fox','amanda','thor']) {
  const canvas=createCanvas(1600,920),c=canvas.getContext('2d');c.fillStyle='#203c2e';c.fillRect(0,0,1600,920);
  c.fillStyle='#f1e4bf';c.font='bold 26px sans-serif';c.fillText({fox:'Lorenzo',amanda:'Amanda',thor:'Thor'}[name]+' · 1× / 3×',24,38);
  for(const [row,direction] of ['right','left'].entries())for(let anim=0;anim<4;anim++) {
   const x=200+anim*400,y=332+row*450;c.fillStyle='#becbab';c.font='18px sans-serif';c.textAlign='center';
   c.fillText((row?'Esquerda':'Direita')+' · passo '+(anim+1),x,y-265);
   for(const scale of [3,1]) {
    c.save();c.translate(x,y+(scale===1?116:0));c.scale(scale,scale);
    if(name==='thor') {
     const a=game.run('ThorArt'),f=a.frameFor({direction,anim,moving:true});
     a.drawHero(c,0,14,Math.max(...a.frames.slice(f.row*a.columns,(f.row+1)*a.columns).map(p=>p.h)),direction,anim);
    } else game.run('FoxArt').draw(c,{x:0,y:0,direction,anim,moving:true,name:name==='amanda'?'Amanda':'Lorenzo'},{x:0,y:0});
    c.restore();
   }
  }
  fs.writeFileSync(path.join(out,name+'.png'),canvas.toBuffer('image/png'));
 }
 console.log(`Rendered ${Object.keys(cast).length+3} complete lateral cycles for visual inspection.`);
})().catch(e=>{console.error(e);process.exitCode=1});
