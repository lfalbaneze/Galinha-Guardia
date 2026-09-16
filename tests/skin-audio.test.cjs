const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

const AUDIO_KEY = 'galinha-resgate:audio:v1';
const WARDROBE_KEY = 'galinha-guardia-wardrobe-v1';

function harness(storage, fullStartup = false) {
  const players = [], plays = [];
  class MockAudio {
    constructor(src) {
      this.src = src; this.paused = true; this.currentTime = 0; this.volume = 1; this.loop = false;
      players.push(this);
    }
    play() {
      this.paused = false;
      plays.push({ src: this.src, loop: this.loop, volume: this.volume });
      return Promise.resolve();
    }
    pause() { this.paused = true; }
  }
  return { ...createGame(() => .5, { Audio: MockAudio, storage, fullStartup }), players, plays };
}
function unlockedStorage(selected = 'classic', audio) {
  const storage = new Map([[WARDROBE_KEY, JSON.stringify({ best: 6, selected })]]);
  if (audio) storage.set(AUDIO_KEY, JSON.stringify(audio));
  return storage;
}
function start(h) { h.events.elements.startBtn.click(); }
function equip(h, skin) { h.events.elements[`skin-${skin}`].click(); }
function checkbox(h, id, checked) {
  h.elements.get(id).checked = checked;
  h.events.elements[id].change();
}
function music(h) { return h.players.find(player => player.loop); }
function musicPlays(h) { return h.plays.filter(play => play.loop); }
function rescueChicks(h, count) {
  h.run(`for (const chick of state.entities.chicks.slice(0, ${count})) {
    if (chick.rescued) continue;
    chick.discovered = true;
    state.entities.chicken.x = chick.x; state.entities.chicken.y = chick.y;
    RescueSystem.update(state, 0);
  } GameUI.update(state);`);
}
function advanceFinale(h, time) {
  h.run(`while (state.phase === 'win_cutscene' && state.cutscene.time < ${time} - .00001)
    updateGame(Math.min(.05, ${time} - state.cutscene.time));`);
}

test('old audio preferences gain skin themes without losing their settings or autoplaying', () => {
  const oldSettings = { track: 'whistle', musicVolume: .17, effectsVolume: .38, muted: false };
  const h = harness(unlockedStorage('astronaut', oldSettings), true);
  h.run('updateGame(.05); renderGame();');
  assert.equal(h.players.length, 0, 'loading an equipped skin must not create or play audio');
  assert.equal(h.run('AudioSystem.settings.skinThemes'), true);
  for (const [key, value] of Object.entries(oldSettings)) {
    assert.equal(h.run(`AudioSystem.settings.${key}`), value, key);
  }
  start(h);
  assert.match(music(h).src, /skin-astronaut\.wav$/);
  assert.equal(music(h).volume, .17);
  assert.equal(h.run('AudioSystem.status.track'), 'skin-astronaut');
  assert.equal(h.run('AudioSystem.status.skinTheme'), true);
  assert.ok(h.run('AudioSystem.status.trackTitle.length > 0'));
});

test('real chick rescues unlock four distinct themes and locked skins cannot change the music', () => {
  const h = harness(); start(h);
  equip(h, 'priest');
  assert.equal(h.run('state.entities.chicken.skin'), 'classic');
  assert.match(music(h).src, /forest\.wav$/);
  const titles = new Set();
  for (const [count, friends, skin] of [[2, 3, 'punk'], [4, 6, 'astronaut'], [6, 9, 'robocop'], [6, 10, 'priest']]) {
    rescueChicks(h, count);
    h.run(`for(const friend of state.entities.animals.slice(0,${friends})) GameManager.rescue(state,friend);GameUI.update(state);`);
    assert.equal(h.elements.get(`skin-${skin}`).disabled, false, skin);
    const before = musicPlays(h).length;
    equip(h, skin);
    assert.equal(h.run('state.entities.chicken.skin'), skin);
    assert.equal(h.run('AudioSystem.status.track'), `skin-${skin}`);
    assert.equal(h.run('AudioSystem.status.skinTheme'), true);
    assert.match(music(h).src, new RegExp(`skin-${skin}\\.wav$`));
    assert.equal(musicPlays(h).length, before + 1, 'equipping changes the track immediately');
    titles.add(h.run('AudioSystem.status.trackTitle'));
    music(h).currentTime = 12.37;
    h.run('for (let i = 0; i < 10; i++) { AudioSystem.update(state, 0); GameUI.update(state); renderGame(); }');
    assert.equal(music(h).currentTime, 12.37, 'frames do not rewind the current theme');
    assert.equal(musicPlays(h).length, before + 1, 'frames do not restart playback');
  }
  assert.equal(titles.size, 4, 'each secret skin names its own theme');
  assert.equal(h.players.filter(player => player.loop).length, 1);
  assert.equal(h.plays.filter(play => /chick\.wav$/.test(play.src)).length, 6);
});

test('base track selection preserves an active theme and both theme checkboxes control the same preference', () => {
  const h = harness(unlockedStorage('punk')); start(h);
  const before = musicPlays(h).length;
  music(h).currentTime = 8.2;
  h.elements.get('musicTrack').value = 'whistle';
  h.events.elements.musicTrack.change();
  assert.equal(h.run('AudioSystem.settings.track'), 'whistle');
  assert.match(music(h).src, /skin-punk\.wav$/);
  assert.equal(music(h).currentTime, 8.2);
  assert.equal(musicPlays(h).length, before, 'choosing the base track does not interrupt a skin theme');

  checkbox(h, 'skinMusic', false);
  assert.equal(h.run('AudioSystem.settings.skinThemes'), false);
  assert.equal(h.elements.get('menuSkinMusic').checked, false);
  assert.equal(h.run('AudioSystem.status.track'), 'whistle');
  assert.equal(h.run('AudioSystem.status.skinTheme'), false);
  assert.match(music(h).src, /whistle\.wav$/);

  checkbox(h, 'menuSkinMusic', true);
  assert.equal(h.elements.get('skinMusic').checked, true);
  assert.match(music(h).src, /skin-punk\.wav$/);
  equip(h, 'classic');
  assert.equal(h.run('AudioSystem.status.track'), 'whistle');
  assert.equal(h.run('AudioSystem.status.skinTheme'), false);
  assert.match(music(h).src, /whistle\.wav$/);
  assert.equal(h.players.filter(player => player.loop).length, 1);
});

test('changing an outfit or theme option in the pause menu keeps the adventure and every sound paused', () => {
  const h = harness(unlockedStorage('punk')); start(h);
  h.events.elements.pauseBtn.click();
  const before = h.plays.length;
  h.elements.get('menuSkinSelect').value = 'robocop';
  h.events.elements.menuSkinSelect.change();
  assert.equal(h.run('state.entities.chicken.skin'), 'robocop');
  assert.equal(h.run('AudioSystem.status.track'), 'skin-robocop');
  checkbox(h, 'menuSkinMusic', false);
  checkbox(h, 'menuSkinMusic', true);
  h.run('updateGame(.1); renderGame();');
  assert.equal(h.run('state.phase'), 'menu');
  assert.equal(h.plays.length, before);
  assert.ok(h.players.every(player => player.paused));
  h.events.elements.continueBtn.click();
  assert.match(music(h).src, /skin-robocop\.wav$/);
  assert.equal(music(h).paused, false);
  assert.equal(h.players.filter(player => player.loop).length, 1);
});

test('skin switching respects mute, zero music volume and a hidden page', () => {
  for (const reason of ['muted', 'zero', 'hidden']) {
    const h = harness(unlockedStorage('punk')); start(h);
    if (reason === 'muted') h.run('AudioSystem.toggleMute();');
    else if (reason === 'zero') h.run('AudioSystem.setMusicVolume(0);');
    else { h.run('document.hidden = true;'); h.events.document.visibilitychange(); }
    const before = h.plays.length;
    equip(h, 'priest');
    h.run('AudioSystem.update(state, 0);');
    assert.equal(h.run('AudioSystem.status.track'), 'skin-priest', reason);
    assert.equal(h.plays.length, before, reason);
    assert.ok(h.players.every(player => player.paused), reason);
  }
});

test('equipped skins and the theme preference survive reload and a new adventure without autoplay', () => {
  for (const enabled of [true, false]) {
    const first = harness(unlockedStorage()); start(first);
    equip(first, 'robocop');
    first.run('AudioSystem.setTrack("whistle");');
    checkbox(first, 'skinMusic', enabled);
    first.events.elements.pauseBtn.click();
    const loaded = harness(new Map(first.storage), true);
    assert.equal(loaded.run('state.entities.chicken.skin'), 'robocop');
    assert.equal(loaded.run('AudioSystem.settings.skinThemes'), enabled);
    assert.equal(loaded.elements.get('skinMusic').checked, enabled);
    assert.equal(loaded.elements.get('menuSkinMusic').checked, enabled);
    assert.equal(loaded.plays.length, 0);
    loaded.events.elements.continueBtn.click();
    const expected = enabled ? 'skin-robocop' : 'whistle';
    assert.equal(loaded.run('AudioSystem.status.track'), expected);
    assert.match(music(loaded).src, new RegExp(`${expected}\\.wav$`));
    loaded.events.elements.restartBtn.click();
    assert.equal(loaded.run('state.entities.chicken.skin'), 'robocop');
    assert.equal(loaded.run('AudioSystem.status.track'), expected);
    assert.equal(loaded.players.filter(player => player.loop).length, 1);
  }
});

test('skin themes preserve rescue effects and lower the music during the wolf finale', () => {
  const h = harness(unlockedStorage('punk')); start(h);
  rescueChicks(h, 1);
  const chickCalls = h.plays.filter(play => /chick\.wav$/.test(play.src));
  assert.equal(chickCalls.length, 1);
  assert.equal(chickCalls[0].volume, .55);
  // Finish the actual 1.2-second recording before fast-forwarding the mock clock.
  h.players.find(player => /chick\.wav$/.test(player.src)).onended();
  h.run('for (const friend of RescueSystem.all(state)) GameManager.rescue(state, Object.assign(friend,{discovered:true})); GameManager.win(state);');
  advanceFinale(h, 7.1);
  assert.equal(h.run('state.cutscene.stage'), 'cloud');
  assert.equal(music(h).volume, .25 * .25);
  equip(h, 'astronaut');
  assert.match(music(h).src, /skin-astronaut\.wav$/);
  assert.equal(music(h).volume, .25 * .25, 'a new theme retains the finale volume reduction');
  h.run('AudioSystem.setMusicVolume(.4);');
  assert.equal(music(h).volume, .1);
  advanceFinale(h, 16.1);
  assert.equal(h.run('state.cutscene.stage'), 'celebrate');
  assert.equal(music(h).volume, .4);
  assert.equal(h.plays.filter(play => /victory\.wav$/.test(play.src)).length, 1);
  assert.ok(h.plays.some(play => /(?:pop|boing|bonk|squeak)\.wav$/.test(play.src)));
});
