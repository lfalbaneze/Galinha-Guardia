/* Cosmetics persist across adventures; they never change movement or collision. */
const SkinSystem = (() => {
  const KEY = "galinha-guardia-wardrobe-v1";
  const catalog = Object.freeze([
    { id: "classic", ...CharacterArt.appearances.classic, chicks: 0, friends: 0, requirement: "A guardiã da fazenda" },
    { id: "punk", ...CharacterArt.appearances.punk, chicks: 2, friends: 3, requirement: "2 pintinhos + 3 amigos" },
    { id: "astronaut", ...CharacterArt.appearances.astronaut, chicks: 4, friends: 6, requirement: "4 pintinhos + 6 amigos" },
    { id: "robocop", ...CharacterArt.appearances.robocop, chicks: 6, friends: 9, requirement: "6 pintinhos + 9 amigos" },
    { id: "priest", ...CharacterArt.appearances.priest, chicks: 6, friends: 10, requirement: "A turma inteira a salvo" },
    { id: "goose", ...CharacterArt.appearances.goose, chicks: 0, friends: 0, challenge: "lake", requirement: "Vença Panto no lago" },
  ]);
  let profile = null;
  let storageAvailable = true;
  function load() {
    if (profile) return profile;
    profile = { version: 2, best: 0, selected: "classic", unlocked: ["classic"] };
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (saved && Number.isInteger(saved.best)) profile.best = Math.max(0, Math.min(6, saved.best));
      if (saved?.version === 2 && Array.isArray(saved.unlocked)) {
        profile.unlocked = catalog.filter(s => s.id === "classic" || saved.unlocked.includes(s.id)).map(s => s.id);
      } else if (saved && saved.version == null) {
        const legacy = { classic: 0, punk: 1, astronaut: 2, robocop: 4, priest: 6 };
        profile.unlocked = catalog.filter(s => legacy[s.id] <= profile.best).map(s => s.id);
      }
      if (profile.unlocked.includes(saved?.selected)) profile.selected = saved.selected;
    } catch (_) { storageAvailable = false; }
    return profile;
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(load())); storageAvailable = true; }
    catch (_) { storageAvailable = false; }
  }
  function unlocked(id) { return load().unlocked.includes(id); }
  function initialize(game) { game.entities.chicken.skin = load().selected; }
  function record(game, announce = true) {
    const previous = load().best;
    profile.best = Math.max(previous, Math.min(6, game.rescuedChicks || 0));
    const gained = catalog.filter(s => !s.challenge && !unlocked(s.id) && s.chicks <= game.rescuedChicks && s.friends <= game.rescuedCount);
    for (const skin of gained) profile.unlocked.push(skin.id);
    if (announce && gained.length) game.skinNotice = { text: gained.map(s => s.name).join(" / "), time: 5 };
    if (gained.length || profile.best !== previous) persist();
  }
  function unlockLake(game, announce = true) {
    load();
    if (unlocked('goose')) return false;
    profile.unlocked.push('goose'); persist();
    if (announce) game.skinNotice = { text: 'Panto', time: 6 };
    return true;
  }
  function equip(game, id) {
    if (!unlocked(id)) return false;
    profile.selected = id;
    game.entities.chicken.skin = id;
    persist();
    return true;
  }
  return { catalog, initialize, record, equip, unlocked, unlockLake, get best() { return load().best; },
    get storageAvailable() { return storageAvailable; } };
})();
