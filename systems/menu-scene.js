/* A little comedy troupe for the title screen; never touches the saved simulation. */
const MenuScene = (() => {
  function shuffled(values) {
    const result=[...values];
    for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
    return result;
  }
  // One draw per page load: reopening the menu never replaces a walking actor.
  const largeGuests=new Set(['cow','horse','donkey']);
  const guests=[];
  for(const species of shuffled(['sheep','pig','duck','rabbit','dog','cat','goat','lamb','turkey','cow','horse','donkey'])){
    if(largeGuests.has(species)&&guests.some(s=>largeGuests.has(s)))continue;
    guests.push(species);if(guests.length===5)break;
  }
  const large=guests.findIndex(s=>largeGuests.has(s));
  if(large>0)[guests[0],guests[large]]=[guests[large],guests[0]];
  const headings=['down','downleft','left','upleft','up','upright','right','downright'];
  const herd = [
    { species: 'sheep', route: [[780,721],[809,746],[843,766],[866,782]], pace: 26, phase: .3 },
    { species: 'pig', route: [[1015,791],[1064,805],[1130,811],[1190,795]], pace: 25, phase: 2.1 },
    { species: 'duck', route: [[795,795],[834,818],[872,821]], pace: 31, phase: 4.7 },
    { species: 'rabbit', route: [[1000,859],[1064,850],[1120,831]], pace: 36, phase: 1.2 },
    { species: 'chicken', route: [[674,813],[713,837],[770,850]], pace: 30, phase: 3.3 },
    { species: 'dog', route: [[831,891],[899,878],[957,859]], pace: 29, phase: 5.6 }
  ].map(animal => {
    const species=animal.species==='chicken'?'chicken':guests.shift();
    const phase=Math.random()*Math.PI*2;
    // Sample gentle curves once; distance along them drives both feet and stride.
    const route = [animal.route[0]];
    for (let i=0;i<animal.route.length-1;i++) {
      const p0=animal.route[Math.max(0,i-1)],p1=animal.route[i],p2=animal.route[i+1],p3=animal.route[Math.min(animal.route.length-1,i+2)];
      for(let j=1;j<=24;j++) {
        const t=j/24,t2=t*t,t3=t2*t;
        route.push([0,1].map(k=>.5*(2*p1[k]+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t3)));
      }
    }
    const lengths = route.slice(1).map((point, i) => Math.hypot(point[0] - route[i][0], point[1] - route[i][1]));
    const length = lengths.reduce((sum, value) => sum + value, 0);
    return { ...animal, species, phase, route, lengths, length, speech: {}, travel: phase / (Math.PI * 2) * length * 2,
      speed:0, pause:.15+Math.random()*.6, stride:phase, moving:false, direction:headings[Math.floor(Math.random()*headings.length)] };
  });
  const calls = { sheep: 'Mééé!', lamb:'Méé!', goat:'Bééé!', cow:'Muuu!', horse:'Hiii!', donkey:'Ió-ió!', turkey:'Glu-glu!', pig: 'Oinc!', duck: 'Quá-quá!', rabbit: 'Croc-croc!', chicken: 'Có-có-có!', dog: 'Au-au!', cat: 'Miau!', goose: 'Honk-honk!', owl:'Huu-huu!', wolf:'Auu!', chick:'Piu-piu!' };
  const { voices, diets, foods, palette } = MenuCharacterData;
  const stunts = ['tumble','dance','jump','spin'];
  const order = ['chicken', ...herd.filter(a=>a.species!=='chicken').map(a=>a.species)];
  const sketches = new Set(['sneeze','race','gossip','parade','snack','secret']);
  const tricks = ['tumble', 'sneeze', 'race', 'gossip', 'dance', 'parade', 'jump', 'spin'];
  let canvas, world, button, foodButton, secretButton, caption, captionLink, screen, context, playHint, invitation;
  let captionSpot = null;
  let turn = 0, sequence = 0, routine = null, speaker = null, currentGame = null;
  let signature = '', active = false, reduced = false, idle = 0, nextShow = 5.5, equipped = '', pointer = null;
  let width = 0, height = 0, pixelRatio = 1, resizeDirty = true;
  let secretTaps = 0;
  function cast() { return routine?.extras ? [...herd,...routine.extras] : herd; }

  // Feet stay on paths painted in farm-title.png; cover/crop matches the backdrop.
  function projection(w, h) {
    const scale = Math.max(w / 1536, h / 1024) * 1.12;
    return { scale, x: (w - 1536 * scale) * .42, y: h - 1024 * scale };
  }
  function actorScale(y, view) { return view.scale * (.8 + (y - 640) / 600) * 1.22; }
  function walk(animal, dt) {
    if (routine?.kind==='snack') {
      const before=position(animal), total=animal.length*2, meal=routine.meals.get(animal);
      let traveled=0;
      for(let remaining=dt;remaining>0;){
        const step=Math.min(1/120,remaining);remaining-=step;
        const delta=(meal.travel-animal.travel%total+total*1.5)%total-total/2;
        const target=animal.pace*1.8*Math.min(1,Math.abs(delta)/18);
        animal.speed+=(target-animal.speed)*(1-Math.exp(-6*step));
        const distance=Math.min(Math.abs(delta),animal.speed*step);traveled+=distance;
        animal.travel=(animal.travel+Math.sign(delta)*distance+total)%total;
        animal.stride=CharacterArt.advance(animal.stride,animal.species,distance,{...appearance(animal),speed:animal.speed});
      }
      animal.moving=traveled>.01;
      const after=position(animal);
      animal.direction=CharacterArt.directionFor(animal.direction,animal.moving?after.x-before.x:meal.point.x+28-after.x,animal.moving?after.y-before.y:meal.point.y+18-after.y);
      if(routine.age>.7 && Math.hypot(after.x-meal.point.x,after.y-meal.point.y)<6)meal.eaten=Math.min(1,meal.eaten+dt/2.1);
      return;
    }
    // Small steps keep acceleration and endpoint pauses consistent at 30–144 Hz.
    for(let remaining=dt;remaining>0;) {
      const step=Math.min(1/120,remaining);remaining-=step;
      animal.pause=Math.max(0,animal.pause-step);
      // Ignore rounding dust at an endpoint, otherwise the pause restarts forever.
      const nextEnd=(Math.floor((animal.travel+1e-7)/animal.length)+1)*animal.length;
      const distance=nextEnd-animal.travel;
      const racing=routine?.kind==='race' && routine.age>=.7 && routine.age<3.3 && (routine.lead===animal||routine.partner===animal);
      const secretRun=routine?.kind==='secret'&&animal.cameo&&routine.age>=(animal.cameo==='wolf'?1.4:2.1);
      const target=animal.pause>0 || !(racing||secretRun)&&(speaker===animal||participating(animal)) ? 0 : animal.pace*(racing?2.1:1)*Math.min(1,.16+distance/24);
      animal.speed+=(target-animal.speed)*(1-Math.exp(-6*step));
      const advance=animal.speed*step;
      if(advance>=distance) {
        animal.travel+=distance;animal.stride=CharacterArt.advance(animal.stride,animal.species,distance,{...appearance(animal),speed:animal.speed});
        if(racing)routine.distances.set(animal,(routine.distances.get(animal)||0)+distance);
        animal.speed=0;animal.pause=.65+animal.phase*.12;
      } else { animal.travel+=advance;animal.stride=CharacterArt.advance(animal.stride,animal.species,advance,{...appearance(animal),speed:animal.speed});
        if(racing)routine.distances.set(animal,(routine.distances.get(animal)||0)+advance); }
    }
    animal.moving=animal.speed>1;
    if(animal.moving)animal.direction=position(animal).direction;
  }
  function position(animal) {
    const cycle = animal.travel % (animal.length * 2), forward = cycle < animal.length;
    let remaining = forward ? cycle : animal.length * 2 - cycle, segment = 0;
    while (segment < animal.lengths.length - 1 && remaining > animal.lengths[segment]) remaining -= animal.lengths[segment++];
    const a = animal.route[segment], b = animal.route[segment + 1], amount = remaining / animal.lengths[segment];
    const sign = forward ? 1 : -1, dx = (b[0] - a[0]) * sign, dy = (b[1] - a[1]) * sign;
    return { x: a[0] + (b[0] - a[0]) * amount, y: a[1] + (b[1] - a[1]) * amount,
      direction: CharacterArt.directionFor(animal.direction,dx,dy) };
  }
  function resetParallax() { if (world) world.style.transform = 'scale(1.025)'; }
  function appearance(animal) { return animal.species === 'chicken' ? { skin: currentGame?.entities.chicken.skin || 'classic' } : {}; }
  function identity(animal) {
    if(animal.cameo)return {species:animal.species,voice:'secret-'+animal.cameo,name:animal.name};
    const skin=CharacterArt.appearances[currentGame?.entities.chicken.skin]?currentGame.entities.chicken.skin:'classic';
    const selected = animal.species === 'chicken' ? CharacterArt.appearances[skin] : null;
    const original = selected?.species || animal.species;
    const species = ['hen-silkie', 'hen-blue'].includes(original) ? 'chicken' : original;
    return { species, voice:selected?'skin-'+skin:animal.species, name: selected?.name || RescueSystem.names[species] || 'Amigo da fazenda' };
  }
  function dialogueFor(animal, stage) {
    const who=identity(animal), profile=voices[who.voice], kind=routine.kind;
    if(kind==='secret'){
      const text=MenuCharacterData.secret[animal.cameo][stage];
      return {key:who.voice+':'+stage,raw:text,text};
    }
    const stunt=stunts.indexOf(kind), opening=stunt>=0&&stage===0;
    const key=who.voice+':'+(opening?'stunts':kind+':'+stage);
    const pool=opening?profile.stunts:stunt>=0?[profile.heckles[stunt]]:kind==='snack'?profile.snack:[profile[kind][stage]];
    let index=((animal.speech[key]||0)+(kind==='snack'?stage:0))%pool.length;
    if(pool.length>1 && pool[index]===animal.lastLine)index=(index+1)%pool.length;
    const other=animal===routine.lead?routine.partner:routine.lead;
    return {key,raw:pool[index],text:pool[index].replaceAll('{other}',other?identity(other).name:'turma')};
  }
  function projected(animal, actualPose = false) {
    const point = position(animal), view = projection(width, height);
    const scale = actorScale(point.y,view);
    const action = actualPose ? motion(animal) : {};
    const options = { ...appearance(animal), mood:participating(animal)?'happy':'normal', moving: actualPose && !reduced && animal.moving, anim: animal.stride,
      direction: actualPose ? animal.direction : 'down', ...action };
    const art = CharacterArt.frameFor(animal.species, options);
    const f=art.frame, s=art.scale, flipped=!!art.pose.flip!==!!f.flip;
    const fw=Math.round(f.w*s),fh=Math.round(f.h*s),pivot=14-f.h*s*.48;
    const ink=f.grounding||{left:0,right:1,top:0,bottom:1};
    const grounded=f.grounding&&!['owl','crow'].includes(art.spriteName)&&!['fly','alert'].includes(art.action);
    const left=Math.round(-(f.cx??art.pose.cx)*s),top=14-Math.round(grounded?ink.bottom*fh:(f.bottom??art.pose.bottom)*s);
    const squash=Math.max(.75,Math.min(1.25,action.squash||1)),angle=action.rotation||0;
    const hop=['rabbit','skin-pipoca'].includes(art.spriteName)&&options.moving&&(!art.definition.pixelArt||art.definition.hop)?
      Math.max(0,Math.sin(((options.anim||0)%4-1.5)*Math.PI/2))*(art.definition.hop||4):0;
    const lift=Math.max(0,Math.min(64,(action.lift||0)+hop));
    const corners=[[ink.left,ink.top],[ink.right,ink.top],[ink.left,ink.bottom],[ink.right,ink.bottom]].map(([ix,iy])=>{
      let x=left+ix*fw,y=top+iy*fh;
      x=(flipped?-x:x)/squash;y=(y-pivot)*squash;
      return {x:(x*Math.cos(angle)-y*Math.sin(angle))*scale,y:(x*Math.sin(angle)+y*Math.cos(angle)+pivot-14-lift)*scale};
    });
    const box={left:Math.min(...corners.map(p=>p.x)),right:Math.max(...corners.map(p=>p.x)),
      top:Math.min(...corners.map(p=>p.y)),bottom:Math.max(...corners.map(p=>p.y))};
    return { x: view.x + point.x * view.scale, y: view.y + point.y * view.scale, scale,
      w: box.right-box.left, h: box.bottom-box.top, box };
  }
  function visibleAnimal(animal, partial = false) {
    if (!width || !height) return false;
    const bounds = canvas.getBoundingClientRect(), card = document.getElementById('menuCard').getBoundingClientRect(), p = projected(animal, partial);
    if (partial) {
      // A visible head or body still accepts a tap when the feet are cropped.
      const sx=bounds.width/width,sy=bounds.height/height,lift=(motion(animal).lift||0)*p.scale;
      const left=Math.max(0,bounds.left||0,(bounds.left||0)+(p.x-p.w/2)*sx);
      const right=Math.min(window.innerWidth||Infinity,(bounds.left||0)+bounds.width,(bounds.left||0)+(p.x+p.w/2)*sx);
      const top=Math.max(0,bounds.top||0,(bounds.top||0)+(p.y-p.h-lift)*sy);
      const bottom=Math.min(window.innerHeight||Infinity,(bounds.top||0)+bounds.height,(bounds.top||0)+(p.y-lift)*sy);
      return right>left&&bottom>top&&!(left>=card.left&&right<=card.left+card.width&&top>=card.top&&bottom<=card.top+card.height);
    }
    if (p.x - p.w / 2 < 4 || p.x + p.w / 2 > width - 4 || p.y > height - 4 || p.y - p.h < 4) return false;
    const x = (bounds.left || 0) + p.x * bounds.width / width, y = (bounds.top || 0) + p.y * bounds.height / height;
    const w = p.w * bounds.width / width, h = (p.h + 38 * p.scale) * bounds.height / height;
    if (y < h || y > (window.innerHeight || Infinity) - 4) return false;
    return !(x + w / 2 > card.left && x - w / 2 < card.left + card.width && y > card.top && y - h < card.top + card.height);
  }
  function chooseAnimal() {
    for (let offset = 0; offset < order.length; offset++) {
      const index = (turn + offset) % order.length, animal = herd.find(item => item.species === order[index]);
      if (!visibleAnimal(animal)) continue;
      turn = (index + 1) % order.length;
      return animal;
    }
    return null;
  }
  function clearReaction() {
    if(routine?.kind==='snack'||routine?.kind==='secret')signature='';
    routine = null; speaker = null; idle = 0; captionSpot = null;
    if (caption) caption.hidden = true;
    if (captionLink) captionLink.setAttribute('d','');
  }
  function say(animal, stage) {
    // A crowded meal lets another guest deliver the line from a clear spot.
    const candidates=routine.kind==='snack'?[animal,...routine.audience.filter(other=>other!==animal)]:[animal];
    for(const candidate of candidates){
      const { name, species } = identity(candidate);
      const line=dialogueFor(candidate,stage);
      speaker = candidate; candidate.speed = 0; candidate.moving = false; captionSpot = null;
      caption.style.visibility='hidden';captionLink.setAttribute('d','');
      caption.setAttribute('aria-live', routine.manual ? 'polite' : 'off');
      caption.textContent = `${name} · ${calls[species] || 'Opa!'}\n${line.text}`;
      caption.dataset.trick = routine.kind; caption.dataset.speaker = species;
      caption.dataset.voice=identity(candidate).voice;
      caption.dataset.food=routine.kind==='snack'?diets[species]:'';
      caption.hidden = false;
      if(routine.kind!=='snack')break;
      placeCaption();
      if(caption.style.visibility==='visible')break;
    }
    const spoken=dialogueFor(speaker,stage);
    speaker.speech[spoken.key]=(speaker.speech[spoken.key]||0)+1;speaker.lastLine=spoken.raw;
  }
  function startShow(animal, manual, requestedKind) {
    if (!animal) return;
    const p = position(animal);
    const partner = herd.filter(other => other !== animal && visibleAnimal(other))
      .sort((a,b) => Math.hypot(position(a).x-p.x,position(a).y-p.y)-Math.hypot(position(b).x-p.x,position(b).y-p.y))[0] || null;
    const kind = requestedKind || tricks[sequence++ % tricks.length];
    routine = { lead: animal, partner, kind, manual, age: 0, replied: false, finished: false,
      duration: sketches.has(kind) ? 8.2 : partner ? 6.4 : 4.1,
      audience: herd.filter(other=>visibleAnimal(other)), distances:new Map() };
    if(kind==='snack'){
      routine.meals=new Map();
      for(const guest of herd){
        const travel=(guest.travel+(reduced?0:Math.min(40,guest.length*.45)))%(guest.length*2);
        routine.meals.set(guest,{travel,point:position({...guest,travel}),food:diets[identity(guest).species],eaten:0});
      }
    }
    idle = 0; nextShow = 7 + sequence % 4;
    say(animal, 0); signature = ''; placeCaption();
    // Ambient pantomime stays silent; only a deliberate interaction plays a call.
    if (manual) { AudioSystem.playMenuAnimal(currentGame, identity(speaker).species); AudioControls.update(currentGame); }
  }
  function canInteract() {
    return active && currentGame?.phase === 'menu' && !document.hidden && CharacterArt.ready && !MenuThor.busy && !document.getElementById('howToPlayDialog').open;
  }
  function startSecret() {
    if(!canInteract()||routine?.kind==='secret')return false;
    const base=herd[0],route=base.route.map(([x,y])=>[x-120,y-140]);
    const start=base.length*.95;
    const cameo=(species,travel,name)=>({...base,route,species,name,cameo:species,speech:{},lastLine:'',
      travel:Math.max(0,travel),pace:species==='wolf'?70:74,speed:0,pause:0,phase:.8,moving:false,direction:'downright'});
    const wolf=cameo('wolf',start,'Baltazar');
    if(!visibleAnimal(wolf))return false;
    const chicks=[0,1,2].map((i)=>cameo('chick',start-54-i*18,RescueSystem.chickNames[i]));
    routine={kind:'secret',lead:wolf,partner:chicks[0],extras:[wolf,...chicks],audience:herd.filter(animal=>visibleAnimal(animal)),
      manual:true,age:0,duration:10.5,replied:false,finished:false};
    AudioSystem.stopMenuAnimal();idle=0;nextShow=9;signature='';
    say(wolf,0);placeCaption();return true;
  }
  function hitAnimal(event) {
    if (!canInteract() || event.target?.closest?.('button,a,input,select,label,#menuCard,dialog')) return null;
    const bounds = canvas.getBoundingClientRect();
    const x = (event.clientX - (bounds.left || 0)) * width / bounds.width;
    const y = (event.clientY - (bounds.top || 0)) * height / bounds.height;
    return herd.filter(animal=>visibleAnimal(animal,true)).sort((a,b)=>position(b).y-position(a).y).find(animal => {
      const p = projected(animal,true), lift = motion(animal).lift || 0;
      return Math.abs(x-p.x) < Math.max(22,p.w/2+8) && y > p.y-p.h-lift*p.scale-10 && y < p.y+10;
    }) || null;
  }
  function initialize() {
    if (canvas) return;
    canvas = document.getElementById('menuScene'); world = document.getElementById('menuWorld');
    button = document.getElementById('menuScatter'); caption = document.getElementById('menuBanter');
    foodButton = document.getElementById('menuFeed');
    secretButton = document.getElementById('menuSecret');
    captionLink = document.getElementById('menuBanterLink');
    playHint = document.getElementById('menuPlayHint'); invitation = document.getElementById('menuMischief');
    screen = document.getElementById('menuScreen'); context = canvas.getContext('2d');
    MenuThor.initialize(()=>{if(!canInteract())return false;clearReaction();idle=0;nextShow=10;return true;});
    button.addEventListener('click', () => { if (canInteract()) startShow(chooseAnimal(), true); });
    foodButton.addEventListener('click', () => { if (canInteract()) startShow(chooseAnimal(), true, 'snack'); });
    secretButton.addEventListener('click', () => {
      if(!canInteract()||routine?.kind==='secret')return;
      secretTaps=Math.min(3,secretTaps+1);secretButton.dataset.taps=String(secretTaps);
      if(secretTaps===3&&startSecret()){secretTaps=0;secretButton.dataset.taps='0';}
    });
    screen.addEventListener('pointerdown', event => {
      if (active && !currentGame.hasSave && !AudioSystem.status.unlocked) {
        AudioSystem.sync(currentGame); AudioSystem.unlock(); AudioControls.update(currentGame);
      }
      pointer = event.button && event.button !== 0 ? null : { x: event.clientX, y: event.clientY, animal: hitAnimal(event) };
    });
    screen.addEventListener('pointerup', event => {
      if (pointer?.animal && Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y)<10 && hitAnimal(event)===pointer.animal)
        startShow(pointer.animal, true);
      pointer = null;
    });
    screen.addEventListener('pointercancel', () => { pointer = null; });
    screen.addEventListener('pointermove', event => {
      if (!active || reduced || event.pointerType === 'touch') return;
      const bounds = screen.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const x = Math.max(-.5, Math.min(.5, (event.clientX - bounds.left) / bounds.width - .5));
      const y = Math.max(-.5, Math.min(.5, (event.clientY - bounds.top) / bounds.height - .5));
      world.style.transform = `translate(${x * -10}px, ${y * -8}px) scale(1.025)`;
    });
    screen.addEventListener('pointerleave', () => { pointer = null; resetParallax(); });
    window.addEventListener('resize', () => { resizeDirty = true; });
    document.fonts?.ready.then(() => { resizeDirty = true; });
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => { resizeDirty = true; }).observe(world);
  }
  function participating(animal) {
    if(!routine)return false;
    if(routine.kind==='secret')return !!animal.cameo||routine.audience.includes(animal);
    if(routine.kind==='snack' || routine.kind==='parade' || routine.kind==='sneeze')return routine.audience.includes(animal);
    if(routine.kind==='race' || routine.kind==='gossip')return routine.lead===animal||routine.partner===animal;
    return routine.lead === animal && routine.age<1.9 || routine.partner === animal && routine.age>=2.8 && routine.age<4.3;
  }
  function motion(animal) {
    if (!participating(animal)) return {};
    const partner = routine.lead === animal ? routine.partner : routine.lead;
    const from=position(animal), to=partner?position(partner):from;
    const direction = CharacterArt.directionFor(animal.direction,to.x-from.x,to.y-from.y);
    if (reduced) return { direction: 'down' };
    if(routine.kind==='secret'){
      if(animal.cameo)return {sprinting:animal.moving,mood:animal.cameo==='wolf'?'scared':'happy'};
      const beat=routine.age>3&&routine.age<4.5?Math.sin((routine.age-3)*Math.PI*3):0;
      return {direction,mood:'happy',lift:Math.max(0,beat)*8};
    }
    if(routine.kind==='race')return animal.moving?{sprinting:true}:{direction,mood:routine.age>3.3?'happy':'normal'};
    if(routine.kind==='snack')return animal.moving?{}:{direction:animal.direction,rotation:routine.age<4.9?Math.sin(routine.age*13)*.06:0};
    if(routine.kind==='gossip')return {direction,rotation:routine.age<2.5?Math.sin(routine.age*3)*.06:0};
    if(routine.kind==='sneeze'){
      const index=routine.audience.indexOf(animal), delay=animal===routine.lead ? 0 : 1.1+index*.12;
      const age=routine.age-delay, wave=age>0&&age<.7?Math.sin(age/.7*Math.PI):0;
      return {direction,mood:wave?'scared':'normal',lift:wave*(animal===routine.lead?8:24),rotation:wave*.12*(index%2?1:-1)};
    }
    if(routine.kind==='parade'){
      const age=routine.age-.4, beat=age>0&&age<4.5?Math.sin(age*Math.PI*4):0;
      return {direction:animal===routine.lead?'down':direction,moving:!!beat,anim:routine.age*3,lift:Math.max(0,beat)*9,rotation:beat*.08};
    }
    const lead = routine.lead === animal, age = routine.age - (lead ? .12 : 2.95), duration = lead ? 1.55 : 1.1;
    if (age <= 0 || age >= duration) return { direction };
    const p = age/duration, wave = Math.sin(Math.PI*p), kind = lead ? routine.kind : routine.kind === 'jump' ? 'jump' : 'cheer';
    if (kind === 'tumble') return { direction, progress: p, lift: wave*48, rotation: p*Math.PI*2*(direction==='left'?-1:1), squash: 1-.09*Math.sin(p*Math.PI*2) };
    if (kind === 'jump') return { direction, progress: p, lift: Math.abs(Math.sin(p*Math.PI*3))*36, squash: 1-.09*Math.sin(p*Math.PI*6) };
    if (kind === 'spin') return { direction: ['down','left','up','right'][Math.floor(p*12)%4], progress: p, lift: wave*18, moving: true, anim: p*12 };
    return { direction: kind==='dance'?'down':direction, progress: p, lift: Math.abs(Math.sin(p*Math.PI*4))*12, rotation: Math.sin(p*Math.PI*6)*.18, squash: 1-.07*Math.sin(p*Math.PI*4) };
  }
  function placePlayHint() {
    // Anchor once per layout change to the paths, not to an animal that keeps
    // walking. This avoids chasing the button with a pointer or keyboard focus.
    const area=screen.getBoundingClientRect(), bounds=canvas.getBoundingClientRect();
    const rootWidth=area.width || width, rootHeight=area.height || height;
    if (!rootWidth || !rootHeight || !bounds.width || !bounds.height) return;
    invitation.dataset.placement='herd';
    const size=invitation.getBoundingClientRect();
    const boxWidth=Math.min(size.width || 420,rootWidth-32), boxHeight=size.height || 108;
    const view=projection(width,height), sx=bounds.width/width, sy=bounds.height/height;
    const offsetX=(bounds.left || 0)-(area.left || 0), offsetY=(bounds.top || 0)-(area.top || 0);
    const group=[];
    // Use the whole route envelope so normal walking never runs under the hint.
    for (const animal of herd) for (const point of animal.route) {
      const x=offsetX+(view.x+point[0]*view.scale)*sx;
      const y=offsetY+(view.y+point[1]*view.scale)*sy;
      const scale=actorScale(point[1],view), art=CharacterArt.frameFor(animal.species,appearance(animal));
      const aw=art.pose.width*art.scale*scale*sx, ah=(art.pose.bottom-art.pose.top)*art.scale*scale*sy;
      if (x+aw/2<0 || x-aw/2>rootWidth || y<0 || y-ah>rootHeight) continue;
      group.push({left:x-aw/2,right:x+aw/2,top:y-ah,bottom:y});
    }
    if (!group.length) return;
    const herdBox={left:Math.max(8,Math.min(...group.map(p=>p.left))),right:Math.min(rootWidth-8,Math.max(...group.map(p=>p.right))),
      top:Math.max(8,Math.min(...group.map(p=>p.top))),bottom:Math.min(rootHeight-8,Math.max(...group.map(p=>p.bottom)))};
    const rectangles=['menuCard','farmTitle','menuTagline'].map(id=>document.getElementById(id)?.getBoundingClientRect());
    rectangles.push(screen.querySelector?.('.menu-footer')?.getBoundingClientRect());
    const blockers=rectangles.filter(r=>r?.width>0&&r?.height>0).map(r=>({left:r.left-(area.left||0),right:r.left+r.width-(area.left||0),
      top:r.top-(area.top||0),bottom:r.top+r.height-(area.top||0)}));
    blockers.push(...group);
    const half=boxWidth/2, center=(herdBox.left+herdBox.right)/2;
    const candidates=[{x:center,y:herdBox.bottom+18}];
    for (const y of [rootHeight-boxHeight-16,herdBox.bottom+18])
      for (const x of [center,rootWidth/2,rootWidth-half-16,half+16]) candidates.push({x,y});
    candidates.push({x:herdBox.right+half+18,y:herdBox.bottom-boxHeight},
      {x:herdBox.left-half-18,y:herdBox.bottom-boxHeight});
    if(rootHeight>540)candidates.push({x:center,y:herdBox.top-boxHeight-18});
    const fits=p=>p.x-half>=12&&p.x+half<=rootWidth-12&&p.y>=12&&p.y+boxHeight<=rootHeight-12&&
      !blockers.some(r=>p.x+half>r.left-10&&p.x-half<r.right+10&&p.y+boxHeight>r.top-10&&p.y<r.bottom+10);
    const chosen=candidates.map(p=>({...p,x:Math.max(half+16,Math.min(rootWidth-half-16,p.x))})).find(fits);
    invitation.dataset.placement=chosen?'herd':'flow';
    invitation.style.left=chosen?`${Math.round(chosen.x)}px`:'';
    invitation.style.top=chosen?`${Math.round(chosen.y)}px`:'';
    invitation.style.bottom=chosen?'auto':'';
  }
  function updatePlayHint() {
    const device=typeof GameInput==='undefined'?'keyboard':GameInput.device;
    const text=device==='gamepad'?'Selecione o botão para brincar.':device==='touch'?'Toque nos bichos para brincar.':'Clique nos bichos para brincar.';
    if (playHint.textContent===text) return false;
    playHint.textContent=text;
    return true;
  }
  function placeCaption() {
    if (!speaker || caption.hidden) return;
    const bounds = canvas.getBoundingClientRect(), area = screen.getBoundingClientRect();
    if(!width||!height||!bounds.width||!bounds.height){
      caption.style.visibility='hidden';captionLink.setAttribute('d','');captionSpot=null;return;
    }
    const sx = bounds.width/width, sy = bounds.height/height, rootWidth = area.width || width;
    const size=caption.getBoundingClientRect();
    const half = Math.min(rootWidth/2-8,(size.width || caption.offsetWidth || 236)/2), h = size.height || caption.offsetHeight || 76;
    const minY = Math.max(h+10,h-(area.top || 0)+10);
    const maxY = Math.min(area.height || height,(window.innerHeight || Infinity)-(area.top || 0))-10;
    const actors = cast().map(animal => {
      const p=projected(animal,true),b=p.box;
      const x=(bounds.left||0)-(area.left||0)+(p.x+b.left)*sx;
      const y=(bounds.top||0)-(area.top||0)+(p.y+b.top)*sy;
      return {animal,left:x-3,top:y-3,width:(b.right-b.left)*sx+6,height:(b.bottom-b.top)*sy+6};
    });
    const body=actors.find(a=>a.animal===speaker),px=body.left+body.width/2,py=body.top-4;
    const x=Math.max(half+8,Math.min(rootWidth-half-8,px));
    const candidates=[
      {x,y:body.top-16,placement:'above'},
      {x,y:body.top+body.height+h+16,placement:'below'},
      {x:body.left-half-16,y:body.top+body.height/2+h/2,placement:'left'},
      {x:body.left+body.width+half+16,y:body.top+body.height/2+h/2,placement:'right'}
    ];
    // Side bubbles can slide up or down between neighbours without a long tail.
    for(const gap of [12,20,28])for(const shift of [-h/2,-h/3,0,h/3,h/2]){
      const y=body.top+body.height/2+h/2+shift;
      candidates.push({x:body.left-half-gap,y,placement:'left'},
        {x:body.left+body.width+half+gap,y,placement:'right'});
    }
    for(const offset of [-half,half])candidates.push(
      {x:x+offset,y:body.top-16,placement:'above'},
      {x:x+offset,y:body.top+body.height+h+16,placement:'below'});
    const blockers = ['menuCard','farmTitle','menuTagline','menuSubtitle','menuMischief'].map(id => {
      const r = document.getElementById(id).getBoundingClientRect();
      return {left:r.left-(area.left || 0),top:r.top-(area.top || 0),width:r.width,height:r.height};
    }).filter(r=>r.width>0&&r.height>0);
    blockers.push(...actors);
    const overlaps = (point,r,margin) => point.x+half>r.left-margin && point.x-half<r.left+r.width+margin && point.y>r.top-margin && point.y-h<r.top+r.height+margin;
    for (const r of blockers) {
      candidates.push({x,y:r.top-16,placement:'above'}, {x,y:r.top+r.height+h+16,placement:'below'});
      candidates.push({x:r.left-half-16,y:body.top+body.height/2+h/2,placement:'left'},
        {x:r.left+r.width+half+16,y:body.top+body.height/2+h/2,placement:'right'});
      for(const offset of [-half,half])candidates.push(
        {x:x+offset,y:r.top-16,placement:'above'},
        {x:x+offset,y:r.top+r.height+h+16,placement:'below'});
    }
    function connection(point) {
      const top=point.y-h,left=point.x-half,right=point.x+half,bottom=point.y;
      const target=bottom<=body.top?{x:px,y:body.top-4}:top>=body.top+body.height?{x:px,y:body.top+body.height+4}:
        point.x<px?{x:body.left-4,y:body.top+body.height/2}:{x:body.left+body.width+4,y:body.top+body.height/2};
      const vertical=bottom<=body.top||top>=body.top+body.height;
      const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
      const start=vertical?{x:clamp(target.x,left+28,right-28),y:bottom<=body.top?bottom-2:top+2}:
        {x:point.x<px?right-2:left+2,y:clamp(target.y,top+24,bottom-24)};
      const bend={x:start.x,y:(start.y+target.y)/2};
      return {start,bend,target,vertical};
    }
    const lineClear=point=>{
      const {start,bend,target}=connection(point);
      if(Math.hypot(target.x-start.x,target.y-start.y)>32)return false;
      for(let i=1;i<=24;i++) {
        const t=i/24,u=1-t,x=u*u*start.x+2*u*t*bend.x+t*t*target.x,y=u*u*start.y+2*u*t*bend.y+t*t*target.y;
        if(blockers.some(r=>r.animal!==speaker&&x>r.left-4&&x<r.left+r.width+4&&y>r.top-4&&y<r.top+r.height+4))return false;
      }
      return true;
    };
    const clear=(point,margin=10)=>point.x-half>=8&&point.x+half<=rootWidth-8&&point.y>=minY&&point.y<=maxY&&!blockers.some(r=>overlaps(point,r,margin))&&lineClear(point);
    const distance=point=>Math.hypot(Math.max(0,Math.abs(point.x-px)-half),Math.max(0,point.y-h-py,py-point.y));
    const anchor=placement=>({x:placement==='left'?body.left:placement==='right'?body.left+body.width:px,
      y:placement==='above'?body.top:placement==='below'?body.top+body.height:body.top+body.height/2});
    const previousAnchor=captionSpot?anchor(captionSpot.placement):null;
    const previous=captionSpot?{...captionSpot,x:captionSpot.x+previousAnchor.x-captionSpot.anchorX,y:captionSpot.y+previousAnchor.y-captionSpot.anchorY}:null;
    // Keep the current side until it actually runs out of space, including while jumping.
    const chosen=previous&&clear(previous,6)?previous:candidates.filter(point=>clear(point)).sort((a,b)=>distance(a)-distance(b))[0];
    // Never fall back to painting text across another animal's face.
    caption.style.visibility=chosen?'visible':'hidden';
    if(!chosen){captionSpot=null;captionLink.setAttribute('d','');return;}
    const currentAnchor=anchor(chosen.placement);
    captionSpot={...chosen,anchorX:currentAnchor.x,anchorY:currentAnchor.y};
    caption.style.left = `${chosen.x}px`; caption.style.top = `${chosen.y}px`;
    caption.dataset.placement = chosen.placement;
    const {start,target,vertical}=connection(chosen);
    const dx=vertical?9:0,dy=vertical?0:9;
    // An open, filled wedge joins the bubble's edge without a seam across its base.
    captionLink.setAttribute('d',`M ${start.x-dx} ${start.y-dy} L ${target.x} ${target.y} L ${start.x+dx} ${start.y+dy}`);
    captionLink.setAttribute('data-tip-x',target.x);
    captionLink.setAttribute('data-tip-y',target.y);
  }
  function sparkles(x, y, scale, progress) {
    if (!progress || progress < .35) return;
    const spread = (progress-.35)/.65;
    context.globalAlpha = (1-spread)*.85;
    for (let i=0;i<5;i++) {
      const angle = -Math.PI+(i/4)*Math.PI, radius = (14+spread*28)*scale;
      const px = Math.round(x+Math.cos(angle)*radius), py = Math.round(y-16*scale+Math.sin(angle)*radius), size = Math.max(2,Math.round(3*scale));
      context.fillStyle = i%2 ? '#fff8dc' : '#ffd36b';
      context.fillRect(px-size,py,size*3,size); context.fillRect(px,py-size,size,size*3);
    }
    context.globalAlpha = 1;
  }
  function drawFood(meal, view) {
    if(meal.eaten>=1)return;
    const art=foods[meal.food],unit=Math.max(1,Math.round(view.scale*2));
    const fall=reduced?0:Math.max(0,1-routine.age*2)*24;
    const x=Math.round(view.x+(meal.point.x+28)*view.scale)-8*unit;
    const y=Math.round(view.y+(meal.point.y+18-fall)*view.scale)-art.pixels.length*unit;
    context.save();context.globalAlpha=1-meal.eaten;
    art.pixels.forEach((row,dy)=>[...row].forEach((pixel,dx)=>{
      if(pixel==='.')return;
      context.fillStyle=palette[pixel];context.fillRect(x+dx*unit,y+dy*unit,unit,unit);
    }));
    context.restore();
  }
  function frame(game, dt, reduceMotion) {
    initialize(); currentGame = game;
    if (reduced !== reduceMotion) { reduced = reduceMotion; signature = ''; clearReaction(); resetParallax(); }
    const visible = game.phase === 'menu' && screen.dataset.view !== 'settings' && !document.hidden && !document.getElementById('howToPlayDialog').open;
    if (active !== visible || equipped !== game.entities.chicken.skin) {
      active = visible; equipped = game.entities.chicken.skin; signature = ''; resizeDirty = true;
      clearReaction(); resetParallax(); pointer = null;
      if (!active) { AudioSystem.stopMenuAnimal();secretTaps=0;secretButton.dataset.taps='0'; }
    }
    if (!active || !context || !CharacterArt.ready) { MenuThor.frame(game,0,false,reduced);return; }
    const hintChanged=updatePlayHint();
    const placeHint=resizeDirty || hintChanged;
    if (resizeDirty) {
      const bounds = canvas.getBoundingClientRect();
      width = Math.round(canvas.clientWidth || bounds.width); height = Math.round(canvas.clientHeight || bounds.height);
      if (width <= 0 || height <= 0) { clearReaction(); MenuThor.frame(game,0,false,reduced);return; }
      pixelRatio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width*pixelRatio); canvas.height = Math.round(height*pixelRatio);
      resizeDirty = false; signature = ''; captionSpot = null;
    }
    if (placeHint) placePlayHint();
    dt = Math.max(0,Math.min(.1,dt));
    const view = projection(width,height);
    MenuThor.frame(game,dt,true,reduced,{view,width,height,pixelRatio});
    if (routine) {
      routine.age += dt;
      if (routine.kind!=='secret'&&!visibleAnimal(routine.lead,routine.manual)) clearReaction();
      else if (routine.partner && !routine.replied && routine.age>=(routine.kind==='race'?3.35:2.9)) {
        routine.replied = true;
        if(routine.kind==='race')routine.winner=(routine.distances.get(routine.lead)||0)>=(routine.distances.get(routine.partner)||0)?routine.lead:routine.partner;
        const answer=routine.winner||routine.partner;
        if (visibleAnimal(answer)) say(answer,1);
      }
      if(routine && sketches.has(routine.kind) && !routine.finished && routine.age>=5.4){
        routine.finished=true;
        const last=routine.kind==='race'&&routine.winner===routine.lead?routine.partner:routine.lead;
        if(last && visibleAnimal(last,routine.manual))say(last,2);
      }
      if (routine && routine.age>=routine.duration) clearReaction();
      if(routine?.kind==='secret'&&routine.age>=routine.duration-.8){caption.hidden=true;captionLink.setAttribute('d','');}
    } else if (!reduced && !MenuThor.busy) {
      idle += dt;
      if (idle>=nextShow) { idle = 0; startShow(chooseAnimal(),false); }
    }
    const next = `${game.entities.chicken.skin}:${reduced}`;
    if (signature === next && reduced) { placeCaption(); return; }
    signature = next;
    context.setTransform(pixelRatio,0,0,pixelRatio,0,0); context.clearRect(0,0,width,height); context.imageSmoothingEnabled = false;
    if(routine?.kind==='snack')for(const meal of routine.meals.values())drawFood(meal,view);
    const walkers = cast().map(animal => {
      if (!reduced) walk(animal,dt);
      return { animal, moving:!reduced&&animal.moving, ...position(animal) };
    }).sort((a,b)=>a.y-b.y);
    let thorDrawn=false;
    for (const {animal,moving,x,y} of walkers) {
      if(!thorDrawn&&MenuThor.depth<=y){MenuThor.drawWorld(context);thorDrawn=true;}
      const scale = actorScale(y,view), action = motion(animal);
      const px = view.x+x*view.scale, py = view.y+y*view.scale;
      if(animal.cameo){context.save();context.globalAlpha=reduced?1:Math.min(1,Math.max(0,(routine.duration-routine.age)/.8));}
      CharacterArt.draw(context,animal.species,px,py-14*scale,{
        scale, direction: animal.direction, mood:participating(animal)?'happy':'normal', moving, anim: animal.stride, subpixel:true, ...appearance(animal), ...action
      });
      if(animal.cameo)context.restore();
      if (!reduced) sparkles(px,py,scale,action.progress);
    }
    if(!thorDrawn)MenuThor.drawWorld(context);
    placeCaption();
  }
  return { initialize, frame };
})();
