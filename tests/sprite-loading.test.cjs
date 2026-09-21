const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const directions=['up','upright','right','downright','down','downleft','left','upleft'];
function renderer() {
  const context = vm.createContext({ setTimeout, clearTimeout });
  for (const file of ['sprite-data.js', 'arcade-art-data.js', 'premium-art-data.js', 'pixel-art-data.js', 'pixellab-art-data.js', 'character-art.js'])
    vm.runInContext(fs.readFileSync(path.join(root, 'systems', file), 'utf8'), context);
  return vm.runInContext('CharacterArt', context);
}
test('all 29 characters have eight complete directions from one coherent atlas each', () => {
  const art=renderer();assert.equal(art.species.length,29);
  for(const species of art.species){const sources=new Set(),rows=new Set();
    for(const direction of directions){const {pose,frame,direction:resolved,definition}=art.frameFor(species,{direction,moving:true});
      assert.equal(definition.edition,108);assert.equal(definition.provider,'pixellab');assert.equal(resolved,direction);assert.ok(pose.frames.length>=8);assert.equal(pose.flip,false);rows.add(frame.y);
      for(const f of pose.frames){sources.add(f.src);const png=fs.readFileSync(path.join(root,f.src));
        assert.equal(png.toString('ascii',1,4),'PNG');
        assert.ok(f.x>=0&&f.y>=0&&f.w>0&&f.h>0,species+'/'+direction);
      }
    }
    assert.equal(sources.size,1);assert.equal(rows.size,8);assert.match([...sources][0],/pixellab-108\/runtime\//);
  }
});
test('idle is stable and every authored phase advances from traveled distance',()=>{
  const art=renderer();for(const species of art.species)for(const direction of directions){
    assert.equal(art.frameFor(species,{direction,anim:7}).index,0);
    const count=art.frameFor(species,{direction,moving:true}).pose.frames.length;
    for(let i=0;i<count;i++)assert.equal(art.frameFor(species,{direction,moving:true,anim:(i+.01)*4/count}).index,i);
    assert.equal(art.frameFor(species,{direction,moving:true,anim:4}).index,0);
  }
});
test('all runtime atlases have transparent gutters and distinct crisp pixel phases',async()=>{
  const {createCanvas,loadImage}=require('@napi-rs/canvas'),art=renderer();let bytes=0;
  for(const species of art.species){const {frame}=art.frameFor(species),file=path.join(root,frame.src),image=await loadImage(file);bytes+=fs.statSync(file).size;
    const c=createCanvas(image.width,image.height).getContext('2d');c.drawImage(image,0,0);
    const pixels=c.getImageData(0,0,image.width,image.height).data;
    assert.ok(pixels.some((v,i)=>i%4===3&&v===0),species+' transparent background');
    assert.ok(!pixels.some((v,i)=>i%4===3&&v>0&&v<255),species+' crisp pixel alpha');
    const definition=art.frameFor(species).definition;
    for(const [action,poses] of Object.entries(definition.actions))for(const [direction,pose] of Object.entries(poses)){const hashes=[];
      for(const f of pose.frames){assert.ok(f.x>=0&&f.y>=0&&f.x+f.w<=image.width&&f.y+f.h<=image.height);
        const data=c.getImageData(f.x,f.y,f.w,f.h).data;assert.ok(data.some((v,i)=>i%4===3&&v===255),species+'/'+direction);
        for(let x=0;x<f.w;x++){assert.equal(data[x*4+3],0,species+' top gutter');assert.equal(data[((f.h-1)*f.w+x)*4+3],0,species+' bottom gutter');}
        for(let y=0;y<f.h;y++){assert.equal(data[y*f.w*4+3],0,species+' left gutter');assert.equal(data[(y*f.w+f.w-1)*4+3],0,species+' right gutter');}
        hashes.push(require('node:crypto').createHash('sha256').update(data).digest('hex'));
      }
      assert.ok(new Set(hashes).size>=Math.min(5,pose.frames.length),species+'/'+action+'/'+direction+' has distinct drawn phases');
    }
  }
  assert.ok(bytes<16000000,'29 complete pixel atlases stay within 16 MB');
});
test('livestock stays larger than the hen in every direction and small pets stay smaller', () => {
  const art=renderer();
  const heights=species=>['up','right','down','left'].map(direction=>{
    const p=art.frameFor(species,{direction});return (p.pose.bottom-p.pose.top)*p.scale;
  });
  const hen=Math.max(...heights('chicken'));
  for(const [species,ratio] of [['horse',1.6],['cow',1.35],['donkey',1.3]])
    assert.ok(Math.min(...heights(species))>hen*ratio,`${species} keeps its larger silhouette when it turns`);
  for(const species of ['cat','rabbit','duck'])assert.ok(Math.max(...heights(species))<hen*.8,species);
  assert.ok(Math.max(...heights('chick'))<hen*.5);
});
test('image loading is shared, completes before ready, and successful loads are reused', async () => {
  const art = renderer(), callbacks = [];
  let calls = 0;
  const first = art.load(src => { calls++; return new Promise(resolve => callbacks.push(() => resolve({ src }))); });
  assert.equal(art.loading, true); assert.equal(art.ready, false);
  assert.equal(art.load(), first);
  for (const done of callbacks) done();
  assert.equal(await first, true); assert.equal(art.ready, true); assert.equal(art.loading, false);
  await art.load(() => { throw Error('must use cache'); });
  assert.equal(calls, art.sources.length);
});
test('failed images are reported and can be retried without reloading successful images', async () => {
  const art = renderer(), missing = art.sources[0];
  assert.equal(await art.load(async src => { if (src === missing) throw Error('offline'); return { src }; }), false);
  assert.equal(art.ready, false); assert.deepEqual(Array.from(art.errors), [missing]);
  const retried = [];
  assert.equal(await art.load(async src => { retried.push(src); return { src }; }), true);
  assert.deepEqual(retried, [missing]); assert.equal(art.ready, true);
});
test('each rendered character uses its image and preserves the caller canvas state', () => {
  const art = renderer(); art.install(src => ({ src }));
  const draws = [], modes = [], stack = [];
  const c = new Proxy({ imageSmoothingEnabled: true,
    save() { stack.push(this.imageSmoothingEnabled); },
    restore() { this.imageSmoothingEnabled = stack.pop(); },
    drawImage(image, ...args) { draws.push([image.src, ...args]); modes.push(this.imageSmoothingEnabled); }
  }, { get: (o, key) => o[key] ?? (() => {}) });
  for (const species of art.species) for (const direction of ['up', 'right', 'down', 'left']) {
    assert.equal(art.draw(c, species, 50, 60, { direction, moving: true, anim: 1.2 }), true);
    assert.equal(c.imageSmoothingEnabled, true); assert.equal(stack.length, 0);
  }
  assert.equal(draws.length, art.species.length * 4); assert.ok(modes.every(value => value === false));
  assert.equal(renderer().draw(c, 'chicken', 0, 0), false, 'never draw an undecoded image');
});
