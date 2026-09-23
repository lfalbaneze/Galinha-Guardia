const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');

test('rescued Panto no longer shows a permanent safe-status label',()=>{
  const js=fs.readFileSync(path.resolve(__dirname,'../systems/goose-system.js'),'utf8');
  const ts=fs.readFileSync(path.resolve(__dirname,'../src/systems/goose-system.ts'),'utf8');
  assert.doesNotMatch(js,/PANTO · A salvo/);
  assert.doesNotMatch(ts,/PANTO · A salvo/);
  assert.match(js,/const label = 'PANTO';/);
});
