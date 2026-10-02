// PixelLab-only result poses. References and paid job receipts remain private.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createHash}=require('node:crypto');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {PixelLabClient,loadKey,readJSON,writeJSON}=require('./lib/pixellab-client.cjs');
const S=require('../shuffle/survival.js');
const root=path.resolve(__dirname,'..'),out=path.join(root,'preview/pixellab/results');
const context=vm.createContext({SpriteData:{},PremiumWildlifeData:{}});
for(const file of ['pixellab-art-data.js','character-art.js'])vm.runInContext(fs.readFileSync(path.join(root,'systems',file),'utf8'),context);
const {art,data}=vm.runInContext('({art:CharacterArt,data:PixelLabArtData})',context);
const descriptions=new Map([...require('./lib/pixellab-cast.cjs').cast,...require('./lib/pixellab-shuffle-cast.cjs').cast].map(c=>[c.id,c.description]));
const cast=[...Object.entries(S.QUIPS.heroes).map(([id,q])=>({id:'hero-'+id,name:q.name,sprite:art.appearances[id].sprite||art.appearances[id].species})),
  ...Object.entries(S.QUIPS.enemies).map(([id,q])=>({id:'enemy-'+id,name:q.name,sprite:id}))];
const direction='Keep identity, anatomy, colors and accessories. Full body, front 3/4, transparent margins. Cute pixel art. No text, floor or shadows.';
const poses={
  win:'Redraw a fighting-game VICTORY pose: proud broad grin, chin up, chest out, raised feathered wings or forepaws as appropriate, feet planted. Exuberant champion, big readable expression.',
  lose:'Redraw a fighting-game DEFEAT pose: sitting slumped, dazed lopsided face, messy feathers or fur, small cheek bandage, one puffy purple eyelid, drooping wings or ears. Comically battered but lovable, alive. No blood, gore or missing limbs.'
};
async function reference(item){
  const file=path.join(out,item.id+'-reference.png');if(fs.existsSync(file))return file;
  const special=path.join(root,'assets/sprites/pixellab-108/meta/references',item.sprite+'-front.png');
  if(fs.existsSync(special)){fs.copyFileSync(special,file);return file;}
  const d=data[item.sprite];if(!d)return null;
  const f=(d.actions.idle?.down||d.poses.down).frames[0],img=await loadImage(path.join(root,d.source));
  const c=createCanvas(128,128),g=c.getContext('2d');
  g.drawImage(img,f.x,f.y,f.w,f.h,Math.round(64-f.cx),Math.round(112-f.bottom),f.w,f.h);
  fs.writeFileSync(file,c.toBuffer('image/png'));return file;
}
async function saveImage(payload,file){
  const encoded=payload?.images?.[0]?.base64||payload?.images?.[0]?.image?.base64||payload?.image?.base64;
  if(!encoded)throw Error('PixelLab returned no image; receipt preserved.');
  const bytes=Buffer.from(encoded.replace(/^data:image\/[^;]+;base64,/,''),'base64'),img=await loadImage(bytes);
  if(img.width!==128||img.height!==128)throw Error('Unexpected pose dimensions');
  fs.writeFileSync(file,bytes);
}
async function main(){
  fs.mkdirSync(out,{recursive:true});const args=process.argv.slice(2),selected=args.filter(a=>!a.startsWith('--'));
  if(selected.some(id=>!cast.some(c=>c.id===id)))throw Error('Unknown result actor');
  const items=selected.length?cast.filter(c=>selected.includes(c.id)):cast;
  if(args.includes('--install')){
    const manifestFile=path.join(root,'assets/shuffle/results/manifest.json'),manifest=readJSON(manifestFile,{});
    fs.mkdirSync(path.dirname(manifestFile),{recursive:true});
    for(const item of items){
      const pair={};
      for(const outcome of ['win','lose']){
        const bytes=fs.readFileSync(path.join(out,`${item.id}-${outcome}.png`)),img=await loadImage(bytes);
        if(img.width!==128||img.height!==128)throw Error('Invalid result pose');
        const hash=createHash('sha256').update(bytes).digest('hex').slice(0,12),source=`assets/shuffle/results/${item.id}-${outcome}-${hash}.png`;
        fs.writeFileSync(path.join(root,source),bytes);pair[outcome]=source;
      }
      manifest[item.id]=pair;
    }
    writeJSON(manifestFile,manifest);
    fs.writeFileSync(path.join(root,'shuffle/result-art.js'),'/* Reviewed PixelLab result poses. */\nconst ShuffleResultArt = '+JSON.stringify(manifest)+';\n');
    console.log('Installed result poses: '+Object.keys(manifest).length+' characters');return;
  }
  const client=new PixelLabClient({key:loadKey(root),directory:path.join(root,'.cache/pixellab/jobs'),pollMs:6000});
  for(const item of items){
    const ref=await reference(item);
    if(args.includes('--prepare'))continue;
    for(const outcome of ['win','lose']){
      const file=path.join(out,`${item.id}-${outcome}.png`);if(fs.existsSync(file)){console.log(item.id+'/'+outcome+': already downloaded');continue;}
      const source=ref||(outcome==='lose'?path.join(out,item.id+'-win.png'):null);
      const identity=item.sprite==='hen-silkie'?'Japanese SILKIE hen: fluffy round white crest, silky white plumage, feathered feet. No red comb. ':item.sprite==='chicken'?'White HEN, red comb, TWO feathered wings, TWO orange feet, short feather fan tail. NO long tail or snake. ':'';
      const mammal=['fox','fuinha','wolf','skin-pipoca','skin-amora','skin-pacoca'].includes(item.sprite);
      const action=mammal?(outcome==='win'?'VICTORY: proud grinning mammal raises TWO furry forepaws, standing on TWO hind paws. Exactly FOUR paws total, ONE furry tail. No feathers, wings, extra limbs, floor or ground shadow.':
        'DEFEAT: slumped sitting furry mammal, dazed lopsided face, messy fur, cheek bandage, puffy purple eyelid, drooping ears. Exactly FOUR paws, ONE furry tail. Comically battered, alive. No feathers, wings, blood or ground shadow.'):
        ['curupira','cuca'].includes(item.sprite)?(outcome==='win'?'VICTORY: triumphant grin, chest out, TWO raised fists, standing on TWO legs. Preserve all species features. No wings or extra limbs.':
        'DEFEAT: sitting slumped, dazed lopsided face, messy hair, cheek bandage, puffy purple eyelid. TWO arms and TWO legs. Comically battered, alive. No feathers, wings, blood or extra limbs.'):
        item.sprite==='boitata'?(outcome==='win'?'Triumphant S-coiled fire SNAKE victory pose, proud raised head and grin, one continuous legless body. No arms, legs or wings.':
        'DEFEAT: exhausted FIRE SNAKE in a loose drooping coil, dazed eyes, cheek bandage, one puffy purple eyelid. One continuous legless body. No arms, legs, feathers, wings or blood.'):
        item.sprite==='mula-sem-cabeca'?(outcome==='win'?'Triumphant HEADLESS mule rearing with four complete equine legs, joyful neck flames. NO head, face or eyes.':'Defeated HEADLESS mule sitting exhausted, four complete equine legs, drooping dim neck flames, scuffed coat and leg bandage. NO head, face, eyes or blood.'):poses[outcome];
      const correction=item.sprite==='fuinha'?'FUINHA marten: short round ears, slim body, cream bib, plain brown tail, NO stripes. Remove ALL ground pixels. ':'';
      const description=identity+correction+action+' '+direction;
      if(description.length>500)throw Error('Pose prompt exceeds edit limit');
      const seed=641000+cast.indexOf(item)*2+(outcome==='lose'?1:0);
      if(source){
        const body={image:{base64:fs.readFileSync(source).toString('base64')},description,width:128,height:128,seed,no_background:true};
        const job=await client.job(item.id+'/'+outcome,'/edit-image-pixen',body);
        const result=await client.request('/background-jobs/'+job.background_job_id);
        await saveImage(result.last_response,file);
        writeJSON(file+'.json',{provider:'PixelLab',endpoint:'/edit-image-pixen',seed,description,jobId:job.background_job_id});
      }else{
        // This endpoint is synchronous. Persist an in-flight receipt before charging once.
        const receipt=path.join(root,'.cache/pixellab',item.id+'-result-create.json');
        let saved=readJSON(receipt);
        if(saved?.state==='submitting')throw Error('Unconfirmed previous submission: '+receipt);
        const base=item.sprite==='fuinha'?'A cute European pine MARTEN, chocolate brown fur, long slim torso, short round ears, cream throat bib, pointed muzzle. One long bushy SOLID CHOCOLATE BROWN tail, uniformly brown from base to tip.':descriptions.get(item.sprite);
        const body={description:base+' '+action+' '+direction,
          image_size:{width:128,height:128},no_background:true,seed,enhance_prompt:false};
        if(!saved){
          writeJSON(receipt,{state:'submitting'});
          let result;try{result=await client.request('/create-image-pixen',body);}catch(e){if([401,402,422,429].includes(e.status))fs.unlinkSync(receipt);throw e;}
          saved={state:'completed',result};writeJSON(receipt,saved);
        }
        await saveImage(saved.result,file);writeJSON(file+'.json',{provider:'PixelLab',endpoint:'/create-image-pixen',...body});
      }
      console.log(item.id+'/'+outcome+': downloaded for review');
    }
  }
  const sheet=createCanvas(128*4,160*Math.ceil(items.length/2)),g=sheet.getContext('2d');
  g.fillStyle='#294439';g.fillRect(0,0,sheet.width,sheet.height);g.font='12px sans-serif';g.fillStyle='#fff1ca';
  for(const [i,item] of items.entries())for(const [j,outcome] of ['win','lose'].entries()){
    const file=path.join(out,`${item.id}-${outcome}.png`),x=(i%2)*256+j*128,y=Math.floor(i/2)*160;
    if(fs.existsSync(file))g.drawImage(await loadImage(file),x,y);else if(await reference(item))g.drawImage(await loadImage(await reference(item)),x,y);
    g.fillText(item.name+' · '+outcome,x+3,y+145);
  }
  fs.writeFileSync(path.join(out,'review.png'),sheet.toBuffer('image/png'));
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
