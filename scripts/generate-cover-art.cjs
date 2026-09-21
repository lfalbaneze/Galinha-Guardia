// PixelLab Pro cover artwork. API key and job responses remain private.
const fs=require('node:fs'),path=require('node:path');
const {loadImage}=require('@napi-rs/canvas');
const {PixelLabClient,loadKey,readJSON,writeJSON}=require('./lib/pixellab-client.cjs');
const root=path.resolve(__dirname,'..'),cache=path.join(root,'.cache/pixellab');
const prompt='Create an original illustrated COVER for the charming farm rescue videogame "PENAS PRO AR!". Landscape 3:2, polished expressive cartoon PIXEL ART with crisp dark outlines and deliberate pixel clusters, same animals and treatment as references. Large beautifully readable custom chunky cream-and-honey title lettering across the top third, dark brown outline and subtle golden depth. Exact title on two lines: "PENAS" then "PRO AR!". No other lettering. In the lower two thirds, a lively adventurous triangular composition: brave white hen Erina with red comb at center foreground spreading her TWO feathered wings protectively, two small yellow chicks safely beside her two orange feet. Paçoca, caramel puppy with cream muzzle and red bandana, bounds in from the lower left with an excited face and four anatomically correct legs. A fluffy cream sheep with peach face looks startled and a round pink pig with floppy ears looks determined on the right. One mischievous gray wolf with pointed ears and long bushy tail peeks from behind a distant wooden fence, small enough to be a secondary discovery. Rich farm scenery: red barn, winding dirt path leading into rolling green hills, apple tree framing one side, daisies and a few airborne white feathers. Warm late-afternoon sun and soft mint sky, vibrant honey, coral and sage colors, cheerful adventure with a hint of comic danger. Clear hierarchy: title, hen, animal friends, distant wolf. Full bodies inside frame, distinct silhouettes, stable correct species anatomy. Do not copy the pose or composition of the style reference. No humans, knights, witches, armor, modern objects, UI, watermarks, floating platforms or oval shadows. This must feel like a memorable game cover, not a menu screenshot.';
(async()=>{
 const refs=[];
 for(const [id,description]of [['chicken','Erina, white hen with red comb.'],['skin-pacoca','Paçoca, caramel puppy with cream muzzle and red bandana.'],['sheep','Cream woolly sheep with peach face.'],['pig','Pink round pig with floppy ears.']]){
  const dir=path.join(cache,'frames',id),src=readJSON(path.join(dir,'frames.json'));
  const bytes=fs.readFileSync(path.join(dir,src.actions.idle.south[0])),im=await loadImage(bytes);
  refs.push({image:{base64:bytes.toString('base64')},size:{width:im.width,height:im.height},usage_description:description+' Preserve identity, redraw pose.'});
 }
 const stylePath='assets/menu/difficulty-easy-6ea10849fc88.png',style=fs.readFileSync(path.join(root,stylePath));
 const body={image_size:{width:624,height:416},seed:620940,no_background:false,description:prompt,reference_images:refs,
  style_image:{image:{base64:style.toString('base64')},size:{width:624,height:416},usage_description:'Pixel-art treatment and character appeal only, not composition.'},
  style_options:{color_palette:true,outline:true,detail:true,shading:true}};
 if(prompt.length>2000)throw Error('Cover prompt exceeds limit');
 const client=new PixelLabClient({key:loadKey(root),directory:path.join(cache,'jobs'),pollMs:10000,maxPolls:240});
 let job;for(;;){try{job=await client.job('menu/game-cover','/generate-image-v2',body);break;}catch(e){if(e.status!==429)throw e;await client.pause(20000);}}
 const result=await client.request('/background-jobs/'+job.background_job_id),payload=result.last_response;
 writeJSON(path.join(cache,'game-cover-result.json'),payload);
 const data=payload?.images?.[0]?.base64;if(!data)throw Error('No cover image returned');
 const bytes=Buffer.from(data.replace(/^data:image\/[^;]+;base64,/,''),'base64');
 const im=await loadImage(bytes);if(im.width!==624||im.height!==416)throw Error('Unexpected cover dimensions');
 fs.writeFileSync(path.join(root,'preview/pixellab/game-cover.png'),bytes);
 writeJSON(path.join(root,'assets/menu/cover-prompt.json'),{provider:'PixelLab Pro',endpoint:'/generate-image-v2',seed:body.seed,size:body.image_size,styleReference:stylePath,prompt});
 console.log('PixelLab cover ready for visual review.');
})().catch(e=>{console.error(e.message);process.exitCode=1});
