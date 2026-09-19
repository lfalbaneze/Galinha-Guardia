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

test('Amanda has a visible bow in all twelve poses; Lorenzo retains the original sprite',async()=>{
  const {createCanvas,loadImage}=require('@napi-rs/canvas'),path=require('node:path');
  const h=createGame(),art=h.run('FoxArt');
  const source=await loadImage(path.join(__dirname,'../assets/sprites/sources/fox-custom.png'));
  art.install(()=>source);
  const canvas=createCanvas(150,120),ctx=canvas.getContext('2d');
  const view={x:0,y:0,shakeX:0,shakeY:0};
  for(const direction of ['down','left','right','up'])for(const anim of [0,1,3]){
    const fox={x:75,y:85,direction,anim,moving:true,name:'Lorenzo'};
    ctx.clearRect(0,0,150,120);art.draw(ctx,fox,view);const before=ctx.getImageData(0,0,150,120).data;
    ctx.clearRect(0,0,150,120);art.draw(ctx,{...fox,name:'Amanda'},view);const after=ctx.getImageData(0,0,150,120).data;
    let changed=0,minX=150,minY=120,maxX=0,maxY=0;
    for(let y=0;y<120;y++)for(let x=0;x<150;x++){
      const i=(y*150+x)*4;
      if([0,1,2,3].some(c=>before[i+c]!==after[i+c])){changed++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
    }
    assert.ok(changed>35,`${direction}/${anim}: visible accessory`);
    assert.ok(maxX-minX<20&&maxY-minY<16,`${direction}/${anim}: only the small bow changes`);
  }
});
