/* Pixel-drawn resident goose: no remote images or extra loading step. */
const GooseArt = (() => {
  function draw(context: CanvasRenderingContext2D, goose: Farm.Goose, view: Farm.Camera): void {
    const c = context;
    const x = Math.round(goose.x - view.x + (view.shakeX || 0));
    const y = Math.round(goose.y - view.y + (view.shakeY || 0));
    const flap = goose.mode === 'warning' || goose.mode === 'charge';
    const stride = InterfaceMotion.reduced || !goose.moving ? 0 : Math.sin(goose.anim) * 2;
    c.save(); c.translate(x, y);
    c.fillStyle = '#23352944'; c.beginPath(); c.ellipse(0, 13, 22, 7, 0, 0, Math.PI * 2); c.fill();
    c.scale(2, 2); c.imageSmoothingEnabled = false;
    const paint = (color: string, boxes: number[][]): void => {
      c.fillStyle = color;
      for (const [rx, ry, w, h] of boxes) c.fillRect(Math.round(rx), Math.round(ry), w, h);
    };
    const outline = '#554d3d', shade = '#b6c9c2', white = '#fff9e5', light = '#e2e8da', orange = '#ee9b36';
    paint('#b86728', [[-6, 6 + stride, 3, 3], [4, 6 - stride, 3, 3]]);
    paint(orange, [[-8, 8 + stride, 6, 2], [3, 8 - stride, 6, 2]]);
    if (goose.direction === 'left' || goose.direction === 'right') {
      if (goose.direction === 'left') c.scale(-1, 1);
      paint(outline, [[-14, -4, 4, 6], [-11, -9, 17, 15], [-8, -11, 11, 3], [3, -7, 7, 11]]);
      paint(white, [[-12, -3, 4, 4], [-9, -8, 14, 12], [-6, -9, 9, 2], [3, -5, 5, 7]]);
      paint(light, [[-8, 1, 12, 3], [-10, -4, 8, 5]]);
      paint(shade, [[-6, -4, 9, 1], [-7, -3, 2, 3], [-4, 0, 6, 1]]);
      if (flap) {
        paint(outline, [[-10, -16, 4, 8], [-6, -13, 4, 8], [-2, -10, 4, 6], [-14, -19, 4, 6]]);
        paint(white, [[-12, -18, 2, 4], [-9, -15, 2, 6], [-5, -12, 2, 6], [-1, -9, 2, 4]]);
      }
      const reach = goose.mode === 'charge' ? 4 : 0;
      const drop = goose.mode === 'charge' ? 6 : 0;
      paint(outline, [[4, -19 + drop, 6 + reach, 15 - drop], [6 + reach, -27 + drop, 11, 11], [16 + reach, -23 + drop, 7, 5]]);
      paint(light, [[5, -18 + drop, 4 + reach, 12 - drop]]);
      paint(white, [[7 + reach, -26 + drop, 8, 9], [8, -17 + drop, 2 + reach, 11 - drop]]);
      paint(orange, [[17 + reach, -22 + drop, 7, 3], [18 + reach, -19 + drop, 4, 1]]);
      paint('#302f2b', [[13 + reach, -23 + drop, 2, 2], [19 + reach, -22 + drop, 1, 1]]);
      if (flap) paint(outline, [[12 + reach, -25 + drop, 4, 1]]);
    } else {
      paint(outline, [[-10, -8, 20, 11], [-8, -11, 16, 17], [-5, 5, 10, 2]]);
      paint(white, [[-8, -7, 16, 10], [-6, -10, 12, 15]]);
      paint(light, [[-8, -5, 3, 8], [5, -5, 3, 8], [-4, 3, 8, 2]]);
      if (flap) {
        paint(outline, [[-15, -13, 6, 8], [-19, -17, 5, 7], [9, -13, 6, 8], [14, -17, 5, 7]]);
        paint(white, [[-14, -12, 4, 5], [-18, -16, 3, 4], [10, -12, 4, 5], [15, -16, 3, 4]]);
      }
      paint(outline, [[-4, -20, 8, 17], [-6, -28, 12, 11]]);
      paint(shade, [[-3, -19, 6, 14]]);
      paint(white, [[-5, -27, 10, 9], [-2, -18, 4, 14]]);
      if (goose.direction === 'down') {
        paint('#302f2b', [[-4, -24, 2, 2], [2, -24, 2, 2]]);
        paint(orange, [[-3, -21, 6, 4], [-2, -17, 4, 1]]);
        if (flap) paint(outline, [[-4, -26, 3, 1], [1, -26, 3, 1]]);
      } else paint(light, [[-4, -26, 2, 7], [-2, -18, 1, 12]]);
    }
    c.restore();
  }
  return { draw };
})();
