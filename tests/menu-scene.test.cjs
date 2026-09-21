const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

function menu(options, random = () => .5) {
  const game = createGame(random, options);
  game.run(`GameUI.showMenu(state);
    const sceneContext=document.getElementById('menuScene').getContext('2d');
    const sceneDraws=[], scenePositions=[];
    sceneContext.drawImage=(...args)=>sceneDraws.push(args);
    sceneContext.translate=(...args)=>scenePositions.push(args);
    CharacterArt.install(src=>({src}));
    const snapshot=JSON.stringify(state);`);
  game.elements.get('menuScene').getBoundingClientRect = () => ({ left: 0, top: 0, width: 1360, height: 730 });
  game.elements.get('menuCard').getBoundingClientRect = () => ({ left: 940, top: 50, width: 390, height: 620 });
  game.elements.get('menuScreen').getBoundingClientRect = () => ({ left: 0, top: 0, width: 1360, height: 730 });
  return game;
}

test('fresh page loads vary guests, positions and headings while the same page keeps its cast and saved game',()=>{
 const casts=[],placements=[],headings=[];
 for(const seed of [17,42,93]){
  let rng=seed;const h=menu({reducedMotion:true},()=>((rng=(Math.imul(rng,1664525)+1013904223)>>>0)/4294967296));
  h.run(`const drawnCast=[];let origin;
   sceneContext.translate=(x,y)=>{origin={x,y}};
   sceneContext.drawImage=(image,sx,sy)=>{
    const [name,data]=Object.entries(SpriteData).find(([name,data])=>data.source===image.src);
    const direction=Object.entries(data.actions.idle).find(([dir,pose])=>pose.frames[0].x===sx&&pose.frames[0].y===sy)?.[0];
    drawnCast.push({name,...origin,direction});};
   InterfaceMotion.frame(state,0);`);
  const cast=h.run('drawnCast.slice(-6)');
  assert.equal(new Set(cast.map(a=>a.name)).size,6);assert.ok(cast.some(a=>a.name==='chicken'));
  assert.ok(cast.filter(a=>['cow','horse','donkey'].includes(a.name)).length<=1);
  casts.push(cast.map(a=>a.name).sort().join(','));placements.push(JSON.stringify(cast.map(a=>[a.x,a.y])));headings.push(cast.map(a=>a.direction).join(','));
  h.events.window.resize();h.run('InterfaceMotion.frame(state,0);');
  assert.equal(h.run('JSON.stringify(drawnCast.slice(-6))'),JSON.stringify(cast));
  assert.equal(h.run('JSON.stringify(state)===snapshot'),true);
 }
 assert.ok(new Set(casts).size>1);assert.ok(new Set(placements).size>1);assert.ok(new Set(headings).size>1);
});

test('farm menu animates its own herd while saved animals, chicks, map, clock and audio stay paused', () => {
  const { run, elements, storage, events } = menu();
  const beforeStorage = [...storage];
  run('InterfaceMotion.frame(state,.05);');
  assert.equal(elements.get('gameShell').dataset.phase, 'menu');
  assert.equal(run('sceneDraws.length'), 6);
  const first = run('JSON.stringify(scenePositions)');
  run('for(let i=0;i<29;i++)InterfaceMotion.frame(state,.05);scenePositions.length=0;InterfaceMotion.frame(state,.05);');
  assert.notEqual(run('JSON.stringify(scenePositions)'), first);
  events.elements.menuScatter.click();
  assert.ok(elements.get('menuBanter').textContent.length > 0);
  run('for(let i=0;i<70;i++)InterfaceMotion.frame(state,.05);');
  assert.equal(run('JSON.stringify(state)===snapshot'), true);
  assert.deepEqual([...storage], beforeStorage);
  assert.equal(elements.get('chickCounter').hidden, false);
  assert.equal(run('sceneDraws.some(args=>args[0].src.includes("Chick_"))'), false);
  events.elements.continueBtn.click();
  assert.equal(elements.get('gameShell').dataset.phase, 'playing');
  run('const beforePlay=sceneDraws.length;for(let i=0;i<20;i++)InterfaceMotion.frame(state,.05);');
  assert.equal(run('sceneDraws.length===beforePlay'), true);
});

test('reduced motion freezes the farm and parallax but keeps the fun button and appearance changes usable', () => {
  const { run, events, elements } = menu({ reducedMotion: true });
  run('for(let i=0;i<60;i++)InterfaceMotion.frame(state,.05);');
  assert.equal(run('sceneDraws.length'), 6);
  const before = elements.get('menuWorld').style.transform;
  events.elements.menuScreen.pointermove({ clientX: 120, clientY: 30 });
  assert.equal(elements.get('menuWorld').style.transform, before);
  events.elements.menuScatter.click();
  run('InterfaceMotion.frame(state,.05);const count=sceneDraws.length;for(let i=0;i<60;i++)InterfaceMotion.frame(state,.05);');
  assert.equal(run('sceneDraws.length===count'), true);
  run('state.entities.chicken.skin="punk";InterfaceMotion.frame(state,.05);');
  assert.equal(run('sceneDraws.length'), 18);
  events.media.change({ matches: false });
  run('InterfaceMotion.frame(state,.05);');
  events.elements.menuScreen.pointermove({ clientX: 120, clientY: 30 });
  assert.match(elements.get('menuWorld').style.transform, /translate\(/);
  assert.equal(run('document.getElementById("menuBackdrop").style.transform'), undefined, 'background cannot drift independently of the herd');
  events.media.change({ matches: true });
  run('InterfaceMotion.frame(state,.05);');
  assert.equal(elements.get('menuWorld').style.transform, 'scale(1.025)');
});

test('every route stays on the painted dirt through wandering, commotion and responsive cropping', async () => {
  const { createCanvas, loadImage } = require('@napi-rs/canvas');
  const image = await loadImage(require('node:path').join(__dirname, '../assets/menu/farm-title.png'));
  const terrain = createCanvas(image.width, image.height).getContext('2d'); terrain.drawImage(image, 0, 0);
  const pixels = terrain.getImageData(0, 0, image.width, image.height).data;
  const h = menu();
  h.run(`let drawDepth=0, gotOrigin=false; const feet=[];
    sceneContext.save=()=>{drawDepth++;if(drawDepth===1)gotOrigin=false;};sceneContext.restore=()=>drawDepth--;
    sceneContext.translate=(x,y)=>{if(drawDepth===1&&!gotOrigin){feet.push({x,y});gotOrigin=true;}};
    sceneContext.scale=(x,y)=>{if(drawDepth===1)feet.at(-1).scale=x;};`);
  for (const [width, height] of [[1360,730],[1000,900],[360,540],[960,540]]) {
    const canvas = h.elements.get('menuScene');
    // Bounding rect includes the parent zoom; client size must drive projection.
    canvas.clientWidth = width; canvas.clientHeight = height;
    canvas.getBoundingClientRect = () => ({ width: width * 1.025, height: height * 1.025 });
    h.events.window.resize();
    h.run('feet.length=0;for(let i=0;i<2400;i++)MenuScene.frame(state,.05,false);');
    h.events.elements.menuScatter.click();
    h.run('for(let i=0;i<300;i++)MenuScene.frame(state,.05,false);');
    const cover = Math.max(width / image.width, height / image.height) * 1.12;
    const left = (width - image.width * cover) * .42, top = height - image.height * cover;
    const calls = h.run('feet');
    assert.ok(calls.length > 6000);
    for (let i = 0; i < calls.length; i++) {
      const point = calls[i], x = Math.round((point.x - left) / cover), y = Math.round((point.y + 14 * point.scale - top) / cover);
      let dirt = 0;
      // Sample the feet and their clearance in the actual artwork, not the route data.
      for (const dx of [-12,0,12]) for (const dy of [-6,0,6]) {
        const offset = ((y + dy) * image.width + x + dx) * 4;
        const [r,g,b] = pixels.slice(offset, offset + 3);
        if (r > g * 1.13 && g > b * 1.18) dirt++;
      }
      assert.ok(dirt >= 7, `feet left the dirt at ${x},${y} in ${width}×${height}`);
      if (i % 6) assert.ok(point.y + 14 * point.scale >= calls[i-1].y + 14 * calls[i-1].scale, 'nearer animals must draw last');
    }
    assert.equal(canvas.width, width);
  }
});

function audibleMenu(options = {}) {
  const players = [], plays = [];
  class MockAudio {
    constructor(src) { this.src = src; this.paused = true; this.currentTime = 0; players.push(this); }
    play() { this.paused = false; plays.push({ src: this.src, loop: this.loop, volume: this.volume }); return Promise.resolve(); }
    pause() { this.paused = true; }
  }
  const h = menu({ ...options, Audio: MockAudio });
  h.run(`const hops=[];sceneContext.translate=(x,y)=>{if(x===0&&y<0)hops.push(-y);};InterfaceMotion.frame(state,0);`);
  return { ...h, players, plays };
}

test('the button starts a somersault, a joke and a reply, with grounded shadows and no save changes', () => {
  const h = audibleMenu();
  assert.equal(h.plays.length, 0, 'no menu autoplay');
  h.events.elements.menuScatter.click();
  assert.match(h.plays[0].src, /voices\/v5\/animal-chicken\.wav$/);
  assert.equal(h.plays[0].loop, false);
  assert.equal(h.elements.get('menuBanter').hidden, false);
  assert.match(h.elements.get('menuBanter').textContent, /Erina/);
  h.run('for(let i=0;i<16;i++)InterfaceMotion.frame(state,.05);');
  assert.ok(h.run('Math.max(...hops)') > 30, 'visible jump, with shadow still on the route');
  assert.ok(Number.parseFloat(h.elements.get('menuBanter').style.left) > 350);
  h.run('for(let i=0;i<48;i++)InterfaceMotion.frame(state,.05);');
  assert.match(h.elements.get('menuBanter').textContent, /Dez na coragem. Dois no pouso!/);
  assert.doesNotMatch(h.elements.get('menuBanter').textContent, /^Erina/);
  assert.equal(h.plays.length, 1, 'one explicit animal call, no automatic audio chatter');
  h.run('for(let i=0;i<68;i++)InterfaceMotion.frame(state,.05);hops.length=0;InterfaceMotion.frame(state,.05);');
  assert.ok(h.run('hops.every(height => height <= 4)'), 'lands; only the rabbit keeps its small walking hops');
  assert.equal(h.elements.get('menuBanter').hidden, true);
  assert.equal(h.run('JSON.stringify(state)===snapshot'), true);
  h.events.elements.menuScatter.click();
  assert.ok(h.plays.at(-1).src.includes('animal-'+h.elements.get('menuBanter').dataset.speaker));
  assert.doesNotMatch(h.elements.get('menuBanter').textContent, /^Erina/);
});

test('menu reactions follow the equipped appearance and rapid clicks reuse one audio voice', () => {
  const h = audibleMenu(); h.run('state.entities.chicken.skin="robocop";InterfaceMotion.frame(state,.05);');
  h.events.elements.menuScatter.click();
  assert.match(h.plays.at(-1).src, /animal-cat\.wav$/);
  assert.match(h.elements.get('menuBanter').textContent, /Stella · Miau!/);
  for (let i = 0; i < 18; i++) h.events.elements.menuScatter.click();
  assert.equal(h.players.length, 1);
  assert.ok(h.plays.every(play => !play.loop));
  h.events.elements.continueBtn.click();
  assert.equal(h.players[0].paused, true, 'menu voice stops when gameplay resumes');
});

test('every playable appearance introduces itself by name and uses its animal call in the menu', () => {
  const appearances = [
    ['classic','Erina','Có-có-có!','animal-chicken'],
    ['silkie','Midori','Có-có-có!','animal-chicken'],
    ['blue','Alzira','Có-có-có!','animal-chicken'],
    ['punk','Zeca','Quá-quá!','animal-duck'],
    ['astronaut','Pipoca','Croc-croc!','animal-rabbit'],
    ['robocop','Stella','Miau!','animal-cat'],
    ['priest','Paçoca','Au-au!','animal-dog'],
    ['goose','Gumercindo','Honk-honk!','goose-honk'],
  ];
  for (const [skin,name,call,audio] of appearances) {
    const h = audibleMenu();
    h.run(`state.entities.chicken.skin='${skin}';InterfaceMotion.frame(state,.05);`);
    h.events.elements.menuScatter.click();
    const [introduction,joke] = h.elements.get('menuBanter').textContent.split('\n');
    assert.equal(introduction, `${name} · ${call}`, skin);
    assert.ok(joke.length > 10, `${skin} has a proper joke`);
    assert.equal(h.plays.length, 1, `${skin} plays its voice`);
    assert.ok(h.plays[0].src.endsWith(`/${audio}.wav`), skin);
    assert.equal(h.run('state.phase'), 'menu');
  }
});

test('muting keeps the jump, reduced motion keeps the call, and hidden menus ignore clicks', () => {
  const muted = audibleMenu(); muted.run('AudioSystem.toggleMute();'); muted.events.elements.menuScatter.click();
  muted.run('for(let i=0;i<4;i++)InterfaceMotion.frame(state,.1);');
  assert.equal(muted.plays.length, 0); assert.ok(muted.run('hops.length') > 0);
  const reduced = audibleMenu({ reducedMotion: true }); reduced.events.elements.menuScatter.click();
  reduced.run('for(let i=0;i<132;i++)InterfaceMotion.frame(state,.05);');
  assert.equal(reduced.plays.length, 1); assert.equal(reduced.run('hops.length'), 0);
  assert.equal(reduced.elements.get('menuBanter').hidden, true);
  const hidden = audibleMenu(); hidden.events.elements.menuScatter.click();
  hidden.context.document.hidden = true; hidden.run('InterfaceMotion.frame(state,.05);');
  hidden.events.elements.menuScatter.click();
  assert.equal(hidden.plays.length, 1); assert.ok(hidden.players.every(player => player.paused));
  assert.equal(hidden.elements.get('menuBanter').hidden, true);
});

test('the button skips an animal hidden behind the menu card', () => {
  const h = audibleMenu();
  h.run(`let coveredOrigin,latestOrigin;
    sceneContext.translate=(x,y)=>{if(x>100&&y>100)latestOrigin={x,y};};
    sceneContext.drawImage=image=>{if(image.src.includes('pixellab-108/runtime/chicken-'))coveredOrigin={...latestOrigin};};
    InterfaceMotion.frame(state,.05);`);
  const chicken=h.run('coveredOrigin');
  h.elements.get('menuCard').getBoundingClientRect = () => ({ left: chicken.x-42, top: chicken.y-80, width: 84, height: 100 });
  h.events.elements.menuScatter.click();
  assert.notEqual(h.elements.get('menuBanter').dataset.speaker,'chicken');
  assert.ok(h.plays[0].src.includes('animal-'+h.elements.get('menuBanter').dataset.speaker));
});

test('walking renders each refresh and moves the same distance at 30, 60 and 144 Hz', () => {
  const destinations=[];
  for(const hz of [30,60,144]) {
    const h=menu();
    h.run(`let depth=0;const origins=[];
      sceneContext.save=()=>depth++;sceneContext.restore=()=>depth--;
      sceneContext.translate=(x,y)=>{if(depth===1)origins.push({x,y});};
      InterfaceMotion.frame(state,0);sceneDraws.length=0;`);
    h.run(`for(let i=0;i<${hz*3};i++)InterfaceMotion.frame(state,${1/hz});`);
    assert.equal(h.run('sceneDraws.length'),hz*3*6,'no throttling to 24 FPS');
    destinations.push(h.run('origins.slice(-6)'));
  }
  for(const points of destinations.slice(1))for(let i=0;i<6;i++)
    assert.ok(Math.hypot(points[i].x-destinations[0][i].x,points[i].y-destinations[0][i].y)<.4,'refresh rate must not change walking speed');
});

test('the hidden title troupe stops drawing while adventure settings are open', () => {
  const h=menu();h.run('InterfaceMotion.frame(state,.05);');
  h.events.elements.newAdventureBtn.click();
  h.run('const beforeSettings=sceneDraws.length;for(let i=0;i<60;i++)InterfaceMotion.frame(state,1/60);');
  assert.equal(h.run('sceneDraws.length===beforeSettings'),true);
  h.events.elements.menuBackBtn.click();h.run('InterfaceMotion.frame(state,.05);');
  assert.ok(h.run('sceneDraws.length>beforeSettings'));
});

test('resizing redraws a static farm at the new resolution and hidden pages do no drawing', () => {
  const { run, context, events, elements } = menu({ reducedMotion: true });
  const canvas = elements.get('menuScene');
  canvas.getBoundingClientRect = () => ({ width: 680, height: 235 });
  context.window.devicePixelRatio = 2;
  run('InterfaceMotion.frame(state,.05);');
  assert.equal(canvas.width, 1360);
  assert.equal(canvas.height, 470);
  canvas.getBoundingClientRect = () => ({ width: 330, height: 145 });
  events.window.resize();
  run('InterfaceMotion.frame(state,.05);');
  assert.equal(canvas.width, 660);
  assert.equal(canvas.height, 290);
  context.document.hidden = true;
  run('const beforeHidden=sceneDraws.length;for(let i=0;i<20;i++)InterfaceMotion.frame(state,.05);');
  assert.equal(run('sceneDraws.length===beforeHidden'), true);
  context.document.hidden = false;
  run('InterfaceMotion.frame(state,.05);');
  assert.equal(run('sceneDraws.length'), 18);
});

test('ambient duets start on their own, remain silent and leave the saved farm untouched', () => {
  const h = audibleMenu(), saved = [...h.storage];
  h.run('for(let i=0;i<120;i++)InterfaceMotion.frame(state,.05);');
  assert.equal(h.elements.get('menuBanter').hidden, false);
  assert.equal(h.elements.get('menuBanter').getAttribute('aria-live'), 'off');
  const first = h.elements.get('menuBanter').textContent;
  h.run('for(let i=0;i<62;i++)InterfaceMotion.frame(state,.05);');
  assert.notEqual(h.elements.get('menuBanter').textContent, first, 'another animal answers');
  assert.equal(h.plays.length, 0);
  assert.equal(h.run('JSON.stringify(state)===snapshot'), true);
  assert.deepEqual([...h.storage], saved);
  h.elements.get('howToPlayDialog').open = true;
  h.run('InterfaceMotion.frame(state,.05);const beforeHelp=sceneDraws.length;for(let i=0;i<180;i++)InterfaceMotion.frame(state,.05);');
  assert.equal(h.elements.get('menuBanter').hidden, true);
  assert.equal(h.run('sceneDraws.length===beforeHelp'), true);
});

test('tricks alternate, rotate through a full somersault and stop completely in reduced motion', () => {
  const h = audibleMenu();
  h.run('const rotations=[];sceneContext.rotate=angle=>rotations.push(angle);');
  h.events.elements.menuScatter.click();
  h.run('for(let i=0;i<32;i++)InterfaceMotion.frame(state,.05);');
  assert.ok(h.run('Math.max(...rotations.map(Math.abs))') > Math.PI*1.8);
  const kinds = [h.elements.get('menuBanter').dataset.trick];
  for(let i=0;i<3;i++){h.events.elements.menuScatter.click();kinds.push(h.elements.get('menuBanter').dataset.trick);}
  assert.deepEqual(kinds,['tumble','dance','jump','spin']);
  h.events.media.change({matches:true});
  h.run('InterfaceMotion.frame(state,.05);rotations.length=0;');
  h.events.elements.menuScatter.click();
  h.run('for(let i=0;i<800;i++)InterfaceMotion.frame(state,.05);');
  assert.equal(h.run('rotations.length'),0);
  assert.equal(h.elements.get('menuBanter').hidden,true,'no ambient show in reduced motion');
});

test('tapping an animal starts its joke, while drags and menu controls do not', () => {
  const h = audibleMenu();
  h.run(`let origin=null; const hitTargets=[];
    sceneContext.translate=(x,y)=>{if(x>100&&y>100)origin={x,y};};
    sceneContext.drawImage=image=>hitTargets.push({...origin,src:image.src});
    InterfaceMotion.frame(state,.05);`);
  const p = h.run('hitTargets.find(p=>p.src.includes("pixellab-108/runtime/chicken-"))');
  const event = {clientX:p.x,clientY:p.y,pointerType:'touch'};
  h.events.elements.menuScreen.pointerdown(event);
  h.events.elements.menuScreen.pointerup(event);
  assert.match(h.elements.get('menuBanter').textContent,/^Erina/);
  assert.equal(h.plays.length,1);
  h.events.elements.menuScreen.pointerdown(event);
  h.events.elements.menuScreen.pointerup({...event,clientX:p.x+30});
  assert.equal(h.plays.length,1,'scroll gesture does not replay the call');
  const control = {...event,target:{closest:()=>true}};
  h.events.elements.menuScreen.pointerdown(control);
  h.events.elements.menuScreen.pointerup(control);
  assert.equal(h.plays.length,1,'controls do not trigger a background animal');
});

test('the equipped dog fits in the title viewport and still responds with its bark', () => {
  const h=audibleMenu();
  h.context.window.innerHeight=680;h.context.window.innerWidth=1360;
  h.run(`state.entities.chicken.skin='priest';const equippedSnapshot=JSON.stringify(state);let dogOrigin=null;const dogTargets=[];
    sceneContext.translate=(x,y)=>{if(x>100&&y>100)dogOrigin={x,y};};
    sceneContext.drawImage=image=>{if(image.src.includes('pixellab-108/runtime/skin-pacoca-'))dogTargets.push({...dogOrigin});};
    InterfaceMotion.frame(state,.05);`);
  const dog=h.run('dogTargets.at(-1)');
  assert.ok(dog.y<660,'the dog stays clear of the viewport edge');
  const event={clientX:dog.x,clientY:Math.min(676,dog.y-18),pointerType:'mouse',button:0};
  h.events.elements.menuScreen.pointerdown(event);h.events.elements.menuScreen.pointerup(event);
  assert.match(h.plays.at(-1)?.src||'',/animal-dog\.wav$/);
  assert.equal(h.elements.get('menuBanter').dataset.speaker,'dog');
  h.run('InterfaceMotion.frame(state,.05)');
  assert.equal(h.elements.get('menuBanter').hidden,false,'a clipped foot must not immediately cancel the response');
  if(h.elements.get('menuBanter').style.visibility==='visible')assert.ok(Number.parseFloat(h.elements.get('menuBanter').style.top)<=670);
  else assert.equal(h.elements.get('menuBanterLink').getAttribute('d'),'','no room means no detached tail');
  assert.equal(h.run('JSON.stringify(state)===equippedSnapshot'),true);
});
