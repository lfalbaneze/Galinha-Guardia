function verifyGooseContracts(game: Farm.GameState, goose: Farm.Goose): void {
  GooseSystem.update(game, 1 / 60);
  WolfAI.investigateSound(game, goose, 360);
  goose.mode = 'warning';
  // @ts-expect-error The resident goose is not one of the friends to rescue.
  GameManager.rescue(game, goose);
  // @ts-expect-error A territorial goose cannot use wolf pursuit states.
  goose.mode = 'chase';
  // @ts-expect-error A sound location needs both world coordinates.
  WolfAI.investigateSound(game, { x: 10 });
  // @ts-expect-error Goose timers are seconds, not strings.
  goose.timer = '1s';
}
void verifyGooseContracts;
