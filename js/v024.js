(function(){
'use strict';

const DB_NAME='basketball_gm_offline', STORE='saves', MAIN_SAVE='main_v08';
const VERSION=window.BBGM_VERSION||{code:'0.32.0-beta',label:'v0.32 Beta'};
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Math.round(n||0));
const pct=n=>`${Math.max(0,Math.min(100,Math.round(n||0)))}%`;
const posES={PG:'Base',SG:'Escolta',SF:'Alero',PF:'Ala-pívot',C:'Pívot'};
const difficultyES={EASY:'Fácil',MEDIUM:'Medio',DEMANDING:'Exigente'};
let cached=null, busy=false, lastRenderKey='';

function openDB(){
  return new Promise((res,rej)=>{
    if(!('indexedDB' in window))return rej(new Error('IndexedDB no disponible'));
    const q=indexedDB.open(DB_NAME,1);
    q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE)};
    q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error||new Error('No se pudo abrir la base local'));
  });
}
async function readKey(key=MAIN_SAVE){
  const db=await openDB();
  return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readonly'),q=tx.objectStore(STORE).get(key);q.onsuccess=()=>{let v=q.result;try{if(typeof v==='string')v=JSON.parse(v)}catch(_e){}res(v||null)};q.onerror=()=>rej(q.error)});
}
async function writeKey(key,value){
  const db=await openDB();
  return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value,key);tx.oncomplete=()=>res(true);tx.onerror=()=>rej(tx.error)});
}
async function deleteKey(key){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(key);tx.oncomplete=()=>res(true);tx.onerror=()=>rej(tx.error)})}
async function listCareerKeys(){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readonly'),q=tx.objectStore(STORE).getAllKeys();q.onsuccess=()=>res((q.result||[]).filter(k=>String(k).startsWith('career_v24_')));q.onerror=()=>rej(q.error)})}
async function readState(){cached=await readKey(MAIN_SAVE);return cached}
async function writeState(s){await writeKey(MAIN_SAVE,s);cached=s}

const BB=()=>window.BBGM||{};
const ovr=p=>{try{return Math.round(BB().overall?.(p)||0)}catch(_e){return 0}};
const value=p=>{try{return BB().marketValue?.(p)||Math.max(50000,Math.pow(Math.max(0,ovr(p)-55),2)*3500)}catch(_e){return 500000}};
const fullName=p=>`${p?.firstName||''} ${p?.lastName||''}`.trim();
const userClub=s=>s?.world?.clubs?.find(c=>c.id===s.userClubId)||null;
const clubById=(s,id)=>s?.world?.clubs?.find(c=>c.id===id)||null;
const allPlayers=s=>[
  ...(s?.world?.clubs||[]).flatMap(c=>(c.roster||[]).map(p=>({p,c}))),
  ...(s?.world?.freeAgents||[]).map(p=>({p,c:null})),
  ...(s?.academy?.players||[]).map(p=>({p,c:userClub(s)}))
];
function hash(str){let h=2166136261;for(let i=0;i<String(str).length;i++){h^=String(str).charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function rand01(seed){let x=hash(seed)||1;x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967295}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function seasonLabel(s){return String(s?.season||s?.currentSeason||String(s?.currentDate||'2026').slice(0,4)||'2026')}
function daysBetween(a,b){const A=new Date(`${a}T12:00:00Z`),B=new Date(`${b}T12:00:00Z`);if(Number.isNaN(A.getTime())||Number.isNaN(B.getTime()))return 1;return Math.max(0,Math.round((B-A)/86400000))}
function addInbox(s,type,title,text,extra={}){s.inbox=s.inbox||[];const id=Math.max(0,...s.inbox.map(x=>Number(x.id)||0))+1;s.inbox.unshift({id,type,title,text,date:s.currentDate||'',resolved:false,...extra})}
function addNews(s,scope,title,text,extra={}){
  const v=s.v24, key=`${s.currentDate}|${scope}|${title}|${text}`;
  if(v.news.some(n=>n.key===key))return;
  v.news.unshift({id:`n24_${Date.now()}_${Math.floor(Math.random()*9999)}`,key,date:s.currentDate||'',scope,title,text,...extra});
  if(v.news.length>240)v.news.length=240;
}
function playerV24(p){return p?.v24||{} }

const PHILOSOPHIES=[
  {id:'DEVELOP',name:'Desarrollo y talento',desc:'Prioriza progresión, jóvenes y creación de valor.'},
  {id:'WIN_NOW',name:'Competir ahora',desc:'La directiva valora especialmente resultados inmediatos.'},
  {id:'SUSTAIN',name:'Sostenibilidad',desc:'Busca equilibrio entre rendimiento y salud económica.'},
  {id:'SELL',name:'Club vendedor',desc:'Detecta talento, lo desarrolla y acepta ventas con plusvalía.'},
  {id:'STARS',name:'Estrellas y prestigio',desc:'Busca nombres de impacto y competir por títulos.'},
  {id:'IDENTITY',name:'Identidad y continuidad',desc:'Valora mantener un núcleo estable y jugadores vinculados al club.'}
];
const MOTIVATIONS=['MINUTES','MONEY','TITLES','EUROLEAGUE','STABILITY','COUNTRY','NBA','COACH'];
const motivationES={MINUTES:'Minutos y rol',MONEY:'Salario',TITLES:'Competir por títulos',EUROLEAGUE:'Euroliga',STABILITY:'Estabilidad',COUNTRY:'País / adaptación',NBA:'Oportunidad NBA',COACH:'Entrenador y proyecto'};

function ensureV24(s){
  if(!s?.world?.clubs)return false;
  let changed=false;
  const v=s.v24=s.v24||{};
  const defaults={version:'0.24-beta',difficulty:'MEDIUM',news:[],processedInboxIds:[],lastProcessedDate:null,lastRosterSnapshot:null,lastCoachSnapshot:null,lastMatchId:null,playerHistory:{},clubHistory:{},career:{reputation:55,seasonReviews:[],clubs:[]},fans:{satisfaction:68,mood:'Esperanzada'},lockerRoom:{stability:70},decisions:[],resolvedDecisions:[],captainId:null,lastSeasonSeen:seasonLabel(s),worldSeasons:[],rumorTick:null};
  for(const [k,val] of Object.entries(defaults))if(v[k]==null){v[k]=structuredCloneSafe(val);changed=true}
  if(!['EASY','MEDIUM','DEMANDING'].includes(v.difficulty)){v.difficulty='MEDIUM';changed=true}
  const uc=userClub(s);
  for(const c of s.world.clubs){
    if(!c.v24){
      const ph=PHILOSOPHIES[hash(`phi-${c.id}`)%PHILOSOPHIES.length];
      c.v24={philosophy:ph.id,prestige:clamp(Math.round((c.reputation||65)*.92+8),35,98),fanDemand:clamp(Math.round((c.reputation||65)*.75+15),35,96),aiProject:['CONTEND','BALANCED','DEVELOP','REBUILD'][hash(`proj-${c.id}`)%4]};changed=true;
    }
    for(const p of c.roster||[])if(ensurePlayer(s,p,c))changed=true;
  }
  for(const p of s.world.freeAgents||[])if(ensurePlayer(s,p,null))changed=true;
  for(const p of s.academy?.players||[])if(ensurePlayer(s,p,uc))changed=true;
  if(uc&&(!v.captainId||!uc.roster.some(p=>p.id===v.captainId))){v.captainId=bestCaptain(uc)?.id||null;changed=true}
  if(uc&&!v.career.clubs.some(x=>x.clubId===uc.id)){v.career.clubs.push({clubId:uc.id,name:uc.name,fromSeason:seasonLabel(s),toSeason:null});changed=true}
  return changed;
}
function structuredCloneSafe(v){try{return structuredClone(v)}catch(_e){return JSON.parse(JSON.stringify(v))}}
function ensurePlayer(s,p,c){
  if(!p)return false;
  let changed=false;
  if(!p.v24){
    const seed=`p24-${p.id}-${p.firstName}-${p.lastName}`;
    const r=n=>rand01(`${seed}-${n}`);
    const leadership=clamp(Math.round(28+(p.age||25)*1.25+r(1)*34+(p.personality?.loyalty||50)*.12),20,96);
    const adaptability=clamp(Math.round(45+r(2)*46),30,96);
    const repBase=ovr(p)*.78+(c?.reputation||55)*.18+(p.role==='STAR'?9:p.role==='STARTER'?5:0);
    const shuffled=MOTIVATIONS.slice().sort((a,b)=>hash(`${seed}-${a}`)-hash(`${seed}-${b}`));
    p.v24={leadership,adaptability,reputation:clamp(Math.round(repBase),25,96),adaptation:c?clamp(Math.round(78+r(3)*22),55,100):70,motivations:shuffled.slice(0,2),mediaStatus:'NEUTRAL',fanBond:clamp(Math.round(35+r(4)*38+(p.age||25)*.5),20,92),contractTerms:{signingBonus:0,titleBonus:0,clubOption:false,playerOption:false,nbaClause:p.nbaRights?true:false},lastClubId:c?.id||null};changed=true;
  }
  const h=s.v24.playerHistory[p.id]=s.v24.playerHistory[p.id]||{clubs:[],awards:[],highlights:[]};
  if(c&&!h.clubs.some(x=>x.clubId===c.id)){h.clubs.push({clubId:c.id,name:c.name,fromSeason:seasonLabel(s),toSeason:null});changed=true}
  return changed;
}
function bestCaptain(c){return (c?.roster||[]).slice().sort((a,b)=>(playerV24(b).leadership||0)-(playerV24(a).leadership||0)||(b.age||0)-(a.age||0))[0]||null}
function philosophy(c){return PHILOSOPHIES.find(x=>x.id===c?.v24?.philosophy)||PHILOSOPHIES[2]}

function rosterSnapshot(s){const m={};for(const c of s.world.clubs||[])for(const p of c.roster||[])m[p.id]=c.id;for(const p of s.world.freeAgents||[])m[p.id]=null;return m}
function coachSnapshot(s){const m={};for(const c of s.world.clubs||[])m[c.id]=c.coach?.name||'';return m}
function findPlayer(s,id){for(const c of s.world.clubs||[]){const p=(c.roster||[]).find(x=>String(x.id)===String(id));if(p)return {p,c}}const p=(s.world.freeAgents||[]).find(x=>String(x.id)===String(id));return p?{p,c:null}:null}

function processRosterChanges(s){
  const v=s.v24, now=rosterSnapshot(s), prev=v.lastRosterSnapshot;
  if(prev){
    for(const [pid,newClubId] of Object.entries(now)){
      if(!(pid in prev)||String(prev[pid])===String(newClubId))continue;
      const oldClubId=prev[pid], fp=findPlayer(s,pid);if(!fp)continue;
      const p=fp.p, oldC=clubById(s,oldClubId), newC=clubById(s,newClubId);
      if(newC){
        const scope=(newC.id===s.userClubId||oldC?.id===s.userClubId)?'TEAM':'WORLD';
        addNews(s,scope,`${fullName(p)} cambia de equipo`,`${oldC?.name||'Agente libre'} → ${newC.name}. El mercado sigue moviéndose.` ,{playerId:p.id,clubId:newC.id,type:'TRANSFER'});
        ensurePlayer(s,p,newC);p.v24.adaptation=clamp(50+(p.v24.adaptability||60)*.32,50,82);p.v24.lastClubId=newC.id;
        const hist=v.playerHistory[p.id];if(hist?.clubs?.length>1){const prevClub=hist.clubs[hist.clubs.length-2];if(prevClub&&!prevClub.toSeason)prevClub.toSeason=seasonLabel(s)}
      }else if(oldC){addNews(s,oldC.id===s.userClubId?'TEAM':'WORLD',`${fullName(p)} queda libre`,`${fullName(p)} abandona ${oldC.name} y entra en el mercado de agentes libres.`,{playerId:p.id,type:'FREE_AGENT'});}
    }
  }
  v.lastRosterSnapshot=now;
}
function processCoachChanges(s){
  const v=s.v24,now=coachSnapshot(s),prev=v.lastCoachSnapshot;
  if(prev){for(const [cid,name] of Object.entries(now)){if(prev[cid]&&prev[cid]!==name){const c=clubById(s,cid);if(c)addNews(s,Number(cid)===s.userClubId?'TEAM':'WORLD',`Cambio de entrenador en ${c.name}`,`${prev[cid]} deja el banquillo. ${name||'El club busca sustituto'} asume el proyecto.`,{clubId:c.id,type:'COACH'});}}}
  v.lastCoachSnapshot=now;
}
function processInbox(s){
  const v=s.v24, seen=new Set((v.processedInboxIds||[]).map(String));
  for(const item of (s.inbox||[]).slice(0,80)){
    if(seen.has(String(item.id)))continue;
    seen.add(String(item.id));
    const title=item.title||'Novedad del club', text=item.text||item.body||'';
    const important=/transfer|fich|renov|lesi|entren|jugador|contrat|sponsor|patrocin|decisi|draft|selecci/i.test(`${item.type} ${title} ${text}`);
    if(important)addNews(s,'TEAM',title,text,{type:item.type||'INBOX',playerId:item.playerId});
  }
  v.processedInboxIds=[...seen].slice(-350);
}
function userMatches(s){return (s.calendar||[]).filter(m=>m.status==='PLAYED'&&m.result&&(m.homeClubId===s.userClubId||m.awayClubId===s.userClubId)).sort((a,b)=>String(a.date).localeCompare(String(b.date)))}
function matchScore(m){if(!m?.result)return null;const r=m.result;return {home:r.homeScore??r.homePoints??r.home,away:r.awayScore??r.awayPoints??r.away}}
function statValue(st){return (st.points||0)+(st.assists||0)*1.5+((st.offensiveRebounds||0)+(st.defensiveRebounds||0))*1.15+(st.steals||0)*2+(st.blocks||0)*2-(st.turnovers||0)*1.5}
function latestMatchNarrative(s,m){
  const score=matchScore(m);if(!score)return null;
  const home=clubById(s,m.homeClubId),away=clubById(s,m.awayClubId),isHome=m.homeClubId===s.userClubId,us=isHome?score.home:score.away,them=isHome?score.away:score.home,opp=isHome?away:home,won=us>them;
  const stats=[...(m.result.homeStats||[]),...(m.result.awayStats||[])];
  const ourIds=new Set((userClub(s)?.roster||[]).map(p=>p.id));
  const ours=stats.filter(x=>ourIds.has(x.playerId)).sort((a,b)=>statValue(b)-statValue(a));
  const mvp=ours[0],p=mvp&&findPlayer(s,mvp.playerId)?.p;
  const ourReb=ours.reduce((z,x)=>z+(x.offensiveRebounds||0)+(x.defensiveRebounds||0),0),ourAst=ours.reduce((z,x)=>z+(x.assists||0),0),ourTo=ours.reduce((z,x)=>z+(x.turnovers||0),0);
  const comp=(s.world.competitions||[]).find(x=>x.id===m.competitionId||x.name===m.competition)?.name||m.competition||'Competición';
  return {won,headline:`${won?'Victoria':'Derrota'} ante ${opp?.name||'el rival'} (${us}-${them})`,text:`${comp}. ${p?`${fullName(p)} fue el jugador más destacado con ${mvp.points||0} puntos. `:''}El equipo terminó con ${ourReb} rebotes, ${ourAst} asistencias y ${ourTo} pérdidas.`,mvp:p?.id,score:`${us}-${them}`,competition:comp};
}
function processLatestMatch(s){
  const v=s.v24,ms=userMatches(s);if(!ms.length)return;
  const m=ms[ms.length-1];if(String(v.lastMatchId)===String(m.id))return;
  const n=latestMatchNarrative(s,m);if(!n)return;
  addNews(s,'TEAM',n.headline,n.text,{type:'MATCH',matchId:m.id,playerId:n.mvp});
  const uc=userClub(s),fanDelta=n.won?2.2:-2.6, diff=v.difficulty==='EASY'?.8:v.difficulty==='DEMANDING'?1.18:1;
  v.fans.satisfaction=clamp((v.fans.satisfaction||68)+fanDelta*diff,10,100);
  v.career.reputation=clamp((v.career.reputation||55)+(n.won?.35:-.22)*diff,15,99);
  const stats=[...(m.result.homeStats||[]),...(m.result.awayStats||[])];
  for(const st of stats){const fp=findPlayer(s,st.playerId);if(!fp)continue;ensurePlayer(s,fp.p,fp.c);const perf=statValue(st);if(perf>30)fp.p.v24.reputation=clamp(fp.p.v24.reputation+.7,20,99);else if(perf<2&&(st.minutes||0)>12)fp.p.v24.reputation=clamp(fp.p.v24.reputation-.15,20,99)}
  v.lastMatchId=m.id;
  if(uc)v.lockerRoom.stability=clamp((v.lockerRoom.stability||70)+(n.won?.45:-.65),15,100);
}
function updateAdaptation(s,days){if(days<=0)return;for(const {p,c} of allPlayers(s)){if(!c||!p.v24)continue;const rate=.35+(p.v24.adaptability||60)/180;p.v24.adaptation=clamp((p.v24.adaptation||70)+days*rate,20,100)}}
function recentResults(s,n=5){const ms=userMatches(s).slice(-n);return ms.map(m=>{const sc=matchScore(m),isH=m.homeClubId===s.userClubId;return sc?((isH?sc.home:sc.away)>(isH?sc.away:sc.home)?'W':'L'):null}).filter(Boolean)}
function positionNeeds(c){const counts={PG:0,SG:0,SF:0,PF:0,C:0};for(const p of c?.roster||[]){if(counts[p.primaryPosition]!=null)counts[p.primaryPosition]++;if(p.secondaryPosition&&counts[p.secondaryPosition]!=null)counts[p.secondaryPosition]+=.35}return Object.entries(counts).filter(([,v])=>v<1.5).sort((a,b)=>a[1]-b[1]).map(([k])=>posES[k]||k)}
function maybeCreateDecision(s){
  const v=s.v24;if((v.decisions||[]).some(d=>!d.resolved))return;
  const dmod=v.difficulty==='EASY'?.72:v.difficulty==='DEMANDING'?1.28:1;
  const date=s.currentDate||'', uc=userClub(s);if(!uc)return;
  const daysFrom=v.lastDecisionDate?daysBetween(v.lastDecisionDate,date):99;if(daysFrom<9)return;
  const unhappy=uc.roster.filter(p=>(p.state?.roleSatisfaction??75)<56||(p.state?.morale??70)<48).sort((a,b)=>(a.state?.roleSatisfaction??75)-(b.state?.roleSatisfaction??75));
  const results=recentResults(s,4), losing=results.length>=3&&results.slice(-3).every(x=>x==='L');
  const needs=positionNeeds(uc);
  const roll=rand01(`decision-${date}-${uc.id}`);
  let d=null;
  if(unhappy.length&&roll<.42*dmod){const p=unhappy[0];d={id:`d_${date}_${p.id}`,kind:'PLAYER_ROLE',title:`${fullName(p)} pide una reunión`,text:'No está satisfecho con su situación deportiva y quiere una respuesta clara.',playerId:p.id,choices:[{id:'PLAYER',label:'Apoyar al jugador',hint:'Mejora su moral, pero puede tensar la relación con el entrenador.'},{id:'COACH',label:'Respaldar al entrenador',hint:'Refuerza al técnico, pero el jugador puede pedir salir.'},{id:'MEDIATE',label:'Intentar mediar',hint:'Puede estabilizar el problema, pero no siempre funciona.'}]};}
  else if(losing&&roll<.68*dmod){d={id:`d_${date}_media`,kind:'MEDIA',title:'La prensa cuestiona la planificación',text:'La mala racha aumenta la presión y te piden una explicación pública.',choices:[{id:'DEFEND',label:'Defender a la plantilla',hint:'Proteges el vestuario y asumes parte de la presión.'},{id:'DEMAND',label:'Exigir una reacción',hint:'Puede activar al equipo, pero algunos jugadores lo recibirán mal.'},{id:'PATIENCE',label:'Pedir paciencia',hint:'Una respuesta prudente; la afición puede verla insuficiente.'}]};}
  else if(needs.length&&roll<.28*dmod){d={id:`d_${date}_coach`,kind:'COACH_NEED',title:'El entrenador pide un refuerzo',text:`Considera que falta profundidad en ${needs[0]} y quiere que el club actúe.`,choices:[{id:'SCOUT',label:'Priorizar el scouting',hint:'No prometes un fichaje, pero activas la búsqueda.'},{id:'PROMISE',label:'Prometer un refuerzo',hint:'Mejora la relación ahora; incumplirlo puede generar tensión.'},{id:'NO',label:'Mantener la plantilla',hint:'Proteges el presupuesto, pero el entrenador no estará conforme.'}]};}
  if(d){d.date=date;d.resolved=false;v.decisions.unshift(d);v.lastDecisionDate=date;addInbox(s,'DECISION',d.title,d.text,{decisionId:d.id});addNews(s,'TEAM',d.title,d.text,{type:'DECISION'});}
}
function resolveDecision(s,id,choice){
  const v=s.v24,d=v.decisions.find(x=>x.id===id&&!x.resolved);if(!d)return null;const uc=userClub(s), diff=v.difficulty==='EASY'?1.12:v.difficulty==='DEMANDING'?.88:1;let result='';
  if(d.kind==='PLAYER_ROLE'){
    const p=uc?.roster?.find(x=>x.id===d.playerId);if(!p)return null;
    if(choice==='PLAYER'){p.state=p.state||{};p.state.morale=clamp((p.state.morale??65)+8,10,100);p.state.roleSatisfaction=clamp((p.state.roleSatisfaction??65)+8,5,100);s.coachManagement=s.coachManagement||{};s.coachManagement.relationship=clamp((s.coachManagement.relationship??72)-4,10,100);result=`${fullName(p)} agradece tu apoyo. El entrenador, en cambio, no está del todo conforme.`}
    if(choice==='COACH'){p.state=p.state||{};p.state.morale=clamp((p.state.morale??65)-7,10,100);p.state.roleSatisfaction=clamp((p.state.roleSatisfaction??65)-6,5,100);s.coachManagement=s.coachManagement||{};s.coachManagement.relationship=clamp((s.coachManagement.relationship??72)+6,10,100);result=`El entrenador se siente respaldado. ${fullName(p)} sale de la reunión más molesto.`}
    if(choice==='MEDIATE'){const ok=rand01(`mediate-${id}`)<.58*diff;p.state=p.state||{};if(ok){p.state.morale=clamp((p.state.morale??65)+4,10,100);p.state.roleSatisfaction=clamp((p.state.roleSatisfaction??65)+4,5,100);s.coachManagement=s.coachManagement||{};s.coachManagement.relationship=clamp((s.coachManagement.relationship??72)+2,10,100);result='La mediación funciona: ambas partes aceptan rebajar la tensión.'}else{p.state.morale=clamp((p.state.morale??65)-2,10,100);result='La reunión no resuelve el problema. El jugador sigue descontento.'}}
  }
  if(d.kind==='MEDIA'){
    if(choice==='DEFEND'){v.fans.satisfaction=clamp(v.fans.satisfaction+2,10,100);v.lockerRoom.stability=clamp(v.lockerRoom.stability+4,10,100);result='El vestuario valora que hayas dado la cara. La presión se traslada hacia ti.'}
    if(choice==='DEMAND'){const ok=rand01(`demand-${id}`)<.55*diff;for(const p of uc.roster){p.state=p.state||{};p.state.morale=clamp((p.state.morale??65)+(ok?2:-2),10,100)}v.fans.satisfaction=clamp(v.fans.satisfaction+1,10,100);result=ok?'El mensaje cala y la plantilla responde bien.':'El mensaje divide al vestuario y varios jugadores lo consideran injusto.'}
    if(choice==='PATIENCE'){v.fans.satisfaction=clamp(v.fans.satisfaction-1.5,10,100);v.career.reputation=clamp(v.career.reputation+.3,10,99);result='Mantienes un tono sereno. La directiva lo entiende, aunque parte de la afición pide más contundencia.'}
  }
  if(d.kind==='COACH_NEED'){
    s.v24.recruitmentPriorities=s.v24.recruitmentPriorities||[];
    if(choice==='SCOUT'){s.v24.recruitmentPriorities.unshift({date:s.currentDate,position:positionNeeds(uc)[0]||'',status:'SCOUT'});s.coachManagement=s.coachManagement||{};s.coachManagement.relationship=clamp((s.coachManagement.relationship??72)+2,10,100);result='Activáis una búsqueda sin comprometer el presupuesto todavía.'}
    if(choice==='PROMISE'){s.v24.coachPromises=s.v24.coachPromises||[];s.v24.coachPromises.push({date:s.currentDate,kind:'REINFORCEMENT',position:positionNeeds(uc)[0]||'',resolved:false});s.coachManagement=s.coachManagement||{};s.coachManagement.relationship=clamp((s.coachManagement.relationship??72)+5,10,100);result='El entrenador celebra el compromiso. Ahora esperará que cumplas la promesa.'}
    if(choice==='NO'){s.coachManagement=s.coachManagement||{};s.coachManagement.relationship=clamp((s.coachManagement.relationship??72)-4,10,100);v.career.reputation=clamp(v.career.reputation+.15,10,99);result='Mantienes tu planificación y el presupuesto, aunque el entrenador discrepa.'}
  }
  d.resolved=true;d.choice=choice;d.result=result;v.resolvedDecisions.unshift({id:d.id,date:s.currentDate,title:d.title,result});if(v.resolvedDecisions.length>80)v.resolvedDecisions.length=80;addNews(s,'TEAM',`Consecuencia: ${d.title}`,result,{type:'DECISION_RESULT'});addInbox(s,'DECISION_RESULT',`Consecuencia: ${d.title}`,result);return result;
}
function maybeRumor(s){
  const v=s.v24,date=s.currentDate||'';if(v.rumorTick===date)return;const day=Number(String(date).slice(-2))||1;if(day%8!==0)return;v.rumorTick=date;
  const candidates=[];for(const c of s.world.clubs||[])for(const p of c.roster||[])if(c.id!==s.userClubId&&(p.contractYears||0)<=1&&ovr(p)>=76)candidates.push({p,c});
  if(!candidates.length)return;const pick=candidates[hash(`rumor-${date}`)%candidates.length];const motives=(pick.p.v24?.motivations||[]).map(x=>motivationES[x]).join(' y ').toLowerCase();addNews(s,'WORLD',`Rumor: el futuro de ${fullName(pick.p)} está abierto`,`${pick.p.contractYears||1} año de contrato restante en ${pick.c.name}. Su entorno valora especialmente ${motives||'el proyecto deportivo'}.`,{type:'RUMOR',playerId:pick.p.id});
}
function processSeasonChange(s){
  const v=s.v24,now=seasonLabel(s);if(String(v.lastSeasonSeen)===String(now))return;
  const old=v.lastSeasonSeen,uc=userClub(s);v.worldSeasons.unshift({season:old,clubId:uc?.id,club:uc?.name,reputation:Math.round(v.career.reputation||55),fanSatisfaction:Math.round(v.fans.satisfaction||68)});if(v.worldSeasons.length>30)v.worldSeasons.length=30;
  v.career.seasonReviews.unshift({season:old,club:uc?.name,reputation:Math.round(v.career.reputation||55),fans:Math.round(v.fans.satisfaction||68)});v.lastSeasonSeen=now;addNews(s,'TEAM',`Comienza la temporada ${now}`,`El club inicia un nuevo curso con reputación ${Math.round(v.career.reputation||55)}/100 y una afición al ${Math.round(v.fans.satisfaction||68)}% de satisfacción.`,{type:'SEASON'});
}
function processWorld(s){
  const v=s.v24,date=s.currentDate||'';const days=v.lastProcessedDate?daysBetween(v.lastProcessedDate,date):0;
  updateAdaptation(s,days);processRosterChanges(s);processCoachChanges(s);processInbox(s);processLatestMatch(s);processSeasonChange(s);maybeRumor(s);maybeCreateDecision(s);v.lastProcessedDate=date;v.version='0.24-beta';s.version=VERSION.code;
}

function fitMetrics(c){
  const r=c?.roster||[];if(!r.length)return {compatibility:0,spacing:0,creation:0,defense:0,rebound:0};
  const top=r.slice().sort((a,b)=>ovr(b)-ovr(a)).slice(0,10),avg=ks=>top.reduce((z,p)=>z+ks.reduce((q,k)=>q+(p.attributes?.[k]||50),0)/ks.length,0)/top.length;
  const spacing=avg(['threePoint','offBall']),creation=avg(['passing','ballHandling','shotCreation']),defense=avg(['perimeterDefense','interiorDefense','helpDefense']),rebound=avg(['defensiveRebound','offensiveRebound','strength']);
  const roleSat=r.reduce((z,p)=>z+(p.state?.roleSatisfaction??75),0)/r.length,adapt=r.reduce((z,p)=>z+(p.v24?.adaptation??80),0)/r.length,vals=[spacing,creation,defense,rebound],spread=Math.max(...vals)-Math.min(...vals);const compatibility=clamp(Math.round(vals.reduce((a,b)=>a+b,0)/4*.68+roleSat*.15+adapt*.17-spread*.1),35,97);
  return {compatibility,spacing:Math.round(spacing),creation:Math.round(creation),defense:Math.round(defense),rebound:Math.round(rebound)};
}
function planning(s){const c=userClub(s),r=c?.roster||[],next=r.filter(p=>(p.contractYears||0)>1),exp=r.filter(p=>(p.contractYears||0)<=1),salary=next.reduce((z,p)=>z+(p.salary||0),0),old=r.filter(p=>(p.age||0)>=33);return {total:r.length,next:next.length,exp:exp.length,salary,old:old.length,needs:positionNeeds(c)}}
function fanMood(v){return v>=85?'Eufórica':v>=72?'Optimista':v>=58?'Estable':v>=42?'Inquieta':'Muy crítica'}
function lockerSummary(s){const c=userClub(s),r=c?.roster||[],avgMor=r.length?r.reduce((z,p)=>z+(p.state?.morale??70),0)/r.length:0,avgAdapt=r.length?r.reduce((z,p)=>z+(p.v24?.adaptation??80),0)/r.length:0,lead=bestCaptain(c);return {morale:Math.round(avgMor),adaptation:Math.round(avgAdapt),stability:Math.round(s.v24.lockerRoom.stability||70),captain:lead}}
function nextMatch(s){return (s.calendar||[]).filter(m=>m.status==='SCHEDULED'&&(m.homeClubId===s.userClubId||m.awayClubId===s.userClubId)).sort((a,b)=>String(a.date).localeCompare(String(b.date)))[0]||null}
function nextMatchInfo(s){const m=nextMatch(s);if(!m)return null;const opp=clubById(s,m.homeClubId===s.userClubId?m.awayClubId:m.homeClubId),comp=(s.world.competitions||[]).find(x=>x.id===m.competitionId)?.name||m.competition||'Competición';let stakes='Jornada regular';if(/F4|FINAL FOUR/i.test(`${m.competitionId} ${comp}`))stakes='Partido de máxima presión';else if(/COPA|SUPERCOPA/i.test(`${m.competitionId} ${comp}`))stakes='Eliminatoria / título en juego';else if(/PO|PLAYOFF/i.test(`${m.competitionId} ${comp}`))stakes='Playoffs';return {m,opp,comp,stakes}}
function contractValue(p){const sal=p.salary||1,v=value(p),ratio=v/Math.max(1,sal);return ratio>5?'Excelente':ratio>3?'Bueno':ratio>1.8?'Correcto':'Caro'}
function playerStatus(p){const rep=p.v24?.reputation||50;return rep>=92?'Superestrella':rep>=85?'Estrella europea':rep>=76?'Jugador consolidado':rep>=66?'Conocido':rep>=55?'En crecimiento':'Perfil discreto'}

function homeHost(){const h=$$('h1').find(x=>x.textContent.trim()==='Inicio');return h?.closest('.section-title')?.parentElement||h?.parentElement||null}
function injectHome(s){
  const host=homeHost();if(!host)return;let root=$('#v24Hub');if(root)root.remove();
  const c=userClub(s);if(!c)return;const p=planning(s),lock=lockerSummary(s),fit=fitMetrics(c),nm=nextMatchInfo(s),ph=philosophy(c),dec=(s.v24.decisions||[]).find(x=>!x.resolved),newsTeam=s.v24.news.filter(n=>n.scope==='TEAM').slice(0,5),newsWorld=s.v24.news.filter(n=>n.scope==='WORLD').slice(0,5),lastMatch=userMatches(s).slice(-1)[0],narr=lastMatch?latestMatchNarrative(s,lastMatch):null;
  root=document.createElement('section');root.id='v24Hub';root.className='v24-hub card';
  root.innerHTML=`<div class="v24-hub-head"><div><div class="eyebrow">${VERSION.label} · Mundo y carrera</div><h2>${esc(c.name)} <span class="v24-version">World & Career</span></h2></div><div class="v24-head-actions"><button class="btn small" data-v24-difficulty>Dificultad: ${difficultyES[s.v24.difficulty]}</button><button class="btn small" data-v24-saves>Partidas</button></div></div>
  ${dec?`<div class="v24-decision"><div><span class="v24-alert-dot"></span><b>${esc(dec.title)}</b><p>${esc(dec.text)}</p></div><button class="btn primary" data-v24-open-decision>Decidir</button></div>`:''}
  <div class="v24-tabs" role="tablist"><button class="active" data-v24-tab="news">Noticias</button><button data-v24-tab="plan">Planificación</button><button data-v24-tab="locker">Vestuario</button><button data-v24-tab="career">Carrera</button></div>
  <div class="v24-tab active" data-v24-panel="news"><div class="v24-news-switch"><button class="active" data-v24-news="TEAM">Mi equipo</button><button data-v24-news="WORLD">Mundo</button></div><div data-v24-news-list>${newsHtml(newsTeam)}</div></div>
  <div class="v24-tab" data-v24-panel="plan"><div class="v24-summary-grid"><div><span>Con contrato próximo año</span><b>${p.next}/${p.total}</b></div><div><span>Acaban contrato</span><b>${p.exp}</b></div><div><span>Salario comprometido</span><b>${money(p.salary)}</b></div><div><span>Veteranos 33+</span><b>${p.old}</b></div></div><div class="v24-callout"><b>Necesidades detectadas</b><span>${p.needs.length?p.needs.join(' · '):'Plantilla equilibrada por posiciones'}</span></div>${nm?`<div class="v24-next"><div><small>${esc(nm.comp)} · ${esc(nm.m.date||'')}</small><b>Próximo: ${esc(nm.opp?.name||'Rival')}</b><span>${esc(nm.stakes)}</span></div></div>`:''}</div>
  <div class="v24-tab" data-v24-panel="locker"><div class="v24-summary-grid"><div><span>Compatibilidad</span><b>${fit.compatibility}/100</b></div><div><span>Moral</span><b>${lock.morale}/100</b></div><div><span>Adaptación media</span><b>${lock.adaptation}/100</b></div><div><span>Estabilidad</span><b>${lock.stability}/100</b></div></div><div class="v24-callout"><b>Capitán</b><span>${esc(fullName(lock.captain)||'Sin designar')}</span></div><div class="v24-metrics"><span>Espaciado ${fit.spacing}</span><span>Creación ${fit.creation}</span><span>Defensa ${fit.defense}</span><span>Rebote ${fit.rebound}</span></div></div>
  <div class="v24-tab" data-v24-panel="career"><div class="v24-summary-grid"><div><span>Reputación DD</span><b>${Math.round(s.v24.career.reputation||55)}/100</b></div><div><span>Afición</span><b>${Math.round(s.v24.fans.satisfaction||68)}/100</b></div><div><span>Estado afición</span><b>${fanMood(s.v24.fans.satisfaction||68)}</b></div><div><span>Filosofía</span><b>${esc(ph.name)}</b></div></div><p class="muted tiny">${esc(ph.desc)} La dificultad aumenta la exigencia de decisiones y entorno, no altera artificialmente el resultado de los partidos.</p>${narr?`<div class="v24-callout"><b>Último partido</b><span>${esc(narr.headline)} · ${esc(narr.competition)}</span></div>`:''}</div>`;
  const anchor=$('#v22Dashboard',host);if(anchor)anchor.after(root);else host.insertBefore(root,host.children[1]||null);
  bindHub(root,s);
}
function newsHtml(items){if(!items.length)return '<div class="v24-empty">No hay novedades relevantes.</div>';return items.map(n=>`<article class="v24-news"><div><small>${esc(n.date)}</small><b>${esc(n.title)}</b><p>${esc(n.text)}</p></div></article>`).join('')}
function bindHub(root,s){
  $$('[data-v24-tab]',root).forEach(b=>b.onclick=()=>{$$('[data-v24-tab]',root).forEach(x=>x.classList.toggle('active',x===b));$$('[data-v24-panel]',root).forEach(x=>x.classList.toggle('active',x.dataset.v24Panel===b.dataset.v24Tab))});
  $$('[data-v24-news]',root).forEach(b=>b.onclick=()=>{$$('[data-v24-news]',root).forEach(x=>x.classList.toggle('active',x===b));const items=s.v24.news.filter(n=>n.scope===b.dataset.v24News).slice(0,8);$('[data-v24-news-list]',root).innerHTML=newsHtml(items)});
  $('[data-v24-open-decision]',root)?.addEventListener('click',()=>openDecisionModal(s));
  $('[data-v24-difficulty]',root)?.addEventListener('click',()=>openDifficultyModal(s));
  $('[data-v24-saves]',root)?.addEventListener('click',()=>openSaveManager(s));
}

function openModal(html,cls=''){closeModal();const ov=document.createElement('div');ov.id='v24Modal';ov.className='v24-modal-overlay';ov.innerHTML=`<div class="v24-modal ${cls}"><button class="v24-close" aria-label="Cerrar">×</button>${html}</div>`;document.body.appendChild(ov);$('.v24-close',ov).onclick=closeModal;ov.addEventListener('click',e=>{if(e.target===ov)closeModal()});return ov}
function closeModal(){$('#v24Modal')?.remove()}
function openDecisionModal(s){const d=(s.v24.decisions||[]).find(x=>!x.resolved);if(!d)return;const ov=openModal(`<div class="eyebrow">Decisión</div><h2>${esc(d.title)}</h2><p>${esc(d.text)}</p><div class="v24-choice-list">${d.choices.map(c=>`<button data-choice="${c.id}"><b>${esc(c.label)}</b><span>${esc(c.hint)}</span></button>`).join('')}</div>`,'v24-decision-modal');$$('[data-choice]',ov).forEach(b=>b.onclick=async()=>{const st=await readState();const result=resolveDecision(st,d.id,b.dataset.choice);await writeState(st);$('.v24-modal',ov).innerHTML=`<div class="eyebrow">Consecuencia</div><h2>Decisión tomada</h2><p>${esc(result||'La situación ha quedado resuelta.')}</p><button class="btn primary" data-ok>Cerrar</button>`;$('[data-ok]',ov).onclick=()=>location.reload()})}
function openDifficultyModal(s){const current=s.v24.difficulty;const ov=openModal(`<div class="eyebrow">Dificultad global</div><h2>Elige el nivel</h2><p class="muted">Afecta a la exigencia de directiva, eventos, presión, mediaciones, margen de error y sistemas de gestión. El motor de partido no recibe bonificaciones ocultas.</p><div class="v24-diff-grid">${[['EASY','Fácil','Más margen, información más amable y menor presión.'],['MEDIUM','Medio','La experiencia estándar.'],['DEMANDING','Exigente','Menos margen de error, mayor presión y decisiones más duras.']].map(([id,l,t])=>`<button class="${current===id?'active':''}" data-diff="${id}"><b>${l}</b><span>${t}</span></button>`).join('')}</div>`);$$('[data-diff]',ov).forEach(b=>b.onclick=async()=>{const st=await readState();st.v24.difficulty=b.dataset.diff;addNews(st,'TEAM','Dificultad actualizada',`La carrera pasa a dificultad ${difficultyES[b.dataset.diff]}.`,{type:'SYSTEM'});await writeState(st);location.reload()})}
async function openSaveManager(s){
  const keys=await listCareerKeys(),entries=[];for(const k of keys){const x=await readKey(k);if(x?.state&&x.meta)entries.push({key:k,...x.meta})}
  const html=`<div class="eyebrow">Carreras y copias</div><h2>Mis partidas</h2><p class="muted">La partida actual se guarda automáticamente. Aquí puedes crear copias independientes, exportarlas o recuperar otra carrera.</p><div class="v24-save-actions"><button class="btn primary" data-save-copy>Guardar copia actual</button><button class="btn" data-export>Exportar JSON</button><label class="btn v24-file-label">Importar JSON<input type="file" accept="application/json,.json" data-import></label></div><div class="v24-save-list">${entries.length?entries.sort((a,b)=>String(b.savedAt).localeCompare(String(a.savedAt))).map(e=>`<article><div><b>${esc(e.club||'Carrera')}</b><span>${esc(e.date||'')} · Temp. ${esc(e.season||'')} · ${new Date(e.savedAt).toLocaleString('es-ES')}</span></div><div><button class="btn small" data-load="${esc(e.key)}">Cargar</button><button class="btn small danger" data-delete="${esc(e.key)}">Borrar</button></div></article>`).join(''):'<div class="v24-empty">Todavía no has creado copias de carrera.</div>'}</div>`;
  const ov=openModal(html,'v24-save-modal');
  $('[data-save-copy]',ov).onclick=async()=>{const st=await readState(),uc=userClub(st),key=`career_v24_${Date.now()}`;await writeKey(key,{meta:{club:uc?.name||'Carrera',date:st.currentDate,season:seasonLabel(st),savedAt:new Date().toISOString()},state:structuredCloneSafe(st)});closeModal();openSaveManager(st)};
  $('[data-export]',ov).onclick=()=>exportSave(s);
  $('[data-import]',ov).onchange=e=>importSave(e.target.files?.[0]);
  $$('[data-load]',ov).forEach(b=>b.onclick=async()=>{const x=await readKey(b.dataset.load);if(!x?.state)return;if(!confirm(`¿Cargar ${x.meta?.club||'esta carrera'}? La partida actual se sustituirá, pero puedes crear antes una copia.`))return;await writeState(x.state);location.reload()});
  $$('[data-delete]',ov).forEach(b=>b.onclick=async()=>{if(!confirm('¿Borrar esta copia de carrera?'))return;await deleteKey(b.dataset.delete);closeModal();openSaveManager(await readState())});
}
function exportSave(s){const data=JSON.stringify({format:'basketball-gm-v24',exportedAt:new Date().toISOString(),state:s},null,2),blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`basketball-manager-${(userClub(s)?.name||'carrera').replace(/[^a-z0-9]+/gi,'-').toLowerCase()}-${s.currentDate||'save'}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
async function importSave(file){if(!file)return;try{const txt=await file.text(),obj=JSON.parse(txt),st=obj.state||obj;if(!st?.world?.clubs||!st?.userClubId)throw new Error('Formato no válido');ensureV24(st);await writeState(st);location.reload()}catch(e){alert(`No se pudo importar la partida: ${e.message}`)}}

function injectCaptainActions(s){const box=$('#v22RosterCards');if(!box)return;for(const card of $$('.v22-player-card',box)){const pid=card.dataset.pid,fp=findPlayer(s,pid);if(!fp)continue;const actions=$('.v22-player-actions',card);if(!actions||$('[data-v24-captain]',actions))continue;const isCap=String(s.v24.captainId)===String(pid),b=document.createElement('button');b.className=`btn small ${isCap?'v24-captain-active':''}`;b.dataset.v24Captain=pid;b.textContent=isCap?'★ Capitán':'Hacer capitán';actions.prepend(b);if(isCap){const nameBtn=$('.v22-name',card);nameBtn?.insertAdjacentHTML('afterend','<span class="v24-captain-badge">CAP</span>')}b.onclick=async()=>{if(isCap)return;const st=await readState(),c=userClub(st),np=c.roster.find(p=>String(p.id)===String(pid)),old=c.roster.find(p=>String(p.id)===String(st.v24.captainId));if(!np)return;if(old&&old.v24?.leadership>78){old.state=old.state||{};old.state.morale=clamp((old.state.morale??70)-2,10,100)}np.state=np.state||{};np.state.morale=clamp((np.state.morale??70)+3,10,100);st.v24.captainId=np.id;st.v24.lockerRoom.stability=clamp((st.v24.lockerRoom.stability||70)+((np.v24?.leadership||60)>75?2:-1),10,100);addNews(st,'TEAM',`${fullName(np)} es el nuevo capitán`,`La plantilla estrena capitán. Liderazgo estimado: ${np.v24?.leadership||'-'}/100.`,{playerId:np.id,type:'CAPTAIN'});await writeState(st);location.reload()}}
}
function currentProfilePlayer(s){const heads=$$('h1,h2,h3').map(x=>x.textContent.trim()).filter(Boolean);for(const {p,c} of allPlayers(s)){const n=fullName(p);if(n&&heads.some(h=>h===n||h.startsWith(`${n} `)))return {p,c}}return null}
function injectPlayerLegacy(s){const fp=currentProfilePlayer(s);if(!fp||$('#v24PlayerLegacy'))return;const {p,c}=fp,h=s.v24.playerHistory[p.id]||{clubs:[],awards:[],highlights:[]},inj=p.injuryHistory||[],dev=p.developmentHistory||[],mot=(p.v24?.motivations||[]).map(x=>motivationES[x]).join(' · '),terms=p.v24?.contractTerms||{};const host=$$('h1,h2').find(x=>x.textContent.trim()===fullName(p))?.parentElement?.parentElement||$('.content')||$('#app');if(!host)return;const sec=document.createElement('section');sec.id='v24PlayerLegacy';sec.className='card v24-player-legacy';sec.innerHTML=`<div class="eyebrow">Perfil ampliado</div><h3>Historia, contexto y encaje</h3><div class="v24-summary-grid"><div><span>Reputación</span><b>${Math.round(p.v24?.reputation||50)}/100</b><small>${playerStatus(p)}</small></div><div><span>Adaptación</span><b>${Math.round(p.v24?.adaptation||70)}/100</b></div><div><span>Liderazgo</span><b>${Math.round(p.v24?.leadership||50)}/100</b></div><div><span>Valor / salario</span><b>${contractValue(p)}</b></div></div><div class="v24-legacy-row"><b>Motivaciones</b><span>${esc(mot||'Proyecto deportivo')}</span></div><div class="v24-legacy-row"><b>Trayectoria</b><span>${h.clubs.length?h.clubs.map(x=>`${esc(x.name)} (${esc(x.fromSeason)}${x.toSeason?`–${esc(x.toSeason)}`:'–'})`).join(' · '):esc(c?.name||'Agente libre')}</span></div><div class="v24-legacy-row"><b>Historial médico</b><span>${inj.length?`${inj.length} lesión(es) registradas`:'Sin lesiones relevantes registradas'}</span></div><div class="v24-legacy-row"><b>Evolución registrada</b><span>${dev.length?`${dev[0]?.ovr??'-'} → ${dev[dev.length-1]?.ovr??'-'} OVR (${dev.length} controles)`:'Sin histórico suficiente'}</span></div><div class="v24-legacy-row"><b>Contrato</b><span>${money(p.salary)}/año · ${p.contractYears||0} año(s)${terms.clubOption?' · opción club':''}${terms.playerOption?' · opción jugador':''}${terms.nbaClause?' · salida NBA':''}</span></div>`;host.appendChild(sec)}

function injectCompactContext(s){
  const h=$$('h1').find(x=>/Plantilla|Mercado|Scouting|Calendario|Partidos|Avisos/i.test(x.textContent));if(!h||$('#v24ContextStrip'))return;const c=userClub(s),p=planning(s),dec=(s.v24.decisions||[]).filter(x=>!x.resolved).length;const div=document.createElement('div');div.id='v24ContextStrip';div.className='v24-context-strip';div.innerHTML=`<span>${esc(c?.name||'Club')}</span><span>${p.exp} contrato(s) a decidir</span><span>${dec} decisión(es)</span><span>Afición ${Math.round(s.v24.fans.satisfaction||68)}/100</span>`;h.parentElement?.after(div)}

async function tick(){
  if(busy)return;busy=true;
  try{
    let s=await readState();if(!s)return;const changed=ensureV24(s);const before=JSON.stringify({d:s.v24.lastProcessedDate,r:s.v24.lastRosterSnapshot&&Object.keys(s.v24.lastRosterSnapshot).length,n:s.v24.news.length,m:s.v24.lastMatchId});processWorld(s);const after=JSON.stringify({d:s.v24.lastProcessedDate,r:s.v24.lastRosterSnapshot&&Object.keys(s.v24.lastRosterSnapshot).length,n:s.v24.news.length,m:s.v24.lastMatchId});if(changed||before!==after)await writeState(s);
    const key=`${s.currentDate}|${location.hash}|${document.querySelector('h1')?.textContent||''}|${s.v24.news.length}|${(s.v24.decisions||[]).filter(x=>!x.resolved).length}`;
    if(key!==lastRenderKey){lastRenderKey=key;injectHome(s)}
    injectCaptainActions(s);injectPlayerLegacy(s);injectCompactContext(s);
  }catch(e){console.warn('[v0.24]',e)}finally{busy=false}
}

const observer=new MutationObserver(()=>{clearTimeout(observer._t);observer._t=setTimeout(tick,80)});
observer.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('focus',tick);setTimeout(tick,250);
window.BBGM_V24={readState,writeState,ensureV24,resolveDecision,version:'0.24-beta'};
})();
