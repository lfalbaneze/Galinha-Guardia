const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createGame}=require('./helpers.cjs'),root=path.resolve(__dirname,'..');
function art(reduced=false){const context=vm.createContext({InterfaceMotion:{reduced},setTimeout,clearTimeout});
 for(const file of ['sprite-data','arcade-art-data','premium-art-data','character-art','wildlife-art','goose-art'])vm.runInContext(fs.readFileSync(path.join(root,'systems',file+'.js'),'utf8'),context);
 const metadata=vm.runInContext('PremiumWildlifeData',context);
 return {context,api:vm.runInContext('GooseArt',context),size:src=>{const d=Object.values(metadata).find(d=>d.src===src);return {width:d.width,height:d.height};}};
}
function goose(values={}){return {x:100,y:100,direction:'down',moving:false,mode:'patrol',anim:0,timer:0,...values};}
test('Panto has 96 visible walking poses and grounded feet in eight directions',async()=>{
 const {loadImage,createCanvas}=require('@napi-rs/canvas'),{api}=art();assert.equal(api.frames.length,96);assert.equal(await api.load(src=>loadImage(path.join(root,src))),true);
 const c=createCanvas(200,180).getContext('2d'),signatures=new Set();
 for(const direction of ['up','upright','right','downright','down','downleft','left','upleft'])for(let phase=0;phase<12;phase++){
  c.clearRect(0,0,200,180);api.draw(c,goose({direction,moving:true,anim:phase/3}),{x:0,y:0});const pixels=c.getImageData(0,0,200,180).data;let count=0,bottom=-1;
  for(let y=0;y<180;y++)for(let x=0;x<200;x++)if(pixels[(y*200+x)*4+3]>=200){assert.ok(x>45&&x<155);count++;bottom=Math.max(bottom,y);}
  assert.ok(count>500);assert.ok(bottom>=111&&bottom<=115);signatures.add(require('node:crypto').createHash('sha256').update(pixels).digest('hex'));
 }assert.equal(signatures.size,96);
});
test('Panto cycles twelve steps while moving and opens his wings to warn before charging',()=>{
 const {api}=art(),rows={down:0,right:1,up:2,left:3,downright:4,upright:5,downleft:6,upleft:7};
 for(const [direction,row]of Object.entries(rows))for(let phase=0;phase<12;phase++){
  assert.equal(api.frameFor(goose({direction,moving:true,anim:phase/3})).row,row);
  assert.equal(api.frameFor(goose({direction,moving:true,anim:phase/3})).column,phase);
  assert.equal(api.frameFor(goose({direction,anim:phase/3})).column,0);
  const warning=api.frameFor(goose({direction,mode:'warning',timer:phase/12}));assert.ok(warning.column>=3&&warning.column<=9);
  assert.equal(api.frameFor(goose({direction,mode:'charge',moving:true,anim:phase/3})).column,phase,'charging keeps the feet moving');
 }
});
test('reduced motion freezes walking and keeps the open-wing warning',()=>{const {api}=art(true);assert.equal(api.frameFor(goose({moving:true,anim:1})).column,0);assert.equal(api.frameFor(goose({mode:'warning'})).column,3);});
test('renderer preserves canvas and gameplay state and uses decoded art',()=>{
 const {api}=art(),draws=[],stack=[],c=new Proxy({imageSmoothingEnabled:true,save(){stack.push(this.imageSmoothingEnabled)},restore(){this.imageSmoothingEnabled=stack.pop()},drawImage(...args){draws.push(args)}},{get:(o,k)=>o[k]??(()=>{})});
 const entity=goose({direction:'left',mode:'warning'}),before=JSON.stringify(entity);assert.equal(api.draw(c,entity,{x:0,y:0}),false);
 api.install(src=>({src}));assert.equal(api.draw(c,entity,{x:10,y:20}),true);assert.match(draws[0][0].src,/goose-alert\.webp$/);
 assert.ok(Math.abs(draws[0][6]+draws[0][8]-97)<=1);assert.equal(c.imageSmoothingEnabled,true);assert.equal(stack.length,0);assert.equal(JSON.stringify(entity),before);
});
test('both goose sheets share pending requests, cache successes and retry failure',async()=>{
 const {api,size}=art(),callbacks=[];let calls=0;const first=api.load(src=>{calls++;return new Promise(resolve=>callbacks.push(()=>resolve(size(src))))});
 assert.equal(api.load(),first);assert.equal(api.loading,true);await Promise.resolve();for(const done of callbacks)done();assert.equal(await first,true);assert.equal(calls,2);
 await api.load(()=>{throw Error('reuse cache')});assert.equal(calls,2);
 const failed=art();assert.equal(await failed.api.load(async()=>{throw Error('offline')}),false);assert.equal(failed.api.errors.length,2);
 assert.equal(await failed.api.load(async()=>({width:1,height:1})),false);assert.equal(await failed.api.load(async src=>failed.size(src)),true);
});
test('life hearts and critical message follow health, restart, loss and pause without changing it', () => {
  const h = createGame(() => .5);
  for (const lives of [3, 2, 1, 0, 3]) {
    h.run(`state.lives=${lives}; var before=JSON.stringify(state); GameplayHud.update(state)`);
    assert.deepEqual([1, 2, 3].map(i => h.elements.get(`lifeHeart${i}`).dataset.full),
      [1, 2, 3].map(i => String(i <= lives)));
    assert.equal(h.elements.get('livesCard').dataset.critical, String(lives === 1));
    assert.equal(h.run('JSON.stringify(state)===before'), true);
  }
  h.run("state.lives=1;state.phase='menu';GameplayHud.update(state)");
  assert.equal(h.elements.get('livesCard').dataset.critical, 'false');
});

test('live portraits do not redraw on unchanged frames and update with the chosen appearance', () => {
  const h = createGame(() => .5);
  h.run(`var draws=[];document.getElementById('hudPortrait').getContext('2d').drawImage=(...args)=>draws.push(args);
    for(let i=0;i<120;i++)GameplayHud.update(state)`);
  assert.equal(h.run('draws.length'), 0);
  h.run("state.entities.chicken.skin='punk';GameplayHud.update(state)");
  assert.equal(h.run('draws.length'), 3);
  h.run('for(let i=0;i<120;i++)GameplayHud.update(state)');
  assert.equal(h.run('draws.length'), 3);
});

test('HUD keeps the counters, threat states, stamina and pause/resume bindings', () => {
  const h = createGame(() => .5);
  h.run("state.rescuedCount=4;state.rescuedChicks=2;state.entities.chicken.stamina=.45;state.entities.wolf.mode='chase';refreshHud();GameUI.update(state)");
  assert.equal(h.elements.get('rescuedCount').textContent, '4');
  assert.equal(h.elements.get('chicksCount').textContent, '2');
  assert.equal(h.elements.get('missionProgress').value, 4);
  assert.equal(h.elements.get('staminaMeter').value, .45);
  assert.equal(h.elements.get('threatIndicator').dataset.level, 'danger');
  h.events.elements.pauseBtn.click(); assert.equal(h.run('state.phase'), 'menu');
  h.events.elements.continueBtn.click(); assert.equal(h.run('state.phase'), 'playing');
});

test('a failed goose sprite blocks starting a game instead of creating an invisible enemy', async () => {
  const h = createGame(() => .5, { skipGooseInstall: true });
  h.run('GameUI.showMenu(state)');
  assert.equal(await h.run("GooseArt.load(async () => { throw Error('missing PNG'); })"), false);
  h.run('GameUI.update(state)');
  assert.equal(h.elements.get('startBtn').disabled, true);
  assert.equal(h.elements.get('spriteStatus').hidden, false);
  h.events.elements.startBtn.click(); assert.equal(h.run('state.phase'), 'menu');
  assert.equal(await h.run('GooseArt.load(async src => {const d=Object.values(PremiumWildlifeData).find(d=>d.src===src);return {width:d.width,height:d.height};})'), true);
  h.run('GameUI.update(state)');
  assert.equal(h.elements.get('startBtn').disabled, false);
  h.events.elements.startBtn.click(); assert.equal(h.run('state.phase'), 'playing');
});

test('all HUD IDs remain unique and public CSS/PNG files are included by the build', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ['areaText','pauseBtn','livesCount','lifeHeart1','lifeHeart2','lifeHeart3',
    'rescuedCount','chicksCount','scoreCount','missionProgress','threatText','wolfStateText','staminaMeter']) assert.ok(ids.includes(id));
  assert.match(html, /gameplay\.css/);
  assert.match(fs.readFileSync(path.join(root, 'scripts/build.cjs'),'utf8'), /'gameplay\.css'/);
  assert.doesNotMatch(fs.readFileSync(path.join(root,'src/systems/goose-art.ts'),'utf8'), /drawFallback/);
});
