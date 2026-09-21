const {createCanvas,loadImage}=require('@napi-rs/canvas');
function ranges(counts,min=4){const result=[];let start=-1;for(let i=0;i<=counts.length;i++){
 if(i<counts.length&&counts[i]>=min){if(start<0)start=i;}
 else if(start>=0){if(i-start>=12)result.push([start,i]);start=-1;}}
 return result;
}
async function extract(file, item){
 const image=await loadImage(file);
 const c=createCanvas(image.width,image.height).getContext('2d');c.drawImage(image,0,0);
 const rgba=c.getImageData(0,0,image.width,image.height).data;
 const occupied=(x,y)=>rgba[(y*image.width+x)*4+3]>=80;
 const rowCounts=Array.from({length:image.height},(_,y)=>{let n=0;for(let x=0;x<image.width;x++)if(occupied(x,y))n++;return n;});
 let rows=ranges(rowCounts);
 // Some extremities overlap in the vertical projection. Equal cells still have clear gutters within each column.
 if(rows.length!==item.rows)rows=Array.from({length:item.rows},(_,i)=>[Math.round(i*image.height/item.rows),Math.round((i+1)*image.height/item.rows)]);
 const frames=[];
 for(let row=0;row<rows.length;row++){
  const [y0,y1]=rows[row],counts=Array.from({length:image.width},(_,x)=>{let n=0;for(let y=y0;y<y1;y++)if(occupied(x,y))n++;return n;});
  let cols=ranges(counts);
  if(cols.length!==item.columns){
   // Broad tails and open wings may overlap in x without touching each other.
   // Locate complete silhouettes before resorting to the source's nominal grid.
   const h=y1-y0,w=image.width,visited=new Uint8Array(w*h),queue=new Int32Array(w*h),bodies=[];
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const start=y*w+x;if(visited[start]||!occupied(x,y+y0))continue;
    let begin=0,end=1,l=x,r=x+1;queue[0]=start;visited[start]=1;
    while(begin<end){const p=queue[begin++],px=p%w,py=Math.floor(p/w);l=Math.min(l,px);r=Math.max(r,px+1);
     for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=px+dx,ny=py+dy,n=ny*w+nx;
      if(nx<0||ny<0||nx>=w||ny>=h||visited[n]||!occupied(nx,ny+y0))continue;visited[n]=1;queue[end++]=n;
     }
    }if(end>=200)bodies.push({l,r,pixels:end});
   }
   if(bodies.length>=item.columns)cols=bodies.sort((a,b)=>b.pixels-a.pixels).slice(0,item.columns).sort((a,b)=>a.l-b.l).map(b=>[b.l,b.r]);
   else throw Error(`Cannot isolate ${item.columns} complete silhouettes in ${item.name}, row ${row+1}`);
  }
  for(const [x0,x1] of cols){let l=x1,t=y1,r=x0,b=y0,pixels=0;
   // Extract the character component, excluding a neighbour's nose/tail that
   // sometimes crosses the source grid. Originals remain unmodified.
   const cw=x1-x0,ch=y1-y0,seen=new Uint8Array(cw*ch),queue=new Int32Array(cw*ch);let body=[];
   for(let sy=0;sy<ch;sy++)for(let sx=0;sx<cw;sx++){
    const start=sy*cw+sx;if(seen[start]||!occupied(x0+sx,y0+sy))continue;
    let begin=0,end=1;queue[0]=start;seen[start]=1;
    while(begin<end){const p=queue[begin++],px=p%cw,py=Math.floor(p/cw);
     for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=px+dx,ny=py+dy,n=ny*cw+nx;
      if(nx<0||ny<0||nx>=cw||ny>=ch||seen[n]||!occupied(x0+nx,y0+ny))continue;seen[n]=1;queue[end++]=n;
     }
    }
    if(end>body.length)body=queue.slice(0,end);
   }
   const mask=new Uint8Array(cw*ch);
   for(const p of body){const x=x0+p%cw,y=y0+Math.floor(p/cw);mask[p]=1;l=Math.min(l,x);r=Math.max(r,x+1);t=Math.min(t,y);b=Math.max(b,y+1);pixels++;}
   if(pixels<200)throw Error(`Empty sprite ${item.name}/${frames.length}`);
   if(l<2||t<2||r>image.width-2||b>image.height-2)throw Error(`Clipped silhouette ${item.name}/${frames.length}`);
   // The torso, not the swinging foot or tail tip, defines the horizontal pivot.
   let mass=0,moment=0;
   for(let y=Math.round(t+(b-t)*.18);y<t+(b-t)*.64;y++)for(let x=l;x<r;x++)if(mask[(y-y0)*cw+x-x0]){mass++;moment+=x-l;}
   const cut=createCanvas(r-l,b-t),cutContext=cut.getContext('2d'),cutPixels=cutContext.createImageData(r-l,b-t);
   for(let y=t;y<b;y++)for(let x=l;x<r;x++)if(mask[(y-y0)*cw+x-x0]){
    const dest=((y-t)*(r-l)+x-l)*4,src=(y*image.width+x)*4;
    for(let k=0;k<3;k++)cutPixels.data[dest+k]=rgba[src+k];
    cutPixels.data[dest+3]=Math.min(255,Math.round(rgba[src+3]*255/245));
   }
   cutContext.putImageData(cutPixels,0,0);
   frames.push({x:l,y:t,w:r-l,h:b-t,b,cx:mass?moment/mass:(r-l)/2,cut});
  }
 }
 return frames;
}
module.exports={extract};
