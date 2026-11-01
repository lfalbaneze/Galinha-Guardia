const test=require('node:test'),assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
function fixture(){
  const storage=new Map([['galinha-guardia-wardrobe-v1',JSON.stringify({version:2,best:6,selected:'classic',
    unlocked:['classic','goat','turkey','owl','pony']})]]);
  const h=createGame(()=>.5,{storage});
  h.run(`var c=state.entities.chicken,w=state.entities.wolf;
    WORLD.layout={...WORLD.layout,paths:[],lanes:[],clearings:[],plots:[],habitats:[],vegetation:[],decorations:[]};
    OBSTACLES=[];Object.assign(c,{x:1000,y:986,hidden:false});EnvironmentSystem.initialize(state);`);
  return h;
}
function move(h,frames,keys=['d']){
  h.run(`input.clear();${keys.map(k=>`input.add('${k}');`).join('')}
    for(let i=0;i<${frames};i++)Player.update(state,1/60);`);
}

test('cabrito ignores mud, corn and sunflower slowdown; water and walls remain',()=>{
  const h=fixture();
  for(const surface of ['mud','corn','sunflower']){
    h.run(`WORLD.layout={...WORLD.layout,habitats:${surface==='mud'?"[{kind:'mud',x:1000,y:1000}]":"[]"},
      plots:${surface==='corn'?"[{kind:'corn',x:900,y:900,w:400,h:300}]":"[]"}};
      Object.assign(c,{x:1000,y:986});`);
    if(surface==='sunflower')h.run('WORLD.layout={...WORLD.layout,paths:[{x:700,y:600,w:20,h:1500}]};var plot=SunflowerSystem.plot();Object.assign(c,{x:plot.x+plot.w/2,y:plot.y+plot.h/2-14});');
    assert.equal(h.run('EnvironmentSystem.surfaceAt(state,{x:c.x,y:c.y+14})'),surface);
    h.run("SkinSystem.equip(state,'classic');");assert.ok(h.run('EnvironmentSystem.movementScale(state)')<1);
    h.run("SkinSystem.equip(state,'goat');");assert.equal(h.run('EnvironmentSystem.movementScale(state)'),1);
  }
  h.run('var pond=STRUCTURES.pond;Object.assign(c,{x:pond.x+pond.w/2,y:pond.y+pond.h/2-14});');
  assert.equal(h.run('SwimmingSystem.profile(state).native'),false);
  assert.equal(h.run('EnvironmentSystem.movementScale(state)'),.56);
  h.run('Object.assign(c,{x:1000,y:986});OBSTACLES=[{x:1040,y:900,w:20,h:200,type:"barn"}];');
  move(h,60);assert.ok(h.run('c.x')<1040);
});

test('peru extends post-hit protection by 35%, costs a life and cannot refill it on swapping',()=>{
  const h=fixture();h.run(`SkinSystem.equip(state,'turkey');
    Object.assign(w,{x:c.x,y:c.y,mode:'chase',huntUnlockTimer:0,pauseTimer:0,pursuitRest:0});`);
  assert.equal(h.run('Player.checkCatch(state)'),true);assert.equal(h.run('state.lives'),2);
  assert.equal(h.run('Player.checkCatch(state)'),false);
  move(h,60,[]);assert.ok(Math.abs(h.run('c.invulnerable')-(3-1/1.35))<1e-9);
  h.run("var remaining=c.invulnerable;SkinSystem.equip(state,'classic');SkinSystem.equip(state,'turkey');");
  assert.equal(h.run('c.invulnerable===remaining'),true);
  h.run("state.phase='menu';Player.update(state,1);");assert.equal(h.run('c.invulnerable===remaining'),true);
  h.run("state.phase='playing';");move(h,183,[]);
  assert.equal(h.run('c.invulnerable'),0,'protection expires after 4.05 seconds');
});

test('coruja sneaks 75% faster and quarters hearing range while remaining visible',()=>{
  const h=fixture(),distances=[];
  for(const skin of ['classic','owl']){
    h.run(`SkinSystem.equip(state,'${skin}');c.x=1000;var from=c.x;`);
    move(h,12,['d','c']);distances.push(h.run('c.x-from'));
  }
  assert.ok(Math.abs(distances[1]/distances[0]-1.75)<1e-9);
  h.run(`Object.assign(c,{x:1000,y:986,sprinting:true,vx:100,vy:0});Object.assign(w,{x:1050,y:986,heading:0});
    SkinSystem.equip(state,'classic');`);
  assert.ok(h.run('!!DetectionSystem.perceive(w,c).heardPoint'));
  h.run("SkinSystem.equip(state,'owl');");assert.equal(h.run('DetectionSystem.perceive(w,c).heardPoint'),null);
  h.run('w.x=1025;');assert.ok(h.run('!!DetectionSystem.perceive(w,c).heardPoint'));
  h.run('w.x=1150;w.heading=Math.PI;');assert.equal(h.run('DetectionSystem.perceive(w,c).visible'),true);
});

test('pônei gains 12% land speed and 5.25 seconds of sprint without refilling stamina or speeding its float',()=>{
  const h=fixture(),distances=[];
  for(const skin of ['classic','pony']){
    h.run(`SkinSystem.equip(state,'${skin}');c.x=1000;var from=c.x;`);
    move(h,12);distances.push(h.run('c.x-from'));
  }
  assert.ok(Math.abs(distances[1]/distances[0]-1.12)<1e-9);
  for(let i=0;i<3;i++)move(h,60,[i%2?'a':'d','shift']);
  assert.ok(Math.abs(h.run('c.stamina')-3/7)<1e-9);
  h.run("var remaining=c.stamina;SkinSystem.equip(state,'owl');SkinSystem.equip(state,'pony');");
  assert.equal(h.run('c.stamina===remaining'),true);
  h.run('var pond=STRUCTURES.pond;Object.assign(c,{x:pond.x+pond.w/2,y:pond.y+pond.h/2-14});var from={x:c.x,y:c.y};');
  move(h,6);assert.ok(Math.abs(h.run('distance(c,from)/(c.speed*6/60)')-.56)<1e-9);
});
