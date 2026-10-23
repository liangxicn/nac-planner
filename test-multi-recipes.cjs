const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');const path=require('node:path');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
const p=await browser.newPage({viewport:{width:1400,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
await p.locator('[data-slot="0"]').click();await p.locator('[data-type="cut"]').click();await p.locator('[data-list-node]').click();
await p.locator('[data-recipe-id]').nth(0).click();await p.locator('[data-recipe-id]').nth(1).click();assert.equal(await p.locator('[data-recipe-id][aria-pressed="true"]').count(),2);
const selected=await p.evaluate(()=>selectedRecipes(state.modules[0]));assert.equal(selected.length,2);
assert.deepEqual(await p.evaluate(()=>edgeItems({from:'control',to:state.modules[0].id})),[...new Set(selected.flatMap(r=>r.inputs))]);assert.deepEqual(await p.evaluate(()=>edgeItems({from:state.modules[0].id,to:'control'})),[...new Set(selected.flatMap(r=>r.outputs))]);
await p.locator('#recipe-search').fill('CPU');await p.locator('[data-recipe-id]:visible').first().click();assert.equal(await p.locator('#recipe-search').inputValue(),'CPU');assert.equal(await p.evaluate(()=>selectedRecipes(state.modules[0]).length),1);await p.locator('#recipe-search').fill('');
await p.locator('#undo').click();assert.equal(await p.evaluate(()=>selectedRecipes(state.modules[0]).length),2);await p.locator('#redo').click();assert.equal(await p.evaluate(()=>selectedRecipes(state.modules[0]).length),1);
const saved=await p.evaluate(()=>clone(state));assert.deepEqual(await p.evaluate(()=>validate(clone(state))),saved);await p.reload();assert.deepEqual(await p.evaluate(()=>clone(state)),saved);
// A line color is checked only against recipes that produce its selected item.
assert.deepEqual(await p.evaluate(()=>{const n=state.modules[0],[a,b]=recipesFor(n);n.recipeIds=[a.id,b.id];state.edges=[{from:'control',to:n.id,itemId:a.inputs[0],color:'#438bd1'},{from:'control',to:n.id,itemId:b.inputs[0],color:'#db6055'}];return edgeWarnings({from:n.id,to:'control',itemId:b.outputs[0],color:'#db6055'})}),[]);
assert.ok((await p.evaluate(()=>{const n=state.modules[0],b=recipesFor(n)[1];return edgeWarnings({from:n.id,to:'control',itemId:b.outputs[0],color:'#438bd1'})})).some(w=>w.includes('颜色不匹配')));
await p.evaluate(()=>{state.edges=[];const n=state.modules[0];delete n.recipeIds;n.recipeId=recipesFor(n)[0].id;commit()});await p.reload();assert.equal(await p.evaluate(()=>selectedRecipes(state.modules[0]).length),1);
await p.locator('[data-list-node]').click();await p.locator('[data-recipe-id]').nth(1).click();assert.equal(await p.evaluate(()=>state.modules[0].recipeId),undefined);assert.equal(await p.evaluate(()=>state.modules[0].recipeIds.length),2);
await p.locator('[data-clear-recipe]').click();assert.equal(await p.evaluate(()=>selectedRecipes(state.modules[0]).length),0);await p.locator('#undo').click();await p.locator('[data-list-node]').click();
await p.locator('[data-action="replace"]').click();await p.locator('[data-type="parts"]').click();assert.equal(await p.evaluate(()=>state.modules[0].recipeIds),undefined);
assert.equal(await p.evaluate(()=>{const d=clone(state);d.modules[0].recipeIds=['bogus'];try{validate(d);return false}catch{return true}}),true);
assert.deepEqual(errors,[]);console.log('PASS multi-select toggle, union candidates, per-output color validation, search retention, undo/redo, save/reload, legacy selection, clear and replacement');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
