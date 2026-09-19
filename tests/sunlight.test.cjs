const test=require('node:test'),assert=require('node:assert/strict');
const {createCanvas}=require('@napi-rs/canvas');
const {createGame}=require('./helpers.cjs');
const {loadGameSprites}=require('../scripts/sprite-loader.cjs');
function bounds(c){const w=c.canvas.width,h=c.canvas.height,d=c.getImageData(0,0,w,h).data;let l=w,r=0,t=h,b=0,n=0,sx=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);n++;sx+=x;}
  return {l,r,t,b,n,cx:sx/Math.max(1,n)};
}
test('one light projects opposite the sun, shortens at noon and stays fixed at its contact point',()=>{
  const h=createGame(()=>.5),sun=h.run('Sunlight');sun.install(createCanvas);
  const sprite=createCanvas(20,80),s=sprite.getContext('2d');s.fillStyle='white';s.fillRect(7,0,6,80);
  const samples=[];
  for(const time of [0,42,102]) {
    const c=createCanvas(220,180).getContext('2d');sun.begin(time);assert.equal(sun.cast(c,sprite,100,20,20,80,100),true);
    samples.push(bounds(c));assert.ok(c.getImageData(107,100,7,2).data.some((v,i)=>i%4===3&&v),'shadow starts at the feet');
    assert.equal(c.getTransform().e,0);assert.equal(c.getTransform().d,1);
  }
  assert.ok(samples[0].cx>115);assert.ok(samples[2].cx<100);
  assert.ok(samples[1].b-samples[1].t<samples[0].b-samples[0].t);
  const regular=samples[0],c=createCanvas(220,180).getContext('2d');
  sun.begin(0);c.translate(220,0);c.scale(-1,1);sun.cast(c,sprite,100,20,20,80,100);
  assert.ok(Math.abs(bounds(c).cx-regular.cx)<2,'facing left never reverses the sunlight');
  sun.begin(0,true,true);const a=sun.inspect();sun.begin(100,true,true);
  assert.equal(sun.inspect().phase,a.phase,'reduced motion fixes the sun overhead');
  sun.end();assert.equal(sun.cast(c,sprite,100,20,20,80,100),false);
});

test('sprite silhouettes are cached without pixel reads; the shadow pass does not recolor its source',()=>{
  const h=createGame(()=>.5),sun=h.run('Sunlight');let surfaces=0;
  sun.install((w,h)=>{surfaces++;const c=createCanvas(w,h),ctx=c.getContext('2d');
    ctx.getImageData=()=>{throw Error('shadow masks must not read pixels')};return c;});
  const sprite=createCanvas(30,40);sprite.getContext('2d').fillRect(5,0,20,40);
  const before=sprite.toBuffer('image/png'),c=createCanvas(150,150).getContext('2d');
  sun.begin(0);sun.cast(c,sprite,50,40,30,40,80);const count=surfaces;
  sun.begin(102);sun.cast(c,sprite,50,40,30,40,80);assert.equal(surfaces,count);
  assert.deepEqual(sprite.toBuffer('image/png'),before);
});

test('live renderers all cast solar shadows, while nursery foreground does not cast a duplicate',async()=>{
  const c=createCanvas(900,520).getContext('2d'),h=createGame(()=>.5,{drawingContext:c});await loadGameSprites(h);
  const sun=h.run('Sunlight'),art=h.run('FarmArt');sun.begin(0);
  const camera={x:0,y:0,shakeX:0,shakeY:0};
  const check=(label,draw)=>{const before=sun.inspect().casts;draw();assert.ok(sun.inspect().casts>before,label);};
  for(const type of ['tree','bush','hay','coop','stable','silo','corn','crop','sunflower','sign','paddock-fence'])
    check(type,()=>art.drawProp(c,{type,name:'HORTA',variant:1,x:180,y:180,w:100,h:type==='paddock-fence'?8:60},camera));
  for(const species of ['chicken','wolf','horse','cow','dog','cat','chick'])
    check(species,()=>h.run('CharacterArt').draw(c,species,450,250,{direction:'right'}));
  for(const [renderer,entity]of [['GooseArt','state.entities.goose'],['FoxArt','state.entities.foxes[0]'],['OwlArt','state.entities.owls[0]']])
    check(renderer,()=>h.run(renderer).draw(c,h.run(entity),camera));
  check('Thor',()=>h.run('ThorArt').drawHero(c,450,250,70,'right',0));
  check('Scarecrow',()=>h.run('ScarecrowArt').drawPost(c,{x:450,y:250},camera));
  check('Crow',()=>h.run('ScarecrowArt').drawCrow(c,{x:450,y:250,z:30,opacity:1,flying:true,left:false},0,0,camera));
  const before=sun.inspect().casts;h.run('FarmRefuge').drawProp(c,{type:'nursery-lip',x:300,y:150,w:242,h:114});
  assert.equal(sun.inspect().casts,before);sun.end();
});

test('the solar clock pauses, survives saved progress, and never adds sun or shadows to the ending',()=>{
  const h=createGame(()=>.5);h.run('state.elapsed=63;GameManager.save(state);var save=GameManager.read();state.elapsed=0;GameManager.restore(state,save)');
  assert.equal(h.run('state.elapsed'),63);
  h.run('state.phase="menu";updateGame(.05)');assert.equal(h.run('state.elapsed'),63);
  h.run('state.phase="playing";updateGame(.05)');assert.ok(h.run('state.elapsed')>63);
  h.run('EndGameSequence.start(state);renderGame()');
  assert.equal(h.run('Sunlight.inspect().casts'),0);assert.equal(h.run('Sunlight.active'),false);
});
