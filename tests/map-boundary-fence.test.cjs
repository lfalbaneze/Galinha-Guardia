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

test('map boundary vertical mirrors the refuge vertical fence geometry and palette',()=>{
  const boundary=fs.readFileSync(path.resolve(__dirname,'../systems/farm-art.js'),'utf8');
  const refuge=fs.readFileSync(path.resolve(__dirname,'../systems/farm-refuge.js'),'utf8');
  for(const token of [
    "edge:'#5b3a24'","dark:'#74482a'","base:'#9c6338'","light:'#c4894f'",
    "top:'#dea967'","bolt:'#66737a'","boltLight:'#c6d0d3'"
  ]) {
    assert.ok(boundary.includes(token),token+' missing from boundary');
    assert.ok(refuge.includes(token),token+' missing from refuge');
  }
  assert.match(boundary,/boundaryRailV\(c,x\+inside\*5,top-25,bottom-top\+25\)/);
  assert.match(boundary,/boundaryRailV\(c,x\+inside\*13,top-25,bottom-top\+25\)/);
  assert.match(boundary,/boundaryPost\(c,x,top\);boundaryPost\(c,x,bottom\)/);
  assert.match(refuge,/drawFenceBarVertical\(c,x\+inside\*5,top-25,bottom-top\+25\)/);
  assert.match(refuge,/drawFenceBarVertical\(c,x\+inside\*13,top-25,bottom-top\+25\)/);
  assert.match(refuge,/fencePost\(c,x,top\);fencePost\(c,x,bottom\)/);
});

test('vertical map rails sit on the playable side of their posts',()=>{
  const h=createGame(()=>.5);
  h.run("var v=FarmArt.getProps(WORLD.layout).filter(p=>p.type==='boundary-fence'&&p.h>0);");
  assert.ok(h.run("v.some(p=>p.side==='left')"));
  assert.ok(h.run("v.some(p=>p.side==='right')"));
  assert.equal(h.run("v.every(p=>p.side==='left'||p.side==='right')"),true);
});
