'use strict';
function recipesFor(n){return n?NAC_RECIPES[n.type]||[]:[]}
function selectedRecipes(n){const ids=n?.recipeIds??(n?.recipeId?[n.recipeId]:[]),rows=recipesFor(n).filter(r=>ids.includes(r.id));return n?.type==='super'?rows.slice(0,1):rows}
function itemName(k){return NAC_ITEMS[k]||'未知物品'}
function recipeSide(groups){return groups.map(g=>g.map(itemName).join(' / ')).join(' ＋ ')}
function recipeLabel(r){return recipeSide(r.inputGroups)+' → '+recipeSide(r.outputGroups)}
function edgeItems(e){
 const target=node(e.to),source=node(e.from);
 return [...new Set(selectedRecipes(e.to!=='control'?target:source).flatMap(r=>e.to!=='control'?r.inputs:r.outputs))];
}
function transportItems(e){return e.itemIds??(e.itemId?[e.itemId]:[])}
function outputColors(e,id){
 if(e.from==='control')return [];
 const n=node(e.from),chosen=selectedRecipes(n),recipes=(chosen.length?chosen:recipesFor(n)).filter(r=>r.outputs.includes(id));
 const primary=recipes.flatMap(r=>r.inputGroups[0]||[]);
 return [...new Set(state.edges.filter(x=>x!==e&&x.to===e.from&&transportItems(x).some(k=>primary.includes(k))).map(x=>x.color.toLowerCase()))];
}
function transportItemName(e,id,color=e.color){
 const colors=outputColors(e,id).sort((a,b)=>COLORS.indexOf(a)-COLORS.indexOf(b)||a.localeCompare(b));
 const index=colors.indexOf(color.toLowerCase());return itemName(id)+(index>0?'*'.repeat(index):'');
}
function itemColorMark(color){return `<i class="item-color-mark" style="background:${esc(color)}" title="${esc(colorName(color))}" aria-label="${esc(colorName(color))}"></i>`}
function transportMarkup(e){return transportItems(e).map(id=>`<span class="transport-chip">${itemColorMark(e.color)}${esc(transportItemName(e,id))}</span>`).join(' ')}
function transportLabel(e){return transportItems(e).map(id=>transportItemName(e,id)).join('、')}
function transportChain(start){
 // Resolve connections before recoloring to keep independent channels separate.
 const links=new Map(state.edges.map(e=>[e,new Set()]));
 for(const out of state.edges){
  if(out.from==='control')continue;
  const source=node(out.from),chosen=selectedRecipes(source),recipes=chosen.length?chosen:recipesFor(source);
  for(const id of transportItems(out)){
   const primary=recipes.filter(r=>r.outputs.includes(id)).flatMap(r=>r.inputGroups[0]||[]);
   const candidates=state.edges.filter(e=>e!==out&&e.to===out.from&&transportItems(e).some(k=>primary.includes(k)));
   const matching=candidates.filter(e=>e.color.toLowerCase()===out.color.toLowerCase());
   // Repair mismatches only when there is a single upstream color channel.
   const inputs=matching.length?matching:new Set(candidates.map(e=>e.color.toLowerCase())).size===1?candidates:[];
   for(const input of inputs){links.get(input).add(out);links.get(out).add(input)}
  }
 }
 const found=new Set([start]),queue=[start];
 for(let i=0;i<queue.length;i++)for(const next of links.get(queue[i])||[])if(!found.has(next)){found.add(next);queue.push(next)}
 return [...found];
}
function recolorTransportChain(e,color){
 const chain=transportChain(e);if(chain.every(x=>x.color===color))return;
 checkpoint();for(const edge of chain)edge.color=color;commit();
 if(chain.length>1)toast('已同步修改 '+chain.length+' 段运输线路的颜色');
}
function transportColorChoice(e){
 if(e.from==='control'||!transportItems(e).length)return {kind:'unchanged'};
 const source=node(e.from),chosen=selectedRecipes(source),recipes=chosen.length?chosen:recipesFor(source);
 const sets=transportItems(e).map(id=>{
  const primary=recipes.filter(r=>r.outputs.includes(id)).flatMap(r=>r.inputGroups[0]||[]);
  return new Set(state.edges.filter(x=>x!==e&&x.to===e.from&&transportItems(x).some(k=>primary.includes(k))).map(x=>x.color.toLowerCase()));
 });
 const known=sets.filter(s=>s.size);
 const common=known.length?[...known[0]].filter(c=>known.every(s=>s.has(c))):[];
 if(known.length&&!common.length)return {kind:'conflict'};
 if(known.length!==sets.length)return {kind:'pending'};
 if(common.includes(e.color.toLowerCase()))return {kind:'unchanged'};
 return common.length===1?{kind:'color',color:common[0]}:{kind:'ambiguous'};
}
function edgeWarnings(e){return transportItems(e).flatMap(id=>itemWarnings(e,id).map(w=>itemName(id)+'：'+w))}
function itemWarnings(e,itemId){
 const warnings=[],source=node(e.from),target=node(e.to),sr=selectedRecipes(source).filter(r=>r.outputs.includes(itemId)),tr=selectedRecipes(target);
 if(e.to!=='control'&&!tr.some(r=>r.inputs.includes(itemId)))warnings.push('运输物品不在终点所选配方中');
 if(e.from!=='control'){
  if(!sr.length)warnings.push('运输物品不在起点所选配方的输出中');
  else{
   // Only recipes producing this output can establish its output color.
   const inputs=sr.map(r=>state.edges.filter(x=>x.to===e.from&&transportItems(x).some(id=>(r.inputGroups[0]||[]).includes(id))));
   if(!inputs.some(lines=>lines.some(x=>x.color.toLowerCase()===e.color.toLowerCase()))){
    if(inputs.some(lines=>!lines.length))warnings.push('待检查：相关配方的首项原料尚未指定入线');
    else warnings.push('颜色不匹配：输出应与对应配方首项原料的入线同色');
   }
  }
 }
 return warnings;
}
function recipePanel(n){
 if(n.id==='control')return '';
 if(n.type==='split')return '<div class="recipe-section"><p>分流器暂不支持配方配置。</p></div>';
 const rows=recipesFor(n),chosen=selectedRecipes(n),ids=new Set(chosen.map(r=>r.id));
 return `<section class="recipe-section"><div class="section-heading">生产配方（${n.type==='super'?'单选':'多选'}） <button data-clear-recipe>清除选择</button></div><p class="recipe-current">${chosen.length?'已选 '+chosen.length+' 条 · 再次点击可取消':'未选择生产配方'}</p><input class="text-input" id="recipe-search" placeholder="搜索输入或输出物品" aria-label="搜索配方"><div class="recipe-options">${rows.map(r=>`<button class="recipe-row ${ids.has(r.id)?'active':''}" data-recipe-id="${r.id}" aria-pressed="${ids.has(r.id)}"><span><span class="recipe-check" aria-hidden="true">${ids.has(r.id)?'☑':'☐'}</span> ${esc(recipeSide(r.inputGroups))}</span><span class="recipe-arrow">→</span><span>${esc(recipeSide(r.outputGroups))}</span></button>`).join('')}</div><p id="recipe-no-results" hidden>没有匹配的配方</p></section>`;
}
function itemPanel(e){
 const options=edgeItems(e),ids=transportItems(e),all=[...new Set([...ids,...options])],warnings=edgeWarnings(e);
 const variants=all.flatMap(id=>{const colors=outputColors(e,id);return (colors.length>1?[...new Set([...colors,...(ids.includes(id)?[e.color.toLowerCase()]:[])])]:[null]).map(color=>({id,color,checked:ids.includes(id)&&(!color||color===e.color.toLowerCase())}))});
 return `<section class="recipe-section"><div class="section-heading">运输物品（多选）<button data-clear-items>清除选择</button></div><p>已选 ${ids.length} 种</p><input class="text-input" id="item-search" placeholder="搜索运输物品" aria-label="搜索运输物品"><div class="item-options">${variants.map(({id:k,color,checked})=>`<label class="item-row ${checked?'active':''}"><input type="checkbox" data-item-id="${esc(k)}" ${color?`data-item-color="${esc(color)}"`:''} ${checked?'checked':''}><span class="item-caption">${itemColorMark(color||e.color)}${esc(transportItemName(e,k,color||e.color))}${!options.includes(k)?'（待调整）':''}</span></label>`).join('')}</div><p id="item-no-results" hidden>没有匹配的物品</p>${!options.length?'<p>请先选择'+(e.to==='control'?'起点':'终点')+'模块的生产配方。</p>':''}${warnings.map(w=>`<p class="recipe-warning">${esc(w)}</p>`).join('')}</section>`;
}
function renderRecipeInspector(){
 const e=state.edges.find(e=>e.id===selectedEdge),n=node(selectedNode);
 if(e)$('inspector').insertAdjacentHTML('beforeend',itemPanel(e));
 else if(n){$('inspector').insertAdjacentHTML('beforeend',recipePanel(n));const warnings=state.edges.filter(e=>e.from===n.id||e.to===n.id).flatMap(e=>edgeWarnings(e).map(w=>(e.name||'线路')+ '：'+w));if(warnings.length)$('inspector').insertAdjacentHTML('beforeend',`<div class="recipe-section">${[...new Set(warnings)].map(w=>`<p class="recipe-warning">${esc(w)}</p>`).join('')}</div>`)}
}
document.getElementById('inspector').addEventListener('click',event=>{
 if(uiMode==='view')return;
 const choice=event.target.closest('[data-recipe-id]'),clear=event.target.closest('[data-clear-recipe]'),n=node(selectedNode);
 if(!n||(!choice&&!clear))return;
 const id=choice?.dataset.recipeId;if(id&&!recipesFor(n).some(r=>r.id===id))return;
 const search=$('recipe-search')?.value||'',scroll=$('inspector').querySelector('.recipe-options')?.scrollTop||0;
 const ids=selectedRecipes(n).map(r=>r.id);
 checkpoint();delete n.recipeId;
 n.recipeIds=clear?[]:ids.includes(id)?ids.filter(x=>x!==id):n.type==='super'?[id]:[...ids,id];commit();
 $('recipe-search').value=search;filterRecipes(search);$('inspector').querySelector('.recipe-options').scrollTop=scroll;
});
function setTransportItems(e,ids,preferredColor=null){
 const query=$('item-search')?.value||'',scroll=$('inspector').querySelector('.item-options')?.scrollTop||0;
 checkpoint();delete e.itemId;e.itemIds=ids;if(preferredColor)e.color=preferredColor;
 const choice=transportColorChoice(e);
 if(choice.kind==='color')e.color=choice.color;
 commit();
 if(choice.kind==='color')toast('已跟随原料入线改为'+colorName(e.color));
 if(choice.kind==='conflict')toast('这些物品需要不同线色，请分到不同线路运输');
 if(choice.kind==='pending')toast('尚未找到全部物品对应的原料入线，暂时保留线色');
 if(choice.kind==='ambiguous')toast('对应原料有多种入线颜色，请手动选择其中一种');
 $('item-search').value=query;filterItems(query);$('inspector').querySelector('.item-options').scrollTop=scroll;
}
document.getElementById('inspector').addEventListener('change',event=>{
 if(uiMode==='view'||!event.target.matches('[data-item-id]'))return;
 const e=state.edges.find(x=>x.id===selectedEdge),id=event.target.dataset.itemId;if(!e)return;
 const ids=transportItems(e);
 if(event.target.checked&&!edgeItems(e).includes(id))return;
 setTransportItems(e,event.target.checked?[...new Set([...ids,id])]:ids.filter(k=>k!==id),event.target.checked?event.target.dataset.itemColor:null);
});
document.getElementById('inspector').addEventListener('click',event=>{
 if(uiMode==='view'||!event.target.closest('[data-clear-items]'))return;
 const e=state.edges.find(x=>x.id===selectedEdge);if(e)setTransportItems(e,[]);
});
function filterItems(value){
 const query=value.trim().toLowerCase();let count=0;
 document.querySelectorAll('.item-row').forEach(el=>{el.hidden=!el.textContent.toLowerCase().includes(query);if(!el.hidden)count++});$('item-no-results').hidden=count>0;
}
function filterRecipes(value){
 const query=value.trim().toLowerCase();let count=0;
 document.querySelectorAll('[data-recipe-id]').forEach(el=>{el.hidden=!el.textContent.toLowerCase().includes(query);if(!el.hidden)count++});$('recipe-no-results').hidden=count>0;
}
document.getElementById('inspector').addEventListener('input',event=>{if(event.target.id==='recipe-search')filterRecipes(event.target.value);if(event.target.id==='item-search')filterItems(event.target.value)});
