/* Deterministic farm layouts. Independent from cards, render frames and classic saves. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.ShuffleMaps=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION=1,WIDTH=1120,HEIGHT=720;
  const STAGES=Object.freeze([
    ['Pomar do susto','orchard',3,1],
    ['Trilhas do milharal','corn',3,2],
    ['Bosque dos cochichos','grove',4,2],
    ['Campo dos espantalhos','field',4,2],
    ['Panto, fiscal da porteira','pond',0,0,'panto'],
    ['Colheita em disparada','harvest',4,3],
    ['Pedreira das penas','quarry',5,3],
    ['Pomar ao entardecer','sunset',5,3],
    ['Caminho do último feno','dusk',5,4],
    ['Baltazar, o sem-almoço','night',0,0,'baltazar']
  ].map(([name,theme,friendCount,enemyCount,bossId],i)=>Object.freeze({
    name,theme,friendCount,enemyCount,boss:!!bossId,bossId:bossId||null,
    subtitle:bossId==='panto'?'Desvie do bote de Panto. Contra-ataque quando ele ficar tonto.':
      bossId==='baltazar'?'Baltazar prepara botes em sequência. Espere a abertura para contra-atacar.':
      `Resgate os ${friendCount} amigos e alcance a porteira.`,
    number:i+1
  })));
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const pointRect=(p,o)=>Math.hypot(p.x-clamp(p.x,o.x,o.x+o.w),p.y-clamp(p.y,o.y,o.y+o.h));
  function seedFor(seed,stage){
    let x=(seed>>>0)^Math.imul(stage+1,0x9e3779b9)^0x85ebca6b;
    x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);
    return (x^(x>>>16))>>>0;
  }
  function stream(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
  function hits(a,b,o,padding=0){
    let lo=0,hi=1;
    for(const [axis,size]of [['x','w'],['y','h']]){
      const d=b[axis]-a[axis],min=o[axis]-padding,max=o[axis]+o[size]+padding;
      if(Math.abs(d)<1e-9){if(a[axis]<min||a[axis]>max)return false;continue;}
      const u=(min-a[axis])/d,v=(max-a[axis])/d;
      lo=Math.max(lo,Math.min(u,v));hi=Math.min(hi,Math.max(u,v));if(lo>hi)return false;
    }
    return true;
  }
  function clearCircle(layout,p,r){
    return !!p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(r)&&r>=0&&
      p.x-r>=28&&p.y-r>=28&&p.x+r<=WIDTH-28&&p.y+r<=HEIGHT-28&&
      layout.obstacles.every(o=>pointRect(p,o)>r);
  }
  function clearSegment(layout,a,b,r=22){
    return clearCircle(layout,a,r)&&clearCircle(layout,b,r)&&layout.obstacles.every(o=>!hits(a,b,o,r));
  }
  function generate(seed,stage){
    if(!Number.isInteger(stage)||stage<0||stage>=STAGES.length)throw new RangeError('Fase inválida');
    seed=(Number(seed)>>>0)||1;
    const config=STAGES[stage],mapSeed=seedFor(seed,stage),rnd=stream(mapSeed);
    const between=(a,b)=>Math.round(a+rnd()*(b-a));
    const side=between(0,3),opposite=(side+2)%4;
    function edge(s){return s%2===0?{x:s===0?88:WIDTH-88,y:between(130,HEIGHT-130)}:
      {x:between(180,WIDTH-180),y:s===1?88:HEIGHT-88};}
    const spawn=edge(side),exit={...edge(opposite),side:opposite};
    const hub={x:between(450,670),y:between(290,430)};
    const layout={version:VERSION,seed:mapSeed,id:`${VERSION}:${seed}:${stage}`,theme:config.theme,
      spawn,exit,hub,obstacles:[],roads:[],friends:[],enemies:[],boss:null};
    const reserved=[];
    function road(a,b){
      const bend=rnd()<.5?{x:a.x,y:b.y}:{x:b.x,y:a.y};
      for(const [from,to] of [[a,bend],[bend,b]])if(distance(from,to)>1){
        layout.roads.push({a:{...from},b:{...to},width:52});reserved.push({a:from,b:to});
      }
    }
    road(spawn,hub);road(hub,exit);
    const pool=[['sheep','Amélia'],['pig','Tonico'],['rabbit','Jay Jay'],['cow','Mimosa'],['duck','Quincas'],['dog','Bento']];
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    // A shuffled lattice gives separated objectives without unbounded rejection loops.
    const candidates=[];
    for(let y=150;y<=590;y+=110)for(let x=205;x<=955;x+=150)candidates.push({x:x+between(-27,27),y:y+between(-22,22)});
    for(let i=candidates.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
    for(const p of candidates){
      if(layout.friends.length===config.friendCount)break;
      if(distance(p,spawn)<220||distance(p,exit)<110||layout.friends.some(f=>distance(p,f)<145))continue;
      const [species,name]=pool[layout.friends.length];layout.friends.push({...p,species,name});road(p,hub);
    }
    if(layout.friends.length!==config.friendCount)throw Error('Não foi possível reservar os objetivos');
    const arena={x:170,y:135,w:780,h:450};
    if(config.boss){
      // Boss arenas keep an open fighting floor; approach/exit and outer cover vary by seed.
      const bossPoint=side%2===0?{x:side===0?830:290,y:between(265,455)}:{x:between(450,670),y:side===1?540:180};
      layout.boss={...bossPoint,species:config.bossId==='panto'?'goose':'wolf'};
      road(spawn,bossPoint);road(bossPoint,exit);
    }
    for(const p of candidates){
      if(layout.enemies.length===config.enemyCount)break;
      if(distance(p,spawn)<380||layout.friends.some(f=>distance(p,f)<100)||layout.enemies.some(e=>distance(p,e)<145))continue;
      layout.enemies.push({...p,species:layout.enemies.length%2?'fox':'wolf'});road(p,hub);
    }
    // Reserve wide routes FIRST, then decorate their surroundings. Obstacles are
    // separated by >56px and never cover spawn, goals or a corridor's clearance.
    const protectedPoints=[spawn,exit,...layout.friends,...layout.enemies,...(layout.boss?[layout.boss]:[])];
    const desired=config.boss?10:12+stage;
    for(let attempt=0;attempt<650&&layout.obstacles.length<desired;attempt++){
      const kind=config.theme==='quarry'?(rnd()<.65?'rock':'hay'):config.theme==='corn'||config.theme==='harvest'?(rnd()<.6?'hay':'tree'):rnd()<.62?'tree':rnd()<.5?'hay':'rock';
      const o={x:between(63,WIDTH-150),y:between(64,HEIGHT-125),w:between(44,85),h:kind==='tree'?between(45,78):between(32,52),kind};
      if(config.boss&&o.x<arena.x+arena.w&&o.x+o.w>arena.x&&o.y<arena.y+arena.h&&o.y+o.h>arena.y)continue;
      if(protectedPoints.some(p=>pointRect(p,o)<85)||reserved.some(s=>hits(s.a,s.b,o,49)))continue;
      if(layout.obstacles.some(a=>o.x<a.x+a.w+56&&o.x+o.w>a.x-56&&o.y<a.y+a.h+56&&o.y+o.h>a.y-56))continue;
      layout.obstacles.push(o);
    }
    return layout;
  }
  const navigation=new WeakMap();
  function graph(layout,r){
    let memo=navigation.get(layout);if(!memo){memo=new Map();navigation.set(layout,memo);}
    if(memo.has(r))return memo.get(r);
    const columns=33,rows=20,nodes=Array.from({length:columns*rows},(_,i)=>({x:48+(i%columns)*32,y:48+Math.floor(i/columns)*32}));
    const valid=nodes.map(p=>clearCircle(layout,p,r+1));
    const edges=nodes.map((p,i)=>{
      if(!valid[i])return[];
      return [i%columns?i-1:-1,i%columns<columns-1?i+1:-1,i>=columns?i-columns:-1,i+columns<nodes.length?i+columns:-1]
        .filter(j=>j>=0&&valid[j]&&clearSegment(layout,p,nodes[j],r));
    });
    const value={nodes,valid,edges};memo.set(r,value);return value;
  }
  function route(layout,from,to,r=22){
    if(clearSegment(layout,from,to,r))return [{x:to.x,y:to.y}];
    const g=graph(layout,r);
    const nearest=p=>g.nodes.map((n,i)=>({i,d:distance(n,p)})).filter(n=>g.valid[n.i]).sort((a,b)=>a.d-b.d)
      .find(n=>clearSegment(layout,p,g.nodes[n.i],r))?.i;
    const start=nearest(from),end=nearest(to);if(start===undefined||end===undefined)return [];
    const parents=new Int16Array(g.nodes.length).fill(-1),queue=[start];parents[start]=start;
    for(let n=0;n<queue.length&&parents[end]===-1;n++)for(const j of g.edges[queue[n]])if(parents[j]===-1){parents[j]=queue[n];queue.push(j);}
    if(parents[end]===-1)return [];
    const path=[];for(let n=end;n!==start;n=parents[n])path.push({...g.nodes[n]});path.push({...g.nodes[start]});path.reverse();path.push({x:to.x,y:to.y});
    return path;
  }
  return Object.freeze({VERSION,WIDTH,HEIGHT,STAGES,generate,clearCircle,clearSegment,route,seedFor});
});
