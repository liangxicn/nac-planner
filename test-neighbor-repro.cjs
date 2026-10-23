const assert=require('node:assert/strict');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const {pathToFileURL}=require('node:url');const path=require('node:path');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{const p=await b.newPage();await p.goto(pathToFileURL(path.join(__dirname,'index.html')).href);const before=await p.evaluate(()=>{
state.modules=[{id:'nam',type:'matrix',slot:11,name:'',rotation:0},{id:'ppa',type:'parts',slot:4,name:'',rotation:0}];state.edges=[];
const a={id:'input',from:'control',to:'ppa',a:{side:'top',t:0},b:{side:'bottom',t:.85},color:'#bd7847',name:'',points:[],layer:1};const a0=port(a.from,a.a),a1=port(a.to,a.b);a.points=[a0,{x:a0.x,y:303},{x:931,y:303},{x:931,y:735},{x:a1.x,y:735},a1];
const e={id:'output',from:'ppa',to:'nam',a:{side:'bottom',t:.75},b:{side:'top',t:.9},color:'#bd7847',name:'',points:[],layer:1};const e0=port(e.from,e.a),e1=port(e.to,e.b);e.points=[e0,{x:e0.x,y:730},{x:939,y:730},{x:939,y:129},{x:e1.x,y:129},e1];state.edges=[a,e];if(state.edges.some(routeConflict))throw new Error('Invalid fixture');
for(const e of state.edges){e.itemIds=[NAC_RECIPES.parts[0].inputs[0]];e.name='保留运输数据'}
commit();return clone(state);
});
await p.locator('[data-slot="0"]').click({position:{x:20,y:20}});await p.locator('[data-type="etch"]').click();
const after=await p.evaluate(()=>clone(state));assert.equal(after.modules.length,3);
for(let i=0;i<2;i++){assert.notDeepEqual(after.edges[i].points,before.edges[i].points);for(const key of ['id','from','to','a','b','color','name','itemIds','layer'])assert.deepEqual(after.edges[i][key],before.edges[i][key])}
assert.equal(await p.evaluate(()=>state.edges.every(e=>!routeConflict(e))),true);
await p.locator('#undo').click();assert.deepEqual(await p.evaluate(()=>clone(state)),before);await p.locator('#redo').click();assert.deepEqual(await p.evaluate(()=>clone(state)),after);await p.reload();assert.deepEqual(await p.evaluate(()=>clone(state)),after);
console.log('PASS: tightly packed valid wires jointly reroute when adding a module; both endpoints, color, items and layer preserved; atomic undo/redo and reload');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
