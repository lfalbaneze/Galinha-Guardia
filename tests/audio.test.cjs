const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../systems/audio-system.js'), 'utf8');

function audioHarness(options = {}) {
  const instances = [], plays = [], pending = [], events = {};
  const storage = options.storage || new Map();
  let reject = options.reject || 0;
  class MockAudio {
    constructor(src) {
      this.src = src; this.paused = true; this.currentTime = 0; this.volume = 1;
      this.loop = false; this.playbackRate = 1; this.pauseCount = 0;
      instances.push(this);
    }
    play() {
      plays.push({ audio: this, src: this.src, volume: this.volume, loop: this.loop });
      if (reject > 0) { reject--; return Promise.reject(Object.assign(new Error('blocked'), { name: 'NotAllowedError' })); }
      if (options.deferred) return new Promise(resolve => pending.push(() => { this.paused = false; resolve(); }));
      this.paused = false;
      return Promise.resolve();
    }
    pause() { this.paused = true; this.pauseCount++; }
    end() { this.paused = true; if (this.onended) this.onended(); }
  }
  const document = { hidden: false, addEventListener: (name, fn) => { events[name] = fn; } };
  const context = vm.createContext({
    ...(options.unsupported ? {} : { Audio: MockAudio }), document,
    DetectionSystem: { hasLineOfSight: () => !options.occluded }, getHitbox: entity => entity,
    localStorage: {
      getItem: key => { if (options.storageError) throw new Error('unavailable'); return storage.get(key) || null; },
      setItem: (key, value) => { if (options.storageError) throw new Error('unavailable'); storage.set(key, value); },
    },
  });
  vm.runInContext(source, context);
  const audio = vm.runInContext('AudioSystem', context);
  const game = { phase: 'playing', cutscene: { time: 0, stage: 'arrival' } };
  const effects = () => plays.filter(p => !p.loop).map(p => path.basename(p.src, '.wav'));
  const start = () => { audio.sync(game); audio.unlock(); };
  const step = (time, stage) => { game.phase = 'win_cutscene'; Object.assign(game.cutscene, { time, stage }); audio.update(game, 0.05); };
  return { audio, game, instances, plays, pending, events, document, storage, effects, start, step };
}
const microtasks = async () => { await Promise.resolve(); await Promise.resolve(); };

test('menu calls require a menu gesture path and respect volume, mute, pause and late play completion', async () => {
  const h = audioHarness({ deferred: true });
  assert.equal(h.audio.playMenuAnimal(h.game, 'duck'), false, 'cannot inject menu sounds into gameplay');
  h.game.phase = 'menu'; h.audio.sync(h.game);
  assert.equal(h.audio.playAnimal('duck'), false, 'ordinary game effects remain paused');
  assert.equal(h.audio.playMenuAnimal(h.game, 'duck'), true);
  assert.equal(h.instances.length, 1); assert.equal(h.instances[0].loop, false);
  const preview = h.instances[0];
  h.audio.setEffectsVolume(.2); assert.equal(preview.volume, .2 * .9);
  h.audio.pause(); h.pending.shift()(); await microtasks();
  assert.equal(preview.paused, true, 'late play cannot revive a paused menu cue');
  h.audio.toggleMute(); assert.equal(h.audio.playMenuAnimal(h.game, 'dog'), false);
  h.audio.toggleMute(); h.audio.setEffectsVolume(0);
  assert.equal(h.audio.playMenuAnimal(h.game, 'dog'), false);
  h.audio.setEffectsVolume(.5); assert.equal(h.audio.playMenuAnimal(h.game, 'dog'), true);
  h.game.phase = 'playing'; h.audio.sync(h.game);
  for (const done of h.pending.splice(0)) done(); await microtasks();
  assert.equal(preview.paused, true);
  assert.equal(h.instances.filter(audio => audio.loop && !audio.paused).length, 1);
});

function farm(h, animals = [{ species: 'cow', x: 60, y: 0 }]) {
  h.game.entities = { chicken: { x: 0, y: 0, skin: 'classic' }, animals,
    chicks: [{ species: 'chick', x: 10, y: 0, discovered: false }] };
  h.start();
  return seconds => { for (let i = 0; i < seconds * 20; i++) h.audio.update(h.game, .05); };
}

test('nearby animals call without rescue, with distance falloff and no secret disclosure', () => {
  const near = audioHarness(), far = audioHarness(), outside = audioHarness(), blocked = audioHarness({ occluded: true });
  farm(near)(2); farm(far, [{ species: 'cow', x: 270, y: 0 }])(2);
  farm(outside, [{ species: 'cow', x: 500, y: 0 }])(2); farm(blocked)(2);
  assert.deepEqual(near.effects(), ['animal-cow']);
  assert.ok(near.plays.at(-1).volume > far.plays.at(-1).volume);
  assert.deepEqual(outside.effects(), []); assert.deepEqual(blocked.effects(), []);
  assert.match(near.plays.at(-1).src, /audio\/voices\/animal-cow\.wav$/);
});

test('farm calls are spaced, rotate among nearby animals, and stop while paused or muted', () => {
  const h = audioHarness(), step = farm(h, ['cow', 'duck', 'cat'].map((species, i) => ({ species, x: 50 + i * 10, y: 0 })));
  step(2); assert.deepEqual(h.effects(), ['animal-cow']);
  step(2); assert.equal(h.effects().length, 1);
  h.game.phase = 'menu'; step(20); assert.equal(h.effects().length, 1);
  h.game.phase = 'playing'; step(1.3); assert.deepEqual(h.effects(), ['animal-cow', 'animal-duck']);
  h.audio.toggleMute(); step(20); assert.equal(h.effects().length, 2);
  h.audio.toggleMute(); step(.05); assert.equal(h.effects().at(-1), 'animal-cat');
  const before = h.effects().length;
  h.document.hidden = true; step(20); assert.equal(h.effects().length, before);
});

test('animal recordings are real local PCM assets and new adventures do not replay pending calls', () => {
  const h = audioHarness(), step = farm(h);
  step(2); h.audio.reset(); h.game.entities.animals = [{ species: 'cat', x: 40, y: 0 }]; h.start(); step(.1);
  assert.deepEqual(h.effects(), ['animal-cow']);
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/audio/voices/manifest.json')));
  for (const item of manifest.recordings) {
    h.audio.playAnimal(item.species);
    const file = path.resolve(__dirname, '..', h.plays.at(-1).src);
    const wav = fs.readFileSync(file);
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
    assert.equal(wav.readUInt16LE(20), 1); assert.equal(wav.readUInt16LE(22), 1);
    assert.equal(wav.readUInt32LE(24), 22050); assert.ok(item.seconds > .3 && item.seconds < 3.3);
    assert.ok(item.peak < .9 && item.rms > .01);
    assert.equal(require('node:crypto').createHash('sha256').update(wav).digest('hex'), item.sha256);
  }
  assert.equal(manifest.recordings.length, 12);
});

test('audio is lazy and never queues effects or autoplay before a gesture', () => {
  const h = audioHarness();
  assert.equal(h.audio.status.music, 'locked');
  h.audio.sync(h.game);
  assert.equal(h.audio.play('rescue'), false);
  h.step(7.1, 'cloud'); h.step(7.6, 'cloud');
  assert.equal(h.instances.length, 0);
  h.audio.unlock(); h.audio.update(h.game, 0.05);
  assert.equal(h.instances.length, 1);
  assert.equal(h.instances[0].loop, true);
  assert.deepEqual(h.effects(), []);
  h.step(7.8, 'cloud');
  assert.deepEqual(h.effects(), ['squeak']);
});

test('animal calls respect audio lock, mute, pause and effect volume, with safe fallback', () => {
  const h = audioHarness(); h.audio.sync(h.game);
  assert.equal(h.audio.playAnimal('cow'), false);
  h.start(); h.audio.setEffectsVolume(.31);
  assert.equal(h.audio.playAnimal('cow'), true);
  assert.equal(h.plays.at(-1).volume, .31);
  assert.deepEqual(h.effects(), ['animal-cow']);
  h.audio.toggleMute();
  assert.equal(h.audio.playAnimal('dog'), false);
  h.audio.toggleMute();
  h.game.phase = 'menu'; h.audio.sync(h.game);
  assert.equal(h.audio.playAnimal('cat'), false);
  h.game.phase = 'playing'; h.audio.sync(h.game);
  h.audio.setEffectsVolume(0);
  assert.equal(h.audio.playAnimal('duck'), false);
  h.audio.setEffectsVolume(.55);
  assert.equal(h.audio.playAnimal('unknown'), true);
  assert.deepEqual(h.effects(), ['animal-cow', 'rescue']);
});

test('music uses one looping element through track switches and clamps independent volumes', () => {
  const h = audioHarness(); h.start();
  const music = h.instances[0];
  assert.equal(music.volume, 0.25);
  h.audio.play('rescue');
  const effect = h.instances[1];
  h.audio.setMusicVolume(0.4); h.audio.setEffectsVolume(0.7);
  assert.equal(music.volume, 0.4); assert.equal(effect.volume, 0.7);
  music.currentTime = 12;
  assert.equal(h.audio.setTrack('whistle'), true);
  assert.equal(music.currentTime, 0);
  assert.equal(music.src, './assets/audio/whistle.wav');
  assert.equal(h.instances.filter(a => a.loop).length, 1);
  assert.equal(h.audio.setTrack('unknown'), false);
  h.audio.setMusicVolume(99); h.audio.setEffectsVolume(-4);
  assert.equal(music.volume, 1); assert.equal(effect.paused, true);
  assert.equal(h.audio.settings.effectsVolume, 0);
});

test('effect pool reuses ended voices and caps simultaneous playback at six', () => {
  const h = audioHarness(); h.start();
  for (let i = 0; i < 15; i++) h.audio.play(i % 2 ? 'pop' : 'boing');
  assert.equal(h.instances.length, 7);
  assert.equal(h.instances.filter(a => !a.loop && !a.paused).length, 6);
  for (const a of h.instances.filter(a => !a.loop)) a.end();
  h.audio.play('rescue');
  assert.equal(h.instances.length, 7);
  assert.equal(h.instances.filter(a => !a.loop && !a.paused).length, 1);
  assert.equal(h.audio.play('missing'), false);
});

test('cutscene beats play once, duck music, and skipped frames never create a catchup burst', () => {
  const h = audioHarness(); h.start();
  h.step(7.02, 'cloud'); h.step(7.04, 'cloud');
  assert.deepEqual(h.effects(), ['pop']);
  assert.equal(h.instances[0].volume, 0.25 * 0.25);
  h.step(8.6, 'cloud');
  assert.deepEqual(h.effects(), ['pop', 'bonk']);
  h.step(10.8, 'dizzy'); h.step(10.82, 'dizzy'); h.step(11.9, 'dizzy');
  assert.deepEqual(h.effects(), ['pop', 'bonk', 'dizzy', 'sob']);
  h.step(13.6, 'flee'); h.step(13.7, 'flee'); h.step(16, 'celebrate'); h.step(17, 'celebrate');
  assert.deepEqual(h.effects(), ['pop', 'bonk', 'dizzy', 'sob', 'runaway', 'sob', 'victory']);
  assert.equal(h.instances[0].volume, 0.25);
});

test('pause and resume neither replay stage sounds nor replay the previous cloud beat', () => {
  const h = audioHarness(); h.start(); h.step(7.1, 'cloud');
  h.game.phase = 'menu'; h.audio.sync(h.game);
  assert.equal(h.instances.every(a => a.paused), true);
  h.game.phase = 'win_cutscene'; h.audio.sync(h.game); h.audio.unlock(); h.audio.update(h.game, 0.05);
  assert.deepEqual(h.effects(), ['pop']);
  h.step(7.3, 'cloud'); assert.deepEqual(h.effects(), ['pop', 'boing']);
  h.step(10.8, 'dizzy');
  h.audio.pause(); h.game.phase = 'menu'; h.audio.sync(h.game);
  h.game.phase = 'win_cutscene'; h.audio.sync(h.game); h.audio.update(h.game, 0.05);
  assert.equal(h.effects().filter(name => name === 'dizzy').length, 1);
});

test('pausing before the cloud does not consume its first beat and zero-time updates emit no cues', () => {
  const h = audioHarness(); h.start(); h.step(3, 'message');
  h.game.phase = 'menu'; h.audio.sync(h.game);
  h.game.phase = 'win_cutscene'; h.audio.sync(h.game);
  Object.assign(h.game.cutscene, { time: 7, stage: 'cloud' });
  h.audio.update(h.game, 0); h.audio.update(h.game, -1);
  assert.deepEqual(h.effects(), []);
  h.audio.update(h.game, 0.05);
  assert.deepEqual(h.effects(), ['pop']);
});

test('won allows the current victory tail, while menu, hidden pages and explicit pause silence it', () => {
  const h = audioHarness(); h.start(); h.step(16, 'celebrate');
  const victory = h.instances.find(a => a.src.endsWith('victory.wav'));
  h.game.phase = 'won'; h.audio.sync(h.game);
  assert.equal(h.instances[0].paused, true); assert.equal(victory.paused, false);
  h.document.hidden = true; h.events.visibilitychange();
  assert.equal(victory.paused, true);
  h.document.hidden = false; h.events.visibilitychange();
  assert.equal(victory.paused, true);
  h.audio.reset(); h.start(); h.step(16, 'celebrate'); h.audio.pause();
  assert.equal(h.instances.every(a => a.paused), true);
  h.game.phase = 'menu'; h.audio.sync(h.game);
  assert.equal(h.audio.play('victory'), false);
});

test('reset rewinds music, stops effects and begins a fresh cutscene cue ledger', () => {
  const h = audioHarness(); h.start(); h.step(7, 'cloud');
  h.instances[0].currentTime = 19;
  h.audio.reset();
  assert.equal(h.instances[0].currentTime, 0);
  assert.equal(h.instances.every(a => a.paused), true);
  assert.equal(h.audio.status.unlocked, true);
  h.game.phase = 'playing'; h.game.cutscene = { time: 0, stage: 'arrival' }; h.audio.sync(h.game);
  h.step(7, 'cloud');
  assert.deepEqual(h.effects(), ['pop', 'pop']);
});

test('mute cancels current effects without queuing sounds for unmute', () => {
  const h = audioHarness(); h.start(); h.audio.play('chick');
  assert.equal(h.audio.toggleMute(), true);
  assert.equal(h.instances.every(a => a.paused), true);
  h.step(7, 'cloud'); h.step(7.3, 'cloud');
  h.audio.toggleMute(); h.audio.update(h.game, 0.05);
  assert.deepEqual(h.effects(), ['chick']);
  assert.equal(h.instances[0].paused, false);
  assert.equal(h.instances[1].paused, true);
});

test('preferences persist separately, load safely, and are exposed as immutable snapshots', () => {
  const h = audioHarness();
  h.audio.setMusicVolume(0.36); h.audio.setEffectsVolume(0.61); h.audio.setTrack('whistle'); h.audio.toggleMute();
  const settings = h.audio.settings;
  assert.equal(Object.isFrozen(settings), true);
  assert.equal(Object.isFrozen(h.audio.status), true);
  const next = audioHarness({ storage: h.storage });
  assert.deepEqual(JSON.parse(JSON.stringify(next.audio.settings)), { musicVolume: 0.36, effectsVolume: 0.61, track: 'whistle', muted: true, skinThemes: true });
  assert.equal(next.audio.status.unlocked, false);
  const bad = audioHarness({ storage: new Map([['galinha-resgate:audio:v1', '{invalid']]) });
  assert.equal(bad.audio.settings.musicVolume, 0.25);
  const unavailable = audioHarness({ storageError: true });
  assert.doesNotThrow(() => unavailable.audio.setMusicVolume(0.8));
});

test('unsupported browsers remain playable without constructing audio', () => {
  const h = audioHarness({ unsupported: true });
  assert.equal(h.audio.status.unsupported, true);
  assert.equal(h.audio.unlock(), false);
  assert.doesNotThrow(() => { h.audio.sync(h.game); h.step(7, 'cloud'); h.audio.pause(); h.audio.reset(); });
  assert.equal(h.audio.play('rescue'), false);
});

test('rejected play promises are handled and only a new gesture permits retry', async () => {
  const h = audioHarness({ reject: 1 }); h.start();
  await microtasks();
  assert.equal(h.audio.status.blocked, true);
  assert.equal(h.audio.status.music, 'blocked');
  for (let i = 0; i < 100; i++) h.audio.update(h.game, 0.05);
  assert.equal(h.plays.length, 1);
  h.audio.unlock(); await microtasks();
  assert.equal(h.audio.status.blocked, false);
  assert.equal(h.plays.length, 2);
  assert.equal(h.instances[0].paused, false);
});

test('pending play completion cannot resurrect music or effects after pause or reset', async () => {
  const h = audioHarness({ deferred: true }); h.start(); h.audio.play('rescue');
  h.audio.pause();
  for (const done of h.pending.splice(0)) done();
  await microtasks();
  assert.equal(h.instances.every(a => a.paused), true);
  h.audio.sync(h.game); h.audio.play('chick'); h.audio.reset();
  for (const done of h.pending.splice(0)) done();
  await microtasks();
  assert.equal(h.instances.every(a => a.paused), true);
});
