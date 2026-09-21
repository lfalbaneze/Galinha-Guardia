// Render the actual scenery sheets and vector sign through the production renderers.
const fs=require('node:fs');
const {createCanvas}=require('@napi-rs/canvas');
const {createGame}=require('../tests/helpers.cjs');
const {loadGameSprites}=require('./sprite-loader.cjs');
(async()=>{
 const canvas=createCanvas(1100,640),c=canvas.getContext('2d'),h=createGame(()=>.5,{drawingContext:c});
 await loadGameSprites(h);
 const art=h.run('FarmArt'),sun=h.run('Sunlight'),view={x:0,y:0,shakeX:0,shakeY:0};
 c.fillStyle='#799854';c.fillRect(0,0,1100,640);
 sun.begin(0);sun.beginLayer(c);
 const items=[['tree',155,225,100,64],['bush',430,225,102,70],['sign',700,225,105,49],['hay',945,225,84,56],
 ['coop',140,535,110,90],['trough',420,535,100,42],['silo',660,535,70,145],['stable',870,535,142,68]];
 for(const [type,x,base,w,hh]of items){
   art.drawProp(c,{type,x:x-w/2,y:base-hh,w,h:hh,name:'POMAR',variant:0},view);
 }
 sun.end();
 c.font='bold 15px sans-serif';c.fillStyle='#fff7df';c.textAlign='center';
 for(const [type,x,base]of items)c.fillText(type,x,base+26);
 fs.writeFileSync(process.argv[2]||'/mnt/data/scenery-review.png',canvas.toBuffer('image/png'));
})().catch(e=>{console.error(e);process.exitCode=1});
