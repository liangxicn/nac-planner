const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');const path=require('node:path');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
 const result=await page.evaluate(()=>{
 state.modules=[{id:'matrix',type:'matrix',slot:1,name:'',rotation:0},{id:'split',type:'split',slot:2,name:'',rotation:0}];
 const blue={id:'blue',from:'matrix',to:'split',a:{side:'right',t:.5},b:{side:'top',t:.375},color:COLORS[0],name:'',points:[],layer:1};
 const a=port(blue.from,blue.a),b=port(blue.to,blue.b);blue.points=[a,{x:b.x,y:a.y},b];
 const yellow={id:'yellow',from:'matrix',to:'split',a:{side:'right',t:.25},b:{side:'left',t:.5},color:COLORS[8],name:'',points:[],layer:1};state.edges=[blue,yellow];
 route(yellow);const long=clone(yellow);const ok=routeNewConnection(yellow);const length=p=>p.slice(1).reduce((v,q,i)=>v+Math.abs(q.x-p[i].x)+Math.abs(q.y-p[i].y),0);commit();
 return {ok,a:yellow.a,b:yellow.b,points:yellow.points,clear:!routeConflict(yellow),before:length(long.points),after:length(yellow.points),blue:clone(blue)};
 });
 assert.equal(result.ok,true);assert.equal(result.clear,true);assert.deepEqual(result.a,{side:'right',t:.25});assert.equal(result.b.side,'top');assert.equal(result.points.length,3);assert.ok(result.after<result.before/2);
 await page.locator('[data-list-edge="yellow"]').click();await page.locator('[data-action="reset-route"]').click();assert.deepEqual(await page.evaluate(()=>state.edges[0]),result.blue);
 console.log('PASS: same-layer blue wire preserved; yellow keeps right-side source and takes short right/down route into top instead of detouring around source');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
