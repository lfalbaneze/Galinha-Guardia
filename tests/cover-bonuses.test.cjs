const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

function enterBonus(game, index = 0) {
  game.run(`var chick=state.entities.chicks[${index}], chicken=state.entities.chicken;
    Object.assign(chicken,{x:chick.x,y:chick.y,hidden:false,hidingSpotId:null,sprinting:false});
    state.entities.wolf.huntUnlockTimer=100;
    HidingSpots.update(state,0); HidingSpots.toggle(state);`);
}

test('cover clues show their location before entry, carry through their own hay and stop at walls', () => {
  const h = createGame(() => .5);
  h.run(`var chick=state.entities.chicks[0], chicken=state.entities.chicken;
    var cover=HidingSpots.getSpots().find(s=>s.type==='hay');
    Object.assign(chick,{coverId:cover.id,x:cover.x+cover.w/2,y:cover.y+cover.h-18});
    Object.assign(chicken,{x:chick.x,y:cover.y-45,hidden:false,hidingSpotId:null});
    OBSTACLES=[{...cover.bale,type:'hay'}];
    var labels=[];ctx.fillText=text=>labels.push(text);
    HidingSpots.drawIndicators(state);`);
  assert.equal(h.run('DetectionSystem.hasLineOfSight(getHitbox(chicken),getHitbox(chick))'), false);
  assert.equal(h.run('RescueSystem.secretHint(state)===chick'), true);
  assert.equal(h.run('labels.includes("Piu-piu…")'), true);
  assert.equal(h.run('!!chick.discovered'), false);
  h.run(`OBSTACLES.push({x:chicken.x-150,y:chicken.y+20,w:300,h:8,type:'fence'});labels.length=0;
    HidingSpots.drawIndicators(state);`);
  assert.equal(h.run('HidingSpots.hasBonusClue(chicken,chick)'), false);
  assert.equal(h.run('labels.includes("Piu-piu…")'), false);
  h.run('OBSTACLES=[];chicken.x=chick.x+281;chicken.y=chick.y;');
  assert.equal(h.run('HidingSpots.hasBonusClue(chicken,chick)'), false);
  enterBonus(h, h.run('state.entities.chicks.indexOf(chick)'));
  h.run('input.add("c");for(let i=0;i<17;i++)RescueSystem.update(state,.05);');
  assert.equal(h.run('state.rescuedChicks'), 1);
  assert.equal(h.run('RescueSystem.secretHint(state)===chick'), false);
});

test('a walking approach encounters a clue on all six real bonus routes', () => {
  const h = createGame(() => .5);
  for (const seed of [1, 29, 814237]) {
    h.run(`resetGame(${seed});state.entities.wolf.huntUnlockTimer=100;`);
    for (let i=0;i<6;i++) {
      h.run(`var chick=state.entities.chicks[${i}],chicken=state.entities.chicken;
        Object.assign(chicken,{...WORLD.layout.start,hidden:false,hidingSpotId:null});
        var route=WolfAI.findPath(chicken,chick),sawClue=false;
        for(const point of route){
          while(distance(chicken,point)>2){
            var before={x:chicken.x,y:chicken.y};
            var dx=point.x-chicken.x,dy=point.y-chicken.y,len=Math.hypot(dx,dy);
            Player.move(chicken,dx/len*Math.min(12,len),dy/len*Math.min(12,len));
            if(distance(before,chicken)<.1)break;
            if(distance(chicken,chick)>80 && HidingSpots.hasBonusClue(chicken,chick))sawClue=true;
          }
        }`);
      assert.equal(h.run('sawClue'), true, `${seed}/${i}: must be noticeable before entering`);
    }
  }
});

test('six deterministic bonus homes occupy only a subset of usable cover across 60 farms', () => {
  const h = createGame(() => .5), signatures = new Set(), types = new Set();
  for (const version of [1, 2]) for (let seed = 0; seed < 30; seed++) {
    h.run(`resetGame(${seed},${version});`);
    const homes = JSON.parse(h.run('JSON.stringify(HidingSpots.bonusHomes())'));
    assert.equal(new Set(homes.map(p => p.coverId)).size, 6);
    assert.ok(h.run('HidingSpots.getSpots().length') > 6, 'some hiding spots must be empty');
    assert.deepEqual(JSON.parse(h.run('JSON.stringify(HidingSpots.bonusHomes())')), homes);
    signatures.add(JSON.stringify(homes));
    for (const [i, home] of homes.entries()) {
      enterBonus(h, i);
      assert.equal(h.run('chicken.hidingSpotId'), home.coverId, `seed ${seed}, version ${version}`);
      types.add(h.run('HidingSpots.candidate(chicken).type'));
      assert.equal(h.run('chicken.hidden'), true);
      assert.equal(h.run('RescueSystem.isSecret(chick)'), true);
      h.run(`var walker={...chicken,...WORLD.layout.start};var route=WolfAI.findPath(walker,chick);
        for(const point of route)Player.move(walker,point.x-walker.x,point.y-walker.y);`);
      assert.ok(h.run('distance(walker,chick)') < 3, `no walkable route: ${version}/${seed}/${home.coverId}`);
    }
  }
  assert.ok(signatures.size >= 55);
  assert.ok(types.has('hay') && types.has('bush') && types.has('tree'));
});

test('entering and investigating gives a visible, one-time bonus, never a roaming chick', () => {
  const h = createGame(() => .5);
  enterBonus(h);
  h.run('for(let i=0;i<25;i++)RescueSystem.update(state,.05);');
  assert.equal(h.run('state.rescuedChicks'), 0, 'entering alone is not a find');
  h.run('input.add("c");for(let i=0;i<16;i++)RescueSystem.update(state,.05);');
  assert.equal(h.run('state.rescuedChicks'), 0);
  h.run('RescueSystem.update(state,.05);');
  assert.equal(h.run('state.rescuedChicks'), 1);
  assert.equal(h.run('state.score'), 100);
  assert.equal(h.run('state.secretNotice.bonus'), true);
  assert.equal(h.run('state.entities.chicken.hidden'), true);
  assert.equal(h.run('chick.temper'), 'safe');
  assert.equal(h.elements.get('chickCounter').hidden, false);
  assert.match(h.elements.get('wardrobeNote').textContent, /opcionais/);
  h.run('for(let i=0;i<100;i++)RescueSystem.update(state,.05);HidingSpots.toggle(state);HidingSpots.toggle(state);input.add("c");RescueSystem.update(state,1);');
  assert.equal(h.run('state.score'), 100);
  const reload = createGame(() => .5, { storage: new Map(h.storage), fullStartup: true });
  assert.equal(reload.run('state.rescuedChicks'), 1);
  assert.equal(reload.run('state.score'), 100);
  assert.equal(reload.run('state.entities.chicks.filter(c=>!c.rescued).every(c=>!c.discovered && c.coverId)'), true);
});

test('outside cover, wrong cover, witnessed hiding, interrupted searches and pauses cannot grant bonuses', () => {
  const h = createGame(() => .5);
  enterBonus(h);
  h.run('HidingSpots.toggle(state);input.add("c");for(let i=0;i<30;i++)RescueSystem.update(state,.05);');
  assert.equal(h.run('state.rescuedChicks'), 0);
  enterBonus(h);
  h.run(`input.add('c');state.entities.wolf.exposedCover={spotId:chicken.hidingSpotId,remaining:5};
    for(let i=0;i<30;i++)RescueSystem.update(state,.05);`);
  assert.equal(h.run('state.rescuedChicks'), 0);
  h.run('state.entities.wolf.exposedCover=null;for(let i=0;i<10;i++)RescueSystem.update(state,.05);');
  assert.ok(h.run('chick.discoveryTime') > .4);
  h.run('input.clear();RescueSystem.update(state,.05);');
  assert.equal(h.run('chick.discoveryTime'), 0);
  h.run('input.add("c");for(let i=0;i<40;i++)RescueSystem.update(state,0);GameUI.showMenu(state);RescueSystem.update(state,2);');
  assert.equal(h.run('state.rescuedChicks'), 0);
  h.run(`GameUI.resume();var empty=HidingSpots.getSpots().find(s=>!state.entities.chicks.some(c=>c.coverId===s.id));
    Object.assign(chicken,{x:empty.x+empty.w/2,y:empty.y+empty.h-18,hidden:false});
    HidingSpots.toggle(state);input.add('c');for(let i=0;i<30;i++)RescueSystem.update(state,.05);`);
  assert.equal(h.run('state.rescuedChicks'), 0);
});

test('old saves retain found chicks and move only unopened secrets into real cover', () => {
  const first = createGame(() => .5);
  first.run(`var found=state.entities.chicks[0];found.discovered=true;
    GameManager.rescue(state,Object.assign(state.entities.chicks[1],{discovered:true}));GameManager.save(state);`);
  const saved = JSON.parse(first.storage.get('galinha-guardia-save-v1'));
  saved.version = 3;
  for (const chick of saved.chicks) delete chick.coverId;
  saved.chicks[0].x = 930; saved.chicks[0].y = 620;
  // The migration resolves environmental collision but must not move this chick to a new cover.
  first.storage.set('galinha-guardia-save-v1', JSON.stringify(saved));
  const reload = createGame(() => .5, { storage: new Map(first.storage), fullStartup: true });
  assert.equal(reload.run('state.entities.chicks[0].coverId'), null);
  assert.equal(reload.run('state.entities.chicks[0].discovered'), true);
  assert.equal(reload.run('state.rescuedChicks'), 1);
  assert.equal(reload.run('state.score'), saved.score);
  assert.equal(reload.run('state.entities.chicks.slice(2).every(c=>c.coverId && !c.discovered)'), true);
  reload.run('GameManager.save(state);');
  const second = createGame(() => .5, { storage: new Map(reload.storage), fullStartup: true });
  assert.equal(second.run('state.entities.chicks[0].coverId'), null);
  assert.equal(second.run('state.rescuedChicks'), 1);
});

test('the finale includes only earned bonus chicks and persists partial completion without extra points', () => {
  for (const count of [0, 2, 6]) {
    const h = createGame(() => .5);
    for (let i = 0; i < count; i++) {
      enterBonus(h, i);
      h.run('input.add("c");for(let step=0;step<17;step++)RescueSystem.update(state,.05);');
    }
    h.run('for(const friend of state.entities.animals)GameManager.rescue(state,friend);GameManager.win(state);');
    assert.equal(h.run('state.phase'), 'win_cutscene');
    assert.equal(h.run('state.cutscene.attackers.length'), 10 + count);
    assert.equal(h.run('state.score'), 1750 + count * 100);
    h.run(`var shown=[];var savedDraw=drawAnimal;drawAnimal=a=>shown.push(a.id);renderGame();drawAnimal=savedDraw;`);
    assert.equal(h.run('shown.length'), 10 + count);
    h.run('state.cutscene.time=19;updateGame(.05);');
    assert.equal(h.run('GameManager.read().phase'), 'won');
    const reload = createGame(() => .5, { storage: new Map(h.storage), fullStartup: true });
    assert.equal(reload.run('state.score'), 1750 + count * 100);
    assert.equal(reload.run('state.rescuedChicks'), count);
    assert.equal(reload.run('state.cutscene.attackers.length'), 10 + count);
  }
});
