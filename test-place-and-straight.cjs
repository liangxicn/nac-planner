const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
 const screen=p=>page.evaluate(p=>{const q=svg.createSVGPoint();q.x=p.x;q.y=p.y;const r=q.matrixTransform(svg.getScreenCTM());return {x:r.x,y:r.y}},p);
 const drag=async(a,b)=>{await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:8});await page.mouse.up()};
 const get=()=>page.evaluate(()=>clone(state));
 const setup=()=>page.evaluate(()=>{
  state={version:1,layoutVersion:3,modules:[{id:'matrix',type:'matrix',slot:0,name:'',rotation:0}],edges:[]};
  const a={side:'left',t:.25},b={side:'bottom',t:.4},start=port('matrix',a),end=port('matrix',b);
  state.edges=[{id:'pink',from:'matrix',to:'matrix',a,b,color:'#ce68a5',name:'预先拉好的线',manual:true,outerAuto:false,points:[start,{x:331,y:start.y},{x:331,y:330},{x:end.x,y:330},end]}];
  selectedNode=selectedEdge=null;history=[];future=[];commit();return clone(state);
 });
 const before=await setup();
 await page.locator('[data-slot="11"]').click({position:{x:20,y:75}});await page.locator('[data-type="board"]').click();
 const after=await get();assert.equal(after.modules.length,2);assert.equal(after.edges.length,1);assert.notDeepEqual(after.edges[0].points,before.edges[0].points);
 assert.deepEqual([after.edges[0].a,after.edges[0].b,after.edges[0].name,after.edges[0].color],[before.edges[0].a,before.edges[0].b,before.edges[0].name,before.edges[0].color]);
 assert.equal(await page.evaluate(()=>state.edges.every(e=>!routeConflict(e))),true);
 await page.locator('#undo').click();assert.deepEqual(await get(),before);await page.locator('#redo').click();assert.deepEqual(await get(),after);
 await page.reload();assert.deepEqual(await get(),after);
 console.log('PASS: adding slot 12 pushes an existing crossing loop aside, preserving endpoints and metadata; atomic undo/redo and reload');
 await setup();await page.locator('[data-slot="8"]').click();await page.locator('[data-type="board"]').click();
 const moving=await page.evaluate(()=>state.modules[1].id);
 await drag(await screen(await page.evaluate(id=>rect(node(id)),moving)),await screen(await page.evaluate(()=>SLOTS[11])));
 assert.equal((await get()).modules[1].slot,11);assert.equal(await page.evaluate(()=>state.edges.every(e=>!routeConflict(e))),true);
 assert.notDeepEqual((await get()).edges[0].points,before.edges[0].points);
 console.log('PASS: moving an unrelated module also reroutes obstructed lines');
 await page.evaluate(()=>{state={version:1,layoutVersion:3,modules:[{id:'a',type:'matrix',slot:0,name:'',rotation:0},{id:'b',type:'parts',slot:1,name:'',rotation:0}],edges:[]};selectedNode=selectedEdge=null;history=[];future=[];addEdge('a','b');const e=state.edges[0];e.a={side:'right',t:.5};e.b={side:'left',t:.5};route(e);commit()});
 const straightBefore=await get();assert.equal(straightBefore.edges[0].points.length,2);
 const points=straightBefore.edges[0].points,mid={x:(points[0].x+points[1].x)/2,y:points[0].y};
 await drag(await screen(mid),await screen({x:mid.x,y:mid.y+16}));
 const straightAfter=await get();assert.equal(straightAfter.edges[0].points.length,2);assert.ok(straightAfter.edges[0].points.every(p=>Math.abs(p.y-mid.y-16)<.01));
 assert.notDeepEqual(straightAfter.edges[0].a,straightBefore.edges[0].a);assert.notDeepEqual(straightAfter.edges[0].b,straightBefore.edges[0].b);
 assert.equal(await page.locator('[data-segment]').count(),1);assert.equal(await page.evaluate(()=>routeConflict(state.edges[0])),false);
 await page.locator('#undo').click();assert.deepEqual(await get(),straightBefore);await page.locator('#redo').click();assert.deepEqual(await get(),straightAfter);await page.reload();assert.deepEqual(await get(),straightAfter);
 assert.deepEqual(errors,[]);console.log('PASS: dragging a straight wire translates both terminals together, stays two vertices with one handle, persists and undoes as a unit');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
