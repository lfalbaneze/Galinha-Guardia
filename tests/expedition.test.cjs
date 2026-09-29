const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
function fixture(active=true){
  let randomCalls=0,saves=0;
  const chicken={x:100,y:100,speed:300,hitbox:{ox:0,oy:0,r:16},stamina:1,staminaDelay:0,exhausted:false,invulnerable:0,anim:0,direction:'right',hidden:false,hideBlend:0};
  const wolf={x:100,y:100,hitbox:{ox:0,oy:0,r:21},pauseTimer:0,huntUnlockTimer:0,mode:'chase'};
  const game={phase:'playing',worldSeed:52,rescuedCount:0,rescuedChicks:0,lives:3,score:100,difficultyKey:'normal',settings:{chickenSpeed:300},entities:{chicken,wolf,animals:[],chicks:[]}};
  const context=vm.createContext({console,game,window:{location:{search:active?'?modo=expedicao':''}},Math:Object.assign(Object.create(Math),{random:()=>{randomCalls++;return .25;}}),input:new Set(),
    SkinSystem:{power:()=>({landSpeed:1,sprintDuration:1,sneakSpeed:.5})},SwimmingSystem:{profile:()=>({depth:0})},EnvironmentSystem:{movementScale:()=>1,update(){}},
    CharacterArt:{advance:(a,s,d)=>a+d},HidingSpots:{update(){}},ThorSystem:{active:()=>false},LakeChallenge:{blocksWolf:()=>false},SunflowerSystem:{canCatch:()=>true},
    FarmRefuge:{contains:()=>false},WolfAI:{canCatchHidden:()=>false},AudioSystem:{playPlayerHurt(){}},GameManager:{save(){saves++;}},
    DetectionSystem:{hasLineOfSight:()=>true},getHitbox:e=>({...e,r:e.hitbox.r}),circleVsCircle:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)<a.hitbox.r+b.hitbox.r,
    resolveEnvironment(e){e.x=Math.min(400,Math.max(16,e.x));e.y=Math.min(400,Math.max(16,e.y));return true;},
    spawnBurst(){},setStatus(){},refreshHud(){},finishLose(){game.phase='lose';},SCORE_PENALTY_LOSS:40});
  const run=s=>vm.runInContext(s,context);
  for(const f of ['systems/expedition-system.js','systems/player.js'])run(fs.readFileSync(path.join(root,f),'utf8'));
  run('ExpeditionSystem.initialize(game)');
  return {game,chicken,wolf,context,run,get randomCalls(){return randomCalls;},get saves(){return saves;}};
}
function own(h,id){h.game.expedition.offered=[id,...Object.keys(h.run('ExpeditionSystem.cards')).filter(k=>k!==id).slice(0,2)];assert.equal(h.run(`ExpeditionSystem.choose(game,${JSON.stringify(id)})`),true);}
test('classic mode has no draft, modifier, save-key change or added expedition state',()=>{
 const h=fixture(false);assert.equal(h.game.expedition,undefined);assert.equal(h.run('ExpeditionSystem.ensureDraft(game)'),false);
 assert.equal(h.run('ExpeditionSystem.saveKey()'),'galinha-guardia-save-v1');assert.equal(JSON.stringify(h.run('ExpeditionSystem.modifiers(game)')),JSON.stringify({speed:1,sprint:1,recovery:1,sneak:1,hurtGrace:0}));
 h.run("input.add('d');Player.update(game,.1)");assert.equal(h.chicken.x,130);
});
test('initial, four-rescue and eight-rescue milestones each offer exactly one choice',()=>{
 const h=fixture();for(const count of [0,4,8]){
 h.game.rescuedCount=count;assert.equal(h.run('ExpeditionSystem.ensureDraft(game)'),true);
 const offered=[...h.game.expedition.offered];assert.equal(new Set(offered).size,3);assert.ok(offered.every(x=>!h.game.expedition.owned.includes(x)));
 assert.equal(h.run(`ExpeditionSystem.choose(game,'${offered[0]}')`),true);assert.equal(h.run('ExpeditionSystem.ensureDraft(game)'),false);
 }
 assert.equal(h.game.expedition.owned.length,3);h.game.rescuedCount=12;assert.equal(h.run('ExpeditionSystem.ensureDraft(game)'),false);
});
test('a held/repeated selection and arbitrary card ID cannot award extra abilities',()=>{
 const h=fixture();h.run('ExpeditionSystem.ensureDraft(game)');const id=h.game.expedition.offered[0];
 assert.equal(h.run("ExpeditionSystem.choose(game,'inventada')"),false);assert.equal(h.run(`ExpeditionSystem.choose(game,'${id}')`),true);
 assert.equal(h.run(`ExpeditionSystem.choose(game,'${id}')`),false);assert.equal(h.game.expedition.owned.length,1);
});
test('each draft gets one persistent reroll which changes at least one offer',()=>{
 const h=fixture();h.run('ExpeditionSystem.ensureDraft(game)');const old=[...h.game.expedition.offered];
 assert.equal(h.run('ExpeditionSystem.reroll(game)'),true);assert.ok(h.game.expedition.offered.some(x=>!old.includes(x)));assert.equal(h.run('ExpeditionSystem.reroll(game)'),false);
 const saved=h.run('ExpeditionSystem.snapshot(game)');h.context.saved=saved;h.run('ExpeditionSystem.restore(game,saved)');
 assert.deepEqual([...h.game.expedition.offered],[...saved.offered]);assert.equal(h.game.expedition.rerolls,0);
});
test('draft randomness is isolated from world generation and deterministic for a given run',()=>{
 const a=fixture(),b=fixture();a.run('ExpeditionSystem.ensureDraft(game)');b.run('ExpeditionSystem.ensureDraft(game)');
 assert.deepEqual([...a.game.expedition.offered],[...b.game.expedition.offered]);assert.equal(a.randomCalls,0);
});
test('healing never appears at full health, restores one heart and is not replayed on load',()=>{
 const h=fixture();h.run('ExpeditionSystem.ensureDraft(game)');assert.ok(!h.game.expedition.offered.includes('lanche'));
 h.game.lives=1;own(h,'lanche');assert.equal(h.game.lives,2);h.context.saved=h.run('ExpeditionSystem.snapshot(game)');h.run('ExpeditionSystem.restore(game,saved)');assert.equal(h.game.lives,2);
});
test('Panto encounter, Thor cinematic, menus, defeats and celebrations do not open drafts',()=>{
 const h=fixture();for(const phase of ['menu','lose','win_cutscene','won']){h.game.phase=phase;assert.equal(h.run('ExpeditionSystem.ensureDraft(game)'),false);}
 h.game.phase='playing';h.game.lake={active:true};assert.equal(h.run('ExpeditionSystem.ensureDraft(game)'),false);
 h.game.lake.active=false;h.context.ThorSystem.active=()=>true;assert.equal(h.run('ExpeditionSystem.ensureDraft(game)'),false);
});
test('movement ability changes real displacement while preserving collision resolution',()=>{
 const h=fixture();own(h,'vento');h.run("input.add('d');Player.update(game,.1)");assert.ok(Math.abs(h.chicken.x-133)<1e-9);
 h.chicken.x=399;h.run('Player.update(game,.1)');assert.equal(h.chicken.x,400);
});
test('sprint, recovery and sneak cards affect their actual Player update paths',()=>{
 const a=fixture(),b=fixture();own(b,'folego');
 for(const h of [a,b])h.run("input.add('d');input.add('shift');Player.update(game,.1)");assert.ok(b.chicken.stamina>a.chicken.stamina);
 const c=fixture();own(c,'respiro');c.chicken.stamina=0;c.run('Player.update(game,.1)');assert.ok(Math.abs(c.chicken.stamina-.0392)<1e-10);
 const d=fixture();own(d,'mansinho');d.run("input.add('d');input.add('c');Player.update(game,.1)");assert.equal(d.chicken.x,118.75);
});
test('rescue energy is bounded and does not change health, score or rescue counters',()=>{
 const h=fixture();own(h,'resgate');h.chicken.stamina=.2;h.run('ExpeditionSystem.onRescue(game)');assert.ok(Math.abs(h.chicken.stamina-.6)<1e-10);
 h.run('ExpeditionSystem.onRescue(game);ExpeditionSystem.onRescue(game)');assert.equal(h.chicken.stamina,1);assert.equal(h.game.score,100);assert.equal(h.game.rescuedCount,0);
});
test('shell protects exactly one real wolf collision and cannot recharge on reload',()=>{
 const h=fixture();own(h,'casca');assert.equal(h.run('Player.checkCatch(game)'),false);assert.equal(h.game.lives,3);assert.equal(h.game.expedition.shield,false);assert.ok(h.saves>0);
 h.context.saved=h.run('ExpeditionSystem.snapshot(game)');h.run('ExpeditionSystem.restore(game,saved)');h.chicken.invulnerable=0;h.wolf.pauseTimer=0;
 assert.equal(h.run('Player.checkCatch(game)'),true);assert.equal(h.game.lives,2);
});
test('curral and existing protection are checked before consuming the shell',()=>{
 const h=fixture();own(h,'casca');h.context.FarmRefuge.contains=()=>true;assert.equal(h.run('Player.checkCatch(game)'),false);assert.equal(h.game.expedition.shield,true);
});
test('steel feathers extend the real post-hit immunity but never prevent the hit',()=>{
 const h=fixture();own(h,'sanguefrio');assert.equal(h.run('Player.checkCatch(game)'),true);assert.equal(h.game.lives,2);assert.equal(h.chicken.invulnerable,4);
});
test('malformed saves cannot grant unknown/duplicate perks or an unearned shield',()=>{
 const h=fixture();h.context.saved={version:1,seed:-1,owned:['casca','casca','hacked','vento','respiro'],offered:['foo'],rerolls:900,shield:true};h.run('ExpeditionSystem.restore(game,saved)');
 assert.deepEqual([...h.game.expedition.owned],['casca']);assert.equal(h.game.expedition.offered.length,0);assert.ok(h.game.expedition.seed>=0);
 h.context.saved={version:1,owned:['vento'],shield:true};h.run('ExpeditionSystem.restore(game,saved)');assert.equal(h.game.expedition.shield,false);
});
test('old classic saves ignore expedition metadata and expedition saves use another slot',()=>{
 const h=fixture(false);h.context.saved={version:1,owned:['vento']};h.run('ExpeditionSystem.restore(game,saved)');assert.equal(h.game.expedition,undefined);
 h.context.window.location.search='?modo=expedicao';assert.equal(h.run('ExpeditionSystem.saveKey()'),'galinha-guardia-expedition-v1');
});
test('saved snapshots do not share arrays with the live run',()=>{
 const h=fixture();h.run('ExpeditionSystem.ensureDraft(game)');const copy=h.run('ExpeditionSystem.snapshot(game)');copy.offered.length=0;assert.equal(h.game.expedition.offered.length,3);
});
test('game loop gates simulation and input, and manager round-trips expedition state',()=>{
 const game=fs.readFileSync(path.join(root,'game.js'),'utf8'),manager=fs.readFileSync(path.join(root,'src/systems/game-manager.ts'),'utf8');
 assert.ok(game.indexOf('ExpeditionUI.gate(state)')<game.indexOf('GameManager.update(state, dt)'));
 assert.match(game,/ExpeditionUI\.blocking\(state\)\) ExpeditionUI\.poll/);
 assert.match(manager,/ExpeditionSystem\.snapshot\(game\)/);assert.match(manager,/ExpeditionSystem\.restore\(game, data\.expedition\)/);
 assert.match(manager,/localStorage\.setItem\(saveKey\(\)/);assert.match(manager,/localStorage\.getItem\(saveKey\(\)/);
});

test('the real GameManager keeps classic and expedition saves and clearing isolated',()=>{
 const h=fixture(),storage=new Map();
 h.context.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
 h.context.WORLD={width:2800,height:1800,targetRescues:12,targetChicks:6};h.context.MAX_LIVES=3;h.context.DIFFICULTIES={normal:{}};
 for(const name of ['GooseSystem','FoxSystem','OwlSystem'])h.context[name]={snapshot:()=>undefined};
 h.context.ThorSystem.snapshot=()=>undefined;h.context.LakeChallenge.snapshot=()=>undefined;
 Object.assign(h.game,{worldVersion:7,rescuedIds:new Set(),rescuedChickIds:new Set(),timeRemaining:null,chickCombo:{count:0,remaining:0},elapsed:0});
 h.game.entities.animals=Array.from({length:12},(_,i)=>({id:`animal_${i}`,x:500+i,y:500}));
 h.game.entities.chicks=Array.from({length:6},(_,i)=>({id:`chick_${i}`,x:600+i,y:600}));
 h.run(fs.readFileSync(path.join(root,'systems/game-manager.js'),'utf8'));
 storage.set('galinha-guardia-save-v1','classic-sentinel');
 h.run('ExpeditionSystem.ensureDraft(game);GameManager.save(game)');
 assert.equal(storage.get('galinha-guardia-save-v1'),'classic-sentinel');
 const loaded=h.run('GameManager.read()');assert.ok(loaded);assert.deepEqual([...loaded.expedition.offered],[...h.game.expedition.offered]);
 h.run('GameManager.clear()');assert.equal(storage.has('galinha-guardia-expedition-v1'),false);assert.equal(storage.get('galinha-guardia-save-v1'),'classic-sentinel');
 h.context.window.location.search='';h.run('ExpeditionSystem.initialize(game);GameManager.save(game)');
 assert.ok(h.run('GameManager.read()'));assert.equal(h.run('GameManager.read().expedition'),undefined);assert.equal(storage.has('galinha-guardia-expedition-v1'),false);
});
