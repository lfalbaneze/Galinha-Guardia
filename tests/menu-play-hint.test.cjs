const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {createGame}=require('./helpers.cjs');
function scene(w=1360,h=730){
  const game=createGame(()=>.5);
  game.run('GameUI.showMenu(state);');
  const box=(left,top,width,height)=>({left,top,width,height});
  for(const id of ['menuScene','menuScreen'])game.elements.get(id).getBoundingClientRect=()=>box(0,0,w,h);
  game.elements.get('menuScene').clientWidth=w;game.elements.get('menuScene').clientHeight=h;
  const compact=w>980&&w<=1440;
  game.elements.get('menuMischief').getBoundingClientRect=()=>box(0,0,Math.min(w<=540?240:compact?360:420,w-32),w<=540?144:compact?86:108);
  game.elements.get('menuCard').getBoundingClientRect=()=>box(20,100,300,350);
  for(const id of ['farmTitle','menuTagline'])game.context.document.getElementById(id).getBoundingClientRect=()=>box(20,20,300,60);
  game.context.window.innerWidth=w;game.context.window.innerHeight=h;
  game.run('MenuScene.frame(state,0,true);');
  return game;
}
test('the menu invitation uses direct text for mouse, touch and gamepad',()=>{
  const h=scene(),hint=h.elements.get('menuPlayHint');
  assert.equal(hint.textContent,'Clique nos bichos para brincar.');
  h.run("Object.defineProperty(GameInput,'device',{configurable:true,get:()=> 'touch'});MenuScene.frame(state,0,true);");
  assert.equal(hint.textContent,'Toque nos bichos para brincar.');
  h.run("Object.defineProperty(GameInput,'device',{configurable:true,get:()=> 'gamepad'});MenuScene.frame(state,0,true);");
  assert.equal(hint.textContent,'Selecione o botão para brincar.');
});
test('the invitation fits beside the herd and does not move with each walking frame',()=>{
  const h=scene(),hint=h.elements.get('menuMischief');
  assert.equal(hint.dataset.placement,'herd');
  const x=parseFloat(hint.style.left),y=parseFloat(hint.style.top);
  assert.ok(x>=180&&x<=1360-180);assert.ok(y>=12&&y+86<=730-12);
  const before=JSON.stringify(hint.style);
  h.run('for(let i=0;i<120;i++)MenuScene.frame(state,1/60,false)');
  assert.equal(JSON.stringify(hint.style),before);
});
test('windowed desktop menus keep the play controls below the herd',()=>{
  for(const [w,height]of [[1278,708],[1366,657],[1100,650],[1024,600]]){
    const h=scene(w,height),hint=h.elements.get('menuMischief');
    h.elements.get('menuScene').getBoundingClientRect=()=>({left:-w*.0125,top:-height*.0125,width:w*1.025,height:height*1.025});
    h.events.window.resize();h.run('MenuScene.frame(state,0,true)');
    assert.equal(hint.dataset.placement,'herd');
    assert.ok(parseFloat(hint.style.top)>=height-180,`${w}x${height}: controls float above the animals`);
  }
});

test('the invitation layout remains bounded after resizing or uses a flow fallback',()=>{
  for(const [w,height] of [[1920,1080],[1440,900],[1278,708],[1024,600],[900,1000],[390,844],[844,390],[320,568]]){
    const h=scene(w,height),hint=h.elements.get('menuMischief');
    h.events.window.resize();h.run('MenuScene.frame(state,0,true)');
    assert.ok(['herd','flow'].includes(hint.dataset.placement));
    if(hint.dataset.placement==='herd'){
      const x=parseFloat(hint.style.left),y=parseFloat(hint.style.top);
      const measured=hint.getBoundingClientRect(),half=measured.width/2,boxHeight=measured.height;
      assert.ok(x>=half&&x<=w-half,`${w}: hint outside horizontal bounds`);
      assert.ok(y>=12&&y+boxHeight<=height-12,`${w}: hint outside vertical bounds`);
    }
  }
});
test('the play invitation has no misleading external-link arrow and keeps its accessible button',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const button=html.match(/<button id="menuScatter"[\s\S]*?<\/button>/)[0];
  assert.doesNotMatch(button,/↗/);assert.match(button,/aria-describedby="menuPlayHint"/);
  assert.match(button,/Brincar com a turma/);
  assert.match(html,/<button id="menuFeed"[^>]*type="button"[^>]*aria-label="Chamar a turma para o rango"/);
  const css=fs.readFileSync(path.join(__dirname,'../menu.css'),'utf8');
  assert.match(css,/#menuScatter, #menuScreen #menuFeed \{[^}]*min-height:80px/);
  assert.match(css,/menu-plank\.png/);
  for(const id of ['menuScatter','menuFeed']){
    const control=html.match(new RegExp('<button id="'+id+'"[\\s\\S]*?<\\/button>'))[0];
    assert.match(control,/<svg width="30" height="30"/,'icons must stay bounded even before CSS loads');
  }
  assert.doesNotMatch(css,/#menuPlayHint \{ display:none/);
});
