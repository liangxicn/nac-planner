const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const os=require('node:os');
const {pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
 const get=()=>page.evaluate(()=>clone(state));
 const click=id=>page.locator(`[data-node="${id}"]`).click();
 const add=async(slot,type)=>{await page.locator(`[data-slot="${slot}"]`).click();await page.locator(`[data-type="${type}"]`).click();return (await get()).modules.at(-1).id};
 const link=async(a,b,side)=>{const control=async()=>{const pos=await page.evaluate(side=>{const p=freeControlPort(side,new Set(controlEnds().map(x=>portKey(x.p))));return port('control',p)},side);const q=await screen(pos);await page.mouse.click(q.x,q.y)};a==='control'?await control():await click(a);b==='control'?await control():await click(b)};
 const screen=p=>page.evaluate(p=>{const q=svg.createSVGPoint();q.x=p.x;q.y=p.y;const s=q.matrixTransform(svg.getScreenCTM());return {x:s.x,y:s.y}},p);
 const drag=async(a,b)=>{await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:6});await page.mouse.up()};
 const valid=async()=>assert.equal(await page.evaluate(()=>state.edges.every(e=>!routeConflict(e)&&(e.unrouted||e.points.length>=2&&equal(e.points[0],port(e.from,e.a))&&equal(e.points.at(-1),port(e.to,e.b))&&e.points.every((p,i)=>!i||p.x===e.points[i-1].x||p.y===e.points[i-1].y)))),true);
 const slots=[11,0,1,2,3,4,5],types=['matrix','parts','wire','cut','board','wrap','super'],ids=[];
 for(let i=0;i<7;i++)ids.push(await add(slots[i],types[i]));
 assert.equal(await page.evaluate(()=>[...document.querySelectorAll('.node-body,.slot-bg')].every(e=>e.getAttribute('width')===e.getAttribute('height'))),true);
 for(const id of ids)await link('control',id,'top');
 assert.equal((await get()).edges.length,7);await valid();
 assert.deepEqual(await page.evaluate(()=>({top:availableOnSide('top'),left:availableOnSide('left'),right:availableOnSide('right'),bottom:availableOnSide('bottom'),unique:new Set(controlEnds().map(x=>portKey(x.p))).size})),{top:0,left:6,right:6,bottom:7,unique:7});
 console.log('PASS: square frames, direct socket clicks, seven separated planar routes, shared corners');
 await click(ids[0]);const fullPort=await screen(await page.evaluate(()=>port('control',{side:'top',t:0})));await page.mouse.click(fullPort.x,fullPort.y);assert.equal((await get()).edges.length,7);await page.keyboard.press('Escape');
 const first=(await get()).edges[0];await page.locator(`[data-list-edge="${first.id}"]`).click();assert.equal(await page.locator('[data-port="a"]').count(),1);
 const pt=await screen(await page.evaluate(id=>{const e=state.edges.find(e=>e.id===id);return port(e.from,e.a)},first.id));const before=await get();const target=await screen(await page.evaluate(()=>port('control',{side:'left',t:.5})));await drag(pt,target);assert.equal((await get()).edges[0].a.side,'left');assert.equal((await get()).edges[0].a.t,.5);await valid();await page.locator('#undo').click();assert.deepEqual(await get(),before);
 console.log('PASS: occupied socket refuses reuse; control endpoint drags between sides and undo restores it');
 // Find a genuine manual edit which crosses another line, then perform it with the mouse.
 const crossing=await page.evaluate(()=>{
  for(const e of state.edges)for(let i=1;i<e.points.length-2;i++)for(const delta of [-100,100,-200,200]){
   const original=clone(e),a=e.points[i],b=e.points[i+1],center={x:(a.x+b.x)/2,y:(a.y+b.y)/2},horizontal=a.y===b.y;
   const target={x:center.x+(horizontal?0:delta),y:center.y+(horizontal?delta:0)};
   const bad=!previewSegmentDrag(e,original,i,target,center).valid;Object.assign(e,original);
   if(bad)return {id:e.id,index:i,center,target};
  }
 });assert.ok(crossing);await page.locator(`[data-list-edge="${crossing.id}"]`).click();const unchanged=await get();await drag(await screen(crossing.center),await screen(crossing.target));assert.deepEqual(await get(),unchanged);await valid();
 console.log('PASS: crossing manual drag rejected without losing the original route');
 await page.keyboard.press('Escape');await page.evaluate(()=>document.getElementById('toast').classList.remove('show'));await page.screenshot({path:path.join(__dirname,'preview.png')});
 const saved=await get();await page.reload();assert.deepEqual(await get(),saved);
 const promise=page.waitForEvent('download');await page.locator('#export-btn').click();const download=await promise,file=path.join(os.tmpdir(),'nac-square-export.json');await download.saveAs(file);assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),saved);await page.locator('#import-file').setInputFiles(file);await page.waitForFunction(()=>document.getElementById('toast').textContent.includes('已导入'));assert.deepEqual(await get(),saved);
 console.log('PASS: persistence, import/export preserve fixed ports and planar paths');
 // Dedicated self-loop scene verifies every location and moving around the ring.
 await page.evaluate(()=>{state={version:1,layoutVersion:3,modules:[],edges:[]};selectedNode=selectedEdge=null;history=[];future=[];commit()});
 const self=await add(0,'matrix');await link(self,self);assert.equal((await get()).edges.length,1);
 const selfEdge=(await get()).edges[0];assert.equal(selfEdge.a.side,'top');
 await drag(await screen(await page.evaluate(id=>rect(node(id)),self)),await screen(await page.evaluate(()=>SLOTS[10])));
 assert.equal((await get()).modules[0].slot,10);assert.equal((await get()).edges[0].a.side,'left');await valid();
 const normalSelf=await get();await page.locator(`[data-list-edge="${selfEdge.id}"]`).click();
 const seg=await page.evaluate(()=>{const e=state.edges[0],a=e.points[1],b=e.points[2];return {x:(a.x+b.x)/2,y:(a.y+b.y)/2}});
 await drag(await screen(seg),await screen({x:seg.x-20,y:seg.y}));assert.equal((await get()).edges[0].manual,true);await valid();
 await page.locator('#undo').click();assert.deepEqual(await get(),normalSelf);
 await page.keyboard.press('Escape');await page.locator(`[data-node="${self}"]`).click({button:'right'});await page.locator('[data-type="parts"]').click();assert.equal((await get()).edges.length,1);
 await page.locator(`[data-node="${self}"]`).click({button:'right'});await page.locator('#keep-lines').uncheck();await page.locator('[data-type="wrap"]').click();assert.equal((await get()).edges.length,0);await page.locator('#undo').click();assert.equal((await get()).edges.length,1);
 console.log('PASS: outward self-loop, module move, manual loop editing, replace preserve/remove, undo');
 const allLoops=await page.evaluate(()=>{
  const old=clone(state),result=[];
  for(let slot=0;slot<12;slot++){state={version:1,layoutVersion:3,modules:[{id:'m',slot,type:'matrix',name:'',rotation:0}],edges:[]};const ok=addEdge('m','m');const e=state.edges[0],r=rect(node('m'));result.push(ok&&e.a.side===outerSide('m')&&!routeConflict(e)&&e.points.some(p=>Math.hypot(p.x-620,p.y-520)>Math.hypot(r.x-620,r.y-520)+r.w/2))}
  state=old;render();return result;
 });assert.equal(allLoops.every(Boolean),true);
 const capacity=await page.evaluate(()=>{const used=new Set(),count=SIDES.map(side=>{let n=0;while(freeControlPort(side,used))n++;return n});return {count,size:used.size}});assert.deepEqual(capacity,{count:[7,6,6,5],size:24});
 console.log('PASS: all 12 outward loop directions; exactly 24 unique control ports');
 // Migrate a previous layout without dropping module or edge records.
 const legacy=JSON.parse(JSON.stringify(saved));delete legacy.layoutVersion;for(const e of legacy.edges)e.a.t=.5;
 await page.evaluate(data=>localStorage.setItem(KEY,JSON.stringify(data)),legacy);await page.reload();
 assert.equal((await get()).edges.length,legacy.edges.length);assert.equal((await get()).layoutVersion,3);await valid();assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem(KEY+'-before-square-update'))),legacy);
 assert.equal(await page.evaluate(()=>new Set(controlEnds().map(x=>portKey(x.p))).size),7);

 // Reproduce the user's two top modules, self-loop, red horizontal link,
 // and two control outputs; dragging the second input left must make one bend.
 await page.evaluate(()=>{state={version:1,layoutVersion:3,modules:[],edges:[]};selectedNode=selectedEdge=null;history=[];future=[];commit()});
 const matrix=await add(0,'matrix'),parts=await add(1,'parts');
 await link(matrix,matrix);await link(parts,matrix);await link('control',matrix,'top');await link('control',parts,'top');
 assert.equal((await get()).edges.length,4);
 const green=(await get()).edges.at(-1);
 const start=await screen(await page.evaluate(id=>{const e=state.edges.find(e=>e.id===id);return port(e.to,e.b)},green.id));
 const left=await screen(await page.evaluate(id=>port(id,{side:'left',t:.75}),parts));
 await drag(start,left);
 assert.equal((await get()).edges.at(-1).b.side,'left');
 assert.equal(await page.evaluate(()=>simplify(state.edges.at(-1).points).length),3);
 await valid();
 const persisted=await get();await page.reload();assert.deepEqual(await get(),persisted);
 await click(matrix);await page.locator(`[data-node="${matrix}"]`).click({button:'right'});
 assert.equal(await page.evaluate(()=>selectedNode),null);assert.equal(await page.locator('#picker').isVisible(),false);
 await page.locator(`[data-node="${matrix}"]`).click({button:'right'});assert.equal(await page.locator('#picker').isVisible(),true);await page.locator('#close-picker').click();
 await page.locator(`[data-list-edge="${green.id}"]`).click();await page.mouse.click(800,190,{button:'right'});assert.equal(await page.evaluate(()=>selectedEdge),null);
 const pendingPort=await screen(await page.evaluate(()=>port('control',{side:'top',t:4/6})));await page.mouse.click(pendingPort.x,pendingPort.y);await page.mouse.click(800,190,{button:'right'});assert.equal(await page.evaluate(()=>selectedNode),null);assert.equal((await get()).edges.length,4);
 await page.screenshot({path:path.join(__dirname,'preview-one-bend.png')});
 console.log('PASS: screenshot regression reduces three bends to one; right-click cancels module, line, and pending connection; unselected right-click still replaces');

 // Modules block interior routes while allowing exact border alignment.
 await page.locator(`[data-list-edge="${green.id}"]`).click();
 const protectedBefore=await get(),geometry=await page.evaluate(()=>{const e=state.edges.at(-1),a=e.points[0],b=e.points[1],r=rect(node(e.to));return {start:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},end:{x:r.x,y:(a.y+b.y)/2}}});
 const startScreen=await screen(geometry.start),endScreen=await screen(geometry.end);
 await page.mouse.move(startScreen.x,startScreen.y);await page.mouse.down();await page.mouse.move(endScreen.x,endScreen.y,{steps:8});
 assert.equal(await page.evaluate(()=>state.edges.every(e=>!routeConflict(e))),true);
 await page.mouse.up();await valid();assert.deepEqual((await get()).edges.map(e=>[e.a,e.b]),protectedBefore.edges.map(e=>[e.a,e.b]));
 console.log('PASS: attempted interior edits retain attached endpoints and wire separation');
 // Near-parallel parts of ONE blue wire collapse to a two-point straight route.
 await page.evaluate(()=>{
  state={version:1,layoutVersion:3,modules:[{id:'snap-module',slot:0,type:'matrix',name:'',rotation:0}],edges:[]};
  const a={side:'bottom',t:.72},b={side:'top',t:0},start=port('snap-module',a),end=port('control',b);
  state.edges.push({id:'snap-edge',from:'snap-module',to:'control',a,b,color:'#438bd1',name:'',manual:true,outerAuto:false,points:[start,{x:start.x,y:225},{x:503,y:225},{x:503,y:310},{x:end.x,y:310},end]});
  selectedNode=null;selectedEdge='snap-edge';history=[];future=[];render();
 });
 const snapBefore=await get(),snapStart=await screen(snapBefore.edges[0].points[0]);
 await page.mouse.move(snapStart.x,snapStart.y);await page.mouse.down();await page.mouse.move(snapStart.x+15,snapStart.y,{steps:3});await page.mouse.move(snapStart.x+2,snapStart.y,{steps:3});await page.mouse.up();
 assert.equal((await get()).edges[0].points.length,2);assert.equal(await page.locator('[data-segment]').count(),1);await valid();
 assert.equal(await page.evaluate(()=>document.getAnimations().length>0),true);
 const snapped=await get();await page.locator('#undo').click();assert.deepEqual(await get(),snapBefore);await page.locator('#redo').click();assert.deepEqual(await get(),snapped);
 await page.reload();assert.deepEqual(await get(),snapped);
 console.log('PASS: near-parallel dogleg snaps straight, only two vertices/one handle, spring feedback, undo/redo/reload');
 await page.setViewportSize({width:1366,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),true);
 assert.deepEqual(errors,[]);console.log('PASS: legacy backup/migration, viewport, no browser errors');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
