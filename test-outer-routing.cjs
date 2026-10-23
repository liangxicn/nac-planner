const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const p=await browser.newPage({viewport:{width:1400,height:950}}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
  for(const slot of [6,7]){
   const setup=await p.evaluate(slot=>{
    state={version:1,layoutVersion:3,modules:[{id:'splitter',type:'split',slot:2,name:'',rotation:0},{id:'tracer',type:'wire',slot,name:'',rotation:0}],edges:[]};selectedNode=selectedEdge=null;
    const a={side:'bottom',t:.2},b={side:'bottom',t:.8},start=port('splitter',a),end=port('splitter',b);
    state.edges.push({id:'existing-loop',from:'splitter',to:'splitter',a,b,color:'#ce68a5',name:'已存在的回路',manual:true,outerAuto:false,points:[start,{x:start.x,y:310},{x:end.x,y:310},end]});
    const attempt={id:'attempt',from:'splitter',to:'tracer',a:{side:'bottom',t:.5},b:{side:'top',t:.5},points:[]};
    const oldDirectionWorks=route(attempt);render();return {oldDirectionWorks,existing:clone(state.edges[0])};
   },slot);
   assert.equal(setup.oldDirectionWorks,false);
   await p.locator('[data-node="splitter"]').click();await p.locator('[data-node="tracer"]').click();
   const result=await p.evaluate(()=>({edges:clone(state.edges),clear:state.edges.every(e=>!routeConflict(e))}));
   assert.equal(result.edges.length,2);assert.equal(result.clear,true);assert.deepEqual(result.edges[0],setup.existing);
   assert.notDeepEqual(result.edges[1].a,{side:'bottom',t:.5});
   // A different free port on the same side can also avoid the existing loop.
   const saved=result.edges;await p.reload();assert.deepEqual(await p.evaluate(()=>clone(state.edges)),saved);
  }
  console.log('PASS: splitter in slot 03 connects to tracers in slots 07 and 08 using alternate ports while avoiding existing lines; existing wires preserved');
  const grid=await p.evaluate(()=>{
   const barrier={l:-2000,r:3000,t:450,b:550};
   const points=orthogonal({x:620,y:350},{x:620,y:700},0,[barrier]);
   return {exists:!!points,outside:points?.some(p=>p.x<=-2000||p.x>=3000),clear:points?.slice(1).every((p,i)=>pathClear(points[i],p,[barrier,...obstacles()]))};
  });assert.deepEqual(grid,{exists:true,outside:true,clear:true});
  console.log('PASS: search expands beyond the viewport and existing obstacles; no distance limit');
  await p.screenshot({path:path.join(__dirname,'preview-outer-routing.png')});assert.deepEqual(errors,[]);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

