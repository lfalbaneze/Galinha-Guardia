/* Keep open grass clear; butterflies stay near the grazing habitats. */
const FarmScenery = (() => {
  let ready = false;
  const hash = (x, y, seed = 0) => { let n = Math.imul(x ^ seed, 374761393) + Math.imul(y, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967295; };
  function load(loader, makeSurface = FarmSprites.surface) {
    return FarmSprites.loadCohesive(loader, makeSurface).then(loaded => {
      ready = loaded;
      return loaded;
    });
  }
  function showDecoration(d, layout) {
    // Older saved farms also contain loose flowers from the layout generator.
    if(d.type==='flower')return false;
    if(['grass','stone','rock','clover'].includes(d.type))return hash(d.x,d.y,layout.seed||0)>.78;
    return true;
  }
  function drawAir(c,layout,camera,time=0,reduced=false) {
    if(!ready)return;
    c.save();c.translate(-camera.x,-camera.y);
    let i=0;
    for(const p of layout.habitats||[]) {
      if(p.kind!=='flowers')continue;
      if(i++>=2)break;
      if(p.x<camera.x-35||p.y<camera.y-35||p.x>camera.x+c.canvas.width+35||p.y>camera.y+c.canvas.height+35)continue;
      const t=reduced?0:time,x=p.x+Math.sin(t*.65+i)*20,y=p.y-24+Math.cos(t*.8+i)*9;
      const spread=reduced?3:2+Math.abs(Math.sin(t*7+i))*2;
      if(typeof Sunlight!=='undefined')Sunlight.native(c,`butterfly/${i%2}`,
        {x:x-6,y:y-2,w:13,h:7},p.y,out=>{
          out.fillStyle='#fff0cb';out.fillRect(x-5,y-1,5,3);out.fillRect(x+1,y,5,3);out.fillRect(x,y,1,3);
        });
      c.fillStyle=i%2?'#ffdc87':'#fff0cb';c.fillRect(Math.round(x-spread),Math.round(y-1),spread,3);c.fillRect(Math.round(x+1),Math.round(y),spread,3);
      c.fillStyle='#7a6037';c.fillRect(Math.round(x),Math.round(y),1,3);
    }
    c.restore();
  }
  return {load,showDecoration,drawAir,get ready(){return ready;}};
})();
