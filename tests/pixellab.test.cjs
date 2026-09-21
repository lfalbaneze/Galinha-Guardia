const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {PixelLabClient,loadKey,writeJSON,readJSON}=require('../scripts/lib/pixellab-client.cjs');
const {cast,directions}=require('../scripts/lib/pixellab-cast.cjs');
const {packCharacter,installCandidate,buildData}=require('../scripts/lib/pixellab-import.cjs');
const {characterRequest,animationRequest,generateAnimation,downloadFrames}=require('../scripts/pixellab.cjs');
function temporary(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'farm-pixellab-'));t.after(()=>{
  assert.equal(path.dirname(path.resolve(dir)),path.resolve(os.tmpdir()));
  assert.ok(path.basename(dir).startsWith('farm-pixellab-'));fs.rmSync(dir,{recursive:true,force:true,maxRetries:3,retryDelay:50});
});return dir;}
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
test('credentials stay local, are parsed without evaluation, and environment takes precedence',t=>{
  const root=temporary(t);fs.writeFileSync(path.join(root,'.env.local'),'PIXELLAB_API_KEY="test-secret"\n');
  assert.equal(loadKey(root,{}),'test-secret');assert.equal(loadKey(root,{PIXELLAB_API_KEY:'process-secret'}),'process-secret');
  fs.writeFileSync(path.join(root,'.env.local'),'PIXELLAB_API_KEY=$(not-executed)\n');assert.equal(loadKey(root,{}),'$(not-executed)');
});
test('paid generation resumes pending jobs and completed jobs are not charged again',async t=>{
  const directory=temporary(t),calls=[];let polls=0;
  const fetchImpl=async (url,options)=>{calls.push({url,options});if(options.method==='POST')return json({background_job_id:'job-1',character_id:'dog-id'});
    return json({status:++polls===1?'processing':'completed'});};
  const first=new PixelLabClient({key:'private-token',directory,fetchImpl,pause:async()=>{},log:()=>{},maxPolls:1});
  await assert.rejects(first.job('dog','/create-character-pro',{description:'dog'}),/ainda em processamento/);
  const second=new PixelLabClient({key:'private-token',directory,fetchImpl,pause:async()=>{},log:()=>{}});
  await second.job('dog','/create-character-pro',{description:'dog'});const count=calls.length;
  await second.job('dog','/create-character-pro',{description:'dog'});assert.equal(calls.length,count);
  assert.equal(calls.filter(c=>c.options.method==='POST').length,1);
  assert.equal(calls[0].options.headers.Authorization,'Bearer private-token');
  assert.ok(!fs.readFileSync(path.join(directory,fs.readdirSync(directory)[0]),'utf8').includes('private-token'));
});
test('an ambiguous paid submission stays locked instead of silently submitting twice',async t=>{
  const directory=temporary(t);let requests=0;
  const client=new PixelLabClient({key:'key',directory,fetchImpl:async()=>{requests++;throw Error('network');},log:()=>{}});
  await assert.rejects(client.job('dog','/create-character-pro',{description:'dog'}),/conexão/);
  await assert.rejects(client.job('dog','/create-character-pro',{description:'dog'}),/sem resposta confirmada/);
  assert.equal(requests,1);
});
test('completed work survives expiration of the remote job record',async t=>{
  const directory=temporary(t);let paid=0;
  const client=new PixelLabClient({key:'key',directory,log:()=>{},fetchImpl:async(url,options)=>{
    if(options.method==='POST'){paid++;return json({character_id:'existing-character',background_job_id:'expired-job'});}
    if(url.includes('/background-jobs/'))return json({},404);
    return json({status:'completed',directions:8,rotation_urls:Object.fromEntries(Object.keys(directions).map(d=>[d,'https://example.com/'+d+'.png']))});
  }});
  const result=await client.job('dog','/create-character-pro',{description:'dog'});
  assert.equal(result.character_id,'existing-character');assert.equal(paid,1);
});
test('invalid credentials and insufficient credits stop before generating more work',async t=>{
  for(const status of [401,402]){
    const directory=path.join(temporary(t),String(status));
    const client=new PixelLabClient({key:'not-logged',directory,fetchImpl:async()=>json({},status),log:()=>{}});
    await assert.rejects(client.job('dog','/create-character-pro',{description:'dog'}),status===401?/Chave/:/Saldo/);
    assert.equal(fs.readdirSync(directory).length,0);
  }
});
test('PNG download never sends the account key to the image host',async t=>{
  const dir=temporary(t),png=createCanvas(8,8).toBuffer('image/png');let seen;
  const client=new PixelLabClient({key:'account-key',directory:dir,fetchImpl:async(url,options)=>{seen=options;return new Response(png);}});
  await client.download('https://supabase.pixellab.ai/test.png',path.join(dir,'sprite.png'));
  assert.equal(seen.headers,undefined);assert.deepEqual(fs.readFileSync(path.join(dir,'sprite.png')),png);
  await assert.rejects(client.download('http://example.com/sprite.png',path.join(dir,'bad.png')),/Invalid asset/);
});
test('animation requests avoid south-only defaults, an extra static frame and incompatible Pro options',()=>{
  const item=cast[0],v3=animationRequest(item,'id','walk','walk in place');
  assert.deepEqual(v3.directions,Object.keys(directions));assert.equal(v3.directions.length,8);
  assert.equal(v3.frame_count,12);assert.equal(v3.keep_first_frame,false);
  const pro=animationRequest(item,'id','walk','walk in place','pro');
  assert.equal(Object.hasOwn(pro,'frame_count'),false);assert.equal(Object.hasOwn(pro,'keep_first_frame'),false);
});

test('default creation uses the documented v3 schema and species-sized canvases',()=>{
  const allowed=['description','reference_image','image_size','view','template_id','name','seed','no_background','outline','detail','enhance_prompt'];
  for(const item of cast){const body=characterRequest(item);assert.ok(Object.keys(body).every(key=>allowed.includes(key)));
    assert.ok([64,96,128].includes(body.image_size.width));assert.equal(body.no_background,true);
    assert.ok(body.description.length<=2000);assert.equal(body.template_id,item.template);}
  assert.equal(characterRequest(cast[0]).image_size.width,64);
  assert.equal(characterRequest(cast[0],'style-id','pro').style_character_id,'style-id');
});

test('installed PixelLab data takes precedence over earlier sprite attempts',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.ok(html.indexOf('pixel-art-data.js')<html.indexOf('pixellab-art-data.js'));
  assert.ok(html.indexOf('pixellab-art-data.js')<html.indexOf('character-art.js'));
});

test('partial animation acceptance submits only directions the service did not accept',async()=>{
  const submitted=[];
  const client={request:async()=>({animations:[]}),job:async(label,endpoint,body)=>{submitted.push(body.directions);return {directions:body.directions.slice(0,3)};}};
  await generateAnimation(client,cast[0],'id','walk','walk','v3');
  assert.deepEqual(submitted.map(d=>d.length),[8,5,2]);
  assert.deepEqual(submitted[1],Object.keys(directions).slice(3));
  assert.deepEqual(submitted[2],Object.keys(directions).slice(6));
});

test('a completed animation split across API groups is reused even with a different frame option',async()=>{
  const all=Object.keys(directions).map(direction=>({direction,frame_count:8,frames:Array(8).fill('sprite.png')}));
  const client={request:async()=>({animations:[{display_name:'farm-walk',directions:all.slice(0,3)},{display_name:'farm-walk',directions:all.slice(3)}]}),job:()=>assert.fail('must not buy the same animation twice')};
  await generateAnimation(client,cast[0],'id','walk','walk','v3',12);
});
test('download refuses an incomplete API character before writing frame files',async()=>{
  const client={request:async()=>({status:'completed',directions:4}),download:()=>assert.fail('must not download')};
  await assert.rejects(downloadFrames(client,cast[0],'id',{walk:'walk'}),/oito direções/);
});

test('read-only polling can recover a transient connection failure',async t=>{
  let requests=0;const client=new PixelLabClient({key:'private',directory:temporary(t),pause:async()=>{},fetchImpl:async()=>{
    if(++requests===1)throw Error('temporary network failure');return json({status:'completed'});
  }});
  assert.equal((await client.request('/background-jobs/existing')).status,'completed');assert.equal(requests,2);
});
async function fixture(t,options={}){
  const root=temporary(t),input=path.join(root,'input'),destination=path.join(root,'preview/pixellab/dog');fs.mkdirSync(input);
  const source={id:'dog',characterId:'test-character',actions:{idle:{},walk:{},scared:{},happy:{},run:{}}};
  for(const [action,poses] of Object.entries(source.actions))for(const direction of Object.keys(directions)){
    if(options.missing&&direction==='north-east')continue;
    poses[direction]=[];
    for(let i=0;i<(action==='idle'?1:8);i++){
      const canvas=createCanvas(48,48),c=canvas.getContext('2d');
      // Deliberately primitive test geometry, never used as production artwork.
      c.fillStyle=action==='scared'?'#eeaa33':'#ad7340';c.fillRect(14,16,20,16);
      c.fillStyle='#eeeeaa';c.fillRect(options.clipped?0:12+(i%4),31,4,5);c.fillRect(29-(i%4),31,4,5);
      c.fillStyle='#252520';c.fillRect(20+i,20,2,2);
      const filename=`${action}-${direction}-${i}.png`;fs.writeFileSync(path.join(input,filename),canvas.toBuffer('image/png'));poses[direction].push(filename);
    }
  }
  writeJSON(path.join(input,'frames.json'),source);
  return {root,input,destination,item:{...cast.find(c=>c.id==='dog'),height:20}};
}
test('import preserves all eight actual directions, stable pivots, transparent gutters and emotions',async t=>{
  const f=await fixture(t),{definition:d}=await packCharacter(f.item,f.input,f.destination);
  assert.equal(Object.keys(d.poses).length,8);assert.equal(d.pixelArt,true);assert.equal(d.smooth,false);
  assert.equal(d.actions.scared.down.frames.length,8);assert.equal(d.actions.idle.down.frames.length,1);
  const pivots=new Set(Object.values(d.actions).flatMap(p=>Object.values(p).flatMap(r=>r.frames.map(f=>`${f.cx}/${f.bottom}/${f.w}/${f.h}`))));
  assert.equal(pivots.size,1);assert.equal(new Set(Object.values(d.poses).map(p=>p.frames[0].y)).size,8);
  for(const p of Object.values(d.poses))assert.equal(p.flip,false);
  fs.mkdirSync(path.join(f.root,'systems'));installCandidate(f.root,'dog');assert.equal(buildData(f.root),1);
  const installed=readJSON(path.join(f.root,'assets/sprites/pixellab-108/meta/dog.json'));
  assert.match(installed.definition.source,/dog-[a-f0-9]{12}\.png$/);assert.ok(fs.existsSync(path.join(f.root,installed.definition.source)));
});
test('import rejects missing diagonals and sprites already clipped by the provider',async t=>{
  const missing=await fixture(t,{missing:true});await assert.rejects(packCharacter(missing.item,missing.input,missing.destination),/falta direção north-east/);
  const clipped=await fixture(t,{clipped:true});await assert.rejects(packCharacter(clipped.item,clipped.input,clipped.destination),/encosta na borda/);
});

test('lower wing tips do not move the body anchor when switching from perched to flying',async t=>{
  const f=await fixture(t),source=readJSON(path.join(f.input,'frames.json'));source.actions.fly={};
  for(const direction of Object.keys(directions)){
    source.actions.fly[direction]=[];
    const base=await loadImage(path.join(f.input,source.actions.idle[direction][0]));
    for(let i=0;i<8;i++){const canvas=createCanvas(48,48),c=canvas.getContext('2d');c.drawImage(base,0,0);c.fillStyle='#4488cc';c.fillRect(5+i%4,40,32,4);
      const file='fly-'+direction+'-'+i+'.png';fs.writeFileSync(path.join(f.input,file),canvas.toBuffer('image/png'));source.actions.fly[direction].push(file);}
  }
  writeJSON(path.join(f.input,'frames.json'),source);const {definition:d}=await packCharacter(f.item,f.input,f.destination);
  const atlas=await loadImage(path.join(f.destination,'atlas.png')),canvas=createCanvas(atlas.width,atlas.height),c=canvas.getContext('2d');c.drawImage(atlas,0,0);
  const bodyTop=frame=>{const pixels=c.getImageData(frame.x,frame.y,frame.w,frame.h).data;
    for(let y=0;y<frame.h;y++)for(let x=0;x<frame.w;x++){const at=(y*frame.w+x)*4;if(pixels[at]===173&&pixels[at+1]===115&&pixels[at+2]===64&&pixels[at+3]===255)return y;}throw Error('Missing body');};
  for(const direction of Object.values(directions))assert.equal(bodyTop(d.actions.idle[direction].frames[0]),bodyTop(d.actions.fly[direction].frames[0]));
});
test('real game renderer selects emotions, rest, running and directions from the imported character',async t=>{
  const f=await fixture(t),{definition}=await packCharacter(f.item,f.input,f.destination);
  const context=vm.createContext({setTimeout,clearTimeout,SpriteData:{dog:definition}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../systems/character-art.js'),'utf8'),context);
  const art=vm.runInContext('CharacterArt',context);
  assert.equal(art.frameFor('dog',{direction:'upleft'}).action,'idle');
  assert.equal(art.frameFor('dog',{direction:'upright',moving:true,sprinting:true}).action,'run');
  const scared=art.frameFor('dog',{direction:'downleft',moving:true,mood:'scared',anim:1});
  assert.equal(scared.action,'scared');assert.equal(scared.index,2);assert.equal(scared.direction,'downleft');
  assert.equal(art.frameFor('dog',{mood:'happy'}).action,'happy');
  const calls=[];art.install(()=>({}));
  const ctx=new Proxy({},{get:(o,k)=>o[k]??((...args)=>calls.push([k,...args])),set:(o,k,v)=>(o[k]=v,true)});
  art.draw(ctx,'dog',20.25,30.75,{moving:true,mood:'happy',shadow:false});
  assert.deepEqual(calls.find(c=>c[0]==='translate'),['translate',20.25,30.75]);
  assert.equal(ctx.imageSmoothingEnabled,false);
});
