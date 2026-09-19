const test=require('node:test'),assert=require('node:assert/strict');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {createGame}=require('./helpers.cjs');

const sizes={trough:[74,30],shelter:[164,107],hay:[74,58],fence:[78,40],barn:[206,195],
  coop:[136,150],silo:[74,174],tree:[160,182],bush:[108,66],pear:[148,182],willow:[160,166],
  bramble:[108,60],nursery:[242,114]};
for(const mode of ['legacy','cohesive'])test(`${mode}: opaque bases touch the ground and every shadow pixel stays attached`,async()=>{
  const game=createGame(()=>.5),art=game.run('FarmSprites');let surfaces=0;
  const make=(w,h)=>{surfaces++;return createCanvas(w,h);};
  await art.load(loadImage,make);await art.loadProps(loadImage,make);await art.loadHabitats(loadImage,make);
  await art.loadNursery(loadImage,make);
  if(mode==='cohesive')await art.loadCohesive(loadImage,make);
  for(const [name,[w,h]] of Object.entries(sizes))for(const flip of [false,true]) {
    const plain=createCanvas(280,240).getContext('2d'),shaded=createCanvas(280,240).getContext('2d');
    const options={grounded:true,flip},x=15.3,y=220.4-h;
    art.draw(plain,name,x,y,w,h,options);
    shaded.fillStyle='#123456';shaded.imageSmoothingEnabled=true;
    art.draw(shaded,name,x,y,w,h,{...options,shadow:true});
    assert.equal(shaded.fillStyle,'#123456');assert.equal(shaded.imageSmoothingEnabled,true);
    assert.equal(shaded.getTransform().e,0);assert.equal(shaded.getTransform().a,1);
    const a=plain.getImageData(0,0,280,240).data,b=shaded.getImageData(0,0,280,240).data;
    let last=-1,extra=0;
    for(let yy=0;yy<240;yy++)for(let xx=0;xx<280;xx++) {
      const i=(yy*280+xx)*4;
      if(a[i+3]){last=Math.max(last,yy);assert.deepEqual(b.slice(i,i+4),a.slice(i,i+4),name+' preserves art');}
      else if(b[i+3]) {
        extra++;let near=false;
        for(let dy=-2;dy<=0;dy++)for(let dx=-1;dx<=1;dx++) {
          const nx=xx+dx,ny=yy+dy;
          if(nx>=0&&nx<280&&ny>=0&&a[(ny*280+nx)*4+3])near=true;
        }
        assert.ok(near,`${mode}/${name} detached shadow at ${xx},${yy}`);
      }
    }
    assert.equal(last,219,name+' last opaque row, without transparent padding');
    assert.ok(extra>0,name+' visible contact shadow');
    const before=surfaces;art.draw(shaded,name,x,y,w,h,{...options,shadow:true});
    assert.equal(surfaces,before,name+' cached contact mask');
    if(name==='trough'||name==='coop') {
      // No ellipse is allowed in the air below the suspended middle of the bowl.
      const center=Math.round(x+w*(name==='coop'?.54:.5));let edge=-1;
      for(let yy=0;yy<240;yy++)if(a[(yy*280+center)*4+3])edge=yy;
      for(let yy=edge+1;yy<240;yy++)assert.equal(b[(yy*280+center)*4+3],0,name+' suspended middle stays clear');
    }
  }
});

test('the raised coop has a separate ground support under all three posts and the ramp',async()=>{
  const h=createGame(()=>.5),art=h.run('FarmSprites');await art.loadCohesive(loadImage,createCanvas);
  for(const [w,height]of [[96,106],[136,150],[155,170]])for(const flip of [false,true]) {
    const plain=createCanvas(220,220).getContext('2d'),supported=createCanvas(220,220).getContext('2d');
    art.draw(plain,'coop',20,20,w,height,{grounded:true,flip});
    art.draw(supported,'coop',20,20,w,height,{grounded:true,shadow:true,foundation:true,flip});
    const a=plain.getImageData(0,0,220,220).data,b=supported.getImageData(0,0,220,220).data;
    for(let i=0;i<a.length;i+=4)if(a[i+3])assert.deepEqual(b.slice(i,i+4),a.slice(i,i+4),'the house itself stays in place');
    for(const point of [.105,.28,.665,.86]) {
      const local=Math.floor(w*point),x=20+(flip?w-1-local:local);let sole=-1;
      for(let y=0;y<220;y++)if(a[(y*220+x)*4+3])sole=y;
      assert.ok(sole>20+height*.7,'sample is at a foot, not the roof');
      assert.ok(b[((sole+1)*220+x)*4+3]>0,`support touches ${point} at size ${w}, flip ${flip}`);
      assert.ok(b[((sole+2)*220+x)*4+3]>0,'ground is visible immediately below the support');
    }
  }
});

test('production prop rendering uses contact masks and does not mutate world geometry',async()=>{
  const canvas=createCanvas(900,520),game=createGame(()=>.5,{drawingContext:canvas.getContext('2d')});
  const art=game.run('FarmSprites');await art.loadCohesive(loadImage,createCanvas);
  const snapshot=()=>game.run('JSON.stringify([WORLD.layout,OBSTACLES,HidingSpots.getSpots()])');
  const before=snapshot();
  const c=canvas.getContext('2d');let ellipses=0;const ellipse=c.ellipse.bind(c);
  c.ellipse=(...args)=>{ellipses++;ellipse(...args);};
  for(const type of ['trough','stable','hay','tree','bush','barn','coop','silo']) {
    game.run('FarmArt').drawProp(c,{type,x:100,y:150,w:90,h:45},{x:0,y:0,shakeX:0,shakeY:0});
  }
  assert.equal(ellipses,0,'no generic bounding-box ovals');assert.equal(snapshot(),before);
});

test('horizontal and vertical paddock posts meet the same ground line',async()=>{
  const game=createGame(()=>.5),art=game.run('FarmSprites');await art.loadCohesive(loadImage,createCanvas);
  for(const p of [{type:'paddock-fence',x:30,y:80,w:70,h:8},{type:'paddock-fence',x:30,y:48,w:8,h:32}]) {
    const c=createCanvas(140,130).getContext('2d');game.run('FarmArt').drawProp(c,p,{x:0,y:0,shakeX:0,shakeY:0});
    const data=c.getImageData(0,0,140,130).data;let base=-1;
    for(let y=0;y<130;y++)for(let x=0;x<140;x++)if(data[(y*140+x)*4+3]===255)base=Math.max(base,y);
    assert.equal(base,83,'both kinds of post end at y + 4');
  }
});
