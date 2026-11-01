const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const effects=()=>vm.runInNewContext(fs.readFileSync(path.join(root,'shuffle/effects.js'),'utf8')+';ShuffleFX');
const projectiles=read('assets/shuffle/chaos-111/projectiles.json');

test('eight projectile sprites have distinct complete silhouettes and visible ice and poison colors',async()=>{
  const image=await loadImage(path.join(root,projectiles.source)),fx=effects();fx.setProjectileSheet(image);
  assert.throws(()=>fx.setProjectileSheet({width:1,height:1}),/Atlas/);
  const signatures=new Set();
  for(const [id,[x,y]]of Object.entries(projectiles.cells)){
    const c=createCanvas(64,64),g=c.getContext('2d');fx.icon(g,id,32,32,64);
    const px=g.getImageData(0,0,64,64).data;let visible=0,green=0,blue=0;
    for(let y=0;y<64;y++)for(let x=0;x<64;x++){
      const i=(y*64+x)*4;if(!px[i+3])continue;visible++;
      assert.ok(x>=8&&x<56&&y>=8&&y<56,id+' has a transparent gutter');
      if(px[i+1]>px[i]*1.15&&px[i+1]>px[i+2]*1.35)green++;
      if(px[i+2]>px[i]*1.15&&px[i+1]>px[i]*1.1)blue++;
    }
    assert.ok(visible>80,id);if(id==='venom')assert.ok(green>30);if(id==='frost')assert.ok(blue>30);
    signatures.add(c.toBuffer('image/png').toString('base64'));
    const expected=createCanvas(64,64);expected.getContext('2d').drawImage(image,x,y,64,64,0,0,64,64);
    assert.deepEqual(px,expected.getContext('2d').getImageData(0,0,64,64).data);
  }
  assert.equal(signatures.size,8);
});

test('real combat renderers choose the correct egg, fire, soil, spell, popcorn, ice and poison sprites',async()=>{
  const image=await loadImage(path.join(root,projectiles.source)),fx=effects();fx.setProjectileSheet(image);
  const draws=[],rotations=[],c=new Proxy({drawImage(img,x,y){draws.push({img,x,y});},rotate(angle){rotations.push(angle);}},
    {get:(o,k)=>o[k]??(()=>({addColorStop(){}}))});
  for(const [shot,id]of [[{kind:'hero',visual:'egg'},'eggshot'],[{kind:'frost',visual:'feather'},'frost'],
    [{kind:'venom',visual:'water'},'venom'],[{kind:'fireball',visual:'egg'},'fire-egg'],
    [{kind:'fusion',fusion:'solar',visual:'egg'},'fire-egg'],[{kind:'fusion',fusion:'popcorn',popped:true},'popcorn']]){
    draws.length=0;rotations.length=0;fx.projectile(c,{...shot,x:0,y:0,vx:0,vy:1},1,true);
    assert.equal(draws.length,1);assert.equal(draws[0].img,image);assert.deepEqual([draws[0].x,draws[0].y],projectiles.cells[id]);
    assert.equal(rotations[0],Math.PI/2,'the visual follows the actual shot velocity');
  }
  for(const [kind,id]of [['fire','fire'],['dirt','dirt'],['spell','hex']]){
    draws.length=0;fx.enemyShot(c,{kind,x:0,y:0,vx:1,vy:0},1,true);
    assert.equal(draws.length,1);assert.deepEqual([draws[0].x,draws[0].y],projectiles.cells[id]);
  }
});

test('collection and fusion ingredients use their catalog art instead of disappearing',async()=>{
  const manifest=read('assets/shuffle/chaos-111/statics.json').catalog,image=await loadImage(path.join(root,manifest.source)),fx=effects();
  fx.setCatalogSheet(image,Object.keys(manifest.cells));
  const draws=[],c=new Proxy({drawImage(img,x,y){draws.push({img,x,y});}},{get:(o,k)=>o[k]??(()=>({addColorStop(){}}))});
  fx.icon(c,'magnet',0,0);assert.deepEqual([draws[0].x,draws[0].y],manifest.cells.magnet);
  draws.length=0;fx.effect(c,{kind:'collect',visual:'haste',x:0,y:0,time:.4,duration:.55},true);
  assert.deepEqual([draws[0].x,draws[0].y],manifest.cells.haste);
  draws.length=0;fx.effect(c,{kind:'fusion',fusion:'blizzard',ingredients:['frost','spiral'],x:0,y:0,time:.5,duration:.55},true);
  assert.deepEqual([draws[0].x,draws[0].y],manifest.cells.frost);assert.deepEqual([draws[1].x,draws[1].y],manifest.cells.spiral);
});

test('all 58 portraits preserve current bodies; native emotions preserve the exact installed pixels',async()=>{
  const manifest=read('assets/shuffle/results/manifest.json'),provenance=read('assets/shuffle/chaos-111/portraits.json');
  const art=await require('../scripts/sprite-loader.cjs').loadArt('chaos');let count=0;
  for(const [id,pair]of Object.entries(provenance))for(const [outcome,pose]of Object.entries(pair)){
    const source=await loadImage(path.join(root,pose.source)),expected=createCanvas(128,128),g=expected.getContext('2d');g.imageSmoothingEnabled=false;
    const a=pose.crop,b=pose.destination;g.drawImage(source,a.x,a.y,a.w,a.h,b.x,b.y,b.w,b.h);
    const current=createCanvas(128,128),c=current.getContext('2d');c.drawImage(await loadImage(path.join(root,manifest[id][outcome])),0,0);
    const before=g.getImageData(0,0,128,128).data,after=c.getImageData(0,0,128,128).data;
    if(pose.provider==='comfyui')for(let i=3;i<after.length;i+=4)assert.equal(after[i],before[i],id+' keeps its anatomy');
    else assert.equal(Buffer.compare(Buffer.from(after),Buffer.from(before)),0,id+' uses the installed identity');
    const skin=id.startsWith('hero-')?id.slice(5):undefined,species=skin?'chicken':id.slice(6);
    assert.equal(pose.source,art.frameFor(species,{skin}).definition.source);count++;
  }
  assert.equal(count,58);
  assert.equal(provenance['hero-silkie'].win.method,'reference-preserving-repaint');
  for(const [id,pair]of Object.entries(provenance))if(id!=='hero-silkie')for(const pose of Object.values(pair))assert.equal(pose.provider,'installed-atlas',id+' keeps crisp native art');
});

test('all 31 mode characters preserve native drawings and eight-direction gaits, with the Silkie identity correction retained',async()=>{
  const {loadArt}=require('../scripts/sprite-loader.cjs'),main=await loadArt(),art=await loadArt('chaos');
  const context=vm.createContext({SpriteData:{}});vm.runInContext(fs.readFileSync(path.join(root,'shuffle/chaos-art-data.js'),'utf8'),context);
  const cast=vm.runInContext('ChaosCharacterArtData',context);assert.equal(Object.keys(cast).length,31);assert.ok(!cast.thor);
  for(const [id,definition]of Object.entries(cast)){
    if(id!=='hen-silkie'){
      const native=read('assets/sprites/pixellab-108/meta/'+id+'.json').definition;
      assert.equal(definition.provider,'pixellab');assert.equal(definition.source,native.source);
      assert.equal(main.frameFor(id).definition.source,native.source,'both modes use the recovered drawing');
      if(id==='wolf')assert.notEqual(main.frameFor(id,{variant:'hardcore'}).definition.source,native.source);
    }else{
      assert.equal(definition.provider,'comfyui');assert.equal(definition.edition,112);
      assert.notEqual(main.frameFor(id).definition.source,art.frameFor(id).definition.source,id+' is isolated to this mode');
    }
    const meta=read('assets/sprites/chaos-112/meta/'+id+'.json'),originalDefinition=main.frameFor(id).definition;
    const original=await loadImage(path.join(root,meta.sourceDefinition)),image=await loadImage(path.join(root,definition.source));
    const before=createCanvas(original.width,original.height),after=createCanvas(image.width,image.height);
    before.getContext('2d').drawImage(original,0,0);after.getContext('2d').drawImage(image,0,0);
    const a=before.getContext('2d').getImageData(0,0,original.width,original.height).data,b=after.getContext('2d').getImageData(0,0,image.width,image.height).data;
    const colors=new Set();let frames=0;
    for(const [action,poses]of Object.entries(definition.actions)){
      assert.equal(Object.keys(poses).length,8);if(action==='walk'||action==='run')assert.ok(Object.values(poses).every(p=>p.frames.length>=8));
      for(const [direction,pose]of Object.entries(poses)){assert.ok(!pose.flip,id+'/'+action+' uses authored views');for(const [index,f]of pose.frames.entries()){
        const previous=originalDefinition.actions[action][direction].frames[index];
        assert.equal(f.bottom,previous.bottom);assert.equal(f.cx,previous.cx);
        assert.equal(JSON.stringify(f.grounding),JSON.stringify(previous.grounding),id+' preserves the original grounded or airborne pivot');
        frames++;
        for(let y=f.y;y<f.y+f.h;y++)for(let x=f.x;x<f.x+f.w;x++){
          const i=(y*image.width+x)*4;assert.equal(a[i+3],b[i+3],id+'/'+action+' retains its authored silhouette');
          if(b[i+3])colors.add(b[i]+','+b[i+1]+','+b[i+2]);
        }
      }}
    }
    assert.ok(frames>=72);
    if(id!=='hen-silkie')assert.deepEqual(b,a,id+' preserves every original drawing pixel');
    else assert.ok(colors.size<=64,id+' has a limited coherent palette');
  }
  assert.doesNotMatch(fs.readFileSync(path.join(root,'index.html'),'utf8'),/chaos-art-data/);
});

test('the actual mode renderer selects diagonal gaits, correct proportions and grounded goose alerts',async()=>{
  const art=await require('../scripts/sprite-loader.cjs').loadArt('chaos'),S=require('../shuffle/survival.js');
  const data=Object.fromEntries(art.species.map(id=>[id,art.frameFor(id).definition]));
  const images=new Map(Object.entries(data).map(([id,d])=>[id,{source:d.source}]));
  const draws=[],ctx={save(){},restore(){},drawImage(...args){draws.push(args);},fillRect(){}};
  const actor={species:'chicken',x:100,y:200,traveled:0,age:1,health:100,maxHealth:100,mode:'hunt',moving:true,dx:0,dy:1};
  const run={player:actor,enemies:[],friends:[]},context=vm.createContext({CharacterArt:art,S,data,images,ctx,run,reduced:false,isSurvival:()=>true,label(){}});
  const source=fs.readFileSync(path.join(root,'shuffle/ui.js'),'utf8');
  vm.runInContext(source.slice(source.indexOf('  const animations=new WeakMap();'),source.indexOf('  const noise=')),context);context.actor=actor;
  const reference=art.frameFor('chicken',{direction:'down'}),world=51/((reference.frame.bottom-reference.frame.top)*reference.scale);
  const actors=[...Object.keys(S.HEROES).map(skin=>({species:'chicken',skin})),...Object.keys(S.ENEMIES).map(species=>({species,skin:undefined})),
    ...['sheep','pig','rabbit','cow','duck','dog'].filter(species=>!S.ENEMIES[species]).map(species=>({species,skin:undefined}))];
  assert.equal(actors.length,31);
  for(const identity of actors){
    Object.assign(actor,identity);const {species,skin}=identity;
    for(const [index,direction]of art.directions.entries()){
      const angle=index*Math.PI/4;actor.dx=Math.cos(angle);actor.dy=Math.sin(angle);actor.traveled+=3;
      vm.runInContext('animate(.1);sprite(actor)',context);const state=vm.runInContext('animation(actor)',context);
      assert.equal(state.direction,direction);
      const selected=art.frameFor(species,{skin,direction,moving:true,action:species==='owl'?'fly':undefined,anim:state.anim}),f=selected.frame,draw=draws.at(-1),scale=selected.scale*world;
      assert.equal(draw[0].source,selected.definition.source);assert.deepEqual(draw.slice(1,5),[f.x,f.y,f.w,f.h]);
      assert.deepEqual(draw.slice(7),[Math.round(f.w*scale),Math.round(f.h*scale)]);
      const bottom=['owl','crow'].includes(species)?f.bottom*scale:f.grounding.bottom*Math.round(f.h*scale);
      assert.equal(draw[6],Math.round(actor.y-bottom));
    }
  }
  actor.species='goose';actor.mode='warning';actor.moving=false;actor.traveled+=0;
  vm.runInContext('animate(.1);sprite(actor)',context);const direction=vm.runInContext('animation(actor).direction',context);
  const alert=art.frameFor('goose',{direction,action:'alert',moving:true,anim:actor.age*7});
  assert.deepEqual(draws.at(-1).slice(1,5),[alert.frame.x,alert.frame.y,alert.frame.w,alert.frame.h]);
  assert.equal(vm.runInContext('actorHeight(actor)',context),(alert.pose.bottom-alert.pose.top)*alert.scale*world,'warnings clear the raised wings');
  actor.species='owl';actor.isBoss=true;run.enemies=[actor];run.hazards=[];
  assert.equal(vm.runInContext('danger()[0][2]',context),actor.y-vm.runInContext('actorHeight(actor)',context)-12,'boss owl siren clears its alert pose');
  actor.isBoss=false;run.enemies=[];
  const heights={};for(const id of ['chicken','skin-amora','wolf','cow']){actor.species=id;heights[id]=vm.runInContext('actorHeight(actor)',context);}
  assert.ok(heights['skin-amora']<heights.chicken);assert.ok(heights.wolf>heights.chicken);assert.ok(heights.cow>heights.wolf);
});
