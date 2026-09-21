const path=require('node:path');
const {buildData}=require('./lib/pixellab-import.cjs');
const {bakeGrounding}=require('./bake-sprite-grounding.cjs');
async function main(){
  const root=path.resolve(__dirname,'..'),characters=buildData(root);
  const frames=await bakeGrounding(root);
  console.log(`PixelLab: ${characters} personagens instalados; ${frames} quadros com apoio nos pés.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
