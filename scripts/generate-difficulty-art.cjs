// PixelLab-only production. Outputs remain previews until visually reviewed.
const fs=require('node:fs'),path=require('node:path');
const {loadImage}=require('@napi-rs/canvas');
const {PixelLabClient,loadKey,readJSON,writeJSON}=require('./lib/pixellab-client.cjs');
const root=path.resolve(__dirname,'..'),cache=path.join(root,'.cache/pixellab');
const reference='assets/menu/rescue-ensemble-b0ff47268d75.png';
const style='Create a new scene in exactly the charming polished pixel-art illustration style of the reference: rounded expressive cartoon farm animals, clean dark pixel outlines, deliberate pixel clusters, warm colors, same character identities and proportions. This is a fully illustrated scene, not pasted sprites or a gameplay screenshot. Landscape 3:2, close ensemble composition with large readable characters, all heads and feet safely inside frame. White hen Erina has red comb, yellow beak, two orange feet and two feathered wings. Paçoca is a caramel puppy with cream muzzle and red bandana, four paws and two floppy ears. Sheep has cream wool, peach face, brown hooves. Pink pig has floppy ears and split dark hooves. Preserve correct animal anatomy. No text, numbers, logos, UI, border, floating platform, black oval shadows, photorealism or glossy 3D. ';
const scenes={
 easy:{seed:620927,title:'Explorador',description:style+'Scene for EASY / EXPLORER difficulty: a peaceful sunny meadow beside a small red farm fence and flower patch. In the foreground Erina gently shows TWO tiny yellow chicks a butterfly perched on a daisy, one wing extended, a warm happy expression. Paçoca lies comfortably on his belly on the right, ears relaxed, wagging tail visible; a cream sheep rests on the left with folded legs and a sleepy smile. The pink pig leans over the low fence behind them, amused. Arrange the group as a gentle low semicircle around the chicks, with breathing room between silhouettes. Bright morning, soft mint sky, buttery sunlight, fresh sage grass, small daisies. Cozy and playful, absolutely no danger, no wolf, no urgency. A completely different composition from the reference: no crate and no central standing group portrait.'},
 hard:{seed:620928,title:'Contra o tempo',description:style+'Scene for HARD / AGAINST THE CLOCK difficulty: an energetic diagonal rescue dash on a winding farm lane in golden late-afternoon light. Erina leads toward the lower right, focused determined face, wings balancing her running stride. TWO yellow chicks hurry close behind her, with delighted determined faces. Paçoca bounds beside the chicks, floppy ears swept back, all four limbs anatomically correct; a pink pig runs farther behind with surprised eyebrows and a cream sheep follows with a brave expression. A large rustic hourglass with visible golden sand sits beside the foreground fence, a clear visual symbol of time pressure, no numerals. Dust puffs and a few leaves show movement, open red barn gate ahead. Compose a flowing diagonal line of running animals, not a posed portrait or a pile of overlapping bodies. Warm amber, terracotta, sage green, strong readable silhouettes, humorous urgency rather than terror. Do not copy the crate or group layout from the reference.'},
 hardcore:{seed:620929,title:'Última luz',description:style+'Scene for HARDEST / LAST LIGHT difficulty: a tense but cute evening rescue in a farm orchard. A close protective huddle moves carefully toward a warmly glowing open henhouse door on the right. Erina at the front holds ONE small brass lantern by its handle with one feathered wing; her second wing is stretched protectively toward TWO tiny yellow chicks immediately behind her. Her eyebrows show courage and concern. Paçoca guards the left of the chicks with alert ears and a worried determined face. A cream sheep and pink pig huddle behind, glancing toward the dark orchard, distinct scared-but-endearing expressions. One small gray wolf silhouette with two ears and a long bushy tail peers from behind a distant tree in the upper-left background, watchful rather than monstrous, no glowing red eyes. Deep indigo and muted plum twilight, a narrow coral sunset, warm honey lantern light clearly illuminates EVERY animal face. Keep all foreground animals readable, do not make the image nearly black. Intimate asymmetric composition, lantern glow the focus, no crate, no hourglass, no text.'}
};
async function main(){
 scenes.hard={seed:620938,title:'Contra o tempo',description:'A dynamic cartoon pixel-art illustration of a FARM RESCUE RACE, landscape 3:2. Entirely NEW action composition: every foreground character RUNS FROM LEFT TO RIGHT along a curving dirt lane toward an open red barn gate. Front right: brave white hen Erina with red comb, beak open in determination, two orange feet in a running stride and two feathered wings balancing her body. In the middle TWO tiny yellow chicks run closely together. Alongside them a caramel puppy with cream muzzle and red bandana bounds forward, four correct legs, ears flowing backwards. Left behind: a round pink pig with floppy ears runs wide-eyed, and a cream woolly sheep follows in a gallop. Keep the six animals clearly separated and their bodies fully inside frame. A LARGE WOODEN HOURGLASS with golden sand stands beside a fence in the foreground left. Warm golden afternoon, dust puffs, a few airborne leaves, diagonally flowing movement, urgent but funny expressions. Use character reference images for identity and style image for pixel-art treatment only. Thick clean dark outlines, rounded charming shapes, deliberate large pixels, simple readable shading. NO crate, NO posed group portrait, NO orchard gate composition, NO sitting animals, NO humans, NO clothing or bags, NO text or numbers, NO UI, NO black oval shadows.'};
 if(process.argv.includes('--plan')){console.log(Object.entries(scenes).map(([mode,s])=>({mode,seed:s.seed,promptLength:s.description.length})));return;}
 const selected=process.argv.slice(2);if(selected.some(m=>!scenes[m]))throw Error('Expected easy, hard or hardcore');
 const bytes=fs.readFileSync(path.join(root,reference)),image=await loadImage(bytes);
 const styleImage={image:{base64:bytes.toString('base64')},size:{width:image.width,height:image.height},usage_description:'Pixel-art rendering style only; do not reuse the composition.'};
 const refs=[];
 for(const [id,description]of [['chicken','Erina: brave white hen with red comb.'],['skin-pacoca','Paçoca: caramel puppy, cream muzzle, red bandana.'],['sheep','Cream woolly sheep, peach face, brown hooves.'],['pig','Round pink pig, floppy ears, dark hooves.']]){
  const folder=path.join(cache,'frames',id),source=readJSON(path.join(folder,'frames.json'));
  const png=fs.readFileSync(path.join(folder,source.actions.idle.south[0])),im=await loadImage(png);
  refs.push({image:{base64:png.toString('base64')},size:{width:im.width,height:im.height},usage_description:description+' Character identity only; redraw its pose for the requested scene. No humans.'});
 }
 const client=new PixelLabClient({key:loadKey(root),directory:path.join(cache,'jobs'),pollMs:10000,maxPolls:240});
 const results=await Promise.allSettled((selected.length?selected:Object.keys(scenes)).map(async mode=>{
  const scene=scenes[mode];if(scene.description.length>2000)throw Error('Prompt exceeds limit: '+mode);
  const file=path.join(root,'preview/pixellab/menu-'+mode+'.png');if(fs.existsSync(file)){console.log(mode+': preview already downloaded.');return;}
  let modeStyle=styleImage;
  if(mode==='hard'){
   const png=fs.readFileSync(path.join(root,'preview/pixellab/menu-easy.png'));
   modeStyle={...styleImage,image:{base64:png.toString('base64')}};
  }
  const body={image_size:{width:624,height:416},seed:scene.seed,no_background:false,reference_images:refs,style_image:modeStyle,style_options:{color_palette:mode!=='hardcore',outline:true,detail:true,shading:true},description:scene.description};
  let job;for(;;){try{job=await client.job('menu/difficulty-'+mode,'/generate-image-v2',body);break;}catch(e){if(e.status!==429)throw e;await client.pause(20000);}}
  const result=await client.request('/background-jobs/'+job.background_job_id),payload=result.last_response;
  writeJSON(path.join(cache,'menu-'+mode+'-result.json'),payload);
  const encoded=payload?.images?.[0]?.base64||payload?.images?.[0]?.image?.base64||payload?.image?.base64;
  if(!encoded)throw Error(mode+': no image in completed result');
  const png=Buffer.from(encoded.replace(/^data:image\/[^;]+;base64,/,''),'base64');
  if(!png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Expected PNG');
  fs.writeFileSync(file,png);console.log(mode+': illustration ready for visual review.');
 }));
 const failed=results.filter(r=>r.status==='rejected');if(failed.length)throw Error(failed.map(r=>r.reason.message).join('\n'));
 writeJSON(path.join(root,'assets/menu/difficulty-prompts.json'),{provider:'PixelLab Pro',endpoint:'/generate-image-v2',reference,size:{width:624,height:416},scenes});
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1});
