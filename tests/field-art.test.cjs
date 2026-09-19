const test=require('node:test'),assert=require('node:assert/strict');
const {createCanvas}=require('@napi-rs/canvas');
const {createGame}=require('./helpers.cjs');

test('the sunflower sign uses the same renderer as all four region signs, once and above the ground layer',()=>{
  const c=createCanvas(220,130).getContext('2d'),h=createGame(()=>.5,{drawingContext:c});
  const signs=h.run("FarmArt.getProps(WORLD.layout).filter(p=>p.type==='sign'||p.type==='sunflower-sign')");
  assert.equal(signs.length,5);assert.equal(new Set(signs.map(p=>p.name)).size,5);
  h.run('var labels=[],drawLabel=FarmDetails.drawSign;FarmDetails.drawSign=(c,p)=>{labels.push(p.name);drawLabel(c,p)}');
  for(const sign of signs) {
    c.clearRect(0,0,220,130);c.fillStyle='#123456';c.font='10px sans-serif';
    h.run('FarmArt').drawProp(c,{...sign,x:30,y:30},{x:0,y:0});
    // napi-rs caches style getters after restore(); verify the native drawing state itself.
    c.fillRect(0,0,1,1);assert.deepEqual([...c.getImageData(0,0,1,1).data],[18,52,86,255]);
    const pixels=c.getImageData(0,0,220,130).data;
    assert.ok(pixels.some((v,i)=>i%4===3&&v));
    for(let y=30+sign.h;y<130;y++)for(let x=0;x<220;x++)
      assert.equal(pixels[(y*220+x)*4+3],0,'no floating shadow or posts below the reserved footprint');
  }
  assert.equal(h.run('labels.length'),5);
  const s=signs.find(p=>p.type==='sunflower-sign'),plot=h.run('SunflowerSystem.plot()');
  assert.ok(s.x>=plot.x&&s.x+s.w<=plot.x+plot.w&&s.y+s.h<=plot.y+plot.h);
  assert.equal(s.depth,s.y+s.h);
  h.run('labels=[];SunflowerSystem.drawGround(ctx,WORLD.layout)');assert.equal(h.run('labels.length'),0);
});

test('corn and sunflower art retain grounded feet, expected height and the caller drawing transform',()=>{
  const c=createCanvas(240,200).getContext('2d'),h=createGame(()=>.5,{drawingContext:c});
  for(const type of ['corn','sunflower'])for(const variant of [0,1,2]) {
    c.clearRect(0,0,240,200);c.fillStyle='#123456';c.lineWidth=7;
    h.run('FarmArt').drawProp(c,{type,variant,x:120,y:150,w:28,h:1},{x:0,y:0});
    c.fillRect(0,0,1,1);assert.deepEqual([...c.getImageData(0,0,1,1).data],[18,52,86,255]);
    assert.equal(c.getTransform().e,0);c.clearRect(0,0,1,1);
    const pixels=c.getImageData(0,0,240,200).data;let bottom=0,top=200,count=0;
    for(let y=0;y<200;y++)for(let x=0;x<240;x++)if(pixels[(y*240+x)*4+3]) {
      bottom=Math.max(bottom,y);top=Math.min(top,y);count++;
    }
    assert.ok(count>450);assert.equal(bottom,151,type+' contact at root');
    assert.ok(top>=150-(type==='corn'?68:94));assert.ok(top<=150-55);
  }
});
