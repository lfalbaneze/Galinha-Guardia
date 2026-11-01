const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
test('Thor exits to the side above the rocks instead of running through their front or the bottom of the bush',()=>{
  const fs=require('node:fs'),vm=require('node:vm');
  const source=fs.readFileSync('systems/menu-thor.js','utf8').replace('return {initialize,frame,drawWorld,','return {route,initialize,frame,drawWorld,');
  const route=vm.runInNewContext(source+';MenuThor.route;');
  for(let i=0;i<=1000;i++){
    const t=i/1000,p=route(t);
    assert.ok(!(p.x>=950&&p.x<=995&&p.y>=628&&p.y<=655),'does not cross the rocks');
    if(t<=.36)assert.ok(p.y<=630,'paws do not emerge underneath the shrub');
  }
  assert.equal(route(0).x,1015);assert.equal(route(.36).x,938);assert.equal(route(1).y,940);
});
function menu(reducedMotion=false){
  const h=createGame(()=>.5,{reducedMotion});
  for(const id of ['menuScene','menuScreen'])h.elements.get(id).getBoundingClientRect=()=>({left:0,top:0,width:1360,height:730});
  h.run(`GameUI.showMenu(state);CharacterArt.install(src=>({src}));
    const peek=document.getElementById('menuThorHidden').getContext('2d'),glass=document.getElementById('menuThorCloseup').getContext('2d');
    const hints=[],pixels=[],curves=[];peek.drawImage=image=>hints.push(image.src);
    glass.fillRect=(...rect)=>pixels.push({color:glass.fillStyle,rect});
    glass.bezierCurveTo=glass.quadraticCurveTo=(...args)=>curves.push(args);
    InterfaceMotion.frame(state,0);const beforeThor=JSON.stringify(state);`);
  return h;
}
test('Thor visibly peeks from the marked bush, runs out, licks with square pixels and returns without changing the run',()=>{
  const h=menu(),saved=[...h.storage];
  assert.equal(h.elements.get('menuThorHidden').hidden,false);
  assert.match(h.run('hints.at(-1)'),/\/runtime\/thor-/);
  assert.equal(h.elements.get('menuThorBush').hidden,false);
  assert.ok(parseFloat(h.elements.get('menuThorBush').style.left)>800);
  h.events.elements.menuThorBush.click();assert.equal(h.run('MenuThor.busy'),true);
  h.run('InterfaceMotion.frame(state,.05);');
  assert.equal(h.elements.get('menuThorHidden').hidden,true);
  assert.equal(h.elements.get('menuThorCloseup').hidden,true,'he runs from the bush before approaching the glass');
  h.run('for(let i=0;i<70;i++)InterfaceMotion.frame(state,.05);');
  assert.equal(h.elements.get('menuThorCloseup').hidden,false);
  assert.ok(h.run('pixels.filter(p=>p.color==="#dd7992").length')>60);
  assert.equal(h.run('pixels.every(p=>p.rect.every(Number.isInteger)&&p.rect[2]>0&&p.rect[3]>0)'),true);
  assert.equal(h.run('curves.length'),0,'tongue and wet marks never use smoothed curves');
  h.events.elements.menuThorBush.click();
  h.run('for(let i=0;i<83;i++)InterfaceMotion.frame(state,.05);InterfaceMotion.frame(state,.05);');
  assert.equal(h.run('MenuThor.busy'),false,'repeated clicks do not extend or stack the visit');
  assert.equal(h.elements.get('menuThorCloseup').hidden,true);
  assert.equal(h.elements.get('menuThorHidden').hidden,false);
  assert.equal(h.run('JSON.stringify(state)===beforeThor'),true);assert.deepEqual([...h.storage],saved);
});
test('leaving the menu cancels Thor and reduced motion uses a short static pixel greeting',()=>{
  const h=menu(true);h.events.elements.menuThorBush.click();
  h.run('InterfaceMotion.frame(state,.05);');
  assert.equal(h.elements.get('menuThorCloseup').hidden,false);
  const count=h.run('pixels.length');assert.ok(count>30);
  h.run('pixels.length=0;InterfaceMotion.frame(state,.05);');assert.equal(h.run('pixels.length'),count);
  h.run('state.phase="playing";InterfaceMotion.frame(state,.05);');
  assert.equal(h.run('MenuThor.busy'),false);
  for(const id of ['menuThorCloseup','menuThorHidden','menuThorBush'])assert.equal(h.elements.get(id).hidden,true);
  h.events.elements.menuThorBush.click();assert.equal(h.run('MenuThor.busy'),false);
  h.run('GameUI.showMenu(state);InterfaceMotion.frame(state,0);');h.events.elements.menuThorBush.click();
  h.run('for(let i=0;i<62;i++)InterfaceMotion.frame(state,.05);');assert.equal(h.run('MenuThor.busy'),false);
});
test('the installed Golden Retriever peeks around the side, with face and ears partly behind the leaves',async()=>{
  const path=require('node:path'),{createCanvas,loadImage}=require('@napi-rs/canvas');
  const canvas=createCanvas(1360,730),c=canvas.getContext('2d');
  const h=createGame(()=>.5,{menuThorPeekContext:c,drawingContext:createCanvas(900,520).getContext('2d')});
  for(const id of ['menuScene','menuScreen'])h.elements.get(id).getBoundingClientRect=()=>({left:0,top:0,width:1360,height:730});
  await h.run('CharacterArt').load(src=>loadImage(path.resolve(src)));
  h.run('GameUI.showMenu(state);InterfaceMotion.frame(state,0);');
  const data=c.getImageData(0,0,1360,730).data;let minX=1360,maxX=0,minY=730,maxY=0,count=0;
  for(let y=0;y<730;y++)for(let x=0;x<1360;x++)if(data[(y*1360+x)*4+3]){count++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
  const scale=1360/1536*1.12,top=730-1024*scale;
  assert.ok(count>250,'a real visible head, not an entirely occluded dog');
  assert.ok(maxX-minX>24&&maxX-minX<65,JSON.stringify({minX,maxX,minY,maxY,count}));
  assert.ok(minY>top+550*scale&&maxY<top+625*scale,JSON.stringify({minX,maxX,minY,maxY,count,worldTop:(minY-top)/scale,worldBottom:(maxY-top)/scale}));
});
