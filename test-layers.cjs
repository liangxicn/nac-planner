const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
 await page.evaluate(()=>{
  state.modules=[{id:'left',slot:11,type:'split',name:'',rotation:0},{id:'right',slot:2,type:'wire',name:'',rotation:0},{id:'top',slot:0,type:'matrix',name:'',rotation:0}];
  const edge={id:'legacy',from:'left',to:'right',a:{side:'right',t:.5},b:{side:'left',t:.5},color:COLORS[0],name:'第一层横线',points:[],manual:true};
  edge.points=[port(edge.from,edge.a),port(edge.to,edge.b)];state.edges=[edge];commit();
 });
 assert.equal(await page.evaluate(()=>routeConflict(state.edges[0])),false);
 await page.locator('#layer-two').click();
 assert.equal(await page.locator('[data-edge="legacy"]').getAttribute('opacity'),'0.22');
 assert.equal(await page.locator('[data-edge="legacy"]').evaluate(el=>getComputedStyle(el).pointerEvents),'none');
 await page.locator('[data-node="top"]').click();
 await page.locator('[data-control-side="top"][data-control-index="1"]').click();
 const result=await page.evaluate(()=>{
  const e=state.edges.at(-1),other=state.edges[0];
  return {count:state.edges.length,layer:e.layer,conflict:routeConflict(e),crosses:e.points.slice(1).some((p,i)=>other.points.slice(1).some((q,j)=>segmentsTouch(e.points[i],p,other.points[j],q))),id:e.id};
 });
 assert.equal(result.count,2);assert.equal(result.layer,2);assert.equal(result.conflict,false);assert.equal(result.crosses,true);
 assert.equal(await page.evaluate(()=>{const e=state.edges.at(-1);e.layer=1;const result=routeConflict(e);e.layer=2;return result}),true);
 assert.equal(await page.locator(`[data-edge="${result.id}"]`).getAttribute('transform'),'translate(4 4)');
 await page.locator(`[data-list-edge="${result.id}"]`).click();
 assert.equal(await page.locator('#handles').getAttribute('transform'),'translate(4 4)');
 // Drag the second-layer source endpoint to another point on the same border.
 const start=await page.locator('[data-port="a"]').boundingBox();
 const dest=await page.evaluate(()=>{const p=port('top',{side:'bottom',t:.7}),m=svg.getScreenCTM();return {x:(p.x+4)*m.a+m.e,y:(p.y+4)*m.d+m.f}});
 const center=await page.evaluate(()=>{const p=port('top',state.edges.at(-1).a),m=svg.getScreenCTM();return {x:(p.x+4)*m.a+m.e,y:(p.y+4)*m.d+m.f}});
 await page.mouse.move(center.x,center.y);await page.mouse.down();await page.mouse.move(dest.x,dest.y,{steps:8});await page.mouse.up();
 assert.ok(Math.abs(await page.evaluate(()=>state.edges.at(-1).a.t)-.7)<.001);
 assert.equal(await page.evaluate(()=>state.edges.at(-1).layer),2);
 assert.equal(await page.evaluate(()=>moduleSideUsed('top','bottom')),1);
 assert.equal(await page.evaluate(()=>controlPortOccupied({id:'other'},'a',{side:'top',t:1/6})),true);
 await page.locator('#layer-one').click();assert.equal(await page.locator('#handles [data-port]').count(),0);
 await page.locator(`[data-list-edge="${result.id}"]`).click();assert.equal(await page.locator('#layer-two').getAttribute('aria-pressed'),'true');
 const saved=await page.evaluate(()=>clone(state));await page.reload();assert.deepEqual(await page.evaluate(()=>clone(state)),saved);
 assert.equal(await page.locator('#layer-two').getAttribute('aria-pressed'),'true');
 assert.deepEqual(await page.evaluate(()=>validate(clone(state))),saved);
 assert.equal(await page.evaluate(()=>{const data=clone(state);data.edges[0].layer=3;try{validate(data);return false}catch{return true}}),true);
 await page.locator('#mode-view').click();await page.locator('#layer-one').click();assert.equal(await page.locator('#layer-one').getAttribute('aria-pressed'),'true');assert.deepEqual(await page.evaluate(()=>clone(state)),saved);
 await page.locator('#layer-two').click();await page.screenshot({path:path.join(__dirname,'preview-layers.png')});
 assert.deepEqual(errors,[]);console.log('PASS: layers permit cross-layer crossings, block same-layer crossings, fade and offset wires, preserve shared capacity, support endpoint drag, view switching and legacy/save validation');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

