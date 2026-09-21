// Overview composed only from the installed PixelLab sprites used by the game.
const fs=require('node:fs'),path=require('node:path'),{createCanvas}=require('@napi-rs/canvas');
const {cast}=require('./lib/pixellab-cast.cjs');
const names={chicken:'Erina','hen-silkie':'Midori','hen-blue':'Alzira','skin-zeca':'Zeca','skin-pipoca':'Pipoca','skin-amora':'Stella','skin-pacoca':'Paçoca','skin-gumercindo':'Gumercindo',sheep:'Ovelha',pig:'Porquinho',cow:'Vaquinha',dog:'Cachorrinho',cat:'Gatinho',rabbit:'Coelho',duck:'Pato',horse:'Cavalo',donkey:'Burrinho',goat:'Cabra',lamb:'Cordeirinho',chick:'Pintinho',turkey:'Peru',wolf:'Lobo',fox:'Raposa',amanda:'Amanda',thor:'Thor',owl:'Coruja',scarecrow:'Espantalho',crow:'Corvo',goose:'Panto'};
(async()=>{const root=path.resolve(__dirname,'..'),art=await require('./sprite-loader.cjs').loadArt(),canvas=createCanvas(1408,1220),c=canvas.getContext('2d');
c.fillStyle='#18382d';c.fillRect(0,0,canvas.width,canvas.height);c.fillStyle='#fff0c7';c.font='bold 32px sans-serif';c.fillText('Penas pro Ar! · O elenco',28,48);c.font='17px sans-serif';c.fillStyle='#b8c9a3';c.fillText('29 personagens e aparências · sprites da PixelLab instalados no jogo',28,77);
cast.forEach((item,i)=>{const x=20+(i%6)*232,y=102+Math.floor(i/6)*220;c.fillStyle='#244b3c';c.beginPath();c.roundRect(x,y,214,204,12);c.fill();
const options={direction:'down',moving:false,shadow:false,scale:1.45};if(art.frameFor(item.id,options).definition.provider!=='pixellab')throw Error('Non-PixelLab character: '+item.id);
art.draw(c,item.id,x+107,y+153,options);c.fillStyle='#fff0c7';c.font='bold 17px sans-serif';c.textAlign='center';c.fillText(names[item.id],x+107,y+189);c.textAlign='left';});
const target=path.join(root,'preview/pixellab/cast.png');fs.writeFileSync(target,canvas.toBuffer('image/png'));console.log('preview/pixellab/cast.png');
})().catch(e=>{console.error(e);process.exitCode=1});
