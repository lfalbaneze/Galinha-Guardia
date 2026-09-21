const path=require('node:path');
const {buildData}=require('./lib/pixellab-import.cjs');
console.log(`PixelLab: ${buildData(path.resolve(__dirname,'..'))} personagens instalados.`);
