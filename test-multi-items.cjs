const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');const path=require('node:path');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
const p=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
await p.locator('[data-slot="0"]').click();await p.locator('[data-type="cut"]').click();
const data=await p.evaluate(()=>{const n=state.modules[0],[a,b]=recipesFor(n);n.recipeIds=[a.id,b.id];addEdge('control',n.id,{a:{side:'top',t:1/6}});state.edges[0].itemId=a.inputs[0];commit();return {a,b,id:n.id}});
assert.equal(await p.locator(`[data-item-id="${data.a.inputs[0]}"]`).isChecked(),true);
await p.locator(`[data-item-id="${data.b.inputs[0]}"]`).check();assert.equal(await p.locator('[data-item-id]:checked').count(),2);assert.equal(await p.evaluate(()=>state.edges[0].itemId),undefined);
await p.locator('#item-search').fill('RAM');await p.locator(`[data-item-id="${data.b.inputs[0]}"]`).uncheck();assert.equal(await p.locator('#item-search').inputValue(),'RAM');await p.locator('#undo').click();assert.equal(await p.evaluate(()=>transportItems(state.edges[0]).length),2);
await p.locator('[data-list-edge]').first().click();await p.locator('[data-clear-items]').click();assert.equal(await p.evaluate(()=>transportItems(state.edges[0]).length),0);await p.locator('#undo').click();
const saved=await p.evaluate(()=>clone(state));await p.reload();assert.deepEqual(await p.evaluate(()=>clone(state)),saved);assert.deepEqual(await p.evaluate(()=>validate(clone(state))),saved);
// Both outputs on the same wire inherit their corresponding inputs on a multi-item input wire.
assert.deepEqual(await p.evaluate(({a,b})=>{const n=state.modules[0];return edgeWarnings({from:n.id,to:'control',itemIds:[a.outputs[0],b.outputs[0]],color:state.edges[0].color})},data),[]);
assert.equal(await p.evaluate(({a,b})=>{const n=state.modules[0];return edgeWarnings({from:n.id,to:'control',itemIds:[a.outputs[0],b.outputs[0]],color:'#000000'}).filter(w=>w.includes('颜色不匹配')).length},data),2);
await p.evaluate(()=>{state.modules[0].recipeIds=[recipesFor(state.modules[0])[0].id];commit()});await p.locator('[data-list-edge]').first().click();assert.ok((await p.locator('#inspector').innerText()).includes('待调整'));await p.locator(`[data-item-id="${data.b.inputs[0]}"]`).click();assert.equal(await p.evaluate(()=>transportItems(state.edges[0]).length),1);
await p.locator('#mode-view').click();await p.locator('[data-list-edge]').first().click();assert.equal(await p.locator('[data-item-id]').first().isDisabled(),true);assert.equal(await p.locator('#item-search').isDisabled(),false);
await p.locator('#mode-connect').click();await p.locator('[data-list-node]').click();await p.locator('[data-action="replace"]').click();await p.locator('[data-type="parts"]').click();assert.deepEqual(await p.evaluate(()=>transportItems(state.edges[0])),[]);
assert.equal(await p.evaluate(()=>{const d=clone(state);d.edges[0].itemIds=['invalid'];try{validate(d);return false}catch{return true}}),true);
assert.deepEqual(errors,[]);console.log('PASS transport multi-select, legacy, toggle/search, clear/undo, save/import validation, per-item color checks, stale removal, view mode and replacement cleanup');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
