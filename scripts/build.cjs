// This game stays dependency-free at runtime; publish only its public files.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
// Compile before packaging, including when this script is invoked directly.
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', path.join(root, 'tsconfig.json')], {
  cwd: root, stdio: 'inherit',
});
require('./build-farm-data.cjs');
fs.mkdirSync(output,{recursive:true});
for(const name of fs.readdirSync(path.join(root,'systems')).filter(n=>n.endsWith('.js')))
  new vm.Script(fs.readFileSync(path.join(root,'systems',name),'utf8'),{filename:name});
new vm.Script(fs.readFileSync(path.join(root,'game.js'),'utf8'),{filename:'game.js'});
for(const item of ['index.html','style.css','gameplay.css','game.js','systems','assets'])
  fs.cpSync(path.join(root,item),path.join(output,item),{recursive:true});
console.log('Game scripts validated; public files copied to dist.');
