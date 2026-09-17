// Pass explicit test files to Node so discovery works identically on Windows and Linux.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
function collect(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return collect(file);
    return entry.isFile() && /\.test\.[cm]?js$/.test(entry.name) ? [file] : [];
  });
}
const files = collect(path.join(root, 'tests')).sort();
if (!files.length) {
  console.error('No JavaScript test files found in tests/.');
  process.exit(1);
}
const result = spawnSync(process.execPath, ['--test', ...process.argv.slice(2), ...files], {
  cwd: root, stdio: 'inherit',
});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
