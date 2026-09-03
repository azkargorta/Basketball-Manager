(function(){
'use strict';
const DB='basketball_gm_offline',STORE='saves',KEY='main_v08';
let nbaIds=new Set(),timer=null;
function isNBA(c){return c?.leagueLevel==='NBA'||c?.leagueName==='NBA'||(Number(c?.id)>=121&&Number(c?.id)<=150)}
function seasonStart(s){const m=String(s?.season||s?.currentDate||'2026').match(/\d{4}/);return m?+m[0]:2026}
function liveState(){try{return globalThis.BBGM_APP_TEST?.getState?.()||null}catch(_e){return null}}
function openDB(){return new Promise((res,rej)=>{const q=indexedDB.open(DB,1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(STORE))q.result.createObjectStore(STORE)};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
async function getState(){try{const db=await openDB();return await new Promise((res,rej)=>{const t=db.transaction(STORE,'readonly'),q=t.objectStore(STORE).get(KEY);q.onsuccess=()=>{let v=q.result;try{if(typeof v==='string')v=JSON.parse(v)}catch(_e){}res(v||null)};q.onerror=()=>rej(q.error)})}catch(_e){return null}}
async function putState(s){try{const db=await openDB();await new Promise((res,rej)=>{const t=db.transaction(STORE,'readwrite');t.objectStore(STORE).put(s,KEY);t.oncomplete=()=>res();t.onerror=()=>rej(t.error)})}catch(_e){}}
function cleanInitialPipeline(s){
 if(!s?.world)return false;
 let changed=false;
 // 2026/27 must contain only the curated real initial free-agent pool.
 if(seasonStart(s)===2026){
   const before=(s.world.freeAgents||[]).length;
   s.world.freeAgents=(s.world.freeAgents||[]).filter(p=>!p.generatedUsPipeline);
   if(s.world.freeAgents.length!==before){changed=true;if(s.v26)s.v26.usPipelineSeason=String(s.season||'2026/27')}
 }
 return changed;
}
function collectNBA(s){
 nbaIds=new Set();
 for(const c of s?.world?.clubs||[])if(isNBA(c))for(const p of c.roster||[])nbaIds.add(String(p.id));
}
function cleanMarketState(s){
 if(!s?.world)return false;
 let changed=false;
 collectNBA(s);
 // A player currently under NBA contract must not remain in European market watchlists or market news.
 if(Array.isArray(s.watchlist)){
   const next=s.watchlist.filter(id=>!nbaIds.has(String(id)));
   if(next.length!==s.watchlist.length){s.watchlist=next;changed=true}
 }
 if(s.marketDynamics){
   if(Array.isArray(s.marketDynamics.rumors)){
     const next=s.marketDynamics.rumors.filter(r=>!nbaIds.has(String(r.playerId)));
     if(next.length!==s.marketDynamics.rumors.length){s.marketDynamics.rumors=next;changed=true}
   }
   if(Array.isArray(s.marketDynamics.agentOffers)){
     const next=s.marketDynamics.agentOffers.filter(o=>!nbaIds.has(String(o.playerId)));
     if(next.length!==s.marketDynamics.agentOffers.length){s.marketDynamics.agentOffers=next;changed=true}
   }
 }
 return changed;
}
function marketRoot(){
 const title=[...document.querySelectorAll('h1')].find(x=>/^Mercado$/i.test((x.textContent||'').trim()));
 return title?(title.closest('.content')||title.parentElement?.parentElement||document.body):null;
}
function elementPlayerId(el){
 if(!el)return '';
 return String(el.dataset?.profile||el.dataset?.transfer||el.dataset?.sign||el.dataset?.scout||el.dataset?.watch||el.dataset?.recWatch||'');
}
function blockHasNBAPlayer(block){
 if(!block)return false;
 for(const el of block.querySelectorAll('[data-profile],[data-transfer],[data-sign],[data-scout],[data-watch],[data-rec-watch]')){
   if(nbaIds.has(elementPlayerId(el)))return true;
 }
 // Fallback for table rows where the league column itself says NBA.
 const cells=[...block.querySelectorAll('td')].map(td=>(td.textContent||'').trim());
 return cells.some(t=>/^NBA$/i.test(t));
}
function scrubMarket(){
 const root=marketRoot();if(!root)return;
 root.querySelectorAll('select option').forEach(o=>{
   const v=String(o.value||'').trim(),t=(o.textContent||'').trim();
   if(/^NBA$/i.test(v)||/^NBA$/i.test(t))o.remove();
 });
 const blocks=[...root.querySelectorAll('tr,.player-card,.search-result,.news-line,.offer-card,.player-line')];
 for(const block of blocks)if(blockHasNBAPlayer(block))block.remove();
 // Recommendation/watchlist cards may not use a dedicated row wrapper.
 for(const el of root.querySelectorAll('[data-profile],[data-transfer],[data-sign],[data-scout],[data-watch],[data-rec-watch]')){
   if(!nbaIds.has(elementPlayerId(el)))continue;
   const block=el.closest('tr,.player-card,.search-result,.news-line,.offer-card,.player-line,.card');
   if(block&&block!==root)block.remove();
   else el.remove();
 }
}
async function refresh(){
 let s=liveState();
 if(!s)s=await getState();
 if(!s)return;
 collectNBA(s);
 const changed=cleanInitialPipeline(s)|cleanMarketState(s);
 if(changed)await putState(s);
 scrubMarket();
}
function scheduleScrub(){clearTimeout(timer);timer=setTimeout(()=>{const s=liveState();if(s){collectNBA(s);cleanMarketState(s)}scrubMarket()},10)}
const obs=new MutationObserver(scheduleScrub);obs.observe(document.documentElement,{childList:true,subtree:true});
// Capture-phase guard: even during a render frame, NBA players cannot be opened/negotiated from Mercado.
document.addEventListener('click',e=>{
 const root=marketRoot();if(!root||!root.contains(e.target))return;
 const el=e.target.closest?.('[data-profile],[data-transfer],[data-sign],[data-scout],[data-watch],[data-rec-watch]');
 if(!el||!nbaIds.has(elementPlayerId(el)))return;
 e.preventDefault();e.stopImmediatePropagation();scrubMarket();
},true);
window.addEventListener('load',refresh);setTimeout(refresh,150);setTimeout(refresh,700);setInterval(refresh,2500);
})();
