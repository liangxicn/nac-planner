const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
  const screen=p=>page.evaluate(p=>{const q=svg.createSVGPoint();q.x=p.x;q.y=p.y;const s=q.matrixTransform(svg.getScreenCTM());return {x:s.x,y:s.y}},p);
  for(const zoomFactor of [1,1.5,0.7])for(const overshoot of [-4,0,.5,4,8]){
   const before=await page.evaluate(zoomFactor=>{
    state={version:1,layoutVersion:3,modules:[{id:'optical',type:'optical',slot:4,name:'',rotation:0}],edges:[]};history=[];future=[];selectedNode=null;selectedEdge='line';
    const a={side:'right',t:5/6},b={side:'top',t:.65},start=port('control',a),end=port('optical',b);
    state.edges.push({id:'line',from:'control',to:'optical',a,b,color:'#80c4d6',name:'',manual:true,points:[start,{x:800,y:start.y},{x:800,y:start.y-28},{x:end.x-20,y:start.y-28},{x:end.x-20,y:end.y},end]});
    view={x:0,y:0,w:1240,h:1040};zoom(1/zoomFactor);render();return clone(state);
   },zoomFactor);
   const e=before.edges[0],middle={x:(e.points[2].x+e.points[3].x)/2,y:e.points[2].y};
   const start=await screen(middle),target=await screen({x:middle.x,y:e.points[0].y});
   // Grab a few pixels off the center of the handle, as a real user does.
   await page.mouse.move(start.x+2,start.y+2);await page.mouse.down();await page.mouse.move(target.x+2,target.y+2+overshoot,{steps:10});
   assert.equal(await page.evaluate(()=>state.edges[0].points.length),2);
   await page.mouse.up();assert.equal(await page.evaluate(()=>state.edges[0].points.length),2);
   assert.equal(await page.evaluate(()=>routeConflict(state.edges[0])),false);
   assert.deepEqual(await page.evaluate(()=>[state.edges[0].a,state.edges[0].b]),[e.a,e.b]);
   await page.locator('#undo').click();assert.deepEqual(await page.evaluate(()=>clone(state)),before);
   await page.locator('#redo').click();assert.equal(await page.evaluate(()=>state.edges[0].points.length),2);
  }
  console.log('PASS: screenshot-shaped bridge dragged down to a straight line at 3 zoom levels and 5 near-alignment offsets; no rebound; endpoints unchanged; undo/redo');
  const saved=await page.evaluate(()=>clone(state));await page.reload();assert.deepEqual(await page.evaluate(()=>clone(state)),saved);
  assert.deepEqual(errors,[]);console.log('PASS: reload and browser errors');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
