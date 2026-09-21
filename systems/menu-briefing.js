/* A dedicated group illustration welcomes the player; portraits show the equipped cast. */
const MenuBriefing = (() => {
  let signature = '';
  function surface(id) {
    const canvas = document.getElementById(id), c = canvas?.getContext('2d');
    if (!c) return null;
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.imageSmoothingEnabled = false;
    return c;
  }
  function actor(c, name, x, feet, height, options = {}) {
    const frame = CharacterArt.frameFor(name, options);
    if (!frame) return;
    const scale = Math.min(height / ((frame.pose.bottom - frame.pose.top) * frame.scale),
      (options.maxWidth || Infinity) / (frame.pose.width * frame.scale));
    CharacterArt.draw(c, name, x, feet - 14 * scale, {...options,scale,moving:false,shadow:false});
  }
  function portrait(id, name, height, options = {}) {
    const c = surface(id);
    if (c) actor(c, name, c.canvas.width/2, c.canvas.height-10, height, options);
  }
  function render(game, mode) {
    if (![CharacterArt,ThorArt,GooseArt,FarmSprites].every(a=>a.ready)) return;
    const difficulty=['easy','normal','hard','hardcore'].includes(mode)?mode:'normal';
    const landscape=document.querySelector(`.journey-landscape[data-difficulty="${difficulty}"]`);
    const backgroundReady=landscape?.complete&&landscape.naturalWidth>0;
    const skin = game.entities.chicken.skin || 'classic', next = `${skin}:${mode}:${game.worldSeed}:${FarmSprites.cohesiveReady}:${backgroundReady}`;
    if (signature === next) return;
    signature = next;
    const c = surface('journeyCast');
    if (c) {
      // Preserve the complete PixelLab composition and its original aspect ratio.
      if(backgroundReady)c.drawImage(landscape,0,0,c.canvas.width,c.canvas.height);
      else {c.fillStyle='#18322b';c.fillRect(0,0,c.canvas.width,c.canvas.height);}
    }
    portrait('difficultyArt-easy','chick',59,{direction:'right'});
    portrait('difficultyArt-normal','chicken',74,{skin:'classic',direction:'down'});
    portrait('difficultyArt-hard','wolf',69,{direction:'left'});
    portrait('difficultyArt-hardcore','wolf',78,{direction:'left',mood:'furious'});
    portrait('journeyChick','chick',53,{direction:'right'});
    portrait('journeyPlayer','chicken',66,{skin,direction:'right'});
    const thor = surface('journeyThor');
    if (thor) ThorArt.drawHero(thor,40,73,66,'down',0);
    const panto = surface('journeyPanto');
    if (panto) GooseArt.draw(panto,{x:40,y:59,direction:'down',mode:'patrol',moving:false,anim:0,activity:'idle'},{x:0,y:0});
  }
  return {render,portrait};
})();
