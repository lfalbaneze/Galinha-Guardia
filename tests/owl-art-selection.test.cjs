const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');

function fixture(){
  const directions=['down','right','up','left','downright','upright','downleft','upleft'];
  const draws=[];
  const context=vm.createContext({
    PremiumWildlifeData:{owl:{src:'alarm',width:120,height:80,frames:[],columns:12},
      'owl-flight':{src:'flight',width:120,height:80,frames:[],columns:12}},
    CharacterArt:{
      directionFor:(previous,x,y)=>Number.isFinite(x)&&Number.isFinite(y)?
        ['right','downright','down','downleft','left','upleft','up','upright'][(Math.round(Math.atan2(y,x)/(Math.PI/4))+8)%8]:previous,
      frameFor:(name,options={})=>({frame:{src:'neutral',x:directions.indexOf(options.direction||'down'),y:0,w:1,h:1},
        definition:{width:8,height:1}})
    },
    createWildlifeSheet:(source,width,height,frames,columns)=>({
      ready:true,loading:false,errors:[],load:async()=>true,install(){},
      drawFrame:(...args)=>{draws.push({source,frames,columns,args});return true;}
    })
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../systems/owl-art.js'),'utf8'),context);
  return {api:vm.runInContext('OwlArt',context),draws,directions};
}

test('watch and cooldown use the neutral reference in every direction, at the original perch height',()=>{
  const {api,draws,directions}=fixture();
  for(const mode of ['watch','cooldown'])for(const [row,direction]of directions.entries()){
    api.draw({}, {mode,direction,heading:NaN,callTime:0,perch:{x:200,y:150}}, {x:10,y:20,shakeX:1,shakeY:2});
    const draw=draws.at(-1);
    assert.equal(draw.source,'neutral');assert.equal(draw.columns,1);
    assert.equal(draw.frames[draw.args[3]].x,row);
    assert.deepEqual(draw.args.slice(1),[191,90,row,0,1,42]);
  }
});

test('alert, siren and relocation retain their authored animated sheets',()=>{
  const {api,draws}=fixture();
  const owl={direction:'down',heading:Math.PI/2,callHeading:Math.PI/2,perch:{x:200,y:150},
    x:220,y:160,anim:5,alertProgress:.6,flight:{progress:.5}};
  for(const [mode,callTime,source,column]of [['alert',0,'alarm',4],['cooldown',.6,'alarm',7],['relocate',0,'flight',5]]){
    api.draw({}, {...owl,mode,callTime}, {x:0,y:0});
    assert.equal(draws.at(-1).source,source);assert.equal(draws.at(-1).args[4],column);
  }
});
