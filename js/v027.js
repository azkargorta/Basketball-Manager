(function(){
'use strict';
const DB='basketball_gm_offline',STORE='saves',KEY='main_v08';
let nbaIds=new Set(),timer=null;
function isNBA(c){return c?.leagueLevel==='NBA'||c?.leagueName==='NBA'||(Number(c?.id)>=121&&Number(c?.id)<=150)}
function seasonStart(s){const m=String(s?.season||s?.currentDate||'2026').match(/\d{4}/);return m?+m[0]:2026}
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
function collectNBA(s){nbaIds=new Set();for(const c of s?.world?.clubs||[])if(isNBA(c))for(const p of c.roster||[])nbaIds.add(String(p.id))}
function scrubMarket(){
 const title=[...document.querySelectorAll('h1')].find(x=>/^Mercado/i.test(x.textContent.trim()));if(!title)return;
 const root=title.closest('.content')||title.parentElement?.parentElement||document.body;
 root.querySelectorAll('select option').forEach(o=>{if(/^NBA$/i.test(String(o.value).trim())||/^NBA$/i.test(o.textContent.trim()))o.remove()});
 for(const el of root.querySelectorAll('[data-profile],[data-transfer],[data-sign]')){
   const id=String(el.dataset.profile||el.dataset.transfer||el.dataset.sign||'');if(!nbaIds.has(id))continue;
   const block=el.closest('tr')||el.closest('.player-card')||el.closest('.search-result')||el.closest('.card');
   if(block&&block!==root)block.remove();
 }
 root.querySelectorAll('*').forEach(el=>{if(el.children.length>3)return;const t=(el.textContent||'').trim();if(/NBA\s*·\s*bajo contrato/i.test(t))el.remove()});
}
async function refresh(){const s=await getState();if(!s)return;collectNBA(s);if(cleanInitialPipeline(s))await putState(s);scrubMarket()}
const obs=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(scrubMarket,20)});obs.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('load',refresh);setTimeout(refresh,500);setInterval(refresh,2500);
})();
