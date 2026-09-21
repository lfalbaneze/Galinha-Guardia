const fs=require('node:fs'),path=require('node:path');
const {PixelLabClient,loadKey,readJSON,writeJSON}=require('./lib/pixellab-client.cjs');
const {cast,style,directions,actionsFor}=require('./lib/pixellab-cast.cjs');
const {packCharacter,installCandidate,buildData}=require('./lib/pixellab-import.cjs');
const root=path.resolve(__dirname,'..'),cache=path.join(root,'.cache/pixellab');
const args=process.argv.slice(2),command=args[0]||'status';
const option=name=>args.find(a=>a.startsWith('--'+name+'='))?.slice(name.length+3);
const requested=option('character')||'skin-pacoca';
const requestedIds=(option('characters')||requested).split(',');
const selected=args.includes('--all')?cast:cast.filter(item=>requestedIds.includes(item.id));
function selectedActions(item) {
  const available=actionsFor(item),names=option('actions')?.split(',')||Object.keys(available);
  if (names.some(n=>!Object.hasOwn(available,n))) throw Error(`Ação inválida para ${item.id}. Disponíveis: ${Object.keys(available).join(', ')}.`);
  return Object.fromEntries(['walk',...new Set(names.filter(n=>n!=='walk'))].map(n=>[n,available[n]]));
}
function characterRequest(item, styleCharacterId, creation='v3', requestedSize) {
  if(creation==='v3') {
    const size=requestedSize||(item.height<=52?64:item.height<=82?96:128);
    const anatomy=['bird','crow'].includes(item.gait)?' BIRD anatomy only: smooth feathered head or the described comb, NO mammal ears, NO horns, exactly two feet and two feathered wings.':'';
    return {description:item.description+' '+style+anatomy,image_size:{width:size,height:size},
      name:item.id,view:'low top-down',template_id:item.template,no_background:true,
      outline:'single color black outline',detail:'medium detail',seed:108000+cast.indexOf(item)};
  }
  return {description:item.description,image_size:{width:128,height:128},method:'create_with_style',
    view:'low top-down',template_id:item.template,style_description:style,no_background:true,
    seed:108000+cast.indexOf(item),...(styleCharacterId?{style_character_id:styleCharacterId}:{})};
}
function animationRequest(item,characterId,action,description,mode='v3',frameCount=12) {
  return {character_id:characterId,animation_name:'farm-'+action,action_description:description,mode,
    directions:Object.keys(directions),...(mode==='v3'?{frame_count:frameCount,keep_first_frame:false}:{}),
    seed:108000+cast.indexOf(item),enhance_prompt:false};
}
async function generateAnimation(client,item,characterId,action,description,mode,frameCount=12,remainingFrameCount=frameCount) {
  const body=animationRequest(item,characterId,action,description,mode,frameCount);
  const character=await client.request('/characters/'+encodeURIComponent(characterId));
  const completed=new Set((character.animations||[])
    .filter(g=>g.display_name===body.animation_name||g.animation_type===body.animation_name)
    .flatMap(g=>g.directions.filter(d=>d.frames.length>=8&&d.frames.length===d.frame_count).map(d=>d.direction)));
  if(body.directions.every(d=>completed.has(d)))return;
  let remaining=body.directions;
  let busy=0;
  while(remaining.length){
    // The service can accept only some directions when its job slots are full.
    // Persisted request fingerprints let each accepted subset resume once.
    let response;
    try{response=await client.job(`${item.id}/${action}`,'/characters/animations',{...body,directions:remaining,
      ...(mode==='v3'&&remaining.length<body.directions.length?{frame_count:remainingFrameCount}:{})});}
    catch(error){if(error.status!==429||++busy>60)throw error;await client.pause(20000);continue;}
    busy=0;
    const accepted=response.directions;
    if(!Array.isArray(accepted)||!accepted.length||accepted.some(d=>!remaining.includes(d)))throw Error('PixelLab: resposta sem direções aceitas válidas.');
    remaining=remaining.filter(d=>!accepted.includes(d));
  }
}
async function downloadFrames(client,item,characterId,actions) {
  if (!/^[a-z0-9-]{1,100}$/i.test(characterId)) throw Error('Invalid character id');
  const character=await client.request('/characters/'+encodeURIComponent(characterId));
  if (character.status!=='completed' || character.directions!==8) throw Error(`${item.id}: personagem ainda não tem oito direções concluídas.`);
  const input=path.join(cache,'frames',item.id), data={id:item.id,characterId,generatedAt:new Date().toISOString(),actions:{idle:{}}},downloads=[];
  for (const direction of Object.keys(directions)) {
    const url=character.rotation_urls?.[direction];
    if (!url) throw Error(`${item.id}: falta a vista ${direction}.`);
    const filename=`${characterId}/idle/${direction}.png`;
    downloads.push([url,path.join(input,filename)]); data.actions.idle[direction]=[filename];
  }
  const available=actionsFor(item);
  // Visually rejected clips can be replaced without buying the other seven
  // directions again. Each choice is tied to one immutable remote character.
  const reviewed=readJSON(path.join(__dirname,'lib/pixellab-clip-selections.json'),{})[characterId]||{};
  const actionNames=[...new Set([...Object.keys(actions),...character.animations
    .filter(g=>g.display_name?.startsWith('farm-')&&Object.hasOwn(available,g.display_name.slice(5))&&Object.keys(directions).every(d=>character.animations.filter(a=>a.display_name===g.display_name).some(a=>a.directions.some(r=>r.direction===d&&r.frames.length>=8&&r.frames.length===r.frame_count))))
    .map(g=>g.display_name.slice(5))])];
  for (const action of actionNames) {
    data.actions[action]={};
    for (const direction of Object.keys(directions)) {
      const selectedName=reviewed[action]?.[direction]?.animationName||'farm-'+action;
      const groups=character.animations.filter(group=>group.display_name===selectedName||group.animation_type===selectedName);
      const matches=groups.flatMap(g=>g.directions.filter(d=>d.direction===direction&&d.frames.length>=8&&d.frames.length===d.frame_count).map(row=>({row,groupId:g.animation_group_id})));
      if(matches.length!==1)throw Error(`${item.id}/${action}/${direction}: esperada uma sequência completa, encontradas ${matches.length}.`);
      const {row,groupId}=matches[0];
      if (!groupId || !/^[a-z0-9-]+$/i.test(groupId)) throw Error('Invalid animation group id');
      if (!row || row.frames.length!==row.frame_count || row.frames.length<8) throw Error(`${item.id}/${action}/${direction}: sequência incompleta.`);
      data.actions[action][direction]=[];
      for (const [i,url] of row.frames.entries()) {
        const filename=`${characterId}/${groupId}/${direction}/${String(i).padStart(3,'0')}.png`;
        downloads.push([url,path.join(input,filename)]);data.actions[action][direction].push(filename);
      }
    }
  }
  let next=0;
  await Promise.all(Array.from({length:6},async()=>{while(next<downloads.length){const [url,file]=downloads[next++];await client.download(url,file);}}));
  writeJSON(path.join(input,'frames.json'),data);
  return input;
}
function updateReview() {
  const folder=path.join(root,'preview/pixellab');fs.mkdirSync(folder,{recursive:true});
  const candidates={};
  for (const item of cast) {
    const candidate=readJSON(path.join(folder,item.id,'candidate.json'));
    if(candidate)candidates[item.id]=candidate;
  }
  fs.writeFileSync(path.join(folder,'data.js'),'const PixelLabCandidates = '+JSON.stringify(candidates)+';\n');
  fs.copyFileSync(path.join(root,'scripts/templates/pixellab-review.html'),path.join(folder,'index.html'));
}
async function main() {
  if (!selected.length) throw Error(`Personagem desconhecido: ${requested}`);
  if (!['status','plan','generate','pack','install'].includes(command)) throw Error('Comandos: status, plan, generate, pack, install.');
  const key=loadKey(root), client=new PixelLabClient({key,directory:path.join(cache,'jobs')});
  if(command==='status') {
    console.log('Chave PixelLab: '+(key?'configurada':'ausente; configure PIXELLAB_API_KEY em .env.local'));
    const installed=cast.filter(item=>fs.existsSync(path.join(root,'assets/sprites/pixellab-108/meta',item.id+'.json')));
    console.log(`Personagens instalados: ${installed.length}/${cast.length}.`);
    if(args.includes('--account'))console.log(JSON.stringify(await client.request('/balance'),null,2));
    return;
  }
  const mode=option('mode')||'v3';
  if(!['pro','v3'].includes(mode))throw Error('Use --mode=pro ou --mode=v3.');
  const creation=option('creation')||'v3';
  if(!['v3','pro'].includes(creation))throw Error('Use --creation=v3 ou --creation=pro.');
  if(option('style-from')&&creation!=='pro')throw Error('--style-from exige --creation=pro.');
  const frameCount=Number(option('frames')||12),remainingFrameCount=Number(option('remaining-frames')||frameCount),size=option('size')?Number(option('size')):undefined;
  if([frameCount,remainingFrameCount].some(n=>![8,10,12,14,16].includes(n)))throw Error('Use 8, 10, 12, 14 ou 16 quadros.');
  if(size!==undefined&&![64,96,128].includes(size))throw Error('Use --size=64, 96 ou 128.');
  // Validate the whole selection before sending any paid request.
  const plans=selected.map(item=>({item,actions:selectedActions(item)}));
  if(command==='plan') {
    const plan=plans.map(({item,actions})=>({id:item.id,endpoint:'/create-character-'+creation,creation:characterRequest(item,null,creation,size),
      animationMode:mode,frameCount:mode==='v3'?frameCount:'determined by Pro',directions:Object.keys(directions),actions}));
    writeJSON(path.join(cache,'plan.json'),plan);
    console.log(`${plans.length} personagens, ${plans.reduce((sum,p)=>sum+Object.keys(p.actions).length*8,0)} sequências direcionais. Plano salvo em .cache/pixellab/plan.json. Nenhuma chamada paga.`);
    return;
  }
  if(command==='generate'&&!key)throw Error('Falta PIXELLAB_API_KEY em .env.local. Nenhuma geração foi enviada.');
  for (const {item,actions} of plans) {
    if(command==='install') {
      const candidate=readJSON(path.join(root,'preview/pixellab',item.id,'candidate.json'));
      const required=item.id==='owl'?['alert','fly']:item.id==='goose'?['alert']:[];
      if(required.some(action=>!candidate?.definition.actions[action]))throw Error(`${item.id}: faltam ações especiais ${required.join(', ')}.`);
      installCandidate(root,item.id); console.log(`${item.id}: instalado.`); continue;
    }
    let input=path.join(cache,'frames',item.id);
    if(command==='generate') {
      const styleSource=option('style-from');
      if(styleSource&&!cast.some(c=>c.id===styleSource))throw Error('Personagem de referência desconhecido.');
      const styleId=styleSource&&styleSource!==item.id?readJSON(path.join(cache,'characters',styleSource+'.json'))?.character_id:null;
      if(styleSource&&styleSource!==item.id&&!styleId)throw Error('Gere o personagem de referência antes de usá-lo.');
      const characterFile=path.join(cache,'characters',item.id+'.json');
      const existingCharacter=readJSON(characterFile);
      const character=existingCharacter?.character_id?existingCharacter:await client.job(item.id,'/create-character-'+creation,characterRequest(item,styleId,creation,size));
      writeJSON(characterFile,character);
      for (const [action,description] of Object.entries(actions)) {
        // All eight directions are explicit. API defaults may generate south only.
        await generateAnimation(client,item,character.character_id,action,description,mode,frameCount,remainingFrameCount);
      }
      input=await downloadFrames(client,item,character.character_id,actions);
    }
    const result=await packCharacter(item,input,path.join(root,'preview/pixellab',item.id));
    console.log(`${item.id}: revisão pronta; ${result.warnings.length} avisos para inspeção visual.`);
    for(const warning of result.warnings)console.log('  '+warning);
    updateReview();
  }
  if(command==='install')console.log(`Atlas ativos: ${buildData(root)}. Execute npm run build para atualizar dist.`);
  else console.log('Revisão animada: preview/pixellab/index.html. A instalação é um passo separado da geração.');
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={characterRequest,animationRequest,generateAnimation,downloadFrames,selectedActions,updateReview};
