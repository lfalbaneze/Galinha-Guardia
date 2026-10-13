// PixelLab receipts are persisted before polling; reruns resume the same paid jobs.
const fs=require('node:fs'),path=require('node:path');
const {PixelLabClient,loadKey,writeJSON}=require('./lib/pixellab-client.cjs');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..');
const requests=[
  ['powers',{image_size:{width:256,height:128},seed:100526,no_background:true,
    description:'A polished charming cartoon farm game pixel art inventory sheet, EXACTLY FOUR columns and TWO rows of 64x64 cells, total transparent canvas 256x128. Each object centered in its own cell, occupies ONLY 40x40 pixels, at least 12 transparent pixels on every side of every cell. TOP ROW left to right: ONE curved soft ivory feather with lavender shading; ONE chunky bright cyan lightning bolt; ONE turquoise water droplet with white highlight; ONE orange carrot with leafy green top. BOTTOM ROW left to right: THREE curved pale purple cat claw slashes together; ONE golden dog paw print surrounded by two small sound arcs; ONE pale lime goose beak with two small sound arcs; ONE thick ivory eggshell shield with gold edging and a small blue center gem. Eight DISTINCT COMPLETE icons, readable silhouettes, rounded cute proportions, clean dark colored pixel outlines, bright flat colors with deliberate 3 tone pixel clusters. Native crisp square pixels, no antialiasing, no blurry glow, no realism. No text, no panels, no background, no ground shadows, no oval shadows. No overlapping cells, no clipped outlines. Keep ALL eight objects inside their padded cells.'}],
  ['scenery',{image_size:{width:192,height:96},seed:100527,no_background:true,
    description:'A charming polished cartoon farm game prop sprite sheet on TRANSPARENT 192x96 canvas, EXACTLY THREE columns of 64x96 cells, slight top-down RPG three-quarter camera. LEFT cell: a compact cluster of three tall corn stalks with broad folded green leaves, two golden corn cobs and golden tassels, entire plant including base visible. CENTER cell: a compact pile of three chunky angular blue gray quarry stones, quartz veins and pale stepped highlights, low broad silhouette. RIGHT cell: one rustic wooden lamp post with a hanging warm golden farm lantern and a tiny curled metal hook; entire pole and base visible. Each prop fits within its own centered 48x76 pixel box, minimum EIGHT fully transparent pixels on all four sides of its cell. Rounded cartoon shapes, clean dark pixel outline, rich legible flat colors, deliberate crisp square pixel clusters, no antialiasing or plastic rendering. Matching farm game pixel art style. No ground, no oval shadow, no contact shadow, no text, no borders, no extra objects, no overlap, NO cropping at cell boundaries.'}]
];
async function main(){
  const client=new PixelLabClient({key:loadKey(root),directory:path.join(root,'.cache/pixellab/jobs'),fetchImpl:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(options.method==='POST'?300000:90000)})});
  if(process.argv.includes('--catalog')){
    const motifs={
      cornshot:'A chunky corn cob martial-arts glove, red wrist wrap, golden kernels, green husk cuff',
      egg:'A cracked ivory egg wearing a red survival bandana, tiny wooden barricade behind it',
      sickle:'A curved teal steel farm sickle with red wrapped wooden handle and tiny devil horn on the pommel',
      boots:'A pair of round muddy red farm boots with golden wing-shaped buckles and thick soles',
      volley:'Three corn cobs fanned from a green ammunition pouch, red woven strap',
      rear:'A lavender feather mounted on a wooden rear-view arrow with a brass hinge',
      cross:'A four-spout copper sprinkler spraying four turquoise water jets in a cross',
      spiral:'A curled lavender feather galaxy with three tiny gold stars and a deep blue central bead',
      sniper:'An orange carrot telescope rifle, green leafy stock, brass sight, short dark muzzle',
      homing:'An ivory egg with tiny green leaf fins and a brass compass strapped around its middle',
      boomerang:'A double-curved silver sickle boomerang with dark green wooden center grip',
      ricochet:'A popped corn kernel in a spring-loaded red wooden slingshot, two curled springs',
      fireball:'An ivory fried egg firebomb in a tiny red skillet, orange flame-shaped yolk',
      frost:'A blue-white feather enclosed in a jagged translucent ice crystal, two frost spikes',
      venom:'A crooked purple witch ladle holding bright green bubbling soup, dark wooden handle',
      thunder:'Two rustic wooden fence posts joined by a zigzag blue electric wire and brass insulators',
      mines:'A half-buried carrot with a tiny red detonator plunger and a brown soil clod',
      orbit:'Three ivory cat claws circling a violet cat-paw-shaped central gem in a bronze ring',
      quake:'A tiny red rooster-shaped wooden mallet smashing a cracked brown earth tile',
      heart:'A red heart sewn into a golden hay nest, tiny green sprout and ivory stitches',
      dash:'A golden wing strapped to a red leather ankle cuff, one short ivory speed streak',
      feather:'A soft ivory feather wrapped around a tiny blue padded elbow guard with lavender straps',
      magnet:'A chunky red horseshoe magnet holding three mint-green farm XP crystals',
      might:'A muscular corn cob dumbbell with two golden kernel weights and green husk grips',
      haste:'A brown enamel coffee mug with a tiny red rooster crest lid, curled cream steam',
      reach:'A telescoping wooden pitchfork with a brass sliding collar and three bright teal tines',
      regen:'An ivory milk bottle wearing a tiny red nurse cap, tied green healing herb sprig',
      shield:'A thick cracked eggshell shield with brass rim, red leather straps and blue center stud',
      harvest:'A small woven harvest basket overflowing with mint XP crystals and two golden corn kernels',
      thorns:'A prickly green bramble bracelet, tan leather clasp, three curved ivory thorns',
      milk:'A round cream farm milk jug, blue handle, red checkered neck ribbon, ivory stopper',
      xp:'A mint green faceted seed crystal held by two tiny golden husk leaves',
      'fusion-solar':'An angry ivory egg bomb with orange yolk eyes, black fuse and tiny gold spark',
      'fusion-reaper':'A double turquoise sickle carrying three mint XP crystals tied to its brown handle',
      'fusion-storm':'A copper farm drinking trough overflowing with blue water and two jagged electric sparks',
      'fusion-blizzard':'A short wooden clothesline between two stakes, three frozen lavender feathers hanging on it',
      'fusion-meteor':'Three orange carrots bursting from a cracked brown garden bed, green leaves and gold impact rays',
      'fusion-cauldron':'A round purple witch cauldron with green soup, wooden spoon and a tiny grumpy face carved on it',
      'fusion-fortress':'An ivory eggshell fortress shield framed by six curved violet cat claws, brass studs',
      'fusion-popcorn':'An overflowing red farm popcorn bucket with golden popping kernels and green corn-husk handles'
    };
    const entries=Object.entries(motifs),directory=path.join(root,'preview/pixellab/power-catalog');fs.mkdirSync(directory,{recursive:true});
    if(!process.argv.includes('--install'))for(let batch=0;batch<5;batch++){
      const file=path.join(directory,batch+'.png');if(fs.existsSync(file))continue;
      const objects=entries.slice(batch*8,batch*8+8).map(([,text],i)=>`Cell ${i+1} (${i<4?'TOP':'BOTTOM'} row, column ${i%4+1}): ${text}.`).join(' ');
      const body={image_size:{width:256,height:128},seed:100826+batch,no_background:true,enhance_prompt:false,
        description:'Premium cartoon FARM GAME inventory sprite sheet. EXACTLY FOUR columns, TWO rows of 64x64 cells. Eight separate complete objects, ONE in each cell, each centered within 48x48, surrounded by 8 transparent pixels. '+objects+' Playful handmade farm equipment, strong unique silhouettes, charming rounded shapes, clean dark outline, rich flat colors with three crisp pixel shade clusters. Native pixel art, no blur, realism, plastic shine, text, frames, floor or shadows. All objects fit their own cells; no overlap.'};
      const job=await client.job('chaos-catalog/'+batch,'/create-image-pixen',body);
      const payload=job.image?.base64||job.images?.length?job:(await client.request('/background-jobs/'+job.background_job_id)).last_response;
      const encoded=payload?.images?.[0]?.base64||payload?.images?.[0]?.image?.base64||payload?.image?.base64;
      if(!encoded)throw Error('PixelLab returned no catalog image; receipt preserved.');
      const bytes=Buffer.from(encoded.replace(/^data:image\/[^;]+;base64,/,''),'base64'),img=await loadImage(bytes);
      if(img.width!==256||img.height!==128)throw Error('Invalid catalog sheet dimensions');
      fs.writeFileSync(file,bytes);writeJSON(file+'.json',{provider:'PixelLab',endpoint:'/create-image-pixen',...body});console.log('Catalog sheet '+batch+' downloaded for review');
    }
    const atlas=createCanvas(256,640),g=atlas.getContext('2d');g.imageSmoothingEnabled=false;
    const cells={};
    for(let i=0;i<entries.length;i++){
      const image=await loadImage(path.join(directory,Math.floor(i/8)+'.png')),cell=createCanvas(64,64),c=cell.getContext('2d');
      c.drawImage(image,i%4*64,Math.floor(i%8/4)*64,64,64,0,0,64,64);
      const px=c.getImageData(0,0,64,64).data;let left=64,top=64,right=-1,bottom=-1,ink=0;
      for(let y=0;y<64;y++)for(let x=0;x<64;x++)if(px[(y*64+x)*4+3]>16){ink++;left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
      if(ink<80||ink>3500)throw Error('Invalid transparent catalog cell: '+entries[i][0]);
      const w=right-left+1,h=bottom-top+1,scale=Math.min(1,52/w,52/h),dw=Math.round(w*scale),dh=Math.round(h*scale),x=i%4*64,y=Math.floor(i/4)*64;
      g.drawImage(cell,left,top,w,h,x+Math.floor((64-dw)/2),y+Math.floor((64-dh)/2),dw,dh);cells[entries[i][0]]=[x,y];
    }
    fs.writeFileSync(path.join(directory,'review.png'),atlas.toBuffer('image/png'));
    if(process.argv.includes('--install')){
      const asset=path.join(root,'assets/shuffle/power-catalog.png');fs.writeFileSync(asset,atlas.toBuffer('image/png'));
      writeJSON(asset.replace('.png','.json'),{provider:'PixelLab',source:'assets/shuffle/power-catalog.png',width:256,height:640,cells});console.log('Installed 40 reviewed catalog sprites');
    }return;
  }
  if(process.argv.includes('--repair')){
    const source=await loadImage(path.join(root,'preview/pixellab/chaos-powers.png')),guide=createCanvas(256,128),g=guide.getContext('2d');g.imageSmoothingEnabled=false;
    for(let i=0;i<8;i++){
      const cell=createCanvas(64,64),c=cell.getContext('2d'),sx=i%4*64,sy=Math.floor(i/4)*64;c.drawImage(source,sx,sy,64,64,0,0,64,64);
      const px=c.getImageData(0,0,64,64).data;let left=64,top=64,right=0,bottom=0;
      for(let y=0;y<64;y++)for(let x=0;x<64;x++)if(px[(y*64+x)*4+3]){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
      const w=right-left+1,h=bottom-top+1,scale=Math.min(40/w,40/h),dw=Math.round(w*scale),dh=Math.round(h*scale);
      g.drawImage(cell,left,top,w,h,sx+Math.floor((64-dw)/2),sy+Math.floor((64-dh)/2),dw,dh);
    }
    const body={image:{base64:guide.toBuffer('image/png').toString('base64')},width:256,height:128,no_background:true,seed:100529,
      description:'Keep these 8 tiny icons in the SAME positions and sizes, FOUR columns TWO rows. Complete feather tip, lightning tips, carrot leaves and three cat claw tips. Preserve drop, paw sound, goose beak sound and eggshell shield. Each icon fits the central 40x40 of its own 64x64 cell: 12 TRANSPARENT pixels on ALL sides of EVERY cell. Do NOT enlarge. Closed complete silhouettes, crisp square pixels, dark outline. No shadows, glow, panels or text.'};
    const job=await client.job('chaos-art/powers-padded','/edit-image-pixen',body);
    const payload=job.image?.base64?job:(await client.request('/background-jobs/'+job.background_job_id)).last_response;
    require('./repair-shuffle-identities.cjs').saveImages(payload,[path.join(root,'preview/pixellab/chaos-powers-padded.png')]);
    writeJSON(path.join(root,'preview/pixellab/chaos-powers-padded.json'),{provider:'PixelLab',endpoint:'/edit-image-pixen',width:256,height:128,seed:body.seed,description:body.description,jobId:job.background_job_id||null});return;
  }
  for(const [id,body] of requests){
    const file=path.join(root,'preview/pixellab','chaos-'+id+'.png');
    if(fs.existsSync(file)){console.log(id+': already downloaded');continue;}
    const job=await client.job('chaos-art/'+id,'/generate-image-v2',body);
    const result=await client.request('/background-jobs/'+job.background_job_id),payload=result.last_response;
    const encoded=payload?.images?.[0]?.base64||payload?.images?.[0]?.image?.base64||payload?.image?.base64;
    if(!encoded)throw Error('Completed PixelLab job has no image');
    const png=Buffer.from(encoded.replace(/^data:image\/[^;]+;base64,/,''),'base64');
    if(!png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Expected PNG');
    fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,png);
    writeJSON(path.join(root,'preview/pixellab','chaos-'+id+'.json'),{provider:'PixelLab',endpoint:'/generate-image-v2',...body,jobId:job.background_job_id});
    console.log('Downloaded for review: '+file);
  }
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
