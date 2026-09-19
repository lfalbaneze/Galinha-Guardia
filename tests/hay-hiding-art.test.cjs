const test=require('node:test'),assert=require('node:assert/strict');
const {createCanvas}=require('@napi-rs/canvas');
const {createGame}=require('./helpers.cjs');
const {loadGameSprites}=require('../scripts/sprite-loader.cjs');

test('hay conceals every skin in the fixed bale, without dangling feet, straw curtains or a second shadow',async()=>{
  const canvas=createCanvas(900,520),ctx=canvas.getContext('2d');
  const h=createGame(()=>.5,{drawingContext:ctx});await loadGameSprites(h);
  h.run(`resetGame(814237);var cover=HidingSpots.getSpots().find(s=>s.type==='hay'),b=cover.bale,c=state.entities.chicken;
    camera.x=b.x-400;camera.y=b.y-210;
    Object.assign(c,{x:b.x+b.w/2,y:b.y+b.h+23,invulnerable:0});
    var entry={x:c.x,y:c.y};HidingSpots.toggle(state);
    for(var i=0;i<60;i++)HidingSpots.update(state,1/60);`);
  const bottom=h.run('Math.round(worldY(b.y+b.h))');
  ctx.clearRect(0,0,900,520);
  h.run('HidingSpots.drawForeground(state)');
  const baseline=ctx.getImageData(0,0,900,520).data;
  const baleTop=Math.floor(baseline.findIndex((v,i)=>i%4===3&&v)/4/900);
  for(const skin of h.run('Object.keys(CharacterArt.appearances)')){
    ctx.clearRect(0,0,900,520);h.context.skin=skin;
    h.run(`c.skin=skin;Sunlight.begin(0);drawChicken(c);HidingSpots.drawForeground(state);`);
    assert.equal(h.run('Sunlight.inspect().casts'),0,'concealed body and foreground never cast duplicate shadows');
    const pixels=ctx.getImageData(0,bottom+1,900,520-bottom-1).data;
    assert.equal(pixels.some((v,i)=>i%4===3&&v),false,skin+' has no feet or straw hanging below the bale');
    assert.ok(ctx.getImageData(400,baleTop-30,80,30).data.some((v,i)=>i%4===3&&v),skin+' still peeks out above the bale');
    assert.equal(h.run('c.x===entry.x&&c.y===entry.y'),true,'visual concealment never moves the collision position');
  }
  h.run('Sunlight.end();HidingSpots.toggle(state);for(var i=0;i<60;i++)HidingSpots.update(state,1/60);');
  assert.equal(h.run('c.hidden'),false);
  assert.ok(h.run('c.hideBlend')<.02);
  assert.equal(h.run('c.x===entry.x&&c.y===entry.y'),true,'exit returns to the original accessible entry');
});
