const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');const path=require('node:path');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
const p=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
const before=await p.evaluate(()=>{
state.modules=[{id:'matrix',type:'matrix',slot:11,name:'',rotation:0},{id:'parts',type:'parts',slot:4,name:'',rotation:0}];
state.edges=[1,2].map(layer=>{const e={id:'edge'+layer,from:'matrix',to:'parts',a:{side:'right',t:(195-165)/132},b:{side:'bottom',t:.5},color:'#bd7847',name:'保留物品与颜色',itemIds:[NAC_RECIPES.parts[0].inputs[0]],layer,manual:true,points:[]};const a=port(e.from,e.a),b=port(e.to,e.b);e.points=[a,{x:1200,y:195},{x:1200,y:800},{x:b.x,y:800},b];return e});
selectedEdge=selectedNode=null;commit();return clone(state);
});
await p.locator('[data-slot="0"]').click();await p.locator('[data-type="etch"]').click();
const after=await p.evaluate(()=>clone(state));assert.equal(after.modules.length,3);
for(let i=0;i<2;i++){assert.notDeepEqual(after.edges[i].points,before.edges[i].points);for(const field of ['a','b','from','to','color','name','itemIds','layer'])assert.deepEqual(after.edges[i][field],before.edges[i][field]);}
assert.equal(await p.evaluate(()=>{const r=rect(state.modules.at(-1)),box={l:r.x-r.w/2-8,r:r.x+r.w/2+8,t:r.y-r.h/2-8,b:r.y+r.h/2+8};return state.edges.every(e=>!routeConflict(e)&&e.points.slice(1).every((b,i)=>pathClear(e.points[i],b,[box])))}),true);
await p.locator('#undo').click();assert.deepEqual(await p.evaluate(()=>clone(state)),before);await p.locator('#redo').click();assert.deepEqual(await p.evaluate(()=>clone(state)),after);await p.reload();assert.deepEqual(await p.evaluate(()=>clone(state)),after);
await p.screenshot({path:path.join(__dirname,'preview-placement-clearance.png')});assert.deepEqual(errors,[]);console.log('PASS: new module pushes border-touching wires on both layers aside; frame clearance, transport items/endpoints/colors preserved, undo/redo/reload atomic');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
