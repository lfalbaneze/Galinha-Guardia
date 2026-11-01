const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
test('wood signs fill wide and short CSS viewports instead of shrinking between their rope attachments',async()=>{
  for(const [file,sizes]of [['farm-sign.svg',[[255,36],[360,72],[980,100]]],['menu-plank.svg',[[204,80]]]]){
    const source=fs.readFileSync('assets/ui/'+file,'utf8');
    const raster=await loadImage('assets/ui/'+file.replace('.svg','.png'));
    for(const [width,height]of sizes){
      const svg=source.replace(/width="\d+" height="\d+"/,`width="${width}" height="${height}"`);
      const image=await loadImage(Buffer.from(svg)),c=createCanvas(width,height).getContext('2d');
      c.drawImage(image,0,0);const data=c.getImageData(0,0,width,height).data;let left=width,right=0;
      for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x);}
      assert.ok(left<width*.06&&right>width*.94,`${file} fills ${width}x${height}`);
      if(width===255)for(const x of [24,231])assert.ok(data[(7*width+x)*4+3]>0,'ropes meet real wood at both corners');
      c.clearRect(0,0,width,height);c.drawImage(raster,0,0,width,height);
      for(const x of [Math.ceil(width*.06),Math.floor(width*.94)])assert.ok(c.getImageData(x,Math.floor(height/2),1,1).data[3]>0,'published raster fills the header behind its text');
    }
  }
});
