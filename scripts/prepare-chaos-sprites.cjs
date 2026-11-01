// Export the active identities and existing effects as local repaint references.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {loadArt}=require('./sprite-loader.cjs'),S=require('../shuffle/survival.js');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.cache/chaos-sprite-review/inputs');
(async()=>{
  fs.mkdirSync(out,{recursive:true});const art=await loadArt(process.argv.includes('--mode')?'chaos':undefined);
  const descriptions=new Map([...require('./lib/pixellab-cast.cjs').cast,...require('./lib/pixellab-shuffle-cast.cjs').cast].map(item=>[item.id,item.description]));
  const required=[...new Set(['chicken','wolf','goose','fox','sheep','pig','rabbit','cow','duck','dog',...Object.keys(S.HEROES).map(id=>art.appearances[id]).map(a=>a.sprite||a.species),...Object.keys(S.ENEMIES)])];
  const castConfig=Object.fromEntries(required.map(id=>{
    if(!descriptions.has(id))throw Error('Missing character identity: '+id);
    if(id!=='hen-silkie')return [id,{source:id,restoreOriginal:true}];
    const hero=['chicken','hen-silkie','hen-blue'].includes(id)||id.startsWith('skin-');
    return [id,{source:id,prefix:'chaos-',edition:112,canvas:256,batch:12,steps:12,denoise:.38,weight:.8,boundaryOnly:true,silkieIdentity:id==='hen-silkie',
      actions:['idle','walk','run','alert','fly',...(id==='wolf'?['angry']:[])],
      negative:'photo, realistic, 3d, glossy, plastic, fine fur texture, blur, scenery, shadow, floor, text, watermark, extra limbs, missing legs, extra heads, cropped, gore'+(hero?', angry face, angry eyebrows':'')+(id==='hen-silkie'?', red comb, red wattles':'')+(id==='curupira'?'':', human face, human nose, human skin'),
      prompt:descriptions.get(id)+' Cute hand drawn farm cartoon pixel art, bold clean dark outlines, rounded simple volumes, expressive oval eyes, flat colors, minimal shading. '+(hero?'Gentle cheerful face, kind large eyes, relaxed soft eyebrows. ':'Mischievous expressive face. ')+' Same pose as input, white background.'}];
  }));
  fs.writeFileSync(path.join(out,'cast-config.json'),JSON.stringify(castConfig,null,2));
  const cast=[...Object.keys(S.HEROES).map(skin=>({id:'hero-'+skin,species:'chicken',skin})),
    ...Object.keys(S.ENEMIES).map(species=>({id:'enemy-'+species,species}))];
  const atlasPoses=JSON.parse(fs.readFileSync(path.join(root,'assets/shuffle/results/atlas-poses.json'),'utf8'));
  const records=[];
  for(const actor of cast){
    const definition=art.frameFor(actor.species,{skin:actor.skin}).definition,image=await loadImage(path.join(root,definition.source));
    for(const outcome of ['win','lose']){
      const preset=atlasPoses[actor.id]?.[outcome],mood=outcome==='win'?'happy':'sad',hasMood=!!definition.actions[mood],native=!!preset||hasMood||definition.provider==='pixellab';
      let selected=art.frameFor(actor.species,{skin:actor.skin,direction:'down',action:hasMood?mood:outcome==='win'?'idle':'walk',moving:!hasMood&&outcome==='lose',anim:!hasMood&&outcome==='lose'?1.5:0});
      if(preset)selected={action:preset.action,index:preset.index,frame:definition.actions[preset.action][preset.direction].frames[preset.index]};
      const f=selected.frame,crop=createCanvas(f.w,f.h),c=crop.getContext('2d');c.drawImage(image,f.x,f.y,f.w,f.h,0,0,f.w,f.h);
      const bounds=require('./lib/pixellab-import.cjs').bounds(crop,actor.id+'/'+outcome),fit=Math.min(112/bounds.width,112/bounds.height),scale=preset?Math.floor(fit):fit;
      const destination={x:Math.floor((128-Math.round(bounds.width*scale))/2),y:120-Math.round(bounds.height*scale),w:Math.round(bounds.width*scale),h:Math.round(bounds.height*scale)};
      const canvas=createCanvas(128,128),g=canvas.getContext('2d');g.imageSmoothingEnabled=false;
      g.drawImage(image,f.x+bounds.left,f.y+bounds.top,bounds.width,bounds.height,destination.x,destination.y,destination.w,destination.h);
      const source=path.relative(root,path.join(out,actor.id+'-'+outcome+'.png')).split(path.sep).join('/');fs.writeFileSync(path.join(root,source),canvas.toBuffer('image/png'));
      const identity=art.appearances[actor.skin],sprite=identity?.sprite||identity?.species||actor.species;
      records.push({...actor,outcome,native,emotion:hasMood,sourceProvider:definition.provider,source,description:descriptions.get(sprite),atlasSelection:!!preset,provenance:{source:definition.source,action:selected.action,direction:preset?.direction||'down',index:selected.index,...(preset?{scale}:{}),
        crop:{x:f.x+bounds.left,y:f.y+bounds.top,w:bounds.width,h:bounds.height},destination}});
    }
  }
  fs.writeFileSync(path.join(out,'portraits.json'),JSON.stringify(records,null,2));
  const fx=vm.runInNewContext(fs.readFileSync(path.join(root,'shuffle/effects.js'),'utf8')+';ShuffleFX');
  fx.setPowerSheet(await loadImage(path.join(root,'assets/shuffle/chaos-powers.png')));
  fx.setItemSheet(await loadImage(path.join(root,'assets/shuffle/items-pixel.png')));
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'assets/shuffle/power-catalog.json'),'utf8'));
  fx.setCatalogSheet(await loadImage(path.join(root,catalog.source)),Object.keys(catalog.cells));
  for(const id of ['eggshot','fire','dirt','hex','popcorn','frost','venom','fire-egg']){
    const canvas=createCanvas(64,64),c=canvas.getContext('2d');
    if(['fire','dirt','hex'].includes(id))fx.enemyShot(c,{kind:id==='hex'?'magic':id,x:32,y:42,vx:1,vy:0},0,true);
    else if(id==='popcorn')fx.projectile(c,{kind:'fusion',fusion:'popcorn',popped:true,x:32,y:42,vx:1,vy:0},0,true);
    else fx.icon(c,id==='frost'?'feather':id==='venom'?'water':'eggshot',32,32,48);
    fs.writeFileSync(path.join(out,id+'.png'),canvas.toBuffer('image/png'));
    const style=createCanvas(64,64);fx.catalogIcon(style.getContext('2d'),id==='fire-egg'?'fireball':id==='fire'?'fireball':id==='dirt'?'mines':id==='hex'?'fusion-cauldron':id==='popcorn'?'fusion-popcorn':id==='eggshot'?'egg':id,32,32,64);
    fs.writeFileSync(path.join(out,id+'-style.png'),style.toBuffer('image/png'));
  }
  console.log(`Prepared ${records.length} identity-matched portraits and 8 projectile references.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
