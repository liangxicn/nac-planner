const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');const path=require('node:path');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
const p=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
await p.locator('[data-slot="0"]').click();await p.locator('[data-type="super"]').click();await p.locator('[data-list-node]').click();
await p.locator('[data-recipe-id]').nth(0).click();await p.locator('[data-recipe-id]').nth(1).click();assert.equal(await p.locator('[data-recipe-id][aria-pressed="true"]').count(),1);assert.equal(await p.evaluate(()=>state.modules[0].recipeIds.length),1);await p.locator('#undo').click();assert.equal(await p.evaluate(()=>selectedRecipes(state.modules[0])[0].id),await p.evaluate(()=>recipesFor(state.modules[0])[0].id));
assert.equal(await p.evaluate(()=>{const d=clone(state);d.modules[0].recipeIds=recipesFor(d.modules[0]).slice(0,2).map(r=>r.id);return validate(d).modules[0].recipeIds.length}),1);
await p.locator('#reset-layout').click();
const data=await p.evaluate(()=>{
 state.modules=[{id:'parts',type:'parts',slot:0,name:'',rotation:0},{id:'matrix',type:'matrix',slot:1,name:'',rotation:0}];
 const r=recipesFor(node('parts')).find(y=>recipesFor(node('matrix')).some(x=>x.inputs.includes(y.outputs[0]))),m=recipesFor(node('matrix')).find(x=>x.inputs.includes(r.outputs[0]));node('parts').recipeIds=[r.id];node('matrix').recipeIds=[m.id];
 addEdge('control','parts',{a:{side:'top',t:1/6}});const a=state.edges.at(-1);a.itemIds=[r.inputs[0]];a.color=COLORS[0];
 addEdge('control','parts',{a:{side:'top',t:2/6}});const b=state.edges.at(-1);b.itemIds=[r.inputs[0]];b.color=COLORS[3];
 addEdge('parts','matrix');const out=state.edges.at(-1);commit();return {id:out.id,item:r.outputs[0],raw:r.inputs[0],name:itemName(r.outputs[0]),b:b.id};
});
const blue=p.locator(`[data-item-id="${data.item}"][data-item-color="#438bd1"]`),red=p.locator(`[data-item-id="${data.item}"][data-item-color="#db6055"]`);
assert.equal(await blue.count(),1);assert.equal(await red.count(),1);
assert.equal((await blue.locator('..').innerText()).trim(),data.name);assert.equal((await red.locator('..').innerText()).trim(),data.name+'*');assert.equal(await red.locator('..').locator('.item-color-mark').getAttribute('aria-label'),'红色');
await red.check();assert.equal(await p.evaluate(()=>state.edges.at(-1).color),'#db6055');assert.deepEqual(await p.evaluate(()=>transportItems(state.edges.at(-1))),[data.item]);assert.ok((await p.locator(`[data-list-edge="${data.id}"]`).innerText()).includes(data.name+'*'));
const saved=await p.evaluate(()=>clone(state));await p.reload();assert.deepEqual(await p.evaluate(()=>clone(state)),saved);await p.locator(`[data-list-edge="${data.id}"]`).click();assert.equal(await red.isChecked(),true);
await blue.check();assert.equal(await p.evaluate(()=>state.edges.at(-1).color),'#438bd1');assert.equal(await p.locator(`[data-item-id="${data.item}"]:checked`).count(),1);
await p.locator('#undo').click();assert.equal(await p.evaluate(()=>state.edges.at(-1).color),'#db6055');
// Input labels remain normal; variant suffixes never modify recipe identities.
await p.locator(`[data-list-edge="${data.b}"]`).click();assert.equal(await p.locator('[data-item-color]').count(),0);assert.equal(await p.evaluate(raw=>itemName(raw),data.raw),await p.locator(`[data-item-id="${data.raw}"]`).locator('..').innerText());
await p.locator(`[data-list-edge="${data.id}"]`).click();await p.locator('#mode-view').click();await p.locator(`[data-list-edge="${data.id}"]`).click();assert.equal(await red.isDisabled(),true);
await p.screenshot({path:path.join(__dirname,'preview-item-colors.png')});assert.deepEqual(errors,[]);console.log('PASS: super recipes exclusive, old save migration; duplicate input colors yield plain/starred output labels and swatches; choosing variant sets color, keeps item identity, saves/undoes, view mode read-only');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
