const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),sandbox=vm.createContext({SpriteData:{}});vm.runInContext(fs.readFileSync(path.join(root,'systems/premium-art-data.js'),'utf8'),sandbox);const data=vm.runInContext('PremiumArtData',sandbox);
(async()=>{for(const [name,d]of Object.entries(data)){
 const img=await loadImage(path.join(root,d.source)),c=createCanvas(img.width,img.height).getContext('2d');c.drawImage(img,0,0);const p=c.getImageData(0,0,img.width,img.height).data;let alpha=0;const rows=new Set();
 for(let i=3;i<p.length;i+=4)if(p[i]>0&&p[i]<255){alpha++;rows.add(Math.floor(Math.floor(i/4/img.width)/(img.height/8)));}
 const src=await loadImage(path.join(root,'assets/sprites/cartoon-104/raw',name+'.png')),s=createCanvas(src.width,src.height).getContext('2d');s.drawImage(src,0,0);const raw=s.getImageData(0,0,src.width,src.height).data;
 let edge=0;for(let y=0;y<src.height;y++)for(const x of [0,src.width-1])if(raw[(y*src.width+x)*4+3]>=160)edge++;
 console.log(JSON.stringify({name,alpha,rows:[...rows],edge,heights:['down','right','up','left'].map(dir=>d.poses[dir].frames[0].h),bytes:fs.statSync(path.join(root,d.source)).size}));
}})();
