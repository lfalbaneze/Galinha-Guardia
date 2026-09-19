// Drive real movement, fixed warning lanes and the shared interaction; no teleports during a fight.
function playChallenge(h, frames=2200) {
  h.run(`var dodgeTo=null,lastMode='',warningOrigin=[],seenTactics=new Set(),counterPresses=0;
    var challengeFrames=0,challengeClear=true;
    for(;challengeFrames<${frames}&&state.lake.active;challengeFrames++){
      if(g.mode==='warning'&&lastMode!=='warning'){
        const dx=g.target.x-g.anchor.x,dy=g.target.y-g.anchor.y,len=Math.hypot(dx,dy)||1;
        const choices=[1,-1].map(side=>({x:c.x-dy/len*95*side,y:c.y+dx/len*95*side}));
        dodgeTo=choices.find(p=>distance(p,g.home)<295&&WildlifeRules.clear(c,p,c.hitbox))||null;
        warningOrigin.push({x:g.x,y:g.y});seenTactics.add(g.tactic);
      }
      let destination=g.mode==='warning'?dodgeTo:null;
      if((state.lake.counterWindow||0)>0){
        if(LakeChallenge.canCounter(state)){LakeChallenge.interact(state);counterPresses++;}
        else {
          const route=WildlifeRules.clear(c,g,c.hitbox)?[g]:WolfAI.findPath(c,g);
          destination=route.find(p=>distance(c,p)>6)||g;
        }
      }else if(['approach','patrol','notice','recover'].includes(g.mode)&&distance(c,g)>135){
        const route=WolfAI.findPath(c,g);destination=route.find(p=>distance(c,p)>6)||null;
      }
      if(destination){const gap=distance(c,destination),step=Math.min(gap,state.settings.chickenSpeed*.05);
        if(gap>.01)Player.move(c,(destination.x-c.x)/gap*step,(destination.y-c.y)/gap*step);}
      lastMode=g.mode;updateGame(.05);
      challengeClear=challengeClear&&WildlifeRules.clear(c,c,c.hitbox)&&WildlifeRules.clear(g,g,g.hitbox);
    }`);
}
module.exports={playChallenge};
