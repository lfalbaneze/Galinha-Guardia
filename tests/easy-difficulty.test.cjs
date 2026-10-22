const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { test } = require('node:test');
const source = fs.readFileSync(path.join(__dirname, '../systems/wolf-ai.js'), 'utf8');
function harness() {
  const context = vm.createContext({
    clamp: (v, min, max) => Math.min(max, Math.max(min, v)),
    distance: (a, b) => Math.hypot(a.x-b.x, a.y-b.y),
    Player: { sprintMultiplier: 1.32 },
  });
  // Expose private decisions only inside this isolated test context.
  vm.runInContext(source.replace('return { initialize,', 'return { pursuitTarget, pursuitTactic, initialize,'), context);
  return code => vm.runInContext(code, context);
}
test('easy remains forgiving at full rescue progress and hunger', () => {
  const run = harness();
  run("var game = {difficultyKey:'easy', settings:{chickenSpeed:300,wolfMaxSpeed:160}, wolfLevel:3,rescuedCount:12,rescuedChicks:6,wolfHunger:1}; var config=WolfAI.getConfig(game);");
  assert.ok(run('config.speed <= 246'));
  assert.ok(run('config.range <= 400'));
  assert.ok(run('config.awarenessTime >= .8'));
  assert.ok(run('config.searchDuration <= 5'));
  assert.ok(run('config.searchPoints <= 2'));
  assert.ok(run('config.pursuitDuration <= 4.2'));
  assert.equal(run('config.pursuitRecovery'), 3.2);
});
test('easy pursues the observed position without cutting off the player', () => {
  const run = harness();
  run("var point={x:200,y:100}; var wolf={lastKnown:point,detected:true,seenVelocity:{x:0,y:200},pursuitEffort:2,interceptCooldown:0}; var game={difficultyKey:'easy',entities:{wolf}}; var config={pursuitDuration:4.2};");
  assert.equal(run('WolfAI.pursuitTarget(wolf,game,config) === point'), true);
  assert.equal(run('WolfAI.pursuitTactic(game,config,.016)'), false);
  assert.equal(run('wolf.interceptPhase'), undefined);
});
test('easy still becomes more challenging as animals are rescued', () => {
  const run = harness();
  run("var game={difficultyKey:'easy',settings:{chickenSpeed:300,wolfMaxSpeed:160},wolfLevel:0,rescuedCount:0,rescuedChicks:0,wolfHunger:0}; var first=WolfAI.getConfig(game); game.wolfLevel=3; game.rescuedCount=12; game.rescuedChicks=6; var last=WolfAI.getConfig(game);");
  assert.ok(run('last.speed > first.speed'));
  assert.ok(run('last.range > first.range'));
});
