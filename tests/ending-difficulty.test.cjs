const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the cinematic without decoding the farm's image and audio bundles.
function scene(difficulty, reduced, width, chickCount = 6) {
  const words = [], effects = [], images = [], captions = [];
  const ctx = new Proxy({
    fillText(text,x,y,maxWidth) { words.push(text); captions.push({text,x,y,maxWidth,font:this.font}); },
    measureText(text) { return {width:text.length * (Number.parseFloat(this.font?.match(/[\d.]+px/)?.[0]) || 18) * .55}; },
    drawImage: (image, ...args) => images.push({ src: image.src, args }),
    createLinearGradient: () => ({ addColorStop() {} })
  }, { get: (target, key) => target[key] ?? (() => effects.push(key)) });
  let saves = 0;
  const context = vm.createContext({
    Image: class { complete = true; naturalWidth = 768; naturalHeight = 512; },
    ctx, canvas: { width, height: width === 600 ? 1100 : 520 },
    input: new Set(), camera: {}, InterfaceMotion: { reduced },
    clamp: (v, min, max) => Math.min(max, Math.max(min, v)),
    lerp: (a, b, t) => a + (b - a) * t,
    Player: { face() {} }, CharacterArt: { advance: () => 0, draw() {} },
    FarmSprites: { surface: () => null, draw() {} },
    GameUI: { update() {}, focusCanvas() {} },
    GameManager: { save: () => saves++ }, setStatus() {}, refreshHud() {}
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../systems/ending-scene-data.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../systems/end-game-sequence.js'), 'utf8'), context);
  vm.runInContext([
    'var game = { difficultyKey: ' + JSON.stringify(difficulty) + ', rescuedChicks: 6,',
    "entities: { chicken: {type:'chicken',skin:'classic'}, wolf: {type:'wolf'},",
    "animals: Array.from({length:12}, (_,i) => ({id:'animal_'+i,type:'animal',species:'sheep',rescued:true})),",
    'chicks: Array.from({length:' + chickCount + '}, (_,i) => ({id:"chick_"+i,type:"chick",species:"chick",rescued:true})) } };',
    'EndGameSequence.start(game);'
  ].join(''), context);
  return { run: code => vm.runInContext(code, context), words, effects, images, captions, saves: () => saves };
}

test('four ending stages are installed and captions wrap instead of squeezing words in portrait mode',()=>{
  const sources=new Set();
  for(const difficulty of ['easy','normal','hard','hardcore']){
    const h=scene(difficulty,false,600);
    h.run('game.cutscene.time=17;game.cutscene.stage="celebrate";EndGameSequence.drawBackdrop(game);EndGameSequence.drawCaption(game)');
    const background=h.images.find(image=>image.src.includes('/endings-110/'));assert.ok(background);
    sources.add(background.src);assert.ok(fs.statSync(path.resolve(__dirname,'..',background.src)).size>10000);
    for(const line of h.captions){
      assert.equal(line.maxWidth,undefined,'captions are never horizontally compressed');
      const size=Number.parseFloat(line.font.match(/[\d.]+px/)[0]);
      assert.ok(line.text.length*size*.55<=600-72);
      assert.ok(line.y>0&&line.y<1100-15);
    }
    assert.ok(h.words.some(text=>text.startsWith('EPÍLOGO · ')));
  }
  assert.equal(sources.size,4,'each difficulty has its own composed scene');
});

for (const [difficulty, performances, title, prop] of [
  ['easy', ['offer', 'sniff', 'picnic', 'toast'], 'O ALMOÇO VIROU PIQUENIQUE!', [22, 32, 20, 30]],
  ['normal', ['lesson', 'wrongstep', 'dance', 'encore'], 'AGORA O BAILE PEGOU!', null],
  ['hard', ['duty', 'cleanup', 'inspection', 'gust', 'approved'], 'O LOBO FICOU COM A FAXINA!', [84, 22, 24, 50]]
]) test(difficulty + ' has its own peaceful animated ending', () => {
  for (const reduced of [false, true]) for (const width of [900, 600]) {
    const h = scene(difficulty, reduced, width), stages = new Set(), speeches = new Set(), moods = new Set();
    for (let frame = 0; frame < 400 && h.run('game.phase') !== 'won'; frame++) {
      h.run('EndGameSequence.update(game,.05);EndGameSequence.frame(game);EndGameSequence.drawBackdrop(game);EndGameSequence.draw(game);EndGameSequence.drawCaption(game);');
      stages.add(h.run('game.cutscene.stage'));
      assert.equal(h.run('game.cutscene.cloud'), false);
      speeches.add(h.run('game.cutscene.speech'));
      moods.add(h.run('game.entities.wolf.mood'));
      assert.notEqual(h.run('game.entities.wolf.mood'), 'crying');
    }
    assert.equal(h.run('game.phase'), 'won');
    assert.deepEqual([...stages], ['arrival', 'message', ...performances, 'celebrate']);
    assert.ok(speeches.size >= 6, 'dialogue changes with the action');
    assert.ok(moods.has('happy'), 'the wolf reacts to the outcome');
    assert.ok(h.words.includes(title));
    assert.ok(!h.words.some(text => text.includes('FINAL VERDADEIRO')));
    if (prop) {
      const props=h.images.filter(image=>image.src.includes('ending-props-'));
      assert.ok(props.length > 0);
      for (const image of props) {
        assert.match(image.src, /ending-props-.*\.png$/);
        assert.equal(image.args[0], prop[0]);
        assert.equal(image.args[2], prop[2]);
        assert.ok(image.args[1] >= prop[1] && image.args[1] + image.args[3] === prop[1] + prop[3]);
        assert.deepEqual(image.args.slice(6), image.args.slice(2, 4).map(size => size * 2));
        assert.ok(image.args.every(Number.isInteger));
      }
    }
    else assert.ok(h.words.includes('♪'));
    assert.equal(h.saves(), 1);
    h.run('EndGameSequence.update(game,1)');
    assert.equal(h.saves(), 1, 'a completed scene cannot save twice');
    h.run('game.cutscene.done=false;game.cutscene.time=9.2;EndGameSequence.update(game,0);');
    const pose = h.run('EndGameSequence.pose(game,game.entities.wolf)');
    assert.equal(Object.keys(pose).length > 1, !reduced);
  }
});

test('the picnic hands over its carrot, takes a bite and lets the chicks approach', () => {
  const h = scene('easy', false, 900);
  h.run('for(let i=0;i<100;i++)EndGameSequence.update(game,.05);EndGameSequence.draw(game)');
  const offered = h.images.at(-1);
  assert.ok(Math.abs(offered.args[4] - h.run('game.entities.chicken.x')) < 30);
  h.run('for(let i=0;i<120;i++)EndGameSequence.update(game,.05);EndGameSequence.draw(game)');
  const eaten = h.images.at(-1);
  assert.ok(Math.abs(eaten.args[4] - h.run('game.entities.wolf.x')) < 30);
  assert.ok(eaten.args[3] < offered.args[3], 'the carrot actually loses a bite');
  h.run('for(let i=0;i<55;i++)EndGameSequence.update(game,.05)');
  assert.ok(h.run('game.entities.chicks[0].x>620 && game.entities.chicks[0].y>240'), 'the speaker approaches beside the wolf');
  assert.ok(h.run('game.entities.chicks.slice(1).every(c=>c.y>380)'), 'the chicks leave the back row to welcome the wolf');
});

test('the dance moves the feet of the wolf and the ensemble, and inspection sends out one chick', () => {
  const h = scene('normal', false, 900);
  h.run('for(let i=0;i<190;i++)EndGameSequence.update(game,.05);var oldX=game.entities.animals[0].x;');
  assert.equal(h.run('game.entities.wolf.moving'), true);
  h.run('for(let i=0;i<10;i++)EndGameSequence.update(game,.05)');
  assert.ok(h.run('Math.abs(game.entities.animals[0].x-oldX)') > 2);
  const duty = scene('hard', false, 900);
  duty.run('for(let i=0;i<220;i++)EndGameSequence.update(game,.05)');
  assert.ok(duty.run('game.entities.chicks[0].x>590 && game.entities.chicks[0].y>350'));
  assert.ok(duty.run('game.entities.chicks.slice(1).every(c=>c.y<160)'));
});

test('optional chicks can be absent and drawing never mutates the cinematic or the equipped appearance', () => {
  for (const difficulty of ['easy', 'normal', 'hard', 'hardcore']) {
    const h = scene(difficulty, true, 600, 0);
    h.run('game.entities.chicken.skin="silkie";for(let i=0;i<250;i++)EndGameSequence.update(game,.05);var before=JSON.stringify(game);');
    h.run('for(let i=0;i<3;i++){EndGameSequence.drawBackdrop(game);EndGameSequence.draw(game);EndGameSequence.drawCaption(game)}');
    assert.equal(h.run('JSON.stringify(game)===before'), true);
    h.run('for(let i=0;i<150;i++)EndGameSequence.update(game,.05)');
    assert.equal(h.run('game.phase'), 'won');
    assert.equal(h.run('game.entities.chicken.skin'), 'silkie');
  }
});

test('only hardcore keeps the complete true ending', () => {
  const h = scene('hardcore', false, 900), stages = new Set();
  for (let frame = 0; frame < 400 && h.run('game.phase') !== 'won'; frame++) {
    h.run('EndGameSequence.update(game,.05);EndGameSequence.draw(game);EndGameSequence.drawCaption(game);');
    stages.add(h.run('game.cutscene.stage'));
    assert.equal(h.run('game.cutscene.cloud'), h.run('game.cutscene.stage==="cloud"'));
  }
  assert.equal(h.run('game.phase'), 'won');
  assert.deepEqual([...stages], ['arrival','message','circle','rush','cloud','dizzy','flee','celebrate']);
  assert.ok(h.words.some(text => text.includes('FINAL VERDADEIRO')));
  assert.equal(h.saves(), 1);
});
