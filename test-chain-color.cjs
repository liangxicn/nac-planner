const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const assert=require('node:assert/strict');const path=require('node:path');const {pathToFileURL}=require('node:url');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
const p=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
await p.evaluate(()=>{
state.modules=[{id:'parts',type:'parts',slot:0,name:'',rotation:0},{id:'matrix',type:'matrix',slot:1,name:'',rotation:0}];
const a=recipesFor(node('parts')).find(r=>recipesFor(node('matrix')).some(m=>m.inputs.includes(r.outputs[0]))),b=recipesFor(node('matrix')).find(m=>m.inputs.includes(a.outputs[0]));node('parts').recipeIds=[a.id];node('matrix').recipeIds=[b.id];
addEdge('control','parts',{a:{side:'top',t:1/6}});state.edges.at(-1).itemIds=[a.inputs[0]];state.edges.at(-1).color=COLORS[0];
addEdge('parts','matrix');state.edges.at(-1).itemIds=[a.outputs[0]];state.edges.at(-1).color=COLORS[1];commit();
});
const before=await p.evaluate(()=>clone(state));await p.locator('[data-color="#db6055"]').click();assert.deepEqual(await p.evaluate(()=>state.edges.map(e=>e.color)),['#db6055','#db6055']);
assert.equal(await p.locator('#sockets .socket-mark[fill="#db6055"]').count(),1);
await p.locator('#undo').click();assert.deepEqual(await p.evaluate(()=>clone(state)),before);await p.locator('#redo').click();const saved=await p.evaluate(()=>clone(state));await p.reload();assert.deepEqual(await p.evaluate(()=>clone(state)),saved);
await p.locator('[data-list-edge]').first().click();await p.locator('[data-color="#65ac49"]').click();assert.deepEqual(await p.evaluate(()=>state.edges.map(e=>e.color)),['#65ac49','#65ac49']);
const cases=await p.evaluate(()=>{
// Build three-step paths through actual recipes, with a second independent color branch.
const a=NAC_RECIPES.cut.find(r=>NAC_RECIPES.wrap.some(w=>w.inputGroups[0].includes(r.outputs[0]))),b=NAC_RECIPES.wrap.find(w=>w.inputGroups[0].includes(a.outputs[0]));
state.modules=[{id:'cut',type:'cut',slot:0,recipeIds:[a.id]},{id:'wrap',type:'wrap',slot:1,recipeIds:[b.id]}];
const edge=(id,from,to,item,color)=>({id,from,to,itemIds:[item],color});
state.edges=[edge('in','control','cut',a.inputs[0],'#438bd1'),edge('mid','cut','wrap',a.outputs[0],'#438bd1'),edge('out','wrap','control',b.outputs[0],'#438bd1'),edge('in2','control','cut',a.inputs[0],'#db6055'),edge('mid2','cut','wrap',a.outputs[0],'#db6055'),edge('out2','wrap','control',b.outputs[0],'#db6055'),edge('unrelated','control','wrap','unrelated','#438bd1')];
const connected=transportChain(state.edges[1]).map(e=>e.id).sort();
state.edges[1].color='#9a5bce';const ambiguous=transportChain(state.edges[1]).map(e=>e.id).sort();
return {connected,ambiguous};
});
assert.deepEqual(cases.connected,['in','mid','out']);assert.ok(!cases.ambiguous.includes('in2'));assert.ok(!cases.ambiguous.includes('in'));
assert.deepEqual(errors,[]);console.log('PASS: sidebar palette recolors upstream/downstream chain, fixes single-channel mismatch, preserves independent branches, updates sockets, atomic undo/redo and reload');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
