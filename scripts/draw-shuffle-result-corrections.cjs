// Hand-drawn corrections: no network, API keys or paid generation.
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,Path2D}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),out=path.join(root,'preview/pixellab/results');
const outline='#32271e';
const marks=[];
function shape(d,fill,extra=''){
  marks.push({path:new Path2D(d),fill,extra});return `<path d="${d}" fill="${fill}" ${extra}/>`;
}
function ellipse(x,y,rx,ry,fill,extra=''){
  const path=new Path2D();path.ellipse(x,y,rx,ry,0,0,Math.PI*2);marks.push({path,fill,extra});
  return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
}
const dot=(x,y,r,fill)=>ellipse(x,y,r,r,fill,'stroke="none"');
function pixels(){
  const canvas=createCanvas(128,128),c=canvas.getContext('2d');c.lineCap='round';c.lineJoin='round';
  // Paint solid square pixels directly on a native 64×64 grid; no image filter or smooth rasterizer.
  for(const {path,fill,extra}of marks){
    const stroke=extra.match(/stroke="([^"]+)"/)?.[1]||outline;c.lineWidth=Number(extra.match(/stroke-width="([^"]+)"/)?.[1]||2.5);
    for(let y=0;y<128;y+=2)for(let x=0;x<128;x+=2){
      const border=stroke!=='none'&&c.isPointInStroke(path,x+1,y+1),inside=fill!=='none'&&c.isPointInPath(path,x+1,y+1);
      if(border||inside){c.fillStyle=border?stroke:fill;c.fillRect(x,y,2,2);}
    }
  }
  const rgba=c.getImageData(0,0,128,128).data;
  for(let y=0;y<128;y+=2)for(let x=0;x<128;x+=2)for(const [dx,dy]of [[0,0],[1,0],[0,1],[1,1]]){
    const a=(y*128+x)*4,b=((y+dy)*128+x+dx)*4;
    for(let k=0;k<4;k++)if(rgba[a+k]!==rgba[b+k])throw Error('Non-square pixel');
    if(rgba[b+3]!==0&&rgba[b+3]!==255)throw Error('Antialiased pixel');
  }
  return canvas;
}
function eyes(x,y,sad,iris){
  return [0,19].map(dx=>ellipse(x+dx,y,7,9,'#fff4d7')+ellipse(x+dx+1,y+1,3.5,5,iris,'stroke-width="1.5"')+
    dot(x+dx+2,y+1,2,'#25262c')+dot(x+dx,y-2,1.4,'#fff')+(sad?shape(`M${x+dx-7} ${y-4} Q${x+dx} ${y-7} ${x+dx+7} ${y-1}`,'none','stroke-width="3"'):'')).join('');
}
function fox(sad){
  const y=sad?8:0;
  // Four leg shapes only: two below the shoulders, two below the hips.
  const legs=[
    ['front-far',`M58 ${78+y} L58 101 Q57 107 62 107 L66 107 Q70 105 65 101 L66 ${80+y}`],
    ['rear-far',`M87 ${77+y} L91 98 Q89 103 94 103 L100 103 Q104 101 98 97 L97 ${79+y}`],
    ['rear-near',`M81 ${85+y} Q80 99 84 108 Q79 113 85 114 L94 114 Q99 111 91 108 L92 ${87+y}`],
    ['front-near',`M45 ${80+y} L44 105 Q40 108 41 112 Q47 116 54 113 L52 105 L56 ${82+y}`]
  ];
  let s=shape(sad?'M91 83 Q112 82 119 98 Q122 112 110 114 Q97 115 85 106 L86 91 Z':
    'M88 72 Q95 59 98 40 Q102 24 113 25 Q123 33 121 45 Q118 67 99 81 Z','#c66d31');
  s+=shape(sad?'M112 92 Q123 100 117 110 Q115 113 109 114 L104 108 L110 107 L106 101 Z':
    'M104 27 Q114 22 119 31 Q124 40 120 48 L113 45 L110 49 L106 42 L100 44 Z','#fff0c8');
  for(const [id,d]of legs.slice(0,2))s+=shape(d,'#ad6638',`data-limb="${id}"`);
  s+=ellipse(75,77+y,28,17,'#db8540')+shape(`M54 ${81+y} Q76 ${94+y} 96 ${83+y} Q92 ${97+y} 74 ${97+y} Q61 ${96+y} 54 ${88+y} Z`,'#ffe5b0','stroke="none"');
  for(const [id,d]of legs.slice(2))s+=shape(d,'#db8540',`data-limb="${id}"`);
  s+=shape('M44 105 Q47 108 53 105 L54 112 Q47 115 41 111 Z','#533328','stroke="none"')+
    shape('M84 108 Q88 111 93 109 L96 112 Q90 117 83 112 Z','#533328','stroke="none"');
  s+=shape(`M46 ${49+y} Q64 ${52+y} 65 ${74+y} L55 ${89+y} Q38 ${85+y} 35 ${72+y} Z`,'#e89949');
  s+=shape(sad?'M31 45 Q16 38 17 50 L25 65 L40 60 Z':'M28 41 L25 18 Q37 18 42 36 Z','#dc843c');
  s+=shape(sad?'M60 44 Q70 36 76 43 L67 62 L53 57 Z':'M53 34 Q59 18 71 19 L67 47 Z','#dc843c');
  s+=shape(sad?'M25 48 L20 44 L25 58 L31 57 Z':'M29 33 L29 24 L38 35 Z','#704039','stroke="none"');
  s+=shape(sad?'M63 47 L70 42 L66 56 L61 55 Z':'M58 35 L67 25 L65 42 Z','#704039','stroke="none"');
  s+=shape(`M29 ${42+y} Q43 ${32+y} 57 ${39+y} L67 ${52+y} L72 ${55+y} L66 ${57+y} L70 ${63+y} L62 ${67+y} Q51 ${83+y} 34 ${74+y} L23 ${68+y} L27 ${62+y} L21 ${59+y} L28 ${55+y} Z`,'#e99b4a');
  s+=shape(`M27 ${56+y} Q30 ${52+y} 34 ${55+y} L45 ${62+y} L60 ${56+y} Q69 ${60+y} 63 ${68+y} Q49 ${84+y} 34 ${71+y} L25 ${66+y} Z`,'#fff0c8');
  s+=eyes(36,51+y,sad,'#65a863');
  s+=shape(`M37 ${64+y} Q44 ${59+y} 51 ${64+y} L45 ${69+y} Z`,'#372b28','stroke-width="1.5"');
  s+=shape(sad?`M36 ${73+y} Q43 ${69+y} 52 ${73+y}`:`M34 ${70+y} Q43 ${81+y} 56 ${69+y}`,'none','stroke-width="2"');
  s+=shape(`M47 ${82+y} Q38 ${76+y} 39 ${84+y} L42 ${88+y} L49 ${85+y} L56 ${89+y} Q63 ${84+y} 56 ${81+y} Z`,'#e997b9','stroke-width="2"')+dot(49,84+y,2.5,'#ffe0ed');
  return s;
}
function bird(id,sad){
  const owl=id==='owl',body=owl?'#b87737':'#374358',shade=owl?'#865027':'#263047',light=owl?'#dcaa62':'#60718c',y=sad?6:0;
  let s=shape(`M50 ${87+y} L46 99 L57 96 L65 101 L72 96 L81 99 L77 ${87+y} Z`,shade);
  for(const [side,x]of [['left',49],['right',76]]){
    s+=shape(`M${x} ${87+y} L${x} 108 M${x} 108 L${x-7} 114 M${x} 108 L${x} 115 M${x} 108 L${x+7} 113`,owl?'#e4b45c':'#718092',`data-limb="${side}-leg" stroke="${outline}" stroke-width="4" stroke-linecap="round"`);
  }
  s+=ellipse(63,72+y,25,29,body)+ellipse(63,79+y,17,18,owl?'#ecd2a0':'#475570','stroke="none"');
  const wings=sad?[
    ['left',`M42 ${55+y} Q24 ${65+y} 32 ${89+y} Q35 ${97+y} 44 ${91+y} Q49 ${77+y} 47 ${66+y} Z`],
    ['right',`M83 ${55+y} Q101 ${65+y} 94 ${89+y} Q90 ${97+y} 82 ${91+y} Q77 ${76+y} 79 ${65+y} Z`]
  ]:[
    ['left','M42 56 Q31 50 18 22 Q12 24 13 39 L18 56 Q11 48 11 43 Q9 60 19 70 Q28 79 42 73 L47 65 Z'],
    ['right','M83 56 Q96 50 109 22 Q116 24 114 39 L109 56 Q116 48 117 43 Q120 60 110 70 Q101 79 82 73 L78 65 Z']
  ];
  for(const [side,d]of wings)s+=shape(d,shade,`data-limb="${side}-wing"`);
  s+=shape(sad?`M35 ${75+y} L39 ${87+y} M40 ${73+y} L45 ${84+y} M87 ${75+y} L85 ${87+y} M92 ${76+y} L89 ${88+y}`:
    'M18 35 Q21 55 34 64 M17 56 Q22 67 31 69 M24 38 Q27 54 37 59 M110 35 Q107 55 94 64 M111 56 Q105 67 96 69 M104 38 Q101 54 91 59','none',`stroke="${light}" stroke-width="2"`);
  if(owl)s+=shape(`M39 ${35+y} L36 ${21+y} Q48 ${21+y} 53 ${34+y} M74 ${34+y} Q84 ${21+y} 92 ${22+y} L87 ${38+y}`,body);
  else s+=shape(`M48 ${36+y} Q50 ${24+y} 60 ${26+y} L57 ${20+y} Q75 ${23+y} 77 ${36+y}`,body);
  s+=ellipse(63,47+y,29,24,body);
  if(owl)s+=shape(`M63 ${37+y} Q49 ${23+y} 40 ${36+y} Q34 ${52+y} 46 ${63+y} L63 ${72+y} L81 ${63+y} Q93 ${53+y} 86 ${38+y} Q78 ${27+y} 63 ${37+y} Z`,'#f3dcad','stroke-width="2"');
  else s+=shape(`M44 ${31+y} Q55 ${28+y} 62 ${30+y}`,'none',`stroke="${light}" stroke-width="3"`);
  s+=eyes(53,46+y,sad,owl?'#ddaa45':'#9aabc2');
  s+=shape(`M58 ${60+y} Q63 ${55+y} 69 ${60+y} L64 ${68+y} Z`,owl?'#e5ad44':'#7b8795','stroke-width="2"');
  if(owl){
    for(const [x,dy]of [[52,80],[63,86],[74,80],[56,92],[71,93]])s+=shape(`M${x-1} ${dy+y} L${x+1} ${dy+y+3}`,'none','stroke="#a47744" stroke-width="2"');
  }else s+=shape(`M52 ${77+y} Q63 ${84+y} 76 ${77+y}`,'none','stroke="#667590" stroke-width="2"');
  return s;
}
async function main(){
  fs.mkdirSync(out,{recursive:true});const review=createCanvas(512,320),g=review.getContext('2d');g.fillStyle='#294439';g.fillRect(0,0,512,320);
  for(const [i,id]of ['amanda','crow','owl'].entries())for(const [j,outcome]of ['win','lose'].entries()){
    marks.length=0;const drawing=id==='amanda'?fox(outcome==='lose'):bird(id,outcome==='lose');
    const limbs=[...drawing.matchAll(/data-limb="([^"]+)"/g)].map(m=>m[1]);
    if(limbs.length!==4||new Set(limbs).size!==4)throw Error('Incorrect anatomical limb count: '+id);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><g stroke="${outline}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${drawing}</g></svg>`;
    const file=path.join(out,`enemy-${id}-${outcome}`);fs.writeFileSync(file+'.svg',svg);
    const canvas=pixels();
    fs.writeFileSync(file+'.png',canvas.toBuffer('image/png'));fs.writeFileSync(file+'.png.json',JSON.stringify({provider:'Hand-drawn pixel art',nativeSize:64,pixelScale:2,source:'scripts/draw-shuffle-result-corrections.cjs',limbs},null,2)+'\n');
    const x=i%2*256+j*128,y=Math.floor(i/2)*160;g.drawImage(canvas,x,y);g.fillStyle='#fff1ca';g.font='12px sans-serif';g.fillText(id+' · '+outcome,x+4,y+144);
  }
  fs.writeFileSync(path.join(out,'manual-review.png'),review.toBuffer('image/png'));console.log('Six hand-drawn candidates; four anatomical limbs per animal. No API calls.');
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
