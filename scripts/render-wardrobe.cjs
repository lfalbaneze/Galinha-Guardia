const { createCanvas } = require('@napi-rs/canvas');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const art = vm.runInNewContext(fs.readFileSync(path.join(root,'systems/character-art.js'),'utf8')+';CharacterArt');
const target=path.join(root,'assets/wardrobe');
fs.mkdirSync(target,{recursive:true});
for(const skin of ['classic','punk','astronaut','robocop','priest']) {
  const canvas=createCanvas(160,160);
  art.draw(canvas.getContext('2d'),'chicken',80,118,{skin,direction:'right',scale:1.8,anim:1.2});
  fs.writeFileSync(path.join(target,skin+'.png'),canvas.toBuffer('image/png'));
}
