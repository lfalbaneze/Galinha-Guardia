const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {createGame}=require('./helpers.cjs');

test('Thor keeps the cast scale and grounded paws through the run and greeting',async()=>{
  const screen=createCanvas(1200,680),c=screen.getContext('2d');
  const game=createGame(()=>.5,{drawingContext:c}),art=game.run('CharacterArt');
  game.run('Sunlight').install(createCanvas);
  assert.equal(await art.load(src=>loadImage(src)),true);
  const sample=createCanvas(400,400),sc=sample.getContext('2d');
  let actors=[];
  const context=vm.createContext({canvas:screen,InterfaceMotion:{reduced:false},
    ThorSystem:{healAt:3.55,cost:()=>0},MAX_LIVES:3,
    clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),lerp:(a,b,t)=>a+(b-a)*t,
    CharacterArt:{...art,draw(ctx,name,x,y,options){
      sc.clearRect(0,0,400,400);
      art.draw(sc,name,200,350-14*options.scale,{...options,lift:0,shadow:false});
      const pixels=sc.getImageData(0,0,400,400).data;let top=400,bottom=0;
      for(let py=0;py<400;py++)for(let px=0;px<400;px++)if(pixels[(py*400+px)*4+3]>=128){top=Math.min(top,py);bottom=Math.max(bottom,py+1);}
      actors.push({name,options,height:bottom-top,bottom,feet:y+14*options.scale});
      return art.draw(ctx,name,x,y,options);
    }}});
  vm.runInContext(fs.readFileSync('systems/thor-cinematic.js','utf8'),context);
  const scene=vm.runInContext('ThorCinematic',context);
  for(const [width,height] of [[1200,680],[390,844],[900,400]]){
    screen.width=width;screen.height=height;
    for(const skin of ['classic','priest'])for(const time of [2,2.7,3.55,4.6]){
      const state={entities:{chicken:{skin}},thorRescue:{time,before:1}},saved=JSON.stringify(state);
      actors=[];scene.draw(c,state);
      const [player,thor]=actors;
      assert.equal(thor.name,'thor');
      assert.ok(thor.height/player.height>1.15&&thor.height/player.height<1.65,`${skin}/${time}: Thor ${thor.height}, player ${player.height}`);
      assert.equal(thor.options.scale,player.options.scale);
      assert.ok(Math.abs(thor.bottom-350)<=1,'opaque paws meet the ground');
      assert.equal(thor.options.action,time<3.55?'run':'happy');
      assert.equal(thor.options.moving,time<3.55,'arrival stops the running cycle');
      if(time>=3.55)assert.ok(Math.abs(thor.feet-player.feet)<.01);
      assert.equal(JSON.stringify(state),saved);
    }
  }
  context.InterfaceMotion.reduced=true;actors=[];
  scene.draw(c,{entities:{chicken:{skin:'classic'}},thorRescue:{time:2,before:1}});
  assert.equal(actors[1].options.moving,false);assert.equal(actors[1].options.action,'idle');
});
