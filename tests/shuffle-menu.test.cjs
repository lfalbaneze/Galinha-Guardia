const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('shuffle/ui.js','utf8');
function menu(ready,checkpoint){
  const controls=new Map(),calls=[];
  const $=id=>controls.get(id);
  const context=vm.createContext({ready,checkpoint,screenKey:'',run:null,saveAvailable:true,location:{hash:'#survival'},S:{STAGES:Array(10)},
    $:id=>$(id),crypto:{getRandomValues:a=>{a[0]=123;return a;}},
    E:{newRun:seed=>({seed}),checkpoint:run=>({...run})},
    startSurvival:()=>calls.push('survival'),store:run=>calls.push(['save',run]),sync:()=>calls.push('sync'),wardrobe:()=>calls.push('wardrobe'),
    modal:html=>{context.markup=html;for(const [,id]of html.matchAll(/id="([^"]+)"/g))controls.set(id,{disabled:true});},
    element:(tag,text)=>({textContent:text}),panel:{querySelector:()=>({prepend:node=>controls.set(node.id,node)})}});
  vm.runInContext(source.slice(source.indexOf('  function intro(){'),source.indexOf('  function draft(){')),context);
  vm.runInContext('intro();',context);
  return {context,controls,calls};
}
test('the farmhouse entrance keeps both modes blocked while assets load and renders the checkpoint without changing it',()=>{
  const checkpoint={seed:456,stage:4},h=menu(false,checkpoint);
  assert.match(h.context.markup,/class="chaos-intro"/);assert.match(h.context.markup,/id="panelTitle"/);
  for(const id of ['startRun','startSurvival','continueRun'])assert.equal(h.controls.get(id).disabled,true);
  assert.deepEqual(h.calls,['wardrobe']);assert.deepEqual(checkpoint,{seed:456,stage:4});
});
test('ready entrance starts survival, restores the existing campaign or creates a fresh campaign through the original handlers',()=>{
  const checkpoint={seed:456,stage:4},h=menu(true,checkpoint);
  for(const id of ['startRun','startSurvival','continueRun'])assert.equal(h.controls.get(id).disabled,false);
  assert.equal(h.controls.get('startSurvival').textContent,'Nova Revoada');
  assert.equal(h.context.run,null,'the survival link must show setup before starting');
  assert.deepEqual(h.calls,['wardrobe'],'finishing loading never starts a match automatically');
  h.controls.get('startSurvival').onclick();assert.ok(h.calls.includes('survival'));
  h.controls.get('continueRun').onclick();assert.equal(h.context.run,checkpoint);
  h.controls.get('startRun').onclick();assert.equal(h.context.run.seed,123);
  assert.equal(checkpoint.seed,456);assert.ok(h.calls.some(c=>Array.isArray(c)&&c[0]==='save'));
  assert.doesNotMatch(menu(true,null).context.markup,/id="continueRun"/);
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
