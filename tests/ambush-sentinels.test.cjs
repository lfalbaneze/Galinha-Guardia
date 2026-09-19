const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createGame}=require('./helpers.cjs');
const plain=v=>JSON.parse(JSON.stringify(v));
function setup(){
 const h=createGame(()=>.5);
 h.run(`OBSTACLES=[];var f=state.entities.foxes[0],o=state.entities.owls[0],c=state.entities.chicken,w=state.entities.wolf;
  state.entities.foxes=[f];state.entities.owls=[o];camera.x=700;camera.y=500;
  Object.assign(f,{x:1000,y:800,home:{x:1000,y:800},anchor:{x:1000,y:800},target:{x:1000,y:800},mode:'hidden',cooldown:0,grace:0,bushId:null,route:[],hit:false});
  Object.assign(o,{x:1200,y:620,perch:{x:1200,y:620},heading:0,direction:'right',mode:'watch',cooldown:0,grace:0,range:250,fov:Math.PI*.65,alertTime:1.4,alertProgress:0,treeId:'none'});
  Object.assign(c,{x:1100,y:800,hidden:false,invulnerable:0});Object.assign(w,{x:2500,y:1500,mode:'patrol',huntUnlockTimer:0,pauseTimer:0});`);
 return h;
}
const step=(h,system,seconds)=>h.run(`for(let i=0;i<${Math.ceil(seconds/.05)};i++)${system}.update(state,.05)`);
function warning(h){h.run('FoxSystem.update(state,.05)');assert.equal(h.run('f.mode'),'warning');}

test('encounters use existing vegetation, avoid bonuses/refuge/lake, and do not mutate 100 seeded farms',()=>{
 const h=createGame(()=>.5);let foxCount=0,owlCount=0;
 for(const version of [1,2])for(let seed=0;seed<50;seed++){
  h.run(`resetGame(${seed},${version})`);const map=h.run('JSON.stringify(WORLD.layout)');
  const placements=h.run('JSON.stringify([state.entities.foxes.map(f=>f.home),state.entities.owls.map(o=>o.perch)])');
  assert.ok(h.run('state.entities.foxes.length<=2 && state.entities.owls.length<=2'));
  assert.ok(h.run('state.entities.foxes.every(f=>WildlifeRules.clear(f,f,f.hitbox)&&!WildlifeRules.reserved(state,f.home)&&HidingSpots.getSpots().some(s=>s.id===f.bushId&&s.type==="bush")&&!state.entities.chicks.some(c=>c.coverId===f.bushId))'));
  assert.ok(h.run('state.entities.owls.every(o=>HidingSpots.getSpots().some(s=>s.id===o.treeId&&s.type==="tree")&&!WildlifeRules.reserved(state,o.perch,100))'));
  foxCount+=h.run('state.entities.foxes.length');owlCount+=h.run('state.entities.owls.length');
  h.run('FoxSystem.initialize(state);OwlSystem.initialize(state)');
  assert.equal(h.run('JSON.stringify(WORLD.layout)'),map);
  assert.equal(h.run('JSON.stringify([state.entities.foxes.map(f=>f.home),state.entities.owls.map(o=>o.perch)])'),placements);
 }
 assert.ok(foxCount>=100);assert.ok(owlCount>=85);
});
test('fox direction is locked at the warning, and moving sideways actually dodges a completed dash',()=>{
 const h=setup();warning(h);const target=h.run('JSON.stringify(f.target)');h.run('c.x=1085;c.y=890');
 step(h,'FoxSystem',1.15);assert.equal(h.run('f.mode'),'dash');assert.equal(h.run('JSON.stringify(f.target)'),target);
 step(h,'FoxSystem',.7);assert.equal(h.run('f.mode'),'rest');assert.equal(h.run('c.invulnerable'),0);assert.equal(h.run('state.lives'),3);
 assert.ok(h.run('f.x>1100 && Math.abs(f.y-800)<.01'));
});
test('fox cannot attack before the full warning has elapsed',()=>{
 const h=setup();warning(h);step(h,'FoxSystem',.9);assert.equal(h.run('f.mode'),'warning');assert.equal(h.run('f.x'),1000);
});
test('hidden or occluded players do not trigger ambushes',()=>{
 const h=setup();h.run('c.hidden=true');step(h,'FoxSystem',2);assert.equal(h.run('f.mode'),'hidden');
 h.run('c.hidden=false;OBSTACLES=[{x:1040,y:730,w:10,h:150}]');step(h,'FoxSystem',2);assert.equal(h.run('f.mode'),'hidden');
});
test('hiding or breaking line of sight cancels an unfinished warning without retargeting',()=>{
 for(const hide of [true,false]){
  const h=setup();warning(h);h.run(hide?'c.hidden=true':'OBSTACLES=[{x:1040,y:730,w:10,h:150}]');
  step(h,'FoxSystem',1.2);assert.equal(h.run('f.mode'),'hidden');assert.equal(h.run('f.attempts'),0);
 }
});
test('fox dash takes one heart, preserves points and stamina and grants protection against the wolf',()=>{
 const h=setup();h.run('state.score=400;c.stamina=.6');warning(h);step(h,'FoxSystem',1.6);
 assert.equal(h.run('f.mode'),'rest');assert.equal(h.run('c.invulnerable'),1.2);
 assert.equal(h.run('state.lives'),2);assert.equal(h.run('state.score'),400);assert.equal(h.run('c.stamina'),.6);
 h.run('w.x=c.x;w.y=c.y');assert.equal(h.run('Player.checkCatch(state)'),false);
});
test('a fox dash stops at a thin wall and cannot contact the chicken across it',()=>{
 const h=setup();warning(h);step(h,'FoxSystem',1.15);h.run('OBSTACLES=[{x:1040,y:740,w:1,h:120}]');
 step(h,'FoxSystem',.6);assert.ok(h.run('getHitbox(f).x+f.hitbox.r<1040'));assert.equal(h.run('c.invulnerable'),0);
});
test('knockback cannot push the chicken through a fence',()=>{
 const h=setup();warning(h);step(h,'FoxSystem',1.15);h.run('OBSTACLES=[{x:1140,y:740,w:2,h:120}]');
 step(h,'FoxSystem',.5);assert.equal(h.run('c.invulnerable'),1.2);assert.ok(h.run('getHitbox(c).x+c.hitbox.r<=1140.01'));
});
test('a dash cannot hit a player who entered cover or has spawn protection',()=>{
 for(const condition of ['c.hidden=true','c.invulnerable=2']){
  const h=setup();warning(h);step(h,'FoxSystem',1.15);h.run(condition);step(h,'FoxSystem',.7);assert.equal(h.run('f.hit'),false);
 }
});
test('a returning fox stays blocked instead of teleporting through a wall',()=>{
 const h=setup();h.run("f.x=1120;f.mode='return';f.timer=0;OBSTACLES=[{x:1050,y:0,w:10,h:1800}]");
 step(h,'FoxSystem',3);assert.ok(h.run('f.x>=1075'));assert.equal(h.run('f.mode'),'return');
});
test('fox returns to its bush and waits before another attack',()=>{
 const h=setup();warning(h);h.run('c.x=1085;c.y=890');step(h,'FoxSystem',2);h.run('c.x=1500');step(h,'FoxSystem',4);
 assert.equal(h.run('f.mode'),'hidden');assert.ok(h.run('distance(f,f.home)<1'));
});
test('owl charges a visible alarm, then asks only a nearby wolf to investigate the observation',()=>{
 const h=setup();h.run('c.x=1320;c.y=620;w.x=1400;w.y=620');step(h,'OwlSystem',.6);
 assert.equal(h.run('o.mode'),'alert');assert.equal(h.run('w.mode'),'patrol');step(h,'OwlSystem',.9);
 assert.equal(h.run('o.mode'),'cooldown');assert.equal(h.run('w.mode'),'investigate');
 assert.deepEqual(plain(h.run('w.heardPoint')),{x:1320,y:620});assert.equal(h.run('w.lastKnown'),null);
 h.run('c.hidden=true;c.y=710');step(h,'OwlSystem',.5);assert.deepEqual(plain(h.run('w.heardPoint')),{x:1320,y:620});
});
test('turning behind cover, hiding, or leaving the sector cancels owl progress immediately',()=>{
 for(const escape of ['c.hidden=true','c.x=1100','OBSTACLES=[{x:1240,y:550,w:5,h:150}]']){
  const h=setup();h.run('c.x=1320;c.y=620');step(h,'OwlSystem',.6);assert.equal(h.run('o.mode'),'alert');
  h.run(escape);step(h,'OwlSystem',.05);assert.equal(h.run('o.alertProgress'),0);assert.equal(h.run('o.target'),null);
  step(h,'OwlSystem',2);assert.equal(h.run('w.mode'),'patrol');
 }
});
test('a distant wolf cannot hear an owl and an existing chase is not overwritten',()=>{
 const h=setup();h.run('c.x=1320;c.y=620');step(h,'OwlSystem',1.6);assert.equal(h.run('w.mode'),'patrol');
 h.run("o.mode='watch';o.cooldown=0;w.x=1330;w.y=620;w.mode='chase';w.lastKnown={x:1400,y:700}");
 step(h,'OwlSystem',1.6);assert.equal(h.run('w.mode'),'chase');assert.deepEqual(plain(h.run('w.lastKnown')),{x:1400,y:700});
});
test('owl cooldown and initial grace really suppress alarms',()=>{
 const h=setup();h.run('c.x=1320;c.y=620;o.cooldown=3;o.grace=2');step(h,'OwlSystem',1);
 assert.equal(h.run('o.alertProgress'),0);assert.equal(h.run('o.mode'),'watch');
});
test('new enemies and their timers freeze in menus, finales and the lake challenge',()=>{
 for(const phase of ['menu','won','lose','win_cutscene','lake']){
  const h=setup();h.run(phase==='lake'?'state.lake.active=true':`state.phase='${phase}'`);const before=h.run('JSON.stringify([f,o])');
  step(h,'FoxSystem',1);step(h,'OwlSystem',1);assert.equal(h.run('JSON.stringify([f,o])'),before);
 }
});
test('invalid frame deltas cannot poison player, animal, wolf or wildlife state',()=>{
 const h=setup();const before=h.run('JSON.stringify(state)');
 h.run('for(const dt of [NaN,Infinity,-1]){updateGame(dt);Player.update(state,dt);RescueSystem.update(state,dt);WolfAI.update(state,dt);FoxSystem.update(state,dt);OwlSystem.update(state,dt);GameManager.update(state,dt);MapManager.update(state,dt);}');
 assert.equal(h.run('JSON.stringify(state)'),before);
});
test('nonblocking decorations are ignored consistently by movement and navigation',()=>{
 const h=setup();h.run('c.x=1000;c.y=800;OBSTACLES=[{x:1020,y:740,w:50,h:150,blocking:false}];Player.move(c,100,0)');
 assert.ok(Math.abs(h.run('c.x')-1100)<1e-8);assert.ok(h.run('WildlifeRules.clear(f,{x:1120,y:800},f.hitbox)'));
});
test('save and restore preserve enemy placement/cooldowns but never resume an attack mid-warning',()=>{
 const h=createGame(()=>.5);h.run("state.entities.foxes[0].mode='dash';state.entities.foxes[0].cooldown=3;state.entities.owls[0].cooldown=4;GameManager.rescue(state,state.entities.animals[0]);GameManager.save(state);var saved=GameManager.read();var pos=JSON.stringify(state.entities.foxes.map(f=>f.home));resetGame(32);GameManager.restore(state,saved)");
 assert.equal(h.run('state.entities.foxes[0].mode'),'hidden');assert.equal(h.run('state.entities.foxes[0].cooldown'),3);assert.equal(h.run('state.entities.owls[0].cooldown'),4);
 assert.equal(h.run('state.entities.foxes[0].grace'),2);assert.equal(h.run('state.rescuedCount'),1);assert.ok(h.run('pos===JSON.stringify(state.entities.foxes.map(f=>f.home))'));
});
test('missing and malformed wildlife records do not discard an old valid adventure',()=>{
 const h=createGame(()=>.5);h.run('GameManager.rescue(state,state.entities.animals[0]);GameManager.save(state);var saved=GameManager.read()');
 for(const value of [null,'bad',[{id:'wrong',x:1e20,y:1e20,cooldown:Infinity}]]){
  h.context.bad=value;h.run('saved.foxes=bad;saved.owls=bad;GameManager.restore(state,saved)');assert.equal(h.run('state.rescuedCount'),1);assert.ok(h.run('state.entities.foxes.length>0'));
 }
});
test('wildlife cannot be rescued or accidentally increment the twelve-friend objective',()=>{
 const h=setup();assert.equal(h.run('GameManager.rescue(state,f)'),false);assert.equal(h.run('GameManager.rescue(state,o)'),false);
 assert.equal(h.run('state.entities.animals.length'),12);assert.equal(h.run('state.entities.chicks.length'),6);
});
test('hidden and distant enemies do not leak their positions onto the minimap',()=>{
 const h=setup();h.run('camera.x=0;camera.y=0');assert.equal(h.run('FoxSystem.visible(state,f)'),false);assert.equal(h.run('OwlSystem.visible(state,o)'),false);
});

test('both sprite sheets contain twelve complete frames, distinct directions and transparent margins',async()=>{
 const {loadImage,createCanvas}=require('@napi-rs/canvas');
 const game=createGame(()=>.5);
 for(const [name,api] of [['fox','FoxArt'],['owl','OwlArt']]){
  const image=await loadImage(path.join(__dirname,`../assets/sprites/sources/${name}-custom.png`));assert.equal(image.width,1086);assert.equal(image.height,1448);
  const c=createCanvas(image.width,image.height),ctx=c.getContext('2d');ctx.drawImage(image,0,0);const signatures=[];
  const frames=game.run(`${api}.frames`);assert.equal(frames.length,12);
  for(const frame of frames){
   assert.ok(frame.x>=0&&frame.y>=0&&frame.x+frame.w<=image.width&&frame.y+frame.h<=image.height);
   const data=ctx.getImageData(frame.x,frame.y,frame.w,frame.h).data;let pixels=0;for(let i=3;i<data.length;i+=4)if(data[i]>100)pixels++;
   assert.ok(pixels>10000&&pixels<frame.w*frame.h*.8);signatures.push(Buffer.from(data).toString('base64'));
   for(let x=0;x<frame.w;x++)assert.ok(data[x*4+3]<100&&data[((frame.h-1)*frame.w+x)*4+3]<100,'feet and ears are not clipped');
  }
  assert.equal(new Set(signatures).size,12);
  for(const [direction,row] of [['down',0],['left',1],['right',2],['up',3]])
   assert.equal(game.run(`${api}.frameFor({direction:'${direction}',moving:false,mode:'watch'}).row`),row);
 }
});
test('PNG load requests are shared, invalid sheets fail, retries reuse success',async()=>{
 const {loadImage}=require('@napi-rs/canvas'),context=vm.createContext({console,setTimeout,clearTimeout});
 for(const f of ['wildlife-art','fox-art','owl-art'])vm.runInContext(fs.readFileSync(path.join(__dirname,`../systems/${f}.js`),'utf8'),context);
 for(const name of ['FoxArt','OwlArt']){
  const api=vm.runInContext(name,context);let calls=0;
  const bad=()=>{calls++;return Promise.resolve({width:1,height:1});};const pending=api.load(bad);assert.equal(api.load(bad),pending);
  assert.equal(await pending,false);assert.equal(calls,1);assert.equal(api.ready,false);assert.equal(api.errors.length,1);
  assert.equal(await api.load(src=>loadImage(path.join(__dirname,'..',src))),true);assert.equal(api.errors.length,0);
  await api.load(bad);assert.equal(calls,1);
 }
});
test('renderers use decoded PNGs and restore the callers canvas state',async()=>{
 const {createCanvas,loadImage}=require('@napi-rs/canvas'),h=setup(),c=createCanvas(220,180),ctx=c.getContext('2d');
 h.context.art=ctx;h.context.foxImage=await loadImage(path.join(__dirname,'../assets/sprites/sources/fox-custom.png'));h.context.owlImage=await loadImage(path.join(__dirname,'../assets/sprites/sources/owl-custom.png'));
 h.run('FoxArt.install(()=>foxImage);OwlArt.install(()=>owlImage);f.x=60;f.y=120;f.mode="dash";o.perch={x:160,y:170}');
 ctx.globalAlpha=.6;ctx.imageSmoothingEnabled=true;const before=ctx.getTransform();
 for(const direction of ['up','down','left','right'])h.run(`f.direction='${direction}';o.direction='${direction}';FoxArt.draw(art,f,{x:0,y:0,shakeX:0,shakeY:0});OwlArt.draw(art,o,{x:0,y:0,shakeX:0,shakeY:0})`);
 assert.equal(ctx.globalAlpha,.6);assert.equal(ctx.imageSmoothingEnabled,true);assert.deepEqual(ctx.getTransform(),before);
 assert.ok(ctx.getImageData(0,0,220,180).data.some((n,i)=>i%4===3&&n));
});
test('the owl hoot is a local valid PCM file with headroom',()=>{
 const b=fs.readFileSync(path.join(__dirname,'../assets/audio/owl-hoot.wav'));assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.readUInt32LE(24),22050);
 let peak=0;for(let i=44;i<b.length;i+=2)peak=Math.max(peak,Math.abs(b.readInt16LE(i)));assert.ok(peak>1000&&peak<30000);
});
