(function(){
'use strict';

/* v0.26 — NBA / Europe market realism
   NBA rosters remain part of the world, Draft and AI ecosystem, but players
   under NBA contract are not direct transfer targets for European clubs.
   Europe can recruit G League, undrafted NCAA and genuine NBA cuts.
*/
const DB_NAME='basketball_gm_offline',STORE='saves',SAVE_ID='main_v08';
const PIPE_VERSION='0.26';
let cachedState=null,nbaIds=new Set(),busy=false,domTimer=null;

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const BB=()=>window.BBGM||{};
function fullName(p){return `${p?.firstName||''} ${p?.lastName||''}`.trim()}
function overall(p){try{return BB().overall?.(p)||0}catch(_e){return 0}}
function hash(s){let h=2166136261;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rand(s){let x=hash(s)||1;x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967295}
function seasonKey(s){return String(s?.season||s?.currentSeason||String(s?.currentDate||'2026').slice(0,4))}
function userClub(s){return s?.world?.clubs?.find(c=>c.id===s.userClubId)||null}
function isNbaClub(c){return c?.leagueLevel==='NBA'||c?.leagueName==='NBA'||(Number(c?.id)>=121&&Number(c?.id)<=150)}
function addInbox(s,type,title,text,extra={}){s.inbox=s.inbox||[];const id=Math.max(0,...s.inbox.map(x=>Number(x.id)||0))+1;s.inbox.unshift({id,type,title,text,date:s.currentDate||'',resolved:false,...extra})}
function maxPlayerId(s){let m=0;for(const c of s?.world?.clubs||[])for(const p of c.roster||[])m=Math.max(m,Number(p.id)||0);for(const p of s?.world?.freeAgents||[])m=Math.max(m,Number(p.id)||0);for(const p of s?.academy?.players||[])m=Math.max(m,Number(p.id)||0);return m}
function setTargetOverall(p,target){
  if(!p?.attributes)return;
  const now=overall(p);if(!Number.isFinite(now))return;
  const d=target-now;
  for(const k of Object.keys(p.attributes))if(Number.isFinite(Number(p.attributes[k])))p.attributes[k]=clamp(Number(p.attributes[k])+d,25,99);
  p.ratingTargetV26=target;
}
function nextIdFactory(s){let n=maxPlayerId(s)+1;return ()=>n++}

function makeUsPipeline(s){
  const v=s.v26=s.v26||{};const season=seasonKey(s);
  if(v.usPipelineSeason===season)return false;
  const maker=BB().createFreeAgents;if(typeof maker!=='function')return false;
  const generated=maker().slice(0,20),nextId=nextIdFactory(s);s.world.freeAgents=s.world.freeAgents||[];
  generated.forEach((p,i)=>{
    p.id=nextId();p.freeAgent=true;p.contractYears=0;p.releaseClause=null;p.nbaRights=null;
    if(i<11){
      p.usOrigin='G_LEAGUE';p.marketSource='G League';p.age=22+(hash(`${season}-g-age-${i}`)%6);
      const target=70+(hash(`${season}-g-ovr-${i}`)%9);setTargetOverall(p,target);p.potentialReal=Math.max(p.potentialReal||target,target+(hash(`${season}-g-pot-${i}`)%5));
      p.salary=Math.round((180000+Math.max(0,target-70)*65000)/50000)*50000;
    }else{
      p.usOrigin='NCAA_UNDRAFTED';p.marketSource='NCAA · undrafted';p.age=21+(hash(`${season}-n-age-${i}`)%3);
      const target=65+(hash(`${season}-n-ovr-${i}`)%10);setTargetOverall(p,target);p.potentialReal=Math.max(p.potentialReal||target,target+5+(hash(`${season}-n-pot-${i}`)%8));
      p.salary=Math.round((100000+Math.max(0,target-65)*35000)/50000)*50000;
    }
    p.marketEligibleEurope=true;p.generatedUsPipeline=true;
    s.world.freeAgents.push(p);
  });
  v.usPipelineSeason=season;v.usPipelineCount=generated.length;
  addInbox(s,'MARKET','Nuevos perfiles disponibles desde Estados Unidos',`${generated.filter(p=>p.usOrigin==='G_LEAGUE').length} jugadores de G League y ${generated.filter(p=>p.usOrigin==='NCAA_UNDRAFTED').length} jugadores undrafted de NCAA están disponibles para clubes europeos.`);
  return true;
}

function markNbaMarketStatus(s){
  nbaIds=new Set();
  for(const c of s?.world?.clubs||[]){
    if(!isNbaClub(c))continue;
    for(const p of c.roster||[]){p.marketEligibleEurope=false;p.marketSource='NBA · bajo contrato';nbaIds.add(String(p.id));}
  }
  const cutIds=new Set();
  for(const ret of s?.nba?.returns||[])for(const x of ret.moved||[])cutIds.add(String(x.playerId));
  for(const p of s?.world?.freeAgents||[]){
    if(cutIds.has(String(p.id))){p.usOrigin='NBA_CUT';p.marketSource='NBA · cortado/libre';p.marketEligibleEurope=true;}
    if(p.marketEligibleEurope==null)p.marketEligibleEurope=true;
  }
}

function strengthenDraftPath(s){
  const rights=s?.nba?.rights||{},season=seasonKey(s),moved=[];
  for(const [pid,r] of Object.entries(rights)){
    if(!r||r.signed)continue;
    let source=null,p=null;
    for(const c of s.world.clubs||[]){if(isNbaClub(c))continue;const q=(c.roster||[]).find(x=>String(x.id)===String(pid));if(q){p=q;source=c;break}}
    if(!p&&s.academy?.players){p=s.academy.players.find(x=>String(x.id)===String(pid));source=userClub(s)}
    if(!p||!source)continue;
    const o=overall(p),pot=Number(p.potentialReal||o),elite=o>=78||pot>=87;
    if(!elite)continue;
    const chance=clamp(.70+(o-76)*.035+(pot-85)*.025-(p.age<=19?.04:0),.68,.97);
    if(rand(`${season}-rights-${pid}`)>=chance)continue;
    const team=s.world.clubs.find(c=>String(c.id)===String(r.teamId)&&isNbaClub(c));if(!team)continue;
    source.roster=source.roster.filter(x=>String(x.id)!==String(pid));if(s.academy?.players)s.academy.players=s.academy.players.filter(x=>String(x.id)!==String(pid));
    const buyout=p.releaseClause?Math.min(Number(p.releaseClause)||0,2500000):Math.round((400000+Math.max(0,pot-78)*100000)/50000)*50000;
    if(source.id===s.userClubId&&buyout){source.cashBudget=(Number(source.cashBudget)||0)+buyout;addInbox(s,'NBA',`${fullName(p)} se marcha a la NBA`,`${team.name} activa sus derechos de Draft. El jugador acepta dar el salto a la NBA${buyout?` y el club recibe ${buyout.toLocaleString('es-ES')} € de compensación`:''}.`,{playerId:p.id,fromClubId:team.id});}
    p.contractYears=3;p.releaseClause=null;p.freeAgent=false;p.marketEligibleEurope=false;p.marketSource='NBA · bajo contrato';team.roster.push(p);r.signed=true;p.nbaRights=r;moved.push(p.id);
  }
  return moved.length>0;
}

function maybeNbaOfferForEuropeanStar(s){
  const v=s.v26=s.v26||{},uc=userClub(s);if(!uc||isNbaClub(uc))return false;
  const played=(s.calendar||[]).filter(m=>m.status==='PLAYED'&&(m.homeClubId===s.userClubId||m.awayClubId===s.userClubId)).length;
  const tick=Math.floor(played/6);if(!tick||v.lastNbaOfferTick===tick)return false;v.lastNbaOfferTick=tick;
  if((s.inbox||[]).some(e=>!e.resolved&&e.type==='TRANSFER_OFFER'&&isNbaClub(s.world.clubs.find(c=>c.id===e.fromClubId))))return false;
  const candidates=(uc.roster||[]).filter(p=>(p.age||25)>=23&&((overall(p)>=81)||(p.potentialReal||0)>=88)&&(p.contractYears||0)>0).sort((a,b)=>(overall(b)+(b.potentialReal||0)*.12)-(overall(a)+(a.potentialReal||0)*.12));
  if(!candidates.length)return false;
  const p=candidates[hash(`${seasonKey(s)}-${tick}-nba-star`)%Math.min(candidates.length,4)],o=overall(p),pot=Number(p.potentialReal||o);
  const chance=clamp(.12+(o-80)*.055+(pot-85)*.018,.12,.70);if(rand(`${seasonKey(s)}-${tick}-${p.id}-nbaoffer`)>chance)return false;
  const nba=(s.world.clubs||[]).filter(isNbaClub);if(!nba.length)return false;const buyer=nba[hash(`${p.id}-${tick}-buyer`)%nba.length];
  const mv=BB().marketValue?.(p)||Math.max(300000,Number(p.salary)||0);const fee=Math.round(mv*(1.05+rand(`${p.id}-${tick}-fee`)*.35)/50000)*50000;
  addInbox(s,'TRANSFER_OFFER',`Oferta NBA por ${fullName(p)}`,`${buyer.name} quiere incorporar a ${fullName(p)} y ofrece ${fee.toLocaleString('es-ES')} €. El jugador ve con buenos ojos probar la NBA.`,{playerId:p.id,fromClubId:buyer.id,fee,nbaOffer:true});
  p.state=p.state||{};p.state.morale=clamp((p.state.morale??70)+1.5,0,100);return true;
}

function applyStateRules(s){
  if(!s?.world?.clubs)return s;
  s.v26=s.v26||{version:PIPE_VERSION};s.v26.version=PIPE_VERSION;
  markNbaMarketStatus(s);makeUsPipeline(s);strengthenDraftPath(s);maybeNbaOfferForEuropeanStar(s);markNbaMarketStatus(s);
  return s;
}

function openDB(){return new Promise((res,rej)=>{const q=indexedDB.open(DB_NAME,1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(STORE))q.result.createObjectStore(STORE)};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
async function readState(){try{const db=await openDB();return await new Promise((res,rej)=>{const tx=db.transaction(STORE,'readonly'),q=tx.objectStore(STORE).get(SAVE_ID);q.onsuccess=()=>{let x=q.result;try{if(typeof x==='string')x=JSON.parse(x)}catch(_e){}res(x||null)};q.onerror=()=>rej(q.error)})}catch(_e){return null}}
async function writeState(s){try{const db=await openDB();await new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(s,SAVE_ID);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}catch(_e){}}
async function refreshState(apply=true){if(busy)return cachedState;busy=true;try{const s=await readState();if(s){cachedState=s;if(apply){const before=JSON.stringify(s.v26||{});applyStateRules(s);const after=JSON.stringify(s.v26||{});if(before!==after)await writeState(s)}markNbaMarketStatus(s)}return s}finally{busy=false}}

function showBlocked(){
  let t=document.querySelector('.v26-toast');if(t)t.remove();t=document.createElement('div');t.className='v26-toast';t.textContent='Los jugadores con contrato NBA no pueden ficharse directamente desde Europa. Busca G League, NCAA undrafted o jugadores NBA libres/cortados.';document.body.appendChild(t);setTimeout(()=>t.remove(),3800);
}
function cleanMarketDom(){
  const h1=[...document.querySelectorAll('h1')].find(x=>/^Mercado/i.test(x.textContent.trim()));if(!h1||!cachedState)return;
  const root=h1.closest('.content')||document.querySelector('.content')||document.body;
  if(!root.querySelector('.v26-market-note')){const note=document.createElement('div');note.className='v26-market-note';note.innerHTML='<b>Mercado internacional realista</b><span>NBA bajo contrato no es fichable. Sí aparecen G League, NCAA undrafted y jugadores NBA que quedan libres.</span>';const title=h1.closest('.section-title');(title?.parentNode||root).insertBefore(note,title?.nextSibling||root.firstChild)}
  root.querySelectorAll('select option').forEach(o=>{if(/^NBA$/i.test(o.textContent.trim())||/^NBA$/i.test(o.value))o.remove()});
  for(const el of root.querySelectorAll('[data-transfer],[data-sign],[data-profile]')){
    const id=String(el.dataset.transfer||el.dataset.sign||el.dataset.profile||'');if(!nbaIds.has(id))continue;
    const row=el.closest('tr');if(row)row.remove();
  }
}
function scheduleDom(){clearTimeout(domTimer);domTimer=setTimeout(()=>{cleanMarketDom()},40)}

// Hard block any negotiation button that somehow survives rendering/caching.
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-transfer],[data-sign]');if(!b)return;const id=String(b.dataset.transfer||b.dataset.sign||'');if(nbaIds.has(id)){e.preventDefault();e.stopImmediatePropagation();showBlocked()}},true);

const style=document.createElement('style');style.textContent=`.v26-market-note{margin:10px 0 14px;padding:11px 13px;border:1px solid var(--line,#303844);border-radius:12px;background:rgba(111,168,255,.08);display:flex;gap:5px;flex-direction:column;font-size:.86rem}.v26-market-note span{opacity:.75}.v26-toast{position:fixed;left:50%;bottom:max(88px,calc(70px + env(safe-area-inset-bottom)));transform:translateX(-50%);width:min(560px,calc(100% - 24px));z-index:20000;background:#202838;border:1px solid #465269;border-radius:13px;padding:12px 14px;box-shadow:0 16px 50px rgba(0,0,0,.45);font-size:.86rem}`;document.head.appendChild(style);

const observer=new MutationObserver(scheduleDom);observer.observe(document.documentElement,{childList:true,subtree:true});
setInterval(()=>refreshState(false).then(scheduleDom),2500);
window.addEventListener('load',()=>refreshState(true).then(scheduleDom));
setTimeout(()=>refreshState(true).then(scheduleDom),350);
window.BBGM_V26={applyStateRules,refreshState,isNbaClub};
})();
