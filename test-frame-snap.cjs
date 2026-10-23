const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1400,height:950}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
  const screen=p=>page.evaluate(p=>{const q=svg.createSVGPoint();q.x=p.x;q.y=p.y;const r=q.matrixTransform(svg.getScreenCTM());return {x:r.x,y:r.y}},p);
  const scene=()=>page.evaluate(()=>{
   state={version:1,layoutVersion:3,modules:[{id:'left',type:'matrix',slot:0,name:'',rotation:0},{id:'right',type:'parts',slot:1,name:'',rotation:0},{id:'guide',type:'split',slot:2,name:'',rotation:0}],edges:[]};
   const a={side:'right',t:.5},b={side:'top',t:.5},start=port('left',a),end=port('right',b);
   state.edges.push({id:'line',from:'left',to:'right',a,b,color:'#438bd1',name:'',manual:true,points:[start,{x:600,y:start.y},{x:600,y:380},{x:1050,y:380},{x:1050,y:-10},{x:end.x,y:-10},end]});
   history=[];future=[];selectedNode=null;selectedEdge='line';render();return clone(state);
  });
  for(const side of ['bottom']){
   const before=await scene(),r=await page.evaluate(()=>rect(node('guide')));
   const initial=await screen({x:825,y:380}),target=await screen({x:825,y:r.y+(side==='top'?-1:1)*r.h/2});
   await page.mouse.move(initial.x,initial.y);await page.mouse.down();await page.mouse.move(target.x,target.y+3,{steps:8});
   assert.equal(await page.evaluate(()=>drag.blocked),false);
   await page.mouse.up();
   const after=await page.evaluate(()=>clone(state));
   assert.ok(after.edges[0].points.slice(1).some((p,i)=>p.y===r.y+(side==='top'?-1:1)*r.h/2&&p.y===after.edges[0].points[i].y&&p.x!==after.edges[0].points[i].x));
   assert.deepEqual([after.edges[0].a,after.edges[0].b],[before.edges[0].a,before.edges[0].b]);
   await page.locator('#undo').click();assert.deepEqual(await page.evaluate(()=>clone(state)),before);
  }
  console.log('PASS: dragging near a clear frame edge snaps onto it and stays after release; endpoint attachments and undo preserved');
  const original=await scene();const r=await page.evaluate(()=>rect(node('guide'))),a=await screen({x:825,y:380}),b=await screen({x:825,y:r.y});
  await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:8});await page.mouse.up();
  assert.equal(await page.evaluate(()=>routeConflict(state.edges[0])),false);
  assert.deepEqual(await page.evaluate(()=>clone(state)),original);
  assert.equal(await page.evaluate(()=>[...svg.children].indexOf($('wires'))>[...svg.children].indexOf($('nodes'))),true);
  const cross=await page.evaluate(()=>{
   const e=state.edges[0],r=rect(node('guide'));
   state.edges.push({id:'barrier',from:'guide',to:'control',a:{side:'top',t:.5},b:{side:'top',t:.5},points:[{x:r.x,y:360},{x:r.x,y:400}]});
   const crossed=routeConflict(e);state.edges.pop();return crossed;
  });assert.equal(cross,true);
  const saved=await page.evaluate(()=>clone(state));await page.reload();assert.deepEqual(await page.evaluate(()=>clone(state)),saved);
  await page.screenshot({path:path.join(__dirname,'preview-frame-snap.png')});
  assert.deepEqual(errors,[]);console.log('PASS: module interior blocks dragging; wire crossings rejected; border visibility and reload persist');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
