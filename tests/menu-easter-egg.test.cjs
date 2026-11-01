const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {createGame}=require('./helpers.cjs');
function menu(reducedMotion=false){
  const h=createGame(()=>.5,{reducedMotion});
  for(const id of ['menuScene','menuScreen'])h.elements.get(id).getBoundingClientRect=()=>({left:0,top:0,width:1360,height:730});
  h.elements.get('menuCard').getBoundingClientRect=()=>({left:90,top:400,width:300,height:230});
  h.run(`GameUI.showMenu(state);CharacterArt.install(src=>({src}));
    const context=document.getElementById('menuScene').getContext('2d'),draws=[],hops=[];
    context.drawImage=(image,...args)=>draws.push(image.src);
    context.translate=(x,y)=>{if(x===0&&y<0)hops.push(y);};
    InterfaceMotion.frame(state,0);const originalState=JSON.stringify(state);`);
  return h;
}
test('three taps on the feather reveal the wolf and three chicks without changing the saved cast or run',()=>{
  const h=menu(),saved=[...h.storage];
  h.events.elements.menuSecret.click();h.events.elements.menuSecret.click();
  assert.notEqual(h.elements.get('menuBanter').dataset.trick,'secret');
  h.events.elements.menuSecret.click();
  assert.equal(h.elements.get('menuBanter').dataset.trick,'secret');
  assert.match(h.elements.get('menuBanter').textContent,/Baltazar/);
  h.run('draws.length=0;InterfaceMotion.frame(state,.05);');
  assert.equal(h.run('draws.length'),10);
  assert.equal(h.run('draws.filter(src=>src.includes("/runtime/chick-")).length'),3);
  assert.equal(h.run('draws.filter(src=>src.includes("/runtime/wolf-")).length'),1);
  h.run('for(let i=0;i<62;i++)InterfaceMotion.frame(state,.05);');
  assert.equal(h.elements.get('menuBanter').dataset.voice,'secret-chick');
  h.run('for(let i=0;i<160;i++)InterfaceMotion.frame(state,.05);draws.length=0;InterfaceMotion.frame(state,.05);');
  assert.equal(h.run('draws.length'),6);
  assert.equal(h.elements.get('menuBanter').hidden,true);
  assert.equal(h.run('JSON.stringify(state)===originalState'),true);assert.deepEqual([...h.storage],saved);
});
test('the secret respects reduced motion, does not stack, and stops on leaving the home screen',()=>{
  const h=menu(true);
  for(let i=0;i<3;i++)h.events.elements.menuSecret.click();
  h.run('draws.length=0;InterfaceMotion.frame(state,.05);');
  assert.equal(h.run('draws.length'),10);
  for(let i=0;i<12;i++)h.events.elements.menuSecret.click();
  h.run('for(let i=0;i<62;i++)InterfaceMotion.frame(state,.05);');
  assert.equal(h.run('draws.length'),10,'static secret does not animate or add more actors');
  assert.equal(h.run('hops.length'),0);
  h.events.elements.newAdventureBtn.click();h.run('InterfaceMotion.frame(state,.05);');
  assert.equal(h.elements.get('menuBanter').hidden,true);
  h.events.elements.menuSecret.click();h.events.elements.menuSecret.click();h.events.elements.menuSecret.click();
  assert.equal(h.elements.get('menuBanter').hidden,true);
  h.events.elements.menuBackBtn.click();h.run('draws.length=0;InterfaceMotion.frame(state,.05);');
  assert.equal(h.run('draws.length'),6);assert.equal(h.elements.get('menuSecret').dataset.taps,'0');
});
test('the feather is a keyboard-accessible scenic control, not an advertised secret button',()=>{
  const html=fs.readFileSync('index.html','utf8'),button=html.match(/<button id="menuSecret"[\s\S]*?<\/button>/)[0];
  assert.match(button,/type="button"/);assert.match(button,/aria-label="Fazer cócegas na pena dourada"/);
  assert.match(button,/<svg/);assert.doesNotMatch(button,/Easter|easter|segredo/);
});

test('the secret visitors stay on the painted road rather than spawning on the guests',async()=>{
  const {createCanvas,loadImage}=require('@napi-rs/canvas'),h=menu();
  h.run(`const feet=[];let origin;
    context.translate=(x,y)=>{if(x>100&&y>100)origin={x,y};};
    context.scale=(x,y)=>{if(origin&&x===y&&x>0)origin.scale=x;};
    context.drawImage=image=>{if(origin&&(image.src.includes('/runtime/wolf-')||image.src.includes('/runtime/chick-')))feet.push({...origin});};`);
  for(let i=0;i<3;i++)h.events.elements.menuSecret.click();
  h.run('for(let i=0;i<100;i++)InterfaceMotion.frame(state,.05);');
  const image=await loadImage('assets/menu/farm-title.png'),c=createCanvas(image.width,image.height).getContext('2d');
  c.drawImage(image,0,0);const pixels=c.getImageData(0,0,image.width,image.height).data;
  const scale=1360/1536*1.12,left=(1360-1536*scale)*.42,top=730-1024*scale;
  const feet=h.run('feet');assert.ok(feet.length>=390);
  for(const p of feet){
    const x=Math.round((p.x-left)/scale),y=Math.round((p.y+14*p.scale-top)/scale);let dirt=0;
    for(const dx of [-12,0,12])for(const dy of [-6,0,6]){
      const k=((y+dy)*image.width+x+dx)*4,[r,g,b]=pixels.slice(k,k+3);
      if(r>g*1.13&&g>b*1.18)dirt++;
    }
    assert.ok(dirt>=7,`secret left the road at ${x},${y}`);
  }
});
