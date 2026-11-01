const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
(async()=>{
const root=path.resolve(__dirname,'..'),base='assets/sprites/comfyui-110';
// Raster backgrounds keep stretched menu boards independent of SVG document sizing.
for(const name of ['farm-sign','menu-plank']){
  const image=await loadImage(path.join(root,'assets/ui',name+'.svg'));
  const canvas=createCanvas(image.width*4,image.height*4);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
  const target=path.join(root,'assets/ui',name+'.png'),png=canvas.toBuffer('image/png');
  if(!fs.existsSync(target)||!fs.readFileSync(target).equals(png))fs.writeFileSync(target,png);
}
const nativeArt=JSON.parse(vm.runInNewContext(fs.readFileSync(path.join(root,'systems/pixellab-art-data.js'),'utf8')+';JSON.stringify(PixelLabArtData)',{SpriteData:{},PremiumWildlifeData:{}}));
const directions=['down','downleft','left','upleft','up','upright','right','downright'];
function read(id){
  const meta=JSON.parse(fs.readFileSync(path.join(root,base,'meta',id+'.json'),'utf8')),d=meta.definition;
  assert.equal(meta.id,id);assert.equal(meta.silhouettePreserved,true);
  if(id!=='wolf-hardcore'){
    assert.equal(meta.method,'native-recovery');assert.deepEqual(d,nativeArt[id]);
  }else{
    assert.equal(d.provider,'comfyui');assert.ok(path.resolve(root,d.source).startsWith(path.join(root,base,'runtime')+path.sep));
  }
  const png=fs.readFileSync(path.join(root,d.source));assert.equal(png.subarray(1,4).toString(),'PNG');
  assert.equal(png.readUInt32BE(16),d.width);assert.equal(png.readUInt32BE(20),d.height);
  for(const required of ['idle','walk','run'])assert.ok(d.actions[required]);
  for(const [action,poses] of Object.entries(d.actions)){
    assert.deepEqual(Object.keys(poses).sort(),directions.slice().sort());
    for(const pose of Object.values(poses)){
      assert.ok(pose.frames.length>=(action==='idle'?1:8));
      for(const f of pose.frames){
        assert.equal(f.src,d.source);
        assert.ok([f.x,f.y,f.w,f.h].every(Number.isInteger));
        assert.ok(f.x>=0&&f.y>=0&&f.w>0&&f.h>0&&f.x+f.w<=d.width&&f.y+f.h<=d.height);
      }
    }
  }
  return d;
}
const data={curupira:read('curupira'),wolf:read('wolf')};
data.wolf.variants={hardcore:read('wolf-hardcore')};
const sunlight=vm.runInNewContext(fs.readFileSync(path.join(root,'systems/sunlight.js'),'utf8')+';Sunlight');
sunlight.install(createCanvas);
for(const [id,species]of [['goat','goat'],['turkey','turkey'],['owl','owl'],['pony','horse']]){
  const meta=JSON.parse(fs.readFileSync(path.join(root,'assets/sprites/wardrobe-117/meta',id+'.json'),'utf8')),d=meta.definition;
  assert.equal(meta.method,'klein-reference-edit');assert.equal(meta.workflow,'scripts/generate-klein-rewards.py');
  assert.deepEqual(meta.styleReferences,['skin-zeca','skin-pipoca','skin-amora','skin-pacoca']);
  assert.equal(d.provider,'comfyui');assert.equal(d.edition,117);
  assert.ok(d.source.startsWith('assets/sprites/wardrobe-117/runtime/'));
  const png=fs.readFileSync(path.join(root,d.source));assert.equal(png.readUInt32BE(16),d.width);assert.equal(png.readUInt32BE(20),d.height);
  const image=await loadImage(path.join(root,d.source));
  for(const action of ['idle','walk']){
    assert.ok(d.actions[action]);
    for(const pose of Object.values(d.actions[action]))assert.ok(pose.frames.length>=(action==='idle'?1:8));
  }
  if(d.actions.run)for(const pose of Object.values(d.actions.run))assert.ok(pose.frames.length>=8);
  for(const poses of Object.values(d.actions)){
    assert.deepEqual(Object.keys(poses).sort(),directions.slice().sort());
    for(const pose of Object.values(poses))for(const f of pose.frames){
      assert.equal(f.src,d.source);assert.ok(f.x>=0&&f.y>=0&&f.x+f.w<=d.width&&f.y+f.h<=d.height);
      const bounds=sunlight.footprint(image,f.w,f.h,[f.x,f.y,f.w,f.h]);assert.ok(bounds);
      f.grounding=Object.fromEntries(Object.entries(bounds).map(([key,value])=>[key,value/(['top','bottom'].includes(key)?f.h:f.w)]));
    }
  }
  d.poses=d.actions.walk;
  data[species]={...nativeArt[species],variants:{reward:d}};
}
const output='systems/comfyui-art-data.js';
const code='/* Reviewed native drawings and exclusive character variants. */\nconst ComfyArtData = '+JSON.stringify(data)+';\nObject.assign(SpriteData,ComfyArtData);\n';
fs.writeFileSync(path.join(root,output),code);
const scenes=JSON.parse(fs.readFileSync(path.join(root,'assets/cinematics/endings-110/manifest.json'),'utf8'));
assert.deepEqual(Object.keys(scenes).sort(),['easy','hard','hardcore','normal']);
for(const scene of Object.values(scenes)){
  assert.ok(scene.src.startsWith('assets/cinematics/endings-110/'));
  assert.ok(fs.statSync(path.join(root,scene.src)).size>10000);
}
const sceneOutput='systems/ending-scene-data.js';
fs.writeFileSync(path.join(root,sceneOutput),'/* Four original local ComfyUI stages. */\nconst EndingSceneData = '+
  JSON.stringify(Object.fromEntries(Object.entries(scenes).map(([key,{src,title}])=>[key,{src,title}])))+';\n');
for(const file of ['index.html','shuffle/index.html']){
  const target=path.join(root,file);let html=fs.readFileSync(target,'utf8');
  for(const name of [output,sceneOutput,'systems/character-art.js','systems/audio-system.js','systems/skin-system.js','systems/ui.js','systems/interface-motion.js','systems/farm-sprites.js','systems/farm-details.js','systems/lake-challenge.js','systems/rescue-system.js','systems/menu-character-data.js','systems/menu-thor.js','systems/menu-scene.js','menu.css','expedition-ui.css','systems/player.js','systems/environment-system.js','systems/game-manager.js','systems/end-game-sequence.js','game.js','shuffle/menu-link.css','shuffle/style.css','shuffle/ui.js','shuffle/result-art.js']){
    if(file.startsWith('shuffle')&&name===sceneOutput)continue;
    const hash=createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex').slice(0,12);
    const reference=file.startsWith('shuffle')&&name.startsWith('shuffle/')?path.basename(name):name;
    html=html.replace(new RegExp('('+reference.replaceAll('.','\\.')+'\\?v=)[^"\\s]+','g'),'$1'+hash);
  }
  fs.writeFileSync(target,html);
}
console.log('Art: native wolf and Curupira, exclusive Hardcore wolf, 4 endings and 4 costumed reward animals.');
})().catch(error=>{console.error(error);process.exitCode=1;});
