const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {createGame}=require('./helpers.cjs');

test('shared fence kit loads three transparent pixel-art pieces',()=>{
  const root=path.resolve(__dirname,'..');
  for(const file of ['fence-post.png','fence-rail-h.png','fence-rail-v.png']) {
    const data=fs.readFileSync(path.join(root,'assets/farm',file));
    assert.equal(data.subarray(1,4).toString(),'PNG',file);
  }
  const h=createGame(()=>.5);
  assert.equal(h.run('FenceArt.ready()'),true);
});

test('shared fence kit exposes one-axis horizontal and vertical renderers',()=>{
  const source=fs.readFileSync(path.resolve(__dirname,'../systems/fence-art.js'),'utf8');
  assert.match(source,/paint\(c,assets\.horizontal/);
  assert.match(source,/paint\(c,assets\.vertical/);
  assert.doesNotMatch(source,/drawFenceBarVertical|boundaryRailV/);
});
