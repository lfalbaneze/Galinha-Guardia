const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');

test('the local entry point includes all scripts, styles and their imported assets',()=>{
  const visited=new Set();
  function check(reference,from){
    if(!reference||/^(?:[a-z]+:|\/\/|#)/i.test(reference))return;
    const file=path.resolve(path.dirname(from),decodeURIComponent(reference.split(/[?#]/)[0]));
    assert.ok(fs.existsSync(file),`${path.relative(root,from)} refers to missing ${reference}`);
    assert.ok(fs.statSync(file).isFile()&&fs.statSync(file).size>0,`${reference} must be a nonempty file`);
    if(!file.endsWith('.css')||visited.has(file))return;
    visited.add(file);
    const css=fs.readFileSync(file,'utf8');
    for(const match of css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)/g))
      check(match[1]??match[2]??match[3],file);
    for(const match of css.matchAll(/@import\s+["']([^"']+)["']/g))check(match[1],file);
  }
  for(const entry of [path.join(root,'index.html'),path.join(root,'shuffle/index.html')])
    for(const match of fs.readFileSync(entry,'utf8').matchAll(/<(?:script|link|img)\b[^>]*(?:src|href)="([^"]+)"/g))
      check(match[1],entry);
  assert.ok(visited.size>=5,'the normal game styles must be checked');
});
