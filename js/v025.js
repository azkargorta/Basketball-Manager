(function(){
'use strict';

/* v0.25 rules layer
   - Difficulty is selected before a new career is created.
   - End-of-season financial consequences and board pressure.
   - Transfer market closes on 31 January with a 7-day warning.
   This layer intentionally works on the persisted state so it remains compatible
   with the current v0.24 UI and simulation engine. */

const DB_SAVE_ID='main_v08';
const DIFF_KEY='bbgm_new_game_difficulty_v25';
const DIFFS={EASY:'Fácil',MEDIUM:'Medio',DEMANDING:'Exigente'};
const nativePut=(globalThis.IDBObjectStore&&IDBObjectStore.prototype.put)||null;
let applying=false;

function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function seasonOf(s){return String(s?.season||s?.currentSeason||String(s?.currentDate||'2026').slice(0,4)||'2026')}
function userClub(s){return s?.world?.clubs?.find(c=>c.id===s.userClubId)||null}
function addInbox(s,type,title,text,extra={}){
  s.inbox=s.inbox||[];
  const id=Math.max(0,...s.inbox.map(x=>Number(x.id)||0))+1;
  s.inbox.unshift({id,type,title,text,date:s.currentDate||'',resolved:false,...extra});
}
function chosenDifficulty(){
  const d=localStorage.getItem(DIFF_KEY)||'MEDIUM';
  return DIFFS[d]?d:'MEDIUM';
}
function setChosenDifficulty(d){if(DIFFS[d])localStorage.setItem(DIFF_KEY,d)}

function financeBalance(s,c){
  const vals=[
    c?.cash,c?.balance,c?.finances?.balance,c?.finances?.cash,c?.finance?.balance,
    s?.finances?.balance,s?.finance?.balance,s?.clubFinances?.balance
  ];
  const n=vals.find(v=>Number.isFinite(Number(v)));
  return n==null?0:Number(n);
}
function wageBill(c){return (c?.roster||[]).reduce((a,p)=>a+(Number(p.salary)||0),0)}
function seasonPerformance(s){
  const games=(s.calendar||[]).filter(m=>m.status==='PLAYED'&&m.result&&(m.homeClubId===s.userClubId||m.awayClubId===s.userClubId));
  if(!games.length)return {games:0,wins:0,winPct:.5,expected:.5,exceeded:false};
  let wins=0;
  for(const m of games){
    const r=m.result||{};
    const h=Number(r.homeScore??r.homePoints??r.home??0),a=Number(r.awayScore??r.awayPoints??r.away??0);
    const us=m.homeClubId===s.userClubId?h:a,them=m.homeClubId===s.userClubId?a:h;
    if(us>them)wins++;
  }
  const rep=Number(userClub(s)?.reputation||70);
  const expected=clamp(.43+(rep-60)*.006,.38,.72);
  const winPct=wins/games.length;
  return {games:games.length,wins,winPct,expected,exceeded:winPct>=expected+.08};
}
function reduceBudget(c,factor){
  for(const k of ['salaryBudget','transferBudget','staffBudget'])if(Number.isFinite(Number(c?.[k])))c[k]=Math.max(0,Math.round(Number(c[k])*factor/50000)*50000);
}
function pickForcedSales(c,target){
  const list=(c?.roster||[]).slice().sort((a,b)=>(Number(b.salary)||0)-(Number(a.salary)||0));
  const ids=[];let saving=0;
  for(const p of list){if(ids.length>=3)break;ids.push(p.id);saving+=Number(p.salary)||0;if(saving>=target)break}
  return ids;
}
function processSeasonChange(s){
  const c=userClub(s);if(!c)return;
  const v=s.v25=s.v25||{};
  const now=seasonOf(s);
  if(!v.lastSeason){v.lastSeason=now;return}
  if(String(v.lastSeason)===String(now))return;

  const old=v.lastSeason,bal=financeBalance(s,c),perf=seasonPerformance(s);
  v.boardConfidence=Number.isFinite(Number(v.boardConfidence))?Number(v.boardConfidence):70;
  v.seasonFinancialReviews=v.seasonFinancialReviews||[];

  if(bal<0){
    if(perf.exceeded){
      reduceBudget(c,.97);
      v.boardConfidence=clamp(v.boardConfidence-3,0,100);
      v.financialMandate={active:false,season:now,targetSavings:0,forcedPlayerIds:[]};
      addInbox(s,'BOARD_FINANCE','La directiva acepta el déficit por el rendimiento deportivo',`La temporada ${old} termina con ${Math.round(Math.abs(bal)).toLocaleString('es-ES')} € de déficit, pero el equipo ha superado claramente las expectativas (${Math.round(perf.winPct*100)}% de victorias frente a ${Math.round(perf.expected*100)}% esperado). El presupuesto solo se ajusta ligeramente y la confianza queda en ${Math.round(v.boardConfidence)}/100.`);
    }else{
      const severity=Math.abs(bal)>Math.max(2000000,wageBill(c)*.18)?'HIGH':'MEDIUM';
      const factor=severity==='HIGH'?.84:.91;
      reduceBudget(c,factor);
      v.boardConfidence=clamp(v.boardConfidence-(severity==='HIGH'?16:10),0,100);
      const target=Math.max(Math.abs(bal)*.55,wageBill(c)*(severity==='HIGH'?.14:.08));
      const forced=pickForcedSales(c,target);
      v.financialMandate={active:true,season:now,targetSavings:Math.round(target),forcedPlayerIds:forced,reason:'END_SEASON_DEFICIT'};
      addInbox(s,'BOARD_FINANCE','La directiva exige sanear las cuentas',`Has terminado la temporada ${old} en negativo y sin superar las expectativas deportivas. El presupuesto de la nueva temporada se reduce, la confianza baja a ${Math.round(v.boardConfidence)}/100 y la directiva exige liberar aproximadamente ${Math.round(target).toLocaleString('es-ES')} € en salarios/ventas. ${forced.length?'Hay jugadores marcados como candidatos obligatorios a salida.':''}`);
    }
  }else{
    v.boardConfidence=clamp(v.boardConfidence+4,0,100);
    v.financialMandate={active:false,season:now,targetSavings:0,forcedPlayerIds:[]};
  }
  v.seasonFinancialReviews.unshift({season:old,balance:bal,winPct:perf.winPct,expected:perf.expected,exceeded:perf.exceeded,boardConfidence:v.boardConfidence});
  if(v.seasonFinancialReviews.length>20)v.seasonFinancialReviews.length=20;
  v.lastSeason=now;
}

function marketStatus(date){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date||'')))return {closed:false,warning:false};
  const m=Number(date.slice(5,7)),d=Number(date.slice(8,10));
  // Summer/autumn window open July-Jan. Closed Feb-Jun.
  const closed=m>=2&&m<=6;
  const warning=m===1&&d>=24&&d<=31;
  return {closed,warning};
}
function ownershipSnapshot(s){
  const map={};
  for(const c of s?.world?.clubs||[])for(const p of c.roster||[])map[p.id]=c.id;
  for(const p of s?.world?.freeAgents||[])map[p.id]=null;
  return map;
}
function revertClosedMarketMoves(s,previous){
  if(!previous)return 0;
  const current=ownershipSnapshot(s),changed=[];
  for(const [pid,oldOwner] of Object.entries(previous))if(String(current[pid])!==String(oldOwner))changed.push([String(pid),oldOwner]);
  if(!changed.length)return 0;
  const clubs=s.world.clubs||[],free=s.world.freeAgents=s.world.freeAgents||[];
  const pool=new Map();
  for(const c of clubs)for(const p of c.roster||[])pool.set(String(p.id),p);
  for(const p of free)pool.set(String(p.id),p);
  for(const [pid] of changed){
    for(const c of clubs)c.roster=(c.roster||[]).filter(p=>String(p.id)!==pid);
    s.world.freeAgents=s.world.freeAgents.filter(p=>String(p.id)!==pid);
  }
  for(const [pid,oldOwner] of changed){
    const p=pool.get(pid);if(!p)continue;
    if(oldOwner==null)s.world.freeAgents.push(p);
    else {const c=clubs.find(x=>String(x.id)===String(oldOwner));if(c)c.roster.push(p);else s.world.freeAgents.push(p)}
  }
  return changed.length;
}
function processMarket(s){
  const v=s.v25=s.v25||{},status=marketStatus(s.currentDate);
  v.market=v.market||{};
  v.market.deadline='31-01';v.market.closed=status.closed;v.market.warning=status.warning;
  if(status.warning){
    const key=String(s.currentDate).slice(0,4);
    if(v.market.warnedSeason!==key){
      v.market.warnedSeason=key;
      addInbox(s,'MARKET_DEADLINE','El mercado cierra en una semana','Queda una semana para cerrar fichajes y salidas. El mercado se cerrará el 31 de enero y no volverá a abrir hasta el 1 de julio.');
    }
  }
  if(status.closed){
    const blocked=revertClosedMarketMoves(s,v.market.ownership);
    if(blocked&&v.market.blockedNoticeDate!==s.currentDate){
      v.market.blockedNoticeDate=s.currentDate;
      addInbox(s,'MARKET_CLOSED','Operación bloqueada: mercado cerrado',`Se ha bloqueado ${blocked===1?'una operación':blocked+' operaciones'} porque el mercado está cerrado. La próxima ventana abre el 1 de julio.`);
    }
  }else v.market.ownership=ownershipSnapshot(s);
}
function applyStateRules(s){
  if(!s?.world?.clubs)return s;
  const fresh=!s.v25;
  s.v25=s.v25||{version:'0.25-beta'};
  if(fresh){
    s.v24=s.v24||{};
    s.v24.difficulty=chosenDifficulty();
    s.v25.difficultyChosenBeforeStart=true;
    s.v25.boardConfidence=70;
    s.v25.lastSeason=seasonOf(s);
  }
  processSeasonChange(s);
  processMarket(s);
  s.v25.version='0.25-beta';
  return s;
}

if(nativePut){
  IDBObjectStore.prototype.put=function(value,key){
    try{
      if(!applying&&String(key||'')===DB_SAVE_ID&&value&&typeof value==='object'&&value.world){
        applying=true;applyStateRules(value);applying=false;
      }
    }catch(e){applying=false;console.warn('[v0.25] state rule error',e)}
    return nativePut.call(this,value,key);
  };
}

function injectStyles(){
  if(document.getElementById('v25-style'))return;
  const st=document.createElement('style');st.id='v25-style';st.textContent=`
    .v25-difficulty{margin:16px 0;padding:14px;border:1px solid var(--line,#2b3444);border-radius:14px;background:var(--panel2,#202838)}
    .v25-difficulty label{display:block;font-size:12px;font-weight:800;margin-bottom:7px;color:var(--muted,#9aa7b8)}
    .v25-difficulty select{width:100%;padding:11px;border-radius:10px;border:1px solid var(--line,#2b3444);background:#111722;color:var(--text,#fff);font:inherit}
    .v25-difficulty small{display:block;margin-top:7px;color:var(--muted,#9aa7b8);line-height:1.35}
    .v25-market-banner{margin:10px 0;padding:11px 12px;border:1px solid var(--warn,#f0bc5e);border-radius:12px;font-size:13px;background:rgba(240,188,94,.08)}
    .v25-board-banner{margin:10px 0;padding:11px 12px;border:1px solid var(--bad,#f07178);border-radius:12px;font-size:13px;background:rgba(240,113,120,.08)}
  `;document.head.appendChild(st);
}
function startCard(){return document.querySelector('.start-card')}
function injectDifficulty(){
  const card=startCard();if(!card||card.querySelector('.v25-difficulty'))return;
  const div=document.createElement('div');div.className='v25-difficulty';
  div.innerHTML=`<label for="v25Difficulty">Dificultad de la partida</label><select id="v25Difficulty"><option value="EASY">Fácil</option><option value="MEDIUM">Medio</option><option value="DEMANDING">Exigente</option></select><small>Se aplicará desde el momento en que se cree la nueva carrera.</small>`;
  const actions=card.querySelector('.start-actions');(actions||card).insertAdjacentElement(actions?'beforebegin':'beforeend',div);
  const sel=div.querySelector('select');sel.value=chosenDifficulty();sel.addEventListener('change',()=>setChosenDifficulty(sel.value));
}
function readState(cb){
  try{
    const q=indexedDB.open('basketball_gm_offline',1);
    q.onsuccess=()=>{const db=q.result,tx=db.transaction('saves','readonly'),g=tx.objectStore('saves').get(DB_SAVE_ID);g.onsuccess=()=>{let s=g.result;try{if(typeof s==='string')s=JSON.parse(s)}catch(_e){}cb(s||null)}};
  }catch(_e){}
}
function injectStatusBanners(){
  if(startCard())return;
  readState(s=>{
    if(!s)return;const status=marketStatus(s.currentDate),mandate=s.v25?.financialMandate;
    const content=document.querySelector('.content');if(!content)return;
    let market=document.querySelector('.v25-market-banner');
    if(status.closed){if(!market){market=document.createElement('div');market.className='v25-market-banner';content.prepend(market)}market.textContent='🔒 Mercado cerrado hasta el 1 de julio. No se pueden completar fichajes ni salidas.'}
    else if(status.warning){if(!market){market=document.createElement('div');market.className='v25-market-banner';content.prepend(market)}market.textContent='⏳ El mercado cierra el 31 de enero. Queda una semana o menos.'}
    else if(market)market.remove();
    let board=document.querySelector('.v25-board-banner');
    if(mandate?.active){if(!board){board=document.createElement('div');board.className='v25-board-banner';content.prepend(board)}board.textContent=`⚠️ Mandato de la directiva: debes reducir aproximadamente ${Math.round(mandate.targetSavings||0).toLocaleString('es-ES')} € mediante ventas/ahorro salarial.`}
    else if(board)board.remove();
  });
}

document.addEventListener('click',e=>{
  const card=startCard();if(!card||!card.contains(e.target))return;
  const btn=e.target.closest('button');if(!btn)return;
  const t=(btn.textContent||'').toLowerCase();
  if(/continuar|cargar|importar/.test(t))return;
  if(/nueva|crear|empezar|jugar|club|partida/.test(t)){
    const sel=card.querySelector('#v25Difficulty');if(sel)setChosenDifficulty(sel.value);
  }
},true);

injectStyles();
const mo=new MutationObserver(()=>{injectDifficulty();injectStatusBanners()});
mo.observe(document.documentElement,{childList:true,subtree:true});
injectDifficulty();injectStatusBanners();
setInterval(injectStatusBanners,5000);

})();
