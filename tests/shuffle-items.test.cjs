const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas,loadImage}=require('@napi-rs/canvas');

test('every Shuffle actor has two distinct installed PixelLab result poses with transparent margins',async()=>{
  const S=require('../shuffle/survival.js'),root=path.resolve(__dirname,'..');
  const poses=vm.runInNewContext(fs.readFileSync(path.join(root,'shuffle/result-art.js'),'utf8')+';ShuffleResultArt');
  const ids=[...Object.keys(S.HEROES).map(id=>'hero-'+id),...Object.keys(S.ENEMIES).map(id=>'enemy-'+id)];
  assert.deepEqual(Object.keys(poses).sort(),ids.sort());
  for(const id of ids){
    assert.notEqual(poses[id].win,poses[id].lose);
    for(const outcome of ['win','lose']){
      const src=poses[id][outcome];assert.match(src,/^assets\/shuffle\/results\/[a-z0-9-]+\.png$/);
      const img=await loadImage(path.join(root,src));assert.equal(img.width,128);assert.equal(img.height,128);
      const c=createCanvas(128,128),g=c.getContext('2d');g.drawImage(img,0,0);
      const pixels=g.getImageData(0,0,128,128).data;let visible=0,clear=0;
      for(let i=3;i<pixels.length;i+=4){if(pixels[i])visible++;else clear++;}
      assert.ok(visible>200&&clear>2000,`${id}/${outcome}: visible transparent sprite`);
      for(let i=0;i<128;i++)for(const [x,y] of [[i,0],[i,127],[0,i],[127,i]])assert.equal(pixels[(y*128+x)*4+3],0,`${id}/${outcome}: clipped edge`);
    }
  }
});

test('six PixelLab items render distinct complete transparent sprites in world and HUD',async()=>{
  const root=path.resolve(__dirname,'..');
  const fx=vm.runInNewContext(fs.readFileSync(path.join(root,'shuffle/effects.js'),'utf8')+';ShuffleFX');
  const atlas=await loadImage(path.join(root,'assets/shuffle/items-pixel.png'));
  fx.setItemSheet(atlas);
  assert.throws(()=>fx.setItemSheet({width:1,height:1}),/Atlas/);
  const signatures=new Set();
  for(const kind of ['cornshot','egg','sickle','boots','milk','xp']){
    const canvas=createCanvas(64,64),c=canvas.getContext('2d');
    fx.icon(c,kind,32,32,64);
    const pixels=c.getImageData(0,0,64,64).data;let ink=0;
    for(let y=0;y<64;y++)for(let x=0;x<64;x++){
      const alpha=pixels[(y*64+x)*4+3];if(alpha)ink++;
      if(x===0||y===0||x===63||y===63)assert.equal(alpha,0,`${kind}: clipped sprite`);
    }
    assert.ok(ink>100&&ink<3000,kind);signatures.add(canvas.toBuffer('image/png').toString('base64'));
    for(const size of [22,48,60])fx.icon(c,kind,32,32,size);
    const before=c.getTransform();c.imageSmoothingEnabled=true;
    fx.loot(c,{kind,x:32,y:32},2,false);
    assert.deepEqual(c.getTransform(),before);assert.equal(c.imageSmoothingEnabled,true);
  }
  assert.equal(signatures.size,6);
});
