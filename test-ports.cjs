const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const p=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
 const scene=async(slot=0)=>p.evaluate(slot=>{state={version:1,layoutVersion:3,modules:[{id:'m',type:'matrix',slot,name:'',rotation:0}],edges:[]};history=[];future=[];selectedNode=selectedEdge=selectedControlPort=null;commit()},slot);
 const xy=async(side,t)=>p.evaluate(({side,t})=>{const pos=port('control',{side,t}),q=svg.createSVGPoint();q.x=pos.x;q.y=pos.y;const r=q.matrixTransform(svg.getScreenCTM());return {x:r.x,y:r.y}}, {side,t});
 const socket=async(side,t)=>{const q=await xy(side,t);await p.mouse.click(q.x,q.y)};
 const moduleClick=()=>p.locator('[data-node="m"]').click();
 const get=()=>p.evaluate(()=>clone(state));
 for(const [side,slot] of [['top',0],['right',3],['bottom',6],['left',9]]){
  await scene(slot);await socket(side,4/6);
  assert.deepEqual(await p.evaluate(()=>selectedControlPort),{side,t:4/6});
  await moduleClick();const s=await get();assert.equal(s.edges.length,1);assert.deepEqual(s.edges[0].a,{side,t:4/6});
  assert.equal(await p.evaluate(()=>state.edges.every(e=>!routeConflict(e))),true);
  await scene(slot);await moduleClick();await socket(side,2/6);
  assert.equal((await get()).edges.length,1);assert.deepEqual((await get()).edges[0].b,{side,t:2/6});
 }
 console.log('PASS: exact outgoing/incoming socket on all four sides; no automatic reassignment');
 await scene(3);const q=await xy('right',2/6);await p.mouse.click(q.x-5,q.y+3);await moduleClick();
 assert.deepEqual((await get()).edges[0].a,{side:'right',t:2/6});
 await p.keyboard.press('Escape');await moduleClick();await socket('right',2/6);assert.equal((await get()).edges.length,1);assert.equal(await p.evaluate(()=>selectedNode),'m');
 await p.mouse.click(800,190,{button:'right'});assert.equal(await p.evaluate(()=>selectedNode),null);
 await socket('right',2/6);assert.equal(await p.evaluate(()=>selectedEdge), (await get()).edges[0].id);
 console.log('PASS: nearest socket on clicked border, occupied socket refuses reuse, right-click cancels, occupied socket selects its wire');
 await scene();await socket('top',2/6);await socket('top',4/6);assert.equal((await get()).edges.length,1);assert.deepEqual((await get()).edges[0].a,{side:'top',t:2/6});assert.deepEqual((await get()).edges[0].b,{side:'top',t:4/6});
 await p.keyboard.press('Escape');await socket('left',.5);await p.mouse.click(800,190,{button:'right'});assert.equal(await p.evaluate(()=>selectedControlPort),null);
 await scene();await socket('top',0);await moduleClick();assert.equal((await get()).edges.length,1);assert.equal(await p.evaluate(()=>availableOnSide('left')),6);
 console.log('PASS: exact control self-loop endpoints, cancellation clears pending socket, corner remains shared');
 const before=await get();await p.reload();assert.deepEqual(await get(),before);assert.equal(await p.locator('#side-picker').count(),0);assert.deepEqual(errors,[]);
 console.log('PASS: reload persistence, obsolete side dialog removed, no browser errors');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
