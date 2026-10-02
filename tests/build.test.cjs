const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');

test('rebuild drops obsolete output, excludes private sources and preserves CSS cache busting', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'galinha-build-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, content = '') => {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  };
  write('index.html', '<link rel="stylesheet" href="./style.css?v=1">');
  for (const file of ['style.css', 'gameplay.css', 'menu.css', 'expedition-ui.css', 'results.css']) write(file, 'body { color: red; }');
  write('game.js', 'const game = {};');
  write('systems/player.js', 'const player = {};');
  for (const name of ['maps.js', 'engine.js', 'survival.js', 'effects.js', 'result-art.js', 'ui.js']) write('shuffle/' + name, '');
  write('assets/live.png', 'public art');
  write('assets/sprites/pixellab-108/meta/private.json', '{}');
  write('.env.local', 'PRIVATE_TEST_VALUE=never-publish');
  // Exercise real packaging in a temporary project, without compiling or generating art.
  const buildRequire = Object.assign(id => {
    if (id === 'node:child_process') return { execFileSync() {} };
    if (id === './build-farm-data.cjs') return {};
    return require(id);
  }, { resolve: require.resolve });
  const source = fs.readFileSync(path.join(__dirname, '../scripts/build.cjs'), 'utf8');
  const build = () => vm.runInNewContext(source, {
    require: buildRequire, __dirname: path.join(root, 'scripts'), process, console: { log() {} },
  });
  build();
  const oldCSS = fs.readdirSync(path.join(root, 'dist')).find(name => /^style\.[a-f0-9]+\.css$/.test(name));
  assert.ok(oldCSS);
  write('dist/obsolete.js', 'stale');
  write('dist/.env.local', 'stale private file');
  write('dist/assets/sprites/pixellab-108/meta/private.json', '{}');
  write('style.css', 'body { color: blue; }');
  build();
  for (const file of [oldCSS, 'obsolete.js', '.env.local', 'assets/sprites/pixellab-108/meta/private.json'])
    assert.equal(fs.existsSync(path.join(root, 'dist', file)), false, file);
  assert.equal(fs.readFileSync(path.join(root, 'assets/live.png'), 'utf8'), 'public art');
  assert.equal(fs.readFileSync(path.join(root, 'dist/assets/live.png'), 'utf8'), 'public art');
  const html = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
  const css = html.match(/href="\.\/(style\.[a-f0-9]{12}\.css)"/)[1];
  assert.equal(fs.readFileSync(path.join(root, 'dist', css), 'utf8'), 'body { color: blue; }');
  write('game.js', 'const = broken;');
  assert.throws(build, /SyntaxError/);
  assert.equal(fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8'), html);
});
