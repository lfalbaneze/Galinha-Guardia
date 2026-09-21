const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

test('menu tabs work with clicks and arrows and retain only the active tab in keyboard order', () => {
  const { run, elements, events, context } = createGame(() => .5);
  run('GameUI.showMenu(state);');
  events.elements['tab-outfit'].click();
  assert.equal(elements.get('panel-outfit').hidden, false);
  assert.equal(elements.get('panel-adventure').hidden, true);
  assert.equal(elements.get('tab-outfit').getAttribute('aria-selected'), 'true');
  let prevented = false;
  events.elements['tab-outfit'].keydown({ key: 'ArrowRight', preventDefault() { prevented = true; } });
  assert.ok(prevented);
  assert.equal(elements.get('panel-audio').hidden, false);
  assert.equal(context.document.activeElement.id, 'tab-audio');
  assert.equal(elements.get('tab-outfit').tabIndex, -1);
  events.elements['tab-audio'].keydown({ key: 'Home', preventDefault() {} });
  assert.equal(elements.get('panel-adventure').hidden, false);
  assert.equal(context.document.activeElement.id, 'tab-adventure');
});

test('dialog focus skips controls in inactive panels', () => {
  const { run, elements, events, context } = createGame(() => .5);
  run('GameUI.showMenu(state);');
  const tab = elements.get('tab-adventure'), start = elements.get('startBtn'), hidden = elements.get('menuMusicTrack');
  hidden.closest = selector => selector === '[hidden]' ? elements.get('panel-audio') : null;
  const menu = elements.get('menuScreen');
  menu.querySelectorAll = () => [tab, start, hidden];
  menu.contains = node => [tab, start, hidden].includes(node);
  start.focus();
  let prevented = false;
  events.document.keydown({ key: 'Tab', shiftKey: false, preventDefault() { prevented = true; } });
  assert.ok(prevented);
  assert.equal(context.document.activeElement, tab);
});

test('menu difficulty is a preview for the next adventure and does not change the current game', () => {
  const { run, elements, events } = createGame(() => .5);
  run('GameUI.showMenu(state); const before=JSON.stringify(state.settings);');
  events.elements['difficulty-hard'].click();
  assert.equal(elements.get('difficultySelect').value, 'hard');
  assert.equal(elements.get('difficulty-hard').getAttribute('aria-checked'), 'true');
  assert.equal(run('JSON.stringify(state.settings)===before'), true);
  events.elements.startBtn.click();
  assert.equal(run('state.difficultyKey'), 'hard');
});

test('difficulty choices support arrow keys, a single tab stop, and preserve the resumed game', () => {
  const { run, elements, events, context } = createGame(() => .5);
  run('GameManager.save(state); GameUI.showMenu(state); const savedSettings=JSON.stringify(state.settings);');
  events.elements['difficulty-normal'].keydown({ key: 'ArrowDown', preventDefault() {} });
  assert.equal(context.document.activeElement.id, 'difficulty-hard');
  assert.equal(elements.get('difficulty-hard').tabIndex, 0);
  assert.equal(elements.get('difficulty-normal').tabIndex, -1);
  assert.match(elements.get('difficultySummary').textContent, /60s iniciais/);
  assert.match(elements.get('difficultyPreview').textContent, /salvo continua no Médio/);
  events.elements.continueBtn.click();
  assert.equal(run('state.difficultyKey'), 'normal');
  assert.equal(run('JSON.stringify(state.settings)===savedSettings'), true);
  run('GameUI.showMenu(state);');
  events.elements['difficulty-hard'].keydown({ key: 'Home', preventDefault() {} });
  assert.equal(context.document.activeElement.id, 'difficulty-easy');
  assert.equal(elements.get('difficultySelect').value, 'easy');
  assert.deepEqual(['easy','normal','hard'].map(mode => elements.get(`difficulty-${mode}`).getAttribute('aria-checked')), ['true','false','false']);
});

test('score counts toward the earned total without changing gameplay or saved points', () => {
  const { run, elements, storage } = createGame(() => .5);
  run('GameUI.update(state); GameManager.rescue(state,state.entities.animals[0]); GameManager.save(state); GameUI.update(state); InterfaceMotion.frame(state,.05);');
  assert.ok(Number(elements.get('scoreCount').textContent) > 0);
  assert.ok(Number(elements.get('scoreCount').textContent) < 100);
  assert.equal(run('state.score'), 100);
  assert.equal(JSON.parse(storage.get('galinha-guardia-save-v1')).score, 100);
  run('for(let i=0;i<12;i++)InterfaceMotion.frame(state,.05);');
  assert.equal(elements.get('scoreCount').textContent, '100');
  run('GameManager.rescue(state,state.entities.animals[1]); GameUI.update(state); GameUI.showMenu(state);');
  assert.equal(elements.get('scoreCount').textContent, '200');
  run('resetGame(25); InterfaceMotion.frame(state,.05);');
  assert.equal(elements.get('scoreCount').textContent, '0');
});

test('live hints reflect danger and held keys without spoiling undiscovered chicks', () => {
  const { run, elements } = createGame(() => .5);
  run(`input.add('c');input.add('d');state.entities.wolf.mode='chase';GameUI.update(state);`);
  assert.equal(elements.get('keySneak').dataset.pressed, 'true');
  assert.equal(elements.get('keyMove').dataset.pressed, 'true');
  assert.equal(elements.get('gameStage').dataset.threat, 'danger');
  assert.equal(elements.get('threatProgress').value, 1);
  assert.doesNotMatch(elements.get('missionText').textContent, /pintinho/);
  assert.equal(elements.get('chickCounter').hidden, false);
  run(`state.entities.chicken.hidden=true;GameUI.update(state);`);
  assert.equal(elements.get('gameStage').dataset.threat, 'safe');
  run('GameUI.showMenu(state);');
  assert.equal(elements.get('liveControls').hidden, true);
  assert.equal(elements.get('keyMove').dataset.pressed, 'false');
});

test('HUD and region transitions run once per event and stay still across unchanged frames', () => {
  const { run, elements, animations } = createGame(() => .5, { recordAnimations: true });
  run(`GameUI.update(state);GameManager.rescue(state,state.entities.animals[0]);
    state.currentMap='horta';state.mapTransition={name:'Horta',time:2.5};GameUI.update(state);`);
  assert.equal(elements.get('regionNotice').hidden, false);
  assert.equal(elements.get('regionNoticeName').textContent, 'Horta');
  assert.equal(animations.filter(a => a.id === 'rescuedCount').length, 1);
  const count = animations.length;
  run('for(let i=0;i<60;i++){GameUI.update(state);InterfaceMotion.frame(state,.016);}');
  assert.equal(animations.length, count);
  run('state.mapTransition.time=0;GameUI.update(state);');
  assert.equal(elements.get('regionNotice').hidden, true);
});

test('the location label stays stable between region changes, including while its pulse plays', () => {
  const { run, elements, animations } = createGame(() => .5, { recordAnimations: true });
  const label = elements.get('areaText');
  let text = label.textContent, writes = 0;
  Object.defineProperty(label, 'textContent', {
    get: () => text,
    set: value => { text = value; writes += 1; },
  });
  run('GameUI.update(state); for(let i=0;i<120;i++)MapManager.update(state,1/60);');
  assert.ok(text.length > 0);
  assert.equal(writes, 0, 'unchanged frames must preserve the existing text node');

  run(`const nextRegion=WORLD.areas.find(area=>area.id!==state.currentMap);
    Object.assign(state.entities.chicken,{x:nextRegion.x+nextRegion.w/2,y:nextRegion.y+nextRegion.h/2});
    MapManager.update(state,1/60);GameUI.update(state);`);
  assert.equal(text, run('nextRegion.name'));
  assert.equal(writes, 1, 'crossing a region boundary updates the label once');
  assert.equal(animations.filter(animation => animation.id === 'areaText').length, 1);
  run('for(let i=0;i<120;i++){MapManager.update(state,1/60);GameUI.update(state);}');
  assert.equal(writes, 1, 'the region pulse must not recreate its text');

  run('GameUI.showMenu(state);');
  assert.equal(writes, 1);
  run('resetGame();');
  assert.equal(text, run('MapManager.getRegion(state.entities.chicken.x,state.entities.chicken.y).name'));
});

test('outfit preview animates the equipped sprite and supports rotation without advancing the game', () => {
  const { run, events } = createGame(() => .5);
  run(`GameUI.showMenu(state); const original=JSON.stringify(state);const poses=[];
    const portraitContext=document.getElementById('menuPortrait').getContext('2d');
    portraitContext.drawImage=(...args)=>poses.push(args); InterfaceMotion.frame(state,.1);`);
  assert.equal(run('poses.length'), 0, 'hidden outfit preview does not draw over the menu illustration');
  events.elements['tab-outfit'].click();
  run('InterfaceMotion.frame(state,.1);');
  assert.equal(run('poses.length'), 1);
  assert.equal(run('JSON.stringify(state)===original'), true);
  const front = run('poses[0][2]');
  events.elements.portraitTurn.click();
  run('InterfaceMotion.frame(state,.1);');
  assert.notEqual(run('poses[1][2]'), front, 'rotation changes the sprite row');
  events.elements.portraitWalk.click();
  run('InterfaceMotion.frame(state,.1);const stopped=poses.length;for(let i=0;i<60;i++)InterfaceMotion.frame(state,.02);');
  assert.equal(run('poses.length===stopped'), true);
  events.elements['tab-adventure'].click();
  run('InterfaceMotion.frame(state,.1);');
  assert.equal(run('poses.length===stopped'), true);
  events.elements['tab-outfit'].click();
  run('InterfaceMotion.frame(state,.1);');
  assert.equal(run('poses.length'), run('stopped+1'), 'returning to a still preview redraws it');
});

test('reduced motion removes tweens and stops the preview, including changes during a session', () => {
  const { run, elements, events, animations } = createGame(() => .5, { recordAnimations: true });
  run('GameUI.update(state);GameManager.rescue(state,state.entities.animals[0]);GameUI.update(state);');
  assert.ok(animations.length > 0);
  events.media.change({ matches: true });
  assert.ok(animations.every(a => a.cancelled));
  assert.equal(elements.get('scoreCount').textContent, '100');
  const count = animations.length;
  run(`GameManager.rescue(state,state.entities.animals[1]);GameUI.update(state);
    GameUI.showMenu(state);const draws=[];
    document.getElementById('menuPortrait').getContext('2d').drawImage=(...args)=>draws.push(args);`);
  events.elements['tab-outfit'].click();
  run('for(let i=0;i<60;i++)InterfaceMotion.frame(state,.02);');
  assert.equal(animations.length, count);
  assert.equal(elements.get('scoreCount').textContent, '200');
  assert.equal(run('draws.length'), 1);
  assert.equal(createGame(() => .5, { reducedMotion: true }).run('InterfaceMotion.reduced'), true);
});
