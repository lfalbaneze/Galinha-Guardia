const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {createGame}=require('./helpers.cjs');

test('map boundary uses one matching fence kit on horizontal and vertical sides',()=>{
  const h=createGame(()=>.5);
  h.run("var borders=FarmArt.getProps(WORLD.layout).filter(p=>p.type==='boundary-fence');");
  assert.ok(h.run("borders.some(p=>p.w>0&&p.h===0)"));
  assert.ok(h.run("borders.some(p=>p.h>0&&p.w===0)"));
  assert.equal(h.run("borders.every(p=>Math.max(p.w,p.h)<=64)"),true);
  const source=fs.readFileSync(path.resolve(__dirname,'../systems/farm-art.js'),'utf8');
  assert.match(source,/const boundaryFenceStyle=Object\.freeze/);
  assert.match(source,/function boundaryPost\(/);
  assert.match(source,/function boundaryFenceHorizontal\(/);
  assert.match(source,/function boundaryFenceVertical\(/);
  assert.match(source,/boundaryRailH\(c/);
  assert.match(source,/boundaryRailV\(c/);
  assert.match(source,/if\(p\.w\)boundaryFenceHorizontal/);
  assert.doesNotMatch(source,/if\(p\.w\)fence\(c,p\.x,p\.y,p\.w\);\s*else verticalFence/);
});
