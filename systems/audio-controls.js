/* Shared controls for the game toolbar and the keyboard-accessible pause menu. */
const AudioControls = (() => {
  const groups = [];
  let initialized = false;
  let currentGame = null;
  function put(element, text) { if (element.textContent !== text) element.textContent = text; }
  function initialize() {
    if (initialized) return;
    initialized = true;
    for (const prefix of ["", "menu"]) {
      const id = suffix => `${prefix}${prefix ? suffix : suffix[0].toLowerCase() + suffix.slice(1)}`;
      const get = suffix => document.getElementById(id(suffix));
      const group = { mute: get("AudioMute"), track: get("MusicTrack"), music: get("MusicVolume"),
        effects: get("EffectsVolume"), musicValue: get("MusicValue"), effectsValue: get("EffectsValue"), status: get("AudioStatus") };
      if (!group.mute) continue;
      groups.push(group);
      group.mute.addEventListener("click", () => {
        if (AudioSystem.status.blocked && !AudioSystem.settings.muted) AudioSystem.unlock();
        else {
          AudioSystem.toggleMute();
          if (!AudioSystem.settings.muted) AudioSystem.unlock();
        }
        update();
      });
      group.track.addEventListener("change", () => { AudioSystem.setTrack(group.track.value); AudioSystem.unlock(); update(); });
      group.music.addEventListener("input", () => { AudioSystem.setMusicVolume(Number(group.music.value) / 100); update(); });
      group.effects.addEventListener("input", () => { AudioSystem.setEffectsVolume(Number(group.effects.value) / 100); update(); });
      // A release is a deliberate gesture; dragging a slider never retries playback every frame.
      for (const slider of [group.music, group.effects]) slider.addEventListener("change", () => { AudioSystem.unlock(); update(); });
    }
  }
  function update(game) {
    if (game) currentGame = game;
    const settings = AudioSystem.settings, status = AudioSystem.status;
    const menu = currentGame?.phase === "menu";
    for (const group of groups) {
      group.mute.disabled = status.unsupported;
      group.mute.setAttribute("aria-pressed", String(settings.muted));
      put(group.mute, settings.muted ? "Ativar som" : status.blocked ? "Ativar som" : "Silenciar");
      group.track.value = settings.track;
      group.music.value = String(Math.round(settings.musicVolume * 100));
      group.effects.value = String(Math.round(settings.effectsVolume * 100));
      put(group.musicValue, `${group.music.value}%`);
      put(group.effectsValue, `${group.effects.value}%`);
      for (const control of [group.track, group.music, group.effects]) control.disabled = status.unsupported;
      put(group.status, status.unsupported ? "Áudio indisponível neste navegador." : settings.muted ? "Som desligado." :
        status.blocked ? "Clique em Ativar som para tentar novamente." : !status.unlocked ? "O som começa ao iniciar a aventura." :
        menu ? "Som pausado com a aventura." : "Músicas originais e efeitos de desenho animado.");
    }
  }
  return { initialize, update };
})();
