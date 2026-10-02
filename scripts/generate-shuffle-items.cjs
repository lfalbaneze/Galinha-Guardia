// One PixelLab sheet; generation records allow resuming without buying it twice.
const fs=require('node:fs'),path=require('node:path');
const {PixelLabClient,loadKey,writeJSON}=require('./lib/pixellab-client.cjs');
const root=path.resolve(__dirname,'..');
const body={image_size:{width:192,height:128},seed:630927,no_background:true,
  description:'A polished hand-pixeled 16-bit farm adventure inventory sprite sheet, EXACTLY 3 columns by 2 rows on a transparent 192x128 canvas. Six separate collectible objects, each centered in its own 64x64 cell with at least 12 completely transparent pixels of padding on all sides. Top row LEFT: a plump golden corn cob, detailed individual kernels and curling green husk leaves. Top row CENTER: a large intact ivory chicken egg nestled in a small golden straw nest, subtle warm speckles and a small amber gleam, NO cartoon face and NO fried egg. Top row RIGHT: a rustic curved steel harvesting sickle, broad crescent blade with blue-gray steel shading, nicked edge, wooden handle wrapped in reddish twine. Bottom row LEFT: a chunky worn brown leather farm work boot, brass eyelets, ivory laces, dark thick ridged sole and a green cloth cuff. Bottom row CENTER: a squat full glass milk bottle, creamy white milk, metal cap and a tiny red cloth tied around the neck, small blue farm stamp with NO readable text. Bottom row RIGHT: a compact cluster of three faceted mint-green emerald XP crystals with bright angular facets and deep teal edges. Consistent charming tactile RPG pixel art, visible deliberate square pixel clusters, 1-pixel dark colored outlines, rich limited warm palette, stepped 3-tone shadows ON THE OBJECTS, top-left highlights, slight three-quarter top-down view. Objects occupy at most 40x40 pixels each. Mandatory 12-pixel fully transparent gutters inside EVERY cell, including the outer canvas edges; no object may touch its cell boundary. Crisp native 1:1 pixel art, not vector icons, not smooth cartoons, no antialiasing, no gradients, no plastic 3D. NO drop shadow, no oval ground shadows, no ground, no scenery, no container tiles, no frames, no borders, no text, no letters, no numbers, no overlapping cells, no extra objects.'};
async function main(){
  const client=new PixelLabClient({key:loadKey(root),directory:path.join(root,'.cache/pixellab/jobs'),pollMs:6000});
  const requests=[['items',body,'shuffle-items-padded.png'],['boot',{
    image_size:{width:64,height:64},seed:630928,no_background:true,
    description:'One small COMPLETE rustic brown leather farm work boot, isolated at the CENTER of a transparent 64x64 canvas, with generous empty margins on ALL four sides. The entire boot fits inside a centered 40x40 pixel box, so keep at least 12 pixels blank along every canvas edge. Boot toe points RIGHT, heel on LEFT. Thick dark treaded sole, warm worn chestnut leather, brass eyelets, ivory criss-cross laces, green folded cloth cuff. Cute tactile 16-bit farming RPG inventory item, rich deliberate square pixel clusters and three-tone material shading, crisp native single-pixel dark colored outline, warm light from upper left, slightly top-down three-quarter side view. Preserve full toe and full heel, complete closed silhouette. A small usable pixel-art sprite with empty space around it, NOT a zoomed close-up. NO ground, no shadow, no oval, no panel, no labels, no words, no background, no smooth vector lines or antialiasing.'
  },'shuffle-boot.png']];
  for(const [id,request,name] of requests){
  const file=path.join(root,'preview/pixellab',name);
  if(fs.existsSync(file)){console.log(id+': already downloaded.');continue;}
  const job=await client.job('shuffle/'+id,'/generate-image-v2',request);
  const result=await client.request('/background-jobs/'+job.background_job_id),payload=result.last_response;
  const encoded=payload?.images?.[0]?.base64||payload?.images?.[0]?.image?.base64||payload?.image?.base64;
  if(!encoded)throw Error('Completed PixelLab job has no image.');
  const png=Buffer.from(encoded.replace(/^data:image\/[^;]+;base64,/,''),'base64');
  if(!png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Expected PNG');
  fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,png);
  writeJSON(path.join(root,'.cache/pixellab/shuffle-'+id+'-provenance.json'),{provider:'PixelLab',endpoint:'/generate-image-v2',...request,jobId:job.background_job_id});
  console.log('Downloaded for visual review: '+file);
  }
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
