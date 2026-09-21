// Bake foot bounds into the installed runtime data, including for file:// games.
// This only reads local PNGs. It never regenerates artwork or calls a provider.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createHash}=require('node:crypto');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
async function bakeGrounding(root) {
  const file=path.join(root,'systems/pixellab-art-data.js');
  if(!fs.existsSync(file))return 0;
  const context=vm.createContext({SpriteData:{},PremiumWildlifeData:{}});
  vm.runInContext(fs.readFileSync(path.join(root,'systems/sunlight.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(file,'utf8'),context);
  const sunlight=vm.runInContext('Sunlight',context),data=context.SpriteData;
  sunlight.install(createCanvas);
  const images=new Map();let frames=0;
  for(const [name,definition] of Object.entries(data)) {
    if(['owl','crow'].includes(name))continue;
    for(const [action,poses] of Object.entries(definition.actions||{walk:definition.poses})) {
      if(['fly','alert'].includes(action))continue;
      for(const pose of Object.values(poses))for(const frame of pose.frames) {
        if(!images.has(frame.src))images.set(frame.src,await loadImage(path.join(root,frame.src)));
        const bounds=sunlight.footprint(images.get(frame.src),frame.w,frame.h,[frame.x,frame.y,frame.w,frame.h]);
        if(!bounds)throw Error(`No opaque foot in ${name}/${action}: ${frame.src}`);
        frame.grounding=Object.fromEntries(Object.entries(bounds).map(([k,v])=>
          [k,v/(['top','bottom'].includes(k)?frame.h:frame.w)]));
        frames++;
      }
    }
    // The default walking poses must share the same support metadata as actions.
    if(definition.actions?.walk)definition.poses=definition.actions.walk;
  }
  const script='/* Generated from installed art with opaque foot bounds. */\nconst PixelLabArtData = '+JSON.stringify(data)+
    ';\nObject.assign(SpriteData, PixelLabArtData);\nObject.assign(PremiumWildlifeData, '+JSON.stringify(context.PremiumWildlifeData)+');\n';
  fs.writeFileSync(file,script);
  const htmlFile=path.join(root,'index.html');
  if(fs.existsSync(htmlFile)) {
    let html=fs.readFileSync(htmlFile,'utf8');
    for(const name of ['systems/pixellab-art-data.js','systems/character-art.js','systems/sunlight.js']) {
      const hash=createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex').slice(0,12);
      html=html.replace(/(src="\.\/)([^"?]+)(?:\?v=[^"]*)?(")/g,
        (match,prefix,src,end)=>src===name?`${prefix}${src}?v=${hash}${end}`:match);
    }
    fs.writeFileSync(htmlFile,html);
  }
  return frames;
}
module.exports={bakeGrounding};
