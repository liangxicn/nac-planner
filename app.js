'use strict';
// Platform centers from AssemblyComplexStructureString: F controller positions,
// grouped into the four possible controller directions on each platform.
const TYPES = [
 ['matrix','纳米芯片组装矩阵','Assembly Matrix','NAM','#667d53'],
 ['parts','元件预处理装置','Part Preparation Apparatus','PPA','#9864c7'],
 ['wire','纳米精度导线追踪器','Nanoprecision Wire Tracer','NWT','#319d9e'],
 ['cut','纳米精度切割仓','Nanoprecision Cutting Chamber','NCC','#b49736'],
 ['board','全板浸没设备','Full-Board Immersion Device','FID','#698489'],
 ['wrap','纳米封装卷绕器','Nanometer Encasement Wrapper','NEW','#62a453'],
 ['super','超导线束分离器','Superconductive Strand Splitter','SSS','#ca655f'],
 ['etch','超高能蚀刻阵列','Ultra-High Energy Etching Array','UEA','#4b8ac1'],
 ['bio','加速生物调谐器','Accelerated Biological Coordinator','ABC','#c8924b'],
 ['optical','光学优化组织器','Optically Optimized Organizer','OOO','#a56da1'],
 ['split','纳米组件分流器','Nanopart Splitter','NPS','#777c98']
].map(([id,name,en,short,color])=>({id,name,en,short,color}));
const COLORS=['#438bd1','#9a5bce','#29a9a5','#db6055','#e4ab3c','#65ac49','#ce68a5','#637cbd','#f0e5a5','#778879','#505d56','#bd7847','#8fc66b','#80c4d6','#d9dde0','#314b42'];
const COLOR_NAMES=['蓝色','紫色','青色','红色','黄色','绿色','粉红','蓝紫','淡黄','灰绿','深灰','棕色','黄绿','浅蓝','浅灰','黑色'];
function colorName(value){const index=COLORS.findIndex(c=>c.toLowerCase()===String(value).toLowerCase());return index<0?'自定义颜色':COLOR_NAMES[index]}
const COORDS=[[23,8],[39,8],[48,14],[54,23],[54,39],[48,48],[39,54],[23,54],[14,48],[8,39],[8,23],[14,14]];
const SLOTS=COORDS.map(([x,z],i)=>({id:i,x:620+(x-31)*17,y:520+(z-31)*17}));
const CONTROL={id:'control',type:'control',name:'中央控制室'};
const KEY='nac-layout-v1';
const MODULE_SIZE=132, CONTROL_SIZE=210;
function outerSide(id){const r=rect(node(id));return Math.abs(r.x-620)>Math.abs(r.y-520)?(r.x>620?'right':'left'):(r.y>520?'bottom':'top')}
function orientSelf(e){if(e.from==='control')return;const side=outerSide(e.from);e.a={side,t:.25};e.b={side,t:.75};e.outerAuto=true}
let state={version:1,layoutVersion:3,modules:[],edges:[]}, selectedNode=null, selectedEdge=null, selectedControlPort=null;
let history=[],future=[],drag=null,pickerSlot=null,pickerNode=null,view={x:0,y:0,w:1240,h:1040};
const $=id=>document.getElementById(id), svg=$('canvas');
let activeLayer=1;
try{activeLayer=localStorage.getItem('nac-active-layer')==='2'?2:1}catch{}
const edgeLayer=e=>e.layer===2?2:1;
const layerName=n=>n===2?'第二层':'第一层';
const layerOffset=e=>edgeLayer(e)===2?4:0;
let uiMode='connect';
try{uiMode=localStorage.getItem('nac-ui-mode')==='view'?'view':'connect'}catch{}
let parallelSnap=true;
try{parallelSnap=localStorage.getItem('nac-parallel-snap')!=='false'}catch{}
$('parallel-snap').checked=parallelSnap;
$('parallel-snap').onchange=event=>{parallelSnap=event.target.checked;try{localStorage.setItem('nac-parallel-snap',String(parallelSnap))}catch{}};
const NS='http://www.w3.org/2000/svg';
const clone=x=>JSON.parse(JSON.stringify(x));
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>globalThis.crypto?.randomUUID?.() || 'n'+Date.now().toString(36)+Math.random().toString(36).slice(2);
function node(id){return id==='control'?CONTROL:state.modules.find(n=>n.id===id)}
function type(n){return n.id==='control'?{name:'中央控制室',short:'NAC',color:'#426d50',en:'CONTROL ROOM'}:TYPES.find(t=>t.id===n.type)}
function rect(n){const p=n.id==='control'?{x:620,y:520}:SLOTS[n.slot];return {...p,w:n.id==='control'?CONTROL_SIZE:MODULE_SIZE,h:n.id==='control'?CONTROL_SIZE:MODULE_SIZE}}
function label(id){const n=node(id);return n?n.name||type(n).name:'未连接'}
function slotLabel(n){return n.id==='control'?'中央':String(n.slot+1).padStart(2,'0')}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),2600)}
function checkpoint(){history.push(clone(state));if(history.length>80)history.shift();future=[]}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));$('save-status').textContent='✓ 已自动保存到本机'}catch{$('save-status').textContent='请导出方案保存'}}
function commit(){persist();render()}
function undo(){if(!history.length)return;future.push(clone(state));state=history.pop();selectedNode=selectedEdge=null;commit()}
function redo(){if(!future.length)return;history.push(clone(state));state=future.pop();selectedNode=selectedEdge=null;commit()}
function point(e){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse())}
function port(id,p){const r=rect(node(id)),t=p.t;return p.side==='top'?{x:r.x-r.w/2+t*r.w,y:r.y-r.h/2}:p.side==='bottom'?{x:r.x-r.w/2+t*r.w,y:r.y+r.h/2}:p.side==='left'?{x:r.x-r.w/2,y:r.y-r.h/2+t*r.h}:{x:r.x+r.w/2,y:r.y-r.h/2+t*r.h}}
function nearestPort(id,p){const r=rect(node(id));const options=[{side:'top',d:Math.abs(p.y-r.y+r.h/2),t:(p.x-r.x+r.w/2)/r.w},{side:'bottom',d:Math.abs(p.y-r.y-r.h/2),t:(p.x-r.x+r.w/2)/r.w},{side:'left',d:Math.abs(p.x-r.x+r.w/2),t:(p.y-r.y+r.h/2)/r.h},{side:'right',d:Math.abs(p.x-r.x-r.w/2),t:(p.y-r.y+r.h/2)/r.h}];options.sort((a,b)=>a.d-b.d);return {side:options[0].side,t:Math.max(.08,Math.min(.92,options[0].t))}}
const SIDES=['top','right','bottom','left'];
const SIDE_NAMES={top:'上边',right:'右边',bottom:'下边',left:'左边'};
const portKey=p=>{const q=port('control',p);return q.x+':'+q.y};
function controlEnds(){return state.edges.flatMap(e=>['a','b'].filter(k=>(k==='a'?e.from:e.to)==='control').map(k=>({e,k,p:e[k]})))}
const MODULE_SIDE_LIMIT=5;
function moduleEnds(id,except=null){return state.edges.filter(e=>e!==except&&!e.unrouted).flatMap(e=>['a','b'].filter(k=>(k==='a'?e.from:e.to)===id).map(k=>({e,k,p:e[k]})))}
function moduleSideUsed(id,side,except=null){return moduleEnds(id,except).filter(x=>x.p.side===side).length}
function moduleCapacityAllows(e){
 for(const id of new Set([e.from,e.to])){
  if(id==='control')continue;
  for(const side of SIDES){
   const added=(e.from===id&&e.a.side===side?1:0)+(e.to===id&&e.b.side===side?1:0);
   if(added&&moduleSideUsed(id,side,e)+added>MODULE_SIDE_LIMIT)return false;
  }
 }
 return true;
}
function draggedPort(id,p){const next=nearestPort(id,p);if(id==='control')next.t=Math.max(0,Math.min(6,Math.round(next.t*6)))/6;return next}
function controlPortOccupied(edge,end,p){return controlEnds().some(x=>!(x.e===edge&&x.k===end)&&portKey(x.p)===portKey(p))}
function freeControlPort(side,used){
 for(let i=0;i<7;i++){const p={side,t:i/6};if(!used.has(portKey(p))){used.add(portKey(p));return p}}
 return null;
}
function availableOnSide(side,used=new Set(controlEnds().map(x=>portKey(x.p)))){return Array.from({length:7},(_,i)=>({side,t:i/6})).filter(p=>!used.has(portKey(p))).length}
function controlMarks(){
 const seen=new Set();return SIDES.map(side=>Array.from({length:7},(_,i)=>{
  const p={side,t:i/6},key=portKey(p);if(seen.has(key))return '';seen.add(key);
  const at=port('control',p),entry=controlEnds().find(x=>portKey(x.p)===key),active=selectedNode==='control'&&selectedControlPort&&portKey(selectedControlPort)===key;
  return `<g class="control-socket" data-control-side="${side}" data-control-index="${i}"><title>${SIDE_NAMES[side]} ${i+1} 号接口${entry?' · 已占用':' · 点击接线'}</title><rect x="${at.x-10}" y="${at.y-10}" width="20" height="20" fill="transparent"/>${active?`<circle cx="${at.x}" cy="${at.y}" r="9" fill="none" stroke="#24795c" stroke-width="2"/>`:''}<rect class="socket-mark" x="${at.x-4}" y="${at.y-4}" width="8" height="8" fill="${entry?entry.e.color:active?'#24795c':'#f9fcf6'}" stroke="${entry?entry.e.color:'#8ea684'}" stroke-width="1.3"/></g>`;
 }).join('')).join('');
}
function chooseControlPort(p){
 if(selectedNode==='control'&&selectedControlPort&&portKey(selectedControlPort)===portKey(p))return;
 const entry=controlEnds().find(x=>portKey(x.p)===portKey(p));
 if(entry){if(selectedNode){if(selectedNode!=='control')toast('这个接口已被占用，请点一个空接口');return}selectEdge(entry.e.id);return}
 if(selectedNode){
  const choices={b:p};if(selectedNode==='control')choices.a=selectedControlPort;
  addEdge(selectedNode,'control',choices);return;
 }
 selectedNode='control';selectedControlPort=p;selectedEdge=null;render();
}
function claimControlPort(choice,used){
 if(typeof choice==='string')return freeControlPort(choice,used);
 if(!choice||!SIDES.includes(choice.side)||!Number.isFinite(choice.t))return null;
 const p={side:choice.side,t:choice.t},key=portKey(p);
 if(used.has(key))return null;used.add(key);return p;
}
function spareModulePort(id,preferred,extra=[]){
 const used=state.edges.flatMap(e=>['a','b'].filter(k=>(k==='a'?e.from:e.to)===id).map(k=>port(id,e[k]))).concat(extra);
 for(const t of [preferred.t,.5,.25,.75,.1,.9,.375,.625]){const p={side:preferred.side,t},at=port(id,p);if(used.every(q=>Math.hypot(q.x-at.x,q.y-at.y)>12))return p}
 return preferred;
}
function vector(side){return {top:{x:0,y:-1},bottom:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}}[side]}
function step(p,side,d){const v=vector(side);return {x:p.x+v.x*d,y:p.y+v.y*d}}
function equal(a,b){return Math.abs(a.x-b.x)<.01&&Math.abs(a.y-b.y)<.01}
function compact(pts){return pts.filter((p,i)=>!i||!equal(p,pts[i-1]))}
function simplify(pts){const out=[];for(const p of compact(pts)){while(out.length>1){const a=out[out.length-2],b=out[out.length-1];if((a.x===b.x&&b.x===p.x)||(a.y===b.y&&b.y===p.y))out.pop();else break}out.push(p)}return out}
// Route around modules; manual alignment may sit exactly on their borders.
function obstacles(){return frameRects().map(r=>({l:r.x-r.w/2-8,r:r.x+r.w/2+8,t:r.y-r.h/2-8,b:r.y+r.h/2+8}))}
function frameRects(){return [CONTROL,...state.modules].map(rect)}
function frameBodies(){return frameRects().map(r=>({l:r.x-r.w/2,r:r.x+r.w/2,t:r.y-r.h/2,b:r.y+r.h/2}))}
function routingFrames(e){return [CONTROL,...state.modules].map(n=>{const r=rect(n),gap=n.id===e.from||n.id===e.to?0:8;return {l:r.x-r.w/2-gap,r:r.x+r.w/2+gap,t:r.y-r.h/2-gap,b:r.y+r.h/2+gap}})}
function pathClear(a,b,boxes){return !boxes.some(o=>a.x===b.x?(a.x>o.l+.01&&a.x<o.r-.01&&Math.max(a.y,b.y)>o.t+.01&&Math.min(a.y,b.y)<o.b-.01):(a.y>o.t+.01&&a.y<o.b-.01&&Math.max(a.x,b.x)>o.l+.01&&Math.min(a.x,b.x)<o.r-.01))}
function orthogonal(a,b,offset=0,barriers=[]){
 const boxes=[...obstacles(),...barriers];
 // Keep an open routing corridor outside ALL platforms and existing wires.
 // The visible canvas is a viewport, not a boundary for the pipe network.
 const margin=36;
 const xs=[...new Set([a.x,b.x,Math.min(a.x,b.x,...boxes.map(o=>o.l))-margin,Math.max(a.x,b.x,...boxes.map(o=>o.r))+margin,...boxes.flatMap(o=>[o.l-offset,o.r+offset])])].sort((a,b)=>a-b);
 const ys=[...new Set([a.y,b.y,Math.min(a.y,b.y,...boxes.map(o=>o.t))-margin,Math.max(a.y,b.y,...boxes.map(o=>o.b))+margin,...boxes.flatMap(o=>[o.t-offset,o.b+offset])])].sort((a,b)=>a-b);
 const width=xs.length,start=ys.indexOf(a.y)*width+xs.indexOf(a.x),end=ys.indexOf(b.y)*width+xs.indexOf(b.x);
 const pos=i=>({x:xs[i%width],y:ys[Math.floor(i/width)]});
 const open=[],cost=new Map([[start+':0',0]]),prev=new Map();let last=null;
 const push=value=>{const p=pos(value.i);value.f=value.d+Math.abs(p.x-b.x)+Math.abs(p.y-b.y);open.push(value);let i=open.length-1;while(i){const parent=(i-1)>>1;if(open[parent].f<=value.f)break;open[i]=open[parent];i=parent}open[i]=value};
 const pop=()=>{const first=open[0],end=open.pop();if(open.length){let i=0;while(i*2+1<open.length){let child=i*2+1;if(child+1<open.length&&open[child+1].f<open[child].f)child++;if(open[child].f>=end.f)break;open[i]=open[child];i=child}open[i]=end}return first};
 push({i:start,d:0,dir:0,key:start+':0'});
 while(open.length){
  const cur=pop();if(cur.d!==cost.get(cur.key))continue;if(cur.i===end){last=cur;break}
  const x=cur.i%width,y=Math.floor(cur.i/width),p=pos(cur.i);
  for(const [nx,ny,dir] of [[x-1,y,1],[x+1,y,1],[x,y-1,2],[x,y+1,2]]){
   if(nx<0||nx>=width||ny<0||ny>=ys.length)continue;
   const i=ny*width+nx,q=pos(i);if(!pathClear(p,q,boxes))continue;
   const d=cur.d+Math.abs(p.x-q.x)+Math.abs(p.y-q.y)+(cur.dir&&cur.dir!==dir?24:0),key=i+':'+dir;
   if(d<(cost.get(key)??Infinity)){cost.set(key,d);prev.set(key,cur);push({i,d,dir,key})}
  }
 }
 if(!last)return null;
 const points=[];for(let c=last;c;c=prev.get(c.key))points.push(pos(c.i));return simplify(points.reverse());
}
function wireBoxes(except){return state.edges.filter(e=>e!==except&&edgeLayer(e)===edgeLayer(except)).flatMap(e=>e.points.slice(1).map((b,i)=>{const a=e.points[i];return {l:Math.min(a.x,b.x)-5,r:Math.max(a.x,b.x)+5,t:Math.min(a.y,b.y)-5,b:Math.max(a.y,b.y)+5}}))}
function segmentsTouch(a,b,c,d){return Math.max(Math.min(a.x,b.x),Math.min(c.x,d.x))<=Math.min(Math.max(a.x,b.x),Math.max(c.x,d.x))+.01&&Math.max(Math.min(a.y,b.y),Math.min(c.y,d.y))<=Math.min(Math.max(a.y,b.y),Math.max(c.y,d.y))+.01}
function routeConflict(e){
 if(e.points.length>=2){
  if(e.points.slice(1).some((p,i)=>!pathClear(e.points[i],p,frameBodies())))return true;
  const p=simplify(e.points),a=p[0],b=p.at(-1);
  if(p.length<2||!equal(a,port(e.from,e.a))||!equal(b,port(e.to,e.b)))return true;
 }
 for(const other of state.edges){if(other===e||edgeLayer(other)!==edgeLayer(e))continue;for(let i=1;i<e.points.length;i++)for(let j=1;j<other.points.length;j++)if(segmentsTouch(e.points[i-1],e.points[i],other.points[j-1],other.points[j]))return true}
 for(let i=1;i<e.points.length;i++)for(let j=i+2;j<e.points.length;j++)if(segmentsTouch(e.points[i-1],e.points[i],e.points[j-1],e.points[j]))return true;
 return false;
}
function editablePoints(points){
 return simplify(points);
}
function segmentDragGeometry(edge,index){
 const result=clone(edge),p=result.points,a=p[index],b=p[index+1],last=index===p.length-2;
 const at=f=>({x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f});
 if(index===0){p.splice(1,0,at(.25));index++}
 if(last)p.splice(p.length-1,0,at(.75));
 return {edge:result,index};
}
function snapStraight(e){
 const original=clone(e),p=simplify(e.points);if(e.from===e.to||p.length<2)return false;
 const vertical=['top','bottom'].includes(e.a.side);
 if(vertical!==['top','bottom'].includes(e.b.side)||e.a.side===e.b.side)return false;
 const axis=vertical?'x':'y',values=p.map(q=>q[axis]);
 if(Math.max(...values)-Math.min(...values)>14)return false;
 const end=e.to!=='control'?'b':e.from!=='control'?'a':null;
 if(end){const id=end==='a'?e.from:e.to,other=end==='a'?p.at(-1):p[0],r=rect(node(id)),size=vertical?r.w:r.h,t=(other[axis]-r[axis]+size/2)/size;if(t<.08||t>.92)return false;e[end].t=t}
 const a=port(e.from,e.a),b=port(e.to,e.b);if(Math.abs(a[axis]-b[axis])>.001){Object.assign(e,original);return false}
 e.points=[a,b];if(routeConflict(e)){Object.assign(e,original);return false}
 const changed=JSON.stringify(original.points)!==JSON.stringify(e.points);e.manual=changed?true:original.manual;return changed;
}
function settleLine(e){
 const before=JSON.stringify(e.points);e.points=simplify(e.points);
 if(!parallelSnap)return before!==JSON.stringify(e.points);
 snapStraight(e);
 // Remove a small dogleg within this one route; never merge separate edges.
 for(let pass=0;pass<20;pass++){
  let changed=false;const p=e.points;
  for(let i=0;i+3<p.length&&!changed;i++){
   const [a,b,c,d]=p.slice(i,i+4),horizontal=a.y===b.y;
   if(horizontal!==(c.y===d.y)||Math.abs(horizontal?b.y-c.y:b.x-c.x)>14)continue;
   for(const corner of [{x:a.x,y:d.y},{x:d.x,y:a.y}]){
    const candidate=simplify([...p.slice(0,i),a,corner,d,...p.slice(i+4)]);if(candidate.length>=p.length)continue;
    e.points=candidate;if(!routeConflict(e)){changed=true;break}e.points=p;
   }
  }
  if(!changed)break;
 }
 return before!==JSON.stringify(e.points);
}
function animateSnap(id){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const group=[...$('wires').children].find(g=>g.dataset.edge===id),stroke=group?.querySelectorAll(':scope > path')[1];
 stroke?.animate([{strokeWidth:3},{strokeWidth:6,offset:.35},{strokeWidth:2,offset:.7},{strokeWidth:3}],{duration:360,easing:'cubic-bezier(.34,1.56,.64,1)'});
}
function leavesPortOutward(at,next,side){
 return side==='left'?next.y===at.y&&next.x<at.x:side==='right'?next.y===at.y&&next.x>at.x:side==='top'?next.x===at.x&&next.y<at.y:next.x===at.x&&next.y>at.y;
}
function directRoute(e,a,b,barriers,outward=true,clearance=false){
 if(e.from===e.to)return null;
 // Do not lay a shortcut over other control sockets and seal future exits.
 const sockets=SIDES.flatMap(side=>Array.from({length:7},(_,i)=>port('control',{side,t:i/6}))).filter(p=>!equal(p,a)&&!equal(p,b)).map(p=>({l:p.x-4,r:p.x+4,t:p.y-4,b:p.y+4}));
 for(const points of [[a,b],[a,{x:a.x,y:b.y},b],[a,{x:b.x,y:a.y},b]]){
  const p=simplify(points);if(p.length<2||p.some((q,i)=>i&&q.x!==p[i-1].x&&q.y!==p[i-1].y))continue;
  if(outward&&(!leavesPortOutward(p[0],p[1],e.a.side)||!leavesPortOutward(p.at(-1),p.at(-2),e.b.side)))continue;
  if(p.slice(1).every((q,i)=>pathClear(p[i],q,[...(clearance?routingFrames(e):frameBodies()),...barriers,...sockets])))return editablePoints(p);
 }
 return null;
}
function route(e,clearance=false){
 if(!moduleCapacityAllows(e))return false;
 const a=port(e.from,e.a),b=port(e.to,e.b),self=e.from===e.to,barriers=wireBoxes(e);
 const same=state.edges.filter(x=>x.from!==x.to&&[x.from,x.to].sort().join('|')===[e.from,e.to].sort().join('|'));
 const lane=self?state.edges.filter(x=>x.from===e.from&&x.to===e.from).indexOf(e):same.indexOf(e);
 const gap=(self?55:28)+Math.max(0,lane)*12;
 const original=e.points;
 const direct=directRoute(e,a,b,barriers,true,clearance);
 if(direct){e.points=direct;if(!routeConflict(e)){e.manual=false;e.unrouted=false;return true}e.points=original}
 const clearanceFrames=clearance?routingFrames(e):[];
 const lead=(id,p)=>id==='control'?112-Math.round(p.t*6)*14:gap;
 for(const scale of [1,.6,.3]){
  const sa=step(a,e.a.side,Math.max(10,lead(e.from,e.a)*scale)),sb=step(b,e.b.side,Math.max(10,lead(e.to,e.b)*scale));
  if(!pathClear(a,sa,[...barriers,...clearanceFrames])||!pathClear(sb,b,[...barriers,...clearanceFrames]))continue;
  const middle=orthogonal(sa,sb,0,barriers);if(!middle)continue;
  e.points=simplify([a,...middle,b]);
  if(!routeConflict(e)){e.manual=false;e.unrouted=false;return true}
 }
 // A border-following shortcut is a fallback only when outward leads are blocked.
 const fallback=directRoute(e,a,b,barriers,false,clearance);
 if(fallback){e.points=fallback;if(!routeConflict(e)){e.manual=false;e.unrouted=false;return true}}
 e.points=original;return false;
}
function preferredConnection(e,preservePorts=false,clearance=false){
 if(e.from===e.to)return false;
 const outer=e.from!=='control'&&e.to!=='control',opposite={top:'bottom',bottom:'top',left:'right',right:'left'};
 function ends(id,current){
  if(id==='control'||preservePorts)return [current];
  const side=outer?outerSide(id):opposite[outerSide(id)];
  if(moduleSideUsed(id,side,e)>=MODULE_SIDE_LIMIT)return [];
  const occupied=moduleEnds(id,e).map(x=>port(id,x.p));
  return [...new Set([current.t,.5,.25,.75,.1,.9])].map(t=>({side,t})).filter(p=>occupied.every(q=>Math.hypot(q.x-port(id,p).x,q.y-port(id,p).y)>12));
 }
 const original=clone(e),half=MODULE_SIZE/2;
 const box=(left,right,top,bottom)=>({l:left.x-half,r:right.x+half,t:top.y-half,b:bottom.y+half});
 // A stepped envelope covers the 12 platforms and their interior. Routes outside
 // this envelope leave the central corridors free, including currently empty slots.
 const envelope=[box(SLOTS[0],SLOTS[1],SLOTS[0],SLOTS[6]),box(SLOTS[11],SLOTS[2],SLOTS[11],SLOTS[5]),box(SLOTS[10],SLOTS[3],SLOTS[10],SLOTS[4])];
 const bounds={l:SLOTS[10].x+half,r:SLOTS[3].x-half,t:SLOTS[0].y+half,b:SLOTS[6].y-half},far=100000;
 const guards=outer?envelope:[{l:-far,r:bounds.l,t:-far,b:far},{l:bounds.r,r:far,t:-far,b:far},{l:-far,r:far,t:-far,b:bounds.t},{l:-far,r:far,t:bounds.b,b:far}];
 const barriers=[...wireBoxes(e),...guards,...(clearance?routingFrames(e):[])];
 for(const a of ends(e.from,e.a))for(const b of ends(e.to,e.b)){
  e.a=a;e.b=b;if(!moduleCapacityAllows(e))continue;
  const start=port(e.from,a),end=port(e.to,b);
  const direct=outer?null:directRoute(e,start,end,barriers);
  if(direct){e.points=direct;if(!routeConflict(e)){e.manual=false;e.unrouted=false;return true}}
  for(const lead of [28,16,10]){
   const sa=step(start,a.side,lead),sb=step(end,b.side,lead);
   if(!pathClear(start,sa,barriers)||!pathClear(sb,end,barriers))continue;
   const middle=orthogonal(sa,sb,0,barriers);if(!middle)continue;
   e.points=simplify([start,...middle,end]);
   if(!routeConflict(e)){e.manual=false;e.unrouted=false;return true}
  }
 }
 Object.assign(e,original);return false;
}
function routeNewConnection(e){
 if(preferredConnection(e))return true;
 const original=clone(e);
 const routed=route(e),initial=routed?clone(e):null;
 if(e.from===e.to)return routed;
 function candidates(id,current){
  // A clicked control-room socket is an exact choice; never relocate it.
  if(id==='control')return [current];
  const sides=[...new Set([outerSide(id),current.side,...SIDES])];
  const used=state.edges.filter(x=>x!==e).flatMap(x=>['a','b'].filter(k=>(k==='a'?x.from:x.to)===id).map(k=>port(id,x[k])));
  const result=[];
  for(const t of [...new Set([current.t,.5,.25,.75,.1,.9])])for(const side of sides){
   if(moduleSideUsed(id,side,e)>=MODULE_SIDE_LIMIT)continue;
   const p={side,t},at=port(id,p);
   if(used.every(q=>Math.hypot(at.x-q.x,at.y-q.y)>12))result.push(p);
  }
  return result;
 }
 const starts=candidates(e.from,e.a),ends=candidates(e.to,e.b);
 // Compare short, outward-facing shortcuts before accepting a long detour.
 // Keep the chosen source when a better destination alone is sufficient.
 const score=points=>points.slice(1).reduce((n,p,i)=>n+Math.abs(p.x-points[i].x)+Math.abs(p.y-points[i].y),0)+Math.max(0,points.length-2)*24;
 let best=initial,bestScore=initial?score(initial.points):Infinity;
 const barriers=wireBoxes(e);
 for(const sources of [[original.a],starts]){
  let improved=false;
  for(const a of sources)for(const b of ends){
   e.a=a;e.b=b;
   if(!moduleCapacityAllows(e))continue;
   const points=directRoute(e,port(e.from,a),port(e.to,b),barriers);
   if(!points||score(points)>=bestScore)continue;
   e.points=points;
   if(routeConflict(e))continue;
   e.manual=false;e.unrouted=false;best=clone(e);bestScore=score(points);improved=true;
  }
  if(improved)break;
 }
 if(best){Object.assign(e,best);return true}
 // Try both outer-facing edges before searching less convenient positions.
 const pairs=starts.flatMap((a,i)=>ends.map((b,j)=>({a,b,rank:i+j}))).sort((a,b)=>a.rank-b.rank);
 for(const pair of pairs){
  e.a=pair.a;e.b=pair.b;e.points=[];
  if(route(e))return true;
 }
 Object.assign(e,original);return false;
}
function rewireMoved(moved,old){
 const changed=state.modules.filter(n=>{const before=old.get(n.id),after=rect(n);return !before||before.x!==after.x||before.y!==after.y});
 const affected=state.edges.filter(e=>{
  const clearance=changed.filter(n=>n.id!==e.from&&n.id!==e.to).map(n=>{const r=rect(n);return {l:r.x-r.w/2-8,r:r.x+r.w/2+8,t:r.y-r.h/2-8,b:r.y+r.h/2+8}});
  return moved.includes(e.from)||moved.includes(e.to)||e.points.slice(1).some((p,i)=>!pathClear(e.points[i],p,[...frameBodies(),...clearance]));
 });
 if(!affected.length)return true;
 const saved=new Map(state.edges.map(e=>[e.id,clone(e)]));
 const layers=new Set(affected.map(edgeLayer));
 const neighbors=state.edges.filter(e=>layers.has(edgeLayer(e))&&!e.unrouted);
 const expanded=[...new Set([...affected,...neighbors])];
 // First preserve every unrelated wire. If tightly packed leads prevent that,
 // release the occupied corridors and jointly reroute the affected layers.
 for(const group of [affected,...(expanded.length>affected.length?[expanded]:[])]){
  const length=e=>saved.get(e.id).points.slice(1).reduce((sum,p,i)=>{const q=saved.get(e.id).points[i];return sum+Math.abs(p.x-q.x)+Math.abs(p.y-q.y)},0);
  const orders=[group,[...group].reverse()];
  if(group.length>2)orders.push([...group].sort((a,b)=>length(a)-length(b)),[...group].sort((a,b)=>length(b)-length(a)));
  for(const usePreferred of [true,false])for(const order of orders){
   state.edges.forEach(e=>Object.assign(e,clone(saved.get(e.id))));
   group.forEach(e=>e.points=[]);
   let success=true;
   for(const e of order){
    const previous=saved.get(e.id),attached=moved.includes(e.from);
    if(attached&&e.from===e.to&&e.outerAuto)orientSelf(e);
    if(attached&&e.from===e.to&&!e.outerAuto){const before=old.get(e.from),after=rect(node(e.from));e.points=previous.points.map(p=>({x:p.x+after.x-before.x,y:p.y+after.y-before.y}));if(!routeConflict(e))continue;e.points=[]}
    if(!(usePreferred&&preferredConnection(e,true,true))&&!route(e,true)){success=false;break}
   }
   if(success)return true;
  }
 }
 state.edges.forEach(e=>Object.assign(e,clone(saved.get(e.id))));return false;
}
function addEdge(from,to,chosenSides=null){
 if((from==='control'||to==='control')&&!chosenSides){toast('请直接点击控制室要使用的接口');return false}
 for(const id of new Set([from,to]))if(id!=='control'){
  const needed=from===to?2:1,free=SIDES.reduce((sum,side)=>sum+Math.max(0,MODULE_SIDE_LIMIT-moduleSideUsed(id,side)),0);
  if(free<needed){toast('模块每边最多 5 个接口，四边独立；可用接口不足');return false}
 }
 let a,b;
 if(from===to){const side=outerSide(from);a={side,t:.25};b={side,t:.75}}
 else{const r=rect(node(from)),s=rect(node(to));const horizontal=Math.abs(s.x-r.x)>Math.abs(s.y-r.y);a={side:horizontal?(s.x>r.x?'right':'left'):(s.y>r.y?'bottom':'top'),t:.5};b={side:horizontal?(s.x>r.x?'left':'right'):(s.y>r.y?'top':'bottom'),t:.5}}
 const used=new Set(controlEnds().map(x=>portKey(x.p)));
 if(from==='control')a=claimControlPort(chosenSides.a,used);else a=spareModulePort(from,a);
 if(to==='control')b=claimControlPort(chosenSides.b,used);else b=spareModulePort(to,b,from===to?[port(from,a)]:[]);
 if(!a||!b){toast('所选边的 7 个位置已用满（角落与相邻边共用），请选择其他边');return false}
 const e={id:uid(),from,to,a,b,layer:activeLayer,color:COLORS[state.edges.length%COLORS.length],name:'',points:[],manual:false,outerAuto:from===to};
 state.edges.push(e);const ok=routeNewConnection(e);state.edges.pop();
 if(!ok){toast('已尝试外围绕行和模块四边接口，仍被已有线路阻隔；请调整相关线路');return false}
 checkpoint();state.edges.push(e);selectedNode=null;selectedControlPort=null;selectedEdge=e.id;commit();toast(from===to?'已添加朝外的独立自连回路':'已连接：'+label(from)+' → '+label(to));return true;
}
function selectNode(id,p){
 if(id==='control'){chooseControlPort(draggedPort('control',p||{x:620,y:415}));return}
 if(selectedNode)addEdge(selectedNode,id,selectedNode==='control'?{a:selectedControlPort}:null);
 else{selectedNode=id;selectedControlPort=null;selectedEdge=null;render()}
}
function deselect(){selectedNode=selectedEdge=selectedControlPort=null;render()}
function openPicker(slot,id=null){pickerSlot=slot;pickerNode=id;selectedNode=selectedEdge=null;render();$('picker-title').textContent=(id?'替换模块':'添加模块')+' · 槽位 '+String(slot+1).padStart(2,'0');$('keep-wrap').hidden=!id;$('keep-lines').checked=true;$('picker').showModal()}
function chooseType(typeId){
 if(typeId==='split'){toast('分流器暂不支持添加');return}
 const before=clone(state),old=new Map(state.modules.map(n=>[n.id,rect(n)]));
 if(pickerNode){const n=node(pickerNode);n.type=typeId;n.name='';delete n.recipeId;delete n.recipeIds;for(const e of state.edges)if(e.from===n.id||e.to===n.id){delete e.itemId;delete e.itemIds;}if(!$('keep-lines').checked)state.edges=state.edges.filter(e=>e.from!==n.id&&e.to!==n.id)}
 else state.modules.push({id:uid(),type:typeId,slot:pickerSlot,name:'',rotation:0});
 if(!rewireMoved([],old)){state=before;$('picker').close();render();toast('当前线路无法绕开这个模块，已取消放置；请先调整附近线路');return}
 const changed=state;state=before;checkpoint();state=changed;$('picker').close();commit();
 const adjusted=state.edges.filter(e=>{const previous=before.edges.find(x=>x.id===e.id);return previous&&JSON.stringify(previous.points)!==JSON.stringify(e.points)});
 adjusted.forEach(e=>animateSnap(e.id));if(adjusted.length)toast('模块已放置，'+adjusted.length+' 条线路已自动绕开');
}
function moveNode(id,slot){
 const n=node(id);if(n.slot===slot)return;
 const before=clone(state),old=new Map(state.modules.map(n=>[n.id,rect(n)])),other=state.modules.find(x=>x.slot===slot);
 if(other)other.slot=n.slot;n.slot=slot;
 if(!rewireMoved([id,...(other?[other.id]:[])],old)){state=before;render();toast('这个位置无法保持无交叉线路，已取消移动；请先调整线路');return}
 const changed=state;state=before;checkpoint();state=changed;selectedNode=selectedEdge=null;commit();toast(other?'已交换模块并避开已有线路':'已移动模块并避开已有线路');
}
function deleteSelected(){if(selectedEdge){checkpoint();state.edges=state.edges.filter(e=>e.id!==selectedEdge);selectedEdge=null;commit()}else if(selectedNode&&selectedNode!=='control'){const id=selectedNode;checkpoint();state.modules=state.modules.filter(n=>n.id!==id);state.edges=state.edges.filter(e=>e.from!==id&&e.to!==id);selectedNode=null;commit();toast('已删除模块及关联线路 · 可撤销')}}
function moveSegment(edge,original,index,p){
 const points=clone(original.points),a=points[index],b=points[index+1];
 if(a.y===b.y)a.y=b.y=p.y;else a.x=b.x=p.x;
 // Preserve orthogonality even when the selected segment is collinear with
 // an endpoint stub: moving it introduces an elbow instead of a diagonal.
 const fixed=[points[0]];
 for(let i=1;i<points.length;i++){
  const prev=points[i-1],next=points[i];
  if(prev.x!==next.x&&prev.y!==next.y){
   const oldA=original.points[i-1],oldB=original.points[i];
   const horizontal=oldA.y===oldB.y;
   fixed.push(i===index+2?(horizontal?{x:prev.x,y:next.y}:{x:next.x,y:prev.y}):(horizontal?{x:next.x,y:prev.y}:{x:prev.x,y:next.y}));
  }
  fixed.push(next);
 }
 edge.points=compact(fixed);edge.manual=true;
}
function previewPortDrag(edge,original,end,next){
 const before=clone(edge),id=end==='a'?edge.from:edge.to;
 edge[end]=next;edge.outerAuto=false;
 if(!moduleCapacityAllows(edge)||(id==='control'&&controlPortOccupied(edge,end,next))){Object.assign(edge,before);return false}
 const points=clone(end==='a'?original.points:[...original.points].reverse()),at=port(id,next);
 if(points.length>2&&next.side===original[end].side){
  const vertical=['top','bottom'].includes(next.side),axis=vertical?'x':'y';
  points[0]=at;points[1][axis]=at[axis];
  edge.points=simplify(end==='a'?points:points.reverse());
  const adjacent=end==='a'?edge.points[1]:edge.points.at(-2);
  if(adjacent&&leavesPortOutward(at,adjacent,next.side)&&!routeConflict(edge)){edge.manual=true;return true}
  // Sliding an endpoint should not silently switch to the opposite side of an obstacle.
  Object.assign(edge,before);return false;
 }
 if(route(edge)){edge.manual=true;return true}
 Object.assign(edge,before);return false;
}
function previewSegmentDrag(edge,original,index,p,start){
 if(simplify(original.points).length===2)return previewStraightDrag(edge,original,p,start);
 const before=clone(edge),a=original.points[index],b=original.points[index+1],horizontal=a.y===b.y,axis=horizontal?'y':'x';
 const terminal=index===0?'a':index===original.points.length-2?'b':null;
 if(terminal&&original.from!=='control'&&original.to!=='control'){
  const id=terminal==='a'?edge.from:edge.to,side=original[terminal].side,compatible=horizontal?['left','right'].includes(side):['top','bottom'].includes(side);
  if(compatible){
   const r=rect(node(id)),size=horizontal?r.h:r.w;
   const t=original[terminal].t+(p[axis]-start[axis])/size;
   if(t>=(id==='control'?0:.08)&&t<=(id==='control'?1:.92)){
    const next={side,t:id==='control'?Math.round(t*6)/6:t};
    const ok=previewPortDrag(edge,original,terminal,next);
    return {valid:ok,snapped:ok&&id==='control'};
   }
  }
 }
 if(original.from!==original.to&&(original.from==='control'||original.to==='control')){
  const compatible=side=>horizontal?['left','right'].includes(side):['top','bottom'].includes(side);
  if(compatible(original.a.side)&&compatible(original.b.side))return previewTranslatedRoute(edge,original,p,start,horizontal);
  const verticalSides=[original.a.side,original.b.side].every(side=>['left','right'].includes(side));
  const horizontalSides=[original.a.side,original.b.side].every(side=>['top','bottom'].includes(side));
  if(verticalSides&&Math.abs(p.y-start.y)>Math.abs(p.x-start.x))return previewTranslatedRoute(edge,original,p,start,true);
  if(horizontalSides&&Math.abs(p.x-start.x)>Math.abs(p.y-start.y))return previewTranslatedRoute(edge,original,p,start,false);
 }
 // Use pointer displacement so grabbing off-center does not shift the line.
 const desired={x:(a.x+b.x)/2+p.x-start.x,y:(a.y+b.y)/2+p.y-start.y};
 const scale=svg.getScreenCTM(),tolerance=10/(horizontal?Math.abs(scale.d):Math.abs(scale.a));
 const geometry=segmentDragGeometry(original,index);
 // Snap BEFORE checking collisions: even a subpixel overshoot past a top
 // input would otherwise be interpreted as entering the module from inside.
 const along=horizontal?'x':'y',low=Math.min(a[along],b[along]),high=Math.max(a[along],b[along]);
 const borders=frameRects().filter(r=>high>=r[along]-(horizontal?r.w:r.h)/2&&low<=r[along]+(horizontal?r.w:r.h)/2).flatMap(r=>[r[axis]-(horizontal?r.h:r.w)/2,r[axis]+(horizontal?r.h:r.w)/2]);
 const parallelTargets=parallelSnap?original.points.filter((_,i)=>i!==index&&i!==index+1).map(q=>q[axis]):[];
 const targets=[...new Set([...parallelTargets,...borders])]
  .filter(value=>Math.abs(value-desired[axis])<=tolerance).sort((a,b)=>Math.abs(a-desired[axis])-Math.abs(b-desired[axis]));
 for(const value of [...targets,desired[axis]]){
  moveSegment(edge,geometry.edge,geometry.index,{...desired,[axis]:value});
  edge.points=simplify(edge.points);
  if(!routeConflict(edge))return {valid:true,snapped:value!==desired[axis]};
 }
 Object.assign(edge,before);return {valid:false,snapped:false};
}
function previewStraightDrag(edge,original,p,start){
 const points=simplify(original.points),horizontal=points[0].y===points[1].y;
 return previewTranslatedRoute(edge,original,p,start,horizontal);
}
function previewTranslatedRoute(edge,original,p,start,horizontal){
 const points=[original.points[0],original.points.at(-1)],axis=horizontal?'y':'x';
 const compatible=side=>horizontal?['left','right'].includes(side):['top','bottom'].includes(side);
 // A straight line moves as one object, with its terminals sliding on edges.
 if(!compatible(original.a.side)||!compatible(original.b.side))return {valid:false,snapped:false};
 let delta=p[axis]-start[axis],minimum=-Infinity,maximum=Infinity;
 for(const [k,id,i] of [['a',original.from,0],['b',original.to,1]]){
  const r=rect(node(id)),size=horizontal?r.h:r.w,margin=id==='control'?0:.08;
  minimum=Math.max(minimum,r[axis]-size/2+size*margin-points[i][axis]);
  maximum=Math.min(maximum,r[axis]+size/2-size*margin-points[i][axis]);
 }
 if(minimum>maximum)return {valid:false,snapped:false};
 delta=Math.max(minimum,Math.min(maximum,delta));
 const controlEnd=original.from==='control'?'a':original.to==='control'?'b':null;
 if(controlEnd){
  const r=rect(CONTROL),size=horizontal?r.h:r.w,t=original[controlEnd].t;
  const options=Array.from({length:7},(_,i)=>(i/6-t)*size).filter(d=>d>=minimum-.01&&d<=maximum+.01);
  if(!options.length)return {valid:false,snapped:false};
  options.sort((a,b)=>Math.abs(a-delta)-Math.abs(b-delta));delta=options[0];
 }
 const before=clone(edge);Object.assign(edge,clone(original));
 for(const [k,id] of [['a',edge.from],['b',edge.to]]){
  const r=rect(node(id)),size=horizontal?r.h:r.w;
  edge[k].t=original[k].t+delta/size;
  if(id==='control')edge[k].t=Math.round(edge[k].t*6)/6;
  if(id==='control'&&controlPortOccupied(edge,k,edge[k])){Object.assign(edge,before);return {valid:false,snapped:false}}
 }
 edge.points=original.points.map(q=>({...q,[axis]:q[axis]+delta}));
 if(!moduleCapacityAllows(edge)||routeConflict(edge)){Object.assign(edge,before);return {valid:false,snapped:false}}
 edge.manual=true;return {valid:true,snapped:controlEnd!==null};
}
function drawGround(){
 $('ground').innerHTML=`<path d="M484 129 L756 129 L909 231 L1011 384 L1011 656 L909 809 L756 911 L484 911 L331 809 L229 656 L229 384 L331 231 Z" fill="none" stroke="#cbd0d4" stroke-width="1.5" stroke-dasharray="5 8"/><circle cx="620" cy="520" r="235" stroke="#d5d8dc" stroke-width="1" fill="none"/>`;
}
function nodeMarkup(n){
 const r=rect(n),t=type(n),chosen=n.id===selectedNode,control=n.id==='control';
 const name=n.name||t.name;const split=name.length>8?[name.slice(0,Math.ceil(name.length/2)),name.slice(Math.ceil(name.length/2))]:[name];
 return `<g class="node ${chosen?'selected':''}" data-node="${n.id}" transform="translate(${r.x} ${r.y})"><rect class="selection-halo" x="${-r.w/2-7}" y="${-r.h/2-7}" width="${r.w+14}" height="${r.h+14}" rx="14"/><rect class="node-body" x="${-r.w/2}" y="${-r.h/2}" width="${r.w}" height="${r.h}" rx="2" fill="${control?'#d7dadd':'#f4f5f6'}" stroke="${control?'#929ba2':'#b6bdc3'}" stroke-width="1.5"/><rect x="${-r.w/2+13}" y="${-r.h/2+13}" width="28" height="24" rx="5" fill="${t.color}15" stroke="${t.color}50"/><text x="${-r.w/2+27}" y="${-r.h/2+29}" text-anchor="middle" font-size="8" font-weight="700" fill="${t.color}">${t.short}</text><text x="${r.w/2-13}" y="${-r.h/2+28}" text-anchor="end" font-size="10" fill="#7a848d">${control?'固定':('SLOT '+slotLabel(n))}</text>${control?'<path d="M-24-20 h48 v32 h-48z M-17-13 h34 v18 h-34z M0 12v9 M-13 21h26" fill="none" stroke="#778a85" stroke-width="2"/>':''}${split.map((s,i)=>`<text x="0" y="${control?43:split.length===1?15:9+i*16}" text-anchor="middle" font-size="${control?17:13}" font-weight="550" fill="#363e45">${esc(s)}</text>`).join('')}<text x="0" y="${r.h/2-12}" text-anchor="middle" font-size="8" letter-spacing="${control?2:.6}" fill="#87929b">${control?'CONTROL ROOM':t.short}</text></g>`;
}
function drawNodes(){
 $('nodes').innerHTML=SLOTS.filter(s=>!state.modules.some(n=>n.slot===s.id)).map(s=>`<g class="slot" data-slot="${s.id}" transform="translate(${s.x} ${s.y})"><rect class="slot-bg" x="-66" y="-66" width="132" height="132" rx="2" fill="#e9ebed" stroke="#b8bfc5" stroke-width="1.5" stroke-dasharray="5 5"/><text x="-52" y="-43" fill="#7f8891" font-size="10">SLOT ${String(s.id+1).padStart(2,'0')}</text><path d="M-7 3h14 M0-4v14" stroke="#8d9ba3" stroke-width="1.5"/><text x="0" y="30" text-anchor="middle" font-size="11" fill="#7e8a91">添加模块</text></g>`).join('')+[CONTROL,...state.modules].map(nodeMarkup).join('');
 $('sockets').innerHTML=controlMarks();
}
function edgePath(e){return e.points.map((p,i)=>(i?'L':'M')+p.x+' '+p.y).join(' ')}
function arrows(e){let result='';for(let i=1;i<e.points.length;i++){const a=e.points[i-1],b=e.points[i],dx=b.x-a.x,dy=b.y-a.y,len=Math.abs(dx)+Math.abs(dy);if(len<26)continue;const angle=dx>0?0:dx<0?180:dy>0?90:-90;for(let d=18;d<len-6;d+=42){const x=a.x+dx*d/len,y=a.y+dy*d/len;result+=`<path d="M-4-4 L0 0 L-4 4" transform="translate(${x} ${y}) rotate(${angle})" fill="none" stroke="${e.color}" stroke-width="2.2"/>`}}return result}
function drawWires(){
 const edges=[...state.edges].sort((a,b)=>(edgeLayer(a)===activeLayer?1:0)-(edgeLayer(b)===activeLayer?1:0)||(a.id===selectedEdge?1:0)-(b.id===selectedEdge?1:0));
 $('wires').innerHTML=edges.map(e=>{
  const chosen=e.id===selectedEdge,active=edgeLayer(e)===activeLayer,dim=selectedNode&&e.from!==selectedNode&&e.to!==selectedNode,offset=layerOffset(e);
  return `<g data-edge="${e.id}" data-layer="${edgeLayer(e)}" transform="translate(${offset} ${offset})" opacity="${active?(dim?.2:1):.22}" style="pointer-events:${active?'auto':'none'}"><path d="${edgePath(e)}" fill="none" stroke="${chosen?'#c0d1cc':'#e4e5e7'}" stroke-width="${chosen?10:7}" stroke-linejoin="miter"/><path d="${edgePath(e)}" fill="none" stroke="${e.color}" stroke-width="${chosen?3:2.5}" stroke-linejoin="miter"/>${arrows(e)}<path class="wire-hit" d="${edgePath(e)}"/></g>`;
 }).join('');
 drawHandles();
}
function drawHandles(){
 const e=state.edges.find(e=>e.id===selectedEdge);if(uiMode==='view'||!e||edgeLayer(e)!==activeLayer||e.points.length<2){$('handles').innerHTML='';return}
 let out='';for(let i=0;i<e.points.length-1;i++){const a=e.points[i],b=e.points[i+1];if(equal(a,b))continue;const x=(a.x+b.x)/2,y=(a.y+b.y)/2,horizontal=a.y===b.y;out+=`<g class="segment-handle" data-segment="${i}" style="cursor:${e.from==='control'||e.to==='control'?'move':horizontal?'ns-resize':'ew-resize'}"><rect x="${x-12}" y="${y-12}" width="24" height="24" fill="transparent"/><rect x="${x-(horizontal?10:4)}" y="${y-(horizontal?4:10)}" width="${horizontal?20:8}" height="${horizontal?8:20}" rx="3" fill="#fff" stroke="${e.color}" stroke-width="2"/></g>`}
 for(const end of ['a','b']){const p=port(end==='a'?e.from:e.to,e[end]);out+=`<g class="port-handle" data-port="${end}"><circle cx="${p.x}" cy="${p.y}" r="14" fill="transparent"/><circle cx="${p.x}" cy="${p.y}" r="7" fill="#fff" stroke="${e.color}" stroke-width="3"/><text x="${p.x}" y="${p.y-14}" text-anchor="middle" font-size="10" fill="#446451">${end==='a'?'出':'入'}</text></g>`}
 $('handles').setAttribute('transform',`translate(${layerOffset(e)} ${layerOffset(e)})`);$('handles').innerHTML=out;
}
function renderInspector(){
 const e=state.edges.find(e=>e.id===selectedEdge),n=node(selectedNode);
 if(e){$('inspector').innerHTML=`<h2>${e.from===e.to?'自连回路':'运输线路'} <span class="tiny-badge">${e.unrouted?'待调整':e.manual?'手动':'自动'}</span></h2><div class="detail-box">${layerName(edgeLayer(e))}<br>${esc(label(e.from))} <small>(${slotLabel(node(e.from))})</small><br>↓<br>${esc(label(e.to))} <small>(${slotLabel(node(e.to))})</small></div><label class="detail-label" for="edge-name">线路备注</label><input id="edge-name" class="text-input" placeholder="例如：预备贴片元件" value="${esc(e.name)}"><span class="detail-label">线路颜色 · ${colorName(e.color)}</span><div class="palette">${COLORS.map(c=>`<button class="color-btn ${c===e.color?'active':''}" style="background:${c}" data-color="${c}" title="${colorName(c)}" aria-label="${colorName(c)}"></button>`).join('')}</div><div class="action-row"><button data-action="reset-route">重新布线</button><button data-action="raise">置顶显示</button><button data-action="lower">置底显示</button><button data-action="delete" class="danger">删除线路</button></div>`}
 else if(n){const t=type(n);$('inspector').innerHTML=`<h2>${esc(n.name||t.name)}</h2><div class="detail-box">${n.id==='control'?'中央固定控制室 · 每边 7 个位置 · 四角共用<br>已用 '+controlEnds().length+' / 24':'槽位 '+slotLabel(n)+' · '+t.short+'<br>每边 5 个接口 · 四边独立<br>'+SIDES.map(side=>SIDE_NAMES[side]+' '+moduleSideUsed(n.id,side)+'/5').join(' · ')}</div>${n.id!=='control'?`<label class="detail-label" for="node-name">模块名称</label><input id="node-name" class="text-input" value="${esc(n.name)}" placeholder="${t.name}"><div class="action-row"><button data-action="replace">替换模块</button><button data-action="delete" class="danger">删除模块</button></div>`:''}`}
 else $('inspector').innerHTML='';
 renderRecipeInspector();
}
function renderLists(){
 $('module-count').innerHTML=state.modules.length+'<span>/12</span>';$('list-count').textContent=String(state.modules.length).padStart(2,'0');$('wire-list-count').textContent=String(state.edges.length).padStart(2,'0');
 $('module-list').innerHTML=state.modules.length?[...state.modules].sort((a,b)=>a.slot-b.slot).map(n=>`<div class="module-row" data-list-node="${n.id}"><span class="slot-num">${slotLabel(n)}</span><i class="swatch" style="background:${type(n).color}"></i><span class="row-name">${esc(n.name||type(n).name)}</span></div>`).join(''):'<div class="empty-list">槽位已就绪，等待你的布局。</div>';
 $('wire-list').innerHTML=state.edges.length?state.edges.map((e,i)=>`<button class="wire-row ${e.id===selectedEdge?'active':''}" data-list-edge="${e.id}"><strong><i style="background:${e.color}"></i>${esc(e.name||'线路 '+String(i+1).padStart(2,'0'))}${e.from===e.to?' <span class="tiny-badge">自连</span>':''}${e.unrouted?' <span class="tiny-badge danger">待调整</span>':''}</strong><small>${transportItems(e).length?transportMarkup(e)+'<br>':''}${layerName(edgeLayer(e))} · ${slotLabel(node(e.from))} → ${slotLabel(node(e.to))} · ${esc(type(node(e.from)).short)} → ${esc(type(node(e.to)).short)}</small></button>`).join(''):'<div class="empty-list">连接模块后，线路会列在这里。</div>';
}
function render(){drawNodes();drawWires();renderInspector();renderLists();applyModeUI();}
function applyModeUI(){
 const viewing=uiMode==='view';document.body.dataset.mode=uiMode;
 $('layer-one').setAttribute('aria-pressed',String(activeLayer===1));$('layer-two').setAttribute('aria-pressed',String(activeLayer===2));
 $('mode-view').setAttribute('aria-pressed',String(viewing));$('mode-connect').setAttribute('aria-pressed',String(!viewing));
 $('undo').disabled=viewing||!history.length;$('redo').disabled=viewing||!future.length;
 for(const id of ['reset-layout','import-btn','parallel-snap'])$(id).disabled=viewing;
 $('inspector').querySelectorAll('button,input,select').forEach(el=>el.disabled=viewing&&!['recipe-search','item-search'].includes(el.id));
}
function setLayer(layer){
 if(drag?.before){state=drag.before;if(drag.moved)history.pop()}
 drag=null;$('ghost').innerHTML='';if($('picker').open)$('picker').close();
 activeLayer=layer;selectedNode=selectedEdge=selectedControlPort=null;
 try{localStorage.setItem('nac-active-layer',String(layer))}catch{}
 render();
}
function selectEdge(id){
 const edge=state.edges.find(e=>e.id===id);if(!edge)return;
 if(edgeLayer(edge)!==activeLayer)setLayer(edgeLayer(edge));
 selectedEdge=id;selectedNode=selectedControlPort=null;render();
}
$('layer-one').onclick=()=>setLayer(1);$('layer-two').onclick=()=>setLayer(2);
function setMode(mode){
 if(drag?.before){state=drag.before;if(drag.moved)history.pop()}
 drag=null;$('ghost').innerHTML='';if($('picker').open)$('picker').close();
 uiMode=mode;selectedNode=selectedEdge=selectedControlPort=null;
 try{localStorage.setItem('nac-ui-mode',mode)}catch{}
 render();
}
$('mode-view').onclick=()=>setMode('view');$('mode-connect').onclick=()=>setMode('connect');
function drawGhost(id,p){const r=rect(node(id));const near=SLOTS.find(s=>Math.abs(p.x-s.x)<MODULE_SIZE/2&&Math.abs(p.y-s.y)<MODULE_SIZE/2);$('ghost').innerHTML=(near?`<rect class="node-drop" x="${near.x-70}" y="${near.y-70}" width="140" height="140" rx="4"/>`:'')+`<g class="ghost-node" transform="translate(${p.x-r.x} ${p.y-r.y})">${nodeMarkup(node(id))}</g>`}
function setView(){svg.setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`);$('fit').textContent=Math.round(1240/view.w*100)+'%'}
function zoom(factor,p={x:view.x+view.w/2,y:view.y+view.h/2}){const w=Math.min(2400,Math.max(430,view.w*factor)),f=w/view.w;view={x:p.x-(p.x-view.x)*f,y:p.y-(p.y-view.y)*f,w,h:view.h*f};setView()}
svg.addEventListener('pointerdown',e=>{
 if(e.button!==0)return;
 if(uiMode==='view'){
  const wire=e.target.closest('[data-edge]'),n=e.target.closest('[data-node]'),socket=e.target.closest('[data-control-side]');
  let target=wire?{edge:wire.dataset.edge}:n?{node:n.dataset.node}:socket?{node:'control'}:null;
  if(socket){const entry=controlEnds().find(x=>portKey(x.p)===portKey({side:socket.dataset.controlSide,t:Number(socket.dataset.controlIndex)/6}));if(entry)target={edge:entry.e.id}}
  drag={kind:'pan',start:point(e),sx:e.clientX,sy:e.clientY,view:{...view},moved:false,viewTarget:target};svg.setPointerCapture(e.pointerId);e.preventDefault();return;
 }
 const socket=e.target.closest('[data-control-side]');if(socket){const p={side:socket.dataset.controlSide,t:Number(socket.dataset.controlIndex)/6};if(p.t===0||p.t===1){const nearest=draggedPort('control',point(e));if(portKey(nearest)===portKey(p))p.side=nearest.side}chooseControlPort(p);e.preventDefault();return}const p=point(e),handle=e.target.closest('[data-port]'),segment=e.target.closest('[data-segment]'),n=e.target.closest('[data-node]'),s=e.target.closest('[data-slot]'),wire=e.target.closest('[data-edge]');
 if(handle||segment){drag={kind:handle?'port':'segment',end:handle?.dataset.port,index:Number(segment?.dataset.segment),edge:selectedEdge,start:p,sx:e.clientX,sy:e.clientY,before:clone(state),moved:false};}
 else if(n){drag={kind:'node',id:n.dataset.node,start:p,sx:e.clientX,sy:e.clientY,moved:false}}
 else if(s){openPicker(Number(s.dataset.slot));return}
 else if(wire){selectEdge(wire.dataset.edge);return}
 else{drag={kind:'pan',start:p,sx:e.clientX,sy:e.clientY,view:{...view},moved:false}}
 svg.setPointerCapture(e.pointerId);e.preventDefault();
});
svg.addEventListener('pointermove',e=>{
 if(!drag)return;const p=point(e);if(!drag.moved&&Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)<5)return;
 if(!drag.moved&&(drag.kind==='port'||drag.kind==='segment')){checkpoint()}
 drag.moved=true;
 if(drag.kind==='node'){if(drag.id!=='control')drawGhost(drag.id,p)}
 else if(drag.kind==='pan'){const ctm=svg.getScreenCTM();view.x=drag.view.x-(e.clientX-drag.sx)/ctm.a;view.y=drag.view.y-(e.clientY-drag.sy)/ctm.d;setView()}
 else {const edge=state.edges.find(x=>x.id===drag.edge);if(drag.kind==='port'){const id=drag.end==='a'?edge.from:edge.to;const previous=clone(edge);const offset=layerOffset(edge),next=draggedPort(id,{x:p.x-offset,y:p.y-offset});edge[drag.end]=next;edge.outerAuto=false;drag.capacityBlocked=id!=='control'&&!moduleCapacityAllows(edge);if(drag.capacityBlocked||(id==='control'&&controlPortOccupied(edge,drag.end,next))||!previewPortDrag(edge,drag.before.edges.find(x=>x.id===drag.edge),drag.end,next)){Object.assign(edge,previous);drag.blocked=true}else drag.blocked=false}else{const original=drag.before.edges.find(x=>x.id===drag.edge),result=previewSegmentDrag(edge,original,drag.index,p,drag.start);drag.blocked=!result.valid;drag.snapped=result.snapped}drawWires();}
});
svg.addEventListener('pointerup',e=>{
 if(!drag)return;const d=drag,p=point(e);drag=null;$('ghost').innerHTML='';
 if(d.kind==='node'){if(!d.moved)selectNode(d.id,p);else if(d.id!=='control'){const target=SLOTS.find(s=>Math.abs(p.x-s.x)<MODULE_SIZE/2&&Math.abs(p.y-s.y)<MODULE_SIZE/2);if(target)moveNode(d.id,target.id);else toast('拖到外围槽位内即可放置')}}
 else if(d.kind==='pan'){if(!d.moved){if(uiMode==='view'&&d.viewTarget){selectedNode=d.viewTarget.node||null;selectedEdge=d.viewTarget.edge||null;selectedControlPort=null;if(selectedEdge)selectEdge(selectedEdge);else render()}else deselect()}}
 else if(d.moved){if(d.blocked){state=d.before;history.pop();render();toast(d.capacityBlocked?'这一边已有 5 个接口，不能再放入；已恢复原位置':'该调整会穿过模块或与其他线路相交，已恢复原线路')}else{const edge=state.edges.find(x=>x.id===d.edge);const snapped=edge?settleLine(edge):false;commit();if(edge&&(snapped||d.snapped))animateSnap(edge.id)}}
});
svg.addEventListener('pointercancel',()=>{if(drag?.before){state=drag.before;if(drag.moved)history.pop()}drag=null;$('ghost').innerHTML='';render()});
document.addEventListener('contextmenu',e=>{
 if(!selectedNode&&!selectedEdge&&!drag)return;
 e.preventDefault();e.stopPropagation();
 if(drag?.before){state=drag.before;if(drag.moved)history.pop()}
 drag=null;$('ghost').innerHTML='';
 
 deselect();
},true);
svg.addEventListener('contextmenu',e=>{if(uiMode==='view'){e.preventDefault();deselect();return}const n=e.target.closest('[data-node]');if(n){e.preventDefault();const id=n.dataset.node;if(id!=='control')openPicker(node(id).slot,id);else toast('中央控制室固定，不可替换')}});
svg.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY>0?1.09:1/1.09,point(e))},{passive:false});
$('choices').innerHTML=TYPES.filter(t=>t.id!=='split').map(t=>`<button class="choice" data-type="${t.id}"><span class="choice-icon" style="color:${t.color}">${t.short}</span><span><b>${t.name}</b><small>${t.en}</small></span></button>`).join('');
$('choices').addEventListener('click',e=>{const b=e.target.closest('[data-type]');if(b)chooseType(b.dataset.type)});
$('close-picker').onclick=()=>$('picker').close();$('picker').addEventListener('click',e=>{if(e.target===$('picker')){const r=$('picker').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('picker').close()}});
$('module-list').onclick=e=>{const row=e.target.closest('[data-list-node]');if(row){selectedNode=row.dataset.listNode;selectedEdge=null;render()}};
$('wire-list').onclick=e=>{const row=e.target.closest('[data-list-edge]');if(row)selectEdge(row.dataset.listEdge)};
$('inspector').addEventListener('change',event=>{if(uiMode==='view')return;const e=state.edges.find(e=>e.id===selectedEdge),n=node(selectedNode);if(event.target.id==='edge-name'&&e){checkpoint();e.name=event.target.value.slice(0,80);commit()}if(event.target.id==='node-name'&&n){checkpoint();n.name=event.target.value.slice(0,30);commit()}});
$('inspector').onclick=event=>{
 if(uiMode==='view')return;
 const c=event.target.closest('[data-color]'),action=event.target.closest('[data-action]')?.dataset.action,e=state.edges.find(e=>e.id===selectedEdge),n=node(selectedNode);
 if(c&&e)recolorTransportChain(e,c.dataset.color);
 if(action==='delete')deleteSelected();
 if(action==='replace'&&n)openPicker(n.slot,n.id);
 if(action==='reset-route'&&e){const before=clone(state);if(e.from===e.to)orientSelf(e);if(routeNewConnection(e)){e.unrouted=false;const changed=state;state=before;checkpoint();state=changed;commit()}else{state=before;render();toast('仍未找到无交叉路径，请调整模块或重新选择接线边')}}
 if((action==='raise'||action==='lower')&&e){checkpoint();state.edges=state.edges.filter(x=>x!==e);if(action==='raise')state.edges.push(e);else state.edges.unshift(e);commit()}
};
$('undo').onclick=undo;$('redo').onclick=redo;$('zoom-in').onclick=()=>zoom(1/1.2);$('zoom-out').onclick=()=>zoom(1.2);$('fit').onclick=()=>{view={x:0,y:0,w:1240,h:1040};setView()};
$('reset-layout').onclick=()=>{
 if(state.modules.length||state.edges.length){checkpoint();state={version:1,layoutVersion:3,modules:[],edges:[]}}
 selectedNode=selectedEdge=selectedControlPort=null;drag=null;$('ghost').innerHTML='';
 view={x:0,y:0,w:1240,h:1040};setView();commit();toast('已重置 · 可撤销');
};
document.addEventListener('keydown',e=>{if($('picker').open)return;if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))return;if(e.key==='Escape')deselect();if(uiMode==='view'){if(['Delete','Backspace'].includes(e.key)||((e.ctrlKey||e.metaKey)&&['z','y'].includes(e.key.toLowerCase())))e.preventDefault();return}if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();deleteSelected()}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo()}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo()}});
function validate(data){
 if(!data||data.version!==1||!Array.isArray(data.modules)||!Array.isArray(data.edges)||data.modules.length>12||data.edges.length>2000)throw new Error('方案格式无效');
 const ids=new Set(['control']),slots=new Set();
 for(const n of data.modules){if(typeof n.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(n.id)||ids.has(n.id)||!TYPES.some(t=>t.id===n.type)||!Number.isInteger(n.slot)||n.slot<0||n.slot>11||slots.has(n.slot)||typeof n.name!=='string'||n.name.length>30||!Number.isInteger(n.rotation)||n.rotation<0||n.rotation>3)throw new Error('模块数据无效');if(n.recipeId!==undefined&&(typeof n.recipeId!=='string'||!recipesFor(n).some(r=>r.id===n.recipeId)))throw new Error('模块配方数据无效');if(n.recipeIds!==undefined&&(!Array.isArray(n.recipeIds)||n.recipeIds.length>recipesFor(n).length||new Set(n.recipeIds).size!==n.recipeIds.length||n.recipeIds.some(id=>typeof id!=='string'||!recipesFor(n).some(r=>r.id===id))))throw new Error('模块配方列表无效');if(n.type==='super'&&n.recipeIds?.length>1)n.recipeIds=n.recipeIds.slice(0,1);ids.add(n.id);slots.add(n.slot)}
 const edgeIds=new Set();for(const e of data.edges){if(typeof e.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(e.id)||edgeIds.has(e.id)||(e.layer!==undefined&&e.layer!==1&&e.layer!==2)||!ids.has(e.from)||!ids.has(e.to)||!/^#[0-9a-f]{6}$/i.test(e.color)||typeof e.name!=='string'||e.name.length>80||!Array.isArray(e.points)||(e.points.length<2&&!(e.unrouted&&e.points.length===0))||e.points.length>300)throw new Error('线路数据无效');if(e.itemId!==undefined&&(typeof e.itemId!=='string'||!Object.hasOwn(NAC_ITEMS,e.itemId)))throw new Error('运输物品数据无效');if(e.itemIds!==undefined&&(!Array.isArray(e.itemIds)||e.itemIds.length>Object.keys(NAC_ITEMS).length||new Set(e.itemIds).size!==e.itemIds.length||e.itemIds.some(id=>typeof id!=='string'||!Object.hasOwn(NAC_ITEMS,id))))throw new Error('运输物品列表无效');edgeIds.add(e.id);for(const p of [e.a,e.b])if(!p||!['left','right','top','bottom'].includes(p.side)||!Number.isFinite(p.t)||p.t<0||p.t>1)throw new Error('接口数据无效');for(let i=0;i<e.points.length;i++){const p=e.points[i],a=e.points[i-1];if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.abs(p.x)>100000||Math.abs(p.y)>100000||(a&&a.x!==p.x&&a.y!==p.y))throw new Error('线路必须为直角折线')}}
 return {version:1,layoutVersion:data.layoutVersion===3?3:1,modules:data.modules,edges:data.edges};
}
function upgradeLayout(){
 if(controlEnds().length>24)throw new Error('控制室超过 24 个独立接口，请减少线路后再导入');
 if(state.layoutVersion===3){
  const used=new Set();for(const x of controlEnds()){const i=x.p.t*6,key=portKey(x.p);if(Math.abs(i-Math.round(i))>.00001||i<0||i>6||used.has(key))throw new Error('控制室接口重复（角落共用），或不在固定位置');used.add(key)}
  for(const e of state.edges){e.points=simplify(e.points);if(routeConflict(e)||!moduleCapacityAllows(e)){e.points=[];e.unrouted=!routeNewConnection(e)}}
  return;
 }
 const used=new Set(),edges=state.edges;state.edges=[];
 for(const e of edges){
  if(e.from===e.to)orientSelf(e);
  for(const k of ['a','b']){const id=k==='a'?e.from:e.to;if(id==='control')e[k]=freeControlPort(e[k].side,used)||SIDES.map(side=>freeControlPort(side,new Set(used))).find(Boolean);else e[k]=spareModulePort(id,e[k],e.from===e.to&&k==='b'?[port(id,e.a)]:[]);if(id==='control')used.add(portKey(e[k]))}
  e.points=[];state.edges.push(e);e.unrouted=!routeNewConnection(e);
 }
 state.layoutVersion=3;
 const pending=state.edges.filter(e=>e.unrouted).length;if(pending)toast('旧方案已保留；'+pending+' 条线路需调整后重新布线，见右侧线路列表');
}
$('export-btn').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='NAC-布局方案.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('方案已导出，可随时重新导入')};
$('import-btn').onclick=()=>$('import-file').click();$('import-file').onchange=async event=>{const f=event.target.files[0];if(!f)return;try{if(f.size>5e6)throw new Error('文件过大');const data=validate(JSON.parse(await f.text()));const old=state;state=data;try{upgradeLayout()}catch(err){state=old;throw err}state=old;checkpoint();state=data;selectedNode=selectedEdge=null;commit();toast('已导入方案 · 可撤销返回之前的布局')}catch(err){toast('导入失败：'+err.message)}event.target.value=''};
try{const saved=localStorage.getItem(KEY);if(saved){const loaded=validate(JSON.parse(saved));if(loaded.layoutVersion!==3&&!localStorage.getItem(KEY+'-before-square-update'))localStorage.setItem(KEY+'-before-square-update',saved);state=loaded;upgradeLayout();persist()}}catch(err){state={version:1,layoutVersion:3,modules:[],edges:[]};toast('原方案仍保留在本机：'+err.message)}
drawGround();render();setView();
