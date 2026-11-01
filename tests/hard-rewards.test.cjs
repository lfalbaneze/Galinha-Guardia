const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
const key='galinha-guardia-wardrobe-v1',rewards=['goat','turkey','owl','pony'];
function attempt(difficulty,chicks=0){
  const h=createGame(()=>.5);
  h.run(`difficultySelect.value='${difficulty}';resetGame();state.phase='playing';
    for(const chick of state.entities.chicks.slice(0,${chicks})){
      chick.discovered=true;Object.assign(state.entities.chicken,{x:chick.x,y:chick.y});RescueSystem.update(state,0);
    }
    for(const friend of state.entities.animals)GameManager.rescue(state,friend);`);
  return h;
}
const unlocked=h=>rewards.filter(id=>h.run(`SkinSystem.unlocked('${id}')`));

test('difficulty rewards require a completed victory, with six chicks for the bonus animals',()=>{
  for(const [difficulty,chicks,expected]of [
    ['easy',6,[]],['normal',6,[]],['hard',0,['goat']],['hard',5,['goat']],
    ['hard',6,['goat','turkey']],['hardcore',0,['goat','owl']],['hardcore',6,rewards]
  ]){
    const h=attempt(difficulty,chicks);
    assert.deepEqual(unlocked(h),[],'ordinary rescues do not unlock victory rewards');
    assert.equal(h.run('GameManager.win(state)'),true);
    assert.deepEqual(unlocked(h),expected,`${difficulty}/${chicks}`);
    assert.equal(h.run('state.entities.chicken.skin'),'classic','winning never changes the equipped animal');
    const saved=h.storage.get(key);
    assert.deepEqual(Array.from(h.run('SkinSystem.recordVictory(state)')),[],'repeated victory is idempotent');
    assert.equal(h.storage.get(key),saved);
  }
});

test('loss, timeout and unfinished runs cannot award animals, even with all chicks',()=>{
  for(const phase of ['playing','lose','menu']){
    const h=attempt('hardcore',6);
    h.run(`state.phase='${phase}';state.winBonusApplied=true;SkinSystem.recordVictory(state);`);
    assert.deepEqual(unlocked(h),[]);
  }
  const h=attempt('hardcore',6);
  h.run('state.timeRemaining=0;');
  assert.equal(h.run('GameManager.win(state)'),false);
  assert.deepEqual(unlocked(h),[]);
});

test('unlocked animals persist, equip through the real menu, and work in lower difficulties',()=>{
  const h=attempt('hardcore',6);h.run('GameManager.win(state);GameUI.update(state);GameUI.showMenu(state);');
  assert.deepEqual(unlocked(h),rewards);
  for(const id of rewards){
    assert.equal(h.elements.get(`skin-${id}`).disabled,false);
    h.elements.get('menuSkinSelect').value=id;h.events.elements.menuSkinSelect.change();
    assert.equal(h.run('state.entities.chicken.skin'),id);
  }
  const reloaded=createGame(()=>.5,{storage:new Map(h.storage)});
  assert.deepEqual(unlocked(reloaded),rewards);
  assert.equal(reloaded.run('state.entities.chicken.skin'),'pony');
  reloaded.run("difficultySelect.value='easy';resetGame();");
  assert.equal(reloaded.run('state.entities.chicken.skin'),'pony');
  assert.equal(reloaded.run('SkinSystem.power(state.entities.chicken).landSpeed'),1.12);
});

test('an existing completed Hardcore save grants rewards without resetting the old collection',()=>{
  const h=attempt('hardcore',6);h.run('GameManager.win(state);');
  const storage=new Map(h.storage),profile=JSON.parse(storage.get(key));
  profile.unlocked=profile.unlocked.filter(id=>!rewards.includes(id));profile.selected='robocop';
  storage.set(key,JSON.stringify(profile));
  const reloaded=createGame(()=>.5,{storage,fullStartup:true});
  assert.deepEqual(unlocked(reloaded),rewards);
  assert.equal(reloaded.run('state.entities.chicken.skin'),'robocop');
  assert.equal(reloaded.run('SkinSystem.unlocked("priest")'),true);
});

test('new animals have authored poses in eight directions, and pony gait matches its player size',()=>{
  const h=createGame(()=>.5);
  for(const id of rewards){
    for(const direction of ['up','down','left','right','upleft','upright','downleft','downright']){
      const frame=h.run(`CharacterArt.frameFor('chicken',{skin:'${id}',direction:'${direction}',moving:true})`);
      assert.equal(frame.direction,direction);
      assert.equal(frame.definition.provider,'comfyui');assert.equal(frame.definition.edition,117,'real costumed art is installed');
      assert.match(frame.definition.source,/wardrobe-117\/runtime\//);
      assert.ok(frame.pose.frames.length>=4);
      assert.ok((frame.pose.bottom-frame.pose.top)*frame.scale<=58.01);
    }
  }
  const player=h.run("CharacterArt.frameFor('chicken',{skin:'pony'})");
  const scale=player.scale/player.definition.scale;
  assert.ok(scale<.8,'pony fits the player camera');
  assert.ok(Math.abs(h.run("CharacterArt.advance(0,'chicken',76,{skin:'pony'})")*scale-4)<1e-9);
});

test('costumed sprites are real separate atlases with clear gutters, foot supports and distinct gait frames',async()=>{
  const {createCanvas,loadImage}=require('@napi-rs/canvas'),path=require('node:path'),{createHash}=require('node:crypto');
  const art=await require('../scripts/sprite-loader.cjs').loadArt(),images=new Map();
  for(const id of rewards){
    const appearance=art.appearances[id],d=art.frameFor('chicken',{skin:id}).definition;
    assert.equal(d.edition,117);assert.equal(art.frameFor(appearance.species).definition.edition,108,'NPC keeps its own body');
    if(!images.has(d.source))images.set(d.source,await loadImage(path.join(__dirname,'..',d.source)));
    const image=images.get(d.source);assert.equal(image.width,d.width);assert.equal(image.height,d.height);
    for(const direction of art.directions){
      const hashes=new Set();
      for(let phase=0;phase<8;phase++){
        const {frame:f}=art.frameFor('chicken',{skin:id,direction,moving:true,anim:phase/2+.01});
        assert.ok(f.grounding.bottom>.6&&f.grounding.bottom<1);
        const canvas=createCanvas(f.w,f.h),c=canvas.getContext('2d');c.drawImage(image,f.x,f.y,f.w,f.h,0,0,f.w,f.h);
        const rgba=c.getImageData(0,0,f.w,f.h).data;
        for(let x=0;x<f.w;x++){assert.equal(rgba[x*4+3],0);assert.equal(rgba[((f.h-1)*f.w+x)*4+3],0);}
        for(let y=0;y<f.h;y++){assert.equal(rgba[(y*f.w)*4+3],0);assert.equal(rgba[(y*f.w+f.w-1)*4+3],0);}
        hashes.add(createHash('sha256').update(rgba).digest('hex'));
      }
      assert.equal(hashes.size,8,id+'/'+direction+' has eight actual frames');
    }
  }
});
