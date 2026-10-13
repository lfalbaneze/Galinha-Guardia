const fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),out=path.join(root,'assets/shuffle');
async function main(){
  fs.mkdirSync(out,{recursive:true});
  const powers=path.join(root,'preview/pixellab/chaos-powers-padded.png');
  const image=await loadImage(powers);if(image.width!==256||image.height!==128)throw Error('Invalid power atlas');
  fs.copyFileSync(powers,path.join(out,'chaos-powers.png'));
  const source=await loadImage(path.join(root,'preview/pixellab/chaos-scenery.png'));
  const sheet=createCanvas(192,96),g=sheet.getContext('2d');g.imageSmoothingEnabled=false;
  const regions=[[0,0,72,96],[72,0,56,96],[128,0,64,96]];
  for(const [i,[sx,sy,w,h]]of regions.entries()){
    const cell=createCanvas(w,h),c=cell.getContext('2d');c.drawImage(source,sx,sy,w,h,0,0,w,h);
    const px=c.getImageData(0,0,w,h).data;let left=w,top=h,right=0,bottom=0;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(px[(y*w+x)*4+3]){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
    if(left===0||top===0||right===w-1||bottom===h-1)throw Error('Clipped scenery '+i);
    const iw=right-left+1,ih=bottom-top+1,scale=Math.min(1,52/iw,80/ih),dw=Math.round(iw*scale),dh=Math.round(ih*scale);
    g.drawImage(cell,left,top,iw,ih,i*64+Math.floor((64-dw)/2),88-dh,dw,dh);
  }
  fs.writeFileSync(path.join(out,'chaos-scenery.png'),sheet.toBuffer('image/png'));
  for(const id of ['powers-padded','scenery'])fs.copyFileSync(path.join(root,'preview/pixellab','chaos-'+id+'.json'),path.join(out,id==='powers-padded'?'chaos-powers.json':'chaos-scenery.json'));
  console.log('Installed reviewed PixelLab power and scenery sheets; scenery grounded at pixel 88.');
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
