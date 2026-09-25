/* Shared top-down fence kit. All farm fences use the same post and one-axis rails. */
const FenceArt = (() => {
  const makeAsset = src => {
    const asset={image:null,ready:false};
    if(typeof Image==='undefined')return asset;
    const image=new Image();
    image.onload=()=>{asset.ready=true;};
    image.onerror=()=>{asset.ready=false;};
    asset.image=image;image.src=src;return asset;
  };
  const assets={
    post:makeAsset('./assets/farm/fence-post.png'),
    horizontal:makeAsset('./assets/farm/fence-rail-h.png'),
    vertical:makeAsset('./assets/farm/fence-rail-v.png')
  };
  const ready=()=>assets.post.ready&&assets.horizontal.ready&&assets.vertical.ready;
  function paint(c,asset,x,y,w,h) {
    if(!asset?.ready||!asset.image)return false;
    c.save();c.imageSmoothingEnabled=false;
    c.drawImage(asset.image,Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));
    c.restore();return true;
  }
  function drawPost(c,x,y) {
    return paint(c,assets.post,x-6,y-24,12,32);
  }
  function drawHorizontal(c,x,y,w,options={}) {
    if(!ready())return false;
    const left=Math.round(x),right=Math.round(x+w);
    const postStart=options.postStart!==false,postEnd=options.postEnd!==false;
    const railLeft=left+(postStart?4:0),railRight=right-(postEnd?4:0);
    paint(c,assets.horizontal,railLeft,y-18,Math.max(1,railRight-railLeft),22);
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
    paint(c,assets.vertical,x-6,railTop,12,Math.max(1,railBottom-railTop));
    if(postStart)drawPost(c,x,top);
    if(options.postMid)drawPost(c,x,Math.round((top+bottom)/2));
    if(postEnd)drawPost(c,x,bottom);
    return true;
  }
  return {ready,drawPost,drawHorizontal,drawVertical};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FenceArt;
