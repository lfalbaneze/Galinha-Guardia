/* Local HTMLAudio files also work when index.html is opened directly with file://. */
const AudioSystem = (() => {
  const STORAGE_KEY = "galinha-resgate:audio:v1";
  const TRACKS = new Set(["forest", "whistle"]);
  const SKIN_TRACKS = new Map([
    ["punk", "skin-punk"], ["astronaut", "skin-astronaut"],
    ["robocop", "skin-robocop"], ["priest", "skin-priest"],
  ]);
  const TRACK_TITLES = new Map([
    ["forest", "Floresta encantada"], ["whistle", "Assobio da galinha"],
    ["skin-punk", "Pato · Passos no Terreiro"], ["skin-astronaut", "Coelho · Pulos ao Luar"],
    ["skin-robocop", "Gato · Passo Furtivo"], ["skin-priest", "Cachorro · Companheiro da Roça"],
  ]);
  const ANIMAL_SPECIES = new Set(["sheep", "pig", "goat", "cow", "duck", "rabbit", "dog", "cat", "donkey", "lamb"]);
  const EFFECTS = new Set(["boing", "pop", "bonk", "squeak", "dizzy", "sob", "runaway", "rescue", "chick", "victory",
    ...Array.from(ANIMAL_SPECIES, species => `animal-${species}`)]);
  const defaults = { musicVolume: 0.25, effectsVolume: 0.55, track: "forest", muted: false, skinThemes: true };
  const settings = { ...defaults };
  const status = { unlocked: false, unsupported: typeof Audio !== "function", blocked: false };
  const unit = (value, fallback = 0) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && typeof saved === "object") {
      settings.musicVolume = unit(saved.musicVolume, defaults.musicVolume);
      settings.effectsVolume = unit(saved.effectsVolume, defaults.effectsVolume);
      settings.track = TRACKS.has(saved.track) ? saved.track : defaults.track;
      settings.muted = saved.muted === true;
      settings.skinThemes = saved.skinThemes !== false;
    }
  } catch (_) { /* Private browsing and corrupt settings must not affect the game. */ }

  let music = null, musicTrack = null, musicAttempted = false, musicToken = 0, duck = 1;
  let currentGame = null, currentPhase = null, active = false, serial = 0;
  const voices = [];
  let scene = null, lastTime = -1, cloudBucket = -1, sobBucket = -1;
  const oneShots = new Set();
  const path = name => `./assets/audio/${name}.wav`;
  const hidden = () => typeof document !== "undefined" && document.hidden === true;
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (_) { /* Optional preference storage. */ }
  }
  function rewind(audio) {
    try { audio.currentTime = 0; } catch (_) { /* Metadata may not be available yet. */ }
  }
  function makeAudio(name) {
    if (status.unsupported) return null;
    try {
      const audio = new Audio(path(name));
      audio.preload = "auto";
      return audio;
    } catch (_) { status.unsupported = true; return null; }
  }
  function pauseMusic() {
    musicToken += 1;
    if (music) music.pause();
    musicAttempted = false;
  }
  function release(voice) {
    voice.token += 1;
    voice.active = false;
    voice.audio.pause();
    rewind(voice.audio);
  }
  function stopEffects(keepVictory = false) {
    for (const voice of voices) if (voice.active && !(keepVictory && voice.name === "victory")) release(voice);
  }
  function volumes() {
    if (music) music.volume = settings.muted ? 0 : settings.musicVolume * duck;
    for (const voice of voices) if (voice.active) voice.audio.volume = settings.muted ? 0 : settings.effectsVolume * voice.gain;
  }
  function attempt(audio, failed, started = () => {}) {
    try {
      const result = audio.play();
      // Some older browsers return undefined. Modern rejection is always handled here.
      if (result && typeof result.then === "function") result.then(started).catch(failed);
    } catch (error) { failed(error); }
  }
  function skinTheme() {
    return settings.skinThemes && SKIN_TRACKS.get(currentGame?.entities?.chicken?.skin);
  }
  function selectedTrack() { return skinTheme() || settings.track; }
  function syncMusic() {
    const target = selectedTrack();
    if (music && musicTrack !== target) {
      pauseMusic(); rewind(music); music.src = path(target); musicTrack = target;
    }
    const wanted = active && status.unlocked && !status.unsupported && !status.blocked && !settings.muted && settings.musicVolume > 0;
    if (!wanted) { if (music && (!music.paused || musicAttempted)) pauseMusic(); return; }
    if (!music) {
      music = makeAudio(target);
      if (!music) return;
      musicTrack = target;
      music.loop = true;
      music.onerror = () => { status.blocked = true; pauseMusic(); };
    }
    volumes();
    if (musicAttempted || !music.paused) return;
    musicAttempted = true;
    const token = ++musicToken;
    attempt(music, () => {
      if (token !== musicToken) return;
      status.blocked = true;
      // Leave attempted set: update() must never retry a rejected play every frame.
    }, () => { if (!active || settings.muted || hidden()) music.pause(); });
  }
  function unlock() {
    if (status.unsupported) return false;
    status.unlocked = true;
    status.blocked = false;
    musicAttempted = false;
    syncMusic();
    return true;
  }
  function play(name, options = {}) {
    if (!EFFECTS.has(name) || !active || !status.unlocked || status.unsupported || status.blocked ||
      settings.muted || settings.effectsVolume <= 0 || hidden()) return false;
    const gain = unit(options.volume, 1);
    if (!gain) return false;
    let voice = voices.find(item => !item.active);
    if (!voice && voices.length < 6) {
      const audio = makeAudio(name);
      if (!audio) return false;
      voice = { audio, name, active: false, token: 0, gain: 1, order: 0 };
      voices.push(voice);
    }
    if (!voice) voice = voices.reduce((oldest, item) => item.order < oldest.order ? item : oldest);
    release(voice);
    if (voice.name !== name) { voice.audio.src = path(name); voice.name = name; }
    voice.gain = gain;
    voice.order = ++serial;
    voice.active = true;
    voice.audio.loop = false;
    voice.audio.volume = settings.effectsVolume * gain;
    voice.audio.playbackRate = Number.isFinite(options.rate) ? Math.max(0.7, Math.min(1.4, options.rate)) : 1;
    const token = ++voice.token;
    voice.audio.onended = () => { if (voice.token === token) voice.active = false; };
    voice.audio.onerror = () => { if (voice.token === token) release(voice); };
    attempt(voice.audio, error => {
      if (voice.token !== token) return;
      release(voice);
      if (!error || error.name !== "AbortError") status.blocked = true;
    }, () => { if (!active || !voice.active || settings.muted || hidden()) voice.audio.pause(); });
    return true;
  }
  function playAnimal(species) {
    return play(species === "chick" ? "chick" : ANIMAL_SPECIES.has(species) ? `animal-${species}` : "rescue");
  }
  function timing() {
    return typeof EndGameSequence !== "undefined" && EndGameSequence.timing || { cloud: 7, dizzy: 10.8, flee: 13.6, celebrate: 16 };
  }
  function stageAt(cut) {
    if (cut.stage) return cut.stage;
    const t = timing();
    return cut.time >= t.celebrate ? "celebrate" : cut.time >= t.flee ? "flee" :
      cut.time >= t.dizzy ? "dizzy" : cut.time >= t.cloud ? "cloud" : "arrival";
  }
  function clearScene() {
    scene = null; lastTime = -1; cloudBucket = -1; sobBucket = -1; oneShots.clear();
  }
  function observeScene(game, audible, baseline = false) {
    const cut = game?.cutscene;
    if (!cut || !Number.isFinite(cut.time)) return;
    if (cut !== scene || cut.time < lastTime - 0.05) {
      clearScene(); scene = cut;
    }
    const t = timing(), stage = stageAt(cut);
    const beat = Math.max(0, Math.floor((cut.time - t.cloud) * 4 + 1e-7));
    const sob = Math.max(0, Math.floor((cut.time - t.dizzy) / 1.05 + 1e-7));
    if (baseline) {
      cloudBucket = cut.time >= t.cloud ? beat : -1;
      sobBucket = cut.time >= t.dizzy ? sob : -1;
      for (const name of ["dizzy", "flee", "celebrate"]) if (cut.time >= t[name]) oneShots.add(name);
      lastTime = cut.time;
      return;
    }
    // Only the current beat plays after a slow frame; skipped beats never form a burst.
    if (stage === "cloud" && beat !== cloudBucket) {
      cloudBucket = beat;
      if (audible) play(["pop", "boing", "bonk", "squeak"][beat % 4], { volume: 0.78, rate: 0.94 + beat % 3 * 0.05 });
    }
    if (["dizzy", "flee", "celebrate"].includes(stage) && !oneShots.has(stage)) {
      oneShots.add(stage);
      if (audible) {
        play(stage === "flee" ? "runaway" : stage === "celebrate" ? "victory" : "dizzy");
        if (stage === "flee") play("sob", { volume: 0.8 });
      }
    }
    if (stage === "dizzy" && sob !== sobBucket) {
      sobBucket = sob;
      if (audible && sob > 0) play("sob", { volume: 0.75 });
    }
    lastTime = cut.time;
  }
  function sync(game) {
    if (!game) return;
    currentGame = game;
    const nextActive = ["playing", "win_cutscene"].includes(game.phase) && !hidden();
    const wasActive = active;
    const changed = currentPhase !== game.phase || nextActive !== active;
    active = nextActive;
    currentPhase = game.phase;
    duck = game.phase === "win_cutscene" && ["cloud", "dizzy", "flee"].includes(stageAt(game.cutscene || {})) ? 0.25 : 1;
    if (!active) {
      if (changed || hidden()) { pauseMusic(); stopEffects(game.phase === "won" && !hidden()); }
      observeScene(game, false, true);
    } else if (changed && !wasActive && scene === game.cutscene) {
      // The paused instant has already been heard; resume with the next beat or stage.
      observeScene(game, false, true);
    }
    volumes();
    syncMusic();
  }
  function update(game, dt) {
    sync(game);
    if (active && game.phase === "win_cutscene" && Number.isFinite(dt) && dt > 0) observeScene(game, true);
  }
  function reset() {
    pauseMusic();
    if (music) rewind(music);
    stopEffects(); clearScene();
    currentGame = null; currentPhase = null; active = false; duck = 1;
    volumes();
  }
  function pause() {
    active = false;
    pauseMusic(); stopEffects();
    if (currentGame) observeScene(currentGame, false, true);
  }
  function setMusicVolume(value) {
    settings.musicVolume = unit(value, settings.musicVolume); persist(); volumes(); syncMusic();
    return settings.musicVolume;
  }
  function setEffectsVolume(value) {
    settings.effectsVolume = unit(value, settings.effectsVolume); persist(); volumes();
    if (!settings.effectsVolume) stopEffects();
    return settings.effectsVolume;
  }
  function setTrack(track) {
    if (!TRACKS.has(track)) return false;
    if (settings.track === track) return true;
    settings.track = track; persist();
    syncMusic();
    return true;
  }
  function setSkinThemes(enabled) {
    if (typeof enabled !== "boolean") return settings.skinThemes;
    settings.skinThemes = enabled; persist(); syncMusic();
    return settings.skinThemes;
  }
  function toggleMute() {
    settings.muted = !settings.muted; persist();
    if (settings.muted) stopEffects();
    volumes(); syncMusic();
    return settings.muted;
  }
  if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("visibilitychange", () => { if (currentGame) sync(currentGame); });
  }
  return { unlock, update, sync, reset, pause, play, playAnimal, setMusicVolume, setEffectsVolume, setTrack, setSkinThemes, toggleMute,
    get settings() { return Object.freeze({ ...settings }); },
    get status() { return Object.freeze({ ...status, track: selectedTrack(), trackTitle: TRACK_TITLES.get(selectedTrack()),
      skinTheme: !!skinTheme(), music: status.unsupported ? "unsupported" :
      !status.unlocked ? "locked" : status.blocked ? "blocked" : music && !music.paused ? "playing" : "paused" }); } };
})();
