// PixelLab image-based repair for the two anatomies rejected in the library.
// Separate stages let us inspect each new design before buying its animations.
const fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto');
const {PixelLabClient,loadKey,readJSON,writeJSON}=require('./lib/pixellab-client.cjs');
const {cast,actionsFor}=require('./lib/pixellab-shuffle-cast.cjs');
const {directions}=require('./lib/pixellab-cast.cjs');
const {packCharacter}=require('./lib/pixellab-import.cjs');
const {updateReview}=require('./pixellab.cjs');
const root=path.resolve(__dirname,'..'),cache=path.join(root,'.cache/pixellab');
const stage=process.argv[2],id=process.argv[3],item=cast.find(c=>c.id===id);
const references={
  curupira:'Keep CURUPIRA facing FRONT: we see his FACE, TWO green eyes, mouth and bare CHEST. Head, chest and knees face the camera. ONLY his bare feet turn BACKWARD: show heels to camera, toes behind legs. Lower both arms into a neutral standing pose. Preserve red flame hair, copper skin, green leaf shorts and rounded human ears. Exactly TWO arms, TWO legs. NO tail, fur, muzzle or horns. Full body, low top-down camera, cute pixel art, transparent margins, no floor or shadow.',
  boitata:'UNCOIL BOITATA into a long LOW crawling fire SNAKE. Entire connected body lies along the ground in a broad elongated S wave, head on LEFT facing LEFT, tapered tail extends RIGHT. No upright neck, no sitting coil, no stacked loops. Preserve orange-gold scales, emerald eye, cream belly and small spine flames. Exactly ONE snake head and ONE continuous thick body. NO ears, horns, arms, legs or wings. Full body in low top-down camera, cute pixel art, transparent margins, no ground or shadow.'
};
const paletteDescription='COLOR CLEANUP ONLY of this continuous FIRE SNAKE animation. Keep the EXACT existing S-shaped body, head, pose, contours, appendages and camera of EACH corresponding input frame. Recolour ALL body scales to the SAME stable WARM ORANGE-GOLD throughout every frame; cream only on belly. Remove any red body, white flashes and full-body lighting changes. Dark clean outline, consistent flat shading. Flames alone may flicker. Absolutely no new anatomy, NO limbs, horns, ears or floor; transparent background.';
const input=path.join(cache,'frames',id||'invalid'),folder=path.join(cache,'identity-repair',id||'invalid');
const image=file=>({base64:fs.readFileSync(file).toString('base64')});
function saveImages(payload,names){
  const images=payload.images||[payload.image];
  if(images.length!==names.length)throw Error('Unexpected PixelLab frame count');
  for(const [i,name]of names.entries()){
    const encoded=images[i]?.base64||images[i]?.image?.base64;
    if(!encoded)throw Error('Missing PixelLab image');
    const bytes=Buffer.from(encoded.replace(/^data:image\/[^;]+;base64,/,''),'base64');
    if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Expected PNG');
    fs.mkdirSync(path.dirname(name),{recursive:true});fs.writeFileSync(name,bytes);
  }
}
async function main(){
  if(!item||!references[id]||!['reference','rotations','character','walk','run','pack','skeleton-walk','skeleton-run','palette-walk','palette-run'].includes(stage))throw Error('Invalid identity repair stage or character');
  if(id==='curupira'&&['rotations','walk','run','pack'].includes(stage))throw Error('Curupira uses character, then pixellab.cjs generate --shuffle --character=curupira');
  const client=new PixelLabClient({key:loadKey(root),directory:path.join(cache,'jobs')});
  if(stage.startsWith('skeleton-')){
    if(id!=='curupira')throw Error('Skeleton repair is for the human forest spirit only');
    const characterId=readJSON(path.join(cache,'characters',id+'.json')).character_id;
    const animation=stage==='skeleton-walk'?'walking-8-frames':'running-8-frames';
    const character=await client.request('/characters/'+characterId);
    const completed=new Set(character.animations.filter(a=>a.animation_type===animation).flatMap(a=>a.directions.filter(d=>d.frames.length===d.frame_count&&d.frame_count>=8).map(d=>d.direction)));
    let remaining=Object.keys(directions).filter(d=>!completed.has(d)),busy=0;
    while(remaining.length){
      let result;
      try{result=await client.job(id+'/'+stage,'/characters/animations',{character_id:characterId,mode:'skeleton-v3',template_animation_id:animation,directions:remaining,
        description:item.description+' Preserve the exact initial head, torso and camera orientation throughout. Stable identity and colours. Feet point BACKWARD; no floor or ground shadow.',seed:651760});}
      catch(e){if(e.status!==429||++busy>60)throw e;await client.pause(20000);continue;}
      busy=0;
      if(!result.directions?.length||result.directions.some(d=>!remaining.includes(d)))throw Error('Invalid accepted skeleton directions');
      remaining=remaining.filter(d=>!result.directions.includes(d));
    }
    console.log(id+': '+animation+' ready for visual review');return;
  }
  async function job(label,endpoint,body){
    const file=path.join(folder,label+'.json'),saved=readJSON(file);
    const requestHash=createHash('sha256').update(JSON.stringify({endpoint,body})).digest('hex');
    if(saved?.requestHash===requestHash)return saved;
    let receipt;
    for(let attempt=0;;attempt++){
      try{receipt=await client.job(id+'/'+label,endpoint,body);break;}
      catch(error){if(error.status!==429||attempt>=60)throw error;await client.pause(20000);}
    }
    const result=await client.request('/background-jobs/'+receipt.background_job_id);
    if(result.status!=='completed'||!result.last_response)throw Error('Missing completed PixelLab result');
    writeJSON(file,{...result,requestHash});return result;
  }
  const reference=path.join(root,'assets/sprites/pixellab-108/meta/references',id+'-front.png');
  if(stage==='character'){
    if(id!=='curupira')throw Error('Use image-based animation for the legless snake');
    const body=require('./pixellab.cjs').characterRequest(item,null,'v3',96);body.name='curupira-corrected';body.seed=651560;
    const result=await client.job(id+'/character','/create-character-v3',body);
    writeJSON(path.join(cache,'characters',id+'.json'),result);
    console.log(id+': corrected native character saved');return;
  }
  if(stage==='reference'){
    const result=await job('reference','/edit-image-pixen',{image:image(path.join(root,'preview/pixellab/results','enemy-'+id+'-win.png')),
      description:references[id],width:96,height:96,seed:651500+(id==='boitata'?1:0),no_background:true});
    saveImages(result.last_response,[reference]);console.log(id+': new reference downloaded for review');return;
  }
  if(stage==='rotations'){
    const result=await job('rotations','/generate-8-rotations-v3',{first_frame:image(reference),description:item.description+' '+references[id],seed:651520,no_background:true});
    // Calibrated from the returned images, not mirrored pixels. V3 rotates
    // clockwise from the reference (Boitata starts in the left-facing view).
    const order=id==='boitata'?['west','south-west','south','south-east','east','north-east','north','north-west']:
      ['south','south-east','east','north-east','north','north-west','west','south-west'];
    const names=order.map(d=>'corrected/idle/'+d+'.png');
    saveImages(result.last_response,names.map(n=>path.join(input,n)));
    writeJSON(path.join(input,'frames.json'),{id,characterId:'rotations-'+result.id,generatedAt:result.created_at,actions:{idle:Object.fromEntries(names.map((n,i)=>[order[i],[n]]))}});
    console.log(id+': eight corrected views downloaded for review');return;
  }
  const frames=readJSON(path.join(input,'frames.json'));
  if(!frames?.characterId?.startsWith('rotations-'))throw Error('Missing reviewed corrected rotations');
  if(stage.startsWith('palette-')){
    const action=stage.slice(8),queue=[];
    for(const direction of Object.keys(directions)){
      const files=frames.actions[action]?.[direction];if(files?.length!==12)throw Error('Missing twelve source motion frames');
      const stable=files.map((file,i)=>{
        const target=path.join(input,`palette-input/${action}/${direction}/${i}.png`);
        fs.mkdirSync(path.dirname(target),{recursive:true});if(!fs.existsSync(target))fs.copyFileSync(path.join(input,file),target);return target;
      });
      for(let start=0;start<12;start+=4)queue.push({direction,start,files:stable.slice(start,start+4)});
    }
    let next=0;
    await Promise.all(Array.from({length:4},async()=>{while(next<queue.length){
      const {direction,start,files}=queue[next++];
      const result=await job(`palette-${action}-${direction}-${start}`,'/edit-animation-v2',{
        description:paletteDescription,frames:files.map(file=>({image:image(file),size:{width:96,height:96}})),image_size:{width:96,height:96},seed:653071,no_background:true});
      saveImages(result.last_response,files.map((_,i)=>path.join(input,`palette/${action}/${direction}/${start+i}.png`)));
    }}));
    const poses=Object.fromEntries(Object.keys(directions).map(d=>[d,Array.from({length:12},(_,i)=>`palette/${action}/${d}/${i}.png`)]));
    writeJSON(path.join(input,`palette-${action}.json`),{characterId:frames.characterId,poses});
    console.log(id+': palette-'+action+' downloaded for review; use pack after both actions finish.');return;
  }
  if(stage==='pack'){
    for(const action of ['walk','run']){
      const reviewed=readJSON(path.join(input,`palette-${action}.json`));
      if(reviewed?.characterId===frames.characterId)frames.actions[action]=reviewed.poses;
    }
    writeJSON(path.join(input,'frames.json'),frames);
  }
  if(stage==='walk'||stage==='run'){
    for(const [action,description]of [[stage,actionsFor(item)[stage]]]){
      frames.actions[action]||={};
      const requested=process.argv.find(a=>a.startsWith('--direction='))?.slice(12);
      if(requested&&!Object.hasOwn(directions,requested))throw Error('Invalid animation direction');
      const queue=Object.keys(directions).filter(d=>!requested||d===requested);let next=0;
      await Promise.all(Array.from({length:3},async()=>{while(next<queue.length){
        const direction=queue[next++];
        const first=image(path.join(input,frames.actions.idle[direction][0]));
        const result=await job(action+'-'+direction,'/animate-with-text-v3',{first_frame:first,last_frame:first,
          action:description+' Facing '+direction+' throughout ALL frames; NEVER turn or change camera. Snake anatomy only, NO ears or horns.',frame_count:12,seed:651551,no_background:true});
        const names=Array.from({length:12},(_,i)=>`corrected/${action}/${direction}/${i}.png`);
        const returned=result.last_response.images;
        // The image-based endpoint includes its static reference ahead of the
        // requested 12 motion frames. Do not insert that hold into the loop.
        const motion={images:returned.length===13?returned.slice(1):returned};
        saveImages(motion,names.map(n=>path.join(input,n)));frames.actions[action][direction]=names;
        writeJSON(path.join(input,'frames.json'),frames);
      }}));
    }
  }
  const result=await packCharacter({...item,viewRotation:0},input,path.join(root,'preview/pixellab',id));
  updateReview();console.log(id+': corrected walk/run candidates ready; '+result.warnings.join('; '));
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={saveImages};
