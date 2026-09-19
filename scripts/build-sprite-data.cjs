// Generate frame coordinates only: artists' PNGs are shipped intact with credits.
const fs = require('node:fs'), path = require('node:path');
const { loadImage, createCanvas } = require('@napi-rs/canvas');
const root = path.resolve(__dirname, '..'), source = 'assets/sprites/sources/', images = new Map();
function pixels(file) {
  return images.get(file);
}
function pose(files, width, height, row, columns, flip = false) {
  let left = width, top = height, right = 0, bottom = 0;
  const frames = columns.map((column, index) => {
    const file = Array.isArray(files) ? files[index] : files;
    const { image, data } = pixels(file), x = column * width, y = row * height;
    if (x + width > image.width || y + height > image.height) throw Error(`Invalid frame: ${file}`);
    for (let py = 0; py < height; py++) for (let px = 0; px < width; px++) {
      if (data[((y + py) * image.width + x + px) * 4 + 3] > 0) {
        left = Math.min(left, px); right = Math.max(right, px + 1);
        top = Math.min(top, py); bottom = Math.max(bottom, py + 1);
      }
    }
    return { src: source + file, x, y, w: width, h: height };
  });
  if (bottom <= top) throw Error('Empty sprite pose');
  return { frames, cx: (left + right) / 2, bottom, top, width: right - left, flip };
}
function sheet(file, w, h, rows, columns, scale) {
  return { scale, poses: Object.fromEntries(Object.entries(rows).map(([direction, row]) =>
    [direction, pose(file, w, h, row, columns)])) };
}
function fierceWolf() {
  return rescueAnimal('wolf',90,'wolf-expressivo.png',{columns:4,width:96,gutter:2});
}
function panto() {
  const sprite=rescueAnimal('panto',64,'panto-v2.png');
  // The third source pose is a honk. Ordinary CharacterArt walking uses only idle/step.
  for(const pose of Object.values(sprite.poses))pose.frames=pose.frames.slice(0,2);
  return sprite;
}
function rescueAnimal(name, displayHeight, file = `rescue-${name}.png`, options = {}) {
  // Read the real alpha gutters, including the wolf's four distinct walk frames.
  // Individual bounds keep differences in transparent margins from moving the feet.
  const {image,data}=pixels(file);
  function bands(horizontal,start,end) {
    const length=horizontal?image.width:image.height,counts=new Uint32Array(length);
    for(let a=0;a<length;a++)for(let b=start;b<end;b++) {
      const x=horizontal?a:b,y=horizontal?b:a;
      if(data[(y*image.width+x)*4+3]>48)counts[a]++;
    }
    const spans=[];
    for(let i=0;i<length;i++)if(counts[i]>=3) {
      const previous=spans[spans.length-1];
      if(previous&&i-previous[1]<=(options.gutter??12))previous[1]=i+1;
      else spans.push([i,i+1]);
    }
    return spans.filter(([a,b])=>b-a>30);
  }
  // Use the real transparent gutters: tails and ears need not line up exactly
  // with equal-width cells in a generated sheet.
  const rows=bands(false,0,image.width);
  if(rows.length!==4)throw Error(`Expected four directional rows: ${name} (${rows.length})`);
  const poses={};
  for(const [row,direction] of ['down','right','up','left'].entries()) {
    const [y,end]=rows[row],h=end-y,columns=bands(true,y,end);
    const frameCount=options.columns||3;
    if(columns.length!==frameCount)throw Error(`Expected ${frameCount} walk frames: ${name}/${direction} (${columns.length})`);
    const frames=[];
    for(let column=0;column<frameCount;column++) {
      const [x,rightEdge]=columns[column],w=rightEdge-x;
      let left=w,top=h,right=0,bottom=0;
      for(let py=0;py<h;py++)for(let px=0;px<w;px++) {
        if(data[((y+py)*image.width+x+px)*4+3]>48) {
          left=Math.min(left,px);right=Math.max(right,px+1);
          top=Math.min(top,py);bottom=Math.max(bottom,py+1);
        }
      }
      if(bottom<=top||x+left<2||x+right>image.width-2||y+top<2||y+bottom>image.height-2)
        throw Error(`Clipped or empty rescue frame: ${name}/${direction}/${column}`);
      // Crop source rectangles only; retain the generated PNG and its alpha.
      frames.push({src:source+file,x:x+left,y:y+top,w:right-left,h:bottom-top,
        cx:(right-left)/2,bottom:bottom-top,top:0,width:right-left});
    }
    poses[direction]={frames:frameCount===4?frames:[frames[0],frames[1],frames[0],frames[2]],
      cx:frames[0].cx,bottom:Math.max(...frames.map(f=>f.h)),top:0,
      width:Math.max(...frames.map(f=>f.w)),flip:false};
  }
  const height=Math.max(...Object.values(poses).map(p=>p.bottom));
  const width=Math.max(...Object.values(poses).map(p=>p.width));
  return {scale:Math.min(displayHeight/height,(options.width??(name==='cow'?76:name==='donkey'?69:64))/width),poses};
}
function extraFriend(name, boxes, displayWidth) {
  const file='farm-residents.png',{image,data}=pixels(file);
  const frames=boxes.map(([x,y,w,h])=>{
    let left=w,top=h,right=0,bottom=0;
    for(let py=0;py<h;py++)for(let px=0;px<w;px++)if(data[((y+py)*image.width+x+px)*4+3]>48) {
      left=Math.min(left,px);top=Math.min(top,py);right=Math.max(right,px+1);bottom=Math.max(bottom,py+1);
    }
    if(bottom<=top)throw Error(`Empty ${name} frame`);
    return {src:source+file,x:x+left,y:y+top,w:right-left,h:bottom-top,cx:(right-left)/2,bottom:bottom-top,top:0,width:right-left};
  });
  const width=Math.max(...frames.map(f=>f.w));
  const base={frames:[frames[0],frames[1],frames[0],frames[2]],cx:frames[0].cx,
    bottom:Math.max(...frames.map(f=>f.h)),top:0,width,flip:false};
  return {scale:displayWidth/width,poses:{down:base,right:base,up:base,left:{...base,flip:true}}};
}
async function main() {
for (const file of fs.readdirSync(path.join(root, source)).filter(f => f.endsWith('.png'))) {
  const image = await loadImage(path.join(root, source, file));
  const c = createCanvas(image.width, image.height).getContext('2d'); c.drawImage(image, 0, 0);
  images.set(file, { image, data: c.getImageData(0, 0, image.width, image.height).data });
}
const standard = { up: 0, right: 1, down: 2, left: 3 };
const data = {
  chicken: rescueAnimal('carijo',54,'cute-hen-v2.png'),
  'hen-silkie': rescueAnimal('silkie',54,'hen-silkie.png'),
  'hen-blue': rescueAnimal('blue',54,'hen-blue.png'),
  'skin-zeca': rescueAnimal('zeca',46,'skin-zeca.png'),
  'skin-pipoca': rescueAnimal('pipoca',46,'skin-pipoca.png'),
  'skin-amora': rescueAnimal('amora',44,'skin-amora.png'),
  'skin-pacoca': rescueAnimal('pacoca',50,'skin-pacoca.png'),
  'skin-gumercindo': rescueAnimal('gumercindo',58,'skin-gumercindo-v2.png'),
  wolf: fierceWolf(),
  goose: panto(),
  // World-scale silhouettes: large livestock, medium farm animals, small pets.
  // One uniform scale per sheet keeps an animal the same size when it turns.
  sheep: rescueAnimal('sheep',58,'cute-sheep-v2.png'),
  pig: rescueAnimal('pig',54,'cute-pig-v2.png'),
  goat: rescueAnimal('goat',62,'cute-goat-v2.png'),
  cow: rescueAnimal('cow',88,'cute-cow-v2.png',{width:96}),
  duck: rescueAnimal('duck',38,'cute-duck-v2.png'),
  rabbit: rescueAnimal('rabbit',40,'cute-rabbit-v2.png'),
  dog: rescueAnimal('dog',48,'cute-dog-v2.png'),
  cat: rescueAnimal('cat',38,'cute-cat-v2.png'),
  donkey: rescueAnimal('donkey',82,'cute-donkey-v2.png',{width:88}),
  lamb: rescueAnimal('lamb',42,'cute-lamb-v2.png'),
  chick: rescueAnimal('chick',24,'cute-chick-v2.png'),
  horse: rescueAnimal('horse',104,'cute-horse-v2.png',{width:110}),
  turkey: rescueAnimal('turkey',54,'cute-turkey-v2.png')
};
fs.writeFileSync(path.join(root, 'systems/sprite-data.js'),
  '/* Generated by scripts/build-sprite-data.cjs. Credits: assets/sprites/CREDITS.html */\nconst SpriteData = ' + JSON.stringify(data, null, 2) + ';\n');
console.log(`Frame coordinates validated for all ${Object.keys(data).length} characters.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
