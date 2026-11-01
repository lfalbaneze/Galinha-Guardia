/* A visit in presentation space: Thor never changes the saved farm. */
const MenuThor = (() => {
  const bush={x:978,y:548,w:190,h:110};
  const leaves=[[1015,568],[1035,550],[1060,552],[1082,556],[1098,579],[1104,599],
    [1117,578],[1135,569],[1154,586],[1164,619],[1148,638],[1024,639],
    [1002,648],[975,651],[963,643],[963,632],[975,621],[998,619],[998,594]];
  const clamp=x=>Math.max(0,Math.min(1,x)),mix=(a,b,t)=>a+(b-a)*t;
  const ease=x=>{const t=clamp(x);return t*t*(3-2*t);};
  let button,overlay,glass,peekCanvas,peek,status,allowed,currentGame,layout,visit=null;
  function initialize(canStart){
    if(button)return;
    allowed=canStart;button=document.getElementById('menuThorBush');
    overlay=document.getElementById('menuThorCloseup');glass=overlay.getContext('2d');
    peekCanvas=document.getElementById('menuThorHidden');peek=peekCanvas.getContext('2d');
    status=document.getElementById('menuThorStatus');
    button.addEventListener('click',()=>{
      if(!layout||button.hidden||visit||!allowed())return;
      visit={age:0,anim:0,last:route(0)};
      status.textContent='Thor saiu da moita para te dar uma lambida!';
      AudioSystem.playMenuAnimal(currentGame,'dog');AudioControls.update(currentGame);
    });
  }
  function route(t){
    // Leave sideways above the rocks, then turn around their left edge.
    const exit=t<.36,p=exit?[[1015,628],[997,628],[965,604],[938,630]]:[[938,630],[875,707],[1050,816],[1050,940]];
    const v=exit?t/.36:(t-.36)/.64,u=1-v;
    return {x:u*u*u*p[0][0]+3*u*u*v*p[1][0]+3*u*v*v*p[2][0]+v*v*v*p[3][0],
      y:u*u*u*p[0][1]+3*u*u*v*p[1][1]+3*u*v*v*p[2][1]+v*v*v*p[3][1]};
  }
  function pose(){
    const age=visit.age;
    const returning=age>=5.35;
    const t=returning?1-clamp((age-5.35)/2.2):clamp(age/2.2);
    const p=route(t),ahead=route(clamp(t+(returning?-.005:.005)));
    const view=layout.view,size=view.scale*(.8+(p.y-640)/600)*1.22;
    const camera=returning?0:age<3?ease((age-2.2)/.8):age<4.6?1:1-ease((age-4.6)/.75);
    const moving=age<2.2||returning;
    const direction=CharacterArt.directionFor('down',ahead.x-p.x,ahead.y-p.y);
    return {world:p,x:view.x+p.x*view.scale,feet:view.y+p.y*view.scale,size,camera,moving,direction};
  }
  function cancel(){
    visit=null;
    if(overlay){overlay.hidden=true;glass?.clearRect(0,0,overlay.width,overlay.height);}
  }
  function frame(game,dt,active,reduced,nextLayout){
    currentGame=game;
    if(!active){if(button)button.hidden=true;if(peekCanvas)peekCanvas.hidden=true;cancel();layout=null;return;}
    layout={...nextLayout,reduced};
    const {view,width,height,pixelRatio}=layout;
    const x=view.x+bush.x*view.scale,y=view.y+bush.y*view.scale;
    const visible=x<width&&x+bush.w*view.scale>0&&y<height&&y+bush.h*view.scale>0;
    button.hidden=!visible;button.disabled=!!visit;
    button.style.left=x+'px';button.style.top=y+'px';
    button.style.width=bush.w*view.scale+'px';button.style.height=bush.h*view.scale+'px';
    const pw=Math.round(width*pixelRatio),ph=Math.round(height*pixelRatio);
    if(overlay.width!==pw||overlay.height!==ph){overlay.width=pw;overlay.height=ph;}
    if(peekCanvas.width!==pw||peekCanvas.height!==ph){peekCanvas.width=pw;peekCanvas.height=ph;}
    peek.setTransform(pixelRatio,0,0,pixelRatio,0,0);peek.clearRect(0,0,width,height);
    peekCanvas.hidden=!visible||!!visit;
    if(!visit){
      overlay.hidden=true;
      if(visible){
        peek.save();maskBush(peek);
        const size=view.scale*(.8+(628-640)/600)*1.22;
        CharacterArt.draw(peek,'thor',view.x+1015*view.scale,view.y+628*view.scale-14*size,
          {scale:size,direction:'downleft',mood:'happy',moving:false,shadow:false,subpixel:true});
        peek.restore();
      }
      return;
    }
    visit.age+=Math.max(0,Math.min(.1,dt));
    if(visit.age>=(reduced?3:7.55)){cancel();status.textContent='Thor voltou para a moita.';return;}
    const p=pose(),distance=Math.hypot(p.world.x-visit.last.x,p.world.y-visit.last.y);
    if(!reduced)visit.anim=CharacterArt.advance(visit.anim,'thor',distance,{speed:dt>0?distance/dt:0});
    visit.last=p.world;
    drawCloseup(p);
  }
  function maskBush(c){
    const {view,width,height}=layout;
    // Leaves and foreground rocks occlude Thor until he clears their left edge.
    c.beginPath();c.rect(0,0,width,height);
    leaves.forEach(([x,y],i)=>c[i?'lineTo':'moveTo'](view.x+x*view.scale,view.y+y*view.scale));
    c.closePath();c.clip('evenodd');
  }
  function drawWorld(c){
    if(!visit||!layout||layout.reduced)return;
    const p=pose();if(p.camera>0)return;
    c.save();maskBush(c);
    CharacterArt.draw(c,'thor',p.x,p.feet-14*p.size,{scale:p.size,direction:p.direction,
      moving:p.moving,sprinting:p.moving,anim:visit.anim,mood:p.moving?'normal':'happy',shadow:false,subpixel:true});
    c.restore();
  }
  function closeDog(p){
    const {width,height,reduced}=layout;
    const f=CharacterArt.frameFor('thor',{direction:'down',mood:'happy',moving:true,anim:1.51});
    const ink=f.frame.grounding,natural=(ink.bottom-ink.top)*f.frame.h*f.scale;
    const big=Math.min(height*1.1,width*.9)/natural;
    const wantedX=width*(width>height ? .64 : .5),wantedY=height*.64;
    // Pink tongue in the authored front/happy frame: atlas pixels (44.5, 37).
    const mx=(44.5-f.frame.cx)*f.scale,my=(37-ink.bottom*f.frame.h)*f.scale;
    const target={x:wantedX-mx*big,feet:wantedY-my*big,size:big};
    const amount=reduced?1:p.camera;
    const dog=reduced?{x:width*.65,feet:height*.84,size:Math.min(height*.55,width*.75)/natural}:
      {x:mix(p.x,target.x,amount),feet:mix(p.feet,target.feet,amount),size:mix(p.size,target.size,amount)};
    return {...dog,mouth:{x:dog.x+mx*dog.size,y:dog.feet+my*dog.size},base:4*f.scale*dog.size};
  }
  function tongue(c,dog,progress){
    const extension=Math.sin(Math.PI*clamp(progress));if(extension<=.001)return;
    const {width,height}=layout,m=dog.mouth,base=Math.max(8,dog.base);
    const unit=Math.max(2,dog.size),rows=Math.max(2,Math.round(height*.4*extension/unit));
    const wide=(base+Math.min(width,height)*.13*extension)/unit;
    const tx=m.x-width*.045*extension,bottom=m.y+unit;
    // Share the magnified sprite's pixel size; no antialiased curves.
    for(let row=0;row<=rows;row++){
      const t=row/rows,center=Math.round((mix(tx,m.x,ease(t))-m.x)/unit);
      const half=t<.2?wide*.5*Math.sqrt(Math.max(0,1-Math.pow(1-t/.2,2))):mix(wide*.5,base/unit*.5,ease((t-.2)/.8));
      for(let col=-Math.ceil(half);col<=Math.ceil(half);col++){
        if(Math.abs(col)>half)continue;
        const edge=Math.abs(col)>half-1||row===0||row===rows;
        c.fillStyle=edge?'#873d54':Math.abs(col)<.6&&t>.24?'#b75571':col<0&&col<-half+2&&t<.4?'#f3b0bf':'#dd7992';
        const x=Math.round(m.x+(center+col-.5)*unit),right=Math.round(m.x+(center+col+.5)*unit);
        const y=Math.round(bottom-(rows-row)*unit),end=Math.round(bottom-(rows-row-1)*unit);
        c.fillRect(x,y,right-x,end-y);
      }
    }
  }
  function drawCloseup(p){
    const {width,height,pixelRatio,reduced}=layout,age=visit.age;
    const wet=reduced ? .12 : age>=3.55?clamp((6.15-age)/1.65)*.22:0;
    overlay.hidden=!(reduced||p.camera>0||wet>0);
    glass.setTransform(pixelRatio,0,0,pixelRatio,0,0);glass.clearRect(0,0,width,height);
    if(overlay.hidden)return;
    if(reduced||p.camera>0){
      const dog=closeDog(p);
      CharacterArt.draw(glass,'thor',dog.x,dog.feet-14*dog.size,{scale:dog.size,direction:'down',
        mood:'happy',moving:true,anim:1.51,shadow:false,subpixel:true});
      tongue(glass,dog,reduced ? .5 : (age-3.1)/.95);
    }
    if(wet>0){
      glass.save();glass.globalAlpha=wet;glass.fillStyle='#ecf9ee';
      const unit=Math.max(3,Math.round(Math.min(width,height)/70));
      for(let i=0;i<3;i++){
        for(let row=0;row<17;row++){
          const x=width*(.54+i*.045)+Math.sin(row*.4)*width*.025,y=height*(.22+row*.034);
          glass.fillRect(Math.round(x/unit)*unit,Math.round(y/unit)*unit,unit*(row>12?1:2+i),unit*2);
        }
      }
      glass.restore();
    }
  }
  return {initialize,frame,drawWorld,get busy(){return !!visit;},
    get depth(){return visit&&layout&&!layout.reduced&&pose().camera===0?pose().world.y:Infinity;}};
})();
