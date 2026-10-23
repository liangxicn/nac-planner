const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
 const get=()=>page.evaluate(()=>clone(state));
 const screen=p=>page.evaluate(p=>{const q=svg.createSVGPoint();q.x=p.x;q.y=p.y;const r=q.matrixTransform(svg.getScreenCTM());return {x:r.x,y:r.y}},p);
 const drag=async(a,b)=>{await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:8});await page.mouse.up()};
 const setup=async reverse=>page.evaluate(reverse=>{
  state={version:1,layoutVersion:3,modules:[{id:'m',type:'optical',slot:4,name:'',rotation:0}],edges:[]};
  const a={side:'right',t:4/6},b={side:'left',t:.3},start=port('control',a),end=port('m',b);
  const points=[start,{x:835,y:start.y},{x:835,y:end.y},end];
  state.edges.push({id:'e',from:reverse?'m':'control',to:reverse?'control':'m',a:reverse?b:a,b:reverse?a:b,points:reverse?points.reverse():points,color:'#438bd1',name:'控制室连线',manual:true});
  selectedNode=null;selectedEdge='e';history=[];future=[];commit();return clone(state);
 },reverse);
 for(const reverse of [false,true]){
  const before=await setup(reverse),e=before.edges[0],i=1,a=e.points[i],b=e.points[i+1],mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
  await drag(await screen(mid),await screen({x:mid.x,y:mid.y+35}));
  const after=await get(),next=after.edges[0];
  assert.equal(next.points.length,e.points.length);assert.ok(next.points.every((p,i)=>Math.abs(p.y-e.points[i].y-35)<.01&&p.x===e.points[i].x));
  assert.notEqual(next.a.t,e.a.t);assert.notEqual(next.b.t,e.b.t);
  assert.equal(await page.evaluate(()=>routeConflict(state.edges[0])||!moduleCapacityAllows(state.edges[0])),false);
  await page.locator('#undo').click();assert.deepEqual(await get(),before);await page.locator('#redo').click();assert.deepEqual(await get(),after);
  await page.reload();assert.deepEqual(await get(),after);
 }
 console.log('PASS: bent control-to-module and module-to-control routes translate with both terminals, preserving shape, grid, undo and reload');
 const style=await page.evaluate(()=>Object.fromEntries(['header','.left-panel','.right-panel','.toolbar','#canvas-wrap'].map(s=>[s,getComputedStyle(document.querySelector(s)).backgroundColor])));
 assert.equal(style.header,'rgb(45, 47, 50)');assert.equal(style['.left-panel'],style.header);assert.equal(style['.right-panel'],style.header);assert.equal(style['#canvas-wrap'],'rgb(228, 229, 231)');
 await page.locator('[data-list-edge="e"]').click();await page.screenshot({path:path.join(__dirname,'preview-dark-gray.png')});
 assert.deepEqual(errors,[]);console.log('PASS: dark gray surrounding panels, light gray canvas, no browser errors');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
