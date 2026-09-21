const fs=require('node:fs'),{createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
const targets=['systems/sunlight.js','systems/farm-sprites.js','systems/farm-details.js','systems/farm-art.js','src/systems/rescue-system.ts','systems/rescue-system.js','src/systems/sunflower-system.ts','systems/sunflower-system.js','src/types/browser-bridge.d.ts','src/types/game.d.ts','systems/ui.js','index.html','tests/farm-rendering.test.cjs','tests/sunlight.test.cjs','tests/animal-names.test.cjs','tests/scenery-contact-layer.test.cjs','tests/browser/names_scenery_smoke.py','scripts/review-grounded-props.cjs','docs/scenery-and-names.md'];
if(process.argv[2]==='stamp'){
 let html=fs.readFileSync('index.html','utf8');
 for(const name of ['sunlight','farm-sprites','farm-details','farm-art','sunflower-system','rescue-system','ui']){
  const file='systems/'+name+'.js',hash=createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0,12);
  html=html.replace(/(src="\.\/)([^"?]+)(?:\?v=[^"]*)?(")/g,(m,p,f,e)=>f===file?p+f+'?v='+hash+e:m);
 }
 fs.writeFileSync('index.html',html);
}else if(process.argv[2]==='manifest'){
 execFileSync('git',['add','--',...targets],{stdio:'inherit'});
 const files=targets.map(path=>({path,sha:execFileSync('git',['rev-parse',':'+path],{encoding:'utf8'}).trim(),mode:'100644',type:'blob'}));
 const report=JSON.parse(fs.readFileSync('.cache/names-scenery/report.json','utf8'));
 fs.writeFileSync('.github/grounding-result.json',JSON.stringify({base:'153b0c4f249b0ce72ea47b22a17218a7539e7217',files,checks:report.checks,errors:report.errors},null,2)+'\n');
 execFileSync('git',['add','.github/grounding-result.json']);
}else throw Error('Use stamp or manifest');
