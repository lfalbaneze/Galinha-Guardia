/* Cosmetics persist across adventures; they never change movement or collision. */
const SkinSystem = (() => {
  const KEY = "galinha-guardia-wardrobe-v1";
  const catalog = Object.freeze([
    { id: "classic", name: "Clássica", chicks: 0 },
    { id: "punk", name: "Punk", chicks: 1 },
    { id: "astronaut", name: "Astronauta", chicks: 2 },
    { id: "robocop", name: "Robocop", chicks: 4 },
    { id: "priest", name: "Padre", chicks: 6 },
  ]);
  let profile = null;
  let storageAvailable = true;
  function load() {
    if (profile) return profile;
    profile = { best: 0, selected: "classic" };
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (saved && Number.isInteger(saved.best)) profile.best = Math.max(0, Math.min(6, saved.best));
      if (catalog.some(s => s.id === saved?.selected && s.chicks <= profile.best)) profile.selected = saved.selected;
    } catch (_) { storageAvailable = false; }
    return profile;
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(load())); storageAvailable = true; }
    catch (_) { storageAvailable = false; }
  }
  function unlocked(id) { return catalog.some(s => s.id === id && s.chicks <= load().best); }
  function initialize(game) { game.entities.chicken.skin = load().selected; }
  function record(game, announce = true) {
    const previous = load().best;
    profile.best = Math.max(previous, Math.min(6, game.rescuedChicks || 0));
    if (profile.best === previous) return;
    const gained = catalog.filter(s => s.chicks > previous && s.chicks <= profile.best);
    if (announce && gained.length) game.skinNotice = { text: gained.map(s => s.name).join(" / "), time: 5 };
    persist();
  }
  function equip(game, id) {
    if (!unlocked(id)) return false;
    profile.selected = id;
    game.entities.chicken.skin = id;
    persist();
    return true;
  }
  return { catalog, initialize, record, equip, unlocked, get best() { return load().best; },
    get storageAvailable() { return storageAvailable; } };
})();
