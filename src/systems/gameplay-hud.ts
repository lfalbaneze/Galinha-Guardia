/* Hearts and portraits mirror the simulation; no gameplay values are modified here. */
const GameplayHud = (() => {
  let elements: Record<string, HTMLElement | null> | null = null;
  let portraitSignature = '';
  function initialize(): Record<string, HTMLElement | null> {
    if (!elements) elements = Object.fromEntries([
      'livesCard', 'livesHint', 'lifeHeart1', 'lifeHeart2', 'lifeHeart3',
      'hudPortrait', 'hudChick', 'hudWolf', 'fieldBriefing', 'fieldBriefingText', 'wolfHungerMeter', 'wolfHungerLabel', 'threatIndicator'
    ].map(id => [id, document.getElementById(id)]));
    return elements;
  }
  function setData(element: HTMLElement | null, key: string, value: boolean): void {
    if (element && element.dataset[key] !== String(value)) element.dataset[key] = String(value);
  }
  function portrait(id: string, name: string, direction: Farm.Direction, skin?: string): void {
    const element = initialize()[id] as HTMLCanvasElement | null;
    const context = element?.getContext('2d');
    const current = CharacterArt.frameFor(name, { direction, skin });
    if (!context || !element || !current) return;
    const scale = Math.min((element.width - 12) / (current.pose.width * current.scale),
      (element.height - 12) / ((current.pose.bottom - current.pose.top) * current.scale));
    context.clearRect(0, 0, element.width, element.height);
    CharacterArt.draw(context, name, element.width / 2, element.height - 6 - 14 * scale,
      { direction, scale, skin, moving: false });
  }
  function update(game: Farm.GameState): void {
    const el = initialize();
    const hunger=WolfAI.appetite(game),meter=el.wolfHungerMeter as HTMLMeterElement|null;
    if(meter) {
      meter.value=hunger.value;
      meter.setAttribute('aria-valuetext',`${hunger.label}: ${Math.round(hunger.value*100)}% de fome`);
    }
    if(el.wolfHungerLabel&&el.wolfHungerLabel.textContent!==hunger.label)el.wolfHungerLabel.textContent=hunger.label;
    if(el.threatIndicator)el.threatIndicator.dataset.hunger=String(hunger.tier);
    // Only the opening needs a briefing. Threats and rescues take visual priority.
    if (el.fieldBriefing) el.fieldBriefing.hidden = game.phase !== 'playing' || game.elapsed >= 14 ||
      game.rescuedCount > 0 || game.entities.wolf.mode !== 'patrol' || !!game.lake?.active || !!game.thorRescue;
    if (el.fieldBriefingText) {
      const text = 'Aproxime-se de mansinho e encoste para resgatar. Despiste o lobo antes de entrar nas moitas.';
      if (el.fieldBriefingText.textContent !== text) el.fieldBriefingText.textContent = text;
    }
    const lives = Math.max(0, Math.min(3, Math.floor(game.lives)));
    for (let i = 1; i <= 3; i += 1) setData(el[`lifeHeart${i}`], 'full', i <= lives);
    setData(el.livesCard, 'critical', lives === 1 && game.phase === 'playing');
    const label = lives === 0 ? 'A próxima vai dar certo' : lives === 1 ? 'Por uma pena!' : 'Cada pena conta';
    if (el.livesHint && el.livesHint.textContent !== label) el.livesHint.textContent = label;
    if (!CharacterArt.ready || game.phase === 'menu') return;
    const chicken = game.entities.chicken as Farm.Chicken & { skin?: string };
    const skin = chicken.skin || 'classic';
    if (portraitSignature === skin) return;
    portrait('hudPortrait', 'chicken', 'right', skin);
    portrait('hudChick', 'chick', 'right');
    portrait('hudWolf', 'wolf', 'left');
    portraitSignature = skin;
  }
  return { update };
})();
