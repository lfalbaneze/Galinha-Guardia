const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

function pressE(game, repeat = false) {
  game.events.window.keydown({ key: 'e', repeat, target: { tagName: 'CANVAS' }, preventDefault() {} });
  game.events.window.keyup({ key: 'e' });
}

function enterBonus(game, index = 0) {
  game.run(`var chick=state.entities.chicks[${index}], chicken=state.entities.chicken;
    Object.assign(chicken,{x:chick.x,y:chick.y,hidden:false,hidingSpotId:null,sprinting:false});
    state.entities.wolf.huntUnlockTimer=100;
    HidingSpots.update(state,0); HidingSpots.toggle(state);`);
}

test('cover clues show their location before entry, carry through their own hay and stop at walls', () => {
  const h = createGame(() => .5);
  h.run(`var cover=HidingSpots.getSpots().find(s=>s.type==='hay');
    var chick=state.entities.chicks.find(c=>c.coverId===cover.id)||state.entities.chicks[0], chicken=state.entities.chicken;
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
  pressE(h);
  assert.equal(h.run('state.rescuedChicks'), 1);
  assert.equal(h.run('RescueSystem.secretHint(state)===chick'), false);
});

test('a walking approach encounters a clue on all six real bonus routes', () => {
  const h = createGame(() => .5);
  for (const version of [1, 2, 3, 4]) for (const seed of [1, 29, 814237]) {
    h.run(`resetGame(${seed},${version});state.entities.wolf.huntUnlockTimer=100;`);
    for (let i=0;i<6;i++) {
      h.run(`var chick=state.entities.chicks[${i}],chicken=state.entities.chicken;
        Object.assign(chicken,{...WORLD.layout.start,hidden:false,hidingSpotId:null});
        var route=WolfAI.findPath(chicken,chick),sawClue=false,approachPoint=null;
        for(const point of route){
          while(distance(chicken,point)>2){
            var before={x:chicken.x,y:chicken.y};
            var dx=point.x-chicken.x,dy=point.y-chicken.y,len=Math.hypot(dx,dy);
            Player.move(chicken,dx/len*Math.min(12,len),dy/len*Math.min(12,len));
            if(distance(before,chicken)<.1)break;
            if(distance(chicken,chick)>80 && HidingSpots.hasBonusClue(chicken,chick))sawClue=true;
            if(!approachPoint && HidingSpots.candidate(chicken)?.id!==chick.coverId &&
              RescueSystem.callTarget(state)===chick)approachPoint={x:chicken.x,y:chicken.y};
          }
        }`);
      assert.equal(h.run('sawClue'), true, `${seed}/${i}: must be noticeable before entering`);
      assert.equal(h.run('!!approachPoint'), true, `${version}/${seed}/${i}: callable before entering cover`);
      h.run('Object.assign(chicken,approachPoint);');
      pressE(h);
      assert.equal(h.run('chick.rescued'), true);
      assert.equal(h.run('state.rescuedChicks'), i+1);
      assert.equal(h.run('chicken.hidden'), false);
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

test('a single E gives immediate feedback, keeps movement input and saves the bonus exactly once', () => {
  const h = createGame(() => .5);
  enterBonus(h);
  h.run('HidingSpots.toggle(state);input.add("d");input.add("c");');
  h.run('for(let i=0;i<25;i++)RescueSystem.update(state,.05);');
  assert.equal(h.run('state.rescuedChicks'), 0, 'walking and C do not collect automatically');
  pressE(h);
  assert.equal(h.run('state.rescuedChicks'), 1);
  assert.equal(h.run('state.score'), 100);
  assert.equal(h.run('state.secretNotice.bonus'), true);
  assert.equal(h.run('state.entities.chicken.hidden'), false);
  assert.equal(h.run('input.has("d") && input.has("c")'), true);
  assert.equal(h.run('chick.temper'), 'safe');
  assert.equal(h.elements.get('chickCounter').hidden, false);
  assert.match(h.elements.get('wardrobeNote').textContent, /opcionais/);
  pressE(h, true);
  assert.equal(h.run('chicken.hidden'), false, 'holding E never turns the call into an unwanted hide');
  pressE(h);
  assert.equal(h.run('chicken.hidden'), true, 'a fresh E can still hide after calling');
  pressE(h);
  assert.equal(h.run('chicken.hidden'), false);
  h.run('for(let i=0;i<100;i++)RescueSystem.update(state,.05);');
  assert.equal(h.run('state.score'), 100);
  const reload = createGame(() => .5, { storage: new Map(h.storage), fullStartup: true });
  assert.equal(reload.run('state.rescuedChicks'), 1);
  assert.equal(reload.run('state.score'), 100);
  assert.equal(reload.run('state.entities.chicks.filter(c=>!c.rescued).every(c=>!c.discovered && c.coverId)'), true);
});

test('calling inside safe cover works, while witnessed cover always gives E back to escape', () => {
  const h = createGame(() => .5);
  enterBonus(h);
  h.run('state.entities.wolf.exposedCover={spotId:chicken.hidingSpotId,remaining:5};');
  assert.equal(h.run('RescueSystem.callTarget(state)'), null);
  pressE(h);
  assert.equal(h.run('chicken.hidden'), false);
  assert.equal(h.run('state.rescuedChicks'), 0);
  h.run('state.entities.wolf.exposedCover=null;');
  enterBonus(h);
  pressE(h);
  assert.equal(h.run('chicken.hidden'), true);
  assert.equal(h.run('state.rescuedChicks'), 1);
});

test('pausing, lake challenges, far-away and unrelated hiding places cannot call a chick', () => {
  const h = createGame(() => .5);
  enterBonus(h);
  h.run('GameUI.showMenu(state);');
  pressE(h);
  assert.equal(h.run('RescueSystem.callChick(state)'), false);
  assert.equal(h.run('state.rescuedChicks'), 0);
  h.run('GameUI.resume();state.lake.active=true;');
  assert.equal(h.run('RescueSystem.callTarget(state)'), null);
  assert.equal(h.run('RescueSystem.secretHint(state)'), null);
  assert.equal(h.run('RescueSystem.callChick(state)'), false);
  h.run(`state.lake.active=false;var empty=HidingSpots.getSpots().find(s=>!state.entities.chicks.some(c=>c.coverId===s.id));
    Object.assign(chicken,{x:empty.x+empty.w/2,y:empty.y+empty.h-18,hidden:false});
    HidingSpots.toggle(state);`);
  assert.equal(h.run('RescueSystem.callChick(state)'), false);
  pressE(h);
  assert.equal(h.run('chicken.hidden'), false);
  h.run('Object.assign(chicken,WORLD.layout.start);');
  assert.equal(h.run('RescueSystem.callChick(state)'), false);
  assert.equal(h.run('state.rescuedChicks'), 0);
});

test('every edge of hay, trees and bushes accepts E, but dividers inside that range still block it', () => {
  const h = createGame(() => .5);
  for (const type of ['hay', 'tree', 'bush']) {
    h.run(`resetGame(814237);var chick=state.entities.chicks[0],chicken=state.entities.chicken;
      state.entities.chicks.slice(1).forEach(c=>c.rescued=true);
      var cover=HidingSpots.getSpots().find(s=>s.type==='${type}');
      Object.assign(chick,{coverId:cover.id,x:cover.x+cover.w/2,y:cover.y+cover.h-18});
      var ownWall=cover.bale||cover.blockingRect;
      var edges=[{x:cover.x-35,y:cover.y+cover.h/2},{x:cover.x+cover.w+35,y:cover.y+cover.h/2},
        {x:cover.x+cover.w/2,y:cover.y-35},{x:cover.x+cover.w/2,y:cover.y+cover.h+35}];`);
    for (let edge=0;edge<4;edge++) {
      h.run(`Object.assign(chicken,edges[${edge}]);OBSTACLES=ownWall?[{...ownWall}]:[];`);
      assert.equal(h.run('RescueSystem.callTarget(state)===chick'), true, `${type}/${edge}`);
      h.run(`var mid={x:(chicken.x+chick.x)/2,y:(chicken.y+chick.y)/2+6};
        OBSTACLES.push(${edge<2?'{x:mid.x-2,y:mid.y-150,w:4,h:300}':'{x:mid.x-150,y:mid.y-2,w:300,h:4}'});`);
      assert.equal(h.run('RescueSystem.callChick(state)'), false, `${type}/${edge}: wall`);
      assert.equal(h.run('!!chick.discovered'), false);
    }
    h.run('OBSTACLES=[];chicken.x=cover.x+cover.w/2;chicken.y=cover.y+cover.h+41;');
    assert.equal(h.run('RescueSystem.callTarget(state)'), null);
    h.run('chicken.y-=1;var labels=[];ctx.fillText=t=>labels.push(t);HidingSpots.drawIndicators(state);GameUI.update(state);');
    assert.equal(h.run('labels.includes("E · chamar pintinho")'), true);
    assert.match(h.elements.get('contextHint').textContent, /E uma vez/);
    pressE(h);
    assert.equal(h.run('state.rescuedChicks'), 1);
  }
});

test('one E selects only the nearest callable chick even when two clues overlap', () => {
  const h = createGame(() => .5);
  h.run(`OBSTACLES=[];var chicken=state.entities.chicken;
    Object.assign(chicken,{x:600,y:600});
    state.entities.chicks.forEach((c,i)=>Object.assign(c,{coverId:null,x:600+(i+1)*30,y:600}));`);
  pressE(h);
  assert.equal(h.run('state.entities.chicks[0].rescued'), true);
  assert.equal(h.run('state.entities.chicks[1].rescued'), false);
  pressE(h, true);
  assert.equal(h.run('state.rescuedChicks'), 1);
  pressE(h);
  assert.equal(h.run('state.rescuedChicks'), 2);
  assert.equal(h.run('state.score'), 200);
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
      pressE(h);
    }
    h.run('for(const friend of state.entities.animals)GameManager.rescue(state,friend);GameManager.win(state);');
    assert.equal(h.run('state.phase'), 'win_cutscene');
    assert.equal(h.run('state.cutscene.attackers.length'), 12 + count);
    assert.equal(h.run('state.score'), 1950 + count * 100);
    h.run(`var shown=[];var savedDraw=drawAnimal;drawAnimal=a=>shown.push(a.id);renderGame();drawAnimal=savedDraw;`);
    assert.equal(h.run('shown.length'), 12 + count);
    h.run('state.cutscene.time=19;updateGame(.05);');
    assert.equal(h.run('GameManager.read().phase'), 'won');
    const reload = createGame(() => .5, { storage: new Map(h.storage), fullStartup: true });
    assert.equal(reload.run('state.score'), 1950 + count * 100);
    assert.equal(reload.run('state.rescuedChicks'), count);
    assert.equal(reload.run('state.cutscene.attackers.length'), 12 + count);
  }
});
