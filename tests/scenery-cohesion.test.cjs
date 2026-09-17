const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { createGame } = require('./helpers.cjs');

// Check both historical layout versions: loading an old farm must not bring the clutter back.
test('decorative fence fragments are absent while the refuge enclosure remains in 100 old and new farms', () => {
  const game = createGame(() => .5);
  for (const version of [1, 2]) for (let seed=0;seed<50;seed++) {
    game.run(`resetGame(${seed},${version});var props=FarmArt.getProps(WORLD.layout)`);
    assert.equal(game.run("props.some(p=>p.type==='fence')"), false, `${seed}/${version}`);
    assert.equal(game.run("props.filter(p=>p.type==='refuge-rail').length"), game.run('FarmRefuge.props().filter(p=>p.type===\'refuge-rail\').length'));
    assert.ok(game.run("OBSTACLES.some(p=>p.type==='refuge-fence')"));
  }
});

test('removing visual clutter never moves cover, rescue spawns or existing collision geometry', () => {
  const game = createGame(() => .5);
  const snapshot = () => game.run('JSON.stringify([WORLD.layout,OBSTACLES,HidingSpots.getSpots(),state.entities.chicks])');
  const before = snapshot();
  game.run('renderGame();FarmArt.getProps(WORLD.layout);renderGame()');
  assert.equal(snapshot(),before);
  assert.equal(game.run('state.entities.animals.length'),10);
  assert.equal(game.run('state.entities.chicks.length'),6);
});

test('hay, shrub and building bases meet their footprint instead of a detached shadow', () => {
  const game = createGame(() => .5), details=game.run('FarmDetails');
  for (const type of ['hay','bush','coop','barn','silo']) for (const variant of [0,1,2]) {
    const p={type,x:100,y:200,w:100,h:70,variant};
    const box=details.shape(p);
    assert.ok(Math.abs(box.y+box.h-270)<.001, `${type}/${variant}`);
  }
  const tree={type:'tree',x:100,y:200,w:104,h:70,blockingRect:{x:142,y:204,w:20,h:18}};
  const box=details.shape(tree);assert.equal(box.y+box.h,222);
});

test('buildings keep their silhouette, footprint and lighting direction for all material variants', () => {
  const game = createGame(() => .5);
  game.run('var props=FarmArt.getProps(WORLD.layout)');
  assert.equal(game.run("props.filter(p=>['coop','barn','silo'].includes(p.type)).every(p=>p.flip===false)"),true);
  const base={type:'coop',x:50,y:80,w:110,h:72};
  const shape=game.run('FarmDetails').shape;
  assert.deepEqual(shape({...base,variant:0}),shape({...base,variant:1}));
  assert.deepEqual(shape({...base,variant:1}),shape({...base,variant:2}));
});

test('grounded sprites share a bounded palette and are cached rather than reprocessed every frame', async () => {
  const game=createGame(() => .5),art=game.run('FarmSprites');let surfaces=0;
  await art.load(loadImage,(w,h)=>{surfaces++;return createCanvas(w,h);});
  const c=createCanvas(160,180).getContext('2d');
  for(const name of ['barn','coop','hay','tree','bush','silo','fence']) {
    c.clearRect(0,0,160,180);art.draw(c,name,0,0,160,180,{grounded:true,palette:1});
    const data=c.getImageData(0,0,160,180).data,colors=new Set();let visible=0;
    for(let i=0;i<data.length;i+=4)if(data[i+3]){colors.add(`${data[i]},${data[i+1]},${data[i+2]}`);visible++;}
    assert.ok(visible>100,name);assert.ok(colors.size<=28,`${name} palette: ${colors.size}`);
    const before=surfaces;art.draw(c,name,0,0,160,180,{grounded:true,palette:1});
    assert.equal(surfaces,before, `${name} cached`);
  }
});

test('flowering and leaf-only bushes have distinct materials without moving their cover', async () => {
  const game=createGame(() => .5),art=game.run('FarmSprites');await art.load(loadImage,createCanvas);
  const flowerPixels=[];
  for(const palette of [0,1,2]) {
    const c=createCanvas(112,84).getContext('2d');art.draw(c,'bush',0,0,112,84,{grounded:true,palette});
    const data=c.getImageData(0,0,112,84).data;let flowers=0;
    for(let i=0;i<data.length;i+=4)if(data[i+3]&&data[i]>195&&data[i+1]>175)flowers++;
    flowerPixels.push(flowers);
  }
  assert.ok(flowerPixels[0]>flowerPixels[1]);assert.ok(flowerPixels[0]>flowerPixels[2]);
});

test('grounded drawing preserves the caller canvas state and original PNG bytes', async () => {
  const game=createGame(() => .5),art=game.run('FarmSprites');await art.load(loadImage,createCanvas);
  const file=path.join(__dirname,'../assets/farm/farm-atlas.png'),before=fs.readFileSync(file);
  const c=createCanvas(120,140).getContext('2d');c.imageSmoothingEnabled=true;c.fillStyle='#123456';
  art.draw(c,'hay',10,10,80,60,{grounded:true,palette:2});
  assert.equal(c.imageSmoothingEnabled,true);assert.equal(c.fillStyle,'#123456');
  assert.deepEqual(fs.readFileSync(file),before);
  const t=c.getTransform();assert.equal(t.a,1);assert.equal(t.d,1);assert.equal(t.e,0);assert.equal(t.f,0);
});

test('habitat atlas keeps transparent backgrounds and loads each distinct silhouette once', async () => {
  const game=createGame(()=>.5),art=game.run('FarmSprites');let loads=0;
  await art.load(loadImage,createCanvas);
  const load=src=>{loads++;return loadImage(src);};
  assert.equal(await art.loadHabitats(load,createCanvas),true);
  assert.equal(await art.loadHabitats(load,createCanvas),true);
  assert.equal(loads,1);
  const hashes=new Set();
  for(const name of ['shelter','willow','bramble','pear']) {
    const c=createCanvas(180,180).getContext('2d');
    assert.equal(art.draw(c,name,10,10,160,160,{grounded:true}),true);
    const data=c.getImageData(0,0,180,180).data;
    assert.equal(data[3],0,name+' background');
    assert.ok(data.filter((v,i)=>i%4===3&&v===255).length>1500,name+' silhouette');
    hashes.add(require('node:crypto').createHash('sha256').update(data).digest('hex'));
  }
  assert.equal(hashes.size,4);
});

test('Luis Albaneze is credited as game author separately from the original sprite artists', () => {
  const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
  assert.match(read('index.html'),/Feito por <strong>Luis Albaneze<\/strong>/);
  assert.match(read('README.md'),/Feito por \*\*Luis Albaneze\*\*/);
  assert.equal(JSON.parse(read('package.json')).author,'Luis Albaneze');
  for(const name of ['Luis Albaneze','Daniel Eddeland','bluecarrot16','Redshrike','CC BY 3.0'])assert.ok(read('assets/sprites/CREDITS.html').includes(name),name);
});
