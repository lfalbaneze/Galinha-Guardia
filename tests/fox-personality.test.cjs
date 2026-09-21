const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');

function arena(index=0,options={}) {
  const h=createGame(()=>.5,options);
  h.run(`OBSTACLES=[];camera.x=700;camera.y=500;
    var f=state.entities.foxes[${index}],c=state.entities.chicken,w=state.entities.wolf;
    state.entities.foxes=[f];
    Object.assign(f,{x:1000,y:800,home:{x:1000,y:800},anchor:{x:1000,y:800},mode:'hidden',grace:0,cooldown:0});
    Object.assign(c,{x:1100,y:800,hidden:false,invulnerable:0});
    Object.assign(w,{x:2500,y:1500,mode:'patrol',huntUnlockTimer:0,pauseTimer:0});`);
  return h;
}

test('the two foxes are Lorenzo and Amanda and keep their identity after changing dens and loading',()=>{
  const h=createGame();
  assert.equal(h.run('state.entities.foxes.map(f=>f.name).join(",")'),'Lorenzo,Amanda');
  h.run(`difficultySelect.value='hard';resetGame(52);
    var identities=JSON.stringify(state.entities.foxes.map(f=>[f.id,f.name]));
    state.entities.chicken.hidden=true;state.entities.foxes.forEach(f=>{f.relocateIn=0;f.grace=0;});
    FoxSystem.update(state,.05);GameManager.save(state);var saved=GameManager.read();resetGame(52);GameManager.restore(state,saved);`);
  assert.equal(h.run('JSON.stringify(state.entities.foxes.map(f=>[f.id,f.name]))===identities'),true);
});

for(const [index,name] of ['Lorenzo','Amanda'].entries()) {
  test(`${name} has individual warning, miss, hit and scared lines and correctly attributed damage`,()=>{
    const h=arena(index);
    h.run('FoxSystem.update(state,.05);');
    assert.equal(h.run('f.mode'),'warning');
    assert.ok(h.run('f.speech.length>0'));
    assert.match(h.elements.get('statusText').textContent,new RegExp(name));
    const warning=h.run('f.speech');
    h.run('f.mode="dash";f.target={x:f.x,y:f.y};f.hit=false;FoxSystem.update(state,.05);');
    const miss=h.run('f.speech');
    assert.notEqual(miss,warning);
    h.run('f.mode="dash";f.hit=false;c.x=f.x;c.y=f.y;FoxSystem.update(state,.05);');
    assert.equal(h.run('state.lives'),2);
    assert.notEqual(h.run('f.speech'),miss);
    assert.match(h.elements.get('statusText').textContent,new RegExp(name));
    h.run(`Object.assign(w,{x:900,y:800,heading:0});f.scaredTime=0;f.grace=0;FoxSystem.update(state,.05);`);
    assert.equal(h.run('f.mode'),'flee');
    assert.ok(h.run('f.speech.length>0'));
    if(name==='Amanda')assert.match(h.run('f.speech'),/laço/);
  });
}

test('idle banter has cooldown, changes over time and freezes while paused',()=>{
  const h=arena(1);
  h.run('c.x=1220;f.speechCooldown=0;FoxSystem.update(state,.05);');
  const first=h.run('f.speech');
  h.run('for(let i=0;i<40;i++)FoxSystem.update(state,.05);');
  assert.equal(h.run('f.speech'),first);
  h.run('for(let i=0;i<130;i++)FoxSystem.update(state,.05);');
  assert.notEqual(h.run('f.speech'),first);
  h.run('state.phase="menu";var before=JSON.stringify(f);FoxSystem.update(state,.1);');
  assert.equal(h.run('JSON.stringify(f)===before'),true);
});

test('Amanda owns her bush in both hints and her visible speech bubble',()=>{
  const labels=[];
  const ctx=new Proxy({canvas:{width:900,height:520},fillText:t=>labels.push(t),measureText:t=>({width:t.length*7})},
    {get:(o,k)=>o[k]??(()=>({addColorStop(){}})),set:(o,k,v)=>(o[k]=v,true)});
  const h=arena(1,{drawingContext:ctx});
  h.run(`HidingSpots.initialize({...WORLD.layout,vegetation:[{id:'amanda-den',type:'bush',x:950,y:740,w:100,h:100}]});
    f.bushId='amanda-den';c.x=1000;c.y=800;GameUI.update(state);`);
  assert.match(h.elements.get('contextHint').textContent,/Moita da Amanda/);
  h.run('c.x=1100;FoxSystem.update(state,.05);FoxSystem.drawWarnings(state);');
  assert.ok(labels.includes('Amanda'));
  assert.ok(labels.includes(h.run('f.speech')));
  labels.length=0;h.run('camera.x=0;camera.y=0;FoxSystem.drawWarnings(state);');
  assert.equal(labels.length,0,'offscreen foxes do not reveal their location through dialogue');
});

test('Amanda has her authored pink bow in every direction and phase',async()=>{
 const {createCanvas,loadImage}=require('@napi-rs/canvas'),path=require('node:path');
 const h=createGame(),art=h.run('FoxArt'),sheets=new Map();
 for(const name of ['fox','amanda']){const source=h.run('PremiumWildlifeData')[name].src;sheets.set(source,await loadImage(path.join(__dirname,'..',source)));}
 art.install(src=>sheets.get(src));h.run('CharacterArt').install(src=>sheets.get(src));const ctx=createCanvas(180,140).getContext('2d');
 for(const direction of ['down','downright','right','upright','up','upleft','left','downleft'])for(let phase=0;phase<8;phase++){
  ctx.clearRect(0,0,180,140);art.draw(ctx,{x:90,y:95,direction,anim:phase/2,moving:true,name:'Amanda'},{x:0,y:0});
  const pixels=ctx.getImageData(0,0,180,140).data;let pink=0,opaque=0;
  for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>100){opaque++;if(pixels[i]>150&&pixels[i+2]>65&&pixels[i+2]>=pixels[i+1]&&pixels[i]>pixels[i+1]*1.5)pink++;}
  assert.ok(opaque>300);assert.ok(pink>=1,direction+'/'+phase+' has visible pink bow');
 }
});
