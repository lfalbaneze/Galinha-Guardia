const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture(seed = 7) {
  const body = (id, type, x, y, r = 16) => ({ id, type, x, y, radius:r, hitbox:{ox:0,oy:8,r}, vx:0,vy:0,
    facing:1,direction:'down',anim:0,moving:false,state:'idle',areaId:'poleiro' });
  const chicken = {...body('chicken','chicken',500,370),skin:'classic',hidden:false,invulnerable:0};
  const goose = {...body('pond-goose','goose',190,327,17),rescued:true,mode:'defeated',home:{x:1500,y:800},
    anchor:{x:1500,y:800},target:{x:1500,y:800},cooldown:0,timer:0,notice:0};
  const animals = [
    {...body('animal_0','animal',180,392,13),species:'pig',rescued:true,speechTime:0},
    {...body('animal_1','animal',282,401,13),species:'cow',rescued:true,speechTime:0}
  ];
  const wolf = {...body('wolf','wolf',900,900,21),mode:'patrol',speechTime:0};
  const bounds = {x:90,y:174,w:260,h:308};
  const obstacles = [
    {x:86,y:171,w:8,h:314},{x:346,y:171,w:8,h:170},{x:346,y:427,w:8,h:58},
    {x:86,y:171,w:268,h:6},{x:86,y:479,w:268,h:6},
    {x:153,y:203,w:130,h:19},{x:142,y:210,w:14,h:58},{x:270,y:208,w:39,h:62},
    {x:108,y:284,w:55,h:18}
  ];
  const state = {phase:'playing',worldSeed:seed,settings:{chickenSpeed:300},difficultyKey:'normal',
    lake:{active:false,completed:true},entities:{chicken,goose,wolf,animals,chicks:[]},
    score:1234,rescuedCount:2,lives:3,animalSpeechCooldown:0};
  const texts = [], animation = [], drawing = new Proxy({canvas:{width:900,height:620},
    measureText:s=>({width:s.length*7}),fillText:(...args)=>texts.push(args)},
    {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
  const context = vm.createContext({console,Math:Object.assign(Object.create(Math),{random(){throw Error('global RNG used');}}),
    state,chicken,goose,wolf,OBSTACLES:obstacles,WORLD:{width:2800,height:1800},
    getHitbox:a=>({x:a.x+a.hitbox.ox,y:a.y+a.hitbox.oy,r:a.hitbox.r}),
    clamp:(v,min,max)=>Math.min(max,Math.max(min,v)),distance:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),
    FarmRefuge:{bounds,gooseHome:()=>({x:190,y:327})},
    getAreaAt:()=>({id:'poleiro'}),worldToScreen:p=>({...p}),canvas:{width:900,height:620},ctx:drawing,
    sight:true,cutscene:false,
    SunflowerSystem:{concealed:()=>false},ThorSystem:{active:()=>context.cutscene},
    CharacterArt:{advance:(n,name,travel,options)=>{animation.push({name,travel,options});return n+travel/8;}},
    InterfaceMotion:{reduced:false}
  });
  for(const file of ['detection-system','player','pen-life','goose-system'])
    vm.runInContext(fs.readFileSync(path.join(__dirname,`../systems/${file}.js`),'utf8'),context);
  vm.runInContext('DetectionSystem.hasLineOfSight=()=>sight;',context);
  const run=code=>vm.runInContext(code,context);
  const tick=(count=1,dt=.05)=>{for(let i=0;i<count;i++)run(`GooseSystem.update(state,${dt});`);};
  const comment=()=>run('PenLife.current(state)');
  const collide=()=>obstacles.some(o=>Math.hypot(goose.x-Math.max(o.x,Math.min(goose.x,o.x+o.w)),
    goose.y+8-Math.max(o.y,Math.min(goose.y+8,o.y+o.h)))<17-.001);
  return {run,tick,comment,state,chicken,goose,wolf,context,bounds,obstacles,animation,texts,collide};
}

test('rescued Panto walks, pauses and animates actual travel without snapping home',()=>{
  const h=fixture(),start={x:h.goose.x,y:h.goose.y};let moving=0,pauses=0,total=0;
  for(let i=0;i<1200;i++){
    const before={x:h.goose.x,y:h.goose.y};h.tick();
    const step=Math.hypot(h.goose.x-before.x,h.goose.y-before.y);
    assert.ok(step<=2.40001,'no teleport or movement above 48 world units/second');
    assert.equal(h.collide(),false,'solid fences, shelter and trough remain solid');
    assert.ok(h.goose.x>h.bounds.x+17&&h.goose.x<h.bounds.x+h.bounds.w-17);
    assert.ok(h.goose.y+8<h.bounds.y+h.bounds.h-17);
    if(h.goose.moving)moving++;else pauses++;
    total+=step;
  }
  assert.ok(total>200,`only ${total} units walked`);assert.ok(moving>100);assert.ok(pauses>5);
  assert.notDeepEqual({x:h.goose.x,y:h.goose.y},start);assert.ok(h.goose.anim>0);
  assert.equal(h.state.score,1234);assert.equal(h.state.rescuedCount,2);assert.equal(h.goose.rescued,true);
  assert.deepEqual(h.goose.home,{x:1500,y:800},'old lake home is not used as the pen target');
  assert.ok(h.animation.some(a=>a.travel>0));
});

test('Panto stays in the pen across different random streams and does not walk through friends',()=>{
  for(const seed of [1,2,3,42,700,1250,90000]){
    const h=fixture(seed);let total=0;
    for(let i=0;i<400;i++){
      const before={x:h.goose.x,y:h.goose.y};h.tick();total+=Math.hypot(h.goose.x-before.x,h.goose.y-before.y);
      assert.equal(h.collide(),false);
      for(const a of h.state.entities.animals)assert.ok(Math.hypot(a.x-h.goose.x,a.y-h.goose.y)>=27-.01);
    }
    assert.ok(total>70,`seed ${seed}: goose never finds a walkable leg`);
  }
});

test('pause, cinematics, invalid time steps and unrescued geese do not run the pen walk',()=>{
  for(const mode of ['menu','won','lose','win_cutscene','thor','active','unrescued','NaN','negative']){
    const h=fixture(),before={x:h.goose.x,y:h.goose.y,anim:h.goose.anim};
    if(mode==='thor')h.context.cutscene=true;
    else if(mode==='active')h.state.lake.active=true;
    else if(mode==='unrescued')h.goose.rescued=false;
    else if(!['NaN','negative'].includes(mode))h.state.phase=mode;
    const dt=mode==='NaN'?'NaN':mode==='negative'?'-1':'.1';
    for(let i=0;i<30;i++)h.run(`PenLife.updateGoose(state,goose,${dt});`);
    assert.deepEqual({x:h.goose.x,y:h.goose.y,anim:h.goose.anim},before,mode);
  }
});

test('a completed save gets a new walk even if its old goose target points to the lake',()=>{
  const h=fixture();h.run('PenLife.resetGoose(goose);');h.tick(100);
  assert.ok(Math.hypot(h.goose.x-190,h.goose.y-327)>10);assert.ok(h.goose.y<470);
});

test('entering the pen produces one welcome bubble, then another speaker, not a chorus',()=>{
  const h=fixture();h.tick(4);assert.equal(h.comment(),null);
  h.chicken.x=236;h.chicken.y=359;h.tick(12);
  const first=h.comment();assert.ok(first);assert.match(first.text,/galinha|penas|Voltou|Chegou/);
  const firstSpeaker=first.speaker.id,firstText=first.text;
  h.tick(80);assert.equal(h.comment(),null,'first bubble expires');
  h.tick(145);const second=h.comment();assert.ok(second);assert.notEqual(second.speaker.id,firstSpeaker);
  assert.notEqual(second.text,firstText);h.tick(800);assert.equal(h.comment(),null,'only two comments per visit');
});

test('a visible wolf near the entrance triggers a wolf joke rather than invented danger',()=>{
  const h=fixture();h.tick(2);h.wolf.x=410;h.wolf.y=360;h.chicken.x=235;h.chicken.y=360;h.tick(12);
  assert.ok(h.comment());assert.match(h.comment().text,/Lobo|lobo|Baltazar|buffet/);
});

test('comments are not emitted through walls, by unrescued animals or outside the pen',()=>{
  for(const mode of ['outside','blocked','no-friends','hidden']){
    const h=fixture();
    if(mode!=='outside'){h.chicken.x=235;h.chicken.y=360;}
    if(mode==='blocked')h.context.sight=false;
    if(mode==='no-friends'){h.state.entities.animals=[];h.state.entities.goose=null;}
    if(mode==='hidden')h.chicken.hidden=true;
    h.tick(100);assert.equal(h.comment(),null,mode);
  }
});

test('residents can welcome the chicken even when no goose exists',()=>{
  const h=fixture();h.state.entities.goose=null;h.chicken.x=235;h.chicken.y=360;h.tick(12);
  assert.ok(h.comment());assert.equal(h.comment().speaker.type,'animal');
});

test('walking repeatedly across the gate cannot spam a new speech bubble',()=>{
  const h=fixture();h.chicken.x=235;h.chicken.y=360;h.tick(12);assert.ok(h.comment());
  for(let i=0;i<6;i++){
    h.chicken.x=380;h.tick(2);h.chicken.x=235;h.tick(10);assert.equal(h.comment(),null);
  }
});

test('a pause freezes the current speech timer and leaving the pen clears it',()=>{
  const h=fixture();h.chicken.x=235;h.chicken.y=360;h.tick(12);const remaining=h.comment().remaining;
  h.state.phase='menu';h.tick(100);assert.equal(h.comment().remaining,remaining);
  h.state.phase='playing';h.chicken.x=380;h.tick();assert.equal(h.comment(),null);
});

test('comment rendering stays on screen and uses a short comic tail',()=>{
  const h=fixture();h.chicken.x=235;h.chicken.y=360;h.tick(12);h.run('PenLife.draw(state)');
  assert.ok(h.texts.length);for(const [,x,y,maxWidth] of h.texts){assert.ok(x>=12&&x<=888);assert.ok(y>0&&y<620);assert.ok(maxWidth<=250);}
  const count=h.texts.length;h.chicken.x=380;h.run('PenLife.draw(state)');assert.equal(h.texts.length,count);
});

test('browser loads PenLife before GooseSystem, without changing other gameplay scripts',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.ok(html.indexOf('./systems/pen-life.js?')<html.indexOf('./systems/goose-system.js?'));
  assert.ok(html.includes('./systems/pen-life.js?'));
});
