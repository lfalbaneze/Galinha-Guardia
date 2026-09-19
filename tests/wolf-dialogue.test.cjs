const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
const skins=[['classic','Erina',/galinha|frango/i],['silkie','Midori',/galinha|frango/i],
  ['blue','Alzira',/galinha|frango/i],['punk','Zeca',/pato/i],['astronaut','Pipoca',/coelho/i],
  ['robocop','Stella',/gata/i],['priest','Paçoca',/cachorro/i],['goose','Gumercindo',/ganso/i]];

test('all eight skins get their own name and species in chase, investigation and hiding dialogue',()=>{
  const h=createGame();h.run('var c=state.entities.chicken,w=state.entities.wolf;w.huntUnlockTimer=0;');
  for(const [skin,name,species]of skins){
    h.context.skin=skin;h.run(`c.skin=skin;w.speechIndex=0;w.speechSkin=skin;w.speechPriority=0;`);
    const spoken=[];
    for(const mode of ['chase','alert','investigate','search','inspect']){
      h.context.mode=mode;h.run('w.mode=mode;w.speechIndex=0;');
      for(let i=0;i<4;i++){
        h.run('w.speechCooldown=0;WolfDialogue.update(state,.01)');
        const line=h.run('w.speech');assert.ok(line&&!line.includes('undefined'),skin+'/'+mode);spoken.push(line);
      }
    }
    assert.ok(spoken.some(line=>line.includes(name)),name);
    assert.ok(spoken.some(line=>species.test(line)),skin);
    if(!['classic','silkie','blue'].includes(skin))
      assert.ok(spoken.every(line=>!/frango|galinha|cacarej|có-có|penas?/i.test(line)),skin+' never gets hen dialogue');
  }
});

test('changing the equipped skin replaces stale speech without altering pursuit or priority events',()=>{
  const h=createGame();h.run(`var c=state.entities.chicken,w=state.entities.wolf;
    c.skin='classic';Object.assign(w,{mode:'chase',huntUnlockTimer:0,speechCooldown:0,lastKnown:{x:400,y:500}});
    WolfDialogue.update(state,.01);var pursuit=JSON.stringify([w.x,w.y,w.mode,w.lastKnown,w.route]);
    c.skin='robocop';WolfDialogue.update(state,.01);`);
  assert.match(h.run('w.speech'),/Stella/);
  assert.equal(h.run('JSON.stringify([w.x,w.y,w.mode,w.lastKnown,w.route])'),h.run('pursuit'));
  h.run(`w.speech='Quem manda nesta fazenda sou eu!';w.speechPriority=3;c.skin='priest';WolfDialogue.update(state,.01);`);
  assert.equal(h.run('w.speech'),'Quem manda nesta fazenda sou eu!');
  h.run(`w.speechPriority=0;w.speechCooldown=0;WolfDialogue.update(state,.01);`);
  assert.match(h.run('w.speech'),/cachorro|Paçoca/);
  h.run(`c.skin='missing-legacy-skin';WolfDialogue.update(state,.01);`);
  assert.match(h.run('w.speech'),/Erina/);
});

test('actually witnessing entry into hay uses the equipped animal, including after a later dialogue tick',()=>{
  const h=createGame();h.run(`var c=state.entities.chicken,w=state.entities.wolf,cover=HidingSpots.getSpots().find(s=>s.type==='hay');
    OBSTACLES=[];Object.assign(c,{x:cover.x+cover.w/2,y:cover.y+cover.h-18});
    Object.assign(w,{x:c.x-80,y:c.y,heading:0,huntUnlockTimer:0,pauseTimer:0});`);
  for(const [skin]of skins){
    h.context.skin=skin;
    h.run(`c.skin=skin;c.hidden=false;w.mode='patrol';w.speechPriority=0;`);
    assert.equal(h.run('WolfAI.witnessHide(state,cover)'),true,skin);
    const immediate=h.run('w.speech');
    if(['robocop','priest','astronaut'].includes(skin))assert.doesNotMatch(immediate,/BICO/);
    h.run('WolfDialogue.update(state,.01)');assert.equal(h.run('w.speech'),immediate);
    assert.equal(h.run('w.exposedCover.spotId'),h.run('cover.id'));
  }
});
