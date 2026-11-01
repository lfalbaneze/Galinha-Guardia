const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas');
const {createGame}=require('./helpers.cjs');
async function scene(realArt=false){
  const canvas=createCanvas(1360,730),c=canvas.getContext('2d');
  const h=createGame(()=>.5,realArt?{drawingContext:c}:{}),state=h.run('state');state.phase='menu';
  for(const id of ['menuScene','menuScreen'])h.elements.get(id).getBoundingClientRect=()=>({left:0,top:0,width:1360,height:730});
  const card=h.elements.get('menuCard');card.getBoundingClientRect=()=>({left:0,top:100,width:260,height:550});
  for(const id of ['farmTitle','menuTagline','menuSubtitle','menuMischief'])h.context.document.getElementById(id).getBoundingClientRect=()=>({left:0,top:0,width:0,height:0});
  const caption=h.elements.get('menuBanter');caption.offsetWidth=236;caption.offsetHeight=76;
  caption.getBoundingClientRect=()=>({left:0,top:0,width:236,height:76});
  const context=vm.createContext({console,Math:h.context.Math,document:h.context.document,window:h.context.window,
    CharacterArt:h.run('CharacterArt'),RescueSystem:h.run('RescueSystem'),AudioSystem:h.run('AudioSystem'),AudioControls:h.run('AudioControls'),MenuThor:h.run('MenuThor'),state});
  vm.runInContext(fs.readFileSync('systems/menu-character-data.js','utf8'),context);
  vm.runInContext(fs.readFileSync('systems/menu-scene.js','utf8').replace('return { initialize, frame };',
    'return { initialize, frame, herd, projected, startShow, say, placeCaption };'),context);
  const run=code=>vm.runInContext(code,context);
  if(realArt)await h.run('CharacterArt').load(src=>loadImage(path.resolve(src)));
  run('MenuScene.frame(state,0,true);');
  return {h,state,run,canvas,c,caption};
}

test('menu collision boxes use the actual opaque sprite and its grounded foot row',async()=>{
  const s=await scene(true),art=s.h.run('CharacterArt');
  const cases=[...Object.keys(art.appearances).map(skin=>({skin,species:'chicken'})),
    ...s.run('Object.keys(MenuCharacterData.voices).filter(key=>!key.startsWith("skin-"))').map(species=>({skin:'classic',species}))];
  for(const {skin,species}of cases){
    s.state.entities.chicken.skin=skin;
    const actor={...s.run("MenuScene.herd.find(a=>a.species==='chicken')"),species};
    s.run(`var projectedCase={...MenuScene.herd.find(a=>a.species==='chicken'),species:'${species}'};`);
    const p=s.run('MenuScene.projected(projectedCase)');
    s.c.clearRect(0,0,1360,730);
    art.draw(s.c,actor.species,p.x,p.y-14*p.scale,{skin,scale:p.scale,direction:'down'});
    const pixels=s.c.getImageData(0,0,1360,730).data;
    const ink={left:1360,right:0,top:730,bottom:0};
    for(let y=0;y<730;y++)for(let x=0;x<1360;x++)if(pixels[(y*1360+x)*4+3]>=128){
      ink.left=Math.min(ink.left,x);ink.right=Math.max(ink.right,x+1);ink.top=Math.min(ink.top,y);ink.bottom=Math.max(ink.bottom,y+1);
    }
    for(const edge of ['left','right','top','bottom']){
      const projected=p[['left','right'].includes(edge)?'x':'y']+p.box[edge];
      assert.ok(Math.abs(projected-ink[edge])<=2.5,`${species}/${skin} ${edge}: bounds ${projected}, actual ink ${ink[edge]}`);
    }
  }
});

test('a speech bubble keeps its clear side when a neighbour moves out of the preferred position',async()=>{
  const s=await scene();
  s.run(`function put(a,x,y){Object.assign(a,{route:[[x,y],[x+1,y]],lengths:[1],length:1,travel:0,speed:0,moving:false});}
    MenuScene.herd.forEach(a=>put(a,1700,980));
    const lead=MenuScene.herd.find(a=>a.species==='chicken'),neighbour=MenuScene.herd.find(a=>a!==lead);
    put(lead,840,830);put(neighbour,840,735);
    MenuScene.startShow(lead,false,'gossip');MenuScene.placeCaption();`);
  assert.equal(s.caption.style.visibility,'visible');
  assert.equal(s.caption.dataset.placement,'left','fixture reserves the space above the speaker');
  s.run('put(neighbour,1040,735);MenuScene.placeCaption();');
  assert.equal(s.caption.style.visibility,'visible');
  assert.equal(s.caption.dataset.placement,'left','do not jump to another side while the old side still has room');
});

test('changing speakers hides the previous bubble and tail until the new text is positioned',async()=>{
  const s=await scene();
  s.run(`MenuScene.startShow(MenuScene.herd.find(a=>a.species==='chicken'),false,'gossip');MenuScene.placeCaption();`);
  assert.equal(s.caption.style.visibility,'visible');
  s.run('MenuScene.say(MenuScene.herd.find(a=>a.species!=="chicken"),1);');
  assert.equal(s.caption.style.visibility,'hidden','new text must not flash at the previous speaker');
  assert.equal(s.h.elements.get('menuBanterLink').getAttribute('d'),'','no detached old tail');
  s.run('MenuScene.placeCaption();');
  assert.equal(s.caption.style.visibility,'visible');
  const d=s.h.elements.get('menuBanterLink').getAttribute('d'),points=d.match(/-?\d+(?:\.\d+)?/g).map(Number);
  assert.ok(Math.hypot(points[2]-(points[0]+points[4])/2,points[3]-(points[1]+points[5])/2)<=32,'short integrated comic tail');
});

test('bubble and tail follow parallax together and clear when the canvas loses its layout',async()=>{
  const s=await scene();
  s.run("MenuScene.startShow(MenuScene.herd.find(a=>a.species==='chicken'),false,'gossip');MenuScene.placeCaption();");
  const bubbleX=parseFloat(s.caption.style.left),tail=s.h.elements.get('menuBanterLink'),tipX=Number(tail.getAttribute('data-tip-x'));
  s.h.elements.get('menuScene').getBoundingClientRect=()=>({left:7,top:3,width:1360,height:730});
  s.run('MenuScene.placeCaption();');
  assert.ok(Math.abs(parseFloat(s.caption.style.left)-bubbleX-7)<.01);
  assert.ok(Math.abs(Number(tail.getAttribute('data-tip-x'))-tipX-7)<.01);
  s.h.elements.get('menuScene').getBoundingClientRect=()=>({left:0,top:0,width:0,height:0});
  s.run('MenuScene.placeCaption();');
  assert.equal(s.caption.style.visibility,'hidden');assert.equal(tail.getAttribute('d'),'');
});

test('the reply fits between nearby livestock with the real text size',async()=>{
  const s=await scene(true);
  GlobalFonts.registerFromPath(path.resolve('assets/fonts/Nunito-Variable.ttf'),'BubbleTest');
  const boxes={menuCard:[90,400,300,230],farmTitle:[90,100,300,220],menuTagline:[90,330,300,50],menuSubtitle:[90,380,300,15],menuMischief:[700,650,390,68]};
  for(const [id,r]of Object.entries(boxes))s.h.context.document.getElementById(id).getBoundingClientRect=()=>({left:r[0],top:r[1],width:r[2],height:r[3]});
  s.caption.getBoundingClientRect=()=>{
    let lines=0;
    for(const [i,paragraph]of s.caption.textContent.split('\n').entries()){
      s.c.font=(i?'700':'900')+' 13px BubbleTest';let row='';lines++;
      for(const word of paragraph.split(' ')){
        if(row&&s.c.measureText(row+' '+word).width>202){lines++;row=word;}else row+=(row?' ':'')+word;
      }
    }
    return {left:0,top:0,width:236,height:26+lines*18.2};
  };
  s.state.entities.chicken.skin='silkie';
  s.run(`MenuScene.frame(state,0,false);MenuScene.startShow(MenuScene.herd.find(a=>a.species==='chicken'),false,'tumble');
    for(let i=0;i<184;i++)MenuScene.frame(state,1/60,false);`);
  assert.notEqual(s.caption.dataset.voice,'skin-silkie','a neighbour is actually replying');
  assert.equal(s.caption.style.visibility,'visible','the reply must not disappear in the crowded group');
});
