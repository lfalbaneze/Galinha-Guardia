const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {createGame}=require('./helpers.cjs');

test('the dog and every selected menu animal keep walking after many endpoint pauses',()=>{
  const source=fs.readFileSync('systems/menu-scene.js','utf8').replace('return { initialize, frame };','return { initialize, frame, herd, walk };');
  const ctx=vm.createContext({Player:{directionFor:()=> 'right'},CharacterArt:createGame().run('CharacterArt')});
  vm.runInContext(source,ctx);
  // Guests are randomized. Keep the original dog regression explicit, without
  // assuming that this particular page load happened to include a dog.
  const results=vm.runInContext(`(() => {
    const actors=[...MenuScene.herd,{...MenuScene.herd[5],species:'dog'}];
    return actors.map(animal=>{
      for(let i=0;i<1600;i++)MenuScene.walk(animal,.05);
      const before=animal.travel;
      for(let i=0;i<400;i++)MenuScene.walk(animal,.05);
      return {species:animal.species,travel:animal.travel-before};
    });
  })()`,ctx);
  assert.equal(results.length,7);
  for(const result of results)assert.ok(result.travel>100,`${result.species} stopped after endpoint pauses`);
});

test('trees block movement but do not offer hiding, including old saves',()=>{
  const h=createGame();
  h.run(`const tree=HidingSpots.getSpots().find(s=>s.type==='tree');
    Object.assign(state.entities.chicken,{x:tree.x+tree.w/2,y:tree.y+tree.h-18});
    HidingSpots.restore(state,{hidden:true,hidingSpotId:tree.id});`);
  assert.equal(h.run('state.entities.chicken.hidden'),false);
  assert.equal(h.run('HidingSpots.candidate(state.entities.chicken)'),null);
  assert.ok(h.run('HidingSpots.obstacles().length>0'));
});

test('owl reaction takes less than a second on every difficulty',()=>{
  const h=createGame();
  for(const mode of ['easy','normal','hard','hardcore']) {
    h.run(`state.difficultyKey='${mode}';OwlSystem.initialize(state);`);
    assert.ok(h.run('state.entities.owls.length>0&&state.entities.owls.every(o=>o.alertTime<=.9)'));
  }
});

test('title music activates on a gesture and failed clips can be retried',()=>{
  const players=[];
  class Audio {constructor(src){this.src=src;this.paused=true;players.push(this);}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}}
  const h=createGame(()=>.5,{Audio,fullStartup:true});
  h.run('AudioSystem.sync(state)');assert.equal(players.length,0);
  h.events.elements.menuAudioMute.click();
  assert.equal(h.run('AudioSystem.settings.muted'),false);
  assert.ok(players.some(p=>p.loop&&!p.paused));
  players.find(p=>p.loop).onerror();
  assert.equal(h.run('AudioSystem.status.failedClips.length'),1);
  h.run('AudioSystem.unlock()');
  assert.equal(h.run('AudioSystem.status.failedClips.length'),0);
  assert.ok(players.some(p=>p.loop&&!p.paused));
});
