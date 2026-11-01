/* Earned appearances and their passive powers. Base stats and saves stay unchanged. */
const SkinSystem = (() => {
  const KEY = "galinha-guardia-wardrobe-v1";
  const basicPower = Object.freeze({ name: 'Coragem de galinha', description: 'Sem poder especial. O lobo que lute com a sua esperteza!',
    badge: '', landSpeed: 1, swimSpeed: 1, sneakSpeed: .4, noiseScale: 1, sprintDuration: 1, friendSpecies: null,
    terrainResistance: 0, hurtRecovery: 1 });
  const powers = Object.freeze({
    punk: Object.freeze({ ...basicPower, name: 'Pato a jato', badge: 'Pato · nado +25%', swimSpeed: 1.25,
      description: 'Nada 25% mais rápido que o ganso, sem boia. Nadadeira com motor de popa!' }),
    astronaut: Object.freeze({ ...basicPower, name: 'Pé de foguete', badge: 'Coelho · velocidade +15%', landSpeed: 1.15,
      description: 'Anda e corre 15% mais rápido em terra. As orelhas vão de carona!' }),
    robocop: Object.freeze({ ...basicPower, name: 'Passo de veludo', badge: 'Gato · passos discretos', sneakSpeed: .6, noiseScale: .5,
      description: 'Vai 50% mais rápido de mansinho. O lobo ouve seus passos pela metade da distância, mas ainda pode ver você.' }),
    priest: Object.freeze({ ...basicPower, name: 'Au-mizade', badge: 'Cachorro · au-mizade', friendSpecies: 'dog',
      description: 'Cachorros vêm até você e não fogem da sua aproximação, mesmo correndo. Se virem o lobo, aí é outra conversa!' }),
    goose: Object.freeze({ ...basicPower, name: 'Fôlego de ganso', badge: 'Ganso · fôlego +50%', sprintDuration: 1.5,
      description: 'Corre ou acelera o nado por 4,5 segundos, em vez de 3. Tem fôlego até para reclamar na chegada!' }),
    goat: Object.freeze({ ...basicPower, name: 'Trilha do cabrito', badge: 'Cabrito · terreno livre', terrainResistance: 1,
      description: 'Anda e corre sem perder velocidade na lama, no milho e nos girassóis. Água e obstáculos continuam exigindo cuidado.' }),
    turkey: Object.freeze({ ...basicPower, name: 'Peito de aço', badge: 'Peru · proteção +35%', hurtRecovery: 1.35,
      description: 'Depois de levar dano, a proteção temporária dura 35% mais. O golpe ainda tira uma vida: use esse fôlego para escapar!' }),
    owl: Object.freeze({ ...basicPower, name: 'Passos ao luar', badge: 'Coruja · passos quase inaudíveis', sneakSpeed: .7, noiseScale: .25,
      description: 'O lobo ouve seus passos a um quarto da distância. De mansinho, anda 75% mais rápido que a galinha. Continua visível e precisa respeitar os obstáculos.' }),
    pony: Object.freeze({ ...basicPower, name: 'Galope de trovão', badge: 'Pônei · velocidade e fôlego', landSpeed: 1.12, sprintDuration: 1.75,
      description: 'Anda e corre 12% mais rápido em terra e tem 5,25 segundos de corrida, em vez de 3. O fôlego extra também vale para remar de boia.' }),
  });
  function power(chicken) { return Object.hasOwn(powers, chicken.skin) ? powers[chicken.skin] : basicPower; }
  const catalog = Object.freeze([
    { id: "classic", ...CharacterArt.appearances.classic, starter: true, chicks: 0, friends: 0, requirement: "Rajadinha, mas nada discreta" },
    { id: "silkie", ...CharacterArt.appearances.silkie, starter: true, chicks: 0, friends: 0, requirement: "Um espanador com planos de fuga" },
    { id: "blue", ...CharacterArt.appearances.blue, starter: true, chicks: 0, friends: 0, requirement: "Hoje ninguém vira caldo" },
    { id: "punk", ...CharacterArt.appearances.punk, chicks: 2, friends: 3, requirement: "2 pintinhos + 3 amigos" },
    { id: "astronaut", ...CharacterArt.appearances.astronaut, chicks: 4, friends: 6, requirement: "4 pintinhos + 6 amigos" },
    { id: "robocop", ...CharacterArt.appearances.robocop, chicks: 6, friends: 9, requirement: "6 pintinhos + 9 amigos" },
    { id: "priest", ...CharacterArt.appearances.priest, chicks: 6, friends: 10, requirement: "6 pintinhos + 10 amigos" },
    { id: "goose", ...CharacterArt.appearances.goose, chicks: 0, friends: 0, challenge: "lake", requirement: "Vença o desafio de PANTO" },
    { id: "goat", ...CharacterArt.appearances.goat, chicks: 0, friends: 0, challenge: "victory", difficulty: "hard", requirement: "Vença no Difícil ou Hardcore" },
    { id: "turkey", ...CharacterArt.appearances.turkey, chicks: 6, friends: 0, challenge: "victory", difficulty: "hard", requirement: "Vença no Difícil ou Hardcore com 6 pintinhos" },
    { id: "owl", ...CharacterArt.appearances.owl, chicks: 0, friends: 0, challenge: "victory", difficulty: "hardcore", requirement: "Vença no Hardcore" },
    { id: "pony", ...CharacterArt.appearances.pony, chicks: 6, friends: 0, challenge: "victory", difficulty: "hardcore", requirement: "Vença no Hardcore com 6 pintinhos" },
  ]);
  let profile = null;
  let storageAvailable = true;
  function load() {
    if (profile) return profile;
    profile = { version: 2, best: 0, selected: "classic", unlocked: catalog.filter(s => s.starter).map(s => s.id) };
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (saved && Number.isInteger(saved.best)) profile.best = Math.max(0, Math.min(6, saved.best));
      if (saved?.version === 2 && Array.isArray(saved.unlocked)) {
        profile.unlocked = catalog.filter(s => s.starter || saved.unlocked.includes(s.id)).map(s => s.id);
      } else if (saved && saved.version == null) {
        const legacy = { classic: 0, punk: 1, astronaut: 2, robocop: 4, priest: 6 };
        profile.unlocked = catalog.filter(s => s.starter || legacy[s.id] <= profile.best).map(s => s.id);
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
    if (announce) game.skinNotice = { text: CharacterArt.appearances.goose.name, time: 6 };
    return true;
  }
  function recordVictory(game, announce = true) {
    load();
    if (!['win_cutscene','won'].includes(game.phase) || !game.winBonusApplied ||
        game.rescuedIds.size !== WORLD.targetRescues || !['hard','hardcore'].includes(game.difficultyKey)) return [];
    const gained = catalog.filter(s => s.challenge === 'victory' && !unlocked(s.id) &&
      (game.difficultyKey === s.difficulty || game.difficultyKey === 'hardcore' && s.difficulty === 'hard') &&
      game.rescuedChicks >= s.chicks);
    for (const skin of gained) profile.unlocked.push(skin.id);
    if (gained.length) {
      persist();
      if (announce) game.skinNotice = { text: [game.skinNotice?.time > 0 ? game.skinNotice.text : '', ...gained.map(s=>s.name)].filter(Boolean).join(' / '), time: 8 };
    }
    return gained.map(s=>s.id);
  }
  function equip(game, id) {
    if (!unlocked(id)) return false;
    profile.selected = id;
    game.entities.chicken.skin = id;
    persist();
    return true;
  }
  return { catalog, power, initialize, record, recordVictory, equip, unlocked, unlockLake, get best() { return load().best; },
    get storageAvailable() { return storageAvailable; } };
})();
