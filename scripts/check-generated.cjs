// Fail when tracked browser scripts no longer match their TypeScript sources.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const configFile = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
const format = errors => ts.formatDiagnosticsWithColorAndContext(errors, {
  getCanonicalFileName: file => file,
  getCurrentDirectory: () => root,
  getNewLine: () => '\n',
});
if (configFile.error) { console.error(format([configFile.error])); process.exit(1); }
const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root);
if (config.errors.length) { console.error(format(config.errors)); process.exit(1); }
const program = ts.createProgram(config.fileNames, config.options);
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) { console.error(format(diagnostics)); process.exit(1); }
const stale = [];
let files = 0;
const result = program.emit(undefined, (file, content) => {
  files++;
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : null;
  if (current !== content.replace(/\r\n/g, '\n')) stale.push(path.relative(root, file));
});
if (result.emitSkipped || result.diagnostics.length) {
  console.error(format(result.diagnostics)); process.exit(1);
}
if (!files) { console.error('No browser scripts were compiled. Check tsconfig.json.'); process.exit(1); }
if (stale.length) {
  console.error(`Browser scripts are out of date: ${stale.join(', ')}. Run npm run compile and commit the outputs.`);
  process.exit(1);
}
console.log(`${files} browser scripts match their TypeScript sources.`);
