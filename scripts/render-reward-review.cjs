// Review edited skins through the game renderer before installing the runtime registry.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createCanvas}=require('@napi-rs/canvas'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'preview/reward-skins'),motion=path.join(root,'.cache/reward-review');
(async()=>{
  const ids=['goat','turkey','owl','pony'].filter(id=>fs.existsSync(path.join(root,'assets/sprites/wardrobe-117/meta',id+'.json')));
  assert.ok(ids.length,'No complete skin atlas available');
  const art=await require('./sprite-loader.cjs').loadArt('rewards'),directions=['down','downleft','left','upleft','up','upright','right','downright'];
  fs.mkdirSync(out,{recursive:true});fs.mkdirSync(motion,{recursive:true});
  const draw=(c,id,x,y,options={})=>art.draw(c,'chicken',x,y,{skin:id,...options});
  function canvas(w,h){const image=createCanvas(w,h),c=image.getContext('2d');c.fillStyle='#e8dfc9';c.fillRect(0,0,w,h);c.fillStyle='#294937';c.font='15px sans-serif';return [image,c];}
  const [sheet,c]=canvas(1280,ids.length*180+45);c.fillText('Aparências do Difícil e Hardcore · tamanho real e oito direções',20,28);
  ids.forEach((id,row)=>{
    const y=45+row*180;c.fillText(art.appearances[id].name,18,y+25);draw(c,id,70,y+120,{direction:'downright'});
    for(const [i,direction]of directions.entries()){
      c.fillText(direction,155+i*137,y+25);draw(c,id,203+i*137,y+120,{direction,scale:1.6});
    }
  });
  fs.writeFileSync(path.join(out,'directions.png'),sheet.toBuffer('image/png'));
  const [steps,p]=canvas(1280,ids.length*160+45);p.fillText('Caminhada · amostra de oito fases',20,28);
  ids.forEach((id,row)=>{
    const y=45+row*160;p.fillText(art.appearances[id].name,18,y+25);
    for(let frame=0;frame<8;frame++)draw(p,id,180+frame*145,y+115,{direction:'downright',scale:1.7,moving:true,anim:frame/2+.01});
  });
  fs.writeFileSync(path.join(out,'steps.png'),steps.toBuffer('image/png'));
  for(const [action,speed]of [['walk',88],['run',220]])for(let frame=0;frame<240;frame++){
    const [image,ctx]=canvas(920,ids.length*260+45);ctx.fillText(action==='walk'?'Caminhada · 88 px/s':'Corrida · 220 px/s',20,28);
    ids.forEach((id,row)=>{
      const time=frame/60,direction=directions[Math.floor(frame/30)%8],anim=art.advance(0,'chicken',speed*time,{skin:id,speed});
      const y=45+row*260;ctx.fillText(art.appearances[id].name+' · '+direction,20,y+23);
      draw(ctx,id,195,y+150,{direction,moving:true,sprinting:action==='run',anim});
      draw(ctx,id,470,y+150,{direction,moving:true,sprinting:action==='run',anim,scale:1.8});
      const vectors=[[0,1],[-Math.SQRT1_2,Math.SQRT1_2],[-1,0],[-Math.SQRT1_2,-Math.SQRT1_2],[0,-1],[Math.SQRT1_2,-Math.SQRT1_2],[1,0],[Math.SQRT1_2,Math.SQRT1_2]];
      const [dx,dy]=vectors[Math.floor(frame/30)%8],distance=(frame%30-14.5)*speed/60;
      draw(ctx,id,750+dx*distance,y+150+dy*distance,{direction,moving:true,sprinting:action==='run',anim});
    });
    fs.writeFileSync(path.join(motion,action+'-'+String(frame).padStart(2,'0')+'.png'),image.toBuffer('image/png'));
  }
  execFileSync(path.join(root,'.cache/comfyui/venv/Scripts/python.exe'),['-c',
    'from PIL import Image\nfrom pathlib import Path\nimport sys\na,b=map(Path,sys.argv[1:])\nfor action in ["walk","run"]:\n frames=[Image.open(a/(action+"-"+str(i).zfill(2)+".png")).convert("RGBA") for i in range(240)]\n assert len(frames)==240\n frames[0].save(b/(action+".png"),save_all=True,append_images=frames[1:],duration=17,loop=0,disposal=0,blend=0)\n del frames\n',motion,out]);
  const runtime=fs.readFileSync(path.join(root,'systems/comfyui-art-data.js'),'utf8');
  if(ids.length===4&&ids.every(id=>runtime.includes(JSON.parse(fs.readFileSync(path.join(root,'assets/sprites/wardrobe-117/meta',id+'.json'),'utf8')).definition.source))){
    const loader=require('./sprite-loader.cjs'),gameCanvas=createCanvas(900,520);
    const storage=new Map([['galinha-guardia-wardrobe-v1',JSON.stringify({version:2,best:6,selected:'classic',unlocked:['classic',...ids]})]]);
    const h=require('../tests/helpers.cjs').createGame(()=>.5,{storage,drawingContext:gameCanvas.getContext('2d')});
    await loader.loadGameSprites(h);
    h.run("resetGame(814237);state.phase='playing';camera.x=0;camera.y=0;");
    for(const id of ids){
      assert.equal(h.run(`CharacterArt.frameFor('chicken',{skin:'${id}'}).definition.edition`),117);
      h.run(`SkinSystem.equip(state,'${id}');renderGame();`);
      fs.writeFileSync(path.join(out,id+'-in-game.png'),gameCanvas.toBuffer('image/png'));
    }
  }
  fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Aparências de vitória</title><style>body{margin:24px;background:#18382f;color:#fff3d4;font:16px system-ui}main{max-width:1280px;margin:auto}img{max-width:100%;image-rendering:pixelated}figure{margin:28px 0}</style><main><h1>Aparências de vitória</h1><p>Renderizador do jogo, oito direções e passadas por distância. A prévia complementa a conferência em partida.</p>'+['directions','steps','walk','run'].map(name=>`<figure><figcaption>${({directions:'Oito direções',steps:'Fases da caminhada',walk:'Caminhada em movimento',run:'Corrida em movimento'})[name]}</figcaption><img src="${name}.png" alt="${name}"></figure>`).join('')+'</main></html>');
  console.log('Reviewed skins: '+ids.join(', '));
})().catch(error=>{console.error(error);process.exitCode=1;});
