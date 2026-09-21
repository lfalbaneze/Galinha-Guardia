/* Four-direction pixel sheet with the same world foot plane as the farm cast. */
const FoxArt = (() => {
  const {src:source,width,height,frames,columns}=PremiumWildlifeData.fox;
  const sheet=createWildlifeSheet(source,width,height,frames,columns);
  const amanda=PremiumWildlifeData.amanda;
  const amandaSheet=createWildlifeSheet(amanda.src,amanda.width,amanda.height,amanda.frames,amanda.columns);
  let pending: Promise<boolean>|null=null;
  function load(loader?:(src:string)=>Promise<CanvasImageSource>):Promise<boolean>{
    if(pending)return pending;
    pending=Promise.all([sheet.load(loader),amandaSheet.load(loader)]).then(result=>{pending=null;return result.every(Boolean);});return pending;
  }
  const rows: Record<Farm.ArtDirection,number>={down:0,right:1,up:2,left:3,downright:4,upright:5,downleft:6,upleft:7};
  function frameFor(fox: Farm.Fox): {row:number;column:number} {
    const count=fox.name==='Amanda'?amanda.columns:columns;
    return {row:rows[CharacterArt.heading(fox)]??0,column:fox.moving&&!InterfaceMotion.reduced?
      Math.floor(Math.abs(fox.anim)*count/4)%count:0};
  }
  function draw(c:CanvasRenderingContext2D,fox:Farm.Fox,view:Farm.Camera):boolean {
    // Waiting in cover is a behavior, not invisibility.
    const active=fox.name==='Amanda'?amandaSheet:sheet;
    if(!active.ready)return false;
    const x=fox.x-view.x+(view.shakeX||0),y=fox.y-view.y+(view.shakeY||0),frame=frameFor(fox);
    const sprite=fox.name==='Amanda'?'amanda':'fox';
    if(CharacterArt.frameFor?.(sprite)?.definition?.provider==='pixellab'&&CharacterArt.ready)
      return CharacterArt.draw(c,sprite,x,y,{direction:CharacterArt.heading(fox),anim:fox.anim,
        moving:fox.moving&&!InterfaceMotion.reduced,sprinting:fox.mode==='dash'||fox.mode==='flee',
        mood:fox.mode==='flee'?'scared':fox.mode==='warning'?'angry':'normal'});
    return active.drawFrame(c,x,y+14,frame.row,frame.column,1);
  }
  return {draw,frameFor,frames,source,columns,
    load,
    install:(loader:(src:string)=>CanvasImageSource)=>{sheet.install(loader);amandaSheet.install(loader);},
    get ready(){return sheet.ready&&amandaSheet.ready;},get loading(){return sheet.loading||amandaSheet.loading;},get errors(){return [...sheet.errors,...amandaSheet.errors];}};
})();
