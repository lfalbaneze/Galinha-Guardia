/* Build-time only. Converts EXISTING art metadata to JSON; the Python game never runs JS. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'python_game/assets');
fs.mkdirSync(out,{recursive:true});
const context=vm.createContext({SpriteData:{},PremiumWildlifeData:{}});
vm.runInContext(fs.readFileSync(path.join(root,'systems/pixellab-art-data.js'),'utf8'),context);
const data=vm.runInContext('PixelLabArtData',context),result={};
for(const species of ['chicken','wolf','fox','goose','sheep','pig','rabbit','cow','duck','dog']){
  const d=data[species];if(!d)throw Error('Missing art: '+species);
  const source=d.source.replace(/^\.\//,'');
  if(!source.startsWith('assets/')||source.includes('..')||!fs.existsSync(path.join(root,source)))throw Error('Invalid asset path');
  const actions={};
  for(const action of ['idle','walk']){
    actions[action]={};
    for(const [direction,pose] of Object.entries(d.actions[action]))
      actions[action][direction]=pose.frames.map(f=>[f.x,f.y,f.w,f.h,f.cx,f.bottom,f.top||0]);
  }
  result[species]={source,actions};
}
fs.writeFileSync(path.join(out,'characters.json'),JSON.stringify(result));
const sceneContext=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root,'assets/farm/arcade-data.js'),'utf8'),sceneContext);
const scene=vm.runInContext('FarmArcadeData',sceneContext);
if(scene.image.startsWith('data:image/png;base64,'))fs.writeFileSync(path.join(out,'scenery.png'),Buffer.from(scene.image.split(',')[1],'base64'));
else{
  const source=scene.image.replace(/^\.\//,'');
  if(!source.startsWith('assets/')||source.includes('..'))throw Error('Invalid scenery path');
  fs.copyFileSync(path.join(root,source),path.join(out,'scenery.png'));
}
fs.writeFileSync(path.join(out,'scenery.json'),JSON.stringify(scene.frames));
console.log('Existing artwork exported for native Python. No API calls or purchased credits.');
