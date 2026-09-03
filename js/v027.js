(function(){
'use strict';
const DB='basketball_gm_offline',STORE='saves',KEY='main_v08';
const MARKET_ITERATOR_MARK=Symbol('bbgm-market-no-nba');
let nbaIds=new Set(),timer=null;
function isNBA(c){return c?.leagueLevel==='NBA'||c?.leagueName==='NBA'||(Number(c?.id)>=121&&Number(c?.id)<=150)}
function seasonStart(s){const m=String(s?.season||s?.currentDate||'2026').match(/\d{4}/);return m?+m[0]:2026}
function liveState(){try{return globalThis.BBGM_APP_TEST?.getState?.()||null}catch(_e){return null}}
function marketRoot(){
 const title=[...document.querySelectorAll('h1')].find(x=>/^Mercado$/i.test((x.textContent||'').trim()));
 return title?(title.closest('.content')||title.parentElement?.parentElement||document.body):null;
}
function openDB(){return new Promise((res,rej)=>{const q=indexedDB.open(DB,1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(STORE))q.result.createObjectStore(STORE)};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
async function getState(){try{const db=await openDB();return await new Promise((res,rej)=>{const t=db.transaction(STORE,'readonly'),q=t.objectStore(STORE).get(KEY);q.onsuccess=()=>{let v=q.result;try{if(typeof v==='string')v=JSON.parse(v)}catch(_e){}res(v||null)};q.onerror=()=>rej(q.error)})}catch(_e){return null}}
async function putState(s){try{const db=await openDB();await new Promise((res,rej)=>{const t=db.transaction(STORE,'readwrite');t.objectStore(STORE).put(s,KEY);t.oncomplete=()=>res();t.onerror=()=>rej(t.error)})}catch(_e){}}
function installMarketClubIterator(s){
 const clubs=s?.world?.clubs;
 if(!Array.isArray(clubs)||clubs[MARKET_ITERATOR_MARK])return;
 const nativeIterator=Array.prototype[Symbol.iterator];
 Object.defineProperty(clubs,MARKET_ITERATOR_MARK,{value:true,configurable:true});
 Object.defineProperty(clubs,Symbol.iterator,{configurable:true,writable:true,value:function(){
   const base=nativeIterator.call(this);
   // El mercado ya ha pintado su cabecera antes de construir candidatos. Mientras
   // esa vista está activa, los for..of sobre world.clubs ignoran NBA. Esto hace
   // que allMarketCandidates() pagine directamente sobre jugadores europeos,
   // en vez de paginar NBA y borrarlos después del DOM.
   if(!marketRoot())return base;
   return {
     next(){let n=base.next();while(!n.done&&isNBA(n.value))n=base.next();return n},
     [Symbol.iterator](){return this}
   };
 }});
}
function cleanInitialPipeline(s){
 if(!s?.world)return false;
 let changed=false;
 if(seasonStart(s)===2026){
   const before=(s.world.freeAgents||[]).length;
   s.world.freeAgents=(s.world.freeAgents||[]).filter(p=>!p.generatedUsPipeline);
   if(s.world.freeAgents.length!==before){changed=true;if(s.v26)s.v26.usPipelineSeason=String(s.season||'2026/27')}
 }
 return changed;
}
function collectNBA(s){
 nbaIds=new Set();
 const clubs=s?.world?.clubs;
 if(!Array.isArray(clubs))return;
 // Índices para limpieza/guardas: usamos acceso por índice para no depender del
 // iterador especial del mercado.
 for(let i=0;i<clubs.length;i++){
   const c=clubs[i];if(!isNBA(c))continue;
   for(const p of c.roster||[])nbaIds.add(String(p.id));
 }
}
function cleanMarketState(s){
 if(!s?.world)return false;
 let changed=false;
 collectNBA(s);
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
function elementPlayerId(el){
 if(!el)return '';
 return String(el.dataset?.profile||el.dataset?.transfer||el.dataset?.sign||el.dataset?.scout||el.dataset?.watch||el.dataset?.recWatch||'');
}
function tidyMarket(){
 const root=marketRoot();if(!root)return;
 // NBA tampoco debe aparecer como opción de filtro, pero NO borramos filas:
 // la lista ya llega filtrada antes de la paginación.
 root.querySelectorAll('select option').forEach(o=>{
   const v=String(o.value||'').trim(),t=(o.textContent||'').trim();
   if(/^NBA$/i.test(v)||/^NBA$/i.test(t))o.remove();
 });
}
async function refresh(){
 let s=liveState();
 if(!s)s=await getState();
 if(!s)return;
 installMarketClubIterator(s);
 collectNBA(s);
 const changed=cleanInitialPipeline(s)|cleanMarketState(s);
 if(changed)await putState(s);
 tidyMarket();
}
function scheduleTidy(){clearTimeout(timer);timer=setTimeout(()=>{const s=liveState();if(s){installMarketClubIterator(s);collectNBA(s);cleanMarketState(s)}tidyMarket()},10)}
const obs=new MutationObserver(scheduleTidy);obs.observe(document.documentElement,{childList:true,subtree:true});
// Última barrera: aunque un botón NBA llegase a quedar en una vista antigua,
// no permitimos abrir/negociar/fichar desde Mercado.
document.addEventListener('click',e=>{
 const root=marketRoot();if(!root||!root.contains(e.target))return;
 const el=e.target.closest?.('[data-profile],[data-transfer],[data-sign],[data-scout],[data-watch],[data-rec-watch]');
 if(!el||!nbaIds.has(elementPlayerId(el)))return;
 e.preventDefault();e.stopImmediatePropagation();
},true);
window.addEventListener('load',refresh);setTimeout(refresh,50);setTimeout(refresh,250);setTimeout(refresh,700);setInterval(refresh,2500);
})();
