const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('shuffle/ui.js','utf8');
function menu(ready,checkpoint,hash='#survival'){
  const controls=new Map(),calls=[];
  const context=vm.createContext({ready,checkpoint,screenKey:'',run:null,saveAvailable:true,location:{hash},S:{STAGES:Array(10)},
    $:id=>controls.get(id),crypto:{getRandomValues:a=>{a[0]=123;return a;}},
    E:{newRun:seed=>({seed}),checkpoint:run=>({...run})},
    startSurvival:()=>calls.push('survival'),store:run=>calls.push(['save',run]),sync:()=>calls.push('sync'),wardrobe:()=>calls.push('wardrobe'),
    modal:html=>{context.markup=html;for(const [,id]of html.matchAll(/id="([^"]+)"/g))controls.set(id,{disabled:true});
      for(const [,id,label]of html.matchAll(/<button[^>]*id="([^"]+)"[^>]*>([^<]*)</g))controls.get(id).textContent=label;}});
  vm.runInContext(source.slice(source.indexOf('  function intro(){'),source.indexOf('  function draft(){')),context);
  vm.runInContext('intro();',context);
  return {context,controls,calls};
}

test('each preparation screen blocks its own start actions until assets load',()=>{
  const checkpoint={seed:456,stage:4};
  for(const hash of ['#survival','#rescue']){
    const h=menu(false,checkpoint,hash);
    assert.match(h.context.markup,/class="chaos-intro"/);assert.match(h.context.markup,/id="panelTitle"/);
    for(const id of hash==='#rescue'?['startRun','continueRun']:['startSurvival'])assert.equal(h.controls.get(id).disabled,true);
    h.context.ready=true;vm.runInContext('loaded();',h.context);
    for(const id of hash==='#rescue'?['startRun','continueRun']:['startSurvival'])assert.equal(h.controls.get(id).disabled,false);
    assert.deepEqual(checkpoint,{seed:456,stage:4});
  }
});

test('Revoada has only one start action even when a rescue checkpoint exists',()=>{
  const checkpoint={seed:456,stage:4},h=menu(true,checkpoint);
  assert.equal(h.controls.get('startSurvival').disabled,false);
  assert.equal(h.controls.get('startSurvival').textContent,'Começar Revoada');
  assert.ok(!h.controls.has('startRun')&&!h.controls.has('continueRun'));
  assert.match(h.context.markup,/href="#rescue"/);
  assert.equal(h.context.run,null,'the survival link shows setup before starting');
  assert.deepEqual(h.calls,['wardrobe'],'finishing loading never starts a match automatically');
  h.controls.get('startSurvival').onclick();assert.ok(h.calls.includes('survival'));
  assert.deepEqual(checkpoint,{seed:456,stage:4});
});

test('the separate rescue screen retains both checkpoint and fresh rescue actions',()=>{
  const checkpoint={seed:456,stage:4},h=menu(true,checkpoint,'#rescue');
  for(const id of ['startRun','continueRun'])assert.equal(h.controls.get(id).disabled,false);
  assert.ok(!h.controls.has('startSurvival'));assert.ok(!h.calls.includes('wardrobe'));
  assert.match(h.context.markup,/href="#survival"/);
  h.controls.get('continueRun').onclick();assert.equal(h.context.run,checkpoint);
  h.controls.get('startRun').onclick();assert.equal(h.context.run.seed,123);
  assert.equal(checkpoint.seed,456);assert.ok(h.calls.some(c=>Array.isArray(c)&&c[0]==='save'));
  const fresh=menu(true,null,'#rescue');
  assert.doesNotMatch(fresh.context.markup,/id="continueRun"/);
  assert.equal(fresh.controls.get('startRun').textContent,'Começar resgate');
});

test('changing menu routes cannot reset an active match',()=>{
  let handler,opened=0;
  const c=vm.createContext({run:{seed:123},window:{addEventListener:(event,callback)=>{handler=callback;}},intro:()=>opened++});
  vm.runInContext(source.split('\n').find(line=>line.includes("addEventListener('hashchange'")),c);
  handler();assert.equal(opened,0);assert.equal(c.run.seed,123);
  c.run=null;handler();assert.equal(opened,1);
});

test('new game from either pause menu opens setup and preserves the rescue checkpoint',()=>{
  const E=require('../shuffle/engine.js'),S=require('../shuffle/survival.js');
  for(const run of [E.newRun(456),S.newRun(789)]){
    const checkpoint=E.newRun(123),nodes={powerHud:{hidden:false},fusionBook:{hidden:false}};
    const expected=run.mode==='survival'?checkpoint:E.restore(E.checkpoint(run));
    const c=vm.createContext({E,run,checkpoint,$:id=>nodes[id],opened:false});
    vm.runInContext('const isSurvival=()=>run?.mode==="survival";function intro(){opened=true}',c);
    const handler=source.match(/change.onclick=(\(\)=>\{[^\n]+?\});/)[1];
    vm.runInContext(`(${handler})();`,c);
    assert.equal(c.run,null);assert.equal(c.opened,true);assert.deepEqual(c.checkpoint,expected);
    assert.ok(nodes.powerHud.hidden&&nodes.fusionBook.hidden);
  }
});
test('campaign-only reward skins cannot crash the actual wardrobe or overwrite the equipped campaign skin',()=>{
  const S=require('../shuffle/survival.js'),nodes=new Map(),equipped={entities:{chicken:{skin:'goat'}}};
  const c=vm.createContext({S,equipped,panel:{querySelector:()=>({before:box=>{c.wardrobeBox=box;}})},
    SkinSystem:{catalog:[...Object.keys(S.HEROES).map(id=>({id,name:id})),...['goat','turkey','owl','pony'].map(id=>({id,name:id}))],unlocked:()=>true},
    document:{createElement:tag=>{const node={tag,children:[],append(...children){this.children.push(...children);}};Object.defineProperty(node,'id',{set(id){this._id=id;nodes.set(id,this);},get(){return this._id;}});node.setAttribute=()=>{};return node;}}});
  vm.runInContext(source.match(/  let selectedSkin=[^\n]+/)[0],c);
  vm.runInContext(source.slice(source.indexOf('  const heroDescription='),source.indexOf('  function startSurvival(')),c);
  vm.runInContext(source.slice(source.indexOf('  function element('),source.indexOf('  function powerIcon(')),c);
  vm.runInContext(source.slice(source.indexOf('  function wardrobe(){'),source.indexOf('  function intro(){')),c);
  vm.runInContext('wardrobe();',c);
  assert.equal(equipped.entities.chicken.skin,'goat');assert.equal(nodes.get('survivalSkin').value,'classic');
  assert.equal(nodes.get('survivalSkin').children.length,Object.keys(S.HEROES).length);
  assert.ok(nodes.get('heroDescription').textContent.includes(S.SHOTS.classic.name));assert.ok(c.wardrobeBox);
});
