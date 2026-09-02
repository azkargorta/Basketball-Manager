(function(){
'use strict';
const DB_NAME='basketball_gm_offline',STORE='saves',SAVE_ID='main_v08';
let busy=false,lastState=null;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
function openDB(){return new Promise((res,rej)=>{const q=indexedDB.open(DB_NAME,1);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);});}
async function readState(){try{const db=await openDB();const v=await new Promise((res,rej)=>{const tx=db.transaction(STORE,'readonly'),q=tx.objectStore(STORE).get(SAVE_ID);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});lastState=typeof v==='string'?JSON.parse(v):v;return lastState}catch(_){return null}}
async function writeState(s){const db=await openDB();await new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(s,SAVE_ID);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)});lastState=s;}
function club(s){return s?.world?.clubs?.find(c=>c.id===s.userClubId)||null}
function augmentTasks(){
  const box=$('#v22Dashboard .v22-pending');if(!box||box.dataset.v25==='1')return;
  box.dataset.v25='1';const head=$('.v22-head',box),alerts=$$('.v22-alert',box);const h=$('h2',box);if(h)h.childNodes[0].textContent='Qué tienes que hacer ahora ';
  const urgent=alerts.filter(x=>x.classList.contains('high')).length,review=alerts.filter(x=>x.classList.contains('warn')).length;
  const intro=document.createElement('div');intro.className='v25-task-intro';intro.innerHTML=`<div><strong>${alerts.length?`${alerts.length} asunto${alerts.length===1?'':'s'} pendiente${alerts.length===1?'':'s'}`:'Todo al día'}</strong><small>${alerts.length?(urgent?`${urgent} prioritario${urgent===1?'':'s'}${review?` · ${review} para revisar`:''}`:'Revísalos cuando te venga bien'):'No tienes decisiones importantes pendientes.'}</small></div><span class="v25-task-count">${alerts.length}</span>`;
  if(head)head.after(intro); else box.prepend(intro);
  alerts.forEach(a=>{const text=a.querySelector('div');if(!text||$('.v25-priority',text))return;const p=document.createElement('small');p.className='v25-priority';p.textContent=a.classList.contains('high')?'Prioridad':a.classList.contains('warn')?'Revisar':'Información';text.prepend(p);});
}
function posLabel(p){return {PG:'Base',SG:'Escolta',SF:'Alero',PF:'Ala-pívot',C:'Pívot'}[p]||p||''}
function augmentRoster(s){
  const wrap=$('#v22RosterCards');const c=club(s);if(!wrap||!c)return;
  const byId=new Map((c.roster||[]).map(p=>[String(p.id),p]));
  $$('.v22-player-card',wrap).forEach(card=>{const p=byId.get(String(card.dataset.pid));if(!p)return;card.dataset.v25Pos=p.primaryPosition||'';if(card.dataset.v25==='1')return;card.dataset.v25='1';const meta=$('.v22-meta',card);if(meta){const tag=document.createElement('span');tag.className='v25-position-tag';tag.textContent=posLabel(p.primaryPosition);meta.prepend(tag)}});
}
async function maybeApplyRealPack(s){
  if(!s||s.realRosterPackV25==='2026-09-02'||!window.BBGM?.applyRealRosterPackV25)return false;
  try{const changed=window.BBGM.applyRealRosterPackV25(s,{existingSave:true});if(changed){s.realRosterPackV25='2026-09-02';s.version='0.25-beta';await writeState(s);return true}}catch(e){console.warn('v0.25 real roster pack',e)}return false;
}
async function enhance(){if(busy)return;busy=true;try{const s=await readState();if(s){const migrated=await maybeApplyRealPack(s);if(migrated){location.reload();return}augmentRoster(s)}augmentTasks()}finally{busy=false}}
const mo=new MutationObserver(()=>enhance());mo.observe(document.getElementById('app')||document.body,{subtree:true,childList:true});
setTimeout(enhance,120);setTimeout(enhance,900);
})();
