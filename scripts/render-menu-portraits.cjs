// Review the actual menu assets at their CSS sizes, on both card backgrounds.
const fs = require('node:fs');
const path = require('node:path');
const {createCanvas, loadImage} = require('@napi-rs/canvas');
const root = path.resolve(__dirname, '..');
async function main() {
  const canvas = createCanvas(1000, 640), ctx = canvas.getContext('2d');
  const art = await require('./sprite-loader.cjs').loadArt();
  const portraits = await Promise.all(['chick','carijo-face','wolf-expressivo'].map(name => loadImage(path.join(root,'assets/menu/portraits',name+'.png'))));
  const mascot = await loadImage(path.join(root,'assets/menu/portraits/carijo.png'));
  ctx.fillStyle = '#f1ead6'; ctx.fillRect(0,0,1000,640);
  ctx.fillStyle = '#294b36'; ctx.font = 'bold 30px Arial'; ctx.fillText('Penas pro Ar! · Retratos do menu',32,48);
  ctx.font = '16px Arial'; ctx.fillStyle = '#715b3d'; ctx.fillText('Comparação dos ícones no tamanho usado pelos botões',32,80);
  const names = ['Dia tranquilo','Penas em risco','Lobo à solta'];
  const notes = ['Lobo com preguiça. Explore sem pressa.','Lobo de olho no almoço. Resgate a turma.','Lobo de tênis novo. Capriche no sumiço.'];
  for (let i=0;i<3;i++) {
    const y=143+i*126;
    ctx.fillStyle='#715b3d';ctx.font='14px Arial';ctx.fillText('Antes',32,y-12);
    ctx.fillStyle='#fff8e5';ctx.beginPath();ctx.roundRect(28,y,116,94,8);ctx.fill();
    const old = createCanvas(64,64), oc = old.getContext('2d');
    const name=['chick','chicken','wolf'][i],direction=i===2?'right':'down',frame=art.frameFor(name,{direction});
    const scale=Math.min(50/(frame.pose.width*frame.scale),44/((frame.pose.bottom-frame.pose.top)*frame.scale));
    art.draw(oc,name,32,53-14*scale,{direction,moving:false,scale});
    ctx.imageSmoothingEnabled=false;ctx.drawImage(old,62,y+23,48,48);
    ctx.fillStyle='#715b3d';ctx.font='14px Arial';ctx.fillText('Agora · 64 px',180,y-12);
    ctx.fillStyle=i===1?'#365e42':'#fff8e5';ctx.beginPath();ctx.roundRect(175,y,468,94,8);ctx.fill();
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(portraits[i],189,y+15,64,64);
    ctx.fillStyle=i===1?'#fff7dd':'#503f2a';ctx.font='bold 18px Arial';ctx.fillText(names[i],268,y+36);
    ctx.font='13px Arial';ctx.fillText(notes[i],268,y+62);
  }
  ctx.fillStyle='#fff1cc';ctx.beginPath();ctx.roundRect(688,132,282,434,12);ctx.fill();
  ctx.drawImage(mascot,858,149,86,96);
  ctx.fillStyle='#a13d23';ctx.font='bold 11px Arial';ctx.fillText('O TERREIRO TE ESPERA',708,167);
  ctx.fillStyle='#6f4026';ctx.font='bold 24px Arial';ctx.fillText('De volta ao',708,204);ctx.fillText('terreiro!',708,234);
  ctx.fillStyle='#715b3d';ctx.font='15px Arial';ctx.fillText('Retrato no cabeçalho',708,286);
  ctx.font='14px Arial';ctx.fillText('Mesmo arquivo, sem esticar',708,316);ctx.fillText('ou cortar a crista.',708,338);
  ctx.drawImage(portraits[0],716,384,56,56);ctx.drawImage(portraits[1],798,384,56,56);ctx.drawImage(portraits[2],880,384,56,56);
  ctx.fillStyle='#715b3d';ctx.fillText('56 px · telas pequenas',708,473);
  ctx.font='13px Arial';ctx.fillText('PNG com transparência real.',708,523);
  ctx.fillStyle='#715b3d';ctx.font='14px Arial';ctx.fillText('Prancha de revisão dos arquivos; não é uma captura do navegador.',32,610);
  fs.writeFileSync(path.join(root,'preview/menu-portraits.png'),canvas.toBuffer('image/png'));
  console.log('preview/menu-portraits.png');
}
main().catch(error => { console.error(error); process.exitCode=1; });
