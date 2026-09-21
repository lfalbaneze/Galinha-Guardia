// Shared pixel assertions: usable in a browser and in the native Canvas test.
function checkGroundShadowLayer(createCanvas, Sunlight) {
  let allocations=0;
  Sunlight.install((w,h)=>{allocations++;return createCanvas(w,h);});
  const canvas=createCanvas(100,100),c=canvas.getContext('2d');
  const pixel=(x,y)=>Array.from(c.getImageData(x,y,1,1).data);
  const requireValue=(ok,message)=>{if(!ok)throw new Error(message);};
  const floor=()=>{c.fillStyle='#ffffff';c.fillRect(0,0,canvas.width,canvas.height);};
  floor();Sunlight.begin(0);requireValue(Sunlight.beginLayer(c),'ground layer did not start');
  // A later shadow must never tint an earlier character or a foreground prop.
  c.fillStyle='#0000ff';c.fillRect(45,45,10,10);
  Sunlight.contact(c,50,50,20,10,.4);Sunlight.end();
  requireValue(pixel(50,50).join(',')==='0,0,255,255','shadow painted over the body');
  requireValue(pixel(1,1).join(',')==='255,255,255,255','floor was erased');
  const shaded=pixel(35,50);
  requireValue(shaded[0]<240&&shaded[3]===255,'shadow is not projected onto the floor');
  const firstAllocations=allocations;
  floor();Sunlight.begin(10);Sunlight.beginLayer(c);Sunlight.end();
  requireValue(allocations===firstAllocations,'same-size frame reallocated layer canvases');
  requireValue(pixel(35,50).join(',')==='255,255,255,255','old shadows left trails');
  canvas.width=140;canvas.height=80;floor();Sunlight.begin(20);Sunlight.beginLayer(c);
  c.translate(10,5);Sunlight.contact(c,110,60,8,4,.5);Sunlight.end();
  requireValue(pixel(120,65)[0]<240,'resized layer lost the current drawing transform');
  requireValue(pixel(139,79)[3]===255,'resized floor was clipped');
  requireValue(c.getTransform().e===10&&c.getTransform().f===5,'composition changed the actor transform');
  requireValue(allocations===firstAllocations+2,'resize did not replace exactly two layer surfaces');
  Sunlight.end();requireValue(!Sunlight.inspect().groundLayer,'layer was not closed');
  return {checks:9,allocations};
}
if(typeof module!=='undefined')module.exports={checkGroundShadowLayer};
