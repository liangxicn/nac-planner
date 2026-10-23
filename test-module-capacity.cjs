const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1400,height:950}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
 assert.equal(await page.locator('#parallel-snap').isChecked(),true);
 await page.evaluate(()=>{
  state={version:1,layoutVersion:3,modules:[{id:'a',type:'matrix',slot:0,name:'',rotation:0},{id:'b',type:'parts',slot:1,name:'',rotation:0}],edges:[]};history=[];future=[];selectedNode=selectedEdge=null;commit();
 });
 for(let i=0;i<6;i++){
  await page.locator('[data-node="a"]').click();await page.locator('[data-node="b"]').click();
 }
 assert.equal(await page.evaluate(()=>state.edges.length),6);
 assert.deepEqual(await page.evaluate(()=>[moduleSideUsed('a','top'),moduleSideUsed('b','top')]),[5,5]);
 assert.equal(await page.evaluate(()=>state.edges.every(e=>moduleCapacityAllows(e)&&!routeConflict(e))),true);
 const sixth=await page.evaluate(()=>clone(state.edges[5]));
 assert.notEqual(sixth.a.side,'top');
 // A full side rejects manual endpoint dragging without changing the edge.
 const pos=await page.evaluate(e=>{const toScreen=p=>{const q=svg.createSVGPoint();q.x=p.x;q.y=p.y;const r=q.matrixTransform(svg.getScreenCTM());return {x:r.x,y:r.y}};return {a:toScreen(port('a',e.a)),b:toScreen(port('a',{side:'top',t:.38}))}},sixth);
 await page.mouse.move(pos.a.x,pos.a.y);await page.mouse.down();await page.mouse.move(pos.b.x,pos.b.y,{steps:8});await page.mouse.up();
 assert.deepEqual(await page.evaluate(()=>clone(state.edges[5])),sixth);
 assert.ok((await page.locator('#toast').innerText()).includes('5 个接口'));
 const count=await page.evaluate(()=>{
  const old=state;state={version:1,layoutVersion:3,modules:old.modules,edges:[]};
  for(const side of SIDES)for(let i=1;i<=5;i++)state.edges.push({id:side+i,from:'a',to:'b',a:{side,t:i/6},b:{side,t:i/6},points:[]});
  const result={used:SIDES.map(side=>moduleSideUsed('a',side)),keys:new Set(moduleEnds('a').map(x=>JSON.stringify(port('a',x.p)))).size,rejected:!addEdge('a','b')};state=old;render();return result;
 });assert.deepEqual(count,{used:[5,5,5,5],keys:20,rejected:true});
 console.log('PASS: sixth parallel link switches sides; manual drag into full side rejected; four independent sides provide 20 ports');
 const data=await page.evaluate(()=>{
  state={version:1,layoutVersion:3,modules:[{id:'m',type:'matrix',slot:0,name:'',rotation:0}],edges:[]};
  const a={side:'bottom',t:.72},b={side:'top',t:0},start=port('m',a),end=port('control',b);
  state.edges.push({id:'dogleg',from:'m',to:'control',a,b,color:'#438bd1',name:'',manual:true,points:[start,{x:start.x,y:225},{x:503,y:225},{x:503,y:310},{x:end.x,y:310},end]});selectedNode=null;selectedEdge='dogleg';commit();return clone(state);
 });
 await page.reload();assert.deepEqual(await page.evaluate(()=>clone(state)),data);
 await page.locator('#parallel-snap').uncheck();assert.deepEqual(await page.evaluate(()=>clone(state)),data);
 await page.reload();assert.equal(await page.locator('#parallel-snap').isChecked(),false);assert.deepEqual(await page.evaluate(()=>clone(state)),data);
 const disabled=await page.evaluate(()=>{const old=clone(state.edges[0]);settleLine(state.edges[0]);return JSON.stringify(old)===JSON.stringify(state.edges[0])});assert.equal(disabled,true);
 await page.locator('#parallel-snap').check();assert.deepEqual(await page.evaluate(()=>clone(state)),data);
 await page.locator('[data-list-edge="dogleg"]').click();
 const handle=await page.evaluate(()=>{const e=state.edges[0],p=port(e.from,e.a),q=svg.createSVGPoint();q.x=p.x;q.y=p.y;const r=q.matrixTransform(svg.getScreenCTM());return {x:r.x,y:r.y}});
 await page.mouse.move(handle.x,handle.y);await page.mouse.down();await page.mouse.move(handle.x+16,handle.y,{steps:3});await page.mouse.move(handle.x+2,handle.y,{steps:3});await page.mouse.up();
 assert.equal(await page.evaluate(()=>state.edges[0].points.length),2);
 assert.deepEqual(errors,[]);console.log('PASS: snap defaults on, persists toggle, leaves load/toggle unchanged, only manually dragged nearby geometry snaps');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
