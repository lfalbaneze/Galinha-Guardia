'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const digest = '6a0726e42a4653f639a18a6cc3a5235df819370aa1e9c5cd6029d5db4a020551';
const bytes = Buffer.concat(['part-1','part-2'].map(name => fs.readFileSync(path.join('.goose-payload',name))));
if (crypto.createHash('sha256').update(bytes).digest('hex') !== digest) throw Error('Feature bundle checksum mismatch');
const data = JSON.parse(zlib.gunzipSync(bytes).toString('utf8'));
function checkedPath(name) {
  if (typeof name !== 'string' || name.includes('\\') || path.isAbsolute(name) || name.split('/').some(p=>!p||p==='.'||p==='..') || name === '.git' || name.startsWith('.git/')) throw Error('Invalid feature path');
  return name;
}
function gitBlob(bytes) {
  return crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
}
const output = new Map();
for (const [name,sha] of Object.entries(data.expected)) {
  checkedPath(name);
  const original = fs.readFileSync(name);
  if (gitBlob(original) !== sha) throw Error(`Source changed before feature integration: ${name}`);
  let text = original.toString('utf8').replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
  for (const edit of data.patches.filter(edit=>edit.path===name)) {
    if (!edit.before || text.split(edit.before).length !== 2) throw Error(`Patch is not unique: ${name}`);
    text = text.replace(edit.before, () => edit.after);
  }
  if (original.includes(Buffer.from('\r\n'))) text = text.replace(/\n/g,'\r\n');
  if (original.subarray(0,3).equals(Buffer.from([0xef,0xbb,0xbf]))) text = '\uFEFF'+text;
  output.set(name,text);
}
for (const edit of data.patches) if (!Object.hasOwn(data.expected,edit.path)) throw Error('Patch missing baseline checksum');
for (const [name,text] of Object.entries(data.files)) {
  checkedPath(name);
  if (fs.existsSync(name)) throw Error(`New file already exists: ${name}`);
  output.set(name,text);
}
output.set('.goose-browser-check.py',data.browserCheck);
for (const [name,text] of output) {
  fs.mkdirSync(path.dirname(name),{recursive:true});
  fs.writeFileSync(name,text,'utf8');
}
console.log(`Applied ${data.patches.length} checked edits and ${Object.keys(data.files).length} new source/test files.`);
