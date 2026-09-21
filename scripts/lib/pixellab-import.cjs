const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { directions } = require('./pixellab-cast.cjs');
const { readJSON, writeJSON } = require('./pixellab-client.cjs');
const borderReviews = require('./pixellab-border-reviews.json');
const median = values => [...values].sort((a,b) => a-b)[Math.floor(values.length/2)];
function bounds(image, label, reviewedClosedContour = false) {
  const canvas = createCanvas(image.width, image.height), c = canvas.getContext('2d');
  c.drawImage(image, 0, 0);
  const rgba = c.getImageData(0, 0, image.width, image.height).data;
  let left = image.width, top = image.height, right = -1, bottom = -1;
  for (let y=0; y<image.height; y++) for (let x=0; x<image.width; x++) if (rgba[(y*image.width+x)*4+3] >= 32) {
    left = Math.min(left,x); right = Math.max(right,x); top = Math.min(top,y); bottom = Math.max(bottom,y);
  }
  if (right < left) throw Error(`${label}: quadro vazio.`);
  if (!reviewedClosedContour && (left < 1 || top < 1 || right >= image.width-1 || bottom >= image.height-1)) throw Error(`${label}: desenho encosta na borda; revisar possível corte antes de instalar.`);
  return {left, top, right, bottom, width:right-left+1, height:bottom-top+1};
}
async function packCharacter(item, input, destination) {
  const source = readJSON(path.join(input, 'frames.json'));
  if (!source || source.id !== item.id) throw Error(`Faltam quadros baixados: ${item.id}`);
  const rows = [], warnings = [], reviewedBorders = {};
  for (const action of ['idle', ...Object.keys(source.actions).filter(n => n !== 'idle')]) {
    const poses = source.actions[action];
    for (const [apiDirection, originalDirection] of Object.entries(directions)) {
      const gameDirections=Object.values(directions),direction=gameDirections[(gameDirections.indexOf(originalDirection)+(item.viewRotation||0))%8];
      const files = poses?.[apiDirection];
      if (!Array.isArray(files) || !files.length) throw Error(`${item.id}/${action}: falta direção ${apiDirection}.`);
      if (action !== 'idle' && files.length < 8) throw Error(`${item.id}/${action}/${direction}: menos de oito quadros de animação.`);
      const frames = [];
      for (const filename of files) {
        const full = path.resolve(input, filename);
        if (!full.startsWith(path.resolve(input) + path.sep)) throw Error('Frame path escapes input directory');
        const bytes = fs.readFileSync(full), image = await loadImage(bytes);
        if (image.width > 512 || image.height > 512) throw Error('Unexpected oversized sprite');
        const hash=createHash('sha256').update(bytes).digest('hex'),review=borderReviews[item.id]?.[hash];
        if(review)reviewedBorders[hash]=review;
        frames.push({image, ink:bounds(image,`${item.id}/${action}/${direction}/${frames.length}`,!!review), hash});
      }
      if (action !== 'idle' && new Set(frames.map(f => f.hash)).size < 4) throw Error(`${item.id}/${action}/${direction}: ciclo parado ou com quadros repetidos.`);
      const heights = frames.map(f=>f.ink.height);
      if (Math.max(...heights) / Math.min(...heights) > 1.35) warnings.push(`${action}/${direction}: variação de altura acima de 35%; conferir anatomia em movimento.`);
      // Wing tips may extend below the feet. Keep the perched reference anchor
      // through alarm/flight instead of lifting the whole bird by the wing span.
      const usesWingAnchor=['alert','fly'].includes(action)||(item.gait==='crow'&&action!=='idle');
      const referenceGround=usesWingAnchor?rows.find(r=>r.action==='idle'&&r.direction===direction)?.ground:undefined;
      rows.push({action,direction,frames,ground:referenceGround??Math.max(...frames.map(f=>f.ink.bottom+1-f.image.height/2))});
    }
  }
  if (!source.actions.walk) throw Error(`${item.id}: falta ciclo de caminhada.`);
  const all = rows.flatMap(r=>r.frames), padding = 4;
  // One bounding rectangle for the WHOLE character, including every action.
  // No per-frame trimming, stretching, centering or lost airborne motion.
  const size = item.height / median(rows.filter(r=>r.action==='idle').map(r=>r.frames[0].ink.height));
  const rasterScale = Math.min(1,size);
  const left = Math.floor(Math.min(...all.map(f=>f.ink.left-f.image.width/2))*rasterScale);
  const right = Math.ceil(Math.max(...all.map(f=>f.ink.right+1-f.image.width/2))*rasterScale);
  const top = Math.floor(Math.min(...rows.flatMap(r=>r.frames.map(f=>f.ink.top-f.image.height/2-r.ground)))*rasterScale);
  const bottom = Math.ceil(Math.max(...rows.flatMap(r=>r.frames.map(f=>f.ink.bottom+1-f.image.height/2-r.ground)))*rasterScale);
  const cx = padding-left, ground = padding-top;
  const cellW = right-left+padding*2, cellH = bottom-top+padding*2;
  const columns = Math.max(...rows.map(r=>r.frames.length));
  const sheet = createCanvas(columns*cellW, rows.length*cellH), c = sheet.getContext('2d');
  c.imageSmoothingEnabled = false;
  // Rasterize at game size once to keep all 29 decoded atlases within a sensible
  // memory budget. Nearest-neighbour keeps original colors and pixel clusters.
  const scale = size/rasterScale;
  const actions = {};
  rows.forEach((row, rowIndex) => {
    // Calibrate each complete clip once, preserving its original vertical motion.
    const rowTop = ground+Math.floor(Math.min(...row.frames.map(f=>f.ink.top-f.image.height/2-row.ground))*rasterScale);
    const width = Math.ceil(Math.max(...row.frames.map(f=>f.ink.width))*rasterScale);
    const frames = row.frames.map((f, index) => {
      // Snap the destination rectangle to the pixel grid as well as disabling
      // smoothing. Fractional canvas edges otherwise create translucent pixels
      // on a reviewed outline that reaches the original PNG boundary.
      c.drawImage(f.image, Math.round(index*cellW+cx-f.image.width/2*rasterScale),
        Math.round(rowIndex*cellH+ground-(f.image.height/2+row.ground)*rasterScale),
        Math.round(f.image.width*rasterScale),Math.round(f.image.height*rasterScale));
      return {src:'atlas.png', x:index*cellW, y:rowIndex*cellH, w:cellW, h:cellH, cx, bottom:ground, top:rowTop, width, scale, pixelArt:true};
    });
    // Authored reactions develop after the neutral reference pose. At rest, keep
    // the expressive part of the clip visible instead of reverting to frame 0.
    const idleIndex=['happy','scared','angry','sad'].includes(row.action)?Math.floor(frames.length*.625):0;
    (actions[row.action] ||= {})[row.direction] = {frames, cx, bottom:ground, top:rowTop, width, idleIndex, flip:false};
  });
  const definition = {edition:108, provider:'pixellab', pixelArt:true, smooth:false, scale, cycle:4,
    source:'atlas.png', width:sheet.width, height:sheet.height, viewRotation:item.viewRotation||0, poses:actions.walk, actions};
  fs.mkdirSync(destination,{recursive:true});
  fs.writeFileSync(path.join(destination,'atlas.png'),sheet.toBuffer('image/png'));
  writeJSON(path.join(destination,'candidate.json'), {id:item.id, characterId:source.characterId, definition, warnings, reviewedBorders,
    checks:{directions:8, rows:rows.length, frames:all.length, clipped:false}, generatedAt:source.generatedAt});
  return {definition,warnings};
}
function withSource(value, source) {
  if (Array.isArray(value)) return value.map(v=>withSource(v,source));
  if (value && typeof value==='object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[k, ['src','source'].includes(k) && v==='atlas.png' ? source : withSource(v,source)]));
  return value;
}
function installCandidate(root, id) {
  const folder=path.join(root,'preview/pixellab',id), candidate=readJSON(path.join(folder,'candidate.json'));
  if (!candidate || candidate.id !== id) throw Error(`Falta revisão gerada para ${id}.`);
  const bytes=fs.readFileSync(path.join(folder,'atlas.png'));
  const hash=createHash('sha256').update(bytes).digest('hex').slice(0,12);
  const source=`assets/sprites/pixellab-108/runtime/${id}-${hash}.png`;
  fs.mkdirSync(path.dirname(path.join(root,source)),{recursive:true});
  fs.writeFileSync(path.join(root,source),bytes);
  const installed={...candidate,definition:withSource(candidate.definition,source)};
  writeJSON(path.join(root,'assets/sprites/pixellab-108/meta',id+'.json'),installed);
  return installed;
}
const wildlifeOrder=['down','right','up','left','downright','upright','downleft','upleft'];
function wildlife(definition, action='walk', prependIdle=false) {
  const poses=definition.actions[action];
  if (!poses) throw Error(`Missing wildlife action: ${action}`);
  const count=poses.down.frames.length;
  if (wildlifeOrder.some(d=>poses[d].frames.length!==count)) throw Error('Wildlife directions have different frame counts');
  return {src:definition.source,width:definition.width,height:definition.height,scale:definition.scale,columns:count+(prependIdle?1:0),
    frames:wildlifeOrder.flatMap(d=>prependIdle?[definition.actions.idle[d].frames[0],...poses[d].frames]:poses[d].frames)};
}
function buildData(root) {
  const directory=path.join(root,'assets/sprites/pixellab-108/meta'), data={}, wild={};
  for (const file of fs.existsSync(directory)?fs.readdirSync(directory).filter(n=>n.endsWith('.json')).sort():[]) {
    const entry=readJSON(path.join(directory,file)), d=entry.definition;
    if (entry.id+'.json'!==file || d.provider!=='pixellab' || !fs.existsSync(path.join(root,d.source))) throw Error(`Invalid installed PixelLab character: ${file}`);
    for (const direction of Object.values(directions)) if (!d.poses[direction]?.frames.length) throw Error(`Missing installed direction: ${file}/${direction}`);
    data[entry.id]=d;
    if (['fox','amanda','thor','goose','owl','scarecrow','crow'].includes(entry.id)) wild[entry.id]=wildlife(d,'walk',entry.id==='crow');
    if (entry.id==='owl') {
      wild.owl=wildlife(d,'alert'); wild['owl-flight']=wildlife(d,'fly');
    }
    if (entry.id==='goose') wild['goose-alert']=wildlife(d,'alert');
    if (['scarecrow','crow'].includes(entry.id)) for (const action of ['happy','scared','sad']) {
      if(d.actions[action]) wild[entry.id+'-'+action]=wildlife(d,action,entry.id==='crow');
    }
  }
  const script='/* Generated by scripts/build-pixellab-art.cjs. Only installed, reviewed assets. */\nconst PixelLabArtData = '+JSON.stringify(data)+';\nObject.assign(SpriteData, PixelLabArtData);\nObject.assign(PremiumWildlifeData, '+JSON.stringify(wild)+');\n';
  fs.writeFileSync(path.join(root,'systems/pixellab-art-data.js'),script);
  const htmlFile=path.join(root,'index.html');
  if(fs.existsSync(htmlFile)){
    const version=createHash('sha256').update(script).digest('hex').slice(0,12);
    let html=fs.readFileSync(htmlFile,'utf8').replace(/pixellab-art-data\.js(?:\?v=[^"']*)?/g,'pixellab-art-data.js?v='+version);
    const renderers=['game.js',...['character-art','wildlife-art','fox-art','goose-art','thor-art','owl-art','owl-system','scarecrow-art','scarecrow-system','menu-scene','menu-briefing','thor-cinematic'].map(n=>'systems/'+n+'.js')];
    for(const file of renderers){const full=path.join(root,file);if(!fs.existsSync(full))continue;
      const revision=createHash('sha256').update(fs.readFileSync(full)).digest('hex').slice(0,12);
      html=html.replace(/(src="\.\/)([^"?]+)(?:\?v=[^"]*)?(")/g,
        (match,prefix,name,end)=>name===file?`${prefix}${name}?v=${revision}${end}`:match);
    }
    const css=path.join(root,'menu.css');
    if(fs.existsSync(css))html=html.replace(/menu\.css(?:\?v=[^"']*)?/g,
      'menu.css?v='+createHash('sha256').update(fs.readFileSync(css)).digest('hex').slice(0,12));
    fs.writeFileSync(htmlFile,html);
  }
  const report=[
    '# Produção PixelLab — 20/09/2026','',
    'Sprites produzidos pela API oficial https://api.pixellab.ai/v2. Criação v3/Pixen e animação v3; nenhum outro gerador foi usado nesta produção.','',
    `${Object.keys(data).length} de 29 personagens/aparências instalados. Esta tabela é atualizada a partir dos atlas que o jogo realmente carrega.`,'',
    '| Personagem | Direções por ação | Ações instaladas | Quadros |',
    '| --- | --- | --- | --- |',
    ...Object.entries(data).map(([id,d])=>`| ${id} | 8 | ${Object.keys(d.actions).join(', ')} | ${Object.values(d.actions).flatMap(p=>Object.values(p)).reduce((n,p)=>n+p.frames.length,0)} |`),'',
    'Cada direção usa imagens próprias da PixelLab. O importador não espelha nem inventa quadros. Ajustes de rótulos direcionais estão registrados em `viewRotation` nos metadados e preservam os pixels originais.','',
    'Caminhadas são sincronizadas à distância percorrida. O importador mantém uma escala comum, margens transparentes e o movimento vertical dos quadros. Nas asas abertas, conserva o apoio da vista em repouso.','',
    'Os atlas locais em `runtime` são usados no jogo e no menu. A chave fica fora da distribuição; jogar não consulta a API. Créditos adicionais foram autorizados pelo usuário em 20/09/2026. O saldo atual é consultado pelo comando de produção, não por este documento.','',
    'A revisão inclui quadros, recortes, animação em diferentes velocidades e integração no navegador. Testes técnicos não substituem a avaliação artística. Candidatos ainda em produção ficam separados em `preview/pixellab`.',''
  ].join('\n');
  fs.writeFileSync(path.join(root,'assets/sprites/pixellab-108/README.md'),report);
  return Object.keys(data).length;
}
module.exports={packCharacter,installCandidate,buildData,bounds,wildlife};
