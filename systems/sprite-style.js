/* One world pixel grid for every sheet. Original PNGs and their alpha stay intact. */
const SpriteStyle = (() => {
  let cache = new WeakMap(), makeSurface = (w,h) => {
    if(typeof document==='undefined'||!document.createElement)return null;
    const c=document.createElement('canvas');c.width=w;c.height=h;return c;
  };
  function install(maker) { makeSurface=maker;cache=new WeakMap();if(typeof Sunlight!=='undefined')Sunlight.install(maker); }
  function tile(image, rect, width, height) {
    width=Math.max(1,Math.round(width));height=Math.max(1,Math.round(height));
    const key=[...rect,width,height].join('/');
    const saved=cache.get(image);if(saved?.has(key))return saved.get(key);
    const [x,y,w,h]=rect;
    let sample=makeSurface(w,h);if(!sample)return null;
    sample.getContext('2d').drawImage(image,x,y,w,h,0,0,w,h);
    // A single large reduction loses eyes and aliases fine texture into speckles.
    while(sample.width>width*2&&sample.height>height*2) {
      const next=makeSurface(Math.ceil(sample.width/2),Math.ceil(sample.height/2));
      const c=next.getContext('2d');c.imageSmoothingEnabled=true;
      c.drawImage(sample,0,0,next.width,next.height);sample=next;
    }
    const result=makeSurface(width,height),c=result.getContext('2d');
    c.imageSmoothingEnabled=true;c.drawImage(sample,0,0,width,height);
    try {
      const pixels=c.getImageData(0,0,width,height),data=pixels.data;
      for(let i=0;i<data.length;i+=4) {
        // Crisp cutouts, with the same modest color precision for fur, leaves and timber.
        data[i+3]=data[i+3]<112?0:255;
        if(data[i+3])for(let j=0;j<3;j++)data[i+j]=Math.min(255,Math.round(data[i+j]/8)*8);
      }
      c.putImageData(pixels,0,0);
    } catch(error) {
      // Some browsers block pixel reads from file:// sheets. The staged reduction
      // still draws safely, so opening index.html directly never breaks gameplay.
      if(error.name!=='SecurityError')throw error;
    }
    const entries=saved||new Map();if(entries.size>=128)entries.delete(entries.keys().next().value);
    entries.set(key,result);cache.set(image,entries);return result;
  }
  return {tile,install};
})();
