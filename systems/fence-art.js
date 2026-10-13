/* Shared top-down fence kit. All farm fences use the same post and one-axis rails. */
const FenceArt = (() => {
  const makeAsset = (src,width,height) => ({src,width,height,image:null,ready:false});
  const assets={
    post:makeAsset('./assets/farm/fence-post.png',12,32),
    horizontal:makeAsset('./assets/farm/fence-rail-h.png',64,22),
    vertical:makeAsset('./assets/farm/fence-rail-v.png',12,64)
  };
  let pending=null,errors=[];
  const ready=()=>assets.post.ready&&assets.horizontal.ready&&assets.vertical.ready;
  function browserImage(src) {
    return new Promise((resolve,reject)=>{
      const image=new Image();
      image.onload=()=>resolve(image);
      image.onerror=()=>reject(new Error(src));
      image.src=src;
    });
  }
  function load(loader=browserImage) {
    if(pending)return pending;
    if(ready())return Promise.resolve(true);
    errors=[];
    pending=Promise.all(Object.values(assets).map(async asset=>{
      if(asset.ready)return true;
      try {
        const image=await loader(asset.src);
        if(image?.width!==asset.width||image?.height!==asset.height)throw new Error('Invalid fence dimensions');
        asset.image=image;asset.ready=true;return true;
      } catch {errors.push(asset.src);return false;}
    })).then(result=>{pending=null;return result.every(Boolean);});
    return pending;
  }
  function paint(c,asset,x,y,w,h,ground) {
    if(!asset?.ready||!asset.image)return false;
    x=Math.round(x);y=Math.round(y);w=Math.max(1,Math.round(w));h=Math.max(1,Math.round(h));
    c.save();c.imageSmoothingEnabled=false;
    if(ground!==undefined&&typeof Sunlight!=='undefined')Sunlight.cast(c,asset.image,x,y,w,h,Math.round(ground));
    c.drawImage(asset.image,x,y,w,h);
    c.restore();return true;
  }
  function drawPost(c,x,y) {
    return paint(c,assets.post,x-6,y-24,12,32,y+8);
  }
  function drawHorizontal(c,x,y,w,options={}) {
    if(!ready())return false;
    const left=Math.round(x),right=Math.round(x+w);
    const postStart=options.postStart!==false,postEnd=options.postEnd!==false;
    const railLeft=left+(postStart?4:0),railRight=right-(postEnd?4:0);
    paint(c,assets.horizontal,railLeft,y-18,Math.max(1,railRight-railLeft),22,y+8);
    if(postStart)drawPost(c,left,y);
    if(options.postMid)drawPost(c,Math.round((left+right)/2),y);
    if(postEnd)drawPost(c,right,y);
    return true;
  }
  function drawVertical(c,x,y,h,options={}) {
    if(!ready())return false;
    const top=Math.round(y),bottom=Math.round(y+h);
    const postStart=options.postStart!==false,postEnd=options.postEnd!==false;
    const railTop=top-14,railBottom=bottom-14;
    if(typeof Sunlight!=='undefined')Sunlight.rail(c,x,top+8,x,bottom+8,32,4);
    paint(c,assets.vertical,x-6,railTop,12,Math.max(1,railBottom-railTop));
    if(postStart)drawPost(c,x,top);
    if(options.postMid)drawPost(c,x,Math.round((top+bottom)/2));
    if(postEnd)drawPost(c,x,bottom);
    return true;
  }
  return {load,ready,drawPost,drawHorizontal,drawVertical,get loading(){return pending!==null;},get errors(){return errors.slice();}};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FenceArt;
