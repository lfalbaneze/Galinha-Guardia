async function main() {
const { createCanvas } = require('@napi-rs/canvas');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const art = await require('./sprite-loader.cjs').loadArt();
const target=path.join(root,'assets/wardrobe');
fs.mkdirSync(target,{recursive:true});
for(const skin of Object.keys(art.appearances)) {
  const canvas=createCanvas(160,160);
  art.draw(canvas.getContext('2d'),'chicken',80,118,{skin,direction:'right',scale:1.8,anim:1.2});
  fs.writeFileSync(path.join(target,skin+'.png'),canvas.toBuffer('image/png'));
  const portrait=createCanvas(192,192),c=portrait.getContext('2d');
  art.draw(c,'chicken',96,150,{skin,direction:'down',scale:2.7});
  fs.writeFileSync(path.join(root,`assets/menu/portraits/${skin==='classic'?'carijo':skin}.png`),portrait.toBuffer('image/png'));
}

}
main().catch(error => { console.error(error); process.exitCode = 1; });
