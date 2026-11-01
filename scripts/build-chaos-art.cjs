const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto'),S=require('../shuffle/survival.js');
const root=path.resolve(__dirname,'..'),read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const nativeArt=JSON.parse(vm.runInNewContext(fs.readFileSync(path.join(root,'systems/pixellab-art-data.js'),'utf8')+';JSON.stringify(PixelLabArtData)',{SpriteData:{},PremiumWildlifeData:{}}));
function png(source,width,height){
  assert.ok(path.resolve(root,source).startsWith(path.join(root,'assets')+path.sep));
  const bytes=fs.readFileSync(path.join(root,source));assert.equal(bytes.subarray(1,4).toString(),'PNG');
  assert.equal(bytes.readUInt32BE(16),width);assert.equal(bytes.readUInt32BE(20),height);
}
const projectiles=read('assets/shuffle/chaos-111/projectiles.json');png(projectiles.source,256,128);
assert.deepEqual(Object.keys(projectiles.cells),['eggshot','fire','dirt','hex','popcorn','frost','venom','fire-egg']);
for(const [i,cell]of Object.values(projectiles.cells).entries())assert.deepEqual(cell,[i%4*64,Math.floor(i/4)*64]);
const statics=read('assets/shuffle/chaos-111/statics.json');
for(const [group,w,h,count]of [['catalog',256,640,40],['powers',256,128,8],['items',192,128,6],['scenery',192,96,3]]){
  const item=statics[group];assert.equal(item.provider,'comfyui');png(item.source,w,h);assert.equal(Object.keys(item.cells).length,count);
  for(const [i,cell]of Object.values(item.cells).entries())assert.deepEqual(cell,[i%(w/64)*64,Math.floor(i/(w/64))*(group==='scenery'?96:64)]);
}
const appearances=vm.runInNewContext(fs.readFileSync(path.join(root,'systems/character-art.js'),'utf8')+';CharacterArt.appearances',{SpriteData:{}});
const required=[...new Set(['chicken','wolf','goose','fox','sheep','pig','rabbit','cow','duck','dog',...Object.keys(S.HEROES).map(id=>appearances[id]).map(a=>a.sprite||a.species),...Object.keys(S.ENEMIES)])];
assert.equal(required.length,31);
const characters=Object.fromEntries(required.map(id=>{
  const meta=read('assets/sprites/chaos-112/meta/'+id+'.json'),d=meta.definition;
  assert.equal(meta.id,id);
  if(id!=='hen-silkie'){
    assert.equal(meta.method,'native-recovery');assert.deepEqual(d,nativeArt[id]);
  }else{
    assert.equal(d.provider,'comfyui');assert.equal(d.edition,112);
    assert.match(d.source,new RegExp('^assets/sprites/chaos-112/runtime/'+id+'-[a-f0-9]{12}\\.png$'));
  }
  png(d.source,d.width,d.height);
  for(const poses of [d.poses,...Object.values(d.actions)]){
    assert.deepEqual(Object.keys(poses).sort(),['down','downleft','downright','left','right','up','upleft','upright']);
    for(const pose of Object.values(poses))for(const f of pose.frames){
      assert.equal(f.src,d.source);assert.ok([f.x,f.y,f.w,f.h].every(Number.isInteger));
      assert.ok(f.x>=0&&f.y>=0&&f.w>0&&f.h>0&&f.x+f.w<=d.width&&f.y+f.h<=d.height);
    }
  }
  return [id,d];
}));
const portraits=read('assets/shuffle/results/manifest.json');
assert.deepEqual(Object.keys(portraits).sort(),[...Object.keys(S.HEROES).map(id=>'hero-'+id),...Object.keys(S.ENEMIES).map(id=>'enemy-'+id)].sort());
for(const pair of Object.values(portraits)){assert.notEqual(pair.win,pair.lose);for(const source of Object.values(pair))png(source,128,128);}
fs.writeFileSync(path.join(root,'shuffle/chaos-art-data.js'),'/* Reviewed character drawings and effects for Revoada do Caos. */\nconst ChaosArtData = '+JSON.stringify({projectiles,...statics})+';\nconst ChaosCharacterArtData = '+JSON.stringify(characters)+';\nObject.assign(SpriteData,ChaosCharacterArtData);\n');
fs.writeFileSync(path.join(root,'shuffle/result-art.js'),'/* Current identities and locally repainted result portraits. */\nconst ShuffleResultArt = '+JSON.stringify(portraits)+';\n');
const htmlFile=path.join(root,'shuffle/index.html');
const html=fs.readFileSync(htmlFile,'utf8').replace(/src="([^"?]+\.js)(?:\?[^\"]*)?"/g,(match,source)=>{
  const file=path.resolve(path.dirname(htmlFile),source);assert.ok(file.startsWith(root+path.sep));
  return 'src="'+source+'?v='+createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0,12)+'"';
});
fs.writeFileSync(htmlFile,html);console.log('Revoada do Caos: 31 animated characters, 58 portraits and 65 effect/item/prop sprites validated.');
