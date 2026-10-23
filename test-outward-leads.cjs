const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
 const result=await page.evaluate(()=>{
  state.modules=[{id:'matrix',type:'matrix',slot:1,name:'',rotation:0},{id:'splitter',type:'split',slot:2,name:'',rotation:0}];state.edges=[];
  const edge={id:'test',from:'matrix',to:'splitter',a:{side:'right',t:.78},b:{side:'left',t:.5},color:COLORS[5],name:'',layer:1,points:[]};
  state.edges.push(edge);const ok=route(edge);selectedEdge=edge.id;commit();
  const p=edge.points;return {ok,clear:!routeConflict(edge),points:p,start:port(edge.from,edge.a),end:port(edge.to,edge.b)};
 });
 assert.equal(result.ok,true);assert.equal(result.clear,true);
 assert.equal(result.points[1].y,result.start.y);assert.ok(result.points[1].x>result.start.x);
 assert.equal(result.points.at(-2).y,result.end.y);assert.ok(result.points.at(-2).x<result.end.x);
 assert.ok(result.points.length>=4);
 const saved=await page.evaluate(()=>clone(state));await page.reload();assert.deepEqual(await page.evaluate(()=>clone(state)),saved);
 // Facing ports on a shared axis still produce a simple straight line.
 assert.equal(await page.evaluate(()=>{state.modules[1].slot=0;state.edges=[];const e={id:'straight',from:'splitter',to:'matrix',a:{side:'right',t:.5},b:{side:'left',t:.5},points:[]};return route(e)&&e.points.length===2}),true);
 console.log('PASS: staggered neighboring modules extend out before turning; endpoints and collision rules preserved; straight aligned routes and saved layouts unchanged');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
