const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

function harness(storage, fullStartup = false) {
  const players = [], plays = [];
  class MockAudio {
    constructor(src) { this.src = src; this.paused = true; this.currentTime = 0; this.volume = 1; this.loop = false; players.push(this); }
    play() { this.paused = false; plays.push({ src: this.src, loop: this.loop, volume: this.volume }); return Promise.resolve(); }
    pause() { this.paused = true; }
  }
  return { ...createGame(() => 0.5, { Audio: MockAudio, storage, fullStartup }), players, plays };
}
function start(h) { h.events.elements.startBtn.click(); }
function finale(h, time) {
  h.run(`for(const friend of RescueSystem.all(state))GameManager.rescue(state,Object.assign(friend,{discovered:true}));GameManager.win(state);
    while(state.phase==='win_cutscene' && state.cutscene.time<${time}-0.00001)updateGame(Math.min(.05,${time}-state.cutscene.time));`);
}

test('real startup stays silent; Start, Restart and Continue reuse one looping music player', () => {
  const h = harness(undefined, true);
  h.run('renderGame();updateGame(0.05);');
  assert.equal(h.plays.length, 0);
  assert.equal(h.players.length, 0);
  start(h);
  assert.equal(h.players.filter(a => a.loop).length, 1);
  assert.match(h.plays[0].src, /forest\.wav$/);
  h.run('AudioSystem.play("bonk");');
  h.events.elements.restartBtn.click();
  assert.equal(h.players.filter(a => a.loop).length, 1);
  assert.equal(h.players.filter(a => !a.loop && !a.paused).length, 0);
  h.events.elements.pauseBtn.click();
  assert.ok(h.players.every(a => a.paused));
  h.events.elements.continueBtn.click();
  assert.equal(h.players.filter(a => a.loop && !a.paused).length, 1);
});

test('Esc, blur, hidden page and pagehide pause the finale and stop every sound', () => {
  for (const reason of ['escape','blur','hidden','pagehide']) {
    const h = harness(); start(h); finale(h, 8.35);
    const before = h.run('state.cutscene.time');
    if (reason === 'escape') h.events.window.keydown({ key: 'Escape', repeat: false, target: { tagName: 'CANVAS' }, preventDefault() {} });
    else if (reason === 'hidden') { h.run('document.hidden=true;'); h.events.document.visibilitychange(); }
    else h.events.window[reason]();
    assert.equal(h.run('state.phase'), 'menu', reason);
    h.run('updateGame(0.5);');
    assert.equal(h.run('state.cutscene.time'), before, reason);
    assert.ok(h.players.every(a => a.paused), reason);
  }
});

test('pause inside the cloud never replays old impacts and rendering never produces sound', () => {
  const h = harness(); start(h); finale(h, 8.35);
  h.events.elements.pauseBtn.click(); h.events.elements.continueBtn.click();
  const effects = () => h.plays.filter(p => !p.loop).length;
  const before = effects();
  h.run('renderGame();renderGame();updateGame(0);updateGame(.05);');
  assert.equal(effects(), before);
  h.run('updateGame(.15);');
  assert.equal(effects(), before + 1);
});

test('toolbar and pause-menu audio controls stay synchronized and remember preferences', () => {
  const h = harness(); start(h); h.events.elements.pauseBtn.click();
  h.elements.get('menuMusicTrack').value = 'whistle'; h.events.elements.menuMusicTrack.change();
  h.elements.get('menuMusicVolume').value = '17'; h.events.elements.menuMusicVolume.input();
  h.elements.get('menuEffectsVolume').value = '38'; h.events.elements.menuEffectsVolume.input();
  assert.equal(h.elements.get('musicTrack').value, 'whistle');
  assert.equal(h.elements.get('musicValue').textContent, '17%');
  assert.equal(h.elements.get('effectsValue').textContent, '38%');
  assert.ok(h.players.every(a => a.paused));
  h.events.elements.menuAudioMute.click();
  assert.equal(h.run('AudioSystem.settings.muted'), true);
  const reloaded = harness(new Map(h.storage), true);
  assert.equal(reloaded.run('AudioSystem.settings.track'), 'whistle');
  assert.equal(reloaded.run('AudioSystem.settings.musicVolume'), .17);
  assert.equal(reloaded.run('AudioSystem.settings.effectsVolume'), .38);
  assert.equal(reloaded.run('AudioSystem.settings.muted'), true);
  assert.equal(reloaded.plays.length, 0);
});

test('rescue and capture sounds fire on successful events without duplicating their rewards', () => {
  const h = harness(); start(h);
  h.run(`const firstFriend=state.entities.animals[0];state.entities.chicken.x=firstFriend.x;state.entities.chicken.y=firstFriend.y;
    RescueSystem.update(state,0);RescueSystem.update(state,0);`);
  assert.equal(h.plays.filter(p => /animal-sheep\.wav$/.test(p.src)).length, 1);
  h.run(`const firstChick=state.entities.chicks[0];firstChick.discovered=true;state.entities.chicken.x=firstChick.x;state.entities.chicken.y=firstChick.y;
    RescueSystem.update(state,0);RescueSystem.update(state,0);
    Object.assign(state.entities.wolf,{x:state.entities.chicken.x,y:state.entities.chicken.y,huntUnlockTimer:0,pauseTimer:0});
    Player.checkCatch(state);Player.checkCatch(state);`);
  assert.equal(h.plays.filter(p => /chick\.wav$/.test(p.src)).length, 1);
  assert.equal(h.plays.filter(p => /squeak\.wav$/.test(p.src)).length, 1);
  assert.equal(h.run('state.lives'), 2);
});

test('all ten friends and six chicks use their own rescue call once, including after reload', () => {
  const h = harness(); start(h);
  h.run(`for(const animal of RescueSystem.all(state)){
    animal.discovered=true;
    state.entities.chicken.x=animal.x;state.entities.chicken.y=animal.y;
    RescueSystem.update(state,0);RescueSystem.update(state,0);
  }`);
  const calls = h.plays.filter(p => !p.loop && p.volume > .1).map(p => p.src.split('/').pop());
  const adultSpecies = ['sheep','pig','goat','cow','duck','rabbit','dog','cat','donkey','lamb'];
  for (const species of adultSpecies) {
    assert.equal(calls.filter(name => name === `animal-${species}.wav`).length, 1, species);
  }
  assert.equal(calls.filter(name => name === 'chick.wav').length, 6);
  assert.equal(calls.length, 16);
  assert.equal(h.run('state.score'), 2350);
  const saved = harness(new Map(h.storage), true);
  saved.events.elements.continueBtn.click();
  saved.run('updateGame(.05);renderGame();');
  assert.equal(saved.plays.filter(p => !p.loop).length, 0, 'loaded rescues do not repeat their calls');
});

test('victory fanfare is unique and a saved finale is silent until Continue is clicked', () => {
  const h = harness(); start(h); finale(h, 19.1);
  const fanfares = () => h.plays.filter(p => /victory\.wav$/.test(p.src)).length;
  assert.equal(fanfares(), 1);
  h.run('updateGame(.1);GameUI.showMenu(state);GameUI.resume();updateGame(.1);');
  assert.equal(fanfares(), 1);
  h.events.window.blur();
  assert.ok(h.players.every(a => a.paused));
  const saved = harness(new Map(h.storage), true);
  saved.run('updateGame(.1);renderGame();');
  assert.equal(saved.run('state.resumePhase'), 'win_cutscene');
  assert.equal(saved.plays.length, 0);
  saved.events.elements.continueBtn.click();
  assert.equal(saved.players.filter(a => a.loop && !a.paused).length, 1);
});
