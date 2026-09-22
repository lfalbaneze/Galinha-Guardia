const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {createGame}=require('./helpers.cjs');

test('the refuge gate includes a visual no-wolf sign without adding a collision obstacle',()=>{
  const h=createGame(()=>.5);
  assert.equal(h.run("FarmRefuge.props().some(p=>p.type==='refuge-no-wolf-sign')"),true);
  assert.equal(h.run("FarmRefuge.obstacles().some(p=>p.type==='refuge-no-wolf-sign')"),false);
});

test('Baltazar grumbles once when a pursuit ends at the refuge',()=>{
  const h=createGame(()=>.5);
  h.run(`const c=state.entities.chicken,w=state.entities.wolf;
    Object.assign(c,{x:220,y:360,hidden:false,invulnerable:0});
    Object.assign(w,{x:390,y:385,mode:'chase',pauseTimer:0,huntUnlockTimer:0,awareness:1,detected:true,
      lastKnown:{x:220,y:360},speechTime:0,speechCooldown:0,speechPriority:0});
    WolfAI.update(state,.05);
    var firstSpeech=w.speech,firstIndex=w.speechIndex,firstTime=w.speechTime;
    WolfAI.update(state,.05);
    var secondSpeech=w.speech,secondIndex=w.speechIndex;`);
  assert.equal(h.run('w.mode'),'patrol');
  assert.match(h.run('firstSpeech'),/(curral|regra|indo|placa)/i);
  assert.ok(h.run('firstTime')>=2.5);
  assert.equal(h.run('secondSpeech'),h.run('firstSpeech'));
  assert.equal(h.run('secondIndex'),h.run('firstIndex'));
});

test('ordinary patrol inside the safe-area state does not create fake retreat dialogue',()=>{
  const h=createGame(()=>.5);
  h.run(`const c=state.entities.chicken,w=state.entities.wolf;
    Object.assign(c,{x:220,y:360});
    Object.assign(w,{x:390,y:385,mode:'patrol',pauseTimer:0,huntUnlockTimer:0,speech:'',speechTime:0,speechPriority:0});
    WolfAI.update(state,.05);`);
  assert.equal(h.run("w.speech||''"),'');
});


test('the cute no-wolf art is packaged as a transparent PNG and referenced by the refuge',()=>{
  const root=path.resolve(__dirname,'..');
  const asset=fs.readFileSync(path.join(root,'assets/signs/proibido-lobo.png'));
  assert.equal(asset.subarray(1,4).toString(),'PNG');
  const refuge=fs.readFileSync(path.join(root,'systems/farm-refuge.js'),'utf8');
  assert.match(refuge,/assets\/signs\/proibido-lobo\.png/);
  assert.match(refuge,/x:358,y:328,w:84,h:112/);
});
