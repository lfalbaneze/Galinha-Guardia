/* Contact-driven scenery. Transient effects never change the seeded map or a saved game. */
const EnvironmentSystem = (() => {
  type Surface = 'grass' | 'dirt' | 'water' | 'mud' | 'corn' | 'garden' | 'bridge' | 'sunflower';
  type Prop = Farm.Point & { type: string; w?: number; h?: number; variant?: number; blockingRect?: Farm.Rect };
  type Plant = { key: string; prop: Prop; root: Farm.Point; rx: number; ry: number };
  type Reaction = { plant: Plant; bend: number; age: number; shed: number };
  type Mark = Farm.Point & { kind: 'ripple' | 'wet' | 'mud'; age: number; life: number; size: number; heading: number };
  type Particle = Farm.Point & { z: number; vx: number; vy: number; vz: number; age: number; life: number; color: string; leaf: boolean; petal: boolean };
  type Scene = {
    layout: Farm.Layout; grid: Map<string, Plant[]>; reactions: Map<string, Reaction>;
    marks: Mark[]; particles: Particle[]; stride: number; wet: number; muddy: number;
    sound: number; noise: number; serial: number; last: Farm.Point | null; surface: Surface;
  };
  const scenes = new WeakMap<Farm.GameState, Scene>();
  const CELL = 128, FEET = 14;
  const soft = new Set(['corn', 'bush', 'tree', 'hay', 'flower', 'sunflower', 'wheat', 'reeds', 'crop', 'grass', 'clover']);
  const key = (p: Prop): string => `${p.type}:${p.x}:${p.y}`;
  const inside = (p: Farm.Point, r: Farm.Rect): boolean => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const ellipse = (p: Farm.Point, x: number, y: number, rx: number, ry: number): boolean => ((p.x-x)/rx)**2 + ((p.y-y)/ry)**2 <= 1;
  const reduced = (): boolean => typeof InterfaceMotion !== 'undefined' && InterfaceMotion.reduced;
  const feet = (p: Farm.Point): Farm.Point => ({ x: p.x, y: p.y + FEET });

  function initialize(game: Farm.GameState): void {
    const scene: Scene = { layout: WORLD.layout, grid: new Map(), reactions: new Map(), marks: [], particles: [],
      stride: 0, wet: 0, muddy: 0, sound: 0, noise: 0, serial: 0, last: null, surface: 'grass' };
    const props: Prop[] = [...FarmArt.getProps(scene.layout), ...(scene.layout.decorations || []).filter(p => p.type !== 'corn')];
    for (const prop of props) {
      if (!soft.has(prop.type)) continue;
      const large = ['tree', 'bush', 'hay'].includes(prop.type), trunk = prop.blockingRect;
      const root = large ? { x: prop.x + (prop.w || 0)/2,
        y: prop.type === 'tree' && trunk ? trunk.y + trunk.h : prop.y + (prop.h || 0)*.75 } : {x:prop.x,y:prop.y};
      const plant: Plant = { key: key(prop), prop, root,
        rx: large ? Math.max(25, (prop.w || 40)*.58) : prop.type === 'sunflower' ? 28 : prop.type === 'corn' ? 26 : 15,
        ry: large ? Math.max(24, (prop.h || 30)*.65) : prop.type === 'sunflower' ? 25 : prop.type === 'corn' ? 22 : 14 };
      for (let y=Math.floor((root.y-plant.ry)/CELL); y<=Math.floor((root.y+plant.ry)/CELL); y++)
        for (let x=Math.floor((root.x-plant.rx)/CELL); x<=Math.floor((root.x+plant.rx)/CELL); x++) {
          const cell = `${x}:${y}`, list = scene.grid.get(cell) || [];
          list.push(plant); scene.grid.set(cell,list);
        }
    }
    scenes.set(game,scene);
  }
  function sceneFor(game: Farm.GameState): Scene {
    if (scenes.get(game)?.layout !== WORLD.layout) initialize(game);
    return scenes.get(game)!;
  }
  function surfaceAt(game: Farm.GameState, p: Farm.Point): Surface {
    const layout = WORLD.layout, pond = layout.structures.pond;
    if (game.lake?.completed && inside(p, LakeChallenge.bridge())) return 'bridge';
    if (pond && ellipse(p,pond.x+pond.w/2,pond.y+pond.h/2,pond.w*.47,pond.h*.47)) return 'water';
    for (const h of layout.habitats || []) {
      if (h.kind !== 'water' && h.water && ellipse(p,h.water.x,h.water.y,19,10)) return 'water';
      if (ellipse(p,h.x,h.y,108,64)) {
        if (h.kind === 'water') return 'water';
        if (h.kind === 'mud') return 'mud';
      }
    }
    if(SunflowerSystem.contains(p))return 'sunflower';
    for (const plot of layout.plots || []) if (inside(p,plot)) {
      if (plot.kind === 'corn') return 'corn';
      if (plot.kind === 'garden') return 'garden';
    }
    if ([layout.paths,layout.lanes || [],layout.clearings || []].some(list => list.some(r => inside(p,r)))) return 'dirt';
    return 'grass';
  }
  function movementScale(game: Farm.GameState): number {
    const s = surfaceAt(game,feet(game.entities.chicken));
    const swim=SwimmingSystem.profile(game);
    const waterSpeed = swim.native ? .94 * SkinSystem.power(game.entities.chicken).swimSpeed : .56;
    return s === 'water' ? .78+(waterSpeed-.78)*swim.depth : s === 'mud' ? .84 : s === 'corn' || s === 'sunflower' ? .91 : 1;
  }
  function addMark(scene: Scene, p: Farm.Point, kind: Mark['kind'], size: number, heading=0): void {
    scene.marks.push({...p,kind,size,heading,age:0,life:kind === 'ripple' ? 1.15 : 3.4});
    if (scene.marks.length > 64) scene.marks.shift();
  }
  function scatter(scene: Scene, p: Farm.Point, count: number, color: string, leaf=false, height=0, petal=false): void {
    if (reduced()) count = Math.min(1,count);
    for (let i=0;i<count;i++) {
      // Local sequence, independent of map generation, animation and gameplay RNG.
      const n = ++scene.serial, a = n*2.39996, force = 13 + n%5*5;
      scene.particles.push({...p,x:p.x+Math.cos(a)*5,y:p.y+Math.sin(a)*3,z:height,
        vx:Math.cos(a)*force,vy:Math.sin(a)*force*.5,vz:leaf ? 8 : 36+n%4*9,
        age:0,life:petal ? 2.1 : leaf ? 1.6 : .48,color,leaf,petal});
    }
    if (scene.particles.length > 96) scene.particles.splice(0,scene.particles.length-96);
  }
  function contact(scene: Scene, p: Farm.Point, dx: number, force: number): boolean {
    let rustle = false;
    for (const plant of scene.grid.get(`${Math.floor(p.x/CELL)}:${Math.floor(p.y/CELL)}`) || []) {
      const proximity = ((p.x-plant.root.x)/plant.rx)**2 + ((p.y-plant.root.y)/plant.ry)**2;
      if (proximity > 1) continue;
      const type = plant.prop.type, old = scene.reactions.get(plant.key);
      const direction = Math.abs(p.x-plant.root.x)>4 ? Math.sign(plant.root.x-p.x) : Math.sign(dx) || 1;
      const bend = direction * force * Math.max(.28,1-Math.sqrt(proximity));
      const reaction: Reaction = old || {plant,bend,age:0,shed:0};
      reaction.bend = old ? old.bend*.35 + bend*.65 : bend; reaction.age=0;
      if (reaction.shed <= 0 && !['grass','clover'].includes(type)) {
        if(type==='crop') {
          if(force>1)scatter(scene,plant.root,1,'#aec95b',true,13);
          reaction.shed=.9;
        } else if(type==='sunflower') {
          // Brush leaves at body height. A quicker pass also shakes petals off the flower head.
          const height=61+(plant.prop.variant||0)*6;
          scatter(scene,plant.root,1,'#a8ba64',true,28);
          if(force>.5)scatter(scene,{x:plant.root.x+bend*height*.62,y:plant.root.y},force>1 ? 3 : 1,'#ffdb63',true,height,true);
          reaction.shed=1.1;
        } else {
          const tree = type === 'tree', straw = ['corn','wheat','hay'].includes(type);
          scatter(scene,tree ? plant.root : p,tree ? 3 : 2,straw ? '#d8bd69' : '#a8ba64',true,tree ? 82 : type==='bush' ? 25 : 14);
          reaction.shed = .8;
        }
      }
      scene.reactions.set(plant.key,reaction);
      rustle ||= ['corn','sunflower','bush','hay','wheat','reeds','crop'].includes(type);
    }
    // At most the last few seconds of nearby scenery are active.
    if (scene.reactions.size > 100) scene.reactions.delete(scene.reactions.keys().next().value!);
    return rustle;
  }
  function update(game: Farm.GameState, dt: number, previous: Farm.Point): void {
    if (game.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    const scene = sceneFor(game), c = game.entities.chicken, p = feet(c), from = feet(previous);
    scene.sound=Math.max(0,scene.sound-dt); scene.noise=Math.max(0,scene.noise-dt);
    scene.wet=Math.max(0,scene.wet-dt); scene.muddy=Math.max(0,scene.muddy-dt);
    for (const [id,r] of scene.reactions) { r.age+=dt;r.shed=Math.max(0,r.shed-dt);if(r.age>(r.plant.prop.type==='sunflower' ? 2.2 : 1.8))scene.reactions.delete(id); }
    for (const m of scene.marks) m.age+=dt;
    scene.marks=scene.marks.filter(m=>m.age<m.life);
    for (const q of scene.particles) {
      q.age+=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.z+=q.vz*dt;q.vz-=(q.leaf ? 65 : 170)*dt;
      if(q.z<0){q.z=0;q.vx*=Math.exp(-dt*16);q.vy*=Math.exp(-dt*16);q.vz=0;}
    }
    scene.particles=scene.particles.filter(q=>q.age<q.life);
    const gap=distance(p,from), discontinuous=scene.last && distance(scene.last,from)>24;
    scene.last={...p};scene.surface=surfaceAt(game,p);
    // No footsteps from teleports, menus, standing still, or pushing a solid wall.
    if(discontinuous || gap>Math.max(32,c.speed*dt*1.6) || dt>.25) {scene.stride=0;scene.wet=0;scene.muddy=0;return;}
    if(c.hidden || !c.moving || gap<.02) {scene.stride=0;return;}
    if(SwimmingSystem.depthAt(game,from)<=.15&&SwimmingSystem.depthAt(game,p)>.15) {
      addMark(scene,p,'ripple',1.5);scatter(scene,p,8,'#d0eee0');
      if(scene.sound<=0){AudioSystem.play('step-water',{volume:.42});scene.sound=.28;}
    }
    const force=c.sneaking ? .4 : c.sprinting ? 1.25 : .8;
    const steps=Math.max(1,Math.ceil(gap/8)), heading=Math.atan2(p.y-from.y,p.x-from.x);
    for(let i=1;i<=steps;i++) {
      const at={x:from.x+(p.x-from.x)*i/steps,y:from.y+(p.y-from.y)*i/steps};
      const surface=surfaceAt(game,at), rustle=contact(scene,at,p.x-from.x,force);
      scene.stride+=gap/steps;
      if(surface==='water'){scene.wet=2.8;scene.muddy=0;}
      else if(surface==='mud')scene.muddy=3.5;
      if(scene.stride < (c.sneaking ? 21 : 17)) continue;
      scene.stride%=c.sneaking ? 21 : 17;
      const side=(++scene.serial%2 ? 1 : -1)*5;
      const foot={x:at.x-Math.sin(heading)*side,y:at.y+Math.cos(heading)*side};
      if(surface==='water') {
        addMark(scene,at,'ripple',force);
        scatter(scene,at,c.sprinting ? 6 : c.sneaking ? 1 : 3,'#d0eee0');
      } else {
        if(scene.muddy>0)addMark(scene,foot,'mud',scene.muddy/3.5,heading);
        else if(scene.wet>0)addMark(scene,foot,'wet',scene.wet/2.8,heading);
        if(c.sprinting && ['dirt','garden'].includes(surface))scatter(scene,at,2,'#cbb17c');
      }
      const noisy=surface==='water'||surface==='mud'||surface==='corn'||rustle;
      if(noisy && scene.sound<=0) {
        const watery=surface==='water', muddy=surface==='mud';
        AudioSystem.play(watery ? 'step-water' : muddy ? 'step-mud' : 'step-leaves',
          {volume:(c.sneaking ? .13 : c.sprinting ? .42 : .25)*(surface==='garden'?.7:1)*SkinSystem.power(c).noiseScale});
        scene.sound=c.sneaking ? .5 : .28;
      }
      if(noisy && scene.noise<=0 && !game.lake?.active) {
        const radius=surface==='garden' ? (c.sneaking?24:c.sprinting?175:70) :
          c.sneaking ? 32 : c.sprinting ? (surface==='corn'||rustle ? 245 : 215) : 95;
        WolfAI.investigateSound(game,{...at},radius*SkinSystem.power(c).noiseScale);
        scene.noise=.8;
      }
    }
  }
  function disturbCover(game: Farm.GameState): void {
    if(game.phase!=='playing')return;
    // Hiding shifts leaves once, never broadcasts a hidden player's position.
    contact(sceneFor(game),feet(game.entities.chicken),game.entities.chicken.facing,.55);
  }
  function transform(context: CanvasRenderingContext2D, prop: Prop, game?: Farm.GameState): void {
    if(!game)return;
    const r=scenes.get(game)?.reactions.get(key(prop));
    if(!r || prop.type==='hay')return;
    const tree=prop.type==='tree', bush=prop.type==='bush', sunflower=prop.type==='sunflower',crop=prop.type==='crop';
    const bend=r.bend*Math.exp(-r.age*(sunflower ? 2.6 : 3.2))*(reduced() ? .3 : Math.cos(r.age*(sunflower ? 7 : 9)));
    // Shear around the root: foliage yields, but the trunk/roots stay planted.
    const shear=-bend*(tree ? .045 : bush ? .23 : sunflower ? .62 : crop ? .22 : .55), root=r.plant.root;
    context.translate(root.x,root.y);context.transform(1,0,shear,1,0,0);context.translate(-root.x,-root.y);
  }
  function drawGround(game: Farm.GameState): void {
    const scene=scenes.get(game);if(!scene)return;
    ctx.save();ctx.translate(-camera.x+camera.shakeX,-camera.y+camera.shakeY);
    for(const m of scene.marks) {
      const t=m.age/m.life;
      ctx.save();ctx.translate(m.x,m.y);ctx.globalAlpha=(1-t)*(m.kind==='ripple' ? .7 : .35)*m.size;
      if(m.kind==='ripple') {
        // Rings stop at the bank instead of spilling onto the grass.
        ctx.beginPath();
        const pond=scene.layout.structures.pond;
        if(pond){ctx.ellipse(pond.x+pond.w/2-m.x,pond.y+pond.h/2-m.y,pond.w*.47,pond.h*.47,0,0,Math.PI*2);}
        for(const h of scene.layout.habitats || []) {
          const p=h.kind==='water' ? h : h.water;
          if(!p)continue;
          const rx=h.kind==='water' ? 108 : 19,ry=h.kind==='water' ? 64 : 10;
          ctx.moveTo(p.x-m.x+rx,p.y-m.y);ctx.ellipse(p.x-m.x,p.y-m.y,rx,ry,0,0,Math.PI*2);
        }
        ctx.clip();
        const radius=4+t*(reduced() ? 8 : 23)*m.size;
        ctx.strokeStyle='#daf2d9';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,0,radius,radius*.36,0,0,Math.PI*2);ctx.stroke();
        if(t>.25){ctx.globalAlpha*=.5;ctx.beginPath();ctx.ellipse(0,0,radius*.64,radius*.22,0,0,Math.PI*2);ctx.stroke();}
      } else {
        ctx.rotate(m.heading);ctx.strokeStyle=m.kind==='mud' ? '#513f2c' : '#40665a';ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(-3,0);ctx.lineTo(3,0);
        for(const y of [-3,3]){ctx.moveTo(0,0);ctx.lineTo(3,y);}ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }
  function drawFeet(game: Farm.GameState): void {
    const c=game.entities.chicken;if(c.hidden || SwimmingSystem.profile(game).depth>0 || surfaceAt(game,feet(c))!=='water')return;
    const p=worldToScreen(feet(c));ctx.save();
    ctx.fillStyle='#91c7be99';ctx.beginPath();ctx.ellipse(p.x,p.y,13,4,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#d5e9cd';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(p.x,p.y,15,5,0,0,Math.PI);ctx.stroke();ctx.restore();
  }
  function drawAir(game: Farm.GameState): void {
    for(const q of scenes.get(game)?.particles || []) {
      const p=worldToScreen(q);ctx.save();ctx.translate(p.x,p.y-q.z);ctx.globalAlpha=Math.min(1,(q.life-q.age)*3);
      ctx.fillStyle=q.color;
      if(q.petal){ctx.rotate(reduced() ? 0 : q.age*3);ctx.fillRect(-3,-1,6,3);ctx.fillRect(-1,-2,3,5);ctx.fillStyle='#efbb36';ctx.fillRect(-2,0,4,1);}
      else if(q.leaf){ctx.rotate(reduced() ? 0 : q.age*4);ctx.fillRect(-3,-1,6,3);ctx.fillStyle='#657b3d';ctx.fillRect(-1,-1,3,1);}
      else ctx.fillRect(-1,-2,2,3);
      ctx.restore();
    }
  }
  function hint(game: Farm.GameState): string | null {
    const swim=SwimmingSystem.hint(game);if(swim)return swim;
    const s=surfaceAt(game,feet(game.entities.chicken));
    if(s==='water')return 'Pé de galinha, modo pato. A água corta a trilha, mas correr faz um baita splosh!';
    if(s==='mud')return 'Spa de barro! Passo mais lento e pegadas de brinde.';
    if(s==='corn')return 'O milho é fofoqueiro: vá de mansinho para não chamar o lobo.';
    if(s==='garden')return 'Devagar com a salada! De mansinho, as folhas fazem menos barulho.';
    if(s==='sunflower')return 'Girassol bonito, companhia duvidosa… Se as flores sacudirem, saia para o lado!';
    return null;
  }
  function inspect(game: Farm.GameState): {surface:Surface;marks:Mark[];particles:number;reactions:{key:string;age:number;bend:number}[]} {
    const s=sceneFor(game);
    return {surface:s.surface,marks:s.marks.map(m=>({...m})),particles:s.particles.length,
      reactions:[...s.reactions].map(([key,r])=>({key,age:r.age,bend:r.bend}))};
  }
  return {initialize,surfaceAt,movementScale,update,disturbCover,transform,drawGround,drawFeet,drawAir,hint,inspect};
})();
