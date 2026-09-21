const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {buildData}=require('./lib/pixellab-import.cjs');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist');
const count=buildData(root),script=fs.readFileSync(path.join(root,'systems/pixellab-art-data.js'));
if(!fs.existsSync(path.join(dist,'index.html')))throw Error('Execute o build completo antes da sincronização de sprites.');
for(const name of fs.readdirSync(path.join(root,'assets/sprites/pixellab-108/meta')).filter(n=>n.endsWith('.json'))){
 const item=JSON.parse(fs.readFileSync(path.join(root,'assets/sprites/pixellab-108/meta',name))),source=item.definition.source;
 if(!/^assets\/sprites\/pixellab-108\/runtime\/[a-z0-9-]+\.png$/.test(source))throw Error('Invalid runtime sprite path');
 fs.mkdirSync(path.dirname(path.join(dist,source)),{recursive:true});fs.copyFileSync(path.join(root,source),path.join(dist,source));
}
fs.writeFileSync(path.join(dist,'systems/pixellab-art-data.js'),script);
const htmlFile=path.join(dist,'index.html'),version=createHash('sha256').update(script).digest('hex').slice(0,12);
const scripts=new Map([...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/src="\.\/([^"?]+\.js)(\?v=[^"]*)?"/g)].map(m=>[m[1],m[2]||'']));
fs.writeFileSync(htmlFile,fs.readFileSync(htmlFile,'utf8').replace(/(src="\.\/)([^"?]+\.js)(?:\?v=[^"]*)?(")/g,
  (match,prefix,file,end)=>scripts.has(file)?`${prefix}${file}${scripts.get(file)}${end}`:match));
const menuStyle=fs.readFileSync(path.join(root,'menu.css')),menuRevision=createHash('sha256').update(menuStyle).digest('hex').slice(0,12);
fs.writeFileSync(path.join(dist,'menu.css'),menuStyle);fs.writeFileSync(path.join(dist,`menu.${menuRevision}.css`),menuStyle);
fs.writeFileSync(htmlFile,fs.readFileSync(htmlFile,'utf8').replace(/href="\.\/menu(?:\.[a-f0-9]{12})?\.css(?:\?[^\"]*)?"/g,`href="./menu.${menuRevision}.css"`));
for(const name of ['character-art','wildlife-art','owl-art','owl-system','fox-art','goose-art','thor-art','scarecrow-art','scarecrow-system','menu-scene','menu-briefing','thor-cinematic'])fs.copyFileSync(path.join(root,'systems',name+'.js'),path.join(dist,'systems',name+'.js'));
fs.copyFileSync(path.join(root,'game.js'),path.join(dist,'game.js'));
for(const file of ['assets/sprites/pixellab-108/README.md','assets/sprites/CREDITS.html'])fs.copyFileSync(path.join(root,file),path.join(dist,file));
console.log(`Build local atualizado com ${count} personagens PixelLab e versão de cache ${version}.`);
