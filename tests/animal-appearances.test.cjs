const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

test('each appearance has complete directional art while preserving its animal identity', () => {
  const { run } = createGame(() => .5);
  for (const [id,species] of [['classic','chicken'],['silkie','hen-silkie'],['blue','hen-blue'],['punk','duck'],['astronaut','rabbit'],['robocop','cat'],['priest','dog'],['goose','goose']]) {
    for (const direction of ['down','left','up','right']) {
      const pose = JSON.parse(run(`JSON.stringify(CharacterArt.frameFor('chicken',{skin:'${id}',direction:'${direction}',moving:true,anim:1}))`));
      const sprite = run(`CharacterArt.appearances['${id}'].sprite`) || species;
      assert.equal(run(`CharacterArt.appearances['${id}'].species`), species);
      assert.equal(pose.spriteName, sprite);
      assert.equal(pose.direction, direction);
      assert.equal(pose.frame.src, run(`CharacterArt.frameFor('${sprite}',{direction:'${direction}',moving:true,anim:1}).frame.src`));
      if (sprite !== species) assert.notEqual(pose.frame.src, run(`CharacterArt.frameFor('${species}').frame.src`), 'playable friends have their own art');
      if (id !== 'classic') {
        assert.ok(pose.pose.width * pose.scale <= 64.001);
        assert.ok((pose.pose.bottom-pose.pose.top) * pose.scale <= 58.001);
      }
    }
  }
});

test('previously earned outfits keep unlocks, base speed and collision geometry', () => {
  const storage = new Map([['galinha-guardia-wardrobe-v1',JSON.stringify({version:2,best:6,selected:'robocop',unlocked:['classic','punk','astronaut','robocop','priest']})]]);
  const { run, elements } = createGame(() => .5,{storage});
  run('const original=JSON.stringify(state.entities.chicken.hitbox),speed=state.entities.chicken.speed;GameUI.update(state);');
  assert.equal(run(`CharacterArt.frameFor('chicken',{skin:state.entities.chicken.skin}).spriteName`), 'skin-amora');
  assert.match(elements.get('skin-robocop').textContent, /Stella/);
  for (const id of ['classic','silkie','blue','punk','astronaut','robocop','priest']) {
    assert.equal(run(`SkinSystem.equip(state,'${id}')`), true);
    assert.equal(run('JSON.stringify(state.entities.chicken.hitbox)===original'), true);
    assert.equal(run('state.entities.chicken.speed===speed'), true);
  }
});

test('the three hens are available immediately, persist selection and keep earned challenge skins',()=>{
  const storage=new Map([['galinha-guardia-wardrobe-v1',JSON.stringify({version:2,best:4,selected:'classic',unlocked:['classic','punk','goose']})]]);
  const h=createGame(()=>.5,{storage});
  h.run('GameUI.update(state)');
  for(const id of ['classic','silkie','blue']) {
    assert.equal(h.run(`SkinSystem.unlocked('${id}')`),true);
    assert.equal(h.elements.get(`menu-skin-${id}`).disabled,false);
    assert.equal(h.elements.get(`skin-${id}`).disabled,false);
  }
  assert.equal(h.run('SkinSystem.unlocked("goose")'),true);
  assert.equal(h.run('SkinSystem.unlocked("astronaut")'),false);
  assert.equal(h.run('SkinSystem.equip(state,"blue")'),true);
  const reloaded=createGame(()=>.5,{storage});
  assert.equal(reloaded.run('state.entities.chicken.skin'),'blue');
  assert.equal(reloaded.run('SkinSystem.unlocked("goose")'),true);
  assert.equal(reloaded.run('state.rescuedCount'),0);
});

test('fresh and legacy wardrobes start with all three hens without unlocking rescue rewards',()=>{
  for(const saved of [null,{best:0,selected:'classic'}]) {
    const storage=new Map(saved?[['galinha-guardia-wardrobe-v1',JSON.stringify(saved)]]:[]);
    const h=createGame(()=>.5,{storage});
    for(const id of ['classic','silkie','blue'])assert.equal(h.run(`SkinSystem.equip(state,'${id}')`),true);
    for(const id of ['punk','goose'])assert.equal(h.run(`SkinSystem.equip(state,'${id}')`),false);
  }
});
