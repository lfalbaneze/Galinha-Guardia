const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {createGame}=require('./helpers.cjs');
const root=path.resolve(__dirname,'..');
const loadFenceImage=src=>loadImage(path.join(root,src));

test('shared fence kit loads and caches three real transparent pixel-art pieces',async()=>{
  for(const file of ['fence-post.png','fence-rail-h.png','fence-rail-v.png']) {
    const data=fs.readFileSync(path.join(root,'assets/farm',file));
    assert.equal(data.subarray(1,4).toString(),'PNG',file);
  }
  const h=createGame(()=>.5),art=h.run('FenceArt');
  assert.equal(art.ready(),false,'importing a renderer does not treat a fake Image as decoded');
  let loads=0;
  const load=src=>{loads++;return loadFenceImage(src);};
  const first=art.load(load);
  assert.equal(art.load(load),first,'concurrent callers share the same request');
  assert.equal(await first,true);assert.equal(art.ready(),true);assert.equal(loads,3);
  assert.equal(await art.load(load),true);assert.equal(loads,3,'successful loads are cached');
  const c=createCanvas(160,120).getContext('2d');
  assert.equal(art.drawHorizontal(c,20,60,100),true);
  assert.equal(art.drawVertical(c,20,60,30),true);
  assert.ok(c.getImageData(0,0,160,120).data.some((v,i)=>i%4===3&&v));
});

test('invalid decoded fence images preserve fallback rendering and allow a real retry',async()=>{
  const h=createGame(()=>.5),art=h.run('FenceArt'),c=createCanvas(120,120).getContext('2d');
  assert.equal(await art.load(()=>({})),false);
  assert.equal(art.ready(),false);assert.equal(art.errors.length,3);
  assert.equal(art.drawHorizontal(c,20,60,80),false);
  assert.equal(art.drawVertical(c,20,60,30),false);
  assert.equal(await art.load(loadFenceImage),true);
  assert.equal(art.errors.length,0);
  assert.equal(art.drawHorizontal(c,20,60,80),true);
});

test('shared fence kit exposes one-axis horizontal and vertical renderers',()=>{
  const source=fs.readFileSync(path.resolve(__dirname,'../systems/fence-art.js'),'utf8');
  assert.match(source,/paint\(c,assets\.horizontal/);
  assert.match(source,/paint\(c,assets\.vertical/);
  assert.doesNotMatch(source,/drawFenceBarVertical|boundaryRailV/);
});
