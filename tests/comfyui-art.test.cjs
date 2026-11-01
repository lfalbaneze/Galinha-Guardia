const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..');
const originals=JSON.parse(require('node:vm').runInNewContext(fs.readFileSync(path.join(root,'systems/pixellab-art-data.js'),'utf8')+';JSON.stringify(PixelLabArtData)',{SpriteData:{},PremiumWildlifeData:{}}));
const meta=id=>JSON.parse(fs.readFileSync(path.join(root,'assets/sprites/comfyui-110/meta',id+'.json'),'utf8'));
async function pixels(src){
  const image=await loadImage(path.join(root,src)),c=createCanvas(image.width,image.height).getContext('2d');c.drawImage(image,0,0);
  return {width:image.width,height:image.height,data:c.getImageData(0,0,image.width,image.height).data};
}
test('all 920 frames preserve authored motion; the wolf and Curupira recover their exact original pixels',async()=>{
  let count=0;
  for(const id of ['curupira','wolf','wolf-hardcore']){
    const m=meta(id),d=m.definition,old=await pixels(m.sourceDefinition),current=await pixels(d.source);
    assert.equal(current.width,old.width);assert.equal(current.height,old.height);
    let changed=0,visible=0;
    for(let i=0;i<old.data.length;i+=4){
      assert.equal(current.data[i+3],old.data[i+3],id+' preserves every opaque foot and silhouette pixel');
      if(old.data[i+3]){visible++;if([0,1,2].some(j=>current.data[i+j]!==old.data[i+j]))changed++;}
    }
    if(id!=='wolf-hardcore')assert.equal(changed,0,id+' face and line art stay intact');
    else assert.ok(changed/visible>.25,id+' contains a real repaint');
    const original=originals[id==='wolf-hardcore'?'wolf':id];
    assert.deepEqual(Object.keys(d.actions),Object.keys(original.actions));
    for(const [action,poses]of Object.entries(d.actions))for(const [direction,pose]of Object.entries(poses)){
      assert.equal(pose.flip,false);assert.equal(pose.frames.length,original.actions[action][direction].frames.length);
      for(const [i,f]of pose.frames.entries())assert.deepEqual(f.grounding,original.actions[action][direction].frames[i].grounding);
    }
    count+=m.frames;
  }
  assert.equal(count,920);
});
test('the shared renderer loads the Hardcore variant and selects its complete native directions and actions',async()=>{
  const art=await require('../scripts/sprite-loader.cjs').loadArt(),night=meta('wolf-hardcore').definition.source;
  assert.ok(art.ready&&art.sources.includes(night));assert.equal(art.species.length,34);
  for(const direction of art.directions)for(const action of ['idle','walk','run','angry','scared','happy','sad']){
    const frame=art.frameFor('wolf',{variant:'hardcore',direction,action,moving:action!=='idle',anim:1});
    assert.equal(frame.frame.src,night);assert.equal(frame.action,action);assert.equal(frame.direction,direction);
    assert.notEqual(art.frameFor('wolf',{direction,action}).frame.src,night);
  }
});
test('actual gameplay renders the new run cycle during pursuit and confines the dark model to Hardcore',()=>{
  const draws=[],ctx=new Proxy({drawImage(image,...args){if(image.src)draws.push({src:image.src,args});}},
    {get:(o,key)=>o[key]??(()=>({addColorStop(){}})),set:(o,key,value)=>(o[key]=value,true)});
  const game=require('./helpers.cjs').createGame(()=>.5,{drawingContext:ctx});
  game.run("CharacterArt.install(src=>({src}));Object.assign(state.entities.wolf,{vx:210,vy:0,anim:0,mode:'chase',direction:'right',heading:0});");
  for(const difficulty of ['normal','hardcore']){
    draws.length=0;game.run(`state.difficultyKey='${difficulty}';drawWolf(state.entities.wolf)`);
    const d=meta(difficulty==='hardcore'?'wolf-hardcore':'wolf').definition,draw=draws.find(item=>item.src===d.source);
    assert.ok(draw);const frame=d.actions.run.right.frames[0];
    assert.deepEqual(draw.args.slice(0,4),[frame.x,frame.y,frame.w,frame.h]);
  }
});
