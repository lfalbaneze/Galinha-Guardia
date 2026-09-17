const test=require('node:test'), assert=require('node:assert/strict');
const {createGame}=require('./helpers.cjs');
const {createCanvas,loadImage}=require('@napi-rs/canvas');

test('every region sign has two grounded posts, compact bounds and no overlap with scenery or paths in 200 farms',()=>{
 const h=createGame(()=>.5);
 for(const version of [1,2])for(let seed=0;seed<100;seed++) {
   h.run(`resetGame(${seed},${version});var props=FarmArt.getProps(WORLD.layout);var signs=props.filter(p=>p.type==='sign');`);
   assert.equal(h.run('signs.length'),4,`${seed}/${version}`);
   assert.equal(h.run(`signs.every(s=>s.w<=136&&s.depth===s.y+s.h &&
     !props.filter(p=>p!==s).some(p=>FarmDetails.overlaps(s,FarmDetails.shape(p),12)) &&
     !WORLD.paths.some(p=>FarmDetails.overlaps(s,p,12)))`),true,`overlap ${seed}/${version}`);
 }
});

test('prop variants alternate deterministically without consuming randomness or changing the saved map',()=>{
 const h=createGame(()=>.5);h.run(`var original=JSON.stringify(WORLD.layout),calls=0;Math.random=()=>{calls++;return .5};
   var a=FarmArt.getProps(WORLD.layout);var b=FarmArt.getProps(WORLD.layout);`);
 assert.equal(h.run('a===b'),true);assert.equal(h.run('JSON.stringify(WORLD.layout)===original'),true);assert.equal(h.run('calls'),0);
 assert.equal(h.run(`(()=>{const coops=a.filter(p=>p.type==='coop');return coops.every((p,i)=>!i||p.variant!==coops[i-1].variant);})()`),true);
 const first=h.run('JSON.stringify(a)');h.run('resetGame(state.worldSeed)');assert.equal(h.run('JSON.stringify(FarmArt.getProps(WORLD.layout))'),first);
});

test('every building variation keeps its ground baseline at the original collision footprint',()=>{
 const h=createGame(()=>.5);assert.equal(h.run(`FarmArt.getProps(WORLD.layout).filter(p=>p.type==='coop').every(p=>{
   const box=FarmDetails.shape(p);return Math.abs(box.y+box.h-p.y-p.h)<.001;
 })`),true);
});

test('material variants reuse decoded sprite pixels, preserve transparency and visibly differ',async()=>{
 const h=createGame(()=>.5),art=h.run('FarmSprites');await art.load(loadImage,createCanvas);
 for(const name of ['coop','barn','bush','tree']) {
   const images=[];
   for(const palette of [0,1,2]){
     const c=createCanvas(160,180).getContext('2d');assert.equal(art.draw(c,name,0,0,160,180,{palette,flip:false}),true);
     images.push(Buffer.from(c.getImageData(0,0,160,180).data));
   }
   assert.notDeepEqual(images[0],images[1],name);assert.notDeepEqual(images[1],images[2],name);
   for(let i=3;i<images[0].length;i+=4)assert.equal(images[0][i],images[1][i],`${name} alpha`);
 }
});

test('new signs and sprite variations restore the caller canvas state',()=>{
 const h=createGame(()=>.5),c=createCanvas(200,100).getContext('2d');c.fillStyle='#010203';c.font='10px sans-serif';
 h.run('FarmDetails').drawSign(c,{x:10,y:10,w:92,h:49,name:'POMAR'});
 c.fillRect(0,0,1,1); assert.deepEqual([...c.getImageData(0,0,1,1).data],[1,2,3,255]);
 assert.ok(c.getImageData(0,0,200,100).data.some((v,i)=>i%4===3&&v));
});
