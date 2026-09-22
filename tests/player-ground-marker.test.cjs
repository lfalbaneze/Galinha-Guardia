const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');

test('playable animal marker is split around the exact foot plane',()=>{
  const ellipses=[];
  const drawing=new Proxy({canvas:{width:900,height:520},
    save(){},restore(){},beginPath(){},stroke(){},
    ellipse(...args){ellipses.push(args);}},
    {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
  const h=createGame(()=>.5,{drawingContext:drawing});
  ellipses.length=0;
  h.run("state.entities.chicken.skin='priest';state.entities.chicken.hidden=false;state.entities.chicken.hideBlend=0;drawChicken(state.entities.chicken);");
  assert.equal(ellipses.length,2);
  const expectedY=h.run('worldY(state.entities.chicken.y)+14');
  for(const e of ellipses){assert.equal(e[1],expectedY);assert.equal(e[2],29);assert.equal(e[3],9);}
  assert.deepEqual(ellipses.map(e=>[e[5],e[6]]),[[Math.PI,Math.PI*2],[0,Math.PI]]);
});
