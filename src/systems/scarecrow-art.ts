/* Generated artwork is kept intact; each pose has an observed body/feet pivot. */
const ScarecrowArt = (() => {
  const frames = [
    {x:87,y:48,w:406,h:472},
    {x:628,y:190,w:281,h:270}, {x:1129,y:231,w:272,h:230},
    {x:96,y:575,w:365,h:337}, {x:568,y:669,w:421,h:253}, {x:1109,y:725,w:352,h:230},
  ];
  const sheet=createWildlifeSheet('assets/sprites/sources/scarecrow-crows.png',1536,1024,frames);
  function pose(c:CanvasRenderingContext2D,index:number,x:number,y:number,scale:number,
    pivotX:number,pivotY:number,flip=false,elevation=0):void {
    const f=frames[index];
    c.save();c.translate(Math.round(x),Math.round(y));if(flip)c.scale(-1,1);
    sheet.drawFrame(c,(f.w/2-pivotX)*scale,(f.h-pivotY)*scale,Math.floor(index/3),index%3,scale,elevation-(f.h-pivotY)*scale);
    c.restore();
  }
  function drawPost(c:CanvasRenderingContext2D,s:Farm.Scarecrow,view:Farm.Camera):void {
    const x=s.x-view.x+(view.shakeX||0),y=s.y-view.y+(view.shakeY||0);
    c.save();c.fillStyle='rgba(44,48,27,.2)';c.beginPath();c.ellipse(x+3,y+2,28,6,0,0,Math.PI*2);c.fill();
    pose(c,0,x,y,108/472,205,472);c.restore();
  }
  function drawCrow(c:CanvasRenderingContext2D,b:Farm.Crow,index:number,clock:number,view:Farm.Camera):void {
    if(b.opacity<=0)return;
    const x=b.x-view.x+(view.shakeX||0),y=b.y-b.z-view.y+(view.shakeY||0);
    c.save();c.globalAlpha*=b.opacity;
    if(b.flying){
      const frame=InterfaceMotion.reduced?1:[0,1,2,1][Math.floor(clock*12+index)%4];
      const pivot=[[220,245],[242,119],[211,60]][frame];
      pose(c,3+frame,x,y-12,.115,pivot[0],pivot[1],b.left,b.z+12);
    }else{
      const looking=InterfaceMotion.reduced?false:Math.sin(clock*.65+index*2)>.7;
      pose(c,looking?2:1,x,y,.105,looking?180:187,looking?230:270,index===2,b.z);
    }
    c.restore();
  }
  return {drawPost,drawCrow,frames,load:sheet.load,install:sheet.install,
    get ready(){return sheet.ready;},get loading(){return sheet.loading;},get errors(){return sheet.errors;}};
})();
