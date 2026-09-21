const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

test('home opens adventure setup without replacing the saved run; Continue keeps its difficulty', () => {
  const { run, elements, events } = createGame();
  run('GameManager.rescue(state,state.entities.animals[0]);GameUI.showMenu(state);var saved=JSON.stringify([state.worldSeed,state.rescuedCount,state.difficultyKey]);');
  assert.equal(elements.get('menuSettings').hidden, true);
  events.elements.newAdventureBtn.click();
  assert.equal(elements.get('menuSettings').hidden, false);
  assert.equal(elements.get('menuHome').hidden, true);
  events.elements['difficulty-hardcore'].click();
  events.elements.menuBackBtn.click();
  events.elements.continueBtn.click();
  assert.equal(run('state.phase'), 'playing');
  assert.equal(run('JSON.stringify([state.worldSeed,state.rescuedCount,state.difficultyKey])===saved'), true);
});

test('character and sound shortcuts open their sheet; Escape restores focus to the opening action', () => {
  const { run, elements, events, context } = createGame();
  run('GameUI.showMenu(state);');
  for (const [opener, panel] of [['menuCharacterBtn','outfit'],['menuOptionsBtn','audio']]) {
    events.elements[opener].click();
    assert.equal(elements.get(`panel-${panel}`).hidden, false);
    assert.equal(elements.get('menuStartFooter').hidden, true);
    let prevented = false;
    events.document.keydown({ key: 'Escape', preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(elements.get('menuSettings').hidden, true);
    assert.equal(context.document.activeElement.id, opener);
  }
});

test('starting from the adventure sheet applies its difficulty and pausing returns to home', () => {
  const { run, elements, events, context } = createGame();
  run('GameUI.showMenu(state);');
  events.elements.newAdventureBtn.click();
  events.elements['difficulty-hardcore'].click();
  events.elements.startBtn.click();
  assert.equal(run('state.phase'), 'playing');
  assert.equal(run('state.difficultyKey'), 'hardcore');
  assert.equal(run('state.timeRemaining'), 45);
  events.elements.pauseBtn.click();
  assert.equal(elements.get('menuSettings').hidden, true);
  assert.equal(elements.get('menuHome').hidden, false);
  assert.equal(context.document.activeElement.id, 'continueBtn');
});

test('mode briefing follows the next run and reads its clock and reward from the game rules', () => {
  const { run, elements, events } = createGame();
  run('GameUI.showMenu(state);');
  events.elements.newAdventureBtn.click();
  for (const [mode, clock, reward, thor] of [
    ['easy', 'Sem limite', '100 pontos', '1 automática'],
    ['normal', 'Sem limite', '100 pontos', '2 ossos'],
    ['hard', '60s iniciais', '150 pontos', '4 ossos'],
    ['hardcore', '45s iniciais', '200 pontos', '5, 6, 7… ossos'],
  ]) {
    events.elements[`difficulty-${mode}`].click();
    run('GameUI.update(state);');
    assert.equal(elements.get('panel-adventure').dataset.difficulty, mode);
    assert.equal(elements.get('difficultyClock').textContent, clock);
    assert.equal(elements.get('difficultyReward').textContent, reward);
    assert.equal(elements.get('difficultyThor').textContent, thor);
    assert.equal(run('state.difficultyKey'), 'normal', 'briefing must not change the current run');
  }
  run('DIFFICULTIES.hard.timeLimit=75;DIFFICULTIES.hard.rescueScore=175;');
  events.elements['difficulty-hard'].click();
  assert.equal(elements.get('difficultyClock').textContent, '75s iniciais');
  assert.equal(elements.get('difficultyReward').textContent, '175 pontos');
});
