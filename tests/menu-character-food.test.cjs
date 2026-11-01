const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {createHash}=require('node:crypto'),{createCanvas}=require('@napi-rs/canvas');
const {createGame}=require('./helpers.cjs');
const dataSource=fs.readFileSync('systems/menu-character-data.js','utf8');
function scene(){
  const h=createGame(()=>.5),state=h.run('state');state.phase='menu';
  for(const id of ['menuScene','menuScreen'])h.elements.get(id).getBoundingClientRect=()=>({left:0,top:0,width:1360,height:730});
  h.elements.get('menuCard').getBoundingClientRect=()=>({left:940,top:50,width:390,height:620});
  const context=vm.createContext({console,Math:h.context.Math,document:h.context.document,window:h.context.window,
    CharacterArt:h.run('CharacterArt'),RescueSystem:h.run('RescueSystem'),AudioSystem:h.run('AudioSystem'),AudioControls:h.run('AudioControls'),MenuThor:h.run('MenuThor'),state});
  vm.runInContext(dataSource,context);
  const source=fs.readFileSync('systems/menu-scene.js','utf8').replace('return { initialize, frame };',
    'return { initialize, frame, herd, identity, startShow, dialogueFor, meals:()=>routine?.meals };');
  vm.runInContext(source,context);
  vm.runInContext('MenuScene.frame(state,0,false);',context);
  return {h,context,run:code=>vm.runInContext(code,context)};
}

test('all 24 named menu characters have distinct lines for every scene and speaking role',()=>{
  const context=vm.createContext({});vm.runInContext(dataSource,context);
  const data=vm.runInContext('MenuCharacterData',context),profiles=Object.values(data.voices);
  assert.equal(profiles.length,24);
  for(const field of ['stunts','heckles','sneeze','race','gossip','parade','snack']){
    const length=field==='heckles'?4:3;
    for(let stage=0;stage<length;stage++){
      const lines=profiles.map(profile=>profile[field][stage]);
      assert.ok(lines.every(line=>typeof line==='string'&&line.length>10),`${field}:${stage} is complete`);
      assert.equal(new Set(lines).size,24,`${field}:${stage} must not share a script between characters`);
    }
  }
});

test('foods match each species, including all equipped animal appearances',()=>{
  const s=scene();
  const expected={chicken:'grain',turkey:'grain',duck:'greens',goose:'greens',rabbit:'rabbitFood',
    sheep:'hay',lamb:'hay',horse:'hay',donkey:'hay',goat:'leaves',cow:'grass',pig:'vegetables',dog:'dogFood',cat:'catFood',owl:'crickets'};
  const data=s.run('MenuCharacterData');
  for(const [species,food]of Object.entries(expected))assert.equal(data.diets[species],food);
  for(const [skin,appearance]of Object.entries(s.h.run('CharacterArt.appearances'))){
    s.context.state.entities.chicken.skin=skin;
    s.run("MenuScene.startShow(MenuScene.herd.find(a=>a.species==='chicken'),false,'snack');");
    const portions=s.run('[...MenuScene.meals()].map(([animal,meal])=>({who:MenuScene.identity(animal),food:meal.food}))');
    assert.equal(portions.length,6);
    const hero=portions.find(p=>p.who.voice==='skin-'+skin);
    assert.ok(hero,skin);
    const species=['hen-silkie','hen-blue'].includes(appearance.species)?'chicken':appearance.species;
    assert.equal(hero.food,expected[species],`${skin} eats as ${species}, not as the base hen`);
    for(const portion of portions)assert.equal(portion.food,expected[portion.who.species]);
  }
});

test('actual dialogue follows each named appearance, rotates food lines and replaces partner names',()=>{
  const s=scene(),seen=new Set();
  for(const skin of Object.keys(s.h.run('CharacterArt.appearances'))){
    s.context.state.entities.chicken.skin=skin;
    const lines=[];
    for(let i=0;i<3;i++){
      s.run("MenuScene.startShow(MenuScene.herd.find(a=>a.species==='chicken'),false,'snack');");
      lines.push(s.h.elements.get('menuBanter').textContent);
      assert.ok(s.run(`(() => {
        const bubble=document.getElementById('menuBanter'),line=bubble.textContent.split('\\n')[1];
        const names=MenuScene.herd.map(a=>MenuScene.identity(a).name);
        return MenuCharacterData.voices[bubble.dataset.voice].snack.some(raw=>names.some(name=>raw.replaceAll('{other}',name)===line));
      })()`),'the visible guest uses their own food dialogue, including after a crowded-bubble fallback');
    }
    assert.ok(new Set(lines).size>=2,`${skin} should not repeat the same food line on every click`);
    s.run("MenuScene.startShow(MenuScene.herd.find(a=>a.species==='chicken'),false,'gossip');");
    const line=s.h.elements.get('menuBanter').textContent.split('\n')[1];
    assert.ok(!seen.has(line),`${skin} has an individual voice`);seen.add(line);
    assert.doesNotMatch(s.h.elements.get('menuBanter').textContent,/\{other\}/);
  }
});

test('each food has a complete readable pixel drawing with its own silhouette and palette',()=>{
  const context=vm.createContext({});vm.runInContext(dataSource,context);
  const data=vm.runInContext('MenuCharacterData',context),hashes=new Set();
  for(const [kind,food]of Object.entries(data.foods)){
    const canvas=createCanvas(48,36),c=canvas.getContext('2d');let pixels=0;
    assert.equal(food.pixels.length,12);
    food.pixels.forEach((row,y)=>{
      assert.ok(row.length<=16,kind+' width');
      [...row].forEach((pixel,x)=>{
        if(pixel==='.')return;
        assert.ok(data.palette[pixel],kind+': '+pixel);pixels++;
        c.fillStyle=data.palette[pixel];c.fillRect(x*3,y*3,3,3);
      });
    });
    assert.ok(pixels>15,kind+' must not be an invisible placeholder');
    hashes.add(createHash('sha256').update(c.getImageData(0,0,48,36).data).digest('hex'));
  }
  assert.equal(hashes.size,10,'no food is just a renamed pile of corn');
});

test('portions remain untouched until their own guest arrives',()=>{
  const s=scene();
  s.run(`MenuScene.startShow(MenuScene.herd.find(a=>a.species==='chicken'),false,'snack');
    const speeds=MenuScene.herd.map(a=>a.pace);MenuScene.herd.forEach(a=>a.pace=0);
    for(let i=0;i<30;i++)MenuScene.frame(state,.05,false);`);
  assert.equal(s.run('[...MenuScene.meals().values()].every(meal=>meal.eaten===0)'),true,'elapsed time alone must not eat the food');
  s.run(`MenuScene.herd.forEach((a,i)=>a.pace=speeds[i]);
    for(let i=0;i<90;i++)MenuScene.frame(state,.05,false);`);
  assert.equal(s.run('[...MenuScene.meals().values()].every(meal=>meal.eaten===1)'),true,'guests eat their own portions after walking to them');
});
