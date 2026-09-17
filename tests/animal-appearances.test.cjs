const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

test('each unlocked appearance selects a complete animal in every direction and keeps its source animation', () => {
  const { run } = createGame(() => .5);
  for (const [id,species] of [['classic','chicken'],['punk','duck'],['astronaut','rabbit'],['robocop','cat'],['priest','dog'],['goose','goose']]) {
    for (const direction of ['down','left','up','right']) {
      const pose = JSON.parse(run(`JSON.stringify(CharacterArt.frameFor('chicken',{skin:'${id}',direction:'${direction}',moving:true,anim:1}))`));
      assert.equal(pose.spriteName, species);
      assert.equal(pose.direction, direction);
      assert.equal(pose.frame.src, run(`CharacterArt.frameFor('${species}',{direction:'${direction}',moving:true,anim:1}).frame.src`));
      if (id !== 'classic') {
        assert.ok(pose.pose.width * pose.scale <= 64.001);
        assert.ok((pose.pose.bottom-pose.pose.top) * pose.scale <= 58.001);
      }
    }
  }
});

test('previously earned outfits become animal appearances without losing unlocks or changing physics', () => {
  const storage = new Map([['galinha-guardia-wardrobe-v1',JSON.stringify({version:2,best:6,selected:'robocop',unlocked:['classic','punk','astronaut','robocop','priest']})]]);
  const { run, elements } = createGame(() => .5,{storage});
  run('const original=JSON.stringify(state.entities.chicken.hitbox),speed=state.entities.chicken.speed;GameUI.update(state);');
  assert.equal(run(`CharacterArt.frameFor('chicken',{skin:state.entities.chicken.skin}).spriteName`), 'cat');
  assert.match(elements.get('skin-robocop').textContent, /Gato/);
  for (const id of ['classic','punk','astronaut','robocop','priest']) {
    assert.equal(run(`SkinSystem.equip(state,'${id}')`), true);
    assert.equal(run('JSON.stringify(state.entities.chicken.hitbox)===original'), true);
    assert.equal(run('state.entities.chicken.speed===speed'), true);
  }
});
