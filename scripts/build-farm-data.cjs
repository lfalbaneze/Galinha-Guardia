// Embed the unmodified atlas so color-key decoding also works without an HTTP server.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const bytes=fs.readFileSync(path.join(root,'assets/farm/farm-atlas.png'));
const nursery=fs.readFileSync(path.join(root,'assets/farm/chick-nursery.png'));
const habitats=fs.readFileSync(path.join(root,'assets/farm/farm-habitats.png'));
const props=fs.readFileSync(path.join(root,'assets/farm/farm-props.png'));
const meadow=fs.readFileSync(path.join(root,'assets/farm/meadow-details.png'));
const cohesive=fs.readFileSync(path.join(root,'assets/farm/farm-cohesive-v2.png'));
fs.writeFileSync(path.join(root,'assets/farm/atlas-data.js'),
  '/* Original generated atlas; decoded by FarmSprites. */\nconst FarmAtlasData = '+
  JSON.stringify('data:image/png;base64,'+bytes.toString('base64'))+';\nconst FarmNurseryData = '+
  JSON.stringify('data:image/png;base64,'+nursery.toString('base64'))+';\nconst FarmHabitatData = '+
  JSON.stringify('data:image/png;base64,'+habitats.toString('base64'))+';\nconst FarmPropData = '+
  JSON.stringify('data:image/png;base64,'+props.toString('base64'))+';\nconst FarmMeadowData = '+
  JSON.stringify('data:image/png;base64,'+meadow.toString('base64'))+';\nconst FarmCohesiveData = '+
  JSON.stringify('data:image/png;base64,'+cohesive.toString('base64'))+';\n');
console.log('Embedded the original farm atlas for offline loading.');
