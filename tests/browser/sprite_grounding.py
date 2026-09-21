"""Check actual installed sprites, then save a before/after grounding contact sheet."""
import json
import os
import sys
from pathlib import Path

_seen_protocols = set()

def check_sprite_grounding(page):
    protocol = page.url.split(':', 1)[0]
    if protocol in _seen_protocols:
        return
    root = Path(__file__).resolve().parents[2]
    kind = 'wildlife' if 'wildlife' in Path(sys.argv[0]).stem else 'lake'
    out = Path(os.environ.get(kind.upper() + '_SCREENSHOTS', root / '.cache' / (kind + '-review')))
    out.mkdir(parents=True, exist_ok=True)
    result = page.evaluate("""() => {
      const probe=document.createElement('canvas');probe.width=240;probe.height=240;
      const c=probe.getContext('2d',{willReadFrequently:true});
      // file:// can draw local PNGs but cannot read the resulting canvas. Track
      // the actual destination transform against baked, independently tested ink.
      const offline=location.protocol==='file:';let activeFrame=null,drawnBottom=0;
      const draw=c.drawImage.bind(c);
      c.drawImage=(...args)=>{
        if(offline){
          if(!activeFrame?.grounding||args.length!==9)throw Error('Missing offline foot bounds');
          const m=c.getTransform();drawnBottom=m.f+m.d*(args[6]+activeFrame.grounding.bottom*args[8]);
        }
        return draw(...args);
      };
      function bottom(){if(offline)return Math.round(drawnBottom);
        const data=c.getImageData(0,0,240,240).data;
        for(let y=239;y>=0;y--)for(let x=0;x<240;x++)if(data[(y*240+x)*4+3]>=128)return y+1;return 0;}
      const cases=[];let maxOldGap=0,maxNewGap=0,checked=0;
      for(const name of ['donkey','wolf','chicken','dog','cat','cow','goose']){
        let worst={gap:-Infinity,options:null};
        for(const direction of CharacterArt.directions)for(const mood of ['normal','furious','scared'])for(let i=0;i<12;i++){
          const options={direction,mood,anim:(i+.1)/3,moving:true,sprinting:true,shadow:false};
          activeFrame=CharacterArt.frameFor(name,options).frame;
          c.clearRect(0,0,240,240);CharacterArt.draw(c,name,120,186,{...options,grounded:false});
          const gap=200-bottom();if(gap>worst.gap)worst={gap,options};maxOldGap=Math.max(maxOldGap,gap);
          c.clearRect(0,0,240,240);CharacterArt.draw(c,name,120,186,options);
          const error=Math.abs(200-bottom());maxNewGap=Math.max(maxNewGap,error);checked++;
          if(error>1)throw Error(`${name}/${mood}/${direction}/${i}: paw gap ${error}px`);
        }
        cases.push({name,...worst});
      }
      const board=document.createElement('canvas');board.id='spriteGroundingReview';board.width=1260;board.height=380;
      board.style.cssText='position:fixed;left:0;top:0;z-index:2147483647;width:1260px;height:380px;';
      document.body.append(board);const b=board.getContext('2d');
      b.fillStyle='#78944f';b.fillRect(0,0,1260,380);
      for(let row=0;row<2;row++){
        b.fillStyle='#fdf4d1';b.font='bold 18px sans-serif';
        b.fillText(row?'AGORA: patas apoiadas no chão':'ANTES: referência única do atlas',20,row*190+28);
        for(let i=0;i<cases.length;i++){
          const item=cases[i],x=90+i*180,y=155+row*190;
          Sunlight.begin(12);Sunlight.actor('animal');
          CharacterArt.draw(b,item.name,x,y-14,{...item.options,shadow:true,grounded:row===1});Sunlight.end();
          b.fillStyle='#fdf4d1';b.font='13px sans-serif';b.textAlign='center';
          b.fillText(item.name+(row?'':` (${Math.round(item.gap)} px)`),x,y+22);b.textAlign='left';
        }
      }
      return {checked,maxOldGap,maxNewGap,cases:cases.map(({name,gap})=>({name,oldGap:gap}))};
    }""")
    try:
        page.locator('#spriteGroundingReview').screenshot(path=str(out / ('sprite-grounding-' + protocol + '.png')))
    finally:
        page.evaluate("document.getElementById('spriteGroundingReview')?.remove()")
    assert result['maxNewGap'] <= 1, result
    (out / ('sprite-grounding-' + protocol + '.json')).write_text(json.dumps(result, indent=2), encoding='utf-8')
    print('Sprite grounding:', json.dumps(result))
    _seen_protocols.add(protocol)
