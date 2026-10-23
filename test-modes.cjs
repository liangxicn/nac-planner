const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
 assert.equal(await page.locator('#mode-connect').getAttribute('aria-pressed'),'true');
 for(const [slot,type] of [[0,'matrix'],[1,'parts']]){await page.locator(`[data-slot="${slot}"]`).click();await page.locator(`[data-type="${type}"]`).click()}
 const ids=await page.evaluate(()=>state.modules.map(n=>n.id));
 await page.locator(`[data-node="${ids[0]}"]`).click();await page.locator(`[data-node="${ids[1]}"]`).click();
 const saved=await page.evaluate(()=>clone(state));await page.locator('#mode-view').click();
 await page.locator(`[data-node="${ids[0]}"]`).click();await page.locator(`[data-node="${ids[1]}"]`).click();await page.locator(`[data-node="${ids[1]}"]`).click();
 assert.deepEqual(await page.evaluate(()=>clone(state)),saved);assert.equal(await page.locator('#node-name').isDisabled(),true);
 assert.equal(await page.locator('[data-action="rotate"]').count(),0);
 const text=await page.locator('#canvas').textContent();for(const unwanted of ['正面','后侧','↑','→','↓','←'])assert.ok(!text.includes(unwanted));
 const nodeBox=await page.locator(`[data-node="${ids[0]}"]`).boundingBox(),viewBefore=await page.evaluate(()=>({...view}));
 await page.mouse.move(nodeBox.x+nodeBox.width/2,nodeBox.y+nodeBox.height/2);await page.mouse.down();await page.mouse.move(nodeBox.x+nodeBox.width/2+40,nodeBox.y+nodeBox.height/2+30,{steps:5});await page.mouse.up();
 assert.deepEqual(await page.evaluate(()=>clone(state)),saved);assert.notDeepEqual(await page.evaluate(()=>({...view})),viewBefore);
 await page.locator('[data-list-edge]').first().click();assert.equal(await page.locator('[data-port],[data-segment]').count(),0);
 assert.equal(await page.locator('#edge-name').isDisabled(),true);await page.keyboard.press('Delete');await page.keyboard.press('Control+z');assert.deepEqual(await page.evaluate(()=>clone(state)),saved);
 for(const id of ['undo','redo','reset-layout','import-btn'])assert.equal(await page.locator('#'+id).isDisabled(),true);
 await page.keyboard.press('Escape');await page.locator(`[data-node="${ids[0]}"]`).click({button:'right'});assert.equal(await page.locator('#picker').isVisible(),false);
 await page.locator('[data-slot="5"]').click();assert.equal(await page.locator('#picker').isVisible(),false);
 await page.locator('#zoom-in').click();assert.notEqual(await page.locator('#fit').innerText(),'100%');
 await page.reload();assert.equal(await page.locator('#mode-view').getAttribute('aria-pressed'),'true');assert.deepEqual(await page.evaluate(()=>clone(state)),saved);
 await page.locator('#mode-connect').click();await page.locator(`[data-node="${ids[0]}"]`).click();await page.locator(`[data-node="${ids[0]}"]`).click();assert.equal(await page.evaluate(()=>state.edges.length),2);
 await page.locator('[data-slot="5"]').click();await page.locator('[data-type="wrap"]').click();assert.equal(await page.evaluate(()=>state.modules.length),3);
 await page.locator('#mode-view').click();await page.screenshot({path:path.join(__dirname,'preview-modes.png')});
 assert.deepEqual(errors,[]);console.log('PASS: view mode inspects/pans/zooms without mutations, persists, prevents mouse/keyboard edits; connect mode restores editing; orientation UI removed');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
