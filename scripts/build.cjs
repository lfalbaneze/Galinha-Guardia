// This game stays dependency-free at runtime; publish only its public files.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
// Compile before packaging, including when this script is invoked directly.
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', path.join(root, 'tsconfig.json')], {
  cwd: root, stdio: 'inherit',
});
require('./build-farm-data.cjs');
for (const script of ['build-arcade-art.cjs', 'build-cartoon-cast.cjs', 'build-pixellab-art.cjs', 'build-arcade-world.cjs'])
  execFileSync(process.execPath, [path.join(__dirname, script)], {cwd: root, stdio: 'inherit'});
fs.mkdirSync(output,{recursive:true});
for(const name of fs.readdirSync(path.join(root,'systems')).filter(n=>n.endsWith('.js')))
  new vm.Script(fs.readFileSync(path.join(root,'systems',name),'utf8'),{filename:name});
new vm.Script(fs.readFileSync(path.join(root,'game.js'),'utf8'),{filename:'game.js'});
const artStudies=new Set(['assets/sprites/premium-102','assets/sprites/cartoon-103','assets/sprites/cartoon-104/raw','assets/sprites/cartoon-106/raw','assets/sprites/cartoon-107','assets/sprites/pixellab-108/meta','assets/sprites/pixel-109/raw','assets/sprites/pixel-109/meta']);
for(const item of ['index.html','style.css','gameplay.css','menu.css','expedition-ui.css','results.css','game.js','systems','assets'])
  fs.cpSync(path.join(root,item),path.join(output,item),{recursive:true,
    filter:source=>{const relative=path.relative(path.toNamespacedPath(root),path.toNamespacedPath(source)).split(path.sep).join('/');
      return !artStudies.has(relative)&&!/^assets\/sprites\/cartoon-106\/runtime\/.*\.png$/.test(relative);}});
// A new stylesheet gets a new filename, including on hosts that ignore query
// strings in their cache keys. Keep CSS beside index.html so asset URLs work.
const htmlFile = path.join(output, 'index.html');
const html = fs.readFileSync(htmlFile, 'utf8').replace(
  /(<link\b[^>]*\brel="stylesheet"[^>]*\bhref=")\.\/([^"?]+\.css)(?:\?[^"]*)?("[^>]*>)/g,
  (_, before, filename, after) => {
    const css = fs.readFileSync(path.join(root, filename));
    const hash = createHash('sha256').update(css).digest('hex').slice(0, 12);
    const versioned = filename.replace(/\.css$/, `.${hash}.css`);
    fs.writeFileSync(path.join(output, versioned), css);
    return `${before}./${versioned}${after}`;
  }
);
fs.writeFileSync(htmlFile, html);
console.log('Game scripts validated; versioned styles and public files copied to dist.');
