// Invalid states and snapshots must be rejected before publishing the browser scripts.
function checkLakeContracts(game: Farm.GameState, goose: Farm.Goose): void {
  LakeChallenge.start(game);
  LakeChallenge.cancel(game);
  LakeChallenge.restore(game, { corrupted: true }); // External data is deliberately unknown.
  goose.mode = 'notice';
  goose.mode = 'feint';
  goose.mode = 'stunned';
  goose.mode = 'defeated';
  // @ts-expect-error only known goose states are allowed
  goose.mode = 'teleport';
  // @ts-expect-error misses are numeric
  const bad: Farm.LakeSnapshot = { version: 1, active: false, completed: true, misses: 'three' };
  void bad;
  // @ts-expect-error a point alone cannot start a challenge
  LakeChallenge.start({ x: 1, y: 2 });
}
