// Production queue for the authorized cast. Generation is staged for visual review.
const fs=require('node:fs'),path=require('node:path');
const {PixelLabClient,loadKey,readJSON,writeJSON}=require('./lib/pixellab-client.cjs');
const {cast,actionsFor}=require('./lib/pixellab-cast.cjs');
const {characterRequest,generateAnimation,downloadFrames,updateReview}=require('./pixellab.cjs');
const {packCharacter}=require('./lib/pixellab-import.cjs');
const root=path.resolve(__dirname,'..'),cache=path.join(root,'.cache/pixellab');
const args=process.argv.slice(2),option=n=>args.find(a=>a.startsWith('--'+n+'='))?.slice(n.length+3);
const phase=option('phase')||'base',exclude=new Set((option('exclude')||'').split(','));
const requested=option('characters')?.split(',');
const workers=Number(option('workers')||6);
const queue=option('queue')||phase;
if(!/^[a-z0-9-]+$/.test(queue))throw Error('Nome de fila inválido.');
const stateFile=path.join(cache,'batch-'+queue+'.json'),state=readJSON(stateFile,{phase,items:{}});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const save=()=>writeJSON(stateFile,{...state,updatedAt:new Date().toISOString()});
const client=new PixelLabClient({key:loadKey(root),directory:path.join(cache,'jobs'),pollMs:10000,maxPolls:240,
 log:message=>{if(!message.includes('aguardando'))console.log(message);}});
async function resume(fn){for(let i=0;;i++){try{return await fn();}catch(e){
 if(i>=30||!(e.status===429||/ainda em processamento|Falha ao consultar/.test(e.message)))throw e;
 await pause(20000);
}}}
async function produce(item){
 const entry=state.items[item.id]||={};entry.status='generating';delete entry.error;save();
 try{
  const characterFile=path.join(cache,'characters',item.id+'.json');let character=readJSON(characterFile);
  if(!character?.character_id){character=await resume(()=>client.job(item.id,'/create-character-v3',characterRequest(item)));writeJSON(characterFile,character);}
  const available=actionsFor(item),names=phase==='base'?['walk',...(item.id==='owl'?['alert','fly']:item.id==='goose'?['alert']:[])]:Object.keys(available);
  const actions=Object.fromEntries(names.map(n=>[n,available[n]]));
  for(const [action,description]of Object.entries(actions)){
   entry.action=action;save();const frames=action==='alert'?12:8;
   await resume(()=>generateAnimation(client,item,character.character_id,action,description,'v3',frames));
  }
  entry.status='downloading';save();
  const input=await downloadFrames(client,item,character.character_id,actions);
  const result=await packCharacter(item,input,path.join(root,'preview/pixellab',item.id));
  entry.status='ready';entry.warnings=result.warnings;entry.actions=Object.keys(result.definition.actions);entry.finishedAt=new Date().toISOString();save();updateReview();
  console.log(`${item.id}: pronto para revisão (${entry.actions.join(', ')}), ${result.warnings.length} avisos.`);
 }catch(error){entry.status='blocked';entry.error=error.message;save();console.error(`${item.id}: ${error.message}`);}
}
(async()=>{
 if(state.stoppedByUser)throw Error('Esta fila foi interrompida pelo usuário. Não retome o tratamento dos outros sprites sem novo pedido.');
 if(!['base','extras'].includes(phase)||!Number.isInteger(workers)||workers<1||workers>8)throw Error('Fase ou quantidade de workers inválida.');
 if(requested?.some(id=>!cast.some(item=>item.id===id)))throw Error('Personagem desconhecido na fila.');
 const selected=(requested?requested.map(id=>cast.find(item=>item.id===id)):cast).filter(item=>!exclude.has(item.id)&&state.items[item.id]?.status!=='ready');let next=0;
 console.log(`PixelLab ${phase}: ${selected.length} personagens, ${workers} trabalhadores de fila.`);
 await Promise.all(Array.from({length:workers},async()=>{while(next<selected.length)await produce(selected[next++]);}));
 const ready=Object.values(state.items).filter(x=>x.status==='ready').length,blocked=Object.entries(state.items).filter(([,x])=>x.status==='blocked').map(([id,x])=>({id,error:x.error}));
 console.log(JSON.stringify({phase,ready,blocked,balance:await client.request('/balance')}));
 if(blocked.length)process.exitCode=1;
})().catch(e=>{console.error(e.message);process.exitCode=1});
