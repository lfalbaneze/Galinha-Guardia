// Use the mode's real sprite renderer for direction sheets and motion previews.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {loadArt}=require('./sprite-loader.cjs'),S=require('../shuffle/survival.js');
const root=path.resolve(__dirname,'..'),out=path.join(root,'preview/chaos-sprites'),motion=path.join(root,'.cache/chaos-sprite-review/motion');
(async()=>{
  fs.mkdirSync(out,{recursive:true});fs.mkdirSync(motion,{recursive:true});
  const art=await loadArt('chaos'),data=Object.fromEntries(art.species.map(id=>[id,art.frameFor(id).definition]));
  const groups={heroes:Object.keys(S.HEROES).map(skin=>({species:'chicken',skin,name:art.appearances[skin].name})),
    enemies:Object.keys(S.ENEMIES).map(species=>({species,name:S.ENEMIES[species].name})),
    friends:['sheep','pig','rabbit','cow','duck','dog'].filter(species=>!S.ENEMIES[species]).map(species=>({species,name:species}))};
  const actors=Object.values(groups).flat();assert.equal(actors.length,31);
  for(const actor of actors){
    const definition=art.frameFor(actor.species,{skin:actor.skin}).definition;
    assert.equal(definition.edition,actor.skin==='silkie'?112:108);
    Object.assign(actor,{health:100,maxHealth:100,mode:'hunt',moving:true,age:1,traveled:0,dx:0,dy:1});
  }
  const images=new Map(await Promise.all(Object.entries(data).map(async([id,d])=>[id,await loadImage(path.join(root,d.source))])));
  const ui=fs.readFileSync(path.join(root,'shuffle/ui.js'),'utf8');
  const code=ui.slice(ui.indexOf('  const animations=new WeakMap();'),ui.indexOf('  function danger(){'));
  function renderer(canvas,list){
    const ctx=canvas.getContext('2d'),run={player:list[0],enemies:list.slice(1),friends:[]};
    const context=vm.createContext({CharacterArt:art,S,data,images,ctx,run,reduced:false,isSurvival:()=>true,label(){}});vm.runInContext(code,context);
    return {ctx,context,draw(actor){context.actor=actor;vm.runInContext('sprite(actor)',context);}};
  }
  function clear(canvas,ctx){ctx.fillStyle='#75945c';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.font='12px sans-serif';ctx.fillStyle='#fff4d5';}
  for(const [name,list]of Object.entries(groups)){
    const canvas=createCanvas(960,list.length*140),r=renderer(canvas,list);clear(canvas,r.ctx);
    for(const [row,actor]of list.entries())for(const [column,direction]of art.directions.entries()){
      const angle=column*Math.PI/4;Object.assign(actor,{x:column*120+60,y:row*140+119,dx:Math.cos(angle),dy:Math.sin(angle)});
      r.context.actor=actor;vm.runInContext('animation(actor).direction=CharacterArt.directionFor("down",actor.dx,actor.dy)',r.context);
      if(column===0)r.ctx.fillText(actor.name,4,row*140+14);
      r.ctx.fillText(direction,column*120+4,row*140+135);r.draw(actor);
    }
    fs.writeFileSync(path.join(out,name+'.png'),canvas.toBuffer('image/png'));
  }
  for(const [action,speed]of [['walk',88],['run',220]]){
    const canvas=createCanvas(700,700),r=renderer(canvas,actors);
    for(let frame=0;frame<64;frame++){
      clear(canvas,r.ctx);
      for(const [i,actor]of actors.entries()){
        const angle=Math.floor(frame/8)*Math.PI/4;
        Object.assign(actor,{x:i%5*140+70,y:Math.floor(i/5)*140+121,dx:Math.cos(angle),dy:Math.sin(angle),dashTime:action==='run'?1:0});
        actor.traveled+=speed/12;actor.age+=1/12;
        r.ctx.fillText(actor.name,i%5*140+5,Math.floor(i/5)*140+15);
      }
      vm.runInContext('animate(1/12)',r.context);for(const actor of actors)r.draw(actor);
      fs.writeFileSync(path.join(motion,action+'-'+String(frame).padStart(2,'0')+'.png'),canvas.toBuffer('image/png'));
    }
  }
  execFileSync(path.join(root,'.cache/comfyui/venv/Scripts/python.exe'),['-c',
    'from PIL import Image\nfrom pathlib import Path\nimport sys\na,b=map(Path,sys.argv[1:])\nfor action in ["walk","run"]:\n frames=[Image.open(p).convert("RGBA") for p in sorted(a.glob(action+"-*.png"))]\n assert len(frames)==64\n frames[0].save(b/(action+"-animated.png"),save_all=True,append_images=frames[1:],duration=83,loop=0,disposal=0,blend=0)\n',motion,out],{stdio:'inherit'});
  const results=JSON.parse(fs.readFileSync(path.join(root,'assets/shuffle/results/manifest.json'),'utf8'));
  const portraits=createCanvas(768,Math.ceil(Object.keys(results).length/3)*164),p=portraits.getContext('2d');clear(portraits,p);
  for(const [i,[id,pair]]of Object.entries(results).entries()){
    const x=i%3*256,y=Math.floor(i/3)*164;p.fillText(id+' · vitória / derrota',x+4,y+14);
    for(const [column,key]of ['win','lose'].entries())p.drawImage(await loadImage(path.join(root,pair[key])),x+column*128,y+24);
  }
  fs.writeFileSync(path.join(out,'portraits.png'),portraits.toBuffer('image/png'));
  const assets=JSON.parse(fs.readFileSync(path.join(root,'assets/shuffle/chaos-111/statics.json'),'utf8'));
  assets.projectiles=JSON.parse(fs.readFileSync(path.join(root,'assets/shuffle/chaos-111/projectiles.json'),'utf8'));
  const html='<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Revisão · Revoada do Caos</title><style>body{background:#18382f;color:#fff3d4;font:16px system-ui;margin:24px}main{max-width:960px;margin:auto}img{max-width:100%;image-rendering:pixelated}figure{margin:28px 0}figcaption{margin-bottom:8px} .icons{width:512px}</style><main><h1>Revoada do Caos</h1><p>Renderizador real do modo. Folhas nas oito direções e ciclos a 88 e 220 pixels/s. Esta prévia não substitui a avaliação do movimento na partida.</p>'+
    [['heroes','Personagens'],['enemies','Inimigos'],['friends','Amigos resgatados'],['walk-animated','Caminhada · 88 pixels/s'],['run-animated','Corrida · 220 pixels/s'],['portraits','Retratos · vitória / derrota']].map(([file,title])=>'<figure><figcaption>'+title+'</figcaption><img src="'+file+'.png" alt="'+title+'"></figure>').join('')+
    Object.entries(assets).map(([name,item])=>'<figure><figcaption>'+name+'</figcaption><img class="icons" src="../../'+item.source+'" alt="'+name+'"></figure>').join('')+'</main></html>';
  fs.writeFileSync(path.join(out,'index.html'),html);console.log('Rendered 31 characters, eight directions and two motion speeds.');
})().catch(error=>{console.error(error);process.exitCode=1;});
