// Compile-only assertions: these examples must never run in the browser.
function verifyGameplayContracts(game: Farm.GameState, animal: Farm.Animal, wolf: Farm.Wolf): void {
  Player.update(game, 1 / 60);
  GameManager.rescue(game, animal);
  WolfAI.findPath(wolf, { x: 100, y: 200 });
  game.phase = 'playing';
  wolf.mode = 'search';

  // @ts-expect-error A misspelled phase must be rejected.
  game.phase = 'playng';
  // @ts-expect-error Lives are numeric, not display text.
  game.lives = '3';
  // @ts-expect-error A wolf cannot be rescued as a farm animal.
  GameManager.rescue(game, wolf);
  // @ts-expect-error Both world coordinates are required.
  WolfAI.findPath(wolf, { x: 100 });
  // @ts-expect-error A timer is measured in seconds, not a string.
  Player.update(game, '16ms');
  // @ts-expect-error Unknown enemy states must be rejected.
  wolf.mode = 'teleport';
  // @ts-expect-error Farm animals do not have player stamina.
  animal.stamina = 1;

  const perception = DetectionSystem.perceive(wolf, game.entities.chicken);
  if (perception.visible) {
    const seen: Farm.Point = perception.seenPoint;
    WolfAI.findPath(wolf, seen);
  } else {
    // @ts-expect-error An unseen player has no current visual target.
    const seen: Farm.Point = perception.seenPoint;
    void seen;
  }

  const save = GameManager.read();
  // @ts-expect-error Missing or invalid storage must be handled before restore.
  GameManager.restore(game, save);
  if (save) GameManager.restore(game, save);
}
void verifyGameplayContracts;
