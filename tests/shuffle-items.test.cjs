const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas,loadImage}=require('@napi-rs/canvas');

test('all powers, fusions and pickups use forty distinct padded PixelLab catalog sprites',async()=>{
  const S=require('../shuffle/survival.js'),root=path.resolve(__dirname,'..');
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/shuffle/power-catalog.json'),'utf8'));
  const ids=[...Object.keys(S.POWERS),'milk','xp',...Object.keys(S.FUSIONS).map(id=>'fusion-'+id)];
  assert.equal(manifest.provider,'PixelLab');assert.deepEqual(Object.keys(manifest.cells),ids);
  const fx=vm.runInNewContext(fs.readFileSync(path.join(root,'shuffle/effects.js'),'utf8')+';ShuffleFX');
  const atlas=await loadImage(path.join(root,manifest.source));fx.setCatalogSheet(atlas,ids);
  assert.throws(()=>fx.setCatalogSheet({width:1,height:1},ids),/Atlas/);
  assert.throws(()=>fx.setCatalogSheet(atlas,Array(40).fill('egg')),/Atlas/);
  const signatures=new Set();
  for(const [i,id]of ids.entries()){
    assert.deepEqual(manifest.cells[id],[i%4*64,Math.floor(i/4)*64]);
    const canvas=createCanvas(64,64),c=canvas.getContext('2d');fx.catalogIcon(c,id,32,32,64);
    const pixels=c.getImageData(0,0,64,64).data;let visible=0;
    for(let y=0;y<64;y++)for(let x=0;x<64;x++)if(pixels[(y*64+x)*4+3]){
      visible++;assert.ok(x>=6&&x<58&&y>=6&&y<58,id+': cropped silhouette');
    }
    assert.ok(visible>80);signatures.add(canvas.toBuffer('image/png').toString('base64'));
    c.translate(2,3);c.globalAlpha=.7;c.imageSmoothingEnabled=true;const before=c.getTransform();
    fx.catalogIcon(c,id,30,30,22,.4);assert.deepEqual(c.getTransform(),before);assert.equal(c.imageSmoothingEnabled,true);assert.ok(Math.abs(c.globalAlpha-.7)<.01);
    if(id.startsWith('fusion-')){
      const fusion=id.slice(7),a=createCanvas(64,64);fx.fusionIcon(a.getContext('2d'),{...S.FUSIONS[fusion],fusion},32,32,64);
      assert.equal(a.toBuffer('image/png').toString('base64'),[...signatures].at(-1));
    }
  }
  assert.equal(signatures.size,40);
});

test('every hero and enemy has two dedicated, distinct offline result poses',async()=>{
  const S=require('../shuffle/survival.js'),root=path.resolve(__dirname,'..');
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/shuffle/results/manifest.json'),'utf8'));
  const runtime=vm.runInNewContext(fs.readFileSync(path.join(root,'shuffle/result-art.js'),'utf8')+';ShuffleResultArt');
  assert.deepEqual(JSON.parse(JSON.stringify(runtime)),manifest);
  const actors=[...Object.keys(S.HEROES).map(id=>'hero-'+id),...Object.keys(S.ENEMIES).map(id=>'enemy-'+id)];
  assert.deepEqual(Object.keys(manifest).sort(),actors.sort());
  for(const id of actors){
    assert.notEqual(manifest[id].win,manifest[id].lose);
    const pixels=new Set();
    for(const outcome of ['win','lose']){
      const img=await loadImage(path.join(root,manifest[id][outcome]));assert.equal(img.width,128);assert.equal(img.height,128);
      const canvas=createCanvas(128,128),c=canvas.getContext('2d');c.drawImage(img,0,0);
      const px=c.getImageData(0,0,128,128).data;let ink=0,clear=0;
      pixels.add(Buffer.from(px).toString('base64'));
      for(let i=3;i<px.length;i+=4){if(px[i])ink++;else clear++;}
      assert.ok(ink>100&&clear>100,id+'/'+outcome);
    }
    assert.equal(pixels.size,2,id+': outcomes must differ in pixels, not just filenames');
  }
});

test('Sophis, crow and owl result poses preserve their installed PixelLab pixels and transparent margins',async()=>{
  const {createHash}=require('node:crypto'),root=path.resolve(__dirname,'..');
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/shuffle/results/manifest.json'),'utf8'));
  const provenance=JSON.parse(fs.readFileSync(path.join(root,'assets/shuffle/results/atlas-poses.json'),'utf8'));
  assert.deepEqual(Object.keys(provenance).sort(),['enemy-amanda','enemy-crow','enemy-owl']);
  for(const [id,pair]of Object.entries(provenance))for(const [outcome,pose]of Object.entries(pair)){
    const meta=JSON.parse(fs.readFileSync(path.join(root,'assets/sprites/pixellab-108/meta',id.slice(6)+'.json'),'utf8'));
    assert.equal(pose.provider,'PixelLab');assert.equal(pose.method,'installed-atlas-frame');
    assert.equal(pose.source,meta.definition.source);assert.equal(meta.definition.provider,'pixellab');
    const source=fs.readFileSync(path.join(root,pose.source));
    assert.equal(createHash('sha256').update(source).digest('hex'),pose.sourceSha256);
    const f=meta.definition.actions[pose.action][pose.direction].frames[pose.index],a=pose.crop,b=pose.destination;
    assert.ok(a.x>=f.x&&a.y>=f.y&&a.x+a.w<=f.x+f.w&&a.y+a.h<=f.y+f.h);
    assert.ok(Number.isInteger(pose.scale)&&pose.scale>0);
    assert.equal(b.w,a.w*pose.scale);assert.equal(b.h,a.h*pose.scale);
    assert.ok(b.x>=6&&b.y>=6&&b.x+b.w<=122&&b.y+b.h<=122,id+'/'+outcome+': complete padded body');
    const expected=createCanvas(128,128),g=expected.getContext('2d');g.imageSmoothingEnabled=false;
    g.drawImage(await loadImage(source),a.x,a.y,a.w,a.h,b.x,b.y,b.w,b.h);
    const actual=createCanvas(128,128),c=actual.getContext('2d');c.drawImage(await loadImage(path.join(root,manifest[id][outcome])),0,0);
    assert.deepEqual(c.getImageData(0,0,128,128).data,g.getImageData(0,0,128,128).data,id+'/'+outcome+': no replacement art or filters');
  }
});

test('every Shuffle portrait uses its own installed animated PixelLab character atlas',async()=>{
  const S=require('../shuffle/survival.js'),root=path.resolve(__dirname,'..');
  const source=fs.readFileSync(path.join(root,'systems/pixellab-art-data.js'),'utf8'),globals={};
  for(const [,name]of source.matchAll(/Object\.assign\((\w+)/g))globals[name]={};
  const context=vm.createContext(globals);vm.runInContext(source,context);
  const art=vm.runInContext(fs.readFileSync(path.join(root,'systems/character-art.js'),'utf8')+';CharacterArt',context);
  const actors=[...Object.keys(S.HEROES).map(skin=>['chicken',{skin}]),...Object.keys(S.ENEMIES).map(id=>[id,{}])];
  for(const [id,options]of actors){
    for(const mood of ['happy','sad']){
      const chosen=art.frameFor(id,{...options,mood,direction:'down',moving:false}),f=chosen.frame;
      assert.equal(chosen.spriteName,id==='chicken'?(art.appearances[options.skin].sprite||art.appearances[options.skin].species):id);
      assert.equal(Object.keys(chosen.definition.actions.walk).length,8);
      assert.ok(Object.values(chosen.definition.actions.walk).every(p=>p.frames.length>1));
      const img=await loadImage(path.join(root,f.src));
      assert.ok(f.x>=0&&f.y>=0&&f.x+f.w<=img.width&&f.y+f.h<=img.height);
      const c=createCanvas(f.w,f.h),g=c.getContext('2d');g.drawImage(img,f.x,f.y,f.w,f.h,0,0,f.w,f.h);
      const pixels=g.getImageData(0,0,f.w,f.h).data;let visible=0,clear=0;
      for(let i=3;i<pixels.length;i+=4){if(pixels[i])visible++;else clear++;}
      assert.ok(visible>100&&clear>100,`${id}/${mood}: visible transparent portrait`);
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

test('eight new power sprites and three scenery sprites are distinct, padded and actually rendered',async()=>{
  const root=path.resolve(__dirname,'..'),fx=vm.runInNewContext(fs.readFileSync(path.join(root,'shuffle/effects.js'),'utf8')+';ShuffleFX');
  const atlas=await loadImage(path.join(root,'assets/shuffle/chaos-powers.png'));fx.setPowerSheet(atlas);
  assert.throws(()=>fx.setPowerSheet({width:1,height:1}),/Atlas/);
  const signatures=new Set();
  for(const kind of ['feather','lightning','water','carrot','claw','bark','honk','shield']){
    const c=createCanvas(64,64),g=c.getContext('2d');fx.icon(g,kind,32,32,64);
    const px=g.getImageData(0,0,64,64).data;let ink=0;
    for(let y=0;y<64;y++)for(let x=0;x<64;x++)if(px[(y*64+x)*4+3]){ink++;assert.ok(x>0&&x<63&&y>0&&y<63,kind+' is clipped');}
    assert.ok(ink>80,kind);signatures.add(c.toBuffer('image/png').toString('base64'));
  }
  assert.equal(signatures.size,8);
  const scenery=await loadImage(path.join(root,'assets/shuffle/chaos-scenery.png'));
  for(let i=0;i<3;i++){
    const c=createCanvas(64,96),g=c.getContext('2d');g.drawImage(scenery,i*64,0,64,96,0,0,64,96);
    const px=g.getImageData(0,0,64,96).data;let ink=0,bottom=0;
    for(let y=0;y<96;y++)for(let x=0;x<64;x++)if(px[(y*64+x)*4+3]){ink++;bottom=Math.max(bottom,y);assert.ok(x>0&&x<63&&y>0&&y<95);}
    assert.ok(ink>100);assert.equal(bottom,87,'scenery base aligns with the renderer');
  }
});
