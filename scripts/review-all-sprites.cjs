// Render every production pose, rather than a sample or a source-sheet thumbnail.
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {createGame}=require('../tests/helpers.cjs');
const {loadGameSprites}=require('./sprite-loader.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'preview/media-review');
const directions=['down','right','up','left'];
const labels={down:'Frente',right:'Direita',up:'Costas',left:'Esquerda'};
function board(title,rows){
 const canvas=createCanvas(1440,70+rows*240),c=canvas.getContext('2d');
 c.fillStyle='#203c2e';c.fillRect(0,0,canvas.width,canvas.height);
 c.fillStyle='#f3e5c0';c.font='bold 24px sans-serif';c.fillText(title,20,35);
 c.imageSmoothingEnabled=false;return {canvas,c};
}
function cell(c,row,index,label,draw){
 const x=90+index%8*180,y=128+row*240+Math.floor(index/8)*114;
 c.fillStyle='#829d60';c.fillRect(x-86,y-60,172,107);
 c.save();c.translate(x,y+19);draw(c);c.restore();
 c.fillStyle='#203c2e';c.font='11px sans-serif';c.textAlign='center';c.fillText(label,x,y+42);c.textAlign='left';
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const game=createGame(()=>.5,{drawingContext:createCanvas(900,520).getContext('2d')});await loadGameSprites(game);const art=game.run('CharacterArt');
 const report=[];
 for(let start=0;start<art.species.length;start+=4){
  const names=art.species.slice(start,start+4),{canvas,c}=board('Todos os quadros · '+names.join(' / '),names.length);
  for(const [row,name]of names.entries()){
   const definition=game.run('SpriteData')[name];
   const enlargement=Math.min(2.5,84/Math.max(...Object.values(definition.poses).flatMap(p=>p.frames.map(f=>f.h*definition.scale))));
   c.fillStyle='#f3e5c0';c.font='bold 14px sans-serif';c.fillText(name,12,65+row*240);
   for(const [d,direction]of directions.entries())for(let frame=0;frame<definition.poses[direction].frames.length;frame++){
    cell(c,row,d*4+frame,labels[direction]+' '+(frame+1),ctx=>{ctx.scale(enlargement,enlargement);art.draw(ctx,name,0,-14,{direction,moving:true,anim:frame,shadow:false})});
    const f=art.frameFor(name,{direction,moving:true,anim:frame});
    report.push({name,direction,frame,...f.frame,scale:f.scale,flipped:f.pose.flip});
   }
  }
  fs.writeFileSync(path.join(out,'cast-'+String(start/4+1).padStart(2,'0')+'.png'),canvas.toBuffer('image/png'));
 }
 const {canvas,c}=board('Personagens especiais · todos os estados',5);
 for(const[row,name]of ['Lorenzo','Amanda','Thor','Panto','Coruja'].entries()){
  c.fillStyle='#f3e5c0';c.font='bold 14px sans-serif';c.fillText(name,12,65+row*240);
  for(const[d,direction]of directions.entries())for(let frame=0;frame<4;frame++)cell(c,row,d*4+frame,labels[direction]+' '+(frame+1),ctx=>{
   if(name==='Lorenzo'||name==='Amanda')game.run('FoxArt').draw(ctx,{x:0,y:0,direction,anim:frame,moving:true,name},{x:0,y:0});
   if(name==='Thor')game.run('ThorArt').draw(ctx,{x:0,y:0,direction,anim:frame,moving:true,age:1,mode:'follow',timer:1},{x:0,y:0});
   if(name==='Panto')game.run('GooseArt').draw(ctx,{x:0,y:0,direction,anim:frame,moving:true,mode:frame>1?'warning':'patrol'},{x:0,y:0});
   if(name==='Coruja')game.run('OwlArt').draw(ctx,{perch:{x:0,y:56},direction,mode:['idle','cooldown','alert','idle'][frame]},{x:0,y:0});
  });
 }
 fs.writeFileSync(path.join(out,'specials.png'),canvas.toBuffer('image/png'));
 const extras=board('Corvos, espantalho, boia e aparências jogáveis',3);
 for(let i=0;i<6;i++)cell(extras.c,0,i,'Corvo '+i,ctx=>game.run('ScarecrowArt').drawCrow(ctx,{x:0,y:0,z:0,opacity:1,left:i%2===0,flying:i>1},i,i/12,{x:0,y:0}));
 cell(extras.c,0,6,'Espantalho',ctx=>{ctx.scale(.65,.65);game.run('ScarecrowArt').drawPost(ctx,{x:0,y:0},{x:0,y:0})});
 for(const[i,skin]of Object.keys(art.appearances).entries()){
  cell(extras.c,1,i,art.appearances[skin].name,ctx=>art.draw(ctx,'chicken',0,0,{skin,direction:'right',shadow:false}));
  cell(extras.c,2,i,art.appearances[skin].name+' · nadando',ctx=>{
   art.drawFloat(ctx,0,5,68,false);art.draw(ctx,'chicken',0,0,{skin,direction:'right',shadow:false});art.drawFloat(ctx,0,5,68,true);
  });
 }
 fs.writeFileSync(path.join(out,'extras.png'),extras.canvas.toBuffer('image/png'));
 const farm=game.run('FarmSprites'),scenery=board('Cenário · todas as 16 silhuetas',2);
 Object.entries(farm.cohesiveFrames).forEach(([name,rect],i)=>cell(scenery.c,Math.floor(i/8),i%8,name,ctx=>{
  const scale=Math.min(90/rect[3],150/rect[2]);const w=rect[2]*scale,h=rect[3]*scale;
  farm.draw(ctx,name,-w/2,-h,w,h,{grounded:true});
 }));
 fs.writeFileSync(path.join(out,'scenery.png'),scenery.canvas.toBuffer('image/png'));
 fs.writeFileSync(path.join(out,'frames.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({characters:art.species.length,frames:report.length,specialCharacters:5,output:out}));
})().catch(e=>{console.error(e);process.exitCode=1});
