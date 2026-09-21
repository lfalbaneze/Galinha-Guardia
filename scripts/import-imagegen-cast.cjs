// Copy approved generated sheets into the project and retain their prompt provenance.
const fs=require('node:fs'),path=require('node:path');
const {cast}=require('./lib/pixellab-cast.cjs');
const root=path.resolve(__dirname,'..'),base=path.join(root,'assets/sprites/pixel-109');
const imports=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
for(const item of imports){
  if(!cast.some(c=>c.id===item.id)||!/^[-a-z0-9]+$/.test(item.action)||!item.prompt||item.prompt.startsWith('undefined'))throw Error('Invalid sprite metadata');
  const name=item.id+(item.action==='walk'?'':'-'+item.action)+'.png';
  fs.copyFileSync(item.source,path.join(base,'raw',name));
  fs.writeFileSync(path.join(base,'meta',name.replace(/\.png$/,'.json')),JSON.stringify({...item,tool:'built-in imagegen'},null,2)+'\n');
}
console.log('Imported '+imports.length+' authored sheets.');
