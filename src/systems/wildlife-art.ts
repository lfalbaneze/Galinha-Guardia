/* Source rectangles preserve supplied artwork, including sheets with uneven row spacing. */
interface WildlifeSpriteFrame { x: number; y: number; w: number; h: number; }
function createWildlifeSheet(source: string, width: number, height: number, frames: readonly WildlifeSpriteFrame[]) {
  let image: CanvasImageSource | null=null, pending: Promise<boolean> | null=null;
  let errors: string[]=[];
  function browserImage(src: string): Promise<CanvasImageSource> {
    return new Promise((resolve,reject)=>{
      const candidate=new Image();const timeout=setTimeout(()=>reject(new Error(src)),10000);
      candidate.onload=()=>{clearTimeout(timeout);resolve(candidate);};
      candidate.onerror=()=>{clearTimeout(timeout);reject(new Error(src));};candidate.src=src;
    });
  }
  function load(loader: (src:string)=>Promise<CanvasImageSource>=browserImage): Promise<boolean> {
    if(pending)return pending;if(image)return Promise.resolve(true);errors=[];
    pending=Promise.resolve().then(()=>loader(source)).then(loaded=>{
      const size=loaded as {width?:number;height?:number};
      if(size.width!==width||size.height!==height||frames.length!==12)throw new Error('Invalid sprite dimensions');
      image=loaded;pending=null;return true;
    }).catch(()=>{errors=[source];pending=null;return false;});return pending;
  }
  function install(loader:(src:string)=>CanvasImageSource): void {image=loader(source);errors=[];}
  function drawFrame(c:CanvasRenderingContext2D,x:number,feet:number,row:number,column:number,scale:number): boolean {
    if(!image)return false;
    const frame=frames[row*3+column];
    if(!frame)return false;
    c.save();c.imageSmoothingEnabled=false;
    c.drawImage(image,frame.x,frame.y,frame.w,frame.h,Math.round(x-frame.w*scale/2),Math.round(feet-frame.h*scale),frame.w*scale,frame.h*scale);
    c.restore();return true;
  }
  return {load,install,drawFrame,get ready(){return image!==null;},get loading(){return pending!==null;},get errors(){return errors.slice();}};
}
