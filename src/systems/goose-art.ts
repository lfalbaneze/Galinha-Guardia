/* PANTO's original alpha sheet stays intact; source crops share one scale and foot plane. */
const GooseArt = (() => {
  const source = 'assets/sprites/sources/panto-v2.png';
  // Rows retain the public up/right/down/left order. The generated sheet starts with down.
  const frames = [
    {x:85,y:771,w:196,h:338},{x:410,y:771,w:195,h:340},{x:673,y:771,w:319,h:340},
    {x:66,y:395,w:232,h:342},{x:382,y:395,w:240,h:342},{x:713,y:393,w:241,h:344},
    {x:90,y:20,w:190,h:345},{x:417,y:21,w:188,h:348},{x:684,y:18,w:298,h:347},
    {x:62,y:1131,w:254,h:346},{x:383,y:1131,w:254,h:348},{x:708,y:1129,w:268,h:348}
  ];
  const scale = 64 / 348;
  const rows: Record<Farm.Direction, number> = { up: 0, right: 1, down: 2, left: 3 };
  let image: CanvasImageSource | null = null;
  let pending: Promise<boolean> | null = null;
  let errors: string[] = [];

  function browserImage(src: string): Promise<CanvasImageSource> {
    return new Promise((resolve, reject) => {
      const candidate = new Image();
      const timeout = setTimeout(() => reject(new Error(src)), 10000);
      candidate.onload = () => { clearTimeout(timeout); resolve(candidate); };
      candidate.onerror = () => { clearTimeout(timeout); reject(new Error(src)); };
      candidate.src = src;
    });
  }
  function load(loader: (src: string) => Promise<CanvasImageSource> = browserImage): Promise<boolean> {
    if (pending) return pending;
    if (image) return Promise.resolve(true);
    errors = [];
    // Defer the loader so even a synchronous error becomes a reported load failure.
    pending = Promise.resolve().then(() => loader(source)).then(loaded => {
      const size=loaded as {width?:number;height?:number};
      if(size.width!==1024||size.height!==1536){errors=[source];pending=null;return false;}
      image = loaded; pending = null; return true;
    }, () => { errors = [source]; pending = null; return false; });
    return pending;
  }
  function install(loader: (src: string) => CanvasImageSource): void {
    image = loader(source); errors = [];
  }
  function frameFor(goose: Farm.Goose): { row: number; column: number } {
    const alert = goose.mode === 'warning' || goose.mode === 'charge' || goose.mode === 'feint';
    // The sheet has one idle, one stepping and one wings-open pose per direction.
    const column = alert || (goose.mode==='patrol' && !goose.moving && goose.activity==='preen') ? 2 : goose.moving && !InterfaceMotion.reduced
      ? Math.floor(Math.abs(goose.anim)) % 2 : 0;
    return { row: rows[goose.direction] ?? rows.down, column };
  }
  function draw(context: CanvasRenderingContext2D, goose: Farm.Goose, view: Farm.Camera): boolean {
    if (!image) return false;
    const x = Math.round(goose.x - view.x + (view.shakeX || 0));
    const y = Math.round(goose.y - view.y + (view.shakeY || 0));
    const frame = frameFor(goose),crop=frames[frame.row*3+frame.column];
    context.save();
    context.imageSmoothingEnabled = false;
    context.fillStyle = 'rgba(45,49,25,.23)';
    context.beginPath(); context.ellipse(x, y + 14, 18, 4, 0, 0, Math.PI * 2); context.fill();
    // Anchor every cropped pose by its feet, including the wider honking wings.
    const peck=goose.mode==='patrol'&&!goose.moving&&goose.activity==='forage'&&!InterfaceMotion.reduced?
      Math.max(0,Math.sin(goose.anim*3))*5:0;
    const w=Math.round(crop.w*scale),h=Math.round(crop.h*scale);
    const tile=typeof SpriteStyle==='undefined'?null:SpriteStyle.tile(image,[crop.x,crop.y,crop.w,crop.h],w,h);
    if(typeof Sunlight!=='undefined')Sunlight.cast(context,tile||image,Math.round(x-w/2),Math.round(y+14-h+peck),w,Math.round(h-peck),y+14,
      tile?undefined:[crop.x,crop.y,crop.w,crop.h]);
    if(tile)context.drawImage(tile,Math.round(x-w/2),Math.round(y+14-h+peck),w,Math.round(h-peck));
    else context.drawImage(image,crop.x,crop.y,crop.w,crop.h,Math.round(x-w/2),Math.round(y+14-h+peck),w,Math.round(h-peck));
    if (goose.mode === 'stunned') {
      context.fillStyle='#e8c65a';
      for (let i=0;i<3;i++) {
        const angle=i*Math.PI*2/3+(InterfaceMotion.reduced ? 0 : goose.anim);
        const sx=Math.round(x+Math.cos(angle)*14), sy=Math.round(y-61+Math.sin(angle)*4);
        context.fillRect(sx-3,sy-1,7,3); context.fillRect(sx-1,sy-3,3,7);
      }
    } else if (goose.mode === 'notice') {
      context.font='bold 15px Trebuchet MS,sans-serif';context.textAlign='center';
      context.fillStyle='#f8e6ac';context.fillText('?',x,y-62);
    }
    context.restore();
    return true;
  }
  return { draw, frameFor, load, install, source, frames, scale,
    get ready(): boolean { return image !== null; },
    get loading(): boolean { return pending !== null; },
    get errors(): string[] { return errors.slice(); } };
})();
