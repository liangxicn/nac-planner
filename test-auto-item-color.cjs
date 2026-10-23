const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');const path=require('node:path');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
 const fixture=await p.evaluate(()=>{
 state.modules=[{id:'parts',type:'parts',slot:0,name:'',rotation:0},{id:'matrix',type:'matrix',slot:1,name:'',rotation:0}];
 const pr=recipesFor(node('parts')),mr=recipesFor(node('matrix')).find(r=>pr.filter(p=>p.outputs.some(k=>r.inputs.includes(k))).length>=2);node('matrix').recipeIds=[mr.id];
 const rs=pr.filter(r=>r.outputs.some(k=>mr.inputs.includes(k))).slice(0,2);
 addEdge('control','parts',{a:{side:'top',t:1/6}});const input=state.edges.at(-1);input.itemIds=[rs[0].inputs[0]];input.color=COLORS[1];
 addEdge('control','parts',{a:{side:'top',t:2/6}});const input2=state.edges.at(-1);input2.itemIds=[rs[1].inputs[0]];input2.color=COLORS[3];
 addEdge('parts','matrix');const out=state.edges.at(-1);out.color=COLORS[0];commit();return {id:out.id,input:input.id,input2:input2.id,items:rs.map(r=>r.outputs.find(k=>mr.inputs.includes(k))),old:out.color,color:input.color};
 });
 await p.locator(`[data-item-id="${fixture.items[0]}"]`).check();assert.equal(await p.evaluate(()=>state.edges.at(-1).color),fixture.color);
 await p.locator('#undo').click();assert.equal(await p.evaluate(()=>state.edges.at(-1).color),fixture.old);assert.equal(await p.evaluate(()=>transportItems(state.edges.at(-1)).length),0);
 await p.locator('#redo').click();assert.equal(await p.evaluate(()=>state.edges.at(-1).color),fixture.color);
 const saved=await p.evaluate(()=>clone(state));await p.reload();assert.deepEqual(await p.evaluate(()=>clone(state)),saved);
 await p.locator(`[data-list-edge="${fixture.id}"]`).click();await p.locator(`[data-item-id="${fixture.items[1]}"]`).check();assert.equal(await p.evaluate(()=>state.edges.at(-1).color),fixture.color);assert.ok((await p.locator('#toast').innerText()).includes('不同线色'));
 await p.locator(`[data-item-id="${fixture.items[0]}"]`).uncheck();assert.equal(await p.evaluate(()=>state.edges.at(-1).color),'#db6055');
 // Missing provenance never invents a color, and a self-loop cannot supply its own provenance.
 assert.equal(await p.evaluate(()=>{const e=state.edges.at(-1);state.edges=state.edges.filter(x=>x.from!=='control');return transportColorChoice(e).kind}),'pending');
 assert.equal(await p.evaluate(()=>{const e=state.edges.at(-1);e.from='control';return transportColorChoice(e).kind}),'unchanged');
 assert.deepEqual(errors,[]);console.log('PASS: parts-to-matrix auto color with target-only recipe selection, atomic undo/redo, persistence, multi-item conflict/removal, unknown provenance and control exemption');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
