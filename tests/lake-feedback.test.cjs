const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

test('the visible threat card explains that the wolf waits outside the active lake challenge', () => {
  const h = createGame(() => .5);
  h.run('state.lake.active=true;GameUI.update(state)');
  assert.equal(h.elements.get('threatText').textContent, 'O lobo espera fora do lago');
  assert.equal(h.elements.get('threatProgress').value, 0);
  h.run('state.lake.active=false;GameUI.update(state)');
  assert.notEqual(h.elements.get('threatText').textContent, 'O lobo espera fora do lago');
});

test('the defeated goose does not talk over the cosmetic unlock notice', () => {
  const h = createGame(() => .5);
  h.run(`var spoken=[];ctx.fillText=text=>spoken.push(text);
    var g=state.entities.goose,c=state.entities.chicken;
    OBSTACLES=[];g.x=1000;g.y=800;g.mode='defeated';c.x=1030;c.y=800;
    camera.x=700;camera.y=600;state.skinNotice={time:3,text:'Ganso do lago'};
    GooseSystem.drawIndicator(state);`);
  assert.equal(h.run("spoken.includes('Pode passar…')"), false);
  h.run('state.skinNotice.time=0;GooseSystem.drawIndicator(state)');
  assert.equal(h.run("spoken.includes('Pode passar…')"), true);
});
